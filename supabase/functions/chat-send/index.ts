// chat-send (Backend §4, §6, §10; UIUX §2.11) — premium chat grounded on the user's own reading.
// User mode + entitlement gate (the table is truth, §5.2). Grounding = the reading's own feature_refs
// (keyed KB lookup — the cited lines) widened by fuzzy pgvector retrieval (kb_search on the question
// embedding). Unsafe/off-topic questions are deflected before any model call. The SSE streaming
// transport + the thread UI are device-gated (H1); this ships the non-streaming grounded core.
import { createContext, requireMode } from '../_shared/context.ts';
import { AppError, jsonResponse, withErrorEnvelope } from '../_shared/http.ts';
import { hasPremium } from '../_shared/entitlement.ts';
import { KB_VERSION, traditionFor, type GeminiCall, type GeminiResponse } from '../_shared/narrative.ts';
import { withRetry } from '../_shared/gemini.ts';
import { CHAT_MODEL, CHAT_PROMPT_VERSION, generateChatReply, keyedGrounding, mergeGrounding, suggestionChips, type ChatTurn, type KbChunk } from '../_shared/chat.ts';
import { embedText, toVectorLiteral } from '../_shared/embeddings.ts';
import type { SupabaseClient } from '@supabase/supabase-js';

import { SYSTEM_INSTRUCTION } from '../../../prompts/chat/v1/system_instruction.generated.ts';

function realGeminiCall(): GeminiCall {
  const key = Deno.env.get('GEMINI_API_KEY') ?? '';
  return async (body) => {
    const res = await withRetry(() => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${CHAT_MODEL}:generateContent?key=${key}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
    if (!res.ok) throw new Error(`gemini_http_${res.status}`);
    return (await res.json()) as GeminiResponse;
  };
}

interface Body {
  message?: string;
  reading_id?: string;
  thread_id?: string;
}

/** feature_keys grounding a stored reading (readings.narrative.sections[].feature_refs). */
function readingFeatureRefs(narrative: unknown): string[] {
  const sections = (narrative as { sections?: Array<{ feature_refs?: unknown }> } | null)?.sections ?? [];
  return sections.flatMap((s) => (Array.isArray(s.feature_refs) ? (s.feature_refs as string[]) : []));
}

async function fuzzyGrounding(db: SupabaseClient, question: string, tradition: string | null): Promise<KbChunk[]> {
  try {
    const vec = await embedText(question);
    const { data } = await db.rpc('kb_search', { p_query: toVectorLiteral(vec), p_kb_version: KB_VERSION, p_tradition: tradition, p_k: 6 });
    return ((data ?? []) as Array<{ feature_key: string; content: string; tradition?: string; distance?: number }>).map((r) => ({ feature_key: r.feature_key, content: r.content, tradition: r.tradition, distance: r.distance }));
  } catch {
    return []; // embedding/retrieval is best-effort; keyed grounding still anchors the answer
  }
}

Deno.serve(
  withErrorEnvelope(async (req) => {
    const ctx = createContext(req);
    requireMode(ctx, 'user');
    if (!ctx.userId) throw new AppError('unauthorized', 'no authenticated user', 401);

    const body = (await req.json().catch(() => ({}))) as Body;
    const message = (body.message ?? '').trim();
    if (!message) throw new AppError('bad_request', 'message is required', 400);
    if (message.length > 1000) throw new AppError('bad_request', 'message too long', 400);

    // Entitlement: chat is premium-only (§5.2). The table is truth.
    if (!(await hasPremium(ctx.admin, ctx.userId))) throw new AppError('payment_required', 'subscribe to chat with your reading', 402);

    // Resolve the thread (owned) — reuse an existing one, or open one anchored to a reading.
    let threadId = body.thread_id ?? null;
    let readingId = body.reading_id ?? null;
    if (threadId) {
      const { data: t } = await ctx.supabase.from('chat_threads').select('id, reading_id').eq('id', threadId).maybeSingle();
      if (!t) throw new AppError('not_found', 'thread not found', 404);
      readingId = readingId ?? (t.reading_id as string | null);
    }

    // Load the grounding reading (RLS-scoped → a stranger's id yields nothing).
    let refs: string[] = [];
    let tradition: string | null = null;
    if (readingId) {
      const { data: reading } = await ctx.supabase.from('readings').select('id, kind, narrative').eq('id', readingId).maybeSingle();
      if (!reading) throw new AppError('not_found', 'reading not found', 404);
      refs = readingFeatureRefs(reading.narrative);
      tradition = reading.kind === 'combined' ? null : traditionFor(reading.kind as 'palm' | 'face');
    }

    if (!threadId) {
      const { data: created, error } = await ctx.supabase.from('chat_threads').insert({ user_id: ctx.userId, reading_id: readingId }).select('id').single();
      if (error || !created) throw new AppError('thread_create_failed', error?.message ?? 'could not open thread', 500);
      threadId = created.id as string;
    }

    // Grounding: the reading's own lines (keyed) + fuzzy pgvector hits for whatever the question is about.
    const kb = new Map<string, string>();
    if (refs.length) {
      const { data: chunks } = await ctx.admin.from('kb_chunks').select('feature_key, content').eq('kb_version', KB_VERSION).in('feature_key', refs);
      for (const c of (chunks ?? []) as Array<{ feature_key: string; content: string }>) kb.set(c.feature_key, c.content);
    }
    const grounding = mergeGrounding(keyedGrounding(refs, kb), await fuzzyGrounding(ctx.admin, message, tradition));

    // Recent history for continuity.
    const { data: hist } = await ctx.supabase.from('chat_messages').select('role, content').eq('thread_id', threadId).order('created_at', { ascending: true }).limit(8);
    const history = ((hist ?? []) as Array<{ role: string; content: string }>).map((m) => ({ role: m.role as ChatTurn['role'], content: m.content }));

    const result = await generateChatReply({ question: message, grounding, history, systemInstruction: SYSTEM_INSTRUCTION, geminiCall: realGeminiCall() });
    if (!result.ok) throw new AppError('chat_failed', result.failureReason, 502, result.detail);

    // Persist both turns (service-role: chat_messages has no client insert policy).
    await ctx.admin.from('chat_messages').insert([
      { thread_id: threadId, role: 'user', content: message },
      { thread_id: threadId, role: 'assistant', content: result.reply, tokens_in: result.usage?.promptTokenCount, tokens_out: result.usage?.candidatesTokenCount },
    ]);

    return jsonResponse({ thread_id: threadId, reply: result.reply, deflected: result.deflected, category: result.deflected ? result.category : undefined, citations: result.citations, chips: suggestionChips(refs), prompt_version: CHAT_PROMPT_VERSION });
  }),
);
