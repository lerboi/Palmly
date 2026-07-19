import { useEffect, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type PressableProps,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { controlHeight, usePressSpring, useReducedMotion, useTheme } from '@/theme';
import { tick } from '@/lib/haptics';
import { Text } from './Text';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'tonal' | 'danger' | 'premium';
type ButtonSize = 'md' | 'lg';
type ButtonShape = 'rounded' | 'pill';

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Corner style. `rounded` (radii.md, the new default) or `pill` (fully round). */
  shape?: ButtonShape;
  disabled?: boolean;
  /** Show the brand loader + block interaction (width is reserved, so it never reflows). */
  loading?: boolean;
  fullWidth?: boolean;
  /** Optional leading element (e.g. an `<Icon/>`). Hidden while `loading`. */
  icon?: ReactNode;
  style?: ViewStyle;
}

/**
 * Themed button (redesign §5, v2 V3). `primary` is the solid vermilion CTA; `tonal` a soft
 * accent-tinted fill; `secondary` outlined; `ghost` text-only; `danger` the destructive-confirm
 * crimson (three-reds §3.2); `premium` the champagne upsell. Disabled + pressed use explicit
 * tokens (never opacity). A native press springs the whole control to ~0.97 and back
 * (`motion.spring.press`), gated by reduce-motion + web → static. `loading` swaps the label for a
 * small brand loader while keeping the label's width reserved.
 */
export function Button({
  label,
  variant = 'primary',
  size = 'lg',
  shape = 'rounded',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  style,
  onPressIn,
  onPressOut,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const { colors } = theme;
  const height = size === 'lg' ? controlHeight.lg : controlHeight.md;
  const paddingHorizontal = size === 'lg' ? theme.spacing.xl : theme.spacing.lg;
  const isBlocked = disabled || loading;
  const isSolid =
    variant === 'primary' || variant === 'tonal' || variant === 'danger' || variant === 'premium';

  // ── Press-spring (native only; reduce-motion / web → resting scale 1) ──
  // The scale-down press-spring is the shared @/theme hook (redesign §5.6); the handlers below just
  // compose it with the haptic tick + any forwarded press props.
  const { scaleStyle, onPressIn: springIn, onPressOut: springOut } = usePressSpring(0.97);
  const pressIn = (e: GestureResponderEvent) => {
    springIn();
    tick(); // tactile press feedback (F1.11) — native-only, kept on under reduce-motion
    onPressIn?.(e);
  };
  const pressOut = (e: GestureResponderEvent) => {
    springOut();
    onPressOut?.(e);
  };

  // Label color, resolved per press state. A pressed `tonal` fill becomes the solid accent, so its
  // label flips to `onAccent`; the solid fills carry their on-color; outlined/ghost keep the accent.
  const labelColor = (pressed: boolean): string => {
    if (disabled) return colors.textTertiary;
    if (variant === 'primary' || variant === 'danger') return colors.onAccent;
    if (variant === 'premium') return colors.onPremium;
    if (variant === 'tonal') return pressed ? colors.onAccent : colors.accent;
    return colors.accent;
  };

  const loaderColor =
    variant === 'primary' || variant === 'danger'
      ? colors.onAccent
      : variant === 'premium'
        ? colors.onPremium
        : colors.accent;

  return (
    <Animated.View style={[{ alignSelf: fullWidth ? 'stretch' : 'flex-start' }, scaleStyle, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isBlocked, busy: loading }}
        disabled={isBlocked}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={({ pressed }) => {
          const base: ViewStyle = {
            // Dynamic Type (audit §6): a MINIMUM height (not fixed) so a wrapped/scaled label grows
            // the control instead of clipping; small text still gets the full 44/52pt tap target.
            minHeight: height,
            paddingVertical: theme.spacing.sm,
            paddingHorizontal,
            borderRadius: shape === 'pill' ? theme.radii.pill : theme.radii.md,
            alignSelf: 'stretch',
            alignItems: 'center',
            justifyContent: 'center',
          };

          // Disabled: explicit tokens, never opacity.
          if (disabled) {
            return [
              base,
              {
                backgroundColor: isSolid ? colors.surfaceSunken : 'transparent',
                borderWidth: variant === 'secondary' ? theme.strokes.hairline : 0,
                borderColor: colors.border,
              },
            ];
          }
          if (variant === 'primary') {
            return [base, { backgroundColor: pressed ? colors.accentPressed : colors.accent }];
          }
          if (variant === 'tonal') {
            return [base, { backgroundColor: pressed ? colors.accentPressed : colors.accentMuted }];
          }
          if (variant === 'danger') {
            return [base, { backgroundColor: pressed ? colors.dangerPressed : colors.danger }];
          }
          if (variant === 'premium') {
            return [base, { backgroundColor: pressed ? colors.premiumPressed : colors.premium }];
          }
          if (variant === 'secondary') {
            return [
              base,
              {
                backgroundColor: pressed ? colors.surfaceSunken : 'transparent',
                borderWidth: theme.strokes.hairline,
                borderColor: colors.accent,
              },
            ];
          }
          // ghost
          return [base, { backgroundColor: pressed ? colors.surfaceSunken : 'transparent' }];
        }}
        {...rest}
      >
        {({ pressed }) => (
          <>
            {/* Label stays mounted (invisible while loading) so its width is reserved — the
                loader overlays it and toggling `loading` never reflows the button. */}
            <View style={[styles.row, { gap: theme.spacing.sm, opacity: loading ? 0 : 1 }]}>
              {icon}
              <Text variant="button" color={labelColor(pressed)}>
                {label}
              </Text>
            </View>
            {loading ? (
              <View style={styles.loaderOverlay} pointerEvents="none">
                <BrandLoader color={loaderColor} />
              </View>
            ) : null}
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

/**
 * The brand loader — three palm-dots that breathe in sequence (native; reduce-motion / web →
 * static). Replaces the stock `ActivityIndicator` so a working button still feels like Palmly.
 */
function BrandLoader({ color }: { color: string }) {
  return (
    <View style={styles.loaderRow} accessibilityLabel="Loading">
      {[0, 1, 2].map((i) => (
        <LoaderDot key={i} index={i} color={color} />
      ))}
    </View>
  );
}

function LoaderDot({ index, color }: { index: number; color: string }) {
  const reduceMotion = useReducedMotion();
  const animate = !reduceMotion && Platform.OS !== 'web';
  const opacity = useSharedValue(0.35);
  useEffect(() => {
    if (animate) {
      opacity.value = withDelay(
        index * 160,
        withRepeat(withTiming(1, { duration: 420, easing: Easing.inOut(Easing.ease) }), -1, true),
      );
    } else {
      // Static end-state (web / reduce-motion): a settled staggered fade.
      opacity.value = [1, 0.7, 0.4][index] ?? 0.5;
    }
  }, [animate, index, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.loaderDot, { backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  loaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  loaderDot: { width: 7, height: 7, borderRadius: 3.5 },
});
