import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Card, Icon, Screen, Text } from '@/components/ui';
import type { IconName } from '@/components/ui';
import { useTheme } from '@/theme';
import { FortuneCard } from './FortuneCard';
import { type Fortune, almanacDate } from './fortune';

export interface FortuneHomeProps {
  fortune: Fortune;
  premium: boolean;
  streak: number;
  /** Pending compatibility partner (the red-thread row), if any. */
  partnerName?: string | null;
  /** No reading yet — show the calm first-run state instead of the fortune. */
  firstRun?: boolean;
  now?: number;
}

/**
 * Returning-user home (UIUX §2.11, redesign R18) — weekday + date header (the ganzhi day-pillar is
 * demoted to the optional zh view, not shown here), a subtle streak strip, today's fortune card
 * (free/premium), a pending-compatibility red-thread row, and entries to the readings shelf and
 * chat. English-first, no CJK. A first-run user sees a calm "start your first reading" state.
 */
export function FortuneHome({ fortune, premium, streak, partnerName, firstRun, now }: FortuneHomeProps) {
  const theme = useTheme();
  const router = useRouter();
  const [ts] = useState(() => now ?? Date.now());
  const date = almanacDate(new Date(ts));

  return (
    <Screen scroll>
      <View style={{ marginBottom: theme.spacing.lg }}>
        <Text variant="display">{date.weekday}</Text>
        <Text variant="bodyLarge" tone="secondary">
          {date.gregorian}
        </Text>
      </View>

      {firstRun ? (
        <FirstRunState onScan={() => router.push('/primer')} />
      ) : (
        <>
          <StreakStrip streak={streak} />
          <FortuneCard fortune={fortune} premium={premium} onUnlock={() => router.push('/paywall')} />
          {partnerName ? <RedThreadRow name={partnerName} onPress={() => router.push('/share')} /> : null}
          <RowLink icon="history" label="Your readings" onPress={() => router.push('/history')} />
          <RowLink icon="chat" label="Ask about your reading" premiumLocked={!premium} onPress={() => router.push('/chat')} />
        </>
      )}
    </Screen>
  );
}

function FirstRunState({ onScan }: { onScan: () => void }) {
  const theme = useTheme();
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
        <Icon name="sparkle" size={34} color={theme.colors.accent} decorative />
      </View>
      <Text variant="title" style={{ textAlign: 'center', marginTop: theme.spacing.lg }}>
        Your daily fortune starts here
      </Text>
      <Text variant="body" tone="secondary" style={{ textAlign: 'center', marginTop: theme.spacing.sm, maxWidth: 280 }}>
        Read your palm once to unlock a fortune tuned to you, every day.
      </Text>
      <Button label="Read my palm" variant="primary" fullWidth style={{ marginTop: theme.spacing.xl }} onPress={onScan} />
    </Card>
  );
}

function StreakStrip({ streak }: { streak: number }) {
  const theme = useTheme();
  const days = ['d0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6'];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
        <Icon name="streak" size={18} color={theme.colors.heritageAccent} decorative />
        <Text variant="bodyMedium">{streak}-day streak</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 6, marginLeft: 'auto' }}>
        {days.map((id, i) => (
          <View
            key={id}
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: i < Math.min(streak, 7) ? theme.colors.accent : theme.colors.border,
            }}
          />
        ))}
      </View>
    </View>
  );
}

function RedThreadRow({ name, onPress }: { name: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Nudge ${name} to compare palms`}>
      <Card elevation="sm" style={{ marginBottom: theme.spacing.md, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <Icon name="thread" size={24} color={theme.colors.heritageAccent} decorative />
        <View style={{ flex: 1 }}>
          <Text variant="bodyMedium">Waiting for {name}</Text>
          <Text variant="caption" tone="secondary">
            Your thread is tied — nudge them to compare palms.
          </Text>
        </View>
        <Icon name="chevron" size={20} color={theme.colors.textTertiary} decorative />
      </Card>
    </Pressable>
  );
}

function RowLink({
  icon,
  label,
  onPress,
  premiumLocked = false,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  premiumLocked?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <Card elevation="sm" style={{ marginBottom: theme.spacing.md, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <Icon name={icon} size={22} color={theme.colors.accent} decorative />
        <Text variant="bodyMedium" style={{ flex: 1 }}>
          {label}
        </Text>
        {premiumLocked ? (
          <Text variant="caption" tone="premium">
            Premium
          </Text>
        ) : (
          <Icon name="chevron" size={20} color={theme.colors.textTertiary} decorative />
        )}
      </Card>
    </Pressable>
  );
}
