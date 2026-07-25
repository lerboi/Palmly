import { useEffect } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { PalmDiagram } from '@/components/palm-diagram/PalmDiagram';
import type { LineGeometry } from '@/components/palm-diagram/geometry';
import { AppHeader, Button, Icon, Screen, Text } from '@/components/ui';
import type { ScanStatus } from '@/lib/useScanStatus';
import { useReducedMotion, useTheme } from '@/theme';
import {
  ABSTRACT_PALM_LABEL,
  FAILURE_TITLE,
  NOTIFY_COPY,
  NOTIFY_CTA,
  OVERRUN_SOFT,
  RING_GLOW_WIDTH,
  RING_TRACK_WIDTH,
  STAGES,
  analyzingProgress,
  failureHint,
  overrunLevel,
  ringGeometry,
  socialProofAt,
  stageFor,
  stageMessage,
  visibleGeometry,
} from './analyzing';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface AnalyzingViewProps {
  geometry: LineGeometry;
  status: ScanStatus | null;
  elapsedMs: number;
  /** The just-captured/uploaded photo (a local URI) shown faintly UNDER the tracing — the "we're
   *  working on MY hand" trust beat (audit §7 P5 / F1.4). Absent → the diagram alone. */
  capturedImageUri?: string;
  failureReason?: string | null;
  /** Non-null when the status fetch is currently failing — the hook keeps re-polling; the loader
   *  shows a quiet "retrying" caption so a bad connection is never a silent hang. */
  connectionError?: string | null;
  /** The geometry really is this reader's (a rescan with a stored reading) — so the possessive copy
   *  and the "Your palm" label are TRUE. Default false: a first scan traces an abstract motif until
   *  extraction produces real lines (Audit-4 SH-7). */
  ownGeometry?: boolean;
  onNotifyMe?: () => void;
  onRetry?: () => void;
  onUploadInstead?: () => void;
  onBack?: () => void;
}

/**
 * Analyzing loader (UIUX §2.4, redesign R14 / v2 V12) — the anticipation builder. Their own palm
 * traces itself progressively (each revealed line self-draws) inside a **live** accent progress
 * ring (an animated sweep + a gradient + an ambient breath so it never reads hung), a step
 * indicator whose active dot animates, a crossfading stage message, and a rotating social-proof
 * chip, with the 45s-soften / 75s-notify-me overrun path. A failure stays Palmly — a faint palm
 * behind, a warm `danger` tone (not the CTA hue), and a calm one-tap retry. The live per-line
 * self-draw + the continuous ring/breath are device follow-ups ([~]); web renders the static
 * end-state.
 */
