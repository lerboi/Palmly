-- Audit Low bullets (ledger B20), two unrelated items that both happen to be triggers.
--
--   (c) `profiles.updated_at` never auto-updates (no moddatetime trigger).
--   (d) The scan-status broadcast payload carries the FULL `scans` row.

-- ── (c) profiles.updated_at ──────────────────────────────────────────────────────────────────────
-- Verified before writing: `profiles` had ZERO triggers, and nothing in supabase/functions or app/src
-- ever writes `updated_at` — so the column has been permanently equal to `created_at` since 0001.
-- It is not decorative: it is the only "when did this user last change anything" signal, and 0001
-- declares it `not null default now()`, i.e. the schema already promises a value that means
-- something. moddatetime is the Supabase-blessed way to keep that promise (it ships with the
-- platform; installed into `extensions`, never `public`).
create extension if not exists moddatetime with schema extensions;

-- Only `profiles` gets this here: it is the only table the audit names, and the only one where a
-- client-driven UPDATE is the norm. `scans`/`readings` are worker-written state machines whose
-- meaningful timestamps are their own status columns.
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function extensions.moddatetime(updated_at);

comment on column public.profiles.updated_at is
  'Maintained by the profiles_set_updated_at moddatetime trigger. Before migration 0030 this column '
  'existed but was never updated, so it always equalled created_at (audit Low).';

-- ── (d) Narrow the scan-status broadcast payload ─────────────────────────────────────────────────
-- 0007 called realtime.broadcast_changes(..., new, old), and that helper (verified live via
-- pg_get_functiondef) builds:
--     jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', .., 'table', .., 'schema', ..)
-- i.e. it ships EVERY column of the scans row -- id, user_id, kind, side, status, storage_path,
-- image_deleted_at, capture_meta, failure_reason, created_at, keep_image -- and does it TWICE (NEW
-- and OLD), on every status transition.
--
-- Not a leak: `realtime.messages` RLS (0007, unchanged below) restricts topic `scan:{id}` to the
-- scan's owner, so this only ever reached the one user who already owns the row. It is a blast-radius
-- fix, not a vulnerability fix: `storage_path` is the private-bucket key for the user's palm photo,
-- and a status ping is not a reason to put it on a websocket. The narrow payload is also the
-- difference between "the broadcast is a notification" and "the broadcast is a row replica" -- the
-- latter invites clients to read fields that RLS, not the socket, is supposed to arbitrate.
--
-- The envelope shape is PRESERVED deliberately: app/src/lib/useScanStatus.ts:69 reads
-- `msg.payload.record.status` and `.failure_reason`, so `record` must stay a `record`. Only its
-- contents shrink. (The app's jest tests assert against their own fixtures and structurally cannot
-- catch a server-contract change, so this had to be checked by reading the client.)
create or replace function public.broadcast_scan_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- realtime.send rather than realtime.broadcast_changes: the helper's whole job is to serialise the
  -- whole row, so there is no narrowing it from the outside. private => true is REQUIRED and not a
  -- default worth trusting here -- the client subscribes with `config: { private: true }`, and a
  -- public send would both miss that subscriber and put the payload on an unauthorised channel.
  perform realtime.send(
    jsonb_build_object(
      'record', jsonb_build_object(
        'id', new.id,
        'status', new.status,
        'failure_reason', new.failure_reason
      ),
      'old_record', jsonb_build_object('status', old.status),
      'operation', tg_op,
      'table', tg_table_name,
      'schema', tg_table_schema
    ),
    'status',                    -- event_name (unchanged)
    'scan:' || new.id::text,     -- topic_name (unchanged)
    true                         -- private
  );
  return null;
end;
$$;

comment on function public.broadcast_scan_status() is
  'Backend §6.1: broadcasts scan status transitions to the private topic scan:{id}. Sends ONLY '
  'id/status/failure_reason -- before migration 0030 it used realtime.broadcast_changes, which ships '
  'every column of the row (incl. storage_path, capture_meta) twice, on an owner-only topic (audit Low).';

-- The trigger itself (0007:31-35) and the realtime.messages owner policy are unchanged: same topic,
-- same event name, same "only real transitions broadcast" WHEN clause. create-or-replace of the
-- function is enough; re-creating the trigger would be churn.
