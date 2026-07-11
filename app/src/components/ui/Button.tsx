import { Pressable, StyleSheet, View, type PressableProps, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from './Text';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

/**
 * Themed button. `primary` is the cinnabar CTA (UIUX §1.2); `secondary` is an ink-outlined
 * button; `ghost` is text-only. Uses Pressable for a pressed state + built-in a11y role.
 */
export function Button({
  label,
  variant = 'primary',
  size = 'lg',
  disabled = false,
  fullWidth = false,
  style,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const height = size === 'lg' ? 52 : 44;
  const paddingHorizontal = size === 'lg' ? theme.spacing.xl : theme.spacing.lg;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      style={({ pressed }) => {
        const base: ViewStyle = {
          height,
          paddingHorizontal,
          borderRadius: theme.radii.pill,
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          opacity: disabled ? 0.45 : 1,
        };
        if (variant === 'primary') {
          return [
            base,
            { backgroundColor: pressed ? theme.colors.accentPressed : theme.colors.accent },
            style as ViewStyle,
          ];
        }
        if (variant === 'secondary') {
          return [
            base,
            {
              backgroundColor: pressed ? theme.colors.surface : 'transparent',
              borderWidth: theme.strokes.hairline,
              borderColor: theme.colors.text,
            },
            style as ViewStyle,
          ];
        }
        return [base, { backgroundColor: 'transparent', opacity: pressed ? 0.6 : 1 }, style as ViewStyle];
      }}
      {...rest}
    >
      <View style={styles.row}>
        {/* Button labels are UI affordances — cinnabar here is the §1.2 "UI" exception,
            so pass color explicitly rather than tone (which guards body text < 18pt). */}
        <Text
          variant="button"
          color={variant === 'primary' ? theme.colors.onAccent : theme.colors.accent}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
