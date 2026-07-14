import { HistoryShelf } from '@/features/reading/HistoryShelf';
import { PREVIEW_HISTORY } from '@/features/reading/history';

/**
 * Readings shelf (UIUX §2.11 / §2.5, P6.T4). Renders {@link HistoryShelf}. Seeded with preview
 * readings so the screen is buildable + device-free-verifiable (web screenshot); once readings exist
 * it loads the user's own rows. `showUnchanged` demonstrates the repeat-scan consistency brag.
 */
export default function History() {
  return <HistoryShelf readings={PREVIEW_HISTORY} showUnchanged />;
}
