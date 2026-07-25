import { Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppHeader, Icon, Logomark, Screen, Text } from '@/components/ui';
import type { IconName } from '@/components/ui';
import { PalmDiagram } from '@/components/palm-diagram/PalmDiagram';
import { ABSTRACT_GEOMETRY } from '@/features/reading/reveal';
import { useReducedMotion, useTheme } from '@/theme';
import { CANONICAL_DELETION_PROMISE, DISCLAIMER_FULL } from '@/lib/trustCopy';
import { PrivacyTrustCard } from './settingsUi';

interface StepDef {
  icon: IconName;
  title: string;
  body: string;
  /** F2.T3 §5.8: render the self-drawing PalmDiagram under this step to *demonstrate* the trace. */
  diagram?: boolean;
}

/** The three-step "how a reading is made" pipeline (UIUX §2.5) — landmarks → traced lines → classics. */
const STEPS: StepDef[] = [
  {
    icon: 'camera',
    title: 'We map your hand',
    body: 'On your device, we detect your hand’s landmarks — the joints and creases — and check the framing, so a blurry or non-hand photo never becomes a reading.',
  },
  {
    icon: 'palm',
    title: 'We trace your lines',
    body: 'Your major lines — heart, head, life and fate — are traced into an engraved diagram. From here we work only from that diagram — never the photo.',
    diagram: true,
  },
  {
    icon: 'elements',
    title: 'We read the classics',
    body: 'Your traced features are matched to centuries of palmistry and face-reading descriptions — so the same palm always yields the same reading.',
  },
];

/**
 * "How Palmly reads" (UIUX §2.5 methodology, redesign v2 V20) — transparency as differentiation,
 * now an **animated timeline**: numbered accent nodes joined by a connector rail, a feature icon per
 * step, staggered entrance, and the shared privacy trust card. English-first, no CJK. No crystal balls.
 */
export function MethodologyScreen() {
  const theme = useTheme();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';

  return (
    <Screen scroll>
      <AppHeader title="How Palmly reads" onBack={() => router.back()} />
      {/* Heritage touch (§5.4 #3): a small claret seal marks the methodology — the authenticity signature. */}
      <View style={{ alignItems: 'center', marginBottom: theme.spacing.lg }}>
        <Logomark variant="stamp" filled tone="heritage" size={44} accessibilityLabel="" />
      </View>
      <Text variant="body" tone="secondary" style={{ marginBottom: theme.spacing.xl }}>
        Transparency is the point — here is exactly how your reading is made. No crystal balls.
      </Text>

      <View style={{ marginBottom: theme.spacing.xl }}>
        {STEPS.map((s, i) => (
          <TimelineStep key={s.title} step={s} index={i} last={i === STEPS.length - 1} shouldAnimate={shouldAnimate} />
        ))}
      </View>

      <PrivacyTrustCard headline="Your photo is never kept">
        <Text variant="body" tone="secondary">
          {CANONICAL_DELETION_PROMISE}
        </Text>
        <Text variant="body" tone="secondary">
          Same palm, same reading — your lines don’t lie.
        </Text>
        <Text variant="body" tone="secondary">
          {DISCLAIMER_FULL}
        </Text>
      </PrivacyTrustCard>
    </Screen>
  );
}

/** One timeline step — a numbered accent node + connector rail on the left, feature icon + copy on
 *  the right. The connector `flex:1` fills the row height down to the next node. */
function TimelineStep({ step, index, last, shouldAnimate }: { step: StepDef; index: number; last: boolean; shouldAnimate: boolean }) {
  const theme = useTheme();
  const node = 36;
  return (
    <Animated.View
      entering={
        shouldAnimate ? FadeInDown.delay(index * theme.motion.stagger.reveal).duration(theme.motion.duration.base) : undefined
      }
      style={{ flexDirection: 'row', gap: theme.spacing.md }}
    >
      {/* Left rail — the numbered node (the tokenized step badge) + a connector to the next step. */}
      <View style={{ alignItems: 'center', width: node }}>
        <View
          style={{
            width: node,
            height: node,
            borderRadius: node / 2,
            backgroundColor: theme.colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text variant="bodyMedium" color={theme.colors.onAccent}>
            {index + 1}
          </Text>
        </View>
        {!last ? (
          <View
            style={{
              flex: 1,
              width: theme.strokes.bold,
              minHeight: theme.spacing.md,
              backgroundColor: theme.colors.border,
              marginVertical: theme.spacing.xs,
            }}
          />
        ) : null}
      </View>

      <View style={{ flex: 1, paddingBottom: last ? 0 : theme.spacing.xl }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, minHeight: node }}>
          <Icon name={step.icon} size={18} color={theme.colors.textSecondary} decorative />
          <Text variant="heading" style={{ flex: 1 }}>
            {step.title}
          </Text>
        </View>
        <Text variant="body" tone="secondary" style={{ marginTop: theme.spacing.xs }}>
          {step.body}
        </Text>
        {/* F2.T3 §5.8: the trace step DEMONSTRATES — the diagram self-draws (settled under reduce-motion
            / web). ABSTRACT_GEOMETRY is correct here: this page is about the method, not the user's data. */}
        {step.diagram ? (
          <View style={{ alignItems: 'center', marginTop: theme.spacing.md }}>
            <PalmDiagram
              geometry={ABSTRACT_GEOMETRY}
              size={180}
              animate={shouldAnimate}
              signatureLines={['heart_line', 'fate_line']}
            />
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}
