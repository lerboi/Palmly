import { ChatThread } from '@/features/chat/ChatThread';
import { PREVIEW_CHIPS, PREVIEW_THREAD } from '@/features/chat/chat';

/**
 * Premium chat thread (UIUX §2.11, P9.T6). Renders {@link ChatThread}. Seeded with a grounded
 * preview thread + chips for the device-free web screenshot; the real route loads the thread's
 * messages, streams replies from `chat-send` (SSE), and generates chips from the reading's features.
 */
export default function Chat() {
  return <ChatThread premium messages={PREVIEW_THREAD} chips={PREVIEW_CHIPS} />;
}
