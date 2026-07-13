// account-delete (Backend §4, §9) — user mode. In-app, full erasure (App Store requires it be
// in-app, not support-gated). Purges every owned row (purge_account cascades auth.users → profiles →
// all tables + writes deletion_log) and removes the user's storage objects via the Storage API (SQL
// deletes would orphan the S3 blobs, §9). RevenueCat subscriber deletion + the attribution-provider
// erasure request are vendor/device-gated (H8/H9) and parked.
import { createContext, requireMode } from '../_shared/context.ts';
import { AppError, jsonResponse, withErrorEnvelope } from '../_shared/http.ts';
import { countPaths, groupPathsByBucket, type BucketPath } from '../_shared/cleanup.ts';

Deno.serve(
  withErrorEnvelope(async (req) => {
    const ctx = createContext(req);
    requireMode(ctx, 'user');
    if (!ctx.userId) throw new AppError('unauthorized', 'no authenticated user', 401);

    // Erase the DB side first (idempotent-ish: a second call finds nothing). Returns storage paths.
    const { data, error } = await ctx.admin.rpc('purge_account', { p_user_id: ctx.userId });
    if (error) throw new AppError('delete_failed', error.message, 500);

    // Purge storage objects the DB no longer references.
    const grouped = groupPathsByBucket((data ?? []) as BucketPath[]);
    let removed = 0;
    for (const [bucket, paths] of Object.entries(grouped)) {
      if (!paths.length) continue;
      const { error: sErr } = await ctx.admin.storage.from(bucket).remove(paths);
      if (!sErr) removed += paths.length; // best-effort; the DB rows are already gone (audit stands)
    }

    // TODO (parked, H8/H9): RevenueCat subscriber delete + AppsFlyer erasure request.
    return jsonResponse({ deleted: true, storage_objects_removed: removed, storage_objects_total: countPaths(grouped) });
  }),
);
