import { ensureSession } from './auth';
import { supabase } from './supabase';

/**
 * Client half of the pipeline front door (Backend §4, audit F0.1/F0.2). Turns a picked/captured image
 * into a queued scan by driving the three deployed endpoints in order:
 *   scan-create  → mint a `scans` row + a signed upload URL,
 *   PUT          → upload the crop bytes to that URL,
 *   scan-ingest  → confirm the object landed and enqueue the extraction job.
 * Returns the `scan_id` so the caller can navigate to `/analyzing?scanId=…`.
 *
 * The orchestration is dependency-injected so it is unit-testable without Supabase, expo-image-picker,
 * or a network (mirrors the server's DI idiom). `uploadPickedScan` wires the real clients.
 */
export type ScanKind = 'palm' | 'face';
export type Hand = 'left' | 'right';

/** Which leg failed — so the UI can say something honest, and Sentry can group it. */
export type ScanUploadStage = 'scan-create' | 'upload' | 'scan-ingest';

export class ScanUploadError extends Error {
  constructor(
    public stage: ScanUploadStage,
    message: string,
    public cause?: unknown,
  ) {
    super(message);
    this.name = 'ScanUploadError';
  }
}

export interface UploadDeps {
  /** supabase.functions.invoke(fn, { body }) — attaches the caller's JWT. */
  invoke: (fn: string, body: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  /** Read the local image URI into an uploadable body + its content type. */
  readImage: (uri: string) => Promise<{ body: BodyInit; contentType: string }>;
  /** PUT the bytes to the signed upload URL. */
  putBytes: (url: string, body: BodyInit, contentType: string) => Promise<{ ok: boolean; status: number }>;
}

interface ScanCreateResponse {
  scan_id?: string;
  upload_url?: string;
}

/**
 * Orchestrate create → upload → ingest. Any leg's failure throws a {@link ScanUploadError} tagged with
 * the stage; the caller shows a warm retry state rather than navigating into a screen that can only
 * hang. scan-ingest is what actually enqueues the job — without it the scan sits at 'uploaded' forever,
 * so it is part of the upload, not an afterthought.
 */
export async function createAndUploadScan(
  input: { kind: ScanKind; hand?: Hand; imageUri: string; captureMeta?: Record<string, unknown> },
  deps: UploadDeps,
): Promise<{ scanId: string }> {
  const { data, error } = await deps.invoke('scan-create', {
    kind: input.kind,
    ...(input.hand ? { hand: input.hand } : {}),
    // §3.2 `scans.capture_meta`: cv-pipeline version + landmark quality at shutter — the debug +
    // consistency-audit trail, and how the server composes an honest `extractor_version` (P4.T3).
    ...(input.captureMeta ? { capture_meta: input.captureMeta } : {}),
  });
  const created = (data ?? {}) as ScanCreateResponse;
  if (error || !created.scan_id || !created.upload_url) {
    throw new ScanUploadError('scan-create', 'could not start the scan', error ?? data);
  }

  const img = await deps.readImage(input.imageUri);
  const put = await deps.putBytes(created.upload_url, img.body, img.contentType);
  if (!put.ok) throw new ScanUploadError('upload', `upload failed (${put.status})`);

  const { error: ingestError } = await deps.invoke('scan-ingest', { scan_id: created.scan_id });
  if (ingestError) throw new ScanUploadError('scan-ingest', 'could not confirm the upload', ingestError);

  return { scanId: created.scan_id };
}

/** Read a local image URI into a Blob (works for the web picker's blob/data URLs and RN file URIs). */
async function readImageAsBlob(uri: string): Promise<{ body: BodyInit; contentType: string }> {
  const res = await fetch(uri);
  const blob = await res.blob();
  return { body: blob, contentType: blob.type || 'image/jpeg' };
}

/** Production wiring: real Supabase functions + fetch. */
export async function uploadPickedScan(input: {
  kind: ScanKind;
  hand?: Hand;
  imageUri: string;
  captureMeta?: Record<string, unknown>;
}): Promise<{ scanId: string }> {
  // scan-create requires a user JWT (verify_jwt) — but if the app booted OFFLINE, the launch-time
  // anonymous sign-in failed and was never retried, so every upload 403'd with a misleading
  // "check your connection" toast even after connectivity returned (found live 2026-07-24).
  // Re-ensuring the session here makes the first upload after reconnect self-heal.
  const userId = await ensureSession();
  if (!userId) {
    throw new ScanUploadError('scan-create', 'could not sign in — check your connection and try again');
  }
  return createAndUploadScan(input, {
    invoke: (fn, body) => supabase.functions.invoke(fn, { body }),
    readImage: readImageAsBlob,
    putBytes: async (url, body, contentType) => {
      const r = await fetch(url, { method: 'PUT', headers: { 'Content-Type': contentType }, body });
      return { ok: r.ok, status: r.status };
    },
  });
}
