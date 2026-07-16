-- H2 (ledger B5) — worker-narrative has no idempotency guard, so a redelivery duplicates a reading
-- AND pays Gemini twice.
--
-- worker-narrative/index.ts generates (a paid model call) and then inserts, with nothing in between
-- to notice the work was already done. A crash/timeout after the call but before `archive` → pgmq
-- redelivers after the visibility timeout → a second charge and a second `readings` row for the same
-- (feature_set_id, depth_level).
--
-- ERRATA-confirmed: worker-compat's guard is a *status check on a row that already exists*
-- (`compat-request` creates the compatibility_results row up front). worker-narrative has no such
-- row — the reading IS the output — so there is nothing to status-check. The invariant has to live
-- in the DB. Verified live before writing: `readings` carried only readings_pkey(id) and
-- readings_user_id_created_at_idx, i.e. no uniqueness at all.
--
-- `depth_level` is `int not null default 1` (schema.sql:77), so there is no NULL escape hatch that
-- would silently defeat this index (NULLs never conflict — the same trap H4 hit with rc_event_id).
--
-- Safe to add now: `readings` has 0 rows on staging. If duplicates ever existed this would fail
-- loudly at apply time, which is the correct outcome — it would mean the bug had already shipped.
-- No CONCURRENTLY: the CLI wraps each migration in a single transaction, where it is illegal.
create unique index if not exists readings_feature_set_id_depth_level_key
  on public.readings (feature_set_id, depth_level);

comment on index public.readings_feature_set_id_depth_level_key is
  'One reading per (feature_set, depth_level). The backstop for worker-narrative redelivery (audit '
  'H2): the worker also short-circuits before the model call to avoid paying twice, but this index '
  'is what makes a duplicate row impossible even if two workers race the same message.';
