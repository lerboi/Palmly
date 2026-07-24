import { CanonicalBench } from '@/features/dev/CanonicalBench';

/**
 * /dev/canonical — the P4.T3 canonicalization bench: pick a palm photo → run the pinned cv1
 * crop/warp twice → byte-compare the outputs (the determinism proof) and eyeball the warp
 * (wrist bottom-center, palm axis vertical). Platform-split like the landmarks bench so the
 * nitro import never evaluates in the static web export.
 */
export default function DevCanonical() {
  return <CanonicalBench />;
}
