import { View } from 'react-native';
import { Screen } from '@/components/ui';
import { PulseCard } from '@/features/pulse/PulseCard';
import { ABSTRACT_GEOMETRY } from '@/features/reading/reveal';
import { PREVIEW_CHAPTER, PREVIEW_FORTUNE, PREVIEW_PULSE, PREVIEW_PULSE_FEATURE } from '@/features/dev/fixtures';

/** /dev preview — the merged daily card, S3 revealed/free: the day's line, the personal line
 *  beneath it, the chapter chip, and ONE lock line covering both halves (RF6.T2). */
export default function PulseFreePreview() {
  return (
    <Screen scroll>
      <View>
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
      </View>
    </Screen>
  );
}
