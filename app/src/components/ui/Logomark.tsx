import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Path, Rect, G } from 'react-native-svg';
import { useTheme } from '@/theme';

/**
 * Palmly's brand mark (redesign §2/§7) — a CJK-free, culturally-neutral **traced palm**: three
 * principal lines (heart / head / life) rendered as weighted ink, the heart line carrying the
 * softened-cinnabar heritage whisper. Replaces the old cinnabar chop + Noto Serif TC glyph
 * (`SealBadge`). Two forms: the frameless `mark` (splash, launcher, headers) and a small
 * rounded-square `stamp` for the share-card corner only.
 */
export interface LogomarkProps {
  /** Square size in px. Default 48. */
  size?: number;
  /** `mark` = frameless lines; `stamp` = lines inside a rounded-square tile (share-card corner). */
  variant?: 'mark' | 'stamp';
  /** Semantic color role for the main lines / tile. Overridden by an explicit `color`. */
  tone?: 'ink' | 'accent' | 'heritage' | 'onAccent';
  /** Explicit main line color (wins over `tone`). Defaults to the primary text color. */
  color?: string;
  /** Heart-line (heritage) color. Defaults to the softened cinnabar. Pass same as `color` to mute. */
  heritageColor?: string;
  /** For `stamp`: fill the tile (solid) vs. outline only. Default outline. */
  filled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

// 48×48 frame. Three palm lines: heart (upper), head (middle), life (arcs the thumb).
const HEART = 'M12 18.5 C20 14 30 15 36.5 19.5';
const HEAD = 'M11.5 24.5 C20 21.5 29.5 22.5 35.5 26';
const LIFE = 'M19.5 12.5 C14 18.5 13 28 18.5 36';

export function Logomark({
  size = 48,
  variant = 'mark',
  tone = 'ink',
  color,
  heritageColor,
  filled = false,
  accessibilityLabel = 'Palmly',
  style,
}: LogomarkProps) {
  const { colors } = useTheme();
  const toneColor = {
    ink: colors.textPrimary,
    accent: colors.accent,
    heritage: colors.heritageAccent,
    onAccent: colors.onAccent,
  }[tone];
  const ink = color ?? toneColor;
  const heart = heritageColor ?? colors.heritageAccent;
  const isStamp = variant === 'stamp';
  const w = (size / 48) * 3.2; // line weight scales with size

  // On a filled stamp the tile is inked, so the lines flip to the tile's contrast color.
  const lineInk = isStamp && filled ? colors.onAccent : ink;
  const lineHeart = isStamp && filled ? colors.onAccent : heart;

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
          fill={filled ? ink : 'none'}
          stroke={ink}
          strokeWidth={w * 0.9}
        />
      )}
      <G fill="none" strokeLinecap="round">
        <Path d={LIFE} stroke={lineInk} strokeWidth={w} />
        <Path d={HEAD} stroke={lineInk} strokeWidth={w} />
        <Path d={HEART} stroke={lineHeart} strokeWidth={w} />
      </G>
    </Svg>
  );
}
