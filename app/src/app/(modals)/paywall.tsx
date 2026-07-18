import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PaywallView, type Plan } from '@/features/paywall/PaywallView';
import { PREVIEW_GEOMETRY } from '@/features/reading/reveal';
import { track, type AnalyticsEventMap } from '@/lib/analytics';

/**
 * Paywall (UIUX §2.8, redesign R17). Renders {@link PaywallView} with launch plan fixtures
 * (no-trial, direct purchase — U3) + the user's palm as the personalized hero. The real
 * RevenueCat Paywalls-v2 offerings + purchase flow are wired on device; here the layout is
 * seeded so it's buildable + device-free-verifiable. The `trigger` param (from each gated tease —
 * F0.T12) drives `paywall_viewed`/`paywall_dismissed` and, in F1.T2, the hero copy.
 */
const PLANS: Plan[] = [
  { id: 'annual', name: 'Annual', price: '$35.88 billed yearly', perMonth: '$2.99 / mo', badge: 'SAVE 40%' },
  { id: 'monthly', name: 'Monthly', price: 'billed monthly', perMonth: '$4.99 / mo' },
];

type PaywallTrigger = AnalyticsEventMap['paywall_viewed']['trigger'];
const TRIGGERS: PaywallTrigger[] = ['locked_section', 'fortune_full', 'compat_second', 'chat_entry', 'post_share', 'settings'];

export default function Paywall() {
  const router = useRouter();
  const params = useLocalSearchParams<{ trigger?: string }>();
  const trigger: PaywallTrigger = (TRIGGERS as string[]).includes(params.trigger ?? '')
    ? (params.trigger as PaywallTrigger)
    : 'locked_section';

  useEffect(() => {
    track('paywall_viewed', { trigger });
  }, [trigger]);

  const onClose = () => {
    track('paywall_dismissed', { trigger, page: 0 });
    router.back();
  };

  return (
    <PaywallView
      plans={PLANS}
      defaultPlanId="annual"
      geometry={PREVIEW_GEOMETRY}
      lockedLine="fate_line"
      lockedNames={['fate line', 'rare markings']}
      onClose={onClose}
      onPurchase={() => router.back()}
      onRestore={() => {}}
    />
  );
}
