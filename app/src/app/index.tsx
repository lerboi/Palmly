import { View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Button, Screen, SealBadge, Text } from '@/components/ui';

/**
 * Root landing. For now a simple launcher into the onboarding flow + the dev route map.
 * The real first-open logic (anonymous session, invite deep-link branch → recipient flow)
 * is wired in P3.T6 / P8.
 */
export default function Index() {
  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 }}>
        <SealBadge glyph="掌" size={72} />
        <Text variant="display">Palmly</Text>
        <Text variant="body" tone="secondary" style={{ textAlign: 'center' }}>
          手相 · 面相 — read from a single photo
        </Text>
        <View style={{ gap: 8, alignSelf: 'stretch', marginTop: 24 }}>
          <Button
            label="Begin"
            variant="primary"
            fullWidth
            onPress={() => router.push('/welcome' as Href)}
          />
          <Button
            label="Dev · route map"
            variant="ghost"
            onPress={() => router.push('/dev' as Href)}
          />
        </View>
      </View>
    </Screen>
  );
}
