import { View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Button, Logomark, Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme';

/**
 * Root landing (redesign R11) — the brand moment: the traced-palm Logomark, the wordmark, and
 * the English value line. A single confident accent CTA into onboarding. No CJK, no seal chrome.
 * The real first-open logic (anonymous session, invite deep-link branch → recipient flow) is
 * wired in P3.T6 / P8.
 */
export default function Index() {
  const theme = useTheme();
  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Logomark size={88} tone="accent" accessibilityLabel="Palmly" />
        <Text variant="display" style={{ marginTop: theme.spacing.lg }}>
          Palmly
        </Text>
        <Text
          variant="bodyLarge"
          tone="secondary"
          style={{ textAlign: 'center', marginTop: theme.spacing.sm, maxWidth: 280 }}
        >
          Read your palm from a single photo.
        </Text>
      </View>

      <View style={{ gap: theme.spacing.sm, alignSelf: 'stretch', paddingBottom: theme.spacing.md }}>
        <Button
          label="Get started"
          variant="primary"
          fullWidth
          onPress={() => router.push('/welcome' as Href)}
        />
        <Text variant="caption" tone="tertiary" style={{ textAlign: 'center' }}>
          For reflection &amp; entertainment
        </Text>
        <Button label="Dev · route map" variant="ghost" onPress={() => router.push('/dev' as Href)} />
      </View>
    </Screen>
  );
}
