-- M12(c) (ledger B16) — "Delete my scan photos now" has no callable path.
--
-- `request_image_deletion` (0016:43-57) is revoked from anon/authenticated and granted only to
-- service_role, and a grep across all 20 function dirs finds ZERO callers — while every sibling IS
-- wired (account-delete → purge_account; cleanup → crops_due_for_deletion / mark_crop_deleted). The
-- SQL author even anticipated the wrapper ("returns the paths for the Edge Function to purge from
-- storage") and it was never written, so PrivacyCenter's button targets a function no client can
-- reach. B16 adds the Edge Function; this adds the one thing it needs from the database.
--
-- Why a separate read-only collect exists at all: `request_image_deletion` returns the paths AND
-- nulls `storage_path` in the same call, so using it to find out what to delete would destroy the
-- only reference to the blobs BEFORE the Storage API is touched — precisely the H7 ordering bug B4
-- fixed for account-delete. The invariant is collect → delete objects → purge rows → log completion
-- last, and it needs a collect step that mutates nothing.
--
-- The predicate is deliberately IDENTICAL to request_image_deletion's own (0021:84-87). If the two
-- ever drift, the Edge Function would delete one set of blobs and null a different set of rows.
create or replace function public.image_paths_for_deletion(p_user_id uuid)
returns table (bucket text, path text)
language sql
stable
security definer
set search_path = ''
as $$
  select 'scans'::text, s.storage_path
    from public.scans s
   where s.user_id = p_user_id
     and s.storage_path is not null
     and s.image_deleted_at is null;
$$;

comment on function public.image_paths_for_deletion(uuid) is
  'Read-only: which crop objects a user-requested image deletion would remove (audit M12c). Mutates '
  'nothing, so image-delete can purge storage BEFORE request_image_deletion drops the DB reference '
  '(the H7 collect-delete-purge-log-last invariant). Scans only — a share card is content the user '
  'chose to publish, not a photo of them.';

revoke all on function public.image_paths_for_deletion(uuid) from public, anon, authenticated;
grant execute on function public.image_paths_for_deletion(uuid) to service_role;
