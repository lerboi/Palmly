/// <reference types="jest" />
import {
  spacing,
  strokes,
  typography,
  inkCinnabarSkin,
  quietCosmosSkin,
  vermilionSkin,
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

/** The semantic roles every skin must define (redesign §3; + `dangerPressed` from v2 V3). */
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
  'dangerPressed',
  'scrim',
];

const isColor = (v: string) => /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$|^rgba?\(/.test(v);

describe('design tokens — role-based skin contract (redesign §3)', () => {
  it('defines every semantic role for light + dark in all three skins', () => {
    for (const skin of [inkCinnabarSkin, quietCosmosSkin, vermilionSkin]) {
      for (const scheme of ['light', 'dark'] as const) {
        for (const role of ROLE_KEYS) {
          const value = skin[scheme][role];
          expect(typeof value).toBe('string');
          expect(isColor(value)).toBe(true);
        }
      }
    }
  });

  it('makes Vermilion the active skin (redesign v2 default)', () => {
    expect(activeSkin).toBe(vermilionSkin);
    expect(activeSkin.name).toBe('Vermilion');
    // ★ the one tunable that sets the whole feel — modern vermilion, not indigo.
    // Light accent is V22-deepened to #D13B27 (white-on-accent 4.81:1 AA; #D8402C measured 4.48).
    expect(activeSkin.light.accent).toBe('#D13B27');
    expect(activeSkin.dark.accent).toBe('#FF7C63');
    // Heritage red is deepened to a claret, reserved for the red-thread + seal only (§3.2).
    expect(activeSkin.light.heritageAccent).toBe('#9E3B2E');
    expect(activeSkin.dark.heritageAccent).toBe('#E0806F');
    // White-on-accent for button labels (light); dark accent carries a dark on-color (AA).
    expect(activeSkin.light.onAccent).toBe('#FFFFFF');
    expect(activeSkin.dark.onAccent).toBe('#2A0E07');
    // Indigo is fully retired — the old accent hex is gone from the active skin.
    expect(activeSkin.light.accent).not.toBe('#4B57C4');
    expect(activeSkin.dark.accent).not.toBe('#8B95F0');
  });

  it('keeps Ink & Cinnabar + Quiet Cosmos available as skins #1/#2 for parity / rollback', () => {
    expect(inkCinnabarSkin.name).toBe('Ink & Cinnabar');
    expect(inkCinnabarSkin.light.accent).toBe('#C3272B');
    expect(quietCosmosSkin.name).toBe('Quiet Cosmos');
    expect(quietCosmosSkin.light.accent).toBe('#4B57C4');
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
