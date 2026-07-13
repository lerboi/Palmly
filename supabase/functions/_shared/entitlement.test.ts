import { assert } from '@std/assert';
import { isPremiumRow } from './entitlement.ts';

const NOW = 1_760_000_000_000;
const iso = (ms: number) => new Date(ms).toISOString();

Deno.test('isPremiumRow: active premium with a future expiry → true', () => {
  assert(isPremiumRow({ status: 'active', entitlements: { premium: { expires_at: iso(NOW + 86400_000) } } }, NOW));
});

Deno.test('isPremiumRow: in_grace with a future expiry → true', () => {
  assert(isPremiumRow({ status: 'in_grace', entitlements: { premium: { expires_at: iso(NOW + 3600_000) } } }, NOW));
});

Deno.test('isPremiumRow: expired status, past expiry, no premium, or null → false', () => {
  assert(!isPremiumRow({ status: 'expired', entitlements: {} }, NOW));
  assert(!isPremiumRow({ status: 'active', entitlements: { premium: { expires_at: iso(NOW - 1) } } }, NOW));
  assert(!isPremiumRow({ status: 'active', entitlements: {} }, NOW));
  assert(!isPremiumRow(null, NOW));
  assert(!isPremiumRow(undefined, NOW));
});
