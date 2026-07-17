import { assert, assertEquals } from '@std/assert';
import { buildFortuneBatch, fortuneDayComplete, generateFortune, generateFortuneDay, type FortuneDayInput, type FortuneInput } from './fortune.ts';
import { allPillarBuckets } from './pillar.ts';
import type { GeminiResponse } from './narrative.ts';

const validFortune = {
  overall: 'A day that favours patience and small beginnings.',
  career: 'Steady focus moves a stalled task forward.',
  love: 'A warm word lands better than a grand gesture.',
  wealth: 'A day that favours saving over spending.',
  do: ['Send the message you drafted', 'Take the slower route'],
  dont: ['Force a decision before noon'],
  lucky_direction: 'East',
  lucky_color: 'Jade green',
  lucky_hours: '9–11am',
};

const mock = (obj: unknown, finishReason = 'STOP') => (): Promise<GeminiResponse> =>
  Promise.resolve({ candidates: [{ finishReason, content: { parts: [{ text: typeof obj === 'string' ? obj : JSON.stringify(obj) }] } }], usageMetadata: { promptTokenCount: 2000, candidatesTokenCount: 400 } });

const input = (geminiCall: () => Promise<GeminiResponse>): FortuneInput => ({ date: '2026-07-14', bucket: 'jiazi', element: 'wood', dayPillar: '甲子', locale: 'en', systemInstruction: 'test', geminiCall });

Deno.test('generateFortune: valid almanac JSON → ok', async () => {
  const r = await generateFortune(input(mock(validFortune)));
  assert(r.ok);
  if (r.ok) assertEquals(r.content.lucky_direction, 'East');
});

Deno.test('generateFortune: bad enum / missing field → schema_invalid', async () => {
  assert(!(await generateFortune(input(mock({ ...validFortune, lucky_direction: 'Up' })))).ok);
  const { overall: _drop, ...missing } = validFortune;
  assert(!(await generateFortune(input(mock(missing)))).ok);
});

Deno.test('generateFortune: MAX_TOKENS / invalid JSON / content-safety fail', async () => {
  assert(!(await generateFortune(input(mock('', 'MAX_TOKENS')))).ok);
  assert(!(await generateFortune(input(mock('nope')))).ok);
  const unsafe = await generateFortune(input(mock({ ...validFortune, wealth: 'invest in stocks today for guaranteed profit' })));
  assert(!unsafe.ok && unsafe.failureReason === 'content_safety');
});

Deno.test('buildFortuneBatch: one request per bucket for all 61 buckets', () => {
  const items = buildFortuneBatch('2026-07-14', 'en', 'sys', allPillarBuckets());
  assertEquals(items.length, 61, '60 sexagenary + generic');
  assertEquals(new Set(items.map((i) => i.bucket)).size, 61, 'unique buckets');
  assert(items.every((i) => i.request.generationConfig));
});

// ── M3 (B19): the day fan-out — bounded concurrency, resume, and an honest verdict ───────────────

/**
 * A day harness. The bucket a call belongs to is recovered from the REQUEST (its `day_pillar`,
 * which is 1:1 with the bucket) rather than from call order — with concurrency there is no
 * meaningful "current" bucket, and a harness that assumed one would be testing the wrong thing.
 */
function dayHarness(opts: { fail?: string[]; existing?: string[]; upsertFail?: string[] } = {}) {
  const fail = new Set(opts.fail ?? []);
  const upsertFail = new Set(opts.upsertFail ?? []);
  const byPillar = new Map(allPillarBuckets().map((b) => [b.day_pillar, b.bucket]));
  const calls: string[] = [];
  const upserted: string[] = [];
  let inFlight = 0;
  let maxInFlight = 0;

  const geminiCall = async (body: unknown): Promise<GeminiResponse> => {
    const contents = (body as { contents: [{ parts: [{ text: string }] }] }).contents;
    const text = contents[0].parts[0].text;
    const payload = JSON.parse(text.slice(text.indexOf('{'))) as { day_pillar: string };
    const bucket = byPillar.get(payload.day_pillar) ?? '?';
    calls.push(bucket);
    inFlight++;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((r) => setTimeout(r, 2));
    inFlight--;
    if (fail.has(bucket)) return { candidates: [{ finishReason: 'SAFETY', content: { parts: [{ text: '' }] } }] };
    return await mock(validFortune)();
  };

  const day = (over: Partial<FortuneDayInput> = {}): FortuneDayInput => ({
    date: '2026-07-14',
    locale: 'en',
    systemInstruction: 'sys',
    buckets: allPillarBuckets(),
    existing: () => Promise.resolve(opts.existing ?? []),
    upsert: (bucket, _content) => {
      upserted.push(bucket);
      return Promise.resolve({ error: upsertFail.has(bucket) ? { message: 'boom' } : null });
    },
    geminiCall,
    ...over,
  });
  return { day, calls, upserted, max: () => maxInFlight };
}

