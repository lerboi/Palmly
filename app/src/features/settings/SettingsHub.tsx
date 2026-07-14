import Constants from 'expo-constants';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { Icon, AppHeader, Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import { SettingGroup, SettingRow } from './settingsUi';

/**
 * Settings hub (UIUX §2.11, P10.T1, redesign v2 V20) — grouped rows for subscription, preferences,
 * and about/legal, each with a leading accent icon and shared press feedback. Every row navigates or
 * is informational (no dead-ends): the Plan row carries commercial identity (upgrade nudge / premium
 * badge, never a grey "Free"); Language is display-only (English for the MVP). Subscription
 * management + restore are RevenueCat-backed on device (H8).
 */
export function SettingsHub({ premium = false }: { premium?: boolean }) {
  const router = useRouter();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen scroll>
      <AppHeader title="Settings" onBack={() => router.back()} />

      <SettingGroup title="Subscription">
        <PlanRow premium={premium} onPress={() => router.push('/paywall')} />
        <SettingRow leadingIcon="history" label="Restore purchases" onPress={() => router.push('/paywall')} />
      </SettingGroup>

      <SettingGroup title="Preferences">
        <SettingRow first leadingIcon="bell" label="Notifications" onPress={() => router.push('/notifications')} />
        {/* English-only for the MVP — an informational row (no fake chevron). The zh "traditional
            view" (activeSkin → Ink & Cinnabar + CJK) language picker is a device follow-up. */}
        <SettingRow leadingIcon="globe" label="Language" value="English" />
      </SettingGroup>

      <SettingGroup title="About & legal">
        <SettingRow first leadingIcon="help" label="How Palmly reads" onPress={() => router.push('/methodology')} />
        <SettingRow leadingIcon="shield" label="Privacy & your data" onPress={() => router.push('/privacy')} />
        <SettingRow leadingIcon="document" label="Terms of Service" onPress={() => router.push('/legal')} />
        <SettingRow leadingIcon="document" label="Privacy Policy" onPress={() => router.push('/legal')} />
        <SettingRow leadingIcon="info" label="Version" value={version} />
      </SettingGroup>
    </Screen>
  );
}

/**
 * The Plan row — commercial identity (v2 V20): free shows an accent "Upgrade" nudge with a value
 * pitch (never a grey "Free"); premium shows a champagne "Active" badge. Both route to the paywall /
 * store management. Built on `SettingRow` so it inherits the shared press-spring + leading chip.
 */
function PlanRow({ premium, onPress }: { premium: boolean; onPress: () => void }) {
  return (
    <SettingRow
      first
      leadingIcon="sparkle"
      label={premium ? 'Palmly Premium' : 'Palmly Free'}
      caption={premium ? 'All features unlocked — thank you' : 'Unlock the full almanac, compatibility & chat'}
      onPress={onPress}
      right={<PlanPill premium={premium} />}
    />
  );
}

function PlanPill({ premium }: { premium: boolean }) {
  const theme = useTheme();
  const bg = premium ? theme.colors.premium : theme.colors.accent;
  const fg = premium ? theme.colors.onPremium : theme.colors.onAccent;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: bg,
        borderRadius: theme.radii.pill,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 5,
      }}
    >
      {premium ? <Icon name="check" size={13} color={fg} decorative /> : null}
      <Text variant="caption" color={fg}>
        {premium ? 'Active' : 'Upgrade'}
      </Text>
    </View>
  );
}
