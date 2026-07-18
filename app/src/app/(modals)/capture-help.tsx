import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppHeader, Button, Card, Icon, Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme';

/**
 * Capture help — the do/don't sheet (audit F1.4, UIUX §2.3). Three frames so the guide "?" is a real
 * affordance, not a dead press-scale. Opened from the capture Help control (palm + face).
 */
const FRAMES: { title: string; doText: string; dontText: string }[] = [
  { title: 'Find good light', doText: 'Face a window or a soft lamp.', dontText: 'Back-lit, in shadow, or under harsh glare.' },
  { title: 'Open your hand flat', doText: 'Palm flat, fingers relaxed and slightly apart.', dontText: 'Cupped, clenched, or tilted away.' },
  { title: 'Fill the guide', doText: 'Whole hand inside the outline, wrist to fingertips.', dontText: 'Too far, too close, or fingers cut off.' },
];

export default function CaptureHelp() {
  const theme = useTheme();
  const router = useRouter();
  return (
    <Screen scroll>
      <AppHeader title="Getting a clean scan" onBack={() => router.back()} />
      <View style={{ gap: theme.spacing.md }}>
        {FRAMES.map((f, i) => (
          <Card key={f.title} elevation="sm" entranceIndex={i}>
            <Text variant="heading">{f.title}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
              <Icon name="check" size={18} color={theme.colors.success} decorative />
              <Text variant="body" style={{ flex: 1 }}>{f.doText}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm, marginTop: theme.spacing.xs }}>
              <Icon name="close" size={18} color={theme.colors.danger} decorative />
              <Text variant="body" tone="secondary" style={{ flex: 1 }}>{f.dontText}</Text>
            </View>
          </Card>
        ))}
      </View>
      <Button label="Got it" variant="primary" fullWidth style={{ marginTop: theme.spacing.xl }} onPress={() => router.back()} />
    </Screen>
  );
}
