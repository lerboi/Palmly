// The morning fan-out's decision logic (Audit-5 · 03 §5), kept pure and injectable so the window
// arithmetic, the skip rules and the copy can all be tested with no clock, no database and no Expo.
//
// This is the producer half of the loop's front door. Everything downstream already exists and is
// already tested: `enqueue_push_deduped` enforces the dedupe key and the hard 1/day marketing cap,
// and `push-dispatch` applies preferences, quiet hours, Expo batching and dead-token pruning. This
// module's only job is to decide WHO gets a push and WHAT it says.

import { chapterFor, pulseFeatureKey, type SubjectKind } from './pulse.ts';
import { FEATURE_LABEL } from './pulse-generate.ts';

/** The local-time window the morning push targets (03 §5). */
export const PUSH_HOUR = 8;
export const PUSH_MINUTE_FROM = 30;
/** The cron ticks every 15 minutes, so the window is 15 minutes wide — every device gets exactly
 *  one tick inside it, and none gets two. */
export const PUSH_WINDOW_MINUTES = 15;

export interface FanoutDevice {
  user_id: string;
  timezone: string | null;
  locale?: string | null;
  /** The user's subject kinds — what the feature pool is drawn from. */
  kinds: SubjectKind[];
  /** The user's `feature_hash`, for the chapter boundary check. Absent → no boundary variant. */
  feature_hash?: string | null;
  /** The user has ALREADY sealed today — do not push at someone mid-streak-day (03 §5). */
  sealed_today?: boolean;
}

export interface FanoutMessage {
  user_id: string;
  feature_key: string;
  feature_label: string;
  weekday: string;
  is_boundary: boolean;
  locale: string;
}

/**
 * The device-local wall clock, as {hour, minute}. Falls back to UTC on a bad timezone string — the
 * same `Intl` resolution `push-dispatch` already uses for quiet hours, so a device that is in the
 * window for one is in the window for the other.
 */
export function localClock(tz: string | null | undefined, now: Date): { hour: number; minute: number } {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz ?? 'UTC',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    }).formatToParts(now);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
    // `hour: 'numeric', hour12: false` yields 24 for midnight in some ICU versions.
    return { hour: get('hour') % 24, minute: get('minute') };
  } catch {
    return { hour: now.getUTCHours(), minute: now.getUTCMinutes() };
  }
}

/** Is this device inside the 08:30–08:44 local window right now? */
export function inPushWindow(tz: string | null | undefined, now: Date): boolean {
  const { hour, minute } = localClock(tz, now);
  return hour === PUSH_HOUR && minute >= PUSH_MINUTE_FROM && minute < PUSH_MINUTE_FROM + PUSH_WINDOW_MINUTES;
}

/** The device-local calendar date, so the feature named matches the card the user will open. */
export function localDateKey(tz: string | null | undefined, now: Date): string {
  try {
    // `en-CA` formats as YYYY-MM-DD, which is the key format used everywhere else.
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz ?? 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

/** The device-local weekday name, for the push body. */
export function localWeekday(tz: string | null | undefined, now: Date, locale = 'en'): string {
  try {
    return new Intl.DateTimeFormat(locale, { timeZone: tz ?? 'UTC', weekday: 'long' }).format(now);
  } catch {
    return '';
  }
}

/**
 * Decide one device's push, or `null` for "not this device, not now".
 *
 * The four skips, and why each exists:
 *   • **outside the window** — the send is timezone-sharded, not blasted;
 *   • **already sealed today** — pushing at someone who has already done the thing is the purest
 *     form of notification spam, and the ledger already knows (03 §5);
 *   • **no canonical reading** — there is no line of the day to push about, so a push would be a
 *     lie about content that does not exist;
 *   • **no feature** — the same, defensively.
 */
export function planPush(device: FanoutDevice, now: Date): FanoutMessage | null {
  if (!inPushWindow(device.timezone, now)) return null;
  if (device.sealed_today) return null;
  if (!device.kinds?.length) return null;

  const dateKey = localDateKey(device.timezone, now);
  const featureKey = pulseFeatureKey(device.user_id, dateKey, device.kinds);
  if (!featureKey) return null;

  const locale = device.locale ?? 'en';
  // A chapter turn outranks the standard copy on the one day it happens — the category's proven
  // conversion spike (01 §7 T2). Without a feature hash there is no personal schedule to turn.
  const isBoundary = device.feature_hash ? chapterFor(featureKey, device.feature_hash, dateKey).is_boundary : false;

  return {
    user_id: device.user_id,
    feature_key: featureKey,
    feature_label: FEATURE_LABEL[featureKey] ?? featureKey,
    weekday: localWeekday(device.timezone, now, locale),
    is_boundary: isBoundary,
    locale,
  };
}

/**
 * Plan a whole batch, de-duplicated per USER.
 *
 * A user with two devices is one person and must receive one notification, not two. The dedupe
 * index would catch it at the enqueue layer anyway, but silently relying on a uniqueness constraint
 * to fix a wrong query is how a bug survives until the constraint is relaxed.
 */
export function planBatch(devices: readonly FanoutDevice[], now: Date): FanoutMessage[] {
  const seen = new Set<string>();
  const out: FanoutMessage[] = [];
  for (const d of devices) {
    if (seen.has(d.user_id)) continue;
    const msg = planPush(d, now);
    if (!msg) continue;
    seen.add(d.user_id);
    out.push(msg);
  }
  return out;
}

// ── The win-back leg (RF4.T4) ────────────────────────────────────────────────────────────────────

export interface WinbackCandidate {
  user_id: string;
  paywall_declined_at: string | null;
  premium: boolean;
}

/** How long after a decline the win-back may fire (01 §7 T6). */
export const WINBACK_AFTER_MS = 24 * 60 * 60 * 1000;

/**
 * Is this user due a win-back nudge?
 *
 * Never for a premium user (they converted — the nudge would be nonsense), and never inside 24h of
 * the decline (they said no today; asking again the same day is the billing-nag behaviour the
 * research names as a trust-killer). "Once ever" is enforced downstream by the notification_log
 * dedupe on the `winback` key, which is cheaper and more reliable than a column here.
 */
export function winbackDue(c: WinbackCandidate, now: Date): boolean {
  if (c.premium || !c.paywall_declined_at) return false;
  const declined = Date.parse(c.paywall_declined_at);
  if (!Number.isFinite(declined)) return false;
  return now.getTime() - declined >= WINBACK_AFTER_MS;
}
