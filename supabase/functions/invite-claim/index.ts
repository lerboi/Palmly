// invite-claim (Backend §4, §8.2) — user mode. The recipient's first open resolves a deferred
// invite token (clipboard / Play referrer / AppsFlyer) — or, when every automatic mechanism fails,
// the short code they read off the teaser and typed in by hand (§8.2's "always present, guarantees
// the loop closes" fallback; audit H9 — it had no resolver until now). We verify by hash, atomically
// accept + link + create the canonical pair (claim_invite), and return the routing context that
// lands them in the inviter's compatibility flow. Idempotent + single-use (enforced in claim_invite).
import { createContext, requireMode } from '../_shared/context.ts';
import { AppError, jsonResponse, withErrorEnvelope } from '../_shared/http.ts';
import { hashToken } from '../_shared/invite.ts';
import { enforceRateLimit } from '../_shared/ratelimit.ts';

interface Body {
  token?: string;
  code?: string; // the typed short code (H9) — an alternative to `token`, never both
  source?: 'clipboard' | 'referrer' | 'appsflyer' | 'manual_code'; // which mechanism resolved it (telemetry)
}

// map a claim_invite / resolve_invite_code guard exception → HTTP status
const STATUS: Record<string, number> = {
  invite_not_found: 404,
  invite_expired: 410,
  invite_revoked: 410,
  invite_already_claimed: 409,
  cannot_claim_own_invite: 400,
  code_too_short: 400,
  ambiguous_code: 409,
};

Deno.serve(
  withErrorEnvelope(async (req) => {
    const ctx = createContext(req);
    requireMode(ctx, 'user');
    if (!ctx.userId) throw new AppError('unauthorized', 'no authenticated user', 401);

    const body = (await req.json().catch(() => ({}))) as Body;
    if (!body.token && !body.code) throw new AppError('bad_request', 'token or code is required', 400);

    // H9: the typed code is the brute-force surface, so it is rate-limited FAR tighter than the
    // token path. A prefix match hits ANY live invite, so the attacker's odds scale with how many
    // invites exist — unlike the 256-bit token, which is simply unguessable. Limit before doing any
    // work, so a guesser cannot use us to enumerate.
    let tokenHash: string;
    if (body.token) {
      await enforceRateLimit(ctx.admin, 'invite_claim_token', ctx.userId);
      tokenHash = await hashToken(body.token);
    } else {
      await enforceRateLimit(ctx.admin, 'invite_claim_code', ctx.userId);
      const { data: resolved, error: resErr } = await ctx.admin.rpc('resolve_invite_code', { p_code: body.code });
      if (resErr || !resolved) {
        const why = Object.keys(STATUS).find((k) => resErr?.message?.includes(k));
        throw new AppError(why ?? 'invite_not_found', resErr?.message ?? 'code did not resolve', why ? STATUS[why] : 404);
      }
      tokenHash = resolved as string;
    }
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
