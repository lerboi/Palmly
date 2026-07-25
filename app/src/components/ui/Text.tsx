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
  | 'premiumInk'
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
 *
 * ⚠ Two roles are **fills**, and their text counterparts are separate (Audit-4 CC-4/CC-6):
 * `premium` (2.59:1 on white) → premium text uses `premiumInk`; and `accent`, which the `accent`
 * tone deliberately resolves to `accentPressed` — the accent itself measures 4.27:1 on the
 * retuned `bg` and 4.00:1 on `accentMuted`, while `accentPressed` clears AA on every surface in
 * both schemes and reads as the same red. `accent` stays the fill / selected / palm-line color.
 */
export function Text({
  variant = 'body',
  tone = 'primary',
  color,
  style,
  // Dynamic Type guard (audit §6): cap OS font scaling at ~130% by default so large-text users get
  // bigger copy without shattering layouts. Overridable per call site (pass a different cap, or 0 to
  // opt out). This is the ONE place the app-wide default lives.
  maxFontSizeMultiplier = 1.3,
  ...rest
}: TextProps) {
  const theme = useTheme();
  const typeStyle = theme.typography[variant];

  const toneColor: Record<Tone, string> = {
    primary: theme.colors.textPrimary,
    secondary: theme.colors.textSecondary,
    tertiary: theme.colors.textTertiary,
    accent: theme.colors.accentPressed,
    heritage: theme.colors.heritageAccent,
    success: theme.colors.success,
    premium: theme.colors.premium,
    premiumInk: theme.colors.premiumInk,
    danger: theme.colors.danger,
    onAccent: theme.colors.onAccent,
    onPremium: theme.colors.onPremium,
    gold: theme.colors.premium,
    jade: theme.colors.success,
    onGold: theme.colors.onPremium,
  };

  return (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[typeStyle, { color: color ?? toneColor[tone] }, style]}
      {...rest}
    />
  );
}
