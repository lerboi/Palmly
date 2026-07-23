import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CameraView } from 'expo-camera';
import { Image } from 'expo-image';
import { CaptureView } from '@/features/capture/CaptureView';
import { CameraDeniedView } from '@/features/capture/CameraDeniedView';
import { useLiveCapture } from '@/features/capture/useLiveCapture';
import { Text } from '@/components/ui';
import { useTheme } from '@/theme';

/**
 * Capture C — guided palm capture (UIUX §2.3, Phase 1 live camera). All capture logic lives in the
 * shared {@link useLiveCapture} engine (permission lifecycle, real searching→ready off
 * `onCameraReady`, shutter → freeze → review → upload, haptics, funnel analytics); this screen
 * renders it: a back-facing `CameraView` (autofocus on — the SDK default is OFF, which softens
 * close-up creases) under the framing guide, the frozen frame during review, the torch toggle, and
 * the A3 hand answer (`?hand=…`) driving the guide mirror + upload metadata. Denied → the warm
 * recovery view (re-ask while the OS allows it, else Settings), never a dead end. Web keeps the
 * device-free stand-in (audit A5: confirm falls back to the library pick — no id-less /analyzing).
 */
export default function PalmCapture() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ hand?: string }>();
  const [handSide, setHandSide] = useState<'left' | 'right'>(params.hand === 'left' ? 'left' : 'right');
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
    torchOn,
    toggleTorch,
    uploading,
    displayError,
    retryPermission,
    pickAndUpload,
  } = useLiveCapture({ kind: 'palm', hand: handSide });

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

  // Live feed + frozen review frame. The preview stays MOUNTED under the frozen frame (paused by
  // the engine) so Retake resumes instantly instead of re-initializing the camera.
  const feed =
    gate === 'live' ? (
      <>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          autofocus="on"
          enableTorch={torchOn}
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
        mode="palm"
        state={state}
        handSide={handSide}
        feed={feed}
        torch={gate === 'live' && !capturedUri ? { on: torchOn, onToggle: toggleTorch } : undefined}
        confirmLoading={uploading}
        onSwitchHand={() => setHandSide((h) => (h === 'right' ? 'left' : 'right'))}
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
