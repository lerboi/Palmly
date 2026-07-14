// push-dispatch (Backend §4, §10) — secret (cron-drained). Drains push_jobs, resolves each user's
// device(s), applies preference + quiet-hours gating (device-local), sends via the Expo Push API in
// ≤100 batches, and prunes DeviceNotRegistered tokens from `devices`. The live "lands on a device"
// verify needs real tokens (device H1); the gating + batching + pruning logic is unit-tested
// (_shared/push.test.ts) and the DB effects here are transactionally testable.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { buildExpoMessage, sendExpoPush, shouldSend, tokensToPrune, type DeviceRow, type PushJob } from '../_shared/push.ts';
import { writeTelemetry } from '../_shared/telemetry.ts';
import { jsonResponse, withErrorEnvelope } from '../_shared/http.ts';
import { createContext, requireMode } from '../_shared/context.ts';

const admin = (): SupabaseClient =>
  createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', { auth: { persistSession: false, autoRefreshToken: false } });

/** device-local hour now, for quiet-hours; falls back to UTC on a bad tz. */
function localHour(tz: string | null | undefined): number {
  try {
    return Number(new Intl.DateTimeFormat('en-US', { timeZone: tz ?? 'UTC', hour: 'numeric', hour12: false }).format(new Date()));
  } catch {
    return new Date().getUTCHours();
  }
}

interface PushMessage {
  msg_id: number;
  message: PushJob;
}

Deno.serve(
  withErrorEnvelope(async (req) => {
    requireMode(createContext(req), 'secret'); // internal only — cron invokes with the service key
    const db = admin();
    const { data: msgs } = await db.rpc('queue_read', { p_queue: 'push_jobs', p_vt: 60, p_qty: 100 }); // ≤500/s ceiling; a 100-chunk drain
    const list = (msgs ?? []) as PushMessage[];

    const messages: Record<string, unknown>[] = [];
    const archived: number[] = [];
    let skipped = 0;

    for (const m of list) {
      const job = m.message;
      const { data: devices } = await db.from('devices').select('expo_push_token, notif_prefs, timezone').eq('user_id', job.user_id);
      for (const d of (devices ?? []) as DeviceRow[]) {
        if (shouldSend(job, d, localHour(d.timezone))) messages.push(buildExpoMessage(d.expo_push_token as string, job));
        else skipped++;
      }
      archived.push(m.msg_id);
    }

    let sent = 0;
    let pruned = 0;
    if (messages.length) {
      const tickets = await sendExpoPush(messages);
      sent = tickets.filter((t) => t.status === 'ok').length;
      const dead = tokensToPrune(messages, tickets);
      if (dead.length) {
        await db.from('devices').delete().in('expo_push_token', dead); // DeviceNotRegistered pruning
        pruned = dead.length;
      }
    }

    // archive processed jobs (best-effort; a redelivery just re-sends — Expo dedupes by token+content window)
    for (const id of archived) await db.rpc('queue_archive', { p_queue: 'push_jobs', p_msg_id: id });

    await writeTelemetry(db, { worker: 'push-dispatch', queue: 'push_jobs', status: 'ok', detail: { jobs: list.length, sent, skipped, pruned } });
    return jsonResponse({ jobs: list.length, sent, skipped, pruned });
  }),
);
