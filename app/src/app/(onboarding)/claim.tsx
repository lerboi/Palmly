import { View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Button, Screen, Text } from '@/components/ui';
import { RedThread } from '@/features/reading/ShareView';
import { useTheme } from '@/theme';

/**
 * Recipient claim landing (UIUX §2.10, redesign R16d) — the personalized entry an invited user
 * lands on instead of the generic onboarding: the red-thread motif, "{inviter} is waiting", and a
 * single explainer → capture. Below it, the "enter code" manual-recovery path. English, no CJK.
 * The inviter name is resolved from the deferred deep-link context on device.
 */
const INVITER = 'Mei';

export default function Claim() {
  const theme = useTheme();
  return (
    <Screen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Avatar label={INVITER[0]} tone="heritage" />
          <RedThread />
          <Avatar label="You" tone="accent" />
        </View>

        <Text variant="display" style={{ textAlign: 'center', marginTop: theme.spacing.xl }}>
          {INVITER} is waiting
        </Text>
        <Text
          variant="bodyLarge"
          tone="secondary"
          style={{ textAlign: 'center', marginTop: theme.spacing.sm, maxWidth: 320 }}
        >
          Scan your palm to reveal your compatibility — you&apos;ll get your own full reading too.
        </Text>
      </View>

      <View style={{ gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
        <Button label="Scan my palm" variant="primary" fullWidth onPress={() => router.push('/primer' as Href)} />
        <Button label="Have an invite? Enter code" variant="ghost" onPress={() => router.push('/primer' as Href)} />
      </View>
    </Screen>
  );
}

/** A small circular avatar with an initial — the two-person red-thread motif. */
function Avatar({ label, tone }: { label: string; tone: 'heritage' | 'accent' }) {
  const theme = useTheme();
  const color = tone === 'heritage' ? theme.colors.heritageAccent : theme.colors.accent;
  const bg = tone === 'heritage' ? theme.colors.surfaceSunken : theme.colors.accentMuted;
  return (
    <View
      style={{
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: bg,
        borderWidth: theme.strokes.bold,
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text variant="heading" color={color}>
        {label}
      </Text>
    </View>
  );
}
