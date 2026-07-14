import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { PalmDiagram } from '@/components/palm-diagram/PalmDiagram';
import { AppHeader, Button, Card, Icon, PrivacyBadge, Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import { type ReadingSummary, relativeDate } from './history';

export interface HistoryShelfProps {
  readings: ReadingSummary[];
  /** Show the repeat-scan "your palm is unchanged" brag (UIUX §2.5 consistency guarantee). */
  showUnchanged?: boolean;
  /** Injected clock so relative dates are deterministic in tests/screenshots. */
  now?: number;
}

/**
 * The readings shelf (UIUX §2.11 / §2.5, redesign R20) — past palm/face readings as re-openable
 * cards, each with its own line-diagram thumbnail + a small type icon (no per-row CJK glyph). The
 * privacy signal shows ONCE in the header. The repeat-scan banner surfaces the consistency
 * guarantee as a `success`-toned trust brag. English-first, no CJK.
 */
export function HistoryShelf({ readings, showUnchanged = false, now }: HistoryShelfProps) {
  const [nowTs] = useState(() => now ?? Date.now());
  return (
    <Screen scroll>
      {/* One privacy signal for the whole shelf — not repeated per row (redesign §2). */}
      <AppHeader title="Your readings" right={<PrivacyBadge />} />
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
      onPress={() => router.push('/reveal')}
      accessibilityLabel={`Open reading: ${reading.headline}`}
      pressedTint="accent"
      entranceIndex={index}
      style={{ marginBottom: theme.spacing.md }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <PalmDiagram geometry={reading.geometry} size={64} animate={false} signatureLines={['heart_line', 'fate_line']} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
            <Icon name={isPalm ? 'palm' : 'face'} size={16} color={theme.colors.accent} decorative />
            <Text variant="caption" tone="tertiary" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
              {isPalm ? 'Palm' : 'Face'} · {relativeDate(reading.createdAt, now)}
            </Text>
          </View>
          <Text variant="bodyMedium" numberOfLines={2} style={{ marginTop: 2 }}>
            {reading.headline}
          </Text>
        </View>
        <Icon name="chevron" size={20} color={theme.colors.textTertiary} decorative />
      </View>
    </Card>
  );
}

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
        <Text variant="heading" color={theme.colors.success}>
          Your palm is unchanged
        </Text>
      </View>
      <Text variant="body" tone="secondary" style={{ marginTop: theme.spacing.xs }}>
        Your reading stands — same palm, same reading. Your lines don&apos;t lie.
      </Text>
    </Card>
  );
}

function EmptyState() {
  const theme = useTheme();
  const router = useRouter();
  return (
    <Card elevation="md" style={{ alignItems: 'center', paddingVertical: theme.spacing.xxl }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: theme.radii.xl,
          backgroundColor: theme.colors.accentMuted,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="history" size={34} color={theme.colors.accent} decorative />
      </View>
      <Text variant="title" style={{ textAlign: 'center', marginTop: theme.spacing.lg }}>
        No readings yet
      </Text>
      <Text variant="body" tone="secondary" style={{ textAlign: 'center', marginTop: theme.spacing.sm, maxWidth: 280 }}>
        Your palm and face readings will live here — yours to reopen anytime.
      </Text>
      <Button label="Read my palm" variant="primary" fullWidth style={{ marginTop: theme.spacing.xl }} onPress={() => router.push('/primer')} />
    </Card>
  );
}
