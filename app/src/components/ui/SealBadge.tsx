import { View, Text as RNText, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme, fonts } from '@/theme';

export interface SealBadgeProps {
  /** Glyph carved into the chop. Default 掌 ("palm"). */
  glyph?: string;
  /** Square edge length in px. Default 40. */
  size?: number;
  /** `filled` = cinnabar stamp with paper glyph (default). `outline` = cinnabar border only. */
  variant?: 'filled' | 'outline';
  style?: ViewStyle;
}

/**
 * The cinnabar seal (印章) — Palmly's brand chop. A square cinnabar stamp with a carved CJK
 * glyph, corner-placed on share cards "like an artist's chop" (UIUX §1.2). The full stylized
 * palm-with-three-lines mark is rendered in Skia later (P6); this primitive is the glyph chop.
 */
export function SealBadge({ glyph = '掌', size = 40, variant = 'filled', style }: SealBadgeProps) {
  const theme = useTheme();
  const filled = variant === 'filled';

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="Palmly seal"
      style={[
        styles.seal,
        {
          width: size,
          height: size,
          borderRadius: theme.radii.seal,
          backgroundColor: filled ? theme.colors.seal : 'transparent',
          borderWidth: theme.strokes.bold,
          borderColor: theme.colors.seal,
        },
        style,
      ]}
    >
      <RNText
        allowFontScaling={false}
        style={{
          fontFamily: fonts.cjk,
          fontSize: size * 0.56,
          lineHeight: size * 0.72,
          color: filled ? theme.colors.onAccent : theme.colors.seal,
        }}
      >
        {glyph}
      </RNText>
    </View>
  );
}

const styles = StyleSheet.create({
  seal: { alignItems: 'center', justifyContent: 'center' },
});
