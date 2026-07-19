import { Stack } from 'expo-router';
import { FixtureWatermark } from '@/components/FixtureWatermark';

/**
 * Layout for the `/dev` fixture routes (audit §6 / F2.8). Every screen under `/dev` renders `PREVIEW_*`
 * fixtures, so it overlays the `FixtureWatermark` — a non-prod "SAMPLE DATA" mark that makes a fixture
 * screen impossible to mistake for real data. The watermark self-gates (dev / flagged builds only), so
 * this is a no-op overlay in a production export.
 */
export default function DevLayout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <FixtureWatermark />
    </>
  );
}
