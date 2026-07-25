import type { IconName } from '@/components/ui';
import type { PairData } from './PairRevealView';

/**
 * Pure logic behind the compatibility reveal (Audit-4 CO-16, SH-15). Everything here was previously
 * inline in the view, where it could not be tested and where two of the three bugs below hid.
 */

/**
 * Sub-score dimension → feature icon, keyed on the **stable server key** (`emotion`, `life_energy`,
 * …), not on the display copy.
 *
 * The map used to be keyed on the label ("Emotion", "Energy"), so every icon on the screen silently
 * became `sparkle` the moment anyone rewrote a label — a copy edit breaking a visual, with nothing
 * to catch it. Keys come from `compatibility_results.sub_scores` and do not change with copy.
 */
export const DIM_ICON: Record<string, IconName> = {
  emotion: 'heart',
  mind: 'mind',
  life_energy: 'life',
  destiny: 'path',
  elements: 'elements',
};

/** The icon for a dimension, with the documented fallback for a key we don't know yet. */
export function dimIcon(key: string): IconName {
  return DIM_ICON[key] ?? 'sparkle';
}

export interface NarrativeBlockData {
  title: string;
  body: string;
}

/**
 * The narrative blocks that actually have prose (CO-16).
 *
 * `toPairData` defaults a missing section to `''`, and the view rendered the heading regardless —
 * so a half-generated narrative showed "Where you click" over **nothing**, which reads as a broken
 * screen rather than a shorter one. A block with no body is simply not a block.
 */
export function narrativeBlocks(data: Pick<PairData, 'click' | 'stretch'>): NarrativeBlockData[] {
  return [
    { title: 'Where you click', body: data.click },
    { title: 'Where you’ll stretch each other', body: data.stretch },
  ].filter((b) => b.body.trim().length > 0);
}

// ── The waiting state (SH-15) ─────────────────────────────────────────────────────────────────────

export type WaitingLevel = 'calm' | 'slow' | 'nudge';
/** Seconds before the waiting state admits it is slow, and before it offers a nudge. */
export const WAITING_SLOW_MS = 20_000;
export const WAITING_NUDGE_MS = 45_000;

/**
 * How the waiting state should read at `elapsedMs` (SH-15: it had **no timeout, nudge or retry** —
 * a user whose partner never scans waits on "Weaving your red thread…" forever). Calm at first,
 * then honest about the wait, then offering the one action that can actually move it: reminding
 * the other person.
 */
export function waitingLevel(elapsedMs: number): WaitingLevel {
  if (elapsedMs >= WAITING_NUDGE_MS) return 'nudge';
  if (elapsedMs >= WAITING_SLOW_MS) return 'slow';
  return 'calm';
}

export const WAITING_SLOW_COPY = 'Still weaving — this lands the moment both palms are in.';
export const WAITING_NUDGE_COPY = 'Nothing yet from their side. A nudge usually does it.';

// ── The success haptic (CO-16) ────────────────────────────────────────────────────────────────────

/**
 * The pair-score celebration is once **per pair**, not once per mount.
 *
 * The haptic fired from a `useEffect(…, [])`, so every remount — a back-navigation, a re-render
 * after the share sheet closes — buzzed again for a score the user had already seen. This keeps a
 * session-scoped set of celebrated pairs; a fresh launch may celebrate once more, which is the
 * correct behavior for an arrival beat.
 */
const celebrated = new Set<string>();

/** True the FIRST time it is asked about a given pair; false forever after (within the session). */
export function claimCelebration(pairId: string | undefined): boolean {
  const key = pairId ?? '';
  if (celebrated.has(key)) return false;
  celebrated.add(key);
  return true;
}

/** Test-only reset — the module-level set would otherwise leak between cases. */
export function resetCelebrations(): void {
  celebrated.clear();
}
