import { DIRECTION_BEARING, PREVIEW_FORTUNE, almanacDate, dayPillarCn } from '../fortune';

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
