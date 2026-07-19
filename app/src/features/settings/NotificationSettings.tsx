import { useEffect, useState } from 'react';
import { Switch } from 'react-native';
import { useRouter } from 'expo-router';

import { AppHeader, Screen, Text } from '@/components/ui';
import { t } from '@/lib/i18n';
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
      <AppHeader title={t('notif.title')} onBack={() => router.back()} />

      <SettingGroup title={t('notif.system.group')}>
        <SettingRow
          first
          leadingIcon="bell"
          label={t('notif.system.label')}
          value={pushStatus === 'granted' ? t('notif.system.on') : pushStatus === 'denied' ? t('notif.system.off') : t('notif.system.unset')}
          onPress={pushStatus === 'denied' ? openSystemNotificationSettings : undefined}
        />
      </SettingGroup>
      {pushStatus === 'denied' ? (
        <Text variant="caption" tone="secondary" style={{ marginHorizontal: theme.spacing.xs, marginBottom: theme.spacing.md }}>
          {t('notif.system.denied_caption')}
        </Text>
      ) : null}

      <SettingGroup title={t('notif.about.group')}>
        <SettingRow first leadingIcon="sparkle" label={t('notif.about.daily')} right={sw(prefs.daily_fortune, toggle('daily_fortune'), t('notif.about.daily'))} />
        <SettingRow leadingIcon="heart" label={t('notif.about.social')} right={sw(prefs.social, toggle('social'), t('notif.about.social'))} />
        <SettingRow leadingIcon="bell" label={t('notif.about.offers')} right={sw(prefs.offers, toggle('offers'), t('notif.about.offers'))} />
      </SettingGroup>

      <SettingGroup title={t('notif.timing.group')}>
        <SettingRow first label={t('notif.timing.delivery')} value={t('notif.timing.delivery_value')} />
        <SettingRow label={t('notif.timing.quiet')} value={t('notif.timing.quiet_value')} />
      </SettingGroup>

      <Text variant="caption" tone="secondary" style={{ marginHorizontal: theme.spacing.xs }}>
        {t('notif.footer')}
      </Text>
    </Screen>
  );
}
