import Constants from 'expo-constants';
import { useRouter } from 'expo-router';

import { AppHeader, Screen } from '@/components/ui';
import { SettingGroup, SettingRow } from './settingsUi';

/**
 * Settings hub (UIUX §2.11, P10.T1) — grouped rows for subscription, preferences, and about/legal.
 * Every row navigates or is informational (no dead-ends). Subscription management + restore are
 * RevenueCat-backed on device (H8); the language row is a stub (English only for the MVP).
 */
export function SettingsHub({ premium = false }: { premium?: boolean }) {
  const router = useRouter();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen scroll>
      <AppHeader title="Settings" onBack={() => router.back()} />

      <SettingGroup title="Subscription">
        <SettingRow first label="Plan" value={premium ? 'Palmly Premium' : 'Free'} onPress={() => router.push('/paywall')} />
        <SettingRow label="Restore purchases" onPress={() => router.push('/paywall')} />
      </SettingGroup>

      <SettingGroup title="Preferences">
        <SettingRow first label="Notifications" onPress={() => router.push('/notifications')} />
        {/* Language wires the optional zh "traditional view" (activeSkin → Ink & Cinnabar + CJK
            labels/fonts). English-only for the MVP; the picker is a device follow-up. */}
        <SettingRow label="Language" value="English" onPress={() => {}} />
      </SettingGroup>

      <SettingGroup title="About & legal">
        <SettingRow first label="How Palmly reads" onPress={() => router.push('/methodology')} />
        <SettingRow label="Privacy & your data" onPress={() => router.push('/privacy')} />
        <SettingRow label="Terms of Service" onPress={() => router.push('/legal')} />
        <SettingRow label="Privacy Policy" onPress={() => router.push('/legal')} />
        <SettingRow label="Version" value={version} />
      </SettingGroup>
    </Screen>
  );
}
