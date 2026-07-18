import { supabase } from '@/lib/supabase';
import type { ChatMessage } from './chat';

/**
 * The live chat send (audit F1.10, Backend §6.5) → the deployed user-mode `chat-send`. It answers
 * grounded in the caller's reading and returns the reply + the `feature_key` citations + follow-up
 * chips. The response is plain JSON today (the SSE stream is device-gated, H1); this binds to that
 * JSON. A non-premium caller past their free allowance comes back **HTTP 402** → the caller routes to
 * `/paywall?trigger=chat_entry`. This module imports `supabase`, so it is deliberately separate from
 * the pure, unit-tested `./chat` helpers.
 */
export interface ChatReply {
  threadId?: string;
  reply: string;
  citations: string[];
  chips: string[];
  deflected: boolean;
  category?: string;
}

export type ChatSendOutcome = { ok: true; reply: ChatReply } | { ok: false; gated: boolean };

export async function sendChat(params: { message: string; readingId?: string; threadId?: string }): Promise<ChatSendOutcome> {
  const { data, error } = await supabase.functions.invoke('chat-send', {
    body: {
      message: params.message,
      ...(params.readingId ? { reading_id: params.readingId } : {}),
      ...(params.threadId ? { thread_id: params.threadId } : {}),
    },
  });
  if (!error) {
    const d = (data ?? {}) as Partial<{ thread_id: string; reply: string; citations: string[]; chips: string[]; deflected: boolean; category: string }>;
    return {
      ok: true,
      reply: {
        threadId: d.thread_id,
        reply: d.reply ?? '',
        citations: Array.isArray(d.citations) ? d.citations : [],
        chips: Array.isArray(d.chips) ? d.chips : [],
        deflected: !!d.deflected,
        category: d.category,
      },
    };
  }
  const status = (error as { context?: { status?: number } }).context?.status;
  return { ok: false, gated: status === 402 };
}

/** Build a client-side assistant message from a live reply. `idSuffix` keeps keys unique per turn. */
export function assistantMessage(reply: ChatReply, idSuffix: string): ChatMessage {
  return { id: `a-${idSuffix}`, role: 'assistant', text: reply.reply, citations: reply.citations };
}
