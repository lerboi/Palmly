import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { CaptureView } from '@/features/capture/CaptureView';
import { CameraDeniedView } from '@/features/capture/CameraDeniedView';
import { REVIEW_AUTO_ADVANCE_MS } from '@/features/capture/guidedCapture';
import { useGuidedFaceCapture } from '@/features/capture/useGuidedFaceCapture';
import { Text } from '@/components/ui';
import { useTheme } from '@/theme';

/**
 * Capture C — face-reading variant (UIUX §2.3/§2.5, P4.T5: "the same B→E loop with face
 * capture" — oval guide + Euler-angle prompts). The platform-split {@link useGuidedFaceCapture}
 * engine owns everything: VisionCamera (front) + the ML Kit face-detector CameraOutput drive the
 * §2.3 state machine (searching/center → distance → yaw-pitch tilt → ready go-signal, 3-frame
 * anti-flicker vote, NO auto-capture per the 2026-07-24 user decision), shutter → pinned
 * fixed-region canonical crop → review (auto-advance when high-quality) → upload (kind='face').
 * No torch (front camera) and no hand toggle (CaptureView keeps the shutter centred). Denied →
 * the warm recovery view; web → the device-free stand-in (confirm falls back to the library
 * pick — audit A5).
 */
export default function FaceCapture() {
  const theme = useTheme();
  const {
    gate,
    state,
    feed,
    capturedUri,
    onShutter,
    onRetake,
    onConfirm,
    autoAdvancing,
    uploading,
    displayError,
    retryPermission,
    pickAndUpload,
  } = useGuidedFaceCapture();

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

  // Live feed + frozen review frame; the preview stays MOUNTED under the frozen frame so Retake
  // resumes instantly instead of re-initializing the camera session (same as palm).
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
        mode="face"
        state={state}
        feed={fullFeed}
        confirmLoading={uploading}
        autoAdvance={autoAdvancing ? { durationMs: REVIEW_AUTO_ADVANCE_MS } : null}
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
