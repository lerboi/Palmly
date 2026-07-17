// Teaser page HTML (Backend §8.2, UIUX §2.10) — the self-hosted invite landing at
// `palmly.app/i/{token}`. Pure builder (no request/DB) so it's unit-testable. Requirements:
// mobile-web, < 50KB, no JS framework (one tiny inline script only for clipboard-arming + WeChat
// overlay), per-invite OG tags (the messenger preview), one giant cinnabar CTA whose real-gesture
// tap escapes in-app webviews + arms the iOS clipboard token / Android referrer, and an
// always-present human-readable fallback code.

import { DARK, LIGHT, type ServerPalette, withAlpha } from './palette.ts';

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export type SharePlatform = 'ios' | 'android' | 'other';

export interface InvitePageOpts {
  inviterName: string; // first name, or 'A friend'
  kind: 'compatibility' | 'generic';
  cardImageUrl: string; // og:image (the inviter's share card, < 300KB)
  inviteUrl: string; // canonical og:url
  ctaUrl: string; // where the CTA goes (server-picked by UA: app/App-Store/Play referrer)
  clipboardToken: string; // the invite URL to arm on the iOS clipboard on CTA tap
  fallbackCode: string; // human-typable code (always-works fallback)
  platform: SharePlatform;
  isWeChat: boolean;
}

/** The messenger preview title/description. */
function ogText(o: InvitePageOpts): { title: string; description: string } {
  if (o.kind === 'compatibility') {
    return { title: `${o.inviterName} 🤝 You — palm compatibility`, description: `${o.inviterName} wants to compare palms with you on Palmly. See your match — and get your own reading.` };
  }
  return { title: `${o.inviterName} shared a Palmly reading`, description: `Read your palm on Palmly — for reflection and fun.` };
}

/** The on-page headline / CTA / steps — kind-aware (was hard-coded to compatibility regardless of
 * `o.kind`, so a generic reading invite read "compare palms" / "See our compatibility" — the V21
 * copy bug). `inviterName` is escaped here so the h1 is safe to inject raw. */
function bodyCopy(o: InvitePageOpts): { h1: string; cta: string; steps: [string, string, string] } {
  const name = esc(o.inviterName);
  if (o.kind === 'compatibility') {
    return {
      h1: `${name} wants to compare palms with you`,
      cta: 'See our compatibility',
      steps: ['Tap the button above', 'Scan your palm — takes a moment', 'See how you two match, and get your own reading'],
    };
  }
  return {
    h1: `${name} shared a Palmly reading with you`,
    cta: 'Read your palm',
    steps: ['Tap the button above', 'Scan your palm — takes a moment', 'Get your own reflective reading'],
  };
}

// Vermilion skin (redesign v2 §3/§7) — sourced from the ONE shared `_shared/palette.ts` (V21 kills
// the old "kept in sync manually" copy; the card, this page, and the in-app preview now share the
// same roles). Emitted as CSS custom properties so the whole page — including the inline SVG seal
// and wheel, which read `var(--…)` — re-themes for `prefers-color-scheme: dark` with one variable
// override. A public HTML page can't bundle Noto, so it uses a system sans stack.
const cssVars = (p: ServerPalette): string =>
  `--bg:${p.bg};--surface:${p.surface};--border:${p.border};--ink:${p.ink};--wash:${p.inkWash};` +
  `--accent:${p.accent};--accent-muted:${p.accentMuted};--on-accent:${p.onAccent};` +
  `--heritage:${p.heritage};--premium:${p.premium};--success:${p.success};--cta-shadow:${withAlpha(p.accent, 0.28)}`;

