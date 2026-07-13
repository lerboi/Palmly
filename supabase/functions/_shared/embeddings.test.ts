import { assert, assertEquals, assertRejects } from '@std/assert';
import { embedText, EMBED_DIMS, toVectorLiteral } from './embeddings.ts';

Deno.test('toVectorLiteral: pgvector text literal, non-finite → 0', () => {
  assertEquals(toVectorLiteral([0.1, -0.2, 0.3]), '[0.1,-0.2,0.3]');
  assertEquals(toVectorLiteral([1, NaN, Infinity]), '[1,0,0]');
});

Deno.test('embedText: posts to embedContent and returns the values (mock)', async () => {
  const vec = Array.from({ length: EMBED_DIMS }, (_, i) => i / EMBED_DIMS);
  let sentDims = 0;
  const mockFetch = ((_url: string, init: RequestInit) => {
    sentDims = (JSON.parse(init.body as string) as { outputDimensionality: number }).outputDimensionality;
    return Promise.resolve(new Response(JSON.stringify({ embedding: { values: vec } }), { status: 200 }));
  }) as unknown as typeof fetch;
  const out = await embedText('deep heart line', { apiKey: 'k', fetchImpl: mockFetch });
  assertEquals(out.length, EMBED_DIMS);
  assertEquals(sentDims, EMBED_DIMS);
});

Deno.test('embedText: a wrong-width vector is rejected (never stored against vector(1024))', async () => {
  const mockFetch = (() => Promise.resolve(new Response(JSON.stringify({ embedding: { values: [1, 2, 3] } }), { status: 200 }))) as unknown as typeof fetch;
  await assertRejects(() => embedText('x', { apiKey: 'k', fetchImpl: mockFetch }));
});

Deno.test('embedText: an API error surfaces (never a silent empty vector)', async () => {
  const mockFetch = (() => Promise.resolve(new Response('nope', { status: 400 }))) as unknown as typeof fetch;
  await assertRejects(() => embedText('x', { apiKey: 'k', fetchImpl: mockFetch, retry: { maxRetries: 0 } }));
});

Deno.test('embedText: missing key throws a config error', async () => {
  const prev = Deno.env.get('GEMINI_API_KEY');
  Deno.env.delete('GEMINI_API_KEY');
  try {
    await assertRejects(() => embedText('x'));
  } finally {
    if (prev !== undefined) Deno.env.set('GEMINI_API_KEY', prev);
  }
});
