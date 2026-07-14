import { View } from 'react-native';

import { Card, Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme';

/**
 * "How Palmly reads" (UIUX §2.5 methodology link, P10.T1) — transparency as differentiation:
 * landmarks → traced lines → classical interpretation, plus the trust guarantees.
 */
export function MethodologyScreen() {
  const theme = useTheme();
  return (
    <Screen scroll>
      <Text variant="display">How Palmly reads</Text>
      <Text variant="body" tone="secondary" style={{ marginTop: theme.spacing.sm, marginBottom: theme.spacing.xl }}>
        Transparency is the point — here is exactly how your reading is made. No crystal balls.
      </Text>

      <Step n="一" title="We map your hand" body="On your device, we detect your hand’s landmarks — the joints and creases — and check the framing, so a blurry or non-hand photo never becomes a reading." />
      <Step n="二" title="We trace your lines" body="Your major lines — heart 心, head 智, life 命, fate 运 — are traced into an engraved diagram. From here we work only from that diagram; your photo is deleted within a day." />
      <Step n="三" title="We read the classics" body="Your traced features are matched to classical 手相 (palmistry) and 面相 (physiognomy) descriptions — so the same palm always yields the same reading." />

      <Card style={{ marginTop: theme.spacing.md, gap: theme.spacing.sm }}>
        <Text variant="bodyMedium" tone="jade">
          ✓ Your photo is deleted after your reading
        </Text>
        <Text variant="body" tone="secondary">Same palm, same reading — your lines don’t lie.</Text>
        <Text variant="body" tone="secondary">For reflection and entertainment — not fortune-telling, medical, or financial advice.</Text>
      </Card>
    </Screen>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: theme.spacing.md, marginBottom: theme.spacing.lg }}>
      <Text variant="accent" tone="accent">
        {n}
      </Text>
      <View style={{ flex: 1 }}>
        <Text variant="heading">{title}</Text>
        <Text variant="body" tone="secondary" style={{ marginTop: theme.spacing.xs }}>
          {body}
        </Text>
      </View>
    </View>
  );
}
