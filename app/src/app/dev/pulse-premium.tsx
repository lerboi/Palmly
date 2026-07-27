import { View } from 'react-native';
import { Screen } from '@/components/ui';
import { PulseCard } from '@/features/pulse/PulseCard';
import { ABSTRACT_GEOMETRY } from '@/features/reading/reveal';
import { PREVIEW_CHAPTER, PREVIEW_FORTUNE, PREVIEW_PULSE, PREVIEW_PULSE_FEATURE } from '@/features/dev/fixtures';

/** /dev preview — the merged daily card, S4 revealed/premium: ONE column, personal reading first,
 *  then the almanac's do/avoid and lucky trio, then the chat bridge. Zero lock UI (RF6.T2). */
export default function PulsePremiumPreview() {
  return (
    <Screen scroll>
      <View>
        <PulseCard
          fortune={PREVIEW_FORTUNE}
          featureKey={PREVIEW_PULSE_FEATURE}
          pulse={PREVIEW_PULSE}
          geometry={ABSTRACT_GEOMETRY}
          chapter={PREVIEW_CHAPTER}
          premium
          revealed
          onReveal={() => {}}
          onOpenChapter={() => {}}
          onAsk={() => {}}
        />
      </View>
    </Screen>
  );
}
