import { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { CaptureView, type CaptureState } from '@/features/capture/CaptureView';
import { useScanUpload } from '@/features/capture/useScanUpload';
import { Text } from '@/components/ui';
import { useTheme } from '@/theme';

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
  const { pickAndUpload, error } = useScanUpload({ kind: 'palm', hand: handSide });

  const onShutter = () => {
    // Auto-capture choreography (§2.3): shutter → freeze-frame → review ("Retake / Use photo").
    setState('captured');
    setTimeout(() => setState('review'), 500);
  };

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
