-- H4 residue (ledger B15) — the three limbs B1 could not carry additively, plus the ordering guard
-- B1 deferred (D-05) because it needed RC's real payload shape, which B14 has now established.

-- ── H4(1): rc_event_id NOT NULL — the CONTRACT half of the expand/contract ───────────────────────
-- `subscription_events.rc_event_id text unique` (schema.sql:141) was NULLABLE, and **NULLs never
-- conflict in Postgres** — so a null-id event would re-insert and re-upsert forever, defeating the
-- very idempotency key it exists to be. B1 shipped the additive half (record_rc_event coalesces to
-- an `md5:` surrogate derived from the payload, so nothing it writes can be null). This is the
-- contraction, which is why it needed its own task and its own migration.
--
-- Backfill is a NO-OP, verified rather than assumed: subscription_events holds 0 rows and 0 nulls on
-- staging. If rows ever exist, the surrogate below is the same rule record_rc_event already applies,
-- so this stays correct — it is written to run, not as decoration.
update public.subscription_events
   set rc_event_id = 'md5:' || md5(payload::text)
 where rc_event_id is null;

alter table public.subscription_events alter column rc_event_id set not null;

-- ── H4(2): TRANSFER revokes nobody — and, it turns out, grants nobody either ─────────────────────
-- RC's docs (verified 2026-07-17, /docs/integrations/webhooks/event-types-and-fields): a TRANSFER
-- carries `transferred_from` and `transferred_to` (App User ID **arrays**) and **no `app_user_id`**,
-- and "The webhook is sent only for the destination user, although the event appears in both
-- customer histories." So RC never tells us about the source at all — nothing will ever arrive to
-- revoke it. This function is how the source loses what RC has already moved away from it.
--
-- Sets `expired` + empty entitlements rather than deleting the row: `subscriptions` is the audit
-- trail of who held what, and isPremiumRow already treats status='expired' as the hard stop.
create or replace function public.revoke_rc_entitlement(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare n int;
begin
  update public.subscriptions
     set status = 'expired', entitlements = '{}'::jsonb, updated_at = now()
   where user_id = p_user_id;
  get diagnostics n = row_count;
  return n > 0;
end;
$$;

-- ── H4(3): out-of-order events overwrite newer state (B1's D-05, now unblocked) ──────────────────
-- B1 deliberately did NOT build this: `latest_event_at = now()` stamps PROCESSING time, which is
-- monotonic by construction, so a guard against it would have been decorative — and `RcEvent` had no
-- timestamp field to use instead. B14 settled the payload: RC sends **`event_timestamp_ms`** on its
-- events. It rides inside `p_payload`, so the guard needs no signature change.
--
-- Now: `latest_event_at` records the EVENT's time, and a delayed RENEWAL arriving after an
-- EXPIRATION can no longer resurrect a lapsed subscription. Falls back to now() when the field is
-- absent, which degrades to exactly the old behaviour rather than dropping the event.
--
-- Body is B1's 0018 version verbatim except for the two marked additions.
create or replace function public.record_rc_event(
  p_rc_event_id   text,
  p_user_id       uuid,
  p_type          text,
  p_payload       jsonb,
  p_rc_app_user_id text,
  p_status        text,
  p_entitlements  jsonb
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key      text := coalesce(p_rc_event_id, 'md5:' || md5(p_payload::text));
  v_inserted int;
  v_applied  boolean;
  -- H4(3): the EVENT's own clock, not ours. `event_timestamp_ms` is RC's documented field.
  v_event_at timestamptz := coalesce(
    to_timestamp(nullif(p_payload->>'event_timestamp_ms', '')::bigint / 1000.0),
    now()
  );
begin
  insert into public.subscription_events (rc_event_id, user_id, type, payload)
    values (v_key, p_user_id, p_type, p_payload)
    on conflict (rc_event_id) do nothing;
  get diagnostics v_inserted = row_count;

  select applied_at is not null into v_applied
    from public.subscription_events where rc_event_id = v_key
    for update;
  if v_applied then
    return false; -- duplicate delivery of an applied event → idempotent no-op
  end if;

  if p_user_id is not null and exists (select 1 from public.profiles where id = p_user_id) then
    insert into public.subscriptions (user_id, rc_app_user_id, entitlements, status, latest_event_at, updated_at)
      values (p_user_id, p_rc_app_user_id, p_entitlements, p_status, v_event_at, now())
    on conflict (user_id) do update
      set rc_app_user_id  = excluded.rc_app_user_id,
          entitlements    = excluded.entitlements,
          status          = excluded.status,
          latest_event_at = excluded.latest_event_at,
          updated_at      = now()
      -- H4(3): only move forward. A stale delivery (RC retries for up to ~2.6h) must not overwrite
      -- newer state — the classic case being a delayed RENEWAL landing after an EXPIRATION.
      where public.subscriptions.latest_event_at <= excluded.latest_event_at;

    -- Stamped even when the guard above skipped the write: the event WAS processed to a decision
    -- ("older than what we hold"), and re-applying it later would be the same no-op.
    update public.subscription_events set applied_at = now() where rc_event_id = v_key;
    return true;
  end if;

  return v_inserted > 0;
end;
$$;

revoke all on function public.revoke_rc_entitlement(uuid) from public, anon, authenticated;
revoke all on function public.record_rc_event(text, uuid, text, jsonb, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.revoke_rc_entitlement(uuid) to service_role;
grant execute on function public.record_rc_event(text, uuid, text, jsonb, text, text, jsonb) to service_role;
