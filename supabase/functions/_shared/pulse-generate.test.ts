import { assert, assertEquals } from '@std/assert';
import {
  buildPulseRequest,
  essenceNamesFeature,
  FEATURE_LABEL,
  generatePulse,
  generatePulseDay,
  pulseDayComplete,
  PULSE_PROMPT_VERSION,
  type PulseDayInput,
  type PulseInput,
} from './pulse-generate.ts';
import { PULSE_FEATURE_KEYS } from './pulse.ts';
import type { GeminiResponse } from './narrative.ts';

/**
 * RF1.T4 — the generation core. Mirrors `fortune.test.ts`'s four properties (valid path, reject
 * path, resume, honest incomplete verdict) plus the one rule this surface adds: a free essence that
 * does not NAME the feature turns a personalized card back into a horoscope, so it is rejected.
 */

const validPulse = {
  essence: 'Your heart line favours patience on a Fire Rooster day.',
  reading: 'A day the tradition would read as slow warmth. Your heart line does its best work when it is not hurried.',
  career: 'Warmth lands better than pressure in a room you need something from.',
  love: 'The honest sentence, said plainly, is the one that carries.',
  wealth: 'A day that favours holding a position rather than chasing one.',
  watch: 'Notice the urge to explain yourself twice.',
  chapter_tone: 'A stretch that rewards steadiness over reach.',
};

const mock = (obj: unknown, finishReason = 'STOP') => (): Promise<GeminiResponse> =>
  Promise.resolve({
    candidates: [{ finishReason, content: { parts: [{ text: typeof obj === 'string' ? obj : JSON.stringify(obj) }] } }],
    usageMetadata: { promptTokenCount: 1000, candidatesTokenCount: 400 },
  });

const input = (geminiCall: () => Promise<GeminiResponse>, featureKey = 'heart'): PulseInput => ({
  date: '2026-07-26',
  featureKey,
  dayPillar: '甲子',
  element: 'wood',
  animal: 'Rat',
  locale: 'en',
  systemInstruction: 'test',
  geminiCall,
});

// ── Single generation ────────────────────────────────────────────────────────────────────────────

Deno.test('generatePulse: valid JSON → ok, and the essence rides through', async () => {
  const r = await generatePulse(input(mock(validPulse)));
  assert(r.ok);
  if (r.ok) assertEquals(r.content.essence, validPulse.essence);
});

Deno.test('generatePulse: missing or extra fields → schema_invalid', async () => {
  const { watch: _drop, ...missing } = validPulse;
  const a = await generatePulse(input(mock(missing)));
  assert(!a.ok && a.failureReason === 'schema_invalid');

  const b = await generatePulse(input(mock({ ...validPulse, extra: 'nope' })));
  assert(!b.ok && b.failureReason === 'schema_invalid', 'additionalProperties:false is the contract');
});

Deno.test('generatePulse: an over-length essence is rejected (it must fit the card)', async () => {
  const long = 'Your heart line asks for patience today, and for a slowness that the whole rest of this sentence is busy demonstrating well past ninety characters.';
  assert(long.length > 90);
  const r = await generatePulse(input(mock({ ...validPulse, essence: long })));
  assert(!r.ok && r.failureReason === 'schema_invalid');
});

Deno.test('generatePulse: MAX_TOKENS / invalid JSON / content-safety all fail closed', async () => {
  assert(!(await generatePulse(input(mock('', 'MAX_TOKENS')))).ok);
  assert(!(await generatePulse(input(mock('nope')))).ok);
  const unsafe = await generatePulse(input(mock({ ...validPulse, wealth: 'invest in stocks today for guaranteed profit' })));
  assert(!unsafe.ok && unsafe.failureReason === 'content_safety');
});

Deno.test('generatePulse: a generic essence is REJECTED — the free line must name the feature', async () => {
  const generic = await generatePulse(input(mock({ ...validPulse, essence: 'A day that favours patience and small beginnings.' })));
  assert(!generic.ok && generic.failureReason === 'essence_generic', 'this is the whole difference from a horoscope');
});

Deno.test('essenceNamesFeature: accepts the label, its head noun, and the raw key', () => {
  assert(essenceNamesFeature('Your heart line favours patience.', 'heart'));
  assert(essenceNamesFeature('Your heart is slow to hurry today.', 'heart'));
  assert(essenceNamesFeature('Your hand shape reads Earth today.', 'hand_shape'));
  assert(essenceNamesFeature('Your brows sit level today.', 'eyebrows'), 'the label, not the key');
  assert(essenceNamesFeature('Your under-eye reads rested.', 'canthus'));
  assert(!essenceNamesFeature('A calm day for quiet plans.', 'heart'));
});

Deno.test('FEATURE_LABEL: every generated feature key has a human name', () => {
  for (const k of PULSE_FEATURE_KEYS) assert(FEATURE_LABEL[k], `${k} has no label — the push would say "${k}"`);
});

Deno.test('buildPulseRequest: pins the schema, the seed, and the versioned prompt', () => {
  const req = buildPulseRequest(input(mock(validPulse))) as {
    generationConfig: { seed: number; responseSchema: unknown; temperature: number };
    contents: [{ parts: [{ text: string }] }];
  };
  assertEquals(req.generationConfig.seed, 17);
  assertEquals(req.generationConfig.temperature, 0.4);
  assert(req.generationConfig.responseSchema, 'constrained decoding is on');
  const text = req.contents[0].parts[0].text;
  assert(text.includes('"feature_key":"heart"'));
  assert(text.includes('"feature_label":"heart line"'), 'the model is told how to say it out loud');
  assert(text.includes('"animal":"Rat"'));
  assertEquals(PULSE_PROMPT_VERSION, 'pulse.v1');
});

