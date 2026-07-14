import { useRouter } from 'expo-router';
import { PaywallView, type Plan } from '@/features/paywall/PaywallView';
import { PREVIEW_GEOMETRY } from '@/features/reading/reveal';

/**
 * Paywall (UIUX §2.8, redesign R17). Renders {@link PaywallView} with launch plan fixtures
 * (no-trial, direct purchase — U3) + the user's palm as the personalized hero. The real
 * RevenueCat Paywalls-v2 offerings + purchase flow are wired on device; here the layout is
 * seeded so it's buildable + device-free-verifiable.
 */
const PLANS: Plan[] = [
  { id: 'annual', name: 'Annual', price: '$35.88 billed yearly', perMonth: '$2.99 / mo', badge: 'SAVE 40%' },
  { id: 'monthly', name: 'Monthly', price: 'billed monthly', perMonth: '$4.99 / mo' },
];

export default function Paywall() {
  const router = useRouter();
  return (
    <PaywallView
      plans={PLANS}
      defaultPlanId="annual"
      geometry={PREVIEW_GEOMETRY}
      lockedLine="fate_line"
      lockedNames={['fate line', 'rare markings']}
      onClose={() => router.back()}
      onPurchase={() => router.back()}
      onRestore={() => {}}
    />
  );
}
