import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
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
  FAILURE_TITLE,
  NOTIFY_COPY,
  NOTIFY_CTA,
  OVERRUN_SOFT,
  STAGES,
  failureHint,
  overrunLevel,
  socialProofAt,
  stageFor,
  visibleGeometry,
} from './analyzing';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface AnalyzingViewProps {
  geometry: LineGeometry;
  status: ScanStatus | null;
  elapsedMs: number;
  failureReason?: string | null;
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
  failureReason,
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
              <Icon name="camera" size={40} color={theme.colors.danger} decorative />
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
  const progress = (stage + 1) / STAGES.length;
  const message = overrun === 'soft' ? OVERRUN_SOFT : current.message;
  const proof = socialProofAt(elapsedMs);

  return (
    <Screen>
      <AppHeader onBack={onBack} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.xxl }}>
        <ProgressRing progress={progress} diagramSize={232}>
          <PalmDiagram
            geometry={visibleGeometry(geometry, stage)}
            size={232}
            highlightedLine={current.line ?? undefined}
            animate
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
            <Icon name="sparkle" size={13} color={theme.colors.accent} decorative />
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
  children,
}: {
  progress: number;
  diagramSize: number;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';
  const d = diagramSize + 56;
  const r = d / 2 - 6;
  const c = 2 * Math.PI * r;

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
  useEffect(() => {
    if (!shouldAnimate) {
      breath.value = 1;
      return;
    }
    breath.value = withRepeat(withTiming(0.4, { duration: 1400, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [shouldAnimate, breath]);
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
        <AnimatedCircle cx={d / 2} cy={d / 2} r={r} stroke={theme.colors.accent} strokeWidth={14} fill="none" animatedProps={glowProps} />
        {/* track */}
        <Circle cx={d / 2} cy={d / 2} r={r} stroke={theme.colors.border} strokeWidth={5} fill="none" />
        {/* progress arc */}
        <AnimatedCircle
          cx={d / 2}
          cy={d / 2}
          r={r}
          stroke="url(#ringAccent)"
          strokeWidth={5}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          animatedProps={arcProps}
          transform={`rotate(-90 ${d / 2} ${d / 2})`}
        />
      </Svg>
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
        { height: 8, borderRadius: 4, backgroundColor: filled ? theme.colors.accent : theme.colors.border },
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
