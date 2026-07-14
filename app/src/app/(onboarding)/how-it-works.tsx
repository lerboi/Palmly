import { View } from 'react-native';
import { router, type Href } from 'expo-router';
import { AppHeader, Button, Card, Icon, Screen, Text } from '@/components/ui';
import type { IconName } from '@/components/ui';
import { useTheme } from '@/theme';

/**
 * Onboarding A2 (UIUX §2.1, redesign R12) — the three-step explainer (scan → we trace your
 * lines → your reading) with line-icons, and the D2 trust line stated before we ask for the
 * camera. English-first, no CJK.
 */
const STEPS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'camera',
    title: 'Snap your palm',
    body: 'Take one photo in good light — or upload one from your library.',
  },
  {
    icon: 'sparkle',
    title: 'We trace your lines',
    body: 'Your heart, head, life and fate lines become a private line-diagram.',
  },
  {
    icon: 'heart',
    title: 'Your reading',
    body: 'A warm, specific read on love, work, and the year ahead.',
  },
];

export default function HowItWorks() {
  const theme = useTheme();
  return (
    <Screen scroll>
      <AppHeader title="How it works" onBack={() => router.back()} />

      <View style={{ gap: theme.spacing.md }}>
        {STEPS.map((step, i) => (
          <Card key={step.title} elevation="sm">
            <View style={{ flexDirection: 'row', gap: theme.spacing.md, alignItems: 'center' }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: theme.radii.md,
                  backgroundColor: theme.colors.accentMuted,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={step.icon} size={24} color={theme.colors.accent} decorative />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="caption" tone="tertiary">
                  Step {i + 1}
                </Text>
                <Text variant="heading">{step.title}</Text>
                <Text variant="body" tone="secondary" style={{ marginTop: 2 }}>
                  {step.body}
                </Text>
              </View>
            </View>
          </Card>
        ))}
      </View>

      <Card elevation="none" style={{ marginTop: theme.spacing.lg, backgroundColor: theme.colors.surfaceSunken }}>
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-start' }}>
          <Icon name="shield" size={20} color={theme.colors.success} decorative />
          <Text variant="body" tone="secondary" style={{ flex: 1 }}>
            Your photo is analyzed, then deleted. What stays is your reading.
          </Text>
        </View>
      </Card>

      <Button
        label="Choose your hand"
        variant="primary"
        fullWidth
        style={{ marginTop: theme.spacing.xl }}
        onPress={() => router.push('/hand-select' as Href)}
      />
    </Screen>
  );
}
