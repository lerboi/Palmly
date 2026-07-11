import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function Fortune() {
  return (
    <PlaceholderScreen
      group="(home)"
      title="Today's fortune"
      note="K · dual-calendar almanac, free one-liner + premium detail, streak (UIUX §2.11, P9.T3)"
      links={[
        { href: '/history', label: 'Reading history' },
        { href: '/chat', label: 'Ask the reader (chat)' },
        { href: '/settings', label: 'Settings' },
      ]}
    />
  );
}
