import { type StyleProp, type ViewStyle } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import { useTheme } from '@/theme';
import { smoothPath } from './geometry';
import { HAND_OUTLINE_PATH, HAND_OUTLINE_HEART } from './handOutlinePath';

export interface HandOutlineProps {
  /** Square render size in px (default 220). */
  size?: number;
  /** Outline stroke colour (default `textPrimary` — the ink line). */
  color?: string;
  /** Draw the single heart-line hint inside. `true` → the brand accent; or pass an explicit colour. */
  accent?: boolean | string;
  /** Mirror horizontally for the left hand (the right hand is the drawn default). */
  mirror?: boolean;
  /** Rendered stroke weight in px. Default scales with size for an even ~2–3px premium line. */
  strokeWidth?: number;
  /** Dash the outline — the guided-capture "searching" state. */
  dashed?: boolean;
  /** Accessibility label (a meaningful image). Pass `""` to mark decorative. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * A clean, anatomically-credible open-palm OUTLINE (redesign "premium outline" direction) — the
 * brand hero for the onboarding + camera-primer screens, replacing the old procedurally-derived
 * blob silhouette. A single confident ink stroke, optionally with the heart line drawn inside in
 * the accent for a two-tone "this is a reading" hint. Fixed illustration (not user data); the real
 * traced-line diagram stays in {@link PalmDiagram}.
 */
export function HandOutline({
  size = 220,
  color,
  accent = false,
  mirror = false,
  strokeWidth,
  dashed = false,
  accessibilityLabel = 'An open palm',
  style,
}: HandOutlineProps) {
  const { colors } = useTheme();
  const ink = color ?? colors.textPrimary;
  const accentColor = accent === true ? colors.accent : typeof accent === 'string' ? accent : undefined;

  // Stroke is authored in the 1000-frame; convert the desired rendered px so the line stays an even
  // weight at every size (minis would otherwise thin to a scratch). Default ~2–3px.
  const px = strokeWidth ?? Math.max(2, size * 0.014);
  const w = (px * 1000) / size;

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 1000 1000"
      style={style}
      accessibilityRole={accessibilityLabel ? 'image' : 'none'}
      accessibilityLabel={accessibilityLabel || undefined}
      aria-hidden={accessibilityLabel ? undefined : true}
    >
      <G transform={mirror ? 'translate(1000,0) scale(-1,1)' : undefined}>
        <Path
          d={HAND_OUTLINE_PATH}
          fill="none"
          stroke={ink}
          strokeWidth={w}
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray={dashed ? `${w * 4} ${w * 3.4}` : undefined}
        />
        {accentColor ? (
          <Path
            d={smoothPath(HAND_OUTLINE_HEART)}
            fill="none"
            stroke={accentColor}
            strokeWidth={w * 1.15}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
      </G>
    </Svg>
  );
}
