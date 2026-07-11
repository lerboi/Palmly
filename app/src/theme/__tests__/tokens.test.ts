/// <reference types="jest" />
import { palette, spacing, strokes, typography } from '../tokens';

/**
 * Smoke test for the "Ink & Cinnabar" design tokens (UIUX-specs.md §1.2).
 * Pure-logic — guards the palette/scale contract the whole UI references, and gives CI a
 * real unit-test target (P1.T5). Component-render tests arrive with the reveal UI (P6).
 */
describe('design tokens — Ink & Cinnabar (UIUX §1.2)', () => {
  it('pins the core palette hexes from the spec table', () => {
    expect(palette.paper).toBe('#F7F2E7');
    expect(palette.ink).toBe('#1E1B16');
    expect(palette.cinnabar).toBe('#C3272B');
    expect(palette.gold).toBe('#B8912F');
    expect(palette.jade).toBe('#3F7A5E');
  });

  it('uses a 4px-base spacing scale', () => {
    expect(spacing.xs).toBe(4);
    expect(spacing.sm).toBe(8);
    expect(spacing.lg).toBe(16);
  });

  it('draws diagram lines at the engraved 1.5px woodblock stroke', () => {
    expect(strokes.engraved).toBe(1.5);
  });

  it('keeps the cinnabar-eligible accent type >= 18pt (a11y §1.2)', () => {
    expect(typography.accent.fontSize).toBeGreaterThanOrEqual(18);
  });
});
