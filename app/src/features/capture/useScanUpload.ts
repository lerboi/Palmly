import { useState } from 'react';
import { router, type Href } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { uploadPickedScan, type Hand, type ScanKind } from '@/lib/scan';
import { captureError, track } from '@/lib/analytics';

/**
 * The single device-free door into the live pipeline (audit A5). Opens the photo library, then drives
 * scan-create → PUT → scan-ingest ({@link uploadPickedScan}) and lands on `/analyzing?scanId=…`.
 *
 * Shared by the camera primer's "Upload a photo instead" AND the palm capture review's "Use photo",
 * so NEITHER can route to `/analyzing` without a `scanId` — the infinite-loader dead-end the frontend
 * audit called the app's most damaging screen (the palm stand-in used to push `/analyzing` with no id,
 * so `useScanStatus` never resolved). Cancelling the picker is a no-op (no navigation); a failed leg
 * surfaces `error` and leaves the caller where it was, never a hang. The real on-device camera capture
 * remains device-gated ([~], P2); this is the library-pick path that IS verifiable device-free.
 */
export function useScanUpload({ kind, hand }: { kind: ScanKind; hand?: Hand }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickAndUpload = async () => {
    setError(null);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (result.canceled || !result.assets?.[0]) return; // user backed out — no-op, no navigation
    setUploading(true);
    try {
      track('capture_started', { kind, hand });
      const { scanId } = await uploadPickedScan({ kind, hand, imageUri: result.assets[0].uri });
      track('upload_ok', { scan_id: scanId, kind });
      // Thread the local image URI so the analyzing loader shows THEIR image under the tracing (F1.4).
      router.push(`/analyzing?scanId=${scanId}&capturedUri=${encodeURIComponent(result.assets[0].uri)}` as Href);
    } catch (e) {
      captureError(e, { where: 'useScanUpload' });
      setError('That didn’t upload — check your connection and try again.');
    } finally {
      setUploading(false);
    }
  };

  return { pickAndUpload, uploading, error };
}
