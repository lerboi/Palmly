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

const STYLE = `*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,'Noto Sans',system-ui,sans-serif;background:#F7F2E7;color:#1E1B16;line-height:1.5;
-webkit-text-size-adjust:100%}
main{max-width:560px;margin:0 auto;padding:40px 24px 64px;text-align:center}
.seal{display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:10px;
background:#C3272B;color:#F7F2E7;font-family:'Noto Serif SC',serif;font-size:32px;margin-bottom:24px}
h1{font-family:'Noto Serif Display','Noto Serif',Georgia,serif;font-size:30px;font-weight:600;margin-bottom:24px}
.wheel{width:180px;height:180px;margin:8px auto 28px;position:relative}
.cta{display:block;background:#C3272B;color:#F7F2E7;text-decoration:none;font-size:20px;font-weight:600;
padding:18px 24px;border-radius:14px;margin:8px 0 28px;box-shadow:0 6px 20px rgba(195,39,43,.25)}
.steps{list-style:none;text-align:left;max-width:340px;margin:0 auto 32px}
.steps li{counter-increment:s;position:relative;padding:8px 0 8px 40px;color:#5A544A}
.steps li::before{content:counter(s);position:absolute;left:0;top:6px;width:26px;height:26px;border-radius:50%;
background:#E6DCC6;color:#1E1B16;font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:center}
.steps{counter-reset:s}
hr{border:none;border-top:1px solid #E6DCC6;margin:24px 0}
.about{font-size:15px;color:#5A544A;text-align:left}
.about p{margin-bottom:10px}
.privacy{color:#3F7A5E}
.code{margin-top:16px}.code b{font-family:ui-monospace,monospace;letter-spacing:2px;color:#1E1B16;font-size:18px}
#wc{position:fixed;inset:0;background:rgba(30,27,22,.92);color:#F7F2E7;display:flex;flex-direction:column;
align-items:center;justify-content:center;text-align:center;padding:32px;z-index:9}
#wc .arrow{position:absolute;top:14px;right:20px;font-size:40px}`;

const WHEEL_SVG = `<svg class="wheel" viewBox="0 0 180 180" aria-hidden="true">
<circle cx="90" cy="90" r="76" fill="none" stroke="#E6DCC6" stroke-width="10"/>
<circle cx="90" cy="90" r="76" fill="none" stroke="#C3272B" stroke-width="10" stroke-dasharray="300 200"
stroke-linecap="round" transform="rotate(-90 90 90)" opacity="0.5"/>
<text x="90" y="104" text-anchor="middle" font-family="Noto Serif Display,serif" font-size="56" fill="#B8912F">?</text>
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
<div class="seal">相</div>
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
<body><main><div class="seal">相</div><h1>${esc(msg)}</h1>
<p class="about">Ask your friend to share a fresh link, or open Palmly to start your own reading.</p>
<a class="cta" href="https://palmly.app">Open Palmly</a></main></body></html>`;
}
