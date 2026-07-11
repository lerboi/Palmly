import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

export interface CardProps {
  children: ReactNode;
  /** Hairline border in the theme border color. Default true. */
  bordered?: boolean;
  /** Padding from the spacing scale. Default `lg` (16). */
  padded?: boolean;
  style?: ViewStyle;
}

/**
 * Surface container — a lifted paper/ink panel with a hairline rule. The base for reading
 * section cards, almanac tables, list rows. Deliberately flat (engraved, not glossy — §1.2).
 */
export function Card({ children, bordered = true, padded = true, style }: CardProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radii.lg,
          padding: padded ? theme.spacing.lg : 0,
          borderWidth: bordered ? theme.strokes.hairline : 0,
          borderColor: theme.colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
