import { useEffect } from 'react';
import { Platform, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path, Rect, G } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useReducedMotion, useTheme } from '@/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * Palmly's brand mark (redesign §2/§7, v2 V5) — a CJK-free traced **palm**: three principal lines
 * (heart / head / life) as weighted ink. The **heart line is heaviest** and carries the single
 * vermilion accent (the brand "heart-line whisper"); head + life sit in ink, so the two-tone
 * survives the red accent without collapsing into one red (the claret heritage is reserved for the
 * seal/thread, never the mark — three-reds §3.2). The life line arcs like a thumb so the three
 * creases read as a hand, not a squiggle. Two forms: the frameless `mark` (splash, launcher,
 * headers) and a rounded-square `stamp` (the
 * share-card corner seal). Opt into a launcher draw-on with `animate` (native only; reduce-motion /
 * web → the static, fully-drawn end-state).
 */
export interface LogomarkProps {
  /** Square size in px. Default 48. */
  size?: number;
  /** `mark` = frameless lines; `stamp` = lines inside a rounded-square tile (the corner seal). */
  variant?: 'mark' | 'stamp';
  /** Semantic color role for the head/life lines + tile. Overridden by an explicit `color`. */
  tone?: 'ink' | 'accent' | 'heritage' | 'onAccent';
  /** Explicit head/life line + tile color (wins over `tone`). */
  color?: string;
  /** Explicit heart-line color (wins over the tone's paired heart color). */
  heartColor?: string;
  /** For `stamp`: fill the tile (solid) vs. outline only. Default outline. */
  filled?: boolean;
  /** Opt-in launcher draw-on (dash-offset stroke reveal). Default off. */
  animate?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

// 48×48 frame. Three principal palm lines: heart (upper), head (middle), life (arcs the thumb).
const HEART = 'M12 18.5 C20 14 30 15 36.5 19.5';
const HEAD = 'M11.5 24.5 C20 21.5 29.5 22.5 35.5 26';
const LIFE = 'M19.5 12.5 C14 18.5 13 28 18.5 36';
const LEN = { heart: 28, head: 26, life: 30 } as const; // approx path lengths for the draw-on

export function Logomark({
  size = 48,
  variant = 'mark',
  tone = 'ink',
  color,
  heartColor,
  filled = false,
  animate = false,
  accessibilityLabel = 'Palmly',
  style,
}: LogomarkProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = animate && !reduceMotion && Platform.OS !== 'web';

  // Two-tone that survives the red accent: head/life sit in the tone's base color; the heart
  // pairs against it (ink base → vermilion heart whisper; accent base → ink heart) so the mark
  // never reads as one flat red. `heritage`/`onAccent` are mono (seal / on-fill contrast fix).
  const tonePair = {
    ink: { line: colors.textPrimary, heart: colors.accent },
    accent: { line: colors.accent, heart: colors.textPrimary },
    heritage: { line: colors.heritageAccent, heart: colors.heritageAccent },
    onAccent: { line: colors.onAccent, heart: colors.onAccent },
  }[tone];

  const base = color ?? tonePair.line;
  const heart = heartColor ?? tonePair.heart;
  const isStamp = variant === 'stamp';
  // On a filled stamp the tile is inked, so the lines flip to the tile's contrast color.
  const lineInk = isStamp && filled ? colors.onAccent : base;
  const lineHeart = isStamp && filled ? colors.onAccent : heart;

  const w = (size / 48) * 3.2; // base line weight scales with size
  const wHeart = w * 1.2; // the heart line is heaviest (engraved focal stroke)
  const wLine = w * 0.8; // head + life sit lighter so they read as two lines, not a blob

  // Draw-on (native only): head/life reveal first, the heart whisper blooms in last.
  const progress = useSharedValue(1);
  const heartProgress = useSharedValue(1);
  useEffect(() => {
    if (!shouldAnimate) {
      progress.value = 1;
      heartProgress.value = 1;
      return;
    }
    progress.value = 0;
    heartProgress.value = 0;
    progress.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
    heartProgress.value = withDelay(280, withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) }));
  }, [shouldAnimate, progress, heartProgress]);

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      style={style}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      {isStamp && (
        <Rect
          x={3}
          y={3}
          width={42}
          height={42}
          rx={10}
          fill={filled ? base : 'none'}
          stroke={base}
          strokeWidth={w * 0.9}
        />
      )}
      <G fill="none" strokeLinecap="round">
        <Stroke d={LIFE} len={LEN.life} color={lineInk} width={wLine} progress={progress} />
        <Stroke d={HEAD} len={LEN.head} color={lineInk} width={wLine} progress={progress} />
        <Stroke d={HEART} len={LEN.heart} color={lineHeart} width={wHeart} progress={heartProgress} />
      </G>
    </Svg>
  );
}

/** One palm line, revealed by animating its dash offset from full length → 0 (static at rest). */
function Stroke({
  d,
  len,
  color,
  width,
  progress,
}: {
  d: string;
  len: number;
  color: string;
  width: number;
  progress: SharedValue<number>;
}) {
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: len * (1 - progress.value) }));
  return (
    <AnimatedPath
      d={d}
      stroke={color}
      strokeWidth={width}
      strokeDasharray={len}
      animatedProps={animatedProps}
    />
  );
}
