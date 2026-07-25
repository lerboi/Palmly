import { useEffect, useState } from 'react';
import { HistoryShelf } from '@/features/reading/HistoryShelf';
import { visibleReadings, type ReadingSummary } from '@/features/reading/history';
import { loadHistory } from '@/lib/readings';
import { getLastScanMatched } from '@/lib/session';

/**
 * Readings shelf (UIUX §2.11 / §2.5, audit F0.3 / F1.10). Lists the user's own `readings` rows via
 * supabase-js (RLS) — each row opens its reveal by id. A fresh user with no readings gets
 * {@link HistoryShelf}'s built-in empty state. The "your palm is unchanged" brag is now EARNED —
 * driven by the real `matched` signal (the last scan resolved `matched`), not hardcoded on.
 */
export default function History() {
  const [readings, setReadings] = useState<ReadingSummary[]>([]);
  const [matchedKind, setMatchedKind] = useState<'palm' | 'face' | null>(null);
  // SH-5: a failed load used to resolve to an EMPTY list, so the shelf told a user with a dozen
  // readings "No readings yet" and pointed them at the camera. Failure is now its own state.
  const [failed, setFailed] = useState(false);
  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    let active = true;
    loadHistory()
      .then((rows) => {
        if (!active) return;
        setReadings(visibleReadings(rows));
        setFailed(false);
      })
      .catch(() => active && setFailed(true));
    getLastScanMatched().then((k) => active && setMatchedKind(k));
    return () => {
      active = false;
    };
  }, [reloads]);

  return (
    <HistoryShelf
      readings={readings}
      showUnchanged={matchedKind != null}
      matchedKind={matchedKind}
      error={failed}
      onRetry={() => setReloads((r) => r + 1)}
    />
  );
}
