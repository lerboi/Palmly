// context.ts — the request gate every function is built on (audit §3.3: untested `_shared`).
//
// Why this file matters more than its 45 lines suggest: `requireMode` IS the in-function half of the
// auth posture (the platform's `verify_jwt` is the other half — see edge-posture.test.ts), and
// `createContext` decides which Supabase client a request gets. Handing a *user* request the
// service-role client would bypass RLS for every table at once — the single highest-consequence
// mistake available here — and until now nothing tested it.
import { assert, assertEquals, assertThrows } from '@std/assert';
import { createContext, requireMode } from './context.ts';
import { AppError } from './http.ts';

const URL_ = 'https://project.supabase.co';
const SERVICE = 'sb_secret_service_role_key';
const ANON = 'sb_publishable_anon_key';

/** Run with the three env vars context.ts requires, restoring whatever was there before. */
function withEnv<T>(vars: Record<string, string | null>, fn: () => T): T {
  const keys = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
  const saved = new Map(keys.map((k) => [k, Deno.env.get(k)]));
  try {
    for (const k of keys) Deno.env.delete(k);
    for (const [k, v] of Object.entries(vars)) if (v !== null) Deno.env.set(k, v);
    return fn();
  } finally {
    for (const k of keys) {
      const v = saved.get(k);
      v === undefined ? Deno.env.delete(k) : Deno.env.set(k, v);
    }
  }
}

const ENV = { SUPABASE_URL: URL_, SUPABASE_ANON_KEY: ANON, SUPABASE_SERVICE_ROLE_KEY: SERVICE };

/** A JWT whose payload is {"sub": <sub>} — unsigned, exactly like a forged one. */
function jwt(sub: string): string {
  const b64 = (o: unknown) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub })}.signature-not-checked-here`;
}

const req = (bearer?: string) =>
  new Request('http://local/fn', { headers: bearer ? { Authorization: `Bearer ${bearer}` } : {} });

Deno.test('createContext: the service key resolves to secret mode with no user', () => {
  withEnv(ENV, () => {
    const ctx = createContext(req(SERVICE));
    assertEquals(ctx.mode, 'secret');
    assertEquals(ctx.userId, null);
    assert(ctx.supabase === ctx.admin, 'secret mode is already privileged — one client, no pretence');
  });
});

Deno.test('createContext: a user JWT gets an RLS-SCOPED client, never the admin one', () => {
  withEnv(ENV, () => {
    const ctx = createContext(req(jwt('user-123')));
    assertEquals(ctx.mode, 'user');
    assertEquals(ctx.userId, 'user-123');
    // The property that matters. If these were the same object, every user-facing function would
    // read and write as service_role — RLS bypassed on every table, silently.
    assert(ctx.supabase !== ctx.admin, 'a user request must NOT be handed the service-role client');
  });
});

Deno.test('createContext: the publishable key and no-auth are both none mode', () => {
  withEnv(ENV, () => {
    assertEquals(createContext(req(ANON)).mode, 'none');
    assertEquals(createContext(req()).mode, 'none');
    assertEquals(createContext(req(ANON)).userId, null);
  });
});

Deno.test('createContext: a missing env var is a 500 config_error, not a half-built client', () => {
  for (const missing of ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) {
    withEnv({ ...ENV, [missing]: null }, () => {
      const e = assertThrows(() => createContext(req(SERVICE)), AppError, 'missing env');
      assertEquals((e as AppError).code, 'config_error');
      assertEquals((e as AppError).status, 500);
      assert((e as AppError).message.includes(missing));
    });
  }
});

Deno.test('createContext: the sub is taken from the JWT WITHOUT verifying it — verify_jwt is load-bearing', () => {
  withEnv(ENV, () => {
    // This is not a bug, it is the documented contract (auth-resolve.ts:19): the platform verifies
    // upstream and we decode. The test exists to make the dependency explicit and impossible to
    // forget — a garbage signature still yields a userId, which is precisely why a user-mode
    // function with verify_jwt=false authenticates as anyone. edge-posture.test.ts guards that.
    const forged = `${btoa(JSON.stringify({ alg: 'none' }))}.${btoa(JSON.stringify({ sub: 'attacker' }))}.zzzz`;
    assertEquals(createContext(req(forged)).userId, 'attacker');
    // a token that merely looks like a JWT but has no parseable payload is refused, not guessed at
    assertEquals(createContext(req('eyJ-not-a-jwt')).mode, 'user');
    assertEquals(createContext(req('eyJ-not-a-jwt')).userId, null);
  });
});

Deno.test('requireMode: allows the listed modes and 403s everything else', () => {
  withEnv(ENV, () => {
    const secret = createContext(req(SERVICE));
    const user = createContext(req(jwt('u1')));
    const none = createContext(req());

    requireMode(secret, 'secret'); // no throw
    requireMode(user, 'user');
    requireMode(none, 'none');
    requireMode(user, 'user', 'secret'); // multi-mode
    requireMode(secret, 'user', 'secret');

    // the worker gate: a user JWT must never satisfy 'secret'. This is what stops any signed-in
    // user from POSTing to worker-scan / cleanup / push-dispatch, all of which are verify_jwt=false
    // and therefore reachable by anyone who can reach the internet.
    const e = assertThrows(() => requireMode(user, 'secret'), AppError, 'requires secret auth');
    assertEquals((e as AppError).code, 'forbidden');
    assertEquals((e as AppError).status, 403);

    assertThrows(() => requireMode(none, 'secret'), AppError);
    assertThrows(() => requireMode(none, 'user'), AppError);
    assertThrows(() => requireMode(secret, 'user'), AppError);
  });
});
