import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { router, type Href } from 'expo-router';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { AppHeader, Button, Card, Icon, Screen, Text } from '@/components/ui';
import type { IconName } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/theme';
import { track } from '@/lib/analytics';

/**
 * Onboarding A2 (UIUX §2.1, redesign R12 / v2 V10) — the three-step explainer (scan → we trace
 * your lines → your reading) with line-icons, staggered in with an icon pop, and the D2 trust line
 * stated before we ask for the camera. English-first, no CJK.
 */
const STEPS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'camera',
    title: 'Snap your palm',
    body: 'Take one photo in good light — or upload one from your library.',
  },
  {
    icon: 'sparkle',
    title: 'We trace your lines',
    body: 'Your heart, head, life and fate lines become a private line-diagram.',
  },
  {
    icon: 'heart',
    title: 'Your reading',
    body: 'A warm, specific read on love, work, and the year ahead.',
  },
];

export default function HowItWorks() {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';
  const pop = (i: number) =>
    shouldAnimate ? ZoomIn.delay(i * theme.motion.stagger.reveal + 120).duration(theme.motion.duration.base) : undefined;
  const rise = (i: number) =>
    shouldAnimate ? FadeInDown.delay(i * theme.motion.stagger.reveal).duration(theme.motion.duration.base) : undefined;

  useEffect(() => {
    track('onboarding_step_viewed', { step: 'how_it_works' });
  }, []);

  return (
    <Screen scroll>
      <AppHeader title="How it works" onBack={() => router.back()} />

      <View style={{ gap: theme.spacing.md }}>
        {STEPS.map((step, i) => (
          <Card key={step.title} elevation="sm" entranceIndex={i}>
            <View style={{ flexDirection: 'row', gap: theme.spacing.md, alignItems: 'center' }}>
              <Animated.View
                entering={pop(i)}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: theme.radii.md,
                  backgroundColor: theme.colors.accentMuted,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={step.icon} size={24} color={theme.colors.accent} decorative />
              </Animated.View>
              <View style={{ flex: 1 }}>
                <Text variant="caption" tone="tertiary">
                  Step {i + 1}
                </Text>
                <Text variant="heading">{step.title}</Text>
                <Text variant="body" tone="secondary" style={{ marginTop: 2 }}>
                  {step.body}
                </Text>
              </View>
            </View>
          </Card>
        ))}
      </View>

      <Animated.View entering={rise(STEPS.length)}>
        <Card elevation="none" style={{ marginTop: theme.spacing.lg, backgroundColor: theme.colors.surfaceSunken }}>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-start' }}>
            <Icon name="shield" size={20} color={theme.colors.success} decorative />
            <Text variant="body" tone="secondary" style={{ flex: 1 }}>
              Your photo is analyzed, then deleted. What stays is your reading.
            </Text>
          </View>
        </Card>
      </Animated.View>

      <Button
        label="Choose your hand"
        variant="primary"
        fullWidth
        style={{ marginTop: theme.spacing.xl }}
        onPress={() => router.push('/hand-select' as Href)}
      />
    </Screen>
  );
}
