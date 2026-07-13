// Chat (premium) core — Backend §6, UIUX §2.11. The testable heart of `chat-send`, kept pure so the
// adversarial-deflection guard, feature grounding, suggestion chips and prompt build can be unit-
// tested without a live model or DB. Design principles:
//   • GROUNDED: every answer is anchored to the user's OWN reading features (their cited lines) via
//     keyed KB lookup, widened by fuzzy pgvector retrieval — never free-floating.
//   • SAFE: medical / self-harm / financial / off-topic / prompt-injection questions are deflected
//     BEFORE any model call (deterministic, zero-cost, un-jailbreakable), and any banned claim the
//     model smuggles into its prose is caught on the way out (mirrors the narrative guard, §13).
import { bannedHits, type GeminiCall, type GeminiResponse } from './narrative.ts';

export const CHAT_MODEL = 'gemini-3.1-flash-lite';
export const CHAT_PROMPT_VERSION = 'chat.v1';

export type ChatRole = 'user' | 'assistant';
export interface ChatTurn {
  role: ChatRole;
  content: string;
}

export interface KbChunk {
  feature_key: string;
  content: string;
  tradition?: string;
  distance?: number;
}

// ── Adversarial deflection (checked in priority order; self-harm first) ─────────────────────────
export type DeflectCategory = 'self_harm' | 'medical' | 'legal_financial' | 'injection' | 'off_topic';

export interface Deflection {
  deflected: boolean;
  category?: DeflectCategory;
  reply?: string;
}

