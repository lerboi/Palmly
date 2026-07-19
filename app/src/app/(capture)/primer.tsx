import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { AppHeader, Button, Card, Icon, Screen, Text } from '@/components/ui';
import type { IconName } from '@/components/ui';
import { PalmDiagram } from '@/components/palm-diagram/PalmDiagram';
import { PREVIEW_GEOMETRY } from '@/features/reading/reveal';
import { useReducedMotion, useTheme } from '@/theme';
import { uploadPickedScan, type Hand } from '@/lib/scan';
import { loadClaimContext } from '@/lib/claim';
import { recordCameraConsent } from '@/lib/consent';
import { CANONICAL_DELETION_SHORT } from '@/lib/trustCopy';
import { captureError, track } from '@/lib/analytics';

/**
 * Capture B — camera primer + consent (UIUX §2.2, Backend §9, redesign R13 / v2 V11). Shown at the
 * moment of intent (not launch). The three reassurance rows double as the versioned biometric-
 * consent text (kept verbatim). A branded hero + staggered entrance.
 *
 * The A3 hand answer arrives as `?hand=…` (hand-select → here) and is threaded onward: "Allow camera"
 * forwards it to the capture screen; "Upload a photo instead" is the real, device-free door into the
 * live pipeline — it opens the photo library, runs scan-create → PUT → scan-ingest, and lands on
 * `/analyzing?scanId=…`. Native camera permission stays device-only ([~]); the on-device library
 * pick is verified on the web export. English, no CJK.
 */
const REASSURANCE: { icon: IconName; text: string }[] = [
  { icon: 'camera', text: 'Analyzed on the spot — your palm never leaves as a photo.' },
  { icon: 'shield', text: CANONICAL_DELETION_SHORT },
  { icon: 'lock', text: 'Never shared, never used to identify you.' },
];

export default function Primer() {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';
  const enter = (i: number) =>
    shouldAnimate
      ? FadeInDown.delay(i * theme.motion.stagger.reveal).duration(theme.motion.duration.base)
      : undefined;

  const params = useLocalSearchParams<{ hand?: string }>();
  const hand: Hand | undefined = params.hand === 'left' || params.hand === 'right' ? params.hand : undefined;
  const handSuffix = hand ? `?hand=${hand}` : '';

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Recipient context (audit F0.5): when the user arrived from an invite claim, name the match they
  // are about to reveal so the capture reads as "scan to match with «Name»", not a cold camera ask.
  const [inviterName, setInviterName] = useState<string | null>(null);
  useEffect(() => {
    track('camera_primer_viewed', {});
    let active = true;
    loadClaimContext().then((ctx) => active && setInviterName(ctx?.inviterName ?? null));
    return () => {
      active = false;
    };
  }, []);

  const onUploadInstead = async () => {
    setError(null);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (result.canceled || !result.assets?.[0]) return; // user backed out — no-op
    setUploading(true);
    try {
      track('capture_started', { kind: 'palm', hand });
      const { scanId } = await uploadPickedScan({ kind: 'palm', hand, imageUri: result.assets[0].uri });
      track('upload_ok', { scan_id: scanId, kind: 'palm' });
      // Thread the local image URI so the analyzing loader shows THEIR hand under the tracing (F1.4).
      router.push(`/analyzing?scanId=${scanId}&capturedUri=${encodeURIComponent(result.assets[0].uri)}` as Href);
    } catch (e) {
      captureError(e, { where: 'primer.upload' });
      setError('That didn’t upload — check your connection and try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Screen>
      <AppHeader onBack={() => router.back()} />

      <View style={{ flex: 1 }}>
        {/* F2.T2 §5.5: an engraved two-tone camera+open-palm spot illustration (~200px) replaces the
            small glyph tile, so the primer reads as a Palmly moment — not a styled permission dialog.
            The palm is the existing engraved diagram (ink silhouette + accent heart line = two-tone);
            the accent camera badge is the "we see your palm" half of the motif. */}
        <View style={{ alignItems: 'center', marginBottom: theme.spacing.xl }}>
          <Animated.View
            entering={shouldAnimate ? ZoomIn.duration(theme.motion.duration.base) : undefined}
            style={{ width: 200, height: 200, alignItems: 'center', justifyContent: 'center' }}
          >
            <PalmDiagram geometry={PREVIEW_GEOMETRY} size={190} animate={false} silhouette signatureLines={['heart_line']} />
            <View
              style={[
                {
                  position: 'absolute',
                  right: theme.spacing.sm,
                  bottom: theme.spacing.sm,
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: theme.colors.accentMuted,
                  alignItems: 'center',
                  justifyContent: 'center',
                },
                theme.shadow.sm,
              ]}
            >
              <Icon name="camera" size={30} color={theme.colors.accent} decorative />
            </View>
          </Animated.View>
        </View>

        {inviterName ? (
          <Animated.View entering={enter(0)}>
            <Text variant="caption" color={theme.colors.accent} style={{ textAlign: 'center', marginBottom: theme.spacing.xs }}>
              Scan to reveal your match with {inviterName}
            </Text>
          </Animated.View>
        ) : null}

        <Animated.View entering={enter(0)}>
          <Text variant="title" style={{ textAlign: 'center' }}>
            Palmly needs your camera to see your palm
          </Text>
        </Animated.View>

        <Animated.View entering={enter(1)}>
          <Card elevation="none" style={{ marginTop: theme.spacing.xl, backgroundColor: theme.colors.surfaceSunken }}>
            <View style={{ gap: theme.spacing.md }}>
              {REASSURANCE.map((row) => (
                <View key={row.text} style={{ flexDirection: 'row', gap: theme.spacing.md, alignItems: 'center' }}>
                  <Icon name={row.icon} size={22} color={theme.colors.success} decorative />
                  <Text variant="body" style={{ flex: 1 }}>
                    {row.text}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        </Animated.View>
      </View>

      <Animated.View entering={enter(2)} style={{ gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
        {error ? (
          <Text variant="caption" color={theme.colors.danger} style={{ textAlign: 'center' }}>
            {error}
          </Text>
        ) : null}
        <Button
          label="Allow camera"
          variant="primary"
          fullWidth
          disabled={uploading}
          onPress={() => {
            // The reassurance rows ARE the biometric-consent text (Backend §9) — log the version the
            // user accepted, then proceed. The OS permission grant/denial is the device leg (F1.T3).
            void recordCameraConsent();
            track('permission_result', { granted: true, kind: 'camera' });
            router.push(`/palm${handSuffix}` as Href);
          }}
        />
        <Button
          label="Upload a photo instead"
          variant="secondary"
          fullWidth
          loading={uploading}
          onPress={onUploadInstead}
        />
      </Animated.View>
    </Screen>
  );
}