// ── The day fan-out ──────────────────────────────────────────────────────────────────────────────

/** A day harness. The feature a call belongs to is recovered from the REQUEST, not from call order
 *  — with concurrency there is no meaningful "current" feature. */
function dayHarness(opts: { fail?: string[]; existing?: string[]; upsertFail?: string[] } = {}) {
  const fail = new Set(opts.fail ?? []);
  const upsertFail = new Set(opts.upsertFail ?? []);
  const calls: string[] = [];
  const upserted: string[] = [];
  let inFlight = 0;
  let maxInFlight = 0;

  const geminiCall = async (body: unknown): Promise<GeminiResponse> => {
    const text = (body as { contents: [{ parts: [{ text: string }] }] }).contents[0].parts[0].text;
    const payload = JSON.parse(text.slice(text.indexOf('{'))) as { feature_key: string; feature_label: string };
    const key = payload.feature_key;
    calls.push(key);
    inFlight++;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((r) => setTimeout(r, 1));
    inFlight--;
    if (fail.has(key)) return { candidates: [{ finishReason: 'SAFETY', content: { parts: [{ text: '' }] } }] };
    // The essence must name the feature or the generator rejects it — so the mock names it.
    return mock({ ...validPulse, essence: `Your ${payload.feature_label} reads clearly today.` })();
  };

  const day = (over: Partial<PulseDayInput> = {}): PulseDayInput => ({
    date: '2026-07-26',
    locale: 'en',
    dayPillar: '甲子',
    element: 'wood',
    animal: 'Rat',
    systemInstruction: 'test',
    geminiCall,
    existing: () => Promise.resolve(opts.existing ?? []),
    upsert: (featureKey) => {
      if (upsertFail.has(featureKey)) return Promise.resolve({ error: { message: 'db down' } });
      upserted.push(featureKey);
      return Promise.resolve({ error: null });
    },
    ...over,
  });

  return { day, calls, upserted, maxInFlight: () => maxInFlight };
}

Deno.test('generatePulseDay: a clean night writes all 15 features and reports complete', async () => {
  const h = dayHarness();
  const r = await generatePulseDay(h.day());
  assertEquals(r.total, 15);
  assertEquals(r.generated, 15);
  assertEquals(r.failed, 0);
  assertEquals(r.missing, []);
  assert(pulseDayComplete(r));
  assertEquals(new Set(h.upserted).size, 15, 'one row per feature');
});

Deno.test('generatePulseDay: concurrency is bounded (a 15-call wall clock, not a serial one)', async () => {
  const h = dayHarness();
  await generatePulseDay(h.day({ concurrency: 4 }));
  assert(h.maxInFlight() <= 4, `ran ${h.maxInFlight()} in flight`);
  assert(h.maxInFlight() > 1, 'and it really is concurrent');
});

Deno.test('generatePulseDay: resume — an existing feature is skipped, not regenerated', async () => {
  const h = dayHarness({ existing: ['heart', 'head', 'life'] });
  const r = await generatePulseDay(h.day());
  assertEquals(r.skipped, 3);
  assertEquals(r.generated, 12);
  assert(!h.calls.includes('heart'), 'a stored feature costs nothing on retry');
  assert(pulseDayComplete(r));
});

Deno.test('generatePulseDay: force regenerates everything, including stored features', async () => {
  const h = dayHarness({ existing: ['heart', 'head', 'life'] });
  const r = await generatePulseDay(h.day({ force: true }));
  assertEquals(r.skipped, 0);
  assertEquals(r.generated, 15);
  assert(h.calls.includes('heart'));
});

Deno.test('generatePulseDay: a partial night NAMES the missing features and is not complete', async () => {
  const h = dayHarness({ fail: ['fate', 'mouth'] });
  const r = await generatePulseDay(h.day());
  assertEquals(r.generated, 13);
  assertEquals(r.failed, 2);
  assertEquals(r.missing, ['fate', 'mouth']);
  assert(!pulseDayComplete(r), 'the handler must 500 pulse_incomplete on this');
  assertEquals(r.failures.map((f) => f.reason).sort(), ['gemini_finish_safety', 'gemini_finish_safety']);
});

Deno.test('generatePulseDay: an upsert failure counts as missing, not as generated', async () => {
  const h = dayHarness({ upsertFail: ['eyes'] });
  const r = await generatePulseDay(h.day());
  assertEquals(r.missing, ['eyes']);
  assertEquals(r.failures[0].reason, 'upsert_failed');
  assert(!pulseDayComplete(r));
});

Deno.test('generatePulseDay: one thrown call does not abort the other fourteen', async () => {
  const h = dayHarness();
  let first = true;
  const r = await generatePulseDay(
    h.day({
      geminiCall: (body) => {
        if (first) {
          first = false;
          throw new Error('socket hang up');
        }
        return h.day().geminiCall(body);
      },
    }),
  );
  assertEquals(r.failed, 1);
  assertEquals(r.generated, 14);
  assertEquals(r.failures[0].reason, 'unhandled');
});
