import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { PalmDiagram } from '@/components/palm-diagram/PalmDiagram';
import type { LineGeometry } from '@/components/palm-diagram/geometry';
import { AppHeader, Button, Card, Icon, Logomark, PrivacyBadge, Screen, Text } from '@/components/ui';
import type { IconName } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/theme';
import { type Reading, type ReadingSection, freeSections, lockedSections, traditionFootnote } from './reveal';

export type RevealState = 'ready' | 'pending' | 'error';

export interface RevealViewProps {
  reading: Reading;
  geometry: LineGeometry;
  /** `pending` while the reading loads, `error` on load failure (redesign R15). Default `ready`. */
  state?: RevealState;
  onBack?: () => void;
  onRetry?: () => void;
}

/** Section key → feature line-icon (redesign §2 — distinct per section, no repeated `sparkle`). */
const SECTION_ICON: Record<string, IconName> = {
  hand_shape: 'palm',
  heart: 'heart',
  head: 'mind',
  life: 'life',
  fate: 'path',
  mounts: 'streak',
  markings: 'sparkle',
};

/** Rotating reassurance for the living "drawing" pending state. */
const PENDING_LINES = [
  'Tracing your lines…',
  'Cross-checking the classics…',
  'Your photo is deleted after your reading',
];

/**
 * The reading reveal (UIUX §2.5, redesign R15 / v2 V13) — the "wow". The user's own palm traces
 * itself as the hero, an **editorial** headline rises, and icon-led section cards **stagger** in
 * (draw → headline → 90ms cards). Locked premium depth teases behind the paywall, the compatibility
 * hook, a branded **seal** share affordance, and a single trust footer. English-first, no decorative
 * CJK. A living pending state + an honest error state.
 */
export function RevealView({ reading, geometry, state = 'ready', onBack, onRetry }: RevealViewProps) {
  const theme = useTheme();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';
  const back = onBack ?? (() => router.back());
  const enter = (i: number) =>
    shouldAnimate ? FadeInDown.delay(i * theme.motion.stagger.reveal).duration(theme.motion.duration.base) : undefined;

  if (state === 'pending') return <PendingReveal geometry={geometry} onBack={back} />;
  if (state === 'error') return <ErrorReveal geometry={geometry} onBack={back} onRetry={onRetry} />;

  const free = freeSections(reading);
  const locked = lockedSections(reading);
  // A running entrance index so the hero and every card stagger in document order.
  let n = 0;

  return (
    <View style={{ flex: 1 }}>
      <Screen scroll>
        <AppHeader onBack={back} />
        {/* ── Hero: the palm draws itself, then the editorial headline rises ── */}
        <View style={{ alignItems: 'center', marginBottom: theme.spacing.xl }}>
          <PalmDiagram geometry={geometry} size={260} signatureLines={['heart_line', 'fate_line']} animate />
          <Animated.View entering={enter(n++)}>
            <Text variant="editorialHeadline" style={{ textAlign: 'center', marginTop: theme.spacing.lg }}>
              {reading.headline}
            </Text>
          </Animated.View>
          {reading.summary ? (
            <Animated.View entering={enter(n++)}>
              <Text variant="bodyLarge" tone="secondary" style={{ textAlign: 'center', marginTop: theme.spacing.sm }}>
                {reading.summary}
              </Text>
            </Animated.View>
          ) : null}
        </View>

        {/* ── Free section cards; the compatibility hook lives inside the reading (P2) ── */}
        {free.map((section, i) => (
          <View key={section.key}>
            <Animated.View entering={enter(n++)}>
              <SectionCard section={section} />
            </Animated.View>
            {i === 1 ? (
              <Animated.View entering={enter(n++)}>
                <CompareCard onPress={() => router.push('/share')} />
              </Animated.View>
            ) : null}
          </View>
        ))}

        {/* ── Locked premium depth → paywall (real, code-derived title; no premium prose) ── */}
        {locked.length > 0 ? (
          <View style={{ marginTop: theme.spacing.sm }}>
            <Text variant="heading" style={{ marginBottom: theme.spacing.md }}>
              Go deeper
            </Text>
            {locked.map((section) => (
              <Animated.View key={section.key} entering={enter(n++)}>
                <LockedCard section={section} onUnlock={() => router.push('/paywall')} />
              </Animated.View>
            ))}
          </View>
        ) : null}

        <TrustFooter onMethodology={() => router.push('/methodology')} />
        <FaceOfferCard onPress={() => router.push('/face')} />

        {reading.disclaimer ? (
          <Text variant="caption" tone="tertiary" style={{ textAlign: 'center', marginTop: theme.spacing.lg }}>
            {reading.disclaimer}
          </Text>
        ) : null}
      </Screen>

      {/* ── Persistent share affordance: a branded corner-seal (claret), not a generic FAB ── */}
      <SealFab onPress={() => router.push('/share')} shouldAnimate={shouldAnimate} />
    </View>
  );
}

