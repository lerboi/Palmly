import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { useTheme } from '@/theme';
import type { TypographyVariant } from '@/theme';

type Tone = 'primary' | 'secondary' | 'accent' | 'gold' | 'jade' | 'onAccent' | 'onGold';

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  tone?: Tone;
  /** Explicit color override (bypasses `tone`). Use sparingly. */
  color?: string;
}

/**
 * Themed text primitive. `variant` selects a type-scale entry (font + size + line height);
 * `tone` selects a semantic color role. Enforces the UIUX §1.2 a11y rule that cinnabar
 * (accent) is never used for text under 18pt.
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
    primary: theme.colors.text,
    secondary: theme.colors.textSecondary,
    accent: theme.colors.accent,
    gold: theme.colors.gold,
    jade: theme.colors.jade,
    onAccent: theme.colors.onAccent,
    onGold: theme.colors.onGold,
  };

  if (__DEV__ && tone === 'accent' && typeStyle.fontSize < 18) {
    console.warn(
      `[Palmly/Text] cinnabar (tone="accent") on ${typeStyle.fontSize}pt text violates the ` +
        `UIUX §1.2 contrast rule (never under 18pt). Use variant="accent"/"title"/"display".`,
    );
  }

  return (
    <RNText
      style={[typeStyle, { color: color ?? toneColor[tone] }, style]}
      {...rest}
    />
  );
}
