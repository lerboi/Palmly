import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { PalmDiagram } from '@/components/palm-diagram/PalmDiagram';
import { Button, Card, HeaderIconButton, Icon, Screen, Skeleton, Text } from '@/components/ui';
import type { IconName } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/theme';
import { useAccountIdentity } from '@/lib/account';
import { loadPendingCompat, type PendingCompat } from '@/lib/pendingCompat';
import { elapsedLabel } from '@/lib/compatCopy';
import { dismissFortuneOptIn, fortuneOptInDismissed, getPushPermission, requestPushPermission } from '@/lib/notifications';
import { PREVIEW_GEOMETRY } from '@/features/reading/reveal';
import { FortuneCard } from './FortuneCard';
import { type Fortune, almanacDate, homeState } from './fortune';

export interface FortuneHomeProps {
  /** Today's fortune. Absent while it loads / before the day's row is generated → the first-run state. */
  fortune?: Fortune | null;
  premium: boolean;
  /** Real consecutive-day streak; 0 (the honest default until retention wires it) hides the strip. */
  streak?: number;
  /** Pending compatibility partner (the red-thread row), if any. */
  partnerName?: string | null;
  /**
   * No reading has EVER completed — show the calm first-run hero. Must be resolved independently
   * (from the session's first-reading flag), never inferred from a missing fortune (SH-1).
   */
  firstRun?: boolean;
  /** The fortune request is still in flight — render the skeleton, never the first-run hero. */
  loading?: boolean;
  /** The fortune request failed — render the retry card, never the first-run hero. */
  error?: boolean;
  /** Retry the failed fortune fetch. */
  onRetry?: () => void;
  now?: number;
}

/**
 * Returning-user home (UIUX §2.11, redesign R18 / v2 V17) — weekday + date header with the ganzhi
 * day-pillar surfaced as an English whisper ("Wood Rat"), a branded animated streak strip, today's
 * fortune hero card (free/premium), a pending-compatibility red-thread row, and entries to the
 * readings shelf and chat. English-first, no CJK. A first-run user sees a traced-palm hero.
 */
