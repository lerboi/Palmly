import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { CaptureView, type CaptureState } from '@/features/capture/CaptureView';
import { useScanUpload } from '@/features/capture/useScanUpload';
import { Text } from '@/components/ui';
import { useTheme } from '@/theme';
import { track } from '@/lib/analytics';

/**
 * Capture C — guided palm capture (UIUX §2.3, audit F1.4 / A5). The live camera + landmark state
 * machine are device-only ([~]) so the stand-in sits at `ready`; the manual shutter exercises the real
 * capture → freeze → review choreography device-free. Help opens the do/don't sheet.
 *
 * "Use photo" (review confirm) routes through the SAME upload chain the primer's picker uses
 * ({@link useScanUpload}) — device-free there is no captured frame, so confirm opens the library and
 * lands on `/analyzing?scanId=…`. This closes A5: the confirm used to push `/analyzing` with NO scanId
 * (an infinite loader). The toggle honours the A3 hand answer threaded in as `?hand=…`.
 */
export default function PalmCapture() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ hand?: string }>();
  const [handSide, setHandSide] = useState<'left' | 'right'>(params.hand === 'left' ? 'left' : 'right');
  const [state, setState] = useState<CaptureState>('ready');
  const { pickAndUpload, error, hasCompleted } = useScanUpload({ kind: 'palm', hand: handSide });

  const onShutter = () => {
    // Auto-capture choreography (§2.3): shutter → freeze-frame → review ("Retake / Use photo").
    setState('captured');
    setTimeout(() => setState('review'), 500);
  };

  // Capture-funnel timing (A7). Dwell: emit the ms spent in each state as it changes. Abandoned:
  // emit on unmount UNLESS a capture completed (completedRef) — so leaving without a reading is
  // measured, but a finished capture is not miscounted as a drop-off. Timestamps init in the mount
  // effect (Date.now() is impure — never at render) and refs are only written inside effects.
  const enteredAt = useRef(0);
  const prevState = useRef<CaptureState>('ready');
  const stateRef = useRef<CaptureState>('ready');
  const mountedAt = useRef(0);
  useEffect(() => {
    const now = Date.now();
    enteredAt.current = now;
    mountedAt.current = now;
    return () => {
      if (!hasCompleted()) {
        track('capture_abandoned', { kind: 'palm', last_state: stateRef.current, duration_ms: Date.now() - mountedAt.current });
      }
    };
  }, [hasCompleted]);
  useEffect(() => {
    stateRef.current = state;
    if (state === prevState.current) return;
    track('capture_state_dwell', { kind: 'palm', state: prevState.current, ms: Date.now() - enteredAt.current });
    prevState.current = state;
    enteredAt.current = Date.now();
  }, [state]);

  return (
    <View style={{ flex: 1 }}>
      <CaptureView
        mode="palm"
        state={state}
        handSide={handSide}
        onSwitchHand={() => setHandSide((h) => (h === 'right' ? 'left' : 'right'))}
        onShutter={onShutter}
        onHelp={() => router.push('/capture-help' as Href)}
        onConfirm={pickAndUpload}
        onRetake={() => setState('ready')}
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
