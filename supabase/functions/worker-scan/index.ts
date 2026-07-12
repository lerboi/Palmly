// worker-scan (Backend §4, §6.1): drains one scan_jobs message → downloads the crop → Gemini
// extraction → validate → store feature_set → status transitions + telemetry → enqueue
// narrative_jobs. Invoked by the pg_cron drain (via pg_net) once deployed. The consistency layer
// (subject matching / canonical reuse / 2-vote) is layered in at P5.T3.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { withRetry } from '../_shared/gemini.ts';
import { EXTRACTION_MODEL, extractFeatures, type GeminiCall, type GeminiResponse } from '../_shared/extraction.ts';
import { writeTelemetry } from '../_shared/telemetry.ts';
import { jsonResponse, withErrorEnvelope } from '../_shared/http.ts';

const SCHEMA_VERSION = 1;
const EXTRACTOR_VERSION = 'cv1+gemini-3.5-flash+extract.v1';

// Frozen extraction prefix. TODO(deploy): ensure this file bundles with the function (or generate a
// prefix.ts module) — Deno.readTextFile of a path outside the function dir may not deploy-bundle.
const EXTRACTION_PREFIX = await Deno.readTextFile(
  new URL('../../../prompts/extraction/v1/system_instruction.md', import.meta.url),
).catch(() => 'Extract palm/face features as strict enum-bucketed JSON per the schema.');

const admin = (): SupabaseClient =>
  createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
    auth: { persistSession: false, autoRefreshToken: false },
  });

function realGeminiCall(): GeminiCall {
  const key = Deno.env.get('GEMINI_API_KEY') ?? '';
  return async (body) => {
    const res = await withRetry(() =>
      fetch(`https://generativelanguage.googleapis.com/v1beta/models/${EXTRACTION_MODEL}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );
    return (await res.json()) as GeminiResponse;
  };
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

const setStatus = (db: SupabaseClient, id: string, status: string, failure_reason?: string) =>
  db.from('scans').update({ status, ...(failure_reason ? { failure_reason } : {}) }).eq('id', id);

const archive = (db: SupabaseClient, msgId: number) =>
  db.rpc('queue_archive', { p_queue: 'scan_jobs', p_msg_id: msgId });

interface ScanMessage {
  msg_id: number;
  enqueued_at: string;
  message: { scan_id: string };
}

async function processMessage(db: SupabaseClient, msg: ScanMessage, geminiCall: GeminiCall) {
  const started = Date.now();
  const scanId = msg.message.scan_id;
  const queueAgeMs = Date.now() - new Date(msg.enqueued_at).getTime();

  const { data: scan } = await db.from('scans').select('id,user_id,kind,side,storage_path').eq('id', scanId).single();
  if (!scan) {
    await archive(db, msg.msg_id);
    return { scanId, outcome: 'missing_scan' };
  }
  await setStatus(db, scanId, 'extracting');

  const dl = await db.storage.from('scans').download(scan.storage_path);
  if (dl.error || !dl.data) {
    await setStatus(db, scanId, 'failed', 'image_unavailable');
    await writeTelemetry(db, { worker: 'worker-scan', queue: 'scan_jobs', msg_id: msg.msg_id, status: 'failed', queue_age_ms: queueAgeMs, detail: { failure: 'image_unavailable' } });
    await archive(db, msg.msg_id);
    return { scanId, outcome: 'image_unavailable' };
  }
  const imageBase64 = bytesToBase64(new Uint8Array(await dl.data.arrayBuffer()));

  const result = await extractFeatures({ imageBase64, kind: scan.kind as 'palm' | 'face', systemInstruction: EXTRACTION_PREFIX, geminiCall });
  if (!result.ok) {
    await setStatus(db, scanId, 'failed', result.failureReason);
    await writeTelemetry(db, { worker: 'worker-scan', queue: 'scan_jobs', msg_id: msg.msg_id, status: 'failed', queue_age_ms: queueAgeMs, model_latency_ms: Date.now() - started, detail: { failure: result.failureReason } });
    await archive(db, msg.msg_id);
    return { scanId, outcome: result.failureReason };
  }

  const { data: fs, error: fsErr } = await db
    .from('feature_sets')
    .insert({
      scan_id: scanId, user_id: scan.user_id, kind: scan.kind, side: scan.side,
      features: result.features, feature_schema_version: SCHEMA_VERSION, extractor_version: EXTRACTOR_VERSION,
      geometry: result.geometry, feature_hash: result.featureHash,
    })
    .select('id')
    .single();
  if (fsErr || !fs) {
    await setStatus(db, scanId, 'failed', 'store_failed');
    await archive(db, msg.msg_id);
    return { scanId, outcome: 'store_failed' };
  }

  await setStatus(db, scanId, 'narrating');
  await db.rpc('queue_send', { p_queue: 'narrative_jobs', p_msg: { scan_id: scanId, feature_set_id: fs.id } });
  await writeTelemetry(db, {
    worker: 'worker-scan', queue: 'scan_jobs', msg_id: msg.msg_id, status: 'ok',
    queue_age_ms: queueAgeMs, model_latency_ms: Date.now() - started,
    tokens_in: result.usage?.promptTokenCount, tokens_out: result.usage?.candidatesTokenCount,
    cache_hit: (result.usage?.cachedContentTokenCount ?? 0) > 0,
  });
  await archive(db, msg.msg_id);
  return { scanId, outcome: 'ok', feature_set_id: fs.id };
}

Deno.serve(
  withErrorEnvelope(async () => {
    const db = admin();
    const geminiCall = realGeminiCall();
    const { data: msgs } = await db.rpc('queue_read', { p_queue: 'scan_jobs', p_vt: 60, p_qty: 1 });
    const list = (msgs ?? []) as ScanMessage[];
    const outcomes = [];
    for (const m of list) outcomes.push(await processMessage(db, m, geminiCall));
    return jsonResponse({ processed: outcomes.length, outcomes });
  }),
);
