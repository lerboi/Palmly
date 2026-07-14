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
import type { LineGeometry } from '@/components/palm-diagram/geometry';
import { AppHeader, Button, Card, Icon, Screen, Text } from '@/components/ui';
import type { IconName } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/theme';
import { RedThread, ScoreRing } from './ShareView';

export interface PairSubScore {
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
  onBack?: () => void;
  onFullReading?: () => void;
  onShare?: () => void;
}

/** Sub-score dimension → feature line-icon. */
const DIM_ICON: Record<string, IconName> = {
  Emotion: 'heart',
  Mind: 'mind',
  Energy: 'life',
  Destiny: 'path',
  Elements: 'elements',
};

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
  onBack,
  onFullReading,
  onShare,
}: PairRevealViewProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';
  const partner = partnerGeometry ?? geometry;

  return (
    <Screen scroll>
      <AppHeader title="Your compatibility" onBack={onBack} />

      {/* Hero: two palms slide in + red thread, then the gold score ring counts up (the headline). */}
      <View style={{ alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Animated.View entering={shouldAnimate ? SlideInLeft.duration(theme.motion.duration.slow) : undefined}>
            <PalmDiagram geometry={geometry} size={92} animate silhouette={false} accessibilityLabel="Your palm" />
          </Animated.View>
          <RedThread animate />
          <Animated.View entering={shouldAnimate ? SlideInRight.duration(theme.motion.duration.slow) : undefined}>
            <PalmDiagram
              geometry={partner}
              size={92}
              animate
              silhouette={false}
              accessibilityLabel={`${data.partnerName}'s palm`}
              style={{ transform: [{ scaleX: -1 }] }}
            />
          </Animated.View>
        </View>

        <View
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
            <SubScoreBar key={s.label} label={s.label} value={s.value} index={i} />
          ))}
        </View>
      </Card>

      {/* Both-sides narrative. */}
      <View style={{ marginTop: theme.spacing.xl, gap: theme.spacing.lg }}>
        <NarrativeBlock title="Where you click" body={data.click} />
        <NarrativeBlock title="Where you'll stretch each other" body={data.stretch} />
      </View>

      <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.xl, marginBottom: theme.spacing.lg }}>
        <Button label="See my full reading" variant="primary" fullWidth onPress={onFullReading} />
        <Button label="Share this match" variant="tonal" fullWidth onPress={onShare} />
      </View>

      <Text variant="caption" tone="tertiary" style={{ textAlign: 'center', marginBottom: theme.spacing.lg }}>
        For reflection and entertainment.
      </Text>
    </Screen>
  );
}

/** One dimension bar — an icon, the label, and the accent fill that grows in (staggered) to value. */
function SubScoreBar({ label, value, index }: { label: string; value: number; index: number }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';
  const clamped = Math.max(0, Math.min(100, value));
  const w = useSharedValue(shouldAnimate ? 0 : clamped);
  const base = theme.motion.duration.base;
  useEffect(() => {
    if (!shouldAnimate) {
      w.value = clamped;
      return;
    }
    w.value = 0;
    w.value = withDelay(index * 90, withTiming(clamped, { duration: base }));
  }, [shouldAnimate, clamped, index, w, base]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${w.value}%` }));

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
      <Icon name={DIM_ICON[label] ?? 'sparkle'} size={18} color={theme.colors.accent} decorative />
      <Text variant="bodyMedium" style={{ width: 72 }}>
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
          style={[{ height: 8, borderRadius: 4, backgroundColor: theme.colors.accent }, fillStyle]}
        />
      </View>
      <Text variant="caption" tone="secondary" style={{ width: 28, textAlign: 'right' }}>
        {value}
      </Text>
    </View>
  );
}

function NarrativeBlock({ title, body }: { title: string; body: string }) {
  const theme = useTheme();
  return (
    <View>
      <Text variant="heading">{title}</Text>
      <Text variant="body" tone="secondary" style={{ marginTop: theme.spacing.xs }}>
        {body}
      </Text>
    </View>
  );
}
