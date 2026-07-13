-- P11.T2 — ops telemetry aggregation + alert detection (Backend §12, §14). worker_telemetry already
-- collects a row per job (queue age, model latency, cache hit, cost). These read-only functions
-- compute the dashboard metrics and the §12 alert signals over a rolling window. The email/Slack
-- delivery + the internal dashboard rendering are the human/deploy legs (parked); the DETECTION is
-- here and unit-testable with synthetic telemetry. Service-role only (ops data, §13).

-- Rolling per-(worker, queue) metrics over the last p_since window.
create or replace function public.ops_worker_metrics(p_since interval default interval '1 hour')
returns table (
  worker               text,
  queue                text,
  samples              bigint,
  failed               bigint,
  failure_rate         numeric,
  queue_age_p95_ms     numeric,
  model_latency_p95_ms numeric,
  cache_samples        bigint,
  cache_hit_ratio      numeric,
  cost_usd             numeric,
  cost_per_job         numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    t.worker,
    t.queue,
    count(*)                                                                                as samples,
    count(*) filter (where t.status = 'failed')                                             as failed,
    round(count(*) filter (where t.status = 'failed')::numeric / nullif(count(*), 0), 4)    as failure_rate,
    round(percentile_cont(0.95) within group (order by t.queue_age_ms)::numeric, 2)         as queue_age_p95_ms,
    round(percentile_cont(0.95) within group (order by t.model_latency_ms)::numeric, 2)     as model_latency_p95_ms,
    count(*) filter (where t.cache_hit is not null)                                          as cache_samples,
    round(avg((t.cache_hit)::int::numeric) filter (where t.cache_hit is not null), 4)        as cache_hit_ratio,
    round(coalesce(sum(t.cost_usd), 0), 6)                                                   as cost_usd,
    round(coalesce(sum(t.cost_usd), 0) / nullif(count(*), 0), 6)                             as cost_per_job
  from public.worker_telemetry t
  where t.created_at > now() - p_since
  group by t.worker, t.queue;
$$;

-- Breaching alert signals (§12: queue p95 > 60s, failure rate > 5%, cache-read ratio < 80%, spend
-- anomaly). A min-sample gate stops a single unlucky row from paging on-call. Spend anomaly compares
-- the recent hourly burn to the trailing-24h baseline hourly burn (× factor, floored).
create or replace function public.ops_alerts(
  p_since         interval default interval '1 hour',
  p_min_sample    int     default 20,
  p_queue_p95_ms  int     default 60000,
  p_failure_rate  numeric default 0.05,
  p_cache_ratio   numeric default 0.80,
  p_spend_factor  numeric default 3.0,
  p_spend_floor   numeric default 1.0
)
returns table (alert text, scope text, metric numeric, threshold numeric, detail text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_since_hours   numeric := extract(epoch from p_since) / 3600.0;
  v_recent        numeric;
  v_recent_hourly numeric;
  v_baseline_hr   numeric;
begin
  -- queue age p95 per queue
  return query
    select 'queue_age_p95'::text, m.queue, m.queue_age_p95_ms, p_queue_p95_ms::numeric,
           format('%s samples on %s', m.samples, m.queue)
    from public.ops_worker_metrics(p_since) m
    where m.samples >= p_min_sample and m.queue_age_p95_ms is not null and m.queue_age_p95_ms > p_queue_p95_ms;

  -- failure rate per worker
  return query
    select 'failure_rate'::text, m.worker, m.failure_rate, p_failure_rate,
           format('%s of %s jobs failed', m.failed, m.samples)
    from public.ops_worker_metrics(p_since) m
    where m.samples >= p_min_sample and m.failure_rate > p_failure_rate;

  -- cache-read ratio per worker (only where cache is actually measured)
  return query
    select 'cache_hit_ratio'::text, m.worker, m.cache_hit_ratio, p_cache_ratio,
           format('%s cache samples', m.cache_samples)
    from public.ops_worker_metrics(p_since) m
    where m.cache_samples >= p_min_sample and m.cache_hit_ratio is not null and m.cache_hit_ratio < p_cache_ratio;

  -- spend anomaly (global): recent hourly burn vs trailing-24h baseline hourly burn
  select coalesce(sum(t.cost_usd), 0) into v_recent
    from public.worker_telemetry t where t.created_at > now() - p_since;
  v_recent_hourly := case when v_since_hours > 0 then v_recent / v_since_hours else v_recent end;

  select coalesce(sum(t.cost_usd), 0) / nullif(24 - v_since_hours, 0) into v_baseline_hr
    from public.worker_telemetry t
    where t.created_at <= now() - p_since and t.created_at > now() - interval '24 hours';

  if v_recent_hourly > p_spend_factor * greatest(coalesce(v_baseline_hr, 0), p_spend_floor) then
    return query select 'spend_anomaly'::text, 'global'::text,
      round(v_recent_hourly, 4),
      round(p_spend_factor * greatest(coalesce(v_baseline_hr, 0), p_spend_floor), 4),
      format('recent $%s/h vs baseline $%s/h', round(v_recent_hourly, 4), round(coalesce(v_baseline_hr, 0), 4));
  end if;
end;
$$;

revoke all on function public.ops_worker_metrics(interval) from public, anon, authenticated;
revoke all on function public.ops_alerts(interval, int, int, numeric, numeric, numeric, numeric) from public, anon, authenticated;
grant execute on function public.ops_worker_metrics(interval) to service_role;
grant execute on function public.ops_alerts(interval, int, int, numeric, numeric, numeric, numeric) to service_role;
