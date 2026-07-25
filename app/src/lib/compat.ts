import AsyncStorage from '@react-native-async-storage/async-storage';
import { toPairData, type CompatShareData } from './compatCopy';
import { supabase } from './supabase';

export type CompatRequestResult = { ok: true; status: string } | { ok: false; gated: boolean };

/**
 * Request a comparison for a pair (audit F1.7) → the deployed user-mode `compat-request`, which drives
 * the `compatibility_results` lifecycle and enforces the free-comparison gate server-side (Backend §4):
 * a non-premium caller's SECOND comparison returns **HTTP 402**. The client treats 402 as the signal to
 * route to `/paywall?trigger=compat_second`; any other error is a transient failure, not a gate.
 */
export async function requestCompat(pairId: string): Promise<CompatRequestResult> {
  const { data, error } = await supabase.functions.invoke('compat-request', { body: { pair_id: pairId } });
  if (!error) return { ok: true, status: (data as { status?: string } | null)?.status ?? 'unknown' };
  // supabase-js FunctionsHttpError carries the raw Response on `.context`; 402 = the gate.
  const status = (error as { context?: { status?: number } }).context?.status;
  return { ok: false, gated: status === 402 };
}

const seenKey = (pairId: string) => `palmly.compat_prompt_seen.${pairId}`;

/** Has this pair's auto-present compat prompt already fired (one dismissal disables it per pair)? */
export async function wasCompatPromptSeen(pairId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(seenKey(pairId))) === '1';
  } catch {
    return false;
  }
}

/** Mark this pair's auto-present prompt as shown so it never re-fires for the pair. */
export async function markCompatPromptSeen(pairId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(seenKey(pairId), '1');
  } catch {
    /* best-effort */
  }
}

/** Backend `sub_scores` keys (compat.ts `SubScores`) → the display labels the reveal's icons map on. */

/**
 * Resolve the OTHER pair member's display name for the "You & «Name»" header. RLS lets only a pair
 * member read the pair; if the partner's profile isn't readable (self-only profiles), fall back to a
 * neutral label rather than leaking or crashing.
 */
export async function loadPartnerName(pairId: string): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  const me = sessionData.session?.user?.id;
  const { data: pair } = await supabase.from('compatibility_pairs').select('user_a, user_b').eq('id', pairId).maybeSingle();
  if (!pair) return 'Your match';
  const other = (pair.user_a === me ? pair.user_b : pair.user_a) as string;
  const { data: prof } = await supabase.from('profiles').select('display_name').eq('id', other).maybeSingle();
  return prof?.display_name ?? 'Your match';
}

/**
 * One-shot: a completed pair's REAL score + the partner's name, for the compat SHARE card (audit A6).
 * The compat share sheet only opens after the score has landed (`shouldAutoPresent` gates on
 * `complete`, and the manual "Share this match" only renders on `complete`), so a `null` here means
 * "not loaded / not ready" — the caller shows a neutral placeholder, never a fabricated score/name
 * (the old `score={82}` / `partnerName="Mei"` that real users were prompted to send).
 */
export async function loadCompatShare(pairId: string): Promise<CompatShareData | null> {
  const [{ data }, partnerName] = await Promise.all([
    supabase.from('compatibility_results').select('score, status, narrative, sub_scores').eq('pair_id', pairId).maybeSingle(),
    loadPartnerName(pairId),
  ]);
  const row = data as { score?: number | null; status?: string } | null;
  if (!row || row.status !== 'complete' || typeof row.score !== 'number') return null;
  // The blurb and the chips are the pair's OWN narrative + dimensions (Audit-4 SH-7). They used to
  // be hardcoded defaults inside the share sheet, so a real user's card carried invented prose.
  const pair = toPairData(data as never, partnerName);
  return { score: row.score, partnerName, blurb: pair.headline, chips: pair.subScores.map((d) => d.label) };
}

export { toPairData } from './compatCopy';
