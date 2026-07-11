import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function Paywall() {
  return (
    <PlaceholderScreen
      group="(modals)"
      title="Unlock the deep dive"
      note="Contextual multi-page paywall, RevenueCat Paywalls v2 (UIUX §2.8, P7.T4)"
      links={[{ href: '/fortune', label: 'Simulate purchase → home' }]}
    />
  );
}
