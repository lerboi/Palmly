import { useState } from 'react';
import { View } from 'react-native';
import { Button, Screen } from '@/components/ui';
import { MilestoneMoment } from '@/features/pulse/MilestoneMoment';
import type { StreakMilestone } from '@/features/pulse/streak';

/** /dev preview — the milestone moment at each threshold, free and premium. */
export default function MilestonePreview() {
  const [day, setDay] = useState<StreakMilestone | null>(7);
  const [premium, setPremium] = useState(false);
  return (
    <Screen scroll>
      <View style={{ gap: 12 }}>
        {([3, 7, 14, 30] as StreakMilestone[]).map((d) => (
          <Button key={d} label={`Day ${d}`} variant="secondary" size="md" onPress={() => setDay(d)} />
        ))}
        <Button label={premium ? 'Premium' : 'Free'} variant="ghost" size="md" onPress={() => setPremium((p) => !p)} />
      </View>
      {day ? (
        <MilestoneMoment visible day={day} premium={premium} onShare={() => setDay(null)} onDismiss={() => setDay(null)} />
      ) : null}
    </Screen>
  );
}
