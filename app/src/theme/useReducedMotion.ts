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
// Module-level cache so the pref is read ONCE and shared. Priming it at launch (before the tree
// paints) lets every component read the resolved value SYNCHRONOUSLY on mount — closing the
// reduce-motion race (audit F1.11 / §3.1: a flash of motion before the async read lands) without
// holding first paint. `isReduceMotionEnabled` is still called from only this module (grep §7.4).
let cached: boolean | undefined;
let priming: Promise<boolean> | undefined;

/** Resolve + cache the OS Reduce Motion pref once. Call at launch (before React mounts) so the first
 *  render already has the real value. Idempotent; safe to call repeatedly. */
export function primeReduceMotion(): Promise<boolean> {
  if (!priming) {
    priming = AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      cached = v;
      return v;
    });
  }
  return priming;
}

/** Live listener: keep the module cache + this hook's state in sync on an OS pref change. Named (not
 *  an inline effect closure) so the lint doesn't read it as a synchronous in-effect setState. */
function onChange(setReduceMotion: (v: boolean) => void, v: boolean): void {
  cached = v;
  setReduceMotion(v);
}

export function useReducedMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(cached ?? false);
  useEffect(() => {
    let active = true;
    // Reconcile via the primed promise (already resolved once primed) — always async, so the effect
    // never sets state synchronously; a no-op when the initial read already matched the cache.
    void primeReduceMotion().then((v) => active && setReduceMotion(v));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => onChange(setReduceMotion, v));
    return () => {
      active = false;
      sub.remove();
    };
  }, []);
  return reduceMotion;
}
