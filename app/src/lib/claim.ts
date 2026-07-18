import AsyncStorage from '@react-native-async-storage/async-storage';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';

/**
 * Recipient claim (audit F0.5; Backend §8.2). `invite-claim` is single-use and has NO resolve-only
 * mode — one call atomically CLAIMS the invite and creates the pair — so it is called ONLY on the
 * explicit accept tap, never on screen-open. The claim context is persisted so a reload re-offers
 * the personalized landing without re-claiming (a re-claim after success returns 409 and is handled
 * by falling back to the persisted context).
 */
const KEY = 'palmly.claim_context.v1';

export interface ClaimContext {
  /** The raw invite token from the deep link (absent when claimed via a typed code). */
  token?: string;
  inviterName: string;
  /** Present once the invite is claimed — the created compatibility pair. */
  pairId?: string;
  claimed: boolean;
}

export async function saveClaimContext(ctx: ClaimContext): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(ctx));
  } catch {
    /* best-effort persistence — never crash the claim flow over storage */
  }
}
export async function loadClaimContext(): Promise<ClaimContext | null> {
  try {
    const s = await AsyncStorage.getItem(KEY);
    return s ? (JSON.parse(s) as ClaimContext) : null;
  } catch {
    return null;
  }
}
export async function clearClaimContext(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* best-effort */
  }
}

/** Format a typed short code toward the canonical `XXXXX-XXXXX` (10 hex) for the input field. The
 *  server (`resolve_invite_code`) strips separators + lowercases anyway, so this is display-only. */
export function normalizeCode(raw: string): string {
  const hex = raw.toUpperCase().replace(/[^0-9A-F]/g, '').slice(0, 10);
  return hex.length > 5 ? `${hex.slice(0, 5)}-${hex.slice(5)}` : hex;
}

/** A claim error carrying the HTTP status so the caller can branch (409 = already claimed). */
export class ClaimError extends Error {
  constructor(public status: number) {
    super(`invite-claim failed (${status})`);
    this.name = 'ClaimError';
  }
}

export interface ClaimResult {
  pairId: string;
  inviterName: string;
}

/** Claim an invite via the deployed `invite-claim` (single-use). Pass the deep-link `token` OR a
 *  typed short `code`. Throws {@link ClaimError} with the HTTP status on failure. */
export async function claimInvite(input: { token: string } | { code: string }): Promise<ClaimResult> {
  const body = 'token' in input ? { token: input.token } : { code: input.code, source: 'manual_code' };
  const { data, error } = await supabase.functions.invoke('invite-claim', { body });
  if (error) {
    const status = error instanceof FunctionsHttpError ? error.context.status : 0;
    throw new ClaimError(status);
  }
  const res = (data ?? {}) as { pair_id?: string; inviter_name?: string };
  if (!res.pair_id) throw new ClaimError(0);
  return { pairId: res.pair_id, inviterName: res.inviter_name ?? 'A friend' };
}
