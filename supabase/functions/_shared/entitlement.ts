// Server-side entitlement gate (Backend §5.2 two-layer gating). The client's RC `customerInfo` is a
// hint for instant UI; every privileged server operation (deep-dive generation, chat, extra
// compatibility) re-checks the `subscriptions` table here — the table is truth. Kept separate from
// revenuecat.ts because gating is consumed across many functions, not just the webhook.
import type { SupabaseClient } from '@supabase/supabase-js';

export interface SubRow {
  entitlements?: Record<string, unknown> | null;
  status?: string | null;
}

/** Pure premium check for a `subscriptions` row (unit-testable without a DB). */
export function isPremiumRow(row: SubRow | null | undefined, nowMs: number): boolean {
  if (!row) return false;
  if (row.status === 'expired') return false;
  const p = (row.entitlements as Record<string, { expires_at?: string | null }> | null | undefined)?.premium;
  if (!p) return false;
  if (!p.expires_at) return true; // no expiry recorded → active while the status isn't expired
  return new Date(p.expires_at).getTime() > nowMs;
}

/** Authoritative gate: does this user currently hold the `premium` entitlement? */
export async function hasPremium(admin: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await admin.from('subscriptions').select('entitlements, status').eq('user_id', userId).maybeSingle();
  return isPremiumRow(data as SubRow | null, Date.now());
}
