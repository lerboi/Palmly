import { FortuneHome } from '@/features/fortune/FortuneHome';
import { PulseCard } from '@/features/pulse/PulseCard';
import { ABSTRACT_GEOMETRY } from '@/features/reading/reveal';
import { PREVIEW_CHAPTER, PREVIEW_FORTUNE, PREVIEW_PULSE, PREVIEW_PULSE_FEATURE } from '@/features/dev/fixtures';

/** The pinned week these fixtures describe: a live four-day run ending "today". */
const NOW = new Date(2026, 6, 28, 12).getTime();
const RUN = ['2026-07-25', '2026-07-26', '2026-07-27', '2026-07-28'];

/**
 * /dev preview — the real Today, sealed with the palm (RF6.T2 + T3).
 *
 * The first fixture to show the whole screen as it actually ships: the week strip with its measured
 * line, and the merged daily card as the ONE hero beneath it. Before this route the strip's streak
 * line was unreachable device-free — every fortune fixture carried a stale week whose run had
 * already broken, so the line never rendered at all.
 *
 * This is the EARNED variant: the run contains a real camera seal, so the claim is measured and the
 * strip wears the chop rather than the flame.
 */
export default function TodaySealedPreview() {
  return (
    <FortuneHome
      fortune={PREVIEW_FORTUNE}
      premium={false}
      now={NOW}
      openedDates={RUN}
      streak={RUN.length}
      sealedWithPalm={['2026-07-27']}
      pulseSlot={
        <PulseCard
          fortune={PREVIEW_FORTUNE}
          featureKey={PREVIEW_PULSE_FEATURE}
          pulse={PREVIEW_PULSE}
          geometry={ABSTRACT_GEOMETRY}
          chapter={PREVIEW_CHAPTER}
          premium={false}
          revealed
          onReveal={() => {}}
          onUnlock={() => {}}
          onOpenChapter={() => {}}
        />
      }
    />
  );
}
