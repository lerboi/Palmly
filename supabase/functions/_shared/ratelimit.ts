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
} as const;

export type RateScope = keyof typeof LIMITS;

/**
 * Consume one unit of quota for (scope, subject); throw 429 when it is exhausted.
 *
 * Fails OPEN if the counter itself errors, and says so in the log. Rate limiting here is a
 * mitigation layered on top of real controls (the 256-bit token, the 40-bit code's entropy, the
 * entitlement gate) — never the thing that makes those safe. A counter outage must not take the
 * product down; it must be visible.
 */
export async function enforceRateLimit(admin: SupabaseClient, scope: RateScope, subject: string | null | undefined): Promise<void> {
  if (!subject) return;
  const { limit, windowSec } = LIMITS[scope];
  const { data, error } = await admin.rpc('check_rate_limit', {
    p_scope: scope,
    p_subject: subject,
    p_limit: limit,
    p_window: `${windowSec} seconds`,
  });
  if (error) {
    console.error(`[ratelimit] ${scope} check failed — FAILING OPEN:`, error.message);
    return;
  }
  if (data === false) {
    throw new AppError('rate_limited', `too many ${scope.replace(/_/g, ' ')} requests — try again later`, 429);
  }
}
