import { useEffect } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Button, Icon, Text } from '@/components/ui';
import { usePressSpring, useReducedMotion, useTheme } from '@/theme';
import { captureInstruction, type CaptureMode, type CaptureState } from './capture';

export { captureInstruction, CORRECTIVE_STATES, CAPTURE_STATES, type CaptureMode, type CaptureState } from './capture';

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

// A credible upright five-digit hand outline for the palm guide (single closed path, 320 box) —
// four fingers with valleys + an articulated thumb, so it frames a real hand, not a cartoon paw
// (audit F0.11 / UIUX §2.3).
const PALM_GUIDE =
  'M118 298 C96 250 78 250 74 214 C66 200 50 200 44 196 C36 188 30 176 34 168 Q40 156 52 152 ' +
  'C64 148 70 150 92 150 L96 78 Q106 66 116 78 L118 150 Q128 160 138 150 L146 52 Q156 40 166 52 ' +
  'L168 150 Q177 160 186 150 L194 68 Q204 56 214 68 L216 150 Q224 160 232 152 L240 98 Q249 88 258 98 ' +
  'L256 158 C252 230 240 270 202 298 C180 312 140 312 118 298 Z';

interface CaptureViewProps {
  mode: CaptureMode;
  state: CaptureState;
  handSide?: 'left' | 'right';
  /** The native module's hand landmarks (0–1 normalized points), drawn as a faint skeleton. Device-only. */
  landmarks?: [number, number][];
  onShutter?: () => void;
  onSwitchHand?: () => void;
  onHelp?: () => void;
  /** Review actions (§2.3): keep the frozen crop or retake. */
  onConfirm?: () => void;
  onRetake?: () => void;
}

export function CaptureView({
  mode,
  state,
  handSide = 'right',
  landmarks,
  onShutter,
  onSwitchHand,
  onHelp,
  onConfirm,
  onRetake,
}: CaptureViewProps) {
  const theme = useTheme();
  const instruction = captureInstruction(state, mode, handSide);
  const isReview = state === 'review';
  const ready = state === 'ready' || state === 'captured';
  const guideColor = ready || isReview ? theme.colors.accent : OVERLAY.guide;
  const ringTarget = state === 'captured' ? 1 : state === 'ready' ? 0.7 : 0;

  // Announce the guidance to screen readers whenever it changes (the pill is also a live region).
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(instruction);
  }, [instruction]);

  return (
    <View style={{ flex: 1, backgroundColor: OVERLAY.feed }}>
      {/* Paper-toned radial vignette over the flat feed stand-in (UIUX §2.3) — a warm centre glow
          fading to a soft dark edge, so the placeholder reads with depth, not as a flat block. */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
        <Defs>
          <RadialGradient id="feedVignette" cx="50%" cy="42%" r="72%">
            <Stop offset="0" stopColor="#FAF9F7" stopOpacity={0.05} />
            <Stop offset="0.55" stopColor="#17181D" stopOpacity={0} />
            <Stop offset="1" stopColor="#0A0B0F" stopOpacity={0.45} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#feedVignette)" />
      </Svg>
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
            {state === 'captured' || isReview ? (
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
            {/* The native module's landmarks render as faint fingertip nodes — the "we can see you"
                signal (§2.3). Device-only: `landmarks` is undefined in the web/stand-in render. */}
            {landmarks?.map((p, i) => (
              <Circle key={`lm-${i}`} cx={p[0] * 320} cy={p[1] * 320} r={3.5} fill={theme.colors.accent} fillOpacity={0.7} />
            ))}
          </Svg>
        </View>

        {/* Bottom: the review step (§2.3) swaps in Retake / Use photo; otherwise help · shutter · toggle. */}
        {isReview ? (
          <View style={{ flexDirection: 'row', gap: theme.spacing.md, paddingHorizontal: theme.spacing.xl, paddingBottom: theme.spacing.lg }}>
            <Button label="Retake" variant="secondary" onPress={onRetake} style={{ flex: 1 }} />
            <Button label="Use photo" variant="primary" onPress={onConfirm} style={{ flex: 1 }} />
          </View>
        ) : (
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
              /* Face's flip-camera control is not wired (face capture is gated in F1.T6) — a spacer
                 keeps the shutter centred rather than a dead tap (audit F1.4). */
              <View style={controlStyle} />
            )}
          </View>
        )}
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

function PressScale({ children }: { children: React.ReactNode }) {
  const { scaleStyle } = usePressSpring(0.92);
  return <Animated.View style={scaleStyle}>{children}</Animated.View>;
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
  const { scaleStyle: style, onPressIn, onPressOut } = usePressSpring(0.92);
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
  const { scaleStyle: style, onPressIn, onPressOut } = usePressSpring(0.94);

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
