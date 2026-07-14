import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { PalmDiagram } from '@/components/palm-diagram/PalmDiagram';
import type { LineGeometry } from '@/components/palm-diagram/geometry';
import { Button, Card, Icon, Logomark, Screen, Text } from '@/components/ui';
import type { IconName } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/theme';

export interface Plan {
  id: string;
  name: string;
  price: string; // billed price, e.g. '$35.88 billed yearly'
  perMonth: string; // e.g. '$2.99 / mo'
  badge?: string; // e.g. 'SAVE 40%'
}

export interface PaywallViewProps {
  plans: Plan[];
  /** Which plan is pre-selected (annual, per §2.8). */
  defaultPlanId?: string;
  /** The user's own palm — the personalized hero (spec §2.8: their diagram, their line names). */
  geometry?: LineGeometry;
  /** The locked palm line to highlight on the hero (default `fate_line`). */
  lockedLine?: string;
  /** Human names of what's still locked, e.g. `['fate line', 'rare markings']`. */
  lockedNames?: string[];
  onClose?: () => void;
  onPurchase?: (planId: string) => void;
  onRestore?: () => void;
}

/** What Premium adds — each with a feature-matched icon (not a row of identical checks). */
const INCLUSIONS: { icon: IconName; text: string }[] = [
  { icon: 'streak', text: 'Your daily almanac & fortune' },
  { icon: 'thread', text: 'Unlimited compatibility matches' },
  { icon: 'palm', text: 'Deep-dive line readings' },
  { icon: 'chat', text: 'Ask about your reading in chat' },
];

/**
 * Paywall (UIUX §2.8, redesign R17 / v2 V16) — a personalized single sheet: the user's **own**
 * traced palm with the locked line highlighted + their line names (not a generic feature list),
 * a feature-matched inclusion list that staggers in, elevated spring-selectable plan cards (annual
 * pre-selected, billed price led + a gold SAVE seal — gold is the ONE premium marker), a small
 * claret brand seal, and a single vermilion CTA. The RevenueCat Paywalls-v2 native render +
 * purchase are device-only ([~]); this is the in-app layout.
 */
export function PaywallView({
  plans,
  defaultPlanId,
  geometry,
  lockedLine = 'fate_line',
  lockedNames = ['deep-dive lines'],
  onClose,
  onPurchase,
  onRestore,
}: PaywallViewProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';
  const [selected, setSelected] = useState(defaultPlanId ?? plans[0]?.id);
  const enter = (i: number) =>
    shouldAnimate ? FadeInDown.delay(i * theme.motion.stagger.reveal).duration(theme.motion.duration.base) : undefined;

  return (
    <Screen>
      {/* Header — close (top-left) + a small claret brand seal. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm }}>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={12}
          style={{ padding: theme.spacing.xs, marginLeft: -theme.spacing.xs }}
        >
          <Icon name="close" size={24} color={theme.colors.textSecondary} decorative />
        </Pressable>
        <View style={{ flex: 1 }} />
        <Logomark size={28} variant="stamp" tone="heritage" accessibilityLabel="Palmly seal" />
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: theme.spacing.lg }}>
        {/* Personalized hero — their palm, the locked line lit, their line names. */}
        <View style={{ alignItems: 'center', marginBottom: theme.spacing.lg }}>
          {geometry ? (
            <PalmDiagram geometry={geometry} size={168} highlightedLine={lockedLine} animate />
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginTop: theme.spacing.sm }}>
            <Icon name="sparkle" size={18} color={theme.colors.premium} decorative />
            <Text variant="caption" tone="premium" style={{ letterSpacing: 1, textTransform: 'uppercase' }}>
              Palmly Premium
            </Text>
          </View>
          <Text variant="title" style={{ textAlign: 'center', marginTop: theme.spacing.sm }}>
            Your palm has more to say
          </Text>
          <Text variant="bodyLarge" tone="secondary" style={{ textAlign: 'center', marginTop: theme.spacing.sm, maxWidth: 320 }}>
            Your {joinNames(lockedNames)} are still hidden — unlock the full read.
          </Text>
        </View>

        {/* Feature-matched inclusions, staggered in. */}
        <View style={{ gap: theme.spacing.md }}>
          {INCLUSIONS.map((item, i) => (
            <Animated.View
              key={item.text}
              entering={enter(i)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: theme.radii.sm,
                  backgroundColor: theme.colors.accentMuted,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={item.icon} size={20} color={theme.colors.accent} decorative />
              </View>
              <Text variant="body" style={{ flex: 1 }}>
                {item.text}
              </Text>
            </Animated.View>
          ))}
        </View>

        {/* Plan cards. */}
        <View style={{ gap: theme.spacing.md, marginTop: theme.spacing.xl }}>
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              selected={selected === plan.id}
              onSelect={() => setSelected(plan.id)}
            />
          ))}
        </View>
      </ScrollView>

      {/* Footer — CTA, then the restore link separated from the legal line. */}
      <View style={{ gap: theme.spacing.md, marginTop: theme.spacing.sm, marginBottom: theme.spacing.md }}>
        <Button
          label="Unlock Palmly Premium"
          variant="primary"
          fullWidth
          onPress={() => selected && onPurchase?.(selected)}
        />
        <View style={{ alignItems: 'center', gap: theme.spacing.xs }}>
          <Pressable onPress={onRestore} accessibilityRole="button" hitSlop={12}>
            <Text variant="caption" color={theme.colors.accent}>
              Restore purchases
            </Text>
          </Pressable>
          <Text variant="caption" tone="tertiary">
            No trial · cancel anytime
          </Text>
        </View>
      </View>
    </Screen>
  );
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? 'deep-dive lines';
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

