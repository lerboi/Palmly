import { PREVIEW_HISTORY, parseMatchedKind, relativeDate, visibleReadings } from '../history';
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
    // CO-5: a PALM row carries its own lines; a FACE row carries none, because a face has no palm
    // geometry — the shelf used to invent one and the two kinds looked identical.
    for (const r of PREVIEW_HISTORY) {
      if (r.kind === 'palm') expect(Object.keys(r.geometry ?? {}).length).toBeGreaterThan(0);
      else expect(r.geometry).toBeUndefined();
    }
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

    it('face reading is enabled (F1.T7) — the default keeps face rows', () => {
      expect(FACE_READING_ENABLED).toBe(true);
      expect(visibleReadings(PREVIEW_HISTORY).some((r) => r.kind === 'face')).toBe(true);
    });
  });
});

/** The shelf's honesty fixes (Audit-4 SH-12, CO-4). */
describe('history shelf honesty', () => {
  it('names the kind that was actually matched, and migrates the old flag (SH-12)', () => {
    expect(parseMatchedKind('face')).toBe('face');
    expect(parseMatchedKind('palm')).toBe('palm');
    expect(parseMatchedKind('1')).toBe('palm'); // pre-SH-12 rows were always palms
    expect(parseMatchedKind('0')).toBeNull();
    expect(parseMatchedKind(null)).toBeNull();
  });

  it('falls back safely on an unparseable date instead of printing NaN', () => {
    expect(relativeDate('not-a-date', Date.parse('2026-07-26T00:00:00Z'))).toBe('');
    expect(relativeDate('', 0)).toBe('');
  });
});
