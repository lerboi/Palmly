import { useState } from 'react';
import { View } from 'react-native';
import { Button, Screen, Text } from '@/components/ui';
import { GlassPlate } from '@/features/checkin/GlassPlate';
import { CHECKIN_PRIVACY_LINE, checkInMessage, isFallbackPrimary, type CheckInPhase } from '@/features/checkin/checkin';

const PHASES: CheckInPhase[] = ['searching', 'adjusting', 'reading', 'hint', 'fallback', 'matched'];

/**
 * /dev preview — every phase of the check-in ritual's copy plate, device-free (Audit-5 RF3.T2).
 *
 * The real ritual needs a camera, so this walks the STATE MACHINE instead: it is the copy that has
 * to be reviewed (no phase may accuse the user, every phase must show the privacy line), and that
 * is exactly what this makes inspectable in a screenshot.
 */
export default function CheckInWalkPreview() {
  const [i, setI] = useState(0);
  const phase = PHASES[i];
  return (
    <Screen scroll>
      <View style={{ gap: 12 }}>
        <Text variant="heading">{phase}</Text>
        {/* A dark stand-in for the camera feed, so the plate is read against something. */}
        <View style={{ backgroundColor: '#2A2622', borderRadius: 16, padding: 12 }}>
          <GlassPlate style={{ gap: 8 }}>
            <Text variant="bodyLarge" color="#FFFFFF">
              {checkInMessage(phase, 12)}
            </Text>
            <Text variant="small" color="rgba(255,255,255,0.82)">
              {CHECKIN_PRIVACY_LINE}
            </Text>
          </GlassPlate>
        </View>
        <Button
          label="Seal it with a tap instead"
          variant={isFallbackPrimary(phase) ? 'primary' : 'ghost'}
          fullWidth
          onPress={() => {}}
        />
        <Button label="Next phase" variant="secondary" size="md" onPress={() => setI((n) => (n + 1) % PHASES.length)} />
      </View>
    </Screen>
  );
}
