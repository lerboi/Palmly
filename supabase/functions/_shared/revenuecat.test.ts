import { assert, assertEquals } from '@std/assert';
import { deriveEntitlement, isUuid, rcSignature, verifyWebhookSignature } from './revenuecat.ts';

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
