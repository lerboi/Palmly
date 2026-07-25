import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Redirect, router, useLocalSearchParams, type Href } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { PalmDiagram } from '@/components/palm-diagram/PalmDiagram';
import { Button, Logomark, Screen, Text } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/theme';
import { ABSTRACT_GEOMETRY } from '@/features/reading/reveal';
import { loadClaimContext } from '@/lib/claim';
import { hasFirstReadingComplete } from '@/lib/session';

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

  // First-open routing (audit F0.5 (d) + F0.7). Precedence: (1) an invite — a token in the initial
  // URL (`palmly://…?token=`) redirects synchronously, or a persisted claim context re-offers
  // `/claim`; (2) a returning user (has seen a real reveal) → the daily-fortune home; (3) else the
  // launcher. The async checks resolve fast; until then the launcher shows (no blank flash).
  const params = useLocalSearchParams<{ token?: string }>();
  const hasToken = typeof params.token === 'string' && !!params.token;
  const [asyncRoute, setAsyncRoute] = useState<'claim' | 'fortune' | null>(null);
  const [resolved, setResolved] = useState(false);
  useEffect(() => {
    let active = true;
    (async () => {
      const claim = await loadClaimContext();
      if (!active) return;
      if (claim) {
        setAsyncRoute('claim');
        setResolved(true);
        return;
      }
      const returning = await hasFirstReadingComplete();
      if (active) {
        setAsyncRoute(returning ? 'fortune' : null);
        setResolved(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Advancing is EXPLICIT (SN-8). A 1500ms auto-advance timer used to fire alongside the draw and
  // race the user's own tap — whichever won, the transition felt arbitrary. Tap the lockup or the
  // CTA; nothing moves on its own.
  const advance = () => router.replace('/welcome' as Href);

  if (hasToken) {
    return <Redirect href={`/claim?token=${params.token}` as Href} />;
  }
  if (asyncRoute === 'claim') return <Redirect href={'/claim' as Href} />;
  if (asyncRoute === 'fortune') return <Redirect href={'/fortune' as Href} />;

  // Until routing resolves, hold a bare themed frame — NOT the launcher (SN-8). A returning user
  // used to watch the marketing lockup mount and its logo draw start, only for the redirect to
  // yank it away a frame or two later. The two AsyncStorage reads behind `resolved` are fast, so
  // this is a brief paper-colored hold that reads as part of the splash rather than as a screen.
  if (!resolved) return <Screen><View /></Screen>;

  return (
    <Screen>
      {/* Faint ghost-hand brand background — echoes the welcome hero so the landing isn't blank. */}
      <View style={styles.ghost} pointerEvents="none">
        <PalmDiagram
          geometry={ABSTRACT_GEOMETRY}
          size={380}
          animate={false}
          accessibilityLabel=""
          style={{ opacity: 0.07 }}
        />
      </View>

      {/* A0: the whole brand region is pressable — tap anywhere to advance (the footer keeps the
          explicit CTA). Pairs with the native auto-advance above. */}
      <Pressable style={styles.lockup} onPress={advance} accessibilityRole="button" accessibilityLabel="Enter Palmly">
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
      </Pressable>

      <Animated.View entering={enter(2)} style={[styles.footer, { paddingBottom: theme.spacing.md }]}>
        <Button
          label="Get started"
          variant="primary"
          fullWidth
          onPress={advance}
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
