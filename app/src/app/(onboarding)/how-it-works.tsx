import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function HowItWorks() {
  return (
    <PlaceholderScreen
      group="(onboarding)"
      title="How it works"
      note="A2 · scan → trace your lines → your reading (UIUX §2.1)"
      links={[{ href: '/hand-select', label: 'Choose your hand →' }]}
    />
  );
}
