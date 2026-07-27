import { Platform, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PalmDiagram } from '@/components/palm-diagram/PalmDiagram';
import type { LineGeometry } from '@/components/palm-diagram/geometry';
import { Button, Card, Icon, Skeleton, Text } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/theme';
import type { Pulse } from '@/lib/pulseData';
import { AlmanacDoAvoid, AlmanacLucky } from '@/features/fortune/FortuneCard';
import { askPrefill, type Fortune } from '@/features/fortune/fortune';
import { ChapterChip } from './ChapterChip';
import type { DescribedChapter } from './chapters';
import { FEATURE_LINE, featureEyebrow, featureLabel } from './pulseMath';
import { PulseSeal } from './PulseSeal';

export interface PulseCardProps {
  /**
   * Today's almanac. Required — after the merge this card IS the day, and the almanac is the half
   * that genuinely varies. `homeState()` still gates on the fortune, so the card never renders
   * without one.
   */
  fortune: Fortune;
  /** Which of the reader's own features today is read through. Null → the almanac-only day. */
  featureKey?: string | null;
  /** Today's personal content. Null → the almanac-only day (a degraded day is still a day). */
  pulse?: Pulse | null;
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
 * The daily card (Audit-5 · 02 §4, merged at RF6.T2) — the Today tab's single `md` hero.
 *
 * **What the merge fixed.** Today used to carry two cards making two competing claims: an almanac
 * that said "here is the day" and a line card that said "your heart line favors patience today."
 * The second one is not true — the reader's palm is the same palm it was yesterday, and they know
 * it. So the day's variance moves onto the thing that genuinely varies (the almanac) and the
 * feature becomes the LENS it is read through: *today, through your heart line*, not *your heart
 * line says today*.
 *
 * Top→bottom: eyebrow → the lit diagram → the almanac's `overall` as the serif essence (the day is
 * the subject now) → the personal line beneath it → chapter chip → one premium column, or exactly
 * one lock line covering both halves.
 *
 * States S1 (unrevealed) → S2 (the reveal transition) → S3/S4 (free / premium). S0 and S5 are
 * {@link PulseCardSkeleton} and {@link PulseCardError}, kept as separate exports so the screen picks
 * exactly one and never renders a half-populated hero.
 */
