import { PREVIEW_READING, SECTION_GLYPH, SECTION_LINE, freeSections, lockedSections, traditionFootnote } from '../reveal';

describe('reveal reading model (P6.T3)', () => {
  it('maps major sections to their palm line (non-line sections → whole diagram)', () => {
    expect(SECTION_LINE.heart).toBe('heart_line');
    expect(SECTION_LINE.head).toBe('head_line');
    expect(SECTION_LINE.fate).toBe('fate_line');
    expect(SECTION_LINE.hand_shape).toBeUndefined();
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
