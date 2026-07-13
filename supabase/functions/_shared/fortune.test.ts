import { assert, assertEquals } from '@std/assert';
import { buildFortuneBatch, generateFortune, type FortuneInput } from './fortune.ts';
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
