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
  const [unchanged, setUnchanged] = useState(false);

  useEffect(() => {
    let active = true;
    loadHistory()
      .then((rows) => active && setReadings(visibleReadings(rows)))
      .catch(() => active && setReadings([]));
    getLastScanMatched().then((m) => active && setUnchanged(m));
    return () => {
      active = false;
    };
  }, []);

  return <HistoryShelf readings={readings} showUnchanged={unchanged} />;
}
