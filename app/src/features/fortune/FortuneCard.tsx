import { View } from 'react-native';

import { Button, Card, Icon, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import { DIRECTION_ARROW, type Fortune } from './fortune';

/**
 * The daily fortune card (UIUX §2.11, redesign R18). Free shows the `overall` essence + an unlock
 * CTA; premium expands the Do/Avoid lists, love/career/wealth lines, and the lucky
 * direction/colour/hours (U4 gating), grouped into distinct sections with real spacing.
 * English-first, no CJK. Reused as the paywall's "your fortune preview".
 */
export function FortuneCard({ fortune, premium, onUnlock }: { fortune: Fortune; premium: boolean; onUnlock?: () => void }) {
  const theme = useTheme();
  return (
    <Card elevation="sm" style={{ marginBottom: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm }}>
        <Icon name="sparkle" size={20} color={theme.colors.accent} decorative />
        <Text variant="heading">Today&apos;s fortune</Text>
      </View>
      <Text variant="bodyLarge" tone="secondary">
        {fortune.overall}
      </Text>

      {!premium ? (
        <View style={{ marginTop: theme.spacing.lg, gap: theme.spacing.md, alignItems: 'flex-start' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Icon name="lock" size={16} color={theme.colors.premium} decorative />
            <Text variant="caption" tone="premium">
              Do · Avoid · lucky direction · hours · love, career &amp; wealth
            </Text>
          </View>
          <Button label="Unlock today's almanac" variant="tonal" size="md" onPress={onUnlock} />
        </View>
      ) : (
        <View style={{ marginTop: theme.spacing.lg, gap: theme.spacing.lg }}>
          <View style={{ flexDirection: 'row', gap: theme.spacing.lg }}>
            <DoDont title="Do" items={fortune.do} tone="success" />
            <DoDont title="Avoid" items={fortune.dont} tone="heritage" />
          </View>

          <Divider />

          <View style={{ gap: theme.spacing.md }}>
            <Aspect label="Career" text={fortune.career} />
            <Aspect label="Love" text={fortune.love} />
            <Aspect label="Wealth" text={fortune.wealth} />
          </View>

          <Divider />

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xl }}>
            <Lucky label="Direction" value={`${DIRECTION_ARROW[fortune.lucky_direction] ?? ''} ${fortune.lucky_direction}`} />
            <Lucky label="Colour" value={fortune.lucky_color} />
            <Lucky label="Hours" value={fortune.lucky_hours} />
          </View>
        </View>
      )}
    </Card>
  );
}

function Divider() {
  const theme = useTheme();
  return <View style={{ height: theme.strokes.hairline, backgroundColor: theme.colors.border }} />;
}

function DoDont({ title, items, tone }: { title: string; items: string[]; tone: 'success' | 'heritage' }) {
  const theme = useTheme();
  const color = tone === 'success' ? theme.colors.success : theme.colors.heritageAccent;
  return (
    <View style={{ flex: 1, gap: theme.spacing.xs }}>
      <Text variant="heading" color={color}>
        {title}
      </Text>
      {items.map((it) => (
        <Text key={it} variant="small" tone="secondary">
          {it}
        </Text>
      ))}
    </View>
  );
}

function Aspect({ label, text }: { label: string; text: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text variant="caption" tone="tertiary" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
        {label}
      </Text>
      <Text variant="body">{text}</Text>
    </View>
  );
}

function Lucky({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text variant="caption" tone="tertiary" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
        {label}
      </Text>
      <Text variant="bodyMedium">{value}</Text>
    </View>
  );
}
