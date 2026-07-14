import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/theme';
import { Text } from './Text';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'tonal';
type ButtonSize = 'md' | 'lg';
type ButtonShape = 'rounded' | 'pill';

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Corner style. `rounded` (radii.md, the new default) or `pill` (fully round). */
  shape?: ButtonShape;
  disabled?: boolean;
  /** Show a spinner + block interaction. */
  loading?: boolean;
  fullWidth?: boolean;
  /** Optional leading element (e.g. an `<Icon/>`). Hidden while `loading`. */
  icon?: ReactNode;
  style?: ViewStyle;
}

/**
 * Themed button (redesign §5). `primary` is the solid indigo CTA; `tonal` is a soft
 * accent-tinted fill; `secondary` is outlined; `ghost` is text-only. Disabled + pressed use
 * explicit tokens (not opacity), and the default corner is a rounded-rect (`pill` optional).
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
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const { colors } = theme;
  const height = size === 'lg' ? 52 : 44;
  const paddingHorizontal = size === 'lg' ? theme.spacing.xl : theme.spacing.lg;
  const isBlocked = disabled || loading;

  // Label color, resolved per press state. A pressed `tonal` fill becomes the solid accent, so
  // its label flips to `onAccent` for contrast; `primary` is always onAccent; the rest sit on a
  // transparent/sunken fill and keep the accent color.
  const labelColor = (pressed: boolean): string => {
    if (disabled) return colors.textTertiary;
    if (variant === 'primary') return colors.onAccent;
    if (variant === 'tonal') return pressed ? colors.onAccent : colors.accent;
    return colors.accent;
  };

  const spinnerColor = variant === 'primary' ? colors.onAccent : colors.accent;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isBlocked, busy: loading }}
      disabled={isBlocked}
      style={({ pressed }) => {
        const base: ViewStyle = {
          height,
          paddingHorizontal,
          borderRadius: shape === 'pill' ? theme.radii.pill : theme.radii.md,
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        };

        // Disabled: explicit tokens, never opacity.
        if (disabled) {
          const disabledBg =
            variant === 'primary' || variant === 'tonal' ? colors.surfaceSunken : 'transparent';
          return [
            base,
            {
              backgroundColor: disabledBg,
              borderWidth: variant === 'secondary' ? theme.strokes.hairline : 0,
              borderColor: colors.border,
            },
            style as ViewStyle,
          ];
        }

        if (variant === 'primary') {
          return [
            base,
            { backgroundColor: pressed ? colors.accentPressed : colors.accent },
            style as ViewStyle,
          ];
        }
        if (variant === 'tonal') {
          return [
            base,
            { backgroundColor: pressed ? colors.accentPressed : colors.accentMuted },
            style as ViewStyle,
          ];
        }
        if (variant === 'secondary') {
          return [
            base,
            {
              backgroundColor: pressed ? colors.surfaceSunken : 'transparent',
              borderWidth: theme.strokes.hairline,
              borderColor: colors.accent,
            },
            style as ViewStyle,
          ];
        }
        // ghost
        return [
          base,
          { backgroundColor: pressed ? colors.surfaceSunken : 'transparent' },
          style as ViewStyle,
        ];
      }}
      {...rest}
    >
      {({ pressed }) => (
        <View style={styles.row}>
          {loading ? (
            <ActivityIndicator size="small" color={spinnerColor} />
          ) : (
            <>
              {icon}
              <Text variant="button" color={labelColor(pressed)}>
                {label}
              </Text>
            </>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
