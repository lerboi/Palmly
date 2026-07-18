import { useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';

export type ScanStatus =
  | 'uploaded'
  | 'queued'
  | 'extracting'
  | 'matched'
  | 'narrating'
  | 'complete'
  | 'failed';

const TERMINAL: readonly ScanStatus[] = ['complete', 'failed', 'matched'];
export const isTerminalStatus = (s: ScanStatus | null): boolean => s != null && TERMINAL.includes(s);

export interface ScanStatusState {
  status: ScanStatus | null;
  failureReason: string | null;
  loading: boolean;
  /** Last fetch error (surfaced, not swallowed) — the re-poll keeps retrying, so this recovers. */
  error: string | null;
}

/**
 * Live scan status via Realtime Broadcast from Database (Backend §6.1). Broadcast is ephemeral,
 * so this **fetch-then-subscribes** and re-fetches current truth on every (re)subscribe — so a
 * reconnect after the app is killed/relaunched mid-pipeline recovers the real state rather than
 * hanging. Subscribes to the private `scan:{id}` channel; RLS on realtime.messages (migration
 * 0007) authorizes only the scan's owner. A backgrounded completion is also covered by a push.
 *
 * On-device verification (live transitions through a full run; kill/relaunch recovers) is gated on
 * a physical device — Human-tasks H1.
 */
export function useScanStatus(scanId: string | null): ScanStatusState {
  const [state, setState] = useState<ScanStatusState>({ status: null, failureReason: null, loading: true, error: null });
  const [trackedId, setTrackedId] = useState<string | null>(scanId);
  const statusRef = useRef<ScanStatus | null>(null);

  // Reset when the observed scan changes — during render, not in an effect (React's
  // adjust-state-on-prop-change pattern), so the loader shows immediately for the new scan.
  if (scanId !== trackedId) {
    setTrackedId(scanId);
    setState({ status: null, failureReason: null, loading: true, error: null });
  }

  useEffect(() => {
    if (!scanId) return;
    let active = true;
    statusRef.current = null;

    const applyStatus = (status: ScanStatus | null, failureReason: string | null = null) => {
      if (!active || !status) return;
      // never regress out of a terminal state (guards against a late/duplicate broadcast arriving
      // after we've already fetched `complete`).
      if (isTerminalStatus(statusRef.current) && !isTerminalStatus(status)) return;
      statusRef.current = status;
      setState({ status, failureReason, loading: false, error: null });
    };

    const fetchCurrent = async () => {
      const { data, error } = await supabase.from('scans').select('status, failure_reason').eq('id', scanId).single();
      if (!active) return;
      if (error) {
        // Surface the error but keep any status already shown — the re-poll below retries, so a
        // dropped socket / transient failure recovers rather than hanging silently behind the loader.
        setState((s) => ({ ...s, loading: false, error: error.message }));
        return;
      }
      if (data) applyStatus(data.status as ScanStatus, (data.failure_reason as string | null) ?? null);
    };

    // carry the auth token on the realtime socket so private-channel RLS can evaluate auth.uid().
    supabase.realtime.setAuth();

    const channel = supabase
      .channel(`scan:${scanId}`, { config: { private: true } })
      .on('broadcast', { event: 'status' }, (msg) => {
        const rec = (msg.payload as { record?: { status?: ScanStatus; failure_reason?: string | null } })?.record;
        if (rec?.status) applyStatus(rec.status, rec.failure_reason ?? null);
      })
      .subscribe((s) => {
        // every (re)subscribe — including after a dropped connection — re-fetches, then listens.
        if (s === 'SUBSCRIBED') void fetchCurrent();
      });

    // fetch immediately too, so UI shows state without waiting for the socket to connect.
    void fetchCurrent();

    // Re-poll while non-terminal — a broadcast that never arrives (dropped socket, missing
    // realtime partition) can then never strand the loader; terminal states stop polling.
    const poll = setInterval(() => {
      if (isTerminalStatus(statusRef.current)) return;
      void fetchCurrent();
    }, 10_000);

    return () => {
      active = false;
      clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [scanId]);

  return state;
}
