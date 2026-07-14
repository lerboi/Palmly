import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppHeader, Card, Icon, Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme';

/**
 * "How Palmly reads" (UIUX §2.5 methodology, redesign R21) — transparency as differentiation:
 * landmarks → traced lines → classical interpretation, plus the trust guarantees. English-first,
 * no CJK (numbered steps, English line + tradition names).
 */
export function MethodologyScreen() {
  const theme = useTheme();
  const router = useRouter();
  return (
    <Screen scroll>
      <AppHeader title="How Palmly reads" onBack={() => router.back()} />
      <Text variant="body" tone="secondary" style={{ marginBottom: theme.spacing.xl }}>
        Transparency is the point — here is exactly how your reading is made. No crystal balls.
      </Text>

      <Step
        n={1}
        title="We map your hand"
        body="On your device, we detect your hand’s landmarks — the joints and creases — and check the framing, so a blurry or non-hand photo never becomes a reading."
      />
      <Step
        n={2}
        title="We trace your lines"
        body="Your major lines — heart, head, life and fate — are traced into an engraved diagram. From here we work only from that diagram; your photo is deleted within a day."
      />
      <Step
        n={3}
        title="We read the classics"
        body="Your traced features are matched to centuries of palmistry and face-reading descriptions — so the same palm always yields the same reading."
      />

      <Card elevation="sm" style={{ marginTop: theme.spacing.md, gap: theme.spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Icon name="shield" size={18} color={theme.colors.success} decorative />
          <Text variant="bodyMedium" tone="success">
            Your photo is deleted after your reading
          </Text>
        </View>
        <Text variant="body" tone="secondary">
          Same palm, same reading — your lines don’t lie.
        </Text>
        <Text variant="body" tone="secondary">
          For reflection and entertainment — not fortune-telling, medical, or financial advice.
        </Text>
      </Card>
    </Screen>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: theme.spacing.md, marginBottom: theme.spacing.lg }}>
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: theme.colors.accentMuted,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text variant="bodyMedium" color={theme.colors.accent}>
          {n}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="heading">{title}</Text>
        <Text variant="body" tone="secondary" style={{ marginTop: theme.spacing.xs }}>
          {body}
        </Text>
      </View>
    </View>
  );
}
