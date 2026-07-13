// cleanup (Backend §4, §9) — secret (cron, hourly). Three D2 sweeps: delete crop objects >24h past a
// terminal scan (Storage API + mark image_deleted_at), expire past-due invites, and erase stale
// anonymous users (>30d, no readings — bounds MAU cost, D4). One invocation does a bounded batch of
// crops so a backlog drains over successive runs.
import { createContext, requireMode } from '../_shared/context.ts';
import { jsonResponse, withErrorEnvelope } from '../_shared/http.ts';
import { writeTelemetry } from '../_shared/telemetry.ts';

interface Crop {
  scan_id: string;
  user_id: string;
  storage_path: string;
}

Deno.serve(
  withErrorEnvelope(async (req) => {
    const ctx = createContext(req);
    requireMode(ctx, 'secret');
    const db = ctx.admin;

    // 1) crop auto-deletion (D2): remove the object, then mark the scan.
    const { data: crops } = await db.rpc('crops_due_for_deletion', { p_batch: 200 });
    let cropsDeleted = 0;
    for (const c of (crops ?? []) as Crop[]) {
      const { error } = await db.storage.from('scans').remove([c.storage_path]);
      if (!error) {
        await db.rpc('mark_crop_deleted', { p_scan_id: c.scan_id });
        cropsDeleted++;
      }
    }

    // 2) expired invites, 3) stale anonymous users.
    const { data: invitesExpired } = await db.rpc('sweep_expired_invites');
    const { data: staleAnon } = await db.rpc('sweep_stale_anon', { p_days: 30 });

    const summary = { crops_deleted: cropsDeleted, crops_seen: (crops ?? []).length, invites_expired: invitesExpired ?? 0, stale_anon_deleted: staleAnon ?? 0 };
    await writeTelemetry(db, { worker: 'cleanup', queue: 'cleanup_jobs', status: 'ok', detail: summary });
    return jsonResponse(summary);
  }),
);
