// worker-compat (Backend §4, §7) — drains one compat_jobs message → loads both pinned canonical
// feature_sets → runs the DETERMINISTIC scorer (compat.v1) → Gemini Flash-Lite writes the
// both-perspectives narrative (scores as ground truth) → stores score/sub_scores/narrative +
// version stamps → status='complete' (which fires the Realtime broadcast to both members). Same
// failure/retry policy as the other workers.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { withRetry } from '../_shared/gemini.ts';
import { COMPAT_ALGORITHM_VERSION, scorePair } from '../_shared/compat.ts';
import { COMPAT_NARRATIVE_MODEL, COMPAT_PROMPT_VERSION, generateCompatNarrative } from '../_shared/compat-narrative.ts';
import { renderNotification } from '../_shared/notif-templates.ts';
import { KB_VERSION, type GeminiCall, type GeminiResponse } from '../_shared/narrative.ts';
import { writeTelemetry } from '../_shared/telemetry.ts';
import { decideFailure, exhausted } from '../_shared/retry.ts';
import { jsonResponse, withErrorEnvelope } from '../_shared/http.ts';
import { createContext, requireMode } from '../_shared/context.ts';

import { SYSTEM_INSTRUCTION as COMPAT_PREFIX } from '../../../prompts/compat/v1/system_instruction.generated.ts';

const admin = (): SupabaseClient =>
  createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', { auth: { persistSession: false, autoRefreshToken: false } });

function realGeminiCall(): GeminiCall {
  const key = Deno.env.get('GEMINI_API_KEY') ?? '';
  return async (body) => {
    const res = await withRetry(() =>
      fetch(`https://generativelanguage.googleapis.com/v1beta/models/${COMPAT_NARRATIVE_MODEL}:generateContent?key=${key}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    );
    if (!res.ok) throw new Error(`gemini_http_${res.status}`);
    return (await res.json()) as GeminiResponse;
  };
}

const archive = (db: SupabaseClient, msgId: number) => db.rpc('queue_archive', { p_queue: 'compat_jobs', p_msg_id: msgId });
const setStatus = (db: SupabaseClient, id: string, status: string) => db.from('compatibility_results').update({ status }).eq('id', id);

interface CompatMessage {
  msg_id: number;
  read_ct: number;
  enqueued_at: string;
  message: { result_id: string };
}

async function processMessage(db: SupabaseClient, msg: CompatMessage, geminiCall: GeminiCall) {
  const started = Date.now();
  const resultId = msg.message.result_id;
  const queueAgeMs = Date.now() - new Date(msg.enqueued_at).getTime();
  const telem = { worker: 'worker-compat', queue: 'compat_jobs', msg_id: msg.msg_id, queue_age_ms: queueAgeMs };

  const applyFailure = async (reason: string) => {
    const o = decideFailure(reason, msg.read_ct);
    if (o.action === 'retry') {
      await writeTelemetry(db, { ...telem, status: 'retry', model_latency_ms: Date.now() - started, detail: { failure: reason, read_ct: msg.read_ct } });
      return { resultId, outcome: 'retry', reason };
    }
    await setStatus(db, resultId, 'failed');
    await writeTelemetry(db, { ...telem, status: 'failed', model_latency_ms: Date.now() - started, detail: { failure: o.failureReason, read_ct: msg.read_ct, dead_letter: o.action === 'dead_letter' } });
    await archive(db, msg.msg_id);
    return { resultId, outcome: o.action, reason: o.failureReason };
  };

  if (exhausted(msg.read_ct)) return applyFailure('exhausted');

  const { data: result } = await db.from('compatibility_results').select('id, pair_id, status, feature_set_a, feature_set_b').eq('id', resultId).single();
  if (!result) return applyFailure('missing_result');
  if (result.status === 'complete') {
    await archive(db, msg.msg_id); // already done (idempotent)
    return { resultId, outcome: 'already_complete' };
  }
  if (!result.feature_set_a || !result.feature_set_b) return applyFailure('missing_feature_set');

  const load = async (id: string) => (await db.from('feature_sets').select('features').eq('id', id).single()).data?.features as Record<string, unknown> | undefined;
  const [fa, fb] = [await load(result.feature_set_a), await load(result.feature_set_b)];
  if (!fa || !fb) return applyFailure('missing_feature_set');

  const score = scorePair(fa, fb);
  const { data: pair } = await db.from('compatibility_pairs').select('user_a, user_b').eq('id', result.pair_id).single();
  const nameOf = async (uid?: string) => (uid ? (await db.from('profiles').select('display_name').eq('id', uid).maybeSingle()).data?.display_name ?? undefined : undefined);
  const [nameA, nameB] = [await nameOf(pair?.user_a), await nameOf(pair?.user_b)];

  let narr;
  try {
    narr = await generateCompatNarrative({
      composite: score.composite,
      subScores: score.sub_scores as unknown as Record<string, number>,
      handA: String(fa.hand_shape ?? 'mixed'),
      handB: String(fb.hand_shape ?? 'mixed'),
      nameA,
      nameB,
      systemInstruction: COMPAT_PREFIX,
      geminiCall,
    });
  } catch {
    return applyFailure('gemini_unavailable');
  }
  if (!narr.ok) return applyFailure(narr.failureReason);

  const { error: upErr } = await db
    .from('compatibility_results')
    .update({ status: 'complete', score: score.composite, sub_scores: score.sub_scores, narrative: narr.narrative, algorithm_version: COMPAT_ALGORITHM_VERSION, model_id: COMPAT_NARRATIVE_MODEL, prompt_version: COMPAT_PROMPT_VERSION, kb_version: KB_VERSION })
    .eq('id', resultId);
  if (upErr) return applyFailure('store_failed');

  // notify BOTH members — the P2 reveal moment (§7.4). Each sees the OTHER member's name. Rendered
  // from the shared templates (P9.T5) and routed through the dedupe/cap gate (idempotent per pair
  // per day). Best-effort; a push failure never fails the job.
  try {
    for (const [uid, otherName] of [[pair?.user_a, nameB], [pair?.user_b, nameA]] as const) {
      if (!uid) continue;
      const n = renderNotification('compat_complete', { name: otherName, score: score.composite, pair_id: result.pair_id });
      await db.rpc('enqueue_push_deduped', { p_user_id: uid, p_type: n.type, p_title: n.title, p_body: n.body, p_deep_link: n.deep_link, p_data: {}, p_dedupe_key: n.dedupe_key, p_cap_class: n.cap_class });
    }
  } catch (e) {
    console.error('[worker-compat] push enqueue failed (non-fatal):', e instanceof Error ? e.message : e);
  }

  await writeTelemetry(db, { ...telem, status: 'ok', model_latency_ms: Date.now() - started, tokens_in: narr.usage?.promptTokenCount, tokens_out: narr.usage?.candidatesTokenCount, detail: { composite: score.composite } });
  await archive(db, msg.msg_id);
  return { resultId, outcome: 'complete', composite: score.composite };
}

Deno.serve(
  withErrorEnvelope(async (req) => {
    requireMode(createContext(req), 'secret'); // internal only — cron/pipeline invokes with the service key
    const db = admin();
    const geminiCall = realGeminiCall();
    const { data: msgs } = await db.rpc('queue_read', { p_queue: 'compat_jobs', p_vt: 60, p_qty: 1 });
    const outcomes = [];
    for (const m of (msgs ?? []) as CompatMessage[]) outcomes.push(await processMessage(db, m, geminiCall));
    return jsonResponse({ processed: outcomes.length, outcomes });
  }),
);
