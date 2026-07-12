-- Migration 0006 — public RPC wrappers so service-role Edge Function workers can drive pgmq via
-- PostgREST (Backend §4). SECURITY DEFINER; execute granted ONLY to service_role and revoked from
-- anon/authenticated/public, so the queues stay off the client Data API (§13).
create or replace function public.queue_read(p_queue text, p_vt int, p_qty int)
returns table (msg_id bigint, read_ct int, enqueued_at timestamptz, vt timestamptz, message jsonb)
language sql security definer set search_path = '' as $$
  select msg_id, read_ct, enqueued_at, vt, message from pgmq.read(p_queue, p_vt, p_qty);
$$;

create or replace function public.queue_send(p_queue text, p_msg jsonb)
returns bigint language sql security definer set search_path = '' as $$
  select pgmq.send(p_queue, p_msg);
$$;

create or replace function public.queue_archive(p_queue text, p_msg_id bigint)
returns boolean language sql security definer set search_path = '' as $$
  select pgmq.archive(p_queue, p_msg_id);
$$;

revoke all on function public.queue_read(text, int, int) from public, anon, authenticated;
revoke all on function public.queue_send(text, jsonb) from public, anon, authenticated;
revoke all on function public.queue_archive(text, bigint) from public, anon, authenticated;
grant execute on function public.queue_read(text, int, int) to service_role;
grant execute on function public.queue_send(text, jsonb) to service_role;
grant execute on function public.queue_archive(text, bigint) to service_role;
