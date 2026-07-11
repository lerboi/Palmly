import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { useFonts } from 'expo-font';
import { fontModules } from './tokens';
import { themes, type ColorScheme, type Theme } from './theme';

interface ThemeContextValue {
  theme: Theme;
  /** True once the Noto font family has loaded (or errored — we render either way). */
  fontsReady: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
  /** Force a scheme (used by /dev/theme to render light + dark side by side). */
  forceScheme?: ColorScheme;
}

export function ThemeProvider({ children, forceScheme }: ThemeProviderProps) {
  const systemScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts(fontModules);

  const value = useMemo<ThemeContextValue>(() => {
    const scheme: ColorScheme = forceScheme ?? (systemScheme === 'dark' ? 'dark' : 'light');
    return { theme: themes[scheme], fontsReady: fontsLoaded || fontError != null };
  }, [forceScheme, systemScheme, fontsLoaded, fontError]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a <ThemeProvider>');
  }
  return ctx.theme;
}

export function useFontsReady(): boolean {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useFontsReady must be used within a <ThemeProvider>');
  }
  return ctx.fontsReady;
}
