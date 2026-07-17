import { assertEquals } from '@std/assert';
import { resolveAuth } from './auth-resolve.ts';

const env = { serviceKey: 'sb_secret_XYZ', anonKey: 'sb_publishable_ABC' };

function req(bearer?: string, apikey?: string): Request {
  const h = new Headers();
  if (bearer) h.set('Authorization', `Bearer ${bearer}`);
  if (apikey) h.set('apikey', apikey);
  return new Request('http://local/hello', { headers: h });
}

// a JWT whose payload is {"sub":"user-123"} (base64url, no padding)
function jwtFor(sub: string): string {
  const payload = btoa(JSON.stringify({ sub })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payload}.sig`;
}

Deno.test('service_role key → secret mode', () => {
  assertEquals(resolveAuth(req('sb_secret_XYZ'), env).mode, 'secret');
  assertEquals(resolveAuth(req(undefined, 'sb_secret_XYZ'), env).mode, 'secret'); // via apikey header
});

Deno.test('user JWT → user mode with decoded sub', () => {
  const r = resolveAuth(req(jwtFor('user-123')), env);
  assertEquals(r.mode, 'user');
  assertEquals(r.userId, 'user-123');
});

Deno.test('publishable/anon key or no auth → none mode', () => {
  assertEquals(resolveAuth(req('sb_publishable_ABC'), env).mode, 'none');
  assertEquals(resolveAuth(req(), env).mode, 'none');
  assertEquals(resolveAuth(req(), env).userId, null);
});

// ── Low (B20): the service-key gate is a constant-time compare ───────────────────────────────────

Deno.test('the secret gate still gates: exact key → secret, near-misses → not secret', () => {
  // Swapping `===` for constantTimeEqual is only safe if it is EXACTLY as strict. These are the
  // shapes a hand-rolled compare gets wrong: a prefix, a suffix, a same-length transposition, and
  // the empty string (`if (env.serviceKey && ...)` must keep short-circuiting on a falsy key).
  assertEquals(resolveAuth(req('sb_secret_XYZ'), env).mode, 'secret');
  assertEquals(resolveAuth(req('sb_secret_XY'), env).mode, 'none', 'a prefix of the key is not the key');
  assertEquals(resolveAuth(req('sb_secret_XYZ!'), env).mode, 'none', 'the key plus a byte is not the key');
  assertEquals(resolveAuth(req('sb_secret_XZY'), env).mode, 'none', 'a transposition is not the key');
  assertEquals(resolveAuth(req('sb_secret_xyz'), env).mode, 'none', 'the gate stays case-sensitive');
  assertEquals(resolveAuth(req('sb_secret_XYZ'), { anonKey: 'sb_publishable_ABC' }).mode, 'none', 'no serviceKey configured → nothing is secret');
  assertEquals(resolveAuth(req('sb_secret_XYZ'), { serviceKey: '', anonKey: 'x' }).mode, 'none', 'an empty serviceKey must not match an empty-ish token');
});

Deno.test('the publishable key still resolves to none, and is unaffected by the change', () => {
  assertEquals(resolveAuth(req('sb_publishable_ABC'), env).mode, 'none');
  assertEquals(resolveAuth(req(undefined, 'sb_publishable_ABC'), env).mode, 'none');
});
