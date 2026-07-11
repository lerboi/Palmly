import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function Share() {
  return (
    <PlaceholderScreen
      group="(modals)"
      title="Share your reading"
      note="Variant carousel, channel row, compare-toggle → invite (UIUX §2.6, P8.T2)"
      links={[{ href: '/fortune', label: 'Done → home' }]}
    />
  );
}
