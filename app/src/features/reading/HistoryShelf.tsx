import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';

import { PalmDiagram } from '@/components/palm-diagram/PalmDiagram';
import { AppHeader, Button, Card, Icon, Logomark, PrivacyBadge, Screen, Text } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/theme';
import { type ReadingSummary, relativeDate } from './history';

export interface HistoryShelfProps {
  readings: ReadingSummary[];
  /** Show the repeat-scan "your palm is unchanged" brag (UIUX §2.5 consistency guarantee). */
  showUnchanged?: boolean;
  /** Injected clock so relative dates are deterministic in tests/screenshots. */
  now?: number;
}

/**
 * The readings shelf (UIUX §2.11 / §2.5, redesign R20 / v2 V19) — past palm/face readings as
 * re-openable cards, each with a **legible** line-diagram thumbnail (silhouette off, lines in the
 * accent) and a vermilion **type-chip** so palm vs face read at a glance. The privacy signal shows
 * ONCE in the header. The repeat-scan banner is an earned trust brag — green stays the semantic
 * "unchanged" check, the claret red-thread is the ornament (§3.2). English-first, no CJK.
 */
export function HistoryShelf({ readings, showUnchanged = false, now }: HistoryShelfProps) {
  const [nowTs] = useState(() => now ?? Date.now());
  const theme = useTheme();
  const router = useRouter();
  return (
    <Screen scroll>
      {/* One privacy signal for the whole shelf — not repeated per row (redesign §2). The gear
          un-orphans Settings from the readings surface (audit F0.7). */}
      <AppHeader
        title="Your readings"
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Pressable
              onPress={() => router.push('/settings')}
              accessibilityRole="button"
              accessibilityLabel="Settings"
              hitSlop={8}
            >
              <Icon name="settings" size={22} color={theme.colors.textSecondary} decorative />
            </Pressable>
            <PrivacyBadge />
          </View>
        }
      />
      {showUnchanged ? <UnchangedBanner /> : null}
      {readings.length === 0 ? (
        <EmptyState />
      ) : (
        readings.map((r, i) => <ReadingRow key={r.id} reading={r} now={nowTs} index={i} />)
      )}
    </Screen>
  );
}

function ReadingRow({ reading, now, index }: { reading: ReadingSummary; now: number; index: number }) {
  const theme = useTheme();
  const router = useRouter();
  const isPalm = reading.kind === 'palm';
  return (
    <Card
      elevation="sm"
      onPress={() => router.push(`/reveal?readingId=${reading.id}` as Href)}
      accessibilityLabel={`Open ${isPalm ? 'palm' : 'face'} reading: ${reading.headline}`}
      pressedTint="accent"
      entranceIndex={index}
      style={{ marginBottom: theme.spacing.md }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        {/* Thumbnail — the reading's own lines in the accent, framed in a tile (no muddy silhouette). */}
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: theme.radii.sm,
            backgroundColor: theme.colors.surfaceSunken,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <PalmDiagram
            geometry={reading.geometry}
            size={56}
            animate={false}
            silhouette={false}
            signatureLines={isPalm ? ['heart_line', 'fate_line'] : ['heart_line', 'head_line']}
            accessibilityLabel=""
          />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: theme.colors.accentMuted,
                borderRadius: theme.radii.pill,
                paddingHorizontal: theme.spacing.sm,
                paddingVertical: 2,
              }}
            >
              <Icon name={isPalm ? 'palm' : 'face'} size={13} color={theme.colors.accent} decorative />
              <Text variant="caption" color={theme.colors.accent}>
                {isPalm ? 'Palm' : 'Face'}
              </Text>
            </View>
            <Text variant="caption" tone="tertiary">
              {relativeDate(reading.createdAt, now)}
            </Text>
          </View>
          <Text variant="bodyMedium" numberOfLines={2} style={{ marginTop: theme.spacing.xs }}>
            {reading.headline}
          </Text>
        </View>
        <Icon name="chevron" size={20} color={theme.colors.textTertiary} decorative />
      </View>
    </Card>
  );
}

/** The repeat-scan trust brag — green is the semantic "unchanged" check; the claret thread is the
 *  ornament (your past + present readings, tied). */
function UnchangedBanner() {
  const theme = useTheme();
  return (
    <Card
      elevation="sm"
      bordered
      style={{ marginBottom: theme.spacing.lg, borderColor: theme.colors.success, backgroundColor: theme.colors.surfaceRaised }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Icon name="check" size={20} color={theme.colors.success} decorative />
        <Text variant="heading" color={theme.colors.success} style={{ flex: 1 }}>
          Your palm is unchanged
        </Text>
        <Icon name="thread" size={22} color={theme.colors.heritageAccent} decorative />
      </View>
      <Text variant="body" tone="secondary" style={{ marginTop: theme.spacing.xs }}>
        Your reading stands — same palm, same reading. Your lines don&apos;t lie.
      </Text>
    </Card>
  );
}

/** Empty shelf — grounded in the Palmly mark, with a gentle entrance. */
function EmptyState() {
  const theme = useTheme();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';
  return (
    <Animated.View entering={shouldAnimate ? FadeIn.duration(theme.motion.duration.slow) : undefined}>
      <Card elevation="sm" style={{ alignItems: 'center', paddingVertical: theme.spacing.xxl }}>
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: 44,
            backgroundColor: theme.colors.surfaceSunken,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Logomark size={48} tone="ink" />
        </View>
        <Text variant="title" style={{ textAlign: 'center', marginTop: theme.spacing.lg }}>
          No readings yet
        </Text>
        <Text variant="body" tone="secondary" style={{ textAlign: 'center', marginTop: theme.spacing.sm, maxWidth: 280 }}>
          Your palm and face readings will live here — yours to reopen anytime.
        </Text>
        <Button label="Read my palm" variant="primary" fullWidth style={{ marginTop: theme.spacing.xl }} onPress={() => router.push('/primer')} />
      </Card>
    </Animated.View>
  );
}
