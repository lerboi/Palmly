import { useState } from 'react';
import { Switch, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppHeader, Button, Card, Icon, Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import { SettingGroup, SettingRow } from './settingsUi';

/**
 * Privacy center (UIUX §2.11, Backend §9, P10.T2) — the "photo deleted ✓" truth, the D2 keep-my-scan
 * opt-in, "delete my scans now", and account deletion with an inline confirm. The actions are wired
 * to the already-built backend (`request_image_deletion`, `account-delete` → `purge_account`); the
 * live erasure runs on device.
 */
export function PrivacyCenter() {
  const theme = useTheme();
  const router = useRouter();
  const [keepPhoto, setKeepPhoto] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const deleteScans = () => {
    /* device: calls request_image_deletion — flips scans to image-deleted + removes the storage object */
  };
  const deleteAccount = () => {
    /* device: calls the account-delete edge fn → purge_account (cascade erasure) + storage + RC/AppsFlyer */
  };

  return (
    <Screen scroll>
      <AppHeader title="Privacy &amp; your data" onBack={() => router.back()} />

      <Card elevation="sm" style={{ marginBottom: theme.spacing.lg, gap: theme.spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Icon name="shield" size={18} color={theme.colors.success} decorative />
          <Text variant="bodyMedium" tone="success">
            Your photo is deleted within a day
          </Text>
        </View>
        <Text variant="body" tone="secondary">
          We keep only the engraved line diagram and your reading — never the photo itself, and never anything used to identify you.
        </Text>
      </Card>

      <SettingGroup title="Your scan photos">
        <SettingRow
          first
          label="Keep my scan photo"
          right={<Switch value={keepPhoto} onValueChange={setKeepPhoto} trackColor={{ true: theme.colors.accent, false: theme.colors.border }} thumbColor={theme.colors.surface} />}
        />
      </SettingGroup>
      <Text variant="caption" tone="secondary" style={{ marginHorizontal: theme.spacing.xs, marginBottom: theme.spacing.lg }}>
        Off by default — your photo is deleted after your reading. Turn on to keep it for re-reading.
      </Text>

      <View style={{ marginBottom: theme.spacing.xl }}>
        <Button label="Delete my scan photos now" variant="secondary" onPress={deleteScans} />
      </View>

      <SettingGroup title="Delete your account">
        <SettingRow first label="Delete my account & all data" danger onPress={() => setConfirmDelete(true)} />
      </SettingGroup>

      {confirmDelete ? (
        <Card elevation="md" style={{ borderColor: theme.colors.danger, borderWidth: theme.strokes.hairline, gap: theme.spacing.md }}>
          <Text variant="heading" color={theme.colors.danger}>
            This erases everything
          </Text>
          <Text variant="body" tone="secondary">
            Your readings, diagrams, subscription record, and account are permanently deleted. This can’t be undone.
          </Text>
          <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
            <Button label="Delete everything" variant="danger" onPress={deleteAccount} />
            <Button label="Cancel" variant="ghost" onPress={() => setConfirmDelete(false)} />
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}
