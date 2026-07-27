import { View } from 'react-native';
import { Screen } from '@/components/ui';
import { PulseCard, PulseCardSkeleton } from '@/features/pulse/PulseCard';
import { ABSTRACT_GEOMETRY } from '@/features/reading/reveal';
import { PREVIEW_FORTUNE } from '@/features/dev/fixtures';

/**
 * /dev preview — the two DEGRADED states of the daily card: S0 (skeleton) and the almanac-only day.
 *
 * The second one is the RF6.T2 path that replaced 02 §4's S5: the night's personal template is
 * missing, so the card renders the day alone rather than claiming the whole day is broken. There is
 * no third card here on purpose — the almanac's own failure is `FortuneHome`'s error state, shot at
 * `/dev/fortune-error`, and duplicating it would be a fixture for a state this card cannot reach.
 */
export default function PulseErrorPreview() {
  return (
    <Screen scroll>
      <View>
        <PulseCardSkeleton />
        <PulseCard
          fortune={PREVIEW_FORTUNE}
          featureKey={null}
          pulse={null}
          geometry={ABSTRACT_GEOMETRY}
          premium={false}
          revealed
          onReveal={() => {}}
          onUnlock={() => {}}
        />
      </View>
    </Screen>
  );
}
