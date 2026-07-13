// Daily fortune generation (Backend §10, §3.2). One fortune per (date × pillar_bucket × locale) —
// the model writes almanac content for a shared day-master element; we validate it against the
// fortune schema and content-safety-scan it (no medical/lifespan/financial claims). Pure/injectable
// (geminiCall) so the generation + validation are unit-testable without the network. The
// fortune-generate function loops the 60+generic buckets (pillar.ts `allPillarBuckets`); at scale
// these can be batched via the Gemini Batch API (50% off) once paid-tier (H4c) — see Decision Log.
import AjvDefault from 'ajv';
import fortuneSchema from '../../../schemas/fortune.v1.json' with { type: 'json' };
import { toGeminiSchema } from './schema.ts';
import { bannedHits, type GeminiCall, type GeminiResponse } from './narrative.ts';

export const FORTUNE_MODEL = 'gemini-3.1-flash-lite';
export const FORTUNE_PROMPT_VERSION = 'fortune.v1';
export const FORTUNE_SEED = 13;

export interface FortuneInput {
  date: string;
  bucket: string;
  element: string;
  dayPillar: string;
  locale: string;
  systemInstruction: string;
  geminiCall: GeminiCall;
}
export type FortuneResult =
  | { ok: true; content: Record<string, unknown>; usage?: GeminiResponse['usageMetadata'] }
  | { ok: false; failureReason: string; detail?: string };

export function buildFortuneRequest(input: FortuneInput): Record<string, unknown> {
  const payload = { date: input.date, element: input.element, day_pillar: input.dayPillar, locale: input.locale };
  return {
    systemInstruction: { parts: [{ text: input.systemInstruction }] },
    contents: [{ role: 'user', parts: [{ text: `Write the daily fortune for:\n${JSON.stringify(payload)}` }] }],
    generationConfig: { temperature: 0.4, seed: FORTUNE_SEED, responseMimeType: 'application/json', responseSchema: toGeminiSchema(fortuneSchema as Record<string, unknown>) },
  };
}

type ValidateFn = ((d: unknown) => boolean) & { errors?: unknown };
type AjvInstance = { compile(s: unknown): ValidateFn; errorsText(e?: unknown): string };
const Ajv = AjvDefault as unknown as new (o?: Record<string, unknown>) => AjvInstance;
const ajv = new Ajv({ allErrors: true, strict: false });
const validateFortune = ajv.compile(fortuneSchema);

export async function generateFortune(input: FortuneInput): Promise<FortuneResult> {
  const res = await input.geminiCall(buildFortuneRequest(input));
  const cand = res.candidates?.[0];
  const finish = cand?.finishReason;
  if (finish && finish !== 'STOP') return { ok: false, failureReason: `gemini_finish_${finish.toLowerCase()}` };

  const text = cand?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  let content: Record<string, unknown>;
  try {
    content = JSON.parse(text);
  } catch {
    return { ok: false, failureReason: 'invalid_json', detail: text.slice(0, 120) };
  }
  if (!validateFortune(content)) return { ok: false, failureReason: 'schema_invalid', detail: ajv.errorsText(validateFortune.errors) };

  const arr = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);
  const scan = [content.overall, content.career, content.love, content.wealth, ...arr(content.do), ...arr(content.dont)].join('\n');
  const hits = bannedHits(scan);
  if (hits.length) return { ok: false, failureReason: 'content_safety', detail: hits.join(',') };

  return { ok: true, content, usage: res.usageMetadata };
}

// ── Batch API request construction (for the paid-tier scale path; unit-testable) ────────────────
export interface BatchFortuneItem {
  bucket: string;
  request: Record<string, unknown>;
}
/** Build one Gemini request per bucket for a date/locale — the inputs a Batch job (or a sync loop)
 *  iterates. `buckets` comes from pillar.ts allPillarBuckets(). */
export function buildFortuneBatch(
  date: string,
  locale: string,
  systemInstruction: string,
  buckets: { bucket: string; element: string; day_pillar: string }[],
): BatchFortuneItem[] {
  return buckets.map((b) => ({
    bucket: b.bucket,
    request: buildFortuneRequest({ date, bucket: b.bucket, element: b.element, dayPillar: b.day_pillar, locale, systemInstruction, geminiCall: () => Promise.reject(new Error('request-only')) }),
  }));
}
