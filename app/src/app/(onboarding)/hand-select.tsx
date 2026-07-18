import { useEffect, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { router, type Href } from 'expo-router';
import Animated, {
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { PalmDiagram } from '@/components/palm-diagram/PalmDiagram';
import { AppHeader, Button, Icon, Screen, Text } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/theme';
import { PREVIEW_GEOMETRY } from '@/features/reading/reveal';
import { track } from '@/lib/analytics';

type Hand = 'left' | 'right';

/**
 * Onboarding A3 (UIUX §2.1 / U5, redesign R12 / v2 V10) — the one "quiz" question, which doubles
 * as pipeline input. Two selectable hand cards with a press-spring + an animated selection (the
 * check pops in), grouped as a `radiogroup`, plus a cultural note that sidesteps gender.
 * CTA: "Read my palm." English-first, no CJK.
 */
export default function HandSelect() {
  const theme = useTheme();
  const [hand, setHand] = useState<Hand>('right');

  useEffect(() => {
    track('onboarding_step_viewed', { step: 'hand_select' });
  }, []);

  const onContinue = () => {
    track('hand_selected', { hand });
    router.push(`/primer?hand=${hand}` as Href);
  };

  return (
    <Screen>
      <AppHeader title="Set up" onBack={() => router.back()} />

      <View style={{ flex: 1 }}>
        <Text variant="title">Which hand do you write with?</Text>
        <Text variant="body" tone="secondary" style={{ marginTop: theme.spacing.sm }}>
          We read your dominant hand first — it shows the life you&apos;re actively shaping.
        </Text>

        <View
          accessibilityRole="radiogroup"
          style={{ flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.xl }}
        >
          <HandCard label="Left" hand="left" selected={hand === 'left'} onSelect={() => setHand('left')} />
          <HandCard label="Right" hand="right" selected={hand === 'right'} onSelect={() => setHand('right')} />
        </View>

        <View
          style={{
            flexDirection: 'row',
            gap: theme.spacing.sm,
            marginTop: theme.spacing.xl,
            alignItems: 'flex-start',
          }}
        >
          <Icon name="sparkle" size={18} color={theme.colors.textTertiary} decorative />
          <Text variant="caption" tone="tertiary" style={{ flex: 1 }}>
            Traditional readers weigh both hands — one innate, one cultivated. You can add your other
            hand later.
          </Text>
        </View>
      </View>

      <Button
        label="Read my palm"
        variant="primary"
        fullWidth
        style={{ marginBottom: theme.spacing.md }}
        onPress={onContinue}
      />
    </Screen>
  );
}

function HandCard({
  label,
  hand,
  selected,
  onSelect,
}: {
  label: string;
  hand: Hand;
  selected: boolean;
  onSelect: () => void;
}) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';
  const [held, setHeld] = useState(false);
  const scale = useSharedValue(1);
  const press = theme.motion.spring.press;
  useEffect(() => {
    if (!shouldAnimate) {
      scale.value = 1;
      return;
    }
    scale.value = withSpring(held ? 0.97 : 1, press);
  }, [held, shouldAnimate, scale, press]);
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[{ flex: 1 }, scaleStyle]}>
      <Pressable
        onPress={onSelect}
        onPressIn={() => setHeld(true)}
        onPressOut={() => setHeld(false)}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={`${label} hand`}
        style={[
          {
            alignItems: 'center',
            paddingVertical: theme.spacing.lg,
            borderRadius: theme.radii.md,
            borderWidth: selected ? theme.strokes.bold : theme.strokes.hairline,
            borderColor: selected ? theme.colors.accent : theme.colors.border,
            backgroundColor: selected ? theme.colors.accentMuted : theme.colors.surfaceRaised,
          },
          theme.shadow.sm,
        ]}
      >
        <PalmDiagram
          geometry={PREVIEW_GEOMETRY}
          size={96}
          animate={false}
          highlightedLine={selected ? 'life_line' : undefined}
          style={hand === 'left' ? { transform: [{ scaleX: -1 }] } : undefined}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginTop: theme.spacing.sm }}>
          {selected ? (
            <Animated.View entering={shouldAnimate ? ZoomIn.duration(theme.motion.duration.fast) : undefined}>
              <Icon name="check" size={18} color={theme.colors.accent} decorative />
            </Animated.View>
          ) : null}
          <Text variant="heading" color={selected ? theme.colors.accent : theme.colors.textPrimary}>
            {label}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}
