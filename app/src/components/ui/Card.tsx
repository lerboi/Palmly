import { type ReactNode } from 'react';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { useEntrance, usePressSpring, useTheme } from '@/theme';
import type { ShadowKey } from '@/theme';
import { tick } from '@/lib/haptics';

export interface CardProps {
  children: ReactNode;
  /**
   * Hairline border in the theme border color. Default is scheme-aware (Audit-4 CC-3): light
   * always borders (a white card on paper must never be held apart by shadow alone), dark borders
   * only when flat (its surface roles already separate).
   */
  bordered?: boolean;
  /** Padding from the spacing scale. Default `lg` (16). */
  padded?: boolean;
  /**
   * Elevation from the shadow scale (redesign §5). Default `none` = flat. Any lift ≥ `sm`
   * switches the fill to the `surfaceRaised` role so the card also reads lifted on dark, and on
   * dark drops the hairline border by default (there the raised role does the separating).
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
  const lifted = elevation !== 'none';
  // Separation is never shadow-only on light (Audit-4 CC-3 / Design-Direction §2 P2): a white card
  // on paper keeps its hairline at every elevation. On dark the raised surface role does the work,
  // so lifted cards stay borderless there. Explicit `bordered` still wins on both schemes.
  const showBorder = bordered ?? (theme.scheme === 'light' || !lifted);

  const cardStyle: ViewStyle = {
    backgroundColor: lifted ? theme.colors.surfaceRaised : theme.colors.surface,
    borderRadius: theme.radii.md,
    padding: padded ? theme.spacing.lg : 0,
    borderWidth: showBorder ? theme.strokes.hairline : 0,
    borderColor: theme.colors.border,
  };

  // Cards settle in on a SPRING (redesign §4.1 `motion.spring.entrance`, F2.7) rather than a flat
  // duration, so the stagger feels physical. The builder is the app's ONE entrance system
  // (`useEntrance`), shared with the handful of non-card entrances.
  const entering = useEntrance()(entranceIndex);

  // The scale-down press-spring is the shared @/theme hook (redesign §5.6).
  const { scaleStyle, onPressIn, onPressOut } = usePressSpring(0.985);

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
        onPressIn={() => {
          onPressIn();
          tick(); // tactile press feedback (F1.11)
        }}
        onPressOut={onPressOut}
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
