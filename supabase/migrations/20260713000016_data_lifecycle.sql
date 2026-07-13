-- P10.T2 — data lifecycle & erasure (Backend §9 D2, §4). Server-side RPCs behind the `cleanup` cron
-- worker and the `account-delete` user function. Storage OBJECT deletion is done by the Edge
-- Functions via the Storage API (a SQL delete of storage.objects orphans the S3 blobs, §9) — these
-- RPCs handle the DB side and hand back the storage paths to purge.

-- D2 opt-in "keep my scan" flag (settings toggle, default OFF): a kept crop is exempt from the 24h
-- auto-deletion sweep. The toggle UI is device-gated; the column + honoring it is server-side.
alter table public.scans add column if not exists keep_image boolean not null default false;

-- ── Crop auto-deletion (24h after a terminal scan; hourly cron) ──────────────────────────────────
-- Crops still holding a storage object, past 24h, not opted-in, not already deleted.
create or replace function public.crops_due_for_deletion(p_batch int default 200)
returns table (scan_id uuid, user_id uuid, storage_path text)
language sql
stable
security definer
set search_path = ''
as $$
  select id, user_id, storage_path
  from public.scans
  where storage_path is not null
    and image_deleted_at is null
    and keep_image = false
    and status in ('complete', 'matched', 'failed')
    and created_at < now() - interval '24 hours'
  order by created_at
  limit greatest(1, least(coalesce(p_batch, 200), 1000));
$$;

-- Mark a crop deleted AFTER its storage object is removed (D2 audit: image_deleted_at + null path).
create or replace function public.mark_crop_deleted(p_scan_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.scans set image_deleted_at = now(), storage_path = null where id = p_scan_id;
$$;

-- "Delete my scans now" (user request): mark all the user's crops deleted + audit; returns the paths
-- for the Edge Function to purge from storage.
-- OUT column named `path` (not `storage_path`) to avoid a plpgsql name collision with the table column.
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
  insert into public.deletion_log (user_id, scope, completed_at) values (p_user_id, 'images', now());
end;
$$;

-- ── Expired invites (hourly cron) ────────────────────────────────────────────────────────────────
create or replace function public.sweep_expired_invites()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
begin
  update public.invites set status = 'expired'
    where status in ('created', 'clicked', 'installed') and expires_at < now();
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ── Full account erasure (Backend §9) ────────────────────────────────────────────────────────────
-- Collects storage paths, releases the one non-cascading reference (invites.invitee_id has no
-- cascade — null it so a stranger's invite survives without the deleted invitee), removes non-FK
-- user rows (subscription_events), writes the audit row, then deletes auth.users which CASCADES
-- profiles → every owned table. Returns (bucket, path) for the Edge Function to purge from storage.
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
  insert into public.deletion_log (user_id, scope, completed_at) values (p_user_id, 'account', now());

  delete from auth.users where id = p_user_id; -- cascades profiles → all owned rows
end;
$$;

-- ── Stale anonymous users (>N days, no readings — bounds MAU cost, D4/§9) ─────────────────────────
create or replace function public.sweep_stale_anon(p_days int default 30)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  u record;
  n int := 0;
begin
  for u in
    select id from auth.users
    where is_anonymous = true
      and created_at < now() - make_interval(days => greatest(1, coalesce(p_days, 30)))
      and id not in (select user_id from public.readings)
  loop
    perform public.purge_account(u.id); -- reuses the erasure path (FK release + audit + cascade)
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- Cron/worker-only surface: revoke from clients, grant to service_role. Edge Functions call these
-- with the service key; account-delete passes the caller's own uid.
revoke all on function public.crops_due_for_deletion(int) from public, anon, authenticated;
revoke all on function public.mark_crop_deleted(uuid) from public, anon, authenticated;
revoke all on function public.request_image_deletion(uuid) from public, anon, authenticated;
revoke all on function public.sweep_expired_invites() from public, anon, authenticated;
revoke all on function public.purge_account(uuid) from public, anon, authenticated;
revoke all on function public.sweep_stale_anon(int) from public, anon, authenticated;
grant execute on function public.crops_due_for_deletion(int) to service_role;
grant execute on function public.mark_crop_deleted(uuid) to service_role;
grant execute on function public.request_image_deletion(uuid) to service_role;
grant execute on function public.sweep_expired_invites() to service_role;
grant execute on function public.purge_account(uuid) to service_role;
grant execute on function public.sweep_stale_anon(int) to service_role;