const SELF_HARM = [/\bsuicid/i, /\bkill myself\b/i, /\bend my life\b/i, /\bself[-\s]?harm\b/i, /\bhurt myself\b/i, /\bwant to die\b/i, /\bno reason to live\b/i, /\btake my (own )?life\b/i];
const MEDICAL = [
  /\bdiseases?\b/i, /\billness(es)?\b/i, /\bdiagnos(e|es|is|ing)\b/i, /\bsymptoms?\b/i, /\bcancers?\b/i, /\btumou?rs?\b/i,
  /\bmedical\b/i, /\bmedicine\b/i, /\bcure[sd]?\b/i, /\bdiabet(es|ic)\b/i, /\bpregnan(t|cy)\b/i, /\bconceive\b/i, /\bfertility\b/i, /\bhealth\b/i,
  /\blifespan\b/i, /\blife\s?span\b/i, /\blongevity\b/i,
  /\bhow long (will|do|have) i (got |left )?.*\blive\b/i,
  /\bwhen (will|do|am) i .*\bdie\b/i, // "when will i die", "when am i going to die"
  /\bwhen i (will|'ll|am going to) die\b/i, // "predict when I will die"
  /\b(will|do) i die\b/i, /\bpredict.*\bdeath\b/i, /\bdate of (my )?death\b/i, /\bday i (will )?die\b/i,
];
const LEGAL_FINANCIAL = [/\bshould i (buy|sell|invest)\b/i, /\bstocks?\b/i, /\bcrypto|bitcoin\b/i, /\bfinancial advice\b/i, /\blegal advice\b/i, /\bsue\b/i, /\blawsuit\b/i, /\bwhich (stock|coin|fund)\b/i, /\bwhere should i invest\b/i];
const INJECTION = [/\bignore (all |the |your )?(previous|prior|above)\b/i, /\bdisregard .*(instruction|rule|prompt)/i, /\byou are (now )?(a |an )?(?!my)/i, /\bsystem prompt\b/i, /\breveal your (prompt|instruction|rule)/i, /\bjailbreak\b/i, /\bdeveloper mode\b/i, /\bpretend to be\b/i];
const OFF_TOPIC = [/\bweather\b/i, /\bstock price\b/i, /\b(the )?news\b/i, /\belection\b/i, /\bpresident\b/i, /\bcapital of\b/i, /\btranslate\b/i, /\bwrite (me )?(a |some )?(code|program|script|essay|poem)\b/i, /\b(python|javascript|c\+\+|sql)\b/i, /\brecipe\b/i, /\bhomework\b/i, /\bsolve .*(equation|for x)\b/i, /\bwho won\b/i, /\bsports? score\b/i, /\bwhat time is it\b/i];

const DEFLECT_REPLY: Record<DeflectCategory, string> = {
  self_harm:
    "I'm not the right place for this, and I don't want to brush past it — if you're in real distress, please reach out to a local crisis line or someone you trust right now. When you're ready, I'll be here to return to your reading.",
  medical:
    "That strays into health, which the lines can't speak to — palmistry here is for reflection, not diagnosis. What I can explore is what your heart line suggests about how you carry stress. Want me to?",
  legal_financial:
    "I can't offer financial or legal advice — the almanac is for reflection, not decisions like that. I can tell you what your fate line hints about your relationship with ambition, though.",
  injection:
    "I'll stay in my lane as your reading companion. Ask me about your palm, your face, or today's fortune and I'm all yours.",
  off_topic:
    "That's a little outside what I read here — I stay with your palm, your face, and the day's fortune. Ask me about one of your lines and I'll go deep.",
};

/** Classify a question against the safety/scope guards. Returns a canned graceful redirect when it
 *  must be deflected — the model is then never called (deterministic + un-jailbreakable). */
export function deflect(question: string): Deflection {
  const q = (question ?? '').trim();
  if (!q) return { deflected: false };
  const checks: Array<[DeflectCategory, RegExp[]]> = [
    ['self_harm', SELF_HARM],
    ['medical', MEDICAL],
    ['legal_financial', LEGAL_FINANCIAL],
    ['injection', INJECTION],
    ['off_topic', OFF_TOPIC],
  ];
  for (const [category, patterns] of checks) {
    if (patterns.some((re) => re.test(q))) return { deflected: true, category, reply: DEFLECT_REPLY[category] };
  }
  return { deflected: false };
}

// ── Grounding ───────────────────────────────────────────────────────────────────────────────────
/** The user's OWN reading features → KB chunks (the cited lines). Deterministic keyed lookup. */
export function keyedGrounding(featureRefs: string[], kb: Map<string, string>): KbChunk[] {
  const out: KbChunk[] = [];
  for (const fk of dedupe(featureRefs)) {
    const content = kb.get(fk);
    if (content) out.push({ feature_key: fk, content });
  }
  return out;
}

/** Merge keyed grounding (the reading's own lines) with fuzzy pgvector hits, keyed first, dedup by
 *  feature_key, capped. Keyed chunks are the anchor; fuzzy only widens coverage. */
export function mergeGrounding(keyed: KbChunk[], fuzzy: KbChunk[], cap = 8): KbChunk[] {
  const seen = new Set<string>();
  const out: KbChunk[] = [];
  for (const c of [...keyed, ...fuzzy]) {
    if (seen.has(c.feature_key)) continue;
    seen.add(c.feature_key);
    out.push(c);
    if (out.length >= cap) break;
  }
  return out;
}

const dedupe = (xs: string[]): string[] => [...new Set(xs.filter((x) => typeof x === 'string' && x.length))];

// ── Suggestion chips (grounded in THEIR features, UIUX §2.11) ───────────────────────────────────
const LINE_LABEL: Record<string, string> = {
  heart_line: 'heart line', head_line: 'head line', life_line: 'life line', fate_line: 'fate line',
  hand_shape: 'hand', face_shape: 'face', eyes: 'eyes', nose: 'nose', mouth: 'mouth', eyebrows: 'brows', mount: 'mounts',
};

/** Up to `max` natural questions derived from the reading's feature_refs — never generic filler. */
export function suggestionChips(featureRefs: string[], max = 4): string[] {
  const chips: string[] = [];
  const seenLines = new Set<string>();
  for (const fk of dedupe(featureRefs)) {
    const line = fk.split('.')[0];
    const dim = fk.split('.')[1];
    const val = fk.split('.')[2];
    const label = LINE_LABEL[line] ?? line.replace(/_/g, ' ');
    if (seenLines.has(line)) continue;
    seenLines.add(line);
    if ((dim === 'breaks' || dim === 'islands' || dim === 'chains') && val && val !== 'none') {
      chips.push(`What does the ${val} in my ${label} mean for me?`);
    } else if (line === 'fate_line') {
      chips.push('What does my fate line say about my career this year?');
    } else if (line === 'heart_line') {
      chips.push('What does my heart line say about how I love?');
    } else if (val) {
      chips.push(`What does my ${val} ${label} reveal about me?`);
    } else {
      chips.push(`Tell me more about my ${label}.`);
    }
    if (chips.length >= max) break;
  }
  if (!chips.length) chips.push('What stands out most in my reading?');
  return chips;
}

// ── Prompt build + generation ───────────────────────────────────────────────────────────────────
function groundingBlock(grounding: KbChunk[]): string {
  if (!grounding.length) return '(No specific line was matched — answer generally about palmistry/physiognomy and invite them to open their reading.)';
  return grounding.map((g) => `- ${g.feature_key}: ${g.content}`).join('\n');
}

export function buildChatRequest(systemInstruction: string, grounding: KbChunk[], history: ChatTurn[], question: string): Record<string, unknown> {
  const contents = history.slice(-8).map((t) => ({ role: t.role === 'assistant' ? 'model' : 'user', parts: [{ text: t.content }] }));
  contents.push({
    role: 'user',
    parts: [{ text: `Grounded observations from the reader's own reading — cite these by name when relevant, and do not invent features beyond them:\n${groundingBlock(grounding)}\n\nTheir question: ${question}` }],
  });
  return {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents,
    generationConfig: { temperature: 0.5, maxOutputTokens: 640, responseMimeType: 'text/plain' },
  };
}

export type ChatResult =
  | { ok: true; deflected: boolean; category?: DeflectCategory; reply: string; citations: string[]; usage?: GeminiResponse['usageMetadata'] }
  | { ok: false; failureReason: string; detail?: string };

/** Generate one grounded chat reply. Deflects unsafe/off-topic questions with no model call; else
 *  calls Gemini and guards the output against banned claims (a smuggled medical/financial claim is
 *  replaced with a safe redirect, never returned). */
export async function generateChatReply(input: {
  question: string;
  grounding: KbChunk[];
  history: ChatTurn[];
  systemInstruction: string;
  geminiCall: GeminiCall;
}): Promise<ChatResult> {
  const d = deflect(input.question);
  if (d.deflected) return { ok: true, deflected: true, category: d.category, reply: d.reply!, citations: [] };

  const res = await input.geminiCall(buildChatRequest(input.systemInstruction, input.grounding, input.history, input.question));
  const cand = res.candidates?.[0];
  const finish = cand?.finishReason;
  if (finish && finish !== 'STOP' && finish !== 'MAX_TOKENS') return { ok: false, failureReason: `gemini_finish_${finish.toLowerCase()}` };
  const text = (cand?.content?.parts?.map((p) => p.text ?? '').join('') ?? '').trim();
  if (!text) return { ok: false, failureReason: 'empty_reply' };

  if (bannedHits(text).length) {
    // The model produced a restricted claim — never surface it; redirect safely.
    return { ok: true, deflected: true, category: 'medical', reply: DEFLECT_REPLY.medical, citations: [] };
  }
  return { ok: true, deflected: false, reply: text, citations: input.grounding.map((g) => g.feature_key), usage: res.usageMetadata };
}
