import { useEffect, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { router, type Href } from 'expo-router';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { HandOutline } from '@/components/palm-diagram/HandOutline';
import { AppHeader, Button, Icon, Screen, Text } from '@/components/ui';
import { usePressSpring, useReducedMotion, useTheme } from '@/theme';
import { track } from '@/lib/analytics';

type Hand = 'left' | 'right';

/**
 * Onboarding A3 (UIUX §2.1 / U5, redesign "premium outline") — the one "quiz" question, which
 * doubles as pipeline input. Two selectable hand cards (clean outline, mirrored for the left) with
 * a press-spring + an animated check, grouped as a `radiogroup`. Copy pared to the question + one
 * line; the old tradition note + ghost watermark are gone (aggressive-minimal pass). CTA: "Read my
 * palm." English-first, no CJK.
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

      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text variant="title" style={{ textAlign: 'center' }}>
          Which hand do you write with?
        </Text>
        <Text variant="body" tone="secondary" style={{ textAlign: 'center', marginTop: theme.spacing.sm }}>
          We read your dominant hand first.
        </Text>

        <View
          accessibilityRole="radiogroup"
          style={{ flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.xxxl }}
        >
          <HandCard label="Left" hand="left" selected={hand === 'left'} onSelect={() => setHand('left')} />
          <HandCard label="Right" hand="right" selected={hand === 'right'} onSelect={() => setHand('right')} />
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
  const { scaleStyle, onPressIn, onPressOut } = usePressSpring(0.97);

  return (
    <Animated.View style={[{ flex: 1 }, scaleStyle]}>
      <Pressable
        onPress={onSelect}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={`${label} hand`}
        style={[
          {
            alignItems: 'center',
            paddingVertical: theme.spacing.xl,
            borderRadius: theme.radii.lg,
            borderWidth: selected ? theme.strokes.bold : theme.strokes.hairline,
            borderColor: selected ? theme.colors.accent : theme.colors.border,
            backgroundColor: selected ? theme.colors.accentMuted : theme.colors.surfaceRaised,
          },
          theme.shadow.sm,
        ]}
      >
        <HandOutline
          size={104}
          mirror={hand === 'left'}
          color={selected ? theme.colors.accent : theme.colors.textSecondary}
          accessibilityLabel=""
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginTop: theme.spacing.md }}>
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
