// invite-page (Backend §4, §8.2, UIUX §2.10) — auth: none (a public teaser; one of the two
// unauthenticated surfaces). Serves the SSR HTML for `palmly.app/i/{token}`: hashes the token,
// looks it up by `token_hash`, marks it `clicked` (K-factor funnel), UA-routes the CTA, and
// renders the per-invite OG preview. Expired/revoked/unknown tokens get a graceful shell.
import { createContext } from '../_shared/context.ts';
import { withErrorEnvelope } from '../_shared/http.ts';
import { deriveShortCode, hashToken, inviteUrl } from '../_shared/invite.ts';
import { buildInviteGonePage, buildInvitePage, type SharePlatform } from '../_shared/invite-page.ts';

const APP_STORE_URL = 'https://apps.apple.com/app/palmly/id0000000000'; // TODO(H7): real Apple app id
const WEB_URL = 'https://palmly.app';
const OG_DEFAULT = 'https://palmly.app/og-default.png';
const playUrl = (token: string) => `https://play.google.com/store/apps/details?id=com.palmly.app&referrer=${encodeURIComponent(`token=${token}`)}`;

function detectUA(ua: string): { platform: SharePlatform; isWeChat: boolean } {
  const u = ua.toLowerCase();
  return {
    isWeChat: u.includes('micromessenger'),
    platform: /iphone|ipad|ipod/.test(u) ? 'ios' : u.includes('android') ? 'android' : 'other',
  };
}

const html = (body: string, status = 200) =>
  new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });

Deno.serve(
  withErrorEnvelope(async (req) => {
    const url = new URL(req.url);
    // token comes from the path (/…/i/{token} or /…/invite-page/{token}) or ?token=
    const seg = url.pathname.split('/').filter(Boolean).pop() ?? '';
    const token = url.searchParams.get('token') ?? (seg && seg !== 'invite-page' ? seg : '');
    if (!token) return html(buildInviteGonePage('not_found'), 404);

    const ctx = createContext(req);
    const tokenHash = await hashToken(token);
    const { data: invite } = await ctx.admin
      .from('invites')
      .select('id, inviter_id, status, kind, context, expires_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (!invite) return html(buildInviteGonePage('not_found'), 404);
    if (invite.status === 'revoked') return html(buildInviteGonePage('revoked'), 410);
    if (new Date(invite.expires_at as string).getTime() < Date.now()) return html(buildInviteGonePage('expired'), 410);

    // K-factor funnel: created → clicked (idempotent; never regress a further-along state)
    if (invite.status === 'created') {
      await ctx.admin.from('invites').update({ status: 'clicked', clicked_at: new Date().toISOString() }).eq('id', invite.id).eq('status', 'created');
    }

    const context = (invite.context ?? {}) as { inviter_name?: string; card_image_url?: string };
    let inviterName: string = context.inviter_name ?? '';
    if (!inviterName) {
      const { data: prof } = await ctx.admin.from('profiles').select('display_name').eq('id', invite.inviter_id).maybeSingle();
      inviterName = prof?.display_name ?? 'A friend';
    }

    const { platform, isWeChat } = detectUA(req.headers.get('user-agent') ?? '');
    const ctaUrl = platform === 'ios' ? APP_STORE_URL : platform === 'android' ? playUrl(token) : WEB_URL;

    return html(
      buildInvitePage({
        inviterName,
        kind: (invite.kind as 'compatibility' | 'generic') ?? 'compatibility',
        cardImageUrl: context.card_image_url ?? OG_DEFAULT,
        inviteUrl: inviteUrl(token),
        ctaUrl,
        clipboardToken: inviteUrl(token),
        fallbackCode: deriveShortCode(tokenHash),
        platform,
        isWeChat,
      }),
    );
  }),
);
