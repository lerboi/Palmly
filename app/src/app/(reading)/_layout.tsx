import { Stack } from 'expo-router';
import { useReducedMotion } from '@/theme';

/**
 * Reading stack (audit F1.11, §5.6). The analyzing→reveal hand-off is the product's crowning
 * transition — give it the same authored forward slide onboarding got, not the OS-default jump cut
 * (native only; web keeps its own transition, so device-free screenshots stay settled). Reduce
 * Motion collapses it to an instant cut.
 */
export default function ReadingLayout() {
  const reduceMotion = useReducedMotion();
  return <Stack screenOptions={{ headerShown: false, animation: reduceMotion ? 'none' : 'slide_from_right' }} />;
}
