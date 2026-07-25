import { Platform, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button, Card, Icon, Text } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/theme';
import { DIRECTION_ARROW, type Fortune } from './fortune';

/**
 * The daily fortune card (UIUX §2.11, redesign R18 / v2 V17) — a true hero (`elevation="md"` +
 * surfaceRaised): an accent-chip header, the free `overall` essence promoted to the visual anchor,
 * and an unlock CTA. Premium **unfolds** the Do/Avoid lists (Avoid in `danger`, not heritage — the
 * claret is reserved for the red-thread, §3.2), the career/love/wealth lines, and the lucky
 * direction/colour/hours (U4 gating), each section staggering in. English-first, no CJK.
 */
export function FortuneCard({ fortune, premium, onUnlock, onAsk }: { fortune: Fortune; premium: boolean; onUnlock?: () => void; onAsk?: (prefill: string) => void }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';
  const unfold = (i: number) =>
    shouldAnimate ? FadeInDown.delay(i * theme.motion.stagger.reveal).duration(theme.motion.duration.base) : undefined;

  return (
    <Card elevation="md" style={{ marginBottom: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: theme.radii.sm,
            backgroundColor: theme.colors.accentMuted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="sparkle" size={18} color={theme.colors.accent} decorative />
        </View>
        <Text variant="caption" tone="tertiary" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
          Today&apos;s fortune
        </Text>
      </View>

      {/* The free essence — the visual anchor. */}
      <Text variant="bodyLarge">{fortune.overall}</Text>

      {!premium ? (
        <View style={{ marginTop: theme.spacing.lg, gap: theme.spacing.md, alignItems: 'flex-start' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Icon name="lock" size={16} color={theme.colors.premiumInk} decorative />
            <Text variant="caption" tone="premiumInk">
              Do · Avoid · lucky direction · hours · love, career &amp; wealth
            </Text>
          </View>
          <Button label="Unlock today's almanac" variant="tonal" size="md" onPress={onUnlock} />
        </View>
      ) : (
        <View style={{ marginTop: theme.spacing.lg, gap: theme.spacing.lg }}>
          <Animated.View entering={unfold(0)} style={{ flexDirection: 'row', gap: theme.spacing.lg }}>
            <DoDont title="Do" items={fortune.do} tone="success" />
            <DoDont title="Avoid" items={fortune.dont} tone="danger" />
          </Animated.View>

          <Divider />

          <Animated.View entering={unfold(1)} style={{ gap: theme.spacing.md }}>
            <Aspect label="Career" text={fortune.career} />
            <Aspect label="Love" text={fortune.love} />
            <Aspect label="Wealth" text={fortune.wealth} />
          </Animated.View>

          <Divider />

          <Animated.View entering={unfold(2)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.lg }}>
            <Lucky label="Direction" value={`${DIRECTION_ARROW[fortune.lucky_direction] ?? ''} ${fortune.lucky_direction}`} />
            <Lucky label="Colour" value={fortune.lucky_color} />
            <Lucky label="Hours" value={fortune.lucky_hours} />
          </Animated.View>

          {/* Fortune → chat bridge (audit §7 P4) — pre-fills the grounded chat with today's almanac. */}
          {onAsk ? (
            <Animated.View entering={unfold(3)} style={{ alignItems: 'flex-start' }}>
              <Button
                label="Ask about today"
                variant="ghost"
                size="md"
                icon={<Icon name="chat" size={16} color={theme.colors.accent} decorative />}
                onPress={() => onAsk(`Why is ${fortune.lucky_direction} my lucky direction today?`)}
              />
            </Animated.View>
          ) : null}
        </View>
      )}
    </Card>
  );
}

function Divider() {
  const theme = useTheme();
  return <View style={{ height: theme.strokes.hairline, backgroundColor: theme.colors.border }} />;
}

/** Shared uppercase section eyebrow (Aspect + Lucky both use it). */
function SectionLabel({ children }: { children: string }) {
  return (
    <Text variant="caption" tone="tertiary" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
      {children}
    </Text>
  );
}

function DoDont({ title, items, tone }: { title: string; items: string[]; tone: 'success' | 'danger' }) {
  const theme = useTheme();
  const color = tone === 'success' ? theme.colors.success : theme.colors.danger;
  const marker = tone === 'success' ? '✓' : '✕';
  return (
    <View style={{ flex: 1, gap: theme.spacing.xs }}>
      <Text variant="heading" color={color}>
        {title}
      </Text>
      {items.map((it, i) => (
        <View key={`${title}-${i}`} style={{ flexDirection: 'row', gap: theme.spacing.xs }}>
          <Text variant="small" color={color}>
            {marker}
          </Text>
          <Text variant="small" tone="secondary" style={{ flex: 1 }}>
            {it}
          </Text>
        </View>
      ))}
    </View>
  );
}

function Aspect({ label, text }: { label: string; text: string }) {
  return (
    <View style={{ gap: 2 }}>
      <SectionLabel>{label}</SectionLabel>
      <Text variant="body">{text}</Text>
    </View>
  );
}

function Lucky({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2, minWidth: 84 }}>
      <SectionLabel>{label}</SectionLabel>
      <Text variant="bodyMedium">{value}</Text>
    </View>
  );
}
