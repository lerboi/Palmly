import { useEffect, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { PalmDiagram } from '@/components/palm-diagram/PalmDiagram';
import type { LineGeometry } from '@/components/palm-diagram/geometry';
import { AppHeader, Button, Icon, Logomark, Screen, Text } from '@/components/ui';
import type { IconName } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export interface ShareViewProps {
  geometry: LineGeometry;
  /** The one-line shareable essence (redesign §2.6). */
  headline: string;
  /** Compatibility score 0–100 for the compare variant. */
  score: number;
  partnerName: string;
  /** Compatibility blurb + dimension chips for the compat card. */
  blurb?: string;
  chips?: string[];
  /** Which preview to open on (default `solo`, per §2.6). */
  initialVariant?: Variant;
  onClose?: () => void;
}

type Variant = 'solo' | 'compat';

const CHANNELS: { icon: IconName; label: string }[] = [
  { icon: 'chat', label: 'Message' },
  { icon: 'thread', label: 'Copy link' },
  { icon: 'share', label: 'More' },
];

/**
 * The custom share sheet (UIUX §2.6/§2.7, redesign R16 / v2 V14) — a preview card with the traced
 * palm as the hero (draws on) + an editorial headline + a **filled** corner seal, a compatibility
 * variant (two palms whose heart lines light up, tied by the claret red-thread, a labeled score
 * ring + chips), a springy invite toggle, and a real tappable channel row. The two variants
 * crossfade and share a top-anchored slot so switching never jumps. The OS share sheet + per-country
 * brand channels are device-only ([~]); this is the in-app preview above them, seeded with a fixture.
 */
export function ShareView({
  geometry,
  headline,
  score,
  partnerName,
  blurb = 'A rare, easy resonance — you steady each other.',
  chips = ['Emotion', 'Mind', 'Energy', 'Destiny'],
  initialVariant = 'solo',
  onClose,
}: ShareViewProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';
  const [variant, setVariant] = useState<Variant>(initialVariant);
  const [invite, setInvite] = useState(true);

  return (
    <Screen>
      <AppHeader title="Share your reading" onBack={onClose} />

      <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.lg }}>
        <Segment label="My reading" active={variant === 'solo'} onPress={() => setVariant('solo')} />
        <Segment label="Compatibility" active={variant === 'compat'} onPress={() => setVariant('compat')} />
      </View>

      {/* Top-anchored slot so switching tabs never re-centres / jumps the card. */}
      <View style={{ flex: 1, justifyContent: 'flex-start' }}>
        {variant === 'solo' ? (
          <Animated.View key="solo" entering={shouldAnimate ? FadeIn.duration(theme.motion.duration.base) : undefined}>
            <SoloPreview geometry={geometry} headline={headline} />
          </Animated.View>
        ) : (
          <Animated.View key="compat" entering={shouldAnimate ? FadeIn.duration(theme.motion.duration.base) : undefined}>
            <CompatPreview geometry={geometry} score={score} partnerName={partnerName} blurb={blurb} chips={chips} />
          </Animated.View>
        )}
      </View>

      {/* Invite-to-compare toggle (default ON for compat, per §2.6). */}
      <Pressable
        onPress={() => setInvite((v) => !v)}
        accessibilityRole="switch"
        accessibilityState={{ checked: invite }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.md,
          paddingVertical: theme.spacing.md,
        }}
      >
        <Icon name="thread" size={22} color={theme.colors.heritageAccent} decorative />
        <Text variant="body" style={{ flex: 1 }}>
          Invite them to compare palms
        </Text>
        <Toggle on={invite} />
      </Pressable>

      {/* Channel row — real, tappable, branded. */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginVertical: theme.spacing.md }}>
        {CHANNELS.map((ch) => (
          <ChannelButton key={ch.label} icon={ch.icon} label={ch.label} onPress={onClose ?? (() => {})} />
        ))}
      </View>

      <Button
        label="Share"
        variant="primary"
        fullWidth
        icon={<Icon name="share" size={18} color={theme.colors.onAccent} decorative />}
        style={{ marginBottom: theme.spacing.md }}
        onPress={onClose}
      />
    </Screen>
  );
}

