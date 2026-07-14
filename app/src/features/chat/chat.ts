// Premium chat (UIUX §2.11, Backend §6.5). Grounded on the reading's own features + KB; each answer
// cites which of the user's lines it drew on (grounding made visible). Streaming (SSE) is device-gated;
// this module holds the pure UI helpers + preview data.

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
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
