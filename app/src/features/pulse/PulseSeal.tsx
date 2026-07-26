import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, Pressable, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';

import { Icon, Text } from '@/components/ui';
import { usePressSpring, useReducedMotion, useTheme } from '@/theme';
import { stamp, tick } from '@/lib/haptics';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** How long the hold must be held. Long enough to feel deliberate, short enough not to be a chore. */
export const HOLD_MS = 600;
/** The control's diameter. Well past the 44pt a11y floor — this is the screen's one gesture. */
const SIZE = 64;
const RING = 2.5;

export interface PulseSealProps {
  /** Fired once the hold completes (or on a plain tap, under the fallbacks below). */
  onComplete: () => void;
  /** Label under the ring. */
  label?: string;
  accessibilityLabel?: string;
  /** Half-scale, no label — the stamp reused as the milestone sheet's art (02 §5). */
  compact?: boolean;
  /** Render the settled, stamped end-state (the milestone art, and the post-reveal card). */
  stamped?: boolean;
  disabled?: boolean;
}

/**
 * The press-and-hold reveal (Audit-5 · 02 §5) — the one-true-message scarcity gesture.
 *
 * Hold for {@link HOLD_MS} and the ring fills clockwise in the accent; let go early and it drains
 * back with no penalty and no scolding copy. Completing stamps the seal in with a firmer haptic.
 *
 * **The hold is flavour, never a gate.** Three separate paths reach the same reveal:
 *   • the hold itself;
 *   • a plain tap, always — required under a screen reader, where a timed press is not expressible,
 *     and correct for anyone whose grip or tremor makes a 600ms hold unreliable;
 *   • reduce-motion, which skips the fill entirely and reveals on tap.
 * This is the same philosophy as tap-vs-camera in the check-in ritual: the ritual is for the people
 * who want the ritual.
 *
 * Shared values are driven from EFFECTS keyed on state, never mutated in a handler — the house
 * pattern (`usePressSpring`), and what the React Compiler's immutability rule requires.
 */
export function PulseSeal({ onComplete, label = 'Hold to reveal', accessibilityLabel, compact = false, stamped = false, disabled = false }: PulseSealProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';
  const { scaleStyle, onPressIn: springIn, onPressOut: springOut } = usePressSpring(0.94);

  // A screen reader cannot express "hold for 600ms", so under one the control is a plain button.
  const [screenReader, setScreenReader] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isScreenReaderEnabled()
      .then((on) => active && setScreenReader(on))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', (on) => setScreenReader(on));
    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  // The hold gesture is a plain tap whenever a fill would be a lie about what is happening.
  const tapOnly = screenReader || !shouldAnimate;

  const [held, setHeld] = useState(false);
  const [done, setDone] = useState(stamped);
  const doneRef = useRef(stamped);

  const size = compact ? SIZE / 2 : SIZE;
  const r = (size - RING) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = useSharedValue(stamped ? 1 : 0);

  // The ring: fills while held, drains on release, and rests full once done.
  useEffect(() => {
    if (done) {
      progress.value = 1;
      return;
    }
    if (!shouldAnimate || tapOnly) {
      progress.value = 0;
      return;
    }
    progress.value = held
      ? withTiming(1, { duration: HOLD_MS, easing: Easing.linear })
      : // Drains back rather than snapping: releasing early is a choice, not a failure.
        withTiming(0, { duration: theme.motion.duration.base });
  }, [done, held, progress, shouldAnimate, tapOnly, theme.motion.duration.base]);

  const finish = useCallback(() => {
    if (doneRef.current || disabled) return;
    doneRef.current = true;
    setDone(true);
    setHeld(false);
    stamp();
    onComplete();
  }, [disabled, onComplete]);

  // The hold timer. Armed while held, and cleared on release AND on unmount — an armed hold that
  // outlived its card would reveal a line the user is no longer looking at.
  useEffect(() => {
    if (!held || tapOnly || done) return;
    const id = setTimeout(finish, HOLD_MS);
    return () => clearTimeout(id);
  }, [held, tapOnly, done, finish]);

  const onPressIn = useCallback(() => {
    if (disabled || doneRef.current) return;
    springIn();
    if (tapOnly) return;
    tick();
    setHeld(true);
  }, [disabled, springIn, tapOnly]);

  const onPressOut = useCallback(() => {
    springOut();
    setHeld(false);
  }, [springOut]);

  // The tap path. Under a screen reader / reduce-motion / web it IS the interaction; after a
  // completed hold it is already done and this no-ops.
  const onPress = useCallback(() => {
    if (tapOnly) finish();
  }, [finish, tapOnly]);

  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: circumference * (1 - progress.value) }));

  return (
    <View style={{ alignItems: 'center', gap: compact ? 0 : theme.spacing.sm }}>
      <Animated.View style={scaleStyle}>
        <Pressable
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          onPress={onPress}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? 'Reveal today’s line'}
          accessibilityHint={done ? undefined : 'Press and hold, or tap'}
          accessibilityState={{ disabled }}
          // The hit box stays square and generous even at compact size.
          hitSlop={compact ? 12 : 8}
          style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
        >
          <Svg width={size} height={size} style={{ position: 'absolute' }}>
            {/* The unfilled track — a hairline, so an untouched control reads as an invitation
                rather than as a progress bar sitting at zero. */}
            <Circle cx={size / 2} cy={size / 2} r={r} stroke={theme.colors.border} strokeWidth={RING} fill="none" />
            <AnimatedCircle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={theme.colors.accent}
              strokeWidth={RING}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              animatedProps={ringProps}
              // Start the fill at 12 o'clock and run clockwise.
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </Svg>
          <Icon name="seal" size={compact ? 16 : 26} color={done ? theme.colors.accent : theme.colors.textSecondary} decorative />
        </Pressable>
      </Animated.View>
      {compact ? null : (
        <Text variant="small" tone="secondary">
          {label}
        </Text>
      )}
    </View>
  );
}
