// worker-narrative (Backend §4, §6.1, §6.3): drains one narrative_jobs message → loads the stored
// feature_set + the pinned KB → deterministic keyed KB selection → Gemini Flash-Lite writes the
// section prose (features + KB only, NO image) → grafted onto the deterministic claim skeleton →
// insert `readings` (with model/prompt/kb version stamps) → scan status → complete → telemetry →
// archive. Invoked by the pg_cron drain (via pg_net) once deployed. Only runs for NEW subjects —
// worker-scan short-circuits repeat scans to `matched` and reuses the stored reading (§6.6.4).
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { withRetry } from '../_shared/gemini.ts';
import {
  generateNarrative,
  KB_VERSION,
  NARRATIVE_MODEL,
  PROMPT_VERSION,
  traditionFor,
  type FeatureKind,
  type GeminiCall,
  type GeminiResponse,
} from '../_shared/narrative.ts';
import { writeTelemetry } from '../_shared/telemetry.ts';
import { decideFailure, exhausted } from '../_shared/retry.ts';
import { jsonResponse, withErrorEnvelope } from '../_shared/http.ts';
import { createContext, requireMode } from '../_shared/context.ts';

import { SYSTEM_INSTRUCTION as NARRATIVE_PREFIX } from '../../../prompts/narrative/v1/system_instruction.generated.ts';

const admin = (): SupabaseClient =>
  createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
    auth: { persistSession: false, autoRefreshToken: false },
  });

function realGeminiCall(): GeminiCall {
  const key = Deno.env.get('GEMINI_API_KEY') ?? '';
  return async (body) => {
    const res = await withRetry(() =>
      fetch(`https://generativelanguage.googleapis.com/v1beta/models/${NARRATIVE_MODEL}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );
    if (!res.ok) throw new Error(`gemini_http_${res.status}`); // 429/5xx past withRetry → transient
    return (await res.json()) as GeminiResponse;
  };
}

/** Load the pinned KB tradition into a feature_key → passage map for deterministic keyed lookup. */
async function loadKb(db: SupabaseClient, tradition: string): Promise<Map<string, string>> {
  const { data } = await db.from('kb_chunks').select('feature_key, content').eq('kb_version', KB_VERSION).eq('tradition', tradition);
  const map = new Map<string, string>();
  for (const r of (data ?? []) as Array<{ feature_key: string; content: string }>) map.set(r.feature_key, r.content);
  return map;
}

const setStatus = (db: SupabaseClient, id: string, status: string, failure_reason?: string) =>
  db.from('scans').update({ status, ...(failure_reason ? { failure_reason } : {}) }).eq('id', id);

/** Fire the card-render function to pre-render the share card (§6.1). Best-effort — a failure here
 *  must never fail the reading (the card can be rendered on-demand at share time). */
async function preRenderCard(featureSetId: string, readingId: string): Promise<void> {
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) return;
    await fetch(`${url}/functions/v1/card-render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ feature_set_id: featureSetId, variant: 'feed_4x5', source_type: 'reading', source_id: readingId }),
    });
  } catch (e) {
    console.error('[worker-narrative] card pre-render invoke failed (non-fatal):', e instanceof Error ? e.message : e);
  }
}

const archive = (db: SupabaseClient, msgId: number) =>
  db.rpc('queue_archive', { p_queue: 'narrative_jobs', p_msg_id: msgId });

interface NarrativeMessage {
  msg_id: number;
  read_ct: number;
  enqueued_at: string;
  message: { scan_id: string; feature_set_id: string; depth_level?: number };
}

