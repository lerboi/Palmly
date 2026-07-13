// invite-create (Backend §4, §8, §13) — user mode. Mints a share invite: a 32-byte random token
// (returned once, in the link) whose SHA-256 hash is what we persist. Inserts via the RLS-scoped
// user client, so the tightened `invites` INSERT policy (P3.T2: inviter_id = auth.uid(),
// invitee_id null, status='created') re-validates the row — a client can never forge an invite
// into a victim's read view. Returns `palmly.app/i/{token}` (the client wraps it in a OneLink, D1).
import { createContext, requireMode } from '../_shared/context.ts';
import { AppError, jsonResponse, withErrorEnvelope } from '../_shared/http.ts';
import { generateInviteToken, inviteUrl } from '../_shared/invite.ts';

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

    const body = (await req.json().catch(() => ({}))) as Body;
    const { token, tokenHash } = await generateInviteToken();

    const { data, error } = await ctx.supabase
      .from('invites')
      .insert({
        inviter_id: ctx.userId,
        token_hash: tokenHash,
        kind: body.kind ?? 'compatibility',
        context: body.context ?? {},
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
