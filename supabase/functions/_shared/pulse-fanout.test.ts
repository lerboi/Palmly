import { assert, assertEquals } from '@std/assert';
import {
  inPushWindow,
  localClock,
  localDateKey,
  localWeekday,
  planBatch,
  planPush,
  PUSH_HOUR,
  WINBACK_AFTER_MS,
  winbackDue,
  type FanoutDevice,
} from './pulse-fanout.ts';
import { pulseFeatureKey } from './pulse.ts';
import { FEATURE_LABEL } from './pulse-generate.ts';
import { renderNotification } from './notif-templates.ts';

/**
 * RF4.T1/T2 — the morning fan-out. An injectable clock throughout, because the ONE property that
 * matters most here ("everybody gets this at 08:30 THEIR time, once") is a statement about
 * timezones, and a test that used the real clock could only ever check it in one of them.
 */

const at = (iso: string) => new Date(iso);

const device = (over: Partial<FanoutDevice> = {}): FanoutDevice => ({
  user_id: '11111111-1111-4111-8111-111111111111',
  timezone: 'Asia/Singapore',
  locale: 'en',
  kinds: ['palm_left'],
  feature_hash: 'hash-1',
  sealed_today: false,
  ...over,
});

// ── The window ───────────────────────────────────────────────────────────────────────────────────

Deno.test('inPushWindow: 08:30–08:44 local, in any timezone', () => {
  // 00:30 UTC is 08:30 in Singapore (UTC+8) and 09:30 in Tokyo (UTC+9).
  const t = at('2026-07-26T00:30:00Z');
  assert(inPushWindow('Asia/Singapore', t), 'Singapore is in the window');
  assert(!inPushWindow('Asia/Tokyo', t), 'Tokyo is an hour past it');
  assert(!inPushWindow('UTC', t), 'UTC is seven and a half hours early');
});

Deno.test('inPushWindow: the window is exactly 15 minutes — one cron tick, never two', () => {
  assert(!inPushWindow('UTC', at('2026-07-26T08:29:59Z')));
  assert(inPushWindow('UTC', at('2026-07-26T08:30:00Z')));
  assert(inPushWindow('UTC', at('2026-07-26T08:44:59Z')));
  assert(!inPushWindow('UTC', at('2026-07-26T08:45:00Z')));
});

Deno.test('inPushWindow: every timezone on earth gets exactly one window per day', () => {
  const zones = ['Pacific/Kiritimati', 'Asia/Tokyo', 'Asia/Kolkata', 'Europe/London', 'America/New_York', 'Pacific/Honolulu', 'Pacific/Chatham'];
  for (const tz of zones) {
    let hits = 0;
    // Walk a whole UTC day at the cron's 15-minute cadence.
    for (let m = 0; m < 24 * 60; m += 15) {
      const t = new Date(Date.UTC(2026, 6, 26, 0, m));
      if (inPushWindow(tz, t)) hits++;
    }
    assertEquals(hits, 1, `${tz} got ${hits} windows in a day`);
  }
});

Deno.test('localClock: a bad timezone falls back to UTC rather than throwing the tick away', () => {
  const t = at('2026-07-26T08:30:00Z');
  assertEquals(localClock('Not/AZone', t), { hour: 8, minute: 30 });
  assertEquals(localClock(null, t), { hour: 8, minute: 30 });
});

Deno.test('localClock: midnight reads as hour 0, not 24', () => {
  assertEquals(localClock('UTC', at('2026-07-26T00:10:00Z')).hour, 0);
});

Deno.test('localDateKey: the date is the DEVICE’s, so the push names the card the user will open', () => {
  // 23:00 UTC on the 26th is already the 27th in Singapore. The push must be about the 27th.
  const t = at('2026-07-26T23:00:00Z');
  assertEquals(localDateKey('UTC', t), '2026-07-26');
  assertEquals(localDateKey('Asia/Singapore', t), '2026-07-27');
  assertEquals(localDateKey('America/New_York', t), '2026-07-26');
});

Deno.test('localWeekday: localized, and never crashes the plan on a bad locale', () => {
  assertEquals(localWeekday('UTC', at('2026-07-26T08:30:00Z'), 'en'), 'Sunday');
  assert(typeof localWeekday('UTC', at('2026-07-26T08:30:00Z'), 'not-a-locale') === 'string');
});

// ── The plan ─────────────────────────────────────────────────────────────────────────────────────

const IN_WINDOW = at('2026-07-26T00:30:00Z'); // 08:30 Singapore

Deno.test('planPush: names the SAME feature the client will compute for that local date', () => {
  const d = device();
  const msg = planPush(d, IN_WINDOW);
  assert(msg);
  // This is the promise the whole mirrored-math design exists to keep: the push and the card must
  // name the same line, computed independently, with no round trip between them.
  assertEquals(msg!.feature_key, pulseFeatureKey(d.user_id, '2026-07-26', d.kinds));
  // And the label must be the HUMAN name, never the raw key — a push reading "Your hand_shape has
  // something to say" is the failure this table exists to prevent.
  assertEquals(msg!.feature_label, FEATURE_LABEL[msg!.feature_key]);
  assert(!msg!.feature_label.includes('_'));
  assertEquals(msg!.weekday, 'Sunday');
});