Deno.test('M3: a partial day is NOT complete — the missing buckets are named, not counted', async () => {
  // The old handler swallowed every per-bucket error into `failed++` and returned 200 regardless,
  // so a bad Gemini night looked like a good one and users found the hole instead of the cron.
  const h = dayHarness({ fail: ['jiazi', 'yichou'] });
  const r = await generateFortuneDay({ ...h.day(), concurrency: 4 });

  assertEquals(r.total, 61);
  assertEquals(r.generated, 59);
  assertEquals(r.failed, 2);
  assertEquals(r.missing, ['jiazi', 'yichou'], 'the shortfall is named so the caller can say WHICH');
  assert(!fortuneDayComplete(r), 'a partial day must not be reportable as complete → handler throws 500');
  assert(r.failures.every((f) => f.reason === 'gemini_finish_safety'));
});

Deno.test('M3: a complete day is complete, and an upsert failure counts as missing', async () => {
  const ok = await generateFortuneDay({ ...dayHarness().day(), concurrency: 4 });
  assertEquals(ok.generated, 61);
  assertEquals(ok.missing, []);
  assert(fortuneDayComplete(ok), 'only a whole day returns 200');

  // A written-nowhere fortune is just as absent as an ungenerated one.
  const bad = await generateFortuneDay({ ...dayHarness({ upsertFail: ['bingyin'] }).day(), concurrency: 4 });
  assertEquals(bad.missing, ['bingyin']);
  assert(!fortuneDayComplete(bad));
  assertEquals(bad.failures[0].reason, 'upsert_failed');
});

Deno.test('M3: concurrency is bounded — never more than the limit in flight', async () => {
  // 61 sequential awaits is 61 × Gemini latency in ONE invocation, which outruns the Edge Function
  // wall clock; unbounded Promise.all would instead throw 61 calls at the rate limiter at once.
  const h = dayHarness();
  const r = await generateFortuneDay({ ...h.day(), concurrency: 6 });
  assertEquals(r.generated, 61, 'every bucket still gets attempted');
  assert(h.max() <= 6, `max in flight ${h.max()} must not exceed 6`);
  assert(h.max() > 1, `must actually be concurrent, saw ${h.max()}`);
});

Deno.test('M3: resume — an existing bucket is skipped, so a retry costs the failures only', async () => {
  const done = allPillarBuckets().slice(0, 58).map((b) => b.bucket);
  const h = dayHarness({ existing: done });
  const r = await generateFortuneDay({ ...h.day(), concurrency: 4 });

  assertEquals(r.skipped, 58, 'the 58 already-stored buckets are not re-generated');
  assertEquals(r.generated, 3);
  assertEquals(h.upserted.length, 3, 'and only the missing three are written');
  assert(fortuneDayComplete(r), 'resuming to a full day is a complete day');
});

Deno.test('M3: force re-generates a bucket that already exists', async () => {
  // The header promises "a re-run refreshes the same rows" — force keeps that available.
  const h = dayHarness({ existing: allPillarBuckets().map((b) => b.bucket) });
  const skip = await generateFortuneDay({ ...h.day(), concurrency: 4 });
  assertEquals(skip.skipped, 61);
  assertEquals(skip.generated, 0, 'nothing to do — and that is still a complete day');
  assert(fortuneDayComplete(skip));

  const forced = await generateFortuneDay({ ...h.day({ force: true }), concurrency: 4 });
  assertEquals(forced.skipped, 0);
  assertEquals(forced.generated, 61);
});
