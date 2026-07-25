import type { CompatStatus, CompatResultRow } from './useCompatStatus';
import type { PairData } from '@/features/reading/PairRevealView';

/**
 * Pure compat helpers (audit F1.7) — no `supabase`/AsyncStorage imports, so they can be unit-tested
 * without dragging the client SDK's native modules into jest (the `type`-only import above is erased
 * at compile). The stateful pieces (requestCompat, the seen-store) live in `./compat`.
 */

/** How long after the score lands to auto-present the compat share sheet (UIUX §2.7.4, P2). */
export const AUTO_PRESENT_DELAY_MS = 2000;

/** Auto-present the compat share sheet only once the score is in and only if this pair's prompt has
 *  not already been shown/dismissed (one per pair). */
export function shouldAutoPresent(status: CompatStatus | null, alreadySeen: boolean): boolean {
  return status === 'complete' && !alreadySeen;
}

/**
 * A compact "sent 2 days ago" elapsed label. `nowMs` is injected (not read from an argless
 * `Date.now()`) so this is pure + unit-testable and never trips the react-hooks purity rule.
 */
export function elapsedLabel(sentISO: string, nowMs: number): string {
  const then = Date.parse(sentISO);
  if (Number.isNaN(then) || nowMs < then) return 'just now';
  const mins = Math.floor((nowMs - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

const SUB_LABELS: Record<string, string> = {
  emotion: 'Emotion',
  mind: 'Mind',
  life_energy: 'Energy',
  destiny: 'Destiny',
  elements: 'Elements',
};
const SUB_ORDER = ['emotion', 'mind', 'life_energy', 'destiny', 'elements'];

/** Map a completed `compatibility_results` row → the {@link PairData} the reveal renders. */
export function toPairData(result: CompatResultRow, partnerName: string): PairData {
  const subs = (result.sub_scores ?? {}) as Record<string, number>;
  // The `key` rides along so the view's icon map keys on the STABLE server key, not display copy
  // (Audit-4 CO-16 — a label rewrite used to silently turn every dimension icon into `sparkle`).
  const subScores = SUB_ORDER.filter((k) => typeof subs[k] === 'number').map((k) => ({ key: k, label: SUB_LABELS[k], value: subs[k] }));
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

/**
 * Everything the compat share CARD needs. There is deliberately no default: a card without a real
 * pair is a fabricated result (Audit-4 SH-7), and the sheet renders its invite-first state instead.
 */
export interface CompatShareData {
  score: number;
  partnerName: string;
  blurb: string;
  chips: string[];
}

/**
 * Is there a real pair to render a card for? A score of 0 with a placeholder name is exactly what
 * the sheet used to show when opened from a reveal, so both are treated as "no pair".
 */
export function hasRealPair(pair: Partial<CompatShareData> | null | undefined): boolean {
  if (!pair) return false;
  const named = typeof pair.partnerName === 'string' && pair.partnerName.trim().length > 0 && pair.partnerName !== 'Your match';
  return named && typeof pair.score === 'number' && pair.score > 0;
}
