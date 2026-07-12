-- Migration 0004 — queues (pgmq) + cron drains + worker telemetry (Backend §4, §12, §14).
-- Queues are server-only (never exposed through the Data API). Cron drains high-priority
-- queues every 10-15s. The workers are no-op stubs now; P5 swaps the cron command to invoke
-- the real Edge Function workers.
create extension if not exists pgmq;
create extension if not exists pg_cron;

-- Queues (§4).
select pgmq.create('scan_jobs');
select pgmq.create('narrative_jobs');
select pgmq.create('compat_jobs');
select pgmq.create('push_jobs');
select pgmq.create('cleanup_jobs');

-- Worker telemetry (§12/§14: queue age, model latency, cache-hit ratio, per-job token spend).
create table public.worker_telemetry (
  id               bigint generated always as identity primary key,
  worker           text not null,
  queue            text,
  msg_id           bigint,
  status           text not null default 'ok' check (status in ('ok','failed','retry')),
  queue_age_ms     int,
  model_latency_ms int,
  tokens_in        int,
  tokens_out       int,
  cache_hit        boolean,
  cost_usd         numeric,
  detail           jsonb not null default '{}',
  created_at       timestamptz not null default now()
);
create index on public.worker_telemetry (worker, created_at desc);
-- Ops data — service_role only. RLS on, no policy → deny-all to authenticated.
alter table public.worker_telemetry enable row level security;

-- No-op drain worker (P5 replaces the cron command with a real Edge Function call). Reads a
-- batch, archives each message, records telemetry — proves the enqueue→drain→archive→telemetry
-- path end to end.
create or replace function public.drain_stub(p_queue text, p_batch int default 10)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  m record;
  n int := 0;
begin
  for m in select * from pgmq.read(p_queue, 30, p_batch) loop
    perform pgmq.archive(p_queue, m.msg_id);
    insert into public.worker_telemetry (worker, queue, msg_id, status, queue_age_ms)
      values ('stub', p_queue, m.msg_id, 'ok',
              (extract(epoch from (now() - m.enqueued_at)) * 1000)::int);
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- Cron drains (no-op stubs; §4 cadence; sub-minute schedules need pg_cron ≥ 1.5).
select cron.schedule('drain_scan_jobs',      '10 seconds', $$select public.drain_stub('scan_jobs')$$);
select cron.schedule('drain_narrative_jobs', '10 seconds', $$select public.drain_stub('narrative_jobs')$$);
select cron.schedule('drain_compat_jobs',    '15 seconds', $$select public.drain_stub('compat_jobs')$$);
select cron.schedule('drain_push_jobs',      '15 seconds', $$select public.drain_stub('push_jobs')$$);
select cron.schedule('drain_cleanup_jobs',   '* * * * *',  $$select public.drain_stub('cleanup_jobs')$$);
