// Pipeline front door (Backend §4, §6.1) — the pure, testable core of `scan-create` + `scan-ingest`.
// The Deno.serve wrappers (scan-create/index.ts, scan-ingest/index.ts) are thin; every branch that
// matters — input validation, the storage-path convention, quota-before-write ordering, the
// ownership gate, ingest idempotency, and object-existence-before-enqueue — lives here so it is unit
// testable without a live Postgres/Storage (same DI idiom as cleanup.ts).
//
// ⚠️ `scan-ingest` deliberately deviates from Backend §4's "storage webhook" wording: webhooks need
// pg_net, which is banned/parked in this project. It is implemented instead as a client-invoked
// confirm endpoint (user mode) — see the Decision Log entry for F0.T1.
import { AppError } from './http.ts';

export type ScanKind = 'palm' | 'face';
export type ScanSide = 'left' | 'right';

export interface ScanCreateInput {
  kind: ScanKind;
  side: ScanSide | null; // palm: always set (the A3 hand answer); face: null
  /** §3.2 `scans.capture_meta`: client cv-pipeline version + shutter-time landmark quality
   *  (P4.T3). Telemetry/consistency-audit data — never load-bearing, so invalid/oversized
   *  payloads are DROPPED (null), not rejected: a scan must not fail on its debug stamp. */
  captureMeta: Record<string, unknown> | null;
}

/** Max serialized capture_meta the client may attach — anything bigger is silently dropped. */
const CAPTURE_META_MAX_BYTES = 2048;

function parseCaptureMeta(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  try {
    if (JSON.stringify(raw).length > CAPTURE_META_MAX_BYTES) return null;
  } catch {
    return null; // circular/unserializable — a jsonb column can't hold it anyway
  }
  return raw as Record<string, unknown>;
}

/** Object path inside the private `scans` bucket. Migration 0003 keys owner RLS on segment [1], so
 *  the convention is `{user_id}/{scan_id}.jpg` and nothing else will read back under the owner. */
export function scanStoragePath(userId: string, scanId: string): string {
  return `${userId}/${scanId}.jpg`;
}

/**
 * Validate + normalize the client body. The client sends `hand` (the A3 onboarding answer, spec §2.1)
 * which maps onto the schema's `side` column (migration 0001: `side text check (side in
 * ('left','right'))`, palm only). A palm scan REQUIRES an explicit hand: defaulting a missing hand to
 * 'right' is exactly the silent trust-break the frontend audit flagged (§3.1), so an absent/invalid
 * hand fails loud rather than reading the wrong palm. `side` is pipeline input, not cosmetic.
 */
export function parseScanCreateInput(body: unknown): ScanCreateInput {
  const b = (body ?? {}) as Record<string, unknown>;
  const kind = b.kind === 'face' ? 'face' : b.kind === 'palm' ? 'palm' : null;
  if (!kind) throw new AppError('invalid_request', "kind must be 'palm' or 'face'", 400);
  const captureMeta = parseCaptureMeta(b.capture_meta);
  if (kind === 'face') return { kind, side: null, captureMeta };
  const hand = b.hand ?? b.side; // accept either spelling; `hand` is the client's field name
  if (hand !== 'left' && hand !== 'right') {
    throw new AppError('invalid_request', "a palm scan requires hand 'left' or 'right'", 400);
  }
  return { kind, side: hand, captureMeta };
}

// ── scan-create ────────────────────────────────────────────────────────────────────────────────

export interface CreatedScan {
  scanId: string;
  storagePath: string;
  uploadUrl: string;
  uploadToken: string;
}

export interface ScanCreateDeps {
  userId: string;
  input: ScanCreateInput;
  /** Fresh scan id (crypto.randomUUID in prod; a fixed value in tests). The path depends on it, so
   *  we mint it here rather than reading back a DB default. */
  newId: () => string;
  /** Consume scan quota; throws AppError(429) when exhausted. Runs BEFORE any write. */
  checkQuota: () => Promise<void>;
  /** Insert the scans row via the service-role client — `scans` has no client INSERT policy
   *  (migration 0002: "writes via service_role workers"), so an RLS-scoped insert would be denied. */
  insertScan: (row: {
    id: string;
    user_id: string;
    kind: ScanKind;
    side: ScanSide | null;
    status: string;
    storage_path: string;
    capture_meta: Record<string, unknown>;
  }) => PromiseLike<{ error: unknown }>;
  /** Mint a signed upload URL for the owner path (the client PUTs the crop to it). */
  createSignedUpload: (path: string) => PromiseLike<{ data: { signedUrl: string; token: string } | null; error: unknown }>;
}

/**
 * Create a scan and hand back a signed upload URL. Order is the contract: **quota → insert → sign**.
 * The quota refusal must happen before we spend a row; the row must exist before we mint an upload
 * URL that points at its owner path.
 */
