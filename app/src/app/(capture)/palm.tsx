import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { CaptureView } from '@/features/capture/CaptureView';
import { CameraDeniedView } from '@/features/capture/CameraDeniedView';
import { useGuidedCapture } from '@/features/capture/useGuidedCapture';
import { Text } from '@/components/ui';
import { useTheme } from '@/theme';

/**
 * Capture C — guided palm capture (UIUX §2.3, Phase 2: the landmark-guided flow, P4.T2). The
 * platform-split {@link useGuidedCapture} engine owns everything: VisionCamera + the
 * palm-landmarks CameraOutput drive the §2.3 state machine (one instruction at a time, 3-frame
 * anti-flicker vote), `ready` held 800ms fires auto-capture, the manual shutter stays as the
 * fallback, and the engine returns the live `feed` element + screen-space landmarks so this
 * screen imports no camera modules (web-export safety). Denied → the warm recovery view; web →
 * the device-free stand-in (confirm falls back to the library pick — audit A5).
 */
export default function PalmCapture() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ hand?: string }>();
  const [handSide, setHandSide] = useState<'left' | 'right'>(params.hand === 'left' ? 'left' : 'right');
  const {
    gate,
    state,
    feed,
    capturedUri,
    landmarks,
    torchOn,
    toggleTorch,
    onShutter,
    onRetake,
    onConfirm,
    uploading,
    displayError,
    retryPermission,
    pickAndUpload,
  } = useGuidedCapture({ kind: 'palm', hand: handSide });

  if (gate === 'blocked') {
    return <CameraDeniedView onUploadInstead={() => void pickAndUpload()} onBack={() => router.back()} />;
  }
  if (gate === 'ask_again') {
    return (
      <CameraDeniedView
        onRequestAgain={() => void retryPermission()}
        onUploadInstead={() => void pickAndUpload()}
        onBack={() => router.back()}
      />
    );
  }

  // Live feed + frozen review frame. The preview stays MOUNTED under the frozen frame so Retake
  // resumes instantly instead of re-initializing the camera session.
  const fullFeed = feed ? (
    <>
      {feed}
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
        feed={fullFeed}
        landmarks={capturedUri ? undefined : landmarks}
        torch={gate === 'live' && !capturedUri ? { on: torchOn, onToggle: toggleTorch } : undefined}
        confirmLoading={uploading}
        onSwitchHand={() => setHandSide((h) => (h === 'right' ? 'left' : 'right'))}
        onShutter={onShutter}
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
