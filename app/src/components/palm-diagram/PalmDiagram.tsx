import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';
import { buildDiagram, ENGLISH_LINE_LABEL, LINE_LABEL, type DiagramStroke, type LineGeometry } from './geometry';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// A soft, stylized palm silhouette (1000-frame) drawn faintly behind the lines so the creases
// read as a hand, not floating strokes. Purely decorative negative space — not from geometry.
const HAND_SILHOUETTE =
  'M235 560 C210 470 218 420 246 414 C250 356 250 298 286 298 C322 298 322 356 324 414 L352 414 C356 338 360 250 400 250 C440 250 444 340 446 420 L474 420 C478 348 486 270 520 272 C554 274 552 352 548 424 L574 424 C584 372 606 330 634 346 C664 364 646 454 626 522 C704 548 764 622 744 728 C716 858 560 942 430 930 C300 918 250 840 232 720 C152 700 150 612 235 560 Z';

export interface PalmDiagramProps {
  /** The user's stored `line_geometry` (Backend §6.2), points in a 0–1000 frame. */
  geometry: LineGeometry;
  /** Square render size in px (default 300). */
  size?: number;
  /** The line being discussed → drawn in the accent (section cards pass this). */
  highlightedLine?: string;
  /** Highlighted by default when no `highlightedLine` (the reveal hero, e.g. heart + fate). */
  signatureLines?: string[];
  /** Render the line labels. Default OFF (redesign §2 — the hero is label-free). */
  showLabels?: boolean;
  /** Use the traditional CJK labels (心·智·命·运) instead of English. Only with `showLabels`. */
  traditional?: boolean;
  /** Draw the faint hand silhouette behind the lines. Default true. */
  silhouette?: boolean;
  /** Play the ~1.2s draw-on (native only; respects reduce-motion). Default true. */
  animate?: boolean;
  /** Accessibility label for the diagram (a meaningful image). Pass `""` to mark decorative. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * The user's own palm as an engraved ink line-diagram (UIUX §2.5, redesign §2) — the trust
 * artifact ("these are *my* lines"), the privacy story (a diagram, never the photo), and the
 * share asset. Weighted ink over a faint hand silhouette; the signature/highlighted line(s)
 * glow in the accent. A ~1.2s draw-on plays on native (reduce-motion → instant; web → static
 * end-state). Deterministic path math lives in the pure `geometry.ts`.
 */
export function PalmDiagram({
  geometry,
  size = 300,
  highlightedLine,
  signatureLines,
  showLabels = false,
  traditional = false,
  silhouette = true,
  animate = true,
  accessibilityLabel = 'Your palm line diagram',
  style,
}: PalmDiagramProps) {
  const { colors, fonts } = useTheme();
  const strokes = buildDiagram(geometry, { size, highlightedLine, signatureLines });
  const u = (n: number) => (n * size) / 1000;

  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => active && setReduceMotion(v));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  // Fail-safe: progress starts fully drawn (1) so the diagram is never blank if the worklet
  // doesn't run (web / reanimated absent). The draw-on re-triggers it on native.
  const progress = useSharedValue(1);
  const shouldAnimate = animate && !reduceMotion && Platform.OS !== 'web';
  useEffect(() => {
    if (!shouldAnimate) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, { duration: 1200, easing: Easing.out(Easing.cubic) });
  }, [shouldAnimate, progress]);

  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={style}
      accessibilityRole={accessibilityLabel ? 'image' : 'none'}
      accessibilityLabel={accessibilityLabel || undefined}
      aria-hidden={accessibilityLabel ? undefined : true}
    >
      <Defs>
        <LinearGradient id="palmAccent" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.accent} />
          <Stop offset="1" stopColor={colors.accentPressed} />
        </LinearGradient>
      </Defs>

      {/* Faint hand silhouette — negative space so the lines read as a palm. */}
      {silhouette ? (
        <Path
          d={HAND_SILHOUETTE}
          transform={`scale(${size / 1000})`}
          fill={colors.textPrimary}
          fillOpacity={0.04}
          stroke={colors.textSecondary}
          strokeOpacity={0.14}
          strokeWidth={u(2)}
          strokeLinejoin="round"
        />
      ) : null}

      {/* Soft wide underlay → an engraved/embossed feel; accent glow under highlighted lines. */}
      {strokes.map((s) => (
        <Path
          key={`u-${s.line}`}
          d={s.d}
          fill="none"
          stroke={s.highlighted ? colors.accent : colors.textPrimary}
          strokeOpacity={s.highlighted ? 0.18 : 0.08}
          strokeWidth={u(s.highlighted ? 20 : 14)}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}

      {/* Main weighted ink, drawn on. */}
      {strokes.map((s) => (
        <DrawStroke
          key={`m-${s.line}`}
          stroke={s}
          progress={progress}
          color={s.highlighted ? 'url(#palmAccent)' : colors.textPrimary}
          width={u(s.highlighted ? 7 : 4.5)}
        />
      ))}

      {showLabels
        ? strokes.map((s) =>
            s.label ? (
              <SvgText
                key={`l-${s.line}`}
                x={s.label.x}
                y={s.label.y}
                fontSize={u(traditional ? 34 : 30)}
                fill={colors.textSecondary}
                fontFamily={traditional ? fonts.cjk : fonts.bodyMedium}
              >
                {traditional ? LINE_LABEL[s.line] : (ENGLISH_LINE_LABEL[s.line] ?? '')}
              </SvgText>
            ) : null,
          )
        : null}
    </Svg>
  );
}

function DrawStroke({
  stroke,
  progress,
  color,
  width,
}: {
  stroke: DiagramStroke;
  progress: SharedValue<number>;
  color: string;
  width: number;
}) {
  // Reveal the path by animating the dash offset from its full length down to 0.
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: stroke.length * (1 - progress.value),
  }));
  return (
    <AnimatedPath
      d={stroke.d}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={stroke.length}
      animatedProps={animatedProps}
    />
  );
}
