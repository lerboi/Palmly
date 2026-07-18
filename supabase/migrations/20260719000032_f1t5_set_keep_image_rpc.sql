-- F1.T5 (audit §8 F1.5) — the "Keep my scan photo" consent toggle (PrivacyCenter) must actually
-- PERSIST. `scans` is service-role-write-only (the only policy on it is `scans_select_own`), so a
-- plain client `update scans set keep_image = …` silently matches 0 rows under RLS — the toggle was
-- trust theater (it flipped in the UI and forgot on reload). This adds a tight, user-callable RPC.
--
-- keep_image is honored by the 24h image-cleanup predicate (0016 §D2 / 0020 `and keep_image = false`),
-- so persisting it genuinely opts the crop out of the automatic sweep — the whole point of the D2
-- opt-in. The function reads `auth.uid()` from the request JWT (still resolves under SECURITY
-- DEFINER, which only changes the role, not the request GUCs), so it can touch no other user's rows
-- and no other column. Expand-contract: purely additive (new function + grant); nothing altered.

create or replace function public.set_keep_image(p_keep boolean)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.scans
     set keep_image = p_keep
   where user_id = (select auth.uid());
$$;

comment on function public.set_keep_image(boolean) is
  'User-callable keep-my-scan-photo consent (audit F1.5, Backend §9 D2). Sets keep_image on the '
  'CALLER''s scans only (auth.uid() from the JWT) — scans is otherwise service-role-write-only. '
  'keep_image=true opts the crop out of the 24h cleanup sweep (0016/0020 predicate).';

revoke all on function public.set_keep_image(boolean) from public, anon;
grant execute on function public.set_keep_image(boolean) to authenticated;