async function processMessage(db: SupabaseClient, msg: NarrativeMessage, geminiCall: GeminiCall) {
  const started = Date.now();
  const { scan_id: scanId, feature_set_id: featureSetId } = msg.message;
  const depthLevel = msg.message.depth_level ?? 1;
  const queueAgeMs = Date.now() - new Date(msg.enqueued_at).getTime();
  const telem = { worker: 'worker-narrative', queue: 'narrative_jobs', msg_id: msg.msg_id, queue_age_ms: queueAgeMs };

  // §6.6 failure policy (see _shared/retry.ts): permanent → archive+failed; transient → retry
  // (leave for vt redelivery); exhausted/poison → dead-letter.
  const applyFailure = async (reason: string, detail?: string) => {
    const o = decideFailure(reason, msg.read_ct);
    if (o.action === 'retry') {
      await writeTelemetry(db, { ...telem, status: 'retry', model_latency_ms: Date.now() - started, detail: { failure: reason, read_ct: msg.read_ct, ...(detail ? { detail } : {}) } });
      return { featureSetId, outcome: 'retry', reason };
    }
    if (scanId) await setStatus(db, scanId, 'failed', o.failureReason);
    await writeTelemetry(db, { ...telem, status: 'failed', model_latency_ms: Date.now() - started, detail: { failure: o.failureReason, read_ct: msg.read_ct, dead_letter: o.action === 'dead_letter', ...(detail ? { detail } : {}) } });
    await archive(db, msg.msg_id);
    return { featureSetId, outcome: o.action, reason: o.failureReason };
  };

  if (exhausted(msg.read_ct)) return applyFailure('exhausted');

  const { data: fs } = await db.from('feature_sets').select('id,user_id,kind,features').eq('id', featureSetId).single();
  if (!fs) return applyFailure('missing_feature_set');

  const kind = fs.kind as FeatureKind;
  const kb = await loadKb(db, traditionFor(kind));

  let r: Awaited<ReturnType<typeof generateNarrative>>;
  try {
    r = await generateNarrative({
      kind,
      features: fs.features as Record<string, unknown>,
      kb,
      depthLevel,
      systemInstruction: NARRATIVE_PREFIX,
      geminiCall,
    });
  } catch {
    return applyFailure('gemini_unavailable'); // Gemini unavailable past withRetry → transient
  }
  if (!r.ok) return applyFailure(r.failureReason, r.detail);

  const { data: reading, error: insErr } = await db
    .from('readings')
    .insert({
      user_id: fs.user_id,
      feature_set_id: fs.id,
      kind,
      narrative: r.narrative,
      depth_level: depthLevel,
      model_id: NARRATIVE_MODEL,
      prompt_version: PROMPT_VERSION,
      kb_version: KB_VERSION,
      tokens_in: r.usage?.promptTokenCount,
      tokens_out: r.usage?.candidatesTokenCount,
    })
    .select('id')
    .single();
  if (insErr || !reading) return applyFailure('store_failed', insErr?.message); // transient DB error → retry

  // pre-render the share card so sharing is instant (§6.1) — best-effort, never blocks completion,
  // and decoupled (an HTTP invoke of card-render, so resvg stays out of this worker).
  await preRenderCard(fs.id, reading.id);

  if (scanId) await setStatus(db, scanId, 'complete');
  await writeTelemetry(db, {
    worker: 'worker-narrative', queue: 'narrative_jobs', msg_id: msg.msg_id, status: 'ok',
    queue_age_ms: queueAgeMs, model_latency_ms: Date.now() - started,
    tokens_in: r.usage?.promptTokenCount, tokens_out: r.usage?.candidatesTokenCount,
    cache_hit: (r.usage?.cachedContentTokenCount ?? 0) > 0,
    detail: { sections: r.narrative.sections.length, depth_level: depthLevel },
  });
  await archive(db, msg.msg_id);
  return { featureSetId, outcome: 'reading_created', sections: r.narrative.sections.length };
}

Deno.serve(
  withErrorEnvelope(async (req) => {
    requireMode(createContext(req), 'secret'); // internal only — cron/pipeline invokes with the service key
    const db = admin();
    const geminiCall = realGeminiCall();
    const { data: msgs } = await db.rpc('queue_read', { p_queue: 'narrative_jobs', p_vt: 60, p_qty: 1 });
    const list = (msgs ?? []) as NarrativeMessage[];
    const outcomes = [];
    for (const m of list) outcomes.push(await processMessage(db, m, geminiCall));
    return jsonResponse({ processed: outcomes.length, outcomes });
  }),
);