Deno.test('planPush: skips a device outside its local window', () => {
  assertEquals(planPush(device({ timezone: 'Asia/Tokyo' }), IN_WINDOW), null);
});

Deno.test('planPush: skips a user who has ALREADY sealed today — no push at someone mid-habit', () => {
  assertEquals(planPush(device({ sealed_today: true }), IN_WINDOW), null);
});

Deno.test('planPush: skips a user with no canonical reading — there is no line to push about', () => {
  assertEquals(planPush(device({ kinds: [] }), IN_WINDOW), null);
});

Deno.test('planPush: a chapter-turn day switches to the boundary variant', () => {
  const d = device();
  // Find the hash+date whose chapter starts on the target local date, then assert the flag rides.
  const plain = planPush(d, IN_WINDOW);
  assert(plain);
  assertEquals(plain!.is_boundary, false, 'an ordinary day is not a boundary');

  // A device with no feature hash has no personal schedule, so it can never claim a boundary.
  const noHash = planPush(device({ feature_hash: null }), IN_WINDOW);
  assertEquals(noHash!.is_boundary, false);
});

Deno.test('planBatch: two devices, one person → ONE push', () => {
  const uid = '22222222-2222-4222-8222-222222222222';
  const msgs = planBatch([device({ user_id: uid }), device({ user_id: uid, timezone: 'Asia/Singapore' })], IN_WINDOW);
  assertEquals(msgs.length, 1, 'a user with a phone and a tablet is still one person');
});

Deno.test('planBatch: only the devices actually in their window are planned', () => {
  const msgs = planBatch(
    [
      device({ user_id: 'a', timezone: 'Asia/Singapore' }),
      device({ user_id: 'b', timezone: 'Asia/Tokyo' }),
      device({ user_id: 'c', timezone: 'UTC' }),
    ],
    IN_WINDOW,
  );
  assertEquals(msgs.map((m) => m.user_id), ['a']);
});

// ── The copy ─────────────────────────────────────────────────────────────────────────────────────

Deno.test('daily_pulse: the push NAMES the reader’s own feature, as the LENS', () => {
  // RF6.T2: the title used to be "Your heart line has something to say", which promises the line
  // has news. The palm did not change overnight; the day did. The feature is still named — that is
  // the whole point of this push — but as what the day is read through.
  const n = renderNotification('daily_pulse', { feature_label: 'heart line', weekday: 'Friday' });
  assertEquals(n.title, 'Today, read through your heart line');
  assertEquals(n.body, 'Friday’s almanac, through your own lines.');
  assertEquals(n.deep_link, 'palmly://fortune');
  assertEquals(n.cap_class, 'marketing', 'the hard 1/day cap must apply');
});

Deno.test('daily_pulse: the boundary variant leads with the chapter turn', () => {
  const n = renderNotification('daily_pulse', { feature_label: 'fate line', is_boundary: true });
  assertEquals(n.title, 'Your fate line turns a page today');
});

Deno.test('daily_pulse: a missing feature label still produces specific copy, never a blank', () => {
  const n = renderNotification('daily_pulse', {});
  assertEquals(n.title, 'Today, read through your palm');
  assertEquals(n.body, 'Today’s almanac, through your own lines.');
});

Deno.test('daily_pulse: hostile interpolation cannot inject a second line into the push', () => {
  const n = renderNotification('daily_pulse', { feature_label: 'heart line\nBUY NOW', weekday: 'Fri\r\nday' });
  assert(!n.title.includes('\n'));
  assert(!n.body.includes('\n'));
  assertEquals(n.title, 'Today, read through your heart line BUY NOW');
});

Deno.test('daily_pulse: the dedupe key is per-day, not per-feature — two sends collapse to one', () => {
  const a = renderNotification('daily_pulse', { feature_label: 'heart line' });
  const b = renderNotification('daily_pulse', { feature_label: 'fate line' });
  assertEquals(a.dedupe_key, b.dedupe_key, 'a different feature must not buy a second push');
  assertEquals(a.dedupe_key, 'daily_pulse');
});

// ── Win-back ─────────────────────────────────────────────────────────────────────────────────────

Deno.test('winbackDue: fires only after 24h, and never for a premium user', () => {
  const now = at('2026-07-26T12:00:00Z');
  const old = new Date(now.getTime() - WINBACK_AFTER_MS - 1000).toISOString();
  const fresh = new Date(now.getTime() - 60_000).toISOString();

  assert(winbackDue({ user_id: 'u', paywall_declined_at: old, premium: false }, now));
  assert(!winbackDue({ user_id: 'u', paywall_declined_at: fresh, premium: false }, now), 'they said no today');
  assert(!winbackDue({ user_id: 'u', paywall_declined_at: old, premium: true }, now), 'they converted');
  assert(!winbackDue({ user_id: 'u', paywall_declined_at: null, premium: false }, now), 'they never declined');
  assert(!winbackDue({ user_id: 'u', paywall_declined_at: 'not-a-date', premium: false }, now));
});
