// compat-request (Backend §4, §7, §4.6) — user mode. A pair member asks for the comparison. First
// comparison is FREE (it is the growth loop — never paywall the recipient's first experience);
// further comparisons require premium. Entitlement is enforced here, not in RLS. Delegates the
// pair/result lifecycle to request_compat (awaiting_b vs computing + enqueue).
import { createContext, requireMode } from '../_shared/context.ts';
import { AppError, jsonResponse, withErrorEnvelope } from '../_shared/http.ts';
import { hasPremium } from '../_shared/entitlement.ts';

interface Body {
  pair_id?: string;
}

Deno.serve(
  withErrorEnvelope(async (req) => {
    const ctx = createContext(req);
    requireMode(ctx, 'user');
    if (!ctx.userId) throw new AppError('unauthorized', 'no authenticated user', 401);

    const body = (await req.json().catch(() => ({}))) as Body;
    if (!body.pair_id) throw new AppError('bad_request', 'pair_id is required', 400);

    // entitlement (§4.6): premium → unlimited; otherwise the user's FIRST comparison is free.
    if (!(await hasPremium(ctx.admin, ctx.userId))) {
      const { data: pairs } = await ctx.admin.from('compatibility_pairs').select('id').or(`user_a.eq.${ctx.userId},user_b.eq.${ctx.userId}`);
      const otherPairIds = (pairs ?? []).map((p) => p.id as string).filter((id) => id !== body.pair_id);
      if (otherPairIds.length) {
        const { count } = await ctx.admin.from('compatibility_results').select('id', { count: 'exact', head: true }).in('pair_id', otherPairIds).in('status', ['computing', 'complete']);
        if ((count ?? 0) >= 1) throw new AppError('payment_required', 'subscribe for unlimited compatibility comparisons', 402);
      }
    }

    const { data, error } = await ctx.admin.rpc('request_compat', { p_pair_id: body.pair_id, p_requester: ctx.userId });
    if (error) {
      const reason = ['pair_not_found', 'not_a_pair_member'].find((k) => error.message.includes(k));
      throw new AppError(reason ?? 'compat_failed', error.message, reason === 'pair_not_found' ? 404 : reason === 'not_a_pair_member' ? 403 : 500);
    }
    return jsonResponse(data);
  }),
);
