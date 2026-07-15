// The ONE shared server palette — the single source of truth for BOTH server-rendered surfaces
// (the share-card SVG `card-svg.ts` + the invite HTML `invite-page.ts`). The Deno edge runtime
// can't import the React-Native app theme module, so these hexes are a manual mirror of the app's
// active skin — but now there is ONE copy consumed by both surfaces, instead of two copies that
// drift (the collision V21 fixes). Mirrors `app/src/theme/tokens.ts` → `vermilionSkin` (redesign
// v2 §3, "Vermilion & Motion"). Role-named to match the app tokens; the three-reds discipline
// (§3.2) lives in the role comments: `accent` = the everywhere-vermilion; `heritage` = the deep
// claret reserved for the red-thread motif + corner seal ONLY (destructive crimson isn't needed on
// these surfaces). A future re-skin is a one-file edit here.

export interface ServerPalette {
  bg: string; // warm-white paper field (role: bg)
  surface: string; // raised card / sheet (role: surface / surfaceRaised)
  surfaceSunken: string; // insets, tracks (role: surfaceSunken)
  border: string; // hairline (role: border)
  ink: string; // role: textPrimary
  inkWash: string; // role: textSecondary
  inkFaint: string; // role: textTertiary
  accent: string; // ★ vermilion — CTAs, active, signature palm lines (role: accent, §3.2)
  accentPressed: string; // pressed CTA (role: accentPressed)
  accentMuted: string; // tonal chip bg, step badges (role: accentMuted)
  onAccent: string; // text/icon on accent (role: onAccent)
  heritage: string; // deep claret — red-thread motif + corner seal ONLY (role: heritageAccent, §3.2)
  premium: string; // champagne premium marker (role: premium)
  success: string; // verified / privacy assurance (role: success)
}

/** Vermilion — light. The share card always renders light (a posted image on warm paper); this is
 * also the invite page's default (light) theme. */
export const LIGHT: ServerPalette = {
  bg: '#FAF9F7',
  surface: '#FFFFFF',
  surfaceSunken: '#F2F0EC',
  border: '#E7E3DC',
  ink: '#1A1A1F',
  inkWash: '#6B6B72',
  inkFaint: '#9A9AA0',
  accent: '#D8402C',
  accentPressed: '#B9331F',
  accentMuted: '#FBE7E2',
  onAccent: '#FFFFFF',
  heritage: '#9E3B2E',
  premium: '#C79A3C',
  success: '#3F7A5E',
};

/** Vermilion — dark. Drives the invite page's `@media (prefers-color-scheme: dark)`. A lighter
 * coral accent with a dark `onAccent`, mirroring the app's dark strategy (§3). */
export const DARK: ServerPalette = {
  bg: '#14151A',
  surface: '#1E2027',
  surfaceSunken: '#191B21',
  border: '#2E313B',
  ink: '#F4F4F6',
  inkWash: '#A9A9B2',
  inkFaint: '#6E6E77',
  accent: '#FF7C63',
  accentPressed: '#FF9482',
  accentMuted: '#37201A',
  onAccent: '#2A0E07',
  heritage: '#E0806F',
  premium: '#D9B25A',
  success: '#5AA981',
};

/** `#RRGGBB` + alpha → `rgba(r,g,b,a)` — for soft shadows tinted from a role hex (e.g. the CTA
 * shadow tinted from `accent`, replacing the old hard-coded indigo-tinted shadow). */
export function withAlpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
