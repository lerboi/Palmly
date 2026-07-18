import { useState } from 'react';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { CaptureView } from '@/features/capture/CaptureView';

/**
 * Capture C — guided palm capture (UIUX §2.3, redesign R13). Shown in the "ready → hold still"
 * state (the signature auto-capture moment). The live camera + landmark state machine are
 * device-only ([~]); the shutter advances to analyzing for the flow walk-through.
 *
 * The toggle honours the A3 hand answer threaded in as `?hand=…` (a left-handed user is shown a
 * left-hand capture, not the old hardcoded right) — so the promised hand is the one on screen.
 */
export default function PalmCapture() {
  const params = useLocalSearchParams<{ hand?: string }>();
  const [handSide, setHandSide] = useState<'left' | 'right'>(params.hand === 'left' ? 'left' : 'right');
  return (
    <CaptureView
      mode="palm"
      state="ready"
      instruction="Hold still…"
      handSide={handSide}
      onSwitchHand={() => setHandSide((h) => (h === 'right' ? 'left' : 'right'))}
      onShutter={() => router.push('/analyzing' as Href)}
    />
  );
}
