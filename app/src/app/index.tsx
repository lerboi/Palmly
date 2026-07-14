import { Platform, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { PalmDiagram } from '@/components/palm-diagram/PalmDiagram';
import { Button, Logomark, Screen, Text } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/theme';
import { PREVIEW_GEOMETRY } from '@/features/reading/reveal';

/**
 * Root landing (redesign R11, v2 V9) — the brand moment. A faint ghost-hand echoes the welcome
 * hero so the page isn't blank; the traced-palm Logomark **draws on** (ink lines + a vermilion
 * heart-line whisper) above the wordmark and value line, which **stagger in**; the single
 * vermilion CTA owns the accent. English-first, no CJK. The dev route-map is `__DEV__`-only.
 * The real first-open logic (anonymous session, invite deep-link branch) is wired in P3.T6 / P8.
 */
export default function Index() {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';
  const enter = (i: number) =>
    shouldAnimate
      ? FadeInDown.delay(i * theme.motion.stagger.reveal).duration(theme.motion.duration.base)
      : undefined;

  return (
    <Screen>
      {/* Faint ghost-hand brand background — echoes the welcome hero so the landing isn't blank. */}
      <View style={styles.ghost} pointerEvents="none">
        <PalmDiagram
          geometry={PREVIEW_GEOMETRY}
          size={380}
          animate={false}
          accessibilityLabel=""
          style={{ opacity: 0.07 }}
        />
      </View>

      <View style={styles.lockup}>
        {/* Mark draws on; the wordmark + value line stagger in beneath it. */}
        <Logomark size={76} tone="ink" animate accessibilityLabel="Palmly" />
        <Animated.View entering={enter(0)}>
          <Text variant="display" style={{ marginTop: theme.spacing.sm }}>
            Palmly
          </Text>
        </Animated.View>
        <Animated.View entering={enter(1)}>
          <Text
            variant="bodyLarge"
            tone="secondary"
            style={[styles.tagline, { marginTop: theme.spacing.sm }]}
          >
            Read your palm from a single photo.
          </Text>
        </Animated.View>
      </View>

      <Animated.View entering={enter(2)} style={[styles.footer, { paddingBottom: theme.spacing.md }]}>
        <Button
          label="Get started"
          variant="primary"
          fullWidth
          onPress={() => router.push('/welcome' as Href)}
        />
        <Text variant="caption" tone="tertiary" style={[styles.legal, { marginTop: theme.spacing.sm }]}>
          For reflection &amp; entertainment
        </Text>
        {__DEV__ ? (
          <Button
            label="Dev · route map"
            variant="ghost"
            size="md"
            style={{ alignSelf: 'center', marginTop: theme.spacing.xs }}
            onPress={() => router.push('/dev' as Href)}
          />
        ) : null}
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  ghost: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  lockup: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tagline: { textAlign: 'center' },
  footer: { alignSelf: 'stretch' },
  legal: { textAlign: 'center' },
});