/** Shared reduce-motion-aware press-scale (native only; web / reduce-motion → resting). */
function usePressScale(min = 0.94) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';
  const [held, setHeld] = useState(false);
  const scale = useSharedValue(1);
  const press = theme.motion.spring.press;
  useEffect(() => {
    if (!shouldAnimate) {
      scale.value = 1;
      return;
    }
    scale.value = withSpring(held ? min : 1, press);
  }, [held, shouldAnimate, scale, press, min]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return { style, onPressIn: () => setHeld(true), onPressOut: () => setHeld(false) };
}

function Segment({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const theme = useTheme();
  const { style, onPressIn, onPressOut } = usePressScale(0.97);
  return (
    <Animated.View style={[{ flex: 1 }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        style={{
          alignItems: 'center',
          paddingVertical: theme.spacing.sm,
          borderRadius: theme.radii.md,
          backgroundColor: active ? theme.colors.accentMuted : theme.colors.surfaceSunken,
          borderWidth: theme.strokes.hairline,
          borderColor: active ? theme.colors.accent : 'transparent',
        }}
      >
        <Text variant="bodyMedium" color={active ? theme.colors.accent : theme.colors.textSecondary}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function ChannelButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const theme = useTheme();
  const { style, onPressIn, onPressOut } = usePressScale(0.9);
  return (
    <Animated.View style={style}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={{ alignItems: 'center', gap: theme.spacing.xs }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: theme.colors.accentMuted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={icon} size={24} color={theme.colors.accent} decorative />
        </View>
        <Text variant="caption" tone="secondary">
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

/** The invite toggle — the thumb springs across on change (native; web / reduce-motion → static). */
function Toggle({ on }: { on: boolean }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';
  const travel = 18; // track 46 − thumb 22 − padding 2·3
  const x = useSharedValue(on ? travel : 0);
  useEffect(() => {
    const target = on ? travel : 0;
    if (!shouldAnimate) {
      x.value = target;
      return;
    }
    x.value = withSpring(target, theme.motion.spring.press);
  }, [on, shouldAnimate, x, theme.motion.spring.press]);
  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View
      style={{
        width: 46,
        height: 28,
        borderRadius: 14,
        padding: 3,
        backgroundColor: on ? theme.colors.accent : theme.colors.border,
      }}
    >
      <Animated.View
        style={[{ width: 22, height: 22, borderRadius: 11, backgroundColor: theme.colors.surface }, thumbStyle]}
      />
    </View>
  );
}

/** A shared card footer — the wordmark + a filled claret corner seal. */
function CardSeal() {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.lg, alignSelf: 'stretch' }}>
      <Logomark size={24} tone="ink" />
      <Text variant="caption" tone="tertiary">
        palmly.app
      </Text>
      <View style={{ flex: 1 }} />
      <Logomark size={30} variant="stamp" filled tone="heritage" accessibilityLabel="Palmly seal" />
    </View>
  );
}

/** The share CARD preview — traced palm hero (draws on) + editorial headline + a filled seal. */
function SoloPreview({ geometry, headline }: { geometry: LineGeometry; headline: string }) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surfaceRaised,
          borderRadius: theme.radii.lg,
          padding: theme.spacing.xl,
          alignItems: 'center',
        },
        theme.shadow.lg,
      ]}
    >
      <PalmDiagram geometry={geometry} size={200} signatureLines={['heart_line', 'fate_line']} animate />
      <Text
        variant="editorialHeadline"
        style={{ textAlign: 'center', marginTop: theme.spacing.lg, fontSize: 24, lineHeight: 30 }}
      >
        {headline}
      </Text>
      <CardSeal />
    </View>
  );
}

/** The compatibility share card — two palms whose heart lines light up, tied by the claret thread,
 *  a labeled score ring + dimension chips. */