function PlanCard({ plan, selected, onSelect }: { plan: Plan; selected: boolean; onSelect: () => void }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';
  const [held, setHeld] = useState(false);
  const scale = useSharedValue(1);
  const press = theme.motion.spring.press;
  useEffect(() => {
    if (!shouldAnimate) {
      scale.value = 1;
      return;
    }
    scale.value = withSpring(held ? 0.98 : 1, press);
  }, [held, shouldAnimate, scale, press]);
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={scaleStyle}>
      <Pressable
        onPress={onSelect}
        onPressIn={() => setHeld(true)}
        onPressOut={() => setHeld(false)}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={`${plan.name} — ${plan.perMonth}, ${plan.price}`}
      >
        <Card
          elevation={selected ? 'md' : 'sm'}
          bordered
          style={{
            borderColor: selected ? theme.colors.accent : theme.colors.border,
            borderWidth: selected ? theme.strokes.bold : theme.strokes.hairline,
            backgroundColor: selected ? theme.colors.accentMuted : theme.colors.surfaceRaised,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
            <Radio on={selected} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                <Text variant="heading">{plan.name}</Text>
                {plan.badge ? <PremiumSeal label={plan.badge} /> : null}
              </View>
              <Text variant="caption" tone="secondary" style={{ marginTop: 2 }}>
                {plan.price}
              </Text>
            </View>
            {/* Stable hierarchy: the per-month lead never flips colour on selection. */}
            <Text variant="heading">{plan.perMonth}</Text>
          </View>
        </Card>
      </Pressable>
    </Animated.View>
  );
}

function Radio({ on }: { on: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={{
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: on ? theme.colors.accent : theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {on ? (
        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: theme.colors.accent }} />
      ) : null}
    </View>
  );
}

/** The single rare premium marker — a champagne/gold seal (redesign §2). */
function PremiumSeal({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View
      style={{
        backgroundColor: theme.colors.premium,
        borderRadius: theme.radii.sm,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 2,
      }}
    >
      <Text variant="caption" color={theme.colors.onPremium} style={{ fontSize: 11, letterSpacing: 0.5 }}>
        {label}
      </Text>
    </View>
  );
}
