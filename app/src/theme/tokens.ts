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
 * Skin #2 — "Quiet Cosmos" (redesign north star §3). Calm & premium: warm-white paper, one
 * quiet twilight-indigo accent, softened cinnabar demoted to a heritage whisper, champagne
 * premium. Dark gets explicit dark-tuned accents (never a reused saturated light hex).
 *
 * ★ The single most defining tunable is `accent` (light `#4B57C4` / dark `#8B95F0`) — change
 * those two hexes and re-run the harness screenshot to re-feel the whole app (§3).
 * Values §3 leaves implicit for a scheme (e.g. dark `onAccent`, `premiumPressed`) are chosen
 * for AA contrast: the dark accent is a light periwinkle, so text on it is near-black.
 */
export const quietCosmosSkin: Skin = {
  name: 'Quiet Cosmos',
  light: {
    bg: '#FAF9F7',
    surface: '#FFFFFF',
    surfaceRaised: '#FFFFFF',
    surfaceSunken: '#F2F0EC',
    border: '#E7E3DC',
    textPrimary: '#1A1A1F',
    textSecondary: '#6B6B72',
    textTertiary: '#9A9AA0',
    accent: '#4B57C4',
    accentPressed: '#3E49AA',
    accentMuted: '#ECEDF9',
    onAccent: '#FFFFFF',
    heritageAccent: '#C2554A',
    premium: '#C79A3C',
    premiumPressed: '#AE842F',
    onPremium: '#1A1A1F',
    success: '#3F7A5E',
    danger: '#C0392B',
    scrim: 'rgba(20,21,26,0.4)',
  },
  dark: {
    bg: '#14151A',
    surface: '#1E2027',
    surfaceRaised: '#24262F',
    surfaceSunken: '#191B21',
    border: '#2E313B',
    textPrimary: '#F4F4F6',
    textSecondary: '#A9A9B2',
    textTertiary: '#6E6E77',
    accent: '#8B95F0',
    accentPressed: '#A3ACF5',
    accentMuted: '#23253A',
    onAccent: '#14151A', // dark text on the light periwinkle accent (AA)
    heritageAccent: '#D98A7E',
    premium: '#D9B25A',
    premiumPressed: '#E4C06E',
    onPremium: '#14151A',
    success: '#5AA981',
    danger: '#E06B5E',
    scrim: 'rgba(0,0,0,0.55)',
  },
};

/**
 * The active skin — **Quiet Cosmos** (redesign default, R2). Swap this one line back to
 * `inkCinnabarSkin` for the optional zh "traditional view" / a future re-skin.
 */
export const activeSkin: Skin = quietCosmosSkin;

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

// ── Corner radii (redesign §5: soft, premium rounded-rects) ───────────
export const radii = {
  none: 0,
  sm: 8,
  md: 12, // ★ default corner for cards + buttons
  lg: 16,
  xl: 20,
  seal: 6, // the small heritage stamp (share-card corner only)
  pill: 999, // now optional, not forced on every button
} as const;

// ── Elevation / shadow scale (redesign §5) ────────────────────────────
// Subtle, premium lift. iOS reads the `shadow*` props; Android reads `elevation`. Pair a
// shadow with the `surfaceRaised` role so cards also lift on dark (where shadows barely show).
export const shadow = {
  none: {},
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 10,
  },
} as const;
export type ShadowKey = keyof typeof shadow;

// ── Stroke widths — engraved / woodblock line style (UIUX §1.2) ───────
export const strokes = {
  hairline: 1,
  engraved: 1.5, // 1.5px @1x woodblock diagram line
  bold: 2.5,
} as const;

// ── Font families (registered names = @expo-google-fonts export keys) ─
// Sans-first (redesign §4): the whole default scale is Noto Sans (weights 100–900 ship, so the
// full ramp needs no new dep). Noto Serif Display is kept ONLY as the optional editorial hero.
// Noto Serif TC (cjk) is retained for the optional zh "traditional view" + the not-yet-de-CJK'd
// PalmDiagram labels (R10) / SealBadge glyph (R7); it is no longer in the default type scale.
export const fonts = {
  body: 'NotoSans_400Regular',
  bodyMedium: 'NotoSans_500Medium',
  bodySemiBold: 'NotoSans_600SemiBold',
  bodyBold: 'NotoSans_700Bold',
  bodyExtraBold: 'NotoSans_800ExtraBold',
  // Optional editorial serif — reveal hero only (§4).
  editorial: 'NotoSerifDisplay_600SemiBold',
  editorialRegular: 'NotoSerifDisplay_400Regular',
  editorialBold: 'NotoSerifDisplay_700Bold',
  // Deprecated serif aliases (kept so existing consumers compile; migrate off these).
  /** @deprecated use `editorial` */
  display: 'NotoSerifDisplay_600SemiBold',
  /** @deprecated use `editorialBold` */
  displayBold: 'NotoSerifDisplay_700Bold',
  /** @deprecated use `editorialRegular` */
  displayRegular: 'NotoSerifDisplay_400Regular',
  // zh "traditional view" / legacy CJK glyphs only (not the default scale).
  cjk: 'NotoSerifTC_600SemiBold',
  cjkRegular: 'NotoSerifTC_400Regular',
} as const;

/**
 * Type scale — sans-first (redesign §4). Everything is Noto Sans; the display/title carry
 * negative tracking for a premium, quiet feel. `editorialHeadline` is the ONE optional serif
 * variant (reveal hero). `numeral` moved off the serif to Noto Sans 700.
 * a11y: the new indigo accent passes AA at all sizes on both bg/surface, so the old
 * "accent ≥18pt only" rule is retired (see Text.tsx).
 */
export const typography = {
  display: { fontFamily: fonts.bodyExtraBold, fontSize: 34, lineHeight: 40, letterSpacing: -0.5 },
  title: { fontFamily: fonts.bodyBold, fontSize: 26, lineHeight: 32, letterSpacing: -0.3 },
  heading: { fontFamily: fonts.bodyBold, fontSize: 18, lineHeight: 24 },
  bodyLarge: { fontFamily: fonts.body, fontSize: 17, lineHeight: 26 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  bodyMedium: { fontFamily: fonts.bodyMedium, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 18 },
  button: { fontFamily: fonts.bodySemiBold, fontSize: 16, lineHeight: 20 },
  accent: { fontFamily: fonts.bodyBold, fontSize: 22, lineHeight: 30 },
  numeral: { fontFamily: fonts.bodyBold, fontSize: 30, lineHeight: 34 },
  editorialHeadline: { fontFamily: fonts.editorial, fontSize: 34, lineHeight: 42, letterSpacing: -0.5 },
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
  NotoSans_700Bold: require('@expo-google-fonts/noto-sans/700Bold/NotoSans_700Bold.ttf'),
  NotoSans_800ExtraBold: require('@expo-google-fonts/noto-sans/800ExtraBold/NotoSans_800ExtraBold.ttf'),
  NotoSerifTC_400Regular: require('@expo-google-fonts/noto-serif-tc/400Regular/NotoSerifTC_400Regular.ttf'),
  NotoSerifTC_600SemiBold: require('@expo-google-fonts/noto-serif-tc/600SemiBold/NotoSerifTC_600SemiBold.ttf'),
} as const;
