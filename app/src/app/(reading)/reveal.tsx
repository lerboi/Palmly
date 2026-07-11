import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function Reveal() {
  return (
    <PlaceholderScreen
      group="(reading)"
      title="Your reading"
      note="E · hero self-draw, section cards, locked depth, share/compat/face offers (UIUX §2.5, P6.T3)"
      links={[
        { href: '/share', label: 'Share this reading (modal)' },
        { href: '/paywall', label: 'Unlock deep dive (paywall modal)' },
        { href: '/face', label: 'Also read my face' },
        { href: '/fortune', label: 'Go to daily fortune' },
      ]}
    />
  );
}
