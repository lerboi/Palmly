import { View } from 'react-native';
import { Screen } from '@/components/ui';
import { PulseCard } from '@/features/pulse/PulseCard';
import { ABSTRACT_GEOMETRY } from '@/features/reading/reveal';
import { PREVIEW_FORTUNE, PREVIEW_PULSE, PREVIEW_PULSE_FEATURE } from '@/features/dev/fixtures';

/** /dev preview — the merged daily card, S1 unrevealed (RF6.T2). The almanac's line is already on
 *  screen: it was never gated and must not start being. What is held back is the reading THROUGH
 *  the reader's own feature. Not shipped in production. */
export default function PulseUnrevealedPreview() {
  return (
    <Screen scroll>
      <View>
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
      </View>
    </Screen>
  );
}
