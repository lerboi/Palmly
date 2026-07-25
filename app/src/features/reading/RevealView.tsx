import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PalmDiagram } from '@/components/palm-diagram/PalmDiagram';
import type { LineGeometry } from '@/components/palm-diagram/geometry';
import { AppHeader, Button, Card, HeaderIconButton, HeaderTextButton, Icon, Logomark, PrivacyBadge, Screen, Text } from '@/components/ui';
import type { IconName } from '@/components/ui';
import { controlHeight, useEntrance, usePressSpring, useReducedMotion, useTheme } from '@/theme';
import { track } from '@/lib/analytics';
import { CANONICAL_DELETION_SHORT } from '@/lib/trustCopy';
import { FACE_READING_ENABLED } from '@/lib/capabilities';
import { stamp } from '@/lib/haptics';
import { setContinueDismissed, wasContinueDismissed } from '@/lib/session';
import { type Reading, type ReadingSection, FACE_SECTION_ICON, SECTION_ICON, SECTION_LINE, deletedLabel, freeSections, lockedSections, traditionFootnote } from './reveal';

export type RevealState = 'ready' | 'pending' | 'error';
export type ReadingKind = 'palm' | 'face';

export interface RevealViewProps {
  /** Optional in `pending`/`error` (those states only draw the geometry) — required in `ready`. */
  reading?: Reading;
  geometry: LineGeometry;
  /** `pending` while the reading loads, `error` on load failure (redesign R15). Default `ready`. */
  state?: RevealState;
  /** Palm vs face reading (audit F1.6) — drives the hero, per-section visual, tradition footnotes,
   *  and which cross-sell / compare cards show. Defaults to `palm`. */
  kind?: ReadingKind;
  /** The reading's id — threaded into the share sheet so the invite carries the real reading (F0.4). */
  readingId?: string;
  /** When the source photo was ACTUALLY deleted — null while it still exists (the badge then
   *  promises the 24h window instead of claiming a deletion that hasn't happened; live find
   *  2026-07-25). */
  photoDeletedAt?: string | null;
  /** The keep-my-scan opt-in (D2): the badge says "saved", never "deleted". */
  photoKept?: boolean;
  /** This reveal came from a repeat scan that resolved `matched` (F1.10) — surface the consistency
   *  micro-survey ("does this match your last reading?"). */
  matched?: boolean;
  onBack?: () => void;
  onRetry?: () => void;
  /**
   * Leave the reading for Today. Defaults to `router.replace('/fortune')` — a REPLACE, so the
   * finished reveal doesn't linger in the back stack behind the home screen.
   */
  onDone?: () => void;
  /** The reader already has a left-hand palm reading — don't offer it again (SH-10). */
  hasOtherHand?: boolean;
  /** The reader already has the OTHER kind of reading (face for a palm reveal, or vice versa). */
  hasOtherKind?: boolean;
}

/** Rotating reassurance for the living "drawing" pending state. */
const PENDING_LINES = [
  'Tracing your lines…',
  'Cross-checking the classics…',
  CANONICAL_DELETION_SHORT,
];

/**
 * The reading reveal (UIUX §2.5, redesign R15 / v2 V13) — the "wow". The user's own palm traces
 * itself as the hero, an **editorial** headline rises, and icon-led section cards **stagger** in
 * (draw → headline → 90ms cards). Locked premium depth teases behind the paywall, the compatibility
 * hook, an earned **share pill**, and a single trust footer. English-first, no decorative
 * CJK. A living pending state + an honest error state.
 */
