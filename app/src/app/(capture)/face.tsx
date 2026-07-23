import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { CameraView } from 'expo-camera';
import { Image } from 'expo-image';
import { CaptureView } from '@/features/capture/CaptureView';
import { CameraDeniedView } from '@/features/capture/CameraDeniedView';
import { useLiveCapture } from '@/features/capture/useLiveCapture';
import { Text } from '@/components/ui';
import { useTheme } from '@/theme';

/**
 * Capture C — face-reading variant (UIUX §2.3/§2.5: "the same B→E loop with face capture"), on the
 * same {@link useLiveCapture} engine as palm: a FRONT-facing preview under the oval guide, real
 * searching→ready, shutter → freeze → review → upload (kind='face'), the same denied recovery.
 * No torch (front camera) and no hand toggle (CaptureView keeps the shutter centred with a spacer).
 * Euler-angle alignment prompts + blink-to-capture remain the landmark phase ([~], Phase 2). Web
 * keeps the device-free stand-in; confirm falls back to the library pick (audit A5 — reached live
 * from the reveal's "read your face" offer, never an id-less /analyzing push).
 */
export default function FaceCapture() {
  const theme = useTheme();
  // Destructured (not kept as one object) so the ref stays its own binding — the React Compiler
  // otherwise treats every member read on the returned object as a render-time ref access.
  const {
    gate,
    state,
    capturedUri,
    cameraRef,
    onCameraReady,
    onMountError,
    onShutter,
    onRetake,
    onConfirm,
    uploading,
    displayError,
    retryPermission,
    pickAndUpload,
  } = useLiveCapture({ kind: 'face' });

  if (gate === 'blocked') {
    return <CameraDeniedView onUploadInstead={pickAndUpload} onBack={() => router.back()} />;
  }
  if (gate === 'ask_again') {
    return (
      <CameraDeniedView
        onRequestAgain={() => void retryPermission()}
        onUploadInstead={pickAndUpload}
        onBack={() => router.back()}
      />
    );
  }

  const feed =
    gate === 'live' ? (
      <>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="front"
          autofocus="on"
          onCameraReady={onCameraReady}
          onMountError={onMountError}
        />
        {capturedUri ? (
          <Image source={{ uri: capturedUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : null}
      </>
    ) : undefined;

  return (
    <View style={{ flex: 1 }}>
      <CaptureView
        mode="face"
        state={state}
        feed={feed}
        confirmLoading={uploading}
        onShutter={() => void onShutter()}
        onHelp={() => router.push('/capture-help')}
        onConfirm={onConfirm}
        onRetake={onRetake}
      />
      {displayError ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 100, alignItems: 'center', paddingHorizontal: theme.spacing.xl }}>
          <Text
            variant="caption"
            color={theme.colors.onAccent}
            style={{
              backgroundColor: theme.colors.danger,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.xs,
              borderRadius: theme.radii.pill,
              textAlign: 'center',
              overflow: 'hidden',
            }}
          >
            {displayError}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
