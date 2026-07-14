import { PREVIEW_FORTUNE, almanacDate, dayPillarCn } from '../fortune';

describe('fortune (P9.T3)', () => {
  it('computes the sexagenary day pillar (anchor 2000-01-07 = 甲子)', () => {
    expect(dayPillarCn(new Date(2000, 0, 7))).toBe('甲子');
    expect(dayPillarCn(new Date(2000, 0, 8))).toBe('乙丑');
  });

  it('formats an almanac date header (Gregorian + 干支日)', () => {
    const d = almanacDate(new Date(2026, 6, 14));
    expect(d.gregorian).toBe('July 14');
    expect(d.pillar).toMatch(/日$/);
    expect(d.weekday).toBeTruthy();
  });

  it('preview fortune has the full almanac shape (do/dont/lucky)', () => {
    expect(PREVIEW_FORTUNE.do.length).toBeGreaterThan(0);
    expect(PREVIEW_FORTUNE.dont.length).toBeGreaterThan(0);
    expect(PREVIEW_FORTUNE.lucky_direction).toBeTruthy();
    expect(PREVIEW_FORTUNE.overall.length).toBeGreaterThan(0);
  });
});
