import { Platform, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PalmDiagram } from '@/components/palm-diagram/PalmDiagram';
import type { LineGeometry } from '@/components/palm-diagram/geometry';
import { Button, Card, Icon, Skeleton, Text } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/theme';
import type { Pulse } from '@/lib/pulseData';
import { ChapterChip } from './ChapterChip';
import type { DescribedChapter } from './chapters';
import { FEATURE_LINE, featureEyebrow, featureLabel } from './pulseMath';
import { PulseSeal } from './PulseSeal';

export interface PulseCardProps {
  /** Which of the reader's own features today reads. */
  featureKey: string;
  /** Today's content. Absent until revealed is irrelevant — the card holds it either way. */
  pulse: Pulse;
  /** The reader's OWN line geometry. Empty renders the card without a diagram, never a stock palm. */
  geometry: LineGeometry;
  chapter?: DescribedChapter | null;
  premium: boolean;
  revealed: boolean;
  locale?: string;
  onReveal: () => void;
  /** Open the on-device palm ritual. Absent (web / unsupported) hides the link entirely. */
  onSealWithPalm?: () => void;
  onUnlock?: () => void;
  onOpenChapter?: () => void;
  onAsk?: (prefill: string) => void;
}

/**
 * Today's Line (Audit-5 · 02 §4) — the Today tab's single `md` hero.
 *
 * The whole design argument in one card: the reader's OWN feature, drawn from their OWN geometry,
 * read through today's pillar, revealed once a day by a deliberate gesture. Everything the almanac
 * card does generically, this does personally — which is why it takes the hero elevation and the
 * almanac gives it up (02 §3).
 *
 * States S1 (unrevealed) → S2 (the reveal transition) → S3/S4 (free / premium). S0 and S5 are
 * {@link PulseCardSkeleton} and {@link PulseCardError}, kept as separate exports so the screen picks
 * exactly one and never renders a half-populated hero.
 */
