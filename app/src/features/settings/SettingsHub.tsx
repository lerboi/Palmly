import Constants from 'expo-constants';
import { Alert, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { Icon, AppHeader, Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import { signOutAccount, useAccountIdentity } from '@/lib/account';
import { restorePurchases } from '@/lib/revenuecat';
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
  const { isAnonymous, label } = useAccountIdentity();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen scroll>
      <AppHeader title="Settings" onBack={() => router.back()} />

      <SettingGroup title="Account">
        {isAnonymous ? (
          <SettingRow
            first
            leadingIcon="sparkle"
            label="Claim your account"
            caption="Keep your readings, fortune & matches — even on a new phone"
            onPress={() => router.push('/account?reason=settings' as Href)}
          />
        ) : (
          <>
            <SettingRow first leadingIcon="shield" label="Signed in as" value={label ?? 'your account'} />
            <SettingRow leadingIcon="logout" label="Sign out" onPress={() => void signOutAccount().then(() => router.replace('/'))} />
          </>
        )}
      </SettingGroup>

      <SettingGroup title="Subscription">
        <PlanRow premium={premium} onPress={() => router.push('/paywall?trigger=settings' as Href)} />
        {/* Restore must NOT route a paying user to the sales screen (audit F1.2) — it queries the
            store (RC stub until H8) and reports honestly. */}
        <SettingRow
          leadingIcon="history"
          label="Restore purchases"
          onPress={() => void restorePurchases().then((r) => Alert.alert('Restore purchases', r.message))}
        />
      </SettingGroup>

      {/* Loop re-entry (F2.8): a standing door back into the viral compatibility loop. Routes to the
          reading list, where each row's share affordance opens the compat sheet. */}
      <SettingGroup title="Friends">
        <SettingRow
          first
          leadingIcon="heart"
          label="Compare with a friend"
          caption="See how your palms match"
          onPress={() => router.push('/history' as Href)}
        />
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
      accentIcon
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
