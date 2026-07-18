import { useEffect, useState } from 'react';
import { supabase } from './supabase';

/**
 * Client entitlement store (audit F0.3, Backend §5.2) — **free by default**. The `subscriptions`
 * table is truth: this reads the caller's own row via RLS, and a user with no row (the default) is
 * free. RevenueCat's `customerInfo` will feed this store for instant UI on device later (H8); the
 * gate here mirrors the server's pure check (`supabase/functions/_shared/entitlement.ts`) so client
 * and server never disagree about who is premium.
 */

export interface SubRow {
  entitlements?: Record<string, unknown> | null;
  status?: string | null;
}

/** Pure premium check for a `subscriptions` row — mirrors the server `isPremiumRow`. */
export function isPremiumRow(row: SubRow | null | undefined, nowMs: number): boolean {
  if (!row) return false;
  if (row.status === 'expired') return false;
  const p = (row.entitlements as Record<string, { expires_at?: string | null }> | null | undefined)?.premium;
  if (!p) return false;
  if (!p.expires_at) return true; // no expiry recorded → active while the status isn't expired
  return new Date(p.expires_at).getTime() > nowMs;
}

/** Read the caller's subscriptions row (RLS-scoped) → premium? No row (the default) resolves to free. */
export async function loadEntitlement(): Promise<boolean> {
  const { data } = await supabase.from('subscriptions').select('entitlements, status').maybeSingle();
  return isPremiumRow(data as SubRow | null, Date.now());
}

export interface EntitlementState {
  premium: boolean;
  loading: boolean;
}

/** Free-by-default entitlement hook — reads the subscriptions row once on mount; failures stay free. */
export function useEntitlement(): EntitlementState {
  const [state, setState] = useState<EntitlementState>({ premium: false, loading: true });
  useEffect(() => {
    let active = true;
    loadEntitlement()
      .then((premium) => active && setState({ premium, loading: false }))
      .catch(() => active && setState({ premium: false, loading: false }));
    return () => {
      active = false;
    };
  }, []);
  return state;
}
