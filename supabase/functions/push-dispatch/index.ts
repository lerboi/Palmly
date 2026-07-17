// push-dispatch (Backend §4, §10) — secret (cron-drained). Drains push_jobs, resolves each user's
// device(s), applies preference + quiet-hours gating (device-local), sends via the Expo Push API in
// ≤100 batches, and prunes DeviceNotRegistered tokens from `devices`. The live "lands on a device"
// verify needs real tokens (device H1); the gating + batching + pruning logic is unit-tested
// (_shared/push.test.ts) and the DB effects here are transactionally testable.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { buildExpoMessage, isRetryableTicket, sendExpoPush, shouldSend, tokensToPrune, type DeviceRow, type PushJob } from '../_shared/push.ts';
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

/** Which slice of the flat `messages` array belongs to which queue message — so a ticket outcome
 *  can be attributed back to the job that produced it (H6: archive only what actually sent). */
interface PlannedJob {
  msgId: number;
  from: number;
  count: number;
}

const CHUNK = 100; // Expo accepts ≤100 messages/request
const BUDGET_MS = 20_000; // wall-clock budget per invocation; must stay well under the queue vt

interface Tally {
  jobs: number;
  sent: number;
  skipped: number;
  pruned: number;
  retried: number;
}

/** Drain one chunk: read → resolve devices (ONE query) → send → archive only the jobs that landed. */
async function drainChunk(db: SupabaseClient, tally: Tally): Promise<number> {
  const { data: msgs } = await db.rpc('queue_read', { p_queue: 'push_jobs', p_vt: 60, p_qty: CHUNK });
  const list = (msgs ?? []) as PushMessage[];
  if (!list.length) return 0;

  // H6: one devices query for the whole chunk, not one per job. The old N+1 meant a 100-job tick
  // paid 100 serialized round-trips before a single push went out.
  const userIds = [...new Set(list.map((m) => m.message.user_id))];
  const { data: deviceRows } = await db.from('devices').select('user_id, expo_push_token, notif_prefs, timezone').in('user_id', userIds);
  const byUser = new Map<string, DeviceRow[]>();
  for (const d of (deviceRows ?? []) as Array<DeviceRow & { user_id: string }>) {
    (byUser.get(d.user_id) ?? byUser.set(d.user_id, []).get(d.user_id)!).push(d);
  }

  const messages: Record<string, unknown>[] = [];
  const planned: PlannedJob[] = [];
  for (const m of list) {
    const job = m.message;
    const from = messages.length;
    for (const d of byUser.get(job.user_id) ?? []) {
      if (shouldSend(job, d, localHour(d.timezone))) messages.push(buildExpoMessage(d.expo_push_token as string, job));
      else tally.skipped++;
    }
    planned.push({ msgId: m.msg_id, from, count: messages.length - from });
  }

  const tickets = messages.length ? await sendExpoPush(messages) : [];
  tally.sent += tickets.filter((t) => t.status === 'ok').length;

  const dead = tokensToPrune(messages, tickets);
  if (dead.length) {
    await db.from('devices').delete().in('expo_push_token', dead); // DeviceNotRegistered pruning
    tally.pruned += dead.length;
  }

  // H6 — the fix: archive a job ONLY when nothing about it is worth retrying. `sendExpoPush` never
  // throws (it converts a 5xx or a network failure into error tickets), so the old unconditional
  // archive silently deleted every notification in a failed batch. A job with zero messages (all
  // devices gated by prefs/quiet hours) has no tickets → nothing to retry → archive.
  for (const p of planned) {
    const mine = tickets.slice(p.from, p.from + p.count);
    if (mine.some(isRetryableTicket)) {
      tally.retried++; // left on the queue → pgmq redelivers after the vt
      continue;
    }
    await db.rpc('queue_archive', { p_queue: 'push_jobs', p_msg_id: p.msgId });
  }

  tally.jobs += list.length;
  return list.length;
}

Deno.serve(
  withErrorEnvelope(async (req) => {
    requireMode(createContext(req), 'secret'); // internal only — cron invokes with the service key
    const db = admin();
    const tally: Tally = { jobs: 0, sent: 0, skipped: 0, pruned: 0, retried: 0 };

    // H6: loop until the queue is empty (or the budget runs out) rather than one 100-job chunk per
    // tick. At one chunk per 15s tick a 10K-user fortune fan-out took ~25 minutes to go out; the
    // send is meant to land at 8:30 local. The budget keeps us inside the queue's visibility
    // timeout so a slow tick cannot have its own messages redelivered underneath it.
    const started = Date.now();
    let drained = 0;
    do {
      drained = await drainChunk(db, tally);
    } while (drained === CHUNK && Date.now() - started < BUDGET_MS);

    await writeTelemetry(db, { worker: 'push-dispatch', queue: 'push_jobs', status: 'ok', detail: { ...tally, ms: Date.now() - started } });
    return jsonResponse(tally);
  }),
);
