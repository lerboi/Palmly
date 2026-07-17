import { assert, assertEquals, assertStringIncludes } from '@std/assert';
import { buildInviteGonePage, buildInvitePage, isLinkPreviewBot, type InvitePageOpts } from './invite-page.ts';
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
  assertStringIncludes(html, '--accent:#D13B27'); // vermilion accent CSS var (drives CTA/wheel/steps)
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

Deno.test('deriveShortCode: 10 hex chars → XXXXX-XXXXX, uppercase, no ambiguous letters', () => {
  // Widened from 6 hex by B13/H9 (D-20). This assertion previously pinned the 24-bit version — the
  // one an attacker could hit in ~167 guesses once the resolver existed. Entropy is the parameter
  // here, so the length is deliberately asserted, not incidental.
  assertEquals(deriveShortCode('a1b2c3deadbeef'), 'A1B2C-3DEAD');
  assert(/^[0-9A-F]{5}-[0-9A-F]{5}$/.test(deriveShortCode('ffffffffff')));
});

// ── M7: the first hit on nearly every invite is a crawler, not a person ──────────────────────────

Deno.test('isLinkPreviewBot: messenger crawlers do not count as human clicks', () => {
  // These are exactly the fetches that made `clicked` measure "was this shared into a chat app".
  for (const ua of [
    'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    'Twitterbot/1.0',
    'WhatsApp/2.23.20.0 A',
    'TelegramBot (like TwitterBot)',
    'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
    'Discordbot/2.0; +https://discordapp.com',
    'LinkedInBot/1.0 (compatible; Mozilla/5.0; Jakarta Commons-HttpClient/3.1)',
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Applebot/0.1; +http://www.apple.com/go/applebot',
    'curl/8.4.0',
    'python-requests/2.31.0',
  ]) {
    assert(isLinkPreviewBot(ua), `must not credit a click to: ${ua}`);
  }
  assert(isLinkPreviewBot(null), 'no UA at all is not a browser');
  assert(isLinkPreviewBot(''), 'empty UA is not a browser');
});

Deno.test('isLinkPreviewBot: real people still count — a false positive silently eats a real click', () => {
  for (const ua of [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    // WeChat's in-app browser: a REAL user, and a huge share of this product's audience.
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.42(0x18002a2f) NetType/WIFI Language/zh_CN',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ]) {
    assert(!isLinkPreviewBot(ua), `must still count the click from: ${ua}`);
  }
});
