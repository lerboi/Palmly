// account-merge (Backend §4, §5.1.3) — user mode. Resolves the documented Supabase limitation:
// an anonymous session's user tries to link an identity that already belongs to an existing
// account. The client, still holding the anonymous session, captures its access token, signs into
// the existing (survivor) account, then calls this with that token. We:
//   1. take the survivor = the authenticated caller (JWT);
//   2. verify possession of the anonymous (loser) session via its access token, and that it is
//      genuinely anonymous (never merge FROM a real account — theft guard);
//   3. re-parent the loser's rows onto the survivor via the atomic `merge_accounts` RPC;
//   4. delete the now-empty anonymous loser user.
//
// Idempotent: a repeated call after the loser is gone resolves to `already_merged`.
//
// Live verify (anonymous → linkIdentity conflict → merge, readings intact) needs a device + store
// identity providers → Human-tasks H1/H7. This function + its `merge_accounts` core are complete.
import { createContext, requireMode } from '../_shared/context.ts';
import { AppError, jsonResponse, withErrorEnvelope } from '../_shared/http.ts';

interface MergeBody {
  anon_access_token?: string;
}

Deno.serve(
  withErrorEnvelope(async (req) => {
    const ctx = createContext(req);
    requireMode(ctx, 'user');
    const survivorId = ctx.userId;
    if (!survivorId) throw new AppError('unauthorized', 'no authenticated user', 401);

    const body = (await req.json().catch(() => ({}))) as MergeBody;
    const anonToken = body.anon_access_token;
    if (!anonToken) throw new AppError('bad_request', 'anon_access_token is required', 400);

    // Prove the caller controls the anonymous session (validates the token against auth).
    const { data: anon, error } = await ctx.admin.auth.getUser(anonToken);
    if (error || !anon?.user) {
      // token already invalidated (e.g. the loser was deleted on a prior attempt) → idempotent no-op
      return jsonResponse({ merged: false, reason: 'already_merged' });
    }
    const loserId = anon.user.id;
    if (loserId === survivorId) throw new AppError('bad_request', 'the two sessions are the same account', 400);
    if (anon.user.is_anonymous !== true) {
      // never re-parent a real account's data — the loser must be an anonymous session
      throw new AppError('forbidden', 'the source session is not an anonymous account', 403);
    }

    // Atomic re-parent (the DB function re-checks is_anonymous as a second line of defence).
    const { data: summary, error: mergeErr } = await ctx.admin.rpc('merge_accounts', {
      survivor_id: survivorId,
      loser_id: loserId,
    });
    if (mergeErr) throw new AppError('merge_failed', mergeErr.message, 500);

    // Remove the emptied anonymous user (cascade-deletes its now-childless profile).
    const { error: delErr } = await ctx.admin.auth.admin.deleteUser(loserId);
    if (delErr) console.error('[account-merge] loser cleanup failed (stale-anon cron will retry):', delErr.message);

    return jsonResponse({ merged: true, summary });
  }),
);
