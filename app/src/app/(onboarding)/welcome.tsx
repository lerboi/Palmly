import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { router, type Href } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { HandOutline } from '@/components/palm-diagram/HandOutline';
import { AppHeader, Button, Screen, Text } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/theme';
import { track } from '@/lib/analytics';

/**
 * Onboarding A1 (UIUX §2.1, redesign "premium outline") — the value prop over a single clean
 * open-palm outline with one accent heart line (two-tone: "this is a reading"), a small Logomark,
 * and a headline / subhead / CTA that **stagger in**. English-first, no CJK; copy pared to the
 * essential (aggressive-minimal pass).
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
        <Animated.View entering={shouldAnimate ? FadeIn.duration(theme.motion.duration.slow) : undefined}>
          <HandOutline size={248} accent accessibilityLabel="An open palm" />
        </Animated.View>
        <Animated.View entering={enter(0)}>
          <Text variant="display" style={{ textAlign: 'center', marginTop: theme.spacing.xxl }}>
            Your palm remembers
          </Text>
        </Animated.View>
        <Animated.View entering={enter(1)}>
          <Text
            variant="bodyLarge"
            tone="secondary"
            style={{ textAlign: 'center', marginTop: theme.spacing.sm, maxWidth: 280 }}
          >
            One photo. A reading in about a minute.
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
