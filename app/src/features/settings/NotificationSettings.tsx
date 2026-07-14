import { useState } from 'react';
import { Switch } from 'react-native';

import { Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import { SettingGroup, SettingRow } from './settingsUi';

/**
 * Notification granularity (UIUX §2.11, Backend §10, P10.T1) — per-class toggles (daily fortune /
 * social / offers), the fortune delivery time, and quiet hours. Toggles map to `notif_prefs`;
 * quiet hours (22:00–08:00 local) + the 1/day marketing cap are enforced server-side in push-dispatch.
 */
export function NotificationSettings() {
  const theme = useTheme();
  const [fortune, setFortune] = useState(true);
  const [social, setSocial] = useState(true);
  const [offers, setOffers] = useState(false);

  const sw = (value: boolean, onValueChange: (v: boolean) => void) => (
    <Switch value={value} onValueChange={onValueChange} trackColor={{ true: theme.colors.accent, false: theme.colors.border }} thumbColor={theme.colors.surface} />
  );

  return (
    <Screen scroll>
      <Text variant="display" style={{ marginBottom: theme.spacing.lg }}>
        Notifications
      </Text>

      <SettingGroup title="What you’ll hear about">
        <SettingRow first label="Daily fortune" right={sw(fortune, setFortune)} />
        <SettingRow label="Compatibility & social" right={sw(social, setSocial)} />
        <SettingRow label="Offers & updates" right={sw(offers, setOffers)} />
      </SettingGroup>

      <SettingGroup title="Timing">
        <SettingRow first label="Fortune delivery time" value="8:30 AM" />
        <SettingRow label="Quiet hours" value="10pm – 8am" />
      </SettingGroup>

      <Text variant="caption" tone="secondary" style={{ marginHorizontal: theme.spacing.xs }}>
        Quiet hours are enforced in your local time, and we send at most one content notification a day.
      </Text>
    </Screen>
  );
}
