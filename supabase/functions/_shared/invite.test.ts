import { assert, assertEquals } from '@std/assert';
import { deriveShortCode, generateInviteToken, hashToken, INVITE_NAME_MAX, inviteUrl, isAllowedCardUrl, sanitizeInviteContext, SHORT_CODE_HEX } from './invite.ts';

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

// ── M6: invite context is attacker-controlled and renders on the TRUSTED domain ──────────────────

const HOSTS = ['palmly.app', 'rphtdgoggsldshtdbkaj.supabase.co'];

Deno.test('isAllowedCardUrl: only our own origins may supply the OG preview', () => {
  assert(isAllowedCardUrl('https://palmly.app/og-default.png', HOSTS));
  assert(isAllowedCardUrl('https://rphtdgoggsldshtdbkaj.supabase.co/storage/v1/object/public/cards/u/c.png', HOSTS), 'the cards bucket is where real cards live');
  assert(isAllowedCardUrl('https://cdn.palmly.app/x.png', HOSTS), 'subdomains of our site are ours');

  // The attack: the recipient sees this image in their messenger's preview, under our brand.
  assert(!isAllowedCardUrl('https://evil.example/pwn.png', HOSTS), 'attacker-hosted image rejected');
  assert(!isAllowedCardUrl('http://palmly.app/x.png', HOSTS), 'plaintext rejected even on our host');
  assert(!isAllowedCardUrl('https://palmly.app.evil.example/x.png', HOSTS), 'suffix-confusion host rejected');
  assert(!isAllowedCardUrl('javascript:alert(1)', HOSTS), 'non-https scheme rejected');
  assert(!isAllowedCardUrl('not a url', HOSTS));
  assert(!isAllowedCardUrl(`https://palmly.app/${'a'.repeat(600)}.png`, HOSTS), 'absurd length rejected');
});

Deno.test('sanitizeInviteContext: keeps the allowlist, drops everything else', () => {
  const clean = sanitizeInviteContext(
    {
      inviter_name: '  美玲  ',
      reading_id: '11111111-2222-3333-4444-555555555555',
      card_variant: 'feed_4x5',
      card_image_url: 'https://palmly.app/c.png',
      // none of these are part of the contract (schema.sql:120) and must not reach the page
      is_admin: true,
      evil: '<script>',
      card_image_url_2: 'https://evil.example/x.png',
    },
    HOSTS,
  );
  assertEquals(clean, {
    inviter_name: '美玲',
    reading_id: '11111111-2222-3333-4444-555555555555',
    card_variant: 'feed_4x5',
    card_image_url: 'https://palmly.app/c.png',
  });

  // Invalid values are DROPPED, not thrown: the payload is cosmetic, so a client bug must not break
  // the growth loop — an attacker's value simply never reaches the page.
  const dropped = sanitizeInviteContext(
    { inviter_name: 'x'.repeat(200), reading_id: 'not-a-uuid', card_variant: 'billboard', card_image_url: 'https://evil.example/x.png' },
    HOSTS,
  );
  assertEquals((dropped.inviter_name as string).length, INVITE_NAME_MAX, 'name capped, not rejected');
  assertEquals(dropped.reading_id, undefined);
  assertEquals(dropped.card_variant, undefined);
  assertEquals(dropped.card_image_url, undefined, 'the attacker-hosted OG image is gone');

  assertEquals(sanitizeInviteContext(undefined, HOSTS), {});
  assertEquals(sanitizeInviteContext('a string', HOSTS), {}, 'a non-object context is not spreadable');
  // A format char becomes a SPACE rather than vanishing — deleting it would let a zero-width joiner
  // silently fuse two tokens into one, which is the trick it would be used for.
  assertEquals(sanitizeInviteContext({ inviter_name: 'A‮B' }, HOSTS).inviter_name, 'A B', 'bidi override neutralized, not silently closed up');
});

// ── H9: the short code is a claim credential, so its entropy is a security parameter ────────────

Deno.test('deriveShortCode: 10 hex = 40 bits, formatted for a human to read off a teaser', async () => {
  const { tokenHash } = await generateInviteToken();
  const code = deriveShortCode(tokenHash);
  assertEquals(code, `${tokenHash.slice(0, 5).toUpperCase()}-${tokenHash.slice(5, 10).toUpperCase()}`);
  assertEquals(code.replace('-', '').length, SHORT_CODE_HEX);
  assert(/^[0-9A-F]{5}-[0-9A-F]{5}$/.test(code), 'hex only — no O/0 or I/1 ambiguity for a typed code');

  // Why 10 and not the original 6 (D-20): a prefix match hits ANY live invite, so the guesser's
  // odds are N/2^bits. At 6 hex (24 bits = 16.7M) and 100k live invites that is ~1 in 167 — and a
  // successful guess BURNS the invite (single-use), locking out the real recipient. Rate limiting
  // cannot rescue that; entropy has to.
  assertEquals(SHORT_CODE_HEX * 4, 40, 'shrinking this is a security regression, not a UX tweak');
});
