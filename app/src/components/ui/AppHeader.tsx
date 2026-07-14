import type { ReactNode } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from './Icon';
import { Text } from './Text';

export interface AppHeaderProps {
  /** Optional screen title (sans heading). */
  title?: string;
  /** When provided, renders a back affordance that calls this. Omit on tab roots. */
  onBack?: () => void;
  /** Optional trailing element (an action button / icon). */
  right?: ReactNode;
  style?: ViewStyle;
}

/**
 * Shared screen header (redesign §9/R9) — a back affordance (the new `Icon name="back"`) + an
 * optional sans title + an optional trailing slot. Replaces the per-screen inline serif titles.
 * Screens stay `headerShown:false` and render this at the top of their content.
 */
export function AppHeader({ title, onBack, right, style }: AppHeaderProps) {
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
        },
        style,
      ]}
    >
      {onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
          style={{ marginLeft: -theme.spacing.xs, padding: theme.spacing.xs }}
        >
          <Icon name="back" size={24} color={theme.colors.textPrimary} decorative />
        </Pressable>
      ) : null}
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
