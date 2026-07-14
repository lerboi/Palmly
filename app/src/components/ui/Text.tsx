import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { useTheme } from '@/theme';
import type { TypographyVariant } from '@/theme';

type Tone =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'accent'
  | 'heritage'
  | 'success'
  | 'premium'
  | 'danger'
  | 'onAccent'
  | 'onPremium'
  // deprecated aliases — kept so existing consumers compile (migrate to the roles above)
  | 'gold'
  | 'jade'
  | 'onGold';

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  tone?: Tone;
  /** Explicit color override (bypasses `tone`). Use sparingly. */
  color?: string;
}

/**
 * Themed text primitive. `variant` selects a type-scale entry (font + size + line height);
 * `tone` selects a semantic color role (redesign §3/§4). The old "accent never under 18pt"
 * rule is retired: the twilight-indigo accent passes AA at all sizes on both bg and surface.
 */
export function Text({
  variant = 'body',
  tone = 'primary',
  color,
  style,
  ...rest
}: TextProps) {
  const theme = useTheme();
  const typeStyle = theme.typography[variant];

  const toneColor: Record<Tone, string> = {
    primary: theme.colors.textPrimary,
    secondary: theme.colors.textSecondary,
    tertiary: theme.colors.textTertiary,
    accent: theme.colors.accent,
    heritage: theme.colors.heritageAccent,
    success: theme.colors.success,
    premium: theme.colors.premium,
    danger: theme.colors.danger,
    onAccent: theme.colors.onAccent,
    onPremium: theme.colors.onPremium,
    gold: theme.colors.premium,
    jade: theme.colors.success,
    onGold: theme.colors.onPremium,
  };

  return (
    <RNText
      style={[typeStyle, { color: color ?? toneColor[tone] }, style]}
      {...rest}
    />
  );
}
