import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Card, Icon, Text } from '@/components/ui';
import { useTheme } from '@/theme';

/** A titled group of setting rows in a single card (iOS-style grouped list). */
export function SettingGroup({ title, children }: { title: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ marginBottom: theme.spacing.lg }}>
      <Text variant="caption" tone="secondary" style={{ textTransform: 'uppercase', letterSpacing: 1, marginBottom: theme.spacing.sm, marginLeft: theme.spacing.xs }}>
        {title}
      </Text>
      <Card padded={false}>{children}</Card>
    </View>
  );
}

export interface SettingRowProps {
  label: string;
  value?: string;
  onPress?: () => void;
  /** Right-hand control (e.g. a Switch); defaults to a chevron when the row is pressable. */
  right?: ReactNode;
  danger?: boolean;
  first?: boolean;
}

export function SettingRow({ label, value, onPress, right, danger = false, first = false }: SettingRowProps) {
  const theme = useTheme();
  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        borderTopWidth: first ? 0 : theme.strokes.hairline,
        borderTopColor: theme.colors.border,
      }}
    >
      <Text variant="body" style={{ flex: 1 }} color={danger ? theme.colors.danger : undefined}>
        {label}
      </Text>
      {value ? (
        <Text variant="body" tone="secondary">
          {value}
        </Text>
      ) : null}
      {right ?? (onPress ? <Icon name="chevron" size={20} color={theme.colors.textTertiary} decorative /> : null)}
    </View>
  );
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      {content}
    </Pressable>
  ) : (
    content
  );
}
