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

Deno.test('buildInvitePage: generic-kind invite uses a different OG + on-page headline', () => {
  const html = buildInvitePage({ ...base, kind: 'generic', inviterName: 'Sam' });
  assertStringIncludes(html, 'Sam shared a Palmly reading'); // OG title
  assertStringIncludes(html, '<h1>Sam shared a Palmly reading with you</h1>'); // on-page h1
});

Deno.test('buildInvitePage: kind-aware body copy (h1 + CTA + steps switch on o.kind — V21 bug fix)', () => {
  const compat = buildInvitePage(base); // compatibility
  assertStringIncludes(compat, '<h1>Mei wants to compare palms with you</h1>');
  assertStringIncludes(compat, '>See our compatibility</a>');
  assertStringIncludes(compat, 'See how you two match');

  const generic = buildInvitePage({ ...base, kind: 'generic' });
  assertStringIncludes(generic, '<h1>Mei shared a Palmly reading with you</h1>');
  assertStringIncludes(generic, '>Read your palm</a>');
  assert(!generic.includes('compare palms'), 'generic invite never says "compare palms"');
  assert(!generic.includes('See our compatibility'), 'generic invite has no compatibility CTA');
});

Deno.test('buildInvitePage: reskinned to Vermilion — accent CTA, claret seal, CJK-free (§3/§7)', () => {
  const html = buildInvitePage(base);
  assertStringIncludes(html, '--accent:#D8402C'); // vermilion accent CSS var (drives CTA/wheel/steps)
  assertStringIncludes(html, '#9E3B2E'); // claret heritage logomark stamp (the CJK-free seal, §3.2)
  assert(!html.includes('#4B57C4'), 'retired indigo accent appears nowhere');
  assert(!html.includes('rgba(75,87,196'), 'retired indigo CTA shadow gone');
  assertStringIncludes(html, 'box-shadow:0 8px 24px var(--cta-shadow)'); // shadow now tinted from accent
  assert(!/[一-鿿]/.test(html), 'no CJK glyphs — 相 chop dropped'); // (🤝 in the OG title is emoji, not CJK)
});

Deno.test('buildInvitePage: dark-mode + reduce-motion-safe (§4 — every animation has a no-op fallback)', () => {
  const html = buildInvitePage(base);
  assertStringIncludes(html, '@media (prefers-color-scheme:dark)'); // dark theme
  assertStringIncludes(html, '--accent:#FF7C63'); // dark coral accent var
  assertStringIncludes(html, '@keyframes rise'); // the entrance motion
  assertStringIncludes(html, '@media (prefers-reduced-motion:reduce)'); // the no-op fallback
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
