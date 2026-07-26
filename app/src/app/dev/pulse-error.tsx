import { View } from 'react-native';
import { Screen } from '@/components/ui';
import { PulseCardError, PulseCardSkeleton } from '@/features/pulse/PulseCard';

/** /dev preview — Today's Line S0 (skeleton) and S5 (honest error), side by side. */
export default function PulseErrorPreview() {
  return (
    <Screen scroll>
      <View>
        <PulseCardSkeleton />
        <PulseCardError onRetry={() => {}} />
      </View>
    </Screen>
  );
}
