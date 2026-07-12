-- Migration 0003 — Storage buckets + storage.objects RLS (Backend spec §3.3, §9).
-- Private `scans` bucket: normalized crops, path convention `{user_id}/{scan_id}.jpg`, owner-only,
-- deleted 24h post-extraction (cleanup cron, P10). Public `cards` bucket: share-card PNGs served
-- via CDN. Note: object `name` is the path WITHIN the bucket, so the owner segment is
-- foldername(name)[1] (the spec's [2] counted the bucket prefix; storage.objects excludes it).

insert into storage.buckets (id, name, public)
values ('scans', 'scans', false),
       ('cards', 'cards', true)
on conflict (id) do nothing;

-- Private scans: owner-only CRUD keyed on the leading path segment = auth.uid().
create policy "scans_owner_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'scans' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "scans_owner_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'scans' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "scans_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'scans' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'scans' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "scans_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'scans' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Public cards: world-readable (also served via the public CDN endpoint). Writes come from the
-- card-render Edge Function (service_role, BYPASSRLS) — no authenticated write policy.
create policy "cards_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'cards');
