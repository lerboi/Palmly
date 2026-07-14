// worker-scan (Backend §4, §6.1): drains one scan_jobs message → downloads the crop → Gemini
// extraction → validate → store feature_set → status transitions + telemetry → enqueue
// narrative_jobs. Invoked by the pg_cron drain (via pg_net) once deployed. The consistency layer
// (subject matching / canonical reuse / 2-vote) is layered in at P5.T3.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { withRetry } from '../_shared/gemini.ts';
import { EXTRACTION_MODEL, extractFeatures, type GeminiCall, type GeminiResponse } from '../_shared/extraction.ts';
import { deriveGeometry, featureHash, type Geometry } from '../_shared/features.ts';
import { fieldMajority, matchSubject, sameFeatures, type SubjectCandidate } from '../_shared/consistency.ts';
import { writeTelemetry } from '../_shared/telemetry.ts';
import { decideFailure, exhausted } from '../_shared/retry.ts';
import { jsonResponse, withErrorEnvelope } from '../_shared/http.ts';
import { createContext, requireMode } from '../_shared/context.ts';

type Candidate = SubjectCandidate & { scanCount: number };

/** Load the user's existing subjects for this hand/face, each with its canonical geometry. */
async function loadSubjectCandidates(db: SupabaseClient, userId: string, subjectKind: string): Promise<Candidate[]> {
  const { data } = await db.from('subject_profiles').select('id, canonical_feature_set_id, scan_count').eq('user_id', userId).eq('kind', subjectKind);
  const rows = (data ?? []) as Array<{ id: string; canonical_feature_set_id: string; scan_count: number }>;
  const out: Candidate[] = [];
  for (const r of rows) {
    const { data: fsRow } = await db.from('feature_sets').select('geometry').eq('id', r.canonical_feature_set_id).single();
    out.push({ subjectId: r.id, canonicalFeatureSetId: r.canonical_feature_set_id, scanCount: r.scan_count, geometry: (fsRow?.geometry ?? {}) as Geometry });
  }
  return out;
}

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
    // 429/5xx that survived withRetry's backoff → throw so the worker treats it as transient
    // (retry via the pgmq visibility timeout), not as malformed output (a permanent failure).
    if (!res.ok) throw new Error(`gemini_http_${res.status}`);
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
  read_ct: number;
  enqueued_at: string;
  message: { scan_id: string };
}

