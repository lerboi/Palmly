// Premium chat (UIUX §2.11, Backend §6.5). Grounded on the reading's own features + KB; each answer
// cites which of the user's lines it drew on (grounding made visible). Streaming (SSE) is device-gated;
// this module holds the pure UI helpers + preview data.

export interface ChatMessage {
  id: string;
  /** `system` is the app speaking about itself — a failure, never a reading (Audit-4 SH-6). */
  role: 'user' | 'assistant' | 'system';
  text: string;
  citations?: string[]; // feature_keys the answer draws on (e.g. 'heart_line.depth.deep')
}

const LINE_NAME: Record<string, string> = {
  heart_line: 'heart line',
  head_line: 'head line',
  life_line: 'life line',
  fate_line: 'fate line',
  hand_shape: 'hand shape',
  mounts: 'mounts',
  markings: 'markings',
};

/** "Cites your heart line & life line" — the trust line under an assistant answer. */
export function citationLabel(featureKeys: string[]): string {
  const names = [...new Set(featureKeys.map((k) => LINE_NAME[k.split('.')[0]] ?? k.split('.')[0].replace(/_/g, ' ')))];
  if (names.length === 0) return '';
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
  return `Cites your ${list}`;
}

/** Starter follow-ups shown before the first answer (F1.10) — generic, reading-agnostic openers; the
 *  server returns grounded chips after each reply. */
export const STARTER_CHIPS = [
  'What stands out most in my reading?',
  'What should I watch for this year?',
  'How do my lines shape how I love?',
];

// ── Preview thread + chips for device-free web-screenshot verification (P9.T6). ──
// Chips are follow-ups the user has NOT asked yet (distinct from the thread above).
export const PREVIEW_CHIPS = [
  'What should I look for in a partner?',
  'Does my life line show my energy this year?',
  'Any warning signs in my markings?',
];

export const PREVIEW_THREAD: ChatMessage[] = [
  { id: 'm1', role: 'user', text: 'What does my deep heart line say about how I love?' },
  {
    id: 'm2',
    role: 'assistant',
    text: 'Your deep, gently curving heart line points to a steady, wholehearted way of loving — you commit slowly but for keeps, and you feel things more intensely than you let on. In the classical reading, a deep heart line marks constancy over flightiness.',
    citations: ['heart_line.depth.deep'],
  },
  { id: 'm3', role: 'user', text: 'And my head line — does it clash with that?' },
  {
    id: 'm4',
    role: 'assistant',
    text: 'Not clashing — balancing. Your long head line slopes toward the Moon mount, so you think in images and feelings, not just logic. You love with imagination as well as loyalty: head and heart run close here, and that is a quiet strength.',
    citations: ['head_line.slope.moon', 'heart_line.depth.deep'],
  },
];

/**
 * A failure notice, authored by the APP (Audit-4 SH-6). Built here rather than inline at the call
 * site so the role can never drift back to `assistant` — which is exactly how a network error came
 * to be spoken by the reader, avatar and all.
 */
export function systemMessage(id: string, text: string): ChatMessage {
  return { id, role: 'system', text };
}

/** The last thing the USER actually asked — what a retry re-sends. */
export function lastUserText(messages: readonly ChatMessage[]): string | undefined {
  for (let i = messages.length - 1; i >= 0; i--) if (messages[i].role === 'user') return messages[i].text;
  return undefined;
}

/** Drop failure notices — a retry replaces them rather than stacking them up. */
export function withoutSystem(messages: readonly ChatMessage[]): ChatMessage[] {
  return messages.filter((m) => m.role !== 'system');
}
