// Constant-time comparison for secret-bearing equality checks (audit Low: the internal "secret"
// gate was a plain `===`). Extracted here because there are now two callers — the RevenueCat webhook
// signature (`revenuecat.ts`, where it has always been used) and the service-key gate
// (`auth-resolve.ts`) — and two copies of a security primitive is how the copies drift apart.
//
// Scope, stated honestly: this removes a *timing* oracle, not a length one. An early `false` on
// unequal lengths leaks the secret's length, which is fine for both callers — a RevenueCat HMAC is a
// fixed-width hex digest, and the service key's length is a published format, not a secret.

/** Compare two strings without leaking WHERE they differ via timing. Length is not hidden. */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
