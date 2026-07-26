-- RF1.T5 (Audit-5 · 03 §2.5) — schedule the nightly Today's Line generation.
--
-- Same vault-secret `net.http_post` pattern as migration 0034, for the same security reason: this
-- file contains NO secret and NO project ref. The job reads `project_url` and `edge_service_key`
-- from `vault.decrypted_secrets` BY NAME at fire time, so the identical migration wires staging
-- today and a recreated prod at P12. Auth is the `apikey` header (the sb_secret_ key is not a JWT
-- and the gateway rejects it on Bearer); the worker's `requireMode('secret')` is the actual gate.
--
-- 03:10 UTC — ten minutes after `palmly-fortune-generate` at 03:00, so the two nightly Gemini runs
-- do not contend for the same rate-limit window, and so a fortune failure is already visible in
-- telemetry before this one starts. Empty body ⇒ the worker's `nextUtcDate()` = TOMORROW, which is
-- ahead of every timezone's morning (the same reasoning as the fortune job).
--
-- Re-scheduling a job by the same name upserts (pg_cron), so this migration is additive/idempotent.

select cron.schedule('palmly-pulse-generate', '10 3 * * *', $CRON$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/pulse-generate',
    headers := jsonb_build_object('Content-Type','application/json','apikey',(select decrypted_secret from vault.decrypted_secrets where name = 'edge_service_key')),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
$CRON$);
