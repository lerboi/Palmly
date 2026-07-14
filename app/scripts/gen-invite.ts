// Renders the invite landing page HTML (invite-page.ts) to a file for headless-Chrome screenshot —
// device-free verification for R16c (Deno not installed here).
// Run: node --experimental-strip-types scripts/gen-invite.ts
import { writeFileSync } from 'node:fs';
import { buildInvitePage } from '../../supabase/functions/_shared/invite-page.ts';

const html = buildInvitePage({
  inviterName: 'Mei',
  kind: 'compatibility',
  cardImageUrl: 'https://cdn.palmly.app/cards/x_feed.png',
  inviteUrl: 'https://palmly.app/i/TOK',
  ctaUrl: 'https://play.google.com/store/apps/details?id=com.palmly.app&referrer=TOK',
  clipboardToken: 'https://palmly.app/i/TOK',
  fallbackCode: 'A1B-2C3',
  platform: 'android',
  isWeChat: false,
});

writeFileSync(new URL('../invite-preview.html', import.meta.url), html);
console.log('wrote app/invite-preview.html');
