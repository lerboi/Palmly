import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, Share, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
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
import { usePressSpring, useReducedMotion, useTheme } from '@/theme';
import { track } from '@/lib/analytics';
import { composeShareText, createInvite, loadDraftCardPreviewUrl, loadDraftShareCardId, publishShareCard, type CreatedInvite, type Framing } from '@/lib/invite';
import { savePendingCompat } from '@/lib/pendingCompat';
import { maybeAskFirstCompatPush } from '@/lib/notifications';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Count a number 0→target over ~0.9s on native; web / reduce-motion hold the target. The lazy
 *  initial + interval-only setState keeps the React-Compiler lint happy (no synchronous set in the
 *  effect body). */
function useCountUp(target: number, active: boolean): number {
  const [n, setN] = useState(() => (active ? 0 : target));
  useEffect(() => {
    if (!active) return;
    const steps = 22;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setN(i >= steps ? target : Math.round((target * i) / steps));
      if (i >= steps) clearInterval(id);
    }, 40);
    return () => clearInterval(id);
  }, [active, target]);
  return n;
}

export type ShareSource = 'reveal' | 'home' | 'face' | 'compat';

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
  /** The reading this share is for — threaded into the minted invite's context (audit F0.4). */
  readingId?: string;
  /** Where the sheet was opened from (analytics `share_sheet_opened.source`). */
  source?: ShareSource;
  /** Re-share an EXISTING invite (the home red-thread nudge) — the sheet reuses this exact URL and
   *  never mints a second invite (audit F1.7). When set, the framing picker is hidden (locked). */
  presetInviteUrl?: string;
  onClose?: () => void;
}

