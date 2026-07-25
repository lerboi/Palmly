import { type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { HeaderIconButton } from './HeaderIconButton';
import { Icon } from './Icon';
import { Text } from './Text';

export interface AppHeaderProps {
  /** Optional screen title (sans heading). */
  title?: string;
  /** When provided, renders a back affordance that calls this. Omit on tab roots. */
  onBack?: () => void;
  /**
   * When provided, renders a **close ✕** instead of a back arrow. True modals dismiss, they don't
   * go back (Audit-4 SN-9). Takes precedence over `onBack` if both are somehow passed.
   */
  onClose?: () => void;
  /** Optional trailing element (an action button / icon). */
  right?: ReactNode;
  /** Bottom hairline divider — turn on when the header sits above scrolled content. */
  showDivider?: boolean;
  style?: ViewStyle;
}

/**
 * Shared screen header (redesign §9/R9, v2 V7) — a back OR close affordance + an optional sans
 * title + an optional trailing slot. Pass `showDivider` to separate it from scrolled content.
 * Screens stay `headerShown:false` and render this at the top of their content.
 *
 * Both affordances are `HeaderIconButton`s, so they carry the 44pt box, the press spring and the
 * haptic tick that the hand-rolled back button was missing (Audit-4 CO-9).
 */
export function AppHeader({ title, onBack, onClose, right, showDivider = false, style }: AppHeaderProps) {
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
      {onClose ? (
        <HeaderIconButton
          name="close"
          onPress={onClose}
          accessibilityLabel="Close"
          color={theme.colors.textPrimary}
          style={{ marginLeft: -theme.spacing.md }}
        />
      ) : onBack ? (
        <HeaderIconButton
          name="back"
          onPress={onBack}
          accessibilityLabel="Back"
          color={theme.colors.textPrimary}
          style={{ marginLeft: -theme.spacing.md }}
        />
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
