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
  dangerPressed: string; // pressed destructive button (darker light / lighter dark, like accent)
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
    dangerPressed: palette.cinnabarPressed,
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
    dangerPressed: '#D14A4D', // lighter cinnabar for pressed on dark
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
    dangerPressed: '#A32E20',
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
    dangerPressed: '#E88579',
    scrim: 'rgba(0,0,0,0.55)',
  },
};

/**
 * Skin #3 — "Vermilion" (redesign v2 north star §3, "Vermilion & Motion"). Keeps the Quiet
 * Cosmos calm base (warm-white paper, soft neutrals, champagne premium, jade success) but
 * swaps the accent from twilight indigo to a **modern vermilion red** — the single confident
 * brand accent that runs through every button, active/selected state, link, and the highlighted
 * palm line. Indigo is fully retired. Heritage red is deepened to a **claret** reserved for the
 * red-thread motif + corner seal ONLY (§3.2 three-reds discipline); danger is a cooler crimson
 * kept distinct so destructive confirms never read as the warm accent.
 *
 * ★ The single most defining tunable is `accent` (light `#D13B27` / dark `#FF7C63`) — change
 * those two hexes and re-run the harness screenshot to re-feel the whole app (§3). The light
 * accent is tuned so white-on-accent meets WCAG AA (4.81:1) for button labels — V22 deepened it a
 * hair from `#D8402C` (which measured 4.48:1, just under AA); the dark accent is a lighter
 * vermilion-coral with a **dark** `onAccent` (dark-on-coral, 7.14:1) so labels stay legible.
 */
export const vermilionSkin: Skin = {
  name: 'Vermilion',
  light: {
    bg: '#FAF9F7',
    surface: '#FFFFFF',
    surfaceRaised: '#FFFFFF',
    surfaceSunken: '#F2F0EC',
    border: '#E7E3DC',
    textPrimary: '#1A1A1F',
    textSecondary: '#6B6B72',
    textTertiary: '#9A9AA0',
    accent: '#D13B27', // ★ modern vermilion — white-on 4.81:1 AA (V22-deepened a hair from #D8402C=4.48)
    accentPressed: '#B9331F',
    accentMuted: '#FBE7E2',
    onAccent: '#FFFFFF',
    heritageAccent: '#9E3B2E', // deep claret — red-thread motif + corner seal ONLY (§3.2)
    premium: '#C79A3C',
    premiumPressed: '#AE842F',
    onPremium: '#1A1A1F',
    success: '#3F7A5E',
    danger: '#A93226', // destructive confirm ONLY — deeper/cooler crimson, distinct from the accent (§3.2, F2.5)
    dangerPressed: '#8E2A20', // darker crimson for pressed
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
    accent: '#FF7C63', // ★ light vermilion-coral so text on it stays legible
    accentPressed: '#FF9482',
    accentMuted: '#37201A',
    onAccent: '#2A0E07', // dark text on the light coral accent (AA)
    heritageAccent: '#E0806F', // light claret for thread/seal on dark
    premium: '#D9B25A',
    premiumPressed: '#E4C06E',
    onPremium: '#14151A',
    success: '#5AA981',
    danger: '#E9584E', // nudged cooler/crimson so it reads distinct from the warm accent on dark
    dangerPressed: '#F0776E', // lighter crimson for pressed on dark
    scrim: 'rgba(0,0,0,0.55)',
  },
};

/**
 * The active skin — **Vermilion** (redesign v2 default). Ink & Cinnabar (#1) and Quiet Cosmos
 * (#2) stay above for parity / one-line rollback. Swap this line to re-skin the whole app.
 */
export const activeSkin: Skin = vermilionSkin;

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

// ── Control heights — buttons / inputs / tap targets (≥44 a11y floor) ─
// Tokenizes the button height magic numbers (was `44`/`52` inline). `lg` is the primary CTA
// height; `md` the compact size. Both clear the 44px minimum touch target.
export const controlHeight = { md: 44, lg: 52 } as const;

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

// ── Motion — the animation foundation (redesign v2 §4.1) ──────────────
/**
 * Shared motion contract: durations, easing curves, springs, and per-index stagger. Consumed via
 * `theme.motion` so every surface animates with the same physics instead of ad-hoc magic numbers.
 * Reduce-motion / web render the STATIC end-state — see `useReducedMotion` + the standard gate
 * `shouldAnimate = !reduceMotion && Platform.OS !== 'web'` (§4.2).
 *
 * `easing` holds **cubic-bezier control points** (pure data, so this module stays reanimated-free
 * and the token contract test needs no worklet runtime). Build a reanimated curve at the call
 * site: `Easing.bezier(...theme.motion.easing.standard)`. `spring` configs pass straight into
 * `withSpring(to, theme.motion.spring.press)`.
 */
export const motion = {
  duration: { instant: 0, fast: 120, base: 220, slow: 360, draw: 1200 },
  easing: {
    standard: [0.2, 0, 0, 1], // general in/out — most transitions
    decelerate: [0, 0, 0.2, 1], // entrances — fast start, gentle land
  },
  spring: {
    press: { damping: 18, stiffness: 320, mass: 0.6 }, // taps: snappy scale
    entrance: { damping: 20, stiffness: 180, mass: 1 }, // cards / screens: settle in
  },
  stagger: { list: 60, reveal: 90 }, // per-index delay (ms)
} as const;

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

/**
 * The set of font modules to pass to expo-font's useFonts() by DEFAULT — sans-first (redesign §4).
 * Noto Serif TC (`fonts.cjk`) is NOT bundled here: the redesigned UI is English-first and never
 * renders CJK by default; the only consumer is `PalmDiagram` under its opt-in `traditional` prop.
 * Load {@link zhFontModules} on demand when the optional zh "traditional view" is enabled.
 */
export const fontModules = {
  NotoSerifDisplay_400Regular: require('@expo-google-fonts/noto-serif-display/400Regular/NotoSerifDisplay_400Regular.ttf'),
  NotoSerifDisplay_600SemiBold: require('@expo-google-fonts/noto-serif-display/600SemiBold/NotoSerifDisplay_600SemiBold.ttf'),
  NotoSerifDisplay_700Bold: require('@expo-google-fonts/noto-serif-display/700Bold/NotoSerifDisplay_700Bold.ttf'),
  NotoSans_400Regular: require('@expo-google-fonts/noto-sans/400Regular/NotoSans_400Regular.ttf'),
  NotoSans_500Medium: require('@expo-google-fonts/noto-sans/500Medium/NotoSans_500Medium.ttf'),
  NotoSans_600SemiBold: require('@expo-google-fonts/noto-sans/600SemiBold/NotoSans_600SemiBold.ttf'),
  NotoSans_700Bold: require('@expo-google-fonts/noto-sans/700Bold/NotoSans_700Bold.ttf'),
  NotoSans_800ExtraBold: require('@expo-google-fonts/noto-sans/800ExtraBold/NotoSans_800ExtraBold.ttf'),
} as const;

/** CJK fonts for the optional zh "traditional view" — load on demand, not in the default bundle. */
export const zhFontModules = {
  NotoSerifTC_400Regular: require('@expo-google-fonts/noto-serif-tc/400Regular/NotoSerifTC_400Regular.ttf'),
  NotoSerifTC_600SemiBold: require('@expo-google-fonts/noto-serif-tc/600SemiBold/NotoSerifTC_600SemiBold.ttf'),
} as const;
