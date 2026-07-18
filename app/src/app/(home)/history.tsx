import { useEffect, useState } from 'react';
import { HistoryShelf } from '@/features/reading/HistoryShelf';
import type { ReadingSummary } from '@/features/reading/history';
import { loadHistory } from '@/lib/readings';

/**
 * Readings shelf (UIUX §2.11 / §2.5, audit F0.3). Lists the user's own `readings` rows via
 * supabase-js (RLS) — each row opens its reveal by id. A fresh user with no readings gets
 * {@link HistoryShelf}'s built-in empty state. `showUnchanged` is intentionally not forced on here
 * (the repeat-scan "matched" signal is wired in F1.T11); until a real signal exists it stays hidden.
 */
export default function History() {
  const [readings, setReadings] = useState<ReadingSummary[]>([]);

  useEffect(() => {
    let active = true;
    loadHistory()
      .then((rows) => active && setReadings(rows))
      .catch(() => active && setReadings([]));
    return () => {
      active = false;
    };
  }, []);

  return <HistoryShelf readings={readings} />;
}
