import { useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';

/**
 * Live compatibility status via Realtime Broadcast (Backend §7, migration 0011). Mirrors
 * {@link useScanStatus}: **fetch-then-subscribe** on the private `compat:{pairId}` channel (event
 * `status`, RLS-restricted to the pair's members), re-fetch on every (re)subscribe AND on every
 * broadcast (the broadcast is only a "something changed" signal — the fetch is the source of truth
 * for the full row), plus a ~10s non-terminal re-poll so a dropped/never-delivered broadcast can
 * never strand the reveal. The server trigger fires to BOTH members, so the two-sided reveal lands.
 */
export type CompatStatus = 'pending' | 'awaiting_b' | 'computing' | 'complete' | 'failed';

const TERMINAL: readonly CompatStatus[] = ['complete', 'failed'];
export const isCompatTerminal = (s: CompatStatus | null): boolean => s != null && TERMINAL.includes(s);

/** The `compatibility_results` fields the pair reveal reads. */
export interface CompatResultRow {
  status: CompatStatus;
  score: number | null;
  sub_scores: Record<string, number> | null;
  narrative: { headline?: string; sections?: { key: string; title: string; body: string }[] } | null;
}

export interface CompatStatusState {
  status: CompatStatus | null;
  result: CompatResultRow | null;
  loading: boolean;
  error: string | null;
}

export function useCompatStatus(pairId: string | null): CompatStatusState {
  const [state, setState] = useState<CompatStatusState>({ status: null, result: null, loading: true, error: null });
  const [trackedId, setTrackedId] = useState<string | null>(pairId);
  const statusRef = useRef<CompatStatus | null>(null);

  // Reset during render (adjust-state-on-prop-change) so a new pair shows its loader immediately.
  if (pairId !== trackedId) {
    setTrackedId(pairId);
    setState({ status: null, result: null, loading: true, error: null });
  }

  useEffect(() => {
    if (!pairId) return;
    let active = true;
    statusRef.current = null;

    const apply = (row: CompatResultRow | null) => {
      if (!active || !row?.status) return;
      // never regress out of a terminal state (guards a late/duplicate broadcast after `complete`).
      if (isCompatTerminal(statusRef.current) && !isCompatTerminal(row.status)) return;
      statusRef.current = row.status;
      setState({ status: row.status, result: row, loading: false, error: null });
    };

    const fetchCurrent = async () => {
      const { data, error } = await supabase
        .from('compatibility_results')
        .select('status, score, sub_scores, narrative')
        .eq('pair_id', pairId)
        .maybeSingle();
      if (!active) return;
      if (error) {
        setState((s) => ({ ...s, loading: false, error: error.message }));
        return;
      }
      if (data) apply(data as CompatResultRow);
      else setState((s) => ({ ...s, loading: false })); // no results row yet (awaiting the other side)
    };

    supabase.realtime.setAuth();
    const channel = supabase
      .channel(`compat:${pairId}`, { config: { private: true } })
      // the broadcast payload can be partial; re-fetch the authoritative full row on any change.
      .on('broadcast', { event: 'status' }, () => void fetchCurrent())
      .subscribe((s) => {
        if (s === 'SUBSCRIBED') void fetchCurrent();
      });

    void fetchCurrent();

    const poll = setInterval(() => {
      if (isCompatTerminal(statusRef.current)) return;
      void fetchCurrent();
    }, 10_000);

    return () => {
      active = false;
      clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [pairId]);

  return state;
}
