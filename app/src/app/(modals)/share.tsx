import { useRouter } from 'expo-router';
import { ShareView } from '@/features/reading/ShareView';
import { PREVIEW_GEOMETRY, PREVIEW_READING } from '@/features/reading/reveal';

/**
 * Share sheet (UIUX §2.6/§2.7, redesign R16). Renders {@link ShareView}, seeded with a
 * representative reading + compatibility fixture so it is buildable + device-free-verifiable.
 * The OS share sheet + per-country brand channels are wired on device.
 */
export default function Share() {
  const router = useRouter();
  return (
    <ShareView
      geometry={PREVIEW_GEOMETRY}
      headline={PREVIEW_READING.headline}
      score={82}
      partnerName="Mei"
      onClose={() => router.back()}
    />
  );
}
