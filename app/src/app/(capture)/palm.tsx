import { useState } from 'react';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { CaptureView, type CaptureState } from '@/features/capture/CaptureView';

/**
 * Capture C — guided palm capture (UIUX §2.3, audit F1.4). The live camera + landmark state machine
 * are device-only ([~]) so the stand-in sits at `ready`; the manual shutter exercises the real
 * capture → freeze → review → analyzing choreography device-free. Help opens the do/don't sheet
 * (the "?" is no longer a dead tap). The toggle honours the A3 hand answer threaded in as `?hand=…`.
 */
export default function PalmCapture() {
  const params = useLocalSearchParams<{ hand?: string }>();
  const [handSide, setHandSide] = useState<'left' | 'right'>(params.hand === 'left' ? 'left' : 'right');
  const [state, setState] = useState<CaptureState>('ready');

  const onShutter = () => {
    // Auto-capture choreography (§2.3): shutter → freeze-frame → review ("Looks sharp / Retake").
    setState('captured');
    setTimeout(() => setState('review'), 500);
  };

  return (
    <CaptureView
      mode="palm"
      state={state}
      handSide={handSide}
      onSwitchHand={() => setHandSide((h) => (h === 'right' ? 'left' : 'right'))}
      onShutter={onShutter}
      onHelp={() => router.push('/capture-help' as Href)}
      onConfirm={() => router.push('/analyzing' as Href)}
      onRetake={() => setState('ready')}
    />
  );
}
