import { View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Button, Screen, Text } from '@/components/ui';

export interface RouteLink {
  href: string;
  label: string;
}

interface PlaceholderScreenProps {
  /** The route group this screen belongs to, e.g. "(onboarding)". */
  group: string;
  title: string;
  /** Which spec screen / flow step this stands in for. */
  note?: string;
  /** Onward navigation links (usually the next step in the flow). */
  links?: RouteLink[];
  showBack?: boolean;
}

/**
 * Placeholder screen for the P1.T3 navigation shell. Every route group gets real, tappable
 * screens (named after the UIUX §2 flow) so the whole route tree can be walked before the real
 * UI lands in P4+. Uses the design-system primitives so the shell already looks like Palmly.
 */
export function PlaceholderScreen({
  group,
  title,
  note,
  links = [],
  showBack = true,
}: PlaceholderScreenProps) {
  return (
    <Screen scroll>
      <View style={{ gap: 12 }}>
        <Text variant="caption" tone="secondary">
          {group}
        </Text>
        <Text variant="display">{title}</Text>
        {note ? (
          <Text variant="body" tone="secondary">
            {note}
          </Text>
        ) : null}
        <View style={{ gap: 8, marginTop: 12 }}>
          {links.map((l) => (
            <Button
              key={l.href}
              label={l.label}
              variant="secondary"
              fullWidth
              onPress={() => router.push(l.href as Href)}
            />
          ))}
          {showBack ? (
            <Button label="← Back" variant="ghost" onPress={() => router.back()} />
          ) : null}
        </View>
      </View>
    </Screen>
  );
}
