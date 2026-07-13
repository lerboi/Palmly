// RevenueCat webhook verification + entitlement derivation (Backend §5.2, §13). RC's recommended
// webhook auth is HMAC-SHA256: header `X-RevenueCat-Webhook-Signature: t=<unix_ts>,v1=<hex>`, the
// signature computed over `"<t>.<raw_json_body>"` with the integration's signing secret. We verify
// with a constant-time compare + a timestamp-tolerance window (replay protection). Pure/injectable
// (rawBody, header, secret, nowMs) so it is unit-testable without the network.

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Length-independent constant-time hex compare. */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export interface SigResult {
  valid: boolean;
  reason?: string;
}

/** Compute the RC signature value for a body+timestamp (also used by tests to forge a valid one). */
export const rcSignature = (secret: string, ts: string | number, rawBody: string): Promise<string> =>
  hmacSha256Hex(secret, `${ts}.${rawBody}`);

export async function verifyWebhookSignature(
  rawBody: string,
  sigHeader: string | null,
  secret: string,
  nowMs: number,
  toleranceSec = 300,
): Promise<SigResult> {
  if (!sigHeader) return { valid: false, reason: 'missing_signature' };
  const parts: Record<string, string> = {};
  for (const kv of sigHeader.split(',')) {
    const [k, v] = kv.split('=');
    if (k && v) parts[k.trim()] = v.trim();
  }
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return { valid: false, reason: 'malformed_signature' };
  const tsSec = Number(t);
  if (!Number.isFinite(tsSec)) return { valid: false, reason: 'bad_timestamp' };
  if (Math.abs(nowMs / 1000 - tsSec) > toleranceSec) return { valid: false, reason: 'timestamp_out_of_tolerance' };
  const expected = await hmacSha256Hex(secret, `${t}.${rawBody}`);
  return constantTimeEqual(expected, v1) ? { valid: true } : { valid: false, reason: 'signature_mismatch' };
}

// ── Entitlement derivation ─────────────────────────────────────────────────────────────────
export interface RcEvent {
  id?: string;
  type?: string;
  app_user_id?: string;
  product_id?: string;
  expiration_at_ms?: number | null;
  store?: string;
  entitlement_ids?: string[];
}

export interface SubscriptionState {
  status: 'active' | 'in_grace' | 'expired';
  entitlements: Record<string, unknown>;
}

// Events that (re)grant entitlement.
const ACTIVATING = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'PRODUCT_CHANGE',
  'UNCANCELLATION',
  'SUBSCRIPTION_EXTENDED',
  'NON_RENEWING_PURCHASE',
  'TRANSFER',
]);

const premiumEntitlement = (e: RcEvent): Record<string, unknown> => ({
  premium: {
    expires_at: e.expiration_at_ms ? new Date(e.expiration_at_ms).toISOString() : null,
    product_id: e.product_id ?? null,
    store: e.store ?? null,
  },
});

/**
 * Map a single RC event to the authoritative `subscriptions` state (Backend §5.2). CANCELLATION
 * only turns off auto-renew (entitled until expiry); BILLING_ISSUE keeps entitlement during grace;
 * EXPIRATION removes it. The `subscriptions` table is the server-side source of truth for gating.
 */
export function deriveEntitlement(e: RcEvent, nowMs: number): SubscriptionState {
  const expMs = e.expiration_at_ms ?? null;
  const stillActive = expMs == null || expMs > nowMs;
  const type = e.type ?? '';
  if (type === 'EXPIRATION') return { status: 'expired', entitlements: {} };
  if (type === 'BILLING_ISSUE') return stillActive ? { status: 'in_grace', entitlements: premiumEntitlement(e) } : { status: 'expired', entitlements: {} };
  if (type === 'CANCELLATION') return stillActive ? { status: 'active', entitlements: premiumEntitlement(e) } : { status: 'expired', entitlements: {} };
  if (ACTIVATING.has(type)) return { status: 'active', entitlements: premiumEntitlement(e) };
  // unknown/other event → derive purely from the expiry timestamp
  return stillActive ? { status: 'active', entitlements: premiumEntitlement(e) } : { status: 'expired', entitlements: {} };
}

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v);
