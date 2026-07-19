import { useEffect, useState } from 'react';
import { Switch } from 'react-native';
import { useRouter } from 'expo-router';

import { AppHeader, Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import { loadNotifPrefs, saveNotifPref, type NotifPref, type NotifPrefs } from '@/lib/privacy';
import { getPushPermission, openSystemNotificationSettings, type PushPermission } from '@/lib/notifications';
import { SettingGroup, SettingRow } from './settingsUi';

/**
 * Notification granularity (UIUX §2.11, Backend §10, P10.T1, audit F1.5) — per-class toggles (daily
 * fortune / social / offers) persisted to `devices.notif_prefs`, the fortune delivery time, and quiet
 * hours. Toggles read/write the caller's device row(s); quiet hours (22:00–08:00 local) + the 1/day
 * marketing cap are enforced server-side in push-dispatch. The delivery-time row is an honest caption
 * (no picker yet) — the per-device schedule write lands with real push (F1.T10); a control that wrote
 * nowhere would be exactly the fixture theater the audit flags.
 *
 * NOTE: persistence is a device leg — a device row only exists after push registration (an Expo push
 * token), which the web export never has, so on web the toggles fall back to defaults on reload.
 */
export function NotificationSettings() {
  const theme = useTheme();
  const router = useRouter();
  const [prefs, setPrefs] = useState<NotifPrefs>({ daily_fortune: true, social: true, offers: false });
  const [pushStatus, setPushStatus] = useState<PushPermission>('undetermined');

  useEffect(() => {
    let active = true;
    loadNotifPrefs().then((p) => active && setPrefs(p));
    getPushPermission().then((s) => active && setPushStatus(s));
    return () => {
      active = false;
    };
  }, []);

  const toggle = (key: NotifPref) => (value: boolean) => {
    setPrefs((p) => ({ ...p, [key]: value }));
    void saveNotifPref(key, value);
  };

  const sw = (value: boolean, onValueChange: (v: boolean) => void, label: string) => (
    <Switch
      value={value}
      onValueChange={onValueChange}
      accessibilityLabel={label}
      trackColor={{ true: theme.colors.accent, false: theme.colors.border }}
      thumbColor={theme.colors.surface}
      activeThumbColor={theme.colors.surface}
    />
  );

  return (
    <Screen scroll>
      <AppHeader title="Notifications" onBack={() => router.back()} />

      <SettingGroup title="System">
        <SettingRow
          first
          leadingIcon="bell"
          label="System notifications"
          value={pushStatus === 'granted' ? 'On' : pushStatus === 'denied' ? 'Off — tap to enable' : 'Not set yet'}
          onPress={pushStatus === 'denied' ? openSystemNotificationSettings : undefined}
        />
      </SettingGroup>
      {pushStatus === 'denied' ? (
        <Text variant="caption" tone="secondary" style={{ marginHorizontal: theme.spacing.xs, marginBottom: theme.spacing.md }}>
          Notifications are off in your system settings — turn them on to get your daily fortune and match alerts.
        </Text>
      ) : null}

      <SettingGroup title="What you’ll hear about">
        <SettingRow first leadingIcon="sparkle" label="Daily fortune" right={sw(prefs.daily_fortune, toggle('daily_fortune'), 'Daily fortune')} />
        <SettingRow leadingIcon="heart" label="Compatibility & social" right={sw(prefs.social, toggle('social'), 'Compatibility & social')} />
        <SettingRow leadingIcon="bell" label="Offers & updates" right={sw(prefs.offers, toggle('offers'), 'Offers & updates')} />
      </SettingGroup>

      <SettingGroup title="Timing">
        <SettingRow first label="Fortune delivery time" value="8:30 AM" />
        <SettingRow label="Quiet hours" value="10pm – 8am" />
      </SettingGroup>

      <Text variant="caption" tone="secondary" style={{ marginHorizontal: theme.spacing.xs }}>
        Your fortune arrives around 8:30 in your local time — the exact time becomes adjustable at launch.
        Quiet hours are enforced in your local time, and we send at most one content notification a day.
      </Text>
    </Screen>
  );
}
