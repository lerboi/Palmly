import { useCallback, useRef, useState } from 'react';
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
  // Lets the capture screens skip `capture_abandoned` on unmount once a capture has completed (A7).
  // Exposed as a stable getter (not the raw ref) so a screen's unmount cleanup can read the LATEST
  // value without tripping the "ref read in cleanup" lint (which assumes refs point at DOM nodes).
  const completedRef = useRef(false);
  const hasCompleted = useCallback(() => completedRef.current, []);

  // Re-entrancy latch: a double-tap on "Use photo" (or shutter-spam) must never start two uploads /
  // push /analyzing twice. State alone lags a tap; the ref is synchronous.
  const uploadingRef = useRef(false);

  // The shared tail both acquisition paths run: scan-create → PUT → scan-ingest → /analyzing. A
  // failed leg surfaces `error` and leaves the caller where it was (never a hang / id-less push).
  const uploadUri = useCallback(
    async (imageUri: string) => {
      if (uploadingRef.current) return;
      uploadingRef.current = true;
      setUploading(true);
      const startedAt = Date.now();
      try {
        track('capture_started', { kind, hand });
        const { scanId } = await uploadPickedScan({ kind, hand, imageUri });
        track('upload_ok', { scan_id: scanId, kind });
        // Capture-funnel completion (A7). Phase 1 acquisition is a manual shutter tap / library pick,
        // so `manual`; the auto-capture (`auto`) arrives with the landmark-guided flow (Phase 2).
        track('capture_completed', { kind, method: 'manual', duration_ms: Date.now() - startedAt });
        completedRef.current = true;
        // Thread the local image URI (analyzing shows THEIR image, F1.4) + `kind` (analyzing emits
        // `reading_ready` with it, A7 — useScanStatus doesn't carry the scan's kind).
        router.push(`/analyzing?scanId=${scanId}&kind=${kind}&capturedUri=${encodeURIComponent(imageUri)}` as Href);
      } catch (e) {
        captureError(e, { where: 'useScanUpload' });
        setError('That didn’t upload — check your connection and try again.');
      } finally {
        uploadingRef.current = false;
        setUploading(false);
      }
    },
    [kind, hand],
  );

  const pickAndUpload = async () => {
    setError(null);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (result.canceled || !result.assets?.[0]) return; // user backed out — no-op, no navigation
    await uploadUri(result.assets[0].uri);
  };

  // The live-camera path (Phase 1): a frame already captured by `CameraView.takePictureAsync` is fed
  // straight into the same pipeline — no library round-trip.
  const captureAndUpload = useCallback(
    (imageUri: string) => {
      setError(null);
      return uploadUri(imageUri);
    },
    [uploadUri],
  );

  return { pickAndUpload, captureAndUpload, uploading, error, hasCompleted };
}
