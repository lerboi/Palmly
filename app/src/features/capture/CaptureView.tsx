import { useEffect } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Ellipse, Line, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Button, Icon, Text } from '@/components/ui';
import { HAND_OUTLINE_PATH } from '@/components/palm-diagram/handOutlinePath';
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

/** MediaPipe hand-skeleton bone pairs (landmark indices) for the faint §2.3 overlay. */
const HAND_BONES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];
/** Fingertip landmark indices — rendered as brighter nodes (§2.3 "fingertip nodes"). */
const FINGERTIPS = new Set([4, 8, 12, 16, 20]);

interface CaptureViewProps {
  mode: CaptureMode;
  state: CaptureState;
  handSide?: 'left' | 'right';
  /** The live hand landmarks in SCREEN-SPACE pixels (the engine pre-maps the camera frame onto
   *  the cover-fitted preview), drawn as the faint engraved skeleton + fingertip nodes (§2.3
   *  "we can see you"). Device-only. */
  landmarks?: [number, number][];
  /** The live camera preview (or a frozen captured frame) rendered full-bleed behind the overlay
   *  chrome. Device-only — omitted on web/tests, where the flat feed stand-in shows instead. */
  feed?: React.ReactNode;
  /** Torch toggle (palm/back-camera only — the Phase-1 stand-in for the §2.3 `dark` guidance).
   *  Omit to hide the control (face/front camera, review, stand-in). */
  torch?: { on: boolean; onToggle: () => void };
  /** Disables Retake + spins "Use photo" while the confirmed frame uploads (no double-submit). */
  confirmLoading?: boolean;
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
  feed,
  torch,
  confirmLoading = false,
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
      {/* The live camera preview (or frozen captured frame) sits full-bleed at the back on device;
          web/tests pass no feed and keep the flat `OVERLAY.feed` stand-in below the vignette. */}
      {feed ? <View style={StyleSheet.absoluteFill}>{feed}</View> : null}
      {/* Paper-toned radial vignette over the feed (UIUX §2.3) — a warm centre glow fading to a soft
          dark edge, so the frame reads with depth, not as a flat block. */}
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
      {/* The live landmarks as a faint engraved skeleton over the feed — the "we can see you"
          signal (§2.3). Screen-space px from the engine; device-only. */}
      {landmarks && landmarks.length >= 21 ? (
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          {HAND_BONES.map(([a, b]) => {
            const pa = landmarks[a];
            const pb = landmarks[b];
            if (!pa || !pb) return null;
            return (
              <Line
                key={`bone-${a}-${b}`}
                x1={pa[0]} y1={pa[1]} x2={pb[0]} y2={pb[1]}
                stroke="rgba(255,255,255,0.28)"
                strokeWidth={1.5}
              />
            );
          })}
          {landmarks.map((p, i) => (
            <Circle
              key={`lm-${i}`}
              cx={p[0]}
              cy={p[1]}
              r={FINGERTIPS.has(i) ? 5 : 2.5}
              fill={FINGERTIPS.has(i) ? theme.colors.accent : 'rgba(255,255,255,0.4)'}
              fillOpacity={FINGERTIPS.has(i) ? 0.75 : 1}
            />
          ))}
        </Svg>
      ) : null}
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
          {/* Torch toggle under the pill, right-aligned (never overlapping the centered pill). */}
          {torch ? (
            <View style={{ alignSelf: 'flex-end', paddingRight: theme.spacing.xl, marginTop: theme.spacing.sm }}>
              <PressScale>
                <Pressable
                  onPress={torch.onToggle}
                  accessibilityRole="button"
                  accessibilityLabel="Torch"
                  accessibilityState={{ selected: torch.on }}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: torch.on ? OVERLAY.pill : OVERLAY.control,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="torch" size={22} color={torch.on ? theme.colors.accent : OVERLAY.onControl} decorative />
                </Pressable>
              </PressScale>
            </View>
          ) : null}
        </View>

        {/* Center: framing guide (uniform 320×320, centered in the shared 0–1000 frame). The palm
            guide is the same clean open-palm outline as the onboarding hero, so the shape the user
            aligns to matches the brand imagery they just saw. */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={320} height={320} viewBox="0 0 1000 1000">
            {mode === 'palm' ? (
              <Path
                d={HAND_OUTLINE_PATH}
                transform={handSide === 'left' ? 'translate(1000,0) scale(-1,1)' : undefined}
                fill="none"
                stroke={guideColor}
                strokeWidth={9}
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray={state === 'searching' ? '34 28' : undefined}
              />
            ) : (
              <Ellipse
                cx={500}
                cy={500}
                rx={344}
                ry={438}
                fill="none"
                stroke={guideColor}
                strokeWidth={9}
                strokeDasharray={state === 'searching' ? '34 28' : undefined}
              />
            )}
          </Svg>
        </View>

        {/* Bottom: the review step (§2.3) swaps in Retake / Use photo; otherwise help · shutter · toggle. */}
        {isReview ? (
          <View style={{ flexDirection: 'row', gap: theme.spacing.md, paddingHorizontal: theme.spacing.xl, paddingBottom: theme.spacing.lg }}>
            <Button label="Retake" variant="secondary" onPress={onRetake} disabled={confirmLoading} style={{ flex: 1 }} />
            <Button label="Use photo" variant="primary" onPress={onConfirm} loading={confirmLoading} style={{ flex: 1 }} />
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
