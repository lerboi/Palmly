import { useEffect, useState } from 'react';
import { Platform, TextInput, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { Button, Logomark, PrivacyBadge, Screen, Text } from '@/components/ui';
import { PalmDiagram } from '@/components/palm-diagram/PalmDiagram';
import { PREVIEW_GEOMETRY } from '@/features/reading/reveal';
import { RedThread } from '@/features/reading/ShareView';
import { useReducedMotion, useTheme } from '@/theme';
import { ClaimError, claimInvite, loadClaimContext, normalizeCode, saveClaimContext, type ClaimContext } from '@/lib/claim';
import { useAccountIdentity } from '@/lib/account';
import { track } from '@/lib/analytics';

/**
 * Recipient claim landing (UIUX §2.10, audit F0.5) — the personalized entry an invited user lands
 * on: two avatars + the red thread, the inviter's name from the deep-link cosmetic param (or the
 * persisted context, else "A friend"), and the explicit accept that CLAIMS the invite. `invite-claim`
 * is single-use with no resolve-only mode, so the claim fires ONLY on the accept tap — never on
 * open. A reload re-offers this screen from the persisted context without re-claiming (a 409 on a
 * re-claim after success falls through to `/primer`). The "enter code" recovery is a one-field sheet.
 */
export default function Claim() {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';
  const zoom = (i: number) =>
    shouldAnimate ? ZoomIn.delay(i * theme.motion.stagger.reveal).duration(theme.motion.duration.base) : undefined;

  const params = useLocalSearchParams<{ token?: string; inviter?: string }>();
  const token = typeof params.token === 'string' ? params.token : undefined;
  const [persisted, setPersisted] = useState<ClaimContext | null>(null);
  const inviterName = params.inviter || persisted?.inviterName || 'A friend';

  const { isAnonymous } = useAccountIdentity();
  const [codeMode, setCodeMode] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load any persisted context, and persist the un-claimed token so a reload re-offers this landing.
  useEffect(() => {
    let active = true;
    loadClaimContext().then((ctx) => {
      if (active) setPersisted(ctx);
      if (token && !ctx?.claimed) void saveClaimContext({ token, inviterName: params.inviter || ctx?.inviterName || 'A friend', claimed: false });
    });
    return () => {
      active = false;
    };
  }, [token, params.inviter]);

  const goCapture = () => router.replace('/primer' as Href);

  const doClaim = async (input: { token: string } | { code: string }, source: string) => {
    setError(null);
    setBusy(true);
    try {
      const result = await claimInvite(input);
      await saveClaimContext({
        ...('token' in input ? { token: input.token } : {}),
        inviterName: result.inviterName,
        pairId: result.pairId,
        claimed: true,
      });
      track('invite_accepted', { pair_id: result.pairId, source });
      goCapture();
    } catch (e) {
      if (e instanceof ClaimError && e.status === 409) {
        goCapture(); // already claimed (by us earlier) — proceed with the persisted context
      } else if (e instanceof ClaimError && (e.status === 404 || e.status === 410)) {
        setError('This invite has expired or was already used — but you can still read your own palm.');
      } else {
        setError('Something went wrong. Please try again, or read your own palm.');
      }
    } finally {
      setBusy(false);
    }
  };

  // Compat-accept is the one place identity is structurally required (UIUX §2.9, audit F0.8): so the
  // inviter's pair carries a name, an anonymous recipient must claim an account first (non-skippable).
  const openAccountGate = () =>
    router.push(`/account?reason=compat&mandatory=1&inviter=${encodeURIComponent(inviterName)}` as Href);

  const onAccept = () => {
    if (persisted?.claimed) return goCapture(); // already claimed → straight to capture, no re-claim
    if (!token) return goCapture(); // landed with no token (e.g. direct /claim) — just capture
    if (isAnonymous) return openAccountGate(); // link identity, then re-tap to claim
    return void doClaim({ token }, 'web');
  };

  return (
    <Screen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        {/* F2.T2 §5.5: the avatar+thread composition scaled ~1.5× (64→96) so it anchors the void
            above it as the hero, instead of floating small in centered space. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
          <Animated.View entering={zoom(0)}>
            <Avatar size={96} accessibilityLabel={`${inviterName}, who invited you`}>
              <Text variant="display" color={theme.colors.accent}>
                {inviterName[0]}
              </Text>
            </Avatar>
          </Animated.View>
          <RedThread animate />
          <Animated.View entering={zoom(1)}>
            <Avatar size={96} accessibilityLabel="You">
              <Logomark size={48} tone="accent" compact accessibilityLabel="" />
            </Avatar>
          </Animated.View>
        </View>

        <Text variant="display" style={{ textAlign: 'center', marginTop: theme.spacing.xl }}>
          {inviterName} is waiting
        </Text>
        <Text
          variant="bodyLarge"
          tone="secondary"
          style={{ textAlign: 'center', marginTop: theme.spacing.sm, maxWidth: 320 }}
        >
          Scan your palm to reveal your compatibility — you&apos;ll get your own full reading too.
        </Text>
        <PrivacyBadge style={{ marginTop: theme.spacing.lg }} />
        <PairTease />
      </View>

      <View style={{ gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
        {error ? (
          <Text variant="caption" color={theme.colors.danger} style={{ textAlign: 'center' }}>
            {error}
          </Text>
        ) : null}

        {codeMode ? (
          <>
            <TextInput
              value={code}
              onChangeText={(t) => setCode(normalizeCode(t))}
              placeholder="ABCDE-12345"
              placeholderTextColor={theme.colors.textTertiary}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={11}
              accessibilityLabel="Invite code"
              style={{
                fontFamily: theme.fonts.body,
                fontSize: theme.typography.bodyLarge.fontSize,
                textAlign: 'center',
                letterSpacing: 2,
                color: theme.colors.textPrimary,
                backgroundColor: theme.colors.surfaceSunken,
                borderRadius: theme.radii.lg,
                borderWidth: theme.strokes.hairline,
                borderColor: theme.colors.border,
                paddingVertical: theme.spacing.md,
              }}
            />
            <Button
              label="Continue"
              variant="primary"
              fullWidth
              loading={busy}
              disabled={code.replace('-', '').length < 10}
              onPress={() => (isAnonymous ? openAccountGate() : void doClaim({ code }, 'manual_code'))}
            />
            <Button label="Back" variant="ghost" onPress={() => { setCodeMode(false); setError(null); }} />
          </>
        ) : (
          <>
            <Button label="Scan my palm" variant="primary" fullWidth loading={busy} onPress={onAccept} />
            <Button label="Have an invite? Enter code" variant="ghost" onPress={() => setCodeMode(true)} />
          </>
        )}
      </View>
    </Screen>
  );
}

/** A circular avatar tile — both people share the same accent treatment (the thread carries the
 *  claret); differentiated only by their glyph so the pair reads symmetric. `size` (default 64) lets
 *  the claim landing scale the composition up (§5.5). */
function Avatar({
  children,
  accessibilityLabel,
  size = 64,
}: {
  children: React.ReactNode;
  accessibilityLabel: string;
  size?: number;
}) {
  const theme = useTheme();
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: theme.colors.accentMuted,
        borderWidth: theme.strokes.bold,
        borderColor: theme.colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </View>
  );
}

/** F2.T2 §5.5: a teased "what you'll both see" mini pair-card — two mirrored mini palms tied to a
 *  claret "?" score ring (unknown until you scan), rendered at reduced opacity so it reads as an
 *  obscured preview and fills the void between the badge and the CTA. (A true native blur is a
 *  device-only enhancement — the opacity tease is the device-free approximation.) */
function PairTease() {
  const theme = useTheme();
  return (
    <View style={{ marginTop: theme.spacing.xl, alignItems: 'center' }}>
      <View
        style={[
          {
            width: 232,
            borderRadius: theme.radii.lg,
            paddingVertical: theme.spacing.lg,
            paddingHorizontal: theme.spacing.xl,
            backgroundColor: theme.colors.surfaceRaised,
            alignItems: 'center',
            opacity: 0.55,
          },
          theme.shadow.md,
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <PalmDiagram geometry={PREVIEW_GEOMETRY} size={52} animate={false} silhouette />
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              borderWidth: theme.strokes.bold,
              borderColor: theme.colors.heritageAccent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text variant="heading" color={theme.colors.heritageAccent}>
              ?
            </Text>
          </View>
          <PalmDiagram
            geometry={PREVIEW_GEOMETRY}
            size={52}
            animate={false}
            silhouette
            style={{ transform: [{ scaleX: -1 }] }}
          />
        </View>
      </View>
      <Text variant="caption" tone="tertiary" style={{ marginTop: theme.spacing.sm }}>
        What you&apos;ll both see
      </Text>
    </View>
  );
}
