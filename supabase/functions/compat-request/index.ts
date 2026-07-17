// compat-request (Backend §4, §7, §4.6) — user mode. A pair member asks for the comparison. First
// comparison is FREE (it is the growth loop — never paywall the recipient's first experience);
// further comparisons require premium. Entitlement is enforced here, not in RLS. Delegates the
// pair/result lifecycle to request_compat (awaiting_b vs computing + enqueue).
import { createContext, requireMode } from '../_shared/context.ts';
import { AppError, jsonResponse, withErrorEnvelope } from '../_shared/http.ts';
import { hasPremium } from '../_shared/entitlement.ts';
import { isUuid } from '../_shared/revenuecat.ts';

interface Body {
  pair_id?: string;
}

Deno.serve(
  withErrorEnvelope(async (req) => {
    const ctx = createContext(req);
    requireMode(ctx, 'user');
    if (!ctx.userId) throw new AppError('unauthorized', 'no authenticated user', 401);
    // M8: the sub reaches SQL as a typed uuid parameter, so it is not an injection vector — but the
    // gate should not rest on `verify_jwt` alone for the shape of its subject. Cheap, explicit.
    if (!isUuid(ctx.userId)) throw new AppError('unauthorized', 'subject is not a uuid', 401);

    const body = (await req.json().catch(() => ({}))) as Body;
    if (!body.pair_id) throw new AppError('bad_request', 'pair_id is required', 400);

    // entitlement (§4.6): premium → unlimited; otherwise the user's FIRST comparison is free.
    // M8: `subscriptions` is read here (it is the gate's source of truth, and isPremiumRow is the
    // single definition of the rule), but the COUNT-and-act is now inside request_compat, in one
    // transaction under a row lock. It used to be a count here + an act there: two round-trips, so
    // two parallel first requests both read zero and both went free. Moving it also removed the
    // string-interpolated `.or(user_a.eq.${userId},…)` filter this function used to build.
    const premium = await hasPremium(ctx.admin, ctx.userId);

    const { data, error } = await ctx.admin.rpc('request_compat', {
      p_pair_id: body.pair_id,
      p_requester: ctx.userId,
      p_has_premium: premium,
    });
    if (error) {
      const reason = ['pair_not_found', 'not_a_pair_member', 'payment_required'].find((k) => error.message.includes(k));
      if (reason === 'payment_required') throw new AppError('payment_required', 'subscribe for unlimited compatibility comparisons', 402);
      throw new AppError(reason ?? 'compat_failed', error.message, reason === 'pair_not_found' ? 404 : reason === 'not_a_pair_member' ? 403 : 500);
    }
    return jsonResponse(data);
  }),
);
