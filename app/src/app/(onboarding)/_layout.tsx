import { Stack } from 'expo-router';
import { useReducedMotion } from '@/theme';

/**
 * Onboarding stack (v2 V10). A gentle forward slide between the onboarding steps (native only —
 * web uses its own transition, so the device-free screenshots capture the settled frame). Reduce
 * Motion collapses it to an instant cut.
 */
export default function OnboardingLayout() {
  const reduceMotion = useReducedMotion();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: reduceMotion ? 'none' : 'slide_from_right',
      }}
    />
  );
}
