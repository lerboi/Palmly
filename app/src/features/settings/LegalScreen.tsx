import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppHeader, Card, Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import { CANONICAL_DELETION_PROMISE } from '@/lib/trustCopy';

/**
 * Terms of Service + Privacy Policy templates (P10.T1). ⚠️ These are placeholder templates pending a
 * lawyer's review before launch (P12 compliance). The privacy points mirror the Backend §9 data
 * table; the store privacy labels (App Store nutrition / Play Data Safety) are drafted from the same.
 */
export function LegalScreen() {
  const theme = useTheme();
  const router = useRouter();
  // Deep-link section (the Legal settings rows send `/legal?section=terms|privacy`, F1.T2): show only
  // the requested section when one is named, both when the screen is opened cold.
  const { section } = useLocalSearchParams<{ section?: string }>();
  const showTerms = section !== 'privacy';
  const showPrivacy = section !== 'terms';
  // The placeholder banner is release-gated: once counsel has signed off, set EXPO_PUBLIC_LEGAL_REVIEWED
  // = 'true' in the launch env and the "pending review" caption disappears (P12 compliance gate).
  const legalReviewed = process.env.EXPO_PUBLIC_LEGAL_REVIEWED === 'true';
  return (
    <Screen scroll>
      <AppHeader title="Legal" onBack={() => router.back()} />

      {legalReviewed ? null : (
        <Card style={{ borderColor: theme.colors.premium, backgroundColor: theme.colors.surfaceSunken, marginBottom: theme.spacing.lg }}>
          <Text variant="caption" tone="premium">
            Template — pending legal review before launch.
          </Text>
        </Card>
      )}

      {showTerms ? (
        <>
          <Text variant="title" style={{ marginBottom: theme.spacing.sm }}>
            Terms of Service
          </Text>
          <Text variant="body" tone="secondary" style={{ marginBottom: theme.spacing.xl }}>
            Palmly provides palm- and face-reading content for reflection and entertainment only. It is not
            fortune-telling, and not medical, legal, or financial advice. Subscriptions renew automatically
            until cancelled in your app store account. You must be 13 or older to use Palmly.
          </Text>
        </>
      ) : null}

      {showPrivacy ? (
        <>
          <Text variant="title" style={{ marginBottom: theme.spacing.sm }}>
            Privacy Policy
          </Text>
          <Text variant="body" tone="secondary">
            Your capture photo is processed on-device. {CANONICAL_DELETION_PROMISE} We keep only the derived
            line diagram and reading, never the photo (unless you opt in). We never use your images to
            identify you or share them. You can delete your scans, or your whole account and all its data,
            at any time from Privacy &amp; your data. We use analytics and crash reporting to improve the app.
          </Text>
        </>
      ) : null}
    </Screen>
  );
}
