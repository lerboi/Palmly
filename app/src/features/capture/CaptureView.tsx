import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Icon, Text } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Guided capture UI (UIUX §2.3, redesign R13 / v2 V11). The live `expo-camera` feed is device-only
 * and does NOT render in web export, so this draws the full overlay chrome (framing guide,
 * instruction pill, shutter + auto-capture ring, hand toggle) over a neutral feed STAND-IN — the
 * layout is screenshot-verifiable; the live-camera + landmark legs are marked [~]. The overlay
 * neutrals are a small theme-independent palette because they sit over a (dark) camera feed, not an
 * app surface — but the READY guide + the auto-capture ring now read from `theme.colors.accent`
 * (the brand identity; the old gold is gone).
 */
const OVERLAY = {
  feed: '#17181D', // camera-feed placeholder (a real preview replaces this)
  guide: 'rgba(255,255,255,0.55)', // framing guide, not-ready
  pill: 'rgba(255,255,255,0.94)',
  pillText: '#1A1A1F',
  control: 'rgba(255,255,255,0.16)',
  onControl: '#FFFFFF',
  shutterRing: 'rgba(255,255,255,0.9)',
  track: 'rgba(255,255,255,0.16)',
} as const;

export type CaptureState = 'searching' | 'ready' | 'captured';
export type CaptureMode = 'palm' | 'face';

// A soft hand outline for the palm guide (centered in the 320 guide box).
const PALM_GUIDE =
  'M70 285 C40 235 45 175 62 130 C68 96 74 90 88 92 C90 60 92 32 112 34 C132 36 130 74 132 96 L150 96 C154 52 160 20 186 22 C212 24 214 66 212 108 L230 110 C240 74 258 52 282 66 C300 78 286 150 262 176 C300 200 322 244 300 290 Z';

interface CaptureViewProps {
  mode: CaptureMode;
  state: CaptureState;
  instruction: string;
  handSide?: 'left' | 'right';
  onShutter?: () => void;
  onSwitchHand?: () => void;
  onHelp?: () => void;
}

export function CaptureView({
  mode,
  state,
  instruction,
  handSide = 'right',
  onShutter,
  onSwitchHand,
  onHelp,
}: CaptureViewProps) {
  const theme = useTheme();
  const ready = state === 'ready' || state === 'captured';
  const guideColor = ready ? theme.colors.accent : OVERLAY.guide;
  const ringTarget = state === 'captured' ? 1 : state === 'ready' ? 0.7 : 0;

  // Announce the guidance to screen readers whenever it changes (the pill is also a live region).
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(instruction);
  }, [instruction]);

  return (
    <View style={{ flex: 1, backgroundColor: OVERLAY.feed }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Top: single instruction pill (never stacked, §2.3). */}
        <View style={{ alignItems: 'center', paddingTop: theme.spacing.lg }}>
          <View
            accessibilityLiveRegion="polite"
            accessibilityRole="text"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.sm,
              backgroundColor: OVERLAY.pill,
              paddingHorizontal: theme.spacing.lg,
              paddingVertical: theme.spacing.sm,
              borderRadius: theme.radii.pill,
              maxWidth: '88%',
            }}
          >
            {state === 'captured' ? (
              <Icon name="check" size={18} color={theme.colors.success} decorative />
            ) : null}
            <Text variant="bodyMedium" color={OVERLAY.pillText}>
              {instruction}
            </Text>
          </View>
        </View>

        {/* Center: framing guide (uniform 320×320, centered path/oval). */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={320} height={320} viewBox="0 0 320 320">
            {mode === 'palm' ? (
              <Path
                d={PALM_GUIDE}
                transform={handSide === 'left' ? 'translate(320,0) scale(-1,1)' : undefined}
                fill="none"
                stroke={guideColor}
                strokeWidth={3}
                strokeLinejoin="round"
                strokeDasharray={state === 'searching' ? '10 10' : undefined}
              />
            ) : (
              <Ellipse
                cx={160}
                cy={160}
                rx={110}
                ry={140}
                fill="none"
                stroke={guideColor}
                strokeWidth={3}
                strokeDasharray={state === 'searching' ? '10 10' : undefined}
              />
            )}
          </Svg>
        </View>

        {/* Bottom controls: help · shutter (+ auto-capture ring) · hand toggle. */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: theme.spacing.xl,
            paddingBottom: theme.spacing.lg,
          }}
        >
          <ControlButton onPress={onHelp} accessibilityLabel="Help">
            <Icon name="help" size={24} color={OVERLAY.onControl} />
          </ControlButton>

          <Shutter target={ringTarget} accent={theme.colors.accent} animate={ready} onPress={onShutter} />

          {mode === 'palm' ? (
            <PressScale>
              <Pressable
                onPress={onSwitchHand}
                accessibilityRole="button"
                accessibilityLabel={`Switch hand, currently ${handSide}`}
                style={controlStyle}
              >
                <Text variant="caption" color={OVERLAY.onControl}>
                  {handSide === 'right' ? 'Right' : 'Left'}
                </Text>
              </Pressable>
            </PressScale>
          ) : (
            <ControlButton onPress={onSwitchHand} accessibilityLabel="Flip camera">
              <Icon name="camera" size={22} color={OVERLAY.onControl} decorative />
            </ControlButton>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const controlStyle = {
  width: 56,
  height: 56,
  borderRadius: 28,
  backgroundColor: OVERLAY.control,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

/** Shared reduce-motion-aware press-scale (native only; web / reduce-motion → resting). */
function usePressScale(min = 0.92) {
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
    scale.value = withSpring(held ? min : 1, press);
  }, [held, shouldAnimate, scale, press, min]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return { style, onPressIn: () => setHeld(true), onPressOut: () => setHeld(false) };
}

function PressScale({ children }: { children: React.ReactNode }) {
  const { style } = usePressScale();
  return <Animated.View style={style}>{children}</Animated.View>;
}

function ControlButton({
  children,
  onPress,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  accessibilityLabel: string;
}) {
  const { style, onPressIn, onPressOut } = usePressScale();
  return (
    <Animated.View style={style}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={controlStyle}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

/** The shutter + the auto-capture ring, which fills ~800ms when ready (native; web → static end). */
function Shutter({
  target,
  accent,
  animate,
  onPress,
}: {
  target: number;
  accent: string;
  animate: boolean;
  onPress?: () => void;
}) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const reduceMotion = useReducedMotion();
  const shouldAnimate = animate && !reduceMotion && Platform.OS !== 'web';
  const { style, onPressIn, onPressOut } = usePressScale(0.94);

  const progress = useSharedValue(target);
  useEffect(() => {
    if (!shouldAnimate) {
      progress.value = target;
      return;
    }
    progress.value = 0;
    progress.value = withTiming(target, { duration: 800, easing: Easing.out(Easing.cubic) });
  }, [shouldAnimate, target, progress]);
  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - progress.value) }));

  return (
    <Animated.View style={style}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel="Capture"
        hitSlop={8}
      >
        <Svg width={84} height={84}>
          <Circle cx={42} cy={42} r={r} stroke={OVERLAY.track} strokeWidth={4} fill="none" />
          <AnimatedCircle
            cx={42}
            cy={42}
            r={r}
            stroke={accent}
            strokeWidth={4}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={c}
            animatedProps={ringProps}
            transform="rotate(-90 42 42)"
          />
          <Circle cx={42} cy={42} r={26} fill={OVERLAY.shutterRing} />
        </Svg>
      </Pressable>
    </Animated.View>
  );
}
