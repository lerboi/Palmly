import { LandmarksBench } from '@/features/dev/LandmarksBench';

/**
 * /dev/landmarks — the P2 native-spike bench. The body lives in a platform-split component
 * (`features/dev/LandmarksBench[.native]`) so the camera/nitro imports never evaluate in the
 * static web export (they initialize native objects at import time).
 */
export default function DevLandmarks() {
  return <LandmarksBench />;
}
