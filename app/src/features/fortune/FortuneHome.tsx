import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Card, Icon, Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import { FortuneCard } from './FortuneCard';
import { type Fortune, almanacDate } from './fortune';

export interface FortuneHomeProps {
  fortune: Fortune;
  premium: boolean;
  streak: number;
  /** Pending compatibility partner (the red-thread row), if any. */
  partnerName?: string | null;
  now?: number;
}

/**
 * Returning-user home (UIUX §2.11) — dual almanac date header, streak strip, today's fortune card
 * (free/premium per entitlement), a pending-compatibility red-thread row, and entries to the
 * readings shelf and chat. Opening this screen writes `user_fortunes` (device leg).
 */
export function FortuneHome({ fortune, premium, streak, partnerName, now }: FortuneHomeProps) {
  const theme = useTheme();
  const router = useRouter();
  const [ts] = useState(() => now ?? Date.now());
  const date = almanacDate(new Date(ts));

  return (
    <Screen scroll>
      <View style={{ marginBottom: theme.spacing.lg }}>
        <Text variant="display">{date.weekday}</Text>
        <Text variant="body" tone="secondary">
          {date.gregorian} · {date.pillar}
        </Text>
      </View>

      <StreakStrip streak={streak} />
      <FortuneCard fortune={fortune} premium={premium} onUnlock={() => router.push('/paywall')} />
      {partnerName ? <RedThreadRow name={partnerName} onPress={() => router.push('/share')} /> : null}
      <RowLink glyph="掌" label="Your readings" onPress={() => router.push('/history')} />
      <RowLink glyph="问" label="Ask about your reading" premiumLocked={!premium} onPress={() => router.push('/chat')} />
    </Screen>
  );
}

function StreakStrip({ streak }: { streak: number }) {
  const theme = useTheme();
  const days = ['d0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6'];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
      <Text variant="bodyMedium">🔥 {streak}-day streak</Text>
      <View style={{ flexDirection: 'row', gap: 6, marginLeft: 'auto' }}>
        {days.map((id, i) => (
          <View key={id} style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: i < Math.min(streak, 7) ? theme.colors.accent : theme.colors.border }} />
        ))}
      </View>
    </View>
  );
}

function RedThreadRow({ name, onPress }: { name: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Nudge ${name} to compare palms`}>
      <Card style={{ marginBottom: theme.spacing.md, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <Icon name="thread" size={24} color={theme.colors.heritageAccent} decorative />
        <View style={{ flex: 1 }}>
          <Text variant="bodyMedium">Waiting for {name}</Text>
          <Text variant="caption" tone="secondary">
            Your thread is tied — nudge them to compare palms.
          </Text>
        </View>
      </Card>
    </Pressable>
  );
}

function RowLink({ glyph, label, onPress, premiumLocked = false }: { glyph: string; label: string; onPress: () => void; premiumLocked?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <Card style={{ marginBottom: theme.spacing.md, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <Text variant="accent" tone="accent">
          {glyph}
        </Text>
        <Text variant="bodyMedium" style={{ flex: 1 }}>
          {label}
        </Text>
        {premiumLocked ? (
          <Text variant="caption" tone="gold">
            premium
          </Text>
        ) : (
          <Text variant="body" tone="secondary">
            ›
          </Text>
        )}
      </Card>
    </Pressable>
  );
}
