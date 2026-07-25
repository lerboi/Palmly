import { useEffect, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';

import { PalmDiagram } from '@/components/palm-diagram/PalmDiagram';
import { Button, Card, HeaderIconButton, Icon, Screen, Skeleton, Text } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/theme';
import { useAccountIdentity } from '@/lib/account';
import { loadPendingCompat, type PendingCompat } from '@/lib/pendingCompat';
import { elapsedLabel } from '@/lib/compatCopy';
import { dismissFortuneOptIn, fortuneOptInDismissed, getPushPermission, requestPushPermission } from '@/lib/notifications';
import { PREVIEW_GEOMETRY } from '@/features/reading/reveal';
import { FortuneCard } from './FortuneCard';
import { type Fortune, almanacDate, homeState } from './fortune';
import { streakRun, weekCells, type DayCell } from './openHistory';

export interface FortuneHomeProps {
  /** Today's fortune. Absent while it loads / before the day's row is generated → the first-run state. */
  fortune?: Fortune | null;
  premium: boolean;
  /**
   * Local dates (`YYYY-MM-DD`) on which the user opened their fortune — drives the week strip and
   * the streak run. Empty is honest: an empty week renders dots with no streak claim (SH-9).
   */
  openedDates?: readonly string[];
  /** Pending compatibility partner (the red-thread row), if any. */
  partnerName?: string | null;
  /**
   * No reading has EVER completed — show the calm first-run hero. Must be resolved independently
   * (from the session's first-reading flag), never inferred from a missing fortune (SH-1).
   */
  firstRun?: boolean;
  /** The fortune request is still in flight — render the skeleton, never the first-run hero. */
  loading?: boolean;
  /** The entitlement read is still in flight — the locked/unlocked branch must wait (SH-2). */
  entitlementLoading?: boolean;
  /** The fortune request failed — render the retry card, never the first-run hero. */
  error?: boolean;
  /** Retry the failed fortune fetch. */
  onRetry?: () => void;
  now?: number;
}

/**
 * Returning-user home (UIUX §2.11, redesign R18 / v2 V17) — weekday + date header with the ganzhi
 * day-pillar surfaced as an English whisper ("Wood Rat") behind a tap-to-learn pill, a real week
 * strip, today's
 * fortune hero card (free/premium), a pending-compatibility red-thread row, and entries to the
 * readings shelf and chat. English-first, no CJK. A first-run user sees a traced-palm hero.
 */
export function FortuneHome({ fortune, premium, openedDates = [], partnerName, firstRun, loading, entitlementLoading, error, onRetry, now }: FortuneHomeProps) {
  const theme = useTheme();
  const router = useRouter();
  // Only the loading flag is needed now — the claim row (its other consumer) moved to Readings.
  const { loading: identityLoading } = useAccountIdentity();
  const [ts] = useState(() => now ?? Date.now());
  const date = almanacDate(new Date(ts));
  // One resolver, unit-tested (SH-1). `loading`/`error` are about the REQUEST and win first;
  // `firstRun` is about the USER. A missing fortune row on a ready screen is NOT first-run.
  const state = homeState({ loading, entitlementLoading, error, firstRun, fortune });
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';

  // Live pending-compat red-thread (audit F1.7): the last invite the user SENT, read back from the
  // local store so the row re-shares the EXACT same link — never mints a second. `partnerName` (a
  // prop) is a /dev override; production drives the row off the store.
  const [pending, setPending] = useState<PendingCompat | null>(null);
  const [pendingResolved, setPendingResolved] = useState(false);
  useEffect(() => {
    let active = true;
    loadPendingCompat().then((p) => {
      if (!active) return;
      setPending(p);
      setPendingResolved(true);
    });
    return () => {
      active = false;
    };
  }, []);
  // SH-13: there is no fallback name any more. The literal string 'your match' shipped as a
  // default and rendered "Waiting for your match", which reads as an unfinished placeholder — so
  // the row now requires a REAL name and hides itself otherwise (Direction §5).
  const nudgeName = pending?.partnerName ?? partnerName ?? null;
  const nudgeElapsed = pending ? elapsedLabel(pending.sentAtISO, ts) : undefined;
  const showThread = !!nudgeName;

  // Daily-fortune push opt-in (sanctioned moment #2, F1.T10) — shown once, in-context on the home the
  // fortune lives on (never at launch), until enabled or dismissed. The OS ask is device-only.
  const [showOptIn, setShowOptIn] = useState(false);
  const [optInResolved, setOptInResolved] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([getPushPermission(), fortuneOptInDismissed()]).then(([status, dismissed]) => {
      if (!active) return;
      setShowOptIn(status === 'undetermined' && !dismissed);
      setOptInResolved(true);
    });
    return () => {
      active = false;
    };
  }, []);
  const onEnablePush = () => {
    setShowOptIn(false);
    void requestPushPermission('fortune_optin');
  };
  // All three async tail reads have answered — the notify row, the red thread, and the claim row
  // now appear together instead of arriving one at a time (SH-3).
  const tailReady = pendingResolved && optInResolved && !identityLoading;
  // CP-5: "· Wood Rat day" was unexplained jargon with no way to learn what it meant.
  const [pillarOpen, setPillarOpen] = useState(false);

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
            <DayPillarPill label={`${date.pillarEn} day`} open={pillarOpen} onToggle={() => setPillarOpen((v) => !v)} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <HeaderIconButton name="camera" accessibilityLabel="New reading" onPress={() => router.push('/primer')} />
          <HeaderIconButton name="settings" accessibilityLabel="Settings" onPress={() => router.push('/settings')} />
        </View>
      </View>

      {pillarOpen ? <DayPillarExplainer pillar={date.pillarEn} /> : null}

      {state === 'loading' ? (
        <FortuneSkeleton />
      ) : state === 'error' ? (
        <FortuneError onRetry={onRetry} />
      ) : state === 'firstRun' ? (
        <FirstRunState onScan={() => router.push('/primer')} />
      ) : (
        <>
          <WeekStrip cells={weekCells(new Date(ts), openedDates)} streak={streakRun(new Date(ts), openedDates)} />
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
          {/* The tail mounts ONCE, after all three of its async reads have answered, and fades in
              (SH-3). Previously each read inserted its own row on arrival, so Today visibly
              reflowed two or three times per open. It sits below the hero, so appearing costs
              nothing above it — what jumped before was this block growing in stages. */}
          {tailReady ? (
            <Animated.View entering={shouldAnimate ? FadeIn.duration(theme.motion.duration.base) : undefined}>
              {showOptIn ? <NotifyOptInRow onEnable={onEnablePush} onDismiss={onDismissPush} /> : null}
              {showThread && nudgeName ? (
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
              {/* The claim row moved to Readings (Direction §4.1): "don't lose these" is a real
                  story next to a shelf of readings, and an abstract one next to today's fortune. */}
            </Animated.View>
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

/**
 * The day-pillar, as something you can ask about (CP-5). It read "· Wood Rat day" in low-contrast
 * tertiary with no affordance — jargon presented as decoration. Now it is an ink pill on a sunken
 * well (a chip, so `textPrimary` per the U0.T2 contrast contract), and tapping it explains itself.
 */
function DayPillarPill({ label, open, onToggle }: { label: string; open: boolean; onToggle: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={`${label} — what does this mean?`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        backgroundColor: theme.colors.surfaceSunken,
        borderRadius: theme.radii.pill,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 2,
      }}
    >
      <Text variant="caption" color={theme.colors.textPrimary}>
        {label}
      </Text>
      <Icon name="help" size={13} color={theme.colors.textSecondary} decorative />
    </Pressable>
  );
}

/** Two sentences, no jargon and no CJK — what the pillar is, and why the fortune cares. */
function DayPillarExplainer({ pillar }: { pillar: string }) {
  const theme = useTheme();
  return (
    <Card style={{ marginBottom: theme.spacing.md, gap: theme.spacing.xs }}>
      <Text variant="bodyMedium">Today is a {pillar} day</Text>
      <Text variant="body" tone="secondary">
        The old almanacs give every day one of five elements and one of twelve animals. That pairing
        is the tone today is read in — your fortune is written against it.
      </Text>
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
      <Text variant="heading">Today’s reading isn’t loading</Text>
      <Text variant="body" tone="secondary">
        Your readings are safe — this was a hiccup on our side.
      </Text>
      {onRetry ? <Button label="Try again" variant="secondary" size="md" onPress={onRetry} /> : null}
    </Card>
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
          {elapsed ? `Sent ${elapsed} â€” tap to nudge them again.` : 'Your thread is tied â€” nudge them to compare palms.'}
        </Text>
      </View>
      <Icon name="chevron" size={20} color={theme.colors.textTertiary} decorative />
    </Card>
  );
}

/** Daily-fortune push opt-in (F1.T10 sanctioned moment) â€” a calm, dismissible in-context ask. */

/**
 * The week rhythm Today never had (Audit-4 SH-9, Direction §4.1). Seven trailing days: weekday
 * initial over a dot — opened days are ink-filled, today wears an accent ring (the ONE ambient
 * accent this screen is allowed beyond its CTA), and days you missed stay a hairline.
 *
 * What it replaces: a strip whose seven dots were keyed `d0..d6` and carried no weekday or "today"
 * meaning, clamped at `Math.min(streak, 7)` so a month-long habit looked like a week, pulsed a
 * flame forever, and — because the `streak` prop was never passed — never rendered in production
 * at all.
 */
function WeekStrip({ cells, streak }: { cells: DayCell[]; streak: number }) {
  const theme = useTheme();
  return (
    <View style={{ marginBottom: theme.spacing.md }}>
      <View
        accessibilityRole="text"
        accessibilityLabel={
          streak >= 2
            ? `Fortune opened ${streak} days in a row`
            : `This week: opened on ${cells.filter((c) => c.opened).length} of 7 days`
        }
        style={{ flexDirection: 'row', justifyContent: 'space-between' }}
      >
        {cells.map((cell) => (
          <View key={cell.key} style={{ alignItems: 'center', gap: theme.spacing.xs, flex: 1 }}>
            <Text variant="caption" tone="secondary">
              {cell.initial}
            </Text>
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: theme.radii.pill,
                backgroundColor: cell.opened ? theme.colors.textSecondary : 'transparent',
                borderWidth: cell.opened ? 0 : theme.strokes.hairline,
                borderColor: theme.colors.border,
              }}
            />
            {/* Today's ring sits UNDER the dot as a halo, so the fill still reads on an opened day. */}
            {cell.isToday ? (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  bottom: -3,
                  width: 16,
                  height: 16,
                  borderRadius: theme.radii.pill,
                  borderWidth: theme.strokes.hairline,
                  borderColor: theme.colors.accent,
                }}
              />
            ) : null}
          </View>
        ))}
      </View>
      {/* Only a REAL run of 2+ earns a line. No run, no claim (SH-9). */}
      {streak >= 2 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginTop: theme.spacing.sm }}>
          <Icon name="streak" size={14} color={theme.colors.textSecondary} decorative />
          <Text variant="caption" tone="secondary">
            {streak}-day streak
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** Daily-fortune push opt-in (F1.T10 sanctioned moment) — a calm, dismissible in-context ask. */
/**
 * The notify opt-in, demoted from a card to ONE line (Audit-4 CP-2, Direction §4.1). It used to be
 * a full card carrying three clauses — "A gentle daily notification — the almanac, tuned to you.
 * One a day, quiet hours respected." — for a single yes/no. One line, one idea.
 *
 * Hidden on web: there is no push to opt into there, so the row would be an empty promise.
 */
function NotifyOptInRow({ onEnable, onDismiss }: { onEnable: () => void; onDismiss: () => void }) {
  const theme = useTheme();
  if (Platform.OS === 'web') return null;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        marginBottom: theme.spacing.md,
      }}
    >
      <Icon name="bell" size={20} color={theme.colors.textSecondary} decorative />
      <Text variant="body" style={{ flex: 1 }}>
        One quiet notification each morning.
      </Text>
      <Button label="Turn on" variant="ghost" size="md" onPress={onEnable} />
      <HeaderIconButton name="close" size={18} accessibilityLabel="Not now" onPress={onDismiss} />
    </View>
  );
}

