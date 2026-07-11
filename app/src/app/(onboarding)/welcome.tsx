import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function Welcome() {
  return (
    <PlaceholderScreen
      group="(onboarding)"
      title="Your palm remembers"
      note="A0–A1 · brand moment + value prop (UIUX §2.1)"
      links={[{ href: '/how-it-works', label: 'How it works →' }]}
    />
  );
}
