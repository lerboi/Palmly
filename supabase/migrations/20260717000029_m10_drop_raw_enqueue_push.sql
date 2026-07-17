-- M10 (ledger B18) — two push enqueue paths, one of which bypasses the §10 gate entirely.
--
-- `enqueue_push` (0013) calls queue_send directly: no dedupe, no cap. Its own header calls it "the
-- single enqueue entry point the pipeline uses" — which `enqueue_push_deduped` (0014) silently
-- superseded without ever deprecating it. Both are live and both are granted to service_role, so the
-- §10 rules ("hard cap 1 marketing-ish push/day; social + pipeline exempt but deduped") are enforced
-- only by remembering to call the right function.
--
-- This is the CONTRACTING half, which is why it is its own file and its own verify.

-- ── Drop the raw path ────────────────────────────────────────────────────────────────────────────
-- Verified before dropping: `git grep -n "enqueue_push\b" -- supabase` finds NO production caller —
-- the only real enqueuer, worker-compat/index.ts:110, already calls the deduped path. The single
-- reference was a test, updated alongside this migration.
--
-- Dropped rather than merely revoked (Decision Log D-26): a function nobody may call and nobody
-- should use is a trap, not a safety net. §NOT YET BUILT C.10 still has to add most of the
-- enqueuers (reading-ready, invite-accepted, the daily-fortune fan-out, solar terms, onboarding,
-- win-back) — dropping this is what makes each of them go through the gate instead of reaching for
-- the shorter name. If prod is ever rebuilt from migrations (P12), 0013 creates it and this removes
-- it; net absent.
drop function if exists public.enqueue_push(uuid, text, text, text, text, jsonb);

-- ── The marketing cap was check-then-insert (the audit's secondary note) ─────────────────────────
-- 0014:56-63 asked "does a marketing row exist for (user, today)?" and only then inserted, so two
-- concurrent marketing sends both saw nothing, both passed, and both inserted — their dedupe keys
-- differ, so the existing unique index did not stop them. Two marketing pushes, one day. That is the
-- same shape as M8: a check in one statement and an act in another is not a gate.
--
-- The fix is one word. `notification_log_marketing_idx` (0014:25) ALREADY has exactly the right
-- columns and predicate — the author built it to speed the `exists` lookup up rather than to BE the
-- invariant. Making it UNIQUE turns the cap into something the database enforces, and then the
-- insert's own conflict handling reports it. Safe: notification_log holds 0 rows and 0 groups would
-- violate it (verified).
drop index if exists public.notification_log_marketing_idx;

create unique index if not exists notification_log_marketing_daily_cap
  on public.notification_log (user_id, sent_on)
  where cap_class = 'marketing';

comment on index public.notification_log_marketing_daily_cap is
  'Backend §10: hard cap of ONE marketing push per user per day, enforced by the database rather '
  'than by a check-then-insert that two concurrent sends could both pass (audit M10). Also serves '
  'the lookups the old non-unique notification_log_marketing_idx did.';

-- ── enqueue_push_deduped: let the index do the work ──────────────────────────────────────────────
-- Body is 0014:35-81 verbatim except that the pre-check is gone and the conflict target is dropped.
-- `on conflict do nothing` (untargeted) catches BOTH unique indexes at once:
--   * (user_id, dedupe_key, sent_on) → a same-day repeat of this key   → null (deduped)
--   * (user_id, sent_on) where marketing → the daily cap is spent      → null (capped)
-- Both already returned null, so the semantics are unchanged — they are just atomic now, and there
-- is one path instead of two.
--
-- NOT changed: the window is still the UTC day (Decision Log D-27).
create or replace function public.enqueue_push_deduped(
  p_user_id    uuid,
  p_type       text,
  p_title      text,
  p_body       text,
  p_deep_link  text default null,
  p_data       jsonb default '{}'::jsonb,
  p_dedupe_key text default null,
  p_cap_class  text default 'exempt'
) returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key   text := coalesce(nullif(p_dedupe_key, ''), p_type);
  v_class text := case when p_cap_class = 'marketing' then 'marketing' else 'exempt' end;
  v_today date := (now() at time zone 'utc')::date;
  v_inserted int;
begin
  -- Reserve the slot. The two unique indexes ARE the rules: the (user, key, day) one dedupes an
  -- identical send, and the partial (user, day) one caps marketing at one per day — atomically, so
  -- a concurrent second marketing send loses the race instead of slipping past a stale read.
  insert into public.notification_log (user_id, dedupe_key, cap_class, sent_on, push_type)
  values (p_user_id, v_key, v_class, v_today, p_type)
  on conflict do nothing;

  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return null; -- deduped (same key today) or the daily marketing cap is already spent
  end if;

  return public.queue_send('push_jobs', jsonb_build_object(
    'user_id', p_user_id, 'type', p_type, 'title', p_title, 'body', p_body,
    'deep_link', p_deep_link, 'data', p_data
  ));
end;
$$;

revoke all on function public.enqueue_push_deduped(uuid, text, text, text, text, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.enqueue_push_deduped(uuid, text, text, text, text, jsonb, text, text) to service_role;
