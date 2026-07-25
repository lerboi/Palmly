import { useEffect } from 'react';
import { Platform, View, type DimensionValue, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useReducedMotion, useTheme } from '@/theme';

export interface SkeletonProps {
  /** Block width. Default `'100%'`. */
  width?: DimensionValue;
  /** Block height in px. Default 16 (one line of body copy). */
  height?: number;
  /** Corner radius key. Default `sm`; pass `md` for card-shaped blocks. */
  radius?: 'sm' | 'md' | 'pill';
  style?: ViewStyle;
}

/**
 * A loading placeholder block (Design-Direction §3). `surfaceSunken` fill with a slow opacity
 * breath on native; reduce-motion and web render it static, per the standard gate.
 *
 * This exists because Today had no loading state at all: `showFirstRun = firstRun || !fortune`
 * meant every returning user watched "Read my palm" for two network round-trips on every open,
 * and a failed fetch showed it *permanently* — routing a user with a dozen readings back into
 * capture (Audit-4 SH-1). A skeleton says "your fortune is coming"; the first-run hero says
 * "you have never done this", and those must never be the same screen.
 */
export function Skeleton({ width = '100%', height = 16, radius = 'sm', style }: SkeletonProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';
  const breathMs = theme.motion.duration.breath;

  const pulse = useSharedValue(1);
  useEffect(() => {
    if (!shouldAnimate) {
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(withTiming(0.45, { duration: breathMs, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [shouldAnimate, pulse, breathMs]);
  const breathStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  const block: ViewStyle = {
    width,
    height,
    borderRadius: radius === 'pill' ? theme.radii.pill : theme.radii[radius],
    backgroundColor: theme.colors.surfaceSunken,
  };

  // Static end-state on web / reduce-motion — a plain View, so no animation driver is created.
  if (!shouldAnimate) return <View accessibilityRole="progressbar" accessibilityLabel="Loading" style={[block, style]} />;
  return <Animated.View accessibilityRole="progressbar" accessibilityLabel="Loading" style={[block, breathStyle, style]} />;
}
