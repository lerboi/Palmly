import { useEffect, useState } from 'react';
import { Platform, Switch, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppHeader, Button, Card, Screen, Text } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/theme';
import { deleteEverything, deleteScanPhotos, loadKeepPhoto, setKeepPhoto as persistKeepPhoto } from '@/lib/privacy';
import { CANONICAL_DELETION_PROMISE } from '@/lib/trustCopy';
import { track } from '@/lib/analytics';
import { PrivacyTrustCard, SettingGroup, SettingRow } from './settingsUi';

/**
 * Privacy center (UIUX §2.11, Backend §9, audit F1.5) — the shared canonical "photo deleted" trust
 * card, the D2 keep-my-scan opt-in (persisted to `scans.keep_image`), a LIVE "delete my scans now"
 * (→ the deployed `image-delete` fn), and account deletion (→ `account-delete` → sign-out → launcher)
 * behind a first-class `danger` confirm. `defaultConfirm` pre-opens the confirm for the /dev preview.
 */
export function PrivacyCenter({ defaultConfirm = false }: { defaultConfirm?: boolean }) {
  const theme = useTheme();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';
  const [keepPhoto, setKeepPhoto] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(defaultConfirm);
  // `ok` is carried, not inferred: the success tone used to be decided by sniffing the message for
  // a ✓ glyph, which broke the moment the glyph left the copy (Audit-4 CO-8).
  const [scans, setScans] = useState<{ busy: boolean; message: string | null; ok: boolean }>({ busy: false, message: null, ok: false });
  const [accountBusy, setAccountBusy] = useState(false);

  useEffect(() => {
    let active = true;
    loadKeepPhoto().then((v) => active && setKeepPhoto(v));
    return () => {
      active = false;
    };
  }, []);

  const onKeepPhoto = (v: boolean) => {
    setKeepPhoto(v);
    void persistKeepPhoto(v);
  };

  const deleteScans = () => {
    setScans({ busy: true, message: null, ok: false });
    void deleteScanPhotos().then((r) => {
      if (r.ok) track('scans_deleted', {});
      setScans({ busy: false, message: r.message, ok: r.ok });
    });
  };

  const deleteAccount = () => {
    setAccountBusy(true);
    void deleteEverything().then((r) => {
      if (r.ok) {
        track('account_deleted', {});
        router.replace('/' as Href); // signed out → the launcher
      } else {
        setAccountBusy(false);
        setScans({ busy: false, message: r.message, ok: false });
      }
    });
  };

  return (
    <Screen scroll>
      <AppHeader title="Privacy &amp; your data" onBack={() => router.back()} />

      <View style={{ marginBottom: theme.spacing.lg }}>
        <PrivacyTrustCard headline="Your photo is never kept">
          <Text variant="body" tone="secondary">
            {CANONICAL_DELETION_PROMISE} We keep only the engraved line diagram and your reading — never the photo itself, and never anything used to identify you.
          </Text>
        </PrivacyTrustCard>
      </View>

      <SettingGroup title="Your scan photos">
        <SettingRow
          first
          leadingIcon="camera"
          label="Keep my scan photo"
          right={<Switch value={keepPhoto} onValueChange={onKeepPhoto} accessibilityLabel="Keep my scan photo" trackColor={{ true: theme.colors.accent, false: theme.colors.trackOff }} thumbColor={theme.colors.surface} activeThumbColor={theme.colors.surface} />}
        />
      </SettingGroup>
      <Text variant="caption" tone="secondary" style={{ marginHorizontal: theme.spacing.xs, marginBottom: theme.spacing.lg }}>
        Off by default — {CANONICAL_DELETION_PROMISE} Turn on to keep it for re-reading.
      </Text>

      <View style={{ marginBottom: theme.spacing.xl, gap: theme.spacing.sm }}>
        <Button label={scans.busy ? 'Deleting…' : 'Delete my scan photos now'} variant="secondary" loading={scans.busy} onPress={deleteScans} />
        {/* Tone follows the result's own `ok` flag — it used to sniff the message for a check glyph. */}
        {scans.message ? (
          <Text variant="caption" tone={scans.ok ? 'success' : 'secondary'} style={{ textAlign: 'center' }}>
            {scans.message}
          </Text>
        ) : null}
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
              <Button label="Delete everything" variant="danger" loading={accountBusy} onPress={deleteAccount} />
              <Button label="Cancel" variant="ghost" disabled={accountBusy} onPress={() => setConfirmDelete(false)} />
            </View>
          </Card>
        </Animated.View>
      ) : null}
    </Screen>
  );
}
