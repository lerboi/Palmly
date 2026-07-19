import { Stack } from 'expo-router';
import { useReducedMotion } from '@/theme';

/**
 * Capture stack (audit F1.11, §5.6) — the primer→camera→review steps get the authored forward slide
 * (native only; web keeps its own transition). Reduce Motion collapses it to an instant cut.
 */
export default function CaptureLayout() {
  const reduceMotion = useReducedMotion();
  return <Stack screenOptions={{ headerShown: false, animation: reduceMotion ? 'none' : 'slide_from_right' }} />;
}
