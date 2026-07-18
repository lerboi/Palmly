import { assertEquals, assertRejects } from '@std/assert';
import { AppError } from './http.ts';
import { enforceRateLimit } from './ratelimit.ts';

// A minimal fake of the one method enforceRateLimit uses: admin.rpc('check_rate_limit', …).
// deno-lint-ignore no-explicit-any
const fakeAdmin = (rpc: () => Promise<{ data: unknown; error: unknown }>) => ({ rpc: () => rpc() } as any);

Deno.test('enforceRateLimit: within quota (rpc → true) resolves silently', async () => {
  await enforceRateLimit(fakeAdmin(() => Promise.resolve({ data: true, error: null })), 'scan_create', 'u1');
});

Deno.test('enforceRateLimit: over quota (rpc → false) throws 429 regardless of failClosed', async () => {
  for (const opts of [undefined, { failClosed: true }, { failClosed: false }]) {
    const err = await assertRejects(
      () => enforceRateLimit(fakeAdmin(() => Promise.resolve({ data: false, error: null })), 'scan_create', 'u1', opts),
      AppError,
    );
    assertEquals((err as AppError).status, 429);
  }
});

Deno.test('enforceRateLimit: a counter ERROR fails OPEN by default (resolves)', async () => {
  // preserves the invite/chat/compat posture — those have real backstops behind the counter
  await enforceRateLimit(fakeAdmin(() => Promise.resolve({ data: null, error: { message: 'lock timeout' } })), 'invite_create', 'u1');
});

Deno.test('enforceRateLimit: a counter ERROR with failClosed throws a retryable 503', async () => {
  const err = await assertRejects(
    () => enforceRateLimit(fakeAdmin(() => Promise.resolve({ data: null, error: { message: 'lock timeout' } })), 'scan_create', 'u1', { failClosed: true }),
    AppError,
    'briefly busy',
  );
  assertEquals((err as AppError).status, 503);
});

Deno.test('enforceRateLimit: no subject → no-op (nothing to key on)', async () => {
  let called = false;
  await enforceRateLimit(
    fakeAdmin(() => {
      called = true;
      return Promise.resolve({ data: true, error: null });
    }),
    'scan_create',
    null,
    { failClosed: true },
  );
  assertEquals(called, false);
});