export function FortuneHome({ fortune, premium, streak = 0, partnerName, firstRun, loading, error, onRetry, now }: FortuneHomeProps) {
  const theme = useTheme();
  const router = useRouter();
  const { isAnonymous } = useAccountIdentity();
  const [ts] = useState(() => now ?? Date.now());
  const date = almanacDate(new Date(ts));
  // One resolver, unit-tested (SH-1). `loading`/`error` are about the REQUEST and win first;
  // `firstRun` is about the USER. A missing fortune row on a ready screen is NOT first-run.
  const state = homeState({ loading, error, firstRun, fortune });

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

  // Daily-fortune push opt-in (sanctioned moment #2, F1.T10) — shown once, in-context on the home the
  // fortune lives on (never at launch), until enabled or dismissed. The OS ask is device-only.
  const [showOptIn, setShowOptIn] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([getPushPermission(), fortuneOptInDismissed()]).then(([status, dismissed]) => {
      if (active) setShowOptIn(status === 'undetermined' && !dismissed);
    });
    return () => {
      active = false;
    };
  }, []);
  const onEnablePush = () => {
    setShowOptIn(false);
    void requestPushPermission('fortune_optin');
  };
  const onDismissPush = () => {
    setShowOptIn(false);
    void dismissFortuneOptIn();
  };

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
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <HeaderIconButton name="camera" accessibilityLabel="New reading" onPress={() => router.push('/primer')} />
          <HeaderIconButton name="settings" accessibilityLabel="Settings" onPress={() => router.push('/settings')} />
        </View>
      </View>

      {state === 'loading' ? (
        <FortuneSkeleton />
      ) : state === 'error' ? (
        <FortuneError onRetry={onRetry} />
      ) : state === 'firstRun' ? (
        <FirstRunState onScan={() => router.push('/primer')} />
      ) : (
        <>
          {streak > 0 ? <StreakStrip streak={streak} /> : null}
          {/* `homeState` only returns 'ready' with a fortune in hand, so this guard is unreachable —
              it is here to prove that to the type system rather than to assert it with a `!`. */}
          {fortune ? (
            <FortuneCard
              fortune={fortune}
              premium={premium}
              onUnlock={() => router.push('/paywall?trigger=fortune_full' as Href)}
              onAsk={(q) => router.push(`/chat?q=${encodeURIComponent(q)}` as Href)}
            />
          ) : null}
          {showOptIn ? <NotifyOptInCard onEnable={onEnablePush} onDismiss={onDismissPush} /> : null}
          {showThread ? (
            <RedThreadRow
              name={nudgeName}
              elapsed={nudgeElapsed}
              onPress={() => router.push((pending ? '/share?initialVariant=compat&reshare=1' : '/share') as Href)}
              index={0}
            />
          ) : null}
          {/* Readings and Ask left with the tab bar (SN-2/SN-5, Direction §1 P3) — Today is a page
              again, not a menu. The free-chat row in particular was a two-hop trap: chip → gate →
              paywall. The Ask TAB now shows that gate, and its CTA goes straight to the paywall. */}
          {isAnonymous ? (
            <RowLink icon="sparkle" label="Claim your account" onPress={() => router.push('/account?reason=fortune' as Href)} index={1} />
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

/** Loading — the shape of what's coming, so the page never lies about being empty (SH-1). */
function FortuneSkeleton() {
  const theme = useTheme();
  return (
    <>
      <Skeleton height={44} radius="pill" style={{ marginBottom: theme.spacing.md }} />
      <Card elevation="md" style={{ marginBottom: theme.spacing.md, gap: theme.spacing.md }}>
        <Skeleton width={140} height={14} />
        <Skeleton height={22} />
        <Skeleton width="70%" height={22} />
        <Skeleton width={180} height={44} radius="md" style={{ marginTop: theme.spacing.sm }} />
      </Card>
    </>
  );
}

/** Failure — an honest retry, NOT the first-run hero that used to show here forever (SH-1). */
function FortuneError({ onRetry }: { onRetry?: () => void }) {
  const theme = useTheme();
  return (
    <Card style={{ gap: theme.spacing.md }}>
      <Text variant="heading">Today&apos;s reading isn&apos;t loading</Text>
      <Text variant="body" tone="secondary">
        Your readings are safe — this was a hiccup on our side.
      </Text>
      {onRetry ? <Button label="Try again" variant="secondary" size="md" onPress={onRetry} /> : null}
    </Card>
  );
}

/** A streak strip — an INK flame (Audit-4 CC-1: the flame and all seven dots were accent, which
 *  is most of what made Today read alarming) that gently breathes, the
 *  day-dot run, and a spoken label. */
function StreakStrip({ streak }: { streak: number }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';
  const days = ['d0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6'];

  const pulse = useSharedValue(1);
  const breath = theme.motion.duration.breath;
  useEffect(() => {
    if (!shouldAnimate) {
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(withTiming(1.15, { duration: breath, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [shouldAnimate, pulse, breath]);
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
        <Icon name="streak" size={18} color={theme.colors.textSecondary} decorative />
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
              backgroundColor: i < Math.min(streak, 7) ? theme.colors.textSecondary : theme.colors.border,
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

/** Daily-fortune push opt-in (F1.T10 sanctioned moment) — a calm, dismissible in-context ask. */
function NotifyOptInCard({ onEnable, onDismiss }: { onEnable: () => void; onDismiss: () => void }) {
  const theme = useTheme();
  return (
    <Card elevation="sm" style={{ marginBottom: theme.spacing.md, gap: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <Icon name="bell" size={22} color={theme.colors.textSecondary} decorative />
        <View style={{ flex: 1 }}>
          <Text variant="bodyMedium">Get your fortune each morning</Text>
          <Text variant="caption" tone="secondary">
            A gentle daily notification — the almanac, tuned to you. One a day, quiet hours respected.
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <Button label="Turn on" variant="secondary" onPress={onEnable} />
        <Button label="Not now" variant="ghost" onPress={onDismiss} />
      </View>
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
      <Icon name={icon} size={22} color={theme.colors.textSecondary} decorative />
      <Text variant="bodyMedium" style={{ flex: 1 }}>
        {label}
      </Text>
      {premiumLocked ? (
        <Text variant="caption" tone="premiumInk">
          Premium
        </Text>
      ) : (
        <Icon name="chevron" size={20} color={theme.colors.textTertiary} decorative />
      )}
    </Card>
  );
}
