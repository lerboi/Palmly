import { AnalyzingView } from '@/features/reading/AnalyzingView';
import { ABSTRACT_GEOMETRY } from '@/features/reading/reveal';

/**
 * /dev preview — the Analyzing loader past the 75s overrun threshold: the notify-me escape hatch
 * plus the connection caption. The audit measured this state overflowing a 4.7" screen (CO-13),
 * so it is shot at 320×568 too. Not shipped in production builds.
 */
export default function AnalyzingOverrunPreview() {
  return (
    <AnalyzingView
      geometry={ABSTRACT_GEOMETRY}
      status="extracting"
      elapsedMs={80_000}
      connectionError="offline"
      onBack={() => {}}
      onHome={() => {}}
    />
  );
}
