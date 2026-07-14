import { View } from 'react-native';
import { router, type Href } from 'expo-router';
import { PalmDiagram } from '@/components/palm-diagram/PalmDiagram';
import { AppHeader, Button, Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import { PREVIEW_GEOMETRY } from '@/features/reading/reveal';

/**
 * Onboarding A1 (UIUX §2.1, redesign R12) — the value prop over the traced-palm hero. Reframed
 * off ethnicity (§6): "rooted in centuries of palmistry", English-first, no CJK.
 */
export default function Welcome() {
  const theme = useTheme();
  return (
    <Screen>
      <AppHeader
        onBack={() => router.back()}
        right={
          <Button label="Skip" variant="ghost" size="md" onPress={() => router.push('/primer' as Href)} />
        }
      />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <PalmDiagram
          geometry={PREVIEW_GEOMETRY}
          size={260}
          signatureLines={['heart_line', 'fate_line']}
          showLabels
        />
        <Text variant="display" style={{ textAlign: 'center', marginTop: theme.spacing.xl }}>
          Your palm remembers
        </Text>
        <Text
          variant="bodyLarge"
          tone="secondary"
          style={{ textAlign: 'center', marginTop: theme.spacing.sm, maxWidth: 300 }}
        >
          Rooted in centuries of palmistry — read from a single photo, in about a minute.
        </Text>
      </View>

      <Button
        label="How it works"
        variant="primary"
        fullWidth
        style={{ marginBottom: theme.spacing.md }}
        onPress={() => router.push('/how-it-works' as Href)}
      />
    </Screen>
  );
}
