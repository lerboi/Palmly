import { Platform } from 'react-native';
import { FadeInDown } from 'react-native-reanimated';
import { useTheme } from './ThemeProvider';
import { useReducedMotion } from './useReducedMotion';

/**
 * **The** entrance animation — one system, app-wide (redesign §4.1, Audit-4 CO-10 /
 * Design-Direction §3). Content settles in on `motion.spring.entrance` with a per-index
 * `motion.stagger.list` delay, so a staggered list feels physical rather than timed.
 *
 * Returns a builder: call it with the item's index (0 = the hero, which always animates first)
 * and spread the result onto an `Animated.View`'s `entering`. `undefined` index — or reduce-motion
 * / web — yields `undefined`, i.e. the settled end-state, per the standard gate.
 *
 * `Card` consumes this via `entranceIndex`; reach for the hook directly only for the handful of
 * entrances that aren't cards (a hero headline, a bare row). There is deliberately no second
 * entrance system: the reveal used to run its own `FadeInDown` duration stagger in parallel with
 * this one, and the two never agreed on timing.
 */
export function useEntrance(): (index?: number) => ReturnType<typeof FadeInDown.delay> | undefined {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';

  return (index?: number) =>
    shouldAnimate && index !== undefined
      ? FadeInDown.delay(index * theme.motion.stagger.list)
          .springify()
          .damping(theme.motion.spring.entrance.damping)
          .stiffness(theme.motion.spring.entrance.stiffness)
          .mass(theme.motion.spring.entrance.mass)
      : undefined;
}
