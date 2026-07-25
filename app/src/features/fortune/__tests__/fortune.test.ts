import { DIRECTION_BEARING, PREVIEW_FORTUNE, almanacDate, dayPillarCn, homeState } from '../fortune';

describe('fortune (P9.T3)', () => {
  it('computes the sexagenary day pillar (anchor 2000-01-07 = 甲子)', () => {
    expect(dayPillarCn(new Date(2000, 0, 7))).toBe('甲子');
    expect(dayPillarCn(new Date(2000, 0, 8))).toBe('乙丑');
  });

  it('formats an almanac date header (Gregorian + 干支日)', () => {
    // Pin the locale so the format is deterministic in CI; production defaults to the device locale.
    const d = almanacDate(new Date(2026, 6, 14), 'en-US');
    expect(d.gregorian).toBe('July 14');
    expect(d.pillar).toMatch(/日$/);
    expect(d.weekday).toBeTruthy();
  });

  describe("Today's state precedence (Audit-4 SH-1)", () => {
    const f = PREVIEW_FORTUNE;

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

    it('is ready when a returning user has a fortune', () => {
      expect(homeState({ firstRun: false, fortune: f })).toBe('ready');
    });

    it('resolves loading and error to different states — they are not interchangeable', () => {
      expect(homeState({ loading: true, fortune: null })).not.toBe(homeState({ error: true, fortune: null }));
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

  it('preview fortune has the full almanac shape (do/dont/lucky)', () => {
    expect(PREVIEW_FORTUNE.do.length).toBeGreaterThan(0);
    expect(PREVIEW_FORTUNE.dont.length).toBeGreaterThan(0);
    expect(PREVIEW_FORTUNE.lucky_direction).toBeTruthy();
    expect(PREVIEW_FORTUNE.overall.length).toBeGreaterThan(0);
  });
});