/** Living "drawing" pending state — the palm draws itself + breathes, with a rotating reassurance. */
function PendingReveal({ geometry, onBack }: { geometry: LineGeometry; onBack: () => void }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';
  const proof = useRotating(PENDING_LINES, 2800, shouldAnimate);

  const breath = useSharedValue(1);
  useEffect(() => {
    if (!shouldAnimate) {
      breath.value = 1;
      return;
    }
    breath.value = withRepeat(withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [shouldAnimate, breath]);
  const breathStyle = useAnimatedStyle(() => ({ opacity: 0.82 + 0.18 * breath.value }));

  return (
    <Screen>
      <AppHeader onBack={onBack} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.lg }}>
        <Animated.View style={breathStyle}>
          <PalmDiagram geometry={geometry} size={200} signatureLines={['heart_line', 'fate_line']} animate />
        </Animated.View>
        <Text variant="title" style={{ textAlign: 'center' }}>
          Drawing your reading…
        </Text>
        <Animated.View key={proof} entering={shouldAnimate ? FadeIn : undefined}>
          <Text variant="small" tone="tertiary" style={{ textAlign: 'center' }}>
            {proof}
          </Text>
        </Animated.View>
        <PrivacyBadge />
      </View>
    </Screen>
  );
}

/** Honest error — a faint palm keeps it Palmly; "Try again" only appears when a real retry exists. */
function ErrorReveal({
  geometry,
  onBack,
  onRetry,
}: {
  geometry: LineGeometry;
  onBack: () => void;
  onRetry?: () => void;
}) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';
  return (
    <Screen>
      <AppHeader onBack={onBack} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={styles.ghost} pointerEvents="none">
          <PalmDiagram geometry={geometry} size={200} accessibilityLabel="" style={{ opacity: 0.1 }} />
        </View>
        <Animated.View
          entering={shouldAnimate ? FadeIn.duration(theme.motion.duration.slow) : undefined}
          style={{ alignItems: 'center', gap: theme.spacing.lg }}
        >
          <Text variant="title" style={{ textAlign: 'center' }}>
            We couldn&apos;t load your reading
          </Text>
          <Text variant="bodyLarge" tone="secondary" style={{ textAlign: 'center', maxWidth: 300 }}>
            Your lines are safe — this was just a hiccup on our side.
          </Text>
        </Animated.View>
      </View>
      <View style={{ gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
        {onRetry ? <Button label="Try again" variant="primary" fullWidth onPress={onRetry} /> : null}
        <Button label="Go back" variant={onRetry ? 'secondary' : 'primary'} fullWidth onPress={onBack} />
      </View>
    </Screen>
  );
}

/** A rounded tinted tile holding a feature icon — the section marker (echoes the section's line). */
function FeatureIcon({
  icon,
  tone = 'accent',
  size = 44,
}: {
  icon: IconName;
  tone?: 'accent' | 'heritage' | 'premium';
  size?: number;
}) {
  const theme = useTheme();
  const color =
    tone === 'heritage' ? theme.colors.heritageAccent : tone === 'premium' ? theme.colors.premium : theme.colors.accent;
  const bg = tone === 'accent' ? theme.colors.accentMuted : theme.colors.surfaceSunken;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: theme.radii.md,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} size={Math.round(size * 0.5)} color={color} decorative />
    </View>
  );
}

