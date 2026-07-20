-- A9 (Audit-3 D0.T6) — revoke PostgREST EXECUTE on the trigger-only SECURITY DEFINER functions.
--
-- The security advisors (0028/0029) flag these SECURITY DEFINER functions as callable via
-- `/rest/v1/rpc/<fn>` by the `anon`/`authenticated` API roles. All four are TRIGGER functions only:
-- they are never called directly (a direct RPC call would error — no trigger context), so exposing
-- them on the API surface is pure, needless attack surface. Revoke EXECUTE.
--
-- EXECUTE is granted implicitly via `PUBLIC` (Postgres's default for new functions), which anon +
-- authenticated inherit — so `REVOKE ... FROM anon` alone is a no-op that leaves the PUBLIC grant
-- intact and the advisor still red. Revoke from `public` (matching migration 0032's `set_keep_image`
-- pattern) to actually remove it. Trigger firing is UNAFFECTED: a trigger function runs with the
-- definer's privileges on the triggering statement and is NOT gated by the invoking role's EXECUTE
-- grant, so the whole pipeline (profile provisioning, scan/compat status broadcasts, awaiting→computing
-- resolution) keeps working exactly as before.
--
-- Deliberately LEFT callable (A9): `is_pair_member` / `thread_owner` (harmless read helpers behind RLS
-- predicates) and `set_keep_image(boolean)` (intentionally user-callable — migration 0032). This is a
-- GRANT-only change; expand-contract / additive, no schema alteration.

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.broadcast_scan_status() from public, anon, authenticated;
revoke execute on function public.broadcast_compat_status() from public, anon, authenticated;
revoke execute on function public.resolve_awaiting_compat() from public, anon, authenticated;
