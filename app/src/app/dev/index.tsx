import { View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Button, Card, Screen, Text } from '@/components/ui';

/**
 * /dev — route map. Lists every route in the P1.T3 navigation shell so the whole tree can be
 * walked in one place (the tap-through verification surface). Not shipped in production.
 */
const GROUPS: { title: string; routes: { href: string; label: string }[] }[] = [
  {
    title: '(onboarding)',
    routes: [
      { href: '/welcome', label: 'welcome' },
      { href: '/how-it-works', label: 'how-it-works' },
      { href: '/hand-select', label: 'hand-select' },
      { href: '/claim', label: 'claim (invite recipient)' },
    ],
  },
  {
    title: '(capture)',
    routes: [
      { href: '/primer', label: 'primer' },
      { href: '/palm', label: 'palm' },
      { href: '/face', label: 'face' },
    ],
  },
  {
    title: '(reading)',
    routes: [
      { href: '/analyzing', label: 'analyzing' },
      { href: '/reveal', label: 'reveal' },
      { href: '/pair', label: 'pair reveal (compatibility)' },
    ],
  },
  {
    title: '(home)',
    routes: [
      { href: '/fortune', label: 'fortune' },
      { href: '/history', label: 'history' },
      { href: '/chat', label: 'chat' },
    ],
  },
  {
    title: '(settings)',
    routes: [
      { href: '/settings', label: 'settings' },
      { href: '/privacy', label: 'privacy' },
      { href: '/notifications', label: 'notifications' },
      { href: '/methodology', label: 'methodology' },
    ],
  },
  {
    title: '(modals)',
    routes: [
      { href: '/paywall', label: 'paywall' },
      { href: '/share', label: 'share' },
    ],
  },
  {
    title: 'dev — design system',
    routes: [{ href: '/dev/theme', label: 'theme showcase (light + dark)' }],
  },
  {
    title: 'dev — state previews',
    routes: [
      { href: '/dev/analyzing-failed', label: 'analyzing · failed' },
      { href: '/dev/reveal-ready', label: 'reveal · ready (palm)' },
      { href: '/dev/reveal-face', label: 'reveal · ready (face)' },
      { href: '/dev/reveal-pending', label: 'reveal · pending' },
      { href: '/dev/reveal-error', label: 'reveal · error' },
      { href: '/dev/history', label: 'history · populated (palm + face)' },
      { href: '/dev/share-compat', label: 'share · compatibility' },
      { href: '/dev/chat-typing', label: 'chat · typing' },
      { href: '/dev/chat-empty', label: 'chat · first-run' },
      { href: '/dev/fortune-free', label: 'fortune · free' },
      { href: '/dev/fortune-empty', label: 'fortune · first-run' },
      { href: '/dev/history-empty', label: 'history · empty' },
      { href: '/dev/settings-premium', label: 'settings · premium' },
      { href: '/dev/privacy-confirm', label: 'privacy · delete confirm' },
    ],
  },
];

export default function DevRouteMap() {
  return (
    <Screen scroll>
      <Text variant="title">Route map</Text>
      <Text variant="caption" tone="secondary" style={{ marginBottom: 16 }}>
        P1.T3 navigation shell — tap any route
      </Text>
      <View style={{ gap: 16 }}>
        {GROUPS.map((g) => (
          <Card key={g.title}>
            <Text variant="heading" tone="accent" style={{ marginBottom: 8 }}>
              {g.title}
            </Text>
            <View style={{ gap: 8 }}>
              {g.routes.map((r) => (
                <Button
                  key={r.href}
                  label={r.label}
                  variant="secondary"
                  fullWidth
                  onPress={() => router.push(r.href as Href)}
                />
              ))}
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
