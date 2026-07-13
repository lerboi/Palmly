-- P5.T7 — live scan-status delivery via Realtime Broadcast from Database (Backend §6.1).
-- An AFTER UPDATE OF status trigger on public.scans broadcasts each transition to the private
-- Realtime topic `scan:{id}`; the client subscribes (fetch-then-subscribe) and drives the
-- analyzing → reveal UI. RLS on realtime.messages restricts that topic to the scan's owner.
-- Broadcast (not Postgres Changes) per §6.1 — Postgres Changes degrades ≥90% under RLS at scale.

-- Trigger fn: SECURITY DEFINER so the broadcast (realtime.broadcast_changes → realtime.send →
-- realtime.messages) runs with rights regardless of which role updated the scan (worker
-- service_role, or the user). search_path='' → realtime.* is schema-qualified; trigger vars only.
create or replace function public.broadcast_scan_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.broadcast_changes(
    'scan:' || new.id::text,  -- topic_name: one private channel per scan
    'status',                 -- event_name
    tg_op,                    -- 'UPDATE'
    tg_table_name,            -- 'scans'
    tg_table_schema,          -- 'public'
    new,                      -- record: payload.record carries new.status
    old                       -- old_record
  );
  return null;
end;
$$;

drop trigger if exists scan_status_broadcast on public.scans;
create trigger scan_status_broadcast
  after update of status on public.scans
  for each row
  when (old.status is distinct from new.status)   -- only real transitions broadcast
  execute function public.broadcast_scan_status();

-- Private-channel authorization: a client may receive on `scan:{id}` only if it owns that scan.
-- realtime.messages is owned by supabase_realtime_admin, but the migration role (postgres) is
-- permitted to define policies on it AND can resolve auth.uid()/public.scans in the expression
-- (verified on staging; `set role supabase_realtime_admin` cannot resolve the auth schema, so we
-- create the policy directly as the migration role).
drop policy if exists scan_owner_receives_status on realtime.messages;
create policy scan_owner_receives_status
  on realtime.messages
  for select
  to authenticated
  using (
    -- string-equality on the topic (never parse+cast the topic to uuid: a non-scan topic like
    -- 'lobby' would raise 22P02 since AND is not guaranteed to short-circuit before the cast).
    exists (
      select 1 from public.scans s
      where s.user_id = (select auth.uid())
        and realtime.topic() = 'scan:' || s.id::text
    )
  );