function CompatPreview({
  geometry,
  score,
  partnerName,
  blurb,
  chips,
}: {
  geometry: LineGeometry;
  score: number;
  partnerName: string;
  blurb: string;
  chips: string[];
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surfaceRaised,
          borderRadius: theme.radii.lg,
          padding: theme.spacing.xl,
          alignItems: 'center',
        },
        theme.shadow.lg,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
        <PalmDiagram geometry={geometry} size={84} highlightedLine="heart_line" animate silhouette={false} />
        <RedThread animate />
        <PalmDiagram
          geometry={geometry}
          size={84}
          highlightedLine="heart_line"
          animate
          silhouette={false}
          style={{ transform: [{ scaleX: -1 }] }}
        />
      </View>

      <View style={{ marginTop: theme.spacing.lg }}>
        <ScoreRing score={score} label="Compatibility" />
      </View>

      <Text
        variant="editorialHeadline"
        style={{ textAlign: 'center', marginTop: theme.spacing.lg, fontSize: 24, lineHeight: 30 }}
      >
        You &amp; {partnerName}
      </Text>
      <Text variant="body" tone="secondary" style={{ textAlign: 'center', marginTop: theme.spacing.xs }}>
        {blurb}
      </Text>

      {/* Dimension chips. */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
        {chips.map((chip) => (
          <View
            key={chip}
            style={{
              backgroundColor: theme.colors.accentMuted,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.xs,
              borderRadius: theme.radii.pill,
            }}
          >
            <Text variant="caption" color={theme.colors.accent}>
              {chip}
            </Text>
          </View>
        ))}
      </View>

      <CardSeal />
    </View>
  );
}

/**
 * The red-thread-of-fate motif (heritage claret — the ONLY non-seal heritage use, §3.2). Pass
 * `animate` to draw the thread on (~800ms, native only; reduce-motion / web → the static drawn
 * end-state). Used on claim, share/compat, and pair-reveal.
 */
export function RedThread({ animate = false }: { animate?: boolean }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = animate && !reduceMotion && Platform.OS !== 'web';
  const THREAD_LEN = 86; // approx path length → seeds the draw-on dash
  const progress = useSharedValue(1);
  useEffect(() => {
    if (!shouldAnimate) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, { duration: 800, easing: Easing.inOut(Easing.cubic) });
  }, [shouldAnimate, progress]);
  const threadProps = useAnimatedProps(() => ({ strokeDashoffset: THREAD_LEN * (1 - progress.value) }));
  return (
    <Svg width={72} height={60} viewBox="0 0 72 60">
      <AnimatedPath
        d="M4 30 C22 8, 50 52, 68 30"
        fill="none"
        stroke={theme.colors.heritageAccent}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray={THREAD_LEN}
        animatedProps={threadProps}
      />
      <Circle cx={4} cy={30} r={4} fill={theme.colors.heritageAccent} />
      <Circle cx={68} cy={30} r={4} fill={theme.colors.heritageAccent} />
    </Svg>
  );
}

/** The compatibility score ring — a gold arc + the big numeral, with an optional caption label
 *  shown BELOW the ring so a long label never collides with the arc. */
export function ScoreRing({ score, size = 96, label }: { score: number; size?: number; label?: string }) {
  const theme = useTheme();
  const d = size;
  const sw = Math.max(6, Math.round(size / 16));
  const r = d / 2 - sw / 2 - 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ alignItems: 'center', gap: theme.spacing.xs }}>
      <View style={{ width: d, height: d, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={d} height={d} style={{ position: 'absolute' }}>
          <Circle cx={d / 2} cy={d / 2} r={r} stroke={theme.colors.border} strokeWidth={sw} fill="none" />
          <Circle
            cx={d / 2}
            cy={d / 2}
            r={r}
            stroke={theme.colors.premium}
            strokeWidth={sw}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - score / 100)}
            transform={`rotate(-90 ${d / 2} ${d / 2})`}
          />
        </Svg>
        <Text variant="numeral" color={theme.colors.premium} style={{ fontSize: Math.round(size * 0.34) }}>
          {score}
        </Text>
      </View>
      {label ? (
        <Text variant="caption" tone="tertiary" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}
