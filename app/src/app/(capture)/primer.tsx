import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { AppHeader, Button, Card, Icon, Screen, Text } from '@/components/ui';
import type { IconName } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/theme';
import { uploadPickedScan, type Hand } from '@/lib/scan';
import { loadClaimContext } from '@/lib/claim';
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
  { icon: 'shield', text: 'Your photo is deleted after your reading.' },
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
      router.push(`/analyzing?scanId=${scanId}` as Href);
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
        <View style={{ alignItems: 'center', marginBottom: theme.spacing.xl }}>
          <Animated.View
            entering={shouldAnimate ? ZoomIn.duration(theme.motion.duration.base) : undefined}
            style={{
              width: 96,
              height: 96,
              borderRadius: theme.radii.xl,
              backgroundColor: theme.colors.accentMuted,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="camera" size={44} color={theme.colors.accent} decorative />
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
          onPress={() => router.push(`/palm${handSuffix}` as Href)}
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
