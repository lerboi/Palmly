// Today's Line generation (Audit-5 · 03 §3). A direct sibling of `_shared/fortune.ts`, and
// deliberately so: same worker-pool-with-resume shape, same "a partial day is a FAILED day" verdict,
// same injectable seams (geminiCall / existing / upsert) so the whole thing is unit-testable with no
// network and no DB.
//
// What differs from the fortune generator, and why: the fan-out is per FEATURE, not per birth-date
// bucket — 15 rows a day instead of 61, because the day-pillar belongs to the DATE. That is a ~4×
// cost drop AND it makes birth date optional for this feature, which is the point (03 §2.1).
import AjvDefault from 'ajv';
import pulseSchema from '../../../schemas/pulse.v1.json' with { type: 'json' };
import { toGeminiSchema } from './schema.ts';
import { bannedHits, type GeminiCall, type GeminiResponse } from './narrative.ts';
import { PULSE_FEATURE_KEYS } from './pulse.ts';

export const PULSE_MODEL = 'gemini-3.1-flash-lite';
export const PULSE_PROMPT_VERSION = 'pulse.v1';
/** Next in the pinned-seed series (extraction 7 / narrative 11 / fortune 13). */
export const PULSE_SEED = 17;
/** Same pool size as the fortune run — 15 features is ~3 waves. */
export const PULSE_CONCURRENCY = 6;

/**
 * The human name each feature goes by in prose and in the push. The model is given this so it never
 * has to guess how to say `hand_shape` out loud, and the push copy reuses the same table so the
 * notification and the card name the feature identically.
 */
export const FEATURE_LABEL: Record<string, string> = {
  heart: 'heart line',
  head: 'head line',
  life: 'life line',
  fate: 'fate line',
  hand_shape: 'hand shape',
  mounts: 'mounts',
  markings: 'markings',
  face_shape: 'elemental face',
  proportion: 'proportions',
  eyes: 'eyes',
  eyebrows: 'brows',
  nose: 'nose',
  mouth: 'mouth',
  ears: 'ears',
  canthus: 'under-eye',
};

export interface PulseInput {
  date: string;
  featureKey: string;
  /** The DATE's own pillar (甲子), element (wood…) and branch animal (Rat…) — context, not a bucket. */
  dayPillar: string;
  element: string;
  animal: string;
  locale: string;
  systemInstruction: string;
  geminiCall: GeminiCall;
}

export type PulseResult =
  | { ok: true; content: Record<string, unknown>; usage?: GeminiResponse['usageMetadata'] }
  | { ok: false; failureReason: string; detail?: string };

export function buildPulseRequest(input: PulseInput): Record<string, unknown> {
  const payload = {
    date: input.date,
    feature_key: input.featureKey,
    feature_label: FEATURE_LABEL[input.featureKey] ?? input.featureKey,
    day_pillar: input.dayPillar,
    element: input.element,
    animal: input.animal,
    locale: input.locale,
  };
  return {
    systemInstruction: { parts: [{ text: input.systemInstruction }] },
    contents: [{ role: 'user', parts: [{ text: `Write today's line for:\n${JSON.stringify(payload)}` }] }],
    generationConfig: {
      temperature: 0.4,
      seed: PULSE_SEED,
      responseMimeType: 'application/json',
      responseSchema: toGeminiSchema(pulseSchema as Record<string, unknown>),
    },
  };
}

type ValidateFn = ((d: unknown) => boolean) & { errors?: unknown };
type AjvInstance = { compile(s: unknown): ValidateFn; errorsText(e?: unknown): string };
const Ajv = AjvDefault as unknown as new (o?: Record<string, unknown>) => AjvInstance;
const ajv = new Ajv({ allErrors: true, strict: false });
const validatePulse = ajv.compile(pulseSchema);

/** The free line must actually name the feature — it is the entire free tier of this surface. */
export function essenceNamesFeature(essence: string, featureKey: string): boolean {
  const label = (FEATURE_LABEL[featureKey] ?? featureKey).toLowerCase();
  const text = essence.toLowerCase();
  // Accept the label, its head noun ("heart line" → "heart"), or the raw key with _ as a space.
  const head = label.split(' ')[0];
  return text.includes(label) || text.includes(head) || text.includes(featureKey.replace(/_/g, ' '));
}

