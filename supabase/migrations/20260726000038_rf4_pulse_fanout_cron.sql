-- RF4.T3 (Audit-5 · 03 §2.5) — schedule the morning Today's Line fan-out.
--
-- Same vault-secret `net.http_post` pattern as migrations 0034 and 0037: no secret and no project
-- ref in this file; the job reads `project_url` and `edge_service_key` from
-- `vault.decrypted_secrets` BY NAME at fire time, so this identical migration wires staging today
-- and a recreated prod at P12.
--
-- Every 15 minutes, because the send is TIMEZONE-SHARDED rather than blasted: the worker selects the
-- devices whose LOCAL clock reads 08:30–08:44 and pushes only those. A 15-minute cadence against a
-- 15-minute window means every device on earth falls inside exactly one tick per day — never zero
-- (which would silently drop a timezone) and never two (which the dedupe key would absorb, but only
-- by covering for a wrong query).
--
-- The worker is a PRODUCER only. It enqueues through `enqueue_push_deduped`, so the dedupe key, the
-- hard 1/day marketing cap, quiet hours, Expo batching and dead-token pruning all still belong to
-- the paths that already have them. Staged rollout is the `PULSE_FANOUT_ALLOWLIST` env var on the
-- function, not a change to this schedule.
--
-- Re-scheduling a job by the same name upserts (pg_cron), so this migration is additive/idempotent.

select cron.schedule('palmly-pulse-fanout', '*/15 * * * *', $CRON$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/pulse-fanout',
    headers := jsonb_build_object('Content-Type','application/json','apikey',(select decrypted_secret from vault.decrypted_secrets where name = 'edge_service_key')),
    body := '{}'::jsonb,
    timeout_milliseconds := 25000
  );
$CRON$);
