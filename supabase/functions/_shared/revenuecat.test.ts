import { assert, assertEquals } from '@std/assert';
import { deriveEntitlement, isUuid, rcSignature, transferParties, verifyWebhookSignature } from './revenuecat.ts';

const SECRET = 'whsec_test_secret';
const NOW = 1_760_000_000_000; // fixed ms
const TS = String(Math.floor(NOW / 1000));
const BODY = JSON.stringify({ event: { id: 'evt_1', type: 'INITIAL_PURCHASE', app_user_id: 'u' } });

Deno.test('verifyWebhookSignature: a correctly-signed body verifies', async () => {
  const v1 = await rcSignature(SECRET, TS, BODY);
  const r = await verifyWebhookSignature(BODY, `t=${TS},v1=${v1}`, SECRET, NOW);
  assert(r.valid, r.reason);
});

Deno.test('verifyWebhookSignature: tampered body / wrong secret / missing header are rejected', async () => {
  const v1 = await rcSignature(SECRET, TS, BODY);
  assertEquals((await verifyWebhookSignature(BODY + ' ', `t=${TS},v1=${v1}`, SECRET, NOW)).reason, 'signature_mismatch');
  assertEquals((await verifyWebhookSignature(BODY, `t=${TS},v1=${v1}`, 'wrong', NOW)).reason, 'signature_mismatch');
  assertEquals((await verifyWebhookSignature(BODY, null, SECRET, NOW)).reason, 'missing_signature');
  assertEquals((await verifyWebhookSignature(BODY, 'garbage', SECRET, NOW)).reason, 'malformed_signature');
});

Deno.test('verifyWebhookSignature: a stale timestamp is rejected (replay protection)', async () => {
  const oldTs = String(Math.floor(NOW / 1000) - 3600);
  const v1 = await rcSignature(SECRET, oldTs, BODY);
  assertEquals((await verifyWebhookSignature(BODY, `t=${oldTs},v1=${v1}`, SECRET, NOW)).reason, 'timestamp_out_of_tolerance');
});

