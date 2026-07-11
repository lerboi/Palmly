import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function HandSelect() {
  return (
    <PlaceholderScreen
      group="(onboarding)"
      title="Which hand do you write with?"
      note="A3 · dominant-hand selection, doubles as pipeline input (UIUX §2.1, U5)"
      links={[{ href: '/primer', label: 'Read my palm →' }]}
    />
  );
}
