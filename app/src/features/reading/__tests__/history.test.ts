import { PREVIEW_HISTORY, relativeDate, visibleReadings } from '../history';
import { FACE_READING_ENABLED } from '@/lib/capabilities';

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

  describe('visibleReadings — face door gate (F1.6)', () => {
    it('drops face rows while face reading is disabled, keeping palm rows in order', () => {
      const out = visibleReadings(PREVIEW_HISTORY, false);
      expect(out.every((r) => r.kind === 'palm')).toBe(true);
      expect(out.map((r) => r.id)).toEqual(['r1', 'r3']); // r2 (face) removed, order preserved
    });

    it('returns every kind once face reading is enabled (F1.T7)', () => {
      expect(visibleReadings(PREVIEW_HISTORY, true)).toHaveLength(PREVIEW_HISTORY.length);
    });

    it('is gated by default — the flag ships false until the face reveal path exists', () => {
      expect(FACE_READING_ENABLED).toBe(false);
      expect(visibleReadings(PREVIEW_HISTORY).some((r) => r.kind === 'face')).toBe(false);
    });
  });
});
