-- P9.T4 — push enqueue helper (Backend §10). All sends fan out through push_jobs (pgmq) → the
-- push-dispatch worker. This is the single enqueue entry point the pipeline uses (reading ready,
-- compat complete, invite accepted, daily fortune, …). SECURITY DEFINER + service-role only.
create or replace function public.enqueue_push(
  p_user_id   uuid,
  p_type      text,
  p_title     text,
  p_body      text,
  p_deep_link text default null,
  p_data      jsonb default '{}'::jsonb
) returns bigint
language sql
security definer
set search_path = ''
as $$
  select public.queue_send('push_jobs', jsonb_build_object(
    'user_id', p_user_id, 'type', p_type, 'title', p_title, 'body', p_body,
    'deep_link', p_deep_link, 'data', p_data
  ));
$$;

revoke all on function public.enqueue_push(uuid, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.enqueue_push(uuid, text, text, text, text, jsonb) to service_role;
