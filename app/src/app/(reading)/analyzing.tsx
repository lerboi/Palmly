import { useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { AnalyzingView } from '@/features/reading/AnalyzingView';
import { ABSTRACT_GEOMETRY } from '@/features/reading/reveal';
import type { LineGeometry } from '@/components/palm-diagram/geometry';
import { loadHistory, loadReading } from '@/lib/readings';
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
 * never blanks.
 *
 * **Whose palm is on screen (Audit-4 SH-7).** This scan's own geometry cannot exist until extraction
 * finishes, so a FIRST scan traces an abstract motif and the copy drops the possessive. A RESCAN is
 * different: the reader already has a stored reading, so we trace their real lines and the
 * possessive is earned. The route resolves that in the background; until it does, the honest
 * abstract state renders.
 */
export default function Analyzing() {
  const { scanId, capturedUri, kind: kindParam, hand: handParam } = useLocalSearchParams<{ scanId?: string; capturedUri?: string; kind?: string; hand?: string }>();
  const id = scanId ?? null;
  const kind: 'palm' | 'face' = kindParam === 'face' ? 'face' : 'palm';
  // Carry the hand back to the primer on a retry, so a left-hand scan retries as a left-hand scan.
  const hand = handParam === 'left' || handParam === 'right' ? handParam : undefined;
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
  // Emit `reading_ready` once when the pipeline resolves (A7 — metric "is the wow landing?"). The
  // mount timer's `elapsedMs` is the wait the user actually felt; guard so a late duplicate broadcast
  // can't double-count.
  // The reader's newest stored geometry, if any (SH-7). `loadHistory()[0]` → `loadReading` are both
  // existing RLS-scoped client reads; a first-time user simply has none and keeps the motif.
  const [own, setOwn] = useState<LineGeometry | null>(null);
  useEffect(() => {
    let active = true;
    loadHistory()
      .then((rows) => (rows[0] ? loadReading({ readingId: rows[0].id }) : null))
      .then((res) => {
        if (active && res) setOwn(res.geometry);
      })
      .catch(() => {
        /* no stored reading (or it failed to load) → the abstract motif, which is the honest default */
      });
    return () => {
      active = false;
    };
  }, []);

  const readyEmitted = useRef(false);
  useEffect(() => {
    if (!id) return;
    if (status === 'matched' || status === 'complete') {
      if (!readyEmitted.current) {
        readyEmitted.current = true;
        track('reading_ready', { scan_id: id, kind, latency_ms: elapsedMs });
      }
      void setLastScanMatched(status === 'matched', kind);
      router.replace(`/reveal?scanId=${id}${status === 'matched' ? '&matched=1' : ''}` as Href);
    }
  }, [id, status, kind, elapsedMs]);

  const onNotifyMe = () => {
    track('analyzing_notify_me', id ? { scan_id: id } : {});
    // The 75s overrun is a sanctioned push moment (F1.T10): ask, and let the view show its holding
    // state. This used to `replace('/')` — the marketing LAUNCHER, with no route back to the scan or
    // to anything else (SN-7). The OS prompt + token are device-only; on web this no-ops.
    void requestPushPermission('analyzing_overrun');
  };

  return (
    <AnalyzingView
      geometry={own ?? ABSTRACT_GEOMETRY}
      ownGeometry={own != null}
      status={status}
      elapsedMs={elapsedMs}
      capturedImageUri={typeof capturedUri === 'string' ? capturedUri : undefined}
      failureReason={failureReason}
      connectionError={error}
      onNotifyMe={onNotifyMe}
      onBack={() => router.back()}
      onHome={() => router.replace('/fortune' as Href)}
      onRetry={() => router.replace((hand ? `/primer?hand=${hand}` : '/primer') as Href)}
    />
  );
}
