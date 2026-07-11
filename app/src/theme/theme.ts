/**
 * Semantic themes. Components read semantic roles (background, text, accent…), never raw
 * palette entries, so dark mode and future re-skins are a single-file change.
 * Dark mode per UIUX §1.2: ink background / paper text; cinnabar + gold unchanged.
 */
import { palette, spacing, radii, strokes, typography, fonts } from './tokens';

export type ColorScheme = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  surface: string; // cards, sheets
  text: string; // primary — always high-contrast (never cinnabar under 18pt)
  textSecondary: string;
  accent: string; // cinnabar
  accentPressed: string;
  onAccent: string; // text/icon on a cinnabar fill
  gold: string;
  goldPressed: string;
  onGold: string;
  jade: string; // success / verified
  border: string; // hairlines
  scrim: string; // modal / vignette overlay
  seal: string; // the cinnabar chop
}

const lightColors: ThemeColors = {
  background: palette.paper,
  surface: palette.paperCard,
  text: palette.ink,
  textSecondary: palette.inkWash,
  accent: palette.cinnabar,
  accentPressed: palette.cinnabarPressed,
  onAccent: palette.paper,
  gold: palette.gold,
  goldPressed: palette.goldPressed,
  onGold: palette.ink,
  jade: palette.jade,
  border: palette.paperEdge,
  scrim: palette.overlayScrim,
  seal: palette.cinnabar,
};

const darkColors: ThemeColors = {
  background: palette.ink,
  surface: palette.inkCard,
  text: palette.paper,
  textSecondary: palette.inkWashDark,
  accent: palette.cinnabar,
  accentPressed: palette.cinnabarPressed,
  onAccent: palette.paper,
  gold: palette.gold,
  goldPressed: palette.goldPressed,
  onGold: palette.ink,
  jade: palette.jade,
  border: palette.inkEdge,
  scrim: palette.overlayScrim,
  seal: palette.cinnabar,
};

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
