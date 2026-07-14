import { useEffect, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Card, Icon, Text } from '@/components/ui';
import type { IconName } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/theme';

/** A titled group of setting rows in a single lifted card (iOS-style grouped list, v2 V20). */
export function SettingGroup({ title, children }: { title: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ marginBottom: theme.spacing.lg }}>
      <Text
        variant="caption"
        tone="secondary"
        style={{ textTransform: 'uppercase', letterSpacing: 1, marginBottom: theme.spacing.sm, marginLeft: theme.spacing.md }}
      >
        {title}
      </Text>
      <Card elevation="sm" padded={false}>
        {children}
      </Card>
    </View>
  );
}

export interface SettingRowProps {
  label: string;
  /** Optional secondary line under the label (e.g. the Plan nudge copy). */
  caption?: string;
  value?: string;
  /** A leading icon in an accent chip (v2 §6 — wire icons across the settings suite). */
  leadingIcon?: IconName;
  onPress?: () => void;
  /** Right-hand control (a Switch / commercial pill); defaults to a chevron when the row is pressable. */
  right?: ReactNode;
  danger?: boolean;
  first?: boolean;
}

/**
 * A single settings row (v2 V20 — the highest-leverage press fix; every settings screen inherits
 * it). Pressable rows get the shared reduce-motion-aware press-spring (native) + a `surfaceSunken`
 * pressed tint (which is also the reduce-motion / web feedback). An optional `leadingIcon` renders
 * in an accent chip; an optional `caption` stacks a secondary line under the label.
 */
export function SettingRow({ label, caption, value, leadingIcon, onPress, right, danger = false, first = false }: SettingRowProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';

  // Press-spring — held flag flips in the handler; the shared-value write lives in the effect
  // (effect-scoped mutation keeps the React-Compiler lint happy), written before the style read.
  const [held, setHeld] = useState(false);
  const scale = useSharedValue(1);
  const press = theme.motion.spring.press;
  useEffect(() => {
    if (!shouldAnimate) {
      scale.value = 1;
      return;
    }
    scale.value = withSpring(held ? 0.98 : 1, press);
  }, [held, shouldAnimate, scale, press]);
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

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
      {leadingIcon ? (
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: theme.radii.sm,
            backgroundColor: theme.colors.accentMuted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={leadingIcon} size={16} color={theme.colors.accent} decorative />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text variant="body" color={danger ? theme.colors.danger : undefined}>
          {label}
        </Text>
        {caption ? (
          <Text variant="caption" tone="secondary" style={{ marginTop: 2 }}>
            {caption}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="body" tone="secondary">
          {value}
        </Text>
      ) : null}
      {right ?? (onPress ? <Icon name="chevron" size={20} color={theme.colors.textTertiary} decorative /> : null)}
    </View>
  );

  if (!onPress) return content;

  return (
    <Animated.View style={[styles.pressWrap, scaleStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => setHeld(true)}
        onPressOut={() => setHeld(false)}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => (pressed ? { backgroundColor: theme.colors.surfaceSunken } : null)}
      >
        {content}
      </Pressable>
    </Animated.View>
  );
}

/**
 * The shared privacy trust card (v2 V20 — dedup). One "your photo is deleted" signal — a success
 * shield + line (the PrivacyBadge pattern at card scale) plus an explanatory body — adopted by both
 * PrivacyCenter and MethodologyScreen so the trust story lives in exactly one place.
 */
export function PrivacyTrustCard({ headline, children }: { headline: string; children?: ReactNode }) {
  const theme = useTheme();
  return (
    <Card elevation="sm" style={{ gap: theme.spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Icon name="shield" size={18} color={theme.colors.success} decorative />
        <Text variant="bodyMedium" tone="success" style={{ flex: 1 }}>
          {headline}
        </Text>
      </View>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  pressWrap: { alignSelf: 'stretch' },
});
