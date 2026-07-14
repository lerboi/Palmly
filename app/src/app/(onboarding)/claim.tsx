import { Platform, View } from 'react-native';
import { router, type Href } from 'expo-router';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { Button, Logomark, PrivacyBadge, Screen, Text } from '@/components/ui';
import { RedThread } from '@/features/reading/ShareView';
import { useReducedMotion, useTheme } from '@/theme';

/**
 * Recipient claim landing (UIUX §2.10, redesign R16d / v2 V10) — the personalized entry an invited
 * user lands on: the two avatars **fade in** and the red thread **draws** between them, then a
 * privacy trust line and a single explainer → capture. Below it, the "enter code" recovery path.
 * The two avatars are symmetric (inviter initial vs the Palmly brand mark for "you"), both in the
 * accent — the claret is reserved for the thread (§3.2). English, no CJK. Inviter name resolves
 * from the deferred deep-link context on device.
 */
const INVITER = 'Mei';

export default function Claim() {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';
  const zoom = (i: number) =>
    shouldAnimate ? ZoomIn.delay(i * theme.motion.stagger.reveal).duration(theme.motion.duration.base) : undefined;

  return (
    <Screen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Animated.View entering={zoom(0)}>
            <Avatar accessibilityLabel={`${INVITER}, who invited you`}>
              <Text variant="heading" color={theme.colors.accent}>
                {INVITER[0]}
              </Text>
            </Avatar>
          </Animated.View>
          <RedThread animate />
          <Animated.View entering={zoom(1)}>
            <Avatar accessibilityLabel="You">
              <Logomark size={34} tone="accent" accessibilityLabel="" />
            </Avatar>
          </Animated.View>
        </View>

        <Text variant="display" style={{ textAlign: 'center', marginTop: theme.spacing.xl }}>
          {INVITER} is waiting
        </Text>
        <Text
          variant="bodyLarge"
          tone="secondary"
          style={{ textAlign: 'center', marginTop: theme.spacing.sm, maxWidth: 320 }}
        >
          Scan your palm to reveal your compatibility — you&apos;ll get your own full reading too.
        </Text>
        <PrivacyBadge style={{ marginTop: theme.spacing.lg }} />
      </View>

      <View style={{ gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
        <Button label="Scan my palm" variant="primary" fullWidth onPress={() => router.push('/primer' as Href)} />
        <Button label="Have an invite? Enter code" variant="ghost" onPress={() => router.push('/primer' as Href)} />
      </View>
    </Screen>
  );
}

/** A circular avatar tile — both people share the same accent treatment (the thread carries the
 *  claret); differentiated only by their glyph so the pair reads symmetric. */
function Avatar({
  children,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  accessibilityLabel: string;
}) {
  const theme = useTheme();
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={{
        width: 64,
        height: 64,
        borderRadius: 32,
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
