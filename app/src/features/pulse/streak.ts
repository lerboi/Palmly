/**
 * Streak math over a set of sealed days (Audit-5 · 03 §6).
 *
 * Pure and dependency-free on purpose (the `capabilities.ts` rule): `dailyLedger.ts` pulls in
 * AsyncStorage and supabase-js, and neither belongs in a unit test of "how long is this run".
 *
 * These are the CLIENT's view, used offline and while the server answer is in flight. When
 * `record_daily_open` returns a number, the server's number wins — a streak must not be something a
 * client can mint (03 §2.3). The rule they both follow is Audit-4 SH-9's: never claim a run the user
 * did not have.
 */

const DAY_MS = 86_400_000;

/** `YYYY-MM-DD` → an integer day number, so runs are integer arithmetic and cannot drift at a
 *  local midnight. */
const asDay = (key: string): number => {
  const [y, m, d] = key.split('-').map(Number);
  return Math.floor(Date.UTC(y, (m ?? 1) - 1, d ?? 1) / DAY_MS);
};

/**
 * Consecutive sealed days ending today — or yesterday, because a streak is not broken until a day is
 * actually MISSED. Returns 0 when the run stopped earlier than that, so the caller hides the line
 * rather than printing last month's number as if it were live.
 */
export function currentRun(sealed: readonly string[], todayKey: string): number {
  const days = new Set(sealed.map(asDay));
  const today = asDay(todayKey);
  let cursor = days.has(today) ? today : days.has(today - 1) ? today - 1 : null;
  if (cursor === null) return 0;
  let run = 0;
  while (days.has(cursor)) {
    run++;
    cursor--;
  }
  return run;
}

/** The longest consecutive run anywhere in the history (the ledger's `longest_streak` mirror). */
export function longestRun(sealed: readonly string[]): number {
  const days = [...new Set(sealed.map(asDay))].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  for (let i = 0; i < days.length; i++) {
    run = i > 0 && days[i] === days[i - 1] + 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}

/** The cached sealed-day list is a habit record, not an archive. */
export const LEDGER_CAP_DAYS = 400;

/** Add a sealed day to the cached set, kept sorted, unique and bounded. */
export function mergeSealed(dates: readonly string[], dateKey: string): string[] {
  const set = new Set(dates);
  set.add(dateKey);
  return [...set].sort().slice(-LEDGER_CAP_DAYS);
}

/**
 * The milestones a streak crosses (01 §7 T3 / 02 §7). Each fires ONCE, at the moment the run reaches
 * it — never on a later day of the same run, and never retroactively for a run that was already past
 * it when the feature shipped.
 */
export const STREAK_MILESTONES = [3, 7, 14, 30] as const;
export type StreakMilestone = (typeof STREAK_MILESTONES)[number];

/**
 * Which milestone (if any) TODAY's seal just reached.
 *
 * Takes the streak and the set already celebrated, so the decision is pure and the caller owns
 * persistence. A regressed streak (broken run, started again) can re-reach a milestone — and should:
 * getting back to day 7 after losing a 30-day run is worth marking. Hence "already celebrated" is
 * passed in per-run by the caller rather than being a permanent ban list.
 */
export function milestoneReached(streak: number, alreadyCelebrated: readonly number[]): StreakMilestone | null {
  const seen = new Set(alreadyCelebrated);
  // Exactly-equal, not ">=": a milestone belongs to the day the run reaches it. A user who opens on
  // day 9 of a run should not be handed the day-7 sheet.
  const hit = STREAK_MILESTONES.find((m) => m === streak && !seen.has(m));
  return hit ?? null;
}

/**
 * The measured line under the week strip (RF6.T3) — or `null` when there is no honest claim.
 *
 * "Your lines hold" says the app re-checked this hand against the enrolled signature and it
 * matched. That is true after the camera ritual and simply **not true** after a tap: a tap seals the
 * day just as truly (friction never gates a daily) but it measures nothing about the hand. Saying it
 * anyway would be the pseudo-measurement 05 §5 forbids and `copyGate.test.ts` polices — and it would
 * spend the exact property that makes the claim worth putting on screen, since `06` §2.5 shows fake
 * measurement is what sinks scan-based apps in their own reviews.
 *
 * So: the day count is the floor (always measured, always true), and the full claim is what the
 * ritual buys. The sentence upgrades when you use it, which is the whole point of promoting it.
 */
export function sealLineText(streak: number, palmHeld: boolean): string | null {
  if (palmHeld && streak >= 1) {
    // Day 1 has no number to be proud of yet, so it does not pretend to (02 §9's rule for the
    // ritual's own success copy).
    return streak >= 2 ? `Day ${streak} · your lines hold` : 'Your lines hold';
  }
  if (streak >= 2) return `Day ${streak}`;
  // No run, no claim (SH-9). A single tapped day is not a rhythm worth naming.
  return null;
}

/**
 * The milestone sheet's copy, under the SAME honesty rule as {@link sealLineText}.
 *
 * Found on the S20+ walking the real flow: the sheet hardcoded "{n} days of your lines holding."
 * and "Same palm, same lines — {n} mornings running." and fired them at a reader who had tap-sealed
 * every one of those days and never once held their palm to the camera. Nothing about that hand had
 * been measured, so both sentences were claims about an act that never happened — the exact
 * pseudo-measurement 05 §5 forbids, one component away from where RF6.T3 had just fixed it.
 *
 * Congratulating someone is not a licence to overstate what you know about them.
 */
export function milestoneCopy(day: number, palmHeld: boolean): { title: string; body: string } {
  if (palmHeld) {
    return { title: `${day} days of your lines holding.`, body: `Same palm, same lines — ${day} mornings running.` };
  }
  return { title: `${day} days running.`, body: `${day} mornings, and the rhythm is holding.` };
}