export function PulseCard({
  featureKey,
  pulse,
  geometry,
  chapter,
  premium,
  revealed,
  locale,
  onReveal,
  onSealWithPalm,
  onUnlock,
  onOpenChapter,
  onAsk,
}: PulseCardProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';
  const hasGeometry = Object.keys(geometry).length > 0;
  const line = FEATURE_LINE[featureKey];

  // The unfold staggers AFTER the line lands — the hero animates first (Direction §3), so the
  // essence arrives onto a drawn line rather than racing it.
  const unfold = (i: number) =>
    shouldAnimate ? FadeInDown.delay(i * theme.motion.stagger.reveal).duration(theme.motion.duration.base) : undefined;

  return (
    <Card elevation="md" entranceIndex={0} style={{ marginBottom: theme.spacing.md }}>
      <Text variant="caption" tone="secondary" style={{ textTransform: 'uppercase', letterSpacing: 1, marginBottom: theme.spacing.md }}>
        {featureEyebrow(featureKey)}
      </Text>

      {/* Their palm. Before the reveal nothing is lit — the diagram is the promise; the lit line is
          the payoff. `highlightedLine` only arrives with the reveal, which is what makes the draw-on
          read as *this* line answering. A face feature has no line geometry, so the palm simply
          shows unlit and the words carry the card. */}
      {hasGeometry ? (
        <View style={{ alignItems: 'center', marginBottom: theme.spacing.lg }}>
          <PalmDiagram
            geometry={geometry}
            size={168}
            highlightedLine={revealed ? line : undefined}
            animate={revealed}
            accessibilityLabel={revealed && line ? `Your ${featureLabel(featureKey)}, lit on your palm` : 'Your palm line diagram'}
          />
        </View>
      ) : null}

      {!revealed ? (
        // ── S1 · Unrevealed ──────────────────────────────────────────────────────────────────────
        // One reveal per day, no preview of the essence. The feature NAME in the eyebrow is the
        // entire tease, and scarcity is the mechanic (research §2.3/2.4) — a peek would spend it.
        <View style={{ alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.sm }}>
          <PulseSeal onComplete={onReveal} />
          {onSealWithPalm ? (
            <Button label="Seal it with your palm" variant="ghost" size="md" onPress={onSealWithPalm} />
          ) : null}
        </View>
      ) : (
        <>
          {/* ── S3/S4 · Revealed ─────────────────────────────────────────────────────────────── */}
          <Animated.View entering={unfold(0)}>
            <Text variant="editorialTitle">{pulse.essence}</Text>
          </Animated.View>

          {chapter ? (
            <Animated.View entering={unfold(1)} style={{ marginTop: theme.spacing.md }}>
              <ChapterChip chapter={chapter} locale={locale} onPress={onOpenChapter} />
            </Animated.View>
          ) : null}

          {premium ? (
            <Animated.View entering={unfold(2)} style={{ marginTop: theme.spacing.lg, gap: theme.spacing.lg }}>
              <Divider />
              <Text variant="body" tone="secondary">
                {pulse.reading}
              </Text>
              <View style={{ gap: theme.spacing.md }}>
                <Aspect label="Career" text={pulse.career} />
                <Aspect label="Love" text={pulse.love} />
                <Aspect label="Wealth" text={pulse.wealth} />
                <Aspect label="Watch for" text={pulse.watch} />
              </View>
              {onAsk ? (
                <View style={{ alignItems: 'flex-start' }}>
                  <Button
                    label="Ask about today’s line"
                    variant="ghost"
                    size="md"
                    icon={<Icon name="chat" size={16} color={theme.colors.accentPressed} decorative />}
                    onPress={() => onAsk(askPulsePrefill(featureKey))}
                  />
                </View>
              ) : null}
            </Animated.View>
          ) : (
            <Animated.View entering={unfold(2)} style={{ marginTop: theme.spacing.lg, gap: theme.spacing.md, alignItems: 'flex-start' }}>
              <Divider />
              {/* Exactly ONE lock line (Audit-4 §4.2 / CP-6). Not a feature list, not a blur. */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm }}>
                <Icon name="lock" size={16} color={theme.colors.textSecondary} decorative style={{ marginTop: 2 }} />
                <Text variant="small" tone="secondary" style={{ flex: 1 }}>
                  Today’s full reading of your {featureLabel(featureKey)} is Premium.
                </Text>
              </View>
              <Button label="Unlock today’s reading" variant="tonal" size="md" onPress={onUnlock} />
            </Animated.View>
          )}
        </>
      )}
    </Card>
  );
}

/** S0 · Skeleton — the shape of what is coming, so the page never claims to be empty (SH-1). */
export function PulseCardSkeleton() {
  const theme = useTheme();
  return (
    <Card elevation="md" style={{ marginBottom: theme.spacing.md, gap: theme.spacing.md }}>
      <Skeleton width={160} height={14} />
      <Skeleton height={168} radius="md" />
      <Skeleton height={22} />
      <Skeleton width="60%" height={22} />
    </Card>
  );
}

/**
 * S5 · Error — an honest retry.
 *
 * Reached when the night's template row is missing. It says so and offers a retry; it never
 * fabricates a reading, and it is never the first-run hero (the SH-1 rule: a returning reader must
 * not be told they have never had a reading).
 */
export function PulseCardError({ onRetry }: { onRetry?: () => void }) {
  const theme = useTheme();
  return (
    <Card style={{ marginBottom: theme.spacing.md, gap: theme.spacing.md }}>
      <Text variant="heading">Today’s line isn’t loading</Text>
      <Text variant="body" tone="secondary">
        Your readings are safe — this was a hiccup on our side.
      </Text>
      {onRetry ? <Button label="Try again" variant="secondary" size="md" onPress={onRetry} /> : null}
    </Card>
  );
}

/** The chat bridge's pre-filled question — grounded in the feature, never a blank prompt. */
export function askPulsePrefill(featureKey: string): string {
  return `What does my ${featureLabel(featureKey)} mean today?`;
}

function Divider() {
  const theme = useTheme();
  return <View style={{ height: theme.strokes.hairline, backgroundColor: theme.colors.border }} />;
}

/** A label+line pair in the almanac's exact premium typography — one system, no new list style. */
function Aspect({ label, text }: { label: string; text: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text variant="caption" tone="secondary" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
        {label}
      </Text>
      <Text variant="body">{text}</Text>
    </View>
  );
}
