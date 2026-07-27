/**
 * The week rhythm behind Today's strip (Audit-4 SH-9, Design-Direction §4.1).
 *
 * The audit's blunt finding: **the streak does not exist in production.** The `streak` prop was
 * never passed (default 0 hid the strip entirely), analytics hardcoded `streak: 0`, and the strip
 * clamped at `Math.min(streak, 7)` so a 7-day and a 30-day run would have rendered identically.
 * The dots carried no weekday or "today" meaning at all — there was no calendar on Today, only the
 * suggestion of one.
 *
 * These are pure date functions over a list of **local** date keys, so they unit-test without a
 * clock or storage. Local, not UTC, is the point: a day boundary the user doesn't recognise is the
 * same class of bug as SH-14.
 */

/** `YYYY-MM-DD` in the LOCAL timezone. `toISOString()` would silently shift the day near midnight. */
export function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export interface DayCell {
  /** The local date key this column stands for. */
  key: string;
  /** One-letter weekday initial for the label row. */
  initial: string;
  /** The user opened their fortune on this day. */
  opened: boolean;
  /** This column is today. */
  isToday: boolean;
  /** This column is later this week — nothing has happened yet. */
  isFuture: boolean;
}

/**
 * The seven columns ending today: six days of history plus today itself. A trailing window (rather
 * than a Sunday-to-Saturday calendar week) means the strip always shows the user's own recent
 * rhythm instead of emptying out every Monday.
 */
export function weekCells(now: Date, opened: readonly string[]): DayCell[] {
  const set = new Set(opened);
  const todayKey = localDateKey(now);
  const cells: DayCell[] = [];
  for (let back = 6; back >= 0; back--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back);
    const key = localDateKey(d);
    cells.push({
      key,
      initial: d.toLocaleDateString(undefined, { weekday: 'narrow' }),
      opened: set.has(key),
      isToday: key === todayKey,
      isFuture: false,
    });
  }
  return cells;
}

/**
 * Consecutive days ending today (or yesterday — a run isn't broken until a day is actually missed).
 * Counts the WHOLE run, with no clamp: the old strip capped at 7, so a month-long habit looked
 * exactly like a week-long one.
 *
 * Returns 0 when there is no run touching today or yesterday, so the caller can hide the line
 * rather than print a stale "3-day streak" from last month.
 */
export function streakRun(now: Date, opened: readonly string[]): number {
  const set = new Set(opened);
  const todayKey = localDateKey(now);
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

  // Anchor on today if it's marked, else yesterday — otherwise the run is already broken.
  let cursor: Date;
  if (set.has(todayKey)) cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  else if (set.has(localDateKey(yesterday))) cursor = yesterday;
  else return 0;

  let run = 0;
  // Walk backwards day by day; `new Date(y, m, d - 1)` rolls months and years correctly.
  while (set.has(localDateKey(cursor))) {
    run += 1;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1);
  }
  return run;
}

/**
 * Did the CURRENT run include a real camera seal? (Audit-5 RF6.T3.)
 *
 * This is what separates a measured claim from a slogan. "Your lines hold" says the app re-checked
 * this hand against the enrolled signature and it matched — true for a palm seal, and simply not
 * true for a tap. A reader who has only ever tapped has had nothing measured, so they must not be
 * told their lines held; 05 §5 bans that pseudo-measurement outright and `06` §2.5 shows fake
 * measurement is the specific thing that sinks scan-based apps in the reviews.
 *
 * Scoped to the run, not to all history: a palm seal from two months ago does not make today's
 * "Day 47" a measured sentence. The claim ages out, which is also the nudge back to the ritual.
 */
export function palmHeldInRun(now: Date, sealed: readonly string[], palmSealed: readonly string[]): boolean {
  const set = new Set(sealed);
  const palm = new Set(palmSealed);
  const todayKey = localDateKey(now);
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

  let cursor: Date;
  if (set.has(todayKey)) cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  else if (set.has(localDateKey(yesterday))) cursor = yesterday;
  else return false;

  while (set.has(localDateKey(cursor))) {
    if (palm.has(localDateKey(cursor))) return true;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1);
  }
  return false;
}

/** Add today to the opened list, keeping it sorted, unique, and trimmed to a useful window. */
export function recordOpen(now: Date, opened: readonly string[], keepDays = 400): string[] {
  const key = localDateKey(now);
  const set = new Set(opened);
  set.add(key);
  return [...set].sort().slice(-keepDays);
}
