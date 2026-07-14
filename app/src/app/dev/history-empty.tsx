import { HistoryShelf } from '@/features/reading/HistoryShelf';

/** /dev preview — the History shelf zero-readings empty state (redesign R20). Not shipped. */
export default function HistoryEmptyPreview() {
  return <HistoryShelf readings={[]} />;
}
