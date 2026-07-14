import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * The single source for the OS "Reduce Motion" preference (redesign v2 §4.2). Encapsulates the
 * initial `AccessibilityInfo.isReduceMotionEnabled()` read + the live `reduceMotionChanged`
 * subscription so no component re-implements the boilerplate (this is the ONLY place
 * `isReduceMotionEnabled` is called — grep invariant §7.4).
 *
 * Pair it with the standard gate at the call site — reanimated is native-only and web must render
 * the static end-state, which is what keeps the device-free screenshot verification honest:
 *   `const shouldAnimate = !reduceMotion && Platform.OS !== 'web';`
 * When `shouldAnimate` is false, set the shared value straight to its end-state (no offset).
 */
export function useReducedMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => active && setReduceMotion(v));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      active = false;
      sub.remove();
    };
  }, []);
  return reduceMotion;
}
