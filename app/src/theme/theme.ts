/**
 * Semantic themes. Components read semantic roles (bg, textPrimary, accent…), never raw
 * palette entries, so dark mode and future re-skins are a single-file change. Roles come from
 * `activeSkin` (see tokens.ts); this file only maps a skin → `Theme` and layers **back-compat
 * aliases** so consumers still on the old names (`background`, `text`, `gold`, `jade`, `seal`)
 * keep compiling while they migrate. Redesign north star: `Planning/UIUX-Redesign.md` §3.
 */
import { activeSkin, spacing, radii, strokes, typography, fonts, type SkinColors } from './tokens';

export type ColorScheme = 'light' | 'dark';

/**
 * The color surface exposed to components: the full role contract (`SkinColors`) plus a small
 * set of **deprecated aliases** kept alive so no consumer breaks in one step. Migrate off the
 * aliases toward the roles they point at:
 *   `background`→`bg`, `text`→`textPrimary`, `gold`→`premium`, `onGold`→`onPremium`,
 *   `jade`→`success`, `seal`→`heritageAccent`.
 */
export interface ThemeColors extends SkinColors {
  /** @deprecated use `bg` */
  background: string;
  /** @deprecated use `textPrimary` */
  text: string;
  /** @deprecated use `premium` */
  gold: string;
  /** @deprecated use `premiumPressed` */
  goldPressed: string;
  /** @deprecated use `onPremium` */
  onGold: string;
  /** @deprecated use `success` */
  jade: string;
  /** @deprecated use `heritageAccent` */
  seal: string;
}

/** Expand a skin's role map with the back-compat aliases. */
function toThemeColors(roles: SkinColors): ThemeColors {
  return {
    ...roles,
    background: roles.bg,
    text: roles.textPrimary,
    gold: roles.premium,
    goldPressed: roles.premiumPressed,
    onGold: roles.onPremium,
    jade: roles.success,
    seal: roles.heritageAccent,
  };
}

const lightColors: ThemeColors = toThemeColors(activeSkin.light);
const darkColors: ThemeColors = toThemeColors(activeSkin.dark);

export interface Theme {
  scheme: ColorScheme;
  colors: ThemeColors;
  spacing: typeof spacing;
  radii: typeof radii;
  strokes: typeof strokes;
  typography: typeof typography;
  fonts: typeof fonts;
}

export const lightTheme: Theme = {
  scheme: 'light',
  colors: lightColors,
  spacing,
  radii,
  strokes,
  typography,
  fonts,
};

export const darkTheme: Theme = {
  scheme: 'dark',
  colors: darkColors,
  spacing,
  radii,
  strokes,
  typography,
  fonts,
};

export const themes: Record<ColorScheme, Theme> = {
  light: lightTheme,
  dark: darkTheme,
};
