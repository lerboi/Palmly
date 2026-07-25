import type { ReactNode } from 'react';
import { View, ScrollView, StyleSheet, type NativeScrollEvent, type NativeSyntheticEvent, type ViewStyle } from 'react-native';
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
  /** Scroll listener (only with `scroll`) — e.g. to gate a FAB entrance or emit scroll-depth. */
  onScroll?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /** Scroll event cadence in ms (only with `scroll`). Default 16 (~per frame). */
  scrollEventThrottle?: number;
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
  onScroll,
  scrollEventThrottle,
  style,
  contentStyle,
}: ScreenProps) {
  const theme = useTheme();
  const pad: ViewStyle = padded ? { paddingHorizontal: theme.spacing.lg } : {};

  return (
    <SafeAreaView
      edges={edges}
      style={[styles.fill, { backgroundColor: theme.colors.bg }, style]}
    >
      {scroll ? (
        <ScrollView
          style={styles.fill}
          contentContainerStyle={[{ paddingVertical: theme.spacing.lg }, pad, contentStyle]}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle ?? 16}
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
