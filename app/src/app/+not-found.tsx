import { View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Button, Logomark, Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme';

/**
 * Branded catch-all (audit §6 deep-link hygiene) — a stale link or a push tap that no longer
 * resolves never lands on expo-router's black "Unmatched Route" dev page. A warm Palmly shell with
 * a single way home. English-first, no CJK.
 */
export default function NotFound() {
  const theme = useTheme();
  return (
    <Screen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.lg }}>
        <Logomark size={64} tone="ink" />
        <Text variant="title" style={{ textAlign: 'center' }}>
          This page wandered off
        </Text>
        <Text variant="bodyLarge" tone="secondary" style={{ textAlign: 'center', maxWidth: 300 }}>
          The link may be old or mistyped — but your reading is right where you left it.
        </Text>
      </View>
      <Button
        label="Take me home"
        variant="primary"
        fullWidth
        style={{ marginBottom: theme.spacing.md }}
        onPress={() => router.replace('/' as Href)}
      />
    </Screen>
  );
}
