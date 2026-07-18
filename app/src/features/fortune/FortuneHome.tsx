import { useEffect, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { PalmDiagram } from '@/components/palm-diagram/PalmDiagram';
import { Button, Card, Icon, Screen, Text } from '@/components/ui';
import type { IconName } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/theme';
import { useAccountIdentity } from '@/lib/account';
import { loadPendingCompat, type PendingCompat } from '@/lib/pendingCompat';
import { elapsedLabel } from '@/lib/compatCopy';
import { PREVIEW_GEOMETRY } from '@/features/reading/reveal';
import { FortuneCard } from './FortuneCard';
import { type Fortune, almanacDate } from './fortune';

export interface FortuneHomeProps {
  /** Today's fortune. Absent while it loads / before the day's row is generated → the first-run state. */
  fortune?: Fortune | null;
  premium: boolean;
  /** Real consecutive-day streak; 0 (the honest default until retention wires it) hides the strip. */
  streak?: number;
  /** Pending compatibility partner (the red-thread row), if any. */
  partnerName?: string | null;
  /** No reading yet — show the calm first-run state instead of the fortune. */
  firstRun?: boolean;
  now?: number;
}

/**
 * Returning-user home (UIUX §2.11, redesign R18 / v2 V17) — weekday + date header with the ganzhi
 * day-pillar surfaced as an English whisper ("Wood Rat"), a branded animated streak strip, today's
 * fortune hero card (free/premium), a pending-compatibility red-thread row, and entries to the
 * readings shelf and chat. English-first, no CJK. A first-run user sees a traced-palm hero.
 */
export function FortuneHome({ fortune, premium, streak = 0, partnerName, firstRun, now }: FortuneHomeProps) {
  const theme = useTheme();
  const router = useRouter();
  const { isAnonymous } = useAccountIdentity();
  const [ts] = useState(() => now ?? Date.now());
  const date = almanacDate(new Date(ts));
  // No fortune to show (loading, or the day's row isn't generated) → the calm first-run state.
  const showFirstRun = firstRun || !fortune;

  // Live pending-compat red-thread (audit F1.7): the last invite the user SENT, read back from the
  // local store so the row re-shares the EXACT same link — never mints a second. `partnerName` (a
  // prop) is a /dev override; production drives the row off the store.
  const [pending, setPending] = useState<PendingCompat | null>(null);
  useEffect(() => {
    let active = true;
    loadPendingCompat().then((p) => active && setPending(p));
    return () => {
      active = false;
    };
  }, []);
  const nudgeName = pending?.partnerName ?? partnerName ?? 'your match';
  const nudgeElapsed = pending ? elapsedLabel(pending.sentAtISO, ts) : undefined;
  const showThread = !!(pending || partnerName);

  return (
    <Screen scroll>
      <View style={{ marginBottom: theme.spacing.lg, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text variant="display">{date.weekday}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Text variant="bodyLarge" tone="secondary">
              {date.gregorian}
            </Text>
            <Text variant="caption" tone="tertiary">
              · {date.pillarEn} day
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => router.push('/settings')}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          hitSlop={8}
        >
          <Icon name="settings" size={24} color={theme.colors.textSecondary} decorative />
        </Pressable>
      </View>

      {showFirstRun ? (
        <FirstRunState onScan={() => router.push('/primer')} />
      ) : (
        <>
          {streak > 0 ? <StreakStrip streak={streak} /> : null}
          <FortuneCard fortune={fortune} premium={premium} onUnlock={() => router.push('/paywall?trigger=fortune_full' as Href)} />
          {showThread ? (
            <RedThreadRow
              name={nudgeName}
              elapsed={nudgeElapsed}
              onPress={() => router.push((pending ? '/share?initialVariant=compat&reshare=1' : '/share') as Href)}
              index={0}
            />
          ) : null}
          <RowLink icon="history" label="Your readings" onPress={() => router.push('/history')} index={1} />
          <RowLink icon="chat" label="Ask about your reading" premiumLocked={!premium} onPress={() => router.push('/chat')} index={2} />
          {isAnonymous ? (
            <RowLink icon="sparkle" label="Claim your account" onPress={() => router.push('/account?reason=fortune' as Href)} index={3} />
          ) : null}
        </>
      )}
    </Screen>
  );
}

/** First-run — a traced-palm hero (their reading-to-be), not a stock empty card. */
function FirstRunState({ onScan }: { onScan: () => void }) {
  const theme = useTheme();
  return (
    <Card elevation="md" style={{ alignItems: 'center', paddingVertical: theme.spacing.xxl }}>
      <PalmDiagram geometry={PREVIEW_GEOMETRY} size={160} signatureLines={['heart_line', 'fate_line']} animate />
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

/** A branded streak strip — an accent flame (streak IS accent, §3.2) that gently breathes, the
 *  day-dot run, and a spoken label. */
function StreakStrip({ streak }: { streak: number }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';
  const days = ['d0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6'];

  const pulse = useSharedValue(1);
  useEffect(() => {
    if (!shouldAnimate) {
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(withTiming(1.15, { duration: 900, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [shouldAnimate, pulse]);
  const flameStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`${streak}-day fortune streak`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        backgroundColor: theme.colors.surfaceSunken,
        borderRadius: theme.radii.pill,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        marginBottom: theme.spacing.md,
      }}
    >
      <Animated.View style={flameStyle}>
        <Icon name="streak" size={18} color={theme.colors.accent} decorative />
      </Animated.View>
      <Text variant="bodyMedium">{streak}-day streak</Text>
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

function RedThreadRow({ name, elapsed, onPress, index }: { name: string; elapsed?: string; onPress: () => void; index?: number }) {
  const theme = useTheme();
  return (
    <Card
      elevation="sm"
      onPress={onPress}
      accessibilityLabel={`Nudge ${name} to compare palms`}
      pressedTint="accent"
      entranceIndex={index}
      style={{ marginBottom: theme.spacing.md, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}
    >
      <Icon name="thread" size={24} color={theme.colors.heritageAccent} decorative />
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium">Waiting for {name}</Text>
        <Text variant="caption" tone="secondary">
          {elapsed ? `Sent ${elapsed} — tap to nudge them again.` : 'Your thread is tied — nudge them to compare palms.'}
        </Text>
      </View>
      <Icon name="chevron" size={20} color={theme.colors.textTertiary} decorative />
    </Card>
  );
}

function RowLink({
  icon,
  label,
  onPress,
  premiumLocked = false,
  index,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  premiumLocked?: boolean;
  index?: number;
}) {
  const theme = useTheme();
  return (
    <Card
      elevation="sm"
      onPress={onPress}
      accessibilityLabel={label}
      pressedTint="accent"
      entranceIndex={index}
      style={{ marginBottom: theme.spacing.md, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}
    >
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
  );
}