Deno.test('deriveEntitlement: purchase/renewal → active premium with expiry', () => {
  const exp = NOW + 30 * 86400_000;
  for (const type of ['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'UNCANCELLATION']) {
    const s = deriveEntitlement({ type, product_id: 'palmly_monthly', store: 'APP_STORE', expiration_at_ms: exp }, NOW);
    assertEquals(s.status, 'active', type);
    assert((s.entitlements.premium as { expires_at: string }).expires_at.startsWith('20'));
  }
});

Deno.test('deriveEntitlement: cancellation keeps entitlement until expiry; expiration removes it', () => {
  const future = NOW + 10 * 86400_000;
  const past = NOW - 86400_000;
  assertEquals(deriveEntitlement({ type: 'CANCELLATION', expiration_at_ms: future }, NOW).status, 'active');
  assertEquals(deriveEntitlement({ type: 'CANCELLATION', expiration_at_ms: past }, NOW).status, 'expired');
  const expd = deriveEntitlement({ type: 'EXPIRATION', expiration_at_ms: past }, NOW);
  assertEquals(expd.status, 'expired');
  assertEquals(expd.entitlements.premium, undefined);
});

Deno.test('deriveEntitlement: billing issue within grace → in_grace; past grace → expired', () => {
  assertEquals(deriveEntitlement({ type: 'BILLING_ISSUE', expiration_at_ms: NOW + 86400_000 }, NOW).status, 'in_grace');
  assertEquals(deriveEntitlement({ type: 'BILLING_ISSUE', expiration_at_ms: NOW - 86400_000 }, NOW).status, 'expired');
});

Deno.test('isUuid distinguishes a Supabase UUID from an RC anonymous id', () => {
  assert(isUuid('77777777-7777-7777-7777-777777777777'));
  assert(!isUuid('$RCAnonymousID:abc123'));
  assert(!isUuid(undefined));
});

// ── C3: the wire format, pinned against an INDEPENDENT oracle ────────────────────────────────────
//
// Every other signature test here signs with our own `rcSignature` and verifies with our own
// `verifyWebhookSignature` — which is trivially green no matter what the scheme is. That is exactly
// the trap the audit's C3 walked into from the other side (it asserted the scheme was wrong).
//
// This vector was computed by a DIFFERENT implementation (node:crypto's createHmac, not WebCrypto)
// from RevenueCat's documented wire format:
//     X-RevenueCat-Webhook-Signature: t=<unix_timestamp>,v1=<hmac_sha256_hex>
//     v1 = HMAC-SHA256( secret, "<t>.<raw_json_body>" )  — hex, over the RAW bytes
// Docs verified 2026-07-17: https://www.revenuecat.com/docs/integrations/webhooks
//
// If anyone "fixes" the concatenation, the encoding, or the header parsing, this fails — because
// nothing in this test is produced by the code under test.
const RC_VECTOR = {
  secret: 'whsec_palmly_test_vector',
  t: '1700000000',
  body: '{"event":{"id":"evt_test","type":"INITIAL_PURCHASE","app_user_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}}',
  v1: '63074dabc37dbb28fcc4078d784fb0bc7ffba7d35ecbe23d7a022c2fbba0f62e',
};

Deno.test('C3: verifyWebhookSignature accepts a signature produced by an INDEPENDENT implementation', async () => {
  const { secret, t, body, v1 } = RC_VECTOR;
  const res = await verifyWebhookSignature(body, `t=${t},v1=${v1}`, secret, Number(t) * 1000);
  assertEquals(res.valid, true, 'our verifier must accept RC-format bytes it did not generate itself');
});

Deno.test('C3: our own rcSignature agrees with the independent oracle (the scheme, not just itself)', async () => {
  // Pins the two implementations to the SAME wire format. If rcSignature drifts, the helper and the
  // verifier would still agree with each other — and this is what would catch that.
  const { secret, t, body, v1 } = RC_VECTOR;
  assertEquals(await rcSignature(secret, t, body), v1, 'rcSignature must reproduce node:crypto exactly');
});

Deno.test('C3: the wire format is order-sensitive — "<body>.<t>" must NOT verify', async () => {
  // The concatenation is the part most easily got wrong, and getting it wrong silently 401s every
  // paying customer. This asserts the mistake is actually detected.
  const { secret, t, body } = RC_VECTOR;
  // node:crypto's HMAC over the REVERSED concatenation "<body>.<t>" begins a533ac89dfd3caa1…
  const reversed = await verifyWebhookSignature(body, `t=${t},v1=a533ac89dfd3caa1${'0'.repeat(48)}`, secret, Number(t) * 1000);
  assertEquals(reversed.valid, false, 'a signature over body.t (the reversed order) must be rejected');
  assertEquals(reversed.reason, 'signature_mismatch');
});
// ── H4/TRANSFER: the event carries no app_user_id at all ────────────────────────────────────────

Deno.test('transferParties: a TRANSFER resolves its destination and source from the arrays', () => {
  // Docs verified 2026-07-17: a TRANSFER has transferred_from/transferred_to (App User ID ARRAYS)
  // and NO app_user_id — "the webhook is sent only for the destination user". The webhook's usual
  // isUuid(event.app_user_id) therefore yielded null, and the event was logged but never applied:
  // we granted NOBODY and revoked nobody.
  const from = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const to = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const p = transferParties({ type: 'TRANSFER', transferred_from: [from], transferred_to: [to] });
  assertEquals(p.to, [to]);
  assertEquals(p.from, [from]);

  // RC anonymous ids are not users we can gate — they must never be treated as a Supabase uuid.
  const mixed = transferParties({
    type: 'TRANSFER',
    transferred_from: ['$RCAnonymousID:9f8e7d6c', from],
    transferred_to: ['$RCAnonymousID:1a2b3c4d'],
  });
  assertEquals(mixed.from, [from], 'anonymous source filtered out, real uuid kept');
  assertEquals(mixed.to, [], 'an anonymous destination is nobody we can grant to');

  // a non-TRANSFER event has neither
  assertEquals(transferParties({ type: 'RENEWAL', app_user_id: to }), { to: [], from: [] });
  assertEquals(transferParties({ type: 'TRANSFER', transferred_from: 'not-an-array' as unknown as string[] }), { to: [], from: [] });
});
