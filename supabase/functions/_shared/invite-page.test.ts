import { assert, assertEquals, assertStringIncludes } from '@std/assert';
import { buildInviteGonePage, buildInvitePage, type InvitePageOpts } from './invite-page.ts';
import { deriveShortCode } from './invite.ts';

const base: InvitePageOpts = {
  inviterName: 'Mei',
  kind: 'compatibility',
  cardImageUrl: 'https://cdn.palmly.app/cards/x_feed.png',
  inviteUrl: 'https://palmly.app/i/TOK',
  ctaUrl: 'https://play.google.com/store/apps/details?id=com.palmly.app&referrer=TOK',
  clipboardToken: 'https://palmly.app/i/TOK',
  fallbackCode: 'A1B-2C3',
  platform: 'android',
  isWeChat: false,
};

const byteLen = (s: string) => new TextEncoder().encode(s).length;

Deno.test('buildInvitePage: per-invite OG tags for messenger previews', () => {
  const html = buildInvitePage(base);
  assertStringIncludes(html, '<meta property="og:title" content="Mei 🤝 You — palm compatibility">');
  assertStringIncludes(html, '<meta property="og:image" content="https://cdn.palmly.app/cards/x_feed.png">');
  assertStringIncludes(html, '<meta property="og:url" content="https://palmly.app/i/TOK">');
  assertStringIncludes(html, 'twitter:card" content="summary_large_image"');
});

Deno.test('buildInvitePage: giant CTA anchor, 3-step explainer, fallback code, clipboard arming', () => {
  const html = buildInvitePage(base);
  assertStringIncludes(html, `href="${base.ctaUrl.replace(/&/g, '&amp;')}"`); // CTA points at the UA-picked url
  assertStringIncludes(html, 'See our compatibility');
  assert((html.match(/<li>/g) ?? []).length === 3, 'three-step explainer');
  assertStringIncludes(html, 'Invite code: <b>A1B-2C3</b>');
  assertStringIncludes(html, 'navigator.clipboard.writeText'); // iOS deferred-match arm point
  assertStringIncludes(html, 'for reflection and fun'); // no-fortune-telling framing
});

Deno.test('buildInvitePage: WeChat visitors get the open-in-browser overlay; others do not', () => {
  assert(!buildInvitePage(base).includes('id="wc"'));
  assertStringIncludes(buildInvitePage({ ...base, isWeChat: true }), 'Open in Browser');
});

Deno.test('buildInvitePage: HTML is well under 50KB and escapes the inviter name', () => {
  const html = buildInvitePage({ ...base, inviterName: 'Mei <script>"x"' });
  assert(byteLen(html) < 50 * 1024, `page is ${byteLen(html)} bytes (< 50KB)`);
  assert(!html.includes('<script>"x"'), 'inviter name is escaped');
  assertStringIncludes(html, '&lt;script&gt;');
});

Deno.test('buildInvitePage: generic-kind invite uses a different headline', () => {
  const html = buildInvitePage({ ...base, kind: 'generic', inviterName: 'Sam' });
  assertStringIncludes(html, 'Sam shared a Palmly reading');
});

Deno.test('buildInvitePage: reskinned to Quiet Cosmos — accent CTA, heritage mark, CJK-free (§7)', () => {
  const html = buildInvitePage(base);
  assertStringIncludes(html, 'background:#4B57C4'); // twilight-indigo CTA (was cinnabar)
  assertStringIncludes(html, '#C2554A'); // heritage logomark stamp (the CJK-free seal)
  assert(!/[一-鿿]/.test(html), 'no CJK glyphs — 相 chop dropped'); // (🤝 in the OG title is emoji, not CJK)
});

Deno.test('buildInviteGonePage: expired/not-found shell has no compatibility CTA', () => {
  const html = buildInviteGonePage('expired');
  assertStringIncludes(html, 'expired');
  assert(!html.includes('See our compatibility'));
  assert(byteLen(html) < 50 * 1024);
});

Deno.test('deriveShortCode: 6 hex chars → XXX-XXX, uppercase, no ambiguous letters', () => {
  assertEquals(deriveShortCode('a1b2c3deadbeef'), 'A1B-2C3');
  assert(/^[0-9A-F]{3}-[0-9A-F]{3}$/.test(deriveShortCode('ffffffffff')));
});
