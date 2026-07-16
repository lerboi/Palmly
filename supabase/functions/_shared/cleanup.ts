// Data-lifecycle helpers (Backend §9). Pure/testable pieces shared by the `cleanup` cron worker and
// the `account-delete` function. The DB side lives in migration 0016 RPCs; here we just shape what
// the Storage API needs (object paths grouped per bucket) so the deletion loop is unit-testable.

export interface BucketPath {
  bucket: string;
  path: string;
}

/** Group (bucket, path) rows into { bucket: paths[] } for `storage.from(bucket).remove(paths)`,
 *  dropping empties and de-duplicating. */
export function groupPathsByBucket(rows: Array<{ bucket?: unknown; path?: unknown }>): Record<string, string[]> {
  const out: Record<string, Set<string>> = {};
  for (const r of rows ?? []) {
    const bucket = typeof r.bucket === 'string' ? r.bucket : '';
    const path = typeof r.path === 'string' ? r.path : '';
    if (!bucket || !path) continue;
    (out[bucket] ??= new Set()).add(path);
  }
  return Object.fromEntries(Object.entries(out).map(([b, set]) => [b, [...set]]));
}

/** Total object count across all buckets (for the response/telemetry). */
export const countPaths = (grouped: Record<string, string[]>): number => Object.values(grouped).reduce((n, ps) => n + ps.length, 0);

/**
 * Rewrite an owner-prefixed object path from one account to another (`{loser}/x` → `{survivor}/x`).
 * Storage policies key on path segment [1], so a merged account's blobs must physically move or the
 * survivor cannot read what is now theirs (H7). Paths not under the loser's prefix are returned
 * unchanged — never rewrite a path we do not own.
 */
export function mergedStoragePath(path: string, loserId: string, survivorId: string): string {
  const prefix = `${loserId}/`;
  return path.startsWith(prefix) ? `${survivorId}/${path.slice(prefix.length)}` : path;
}

// PromiseLike, not Promise: supabase-js `rpc()` returns a thenable PostgrestFilterBuilder (no
// .catch/.finally), which `await` handles fine but `Promise<T>` rejects.
export interface PurgeDeps {
  /** Read-only collect — must NOT mutate (account_storage_paths). */
  collectPaths: () => PromiseLike<BucketPath[]>;
  /** Remove objects from one bucket; resolves with an error instead of throwing. */
  removeObjects: (bucket: string, paths: string[]) => PromiseLike<{ error: unknown }>;
  /** Destroy the DB rows (purge_account). Only ever called once storage is confirmed clean. */
  purgeRows: () => PromiseLike<{ error: unknown }>;
  /** Stamp deletion_log.completed_at — the LAST step (mark_deletion_complete). */
  markComplete: () => PromiseLike<void>;
}

export class StoragePurgeError extends Error {}

/**
 * Erase an account in the only safe order (H7): **collect → delete objects → purge rows → log
 * completion last**. Never destroy the DB reference before the blob is gone.
 *
 * The previous order (purge rows, then best-effort remove) meant a storage failure stranded palm/face
 * crops with zero DB reference and no retry path — the cleanup sweep works off `scans` rows, which
 * were already deleted — while still reporting success. Here a storage failure throws BEFORE any row
 * is touched, so the whole delete stays retryable and the bucket keeps its only pointer.
 *
 * Injectable so the ordering itself is unit-testable without S3 (same idiom as revenuecat.ts).
 */
export async function purgeAccountStorageFirst(deps: PurgeDeps): Promise<{ removed: number; total: number }> {
  const grouped = groupPathsByBucket(await deps.collectPaths());
  const total = countPaths(grouped);

  let removed = 0;
  for (const [bucket, paths] of Object.entries(grouped)) {
    if (!paths.length) continue;
    const { error } = await deps.removeObjects(bucket, paths);
    // Abort BEFORE the DB purge: the rows are the only handle on these blobs.
    if (error) throw new StoragePurgeError(`storage purge failed for bucket ${bucket}: ${String(error)}`);
    removed += paths.length;
  }

  const { error } = await deps.purgeRows();
  if (error) throw new StoragePurgeError(`row purge failed: ${String(error)}`);

  await deps.markComplete(); // D2 audit asserts completion only once it is true
  return { removed, total };
}
