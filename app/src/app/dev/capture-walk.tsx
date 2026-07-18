import { useEffect, useState } from 'react';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { CaptureView, type CaptureState } from '@/features/capture/CaptureView';

/**
 * Dev rehearsal of the full §2.3 capture state machine (audit F1.4). With no param it auto-steps
 * through every state on a timer (the choreography walk); `?state=<state>` renders one state
 * statically for deterministic screenshots. The live landmark/exposure signals are device-only.
 */
const WALK: CaptureState[] = ['searching', 'too_far', 'too_close', 'not_flat', 'tilted', 'dark', 'ready', 'captured', 'review'];

export default function DevCaptureWalk() {
  const { state: param } = useLocalSearchParams<{ state?: string }>();
  const fixed = (WALK as string[]).includes(param ?? '') ? (param as CaptureState) : null;
  const [i, setI] = useState(0);

  useEffect(() => {
    if (fixed) return; // static single-state render (screenshots)
    const id = setInterval(() => setI((x) => (x + 1) % WALK.length), 1400);
    return () => clearInterval(id);
  }, [fixed]);

  return (
    <CaptureView
      mode="palm"
      state={fixed ?? WALK[i]}
      handSide="right"
      onShutter={() => setI(WALK.indexOf('captured'))}
      onHelp={() => router.push('/capture-help' as Href)}
      onConfirm={() => router.back()}
      onRetake={() => setI(0)}
    />
  );
}
