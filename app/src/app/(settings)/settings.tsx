import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function Settings() {
  return (
    <PlaceholderScreen
      group="(settings)"
      title="Settings"
      note="Subscription, notifications, language, legal, restore purchases (UIUX §2.11, P10.T1)"
      links={[
        { href: '/notifications', label: 'Notifications' },
        { href: '/privacy', label: 'Privacy & data' },
        { href: '/methodology', label: 'Our methodology' },
      ]}
    />
  );
}
