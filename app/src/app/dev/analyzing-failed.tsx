import { AnalyzingView } from '@/features/reading/AnalyzingView';
import { ABSTRACT_GEOMETRY } from '@/features/reading/reveal';

/**
 * /dev preview — the Analyzing loader's failed/retry state (redesign R14). The real route drives
 * `status` from `useScanStatus`; this stand-in renders the terminal failure so it is
 * screenshot-verifiable device-free. Not shipped in production builds.
 */
export default function AnalyzingFailedPreview() {
  return (
    <AnalyzingView
      geometry={ABSTRACT_GEOMETRY}
      status="failed"
      elapsedMs={0}
      failureReason="not_a_hand"
    />
  );
}
