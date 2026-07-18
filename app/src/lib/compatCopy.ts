import type { CompatStatus } from './useCompatStatus';

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
