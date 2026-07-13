import { assert, assertEquals } from '@std/assert';
import { generateCompatNarrative, type CompatNarrativeInput } from './compat-narrative.ts';
import type { GeminiResponse } from './narrative.ts';

const mock = (obj: unknown, finishReason = 'STOP') => (): Promise<GeminiResponse> =>
  Promise.resolve({ candidates: [{ finishReason, content: { parts: [{ text: typeof obj === 'string' ? obj : JSON.stringify(obj) }] } }], usageMetadata: { promptTokenCount: 3000, candidatesTokenCount: 700 } });

const base = (geminiCall: () => Promise<GeminiResponse>): CompatNarrativeInput => ({
  composite: 78,
  subScores: { emotion: 88, mind: 60, life_energy: 74, destiny: 82, elements: 92 },
  handA: 'fire',
  handB: 'air',
  systemInstruction: 'test',
  geminiCall,
});

Deno.test('generateCompatNarrative: well-behaved model → schema-valid, 3 grafted sections in order', async () => {
  const r = await generateCompatNarrative(
    base(mock({ headline: 'Fire meets Air', score_line: '78 — you spark.', sections: [{ key: 'strengths', title: 'x', body: 'aligned' }, { key: 'frictions', title: 'y', body: 'differ' }, { key: 'advice', title: 'z', body: 'try' }], disclaimer: 'For reflection and entertainment.' })),
  );
  assert(r.ok);
  if (r.ok) {
    assertEquals(r.narrative.sections.map((s) => s.key), ['strengths', 'frictions', 'advice']);
    assertEquals(r.narrative.disclaimer, 'For reflection and entertainment.');
  }
});

Deno.test('generateCompatNarrative: model omits sections → deterministic KB-free fallback fills them', async () => {
  const r = await generateCompatNarrative(base(mock({ headline: 'H', sections: [] })));
  assert(r.ok);
  if (r.ok) {
    assertEquals(r.narrative.sections.map((s) => s.key), ['strengths', 'frictions', 'advice']);
    assert(r.narrative.sections.every((s) => s.body.length >= 20), 'fallback bodies present');
    // fallback leads with the top/low sub-score dimensions
    assert(r.narrative.sections[0].body.includes('elemental chemistry'), 'top sub-score = elements(92)');
    assert(r.narrative.sections[1].body.includes('how you think'), 'low sub-score = mind(60)');
  }
});

Deno.test('generateCompatNarrative: MAX_TOKENS / invalid JSON / content-safety fail', async () => {
  assert(!(await generateCompatNarrative(base(mock('', 'MAX_TOKENS')))).ok);
  assert(!(await generateCompatNarrative(base(mock('not json')))).ok);
  const unsafe = await generateCompatNarrative(base(mock({ headline: 'this predicts your death', sections: [] })));
  assert(!unsafe.ok && unsafe.failureReason === 'content_safety');
});
