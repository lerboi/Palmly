import { assertEquals } from '@std/assert';
import { errorResponse, jsonResponse, withErrorEnvelope, AppError } from './http.ts';

Deno.test('error envelope has code + message + status', async () => {
  const res = errorResponse('bad_input', 'nope', 422);
  assertEquals(res.status, 422);
  const body = await res.json();
  assertEquals(body.error.code, 'bad_input');
  assertEquals(body.error.message, 'nope');
});

Deno.test('json response defaults to 200', async () => {
  const res = jsonResponse({ a: 1 });
  assertEquals(res.status, 200);
  assertEquals((await res.json()).a, 1);
});

Deno.test('withErrorEnvelope maps a thrown AppError to its envelope + status', async () => {
  const handler = withErrorEnvelope(() => {
    throw new AppError('forbidden', 'no', 403);
  });
  const res = await handler(new Request('http://local/x'));
  assertEquals(res.status, 403);
  assertEquals((await res.json()).error.code, 'forbidden');
});

Deno.test('withErrorEnvelope short-circuits CORS preflight', async () => {
  const handler = withErrorEnvelope(() => jsonResponse({ ok: true }));
  const res = await handler(new Request('http://local/x', { method: 'OPTIONS' }));
  assertEquals(res.status, 200);
});
