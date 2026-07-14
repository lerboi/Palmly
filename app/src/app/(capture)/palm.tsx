import { useState } from 'react';
import { router, type Href } from 'expo-router';
import { CaptureView } from '@/features/capture/CaptureView';

/**
 * Capture C — guided palm capture (UIUX §2.3, redesign R13). Shown in the "ready → hold still"
 * state (the signature auto-capture moment). The live camera + landmark state machine are
 * device-only ([~]); the shutter advances to analyzing for the flow walk-through.
 */
export default function PalmCapture() {
  const [handSide, setHandSide] = useState<'left' | 'right'>('right');
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
