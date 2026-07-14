import { useState } from 'react';
import { Platform, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppHeader, Button, Card, Screen, Text } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/theme';
import { PrivacyTrustCard, SettingGroup, SettingRow } from './settingsUi';

/**
 * Privacy center (UIUX §2.11, Backend §9, P10.T2, redesign v2 V20) — the shared "photo deleted"
 * trust card, the D2 keep-my-scan opt-in, "delete my scans now", and account deletion behind a
 * first-class `danger` Button confirm that **animates into view**. The actions are wired to the
 * already-built backend (`request_image_deletion`, `account-delete` → `purge_account`); the live
 * erasure runs on device. `defaultConfirm` pre-opens the confirm for the /dev preview.
 */
export function PrivacyCenter({ defaultConfirm = false }: { defaultConfirm?: boolean }) {
  const theme = useTheme();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';
  const [keepPhoto, setKeepPhoto] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(defaultConfirm);

  const deleteScans = () => {
    /* device: calls request_image_deletion — flips scans to image-deleted + removes the storage object */
  };
  const deleteAccount = () => {
    /* device: calls the account-delete edge fn → purge_account (cascade erasure) + storage + RC/AppsFlyer */
  };

  return (
    <Screen scroll>
      <AppHeader title="Privacy &amp; your data" onBack={() => router.back()} />

      <View style={{ marginBottom: theme.spacing.lg }}>
        <PrivacyTrustCard headline="Your photo is deleted within a day">
          <Text variant="body" tone="secondary">
            We keep only the engraved line diagram and your reading — never the photo itself, and never anything used to identify you.
          </Text>
        </PrivacyTrustCard>
      </View>

      <SettingGroup title="Your scan photos">
        <SettingRow
          first
          leadingIcon="camera"
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
        <SettingRow first danger label="Delete my account & all data" onPress={() => setConfirmDelete(true)} />
      </SettingGroup>

      {confirmDelete ? (
        <Animated.View entering={shouldAnimate ? FadeInDown.duration(theme.motion.duration.base) : undefined}>
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
        </Animated.View>
      ) : null}
    </Screen>
  );
}
