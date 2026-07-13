-- P9.T5 — notification caps + dedupe (Backend §10, UIUX §4). All sends fan out through push_jobs
-- (migration 0013 enqueue_push). This adds the server-side gate that enforces the §10 rules:
--   • dedupe: a repeat trigger of the SAME entity on the same day enqueues at most once;
--   • hard cap: at most ONE 'marketing' push per user per day (fortune / solar-term / onboarding /
--     win-back). Social (compat, invite) + pipeline (reading-ready) events are cap-exempt but still
--     deduped. Quiet hours + per-device prefs remain enforced downstream in push-dispatch (0013).
--
-- The dedupe key is entity-scoped by the caller (e.g. 'reading_ready:{scan_id}') so two distinct
-- scans each notify, while a double-fire of one scan collapses. "Within 30 min" (§10) is
-- approximated by same-day dedupe on entity keys — stricter and simpler; a per-day grain is correct
-- because every event key already names its one-time entity.

create table if not exists public.notification_log (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  dedupe_key  text not null,
  cap_class   text not null default 'exempt' check (cap_class in ('marketing', 'exempt')),
  sent_on     date not null default (now() at time zone 'utc')::date,
  push_type   text,
  created_at  timestamptz not null default now(),
  unique (user_id, dedupe_key, sent_on)
);

-- Fast "did this user already get a marketing push today?" lookup for the cap check.
create index if not exists notification_log_marketing_idx
  on public.notification_log (user_id, sent_on)
  where cap_class = 'marketing';

-- Server-owned bookkeeping — no client access (like worker_telemetry). RLS on, no policies.
alter table public.notification_log enable row level security;

-- Dedupe/cap-aware enqueue. Returns the push_jobs msg_id when a push is enqueued, or NULL when the
-- send was suppressed (duplicate within the day, or the daily marketing cap was already spent).
-- SECURITY DEFINER + service-role only — the pipeline/workers are the only callers.
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
  -- Hard cap: one marketing push per user per day. Checked before reserving the slot so a *different*
  -- marketing send later in the day is suppressed even though its dedupe key is unique.
  if v_class = 'marketing' then
    if exists (
      select 1 from public.notification_log
      where user_id = p_user_id and sent_on = v_today and cap_class = 'marketing'
    ) then
      return null; -- daily marketing cap already spent
    end if;
  end if;

  -- Reserve the (user, key, day) slot. ON CONFLICT DO NOTHING → a same-day repeat of this key is a no-op.
  insert into public.notification_log (user_id, dedupe_key, cap_class, sent_on, push_type)
  values (p_user_id, v_key, v_class, v_today, p_type)
  on conflict (user_id, dedupe_key, sent_on) do nothing;

  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return null; -- deduped: already sent this key today
  end if;

  return public.queue_send('push_jobs', jsonb_build_object(
    'user_id', p_user_id, 'type', p_type, 'title', p_title, 'body', p_body,
    'deep_link', p_deep_link, 'data', p_data
  ));
end;
$$;

revoke all on function public.enqueue_push_deduped(uuid, text, text, text, text, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.enqueue_push_deduped(uuid, text, text, text, text, jsonb, text, text) to service_role;
