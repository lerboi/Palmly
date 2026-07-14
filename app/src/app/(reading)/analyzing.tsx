import { AnalyzingView } from '@/features/reading/AnalyzingView';
import { PREVIEW_GEOMETRY } from '@/features/reading/reveal';

/**
 * Analyzing loader (UIUX §2.4, P6.T1). Renders {@link AnalyzingView}. Seeded with a mid-pipeline
 * preview state so the screen is buildable + device-free-verifiable (web screenshot); the real
 * route drives `status` from `useScanStatus(scanId)` and `elapsedMs` from a mount timer, and
 * navigates to the reveal on `complete`.
 */
export default function Analyzing() {
  return <AnalyzingView geometry={PREVIEW_GEOMETRY} status="extracting" elapsedMs={7200} />;
}