type Variant = 'solo' | 'compat';

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
  readingId,
  source = 'reveal',
  presetInviteUrl,
  onClose,
}: ShareViewProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';
  const [variant, setVariant] = useState<Variant>(initialVariant);
  const [invite, setInvite] = useState(true);
  const [copied, setCopied] = useState(false);
  // "preview == posted" (F1.T9): the REAL pre-rendered draft PNG when one exists (solo, owned by the
  // caller); null → fall back to the in-app vector preview (dev fixtures / no card yet).
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // The sender's relationship framing (§2.7) — rides into the invite context; the picker resets the
  // (not-yet-minted) cache so the LATEST choice mints. A ref keeps ensureInvite's identity stable.
  const [framing, setFraming] = useState<Framing>('friend');
  const framingRef = useRef<Framing>('friend');
  const onFraming = (f: Framing) => {
    setFraming(f);
    framingRef.current = f;
    mintRef.current = null;
  };
  // "Show my name on the card" consent (F1.T9; UIUX §2 "first-name attribution (optional)"). Both a
  // named and a byline-less draft are pre-rendered (worker-narrative), so the toggle just picks which
  // pre-rendered variant the sheet previews AND publishes — no re-render, and "preview == posted"
  // holds in both states. Toggling resets the mint so the next send publishes the chosen draft.
  const [showName, setShowName] = useState(true);
  const showNameRef = useRef(true);
  const onToggleName = () => {
    const v = !showNameRef.current;
    setShowName(v);
    showNameRef.current = v;
    mintRef.current = null;
  };
  const soloVariant = (on: boolean) => (on ? 'feed_4x5' : 'feed_4x5_anon');

  // Mint the invite AT MOST ONCE — the promise is cached so every channel reuses the same link. A
  // failure clears the cache so a later tap can retry. A `presetInviteUrl` (home nudge re-share)
  // short-circuits minting entirely: the SAME link is reused, so no second invite row is created.
  const mintRef = useRef<Promise<CreatedInvite> | null>(null);
  const ensureInvite = useCallback((): Promise<CreatedInvite> => {
    if (presetInviteUrl) return Promise.resolve({ inviteId: '', url: presetInviteUrl });
    if (!mintRef.current) {
      mintRef.current = (async () => {
        // Publish the reading's pre-rendered card so the invite carries a real OG image (audit A6 —
        // this publish path used to be wired to nothing). Best-effort: an invite without an image
        // still works, so a missing draft or a publish hiccup never blocks the share.
        let cardImageUrl: string | undefined;
        if (readingId) {
          try {
            // Publish the draft the consent toggle selected (named vs byline-less) so the OG image a
            // friend sees matches the sheet preview exactly. Ref, not state — ensureInvite stays stable.
            const cardId = await loadDraftShareCardId(readingId, soloVariant(showNameRef.current));
            if (cardId) cardImageUrl = await publishShareCard(cardId);
          } catch {
            /* no draft card yet / publish failed — mint without the OG image */
          }
        }
        const inv = await createInvite({ readingId, cardImageUrl, kind: 'compatibility', channel: 'link', framing: framingRef.current });
        track('invite_created', { channel: 'link', kind: 'compatibility' });
        void savePendingCompat({ url: inv.url }); // home red-thread nudge re-shares this exact link
        return inv;
      })().catch((e) => {
        mintRef.current = null;
        throw e;
      });
    }
    return mintRef.current;
  }, [readingId, presetInviteUrl]);

  // Emit once the sheet is opened.
  useEffect(() => {
    track('share_sheet_opened', readingId ? { source, reading_id: readingId } : { source });
  }, [source, readingId]);

  // Fetch the real draft-PNG preview (solo, owned reading). Falls back to the vector preview otherwise.
  // Resolve to null (not a synchronous setState) when not applicable, so setPreviewUrl only runs in the
  // async callback (react-hooks/set-state-in-effect).
  useEffect(() => {
    let active = true;
    const load = variant === 'solo' && readingId ? loadDraftCardPreviewUrl(readingId, soloVariant(showName)) : Promise.resolve(null);
    load.then((u) => active && setPreviewUrl(u)).catch(() => {});
    return () => {
      active = false;
    };
  }, [variant, readingId, showName]);

  // Pre-mint the SOLO share on open (so "Copy link" / "Share" are instant). The compat share waits
  // for the framing pick, so it mints on-demand in the handlers instead — otherwise a framing change
  // after an eager mint would strand a first, wrongly-framed invite. Gating on readingId keeps /dev
  // fixture previews from minting real invites; a preset (re-share) never mints.
  useEffect(() => {
    if (invite && readingId && variant === 'solo' && !presetInviteUrl) void ensureInvite().catch(() => {});
  }, [invite, readingId, variant, presetInviteUrl, ensureInvite]);

  const onCopyLink = async () => {
    try {
      const { url } = await ensureInvite();
      await Clipboard.setStringAsync(url);
      setCopied(true);
      track('share_completed', { channel: 'copy', card_variant: 'feed', with_invite: invite });
    } catch {
      /* mint / clipboard unavailable — leave the un-copied state, no crash */
    }
  };

  const onShare = async (channel: string) => {
    let url: string | undefined;
    if (invite) {
      try {
        url = (await ensureInvite()).url;
      } catch {
        /* share the essence without a link rather than block the share */
      }
    }
    track('share_completed', { channel, card_variant: 'feed', with_invite: invite });
    // Sanctioned push moment (F1.T10): the first compat invite send. Once ever, device-only.
    if (variant === 'compat' && invite) void maybeAskFirstCompatPush();
    try {
      // Per-channel copy (§2.6): messaging apps get the compare invite; IG/TikTok a short caption.
      await Share.share({ message: composeShareText(headline, url, channel) });
    } catch {
      /* native OS sheet is device-only ([~]); web / dismissed → no-op */
    }
  };

  return (
    // The sheet SCROLLS (Audit-4 CO-12 / Direction §4.7). It used to be a fixed-height Screen whose
    // preview sat in a `flex: 1` slot — but the compat preview's intrinsic height is about twice
    // what flex could give it on a 844pt device, and Yoga doesn't clip, so the card painted over the
    // toggles, the framing picker and the channel row beneath it.
    <Screen scroll>
      <AppHeader title="Share your reading" onBack={onClose} />

      <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.lg }}>
        <Segment label="My reading" active={variant === 'solo'} onPress={() => setVariant('solo')} />
        <Segment label="Compatibility" active={variant === 'compat'} onPress={() => setVariant('compat')} />
      </View>

      {/* Top-anchored slot so switching tabs never re-centres / jumps the card. Intrinsic height,
          not `flex: 1`: inside a scroll view the preview must size to its content. */}
      <View>
        {variant === 'solo' ? (
          <Animated.View key="solo" entering={shouldAnimate ? FadeIn.duration(theme.motion.duration.base) : undefined}>
            {previewUrl ? <RealCardPreview uri={previewUrl} /> : <SoloPreview geometry={geometry} headline={headline} />}
          </Animated.View>
        ) : (
          <Animated.View key="compat" entering={shouldAnimate ? FadeIn.duration(theme.motion.duration.base) : undefined}>
            <CompatPreview geometry={geometry} score={score} partnerName={partnerName} blurb={blurb} chips={chips} />
          </Animated.View>
        )}
      </View>

      {/* "Show my name on the card" consent (F1.T9; UIUX §2 first-name attribution is optional). Solo
          only — the compat card's names are governed separately by U6 (both consent on "Share our
          result"). Flips the previewed + published draft between the named and byline-less renders. */}
      {variant === 'solo' && readingId ? (
        <Pressable
          onPress={onToggleName}
          accessibilityRole="switch"
          accessibilityState={{ checked: showName }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.md }}
        >
          <Icon name="shield" size={22} color={theme.colors.textSecondary} decorative />
          <Text variant="body" style={{ flex: 1 }}>
            Show my name on the card
          </Text>
          <Toggle on={showName} />
        </Pressable>
      ) : null}

      {/* Sender's relationship framing (§2.7 — tone modifier + card-copy variant). Compat only; hidden
          when re-sharing an existing link (framing is locked to the original invite). */}
      {variant === 'compat' && !presetInviteUrl ? <FramingPicker value={framing} onChange={onFraming} /> : null}

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

      {/* Market-ordered channel row (F1.T9, UIUX §2.6) — SE-Asia messaging first, then social, then
          Copy/More. Real brand SDKs + logos are device-only ([~]); no brand glyph ships in the icon
          set, so each channel is an honest monogram tile + label (never a faked logo). A brand tap
          opens the OS share sheet with per-channel copy; Copy writes the link + flips to confirmed;
          More is the generic sheet. (The QR tile joins in its market slot with the real encoder.) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: theme.spacing.lg, paddingHorizontal: theme.spacing.xs }}
        style={{ marginVertical: theme.spacing.md }}
      >
        {CHANNELS.map((c) => (
          <ChannelButton
            key={c.key}
            icon={c.icon}
            mono={c.mono}
            label={c.action === 'copy' && copied ? 'Copied' : c.label}
            confirmed={c.action === 'copy' && copied}
            onPress={c.action === 'copy' ? onCopyLink : () => onShare(c.key)}
          />
        ))}
      </ScrollView>

      <Button
        label="Share"
        variant="primary"
        fullWidth
        icon={<Icon name="share" size={18} color={theme.colors.onAccent} decorative />}
        style={{ marginBottom: theme.spacing.md }}
        onPress={() => onShare('share')}
      />
    </Screen>
  );
}

function Segment({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const theme = useTheme();
  const { scaleStyle: style, onPressIn, onPressOut } = usePressSpring(0.97);
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

const FRAMINGS: { value: Framing; label: string }[] = [
  { value: 'friend', label: 'Friend' },
  { value: 'partner', label: 'Partner' },
  { value: 'crush', label: 'Crush' },
  { value: 'family', label: 'Family' },
];

/** The sender's relationship framing selector (§2.7) — four pills, single-select. */
function FramingPicker({ value, onChange }: { value: Framing; onChange: (f: Framing) => void }) {
  const theme = useTheme();
  return (
    <View style={{ marginBottom: theme.spacing.md }}>
      <Text variant="caption" tone="secondary" style={{ marginBottom: theme.spacing.sm }}>
        Who are you comparing with?
      </Text>
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        {FRAMINGS.map((f) => (
          <FramingPill key={f.value} label={f.label} active={value === f.value} onPress={() => onChange(f.value)} />
        ))}
      </View>
    </View>
  );
}

function FramingPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const theme = useTheme();
  const { scaleStyle: style, onPressIn, onPressOut } = usePressSpring(0.95);
  return (
    <Animated.View style={[{ flex: 1 }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="radio"
        accessibilityState={{ selected: active }}
        style={{
          alignItems: 'center',
          paddingVertical: theme.spacing.sm,
          borderRadius: theme.radii.pill,
          backgroundColor: active ? theme.colors.accentMuted : theme.colors.surfaceSunken,
          borderWidth: theme.strokes.hairline,
          borderColor: active ? theme.colors.accent : 'transparent',
        }}
      >
        <Text variant="caption" color={active ? theme.colors.accent : theme.colors.textSecondary}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

/** The market-ordered share channels (F1.T9, UIUX §2.6). Messaging apps that dominate the launch
 *  markets come first, then the social-video pair, then Copy + More. No brand logos exist in the
 *  icon set, so brand tiles carry an honest monogram; Copy/More use real glyphs. `key` is the
 *  analytics channel tag threaded through `onShare`. (QR slots before More once its encoder lands.) */
const CHANNELS: { key: string; label: string; mono?: string; icon?: IconName; action: 'brand' | 'copy' | 'more' }[] = [
  { key: 'whatsapp', label: 'WhatsApp', mono: 'W', action: 'brand' },
  { key: 'line', label: 'LINE', mono: 'L', action: 'brand' },
  { key: 'zalo', label: 'Zalo', mono: 'Z', action: 'brand' },
  { key: 'instagram', label: 'Instagram', mono: 'IG', action: 'brand' },
  { key: 'tiktok', label: 'TikTok', mono: 'TT', action: 'brand' },
  { key: 'copy', label: 'Copy link', icon: 'thread', action: 'copy' },
  { key: 'more', label: 'More', icon: 'share', action: 'more' },
];

/** One channel tile — a glyph tile (Copy/More) or an honest brand monogram (no faked logos), with a
 *  label below. Both share the same round accent tile so the row reads as one family. */
function ChannelButton({ icon, mono, label, onPress, confirmed = false }: { icon?: IconName; mono?: string; label: string; onPress: () => void; confirmed?: boolean }) {
  const theme = useTheme();
  const { scaleStyle: style, onPressIn, onPressOut } = usePressSpring(0.9);
  return (
    <Animated.View style={style}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={{ alignItems: 'center', gap: theme.spacing.xs, width: 68 }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: theme.colors.surfaceSunken,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Confirmation is the tile's own icon turning into a check — so the LABEL can stay short
              enough to fit 68pt instead of truncating to "Link copie…" (Audit-4 CO-8). */}
          {confirmed ? (
            <Icon name="check" size={24} color={theme.colors.success} decorative />
          ) : icon ? (
            <Icon name={icon} size={24} color={theme.colors.textSecondary} decorative />
          ) : (
            <Text variant="bodyMedium" color={theme.colors.textPrimary} style={{ fontWeight: '700' }}>
              {mono}
            </Text>
          )}
        </View>
        <Text variant="caption" tone="secondary" numberOfLines={1}>
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
        // Off uses `trackOff`, not `border`: the hairline token on a white card measured 1.15:1
        // against a white thumb, so an off toggle read as a blank rectangle (Audit-4 CC-7).
        backgroundColor: on ? theme.colors.accent : theme.colors.trackOff,
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
      <Logomark size={24} tone="ink" compact />
      <Text variant="caption" tone="tertiary">
        palmly.app
      </Text>
      <View style={{ flex: 1 }} />
      <Logomark size={30} variant="stamp" filled tone="heritage" accessibilityLabel="Palmly seal" />
    </View>
  );
}

/** "preview == posted" (F1.T9) — the ACTUAL server-rendered draft PNG the friend will receive, so the
 *  in-sheet preview can never drift from the posted card. 4:5 to match the feed card (1080×1350). */
function RealCardPreview({ uri }: { uri: string }) {
  const theme = useTheme();
  return (
    <View style={[{ borderRadius: theme.radii.lg, overflow: 'hidden', alignSelf: 'center', width: '100%', maxWidth: 340 }, theme.shadow.lg]}>
      <Image
        source={{ uri }}
        style={{ width: '100%', aspectRatio: 4 / 5 }}
        resizeMode="cover"
        accessibilityLabel="Your share card — exactly what your friend will see"
      />
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
              backgroundColor: theme.colors.surfaceSunken,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.xs,
              borderRadius: theme.radii.pill,
            }}
          >
            <Text variant="caption" color={theme.colors.textPrimary}>
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
  const threadMs = theme.motion.duration.thread;
  useEffect(() => {
    if (!shouldAnimate) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, { duration: threadMs, easing: Easing.inOut(Easing.cubic) });
  }, [shouldAnimate, progress, threadMs]);
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
 *  shown BELOW the ring so a long label never collides with the arc. Pass `animate` for the pair
 *  peak: the arc sweeps + the number counts up 0→N (native; web / reduce-motion → static end). */
export function ScoreRing({
  score,
  size = 96,
  label,
  animate = false,
}: {
  score: number;
  size?: number;
  label?: string;
  animate?: boolean;
}) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = animate && !reduceMotion && Platform.OS !== 'web';
  const d = size;
  const sw = Math.max(6, Math.round(size / 16));
  const r = d / 2 - sw / 2 - 2;
  const c = 2 * Math.PI * r;

  const shown = useCountUp(score, shouldAnimate);
  const progress = useSharedValue(shouldAnimate ? 0 : score / 100);
  const ringMs = theme.motion.duration.ring;
  useEffect(() => {
    if (!shouldAnimate) {
      progress.value = score / 100;
      return;
    }
    progress.value = 0;
    progress.value = withTiming(score / 100, { duration: ringMs, easing: Easing.out(Easing.cubic) });
  }, [shouldAnimate, score, progress, ringMs]);
  const arcProps = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - progress.value) }));

  return (
    <View style={{ alignItems: 'center', gap: theme.spacing.xs }}>
      <View style={{ width: d, height: d, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={d} height={d} style={{ position: 'absolute' }}>
          <Circle cx={d / 2} cy={d / 2} r={r} stroke={theme.colors.border} strokeWidth={sw} fill="none" />
          <AnimatedCircle
            cx={d / 2}
            cy={d / 2}
            r={r}
            stroke={theme.colors.premiumInk}
            strokeWidth={sw}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={c}
            animatedProps={arcProps}
            transform={`rotate(-90 ${d / 2} ${d / 2})`}
          />
        </Svg>
        {/* The ink, not the fill: the champagne numeral measured 2.59:1 on white — under even the
            3:1 large-text floor (Audit-4 CC-4). The arc moves with it so ring and value match. */}
        <Text variant="numeral" color={theme.colors.premiumInk} style={{ fontSize: Math.round(size * 0.34) }}>
          {shown}
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