const STYLE = `:root{${cssVars(LIGHT)}}
@media (prefers-color-scheme:dark){:root{${cssVars(DARK)}}}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,system-ui,sans-serif;background:var(--bg);
color:var(--ink);line-height:1.5;-webkit-text-size-adjust:100%}
main{max-width:560px;margin:0 auto;padding:40px 24px 64px;text-align:center}
.seal{display:block;width:56px;height:56px;margin:0 auto 24px}
h1{font-size:30px;font-weight:800;letter-spacing:-0.4px;margin-bottom:24px}
.wheel{width:180px;height:180px;margin:8px auto 28px;position:relative}
.cta{display:block;background:var(--accent);color:var(--on-accent);text-decoration:none;font-size:20px;font-weight:700;
padding:18px 24px;border-radius:14px;margin:8px 0 28px;box-shadow:0 8px 24px var(--cta-shadow)}
.steps{list-style:none;text-align:left;max-width:340px;margin:0 auto 32px;counter-reset:s}
.steps li{counter-increment:s;position:relative;padding:8px 0 8px 40px;color:var(--wash)}
.steps li::before{content:counter(s);position:absolute;left:0;top:6px;width:26px;height:26px;border-radius:50%;
background:var(--accent-muted);color:var(--accent);font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:center}
hr{border:none;border-top:1px solid var(--border);margin:24px 0}
.about{font-size:15px;color:var(--wash);text-align:left}
.about p{margin-bottom:10px}
.privacy{color:var(--success)}
.code{margin-top:16px}.code b{font-family:ui-monospace,monospace;letter-spacing:2px;color:var(--ink);font-size:18px}
#wc{position:fixed;inset:0;background:rgba(20,21,26,.92);color:#FFFFFF;display:flex;flex-direction:column;
align-items:center;justify-content:center;text-align:center;padding:32px;z-index:9}
#wc .arrow{position:absolute;top:14px;right:20px;font-size:40px}
@keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.seal,h1,.wheel,.cta,.steps,.about{animation:rise .5s cubic-bezier(.22,1,.36,1) both}
h1{animation-delay:.05s}.wheel{animation-delay:.1s}.cta{animation-delay:.16s}.steps{animation-delay:.22s}.about{animation-delay:.28s}
@media (prefers-reduced-motion:reduce){.seal,h1,.wheel,.cta,.steps,.about{animation:none}}`;

// CJK-free brand mark — the traced-palm Logomark stamp in claret heritage (§3.2 — seal only, never
// the bright accent), replacing the 相 chop. Reads `var(--heritage)` so it flips in dark mode.
const SEAL_SVG = `<svg class="seal" viewBox="0 0 48 48" aria-hidden="true">
<rect x="3" y="3" width="42" height="42" rx="10" fill="none" stroke="var(--heritage)" stroke-width="2.6"/>
<g fill="none" stroke="var(--heritage)" stroke-width="3" stroke-linecap="round">
<path d="M19.5 12.5 C14 18.5 13 28 18.5 36"/><path d="M11.5 24.5 C20 21.5 29.5 22.5 35.5 26"/>
<path d="M12 18.5 C20 14 30 15 36.5 19.5"/></g></svg>`;

const WHEEL_SVG = `<svg class="wheel" viewBox="0 0 180 180" aria-hidden="true">
<circle cx="90" cy="90" r="76" fill="none" stroke="var(--border)" stroke-width="10"/>
<circle cx="90" cy="90" r="76" fill="none" stroke="var(--accent)" stroke-width="10" stroke-dasharray="300 200"
stroke-linecap="round" transform="rotate(-90 90 90)" opacity="0.55"/>
<text x="90" y="108" text-anchor="middle" font-family="-apple-system,Segoe UI,Roboto,sans-serif" font-size="56"
font-weight="800" fill="var(--premium)">?</text>
</svg>`;

