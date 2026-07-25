import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { useReducedMotion } from '@/theme';

/**
 * Reading stack (audit F1.11, §5.6). A pushed step earns the authored forward slide onboarding got,
 * rather than the OS-default jump cut.
 *
 * **`reveal` and `pair` fade instead (Audit-4 SN-10).** Analyzing hands off with `router.replace`,
 * so there is no back-path to imply — a slide-from-right promises one and lies. A fade-through
 * reads as "the same journey continuing", which is what actually happens.
 *
 * The gate is now the app's standard one (`!reduceMotion && Platform.OS !== 'web'`): this layout
 * checked reduce-motion only, so the web export animated where every other surface stays settled.
 */
export default function ReadingLayout() {
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';

  return (
    <Stack screenOptions={{ headerShown: false, animation: shouldAnimate ? 'slide_from_right' : 'none' }}>
      <Stack.Screen name="reveal" options={{ animation: shouldAnimate ? 'fade' : 'none' }} />
      <Stack.Screen name="pair" options={{ animation: shouldAnimate ? 'fade' : 'none' }} />
    </Stack>
  );
}
