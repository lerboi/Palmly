import { PREVIEW_HISTORY, relativeDate } from '../history';

const NOW = Date.parse('2026-07-14T12:00:00Z');

describe('reading history (P6.T4)', () => {
  it('formats a compact relative date', () => {
    expect(relativeDate('2026-07-14T02:00:00Z', NOW)).toBe('Today');
    expect(relativeDate('2026-07-13T02:00:00Z', NOW)).toBe('Yesterday');
    expect(relativeDate('2026-07-11T02:00:00Z', NOW)).toBe('3 days ago');
    expect(relativeDate('2026-07-04T02:00:00Z', NOW)).toBe('1 week ago');
    expect(relativeDate('2026-05-01T02:00:00Z', NOW)).toContain('May');
  });

  it('returns empty string for an unparseable date', () => {
    expect(relativeDate('not-a-date', NOW)).toBe('');
  });

  it('preview shelf has palm and face readings with geometry', () => {
    expect(PREVIEW_HISTORY.length).toBeGreaterThan(0);
    expect(PREVIEW_HISTORY.some((r) => r.kind === 'palm')).toBe(true);
    expect(PREVIEW_HISTORY.some((r) => r.kind === 'face')).toBe(true);
    for (const r of PREVIEW_HISTORY) expect(Object.keys(r.geometry).length).toBeGreaterThan(0);
  });
});