async function processMessage(db: SupabaseClient, msg: ScanMessage, geminiCall: GeminiCall) {
  const started = Date.now();
  const scanId = msg.message.scan_id;
  const queueAgeMs = Date.now() - new Date(msg.enqueued_at).getTime();
  const telem = { worker: 'worker-scan', queue: 'scan_jobs', msg_id: msg.msg_id, queue_age_ms: queueAgeMs };

  // §6.6 failure policy: permanent → fail fast (archive + status failed); transient → retry (leave
  // the message so pgmq re-delivers after the vt); exhausted/poison → dead-letter.
  const applyFailure = async (reason: string) => {
    const o = decideFailure(reason, msg.read_ct);
    if (o.action === 'retry') {
      await writeTelemetry(db, { ...telem, status: 'retry', model_latency_ms: Date.now() - started, detail: { failure: reason, read_ct: msg.read_ct } });
      return { scanId, outcome: 'retry', reason }; // NOT archived → redelivered after the visibility timeout
    }
    await setStatus(db, scanId, 'failed', o.failureReason);
    await writeTelemetry(db, { ...telem, status: 'failed', model_latency_ms: Date.now() - started, detail: { failure: o.failureReason, read_ct: msg.read_ct, dead_letter: o.action === 'dead_letter' } });
    await archive(db, msg.msg_id);
    return { scanId, outcome: o.action, reason: o.failureReason };
  };

  // poison / retry-exhausted message → dead-letter before spending another Gemini call on it
  if (exhausted(msg.read_ct)) return applyFailure('exhausted');

  const { data: scan } = await db.from('scans').select('id,user_id,kind,side,storage_path').eq('id', scanId).single();
  if (!scan) return applyFailure('missing_scan');
  await setStatus(db, scanId, 'extracting');

  const dl = await db.storage.from('scans').download(scan.storage_path);
  if (dl.error || !dl.data) return applyFailure('image_unavailable'); // transient → retry
  const imageBase64 = bytesToBase64(new Uint8Array(await dl.data.arrayBuffer()));

  const kind = scan.kind as 'palm' | 'face';
  const subjectKind = kind === 'face' ? 'face' : `palm_${scan.side}`;
  const runExtract = () => extractFeatures({ imageBase64, kind, systemInstruction: EXTRACTION_PREFIX, geminiCall });

  // vote A — its geometry also drives subject matching
  let a: Awaited<ReturnType<typeof runExtract>>;
  try {
    a = await runExtract();
  } catch {
    return applyFailure('gemini_unavailable'); // Gemini unavailable past withRetry → transient
  }
  if (!a.ok) return applyFailure(a.failureReason);

  // recognize the same hand → reuse the canonical feature_set (§6.6.4: no new extraction row)
  const m = matchSubject(a.geometry, await loadSubjectCandidates(db, scan.user_id, subjectKind));
  if (m) {
    await db.from('subject_profiles').update({ scan_count: m.subject.scanCount + 1, last_matched_at: new Date().toISOString() }).eq('id', m.subject.subjectId);
    await setStatus(db, scanId, 'matched');
    await writeTelemetry(db, { worker: 'worker-scan', queue: 'scan_jobs', msg_id: msg.msg_id, status: 'ok', queue_age_ms: queueAgeMs, model_latency_ms: Date.now() - started, detail: { reused: m.subject.canonicalFeatureSetId } });
    await archive(db, msg.msg_id);
    return { scanId, outcome: 'matched', canonical: m.subject.canonicalFeatureSetId };
  }

  // new subject → confirm the trust-critical first extraction with a 2nd vote (+ tie-break).
  // A transient blip on a *confirming* vote must not fail the whole scan (vote A already succeeded)
  // — fall back to fewer votes rather than retrying the whole pipeline.
  const voteSafely = async (): Promise<Awaited<ReturnType<typeof runExtract>>> => {
    try {
      return await runExtract();
    } catch {
      return { ok: false, failureReason: 'vote_unavailable' };
    }
  };
  let features = a.features;
  let votes = 1;
  const b = await voteSafely();
  if (b.ok) {
    votes = 2;
    if (!sameFeatures(a.features, b.features)) {
      const c3 = await voteSafely();
      features = fieldMajority(c3.ok ? [a.features, b.features, c3.features] : [a.features, b.features]);
      votes = c3.ok ? 3 : 2;
    }
  }
  const featHash = await featureHash(features);
  const geometry = deriveGeometry(features);

  const { data: fs, error: fsErr } = await db
    .from('feature_sets')
    .insert({
      scan_id: scanId, user_id: scan.user_id, kind, side: scan.side,
      features, feature_schema_version: SCHEMA_VERSION, extractor_version: EXTRACTOR_VERSION,
      geometry, feature_hash: featHash,
    })
    .select('id')
    .single();
  if (fsErr || !fs) return applyFailure('store_failed'); // transient DB error → retry

  await db.from('subject_profiles').insert({ user_id: scan.user_id, kind: subjectKind, canonical_feature_set_id: fs.id });
  await setStatus(db, scanId, 'narrating');
  await db.rpc('queue_send', { p_queue: 'narrative_jobs', p_msg: { scan_id: scanId, feature_set_id: fs.id } });
  await writeTelemetry(db, {
    worker: 'worker-scan', queue: 'scan_jobs', msg_id: msg.msg_id, status: 'ok',
    queue_age_ms: queueAgeMs, model_latency_ms: Date.now() - started,
    tokens_in: a.usage?.promptTokenCount, tokens_out: a.usage?.candidatesTokenCount,
    cache_hit: (a.usage?.cachedContentTokenCount ?? 0) > 0, detail: { votes },
  });
  await archive(db, msg.msg_id);
  return { scanId, outcome: 'new_subject', feature_set_id: fs.id, votes };
}

Deno.serve(
  withErrorEnvelope(async (req) => {
    requireMode(createContext(req), 'secret'); // internal only — cron/pipeline invokes with the service key
    const db = admin();
    const geminiCall = realGeminiCall();
    const { data: msgs } = await db.rpc('queue_read', { p_queue: 'scan_jobs', p_vt: 60, p_qty: 1 });
    const list = (msgs ?? []) as ScanMessage[];
    const outcomes = [];
    for (const m of list) outcomes.push(await processMessage(db, m, geminiCall));
    return jsonResponse({ processed: outcomes.length, outcomes });
  }),
);
