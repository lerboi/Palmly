// invite-claim (Backend §4, §8.2) — user mode. The recipient's first open resolves a deferred
// invite token (clipboard / Play referrer / AppsFlyer / manual code — all on the client, which
// only ever hands us a token). We verify it by hash, atomically accept + link + create the
// canonical pair (claim_invite), and return the routing context that lands them in the inviter's
// compatibility flow. Idempotent + single-use (enforced in claim_invite).
import { createContext, requireMode } from '../_shared/context.ts';
import { AppError, jsonResponse, withErrorEnvelope } from '../_shared/http.ts';
import { hashToken } from '../_shared/invite.ts';

interface Body {
  token?: string;
  source?: 'clipboard' | 'referrer' | 'appsflyer' | 'manual_code'; // which mechanism resolved it (telemetry)
}

// map a claim_invite guard exception → HTTP status
const STATUS: Record<string, number> = {
  invite_not_found: 404,
  invite_expired: 410,
  invite_revoked: 410,
  invite_already_claimed: 409,
  cannot_claim_own_invite: 400,
};

Deno.serve(
  withErrorEnvelope(async (req) => {
    const ctx = createContext(req);
    requireMode(ctx, 'user');
    if (!ctx.userId) throw new AppError('unauthorized', 'no authenticated user', 401);

    const body = (await req.json().catch(() => ({}))) as Body;
    if (!body.token) throw new AppError('bad_request', 'token is required', 400);

    const tokenHash = await hashToken(body.token);
    const { data, error } = await ctx.admin.rpc('claim_invite', { p_token_hash: tokenHash, p_invitee: ctx.userId });
    if (error) {
      const reason = Object.keys(STATUS).find((k) => error.message.includes(k));
      throw new AppError(reason ?? 'claim_failed', error.message, reason ? STATUS[reason] : 500);
    }
    const result = data as { inviter_id: string; pair_id: string };

    // routing context for the personalized recipient onboarding ("{name} is waiting")
    const { data: inviter } = await ctx.admin.from('profiles').select('display_name').eq('id', result.inviter_id).maybeSingle();

    return jsonResponse({
      pair_id: result.pair_id,
      inviter_name: inviter?.display_name ?? 'A friend',
      source: body.source ?? null,
    });
  }),
);
