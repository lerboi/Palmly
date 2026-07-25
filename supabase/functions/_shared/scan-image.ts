// Prompt deletion of a scan's crop the moment the pipeline is done with it (D2 / UIUX §2.2:
// "analyzed on the spot, deleted after reading" — found live 2026-07-25: the reveal's
// "Photo deleted ✓" badge was claiming deletion while the crop sat in the bucket awaiting the
// 24h cleanup cron). The cron remains the backstop for failed/abandoned scans and for any
// delete attempt that errors here; this makes the trust badge TRUE for the happy path.
import type { SupabaseClient } from '@supabase/supabase-js';

export type ScanImageOutcome = 'deleted' | 'kept' | 'skipped';

/**
 * Best-effort, idempotent: respects the user's keep-my-scan opt-in (`scans.keep_image`, D2),
 * no-ops when already deleted, and NEVER throws — a deletion hiccup must not fail a reading
 * (the cron sweeps stragglers). Stamps `image_deleted_at` only after the object is removed.
 */
export async function deleteScanImage(db: SupabaseClient, scanId: string): Promise<ScanImageOutcome> {
  try {
    const { data: scan } = await db.from('scans').select('storage_path, keep_image, image_deleted_at').eq('id', scanId).single();
    if (!scan || scan.image_deleted_at) return 'skipped';
    if (scan.keep_image) return 'kept';
    if (scan.storage_path) {
      const { error } = await db.storage.from('scans').remove([scan.storage_path as string]);
      if (error) {
        console.error('[scan-image] remove failed (cron will sweep):', error.message);
        return 'skipped';
      }
    }
    await db.from('scans').update({ image_deleted_at: new Date().toISOString() }).eq('id', scanId);
    return 'deleted';
  } catch (e) {
    console.error('[scan-image] delete errored (cron will sweep):', String(e));
    return 'skipped';
  }
}
