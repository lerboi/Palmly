import { askPrefill, DIRECTION_BEARING, almanacDate, dayPillarCn, homeState, luckyBasis, luckyColumns, shouldAskBirthDate, type Fortune } from '../fortune';

describe('fortune (P9.T3)', () => {
  it('computes the sexagenary day pillar (anchor 2000-01-07 = 甲子)', () => {
    expect(dayPillarCn(new Date(2000, 0, 7))).toBe('甲子');
    expect(dayPillarCn(new Date(2000, 0, 8))).toBe('乙丑');
  });

  it('formats an almanac date header (Gregorian + 干支日)', () => {
    // Pin the locale so the format is deterministic in CI; production defaults to the device locale.
    const d = almanacDate(new Date(2026, 6, 14), 'en-US');
    expect(d.gregorian).toBe('July 14');
    expect(d.weekday).toBeTruthy();
  });

  describe("Today's state precedence (Audit-4 SH-1)", () => {
    const f: Fortune = {
      overall: 'A steady day.',
      career: 'c', love: 'l', wealth: 'w',
      dos: ['a'], donts: ['b'],
      lucky_direction: 'Southeast', lucky_color: 'Jade green', lucky_hours: '9-11am',
    };

    it('never shows the first-run hero while the request is in flight', () => {
      // THE bug: `firstRun || !fortune` meant every returning user watched "Read my palm" for two
      // network round-trips, every single open.
      expect(homeState({ loading: true, fortune: null })).toBe('loading');
      expect(homeState({ loading: true, fortune: null, firstRun: false })).toBe('loading');
      // Loading wins even over a genuinely-new user: the skeleton is the honest frame either way.
      expect(homeState({ loading: true, firstRun: true, fortune: null })).toBe('loading');
    });

    it('never shows the first-run hero when the request failed', () => {
      // The worse half: a failed fetch showed "Read my palm" FOREVER, routing a user with a dozen
      // readings back into capture.
      expect(homeState({ error: true, fortune: null })).toBe('error');
      expect(homeState({ error: true, fortune: null, firstRun: false })).toBe('error');
    });

    it('shows the first-run hero only for a user who genuinely has no reading', () => {
      expect(homeState({ firstRun: true, fortune: null })).toBe('firstRun');
      expect(homeState({ firstRun: true, fortune: f })).toBe('firstRun');
    });

    it('surfaces a missing fortune row as the retry card, never as first-run', () => {
      expect(homeState({ firstRun: false, fortune: null })).toBe('error');
      expect(homeState({ fortune: null })).toBe('error');
    });

    it('never renders the locked/unlocked branch while entitlement is pending (SH-2)', () => {
      // Entitlements default to `premium: false` while the subscriptions read is in flight, so
      // rendering `ready` early flashed the LOCKED fortune card at paying users on every open.
      // The skeleton must cover that window.
      expect(homeState({ entitlementLoading: true, fortune: f, firstRun: false })).toBe('loading');
      // …and it outranks even a resolved fortune with a known returning user.
      expect(homeState({ entitlementLoading: true, fortune: f })).not.toBe('ready');
      // Once entitlement resolves, the branch may render.
      expect(homeState({ entitlementLoading: false, fortune: f, firstRun: false })).toBe('ready');
    });

    it('is ready when a returning user has a fortune', () => {
      expect(homeState({ firstRun: false, fortune: f })).toBe('ready');
    });

    it('resolves loading and error to different states — they are not interchangeable', () => {
      expect(homeState({ loading: true, fortune: null })).not.toBe(homeState({ error: true, fortune: null }));
    });
  });

  describe('the chat-bridge prefill (Audit-4 CO-14)', () => {
    it('asks about the real direction when there is one', () => {
      expect(askPrefill({ lucky_direction: 'Southeast' })).toBe('Why is Southeast my lucky direction today?');
    });

    it('never emits the doubled space the unguarded template produced', () => {
      // `Why is ${''} my lucky direction today?` rendered "Why is  my lucky direction today?"
      for (const dir of ['', '   ']) {
        const q = askPrefill({ lucky_direction: dir });
        expect(q).not.toMatch(/ {2}/);
        expect(q).not.toContain('Why is  ');
      }
    });

    it('falls back to a real question, not a broken sentence', () => {
      const q = askPrefill({ lucky_direction: '' });
      expect(q).toBe('What should I focus on today?');
      expect(q.endsWith('?')).toBe(true);
    });

    it('trims a padded direction rather than embedding the padding', () => {
      expect(askPrefill({ lucky_direction: '  North  ' })).toBe('Why is North my lucky direction today?');
    });
  });

  describe('the Lucky row grid (Audit-4 CO-6)', () => {
    it('collapses to 2+1 below 360pt, where three columns stop being readable', () => {
      expect(luckyColumns(320)).toBe(2); // the device the audit measured the overflow on
      expect(luckyColumns(359)).toBe(2);
    });

    it('uses thirds once there is room', () => {
      expect(luckyColumns(360)).toBe(3);
      expect(luckyColumns(390)).toBe(3);
      expect(luckyColumns(430)).toBe(3);
    });

    it('leaves gap room in the basis, so three cells never sum to 100%', () => {
      // The original bug was cells that could only GROW (minWidth, no basis). A basis of exactly
      // 33% + gaps would overflow again, so thirds are 28%.
      expect(Number(luckyBasis(390).replace('%', '')) * 3).toBeLessThan(100);
      expect(Number(luckyBasis(320).replace('%', '')) * 2).toBeLessThan(100);
    });
  });

  describe('the birth-date ask (Audit-4 SH-4)', () => {
    it('never blocks the first fortune — it waits until one is on screen', () => {
      // THE bug: a full-screen form appeared BEFORE any value, on a brand-new user's first open.
      expect(shouldAskBirthDate({ fortuneReady: false, birthDate: null, skipped: false })).toBe(false);
      expect(shouldAskBirthDate({ fortuneReady: true, birthDate: null, skipped: false })).toBe(true);
    });

    it('never re-asks once the user has skipped', () => {
      // "Skip" persisted nothing, so the sheet re-nagged on EVERY open, forever.
      expect(shouldAskBirthDate({ fortuneReady: true, birthDate: null, skipped: true })).toBe(false);
    });

    it('does not ask while the skip flag is still resolving', () => {
      // `undefined` means "not yet known" — asking during a load is the same rudeness as too early.
      expect(shouldAskBirthDate({ fortuneReady: true, birthDate: null, skipped: undefined })).toBe(false);
    });

    it('does not ask when a birth date is already stored', () => {
      expect(shouldAskBirthDate({ fortuneReady: true, birthDate: '1994-03-02', skipped: false })).toBe(false);
    });
  });

  it('maps all eight compass points to a clockwise bearing, and nothing else (CO-8)', () => {
    // The icon is drawn pointing North, so the bearing IS the rotation applied to it.
    expect(DIRECTION_BEARING.North).toBe(0);
    expect(DIRECTION_BEARING.East).toBe(90);
    expect(DIRECTION_BEARING.South).toBe(180);
    expect(DIRECTION_BEARING.West).toBe(270);
    expect(Object.keys(DIRECTION_BEARING)).toHaveLength(8);
    // Each point is 45° from the last, walking clockwise from North.
    const clockwise = ['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest'];
    expect(clockwise.map((k) => DIRECTION_BEARING[k])).toEqual([0, 45, 90, 135, 180, 225, 270, 315]);
  });

  it('returns undefined for an unmapped direction, so the call site renders no icon (CO-8)', () => {
    // The old glyph map returned '' here and the template literal rendered a LEADING SPACE before
    // the label. `undefined` is what lets the compass be omitted entirely instead.
    expect(DIRECTION_BEARING['Upward']).toBeUndefined();
    expect(DIRECTION_BEARING['']).toBeUndefined();
  });

});
