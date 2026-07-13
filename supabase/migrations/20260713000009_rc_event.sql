-- P7.T3 — RevenueCat webhook persistence (Backend §5.2). Atomic + idempotent: append the raw event
-- to subscription_events (idempotency key = rc_event_id) and, only if it was new, upsert the
-- authoritative `subscriptions` row. The Edge Function computes the entitlement state (TS,
-- unit-tested) and calls this; keeping the write in one function makes the idempotency + upsert a
-- single transaction. SECURITY DEFINER + service-role only (webhooks run as the service role).
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
  inserted int;
begin
  insert into public.subscription_events (rc_event_id, user_id, type, payload)
    values (p_rc_event_id, p_user_id, p_type, p_payload)
    on conflict (rc_event_id) do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then
    return false; -- duplicate delivery → idempotent no-op (subscription already reflects it)
  end if;

  -- upsert the authoritative entitlement row only when the event maps to a known user
  if p_user_id is not null and exists (select 1 from public.profiles where id = p_user_id) then
    insert into public.subscriptions (user_id, rc_app_user_id, entitlements, status, latest_event_at, updated_at)
      values (p_user_id, p_rc_app_user_id, p_entitlements, p_status, now(), now())
    on conflict (user_id) do update
      set rc_app_user_id  = excluded.rc_app_user_id,
          entitlements    = excluded.entitlements,
          status          = excluded.status,
          latest_event_at = now(),
          updated_at      = now();
  end if;
  return true;
end;
$$;

revoke all on function public.record_rc_event(text, uuid, text, jsonb, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.record_rc_event(text, uuid, text, jsonb, text, text, jsonb) to service_role;
