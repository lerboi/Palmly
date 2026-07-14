// Teaser page HTML (Backend §8.2, UIUX §2.10) — the self-hosted invite landing at
// `palmly.app/i/{token}`. Pure builder (no request/DB) so it's unit-testable. Requirements:
// mobile-web, < 50KB, no JS framework (one tiny inline script only for clipboard-arming + WeChat
// overlay), per-invite OG tags (the messenger preview), one giant cinnabar CTA whose real-gesture
// tap escapes in-app webviews + arms the iOS clipboard token / Android referrer, and an
// always-present human-readable fallback code.

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

// Quiet Cosmos skin (redesign §3/§7). Source of truth: app/src/theme/tokens.ts (`quietCosmosSkin`
// light) — kept in sync manually; a public HTML page can't bundle Noto, so it uses a system sans
// stack. bg #FAF9F7 · surface #FFFFFF · border #E7E3DC · text #1A1A1F/#6B6B72 · accent #4B57C4 ·
// heritage #C2554A · premium #C79A3C · success #3F7A5E.
const STYLE = `*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,system-ui,sans-serif;background:#FAF9F7;
color:#1A1A1F;line-height:1.5;-webkit-text-size-adjust:100%}
main{max-width:560px;margin:0 auto;padding:40px 24px 64px;text-align:center}
.seal{display:block;width:56px;height:56px;margin:0 auto 24px}
h1{font-size:30px;font-weight:800;letter-spacing:-0.4px;margin-bottom:24px}
.wheel{width:180px;height:180px;margin:8px auto 28px;position:relative}
.cta{display:block;background:#4B57C4;color:#FFFFFF;text-decoration:none;font-size:20px;font-weight:700;
padding:18px 24px;border-radius:14px;margin:8px 0 28px;box-shadow:0 8px 24px rgba(75,87,196,.28)}
.steps{list-style:none;text-align:left;max-width:340px;margin:0 auto 32px}
.steps li{counter-increment:s;position:relative;padding:8px 0 8px 40px;color:#6B6B72}
.steps li::before{content:counter(s);position:absolute;left:0;top:6px;width:26px;height:26px;border-radius:50%;
background:#ECEDF9;color:#4B57C4;font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:center}
.steps{counter-reset:s}
hr{border:none;border-top:1px solid #E7E3DC;margin:24px 0}
.about{font-size:15px;color:#6B6B72;text-align:left}
.about p{margin-bottom:10px}
.privacy{color:#3F7A5E}
.code{margin-top:16px}.code b{font-family:ui-monospace,monospace;letter-spacing:2px;color:#1A1A1F;font-size:18px}
#wc{position:fixed;inset:0;background:rgba(20,21,26,.92);color:#FFFFFF;display:flex;flex-direction:column;
align-items:center;justify-content:center;text-align:center;padding:32px;z-index:9}
#wc .arrow{position:absolute;top:14px;right:20px;font-size:40px}`;

// CJK-free brand mark — the traced-palm Logomark stamp (heritage whisper), replacing the 相 chop.
const SEAL_SVG = `<svg class="seal" viewBox="0 0 48 48" aria-hidden="true">
<rect x="3" y="3" width="42" height="42" rx="10" fill="none" stroke="#C2554A" stroke-width="2.6"/>
<g fill="none" stroke="#C2554A" stroke-width="3" stroke-linecap="round">
<path d="M19.5 12.5 C14 18.5 13 28 18.5 36"/><path d="M11.5 24.5 C20 21.5 29.5 22.5 35.5 26"/>
<path d="M12 18.5 C20 14 30 15 36.5 19.5"/></g></svg>`;

const WHEEL_SVG = `<svg class="wheel" viewBox="0 0 180 180" aria-hidden="true">
<circle cx="90" cy="90" r="76" fill="none" stroke="#E7E3DC" stroke-width="10"/>
<circle cx="90" cy="90" r="76" fill="none" stroke="#4B57C4" stroke-width="10" stroke-dasharray="300 200"
stroke-linecap="round" transform="rotate(-90 90 90)" opacity="0.55"/>
<text x="90" y="108" text-anchor="middle" font-family="-apple-system,Segoe UI,Roboto,sans-serif" font-size="56"
font-weight="800" fill="#C79A3C">?</text>
</svg>`;

/** Build the full teaser HTML document. Deterministic + escaped; targets < 50KB. */
export function buildInvitePage(o: InvitePageOpts): string {
  const og = ogText(o);
  const name = esc(o.inviterName);
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
<h1>${name} wants to compare palms with you</h1>
${WHEEL_SVG}
<a class="cta" id="cta" href="${esc(o.ctaUrl)}" onclick="arm()">See our compatibility</a>
<ol class="steps"><li>Tap the button above</li><li>Scan your palm — takes a moment</li><li>See how you two match, and get your own reading</li></ol>
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
