/// <reference types="jest" />
import { localDateKey, recordOpen, streakRun, weekCells } from '../openHistory';

/**
 * The week rhythm behind Today (Audit-4 SH-9). Pure date logic, so the run computation is testable
 * without a clock or storage — which matters, because the old streak was never exercised at all:
 * the prop was never passed, analytics hardcoded 0, and the strip clamped at 7.
 */
const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12, 0, 0);

describe('local date keys', () => {
  it('uses the LOCAL day, not UTC', () => {
    // 23:30 local on the 25th is the 25th, even where toISOString() would already say the 26th.
    expect(localDateKey(new Date(2026, 6, 25, 23, 30))).toBe('2026-07-25');
    expect(localDateKey(new Date(2026, 6, 1, 0, 15))).toBe('2026-07-01');
  });
});

describe('the local-vs-UTC day boundary (Audit-4 SH-14)', () => {
  /**
   * The defect: the fortune row was fetched with `new Date().toISOString().slice(0,10)` — a UTC
   * day — while the header rendered the LOCAL weekday/date/pillar. For much of the day in UTC±8..12
   * those disagree, so the user read one date above another day's fortune. Both now use
   * `localDateKey`, so these assertions are what keeps them paired.
   *
   * `Date` here is constructed from local components, so the test states the local wall clock the
   * user sees, whatever timezone the suite runs in — the invariant is "the key matches the wall
   * clock", not a hardcoded offset.
   */
  it('UTC+10 morning: an early local hour still reads as TODAY, not yesterday', () => {
    // 08:00 local on the 25th. In UTC+10 that is 22:00 UTC on the 24th — the old code said the 24th.
    const local = new Date(2026, 6, 25, 8, 0);
    expect(localDateKey(local)).toBe('2026-07-25');
    expect(localDateKey(local)).toBe(
      `${local.getFullYear()}-${`${local.getMonth() + 1}`.padStart(2, '0')}-${`${local.getDate()}`.padStart(2, '0')}`,
    );
  });

  it('UTC-8 evening: a late local hour still reads as TODAY, not tomorrow', () => {
    // 22:00 local on the 25th. In UTC-8 that is 06:00 UTC on the 26th — the old code said the 26th.
    const local = new Date(2026, 6, 25, 22, 0);
    expect(localDateKey(local)).toBe('2026-07-25');
  });

  it('never rolls at either end of the local day', () => {
    expect(localDateKey(new Date(2026, 6, 25, 0, 0, 0))).toBe('2026-07-25');
    expect(localDateKey(new Date(2026, 6, 25, 23, 59, 59))).toBe('2026-07-25');
  });

  it('rolls exactly at local midnight, not at UTC midnight', () => {
    expect(localDateKey(new Date(2026, 6, 25, 23, 59, 59))).toBe('2026-07-25');
    expect(localDateKey(new Date(2026, 6, 26, 0, 0, 0))).toBe('2026-07-26');
  });
});

describe('streakRun', () => {
  it('is 0 with no history at all', () => {
    expect(streakRun(at(2026, 7, 25), [])).toBe(0);
  });

  it('is 1 on the very first day', () => {
    expect(streakRun(at(2026, 7, 25), ['2026-07-25'])).toBe(1);
  });

  it('counts a 3-day run ending today', () => {
    expect(streakRun(at(2026, 7, 25), ['2026-07-23', '2026-07-24', '2026-07-25'])).toBe(3);
  });

  it('counts an 8-day run WITHOUT clamping at 7', () => {
    // The old strip did `Math.min(streak, 7)`, so a month-long habit looked like a week.
    const days = ['18', '19', '20', '21', '22', '23', '24', '25'].map((d) => `2026-07-${d}`);
    expect(streakRun(at(2026, 7, 25), days)).toBe(8);
  });

  it('walks across a month boundary', () => {
    const days = ['2026-06-29', '2026-06-30', '2026-07-01'];
    expect(streakRun(at(2026, 7, 1), days)).toBe(3);
  });

  it('walks across a year boundary', () => {
    expect(streakRun(at(2027, 1, 1), ['2026-12-31', '2027-01-01'])).toBe(2);
  });

  it('survives a not-yet-opened today by anchoring on yesterday', () => {
    // Opening tomorrow morning should still show the run — it is not broken until a day is missed.
    expect(streakRun(at(2026, 7, 25), ['2026-07-23', '2026-07-24'])).toBe(2);
  });

  it('is 0 once a day is actually missed', () => {
    // Last opened three days ago: the run is over, and Today must not print a stale streak.
    expect(streakRun(at(2026, 7, 25), ['2026-07-20', '2026-07-21', '2026-07-22'])).toBe(0);
  });

  it('ignores a gap earlier in the history', () => {
    const days = ['2026-07-01', '2026-07-02', '2026-07-24', '2026-07-25'];
    expect(streakRun(at(2026, 7, 25), days)).toBe(2);
  });
});

describe('weekCells', () => {
  it('returns seven trailing days ending today', () => {
    const cells = weekCells(at(2026, 7, 25), []);
    expect(cells).toHaveLength(7);
    expect(cells[0].key).toBe('2026-07-19');
    expect(cells[6].key).toBe('2026-07-25');
    expect(cells[6].isToday).toBe(true);
    expect(cells.filter((c) => c.isToday)).toHaveLength(1);
  });

  it('marks only the days actually opened', () => {
    const cells = weekCells(at(2026, 7, 25), ['2026-07-21', '2026-07-25']);
    expect(cells.filter((c) => c.opened).map((c) => c.key)).toEqual(['2026-07-21', '2026-07-25']);
  });

  it('spans a month boundary without gaps', () => {
    const cells = weekCells(at(2026, 7, 2), []);
    expect(cells.map((c) => c.key)).toEqual([
      '2026-06-26', '2026-06-27', '2026-06-28', '2026-06-29', '2026-06-30', '2026-07-01', '2026-07-02',
    ]);
  });
});

describe('recordOpen', () => {
  it('adds today once and keeps the list sorted', () => {
    expect(recordOpen(at(2026, 7, 25), ['2026-07-24'])).toEqual(['2026-07-24', '2026-07-25']);
    expect(recordOpen(at(2026, 7, 25), ['2026-07-25'])).toEqual(['2026-07-25']);
  });

  it('trims to the keep window, dropping the oldest', () => {
    const many = Array.from({ length: 5 }, (_, i) => `2026-01-0${i + 1}`);
    expect(recordOpen(at(2026, 7, 25), many, 3)).toEqual(['2026-01-04', '2026-01-05', '2026-07-25']);
  });
});
