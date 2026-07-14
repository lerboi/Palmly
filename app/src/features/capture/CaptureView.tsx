import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { Icon, Text } from '@/components/ui';
import { useTheme } from '@/theme';

/**
 * Guided capture UI (UIUX §2.3, redesign R13). The live `expo-camera` feed is device-only and
 * does NOT render in web export, so this draws the full overlay chrome (framing guide,
 * instruction pill, shutter + auto-capture ring, hand toggle) over a neutral feed STAND-IN — the
 * layout is screenshot-verifiable; the live-camera leg is marked [~]. The overlay colors are a
 * small theme-independent palette because they sit over a (dark) camera feed, not an app surface.
 */
const OVERLAY = {
  feed: '#17181D', // camera-feed placeholder (a real preview replaces this)
  guide: 'rgba(255,255,255,0.55)', // framing guide, not-ready
  guideReady: '#D9B25A', // framing guide, ready (ink → gold per §2.3)
  pill: 'rgba(255,255,255,0.94)',
  pillText: '#1A1A1F',
  control: 'rgba(255,255,255,0.16)',
  shutterRing: 'rgba(255,255,255,0.9)',
} as const;

export type CaptureState = 'searching' | 'ready' | 'captured';
export type CaptureMode = 'palm' | 'face';

// A soft hand outline for the palm guide (fits the 0–300 guide box).
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
  const guideColor = ready ? OVERLAY.guideReady : OVERLAY.guide;
  const ringProgress = state === 'captured' ? 1 : state === 'ready' ? 0.7 : 0;

  return (
    <View style={{ flex: 1, backgroundColor: OVERLAY.feed }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Top: single instruction pill (never stacked, §2.3). */}
        <View style={{ alignItems: 'center', paddingTop: theme.spacing.lg }}>
          <View
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

        {/* Center: framing guide. */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={300} height={320} viewBox="0 0 320 320">
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
            <Text variant="heading" color="#FFFFFF">
              ?
            </Text>
          </ControlButton>

          <Shutter progress={ringProgress} onPress={onShutter} />

          {mode === 'palm' ? (
            <Pressable
              onPress={onSwitchHand}
              accessibilityRole="button"
              accessibilityLabel={`Switch hand, currently ${handSide}`}
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: OVERLAY.control,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text variant="caption" color="#FFFFFF">
                {handSide === 'right' ? 'Right' : 'Left'}
              </Text>
            </Pressable>
          ) : (
            <ControlButton onPress={onSwitchHand} accessibilityLabel="Flip camera">
              <Icon name="camera" size={22} color="#FFFFFF" decorative />
            </ControlButton>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
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
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={{
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: OVERLAY.control,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </Pressable>
  );
}

function Shutter({ progress, onPress }: { progress: number; onPress?: () => void }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Capture" hitSlop={8}>
      <Svg width={84} height={84}>
        {/* progress ring (auto-capture fills over ~800ms when ready) */}
        <Circle cx={42} cy={42} r={r} stroke={OVERLAY.control} strokeWidth={4} fill="none" />
        <Circle
          cx={42}
          cy={42}
          r={r}
          stroke={OVERLAY.guideReady}
          strokeWidth={4}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
          transform="rotate(-90 42 42)"
        />
        {/* inner shutter */}
        <Circle cx={42} cy={42} r={26} fill={OVERLAY.shutterRing} />
      </Svg>
    </Pressable>
  );
}
