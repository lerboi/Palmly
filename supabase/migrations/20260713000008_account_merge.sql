-- P7.T1 — account-merge core (Backend §5.1.3). When an anonymous session's user links an identity
-- that already belongs to an existing account, Supabase does NOT auto-merge. Resolution: sign into
-- the existing (survivor) account, then re-parent the anonymous (loser) session's rows onto it via
-- this function, then delete the loser. This SQL function is the atomic, re-runnable re-parent step;
-- the `account-merge` Edge Function verifies auth and calls it, then deletes the loser auth user.
--
-- SAFETY: only ever merges FROM an anonymous loser (never re-parents a real account's data — that
-- would be account theft). SECURITY DEFINER + service_role-only execute; it is never client-callable.
create or replace function public.merge_accounts(survivor_id uuid, loser_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  other uuid;
  na uuid;
  nb uuid;
  moved_scans int := 0;
  moved_readings int := 0;
begin
  if survivor_id = loser_id then
    raise exception 'merge_accounts: cannot merge an account into itself';
  end if;
  if not exists (select 1 from auth.users where id = loser_id and is_anonymous is true) then
    raise exception 'merge_accounts: loser % is not an anonymous account (refusing)', loser_id;
  end if;
  if not exists (select 1 from public.profiles where id = survivor_id) then
    raise exception 'merge_accounts: survivor % has no profile', survivor_id;
  end if;

  -- simple re-parents (no per-user unique to collide) ------------------------------------------
  update public.scans        set user_id = survivor_id where user_id = loser_id;
  get diagnostics moved_scans = row_count;
  update public.feature_sets set user_id = survivor_id where user_id = loser_id;
  update public.readings     set user_id = survivor_id where user_id = loser_id;
  get diagnostics moved_readings = row_count;
  update public.chat_threads set user_id = survivor_id where user_id = loser_id;
  update public.share_cards   set user_id = survivor_id where user_id = loser_id;
  update public.devices       set user_id = survivor_id where user_id = loser_id; -- expo_push_token is globally unique → no collision
  update public.invites       set inviter_id = survivor_id where inviter_id = loser_id;
  update public.invites       set invitee_id = survivor_id where invitee_id = loser_id;
  update public.subscription_events set user_id = survivor_id where user_id = loser_id;

  -- subject_profiles: unique(user_id, kind) — adopt kinds the survivor lacks, drop the rest.
  -- (dropped rows' feature_sets are already re-parented; they just become non-canonical under S.)
  update public.subject_profiles set user_id = survivor_id
    where user_id = loser_id
      and kind not in (select sp.kind from public.subject_profiles sp where sp.user_id = survivor_id);
  delete from public.subject_profiles where user_id = loser_id;

  -- subscriptions: pk user_id — adopt only if the survivor has none (else keep the survivor's).
  update public.subscriptions set user_id = survivor_id
    where user_id = loser_id
      and not exists (select 1 from public.subscriptions s where s.user_id = survivor_id);
  delete from public.subscriptions where user_id = loser_id;

  -- user_fortunes: pk(user_id, fortune_date) — adopt dates the survivor lacks.
  update public.user_fortunes set user_id = survivor_id
    where user_id = loser_id
      and fortune_date not in (select uf.fortune_date from public.user_fortunes uf where uf.user_id = survivor_id);
  delete from public.user_fortunes where user_id = loser_id;

  -- compatibility_pairs: check(user_a<user_b) + unique(user_a,user_b) — re-parent, renormalize,
  -- drop self-pairs and duplicates. compatibility_results cascade with their pair.
  for r in select cp.id, cp.user_a, cp.user_b from public.compatibility_pairs cp
           where cp.user_a = loser_id or cp.user_b = loser_id loop
    other := case when r.user_a = loser_id then r.user_b else r.user_a end;
    if other = survivor_id then
      delete from public.compatibility_pairs where id = r.id;               -- would become a self-pair
    else
      na := least(survivor_id, other);
      nb := greatest(survivor_id, other);
      if exists (select 1 from public.compatibility_pairs cp where cp.user_a = na and cp.user_b = nb and cp.id <> r.id) then
        delete from public.compatibility_pairs where id = r.id;             -- survivor already paired with `other`
      else
        update public.compatibility_pairs set user_a = na, user_b = nb where id = r.id;
      end if;
    end if;
  end loop;

  return jsonb_build_object(
    'survivor', survivor_id, 'loser', loser_id,
    'moved_scans', moved_scans, 'moved_readings', moved_readings, 'merged', true
  );
end;
$$;

revoke all on function public.merge_accounts(uuid, uuid) from public, anon, authenticated;
grant execute on function public.merge_accounts(uuid, uuid) to service_role;
