import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { router, type Href } from 'expo-router';
import { CaptureView } from '@/features/capture/CaptureView';
import { useScanUpload } from '@/features/capture/useScanUpload';
import { Text } from '@/components/ui';
import { useTheme } from '@/theme';
import { track } from '@/lib/analytics';

/**
 * Capture C — face-reading variant (UIUX §2.3, redesign R13, audit A5). Oval guide + alignment
 * prompts. Live camera + Euler-angle prompts are device-only ([~]); the shutter routes through the
 * SAME upload chain palm/primer use ({@link useScanUpload}, kind='face') — device-free there is no
 * captured frame, so the shutter opens the library and lands on `/analyzing?scanId=…`.
 *
 * Reached live from the reveal's "read your face" offer (RevealView → `/face`); it used to push
 * `/analyzing` with NO scanId (the same infinite-loader dead-end as A5's palm.tsx:30 — an audit
 * erratum: A5 cited only palm, but this face path is the same live-reachable bug).
 */
export default function FaceCapture() {
  const theme = useTheme();
  const { pickAndUpload, error, hasCompleted } = useScanUpload({ kind: 'face' });
  // Capture-funnel abandonment (A7): leaving face capture without completing is a drop-off. Init the
  // timestamp in the effect (Date.now() is impure — never at render).
  const mountedAt = useRef(0);
  useEffect(() => {
    mountedAt.current = Date.now();
    return () => {
      if (!hasCompleted()) {
        track('capture_abandoned', { kind: 'face', last_state: 'searching', duration_ms: Date.now() - mountedAt.current });
      }
    };
  }, [hasCompleted]);
  return (
    <View style={{ flex: 1 }}>
      <CaptureView
        mode="face"
        state="searching"
        onShutter={pickAndUpload}
        onHelp={() => router.push('/capture-help' as Href)}
      />
      {error ? (
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
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
