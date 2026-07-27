import { currentRun, longestRun, mergeSealed, milestoneReached, sealLineText, STREAK_MILESTONES } from '../streak';

/**
 * RF2.T1 — the ledger's pure half (`features/pulse/streak.ts`). The streak the user SEES offline is computed here, and the one
 * rule that matters is the same one `openHistory` established (Audit-4 SH-9): never claim a run the
 * user did not have.
 *
 * The network half (`recordDay` / `loadLedger` / `migrateLocalOpens`) is proven against the real
 * database in `supabase/tests/pulse_schema.test.mjs`, where the RPC actually exists.
 */

describe('currentRun', () => {
  const TODAY = '2026-07-26';

  it('counts a run that reaches today', () => {
    expect(currentRun(['2026-07-24', '2026-07-25', '2026-07-26'], TODAY)).toBe(3);
  });

  it('keeps a run alive that reaches yesterday — a streak breaks on a MISSED day, not at midnight', () => {
    expect(currentRun(['2026-07-24', '2026-07-25'], TODAY)).toBe(2);
  });

  it('reports 0 for a run that stopped before yesterday, rather than a stale number', () => {
    expect(currentRun(['2026-07-01', '2026-07-02', '2026-07-03'], TODAY)).toBe(0);
  });

  it('stops at the first gap', () => {
    expect(currentRun(['2026-07-20', '2026-07-21', '2026-07-24', '2026-07-25', '2026-07-26'], TODAY)).toBe(3);
  });

  it('handles month and year boundaries', () => {
    expect(currentRun(['2026-06-29', '2026-06-30', '2026-07-01'], '2026-07-01')).toBe(3);
    expect(currentRun(['2025-12-31', '2026-01-01'], '2026-01-01')).toBe(2);
  });

  it('is 0 on an empty history — an empty week claims nothing', () => {
    expect(currentRun([], TODAY)).toBe(0);
  });

  it('ignores duplicates rather than counting them twice', () => {
    expect(currentRun(['2026-07-26', '2026-07-26', '2026-07-25'], TODAY)).toBe(2);
  });
});

describe('longestRun', () => {
  it('finds the best run anywhere in the history', () => {
    expect(longestRun(['2026-07-01', '2026-07-02', '2026-07-03', '2026-07-10', '2026-07-11'])).toBe(3);
  });

  it('is 0 for no history and 1 for a single day', () => {
    expect(longestRun([])).toBe(0);
    expect(longestRun(['2026-07-26'])).toBe(1);
  });

  it('does not care what order the dates arrive in', () => {
    expect(longestRun(['2026-07-03', '2026-07-01', '2026-07-02'])).toBe(3);
  });
});

describe('mergeSealed', () => {
  it('adds today, sorted and unique', () => {
    expect(mergeSealed(['2026-07-25'], '2026-07-26')).toEqual(['2026-07-25', '2026-07-26']);
    expect(mergeSealed(['2026-07-26'], '2026-07-26')).toEqual(['2026-07-26']);
    expect(mergeSealed(['2026-07-26'], '2026-07-24')).toEqual(['2026-07-24', '2026-07-26']);
  });

  it('caps the cache so a long-lived install cannot grow without bound', () => {
    const many = Array.from({ length: 500 }, (_, i) => `2025-01-${String((i % 28) + 1).padStart(2, '0')}-${i}`);
    expect(mergeSealed(many, '2026-07-26').length).toBeLessThanOrEqual(400);
  });
});


describe('milestoneReached', () => {
  it('fires on the exact day a run reaches a milestone', () => {
    for (const m of STREAK_MILESTONES) expect(milestoneReached(m, [])).toBe(m);
  });

  it('does not fire on an ordinary day', () => {
    for (const n of [1, 2, 4, 5, 6, 8, 13, 15, 29, 31, 100]) expect(milestoneReached(n, [])).toBeNull();
  });

  it('does not hand a returning user a milestone they walked past', () => {
    // Day 9 of a run is not the day-7 moment. Celebrating it late reads as the app losing track.
    expect(milestoneReached(9, [])).toBeNull();
  });

  it('fires at most once per run', () => {
    expect(milestoneReached(7, [3])).toBe(7);
    expect(milestoneReached(7, [3, 7])).toBeNull();
  });

  it('lets a rebuilt run earn a milestone again — getting back to day 7 is worth marking', () => {
    // The caller clears the celebrated set when a run breaks; this proves the function cooperates.
    expect(milestoneReached(7, [])).toBe(7);
  });
});

describe('sealLineText — the measured claim, and the honesty rule under it (RF6.T3)', () => {
  it('makes the full claim only when a real camera seal happened in this run', () => {
    expect(sealLineText(12, true)).toBe('Day 12 · your lines hold');
    expect(sealLineText(47, true)).toBe('Day 47 · your lines hold');
  });

  it('NEVER says the lines held for a reader who has only ever tapped', () => {
    // A tap seals the day just as truly, but it measures nothing about the hand. Claiming a
    // measurement that did not happen is the pseudo-measurement 05 §5 bans — and it is the exact
    // failure mode `06` §2.5 shows sinking scan-based apps in their own reviews.
    expect(sealLineText(12, false)).toBe('Day 12');
    expect(sealLineText(47, false)).toBe('Day 47');
    for (const n of [2, 5, 30, 365]) expect(sealLineText(n, false)).not.toMatch(/lines hold/);
  });

  it('drops the number on day one, like the ritual’s own success copy', () => {
    expect(sealLineText(1, true)).toBe('Your lines hold');
  });

  it('claims nothing without a run — no run, no claim (SH-9)', () => {
    expect(sealLineText(1, false)).toBeNull();
    expect(sealLineText(0, false)).toBeNull();
    expect(sealLineText(0, true)).toBeNull();
  });

  it('replaces the streak line rather than joining it — one line, never two', () => {
    // The old copy was "{n}-day streak". If it ever comes back beside this one, Today carries two
    // competing claims about the same run.
    for (const palmHeld of [true, false]) {
      for (const n of [0, 1, 2, 9, 100]) {
        const line = sealLineText(n, palmHeld);
        if (line) expect(line).not.toMatch(/-day streak/);
      }
    }
  });
});
