import type { ReactNode } from 'react';
import { View, ScrollView, StyleSheet, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

export interface ScreenProps {
  children: ReactNode;
  /** Wrap content in a ScrollView. Default false. */
  scroll?: boolean;
  /** Safe-area edges to inset. Default all. */
  edges?: readonly Edge[];
  /** Horizontal padding from the spacing scale. Default `lg` (16). */
  padded?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}

/**
 * Root container for every screen: themed paper/ink background + safe-area insets.
 * The one place background color is applied — children stay transparent.
 */
export function Screen({
  children,
  scroll = false,
  edges = ['top', 'bottom', 'left', 'right'],
  padded = true,
  style,
  contentStyle,
}: ScreenProps) {
  const theme = useTheme();
  const pad: ViewStyle = padded ? { paddingHorizontal: theme.spacing.lg } : {};

  return (
    <SafeAreaView
      edges={edges}
      style={[styles.fill, { backgroundColor: theme.colors.background }, style]}
    >
      {scroll ? (
        <ScrollView
          style={styles.fill}
          contentContainerStyle={[{ paddingVertical: theme.spacing.lg }, pad, contentStyle]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fill, pad, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
