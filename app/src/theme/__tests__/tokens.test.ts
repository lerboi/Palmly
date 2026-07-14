/// <reference types="jest" />
import { spacing, strokes, typography, inkCinnabarSkin, activeSkin, type SkinColors } from '../tokens';
import { lightTheme, darkTheme, type ThemeColors } from '../theme';

/**
 * Contract test for the role-based token system (redesign north star §3).
 * Pure-logic — guards the semantic role map + skin structure the whole UI references, and the
 * back-compat aliases that keep pre-redesign consumers compiling. Rewritten from the old
 * "Ink & Cinnabar palette hex" pins in R1: colors are now asserted by *role*, not material.
 */

/** The 18 semantic roles every skin must define (redesign §3). */
const ROLE_KEYS: (keyof SkinColors)[] = [
  'bg',
  'surface',
  'surfaceRaised',
  'surfaceSunken',
  'border',
  'textPrimary',
  'textSecondary',
  'textTertiary',
  'accent',
  'accentPressed',
  'accentMuted',
  'onAccent',
  'heritageAccent',
  'premium',
  'premiumPressed',
  'onPremium',
  'success',
  'danger',
  'scrim',
];

const isColor = (v: string) => /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$|^rgba?\(/.test(v);

describe('design tokens — role-based skin contract (redesign §3)', () => {
  it('defines every semantic role for light + dark in the active skin', () => {
    for (const scheme of ['light', 'dark'] as const) {
      for (const role of ROLE_KEYS) {
        const value = activeSkin[scheme][role];
        expect(typeof value).toBe('string');
        expect(isColor(value)).toBe(true);
      }
    }
  });

  it('keeps Ink & Cinnabar as the active skin (R1 changes nothing visually yet)', () => {
    expect(activeSkin).toBe(inkCinnabarSkin);
    expect(activeSkin.name).toBe('Ink & Cinnabar');
    // The heritage accent is still the softened-later cinnabar in skin #1.
    expect(activeSkin.light.accent).toBe('#C3272B');
  });

  it('exposes back-compat aliases mapped onto the new roles', () => {
    const check = (colors: ThemeColors, skin: SkinColors) => {
      expect(colors.background).toBe(skin.bg);
      expect(colors.text).toBe(skin.textPrimary);
      expect(colors.gold).toBe(skin.premium);
      expect(colors.onGold).toBe(skin.onPremium);
      expect(colors.jade).toBe(skin.success);
      expect(colors.seal).toBe(skin.heritageAccent);
    };
    check(lightTheme.colors, activeSkin.light);
    check(darkTheme.colors, activeSkin.dark);
  });

  it('uses a 4px-base spacing scale', () => {
    expect(spacing.xs).toBe(4);
    expect(spacing.sm).toBe(8);
    expect(spacing.lg).toBe(16);
  });

  it('draws diagram lines at the engraved 1.5px woodblock stroke', () => {
    expect(strokes.engraved).toBe(1.5);
  });

  it('keeps the accent-eligible type >= 18pt (a11y §1.2)', () => {
    expect(typography.accent.fontSize).toBeGreaterThanOrEqual(18);
  });
});
