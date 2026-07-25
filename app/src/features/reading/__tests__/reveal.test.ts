import {
  FACE_SECTION_ICON,
  PREVIEW_GEOMETRY,
  PREVIEW_READING,
  SECTION_GLYPH,
  SECTION_ICON,
  SECTION_LINE,
  deletedLabel,
  freeSections,
  initialRevealLoad,
  loadedRevealLoad,
  lockedSections,
  traditionFootnote,
} from '../reveal';
import { CANONICAL_DELETION_BADGE, CANONICAL_PHOTO_KEPT } from '@/lib/trustCopy';

describe('reveal reading model (P6.T3)', () => {
  it('maps major sections to their palm line (non-line sections → a feature icon)', () => {
    expect(SECTION_LINE.heart).toBe('heart_line');
    expect(SECTION_LINE.head).toBe('head_line');
    expect(SECTION_LINE.fate).toBe('fate_line');
    expect(SECTION_LINE.hand_shape).toBeUndefined();
    expect(SECTION_ICON.hand_shape).toBe('palm');
  });

  // Audit-4 CO-5: every thumb must be its own picture. A section with neither a line nor an icon
  // falls back to an unhighlighted palm — which is exactly how three sections became identical.
  it('gives every non-line palm section a DISTINCT icon, and every face section too', () => {
    const palmIcons = Object.values(SECTION_ICON);
    expect(new Set(palmIcons).size).toBe(palmIcons.length);
    for (const key of ['hand_shape', 'mounts', 'markings']) {
      expect(SECTION_LINE[key]).toBeUndefined();
      expect(SECTION_ICON[key]).toBeTruthy();
    }
    const faceIcons = Object.values(FACE_SECTION_ICON);
    expect(faceIcons.length).toBe(8); // all eight server face keys, not two
    expect(new Set(faceIcons).size).toBe(faceIcons.length);
  });

  it('splits free (depth 1) from locked (depth ≥ 2), covering every section', () => {
    const free = freeSections(PREVIEW_READING);
    const locked = lockedSections(PREVIEW_READING);
    expect(free.every((s) => s.depth_level <= 1)).toBe(true);
    expect(locked.every((s) => s.depth_level >= 2)).toBe(true);
    expect(free.length + locked.length).toBe(PREVIEW_READING.sections.length);
    expect(free.length).toBeGreaterThan(0);
    expect(locked.length).toBeGreaterThan(0);
  });

  it('has a CJK marker for every preview section', () => {
    for (const s of PREVIEW_READING.sections) expect(SECTION_GLYPH[s.key]).toBeTruthy();
  });

  it('derives a tradition footnote from the grounding tag', () => {
    expect(traditionFootnote({ key: 'heart', title: '', body: '', depth_level: 1, tags: ['heart_line.depth.deep'] })).toContain('heart line');
  });
});

const NOW = new Date('2026-07-25T15:00:00Z');

/**
 * The privacy badge's copy (Audit-4 SH-8). This badge is the most screenshot-able promise in the
 * app, so each case pins a claim the app must be able to back: it may say "deleted" only with a
 * real timestamp, it must say "saved" for the keep opt-in, and its time must be in the reader's own
 * convention rather than a hand-rolled American clock.
 */
describe('deletedLabel (Audit-4 SH-8)', () => {
  it('promises rather than claims when there is no deletion timestamp', () => {
    expect(deletedLabel(undefined, { now: NOW })).toBe(CANONICAL_DELETION_BADGE);
    expect(deletedLabel(null, { now: NOW })).toBe(CANONICAL_DELETION_BADGE);
    expect(deletedLabel(undefined, { now: NOW })).not.toMatch(/deleted/i);
  });

  it('says "saved" for the keep-my-scan opt-in, even with a timestamp present', () => {
    expect(deletedLabel('2026-07-25T14:00:00Z', { kept: true, now: NOW })).toBe(CANONICAL_PHOTO_KEPT);
    expect(deletedLabel(null, { kept: true, now: NOW })).toBe(CANONICAL_PHOTO_KEPT);
  });

  it('shows a time only when the deletion happened today', () => {
    const today = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), 9, 5).toISOString();
    const label = deletedLabel(today, { now: NOW, locale: 'en-US' });
    expect(label).toContain('Photo deleted · ');
    expect(label).toMatch(/9:05/);
    expect(label).not.toMatch(/Jul/); // today needs no date
  });

  it('carries the DATE when the deletion was not today (an old reading claimed "4:15 PM")', () => {
    const older = new Date(2026, 6, 4, 16, 15).toISOString();
    const label = deletedLabel(older, { now: NOW, locale: 'en-US' });
    expect(label).toMatch(/Jul/);
    expect(label).toMatch(/4:15/);
  });

  it('formats the time per LOCALE — no hand-rolled AM/PM', () => {
    const today = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), 16, 15).toISOString();
    const us = deletedLabel(today, { now: NOW, locale: 'en-US' });
    const gb = deletedLabel(today, { now: NOW, locale: 'en-GB' });
    expect(us).not.toBe(gb);
    expect(gb).toMatch(/16:15/); // a 24-hour locale gets a 24-hour clock
    expect(gb).not.toMatch(/PM/);
  });

  it('falls back to an untimed claim on an unparseable timestamp', () => {
    expect(deletedLabel('not-a-date', { now: NOW })).toBe('Photo deleted');
  });
});

/**
 * The reveal's per-reading state (Audit-4 SH-16). Opening reading B used to draw reading A's palm,
 * because the reset block listed five of the six state fields and left `geometry` behind. One
 * object means the reset cannot forget a field.
 */
describe('reveal load state (Audit-4 SH-16)', () => {
  const loaded = loadedRevealLoad({
    id: 'reading-b',
    kind: 'face',
    reading: PREVIEW_READING,
    geometry: { heart_line: [[0, 0], [500, 500]] },
    photoDeletedAt: '2026-07-25T14:00:00Z',
    photoKept: true,
  });

  it('starts pending, with the decorative geometry and nothing from any reading', () => {
    const init = initialRevealLoad();
    expect(init.state).toBe('pending');
    expect(init.geometry).toBe(PREVIEW_GEOMETRY);
    expect(init.reading).toBeUndefined();
    expect(init.loadedId).toBeUndefined();
    expect(init.photoDeletedAt).toBeNull();
    expect(init.photoKept).toBe(false);
  });

  it('resets EVERY field a previous reading could have written — geometry included', () => {
    const init = initialRevealLoad();
    for (const key of Object.keys(loaded) as (keyof typeof loaded)[]) {
      // Each field must actually change on load, or this test could not detect a missed reset.
      expect(loaded[key]).not.toEqual(init[key]);
    }
    expect(initialRevealLoad()).toEqual(init);
    expect(initialRevealLoad().geometry).toBe(PREVIEW_GEOMETRY);
  });

  it('keeps the loaded reading intact on the ready state', () => {
    expect(loaded.state).toBe('ready');
    expect(loaded.loadedId).toBe('reading-b');
    expect(loaded.kind).toBe('face');
    expect(loaded.reading).toBe(PREVIEW_READING);
  });
});
