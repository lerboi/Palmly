/**
 * Palmly design tokens — "Ink & Cinnabar" (水墨 × 朱砂).
 * Source of truth: Planning/UIUX-specs.md §1.2. Raw values only — semantic light/dark
 * mappings live in theme.ts. Never hard-code a hex in a component; reference these.
 */

// ── Palette (UIUX §1.2 table) ─────────────────────────────────────────
// Raw "Ink & Cinnabar" material hexes. Kept as the source for skin #1 below and referenced
// by the /dev/theme swatch strip. Components never read these directly — they read the
// role-based semantic colors in theme.ts, which map onto a skin.
export const palette = {
  paper: '#F7F2E7', // rice paper — light background
  ink: '#1E1B16', // warm ink black — primary text / dark-mode background
  inkWash: '#5A544A', // secondary text, hairline rules
  cinnabar: '#C3272B', // primary accent: CTAs, seals, red thread, active states
  gold: '#B8912F', // muted imperial gold — premium/locked, score rings (sparingly)
  jade: '#3F7A5E', // success / verified only

  // Derived neutrals (spec-silent; kept minimal — Decision Log 2026-07-11)
  paperCard: '#FCF8EF', // slightly lifted paper for cards on paper
  paperEdge: '#E6DCC6', // hairline / border on light surfaces
  inkCard: '#26221B', // lifted surface on dark-mode ink background
  inkEdge: '#3A342B', // hairline / border on dark surfaces
  inkWashDark: '#A79E8E', // secondary text on dark (lightened ink-wash for AA contrast)
  cinnabarPressed: '#A11F22', // cinnabar active/pressed
  goldPressed: '#9A7826',
  overlayScrim: 'rgba(30,27,22,0.55)', // ink scrim for modals/vignette
} as const;

// ── Skins (role-based) ────────────────────────────────────────────────
/**
 * A **skin** is a full role → hex map for both light and dark. Roles are named by *purpose*
 * (bg, surface, accent…), not by heritage material, so the entire look is one swappable
 * object. `theme.ts` assembles a `Theme` from `activeSkin` and layers back-compat aliases on
 * top. Redesign north star: `Planning/UIUX-Redesign.md` §3.
 *
 * The 18 roles below are the design contract the whole UI references.
 */
export interface SkinColors {
  bg: string; // app background
  surface: string; // cards, sheets (flat)
  surfaceRaised: string; // lifted cards, paywall, streak, sheets (pair with shadow)
  surfaceSunken: string; // insets, chat input, track backgrounds
  border: string; // hairline dividers / outlines
  textPrimary: string; // headlines, body
  textSecondary: string; // secondary / caption
  textTertiary: string; // disabled / hint
  accent: string; // primary CTAs, active states, links, selected
  accentPressed: string; // pressed CTA
  accentMuted: string; // tonal button bg, selected tint
  onAccent: string; // text / icon on accent
  heritageAccent: string; // softened cinnabar — palm-line highlight, red-thread, seal only
  premium: string; // champagne / amber — the rare premium marker
  premiumPressed: string; // pressed premium
  onPremium: string; // text on premium
  success: string; // verified / "unchanged" consistency brag
  danger: string; // destructive confirm
  scrim: string; // modal / backdrop overlay
}

export interface Skin {
  name: string;
  light: SkinColors;
  dark: SkinColors;
}

/**
 * Skin #1 — "Ink & Cinnabar" (the heritage palette). Kept for parity / the optional zh
 * "traditional view". Maps the §1.2 materials onto the role contract so that, while it is the
 * active skin, the app looks pixel-identical to the pre-redesign build. New roles that had no
 * prior equivalent (surfaceRaised, surfaceSunken, textTertiary, accentMuted, danger) are given
 * sensible heritage-toned values; they are unused until later tasks adopt them.
 */
export const inkCinnabarSkin: Skin = {
  name: 'Ink & Cinnabar',
  light: {
    bg: palette.paper,
    surface: palette.paperCard,
    surfaceRaised: palette.paperCard,
    surfaceSunken: '#F0E9D8',
    border: palette.paperEdge,
    textPrimary: palette.ink,
    textSecondary: palette.inkWash,
    textTertiary: '#8A8375',
    accent: palette.cinnabar,
    accentPressed: palette.cinnabarPressed,
    accentMuted: '#F3E0DA',
    onAccent: palette.paper,
    heritageAccent: palette.cinnabar,
    premium: palette.gold,
    premiumPressed: palette.goldPressed,
    onPremium: palette.ink,
    success: palette.jade,
    danger: palette.cinnabar,
    scrim: palette.overlayScrim,
  },
  dark: {
    bg: palette.ink,
    surface: palette.inkCard,
    surfaceRaised: palette.inkCard,
    surfaceSunken: '#1A1712',
    border: palette.inkEdge,
    textPrimary: palette.paper,
    textSecondary: palette.inkWashDark,
    textTertiary: '#6E675A',
    accent: palette.cinnabar,
    accentPressed: palette.cinnabarPressed,
    accentMuted: '#3A241F',
    onAccent: palette.paper,
    heritageAccent: palette.cinnabar,
    premium: palette.gold,
    premiumPressed: palette.goldPressed,
    onPremium: palette.ink,
    success: palette.jade,
    danger: palette.cinnabar,
    scrim: palette.overlayScrim,
  },
};

