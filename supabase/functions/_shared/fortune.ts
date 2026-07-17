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
import type { BucketInfo } from './pillar.ts';

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

// ── One day's fan-out (audit M3) ─────────────────────────────────────────────────────────────────
// 61 buckets × one sync Gemini call. Three properties the old in-handler loop lacked:
//   * bounded concurrency — it awaited each bucket in turn, so the wall clock was 61 × latency,
//     which at a few seconds a call runs past the Edge Function's wall-clock budget and gets the
//     invocation killed partway through. FORTUNE_CONCURRENCY at a time turns that into ~11 waves.
//   * resume — a re-run regenerates only what is actually missing for (date, locale), so recovering
//     from a bad night costs the failures, not another 61 calls. `force` keeps the old
//     refresh-everything behaviour for a deliberate re-generate (the handler's `force: true`).
//   * an honest verdict — every failure is *named* (`missing`) rather than counted, so the caller
//     can say which buckets are absent instead of returning "200, some worked".
// Injectable (geminiCall/existing/upsert) so all three are unit-testable without network or DB.
export const FORTUNE_CONCURRENCY = 6;

export interface FortuneFailure {
  bucket: string;
  reason: string;
  detail?: string;
}
export interface FortuneDayInput {
  date: string;
  locale: string;
  systemInstruction: string;
  buckets: BucketInfo[];
  geminiCall: GeminiCall;
  /** Buckets already stored for (date, locale) — skipped unless `force`. */
  existing: () => PromiseLike<string[]>;
  upsert: (bucket: string, content: Record<string, unknown>) => PromiseLike<{ error: unknown }>;
  concurrency?: number;
  force?: boolean;
}
export interface FortuneDayResult {
  date: string;
  locale: string;
  total: number;
  skipped: number;
  generated: number;
  failed: number;
  /** The buckets still absent after this run. Empty ⇔ the day is complete. */
  missing: string[];
  failures: FortuneFailure[];
}

/** The day is complete only when nothing is missing. The handler MUST NOT return 200 otherwise. */
export function fortuneDayComplete(r: FortuneDayResult): boolean {
  return r.missing.length === 0;
}

export async function generateFortuneDay(input: FortuneDayInput): Promise<FortuneDayResult> {
  const limit = Math.max(1, input.concurrency ?? FORTUNE_CONCURRENCY);
  const done = input.force ? new Set<string>() : new Set(await input.existing());
  const todo = input.buckets.filter((b) => !done.has(b.bucket));
  const failures: FortuneFailure[] = [];
  let generated = 0;
  let cursor = 0;

  // A worker pool over a shared cursor: `limit` in flight, no wave barrier, so one slow bucket
  // never idles the rest. Safe without a lock — the read-and-increment has no await inside it.
  const worker = async (): Promise<void> => {
    for (;;) {
      const i = cursor++;
      if (i >= todo.length) return;
      const b = todo[i];
      try {
        const r = await generateFortune({
          date: input.date,
          bucket: b.bucket,
          element: b.element,
          dayPillar: b.day_pillar,
          locale: input.locale,
          systemInstruction: input.systemInstruction,
          geminiCall: input.geminiCall,
        });
        if (!r.ok) {
          failures.push({ bucket: b.bucket, reason: r.failureReason, detail: r.detail });
          continue;
        }
        const { error } = await input.upsert(b.bucket, r.content);
        if (error) {
          failures.push({ bucket: b.bucket, reason: 'upsert_failed', detail: errText(error) });
          continue;
        }
        generated++;
      } catch (e) {
        // Still best-effort per bucket — one bad bucket must not abort the other 60 — but the
        // failure is now recorded and surfaced instead of being swallowed into a counter.
        failures.push({ bucket: b.bucket, reason: 'unhandled', detail: errText(e) });
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, todo.length) }, worker));

  return {
    date: input.date,
    locale: input.locale,
    total: input.buckets.length,
    skipped: input.buckets.length - todo.length,
    generated,
    failed: failures.length,
    missing: failures.map((f) => f.bucket).sort(),
    failures,
  };
}

function errText(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return String(e);
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
