import { View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import { DIRECTION_ARROW, type Fortune } from './fortune';

/**
 * The daily almanac fortune card (UIUX §2.11, §2.8 paywall peek). Free shows the `overall` essence
 * + a gold unlock CTA; premium expands the 宜/忌 lists, love/career/wealth lines, and the lucky
 * direction/colour/hours (U4 gating). Reused as the paywall's "your fortune preview".
 */
export function FortuneCard({ fortune, premium, onUnlock }: { fortune: Fortune; premium: boolean; onUnlock?: () => void }) {
  const theme = useTheme();
  return (
    <Card style={{ marginBottom: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm }}>
        <Text variant="accent" tone="accent">
          运
        </Text>
        <Text variant="heading">Today’s fortune</Text>
      </View>
      <Text variant="bodyMedium">{fortune.overall}</Text>

      {!premium ? (
        <View style={{ marginTop: theme.spacing.lg, gap: theme.spacing.sm, alignItems: 'flex-start' }}>
          <Text variant="caption" tone="gold">
            🔒 宜 do · 忌 don’t · lucky direction · hours · love / career / wealth
          </Text>
          <Button label="Unlock today’s almanac" size="md" onPress={onUnlock} />
        </View>
      ) : (
        <View style={{ marginTop: theme.spacing.md, gap: theme.spacing.md }}>
          <View style={{ flexDirection: 'row', gap: theme.spacing.lg }}>
            <DoDont title="宜  Do" items={fortune.do} tone="jade" />
            <DoDont title="忌  Avoid" items={fortune.dont} tone="accent" />
          </View>
          <View style={{ gap: theme.spacing.sm }}>
            <Aspect label="Career 事业" text={fortune.career} />
            <Aspect label="Love 感情" text={fortune.love} />
            <Aspect label="Wealth 财运" text={fortune.wealth} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.lg }}>
            <Lucky label="Direction" value={`${DIRECTION_ARROW[fortune.lucky_direction] ?? ''} ${fortune.lucky_direction}`} />
            <Lucky label="Colour" value={fortune.lucky_color} />
            <Lucky label="Hours" value={fortune.lucky_hours} />
          </View>
        </View>
      )}
    </Card>
  );
}

function DoDont({ title, items, tone }: { title: string; items: string[]; tone: 'jade' | 'accent' }) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text variant="heading" tone={tone}>
        {title}
      </Text>
      {items.map((it) => (
        <Text key={it} variant="small" tone="secondary">
          · {it}
        </Text>
      ))}
    </View>
  );
}

function Aspect({ label, text }: { label: string; text: string }) {
  return (
    <View style={{ gap: 1 }}>
      <Text variant="caption" tone="secondary" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
        {label}
      </Text>
      <Text variant="small">{text}</Text>
    </View>
  );
}

function Lucky({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 1 }}>
      <Text variant="caption" tone="secondary" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
        {label}
      </Text>
      <Text variant="bodyMedium">{value}</Text>
    </View>
  );
}
