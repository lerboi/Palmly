import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Button, HeaderIconButton, Icon, Screen, Text } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/theme';
import { success } from '@/lib/haptics';
import type { StoredHandSignature } from '@/lib/readings';
import { CHECKIN_PRIVACY_LINE, checkInMessage, checkInPhase, isFallbackPrimary } from './checkin';
import { GlassPlate } from './GlassPlate';
import { useSealCheckIn } from './useSealCheckIn';

export interface SealCheckInProps {
  /** The enrolled palm signature. Null → the ritual explains and offers the tap. */
  enrolled: StoredHandSignature | null;
  /** The streak this seal will produce, for the success line ("Your lines hold. Day 12."). */
  day?: number;
  /** Matched on-device → seal the day with `method: 'palm'`. */
  onSealed: () => void;
  /** The always-available escape hatch → seal with `method: 'tap'`. Counts exactly the same. */
  onTapInstead: () => void;
  onClose: () => void;
}

/** How long the success stamp holds before the ritual dismisses itself. */
const SETTLE_MS = 800;

/**
 * Seal the day (Audit-5 · 02 §6) — the five-second ritual.
 *
 * Hold your palm up; the app re-reads its shape on-device, confirms it is the same hand it enrolled,
 * and stamps the day. It is the product's core promise ("same palm, same reading") made mechanical
 * and repeated every morning — day 47 of "your lines hold" is a receipt no horoscope app can copy.
 *
 * Two rules govern every pixel here:
 *   1. **No photo, no upload.** The engine has no capture path at all (see `useSealCheckIn.native`),
 *      and the promise is on screen in every phase, not buried in a settings page.
 *   2. **Never a gate.** The tap fallback is present from the first second and becomes the primary
 *      button after twenty. A user who cannot make the camera work still keeps their streak, and is
 *      never told their hand failed to be theirs.
 */
export function SealCheckIn({ enrolled, day, onSealed, onTapInstead, onClose }: SealCheckInProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';
  const engine = useSealCheckIn({ enrolled });

  const phase = checkInPhase({
    elapsedMs: engine.elapsedMs,
    handPresent: engine.handPresent,
    poseReady: engine.poseReady,
    matchStreak: engine.matchStreak,
    settled: engine.matched,
  });

  // Success: haptic, hold the stamp for a beat, then hand back to Today — where the card continues
  // straight into its reveal, so the ritual IS the reveal gesture rather than a detour before it.
  // `engine.matched` already latches, so this effect runs exactly once and needs no state of its own.
  const matched = phase === 'matched';
  useEffect(() => {
    if (!matched) return;
    success();
    const id = setTimeout(onSealed, SETTLE_MS);
    return () => clearTimeout(id);
  }, [matched, onSealed]);

  const unsupported = engine.gate === 'unsupported' || engine.gate === 'blocked';

  return (
    <Screen>
      <View style={{ flex: 1 }}>
        {/* The live feed, full-bleed and underneath everything. */}
        <View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.colors.textPrimary }]}>
          {engine.feed}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <HeaderIconButton name="close" accessibilityLabel="Close" onPress={onClose} style={{ marginLeft: -theme.spacing.md }} />
          <View style={{ flex: 1 }} />
        </View>

        <View style={{ flex: 1 }} />

        {/* The seal stamp, centre-screen, on success only. */}
        {phase === 'matched' ? (
          <Animated.View
            entering={shouldAnimate ? FadeIn.duration(theme.motion.duration.base) : undefined}
            style={{ alignItems: 'center', marginBottom: theme.spacing.xl }}
          >
            <Icon name="seal" size={72} color={theme.colors.accent} decorative />
          </Animated.View>
        ) : null}

        {/* The copy plate — the ONE sanctioned glass surface (02 §1.2), because it sits over a live
            camera feed and translucency is the honest material there. */}
        <GlassPlate style={{ marginBottom: theme.spacing.lg, gap: theme.spacing.sm }}>
          <Text
            variant="bodyLarge"
            color="#FFFFFF"
            accessibilityLiveRegion="polite"
            // The plate is over a camera feed whose brightness we do not control, so its text is
            // fixed white on a scrim rather than a theme role that assumes a known background.
          >
            {unsupported ? 'The camera isn’t available — you can seal today with a tap.' : checkInMessage(phase, day)}
          </Text>
          {/* The privacy promise, in EVERY phase (acceptance 02 §10.4) — not a one-time interstitial
              a user has to remember reading. */}
          <Text variant="small" color="rgba(255,255,255,0.82)">
            {CHECKIN_PRIVACY_LINE}
          </Text>
          {engine.error ? (
            <Text variant="small" color="rgba(255,255,255,0.82)">
              {engine.error}
            </Text>
          ) : null}
        </GlassPlate>

        {/* The escape hatch: present from the first second, primary after twenty. */}
        {phase !== 'matched' ? (
          <Button
            label="Seal it with a tap instead"
            variant={isFallbackPrimary(phase) || unsupported ? 'primary' : 'ghost'}
            fullWidth
            style={{ marginBottom: theme.spacing.lg }}
            onPress={onTapInstead}
          />
        ) : null}
      </View>
    </Screen>
  );
}