/**
 * The active skin. **R1 keeps this at Ink & Cinnabar so nothing changes visually yet.**
 * R2 swaps it to the "Quiet Cosmos" skin (a single-line change here).
 */
export const activeSkin: Skin = inkCinnabarSkin;

// ── Spacing — 4px base scale (spec-silent; Decision Log 2026-07-11) ───
export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  huge: 64,
} as const;

// ── Corner radii ──────────────────────────────────────────────────────
export const radii = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 20,
  seal: 6, // the square cinnabar chop
  pill: 999,
} as const;

// ── Stroke widths — engraved / woodblock line style (UIUX §1.2) ───────
export const strokes = {
  hairline: 1,
  engraved: 1.5, // 1.5px @1x woodblock diagram line
  bold: 2.5,
} as const;

// ── Font families (registered names = @expo-google-fonts export keys) ─
export const fonts = {
  displayRegular: 'NotoSerifDisplay_400Regular',
  display: 'NotoSerifDisplay_600SemiBold',
  displayBold: 'NotoSerifDisplay_700Bold',
  body: 'NotoSans_400Regular',
  bodyMedium: 'NotoSans_500Medium',
  bodySemiBold: 'NotoSans_600SemiBold',
  cjk: 'NotoSerifTC_600SemiBold', // decorative section markers 心·智·命·运
  cjkRegular: 'NotoSerifTC_400Regular',
} as const;

/**
 * Type scale. Display/title/numerals use the high-contrast serif (Noto Serif Display);
 * body/labels use Noto Sans; `accent` uses Noto Serif TC for CJK markers.
 * Sizes are spec-silent — chosen as a modest scale (Decision Log 2026-07-11).
 * a11y rule (UIUX §1.2): cinnabar is never used for text under 18pt — enforced in Text.tsx.
 */
export const typography = {
  display: { fontFamily: fonts.display, fontSize: 34, lineHeight: 42 },
  title: { fontFamily: fonts.display, fontSize: 24, lineHeight: 32 },
  heading: { fontFamily: fonts.bodySemiBold, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  bodyMedium: { fontFamily: fonts.bodyMedium, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16 },
  button: { fontFamily: fonts.bodySemiBold, fontSize: 16, lineHeight: 20 },
  accent: { fontFamily: fonts.cjk, fontSize: 22, lineHeight: 30 }, // ≥18pt, ok for cinnabar
  numeral: { fontFamily: fonts.display, fontSize: 30, lineHeight: 34 },
} as const;

export type SpacingKey = keyof typeof spacing;
export type RadiusKey = keyof typeof radii;
export type TypographyVariant = keyof typeof typography;

/** The set of font modules to pass to expo-font's useFonts(). */
export const fontModules = {
  NotoSerifDisplay_400Regular: require('@expo-google-fonts/noto-serif-display/400Regular/NotoSerifDisplay_400Regular.ttf'),
  NotoSerifDisplay_600SemiBold: require('@expo-google-fonts/noto-serif-display/600SemiBold/NotoSerifDisplay_600SemiBold.ttf'),
  NotoSerifDisplay_700Bold: require('@expo-google-fonts/noto-serif-display/700Bold/NotoSerifDisplay_700Bold.ttf'),
  NotoSans_400Regular: require('@expo-google-fonts/noto-sans/400Regular/NotoSans_400Regular.ttf'),
  NotoSans_500Medium: require('@expo-google-fonts/noto-sans/500Medium/NotoSans_500Medium.ttf'),
  NotoSans_600SemiBold: require('@expo-google-fonts/noto-sans/600SemiBold/NotoSans_600SemiBold.ttf'),
  NotoSerifTC_400Regular: require('@expo-google-fonts/noto-serif-tc/400Regular/NotoSerifTC_400Regular.ttf'),
  NotoSerifTC_600SemiBold: require('@expo-google-fonts/noto-serif-tc/600SemiBold/NotoSerifTC_600SemiBold.ttf'),
} as const;
