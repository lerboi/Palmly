import { PairRevealView } from '@/features/reading/PairRevealView';
import { ABSTRACT_GEOMETRY } from '@/features/reading/reveal';
import { PREVIEW_PAIR_PARTIAL } from '@/features/dev/fixtures';

/**
 * /dev preview — a pair whose narrative only half-generated (Audit-4 CO-16): the second block must
 * render NOTHING rather than a heading over empty space. Not shipped in production builds.
 */
export default function PairPartialPreview() {
  return <PairRevealView data={PREVIEW_PAIR_PARTIAL} geometry={ABSTRACT_GEOMETRY} pairId="dev-pair-partial" onBack={() => {}} />;
}
