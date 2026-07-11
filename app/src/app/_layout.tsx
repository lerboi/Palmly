import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from '@/theme';

/**
 * Root layout. Wraps the app in the Palmly design-system ThemeProvider (loads Noto fonts,
 * provides light/dark theme) + SafeAreaProvider. The real route groups —
 * (onboarding)/(capture)/(reading)/(home)/(settings) + modals — are added in P1.T3.
 */
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <Stack screenOptions={{ headerShown: false }} />
          <StatusBar style="auto" />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
