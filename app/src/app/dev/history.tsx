import { HistoryShelf } from '@/features/reading/HistoryShelf';
import { PREVIEW_HISTORY, visibleReadings } from '@/features/reading/history';

/**
 * /dev preview — the readings shelf as PRODUCTION renders it: `visibleReadings` applied to the
 * fixture (audit F1.6). With `FACE_READING_ENABLED = true` (F1.T7) this shows palm + face rows — the
 * exact output of `(home)/history.tsx`; when the flag is cut, the face row drops here too. Not
 * shipped in production builds.
 */
export default function HistoryPreview() {
  return <HistoryShelf readings={visibleReadings(PREVIEW_HISTORY)} />;
}
