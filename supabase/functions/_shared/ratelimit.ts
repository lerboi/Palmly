// Rate limiting (Backend §13). Spec §13 requires it on `invite-claim` explicitly — it is an
// unauthenticated-adjacent brute-force surface — and on invite-create / chat-send / compat-request
// generally.
//
// Counters live in Postgres, not in this process: Edge Functions are stateless and horizontally
// scaled, so an in-memory counter counts one instance's traffic and nothing else. `check_rate_limit`
// increments and compares in a single atomic statement (see migration 0026).
import type { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from './http.ts';

/** Per-surface limits. Tuned to the THREAT, not to a uniform number:
 *  - `invite_claim_code` is the brute-force surface (a typed 40-bit code), so it is the tightest.
 *  - `invite_claim_token` carries a 43-char/256-bit token — unguessable, so the limit is only
 *    anti-abuse, not anti-guessing.
 *  - `chat_send` and `compat_request` gate paid model calls: the risk is cost, not entry. */
export const LIMITS = {
  invite_claim_code: { limit: 5, windowSec: 3600 },
  invite_claim_token: { limit: 30, windowSec: 3600 },
  invite_create: { limit: 30, windowSec: 3600 },
  chat_send: { limit: 60, windowSec: 3600 },
  compat_request: { limit: 30, windowSec: 3600 },
  // Free-tier scan quota (Backend §4, §7.2): 10 scans/day/user. Anti-abuse, not anti-entry — it
  // never blocks the spec's "complete first reading free" promise. 24h window.
  scan_create: { limit: 10, windowSec: 86400 },
} as const;

export type RateScope = keyof typeof LIMITS;

/**
 * Consume one unit of quota for (scope, subject); throw 429 when it is exhausted.
 *
 * On a counter error the default is to fail OPEN, and say so in the log: for most scopes rate
 * limiting is a mitigation layered on top of a *real* control (the 256-bit invite token, the 40-bit
 * code's entropy, the entitlement gate), so a counter outage must not take the product down.
 *
 * `failClosed` inverts that for scopes where the counter IS the only control. `scan_create` is the
 * sole gate bounding free-tier scan creation — there is no token, no entitlement backstop — and every
 * created+ingested scan becomes a paid multi-vote Gemini extraction. Failing open there would hand an
 * abuser (or a counter hiccup during a burst) uncapped model spend during exactly the window the
 * quota exists to bound. So it fails closed with a warm, retryable 503 instead (Decision Log F0.T1).
 */
export async function enforceRateLimit(
  admin: SupabaseClient,
  scope: RateScope,
  subject: string | null | undefined,
  opts: { failClosed?: boolean } = {},
): Promise<void> {
  if (!subject) return;
  const { limit, windowSec } = LIMITS[scope];
  const { data, error } = await admin.rpc('check_rate_limit', {
    p_scope: scope,
    p_subject: subject,
    p_limit: limit,
    p_window: `${windowSec} seconds`,
  });
  if (error) {
    if (opts.failClosed) {
      console.error(`[ratelimit] ${scope} check failed — FAILING CLOSED:`, error.message);
      throw new AppError('rate_limit_unavailable', 'the service is briefly busy — try again in a moment', 503);
    }
    console.error(`[ratelimit] ${scope} check failed — FAILING OPEN:`, error.message);
    return;
  }
  if (data === false) {
    throw new AppError('rate_limited', `too many ${scope.replace(/_/g, ' ')} requests — try again later`, 429);
  }
}
