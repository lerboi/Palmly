import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/ui';
import { useTheme } from '@/theme';

/**
 * The app's navigation backbone (Audit-4 SN-2 / Design-Direction §1 P3).
 *
 * Before this, `(home)` was a bare `Stack` and the three surfaces were joined only by tappable
 * row-cards on the fortune screen — which is why home read as a settings menu rather than a home
 * (CO-1), and why a free user reaching chat took two hops through a gate (SN-5).
 *
 * Three tabs, in journey order: **Today** (the daily almanac) · **Readings** (the shelf) ·
 * **Ask** (grounded chat). Order comes from the `Tabs.Screen` children, not from filenames.
 * Active is the accent — one of its four sanctioned uses (§1 P1); everything else is ink.
 */
export default function HomeLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  // react-navigation sizes the bar for its own ~10px label; Direction §1 P3 asks for `caption`
  // (13px), which overflows the default height and clips the labels. Size it explicitly, and add
  // the bottom inset ourselves since an explicit height opts out of the automatic one.
  // 64 = 8 top padding + a 24px icon + a 13/18 caption label + breathing room. Measured, not
  // guessed: at 56 the label's last 2pt sat on the viewport edge in the web export.
  const barHeight = 64 + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false, // every screen renders its own AppHeader inside its content
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: theme.strokes.hairline,
          borderTopColor: theme.colors.border,
          height: barHeight,
          paddingTop: theme.spacing.xs,
          paddingBottom: insets.bottom,
          // The default elevation/shadow would fight the hairline; the border is the separator.
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontFamily: theme.typography.caption.fontFamily,
          fontSize: theme.typography.caption.fontSize,
        },
        sceneStyle: { backgroundColor: theme.colors.bg },
      }}
    >
      <Tabs.Screen
        name="fortune"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, size }) => <Icon name="today" size={size} color={color} decorative />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Readings',
          tabBarIcon: ({ color, size }) => <Icon name="palm" size={size} color={color} decorative />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Ask',
          tabBarIcon: ({ color, size }) => <Icon name="chat" size={size} color={color} decorative />,
        }}
      />
    </Tabs>
  );
}