export function RevealView({ reading, geometry, state = 'ready', kind = 'palm', readingId, photoDeletedAt, photoKept = false, matched = false, onBack, onRetry, onDone, hasOtherHand = false, hasOtherKind = false }: RevealViewProps) {
  const theme = useTheme();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';
  const back = onBack ?? (() => router.back());
  // SN-1: the reading used to be a dead end — `setFirstReadingComplete()` was written here but its
  // only consumer was the cold-start redirect, so the ONLY way to reach home was to kill the app
  // and relaunch. `replace` (not push) so Today becomes the root, with no finished reveal behind it.
  const done = onDone ?? (() => router.replace('/fortune'));

  // SH-10: these offers used to reappear on every reveal forever — no dismissal, no already-added
  // check. Dismissal persists, and each row hides once that reading exists. `undefined` while the
  // flag resolves means offer nothing yet.
  const [continueDismissed, setDismissed] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    let active = true;
    wasContinueDismissed().then((v) => active && setDismissed(v));
    return () => {
      active = false;
    };
  }, []);
  const dismissContinue = () => {
    setDismissed(true);
    void setContinueDismissed();
  };
  const otherKindAvailable = kind === 'face' || FACE_READING_ENABLED;
  const showContinue =
    continueDismissed === false &&
    ((kind === 'palm' && !hasOtherHand) || (otherKindAvailable && !hasOtherKind));
  const shareHref = `/share${readingId ? `?readingId=${readingId}` : ''}` as Href;
  const shareCompatHref =
    `/share?${readingId ? `readingId=${readingId}&` : ''}initialVariant=compat` as Href;
  // The ONE entrance system (Audit-4 CO-10): this reveal used to run its own FadeInDown duration
  // stagger alongside `Card entranceIndex`'s spring, at a different delay. Cards below take an
  // `entranceIndex`; the two bare-text heroes use the same builder directly.
  const enter = useEntrance();

  // The share seal appears only once the reader scrolls past the hero/first section (audit F0.12) —
  // an earned affordance, not a timer pop. The same handler fires the reveal scroll-depth funnel
  // (F0.T12's deferred event), each threshold once. Declared before the early returns (rules-of-hooks).
  const [scrolledPast, setScrolledPast] = useState(false);
  const firedDepths = useRef<Set<number>>(new Set());
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    if (!scrolledPast && contentOffset.y > 240) setScrolledPast(true);
    if (readingId && contentSize.height > 0) {
      const pct = ((contentOffset.y + layoutMeasurement.height) / contentSize.height) * 100;
      for (const t of [25, 50, 75, 100]) {
        if (pct >= t && !firedDepths.current.has(t)) {
          firedDepths.current.add(t);
          track('reveal_scroll_depth', { reading_id: readingId, pct: t });
        }
      }
    }
  };

  if (state === 'pending') return <PendingReveal geometry={geometry} onBack={back} />;
  if (state === 'error' || !reading) return <ErrorReveal geometry={geometry} onBack={back} onRetry={onRetry} />;

  const free = freeSections(reading);
  const locked = lockedSections(reading);
  // A running entrance index so the hero and every card stagger in document order.
  let n = 0;

  return (
    <View style={{ flex: 1 }}>
      <Screen
        scroll
        onScroll={onScroll}
        contentStyle={{
          // Clear the floating share pill: its height plus the gap it holds off the edge.
          paddingBottom: theme.spacing.xxl + controlHeight.md,
        }}
      >
        <AppHeader
          onBack={back}
          right={
            <HeaderTextButton onPress={done}>
              <Text variant="button" tone="accent">
                Done
              </Text>
            </HeaderTextButton>
          }
        />
        {/* Heritage touch (§5.4 #1): the seal stamps-settle as the reading lands — "your reading is sealed". */}
        <ReadyStamp shouldAnimate={shouldAnimate} />
        {/* ── Hero: the palm draws itself (face reads its own themed motif), then the headline rises ── */}
        <View style={{ alignItems: 'center', marginBottom: theme.spacing.xl }}>
          {kind === 'face' ? (
            <FaceHero />
          ) : (
            <PalmDiagram geometry={geometry} size={260} signatureLines={['heart_line', 'fate_line']} animate />
          )}
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
            <SectionCard section={section} geometry={geometry} kind={kind} readingId={readingId} index={i} entranceIndex={n++} />
            {/* The survey sits BELOW the first section (SH-11): it used to ask "does this match what
                you remember?" above the reading, before there was anything to remember against. */}
            {matched && readingId && i === 0 ? (
              <ConsistencySurvey readingId={readingId} kind={kind} entranceIndex={n++} />
            ) : null}
            {/* The compat hook is palm-based (a face reading has no palm to compare) — palm only. */}
            {kind === 'palm' && i === 1 ? (
              <CompareCard onPress={() => router.push(shareCompatHref)} entranceIndex={n++} />
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
              <LockedCard key={section.key} section={section} entranceIndex={n++} onUnlock={() => router.push(`/paywall?trigger=locked_section&section=${section.key}` as Href)} />
            ))}
          </View>
        ) : null}

        {/* ONE consolidated offer, then the trust story LAST (CO-2). The footer used to sit
            BETWEEN the second-hand card and the other-kind card — the trust promise buried
            between two ads. */}
        {showContinue ? (
          <ContinueCard
            kind={kind}
            hasOtherHand={hasOtherHand}
            hasOtherKind={hasOtherKind}
            onOtherHand={() => router.push('/primer?hand=left' as Href)}
            onOtherKind={() => router.push((kind === 'face' ? '/primer' : '/face') as Href)}
            onDismiss={dismissContinue}
          />
        ) : null}
        <TrustFooter onMethodology={() => router.push('/methodology')} photoDeletedAt={photoDeletedAt} photoKept={photoKept} kind={kind} />

        {reading.disclaimer ? (
          <Text variant="caption" tone="tertiary" style={{ textAlign: 'center', marginTop: theme.spacing.lg }}>
            {reading.disclaimer}
          </Text>
        ) : null}
      </Screen>

      {/* ── Share affordance: a labeled pill (CO-3), earned once you've read past the hero ── */}
      {scrolledPast ? <SharePill onPress={() => router.push(shareHref)} shouldAnimate={shouldAnimate} /> : null}
    </View>
  );
}

