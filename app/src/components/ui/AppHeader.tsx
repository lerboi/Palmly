import { type ReactNode } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { usePressSpring, useTheme } from '@/theme';
import { Icon } from './Icon';
import { Text } from './Text';

export interface AppHeaderProps {
  /** Optional screen title (sans heading). */
  title?: string;
  /** When provided, renders a back affordance that calls this. Omit on tab roots. */
  onBack?: () => void;
  /** Optional trailing element (an action button / icon). */
  right?: ReactNode;
  /** Bottom hairline divider — turn on when the header sits above scrolled content. */
  showDivider?: boolean;
  style?: ViewStyle;
}

/**
 * Shared screen header (redesign §9/R9, v2 V7) — a back affordance (the `Icon name="back"`, with a
 * reduce-motion-aware press spring) + an optional sans title + an optional trailing slot. Pass
 * `showDivider` to separate it from scrolled content. Screens stay `headerShown:false` and render
 * this at the top of their content.
 */
export function AppHeader({ title, onBack, right, showDivider = false, style }: AppHeaderProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
          minHeight: 44,
          marginBottom: theme.spacing.md,
          paddingBottom: showDivider ? theme.spacing.md : 0,
          borderBottomWidth: showDivider ? theme.strokes.hairline : 0,
          borderBottomColor: theme.colors.border,
        },
        style,
      ]}
    >
      {onBack ? <BackButton onBack={onBack} /> : null}
      {title ? (
        <Text variant="heading" style={{ flex: 1 }} numberOfLines={1}>
          {title}
        </Text>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      {right}
    </View>
  );
}

/** Back affordance — a spring press-scale on the icon (native only; reduce-motion / web → static). */
function BackButton({ onBack }: { onBack: () => void }) {
  const theme = useTheme();
  const { scaleStyle, onPressIn, onPressOut } = usePressSpring(0.9);
  return (
    <Pressable
      onPress={onBack}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityLabel="Back"
      hitSlop={8}
      style={{ marginLeft: -theme.spacing.xs, padding: theme.spacing.xs }}
    >
      <Animated.View style={scaleStyle}>
        <Icon name="back" size={24} color={theme.colors.textPrimary} decorative />
      </Animated.View>
    </Pressable>
  );
}

export interface PrivacyBadgeProps {
  /** Override the copy. Default "Photo deleted". */
  label?: string;
  style?: ViewStyle;
}

/**
 * The singular privacy trust signal (redesign §2) — the "your photo is deleted" story shown
 * ONCE per surface (a shield + one line), never repeated as per-row chrome.
 */
export function PrivacyBadge({ label = 'Photo deleted', style }: PrivacyBadgeProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
        style,
      ]}
    >
      <Icon name="shield" size={16} color={theme.colors.success} decorative />
      <Text variant="caption" tone="success">
        {label}
      </Text>
    </View>
  );
}
