import { useEffect } from 'react';
import { Platform, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, G, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useTheme, useReducedMotion } from '@/theme';
import { buildDiagram, diagramWeights, handSilhouette, ENGLISH_LINE_LABEL, LINE_LABEL, type DiagramStroke, type LineGeometry } from './geometry';

const AnimatedPath = Animated.createAnimatedComponent(Path);

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
  /** Play the staggered draw-on (native only; respects reduce-motion). Default true. */
  animate?: boolean;
  /** Color for the highlighted / signature line(s). Default `accent` (three-reds §3.2). */
  highlightColor?: string;
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
 *
 * **The silhouette is always drawn** (Audit-4 CO-5). There used to be a `silhouette` prop, but
 * `showSilhouette = isMini || silhouette` meant every `silhouette={false}` caller was ≤96px and
 * silently got one anyway — five call sites and two comments describing a rendering that never
 * happened. An option that cannot be exercised is worse than no option: it lies in the source.
 */
export function PalmDiagram({
  geometry,
  size = 300,
  highlightedLine,
  signatureLines,
  showLabels = false,
  traditional = false,
  animate = true,
  highlightColor,
  accessibilityLabel = 'Your palm line diagram',
  style,
}: PalmDiagramProps) {
  const { colors, fonts, motion } = useTheme();
  const strokes = buildDiagram(geometry, { size, highlightedLine, signatureLines });
  const u = (n: number) => (n * size) / 1000;

  const reduceMotion = useReducedMotion();
  const shouldAnimate = animate && !reduceMotion && Platform.OS !== 'web';
  const stagger = motion.stagger.reveal;
  const drawDur = motion.duration.draw;

  // The single accent for the highlighted / signature line(s) — the brand vermilion by default.
  const hl = highlightColor ?? colors.accent;
  const hlStop2 = highlightColor && highlightColor !== colors.accent ? hl : colors.accentPressed;
  // Minis (≤96px — section thumb/pair/compat/history) thicken BOTH ink and underlay so the hand,
  // the creases and the lit line all still read at thumbnail scale (F0.11 + CO-5). The math is the
  // pure `diagramWeights`, so the ratios are unit-tested.
  const w = diagramWeights(size);
  const sil = handSilhouette(geometry);

  // Bloom: the highlighted line's glow eases in as its stroke lands (after its staggered delay),
  // then settles at rest. Fail-safe / web / reduce-motion → the settled end-state (full glow).
  const hiIndex = strokes.findIndex((s) => s.highlighted);
  const bloom = useSharedValue(1);
  useEffect(() => {
    if (!shouldAnimate) {
      bloom.value = 1;
      return;
    }
    bloom.value = 0;
    const delay = (hiIndex >= 0 ? hiIndex * stagger : 0) + drawDur * 0.55;
    bloom.value = withDelay(delay, withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) }));
  }, [shouldAnimate, bloom, hiIndex, stagger, drawDur]);
  const glowBase = w.glowOpacityBase;
  const glowSpan = w.glowOpacityRest - w.glowOpacityBase;
  const glowProps = useAnimatedProps(() => ({ strokeOpacity: glowBase + glowSpan * bloom.value }));

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
          <Stop offset="0" stopColor={hl} />
          <Stop offset="1" stopColor={hlStop2} />
        </LinearGradient>
      </Defs>

      {/* Geometry-derived hand silhouette — a palm + four fingers + a thumb that always ENCLOSES the
          creases (they can't overshoot). Fill-only subpaths inside one low-opacity group so overlaps
          merge without seams. Minis lift the opacity so the hand still reads at ≤96px. */}
      <G opacity={w.silhouetteOpacity} transform={`scale(${size / 1000})`}>
        {sil.parts.map((d, i) => (
          <Path key={`sil-${i}`} d={d} fill={colors.textPrimary} />
        ))}
      </G>

      {/* Soft wide underlay → an engraved/embossed feel; the highlighted glow blooms in. */}
      {strokes.map((s) =>
        s.highlighted ? (
          <AnimatedPath
            key={`u-${s.line}`}
            d={s.d}
            fill="none"
            stroke={hl}
            strokeWidth={u(w.underlayHighlighted)}
            strokeLinecap="round"
            strokeLinejoin="round"
            animatedProps={glowProps}
          />
        ) : (
          <Path
            key={`u-${s.line}`}
            d={s.d}
            fill="none"
            stroke={colors.textPrimary}
            strokeOpacity={w.underlayOpacity}
            strokeWidth={u(w.underlay)}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ),
      )}

      {/* Main weighted ink — each line draws on in classical order (staggered). */}
      {strokes.map((s, i) => (
        <DrawStroke
          key={`m-${s.line}`}
          stroke={s}
          index={i}
          stagger={stagger}
          drawDur={drawDur}
          shouldAnimate={shouldAnimate}
          color={s.highlighted ? 'url(#palmAccent)' : colors.textPrimary}
          width={u(s.highlighted ? w.inkHighlighted : w.ink)}
        />
      ))}

      {showLabels
        ? strokes.map((s) =>
            s.label ? (
              <SvgText
                key={`l-${s.line}`}
                x={s.label.x}
                y={s.label.y}
                textAnchor={s.label.anchor}
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

/** One palm line, revealed by animating its dash offset full → 0 after a per-index stagger delay. */
function DrawStroke({
  stroke,
  index,
  stagger,
  drawDur,
  shouldAnimate,
  color,
  width,
}: {
  stroke: DiagramStroke;
  index: number;
  stagger: number;
  drawDur: number;
  shouldAnimate: boolean;
  color: string;
  width: number;
}) {
  // Fail-safe: progress starts fully drawn (1) so the diagram is never blank if the worklet
  // doesn't run (web / reanimated absent). The draw-on re-triggers it, staggered, on native.
  const progress = useSharedValue(1);
  useEffect(() => {
    if (!shouldAnimate) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withDelay(index * stagger, withTiming(1, { duration: drawDur, easing: Easing.out(Easing.cubic) }));
  }, [shouldAnimate, index, stagger, drawDur, progress]);
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
