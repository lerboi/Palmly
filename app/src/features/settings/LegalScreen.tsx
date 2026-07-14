import { Card, Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme';

/**
 * Terms of Service + Privacy Policy templates (P10.T1). ⚠️ These are placeholder templates pending a
 * lawyer's review before launch (P12 compliance). The privacy points mirror the Backend §9 data
 * table; the store privacy labels (App Store nutrition / Play Data Safety) are drafted from the same.
 */
export function LegalScreen() {
  const theme = useTheme();
  return (
    <Screen scroll>
      <Card style={{ borderColor: theme.colors.gold, marginBottom: theme.spacing.lg }}>
        <Text variant="caption" tone="gold">
          ⚠️ Template — pending legal review before launch.
        </Text>
      </Card>

      <Text variant="title" style={{ marginBottom: theme.spacing.sm }}>
        Terms of Service
      </Text>
      <Text variant="body" tone="secondary" style={{ marginBottom: theme.spacing.xl }}>
        Palmly provides palm- and face-reading content for reflection and entertainment only. It is not
        fortune-telling, and not medical, legal, or financial advice. Subscriptions renew automatically
        until cancelled in your app store account. You must be 13 or older to use Palmly.
      </Text>

      <Text variant="title" style={{ marginBottom: theme.spacing.sm }}>
        Privacy Policy
      </Text>
      <Text variant="body" tone="secondary">
        Your capture photo is processed on-device and deleted within a day — we keep only the derived
        line diagram and reading, never the photo (unless you opt in). We never use your images to
        identify you or share them. You can delete your scans, or your whole account and all its data,
        at any time from Privacy &amp; your data. We use analytics and crash reporting to improve the app.
      </Text>
    </Screen>
  );
}
