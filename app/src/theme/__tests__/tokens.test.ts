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

/** WCAG relative luminance of an `#rrggbb` hex. */
function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}

/** WCAG contrast ratio between two opaque `#rrggbb` hexes. */
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

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

  it('separates light cards from the page without a shadow (Audit-4 CC-3 / Direction §2)', () => {
    // The retuned warm rice-paper stack: a white card must be visible on the page by itself,
    // because `shadow.sm` is 6% opacity on iOS and Android elevation 1 (≈ nothing).
    expect(activeSkin.light.bg).toBe('#F4F1EB');
    expect(activeSkin.light.surfaceSunken).toBe('#EAE6DE');
    expect(contrast(activeSkin.light.surface, activeSkin.light.bg)).toBeGreaterThanOrEqual(1.05);
    // …and the sunken role still reads recessed against the deepened page.
    expect(contrast(activeSkin.light.bg, activeSkin.light.surfaceSunken)).toBeGreaterThanOrEqual(1.05);
    // Body copy on the deepened page keeps AA (Direction §2 predicted ≈4.7:1).
    expect(contrast(activeSkin.light.textSecondary, activeSkin.light.bg)).toBeGreaterThanOrEqual(4.5);
    // Dark already separated — it is untouched by this retune.
    expect(activeSkin.dark.bg).toBe('#14151A');
    expect(activeSkin.dark.surfaceSunken).toBe('#191B21');
  });

  it('keeps destructive `danger` visually distinct from the accent (F2.5 / §5.7)', () => {
    // §5.7: light danger #C0392B read as the CTA's twin — cooled to #A93226 so "Delete everything"
    // no longer wears the accent's clothes. The invariant (not the exact hex) is what matters.
    expect(activeSkin.light.danger).toBe('#A93226');
    expect(activeSkin.light.danger).not.toBe(activeSkin.light.accent);
    expect(activeSkin.dark.danger).not.toBe(activeSkin.dark.accent);
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
