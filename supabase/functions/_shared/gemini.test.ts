import { assertEquals } from '@std/assert';
import { withRetry } from './gemini.ts';

const resp = (status: number) => new Response('body', { status });

Deno.test('retries on 429 then succeeds', async () => {
  let calls = 0;
  const res = await withRetry(() => {
    calls++;
    return Promise.resolve(calls < 3 ? resp(429) : resp(200));
  }, { baseDelayMs: 0 });
  assertEquals(res.status, 200);
  assertEquals(calls, 3);
});

Deno.test('does not retry on a 4xx (non-429)', async () => {
  let calls = 0;
  const res = await withRetry(() => {
    calls++;
    return Promise.resolve(resp(400));
  }, { baseDelayMs: 0 });
  assertEquals(res.status, 400);
  assertEquals(calls, 1);
});

Deno.test('exhausts retries on persistent 503 and returns the last response', async () => {
  let calls = 0;
  const res = await withRetry(() => {
    calls++;
    return Promise.resolve(resp(503));
  }, { maxRetries: 2, baseDelayMs: 0 });
  assertEquals(res.status, 503);
  assertEquals(calls, 3); // initial attempt + 2 retries
});
