import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Card, Icon, Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme';

export interface Plan {
  id: string;
  name: string;
  price: string; // e.g. '$35.88 / year'
  perMonth: string; // e.g. '$2.99 / mo'
  badge?: string; // e.g. 'SAVE 40%'
}

export interface PaywallViewProps {
  plans: Plan[];
  /** Which plan is pre-selected (annual, per §2.8). */
  defaultPlanId?: string;
  onClose?: () => void;
  onPurchase?: (planId: string) => void;
  onRestore?: () => void;
}

const INCLUSIONS = [
  'Your daily almanac & fortune',
  'Unlimited compatibility matches',
  'Deep-dive line readings',
  'Ask about your reading in chat',
];

/**
 * Paywall (UIUX §2.8, redesign R17) — a clean, single-sheet value stack: what Premium adds,
 * elevated selectable plan cards (annual pre-selected with a gold SAVE seal — gold is the ONE
 * premium marker), and a single confident accent CTA. No trial (launch config, U3), no cinnabar
 * fill. The RevenueCat Paywalls-v2 native render is device-only ([~]); this is the in-app layout.
 */
export function PaywallView({ plans, defaultPlanId, onClose, onPurchase, onRestore }: PaywallViewProps) {
  const theme = useTheme();
  const [selected, setSelected] = useState(defaultPlanId ?? plans[0]?.id);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={8}
          style={{ padding: theme.spacing.xs, marginLeft: -theme.spacing.xs }}
        >
          <Icon name="close" size={24} color={theme.colors.textSecondary} decorative />
        </Pressable>
      </View>

      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Icon name="sparkle" size={22} color={theme.colors.premium} decorative />
          <Text variant="caption" tone="premium" style={{ letterSpacing: 1, textTransform: 'uppercase' }}>
            Palmly Premium
          </Text>
        </View>
        <Text variant="title" style={{ marginTop: theme.spacing.sm }}>
          Your palm has more to say
        </Text>
        <Text variant="bodyLarge" tone="secondary" style={{ marginTop: theme.spacing.sm }}>
          Unlock your deep-dive lines, daily fortune, and unlimited compatibility.
        </Text>

        <View style={{ gap: theme.spacing.md, marginTop: theme.spacing.xl }}>
          {INCLUSIONS.map((item) => (
            <View key={item} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
              <Icon name="check" size={20} color={theme.colors.success} decorative />
              <Text variant="body" style={{ flex: 1 }}>
                {item}
              </Text>
            </View>
          ))}
        </View>

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
      </View>

      <View style={{ gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
        <Button
          label="Unlock Palmly Premium"
          variant="primary"
          fullWidth
          onPress={() => selected && onPurchase?.(selected)}
        />
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: theme.spacing.lg }}>
          <Pressable onPress={onRestore} accessibilityRole="button">
            <Text variant="caption" tone="secondary">
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

function PlanCard({ plan, selected, onSelect }: { plan: Plan; selected: boolean; onSelect: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onSelect} accessibilityRole="radio" accessibilityState={{ selected }}>
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
          <Text variant="bodyMedium" color={selected ? theme.colors.accent : theme.colors.textPrimary}>
            {plan.perMonth}
          </Text>
        </View>
      </Card>
    </Pressable>
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
