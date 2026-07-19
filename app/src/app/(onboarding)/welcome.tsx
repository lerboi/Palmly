import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { router, type Href } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { PalmDiagram } from '@/components/palm-diagram/PalmDiagram';
import { AppHeader, Button, Logomark, Screen, Text } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/theme';
import { PREVIEW_GEOMETRY } from '@/features/reading/reveal';
import { track } from '@/lib/analytics';

/**
 * Onboarding A1 (UIUX §2.1, redesign R12 / v2 V10) — the value prop over a **label-free** traced-
 * palm hero, with a small Logomark for brand presence; headline / subhead / CTA **stagger in**.
 * Reframed off ethnicity (§6): "rooted in centuries of palmistry", English-first, no CJK.
 */
export default function Welcome() {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';
  const enter = (i: number) =>
    shouldAnimate
      ? FadeInDown.delay(i * theme.motion.stagger.reveal).duration(theme.motion.duration.base)
      : undefined;

  useEffect(() => {
    track('onboarding_step_viewed', { step: 'welcome' });
  }, []);

  const onSkip = () => {
    track('onboarding_skipped', { at: 'welcome' });
    router.push('/hand-select' as Href);
  };

  return (
    <Screen>
      <AppHeader
        onBack={() => router.back()}
        right={<Button label="Skip" variant="ghost" size="md" onPress={onSkip} />}
      />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <PalmDiagram
          geometry={PREVIEW_GEOMETRY}
          size={240}
          signatureLines={['heart_line', 'fate_line']}
        />
        <Logomark size={34} tone="ink" compact style={{ marginTop: theme.spacing.lg }} />
        <Animated.View entering={enter(0)}>
          <Text variant="display" style={{ textAlign: 'center', marginTop: theme.spacing.md }}>
            Your palm remembers
          </Text>
        </Animated.View>
        <Animated.View entering={enter(1)}>
          <Text
            variant="bodyLarge"
            tone="secondary"
            style={{ textAlign: 'center', marginTop: theme.spacing.sm, maxWidth: 300 }}
          >
            Rooted in centuries of palmistry — read from a single photo, in about a minute.
          </Text>
        </Animated.View>
      </View>

      <Animated.View entering={enter(2)}>
        <Button
          label="How it works"
          variant="primary"
          fullWidth
          style={{ marginBottom: theme.spacing.md }}
          onPress={() => router.push('/how-it-works' as Href)}
        />
      </Animated.View>
    </Screen>
  );
}
