import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAuthBootstrap } from '@/lib/auth';
import { ThemeProvider } from '@/theme';

/**
 * Root layout. Establishes an anonymous-first session on launch (Backend §5.1), then wraps the
 * app in the Palmly design-system ThemeProvider (Noto fonts, light/dark) + SafeAreaProvider.
 */
export default function RootLayout() {
  useAuthBootstrap();
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
