import { AnalyzingView } from '@/features/reading/AnalyzingView';
import { PREVIEW_GEOMETRY } from '@/features/reading/reveal';

/**
 * /dev preview — the Analyzing loader mid-pipeline (20s in), where the old ring parked at 75% and
 * the new one is creeping (Audit-4 CO-13). `ownGeometry` is on, so this also shows the possessive
 * copy a RESCAN earns. Not shipped in production builds.
 */
/** A 1px placeholder for the captured crop — enough to prove the photo sits ON the ring's axis
 *  (CO-13 measured the real one 28px above it) without shipping a fixture photo. */
const PLACEHOLDER_CROP =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

export default function AnalyzingMidPreview() {
  return (
    <AnalyzingView
      geometry={PREVIEW_GEOMETRY}
      status="extracting"
      elapsedMs={20_000}
      capturedImageUri={PLACEHOLDER_CROP}
      ownGeometry
    />
  );
}
