// invite-create (Backend §4, §8, §13) — user mode. Mints a share invite: a 32-byte random token
// (returned once, in the link) whose SHA-256 hash is what we persist. Inserts via the RLS-scoped
// user client, so the tightened `invites` INSERT policy (P3.T2: inviter_id = auth.uid(),
// invitee_id null, status='created') re-validates the row — a client can never forge an invite
// into a victim's read view. Returns `palmly.app/i/{token}` (the client wraps it in a OneLink, D1).
import { createContext, requireMode } from '../_shared/context.ts';
import { AppError, jsonResponse, withErrorEnvelope } from '../_shared/http.ts';
import { generateInviteToken, inviteUrl, sanitizeInviteContext } from '../_shared/invite.ts';
import { enforceRateLimit } from '../_shared/ratelimit.ts';

/** Origins an invite's OG image may come from: our own site, and our own storage (the `cards`
 *  bucket's public URL). Derived from SUPABASE_URL so it follows staging/prod without a code edit. */
function allowedCardHosts(): string[] {
  const hosts = ['palmly.app'];
  const supa = Deno.env.get('SUPABASE_URL');
  if (supa) {
    try {
      hosts.push(new URL(supa).hostname);
    } catch {
      /* malformed env → fall back to the site host only */
    }
  }
  return hosts;
}

interface Body {
  kind?: 'compatibility' | 'generic';
  context?: Record<string, unknown>; // {reading_id, card_variant, inviter_name}
  channel?: string; // whatsapp | line | zalo | wechat | copy | qr …
}

Deno.serve(
  withErrorEnvelope(async (req) => {
    const ctx = createContext(req);
    requireMode(ctx, 'user');
    if (!ctx.userId) throw new AppError('unauthorized', 'no authenticated user', 401);

    await enforceRateLimit(ctx.admin, 'invite_create', ctx.userId); // spec §13

    const body = (await req.json().catch(() => ({}))) as Body;
    const { token, tokenHash } = await generateInviteToken();

    const { data, error } = await ctx.supabase
      .from('invites')
      .insert({
        inviter_id: ctx.userId,
        token_hash: tokenHash,
        kind: body.kind ?? 'compatibility',
        // M6: validate at the WRITE, not the read — invite-page renders this on the trusted domain
        // (headline name + OG preview) for a recipient who has no reason to distrust it. Unknown
        // keys and invalid values are dropped, not rejected: the payload is cosmetic, so failing the
        // invite would break the growth loop over a client bug while an attacker just loses.
        context: sanitizeInviteContext(body.context, allowedCardHosts()),
        channel: body.channel ?? null,
        // status defaults 'created', invitee_id null, expires_at defaults now()+30d
      })
      .select('id, expires_at')
      .single();
    if (error || !data) throw new AppError('invite_failed', error?.message ?? 'invite insert failed', 500);

    // the raw token is returned exactly here and never persisted
    return jsonResponse({ invite_id: data.id, url: inviteUrl(token), expires_at: data.expires_at });
  }),
);