/** Living "drawing" pending state — the palm draws itself + breathes, with a rotating reassurance. */
function PendingReveal({ geometry, onBack }: { geometry: LineGeometry; onBack: () => void }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';
  // Rotating copy is CONTENT, not motion (Direction §3): it keeps advancing under reduce-motion —
  // only the crossfade below hard-swaps. Web holds line 1 so the static export stays deterministic.
  const proof = useRotating(PENDING_LINES, theme.motion.duration.rotate, Platform.OS !== 'web');

  const breath = useSharedValue(1);
  const breathMs = theme.motion.duration.breath;
  useEffect(() => {
    if (!shouldAnimate) {
      breath.value = 1;
      return;
    }
    breath.value = withRepeat(withTiming(0, { duration: breathMs, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [shouldAnimate, breath, breathMs]);
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
            We couldn’t load your reading
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
/**
 * A section/offer thumbnail glyph on a tile. **Ink by default** (Audit-4 CC-1 / Direction §1 P1):
 * these are decorative markers, not actions, and a page of them was the reveal's biggest source of
 * accent noise. `heritage` is the red-thread motif's sanctioned home; `premiumInk` marks locked
 * chapters (the champagne FILL sits at 2.08:1 on this tile, under a glyph's 3:1 floor — CC-4).
 */
function FeatureIcon({
  icon,
  tone = 'ink',
  size = 44,
}: {
  icon: IconName;
  tone?: 'ink' | 'heritage' | 'premiumInk';
  size?: number;
}) {
  const theme = useTheme();
  const color =
    tone === 'heritage'
      ? theme.colors.heritageAccent
      : tone === 'premiumInk'
        ? theme.colors.premiumInk
        : theme.colors.textSecondary;
  const bg = theme.colors.surfaceSunken;
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

function SectionCard({ section, geometry, kind, readingId, index, entranceIndex }: { section: ReadingSection; geometry: LineGeometry; kind: ReadingKind; readingId?: string; index: number; entranceIndex?: number }) {
  const theme = useTheme();
  // Each free section rendered into the reveal is a funnel step (F0.T12) — only for a real reading.
  useEffect(() => {
    if (readingId) track('reveal_section_viewed', { reading_id: readingId, section: section.key, index });
  }, [readingId, section.key, index]);
  // Palm: a per-section mini palm (audit F1.1) — YOUR lines, with THIS section's line lit in the
  // accent (≤96px thickens ink AND underlay so the lit line still reads at 64px — CO-5).
  // A palm section that is NOT about one line (hand shape / mounts / markings) would otherwise
  // render an identical unlit palm, so it takes a feature icon instead — as does every face
  // section, since a face reading has no line geometry at all.
  const line = SECTION_LINE[section.key];
  const icon = kind === 'face' ? (FACE_SECTION_ICON[section.key] ?? 'face') : SECTION_ICON[section.key];
  return (
    <Card elevation="sm" entranceIndex={entranceIndex} style={{ marginBottom: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <View style={{ width: 64, alignItems: 'center' }}>
          {line || !icon ? (
            <PalmDiagram
              geometry={geometry}
              size={64}
              animate={false}
              highlightedLine={line}
              signatureLines={line ? [line] : []}
              accessibilityLabel={line ? `Your ${section.title.toLowerCase()}` : ''}
            />
          ) : (
            <FeatureIcon icon={icon} size={56} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="heading">{section.title}</Text>
          {section.body ? (
            <Text variant="body" style={{ marginTop: theme.spacing.sm }}>
              {section.body}
            </Text>
          ) : null}
          <Text variant="caption" tone="tertiary" style={{ marginTop: theme.spacing.sm }}>
            {traditionFootnote(section, kind)}
          </Text>
        </View>
      </View>
    </Card>
  );
}

function CompareCard({ onPress, entranceIndex }: { onPress: () => void; entranceIndex?: number }) {
  const theme = useTheme();
  return (
    // Flat and left-aligned (CO-2/CO-4, Direction §4.4 #3): this was the page's ONLY centred, only
    // `md`-elevation card, so it read as an interruption planted mid-reading rather than as part of
    // it. It now shares the section cards' shape — marker left, text right — so the eye keeps its
    // line down the page instead of re-centring for one card.
    <Card entranceIndex={entranceIndex} style={{ marginBottom: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <View style={{ width: 64, alignItems: 'center' }}>
          <FeatureIcon icon="thread" tone="heritage" />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="title">Compare with a friend</Text>
          <Text variant="body" tone="secondary" style={{ marginTop: theme.spacing.sm }}>
            Tie a red thread — see how your palms line up.
          </Text>
        </View>
      </View>
      <Button label="Compare palms" onPress={onPress} fullWidth style={{ marginTop: theme.spacing.md }} />
    </Card>
  );
}

function LockedCard({ section, onUnlock, entranceIndex }: { section: ReadingSection; onUnlock: () => void; entranceIndex?: number }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onUnlock} accessibilityRole="button" accessibilityLabel={`Unlock ${section.title}`}>
      <Card elevation="sm" entranceIndex={entranceIndex} style={{ marginBottom: theme.spacing.md }}>
        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <FeatureIcon icon="lock" tone="premiumInk" size={44} />
          <View style={{ flex: 1 }}>
            {/* The title IS the tease: it is code-derived from the deterministic claim skeleton, so
                it says "you have a Fate Line chapter" without generating — or leaking — a word of
                the premium prose. There is no `teaser` field by design (M12a / D-25).
                `heading`, the SAME weight a free section's title gets (CO-4): at `bodyMedium` the
                premium chapters read as less important than the ones already given away. */}
            <Text variant="heading">{section.title}</Text>
            <Text variant="caption" tone="premiumInk" style={{ marginTop: theme.spacing.sm }}>
              Unlock with Premium
            </Text>
          </View>
          <Icon name="chevron" size={20} color={theme.colors.textTertiary} decorative />
        </View>
      </Card>
    </Pressable>
  );
}

function TrustFooter({ onMethodology, photoDeletedAt, photoKept = false, kind }: { onMethodology: () => void; photoDeletedAt?: string | null; photoKept?: boolean; kind: ReadingKind }) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: theme.spacing.sm, marginVertical: theme.spacing.lg }}>
      <Text variant="small" tone="secondary" style={{ textAlign: 'center' }}>
        {kind === 'face'
          ? 'Same face, same reading. Rescan anytime — your features don’t change.'
          : 'Same palm, same reading. Rescan anytime — your lines don’t lie.'}
      </Text>
      <PrivacyBadge label={deletedLabel(photoDeletedAt, { kept: photoKept })} />
      {/* The affordance is a `chevron`, not a typed "→" (CO-8: the icon set replaces text glyphs —
          this one survived U0.T5's sweep because the errata scoped that grep away from `→`). */}
      <Pressable
        onPress={onMethodology}
        accessibilityRole="link"
        style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}
      >
        <Text variant="small" color={theme.colors.accentPressed}>
          How Palmly reads
        </Text>
        <Icon name="chevron" size={14} color={theme.colors.accentPressed} decorative />
      </Pressable>
    </View>
  );
}



/** The face reveal's hero (audit F1.6). A physiognomy reading has no line geometry to self-draw, so
 *  the palm's traced-hand hero becomes a themed face motif — an honest signal (no fabricated
 *  landmarks), clearly distinct from the palm layout. */
function FaceHero() {
  const theme = useTheme();
  return (
    <View
      style={{
        width: 220,
        height: 220,
        borderRadius: theme.radii.pill,
        backgroundColor: theme.colors.surfaceSunken,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name="face" size={112} color={theme.colors.textSecondary} decorative />
    </View>
  );
}


/**
 * ONE "Continue" card (Audit-4 CO-2, SH-10). Replaces the second-hand offer AND the other-kind
 * offer, which used to sandwich the trust footer between them — the promise about the reader's
 * photo buried between two ads.
 *
 * Each row shows only if that reading does not already exist, the card is dismissible, and the
 * dismissal persists: "Add your other hand" previously appeared on every palm reveal, forever.
 */
function ContinueCard({
  kind,
  hasOtherHand,
  hasOtherKind,
  onOtherHand,
  onOtherKind,
  onDismiss,
}: {
  kind: ReadingKind;
  hasOtherHand: boolean;
  hasOtherKind: boolean;
  onOtherHand: () => void;
  onOtherKind: () => void;
  onDismiss: () => void;
}) {
  const theme = useTheme();
  const showHand = kind === 'palm' && !hasOtherHand;
  const showKind = (kind === 'face' || FACE_READING_ENABLED) && !hasOtherKind;
  return (
    <Card style={{ marginBottom: theme.spacing.xl, gap: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text variant="heading" style={{ flex: 1 }}>
          Keep going
        </Text>
        <HeaderIconButton name="close" size={18} accessibilityLabel="Not now" onPress={onDismiss} />
      </View>
      {showHand ? (
        <ContinueRow icon="palm" title="Add your left hand" body="One hand is innate, the other cultivated." onPress={onOtherHand} />
      ) : null}
      {showKind ? (
        <ContinueRow
          icon="face"
          title={kind === 'face' ? 'Read your palm' : 'Read your face'}
          body={kind === 'face' ? 'Your lines tell the other half.' : 'Your face tells the other half.'}
          onPress={onOtherKind}
        />
      ) : null}
    </Card>
  );
}

/** One offer inside the Continue card — a flat row, not another card (P2: one hero per screen). */
function ContinueRow({ icon, title, body, onPress }: { icon: IconName; title: string; body: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.sm }}
    >
      <FeatureIcon icon={icon} size={40} />
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium">{title}</Text>
        <Text variant="caption" tone="secondary">
          {body}
        </Text>
      </View>
    </Pressable>
  );
}

/** Repeat-scan consistency micro-survey (audit F1.10, Backend §6.6.4) — a one-tap 3-option prompt
 *  shown when a scan resolved `matched`; fires `consistency_survey` and thanks the user. */
function ConsistencySurvey({ readingId, kind, entranceIndex }: { readingId: string; kind: ReadingKind; entranceIndex?: number }) {
  const theme = useTheme();
  const [answered, setAnswered] = useState(false);
  const answer = (response: 'consistent' | 'inconsistent' | 'unsure') => {
    track('consistency_survey', { reading_id: readingId, response });
    setAnswered(true);
  };
  return (
    <Card elevation="sm" entranceIndex={entranceIndex} style={{ marginBottom: theme.spacing.md, gap: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <FeatureIcon icon="check" size={40} />
        <View style={{ flex: 1 }}>
          <Text variant="heading">{kind === 'face' ? 'You’ve scanned this face before' : 'You’ve scanned this palm before'}</Text>
          <Text variant="caption" tone="secondary">
            {/* Direction §5: shorter, warmer, and it stops explaining our QA to the reader. */}
            {answered ? 'Noted — thank you.' : 'Same as you remember?'}
          </Text>
        </View>
      </View>
      {/* `md` AND wrapping (CO-6). Three `lg` buttons needed ~337pt in a ~311pt box at 375pt; even
          at `md` they measured 287pt of content into a 254pt card box at 320pt, so the row wraps
          rather than running off the card — the same treatment the Lucky row got in U3.T2. */}
      {answered ? null : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          <Button label="Spot on" variant="secondary" size="md" onPress={() => answer('consistent')} />
          <Button label="A bit off" variant="ghost" size="md" onPress={() => answer('inconsistent')} />
          <Button label="Not sure" variant="ghost" size="md" onPress={() => answer('unsure')} />
        </View>
      )}
    </Card>
  );
}

/** Heritage touch (§5.4 #1): a claret seal stamps-settle as the reading lands — the authenticity
 *  beat ("your reading is sealed"). Native-only scale-settle + stamp haptic [~]; web / reduce-motion
 *  render the settled seal. Claret (heritage), never the bright accent — the three-reds discipline. */
function ReadyStamp({ shouldAnimate }: { shouldAnimate: boolean }) {
  const theme = useTheme();
  const scale = useSharedValue(shouldAnimate ? 1.3 : 1);
  const opacity = useSharedValue(shouldAnimate ? 0 : 1);
  const press = theme.motion.spring.press;
  const fast = theme.motion.duration.fast;
  useEffect(() => {
    if (!shouldAnimate) return;
    opacity.value = withTiming(1, { duration: fast });
    scale.value = withSpring(1, press);
    stamp(); // the reading-sealed haptic (native, [~] device)
  }, [shouldAnimate, scale, opacity, press, fast]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[{ alignItems: 'center', marginBottom: theme.spacing.md }, style]}>
      <Logomark variant="stamp" filled tone="heritage" size={40} accessibilityLabel="" />
    </Animated.View>
  );
}

/**
 * The share affordance as a **labeled pill** (Audit-4 CO-3, Direction §4.4 #1).
 *
 * What it replaces: a second claret `Logomark` seal, identical to the `ReadyStamp` 600px above it —
 * so the page carried two of the same mark and only one of them did anything. It was also unlabeled
 * (a floating seal reads as decoration, not "share"), it sat at a flat `spacing.xl` from the screen
 * edge — i.e. UNDER the home indicator on an inset device — and its `shadow.md` was attached to a
 * transparent `View`, which casts nothing at all on iOS and a rectangular halo on Android.
 *
 * Now: icon + word on a real `surface` fill (the fill is what makes the shadow render on both
 * platforms), hairline border for the light scheme where a shadow alone is invisible, `44pt` floor,
 * and a bottom offset that adds the safe-area inset. Still *earned* — it fades in once the reader is
 * past the hero (§4.4 keeps that), and still stamps on press.
 */
function SharePill({ onPress, shouldAnimate }: { onPress: () => void; shouldAnimate: boolean }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { scaleStyle, onPressIn, onPressOut } = usePressSpring(0.96);

  return (
    <Animated.View
      entering={shouldAnimate ? FadeIn.duration(theme.motion.duration.base) : undefined}
      style={[
        { position: 'absolute', right: theme.spacing.lg, bottom: insets.bottom + theme.spacing.lg },
        scaleStyle,
      ]}
    >
      <Pressable
        onPress={() => {
          stamp(); // the seal-stamp confirm (F1.11)
          onPress();
        }}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel="Share this reading"
        style={({ pressed }) => [
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.sm,
            minHeight: controlHeight.md,
            paddingHorizontal: theme.spacing.lg,
            borderRadius: theme.radii.pill,
            borderWidth: theme.strokes.hairline,
            borderColor: theme.colors.border,
            backgroundColor: pressed ? theme.colors.surfaceSunken : theme.colors.surface,
          },
          theme.shadow.md,
        ]}
      >
        <Icon name="share" size={18} color={theme.colors.textPrimary} decorative />
        <Text variant="button">Share</Text>
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