/** Build the full teaser HTML document. Deterministic + escaped; targets < 50KB. */
export function buildInvitePage(o: InvitePageOpts): string {
  const og = ogText(o);
  const body = bodyCopy(o);
  const weChat = o.isWeChat
    ? `<div id="wc"><div class="arrow">⋯</div><div><p style="font-size:20px;margin-bottom:12px">Tap ⋯ (top-right)</p><p>then choose <b>Open in Browser</b> to continue.</p></div></div>`
    : '';

  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(og.title)}</title>
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(og.title)}">
<meta property="og:description" content="${esc(og.description)}">
<meta property="og:image" content="${esc(o.cardImageUrl)}">
<meta property="og:url" content="${esc(o.inviteUrl)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(og.title)}">
<meta name="twitter:image" content="${esc(o.cardImageUrl)}">
<style>${STYLE}</style></head>
<body>${weChat}
<main>
${SEAL_SVG}
<h1>${body.h1}</h1>
${WHEEL_SVG}
<a class="cta" id="cta" href="${esc(o.ctaUrl)}" onclick="arm()">${body.cta}</a>
<ol class="steps">${body.steps.map((s) => `<li>${s}</li>`).join('')}</ol>
<hr>
<section class="about">
<p>Palmly reads the lines of your palm into a reflective reading — <b>for reflection and fun</b>, not fortune-telling.</p>
<p class="privacy">Your photo is analyzed, then deleted — usually within a day.</p>
<p class="code">Invite code: <b>${esc(o.fallbackCode)}</b></p>
</section>
</main>
<script>function arm(){try{if(navigator.clipboard){navigator.clipboard.writeText(${JSON.stringify(o.clipboardToken)})}}catch(e){}}</script>
</body></html>`;
}

/** A minimal "this invite has expired / was not found" page (same shell, no CTA). */
export function buildInviteGonePage(reason: 'expired' | 'not_found' | 'revoked'): string {
  const msg = reason === 'expired' ? 'This invite has expired.' : reason === 'revoked' ? 'This invite is no longer active.' : 'We couldn’t find this invite.';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Palmly</title><meta property="og:title" content="Palmly"><style>${STYLE}</style></head>
<body><main>${SEAL_SVG}<h1>${esc(msg)}</h1>
<p class="about">Ask your friend to share a fresh link, or open Palmly to start your own reading.</p>
<a class="cta" href="https://palmly.app">Open Palmly</a></main></body></html>`;
}

// ── Link-preview crawler detection (M7) ──────────────────────────────────────────────────────────
// Every messenger fetches a shared link to render its preview card, so the FIRST hit on almost every
// invite is a bot, not a human. That bot used to flip `created → clicked`, which means the K-factor
// funnel's click rate was measuring "was this link shared into a chat app", not "did a person tap
// it" — the exact number the growth loop is steered by.
//
// Matched on the vendor tokens these crawlers self-identify with. Deliberately conservative: a
// missed bot only restores today's behaviour, whereas a false positive would silently discard a real
// human click. Note `MicroMessenger` is NOT here — it is WeChat's in-app browser, i.e. a real user.
const PREVIEW_BOTS = [
  'facebookexternalhit', 'facebookcatalog', 'facebot',
  'twitterbot', 'linkedinbot', 'slackbot', 'slack-imgproxy', 'discordbot', 'telegrambot',
  'whatsapp', 'line-podcast', 'linebot', 'skypeuripreview', 'redditbot', 'pinterest',
  'embedly', 'iframely', 'quora link preview', 'nuzzel', 'vkshare', 'outbrain',
  'applebot', 'googlebot', 'bingbot', 'yandexbot', 'duckduckbot', 'baiduspider',
  'developers.google.com/+/web/snippet', 'w3c_validator', 'bitlybot', 'flipboard',
];

/** Is this user-agent a link-preview crawler rather than a person? */
export function isLinkPreviewBot(ua: string | null | undefined): boolean {
  if (!ua) return true; // no UA at all is not a browser — never credit it with a human click
  const u = ua.toLowerCase();
  if (PREVIEW_BOTS.some((b) => u.includes(b))) return true;
  // generic self-identifying crawlers, without swallowing real browsers
  return /\b(bot|crawler|spider|preview|scraper)\b/.test(u) && !u.includes('mozilla/5.0 (') ? true : /^(curl|wget|python-requests|go-http-client|okhttp|java)/.test(u);
}
