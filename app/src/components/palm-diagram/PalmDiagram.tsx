import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Path, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/theme';
import { buildDiagram, type LineGeometry } from './geometry';

export interface PalmDiagramProps {
  /** The user's stored `line_geometry` (Backend §6.2), points in a 0–1000 frame. */
  geometry: LineGeometry;
  /** Square render size in px (default 300). */
  size?: number;
  /** The line being discussed → drawn in cinnabar (section cards pass this). */
  highlightedLine?: string;
  /** Highlighted by default when no `highlightedLine` (the reveal hero, e.g. heart + fate). */
  signatureLines?: string[];
  /** Render the 心·智·命·运 line labels (default true). */
  showLabels?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * The user's own palm as an engraved ink line-diagram (UIUX §2.5) — the trust artifact ("these are
 * *my* lines"), the privacy story (a diagram, never the photo), and the share asset. The reveal
 * hero, per-section highlights, and the share-card hero all reuse it. Colours are semantic so it
 * inverts cleanly in dark mode; the deterministic path math lives in `geometry.ts`.
 */
export function PalmDiagram({ geometry, size = 300, highlightedLine, signatureLines, showLabels = true, style }: PalmDiagramProps) {
  const { colors, fonts } = useTheme();
  const strokes = buildDiagram(geometry, { size, highlightedLine, signatureLines });
  const underlayWidth = (14 * size) / 1000;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={style}>
      {/* soft wide underlay in ink → an engraved/embossed feel */}
      {strokes.map((s) => (
        <Path key={`u-${s.line}`} d={s.d} fill="none" stroke={colors.text} strokeOpacity={0.1} strokeWidth={underlayWidth} strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {/* main stroke: ink, or cinnabar for the highlighted / signature line(s) */}
      {strokes.map((s) => (
        <Path
          key={`m-${s.line}`}
          d={s.d}
          fill="none"
          stroke={s.highlighted ? colors.accent : colors.text}
          strokeWidth={((s.highlighted ? 6 : 4.5) * size) / 1000}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {showLabels &&
        strokes.map((s) =>
          s.label ? (
            <SvgText key={`l-${s.line}`} x={s.label.x} y={s.label.y} fontSize={(34 * size) / 1000} fill={colors.textSecondary} fontFamily={fonts.cjk}>
              {s.label.text}
            </SvgText>
          ) : null,
        )}
    </Svg>
  );
}