export function PulseCard({
  fortune,
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
  // The personal half. Absent when the night's template row is missing: the almanac still renders
  // as the day's hero rather than an error card, because a degraded day is still a day (05 §3).
  const personal = featureKey && pulse ? { featureKey, pulse } : null;
  const line = personal ? FEATURE_LINE[personal.featureKey] : undefined;
  // Nothing to hold for when there is no personal line — the almanac was never gated behind a
  // gesture and must not start being.
  const showsSeal = personal != null && !revealed;

  // The unfold staggers AFTER the line lands — the hero animates first (Direction §3), so the
  // essence arrives onto a drawn line rather than racing it.
  const unfold = (i: number) =>
    shouldAnimate ? FadeInDown.delay(i * theme.motion.stagger.reveal).duration(theme.motion.duration.base) : undefined;

  return (
    <Card elevation="md" entranceIndex={0} style={{ marginBottom: theme.spacing.md }}>
      <Text variant="caption" tone="secondary" style={{ textTransform: 'uppercase', letterSpacing: 1, marginBottom: theme.spacing.md }}>
        {personal ? featureEyebrow(personal.featureKey) : 'The almanac'}
      </Text>

      {/* Their palm. Before the reveal nothing is lit — the diagram is the promise; the lit line is
          the payoff. `highlightedLine` only arrives with the reveal, which is what makes the draw-on
          read as *this* line answering. A face feature has no line geometry, so the palm simply
          shows unlit and the words carry the card. */}
      {hasGeometry && personal ? (
        <View style={{ alignItems: 'center', marginBottom: theme.spacing.lg }}>
          <PalmDiagram
            geometry={geometry}
            size={168}
            highlightedLine={revealed ? line : undefined}
            animate={revealed}
            accessibilityLabel={
              revealed && line ? `Your ${featureLabel(personal.featureKey)}, lit on your palm` : 'Your palm line diagram'
            }
          />
        </View>
      ) : null}

      {/* The day's voice, and the card's one editorial moment. It is the almanac's line, set in the
          serif, because after the reframe the DAY is the subject — this is the half that actually
          changed since yesterday. It is free, and it is not behind the hold: hiding it would have
          taken away content the reader already had. */}
      <Text variant="editorialTitle">{fortune.overall}</Text>

      {showsSeal ? (
        // ── S1 · Unrevealed ──────────────────────────────────────────────────────────────────────
        // The day is on screen; what is held back is the reading THROUGH the reader's own feature.
        // One reveal per day, no preview of the personal line — the feature name in the eyebrow is
        // the entire tease, and scarcity is the mechanic (research §2.3/2.4).
        <View style={{ alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.lg, marginTop: theme.spacing.md }}>
          <PulseSeal onComplete={onReveal} />
          {onSealWithPalm ? <Button label="Seal it with your palm" variant="ghost" size="md" onPress={onSealWithPalm} /> : null}
        </View>
      ) : (
        <>
          {/* ── S3/S4 · Revealed ─────────────────────────────────────────────────────────────── */}
          {personal ? (
            <Animated.View entering={unfold(0)} style={{ marginTop: theme.spacing.md }}>
              <Text variant="body" tone="secondary">
                {personal.pulse.essence}
              </Text>
            </Animated.View>
          ) : null}

          {chapter ? (
            <Animated.View entering={unfold(1)} style={{ marginTop: theme.spacing.md }}>
              <ChapterChip chapter={chapter} locale={locale} onPress={onOpenChapter} />
            </Animated.View>
          ) : null}

          {premium ? (
            // ONE column, personal half first: the reader's own reading, then the day's practical
            // detail. Note what is NOT here — the almanac's own career/love/wealth. The personal
            // ones say the same three things through the reader's own feature, and printing both
            // would be the content bloat Audit-4 spent a phase removing.
            <Animated.View entering={unfold(2)} style={{ marginTop: theme.spacing.lg, gap: theme.spacing.lg }}>
              <Divider />
              {personal ? (
                <>
                  <Text variant="body" tone="secondary">
                    {personal.pulse.reading}
                  </Text>
                  <View style={{ gap: theme.spacing.md }}>
                    <Aspect label="Career" text={personal.pulse.career} />
                    <Aspect label="Love" text={personal.pulse.love} />
                    <Aspect label="Wealth" text={personal.pulse.wealth} />
                    <Aspect label="Watch for" text={personal.pulse.watch} />
                  </View>
                  <Divider />
                </>
              ) : null}
              <AlmanacDoAvoid fortune={fortune} />
              <Divider />
              <AlmanacLucky fortune={fortune} />
              {onAsk ? (
                <View style={{ alignItems: 'flex-start' }}>
                  <Button
                    label="Ask about today"
                    variant="ghost"
                    size="md"
                    icon={<Icon name="chat" size={16} color={theme.colors.accentPressed} decorative />}
                    onPress={() => onAsk(personal ? askDailyPrefill(personal.featureKey) : askPrefill(fortune))}
                  />
                </View>
              ) : null}
            </Animated.View>
          ) : (
            <Animated.View entering={unfold(2)} style={{ marginTop: theme.spacing.lg, gap: theme.spacing.md, alignItems: 'flex-start' }}>
              <Divider />
              {/* Exactly ONE lock line for the whole day, not one per half (Audit-4 CP-6). It sells
                  the rest of TODAY — it no longer offers "today's full reading of your heart line",
                  which was the sentence that implied the line itself had something new to say. */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm }}>
                <Icon name="lock" size={16} color={theme.colors.textSecondary} decorative style={{ marginTop: 2 }} />
                <Text variant="small" tone="secondary" style={{ flex: 1 }}>
                  The rest of today — do &amp; avoid, lucky hours, love, career, wealth — is Premium.
                </Text>
              </View>
              <Button label="Unlock the rest of today" variant="tonal" size="md" onPress={onUnlock} />
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
 * There is no S5 here any more, and its absence is the point.
 *
 * 02 §4 gave this card its own error state, for the night the personal template row is missing.
 * RF6.T2 supersedes that (05 §3): a missing personal line now renders the **almanac alone** — a
 * degraded day is still a day, and telling a reader their day is broken because one of fifteen
 * features failed to generate would be a lie in the direction that costs the most.
 *
 * The only failure left is the almanac itself, which really is the whole day, and `FortuneHome`
 * already owns that state with the same copy. A second identical error card living here would be
 * exactly the drift P5 forbids, so it was deleted rather than kept for symmetry.
 */

/** The chat bridge's pre-filled question — grounded in the feature, never a blank prompt. */
export function askDailyPrefill(featureKey: string): string {
  return `What does today look like through my ${featureLabel(featureKey)}?`;
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