function SectionCard({ section }: { section: ReadingSection }) {
  const theme = useTheme();
  return (
    <Card elevation="sm" style={{ marginBottom: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <FeatureIcon icon={SECTION_ICON[section.key] ?? 'sparkle'} />
        <View style={{ flex: 1 }}>
          <Text variant="heading">{section.title}</Text>
          {section.body ? (
            <Text variant="body" style={{ marginTop: theme.spacing.sm }}>
              {section.body}
            </Text>
          ) : null}
          <Text variant="caption" tone="tertiary" style={{ marginTop: theme.spacing.sm }}>
            {traditionFootnote(section)}
          </Text>
        </View>
      </View>
    </Card>
  );
}

function CompareCard({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  return (
    <Card elevation="md" style={{ marginBottom: theme.spacing.md, alignItems: 'center' }}>
      <FeatureIcon icon="thread" tone="heritage" />
      <Text variant="title" style={{ textAlign: 'center', marginTop: theme.spacing.sm }}>
        Compare with a friend
      </Text>
      <Text
        variant="body"
        tone="secondary"
        style={{ textAlign: 'center', marginTop: theme.spacing.sm, marginBottom: theme.spacing.md }}
      >
        Tie a red thread — see how your palms line up.
      </Text>
      <Button label="Compare palms" onPress={onPress} fullWidth />
    </Card>
  );
}

function LockedCard({ section, onUnlock }: { section: ReadingSection; onUnlock: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onUnlock} accessibilityRole="button" accessibilityLabel={`Unlock ${section.title}`}>
      <Card elevation="sm" style={{ marginBottom: theme.spacing.md }}>
        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <FeatureIcon icon="lock" tone="premium" size={44} />
          <View style={{ flex: 1 }}>
            {/* The title IS the tease: it is code-derived from the deterministic claim skeleton, so
                it says "you have a Fate Line chapter" without generating — or leaking — a word of
                the premium prose. There is no `teaser` field by design (M12a / D-25). */}
            <Text variant="bodyMedium">{section.title}</Text>
            <Text variant="caption" tone="premium" style={{ marginTop: theme.spacing.sm }}>
              Unlock with Premium
            </Text>
          </View>
          <Icon name="chevron" size={20} color={theme.colors.textTertiary} decorative />
        </View>
      </Card>
    </Pressable>
  );
}

function TrustFooter({ onMethodology }: { onMethodology: () => void }) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: theme.spacing.sm, marginVertical: theme.spacing.lg }}>
      <Text variant="small" tone="secondary" style={{ textAlign: 'center' }}>
        Same palm, same reading. Rescan anytime — your lines don&apos;t lie.
      </Text>
      <PrivacyBadge />
      <Pressable onPress={onMethodology} accessibilityRole="link">
        <Text variant="small" color={theme.colors.accent}>
          How Palmly reads →
        </Text>
      </Pressable>
    </View>
  );
}

function FaceOfferCard({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  return (
    <Card elevation="sm" style={{ marginBottom: theme.spacing.xl }}>
      <View style={{ flexDirection: 'row', gap: theme.spacing.md, alignItems: 'center' }}>
        <FeatureIcon icon="face" />
        <Text variant="heading" style={{ flex: 1 }}>
          Your face tells the other half
        </Text>
      </View>
      <Text variant="body" tone="secondary" style={{ marginTop: theme.spacing.sm, marginBottom: theme.spacing.md }}>
        Run the same reading on your face — proportions, features, and what they reveal.
      </Text>
      <Button label="Read my face" variant="secondary" onPress={onPress} />
    </Card>
  );
}

/** The share affordance as a branded corner-seal (claret Logomark stamp) with a press-spring +
 *  entrance. Native-only spring/scroll-in [~]; web renders the settled seal. */
function SealFab({ onPress, shouldAnimate }: { onPress: () => void; shouldAnimate: boolean }) {
  const theme = useTheme();
  const [held, setHeld] = useState(false);
  const scale = useSharedValue(1);
  const press = theme.motion.spring.press;
  useEffect(() => {
    if (!shouldAnimate) {
      scale.value = 1;
      return;
    }
    scale.value = withSpring(held ? 0.92 : 1, press);
  }, [held, shouldAnimate, scale, press]);
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      entering={shouldAnimate ? FadeIn.delay(theme.motion.duration.slow).duration(theme.motion.duration.base) : undefined}
      style={[{ position: 'absolute', right: theme.spacing.lg, bottom: theme.spacing.xl }, scaleStyle]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={() => setHeld(true)}
        onPressOut={() => setHeld(false)}
        accessibilityRole="button"
        accessibilityLabel="Share this reading"
      >
        <View style={[{ borderRadius: theme.radii.md }, theme.shadow.md]}>
          <Logomark variant="stamp" filled tone="heritage" size={56} accessibilityLabel="" />
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** Rotate through `items` every `intervalMs` on native; web / reduce-motion holds the first item. */
function useRotating<T>(items: T[], intervalMs: number, active: boolean): T {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setI((x) => (x + 1) % items.length), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs, items.length]);
  return items[i];
}

const styles = StyleSheet.create({
  ghost: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
