import { View } from 'react-native';
import { Screen } from '@/components/ui';
import { PulseCard } from '@/features/pulse/PulseCard';
import { ABSTRACT_GEOMETRY } from '@/features/reading/reveal';
import { PREVIEW_PULSE, PREVIEW_PULSE_FEATURE } from '@/features/dev/fixtures';

/** /dev preview — Today's Line, S1 unrevealed (Audit-5 02 §4). Not shipped in production. */
export default function PulseUnrevealedPreview() {
  return (
    <Screen scroll>
      <View>
        <PulseCard
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
