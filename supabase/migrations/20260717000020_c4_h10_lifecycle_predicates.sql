-- Backend audit fixes (ledger B3): C4-SQL (crop deletion predicate) + H10 (sweep_stale_anon
-- destroys the surviving partner's pair). Deletion predicates destroy user data when wrong — each
-- limb below is justified against Backend-specs §9 rather than against the audit's summary.

-- ── C4-SQL — crops_due_for_deletion misses every non-terminal scan ────────────────────────────────
-- Spec §9: "Normalized crop … Deleted 24h after successful extraction (hourly cron) … Deleted
-- immediately on scan failure resolution or user request." Marketing claim: "Your photos are
-- analyzed, then deleted — usually within a day."
--
-- 0016:24 filtered `status in ('complete','matched','failed')`. Live `scans_status_check` has SEVEN
-- statuses — 'uploaded','queued','extracting','matched','narrating','complete','failed' — so a scan
-- abandoned in ANY of uploaded/queued/extracting/narrating kept its crop **forever**, directly
-- contradicting the D2 promise. That is the real defect, and it is a privacy defect.
--
-- Two deliberate departures from the audit's summary, both argued in the Decision Log:
--
-- (1) D-07 — the age stays keyed on `created_at`. The audit calls "24h after scan creation (not
--     after successful extraction)" a deviation, but keying on extraction would only ever retain
--     crops LONGER, and only for scans whose crop is already spent (extraction is done; pass 2 reads
--     features, never the image). It cannot protect a backlogged crop either — that is the
--     stuck-scan branch's job, which fires at the same 24h regardless. Re-analysis already has its
--     designed mechanism: the `keep_image` opt-in ("for users who want future re-analysis with
--     improved extractors", §9). So created_at is both the stronger privacy promise and the one the
--     user actually experiences ("I took a photo; it is gone within a day"). Spec is wrong here; the
--     SQL was right — same call the audit itself makes for the storage path [1] vs [2].
--
-- (2) The status list is dropped rather than extended. Enumerating statuses is what caused the bug:
--     every new status is a silent retention leak. The rule is now stated positively — a crop is due
--     once it is 24h old, whatever the scan is doing — so a future status cannot reintroduce this.
--
-- `failed` is deleted immediately (spec §9). Verified terminal, not a retry state:
-- worker-scan/index.ts:85-94 sets status='failed' only on the fail-fast/dead-letter branch and
-- archives the message; the retry branch leaves the status untouched for pgmq redelivery.
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
    and keep_image = false          -- §9 opt-in retention wins, including over a failed scan
    and (
      status = 'failed'             -- §9: deleted immediately on failure resolution
      or created_at < now() - interval '24 hours'  -- everything else, whatever state it is stuck in
    )
  order by created_at
  limit greatest(1, least(coalesce(p_batch, 200), 1000));
$$;

-- ── H10 — sweep_stale_anon destroys the SURVIVING partner's pair and result ───────────────────────
-- 0016:114-122 purges any anonymous user older than N days with no readings. purge_account:99
-- deletes auth.users, which cascades profiles → compatibility_pairs. Verified live: BOTH
-- compatibility_pairs_user_a_fkey AND compatibility_pairs_user_b_fkey are ON DELETE CASCADE, and
-- compatibility_results_pair_id_fkey cascades from the pair. So sweeping a stale anon silently
-- deletes the inviter's pair and their compatibility result — someone else's data, destroyed by a
-- cost-control sweep, with no action by that user.
--
-- "No readings" is NOT a proxy for "holds no compatibility": request_compat (0011:38-41) keys off
-- canonical_palm_fs → subject_profiles/feature_sets, NOT readings. A user whose extraction succeeded
-- but whose narrative failed has zero readings, is therefore sweepable, and can hold a **complete**
-- compat result. The blast radius is larger than "an invitee who never scanned".
--
-- Fix: never purge a pair member (D-08). Conservative by design — this is a deletion path, so it
-- trades a bounded MAU cost (a few retained anon rows) against irreversible destruction of an active
-- user's data. Reassign/tombstone would bound both, but inventing tombstone semantics for shared
-- relationship rows is a product call, not a bug fix.
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
    select au.id from auth.users au
    where au.is_anonymous = true
      and au.created_at < now() - make_interval(days => greatest(1, coalesce(p_days, 30)))
      and au.id not in (select user_id from public.readings)
      and not exists (
        select 1 from public.compatibility_pairs p
        where p.user_a = au.id or p.user_b = au.id
      )
  loop
    perform public.purge_account(u.id); -- reuses the erasure path (FK release + audit + cascade)
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- Unchanged posture (0016:129-140): cron/worker-only surface.
revoke all on function public.crops_due_for_deletion(int) from public, anon, authenticated;
revoke all on function public.sweep_stale_anon(int) from public, anon, authenticated;
grant execute on function public.crops_due_for_deletion(int) to service_role;
grant execute on function public.sweep_stale_anon(int) to service_role;
