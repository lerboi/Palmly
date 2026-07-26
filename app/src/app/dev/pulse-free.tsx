import { View } from 'react-native';
import { Screen } from '@/components/ui';
import { PulseCard } from '@/features/pulse/PulseCard';
import { ABSTRACT_GEOMETRY } from '@/features/reading/reveal';
import { PREVIEW_CHAPTER, PREVIEW_PULSE, PREVIEW_PULSE_FEATURE } from '@/features/dev/fixtures';

/** /dev preview — Today's Line, S3 revealed/free: essence + chapter chip + ONE lock line. */
export default function PulseFreePreview() {
  return (
    <Screen scroll>
      <View>
        <PulseCard
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
