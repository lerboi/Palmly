// image-delete (Backend §4, §9 D2) — user mode. "Delete my scan photos now" (PrivacyCenter): the
// user-initiated half of D2, distinct from the 24h automatic sweep (cleanup) and from full account
// erasure (account-delete). Removes the crop objects and marks the scans, keeping the readings —
// the whole point is that the PHOTO goes while the reading stays.
//
// M12c: `request_image_deletion` has existed since 0016 and nothing has ever called it, so the
// button had no callable path. This is that path.
//
// Ordering is NOT re-implemented here: it imports `purgeAccountStorageFirst`, the same invariant
// B4/H7 established for account-delete — collect → delete objects → purge rows → log completion
// last. The DB rows are the only handle on these blobs (the cleanup sweep reads `scans`), so a
// storage failure must abort BEFORE anything is nulled, leaving the request retryable rather than
// orphaning a biometric crop with no reference.
import { createContext, requireMode } from '../_shared/context.ts';
import { AppError, jsonResponse, withErrorEnvelope } from '../_shared/http.ts';
import { purgeAccountStorageFirst, StoragePurgeError, type BucketPath } from '../_shared/cleanup.ts';

Deno.serve(
  withErrorEnvelope(async (req) => {
    const ctx = createContext(req);
    requireMode(ctx, 'user');
    if (!ctx.userId) throw new AppError('unauthorized', 'no authenticated user', 401);
    const userId = ctx.userId;

    try {
      const { removed, total } = await purgeAccountStorageFirst({
        // Read-only: request_image_deletion would null storage_path while telling us the paths,
        // destroying the reference before the blob is gone.
        collectPaths: async () => {
          const { data, error } = await ctx.admin.rpc('image_paths_for_deletion', { p_user_id: userId });
          if (error) throw new AppError('image_delete_failed', error.message, 500);
          return (data ?? []) as BucketPath[];
        },
        removeObjects: (bucket, paths) => ctx.admin.storage.from(bucket).remove(paths),
        // Only now: null storage_path, stamp image_deleted_at, and log the REQUEST (completed_at null).
        purgeRows: () => ctx.admin.rpc('request_image_deletion', { p_user_id: userId }),
        // ...and only once the blobs are actually gone does the D2 audit claim completion.
        markComplete: async () => {
          await ctx.admin.rpc('mark_deletion_complete', { p_user_id: userId, p_scope: 'images' });
        },
      });

      return jsonResponse({ deleted: true, storage_objects_removed: removed, storage_objects_total: total });
    } catch (e) {
      // Surface it: nothing was destroyed, so a retry is safe — and a silent success here would be a
      // privacy claim we did not honor.
      if (e instanceof StoragePurgeError) throw new AppError('image_delete_failed', e.message, 500);
      throw e;
    }
  }),
);
