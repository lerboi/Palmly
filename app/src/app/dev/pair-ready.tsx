import { PairRevealView } from '@/features/reading/PairRevealView';
import { PREVIEW_GEOMETRY } from '@/features/reading/reveal';
import { PREVIEW_PAIR } from './fixtures';

/**
 * /dev preview — the compatibility pair reveal, device-free at last (Audit-4 U5.T3 / D24). The real
 * route needs a live `pairId` + session, which is why this screen went unverified through three
 * ledgers. Not shipped in production builds.
 */
export default function PairReadyPreview() {
  return (
    <PairRevealView
      data={PREVIEW_PAIR}
      geometry={PREVIEW_GEOMETRY}
      pairId="dev-pair"
      onBack={() => {}}
      onDone={() => {}}
      onShare={() => {}}
      onFullReading={() => {}}
    />
  );
}
