import { Linking, View } from 'react-native';

import { Button, Icon, Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme';

export interface CameraDeniedViewProps {
  /** The always-available fallback — the device-free library path (F0.T2) that also recovers denial. */
  onUploadInstead: () => void;
  /** Soft-denial variant (the OS can still re-prompt): the primary CTA re-requests the permission
   *  instead of deep-linking to Settings. Omit for the hard-denied ("never ask again") state. */
  onRequestAgain?: () => void;
  onBack?: () => void;
}

/**
 * Camera-permission DENIED recovery (audit F1.3, UIUX §2.2). When the OS camera permission is off,
 * we never dead-end: a warm, blame-free explanation, a path back to the camera (re-ask while the OS
 * still allows it, else a deep-link into system Settings), and the upload-a-photo fallback (the same
 * library path that feeds the live pipeline). Previewable at `/dev/permission-denied`.
 */
export function CameraDeniedView({ onUploadInstead, onRequestAgain, onBack }: CameraDeniedViewProps) {
  const theme = useTheme();
  return (
    <Screen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: 44,
            backgroundColor: theme.colors.surfaceSunken,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="camera" size={44} color={theme.colors.textSecondary} decorative />
        </View>
        <Text variant="title" style={{ textAlign: 'center', marginTop: theme.spacing.lg }}>
          Camera access is off
        </Text>
        <Text variant="body" tone="secondary" style={{ textAlign: 'center', marginTop: theme.spacing.sm, maxWidth: 300 }}>
          {onRequestAgain
            ? 'Palmly needs the camera to see your palm — or just upload a photo instead. Either way, your photo is analyzed, then deleted.'
            : 'Turn on the camera for Palmly in Settings — or just upload a photo instead. Either way, your photo is analyzed, then deleted.'}
        </Text>
      </View>

      <View style={{ gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
        {onRequestAgain ? (
          <Button label="Allow camera" variant="primary" fullWidth onPress={onRequestAgain} />
        ) : (
          <Button label="Open Settings" variant="primary" fullWidth onPress={() => void Linking.openSettings()} />
        )}
        <Button label="Upload a photo instead" variant="secondary" fullWidth onPress={onUploadInstead} />
        {onBack ? <Button label="Back" variant="ghost" fullWidth onPress={onBack} /> : null}
      </View>
    </Screen>
  );
}
