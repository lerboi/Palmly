-- H7 (ledger B4) — storage/DB ordering integrity. One invariant, three limbs:
--   **never destroy the DB reference before the blob is gone, and never claim completion first.**
-- All additive: a new collect function + a new completion stamp; the two existing functions keep
-- their signatures and return types (`create or replace` cannot change either).
--
-- The in-repo precedent for the invariant already exists and is correct — cleanup/index.ts removes
-- the object and only then calls mark_crop_deleted `if (!error)`. account-delete is the one that
-- inverts it.

-- ── H7(a) — collect paths WITHOUT destroying anything ─────────────────────────────────────────────
-- account-delete/index.ts:17-27 called purge_account (which deletes the rows) and only then removed
-- the objects, "best-effort": a storage failure left palm/face crops in the bucket with ZERO
-- remaining DB reference and no retry path (the cleanup sweep works off `scans` rows, now gone), and
-- the handler still returned 200 {deleted:true}. This read-only collect lets the caller delete the
-- blobs FIRST and only purge rows once the bucket is actually clean — so a storage failure is a
-- retryable no-op instead of a permanent orphan. Mirrors purge_account's own (bucket, path) shape.
create or replace function public.account_storage_paths(p_user_id uuid)
returns table (bucket text, path text)
language sql
stable
security definer
set search_path = ''
as $$
  select 'scans'::text, s.storage_path from public.scans s
   where s.user_id = p_user_id and s.storage_path is not null
  union all
  select 'cards'::text, c.storage_path from public.share_cards c
   where c.user_id = p_user_id and c.storage_path is not null;
$$;

-- ── H7(c) — deletion_log.completed_at was stamped BEFORE the storage work ─────────────────────────
-- `deletion_log` already carries BOTH requested_at and completed_at and has no FK on user_id (so the
-- audit row correctly survives the auth.users cascade) — the table was designed for
-- request-then-complete. 0016:55 and :97 simply collapsed them, so the D2 audit trail asserted "we
-- finished erasing" before a single blob had been touched. Now: insert with completed_at NULL, and
-- stamp it only after the caller's storage work has actually succeeded.
create or replace function public.mark_deletion_complete(p_user_id uuid, p_scope text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.deletion_log set completed_at = now()
   where user_id = p_user_id and scope = p_scope and completed_at is null;
$$;

-- purge_account: unchanged except the deletion_log row is now logged as REQUESTED, not completed.
-- (Body copied from 0016:81-101 — only the insert differs; signature/return type are untouched.)
create or replace function public.purge_account(p_user_id uuid)
returns table (bucket text, path text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Capture the storage paths into the result set BEFORE deleting (return query appends + continues;
  -- no temp table, so this is safe to call repeatedly in one txn — e.g. the stale-anon sweep loop).
  return query
    select 'scans'::text, s.storage_path from public.scans s where s.user_id = p_user_id and s.storage_path is not null
    union all
    select 'cards'::text, c.storage_path from public.share_cards c where c.user_id = p_user_id and c.storage_path is not null;

  delete from public.subscription_events where user_id = p_user_id; -- no FK → not cascaded
  update public.invites set invitee_id = null where invitee_id = p_user_id; -- no-cascade FK → release
  -- H7(c): completed_at stays NULL until the caller confirms the blobs are gone
  -- (mark_deletion_complete). The stale-anon sweep has no storage step of its own, so its rows are
  -- completed by the cleanup worker in the same tick.
  insert into public.deletion_log (user_id, scope) values (p_user_id, 'account');

  delete from auth.users where id = p_user_id; -- cascades profiles → all owned rows
end;
$$;

-- request_image_deletion: same H7(c) fix. The callable Edge wrapper is B16's job (M12c); when it
-- lands it must collect → delete objects → then call this → then mark_deletion_complete.
create or replace function public.request_image_deletion(p_user_id uuid)
returns table (path text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
    select s.storage_path from public.scans s
    where s.user_id = p_user_id and s.storage_path is not null and s.image_deleted_at is null;
  update public.scans set image_deleted_at = now(), storage_path = null
    where user_id = p_user_id and image_deleted_at is null and storage_path is not null;
  insert into public.deletion_log (user_id, scope) values (p_user_id, 'images');
end;
$$;

-- ── H7(b) — merge_accounts left the loser's blobs stranded ────────────────────────────────────────
-- 0008:34 re-parented scans.user_id to the survivor but never touched storage.objects and never
-- rewrote scans.storage_path, which still read `{loser_id}/…`. The bucket policies are owner-path
-- based (path segment [1]), so the survivor could not read their own re-parented crops, and the
-- blobs were orphaned outright once the loser was deleted.
--
-- SQL cannot move an S3 blob, so the Edge Function moves the objects via the Storage API FIRST and
-- only then calls this — which re-parents the row and rewrites its path prefix in the SAME statement
-- (the row cannot be identified by loser_id once user_id has changed). If the move fails, the caller
-- aborts before any DB change: nothing is re-parented, nothing is stranded.
-- `storage_moves` is returned so the caller can report/verify; jsonb return type is unchanged.
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
  moved_objects int := 0;
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

  -- how many owner-prefixed objects this merge re-homes (reported back for verification)
  select count(*) into moved_objects from (
    select s.storage_path from public.scans s
      where s.user_id = loser_id and s.storage_path like loser_id::text || '/%'
    union all
    select c.storage_path from public.share_cards c
      where c.user_id = loser_id and c.storage_path like loser_id::text || '/%'
  ) q;

  -- simple re-parents (no per-user unique to collide) ------------------------------------------
  -- H7(b): re-parent AND rewrite the owner path prefix in one statement.
  update public.scans
     set user_id = survivor_id,
         storage_path = case
           when storage_path like loser_id::text || '/%'
             then survivor_id::text || substring(storage_path from length(loser_id::text) + 1)
           else storage_path
         end
   where user_id = loser_id;
  get diagnostics moved_scans = row_count;
  update public.feature_sets set user_id = survivor_id where user_id = loser_id;
  update public.readings     set user_id = survivor_id where user_id = loser_id;
  get diagnostics moved_readings = row_count;
  update public.chat_threads set user_id = survivor_id where user_id = loser_id;
  update public.share_cards
     set user_id = survivor_id,
         storage_path = case
           when storage_path like loser_id::text || '/%'
             then survivor_id::text || substring(storage_path from length(loser_id::text) + 1)
           else storage_path
         end
   where user_id = loser_id;
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
    'moved_scans', moved_scans, 'moved_readings', moved_readings,
    'storage_moves', moved_objects, 'merged', true
  );
end;
$$;

-- Posture unchanged (0016:129-140 / 0008:90-91): cron/worker-only surface.
revoke all on function public.account_storage_paths(uuid) from public, anon, authenticated;
revoke all on function public.mark_deletion_complete(uuid, text) from public, anon, authenticated;
revoke all on function public.purge_account(uuid) from public, anon, authenticated;
revoke all on function public.request_image_deletion(uuid) from public, anon, authenticated;
revoke all on function public.merge_accounts(uuid, uuid) from public, anon, authenticated;
grant execute on function public.account_storage_paths(uuid) to service_role;
grant execute on function public.mark_deletion_complete(uuid, text) to service_role;
grant execute on function public.purge_account(uuid) to service_role;
grant execute on function public.request_image_deletion(uuid) to service_role;
grant execute on function public.merge_accounts(uuid, uuid) to service_role;
