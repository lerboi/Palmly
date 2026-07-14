import { useEffect, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useReducedMotion, useTheme } from '@/theme';
import type { ShadowKey } from '@/theme';

export interface CardProps {
  children: ReactNode;
  /** Hairline border in the theme border color. Default true. */
  bordered?: boolean;
  /** Padding from the spacing scale. Default `lg` (16). */
  padded?: boolean;
  /**
   * Elevation from the shadow scale (redesign §5). Default `none` = flat. Any lift ≥ `sm`
   * switches the fill to the `surfaceRaised` role so the card also reads lifted on dark, and
   * drops the hairline border by default (the shadow does the separating).
   */
  elevation?: ShadowKey;
  /** Make the card a button: press feedback (spring scale + pressed tint) + a11y role. */
  onPress?: () => void;
  accessibilityLabel?: string;
  /** Pressed-fill role when pressable — `sunken` (default) or `accent` (accentMuted tint). */
  pressedTint?: 'sunken' | 'accent';
  /** Index into a staggered list entrance (FadeInDown, per-index delay). Omit = no entrance. */
  entranceIndex?: number;
  style?: ViewStyle;
}

/**
 * Surface container — a rounded panel for reading section cards, sheets, list rows (redesign §5,
 * v2 V4). Flat by default (a hairline rule); pass `elevation` to lift it. Pass `onPress` to make
 * it a button with one shared press affordance (native spring scale gated by reduce-motion + web,
 * plus a pressed tint that always applies). Pass `entranceIndex` for a staggered `FadeInDown`
 * entrance (native only; reduce-motion / web render the static end-state).
 */
export function Card({
  children,
  bordered,
  padded = true,
  elevation = 'none',
  onPress,
  accessibilityLabel,
  pressedTint = 'sunken',
  entranceIndex,
  style,
}: CardProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';
  const lifted = elevation !== 'none';
  // Elevated cards don't need a border; flat cards default to bordered.
  const showBorder = bordered ?? !lifted;

  const cardStyle: ViewStyle = {
    backgroundColor: lifted ? theme.colors.surfaceRaised : theme.colors.surface,
    borderRadius: theme.radii.md,
    padding: padded ? theme.spacing.lg : 0,
    borderWidth: showBorder ? theme.strokes.hairline : 0,
    borderColor: theme.colors.border,
  };

  const entering =
    shouldAnimate && entranceIndex !== undefined
      ? FadeInDown.delay(entranceIndex * theme.motion.stagger.list).duration(theme.motion.duration.base)
      : undefined;

  // Press-spring — held flag flips in the handler; the shared-value write lives in the effect
  // (effect-scoped mutation keeps the React-Compiler lint happy).
  const [held, setHeld] = useState(false);
  const scale = useSharedValue(1);
  const press = theme.motion.spring.press;
  useEffect(() => {
    if (!shouldAnimate) {
      scale.value = 1;
      return;
    }
    scale.value = withSpring(held ? 0.985 : 1, press);
  }, [held, shouldAnimate, scale, press]);
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (!onPress) {
    return (
      <Animated.View entering={entering} style={[cardStyle, theme.shadow[elevation], style]}>
        {children}
      </Animated.View>
    );
  }

  const tint = pressedTint === 'accent' ? theme.colors.accentMuted : theme.colors.surfaceSunken;
  return (
    <Animated.View entering={entering} style={[styles.pressWrap, scaleStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => setHeld(true)}
        onPressOut={() => setHeld(false)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [
          cardStyle,
          theme.shadow[elevation],
          style,
          pressed ? { backgroundColor: tint } : null,
        ]}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pressWrap: { alignSelf: 'stretch' },
});
