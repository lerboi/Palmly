import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { ChatThread } from '@/features/chat/ChatThread';
import { STARTER_CHIPS, type ChatMessage, lastUserText, systemMessage, withoutSystem } from '@/features/chat/chat';
import { assistantMessage, sendChat } from '@/features/chat/chatSend';
import { useEntitlement } from '@/lib/entitlements';
import { loadHistory } from '@/lib/readings';
import { track } from '@/lib/analytics';

/**
 * Chat thread (UIUX §2.11, audit F1.10). Premium chat grounded on the caller's latest reading: a
 * composed question posts to the deployed `chat-send`, an optimistic user bubble shows immediately, a
 * typing indicator runs while the (JSON) answer lands, then the assistant bubble + its palm citations
 * render and the follow-up chips refresh. A non-premium caller hits the server gate (**402**) and is
 * routed to `/paywall?trigger=chat_entry`. Free-by-default entitlement, no fabricated conversation.
 *
 * NOTE: the SSE STREAM is device-gated (H1) — `chat-send` returns plain JSON, so the answer arrives in
 * one shot (no token stream); the typing indicator covers the wait. The server allows chat only to
 * premium today, so the "one free question" (a server first-free allowance) is a `[~]` backend leg.
 */
export default function Chat() {
  const { premium } = useEntitlement();
  const router = useRouter();
  const { q } = useLocalSearchParams<{ q?: string }>(); // fortune→chat bridge prefill (F1.10)
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chips, setChips] = useState<string[]>(STARTER_CHIPS);
  const [typing, setTyping] = useState(false);
  const readingIdRef = useRef<string | undefined>(undefined);
  const threadIdRef = useRef<string | undefined>(undefined);
  const seq = useRef(0);
  const inFlight = useRef(false);

  // Ground the conversation on the caller's most-recent reading (newest first).
  useEffect(() => {
    let active = true;
    loadHistory().then((rows) => {
      if (active && rows[0]) readingIdRef.current = rows[0].id;
    });
    return () => {
      active = false;
    };
  }, []);

  const onSend = (text: string) => {
    if (inFlight.current) return;
    inFlight.current = true;
    const n = (seq.current += 1);
    setMessages((prev) => [...prev, { id: `u-${n}`, role: 'user', text }]);
    setTyping(true);
    track('chat_message_sent', { thread_id: threadIdRef.current ?? 'new' });
    void sendChat({ message: text, readingId: readingIdRef.current, threadId: threadIdRef.current }).then((out) => {
      setTyping(false);
      inFlight.current = false;
      if (!out.ok) {
        if (out.gated) {
          router.push('/paywall?trigger=chat_entry' as Href);
        } else {
          // SH-6: the app says this, not the reader. A `system` row renders as a tinted notice with
          // its own retry — never an assistant bubble wearing the Palmly avatar.
          setMessages((prev) => [
            ...prev,
            systemMessage(`e-${n}`, 'That didn’t go through — check your connection and try again.'),
          ]);
        }
        return;
      }
      threadIdRef.current = out.reply.threadId ?? threadIdRef.current;
      if (out.reply.deflected && out.reply.category) track('chat_deflected', { category: out.reply.category });
      setMessages((prev) => [...prev, assistantMessage(out.reply, String(n))]);
      if (out.reply.chips.length > 0) setChips(out.reply.chips);
    });
  };

  // Retry re-sends the last question the user actually asked, and drops the failure notice with it.
  const onRetry = () => {
    const text = lastUserText(messages);
    if (!text) return;
    setMessages(withoutSystem);
    onSend(text);
  };

  return (
    <ChatThread
      premium={premium}
      messages={messages}
      chips={chips}
      typing={typing}
      onSend={onSend}
      onRetry={onRetry}
      initialInput={typeof q === 'string' ? q : undefined}
    />
  );
}
