import { assert, assertEquals } from '@std/assert';
import { buildExpoMessage, inQuietHours, isRetryableTicket, prefsAllow, pushClass, sendExpoPush, shouldSend, tokensToPrune, type DeviceRow, type ExpoTicket, type PushJob } from './push.ts';

const job = (type: string): PushJob => ({ user_id: 'u', type, title: 'T', body: 'B', deep_link: 'palmly://x' });
const dev = (prefs: DeviceRow['notif_prefs'], token: string | null = 'ExpoTok'): DeviceRow => ({ expo_push_token: token, notif_prefs: prefs, timezone: 'Asia/Singapore' });

Deno.test('pushClass + prefsAllow: pipeline always; fortune/social respect opt-out', () => {
  assertEquals(pushClass('reading_ready'), 'pipeline');
  assertEquals(pushClass('daily_fortune'), 'fortune');
  assertEquals(pushClass('compat_complete'), 'social');
  assert(prefsAllow('reading_ready', { daily_fortune: false, social: false })); // pipeline ignores prefs
  assert(!prefsAllow('daily_fortune', { daily_fortune: false }));
  assert(prefsAllow('daily_fortune', { daily_fortune: true }));
  assert(!prefsAllow('compat_complete', { social: false }));
  assert(prefsAllow('compat_complete', {})); // default-on when unset
});

Deno.test('inQuietHours: overnight window 22:00–08:00', () => {
  assert(inQuietHours(23));
  assert(inQuietHours(2));
  assert(inQuietHours(7));
  assert(!inQuietHours(8));
  assert(!inQuietHours(14));
});

Deno.test('shouldSend: gates on token + prefs + quiet hours (pipeline bypasses quiet hours)', () => {
  assert(shouldSend(job('compat_complete'), dev({ social: true }), 14));
  assert(!shouldSend(job('compat_complete'), dev({ social: true }), 2), 'quiet hours suppress social');
  assert(shouldSend(job('reading_ready'), dev({ social: false }), 2), 'pipeline sends anytime');
  assert(!shouldSend(job('daily_fortune'), dev({ daily_fortune: false }), 9), 'opted-out fortune');
  assert(!shouldSend(job('compat_complete'), dev({ social: true }, null), 14), 'no token → no send');
});

Deno.test('buildExpoMessage: to/title/body + deep_link folded into data', () => {
  const m = buildExpoMessage('ExpoTok', job('compat_complete')) as { to: string; data: { deep_link: string } };
  assertEquals(m.to, 'ExpoTok');
  assertEquals(m.data.deep_link, 'palmly://x');
});

Deno.test('sendExpoPush: batches ≤100 and returns aligned tickets (mock Expo API)', async () => {
  const msgs = Array.from({ length: 150 }, (_, i) => ({ to: `t${i}` }));
  let batches = 0;
  const mockFetch = ((_url: string, init: RequestInit) => {
    batches++;
    const n = (JSON.parse(init.body as string) as unknown[]).length;
    return Promise.resolve(new Response(JSON.stringify({ data: Array.from({ length: n }, () => ({ status: 'ok', id: 'r' })) }), { status: 200 }));
  }) as unknown as typeof fetch;
  const tickets = await sendExpoPush(msgs, mockFetch);
  assertEquals(batches, 2, '150 → two ≤100 batches');
  assertEquals(tickets.length, 150);
  assert(tickets.every((t) => t.status === 'ok'));
});

Deno.test('sendExpoPush: a failed HTTP batch yields error tickets, never throws', async () => {
  const mockFetch = (() => Promise.resolve(new Response('nope', { status: 500 }))) as unknown as typeof fetch;
  const tickets = await sendExpoPush([{ to: 'a' }, { to: 'b' }], mockFetch);
  assertEquals(tickets.length, 2);
  assert(tickets.every((t) => t.status === 'error'));
});

Deno.test('tokensToPrune: only DeviceNotRegistered tokens are returned', () => {
  const messages = [{ to: 'dead' }, { to: 'live' }, { to: 'other-err' }];
  const tickets: ExpoTicket[] = [
    { status: 'error', details: { error: 'DeviceNotRegistered' } },
    { status: 'ok', id: 'r' },
    { status: 'error', details: { error: 'MessageTooBig' } },
  ];
  assertEquals(tokensToPrune(messages, tickets), ['dead']);
});

// ── H6: a failed batch must not be archived ──────────────────────────────────────────────────────

Deno.test('isRetryableTicket: transport failures and rate limits retry; permanent errors do not', () => {
  // The H6 regression. push-dispatch archived every job it read regardless of ticket outcome, and
  // sendExpoPush turns a 5xx into error tickets rather than throwing — so a failed Expo batch was
  // silently deleted, never sent, never retried. These are the tickets that must survive.
  assert(isRetryableTicket({ status: 'error', message: 'expo_http_503' }), 'a 5xx batch must be retried, not archived');
  assert(isRetryableTicket({ status: 'error', message: 'network down' }), 'a network throw must be retried');
  assert(isRetryableTicket({ status: 'error', message: 'no_ticket' }), 'a missing ticket must be retried');
  assert(isRetryableTicket({ status: 'error', details: { error: 'MessageRateExceeded' } }), 'Expo: "implement exponential backoff and slowly retry"');
  assert(isRetryableTicket({ status: 'error', details: { error: 'TOO_MANY_REQUESTS' } }), '>600/s → back off and retry');

  // ...and the ones that must NOT be retried: re-sending can never make them land, so retrying
  // would pin the job on the queue until it dead-letters.
  assert(!isRetryableTicket({ status: 'ok', id: 'r' }), 'a delivered push is done');
  assert(!isRetryableTicket({ status: 'error', details: { error: 'DeviceNotRegistered' } }), 'token is dead → pruned, not retried');
  assert(!isRetryableTicket({ status: 'error', details: { error: 'MessageTooBig' } }), 'payload >4096B will never fit');
  assert(!isRetryableTicket({ status: 'error', details: { error: 'MismatchSenderId' } }), 'FCM credential mismatch is permanent');
  assert(!isRetryableTicket({ status: 'error', details: { error: 'InvalidCredentials' } }), 'revoked credentials are permanent');
  assert(!isRetryableTicket(undefined), 'no ticket for a job that sent nothing → archive it');
});

Deno.test('sendExpoPush: a 5xx yields error tickets rather than throwing (why H6 lost jobs silently)', async () => {
  // Pinning the premise the archive fix rests on: because this never throws, the caller reaches its
  // archive loop on a total Expo outage. That is exactly how a failed batch got deleted.
  const messages = [{ to: 'a' }, { to: 'b' }];
  const tickets = await sendExpoPush(messages, () => Promise.resolve(new Response('upstream boom', { status: 503 })));
  assertEquals(tickets.length, 2);
  assertEquals(tickets.every((t) => t.status === 'error'), true);
  assertEquals(tickets.every((t) => isRetryableTicket(t)), true, 'every ticket in a 5xx batch is retryable → nothing gets archived');
});
