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
