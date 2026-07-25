import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import Animated, {
  SlideInLeft,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { PalmDiagram } from '@/components/palm-diagram/PalmDiagram';
import { differentiateGeometry, type LineGeometry } from '@/components/palm-diagram/geometry';
import { AppHeader, Button, Card, Icon, Screen, Text } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/theme';
import { success } from '@/lib/haptics';
import { DISCLAIMER_SHORT } from '@/lib/trustCopy';
import { RedThread, ScoreRing } from './ShareView';
import {
  WAITING_NUDGE_COPY,
  WAITING_SLOW_COPY,
  claimCelebration,
  dimIcon,
  narrativeBlocks,
  waitingLevel,
} from './pair';

export interface PairSubScore {
  /** The stable server key (`emotion`, `life_energy`, …) — what the icon map is keyed on. */
  key: string;
  label: string;
  value: number; // 0–100
}

export interface PairData {
  partnerName: string;
  score: number;
  headline: string;
  subScores: PairSubScore[];
  /** Both-sides narrative — where you click, where you stretch each other. */
  click: string;
  stretch: string;
}

export interface PairRevealViewProps {
  data: PairData;
  geometry: LineGeometry;
  partnerGeometry?: LineGeometry;
  /** Scopes the arrival haptic to the pair, so a remount doesn't re-celebrate (CO-16). */
  pairId?: string;
  onBack?: () => void;
  onFullReading?: () => void;
  onShare?: () => void;
  /** Leave the pair reveal for Today — the second peak needs an exit too (SN-1). */
  onDone?: () => void;
}

/**
 * Compatibility pair-reveal (UIUX §2.7.4 / §2.10, redesign R16d / v2 V15) — the recipient's payoff,
 * the second choreographed peak: two traced palms **slide in from opposite edges** and draw
 * themselves, the **red thread draws** between them, the gold score ring **counts up** as the
 * headline, sub-scores **fan in** with dimension icons, and a both-sides narrative. On device a
 * success haptic lands on the score ([~], dep pending); web renders the static end-state.
 * English-first, no CJK.
 */
export function PairRevealView({
  data,
  geometry,
  partnerGeometry,
  pairId,
  onBack,
  onFullReading,
  onShare,
  onDone,
}: PairRevealViewProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';
  // The partner must never look like a mirrored clone of you (audit F0.11): use their real geometry
  // when known, else derive a visibly different hand (mirror + deterministic nudge).
  const partner = partnerGeometry ?? differentiateGeometry(geometry);

  // The pair-score is the compat peak — a success haptic lands as it arrives (F1.11; kept on under
  // reduce-motion, no-op on web). Once per PAIR, not once per mount (CO-16): re-entering the screen
  // used to re-celebrate a score the user had already seen.
  useEffect(() => {
    if (claimCelebration(pairId)) success();
  }, [pairId]);

  return (
    <Screen scroll>
      <AppHeader title="Your compatibility" onBack={onBack} />

      {/* Hero: two palms slide in + red thread, then the gold score ring counts up (the headline). */}
      <View style={{ alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Animated.View entering={shouldAnimate ? SlideInLeft.duration(theme.motion.duration.slow) : undefined}>
            <PalmDiagram geometry={geometry} size={92} animate accessibilityLabel="Your palm" />
          </Animated.View>
          <RedThread animate />
          <Animated.View entering={shouldAnimate ? SlideInRight.duration(theme.motion.duration.slow) : undefined}>
            <PalmDiagram
              geometry={partner}
              size={92}
              animate
              accessibilityLabel={`${data.partnerName}'s palm`}
            />
          </Animated.View>
        </View>

        {/* ONE a11y node for the ring (CO-16): the label sat on a non-`accessible` View, so a
            screen reader read the ring's inner numeral and caption instead of the sentence. */}
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={`You and ${data.partnerName} — ${data.score} out of 100 compatible`}
          style={{ marginTop: theme.spacing.lg }}
        >
          <ScoreRing score={data.score} size={148} label="Compatibility" animate />
        </View>
        <Text variant="title" style={{ textAlign: 'center', marginTop: theme.spacing.lg }}>
          You &amp; {data.partnerName}
        </Text>
        <Text
          variant="bodyLarge"
          tone="secondary"
          style={{ textAlign: 'center', marginTop: theme.spacing.xs, maxWidth: 300 }}
        >
          {data.headline}
        </Text>
      </View>

      {/* Sub-scores fan in with dimension icons. */}
      <Card elevation="sm" style={{ marginTop: theme.spacing.xl }}>
        <View style={{ gap: theme.spacing.md }}>
          {data.subScores.map((s, i) => (
            <SubScoreBar key={s.key} dimKey={s.key} label={s.label} value={s.value} index={i} />
          ))}
        </View>
      </Card>

      {/* Both-sides narrative — only the blocks that HAVE prose (CO-16: a half-generated narrative
          used to print a heading over nothing). */}
      {narrativeBlocks(data).length > 0 ? (
        <View style={{ marginTop: theme.spacing.xl, gap: theme.spacing.lg }}>
          {narrativeBlocks(data).map((b) => (
            <NarrativeBlock key={b.title} title={b.title} body={b.body} />
          ))}
        </View>
      ) : null}

      <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.xl, marginBottom: theme.spacing.lg }}>
        {/* Only offered when a real reading resolved — the CTA used to push `/reveal` with no id,
            which loaded nothing and dropped the user on the error state at the emotional peak (SN-6). */}
        {onFullReading ? <Button label="See my full reading" variant="primary" fullWidth onPress={onFullReading} /> : null}
        <Button label="Share this match" variant="tonal" fullWidth onPress={onShare} />
        {onDone ? <Button label="Done" variant="ghost" fullWidth onPress={onDone} /> : null}
      </View>

      <Text variant="caption" tone="tertiary" style={{ textAlign: 'center', marginBottom: theme.spacing.lg }}>
        {DISCLAIMER_SHORT}
      </Text>
    </Screen>
  );
}

/** One dimension bar — an icon, the label, and the accent fill that grows in (staggered) to value. */
function SubScoreBar({ dimKey, label, value, index }: { dimKey: string; label: string; value: number; index: number }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';
  const clamped = Math.max(0, Math.min(100, value));
  const w = useSharedValue(shouldAnimate ? 0 : clamped);
  const base = theme.motion.duration.base;
  const stagger = theme.motion.stagger.reveal;
  useEffect(() => {
    if (!shouldAnimate) {
      w.value = clamped;
      return;
    }
    w.value = 0;
    w.value = withDelay(index * stagger, withTiming(clamped, { duration: base }));
  }, [shouldAnimate, clamped, index, w, base, stagger]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${w.value}%` }));

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
      <Icon name={dimIcon(dimKey)} size={18} color={theme.colors.textSecondary} decorative />
      {/* The label FLEXES and the value is a fixed-width tabular column (CO-16). At the app's own
          1.3× Dynamic Type cap a `width: 72` label clipped mid-word and the 28pt value column
          pushed the bars out of alignment row by row. */}
      <Text variant="bodyMedium" style={{ flex: 1 }} numberOfLines={2}>
        {label}
      </Text>
      <View
        style={{
          flex: 1,
          height: 8,
          borderRadius: 4,
          backgroundColor: theme.colors.surfaceSunken,
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={[{ height: 8, borderRadius: 4, backgroundColor: theme.colors.textSecondary }, fillStyle]}
        />
      </View>
      <Text
        variant="caption"
        tone="secondary"
        style={{ minWidth: 28, textAlign: 'right', fontVariant: ['tabular-nums'] }}
      >
        {value}
      </Text>
    </View>
  );
}

function NarrativeBlock({ title, body }: { title: string; body: string }) {
  const theme = useTheme();
  if (!body.trim()) return null;
  return (
    <View>
      <Text variant="heading">{title}</Text>
      <Text variant="body" tone="secondary" style={{ marginTop: theme.spacing.xs }}>
        {body}
      </Text>
    </View>
  );
}

/**
 * The calm waiting state, with a way forward (Audit-4 SH-15).
 *
 * It used to say "Weaving your red thread…" **forever** — no timeout, no nudge, no retry — so a
 * user whose partner never scanned sat on a spinner-with-no-spinner indefinitely. After 20s it
 * admits the wait; after 45s it offers the one action that can actually move things along.
 */
export function PairWaiting({
  partnerName,
  elapsedMs,
  onBack,
  onNudge,
}: {
  partnerName: string;
  elapsedMs: number;
  onBack?: () => void;
  /** Re-send the invite — the only lever the waiting side actually has. */
  onNudge?: () => void;
}) {
  const theme = useTheme();
  const level = waitingLevel(elapsedMs);
  const named = partnerName === 'Your match' ? 'your match' : partnerName;
  return (
    <Screen>
      <AppHeader onBack={onBack} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.lg }}>
        <RedThread animate />
        <Text variant="title" style={{ textAlign: 'center' }}>
          Weaving your red thread…
        </Text>
        <Text variant="bodyLarge" tone="secondary" style={{ textAlign: 'center', maxWidth: 300 }}>
          {level === 'calm'
            ? `Reading how your lines meet ${named}’s. This lands the moment both palms are in.`
            : level === 'slow'
              ? WAITING_SLOW_COPY
              : WAITING_NUDGE_COPY}
        </Text>
        {level === 'nudge' && onNudge ? (
          <Button label={`Remind ${named}`} variant="tonal" onPress={onNudge} />
        ) : null}
      </View>
    </Screen>
  );
}

/** Honest failure — a warm dead-end, exit via the header. */
export function PairNotice({ title, body, onBack }: { title: string; body: string; onBack?: () => void }) {
  const theme = useTheme();
  return (
    <Screen>
      <AppHeader onBack={onBack} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.md }}>
        <Text variant="title" style={{ textAlign: 'center' }}>
          {title}
        </Text>
        <Text variant="bodyLarge" tone="secondary" style={{ textAlign: 'center', maxWidth: 300 }}>
          {body}
        </Text>
      </View>
    </Screen>
  );
}
