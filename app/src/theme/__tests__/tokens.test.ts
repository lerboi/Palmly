/// <reference types="jest" />
import {
  spacing,
  strokes,
  typography,
  inkCinnabarSkin,
  quietCosmosSkin,
  activeSkin,
  type SkinColors,
} from '../tokens';
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
  it('defines every semantic role for light + dark in both skins', () => {
    for (const skin of [inkCinnabarSkin, quietCosmosSkin]) {
      for (const scheme of ['light', 'dark'] as const) {
        for (const role of ROLE_KEYS) {
          const value = skin[scheme][role];
          expect(typeof value).toBe('string');
          expect(isColor(value)).toBe(true);
        }
      }
    }
  });

  it('makes Quiet Cosmos the active skin (redesign default, R2)', () => {
    expect(activeSkin).toBe(quietCosmosSkin);
    expect(activeSkin.name).toBe('Quiet Cosmos');
    // ★ the one tunable that sets the whole feel — twilight indigo, not cinnabar.
    expect(activeSkin.light.accent).toBe('#4B57C4');
    expect(activeSkin.dark.accent).toBe('#8B95F0');
    // Heritage cinnabar survives only as a softened whisper.
    expect(activeSkin.light.heritageAccent).toBe('#C2554A');
  });

  it('keeps Ink & Cinnabar available as skin #1 for the traditional view', () => {
    expect(inkCinnabarSkin.name).toBe('Ink & Cinnabar');
    expect(inkCinnabarSkin.light.accent).toBe('#C3272B');
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
