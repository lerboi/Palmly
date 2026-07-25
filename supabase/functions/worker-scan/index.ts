// worker-scan (Backend §4, §6.1): drains one scan_jobs message → downloads the crop → Gemini
// extraction → validate → store feature_set → status transitions + telemetry → enqueue
// narrative_jobs. Invoked by the pg_cron drain (via pg_net) once deployed. The consistency layer
// (subject matching / canonical reuse / 2-vote) is layered in at P5.T3.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { withRetry } from '../_shared/gemini.ts';
import { EXTRACTION_MODEL, extractFeatures, type GeminiCall, type GeminiResponse } from '../_shared/extraction.ts';
import { deriveGeometry, featureHash, parseHandSignature, type Geometry } from '../_shared/features.ts';
import { fieldMajority, matchSubject, matchSubjectByHand, sameFeatures, type SubjectCandidate } from '../_shared/consistency.ts';
import { writeTelemetry } from '../_shared/telemetry.ts';
import { deleteScanImage } from '../_shared/scan-image.ts';
import { alreadyProcessed, decideFailure, exhausted } from '../_shared/retry.ts';
import { AppError, jsonResponse, withErrorEnvelope } from '../_shared/http.ts';
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

/**
 * `extractor_version` = cv-pipeline + model + prompt tuple (§3.2, §6.6 item 2). The cv component
 * is the CLIENT's claim from `scans.capture_meta.cv` — 'cv1' when the app ran the pinned
 * canonical crop/warp (P4.T3), 'cv0' for raw uploads (web picks, no-hand fallbacks, pre-P4.T3
 * clients) — so readings honestly record which input pipeline produced them.
 */
function extractorVersion(captureMeta: unknown): string {
  const cv = (captureMeta as Record<string, unknown> | null)?.cv;
  const cvTag = typeof cv === 'string' && /^cv\d{1,3}$/.test(cv) ? cv : 'cv0';
  return `${cvTag}+gemini-3.5-flash+extract.v1`;
}

