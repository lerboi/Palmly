import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, type ReactNode } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { identifyUser, initAnalytics, track, withSentry } from '@/lib/analytics';
import { useAuthBootstrap } from '@/lib/auth';
import { ThemeProvider, primeReduceMotion, useFontsReady } from '@/theme';
import type { ColorScheme } from '@/theme';

// Initialize crash + analytics as early as possible — before first render — so Sentry captures
// startup errors and PostHog is ready for the day-one `app_opened` event (mvp_spec §5.8).
initAnalytics();

// Hold the native splash until fonts + the reduce-motion pref are ready — kills the cold-start font
// flash (audit F1.11 / §3.1) and lets the first paint read the resolved reduce-motion value.
void SplashScreen.preventAutoHideAsync().catch(() => {});
void primeReduceMotion();

/**
 * Device-free screenshot/QA affordance: a **build-time** palette override so the headless-Chrome
 * harness can capture the dark theme (react-native-web reports light-only in a web export, and a
 * client-side scheme flip won't re-commit against the pre-rendered light HTML — only an
 * SSR-consistent value works). Bake it with `EXPO_PUBLIC_FORCE_SCHEME=dark npx expo export`.
 * Undefined in normal builds → the app follows the system scheme as before.
 */
const BUILD_FORCED_SCHEME: ColorScheme | undefined =
  process.env.EXPO_PUBLIC_FORCE_SCHEME === 'dark' || process.env.EXPO_PUBLIC_FORCE_SCHEME === 'light'
    ? (process.env.EXPO_PUBLIC_FORCE_SCHEME as ColorScheme)
    : undefined;

/**
 * Root layout. Establishes an anonymous-first session on launch (Backend §5.1), then wraps the
 * app in the Palmly design-system ThemeProvider (Noto fonts, light/dark) + SafeAreaProvider.
 */
function RootLayout() {
  const { userId } = useAuthBootstrap();

  // Day-one funnel entry point: one event per cold start.
  useEffect(() => {
    track('app_opened', { cold_start: true });
  }, []);

  // Associate analytics + crash reports with the pseudonymous Supabase UUID once it's known.
  useEffect(() => {
    if (userId) identifyUser(userId);
  }, [userId]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider forceScheme={BUILD_FORCED_SCHEME}>
          <SplashGate>
            <Stack screenOptions={{ headerShown: false }} />
            <StatusBar style="auto" />
          </SplashGate>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Reveal the app (hide the native splash) once fonts are loaded AND the reduce-motion pref is primed
 *  — no font flash, no reduce-motion race. Renders children throughout, so the web export/screenshots
 *  are unaffected (SplashScreen.hideAsync is a native-only no-op on web). */
function SplashGate({ children }: { children: ReactNode }) {
  const fontsReady = useFontsReady();
  useEffect(() => {
    if (!fontsReady) return;
    void primeReduceMotion().finally(() => {
      void SplashScreen.hideAsync().catch(() => {});
    });
  }, [fontsReady]);
  return <>{children}</>;
}

export default withSentry(RootLayout);
