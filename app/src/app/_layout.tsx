import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { identifyUser, initAnalytics, track, withSentry } from '@/lib/analytics';
import { useAuthBootstrap } from '@/lib/auth';
import { ThemeProvider } from '@/theme';
import type { ColorScheme } from '@/theme';

// Initialize crash + analytics as early as possible — before first render — so Sentry captures
// startup errors and PostHog is ready for the day-one `app_opened` event (mvp_spec §5.8).
initAnalytics();

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
          <Stack screenOptions={{ headerShown: false }} />
          <StatusBar style="auto" />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default withSentry(RootLayout);