export async function createScan(deps: ScanCreateDeps): Promise<CreatedScan> {
  await deps.checkQuota();

  const scanId = deps.newId();
  const storagePath = scanStoragePath(deps.userId, scanId);

  const { error: insErr } = await deps.insertScan({
    id: scanId,
    user_id: deps.userId,
    kind: deps.input.kind,
    side: deps.input.side,
    status: 'uploaded', // pre-ingest state; scan-ingest advances it to 'queued' once the crop lands
    storage_path: storagePath,
    capture_meta: deps.input.captureMeta ?? {}, // column default is '{}' — keep the shape uniform
  });
  if (insErr) throw new AppError('scan_create_failed', `scan insert failed: ${String((insErr as { message?: string })?.message ?? insErr)}`, 500);

  const { data, error } = await deps.createSignedUpload(storagePath);
  if (error || !data) {
    throw new AppError('scan_create_failed', `signed upload url failed: ${String((error as { message?: string })?.message ?? 'no data')}`, 500);
  }
  return { scanId, storagePath, uploadUrl: data.signedUrl, uploadToken: data.token };
}

// ── scan-ingest ────────────────────────────────────────────────────────────────────────────────

export interface ScanRow {
  user_id: string;
  status: string;
  storage_path: string | null;
}

export interface ScanIngestDeps {
  userId: string;
  scanId: string;
  loadScan: (scanId: string) => PromiseLike<{ data: ScanRow | null; error: unknown }>;
  /** True iff the crop object is actually in the bucket. */
  objectExists: (path: string) => Promise<boolean>;
  /** Atomic compare-and-set: flip status 'uploaded' → 'queued' ONLY while it is still 'uploaded'.
   *  Returns `won:true` for the single caller that performed the transition (rows affected === 1),
   *  `won:false` for anyone who found it already past 'uploaded'. THIS is the dedup gate — under
   *  READ COMMITTED, two concurrent conditional updates serialize on the row lock and re-evaluate the
   *  `status='uploaded'` predicate, so exactly one wins. */
  claimForQueue: (scanId: string) => Promise<{ won: boolean; error: unknown }>;
  /** queue_send('scan_jobs', {scan_id}) via the service role. */
  enqueue: (scanId: string) => PromiseLike<{ error: unknown }>;
  /** Compensating action: revert 'queued' → 'uploaded' (only if still 'queued') so that after an
   *  enqueue failure a retry can re-win the claim rather than stranding the scan as 'queued' with no
   *  message and no worker to advance it. */
  releaseClaim: (scanId: string) => PromiseLike<{ error: unknown }>;
}

export interface IngestResult {
  queued: boolean;
  already?: boolean;
}

/**
 * Confirm an uploaded crop and enqueue its extraction job. Guards, in order:
 *  1. **Ownership** — a caller may confirm only their own scan. Not-found and not-owned collapse to a
 *     single 404 so the endpoint never reveals whether a foreign scan id exists.
 *  2. **Fast idempotency** — a scan already past 'uploaded' returns `{already:true}` (also enforced
 *     atomically by the claim below; this just avoids an object check on a settled scan).
 *  3. **Object existence** — checked BEFORE the claim so a missing object never consumes the
 *     'uploaded' → 'queued' transition. An ingest that races ahead of the PUT (or a client that
 *     skipped the upload) must NOT enqueue a job the worker can only fail to download.
 *  4. **Atomic claim** — the 'uploaded' → 'queued' CAS is the dedup gate: only its single winner
 *     enqueues, so concurrent double-taps produce exactly ONE scan_jobs message (worker-scan's H2
 *     guard only makes *sequential* redelivery harmless — it does nothing for a *concurrent*
 *     double-enqueue, which is the most expensive duplicate in the system).
 *
 * The claim precedes the enqueue, so a crash in the (tiny, two-call) window between them could strand
 * a scan as 'queued' with no message. That is strictly less bad than the double-paid-extraction the
 * old enqueue-first order permitted, and an enqueue *error* is compensated (releaseClaim) so the
 * common failure is retryable.
 */
export async function ingestScan(deps: ScanIngestDeps): Promise<IngestResult> {
  const { data: scan, error } = await deps.loadScan(deps.scanId);
  if (error) throw new AppError('ingest_failed', `could not load scan: ${String((error as { message?: string })?.message ?? error)}`, 500);
  if (!scan || scan.user_id !== deps.userId) throw new AppError('not_found', 'no such scan', 404);

  if (scan.status !== 'uploaded') return { queued: true, already: true };

  const path = scan.storage_path ?? scanStoragePath(deps.userId, deps.scanId);
  if (!(await deps.objectExists(path))) {
    throw new AppError('object_missing', 'upload not found — retry the upload before confirming', 409);
  }

  const claim = await deps.claimForQueue(deps.scanId);
  if (claim.error) throw new AppError('ingest_failed', `claim failed: ${String((claim.error as { message?: string })?.message ?? claim.error)}`, 500);
  if (!claim.won) return { queued: true, already: true }; // a concurrent ingest already claimed it

  const { error: qErr } = await deps.enqueue(deps.scanId);
  if (qErr) {
    await deps.releaseClaim(deps.scanId); // undo the flip so a retry can re-win the claim
    throw new AppError('ingest_failed', `enqueue failed: ${String((qErr as { message?: string })?.message ?? qErr)}`, 500);
  }

  return { queued: true };
}
