import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function History() {
  return (
    <PlaceholderScreen
      group="(home)"
      title="Your readings"
      note="Reading history shelf, re-open stored readings (UIUX §2.5, P6.T4)"
      links={[{ href: '/reveal', label: 'Open a reading' }]}
    />
  );
}
