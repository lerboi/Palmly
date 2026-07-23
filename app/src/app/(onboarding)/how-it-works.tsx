import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { router, type Href } from 'expo-router';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { AppHeader, Button, Icon, Screen, Text } from '@/components/ui';
import type { IconName } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/theme';
import { track } from '@/lib/analytics';

/**
 * Onboarding A2 (UIUX §2.1, redesign "premium outline") — the three-step explainer pared to the
 * bone (aggressive-minimal pass): line-icon · short title · one ≤5-word line, as quiet rows with no
 * card chrome, plus a single thin privacy line. Staggered in with an icon pop. English, no CJK.
 */
const STEPS: { icon: IconName; title: string; body: string }[] = [
  { icon: 'camera', title: 'Snap your palm', body: 'One photo, good light.' },
  { icon: 'sparkle', title: 'We trace your lines', body: 'Heart, head, life, fate.' },
  { icon: 'heart', title: 'Your reading', body: 'Love, work, the year ahead.' },
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
    <Screen>
      <AppHeader title="How it works" onBack={() => router.back()} />

      <View style={{ flex: 1, justifyContent: 'center', gap: theme.spacing.xxl }}>
        {STEPS.map((step, i) => (
          <Animated.View
            key={step.title}
            entering={rise(i)}
            style={{ flexDirection: 'row', gap: theme.spacing.lg, alignItems: 'center' }}
          >
            <Animated.View
              entering={pop(i)}
              style={{
                width: 52,
                height: 52,
                borderRadius: theme.radii.lg,
                backgroundColor: theme.colors.accentMuted,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name={step.icon} size={26} color={theme.colors.accent} decorative />
            </Animated.View>
            <View style={{ flex: 1 }}>
              <Text variant="heading">{step.title}</Text>
              <Text variant="body" tone="secondary" style={{ marginTop: 2 }}>
                {step.body}
              </Text>
            </View>
          </Animated.View>
        ))}
      </View>

      <Animated.View
        entering={rise(STEPS.length)}
        style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.lg }}
      >
        <Icon name="shield" size={16} color={theme.colors.success} decorative />
        <Text variant="caption" tone="tertiary">
          Your photo is analyzed, then deleted.
        </Text>
      </Animated.View>

      <Button
        label="Choose your hand"
        variant="primary"
        fullWidth
        onPress={() => router.push('/hand-select' as Href)}
      />
    </Screen>
  );
}
