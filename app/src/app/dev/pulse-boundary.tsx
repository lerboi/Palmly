import { useState } from 'react';
import { View } from 'react-native';
import { Screen } from '@/components/ui';
import { BoundaryBanner } from '@/features/pulse/BoundaryBanner';
import { ChapterSheet } from '@/features/pulse/ChapterSheet';
import { PREVIEW_BOUNDARY_CHAPTER, PREVIEW_PULSE_FEATURE } from '@/features/dev/fixtures';

/** /dev preview — a chapter-turn day: the banner plus both entitlement states of the sheet. */
export default function PulseBoundaryPreview() {
  const [open, setOpen] = useState<'free' | 'premium' | null>(null);
  return (
    <Screen scroll>
      <View>
        <BoundaryBanner featureKey={PREVIEW_PULSE_FEATURE} onPress={() => setOpen('premium')} />
        <BoundaryBanner featureKey="eyebrows" onPress={() => setOpen('free')} />
        {open ? (
          <ChapterSheet
            visible
            chapter={PREVIEW_BOUNDARY_CHAPTER}
            featureKey={PREVIEW_PULSE_FEATURE}
            geometryHash="dev-fixture-hash"
            premium={open === 'premium'}
            onClose={() => setOpen(null)}
            onUnlock={() => setOpen(null)}
          />
        ) : null}
      </View>
    </Screen>
  );
}
