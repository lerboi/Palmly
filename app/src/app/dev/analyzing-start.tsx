import { AnalyzingView } from '@/features/reading/AnalyzingView';
import { PREVIEW_GEOMETRY } from '@/features/reading/reveal';

/**
 * /dev preview — the Analyzing loader at **0 elapsed**: the first stage, the ring at its opening
 * fraction, and the abstract (non-possessive) copy a first-time scan gets (Audit-4 SH-7, CO-13).
 * Not shipped in production builds.
 */
export default function AnalyzingStartPreview() {
  return <AnalyzingView geometry={PREVIEW_GEOMETRY} status="extracting" elapsedMs={0} />;
}
