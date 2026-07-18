import { ChatThread } from '@/features/chat/ChatThread';
import { useEntitlement } from '@/lib/entitlements';

/**
 * Chat thread (UIUX §2.11, audit F0.3). Gated by the free-by-default entitlement store (no hardcoded
 * `premium`): a free user sees {@link ChatThread}'s honest unlock gate, not a fabricated conversation.
 * The real message load + `chat-send` SSE stream + the one-free-question gate land in F1.T11; until
 * then production passes no fixture thread (the preview thread stays under `/dev/*`).
 */
export default function Chat() {
  const { premium } = useEntitlement();
  return <ChatThread premium={premium} messages={[]} chips={[]} />;
}