export async function generatePulse(input: PulseInput): Promise<PulseResult> {
  const res = await input.geminiCall(buildPulseRequest(input));
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
  if (!validatePulse(content)) return { ok: false, failureReason: 'schema_invalid', detail: ajv.errorsText(validatePulse.errors) };

  const scan = [content.essence, content.reading, content.career, content.love, content.wealth, content.watch, content.chapter_tone].join('\n');
  const hits = bannedHits(scan);
  if (hits.length) return { ok: false, failureReason: 'content_safety', detail: hits.join(',') };

  // The one content rule the schema cannot express. A generic essence ("A day that favors
  // patience.") would silently turn the personalized surface back into a horoscope — the exact
  // failure this whole feature exists to avoid — so it is a REJECT, not a warning.
  if (!essenceNamesFeature(String(content.essence), input.featureKey)) {
    return { ok: false, failureReason: 'essence_generic', detail: String(content.essence).slice(0, 90) };
  }

  return { ok: true, content, usage: res.usageMetadata };
}

// ── One day's fan-out ────────────────────────────────────────────────────────────────────────────

export interface PulseFailure {
  featureKey: string;
  reason: string;
  detail?: string;
}
export interface PulseDayInput {
  date: string;
  locale: string;
  dayPillar: string;
  element: string;
  animal: string;
  systemInstruction: string;
  featureKeys?: readonly string[];
  geminiCall: GeminiCall;
  /** Feature keys already stored for (date, locale) — skipped unless `force`. */
  existing: () => PromiseLike<string[]>;
  upsert: (featureKey: string, content: Record<string, unknown>) => PromiseLike<{ error: unknown }>;
  concurrency?: number;
  force?: boolean;
}
export interface PulseDayResult {
  date: string;
  locale: string;
  total: number;
  skipped: number;
  generated: number;
  failed: number;
  /** The feature keys still absent after this run. Empty ⇔ the day is complete. */
  missing: string[];
  failures: PulseFailure[];
}

/** The day is complete only when nothing is missing. The handler MUST NOT return 200 otherwise. */
export function pulseDayComplete(r: PulseDayResult): boolean {
  return r.missing.length === 0;
}

export async function generatePulseDay(input: PulseDayInput): Promise<PulseDayResult> {
  const keys = input.featureKeys ?? PULSE_FEATURE_KEYS;
  const limit = Math.max(1, input.concurrency ?? PULSE_CONCURRENCY);
  const done = input.force ? new Set<string>() : new Set(await input.existing());
  const todo = keys.filter((k) => !done.has(k));
  const failures: PulseFailure[] = [];
  let generated = 0;
  let cursor = 0;

  // A worker pool over a shared cursor — `limit` in flight, no wave barrier, so one slow feature
  // never idles the rest. Safe without a lock: the read-and-increment has no await inside it.
  const worker = async (): Promise<void> => {
    for (;;) {
      const i = cursor++;
      if (i >= todo.length) return;
      const featureKey = todo[i];
      try {
        const r = await generatePulse({
          date: input.date,
          featureKey,
          dayPillar: input.dayPillar,
          element: input.element,
          animal: input.animal,
          locale: input.locale,
          systemInstruction: input.systemInstruction,
          geminiCall: input.geminiCall,
        });
        if (!r.ok) {
          failures.push({ featureKey, reason: r.failureReason, detail: r.detail });
          continue;
        }
        const { error } = await input.upsert(featureKey, r.content);
        if (error) {
          failures.push({ featureKey, reason: 'upsert_failed', detail: errText(error) });
          continue;
        }
        generated++;
      } catch (e) {
        // Best-effort per feature — one bad feature must not abort the other 14 — but the failure is
        // NAMED and surfaced rather than swallowed into a counter (the M3 lesson).
        failures.push({ featureKey, reason: 'unhandled', detail: errText(e) });
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, todo.length) }, worker));

  return {
    date: input.date,
    locale: input.locale,
    total: keys.length,
    skipped: keys.length - todo.length,
    generated,
    failed: failures.length,
    missing: failures.map((f) => f.featureKey).sort(),
    failures,
  };
}

function errText(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return String(e);
}
