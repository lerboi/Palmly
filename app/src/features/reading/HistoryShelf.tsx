import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { PalmDiagram } from '@/components/palm-diagram/PalmDiagram';
import { AppHeader, Card, PrivacyBadge, Screen, Text } from '@/components/ui';
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
 * The readings shelf (UIUX §2.11 / §2.5, P6.T4) — past palm/face readings as re-openable cards, each
 * with its own line-diagram thumbnail. The repeat-scan banner surfaces Backend §6.6.4's consistency
 * guarantee ("same palm, same reading") as a trust brag when a rescan matched a stored reading.
 */
export function HistoryShelf({ readings, showUnchanged = false, now }: HistoryShelfProps) {
  // Stamp "now" once (lazy init keeps render pure — no Date.now() during render).
  const [nowTs] = useState(() => now ?? Date.now());
  return (
    <Screen scroll>
      {/* One privacy signal for the whole shelf — not repeated per row (redesign §2). */}
      <AppHeader title="Your readings" right={<PrivacyBadge />} />
      {showUnchanged ? <UnchangedBanner /> : null}
      {readings.length === 0 ? <EmptyState /> : readings.map((r) => <ReadingRow key={r.id} reading={r} now={nowTs} />)}
    </Screen>
  );
}

function ReadingRow({ reading, now }: { reading: ReadingSummary; now: number }) {
  const theme = useTheme();
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push('/reveal')} accessibilityRole="button" accessibilityLabel={`Open reading: ${reading.headline}`}>
      <Card style={{ marginBottom: theme.spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
          <PalmDiagram geometry={reading.geometry} size={64} signatureLines={['heart_line', 'fate_line']} showLabels={false} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <Text variant="accent" tone="accent">
                {reading.kind === 'palm' ? '掌' : '面'}
              </Text>
              <Text variant="caption" tone="secondary" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                {reading.kind === 'palm' ? 'Palm' : 'Face'} · {relativeDate(reading.createdAt, now)}
              </Text>
            </View>
            <Text variant="bodyMedium" numberOfLines={2} style={{ marginTop: 2 }}>
              {reading.headline}
            </Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

function UnchangedBanner() {
  const theme = useTheme();
  return (
    <Card style={{ marginBottom: theme.spacing.lg, borderColor: theme.colors.jade }}>
      <Text variant="heading">Your palm is unchanged</Text>
      <Text variant="body" tone="secondary" style={{ marginTop: theme.spacing.xs }}>
        Your reading stands — same palm, same reading. Your lines don&apos;t lie.
      </Text>
    </Card>
  );
}

function EmptyState() {
  const theme = useTheme();
  return (
    <Card style={{ alignItems: 'center', paddingVertical: theme.spacing.xxl }}>
      <Text variant="heading" style={{ textAlign: 'center' }}>
        No readings yet
      </Text>
      <Text variant="body" tone="secondary" style={{ textAlign: 'center', marginTop: theme.spacing.sm }}>
        Scan your palm to get your first reading.
      </Text>
    </Card>
  );
}
