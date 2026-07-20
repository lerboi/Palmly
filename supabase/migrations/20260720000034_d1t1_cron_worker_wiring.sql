-- D1.T1 (Audit-3 finding A4 / Plan R2.T1) — cron→worker wiring. THE task that makes the pipeline
-- self-draining. The standing "do NOT schedule pg_cron / install pg_net" parking rule is lifted for
-- exactly this one migration (Audit-3 loop hard rule).
--
-- History: migration 0004 scheduled 5 `drain_stub` crons (a no-op that read→archived→telemetry'd
-- without calling the real workers); migration 0019 unscheduled all 5 because they weren't real. This
-- schedules the REAL wiring: pg_cron fires `net.http_post` (async HTTP via pg_net) against the deployed
-- secret-mode Edge Function workers at the Backend §4 cadences.
--
-- ── SECURITY (Audit-3 hard rule) ──────────────────────────────────────────────────────────────────
-- This file contains NO secret and NO project ref. Every job reads, AT FIRE TIME, by name:
--   • project_url       = https://<ref>.supabase.co          (the functions origin)
--   • edge_service_key  = the sb_secret_ SERVICE_ROLE key     (what the workers' requireMode 'secret'
--                                                              compares against)
-- from `vault.decrypted_secrets`. Both Vault secrets are inserted ONCE per project by an UNCOMMITTED
-- one-off script (never in git) and MUST exist before the jobs fire, else net.http_post gets a null
-- url/apikey. For the R5.T7 prod-from-git recreation: insert both prod Vault secrets, then this same
-- migration wires prod correctly — that is why project_url lives in Vault, not hardcoded here.
--
-- Auth = the `apikey` header (NOT `Authorization: Bearer`): the new sb_secret_ key is not a JWT and is
-- rejected on Bearer by the gateway; the workers' `bearerToken` (auth-resolve.ts) falls back to the
-- `apikey` header → resolveAuth matches the service key → `requireMode 'secret'` passes.
--
-- Cadences (Backend §4 / §9): queue drains 10–15s (one message per invocation, pgmq vt covers
-- redelivery); cleanup + ops-alerts hourly; fortune-generate nightly at 03:00 UTC (empty body → the
-- worker's nextUtcDate = TOMORROW's buckets, ahead of every timezone's morning). Re-scheduling a job
-- by the same name upserts (pg_cron), so this migration is additive / idempotent.

create extension if not exists pg_net with schema extensions;

-- ── High-priority queue drains (net.http_post → the secret-mode workers) ──────────────────────────
select cron.schedule('palmly-drain-scan', '10 seconds', $CRON$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/worker-scan',
    headers := jsonb_build_object('Content-Type','application/json','apikey',(select decrypted_secret from vault.decrypted_secrets where name = 'edge_service_key')),
    body := '{}'::jsonb,
    timeout_milliseconds := 5000
  );
$CRON$);

select cron.schedule('palmly-drain-narrative', '10 seconds', $CRON$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/worker-narrative',
    headers := jsonb_build_object('Content-Type','application/json','apikey',(select decrypted_secret from vault.decrypted_secrets where name = 'edge_service_key')),
    body := '{}'::jsonb,
    timeout_milliseconds := 5000
  );
$CRON$);

select cron.schedule('palmly-drain-compat', '15 seconds', $CRON$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/worker-compat',
    headers := jsonb_build_object('Content-Type','application/json','apikey',(select decrypted_secret from vault.decrypted_secrets where name = 'edge_service_key')),
    body := '{}'::jsonb,
    timeout_milliseconds := 5000
  );
$CRON$);

select cron.schedule('palmly-drain-push', '15 seconds', $CRON$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/push-dispatch',
    headers := jsonb_build_object('Content-Type','application/json','apikey',(select decrypted_secret from vault.decrypted_secrets where name = 'edge_service_key')),
    body := '{}'::jsonb,
    timeout_milliseconds := 5000
  );
$CRON$);

-- ── Hourly maintenance ────────────────────────────────────────────────────────────────────────────
select cron.schedule('palmly-cleanup', '0 * * * *', $CRON$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/cleanup',
    headers := jsonb_build_object('Content-Type','application/json','apikey',(select decrypted_secret from vault.decrypted_secrets where name = 'edge_service_key')),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
$CRON$);

select cron.schedule('palmly-ops-alerts', '15 * * * *', $CRON$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/ops-alerts',
    headers := jsonb_build_object('Content-Type','application/json','apikey',(select decrypted_secret from vault.decrypted_secrets where name = 'edge_service_key')),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
$CRON$);

-- ── Nightly fortune pre-generation (empty body → worker's nextUtcDate = tomorrow) ─────────────────
select cron.schedule('palmly-fortune-generate', '0 3 * * *', $CRON$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/fortune-generate',
    headers := jsonb_build_object('Content-Type','application/json','apikey',(select decrypted_secret from vault.decrypted_secrets where name = 'edge_service_key')),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
$CRON$);
