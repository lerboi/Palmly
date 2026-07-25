import { FortuneHome } from '@/features/fortune/FortuneHome';
import { PREVIEW_FORTUNE } from './fixtures';

/**
 * /dev preview — Today with the PREMIUM almanac card unfolded. Added in U3.T1: the premium card
 * had no dev route at all (ledger D16), so its Do/Avoid rows and Lucky row could not be seen
 * device-free even though they are the audit's CO-6 overflow case. Not shipped in production.
 */
export default function FortunePremiumPreview() {
  return <FortuneHome fortune={PREVIEW_FORTUNE} premium openedDates={['2026-07-24', '2026-07-25']} />;
}