// Frozen extraction prefix — the versioned prompt, bundled via a generated static import so it
// deploys (a Deno.readTextFile of a path outside the function dir does NOT bundle; Decision Log 2026-07-14).
import { SYSTEM_INSTRUCTION as EXTRACTION_PREFIX } from '../../../prompts/extraction/v1/system_instruction.generated.ts';

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

  const { data: scan } = await db.from('scans').select('id,user_id,kind,side,storage_path,status,capture_meta').eq('id', scanId).single();
  if (!scan) return applyFailure('missing_scan');
  const handSig = parseHandSignature((scan.capture_meta as Record<string, unknown> | null)?.hand_geometry);

  // H2: never re-run a scan the pipeline has already moved past. If `archive` below fails after the
  // narrative job is enqueued, pgmq redelivers this message — and because subject_profiles was
  // already inserted, matchSubject would now recognize the subject THIS scan just created, set
  // status='matched', and broadcast that regression to a client watching a 'narrating'/'complete'
  // scan, while a duplicate narrative job is still in flight. These states mean the work is done;
  // only the archive is owed. 'extracting' is deliberately NOT terminal — a worker that crashed
  // mid-extraction leaves it there and must be retried.
  if (alreadyProcessed(scan.status)) {
    await writeTelemetry(db, { ...telem, status: 'ok', model_latency_ms: Date.now() - started, detail: { redelivery_short_circuit: scan.status } });
    await archive(db, msg.msg_id);
    return { scanId, outcome: 'already_processed', status: scan.status };
  }

  const kind = scan.kind as 'palm' | 'face';
  const subjectKind = kind === 'face' ? 'face' : `palm_${scan.side}`;
  const candidates = await loadSubjectCandidates(db, scan.user_id, subjectKind);

  const settleMatched = async (subject: Candidate, via: 'hand' | 'lines') => {
    // Self-heal leg 2 (2026-07-25): a line-matched scan that carries a hand signature the stored
    // canonical lacks BACKFILLS it — otherwise legacy subjects stay stuck on the line-matcher
    // coin flip forever (live: scan2 missed at 0.156, scan3 hit at <0.08, same palm).
    const backfillHand = via === 'lines' && handSig !== null && !subject.geometry?.hand;
    if (backfillHand) {
      await db
        .from('feature_sets')
        .update({ geometry: { ...subject.geometry, hand: handSig } })
        .eq('id', subject.canonicalFeatureSetId);
    }
    await db.from('subject_profiles').update({ scan_count: subject.scanCount + 1, last_matched_at: new Date().toISOString() }).eq('id', subject.subjectId);
    await setStatus(db, scanId, 'matched');
    // A matched scan's crop is fully redundant (hand-matched crops were never even downloaded) —
    // delete immediately so the trust badge stays true (D2; keep_image respected).
    await deleteScanImage(db, scanId);
    await writeTelemetry(db, { worker: 'worker-scan', queue: 'scan_jobs', msg_id: msg.msg_id, status: 'ok', queue_age_ms: queueAgeMs, model_latency_ms: Date.now() - started, detail: { reused: subject.canonicalFeatureSetId, via, ...(backfillHand ? { hand_backfilled: true } : {}) } });
    await archive(db, msg.msg_id);
    return { scanId, outcome: 'matched', canonical: subject.canonicalFeatureSetId };
  };

  // §6.6 items 3-4, the REAL fast path (2026-07-25): the client's MediaPipe hand-shape signature
  // identifies the hand BEFORE any download or Gemini spend — a recognized hand settles in ~1s
  // with the stored reading ("Your palm is unchanged"). Line-geometry matching demoted to
  // fallback after failing its first live repeat-scan (0.156 vs the 0.08 threshold).
  const preMatch = matchSubjectByHand(handSig, candidates);
  if (preMatch) return settleMatched(preMatch.subject, 'hand');

  await setStatus(db, scanId, 'extracting');

  const dl = await db.storage.from('scans').download(scan.storage_path);
  if (dl.error || !dl.data) return applyFailure('image_unavailable'); // transient → retry
  const imageBase64 = bytesToBase64(new Uint8Array(await dl.data.arrayBuffer()));

  const runExtract = () => extractFeatures({ imageBase64, kind, systemInstruction: EXTRACTION_PREFIX, geminiCall });

  // vote A — its geometry drives the fallback subject matching
  let a: Awaited<ReturnType<typeof runExtract>>;
  try {
    a = await runExtract();
  } catch (e) {
    // A permanent 4xx rejection (gemini_rejected) must fail fast, not masquerade as transient
    // (found live 2026-07-24: an invalid responseSchema spent an hour as "gemini_unavailable").
    console.error('[worker-scan] extraction error:', e instanceof AppError ? `${e.code} ${e.message} :: ${String(e.details).slice(0, 300)}` : String(e));
    return applyFailure(e instanceof AppError && e.code === 'gemini_rejected' ? 'gemini_rejected' : 'gemini_unavailable');
  }
  if (!a.ok) return applyFailure(a.failureReason);

  // fallback matcher (legacy scans without a hand signature): Gemini line geometry
  const m = matchSubject(a.geometry, candidates);
  if (m) return settleMatched(m.subject, 'lines');

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
  // The stored geometry carries BOTH signatures: Gemini line geometry (fallback matching +
  // diagram reuse) and the client's hand-shape signature (primary matching, may be null for
  // legacy/web scans).
  const geometry: Geometry = { ...deriveGeometry(features), hand: handSig };

  const { data: fs, error: fsErr } = await db
    .from('feature_sets')
    .insert({
      scan_id: scanId, user_id: scan.user_id, kind, side: scan.side,
      features, feature_schema_version: SCHEMA_VERSION, extractor_version: extractorVersion(scan.capture_meta),
      geometry, feature_hash: featHash,
    })
    .select('id')
    .single();
  if (fsErr || !fs) return applyFailure('store_failed'); // transient DB error → retry

  // subject_profiles has unique(user_id, kind) (verified live), so reaching here with an existing
  // profile means the matchers failed to recognize a subject we already store (live 2026-07-25:
  // the line matcher measured 0.156 on a real same-palm rescan; face geometry is all-null — H1).
  // The constraint's philosophy is "one subject per (user, kind)", so on conflict we ADOPT: the
  // newest extraction becomes the canonical feature_set. This also self-heals legacy subjects
  // into the hand-signature era — the adopted canonical carries `geometry.hand`, so the user's
  // NEXT scan pre-matches and the consistency promise starts holding.
  const { error: spErr } = await db
    .from('subject_profiles')
    .insert({ user_id: scan.user_id, kind: subjectKind, canonical_feature_set_id: fs.id });
  let subjectProfile = 'created';
  if (spErr && spErr.code === '23505') {
    const { error: adoptErr } = await db
      .from('subject_profiles')
      .update({ canonical_feature_set_id: fs.id })
      .eq('user_id', scan.user_id)
      .eq('kind', subjectKind);
    subjectProfile = adoptErr ? `adopt_error:${adoptErr.code ?? 'unknown'}` : 'adopted';
  } else if (spErr) {
    subjectProfile = `error:${spErr.code ?? 'unknown'}`;
  }
  if (spErr) console.error(`[worker-scan] subject_profiles insert conflict → ${subjectProfile}:`, spErr.message);

  await setStatus(db, scanId, 'narrating');
  await db.rpc('queue_send', { p_queue: 'narrative_jobs', p_msg: { scan_id: scanId, feature_set_id: fs.id } });
  await writeTelemetry(db, {
    worker: 'worker-scan', queue: 'scan_jobs', msg_id: msg.msg_id, status: 'ok',
    queue_age_ms: queueAgeMs, model_latency_ms: Date.now() - started,
    tokens_in: a.usage?.promptTokenCount, tokens_out: a.usage?.candidatesTokenCount,
    cache_hit: (a.usage?.cachedContentTokenCount ?? 0) > 0, detail: { votes, subject_profile: subjectProfile },
  });
  await archive(db, msg.msg_id);
  return { scanId, outcome: 'new_subject', feature_set_id: fs.id, votes };
}

Deno.serve(
  withErrorEnvelope(async (req) => {
    requireMode(createContext(req), 'secret'); // internal only — cron/pipeline invokes with the service key
    const db = admin();
    const geminiCall = realGeminiCall();
    // vt must exceed worst-case processing or pgmq redelivers a message a healthy worker is still
    // on — here that costs 2-3 PAID extractions, the most expensive duplicate in the system. Worst
    // case: 3 votes × (5 attempts (withRetry maxRetries 4) × a 5-20s call (spec §11.2) + ~7s
    // backoff) ≈ 320s, vs the old 60s — so even an untroubled 3-vote scan (~60s) was at the limit.
    // 300s covers the realistic path with headroom; the pathological all-retries-on-every-vote case
    // is bounded by read_ct → dead-letter, and the status guard above now makes a redelivery
    // harmless rather than destructive.
    const { data: msgs } = await db.rpc('queue_read', { p_queue: 'scan_jobs', p_vt: 300, p_qty: 1 });
    const list = (msgs ?? []) as ScanMessage[];
    const outcomes = [];
    for (const m of list) outcomes.push(await processMessage(db, m, geminiCall));
    return jsonResponse({ processed: outcomes.length, outcomes });
  }),
);