export function AnalyzingView({
  geometry,
  status,
  elapsedMs,
  capturedImageUri,
  failureReason,
  connectionError,
  ownGeometry = false,
  onNotifyMe,
  onRetry,
  onUploadInstead,
  onBack,
}: AnalyzingViewProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';

  if (status === 'failed') {
    const entering = shouldAnimate ? FadeIn.duration(theme.motion.duration.slow) : undefined;
    return (
      <Screen>
        <AppHeader onBack={onBack} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {/* Still-Palmly: a faint palm sits behind the message so a failure isn't a dead-end. */}
          <View style={styles.failGhost} pointerEvents="none">
            <PalmDiagram geometry={geometry} size={220} accessibilityLabel="" style={{ opacity: 0.1 }} />
          </View>
          <Animated.View entering={entering} style={{ alignItems: 'center', gap: theme.spacing.lg }}>
            <View
              style={{
                width: 88,
                height: 88,
                borderRadius: theme.radii.xl,
                backgroundColor: theme.colors.surfaceSunken,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="warning" size={40} color={theme.colors.danger} decorative />
            </View>
            <Text variant="title" style={{ textAlign: 'center' }}>
              {FAILURE_TITLE}
            </Text>
            <Text variant="bodyLarge" tone="secondary" style={{ textAlign: 'center', maxWidth: 300 }}>
              {failureHint(failureReason)}
            </Text>
          </Animated.View>
        </View>
        <View style={{ gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
          <Button label="Try again" variant="primary" fullWidth onPress={onRetry} />
          <Button label="Upload a photo instead" variant="secondary" fullWidth onPress={onUploadInstead ?? onRetry} />
        </View>
      </Screen>
    );
  }

  const stage = stageFor(status, elapsedMs);
  const overrun = overrunLevel(elapsedMs);
  const current = STAGES[stage];
  // Creeps 75 → 92% through the long extraction stage instead of parking at 75% (CO-13).
  const progress = analyzingProgress(stage, elapsedMs);
  const message = overrun === 'soft' ? OVERRUN_SOFT : stageMessage(stage, ownGeometry);
  const proof = socialProofAt(elapsedMs);

  return (
    <Screen>
      <AppHeader onBack={onBack} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.xxl }}>
        <ProgressRing progress={progress} diagramSize={232} photoUri={capturedImageUri}>
          <PalmDiagram
            geometry={visibleGeometry(geometry, stage)}
            size={232}
            highlightedLine={current.line ?? undefined}
            animate
            accessibilityLabel={ownGeometry ? 'Your palm line diagram' : ABSTRACT_PALM_LABEL}
          />
        </ProgressRing>

        <View style={{ alignItems: 'center', gap: theme.spacing.md }}>
          <Animated.View key={message} entering={shouldAnimate ? FadeIn : undefined} exiting={shouldAnimate ? FadeOut : undefined}>
            <Text variant="title" style={{ textAlign: 'center' }}>
              {message}
            </Text>
          </Animated.View>
          <StepDots count={STAGES.length} active={stage} />
          {/* Elevated + rotating social-proof chip. */}
          <Animated.View
            key={proof}
            entering={shouldAnimate ? FadeIn : undefined}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.xs,
              backgroundColor: theme.colors.surfaceSunken,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.xs,
              borderRadius: theme.radii.pill,
            }}
          >
            <Icon name="sparkle" size={13} color={theme.colors.textSecondary} decorative />
            <Text variant="caption" tone="secondary">
              {proof}
            </Text>
          </Animated.View>
        </View>

        {overrun === 'notify' ? (
          <View style={{ alignItems: 'center', gap: theme.spacing.sm }}>
            <Text variant="body" tone="secondary" style={{ textAlign: 'center' }}>
              {NOTIFY_COPY}
            </Text>
            <Button label={NOTIFY_CTA} variant="tonal" onPress={onNotifyMe} />
          </View>
        ) : null}

        {/* A failing status fetch never hangs silently — the hook keeps re-polling; say so quietly.
            Direction §5: "Still connecting…", not "Trouble reaching the server" — the old line named
            OUR infrastructure at the exact moment the user is already anxious about their reading. */}
        {connectionError ? (
          <Text variant="caption" tone="tertiary" style={{ textAlign: 'center' }}>
            Still connecting…
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

/**
 * A **live** accent progress arc encircling the traced palm — the offset sweeps to the current
 * stage (withTiming), the stroke is an accent→accentPressed gradient, and a faint glow ring
 * breathes so it never reads hung. Web / reduce-motion → the settled static end-state.
 */
function ProgressRing({
  progress,
  diagramSize,
  photoUri,
  children,
}: {
  progress: number;
  diagramSize: number;
  /** The just-captured photo, drawn faintly UNDER the tracing and CONCENTRIC with the ring. */
  photoUri?: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';
  // Padded viewport + a radius the glow fits inside (CO-13) — the math is pure and unit-tested.
  const { size: d, cx, cy, r, circumference: c } = ringGeometry(diagramSize);
  const photo = diagramSize - 36;

  const p = useSharedValue(progress);
  useEffect(() => {
    if (!shouldAnimate) {
      p.value = progress;
      return;
    }
    p.value = withTiming(progress, { duration: theme.motion.duration.slow, easing: Easing.inOut(Easing.cubic) });
  }, [progress, shouldAnimate, p, theme.motion.duration.slow]);
  const arcProps = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - p.value) }));

  const breath = useSharedValue(1);
  const breathMs = theme.motion.duration.breath;
  useEffect(() => {
    if (!shouldAnimate) {
      breath.value = 1;
      return;
    }
    breath.value = withRepeat(withTiming(0.4, { duration: breathMs, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [shouldAnimate, breath, breathMs]);
  const glowProps = useAnimatedProps(() => ({ strokeOpacity: 0.05 + 0.1 * breath.value }));

  return (
    <View style={{ width: d, height: d, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={d} height={d} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="ringAccent" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={theme.colors.accent} />
            <Stop offset="1" stopColor={theme.colors.accentPressed} />
          </LinearGradient>
        </Defs>
        {/* breathing glow */}
        <AnimatedCircle cx={cx} cy={cy} r={r} stroke={theme.colors.accent} strokeWidth={RING_GLOW_WIDTH} fill="none" animatedProps={glowProps} />
        {/* track */}
        <Circle cx={cx} cy={cy} r={r} stroke={theme.colors.border} strokeWidth={RING_TRACK_WIDTH} fill="none" />
        {/* Progress arc — omitted entirely at 0 (CO-13: a round cap on an empty arc drew a nub,
            so an unstarted ring looked like it had already made progress). */}
        {progress > 0 ? (
          <AnimatedCircle
            cx={cx}
            cy={cy}
            r={r}
            stroke="url(#ringAccent)"
            strokeWidth={RING_TRACK_WIDTH}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={c}
            animatedProps={arcProps}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        ) : null}
      </Svg>
      {/* The reader's OWN photo, faint under the tracing (audit §7 P5) — positioned from the ring's
          centre, not a hand-tuned `top`, which had it sitting 28px off the ring's axis (CO-13). */}
      {photoUri ? (
        <Image
          source={{ uri: photoUri }}
          accessibilityLabel=""
          style={{
            position: 'absolute',
            width: photo,
            height: photo,
            borderRadius: photo / 2,
            opacity: 0.28,
            left: cx - photo / 2,
            top: cy - photo / 2,
          }}
        />
      ) : null}
      {children}
    </View>
  );
}

/** Step indicator — one dot per pipeline stage; filled up to the active stage, active dot widens. */
function StepDots({ count, active }: { count: number; active: number }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
      {Array.from({ length: count }).map((_, i) => (
        <Dot key={i} filled={i <= active} isActive={i === active} />
      ))}
    </View>
  );
}

function Dot({ filled, isActive }: { filled: boolean; isActive: boolean }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';
  const w = useSharedValue(isActive ? 20 : 8);
  const base = theme.motion.duration.base;
  useEffect(() => {
    const target = isActive ? 20 : 8;
    if (!shouldAnimate) {
      w.value = target;
      return;
    }
    w.value = withTiming(target, { duration: base });
  }, [isActive, shouldAnimate, w, base]);
  const style = useAnimatedStyle(() => ({ width: w.value }));
  return (
    <Animated.View
      style={[
        { height: 8, borderRadius: 4, backgroundColor: filled ? theme.colors.textSecondary : theme.colors.border },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  failGhost: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
