import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import type { ShadowKey } from '@/theme';

export interface CardProps {
  children: ReactNode;
  /** Hairline border in the theme border color. Default true. */
  bordered?: boolean;
  /** Padding from the spacing scale. Default `lg` (16). */
  padded?: boolean;
  /**
   * Elevation from the shadow scale (redesign §5). Default `none` = flat. Any lift ≥ `sm`
   * switches the fill to the `surfaceRaised` role so the card also reads lifted on dark, and
   * drops the hairline border by default (the shadow does the separating).
   */
  elevation?: ShadowKey;
  style?: ViewStyle;
}

/**
 * Surface container — a rounded panel for reading section cards, sheets, list rows. Flat by
 * default (a hairline rule); pass `elevation` to lift it (soft shadow on light, a lighter
 * `surfaceRaised` fill on dark). Redesign §5.
 */
export function Card({ children, bordered, padded = true, elevation = 'none', style }: CardProps) {
  const theme = useTheme();
  const lifted = elevation !== 'none';
  // Elevated cards don't need a border; flat cards default to bordered.
  const showBorder = bordered ?? !lifted;
  return (
    <View
      style={[
        {
          backgroundColor: lifted ? theme.colors.surfaceRaised : theme.colors.surface,
          borderRadius: theme.radii.md,
          padding: padded ? theme.spacing.lg : 0,
          borderWidth: showBorder ? theme.strokes.hairline : 0,
          borderColor: theme.colors.border,
        },
        theme.shadow[elevation],
        style,
      ]}
    >
      {children}
    </View>
  );
}
