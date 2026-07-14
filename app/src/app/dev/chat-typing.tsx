import { ChatThread } from '@/features/chat/ChatThread';
import { PREVIEW_CHIPS, PREVIEW_THREAD } from '@/features/chat/chat';

/** /dev preview — the chat thread with the assistant typing indicator (redesign R19). Not shipped. */
export default function ChatTypingPreview() {
  return <ChatThread premium messages={PREVIEW_THREAD.slice(0, 3)} chips={PREVIEW_CHIPS} typing />;
}
