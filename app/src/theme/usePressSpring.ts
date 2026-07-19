import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { motion } from './tokens';
import { useReducedMotion } from './useReducedMotion';

/**
 * The shared tap press-spring (redesign v2 §5.6) — the SINGLE implementation of the scale-down-on-
 * press feedback that ~10 components used to copy-paste. Native-only + reduce-motion/web gated (the
 * scale rests at 1, so the web export/screenshots capture the static end-state). `pressedScale` is
 * how far the control shrinks while held (Button 0.97, Card 0.985, a header icon 0.9, …).
 *
 * Returns the animated `scaleStyle` (spread onto the outer `Animated.View`) plus `onPressIn` /
 * `onPressOut` to wire to the `Pressable`. A call site that also fires haptics or forwards its own
 * press props just composes them:
 *   const { scaleStyle, onPressIn, onPressOut } = usePressSpring(0.97);
 *   <Pressable onPressIn={(e) => { onPressIn(); tick(); props.onPressIn?.(e); }} … />
 */
export function usePressSpring(pressedScale = 0.97) {
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';
  const [held, setHeld] = useState(false);
  const scale = useSharedValue(1);
  const press = motion.spring.press;
  useEffect(() => {
    if (!shouldAnimate) {
      scale.value = 1;
      return;
    }
    scale.value = withSpring(held ? pressedScale : 1, press);
  }, [held, shouldAnimate, scale, press, pressedScale]);
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return {
    scaleStyle,
    onPressIn: () => setHeld(true),
    onPressOut: () => setHeld(false),
  };
}
