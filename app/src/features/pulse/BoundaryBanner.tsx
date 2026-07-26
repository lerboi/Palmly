import { Card, Icon, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import { featureLabel } from './pulseMath';

export interface BoundaryBannerProps {
  featureKey: string;
  onPress: () => void;
}

/**
 * Chapter-turn day (Audit-5 · 02 §7) — "Your fate line begins a new chapter today."
 *
 * A flat bordered row under the almanac, shown to free AND premium readers on the one day a
 * chapter turns, then gone. It is the category's proven conversion spike (astro apps convert on
 * retrogrades and full moons) made personal: this boundary is computed from the reader's own
 * geometry, so it is theirs alone rather than a date everyone shares.
 *
 * The icon is INK, not accent. The banner is already the loudest thing on the page by virtue of
 * being rare; spending an accent on it too would break the screen's litmus.
 */
export function BoundaryBanner({ featureKey, onPress }: BoundaryBannerProps) {
  const theme = useTheme();
  return (
    <Card
      bordered
      onPress={onPress}
      accessibilityLabel={`Your ${featureLabel(featureKey)} begins a new chapter today. Read it.`}
      style={{ marginBottom: theme.spacing.md, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}
    >
      <Icon name="chapter" size={22} color={theme.colors.textPrimary} decorative />
      <Text variant="bodyMedium" style={{ flex: 1 }}>
        Your {featureLabel(featureKey)} begins a new chapter today.
      </Text>
      <Icon name="chevron" size={18} color={theme.colors.textTertiary} decorative />
    </Card>
  );
}
