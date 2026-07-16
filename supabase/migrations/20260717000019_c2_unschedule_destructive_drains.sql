-- C2 interim (Backend-audit.md §4, ledger B2) — the live cron is actively DESTROYING real jobs.
--
-- 20260712000004_queues.sql:60-64 schedules 5 crons that call `drain_stub`, a no-op worker which
-- READS AND ARCHIVES every message it finds (0004:48-52). It exists only to prove the
-- enqueue→drain→archive→telemetry path (its own header: "P5 replaces the cron command with a real
-- Edge Function call"). That replacement never happened, so today the crons are pure destruction:
-- nothing consumes these queues, and any message enqueued is archived into the trash within 10-15s.
--
-- Live evidence at time of writing: all 5 jobs `active`, ~47.8k runs at 100% "success"; queues carry
-- real throughput history (scan 56 / narrative 20 / compat 39 / push 130 total_messages).
-- Migrations 0011:50,73 (request_compat, resolve_awaiting_compat) and 0013:16 / 0014:76
-- (enqueue_push, enqueue_push_deduped) enqueue REAL messages from user actions **today**.
--
-- Scope: this is the audit's own INTERIM recommendation. The full fix — rescheduling the drains at
-- `net.http_post` against the deployed workers, with the service key held in Vault — is deliberately
-- OUT of this ledger's scope (pg_net is not installed; Backend-audit §NOT YET BUILT A.3 parks the
-- security-sensitive design for MVP_Buildplan.md). C2 therefore closes as `[~]`, not `[x]`.
--
-- All 5 are unscheduled, not just the 2 with live SQL enqueuers (Decision Log D-06): drain_stub is
-- destructive for ANY queue that receives a message, and leaving the scan/narrative drains armed is
-- a live trap for the next buildplan task (scan-create/scan-ingest) — the first real scan job would
-- be eaten within 10 seconds. The drain path's proof value is retained: queues.test.mjs calls
-- drain_stub directly and does not depend on the schedule.
--
-- REVERSIBLE — to restore the previous state exactly, re-run 0004:60-64:
--   select cron.schedule('drain_scan_jobs',      '10 seconds', $$select public.drain_stub('scan_jobs')$$);
--   select cron.schedule('drain_narrative_jobs', '10 seconds', $$select public.drain_stub('narrative_jobs')$$);
--   select cron.schedule('drain_compat_jobs',    '15 seconds', $$select public.drain_stub('compat_jobs')$$);
--   select cron.schedule('drain_push_jobs',      '15 seconds', $$select public.drain_stub('push_jobs')$$);
--   select cron.schedule('drain_cleanup_jobs',   '* * * * *',  $$select public.drain_stub('cleanup_jobs')$$);
-- (Restoring is only correct once the command is a real worker invocation, not drain_stub.)

-- Driven off a select over cron.job so it is idempotent: cron.unschedule(name) raises if the job is
-- already gone, whereas this is a no-op when the set is empty.
select cron.unschedule(jobid)
from cron.job
where command like '%drain_stub%';
