import { Platform, View } from 'react-native';
import { router, type Href } from 'expo-router';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { AppHeader, Button, Card, Icon, Screen, Text } from '@/components/ui';
import type { IconName } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/theme';

/**
 * Capture B — camera primer + consent (UIUX §2.2, Backend §9, redesign R13 / v2 V11). Shown at the
 * moment of intent (not launch). The three reassurance rows double as the versioned biometric-
 * consent text (kept verbatim). A branded hero + staggered entrance. Native camera permission is
 * device-only, so "Allow camera" is wired to the capture route for layout verification and the
 * on-device system-prompt leg is marked [~]. English, no CJK.
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
        <Button label="Allow camera" variant="primary" fullWidth onPress={() => router.push('/palm' as Href)} />
        <Button
          label="Upload a photo instead"
          variant="secondary"
          fullWidth
          onPress={() => router.push('/analyzing' as Href)}
        />
      </Animated.View>
    </Screen>
  );
}
