import { supabase } from './supabase';
import type { PairData } from '@/features/reading/PairRevealView';
import type { CompatResultRow } from './useCompatStatus';

/** Backend `sub_scores` keys (compat.ts `SubScores`) → the display labels the reveal's icons map on. */
const SUB_LABELS: Record<string, string> = {
  emotion: 'Emotion',
  mind: 'Mind',
  life_energy: 'Energy',
  destiny: 'Destiny',
  elements: 'Elements',
};
const SUB_ORDER = ['emotion', 'mind', 'life_energy', 'destiny', 'elements'];

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

/** Map a completed `compatibility_results` row → the {@link PairData} the reveal renders. */
export function toPairData(result: CompatResultRow, partnerName: string): PairData {
  const subs = (result.sub_scores ?? {}) as Record<string, number>;
  const subScores = SUB_ORDER.filter((k) => typeof subs[k] === 'number').map((k) => ({ label: SUB_LABELS[k], value: subs[k] }));
  const sections = result.narrative?.sections ?? [];
  return {
    partnerName,
    score: result.score ?? 0,
    headline: result.narrative?.headline ?? 'Your compatibility',
    subScores,
    click: sections[0]?.body ?? '',
    stretch: sections[1]?.body ?? '',
  };
}
