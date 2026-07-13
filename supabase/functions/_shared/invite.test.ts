import { assert, assertEquals } from '@std/assert';
import { generateInviteToken, hashToken, inviteUrl } from './invite.ts';

Deno.test('hashToken: deterministic SHA-256 hex (64 chars)', async () => {
  const a = await hashToken('abc');
  const b = await hashToken('abc');
  assertEquals(a, b, 'same token → same hash');
  assert(/^[0-9a-f]{64}$/.test(a), 'sha-256 hex');
  assert((await hashToken('abd')) !== a, 'different token → different hash');
  // known SHA-256("abc") vector
  assertEquals(a, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

Deno.test('generateInviteToken: url-safe token + matching hash; tokens are unique', async () => {
  const { token, tokenHash } = await generateInviteToken();
  assert(/^[A-Za-z0-9_-]+$/.test(token), 'base64url, no +/= chars');
  assert(token.length >= 40, '32 bytes → ~43 chars');
  assertEquals(await hashToken(token), tokenHash, 'hash matches the token');

  const seen = new Set<string>();
  for (let i = 0; i < 50; i++) {
    const t = (await generateInviteToken()).token;
    assert(!seen.has(t), 'tokens are unique across calls');
    seen.add(t);
  }
});

Deno.test('inviteUrl: builds the palmly.app/i/{token} link (raw token only in the link)', () => {
  assertEquals(inviteUrl('TOKEN123'), 'https://palmly.app/i/TOKEN123');
});
