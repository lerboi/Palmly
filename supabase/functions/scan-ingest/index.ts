// scan-ingest (Backend §4) — user mode.
//
// ⚠️ DELIBERATE DEVIATION FROM Backend §4: the spec words this as a *storage webhook* (secret mode,
// fired by Storage on upload completion). Storage webhooks require pg_net, which is banned/parked in
// this project (standing rule). So this is implemented as a **client-invoked confirm endpoint**: the
// client PUTs its crop to the signed URL from scan-create, then calls this to confirm. It does the
// ownership check, verifies the object actually landed in the bucket, enqueues the scan_jobs message
// with the service role, and flips status to 'queued'. (Decision Log 2026-07-18, F0.T1.)
//
// The guards (ownership, idempotency, object-existence-before-enqueue) live in _shared/scan.ts.
import { createContext, requireMode } from '../_shared/context.ts';
import { AppError, jsonResponse, withErrorEnvelope } from '../_shared/http.ts';
import { ingestScan } from '../_shared/scan.ts';

Deno.serve(
  withErrorEnvelope(async (req) => {
    const ctx = createContext(req);
    requireMode(ctx, 'user');
    if (!ctx.userId) throw new AppError('unauthorized', 'no authenticated user', 401);
    const userId = ctx.userId;

    const body = (await req.json().catch(() => ({}))) as { scan_id?: unknown };
    const scanId = typeof body.scan_id === 'string' ? body.scan_id : '';
    if (!scanId) throw new AppError('invalid_request', 'scan_id is required', 400);

    const result = await ingestScan({
      userId,
      scanId,
      loadScan: (id) => ctx.admin.from('scans').select('user_id,status,storage_path').eq('id', id).maybeSingle(),
      objectExists: async (path) => {
        const slash = path.lastIndexOf('/');
        const folder = path.slice(0, slash);
        const name = path.slice(slash + 1);
        // list the owner folder, exact-match the object name (search does a substring pre-filter)
        const { data, error } = await ctx.admin.storage.from('scans').list(folder, { search: name, limit: 100 });
        return !error && (data ?? []).some((o) => o.name === name);
      },
      // Atomic dedup gate: the conditional UPDATE ... WHERE status='uploaded' serializes concurrent
      // ingests on the row lock; exactly one gets rows-affected === 1 and enqueues.
      claimForQueue: async (id) => {
        const { data, error } = await ctx.admin.from('scans').update({ status: 'queued' }).eq('id', id).eq('status', 'uploaded').select('id');
        return { won: !error && (data?.length ?? 0) === 1, error };
      },
      enqueue: (id) => ctx.admin.rpc('queue_send', { p_queue: 'scan_jobs', p_msg: { scan_id: id } }),
      // Only revert if still 'queued' — never clobber a worker that already advanced to 'extracting'.
      releaseClaim: (id) => ctx.admin.from('scans').update({ status: 'uploaded' }).eq('id', id).eq('status', 'queued'),
    });

    return jsonResponse(result);
  }),
);
