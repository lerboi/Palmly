import { PairWaiting } from '@/features/reading/PairRevealView';

/**
 * /dev preview — the pair waiting state PAST the nudge threshold (Audit-4 SH-15): it used to say
 * "Weaving your red thread…" forever, with no timeout and no action. Not shipped in production.
 */
export default function PairWaitingPreview() {
  return <PairWaiting partnerName="Mira" elapsedMs={60_000} onBack={() => {}} onNudge={() => {}} />;
}
