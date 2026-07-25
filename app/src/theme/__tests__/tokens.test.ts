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
  'trackOff',
  'textPrimary',
  'textSecondary',
  'textTertiary',
  'accent',
  'accentPressed',
  'accentMuted',
  'onAccent',
  'heritageAccent',
  'premium',
  'premiumInk',
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

  /**
   * The AA matrix (Audit-4 CC-9 / Design-Direction §2). Every pairing the UI actually renders,
   * measured in BOTH schemes. Audit-4 found five failing pairings shipped because the old test
   * guarded exactly one (white-on-accent); this table is the guard that makes that impossible.
   * Adding a role means adding its used pairings here.
   */
  const AA_MATRIX: { fg: keyof SkinColors; bg: keyof SkinColors; floor: number; where: string }[] = [
    // ── Text: WCAG AA 4.5:1 (all body/caption sizes the app ships) ──
    { fg: 'onAccent', bg: 'accent', floor: 4.5, where: 'primary button label' },
    { fg: 'accentPressed', bg: 'accentMuted', floor: 4.5, where: 'tonal button label, chips, pills' },
    { fg: 'accentPressed', bg: 'bg', floor: 4.5, where: 'text links on the page' },
    { fg: 'accentPressed', bg: 'surface', floor: 4.5, where: 'text links inside a card' },
    { fg: 'premiumInk', bg: 'surface', floor: 4.5, where: 'premium captions on a card' },
    { fg: 'premiumInk', bg: 'bg', floor: 4.5, where: 'premium captions on the page' },
    { fg: 'premiumInk', bg: 'surfaceSunken', floor: 4.5, where: 'premium caption on a sunken card' },
    { fg: 'onPremium', bg: 'premium', floor: 4.5, where: 'seal caption on the champagne fill' },
    { fg: 'textPrimary', bg: 'surface', floor: 4.5, where: 'body copy' },
    { fg: 'textPrimary', bg: 'bg', floor: 4.5, where: 'body copy on the page' },
    { fg: 'textPrimary', bg: 'surfaceSunken', floor: 4.5, where: 'sunken chip/pill labels' },
    { fg: 'textSecondary', bg: 'bg', floor: 4.5, where: 'metadata on the page (the CC-3 retune risk)' },
    { fg: 'textSecondary', bg: 'surface', floor: 4.5, where: 'metadata in a card' },
    { fg: 'textSecondary', bg: 'surfaceRaised', floor: 4.5, where: 'metadata in a lifted card' },
    { fg: 'success', bg: 'surface', floor: 4.5, where: 'the "unchanged" consistency line' },
    { fg: 'danger', bg: 'surface', floor: 4.5, where: 'destructive copy' },
    // ── Non-text marks + large numerals: 3:1 (WCAG 1.4.11 / large-text) ──
    { fg: 'accent', bg: 'surface', floor: 3, where: 'palm-line highlight, selected borders' },
    { fg: 'accent', bg: 'bg', floor: 3, where: 'accent fills/marks on the page' },
    { fg: 'accent', bg: 'accentMuted', floor: 3, where: 'accent glyph on its own tint' },
    { fg: 'heritageAccent', bg: 'surface', floor: 3, where: 'red-thread motif, corner seal' },
    { fg: 'premiumInk', bg: 'bg', floor: 3, where: 'the ≥24px premium score numeral' },
    // ── UI affordances: Direction §2 sets 1.5:1 for a switch track against its card ──
    { fg: 'trackOff', bg: 'surface', floor: 1.5, where: 'off toggle track' },
    { fg: 'trackOff', bg: 'surfaceRaised', floor: 1.5, where: 'off toggle track on a lifted card' },
    // ── Disabled: exempt from WCAG 1.4.3, but must still be VISIBLE (the old value was 1.30:1) ──
    { fg: 'textTertiary', bg: 'surfaceSunken', floor: 2, where: 'disabled send icon' },
  ];

  /**
   * Pairings that must NEVER be used — each is why a sibling role exists. Asserting they still
   * fail keeps the ban honest: if a future retune makes one pass, the ban (and this row) is stale.
   */
  const BANNED: { fg: keyof SkinColors; bg: keyof SkinColors; instead: string }[] = [
    { fg: 'premium', bg: 'surface', instead: 'premiumInk' },
    { fg: 'premium', bg: 'bg', instead: 'premiumInk' },
    { fg: 'textTertiary', bg: 'bg', instead: 'textSecondary (tertiary is hints/disabled only)' },
  ];

  it.each(['light', 'dark'] as const)('meets the AA matrix in %s (CC-4..CC-9 / Direction §2)', (scheme) => {
    const c = activeSkin[scheme];
    const failures = AA_MATRIX.filter(({ fg, bg, floor }) => contrast(c[fg], c[bg]) < floor).map(
      ({ fg, bg, floor, where }) =>
        `${fg} on ${bg} = ${contrast(c[fg], c[bg]).toFixed(2)}:1 (needs ${floor}) — ${where}`,
    );
    expect(failures).toEqual([]);
    expect(AA_MATRIX.length).toBeGreaterThanOrEqual(10);
  });

  it.each(['light', 'dark'] as const)('keeps the banned pairings banned in %s', (scheme) => {
    const c = activeSkin[scheme];
    for (const { fg, bg, instead } of BANNED) {
      // Light is where these fail; dark's champagne/tertiary are legible, so the ban is a
      // light-scheme guard. Asserting only where the ban bites keeps the message truthful.
      if (scheme === 'light') {
        expect({ pairing: `${fg}/${bg}`, ratio: contrast(c[fg], c[bg]) < 4.5, instead }).toEqual({
          pairing: `${fg}/${bg}`,
          ratio: true,
          instead,
        });
      }
    }
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

  it('gives the share-card serif its own scale entry (Audit-4 CO-11)', () => {
    // This shipped twice as a `fontSize: 24, lineHeight: 30` override ON TOP of editorialHeadline,
    // which meant it also inherited 34px-tuned tracking. Its own entry, its own tracking.
    expect(typography.editorialTitle.fontSize).toBe(24);
    expect(typography.editorialTitle.lineHeight).toBe(30);
    expect(typography.editorialTitle.letterSpacing).toBe(-0.3);
    expect(typography.editorialTitle.fontFamily).toBe(typography.editorialHeadline.fontFamily);
    // The two serif entries are distinct sizes — one is not a restyled version of the other.
    expect(typography.editorialTitle.fontSize).toBeLessThan(typography.editorialHeadline.fontSize);
  });

  it('keeps the accent-eligible type >= 18pt (a11y §1.2)', () => {
    expect(typography.accent.fontSize).toBeGreaterThanOrEqual(18);
  });
});
