// scan-create (Backend §4) — user mode. The pipeline's front door: quota-check → insert a `scans`
// row (owned by the caller) → return the scan id + a signed upload URL for the private `scans`
// bucket owner path. The client PUTs the crop to that URL, then calls scan-ingest to confirm.
//
// All the load-bearing logic (validation, path convention, quota-before-write ordering) lives in
// _shared/scan.ts so it is unit-tested without a live backend; this file only wires the service-role
// clients into it. The insert uses ctx.admin because `scans` has no client INSERT policy
// (migration 0002 — writes are service-role only).
import { createContext, requireMode } from '../_shared/context.ts';
import { AppError, jsonResponse, withErrorEnvelope } from '../_shared/http.ts';
import { enforceRateLimit } from '../_shared/ratelimit.ts';
import { createScan, parseScanCreateInput } from '../_shared/scan.ts';

Deno.serve(
  withErrorEnvelope(async (req) => {
    const ctx = createContext(req);
    requireMode(ctx, 'user');
    if (!ctx.userId) throw new AppError('unauthorized', 'no authenticated user', 401);
    const userId = ctx.userId;

    const input = parseScanCreateInput(await req.json().catch(() => ({})));

    const created = await createScan({
      userId,
      input,
      newId: () => crypto.randomUUID(),
      // Free tier: 10 scans/day/user (Backend §4, §7.2). The atomic counter lives in Postgres.
      // failClosed: this quota is the ONLY thing bounding free-tier scan creation (no token/
      // entitlement backstop), and each scan becomes paid extraction — a counter outage must not
      // open the floodgates. Fails with a retryable 503, never a silent pass. (Decision Log F0.T1.)
      checkQuota: () => enforceRateLimit(ctx.admin, 'scan_create', userId, { failClosed: true }),
      insertScan: (row) => ctx.admin.from('scans').insert(row),
      createSignedUpload: (path) => ctx.admin.storage.from('scans').createSignedUploadUrl(path),
    });

    return jsonResponse({
      scan_id: created.scanId,
      storage_path: created.storagePath,
      upload_url: created.uploadUrl,
      upload_token: created.uploadToken,
    });
  }),
);
