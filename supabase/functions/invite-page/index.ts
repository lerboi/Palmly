// invite-page (Backend §4, §8.2, UIUX §2.10) — auth: none (a public teaser; one of the two
// unauthenticated surfaces). Serves the SSR HTML for `palmly.app/i/{token}`: hashes the token,
// looks it up by `token_hash`, marks it `clicked` (K-factor funnel), UA-routes the CTA, and
// renders the per-invite OG preview. Expired/revoked/unknown tokens get a graceful shell.
import { createContext } from '../_shared/context.ts';
import { withErrorEnvelope } from '../_shared/http.ts';
import { deriveShortCode, hashToken, inviteReferrer, inviteUrl } from '../_shared/invite.ts';
import { buildInviteGonePage, buildInvitePage, isLinkPreviewBot, type SharePlatform } from '../_shared/invite-page.ts';

const APP_STORE_URL = 'https://apps.apple.com/app/palmly/id0000000000'; // TODO(H7): real Apple app id
const WEB_URL = 'https://palmly.app';
// iOS Universal-Link-first CTA ordering (audit F1.12, Backend §8.2). Once the apple-app-site-
// association is served AND the domain is verified, the iOS CTA should open the app via the Universal
// Link (the OS falls through to the App Store when the app isn't installed). Kept DORMANT (→ the App
// Store) until then — an unverified UL just reloads this teaser. Flip this one flag at launch.
const IOS_UNIVERSAL_LINK_VERIFIED = false;
const OG_DEFAULT = 'https://palmly.app/og-default.png';
const playUrl = (token: string) => `https://play.google.com/store/apps/details?id=com.palmly.app&referrer=${encodeURIComponent(inviteReferrer(token))}`;

function detectUA(ua: string): { platform: SharePlatform; isWeChat: boolean } {
  const u = ua.toLowerCase();
  return {
    isWeChat: u.includes('micromessenger'),
    platform: /iphone|ipad|ipod/.test(u) ? 'ios' : u.includes('android') ? 'android' : 'other',
  };
}

// M7: `public, max-age=300` was wrong on two counts, and became actively harmful once bots stopped
// flipping the funnel. (1) This response is UA-ROUTED — the CTA is an App Store, Play, or web URL —
// with no `Vary: User-Agent`, so a shared cache could hand an Android user the iOS store link.
// (2) It records a funnel event: a link-preview bot's request would prime the cache, and the real
// person's click 30 seconds later would be served from it, never reach this function, and never be
// counted. Crawlers fetch a given invite once, so there is nothing here worth caching anyway.
const html = (body: string, status = 200) =>
  new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', Vary: 'User-Agent' } });

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

    // K-factor funnel: created → clicked (idempotent; never regress a further-along state).
    // The compare-and-set below was already correct. M7 is the UA gate in front of it: every
    // messenger fetches a shared link to build its preview card, so the FIRST hit on nearly every
    // invite is a crawler — and crediting it made the funnel measure "was this link shared into a
    // chat app", not "did a person tap it". Bots still get the page (that is the point of the OG
    // tags); they just do not move the funnel.
    const ua = req.headers.get('user-agent');
    if (invite.status === 'created' && !isLinkPreviewBot(ua)) {
      await ctx.admin.from('invites').update({ status: 'clicked', clicked_at: new Date().toISOString() }).eq('id', invite.id).eq('status', 'created');
    }

    const context = (invite.context ?? {}) as { inviter_name?: string; card_image_url?: string };
    let inviterName: string = context.inviter_name ?? '';
    if (!inviterName) {
      const { data: prof } = await ctx.admin.from('profiles').select('display_name').eq('id', invite.inviter_id).maybeSingle();
      inviterName = prof?.display_name ?? 'A friend';
    }

    const { platform, isWeChat } = detectUA(ua ?? '');
    // iOS: Universal Link first (once verified), else the store; Android carries the install referrer.
    const iosCta = IOS_UNIVERSAL_LINK_VERIFIED ? inviteUrl(token) : APP_STORE_URL;
    const ctaUrl = platform === 'ios' ? iosCta : platform === 'android' ? playUrl(token) : WEB_URL;

    return html(
      buildInvitePage({
        inviterName,
        kind: (invite.kind as 'compatibility' | 'generic') ?? 'compatibility',
        cardImageUrl: context.card_image_url ?? OG_DEFAULT,
        senderCardUrl: typeof context.card_image_url === 'string' ? context.card_image_url : undefined,
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
