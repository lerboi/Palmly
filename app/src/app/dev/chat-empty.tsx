import { ChatThread } from '@/features/chat/ChatThread';
import { PREVIEW_CHIPS } from '@/features/chat/chat';

/** /dev preview — the premium chat first-run (no messages) state (redesign R19). Not shipped. */
export default function ChatEmptyPreview() {
  return <ChatThread premium messages={[]} chips={PREVIEW_CHIPS} />;
}
