import { FortuneHome } from '@/features/fortune/FortuneHome';
import { PulseCard } from '@/features/pulse/PulseCard';
import { ABSTRACT_GEOMETRY } from '@/features/reading/reveal';
import { PREVIEW_FORTUNE, PREVIEW_PULSE, PREVIEW_PULSE_FEATURE } from '@/features/dev/fixtures';

const NOW = new Date(2026, 6, 28, 12).getTime();
const RUN = ['2026-07-25', '2026-07-26', '2026-07-27', '2026-07-28'];

/**
 * /dev preview — the same Today, tap-sealed and not yet revealed (RF6.T3).
 *
 * Two things to read here against `/dev/today-sealed`:
 *
 * 1. **The line is present before the reveal.** It sits in the week strip, above and independent of
 *    the card, so it does not wait on a gesture — that is the whole of "promote the seal to the
 *    screen's backbone".
 * 2. **The claim is weaker, because it was not earned.** Nobody held a palm to the camera in this
 *    run, so nothing about the hand was measured, so the line says "Day 4" and stops. Saying "your
 *    lines hold" here would be a measurement claim about an act that never happened.
 */
export default function TodayTappedPreview() {
  return (
    <FortuneHome
      fortune={PREVIEW_FORTUNE}
      premium={false}
      now={NOW}
      openedDates={RUN}
      streak={RUN.length}
      sealedWithPalm={[]}
      pulseSlot={
        <PulseCard
          fortune={PREVIEW_FORTUNE}
          featureKey={PREVIEW_PULSE_FEATURE}
          pulse={PREVIEW_PULSE}
          geometry={ABSTRACT_GEOMETRY}
          premium={false}
          revealed={false}
          onReveal={() => {}}
          onSealWithPalm={() => {}}
        />
      }
    />
  );
}
