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
