// Compatibility narrative (Backend §7.3). The score + sub_scores are ground truth (the compat.v1
// scorer); Gemini Flash-Lite only writes prose. Same deterministic-graft discipline as the reading
// narrative (P5.T6): the three section keys (strengths/frictions/advice) are code-set, the model
// fills headline/score_line/bodies, and a KB-free deterministic fallback guarantees non-empty
// output. Content-safety re-scan blocks any banned claim the model might smuggle in.
import AjvDefault from 'ajv';
import compatSchema from '../../../schemas/compat_sections.v1.json' with { type: 'json' };
import { bannedHits, type GeminiCall, type GeminiResponse } from './narrative.ts';

export const COMPAT_NARRATIVE_MODEL = 'gemini-3.1-flash-lite';
export const COMPAT_PROMPT_VERSION = 'compat.v1';

const SECTION_KEYS = ['strengths', 'frictions', 'advice'] as const;
const DEFAULT_TITLES: Record<string, string> = { strengths: 'Where you align', frictions: 'Where you differ', advice: 'A gentle suggestion' };
const SUB_LABEL: Record<string, string> = { emotion: 'emotional resonance', mind: 'how you think', life_energy: 'day-to-day energy', destiny: 'sense of direction', elements: 'elemental chemistry' };

type Rec = Record<string, unknown>;
const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);

export interface CompatNarrativeInput {
  composite: number;
  subScores: Record<string, number>;
  handA: string;
  handB: string;
  nameA?: string;
  nameB?: string;
  systemInstruction: string;
  geminiCall: GeminiCall;
}
export interface CompatSection { key: string; title: string; body: string }
export interface CompatNarrative { headline: string; score_line?: string; sections: CompatSection[]; disclaimer?: string }
export type CompatResult =
  | { ok: true; narrative: CompatNarrative; usage?: GeminiResponse['usageMetadata'] }
  | { ok: false; failureReason: string; detail?: string };

const LLM_SCHEMA = {
  type: 'object',
  properties: {
    headline: { type: 'string' },
    score_line: { type: 'string' },
    sections: { type: 'array', items: { type: 'object', properties: { key: { type: 'string' }, title: { type: 'string' }, body: { type: 'string' } }, required: ['key', 'title', 'body'] } },
    disclaimer: { type: 'string' },
  },
  required: ['headline', 'sections'],
};

export function buildCompatRequest(input: CompatNarrativeInput): Record<string, unknown> {
  const payload = { composite: input.composite, sub_scores: input.subScores, hand_a: input.handA, hand_b: input.handB, name_a: input.nameA ?? null, name_b: input.nameB ?? null };
  return {
    systemInstruction: { parts: [{ text: input.systemInstruction }] },
    contents: [{ role: 'user', parts: [{ text: `Write the compatibility reading for:\n${JSON.stringify(payload)}` }] }],
    generationConfig: { temperature: 0.2, responseMimeType: 'application/json', responseSchema: LLM_SCHEMA },
  };
}

const topSub = (subs: Record<string, number>): string => SUB_LABEL[Object.entries(subs).sort((a, b) => b[1] - a[1])[0]?.[0]] ?? 'what you share';
const lowSub = (subs: Record<string, number>): string => SUB_LABEL[Object.entries(subs).sort((a, b) => a[1] - b[1])[0]?.[0]] ?? 'your differences';

function fallbackBody(key: string, input: CompatNarrativeInput): string {
  if (key === 'strengths') return `You align most in ${topSub(input.subScores)} — a natural meeting point between a ${input.handA} hand and a ${input.handB} hand.`;
  if (key === 'frictions') return `You differ most in ${lowSub(input.subScores)} — texture to work with, not a wall between you.`;
  return `Lean into ${topSub(input.subScores)}, and give each other room where you differ.`;
}

function graft(llmSections: Rec[], input: CompatNarrativeInput): CompatSection[] {
  const byKey = new Map<string, Rec>();
  for (const s of llmSections) if (str(s.key)) byKey.set(str(s.key)!, s);
  return SECTION_KEYS.map((k) => {
    const m = byKey.get(k);
    const body = str(m?.body)?.trim();
    return { key: k, title: str(m?.title)?.trim() || DEFAULT_TITLES[k], body: body && body.length > 0 ? body : fallbackBody(k, input) };
  });
}

type ValidateFn = ((d: unknown) => boolean) & { errors?: unknown };
type AjvInstance = { compile(s: unknown): ValidateFn; errorsText(e?: unknown): string };
const Ajv = AjvDefault as unknown as new (o?: Record<string, unknown>) => AjvInstance;
const ajv = new Ajv({ allErrors: true, strict: false });
const validateCompat = ajv.compile(compatSchema);

export async function generateCompatNarrative(input: CompatNarrativeInput): Promise<CompatResult> {
  const res = await input.geminiCall(buildCompatRequest(input));
  const cand = res.candidates?.[0];
  const finish = cand?.finishReason;
  if (finish && finish !== 'STOP') return { ok: false, failureReason: `gemini_finish_${finish.toLowerCase()}` };

  const text = cand?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  let raw: Rec;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, failureReason: 'invalid_json', detail: text.slice(0, 120) };
  }

  const narrative: CompatNarrative = {
    headline: str(raw.headline)?.trim() || `${cap(input.handA)} meets ${cap(input.handB)}`,
    score_line: str(raw.score_line)?.trim(),
    sections: graft(Array.isArray(raw.sections) ? (raw.sections as Rec[]) : [], input),
    disclaimer: str(raw.disclaimer)?.trim() || 'For reflection and entertainment.',
  };
  if (!validateCompat(narrative)) return { ok: false, failureReason: 'schema_invalid', detail: ajv.errorsText(validateCompat.errors) };

  const scan = [narrative.headline, narrative.score_line ?? '', ...narrative.sections.flatMap((s) => [s.title, s.body])].join('\n');
  const hits = bannedHits(scan);
  if (hits.length) return { ok: false, failureReason: 'content_safety', detail: hits.join(',') };

  return { ok: true, narrative, usage: res.usageMetadata };
}

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
