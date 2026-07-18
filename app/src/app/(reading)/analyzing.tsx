import { useEffect, useState } from 'react';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { AnalyzingView } from '@/features/reading/AnalyzingView';
import { PREVIEW_GEOMETRY } from '@/features/reading/reveal';
import { useScanStatus } from '@/lib/useScanStatus';
import { requestPushPermission } from '@/lib/notifications';
import { setLastScanMatched } from '@/lib/session';
import { track } from '@/lib/analytics';

/**
 * Analyzing loader (UIUX §2.4, audit F0.2) — the live seam where the deployed pipeline meets the UI.
 * Takes the `scanId` minted by the upload flow ({@link uploadPickedScan}), subscribes to its status
 * via {@link useScanStatus}, drives the staged messages / overrun thresholds off a mount timer, and
 * `replace`s to the reveal the instant the scan resolves `complete`/`matched` (replace, not push, so
 * Back from the reveal never re-enters this spent loader). A `failed` scan renders the warm failure
 * UI keyed on the real `failure_reason`; Back cancels to the previous screen; the 75s notify-me frees
 * the user (F1.T10 upgrades it to a real push-permission ask).
 *
 * Without a scanId (a dev/deep-link edge) it still renders a representative mid-pipeline state, so it
 * never blanks. The traced-palm hero uses PREVIEW_GEOMETRY as a placeholder — the "their own crop"
 * beat is a device follow-up (P5 / F1.T4); the real per-scan geometry only exists post-extraction.
 */
export default function Analyzing() {
  const { scanId, capturedUri } = useLocalSearchParams<{ scanId?: string; capturedUri?: string }>();
  const id = scanId ?? null;
  const { status, failureReason, error } = useScanStatus(id);

  // Mount timer → elapsedMs (a pure accumulating tick), driving the staged messages, the 45s soften
  // / 75s notify overrun, and the rotating social-proof line. A fresh scan mounts a fresh screen.
  const [elapsedMs, setElapsedMs] = useState(0);
  useEffect(() => {
    const step = 500;
    const timer = setInterval(() => setElapsedMs((ms) => ms + step), step);
    return () => clearInterval(timer);
  }, []);

  // Auto-advance to the reveal once the reading is ready. A `matched` resolve (a repeat of a palm/face
  // they've read before, Backend §6.6) records the real consistency signal + threads `?matched=1` so
  // the reveal can surface the "consistent?" micro-survey (F1.10); a fresh `complete` clears it.
  useEffect(() => {
    if (!id) return;
    if (status === 'matched') {
      void setLastScanMatched(true);
      router.replace(`/reveal?scanId=${id}&matched=1` as Href);
    } else if (status === 'complete') {
      void setLastScanMatched(false);
      router.replace(`/reveal?scanId=${id}` as Href);
    }
  }, [id, status]);

  const onNotifyMe = () => {
    track('analyzing_notify_me', id ? { scan_id: id } : {});
    // The 75s overrun is a sanctioned push moment (F1.T10): ask, then free the user home so a push can
    // bring them back to the reveal. The OS prompt + token are device-only; on web this no-ops.
    void requestPushPermission('analyzing_overrun');
    router.replace('/' as Href);
  };

  return (
    <AnalyzingView
      geometry={PREVIEW_GEOMETRY}
      status={status}
      elapsedMs={elapsedMs}
      capturedImageUri={typeof capturedUri === 'string' ? capturedUri : undefined}
      failureReason={failureReason}
      connectionError={error}
      onNotifyMe={onNotifyMe}
      onBack={() => router.back()}
      onRetry={() => router.replace('/primer' as Href)}
      onUploadInstead={() => router.replace('/primer' as Href)}
    />
  );
}
