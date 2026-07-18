import { HistoryShelf } from '@/features/reading/HistoryShelf';
import { PREVIEW_HISTORY, visibleReadings } from '@/features/reading/history';

/**
 * /dev preview — the readings shelf as PRODUCTION renders it: `visibleReadings` applied to the
 * fixture (audit F1.6). While `FACE_READING_ENABLED = false` the face row is dropped, so this shows
 * palm-only — the exact output of `(home)/history.tsx`. The raw `PREVIEW_HISTORY` fixture keeps its
 * face row for F1.T7. Not shipped in production builds.
 */
export default function HistoryPreview() {
  return <HistoryShelf readings={visibleReadings(PREVIEW_HISTORY)} />;
}
