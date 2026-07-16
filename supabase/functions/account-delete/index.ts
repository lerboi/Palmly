// account-delete (Backend §4, §9) — user mode. In-app, full erasure (App Store requires it be
// in-app, not support-gated). Purges every owned row (purge_account cascades auth.users → profiles →
// all tables + writes deletion_log) and removes the user's storage objects via the Storage API (SQL
// deletes would orphan the S3 blobs, §9). RevenueCat subscriber deletion + the attribution-provider
// erasure request are vendor/device-gated (H8/H9) and parked.
import { createContext, requireMode } from '../_shared/context.ts';
import { AppError, jsonResponse, withErrorEnvelope } from '../_shared/http.ts';
import { purgeAccountStorageFirst, StoragePurgeError, type BucketPath } from '../_shared/cleanup.ts';

Deno.serve(
  withErrorEnvelope(async (req) => {
    const ctx = createContext(req);
    requireMode(ctx, 'user');
    if (!ctx.userId) throw new AppError('unauthorized', 'no authenticated user', 401);
    const userId = ctx.userId;

    // H7 ordering: collect → delete objects → purge rows → log completion last. The DB rows are the
    // ONLY handle on these blobs (the cleanup sweep reads `scans`), so purging first meant a storage
    // failure stranded palm/face crops irrecoverably while still reporting success. A failure now
    // aborts before any row is touched, leaving the whole delete retryable.
    try {
      const { removed, total } = await purgeAccountStorageFirst({
        collectPaths: async () => {
          const { data, error } = await ctx.admin.rpc('account_storage_paths', { p_user_id: userId });
          if (error) throw new AppError('delete_failed', error.message, 500);
          return (data ?? []) as BucketPath[];
        },
        removeObjects: (bucket, paths) => ctx.admin.storage.from(bucket).remove(paths),
        purgeRows: () => ctx.admin.rpc('purge_account', { p_user_id: userId }),
        markComplete: async () => {
          await ctx.admin.rpc('mark_deletion_complete', { p_user_id: userId, p_scope: 'account' });
        },
      });

      // TODO (parked, H8/H9): RevenueCat subscriber delete + AppsFlyer erasure request.
      return jsonResponse({ deleted: true, storage_objects_removed: removed, storage_objects_total: total });
    } catch (e) {
      // Surface the failure instead of a false success — nothing was destroyed, so a retry is safe.
      if (e instanceof StoragePurgeError) throw new AppError('delete_failed', e.message, 500);
      throw e;
    }
  }),
);
