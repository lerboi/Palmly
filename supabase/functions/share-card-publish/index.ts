// share-card-publish (Backend §8, §13, audit F0.4) — USER mode. On a user's share intent, publish
// THEIR pre-rendered card onto the public CDN and return the URL. Rendering stays secret-mode in
// card-render; this endpoint only flips a draft the caller OWNS to public.
//
// Security: this MUST be verify_jwt=true. resolveAuth trusts the JWT `sub` without re-verifying the
// signature (the gateway verifies upstream), so a user-mode operation on a verify_jwt=false function
// would accept a forged `sub` — hence a dedicated verify_jwt=true fn, not a branch in card-render
// (which is verify_jwt=false / secret). Ownership is then a hard equality check against ctx.userId.
import { createContext, requireMode } from '../_shared/context.ts';
import { AppError, jsonResponse, withErrorEnvelope } from '../_shared/http.ts';
import { publishCard } from '../_shared/card-publish.ts';

interface Body {
  card_id?: string;
}

Deno.serve(
  withErrorEnvelope(async (req) => {
    const ctx = createContext(req);
    requireMode(ctx, 'user'); // gateway-verified JWT (verify_jwt=true) → ctx.userId is trustworthy
    if (!ctx.userId) throw new AppError('unauthorized', 'no authenticated user', 401);

    const body = (await req.json().catch(() => ({}))) as Body;
    if (!body.card_id) throw new AppError('bad_request', 'card_id is required', 400);

    // The caller may publish only their own card. Publishing is a privileged storage copy (admin
    // client), so the owner check is explicit — never inferred from what RLS happens to allow.
    const { data: card } = await ctx.admin.from('share_cards').select('user_id').eq('id', body.card_id).maybeSingle();
    if (!card) throw new AppError('not_found', 'share_card not found', 404);
    if (card.user_id !== ctx.userId) throw new AppError('forbidden', 'not your card', 403);

    return jsonResponse(await publishCard(ctx.admin, body.card_id));
  }),
);
