# Palmly — Backend Audit Fix Ledger

**Findings source of truth:** [`Planning/Audits/Backend-audit.md`](./Backend-audit.md) (audit dated
2026-07-15). **Specs it is judged against:** `Planning/Backend-specs.md` · `Planning/mvp_spec.md`.
**Build ledger this one is a side-round of:** `Planning/MVP_Buildplan.md` (its STATE is NOT updated by
this round — see Decision Log D-01).

This ledger is a checkbox task machine — same conventions as `MVP_Buildplan.md` and the completed
`UIUX-Redesign-v2-Tasks.md` (V1–V23, archived). It converts the audit's **findings** (§4 Critical/High,
§5 Medium/Low) into ordered, independently-verifiable tasks **B0–B22**.

Checkbox: `[ ]` not started · `[~]` in progress/partial (resume note required) · `[x]` done+verified
(includes *closed as false positive* and *closed as decision*) · `[!]` blocked.

---

## SCOPE

**IN scope — the audit's finding list:** C1–C5, H1–H10, M1–M14, and the §5 Low/informational bullets —
plus **§3.3's test coverage gaps** (B21), which are the audit's own final suggested work item. Every
finding has exactly one owning task below; no finding is dropped silently.

**OUT of scope:**
- **§NOT YET BUILT** (`scan-create`/`scan-ingest`, cron→worker wiring, KB embeddings, push enqueuers,
  depth-2 path, SSE chat, client wiring, ops delivery, P12 items…) — that is `MVP_Buildplan.md`'s job.
  **One deliberate exception:** C2 and C4 are *findings* whose complete fix requires the cron→worker
  wiring. This ledger delivers the **in-scope interim** (B2/B3: stop the destruction, fix the
  predicate) and defers the full `pg_net`+Vault wiring to the buildplan. **If the loop finds itself
  building the pg_net/Vault wiring, it has left this ledger's scope — stop and say so.**
- **§RECOMMENDED ADDITIONS** (invite rewards, streaks, weekly recap, 本命年 flavor, fortune chat chip,
  `app_config`, dead-letter replay) — feature proposals, not defects. Not tracked here.

---

## STATE

- **Status:** 🟩 **IN PROGRESS** — B0 done 2026-07-17. Baseline is now honestly green, so from here a
  red test is this round's own regression.
- **Baseline suites (re-pinned 2026-07-17; both grow as tasks add regression tests — Node B0 100 → B1 105 → B2 106 → B3 109 → B4 111 → B5 112 → B6 113; Deno 133 → B4 137 → B6 138):**
  **Node 113/113** (`# pass 113 / # fail 0`, 242.9s) · **Deno 138/138** (`138 passed | 0 failed`, 2s)
  · app jest **39/39** (8 suites). ⚠️ The buildplan's "Deno 130 / Node 100" is **stale** — do not
  quote it. The pre-B0 "Node 96/100" is now historical.
- **The audit's own "can't run the suites" caveat DOES NOT APPLY HERE.** It was written on a Mac with
  no Deno and no `.env.staging`. **This is the Windows dev machine:** Deno 2.9.2 is at
  `C:\Users\leheh\.deno\bin\deno.exe` and `.env.staging` is present. Both suites run. Every task below
  is expected to produce a **real, observed** test count.
- **Last completed:** **B6** (2026-07-17) — worker-scan status guard + vt 300 + subject_profiles
  error surfaced. Suites: **Node 113/113**, **Deno 138/138**.
- **Next task:** **B7 — card-render** *(H8, M4)*. **Both product decisions are ANSWERED** (D-10 fonts
  → commit all 3 + wasm; D-11 → pre-render private, publish on share) and the triage + plan are
  banked under B7. **Start at the build; do not re-ask.** B5's precede-B7 dependency is discharged;
  `preRenderCard` now sits at **`worker-narrative:171`** (not the audit's `:148`).
- **Carried to B22:** **M2-scan** — a `feature_hash` short-circuit is impossible by construction
  (the hash is computed *from* the extraction output, so it cannot gate the extraction); it needs
  P4 capture-time landmarks, which is **M1's** existing deferral. Record the two together.
- **Carried forward:** B21 additionally owns the **live storage round-trip** (audit §3.3 gap #2),
  which B4 could not close without a new dep + persistent staging mutation (D-09). B16 must **import
  `purgeAccountStorageFirst`** rather than re-implement the ordering.
- **Owed doc correction:** `Planning/Backend-specs.md` §9 says crops are "deleted 24h after
  successful extraction"; the SQL keys on `created_at` **deliberately** (D-07). Fold this into
  B22's spec-correction pass alongside the storage-path `[1]`/`[2]` row.
- **Blocked on:** — (B14/B15 want H8; B21 records C5/M5 as H4c-blocked; none of these block B0–B13.)
- **Human gates that findings depend on** (`Planning/Human-tasks.md`): **H4c** paid Gemini → audit
  **C5**, **M5**, and M3's Batch leg. **H8** RevenueCat account → the *live proof* of **C3**/B14/B15.
  **H6** domain → part of H9's teaser story. **H7** store accounts → the App Store ID placeholder.
  Leaked-password protection is a **dashboard toggle** (human). None of these can be closed by code.
- **Live DB:** single project pre-launch — `palmly-staging` (`rphtdgoggsldshtdbkaj`). All 17
  migrations applied. **`pg_net` is NOT installed** (that's why the cron wiring is out of scope).
- **Standing hazards** (learned the hard way in recon — read before your first command):
  - **`npx supabase@latest` ALWAYS.** The `supabase` on PATH (scoop shim 2.101.0) **cannot parse
    `config.toml`** and fails with a confusing config error, not a version complaint.
  - **Docker engine is DOWN** → `supabase start` / `db reset` / `supabase test db` are unavailable.
    The staging + begin/rollback harness is the only working backend test path, by design.
  - **`supabase/tests/lib/db.mjs` resolves `{ ...loadEnvStaging(), ...process.env }`** — a stray
    `SUPABASE_DB_URL` / `SUPABASE_STAGING_*` in your shell **silently redirects the whole suite at a
    different database**. Check the ambient env before blaming a test.
  - **Never `git add -A` blindly** — `Planning/Prompt` is a tracked file modified in the working tree.

---

## EXECUTION PROTOCOL (per task — follow literally)

1. **Re-ground.** Read `Planning/Audits/Backend-audit.md` for the finding text, then this ledger's
   STATE + ERRATA + the task. **Read the current source file(s) before editing** and match surrounding
   style.
2. **Pick** the first task in document order that is `[ ]` or `[~]`. **Never reorder** — the sequence
   encodes real dependencies (B0 gates every Verify; B5 owns the `readings` constraint before B7 edits
   the same file; B4 sets the storage-ordering invariant B16 copies).
3. **RESEARCH — the triage gate. Do this before writing any code, and record the verdict.**
   - Re-verify the finding **against the current code** (the audit is 2 days old and **several of its
     cites are wrong — see ERRATA**) and **against live staging** via the **read-only** `mcp__supabase__*`
     tools (ACLs, `cron.job`, constraints, advisors, row counts). Never guess where a read tool exists.
   - Reach a verdict, one of: **CONFIRMED** · **PARTLY CONFIRMED** (say which limb) · **FALSE POSITIVE**
     · **OBSOLETE** (already fixed) · **DECISION** (works as built; the spec or a product call is what
     changes).
   - **A FALSE POSITIVE is a first-class success.** Do not manufacture a fix to look productive. Record
     `- DONE: FALSE POSITIVE — <evidence>` and mark `[x]`. Changing correct code to satisfy a wrong
     audit line is the worst outcome available to this loop.
   - Then research **the correct fix**: repo precedent first (there is almost always one — e.g. the
     `0006` revoke/grant pattern), then the spec section, then official vendor docs via WebSearch/
     WebFetch (mandatory for B14). Write a 2–5 line plan under the task **before** editing.
4. **Build** the **smallest correct change**. Standing rules:
   - **Never edit an applied migration.** All 17 are applied. Every SQL fix is a **new file**. **Re-read
     the real max counter in `supabase/migrations/` at the start of the task** — the numbers in this
     ledger are *indicative only*; two tasks must never claim the same counter. Convention:
     `<YYYYMMDD><6-digit global monotonic counter>_<snake_name>.sql` (next: `20260717000018_*.sql`).
   - **Expand-contract**: additive in one step. A contracting change (drop/rename/NOT NULL) needs its
     own task + sequence (that is exactly why B15 and B18 exist).
   - Copy the repo's SECURITY DEFINER idiom verbatim: `set search_path = ''` in the body +
     `revoke all on function public.f(argtypes) from public, anon, authenticated;` +
     `grant execute on function public.f(argtypes) to service_role;` (precedent: `0006:20-25`, repeated
     in 12 other migrations).
   - Versioned artifacts (`prompts/`, `kb/`, `schemas/`): bump, never mutate in place — **but read the
     B9 note first, the toolchain does not honor this rule yet.**
   - Secrets never enter code, queries, output, or the commit.
5. **Verify.** Run the task's **Verify** line literally. **Never report a green you did not see** —
   paste the real numbers. Add/extend a regression test wherever the suites can hold one (that is what
   stops the finding from returning). A finding that cannot be tested says so out loud.
6. **Record — only when Verify actually passed.** Mark `[x]` + today's date · append a **Build Log**
   line with real evidence (test counts, MCP query output, file:line) · update **STATE** · add a
   **Decision Log** row if the task made a judgment call · `git commit` as **`B# <Title>: <details>`**
   (the form `git log` actually uses — space + colon; **not** `B#.<slug>`). Stage explicit paths.
7. **On failure:** 3 genuinely different approaches, then `[!]` + what you tried + STATE `Blocked on`,
   and move to the next unblocked task. A stalled ledger beats a falsely-green one.
8. **Loop control:** keep going while context allows; before it runs low, park the in-flight task `[~]`
   with a resume note, update STATE, commit, end the iteration cleanly.

---

## ⚠️ AUDIT ERRATA — recon-verified 2026-07-17

**Trust this table over the audit's own cites.** A loop following the audit verbatim on these lines
would edit nothing and wrongly report success.

| Audit says | Truth |
|---|---|
| H8/M4 cite `_shared/render.ts` | **That file has never existed.** It is `supabase/functions/card-render/render.ts`. |
| H1 cites `_shared/consistency.ts` for `deriveGeometry`/`geometryDistance` | They live at **`_shared/features.ts:69`** and **`:80`**. `consistency.ts` only re-imports them at `:6-7`. |
| Low: secret gate `===` "in `_shared/context.ts`?" | The compare is at **`_shared/auth-resolve.ts:44`**. |
| H7 cites `*_merge_accounts*.sql` | The file is **`20260713000008_account_merge.sql`** (noun order reversed) — the glob matches nothing. |
| H4 "rc_event_id is nullable" cited in `0009` | The declaration is in **`schema.sql:141`** (`rc_event_id text unique`). TRANSFER isn't in SQL at all — it's `_shared/revenuecat.ts:85`. |
| C1: advisors flag `handle_new_user`, `broadcast_*`, `resolve_awaiting_compat` as RPC-exposed | Those **`return trigger`** and **cannot be invoked over the Data API**. Only `drain_stub` (`returns int`) is genuinely RPC-callable. **`kb_search` is granted to `authenticated` INTENTIONALLY** (`0015:39`) and is not SECURITY DEFINER — **do not "fix" it**; you would break chat. |
| H2: "copy `worker-compat`'s guard" | `worker-compat:65-68` is a **status check** on a row `compat-request` already created. `worker-narrative` has **no such row** → the fix needs a DB unique constraint or SELECT-before-insert, **not** a copy-paste. It pulls in a migration. |
| M14: "0010:36-40 creates a pair for generic" | True, **but `kind` is never fetched** by the select at `0010:20` — the guard requires changing the select too. |
| C4 predicate omits `uploaded`/`queued`/`extracting` | Also omits **`narrating`** — the audit missed one. |
| H6: push-dispatch "archives regardless of ticket outcome" | **Worse:** `:47` pushes `msg_id` into `archived` **before `sendExpoPush` is even called** at `:53` — jobs die even when the Expo POST *throws*. |
| H5: "orders ascending, then slices last 8" | The `slice(-8)` at `chat.ts:149` is a **no-op**; the bug is purely the order clause at `chat-send/index.ts:96`. |
| §3.2 "neither suite is runnable" | **Runnable here.** Deno **133/133 green**; Node **96/100** (B0). The "3 tests never in a recorded green run" question is resolved — they pass. |

---

# PHASE 1 — Baseline

- [x] **B0 — Baseline: make both backend suites honestly green** *(pre-req; audit §3.2 caveat)* — **2026-07-17**
  - **DONE: CONFIRMED (all 4) — stale global-count assertions, zero product bugs.** Every delta
    reconciled arithmetically against live staging via MCP *before* any edit:
    | Test | Asserted | Live staging | +seeded | = got |
    |---|---|---|---|---|
    | `queues.test.mjs:49` | `worker_telemetry` = 0 | **2** (both worker-narrative/narrative_jobs/ok) | 0 | 2 |
    | `rls.test.mjs:320` | `kb_chunks` = 1 | **141** | 1 | 142 |
    | `storage.test.mjs:84` | cards objects = 1 | **2** | 1 | 3 |
    | `worker_narrative.test.mjs:80` | worker-narrative/ok = 1 | **2** | 1 | 3 |
    Fix = scope each read to its own fixture (the harness rolls back *writes*; it cannot hide staging's
    committed rows from *reads* — that distinction is the whole bug). Test-only; no product code.
    `queues`→ delta (count before == after); `worker_narrative`→ scoped to its own `msg_id`;
    `storage`→ `countObjects(bucket, name)`; `rls`→ new `countWhere` scoped to the seeded fixture
    (`fortune_templates` PK is `(fortune_date,pillar_bucket,locale)` → provably ≤1; `kb_chunks`
    `feature_key='heart_line.deep_long'` verified 0 live).
  - Research: **measured first-hand 2026-07-17: Node `# pass 96 / # fail 4` (226.7s), Deno `133 passed |
    0 failed` (3s).** All 4 failures are **stale unscoped global `count(*)` assertions** that assumed a
    pristine staging DB — live counts explain every delta arithmetically, **zero product bugs**. The four,
    by their real test names:
    - `not ok 64 — draining an empty queue is a safe no-op` (`queues.test.mjs:49` — worker_telemetry expects 0, gets 2)
    - `not ok 81 — shared reference tables (fortune_templates, kb_chunks) readable by any authenticated user` (`rls.test.mjs:319` — kb_chunks expects 1, gets 142)
    - `not ok 91 — cards bucket: publicly readable by the anonymous role` (`storage.test.mjs:81` — cards objects expects 1, gets 3)
    - `not ok 93 — worker-narrative DB flow: feature_set → narrative_job → readings (stamped) → complete → telemetry` (`worker_narrative.test.mjs:80` — expects 1, gets 3)

    Confirm each against live counts before touching it — **if a delta does NOT reconcile, that one is a
    real bug and gets its own task.** (Note #91's gets-3 is itself downstream of **H8**: card-render
    publishes to the public bucket for every reading — B7's fix will change this count again.)
  - Build: scope each assertion to its **own seeded fixture** (or assert a **delta**, not an absolute).
    The harness's begin/rollback guarantees no test *writes* persist — it does **not** hide committed
    staging rows from *reads*. That distinction is the whole bug. Test-only changes; no product code.
  - Verify: `cd supabase/tests && npm test` → **100/100** (~233s; 100 serialized network round-trips —
    it is not hung). `cd supabase/functions && deno test --allow-read --allow-env` → **133/133**. Paste
    both real counts. Re-pin the stale numbers in this ledger's STATE.
  - Note: **every downstream task's Verify is "the suites are green."** Until B0 lands, the loop cannot
    distinguish its own regressions from pre-existing rot. This is why it is task 1.

# PHASE 2 — Critical security & data integrity

- [x] **B1 — Migration 0018: SECURITY DEFINER revokes · RLS indexes · claim_invite race+kind · rc_event guard order** *(C1, M13, H3, M14, H4-SQL)* — **2026-07-17**
  - **DONE: C1 CONFIRMED · M13 CONFIRMED · H3 CONFIRMED · M14 CONFIRMED · H4-SQL PARTLY CONFIRMED.**
    Landed as `supabase/migrations/20260717000018_audit_c1_h3_h4_m13_m14.sql` (counter re-read live:
    max was 17). Verdicts, each verified against live staging before editing:
    - **C1 CONFIRMED — and the ERRATA is vindicated exactly.** Live `pg_proc` showed
      `drain_stub` `returns int4` + SECURITY DEFINER + `=X/postgres | anon=X | authenticated=X` →
      genuinely RPC-callable with the publishable key. The other advisor-flagged functions
      (`broadcast_*`, `handle_new_user`, `resolve_awaiting_compat`) all `return trigger` → **not
      invocable over the Data API**. `kb_search` is `prosecdef=false` + intentionally granted
      (0015:39) → untouched. `is_pair_member`/`thread_owner` ARE callable but are **RLS helpers** —
      their policies evaluate AS `authenticated`, so revoking would break RLS (the audit's own
      carve-out: "everything that isn't required for RLS evaluation"); left alone, and B22 already
      records them as accepted. **Net: `drain_stub` was the only genuine over-exposure.**
    - **M13 CONFIRMED** — all 5 tables carried only their pkey/unrelated uniques.
    - **H3 CONFIRMED** — `0010:20` had no `for update`.
    - **M14 CONFIRMED + ERRATA vindicated** — `kind` was genuinely absent from the `0010:20` select,
      so the select had to widen too. `invites.kind` defaults to `'compatibility'`, so the 4 existing
      claim tests still create pairs. A generic invite now returns `pair_id=null` + `kind`.
    - **H4-SQL PARTLY CONFIRMED — the audit's prescribed fix does not work as written.** Two limbs
      landed (guard, null-id defense); the ordering limb is **deferred to B15** (D-05).
      ⚠️ **What the audit missed:** `revenuecat-webhook/index.ts` returns **HTTP 200 even when
      `applied=false`**, so "reorder the guard before the insert" would *not* stop the drop — RC never
      retries a 200. And `create or replace` cannot change the `boolean` return type, so a tri-state
      is a contracting change. Worse, the literal reorder **contradicts an existing deliberate test**
      (`revenuecat_webhook.test.mjs:58` — "an event for an unknown user is **logged** but upserts no
      subscription", `subscription_events` = "raw webhook audit log", schema.sql:139).
      **Built instead (D-04):** additive `subscription_events.applied_at`; the idempotency key now
      guards the **upsert**, not merely the log row. Ghost → logged, `applied_at` null, no upsert
      (test :58 intact); duplicate of an *applied* event → no-op (test :39 intact); **duplicate of a
      never-applied event, once the profile exists → applies now** — which is precisely the audit's
      "every RC retry then dedupes to a no-op forever". Plus the `coalesce(p_rc_event_id, 'md5:'||…)`
      surrogate so a null id cannot re-upsert forever, and `for update` on the audit row to serialize
      concurrent duplicate deliveries.
  - Verify (observed): **Node full 105/105** (`# pass 105 / # fail 0`, 233.0s — 100 baseline + 5 new
    regression tests); targeted set `schema+rls+invite_claim+revenuecat_webhook+queues` **32/32**;
    Deno **133/133**. Live MCP after apply: `drain_stub` acl = `postgres=X/postgres |
    service_role=X/postgres` (**PUBLIC/anon/authenticated gone**, owner+service_role intact → the 5
    crons keep running); all 5 M13 indexes present; **`drain_stub` no longer appears in
    `get_advisors`** (the remaining SECURITY DEFINER flags are exactly the triggers + RLS helpers left
    alone by design). `list_migrations` shows `20260717000018`.
  - Regression tests added (5): `schema.test.mjs` — drain_stub NOT executable by anon/authenticated/
    public **and still executable by postgres+service_role** (pins both halves); M13's 5 policy
    columns lead an index. `invite_claim.test.mjs` — generic invite creates no pair; a **structural**
    `for update` pin. `revenuecat_webhook.test.mjs` — the H4 redelivery recovery (fails against the
    old function: it returned false at `inserted=0` and never upserted).
  - ⚠️ **Honest limit:** the H3 test is a *structural* pin (`pg_get_functiondef` contains `for
    update`), **not** an observed race. A true two-session race is **not expressible** in this
    harness — the fixture lives in an uncommitted, always-rolled-back transaction, so a second
    connection cannot see the invite to race for it. It catches a regression that drops the lock; it
    does not prove concurrent claimants serialize.
  - 🔧 Tooling note for later tasks: **`supabase/tests/scripts/apply.mjs` cannot apply to deployed
    staging** — it replays ALL migrations, so `0001` fails on "already exists". Applied 0018 via a
    scratchpad one-shot that reuses `db.mjs`'s `connect()` (keeps the DB password out of argv/output,
    unlike `db push --db-url`) and records the version in `supabase_migrations.schema_migrations`.
  - Research: the audit's own suggested step 1. Verify each limb live before writing:
    **C1** — `mcp__supabase__execute_sql`: `select proname, proacl from pg_proc p join pg_namespace n on
    n.oid=p.pronamespace where n.nspname='public' and proname in ('drain_stub','queue_read','kb_search');`
    → `drain_stub` must currently show anon/authenticated. **Read the ERRATA row on C1 first** — scope
    the revoke to genuinely RPC-callable functions; leave `kb_search` alone.
    **M13** — `select tablename, indexname from pg_indexes where schemaname='public';` → confirm the 5
    columns are unindexed. **H3/M14** — re-read `0010` in full (the `kind` select gap). **H4-SQL** —
    `0009:22-24` insert vs `:31` guard; `:33/:38` unconditional `latest_event_at = now()`.
  - Build: **ONE new migration** (`20260717000018_*.sql` — *re-read the real max counter first*). All
    additive/backward-compatible:
    (a) **C1** revoke/grant per the `0006:20-25` idiom, full arg-type lists, keep `set search_path = ''`.
    (b) **M13** five `create index if not exists` — `compatibility_results.pair_id`, `chat_threads.user_id`,
    `share_cards.user_id`, `devices.user_id`, `invites.invitee_id`. **No `CONCURRENTLY`** — the CLI wraps
    each migration in one transaction and it is illegal there; staging tables are tiny.
    (c) **H3 + M14** — ONE `create or replace function public.claim_invite(...)`: add `for update` to the
    select **and** fetch `kind` so the pair-create is gated to compatibility invites. They rewrite the same
    body; shipping them separately means the second clobbers the first.
    (d) **H4-SQL** — reorder so the `exists(profiles)` guard precedes the event insert; add an ordering
    guard on `latest_event_at`; add the **additive** `coalesce` defense for null `rc_event_id`.
  - Verify: apply → `npx supabase@latest db push --db-url <SUPABASE_DB_URL from .env.staging>` (or
    `CONFIRM=1 node supabase/tests/scripts/apply.mjs`). Then: `mcp__supabase__list_migrations` shows
    `20260717000018`; the C1 ACL query above shows anon/authenticated **gone** from `drain_stub` and the
    owner+service_role grants intact; `mcp__supabase__get_advisors` drops the fixed items;
    `cd supabase/tests && node --test --test-concurrency=1 schema.test.mjs rls.test.mjs invite_claim.test.mjs
    revenuecat_webhook.test.mjs queues.test.mjs` green, then the **full 100/100**. Add assertions pinning
    the ACL + the 5 indexes so they stay fixed.
  - Note: **the C1 revoke must not break the crons.** `drain_stub` is scheduled 5× at `0004:60-64`;
    pg_cron jobs run as the **scheduling role** (postgres/owner), which keeps EXECUTE independently of the
    PUBLIC grant. Revoke from `public, anon, authenticated` only — **never** from the owner or service_role.
    **H4's NOT-NULL leg is deliberately excluded here** (contracting → B15).

- [~] **B2 — C2 interim: stop the live cron from destroying real jobs** *(C2)* — **2026-07-17** —
  interim landed; `[~]` **by design** (the full cron→worker wiring is the buildplan's, per SCOPE).
  - **DONE: CONFIRMED.** Live ground truth captured before touching anything: all 5 `drain_stub`
    crons `active` (jobid 1-5, 10s/10s/15s/15s/1min); `pgmq.metrics_all()` showed real throughput
    history — scan 56 / narrative 20 / compat 39 / push 130 `total_messages`, all `queue_length` 0
    (i.e. everything ever enqueued was archived into the trash).
  - Which drains are *genuinely* destructive today (`grep queue_send` over migrations): **only
    `compat_jobs`** (`0011:50`, `0011:73`) **and `push_jobs`** (`0013:16`, `0014:76`) have live SQL
    enqueuers that fire from user actions with no worker deployed — the audit's "disable the 2" is
    correct about *today*. `scan_jobs`/`narrative_jobs`/`cleanup_jobs` have no SQL enqueuer and are
    inert only because `scan-create`/`scan-ingest` do not exist yet.
  - Built `supabase/migrations/20260717000019_c2_unschedule_destructive_drains.sql` — unschedules
    **all 5** (D-06), idempotently (driven off a select over `cron.job`, since `cron.unschedule(name)`
    raises when the job is already gone). Exact restore SQL is recorded in the migration header.
  - Verify (observed): `cron.job where command like '%drain_stub%'` → **0**; `cron.job` → **0 jobs
    scheduled**; `cron.job_run_details` newest run frozen at `21:21:00` — **no cron run for 4m43s**,
    where the drains previously fired every 10s (32 runs in the preceding 2 minutes). Full Node
    **106/106** (`# pass 106 / # fail 0`, 237.0s — B2 splits the old combined test in two).
  - Regression test: `queues.test.mjs` — the old assertion *"each queue has a scheduled cron drain"*
    **encoded the bug** and was inverted into a C2 pin: **no cron job may invoke `drain_stub`** while
    it is a no-op archiver. Re-arming one now fails the suite. The queue-existence half is kept as
    its own test, and the drain-path proof is unaffected (the other tests call `drain_stub` directly,
    not via cron).
  - ⚠️ **Could NOT verify by the letter:** the Verify line asks for `pgmq.metrics_all()` proof that
    "enqueued messages now survive". The Supabase MCP is **read-only** and staging must not be
    persistently mutated, so no message was enqueued to watch. The equivalent proof given instead is
    causal and stronger: **there is no longer any consumer** (0 drain_stub crons, 0 cron jobs at
    all), so nothing can archive an enqueued message.
  - **Scope held:** `pg_net` is still NOT installed and no Vault/`net.http_post` wiring was written.
    C2's remaining half stays with `MVP_Buildplan.md` (§NOT YET BUILT A.3).
  - Research: **before unscheduling anything**, capture the ground truth via MCP:
    `select jobid, jobname, schedule, command, active from cron.job;` (expect the 5 `drain_stub`
    schedules) and `select * from pgmq.metrics_all();`. Confirm which queues carry **real** enqueues
    (`0011` `request_compat`/`resolve_awaiting_compat`, `0013`/`0014` `enqueue_push*`) versus which are
    still inert — that decides whether you disable the 2 destructive drains or all 5.
  - Build: a new migration that **unschedules the destructive drains** (`cron.unschedule`). This is the
    audit's own interim recommendation. Reversible; record exactly how to restore it.
  - Verify: MCP → the drains are inactive/unscheduled; `select * from cron.job_run_details order by
    start_time desc limit 10;` shows **no new `drain_stub` runs**; `pgmq.metrics_all()` shows enqueued
    messages now **survive**. Full Node suite still 100/100.
  - Note: **the full fix (cron→`net.http_post` against the deployed workers) is OUT of scope** —
    `pg_net` is not installed and it needs a Vault-held service key, the security-sensitive design the
    buildplan deliberately parked (§NOT YET BUILT A.3). Deliver the interim, write a Decision Log row,
    and **do not quietly build the wiring under a bug-fix ledger.** C2 closes `[~]` (interim landed,
    full wiring = buildplan) — not `[x]`.

- [x] **B3 — Lifecycle predicate correctness: `crops_due_for_deletion` + `sweep_stale_anon`** *(C4-SQL, H10)* — **2026-07-17**
  - **DONE: C4-SQL PARTLY CONFIRMED (2 of 3 limbs real; 1 is a FALSE POSITIVE — the spec is wrong) ·
    H10 CONFIRMED (and WORSE than stated).** Landed as
    `supabase/migrations/20260717000020_c4_h10_lifecycle_predicates.sql` (counter re-read: max was 19).
  - **C4 limb 1 — "never sweeps stuck scans": CONFIRMED, and it is the only genuine privacy defect.**
    Live `scans_status_check` has **7** statuses (`uploaded,queued,extracting,matched,narrating,
    complete,failed`); `0016:24` filtered to 3, so a scan abandoned in any of the other four kept its
    crop **forever**. **ERRATA confirmed: `narrating` was missing too** — the audit lists only three.
  - **C4 limb 2 — "failed scans not deleted immediately": CONFIRMED** (minor). Spec §9 says
    "deleted immediately on scan failure resolution"; they waited 24h. Verified `failed` is genuinely
    **terminal** before acting on it (`worker-scan/index.ts:85-94` sets it only on the
    fail-fast/dead-letter branch, then archives; the retry branch never sets it) — so immediate
    deletion cannot destroy a crop a retry still needs.
  - **C4 limb 3 — "keys off scan creation, not successful extraction": FALSE POSITIVE — the spec is
    wrong, the SQL is right** (D-07; the same call the audit itself makes for the storage path
    `[1]` vs `[2]`). Keying on extraction would **only ever retain crops LONGER**, and only for scans
    whose crop is already spent (pass 2 reads features, never the image). It cannot protect a
    backlogged crop either — that is the stuck-scan branch, which fires at 24h either way. Re-analysis
    already has its designed mechanism: the `keep_image` opt-in (§9). **"Fixing" this limb would have
    made the privacy posture worse and weakened the D2 marketing claim.** Left as-is deliberately.
  - **H10 CONFIRMED — and the audit understates the blast radius.** Live: **both**
    `compatibility_pairs_user_a_fkey` **and** `compatibility_pairs_user_b_fkey` are `ON DELETE
    CASCADE` → profiles, and `compatibility_results_pair_id_fkey` cascades from the pair. The audit
    frames the victim as "an invitee who claimed but never scanned", implying only an empty pair is
    lost. **Not so:** `request_compat` (`0011:38-41`) keys off `canonical_palm_fs` →
    `subject_profiles`/`feature_sets`, **not `readings`** — so a user whose extraction succeeded but
    whose narrative failed has **zero readings**, is therefore sweepable, and can hold a **COMPLETE**
    compat result. "No readings" is not a proxy for "no compatibility".
  - Build: predicate restated **positively** — a crop is due once it is 24h old whatever the scan is
    doing, plus `failed` immediately, `keep_image` exempt. The status enumeration is **dropped, not
    extended**: enumerating statuses is what caused the bug, and a future status would silently
    reintroduce it. `sweep_stale_anon` now never purges a pair member (D-08).
  - Verify (observed): `data_lifecycle.test.mjs` **9/9** (6 existing + 3 new); full Node **109/109**
    (`# pass 109 / # fail 0`, 237.1s); Deno unaffected (no TS touched). The 3 pre-existing lifecycle
    tests still pass unchanged — incl. the ERASURE test, which calls `purge_account` **directly** and
    must still cascade the pair (an explicit account deletion is the user's own request; H10 is only
    about the *automatic* cost-control sweep).
  - Regression tests added (3): all four stuck states (`uploaded/queued/extracting/narrating`) at 25h
    are swept; a `failed` scan is due immediately **and** `keep_image` still exempts it; a stale anon
    **in a pair** is not swept and the inviter's pair + result both survive. Each fails against the
    old predicate.
  - Research: **C4** — `0016:26` keys the age off **scan creation**, not successful extraction; `0016:24`'s
    status filter `in ('complete','matched','failed')` omits `uploaded`/`queued`/`extracting` **and
    `narrating`** (ERRATA), so abandoned uploads keep their crops forever, contradicting the D2 "deleted
    within a day" promise. Decide the correct predicate against Backend-specs §9 — it must also delete
    **failed scans immediately**. **H10** — confirm the cascade: `sweep_stale_anon:120` → `purge_account`
    → `delete auth.users` (`:99`) → profiles → `compatibility_pairs` (`schema:89-90`, ON DELETE CASCADE on
    **both** user_a and user_b) → `compatibility_results` (`schema:100`). Verify live that the constraint
    shape is still that.
  - Build: new migration, `create or replace` of both functions. C4: predicate keyed off extraction
    success + a stuck/abandoned sweep + immediate failed-scan deletion. H10: guard on **pair membership**
    (reassign/tombstone rather than cascade) so purging a stale anon never wipes the surviving partner's
    pair/result.
  - Verify: `cd supabase/tests && node --test --test-concurrency=1 data_lifecycle.test.mjs` — extend it
    with the adversarial cases: a stuck `uploaded` scan **is** swept; a `failed` scan goes immediately; an
    anon invitee's purge **leaves the inviter's pair intact**. Then full 100/100.
  - Note: not grouped into B1 on purpose — **getting a deletion predicate wrong destroys user data.** Own
    research, own verify.

- [x] **B4 — Storage/DB ordering integrity: account-delete, merge_accounts, deletion_log** *(H7)* — **2026-07-17**
  - **DONE: CONFIRMED (all three limbs).** Landed as `supabase/migrations/20260717000021_h7_storage_ordering.sql`
    (counter re-read: max was 20) + `_shared/cleanup.ts` + `account-delete/index.ts` + `account-merge/index.ts`.
  - **The invariant is now stated once, in code:** `purgeAccountStorageFirst` (`_shared/cleanup.ts`) —
    **collect → delete objects → purge rows → log completion last**. **B16 must reuse this function**,
    not re-implement the ordering.
  - **Repo precedent found (and it vindicates the invariant):** `cleanup/index.ts:27-31` **already**
    does it right — `storage.remove` then `mark_crop_deleted` only `if (!error)`. `account-delete` was
    the one surface that inverted it. The fix aligns them.
  - **(a) CONFIRMED + FIXED** — collect is now a separate read-only RPC (`account_storage_paths`), so
    a storage failure **throws before any row is touched** and the delete stays retryable, instead of
    stranding crops with zero DB reference behind a 200 `{deleted:true}`.
  - **(b) CONFIRMED + FIXED** — `merge_accounts` now re-parents **and rewrites the owner path prefix
    in the same statement** (the row cannot be found by `loser_id` once `user_id` has changed), and
    returns `storage_moves`. SQL cannot move an S3 blob, so `account-merge/index.ts` moves the objects
    **first**, then merges: a move failure aborts with the DB untouched. Return type stayed `jsonb`, so
    `storage_moves` is an additive key, not a signature change.
  - **(c) CONFIRMED + FIXED** — `purge_account`/`request_image_deletion` now insert with
    `completed_at` **NULL**; the new `mark_deletion_complete(uuid,text)` stamps it last. This is the
    table's own design: `deletion_log` already had **both** `requested_at` and `completed_at` and no FK
    on `user_id`; `0016` merely collapsed them.
  - Verify (observed): `deno check account-delete/index.ts account-merge/index.ts _shared/cleanup.ts`
    → **clean** (first attempt failed `TS2739`: supabase-js `rpc()` returns a thenable
    `PostgrestFilterBuilder`, not a `Promise` — `PurgeDeps` takes `PromiseLike`); Deno **137/137**
    (was 133, +4); `account_merge + data_lifecycle` **14/14**; full Node **111/111**
    (`# pass 111 / # fail 0`, 241.0s).
  - Regression tests added (6): Deno — ordering is asserted **as a call sequence**
    (`['collect','remove:scans','remove:cards','purge','complete']`); **a storage failure never
    purges the rows and never stamps completion** (the H7 test); a row-purge failure never stamps
    completion; `mergedStoragePath` re-homes only owner-prefixed paths (incl. the `aaaa-11/` vs
    `aaaa-1/` lookalike). Node — `deletion_log` records a request with `completed_at` NULL until
    `mark_deletion_complete`; merge re-homes crop+card paths, reports `storage_moves=2`, and leaves a
    non-owner-prefixed path alone.
  - ⚠️ **Honest limit — the audit §3.3 gap #2 "storage round-trip" is NOT closed here (D-09).** The
    Node harness depends on `pg` only (no `@supabase/supabase-js`), and a real round-trip would
    persistently mutate staging, which the begin/rollback harness exists to prevent. Instead the
    *property the finding is about* — "a storage failure must not orphan a crop" — is proven
    **hermetically** via the injectable seam, which is strictly better for that property (it can
    simulate an S3 outage; a live round-trip cannot). **A genuine round-trip against the Storage API
    remains open and belongs to B21**, which already owns handler/HTTP test infrastructure.
  - 📋 Original research note (kept — all three limbs were confirmed before any code was written):
    - **(a) CONFIRMED** — `account-delete/index.ts:17-18` calls `purge_account` (DB purge) **first**,
      then removes objects at `:22-27` with `if (!sErr) removed += paths.length; // best-effort`, and
      **still returns `{deleted:true}` + HTTP 200 when storage fails**. The blobs then have zero DB
      reference and no retry path (cleanup sweeps work off `scans` rows, now deleted).
    - **(b) CONFIRMED** — `20260713000008_account_merge.sql:34` re-parents `scans.user_id` (+11 more
      tables) but never touches `storage.objects`, and **does not rewrite `scans.storage_path`**,
      which still reads `{loser_id}/…`. The bucket RLS is owner-path based (path segment `[1]`), so
      the survivor cannot read their own re-parented crops.
    - **(c) CONFIRMED** — `completed_at` is stamped at `0016:55` (`request_image_deletion`) and
      `0016:97` (`purge_account`), both **before** the Edge Function does any storage work.
    - 🔑 **Live schema fact that shapes the fix:** `deletion_log` has **only a PK — no FK on
      `user_id`** (which is why the audit row correctly survives `delete auth.users`), and it already
      carries **both `requested_at` AND `completed_at`**. The table was *designed* for
      request-then-complete; `purge_account` simply collapses them. So the fix is the table's own
      intent: insert with `completed_at = null`, and stamp it from a new
      `mark_deletion_complete(p_user_id, p_scope)` only after the storage work succeeds.
    - **Shape of the build:** `purge_account` does collect + purge + log in one call, so the
      collect→delete→purge→log order needs it split. Expand-contract: add
      `account_storage_paths(uuid)` (read-only collect) + `mark_deletion_complete(uuid,text)`
      additively, leave `purge_account` in place, and contract in a later task. Note (b) needs a real
      **S3 object move** (Storage API `move`, per object) — SQL alone cannot re-parent a blob.
    - ⚠️ **Cost note:** this task owns the repo's **first** storage round-trip test (audit §3.3 gap
      #2) — genuinely new test capability, not just an assertion. Budget for it.
  - Research: one finding, three limbs, **one invariant — never destroy the DB reference before the blob
    is gone.** (a) `account-delete/index.ts:17-27` purges rows then best-effort removes objects (`:26`
    `if (!sErr) removed += paths.length; // best-effort`) → a storage failure orphans palm/face crops with
    **zero** remaining DB reference and no retry path (cleanup sweeps work off `scans` rows, now gone).
    (b) `20260713000008_account_merge.sql:34` re-parents 12 tables but never touches `storage.objects` →
    the loser's blobs stay under `{loser_id}/…` (survivor can't read them; orphaned on loser deletion).
    (c) `deletion_log.completed_at` is stamped at `0016:55` and `:97` **before** the Edge Function does the
    storage work.
  - Build: reorder to **collect paths → delete objects → verify → purge rows → log completion last**.
    Merge: move/re-parent the objects too. GDPR/D2 framing — be conservative.
  - Verify: `node --test --test-concurrency=1 account_merge.test.mjs data_lifecycle.test.mjs` + full
    100/100; `deno check supabase/functions/account-delete/index.ts`; a storage round-trip proving a
    simulated storage failure **does not** leave an orphan (audit §3.3 gap #2 — there is no storage
    round-trip test today; this is the place to add the first one).
  - Note: this establishes the **collect→delete→log invariant that B16 must copy.**

# PHASE 3 — Worker & pipeline hardening

- [x] **B5 — worker-narrative hardening: dedupe guard · redelivery · vt** *(H2-narrative, M2-narrative)* — **2026-07-17**
  - **DONE: H2-narrative CONFIRMED · vt CONFIRMED (by arithmetic, not vibes) · M2-narrative PARTLY
    CONFIRMED.** Landed as `supabase/migrations/20260717000022_h2_readings_unique.sql` +
    `worker-narrative/index.ts` (counter re-read: max was 21).
  - **H2 CONFIRMED + the ERRATA is exactly right.** Live `readings` carried **only** `readings_pkey(id)`
    and `readings_user_id_created_at_idx` — **no uniqueness at all**. worker-compat's guard is a
    *status check on a row that already exists* (`compat-request` creates the result row up front);
    worker-narrative has no such row — **the reading IS the output** — so there is nothing to
    status-check and a copy-paste was never possible. The invariant had to go in the DB.
    `depth_level` is `int not null default 1` (schema.sql:77), so there is **no NULL escape hatch** to
    defeat the index (the exact trap H4 hit with `rc_event_id`). `readings` has 0 rows live → safe.
  - **vt CONFIRMED — and it is provably too short, not just "feels tight".** Worst case through
    `withRetry` (`_shared/gemini.ts:20`: `maxRetries: 4` → **5 attempts**) at spec §11.2's 5–20s per
    call, plus ~4.8–7.2s of backoff (`400·2^n` + jitter) = **≈107s > the 60s vt**. So a *healthy but
    slow* narrative call was redelivered while the first worker was still running — a concurrent
    duplicate and a second charge with no crash required. Raised to **180s** (~1.7× headroom, without
    stranding a genuinely crashed job).
  - **M2-narrative PARTLY CONFIRMED** — the guard is the short-circuit the audit asks for, but only
    for the case where the reading actually landed. **Stated honestly:** a *true* `store_failed` (the
    row genuinely did not commit) still regenerates, and that is unavoidable without caching the
    narrative JSON — there is nothing to reuse. Cost is one flash-lite call. Not built: a narrative
    cache would be new surface, not a defect fix.
  - Build: two layers, deliberately. **Guard** — an indexed `select` on (feature_set_id, depth_level)
    **before** the paid model call → redelivery settles the job instead of regenerating (saves the
    charge). **Constraint** — the unique index makes a duplicate row impossible even if two workers
    race (saves the data). `23505` on insert is now handled as `settleExisting('unique_violation_race')`
    — success-by-someone-else, **not** a transient fault; retrying it would only pay Gemini again.
  - Verify (observed): `deno check worker-narrative/index.ts` → clean; `worker_narrative.test.mjs`
    **4/4**; full Node **112/112** (`# pass 112 / # fail 0`, 242.3s); Deno **137/137**.
  - Regression test added (1): a second depth-1 reading for the same feature_set is **rejected**
    (`readings_feature_set_id_depth_level_key`), while **depth 1 + depth 2 still coexist** — the
    constraint must not break progressive unlock (§4.5), which is the one way this index could have
    been wrong.
  - ⚠️ **Honest limit:** the "no second **model call**" half is **not** unit-testable today. The
    constraint half is proven above, but the guard lives in `processMessage`, which is unexported and
    needs a `SupabaseClient`; no Deno test stubs one (all 23 live in `_shared/`). `geminiCall` is
    already injected, so once **B21** lands handler-level tests, a counting `geminiCall` + a stub db
    proves it in a few lines. Until then the *charge* is protected by code review; the *data* is
    protected by the DB.
  - Research: `worker-narrative/index.ts:105-167` — no "reading already exists for (feature_set_id,
    depth_level)" guard → a crash after the model call → visibility-timeout redelivery → **second Gemini
    charge + duplicate `readings` row**. **Read the ERRATA row on H2**: worker-compat's guard is a *status
    check* on a pre-existing row; narrative has no such row, so this needs a DB `unique (feature_set_id,
    depth_level)` on `readings` + upsert/onConflict (or SELECT-before-insert). **Budget a migration.**
    `vt=60` at `:167` is too short for a 2–3-vote extraction with retries. M2: `store_failed` → retry →
    full regeneration; no `feature_hash` short-circuit.
  - Build: the constraint migration + the guard + vt tuning + the redelivery short-circuit.
  - Verify: `node --test --test-concurrency=1 worker_narrative.test.mjs` (extend: a redelivered job must
    **not** produce a second row or a second model call) + full 100/100; `deno test --allow-read
    --allow-env` 133+/133+; `deno check supabase/functions/worker-narrative/index.ts`.
  - Note: **B5 must precede B7** — B7 edits `worker-narrative:148` (the `preRenderCard` call) which this
    task also rewrites. First of the worker pass; owns the `readings` constraint.

- [x] **B6 — worker-scan hardening: redelivery/status regression · vt · subject_profiles insert error** *(H2-scan, M2-scan, H1's insert-error half)* — **2026-07-17**
  - **DONE: H2-scan CONFIRMED · vt CONFIRMED · H1-insert-error CONFIRMED.** No migration needed —
    every fix is in `worker-scan/index.ts` + `_shared/retry.ts`.
  - **The ledger's live question is answered: `subject_profiles_user_id_kind_key UNIQUE (user_id,
    kind)` EXISTS on staging.** So H1's insert-error half is real and its failure mode is a **silent
    no-op**, *not* unbounded row growth: the repeat-face insert genuinely violates the constraint and
    the error was **discarded entirely** (no destructuring at all, unlike `feature_sets`' `fsErr`).
  - **H2-scan CONFIRMED — and it is self-reinforcing, which is what makes it nasty.** The
    `subject_profiles` insert lands *before* `archive`, so on redelivery `matchSubject` **recognizes
    the subject this very scan just created** → `status='matched'` → a `narrating`/`complete` scan is
    regressed, the regression is broadcast to the client, and the duplicate narrative job is already
    in flight. The bug supplies its own trigger.
  - **vt CONFIRMED — worse than worker-narrative's.** Up to 3 votes × (5 attempts (`withRetry`
    `maxRetries: 4`) × a 5–20s call (§11.2) + ~7s backoff) ≈ **320s** against a **60s** vt — so even
    an untroubled 3-vote scan (~60s) sat right at the limit. Raised to **300s**: covers the realistic
    path with headroom, while the pathological all-retries-on-every-vote case stays bounded by
    `read_ct` → dead-letter, **and the new status guard makes a redelivery harmless rather than
    destructive** (defence in depth, not just a bigger number).
  - Build: (1) the guard — `alreadyProcessed(status)` extracted into `_shared/retry.ts` (the repo's
    existing home for pipeline policy, alongside `decideFailure`/`exhausted`) so the **policy is
    unit-testable** rather than buried in an unexported worker function; `matched/narrating/complete/
    failed` settle, and **`extracting` deliberately stays retryable** — a worker crashing
    mid-extraction leaves it there and excluding it would strand the scan forever. (2) vt 60→300.
    (3) the `subject_profiles` error is surfaced as telemetry `subject_profile:
    'exists_unmatched' | 'error:<code>' | 'created'` instead of swallowed — **`exists_unmatched` is
    precisely the H1 face-geometry signal** (B9), so the same line that fixes the swallow also gives
    B9 its live detector.
  - Verify (observed): `deno check worker-scan/index.ts _shared/retry.ts` → clean; Deno **138/138**
    (+1); `worker_scan + worker_retry` **6/6**; full Node **113/113** (`# pass 113 / # fail 0`, 242.9s).
  - Regression tests added (2): **Deno** — `alreadyProcessed` pins both halves (the 4 post-extraction
    states settle; `uploaded/queued/extracting` stay retryable — the second half is the one that would
    strand scans if someone "tidied" the set). **Node** — `subject_profiles` unique(user_id,kind)
    rejects a second face subject, pinning the constraint H1's severity depends on.
  - ⚠️ **Honest limit (same as B5):** the guard's *wiring* into `processMessage` is not
    unit-testable today (unexported, needs a `SupabaseClient`; all 23 Deno tests live in `_shared/`).
    Extracting the **policy** to `_shared/retry.ts` means the decision itself is now genuinely tested;
    only the call site rests on review until **B21**.
  - **M2-scan: NOT fixed — deferred, and the audit's own framing is why.** M2 asks for a
    `feature_hash` short-circuit so a `store_failed` retry does not re-extract. But `feature_hash` is
    computed **from the extraction output** (`featureHash(features)` after the votes), so it cannot
    key a check that must run **before** paying for the extraction. A real fix needs capture-time
    landmarks — which is **exactly M1's known deferral** ("needs P4 capture geometry"). Recorded under
    B22 with M1 rather than faked here. The status guard already removes the *harmful* redelivery
    outcome; what remains is only cost, on a rare transient-DB-error path.
  - Research: if the final `archive` fails after enqueueing narrative, redelivery re-extracts, *matches*
    the just-created subject, and sets `status='matched'` — **regressing a `narrating`/`complete` scan
    mid-pipeline** and broadcasting the regression to the client, while a duplicate narrative job is still
    in flight. `vt=60` at `:184`. The `subject_profiles` insert at `:166` **ignores its error** (unlike the
    `feature_sets` insert at `:155-164`, which handles `fsErr`). **Live check first:** does
    `subject_profiles` actually have `unique(user_id, kind)`? H1's severity depends on it — if there is no
    constraint, the failure mode is unbounded row growth instead.
  - Build: a redelivery/status guard (never regress a terminal-or-later state), vt tuning, and the
    3-line defensive insert-error handling.
  - Verify: `node --test --test-concurrency=1 worker_scan.test.mjs worker_retry.test.mjs` + full 100/100;
    `deno test ... _shared/consistency.test.ts`; `deno check`. Add a redelivery-regression regression test.
  - Note: **this is only H1's *second* half.** The schema/geometry half is B9 — a different risk profile.
    Do not mark H1 done here.

- [ ] **B7 — card-render: private-by-default · share-intent publication · fonts · self-hosted wasm** *(H8, M4)*
  - 📋 **RESEARCH BANKED + THE TWO PRODUCT DECISIONS ARE ANSWERED (2026-07-17). No code written yet.
    Start at the build; do not re-ask the user.**
  - **M4 CONFIRMED, exactly as the audit states.** `card-render/` contains **only `index.ts` +
    `render.ts` — there is no `fonts/` dir at all**. `loadFonts()` (`render.ts:18-28`) swallows every
    miss in a `catch`, and `render.ts:36` passes `loadSystemFonts: false`, so resvg gets
    `fontBuffers: []` → **every card today renders with NO TEXT. Dropped, not mis-fonted.**
    `render.ts:14` fetches the resvg wasm from **unpkg.com at cold start** (`git grep unpkg.com` → 1
    hit, that line).
  - **H8 CONFIRMED.** `render.ts:63-68` uploads to the **public** `cards` bucket at the guessable
    `${userId}/${sourceId}_${variant}.png` with `getPublicUrl` at `:78`, and `worker-narrative` fires
    it for **every** completed reading — before any share intent. Advisors still flag
    `cards_public_read` for **bucket listing** (verified in B1's advisor run; public buckets don't need
    a broad SELECT for URL access).
  - 🔑 **Font licence CHECKED (the task asked): Noto is SIL OFL 1.1** — bundling/embedding/
    redistributing **with software is explicitly permitted**; the fonts may not be sold standalone and
    the OFL file must ship alongside them. Sources: <https://github.com/notofonts/noto-fonts/blob/main/LICENSE>
    · <https://openfontlicense.org/ofl-faq/>. **So committing them is legally fine** — the only open
    question was the git strategy, which the user has now settled.
  - ✅ **USER DECISION 1 (2026-07-17) — commit all 3 fonts + the wasm to git (~20MB).** `.gitattributes`
    **already declares `*.ttf binary` and `*.otf binary`**, so the repo's own convention anticipated
    font binaries, and it already commits PNGs (app icons). No LFS; `.git` is 41MB → ~60MB.
    ⚠️ **Subsetting was considered and is NOT viable:** `attribution` is the user's **display_name**,
    i.e. arbitrary input — you cannot subset a font for glyphs you cannot predict. That is also why
    `NotoSerifSC-Regular.otf` (~17MB, the bulk) is genuinely needed despite the EN launch:
    `card-svg.ts` emits **only `font-family="Noto Sans"` and contains no CJK** (headline/chips derive
    from enum-bucketed English feature keys), but a CJK display_name would otherwise render as tofu on
    the share card — the viral asset — for exactly this product's audience.
  - ✅ **USER DECISION 2 (2026-07-17) — pre-render PRIVATE, publish on share intent.** Keep
    worker-narrative's pre-render so sharing stays instant (the P2 moment), but write it private and
    copy/publish to the public bucket on first share. (Not "render on share intent only", which would
    pay resvg cold start + wasm init at the exact moment the card exists to serve.)
  - **Plan (2-5 lines, per protocol):** (1) add `card-render/fonts/` with the 3 Noto binaries + their
    OFL `LICENSE`, and vendor `index_bg.wasm` locally; point `ensureWasm` at the local asset and make
    a **missing font a loud failure, not a silent catch** (the swallow is what hid M4). (2) New
    migration: a private home for un-shared cards + **drop the `cards_public_read` listing policy**.
    (3) `renderAndStoreCard` writes private; add a publish-on-share step that copies to the public
    bucket and only then returns a public URL. (4) `worker-narrative:171` keeps pre-rendering, now
    private.
  - ⚠️ **Note the moved cite:** the audit's `worker-narrative:148` (`preRenderCard`) is now **`:171`** —
    B5's guard shifted it. The audit's `_shared/render.ts` cite is wrong (ERRATA): it is
    `supabase/functions/card-render/render.ts`.
  - Research: **H8** — `worker-narrative:148` pre-renders for **every** completed reading and
    `card-render/render.ts:63-68` uploads to the **public** `cards` bucket at a guessable, enumerable path
    (`${userId}/${sourceId}_${variant}.png`, `getPublicUrl` at `:78`) with display-name attribution,
    **before any share intent** — spec §13/§9 says the public bucket holds only *user-initiated* cards.
    Advisors also flag `cards_public_read` as permitting **bucket listing** (public buckets don't need a
    broad SELECT for URL access). **M4** — `card-render/fonts/` **does not exist at all** and `render.ts:36`
    passes `loadSystemFonts:false`, so every card today has **zero fonts — text is DROPPED, not
    mis-fonted**; `render.ts:14` fetches the resvg wasm from **unpkg.com** at cold start.
  - Build: render on share intent (or keep pre-render but store **private** and copy/publish on first
    share); drop the listing policy (new migration); bundle the three Noto binaries; self-host the wasm.
    **Check font licences and whether binary assets belong in git** before committing them — flag it if
    unsure rather than guessing.
  - Verify: `git grep -n "unpkg.com" -- supabase/functions` → **0 hits**; `ls
    supabase/functions/card-render/fonts` lists the three files; render a card and **look at the PNG** —
    text must be present (today it is not); the public bucket must contain **no** un-shared card; advisors
    stop flagging the listing policy. `deno test` + full Node suite green.
  - Note: **AFTER B5** (shared file). The audit's `_shared/render.ts` cite is **wrong** — see ERRATA.

- [ ] **B8 — push-dispatch: archive-after-send · receipts · N+1 · loop-until-empty** *(H6)*
  - Research: **worse than the audit states (ERRATA)** — `:47` pushes `msg_id` into `archived` **before
    `sendExpoPush` is called** at `:53`, so jobs die even when the Expo POST *throws*; `:63` archives
    everything unconditionally; `:42` is an N+1 devices SELECT inside the job loop; `:33` is a hard
    `p_qty: 100` ceiling per 15s tick with no loop-until-empty (a 10K-user fortune send ≈ 25 min). Spec §4
    receipts are never fetched, so `DeviceNotRegistered` pruning (predominantly a **receipt-time** error)
    is largely ineffective. `_shared/push.ts` has `EXPO_PUSH_URL`/`sendExpoPush`/`tokensToPrune` but **no
    `getReceipt`** — receipt polling is genuinely net-new surface. Read Expo's current push-receipt docs.
  - Build: archive only on success; batch the device query; loop-until-empty with a wall-clock budget;
    add receipt polling + prune on `DeviceNotRegistered`.
  - Verify: `deno test --allow-read --allow-env _shared/push.test.ts` (extend: a 5xx batch must **not**
    archive) + full 133+; `node --test --test-concurrency=1 push_dispatch.test.mjs` + full 100/100.

- [ ] **B9 — H1: face repeat-scan consistency (face geometry signature)** *(H1 — schema/geometry half)*
  - Research: **verified by executing the real modules — `distance(faceA, faceA) = Infinity` and
    `matchSubject = null`: a face cannot match ITSELF.** `schemas/face_features.v1.json` has no
    `line_geometry`; `deriveGeometry` reads only palm lines (**`_shared/features.ts:69`/`:80` — NOT
    `consistency.ts`, see ERRATA**) → face geometry is all-null → `geometryDistance` = ∞. It **fails
    CLOSED** (no false-match leak) — so this is *urgent-by-cost* (every repeat face scan pays 2–3 votes +
    a new narrative + drift risk, exactly what P1 forbids), not urgent-by-danger. Design a face-specific
    signature from the face schema's existing landmark data.
  - Build: **strongly prefer NUMERIC landmark ratios over new enums** — recon proved the asymmetry: a
    numeric field does **not** trip `kb/audit.mjs` (its `enumLeaves` walks enum leaves only, and
    `palm_features.v1.json`'s `line_geometry` already sets exactly this precedent — palmistry's KEY_MAP has
    no `line_geometry` entry and the audit still passes 94/94). A **new enum** THROWS `unmapped schema enum
    path(s)` (`audit.mjs:141-143`) and forces a new KB chunk per value + a fresh KB load.
  - Verify: `node kb/audit.mjs` → must print `P5T4_OK`, `required=141 chunks=141` · `node
    prompts/build-prompts.mjs --check` → `PROMPTS_OK` · `cd eval && npm run p5t1` (Ajv accept/reject
    fixtures → `P5T1_OK`) · `deno test ... _shared/features.test.ts _shared/consistency.test.ts` — add the
    test that would have caught this: **`distance(faceA, faceA)` must be ~0 and a face must match its own
    subject profile.** Full Deno + Node green.
  - Note: ⚠️ **the toolchain cannot follow its own standing rule.** `MVP_Buildplan.md:51` says "bump
    versions, never mutate in place", but `prompts/build-prompts.mjs:29` **hardcodes `'v1'`** and skips any
    family lacking that exact path — a `prompts/*/v2` would emit no `.generated.ts` while `--check` still
    prints `PROMPTS_OK`: **a FALSE GREEN in CI** (`ci.yml:70`). There is **no v2 precedent** anywhere in
    the repo or git history. Decide **explicitly** (Decision Log): additive-to-v1 vs a real v2 that
    requires fixing the compiler first. **`kb/audit.mjs` is NOT in CI** — its Verify leg above is
    mandatory and manual.

# PHASE 4 — Surface hardening

- [ ] **B10 — Chat: history ordering + persisted citations** *(H5, M12b)*
  - Research: **H5** — `chat-send/index.ts:96` orders **ascending** with `limit(8)` → the model is fed the
    **eight oldest turns forever**; `chat.ts:149`'s `slice(-8)` is a **no-op** (ERRATA). Fix = order
    descending + limit + reverse. **M12b** — citations are returned in the HTTP body (`:108`) but the insert
    at `:103-106` writes only thread_id/role/content/tokens_in/tokens_out, `chat_messages` (`schema.sql:174-181`)
    has **no citations column** (`grep 'citation'` over all migrations = 0 hits), and the reload at `:96`
    selects only role,content → a reloaded thread loses the "cites your…" trust line.
  - Build: the order fix + an **additive** citations column migration + persist + select it.
  - Verify: `deno test ... _shared/chat.test.ts` — add the test that pins **most-recent**-8 ordering (the
    one that would have caught H5) + full 133+; `node --test --test-concurrency=1 chat.test.mjs` + full
    100/100.

- [ ] **B11 — Compat surface: free-tier gate atomicity + display_name injection** *(M8, M9)*
  - Research: **M8** — `compat-request/index.ts:23-29` non-atomic count→act (two parallel first requests
    both pass); `ctx.userId` string-interpolated into a PostgREST `.or()` filter at `:24` (safe only while
    `verify_jwt` guarantees a UUID sub — `_shared/revenuecat.ts:114` already exports `isUuid`; assert it
    regardless). **M9** — `worker-compat/index.ts:77-91` passes raw `profiles.display_name` into the model
    payload → **a hostile name is a prompt-injection channel into prose shown to the *other* person.**
  - Build: make the gate atomic (a partial unique index is the likely shape); assert `isUuid`; sanitize +
    cap display names at the model boundary.
  - Verify: `deno test` + `node --test --test-concurrency=1 compat_lifecycle.test.mjs worker_compat.test.mjs`
    + both suites full green. Add an injection-attempt test fixture.
  - Note: chat deflection regexes being English-only is **acceptable for an EN launch** (audit agrees) —
    record it, don't fix it.

- [ ] **B12 — Invite surface: context validation + clicked-attribution accuracy** *(M6, M7)*
  - Research: **M6** — `invite-create/index.ts:22-31` writes `context: body.context ?? {}` straight into the
    invites row with **no allowlist/length caps** on `inviter_name`/`card_image_url`, which `invite-page`
    renders on the trusted domain (XSS-escaped, but phishing framing + OG image unconstrained). **M7** —
    `invite-page/index.ts:47-48` is already a correct compare-and-set, so the fix is purely **bot-UA
    filtering** (messenger link-preview crawlers flip `created→clicked`) / moving `clicked` to the CTA tap
    beacon; 5-min CDN caching also undercounts real repeat clicks.
  - Build: length caps + a URL allowlist; bot-UA filter and/or the CTA beacon.
  - Verify: `deno test ... _shared/invite-page.test.ts _shared/invite.test.ts` + `node --test
    --test-concurrency=1 invite_create.test.mjs invite_page.test.mjs` + both suites green.
  - Note: **excludes H9** (B13) — that is net-new surface + a product decision, a different risk profile.

- [ ] **B13 — H9: manual short-code claim path + rate limiting** *(H9)*
  - Research: confirmed — `deriveShortCode` (`_shared/invite.ts:35`) is derived and printed at
    `_shared/invite-page.ts:139`, but **no endpoint resolves it**: `invite-claim/index.ts:33` hashes the
    full 43-char token and matches the complete `token_hash`. The spec's "always present, guarantees the
    loop closes" fallback **terminates in UI text**. Spec §13 **explicitly requires rate-limiting on
    `invite-claim`** (an unauthenticated-adjacent brute-force surface), and on invite-create/chat-send/
    compat-request generally. **Short-code lookup by prefix has collision + brute-force implications — that
    is exactly why the spec pairs it with rate limiting.** Needs a product decision; ask if unsure.
  - Build: the resolver endpoint + rate limiting on the four named surfaces.
  - Verify: `git grep -n "deriveShortCode" -- supabase/functions` shows a **resolver**, not just
    invite.ts/invite-page.ts; a brute-force attempt is throttled (test it); both suites green.
  - Note: this is the one HIGH finding whose fix **overlaps §NOT YET BUILT** (B.6 + B.7). It is in scope
    because H9 is a *finding*, but keep it minimal — do not build the whole teaser story (H6-gated).

# PHASE 5 — Vendor, contract & closure

- [ ] **B14 — C3: verify the RevenueCat webhook signature scheme against current RC docs** *(C3)*
  - Research: **this is the finding the loop's RESEARCH step exists for — the highest-blast-radius item in
    the codebase.** `_shared/revenuecat.ts:38-59` implements a **Stripe-style** `t=<ts>,v1=<hexHMAC>` scheme.
    The *implementation* is excellent (raw-body, ±300s replay window at `:56`, constant-time compare at
    `:58`); the *scheme* is the question. RC's shipped webhook auth is reportedly a **static `Authorization`
    header value** configured in the dashboard. If wrong: every webhook 401s → `subscriptions` never
    updates → **chat/compat gates permanently 402 paying customers.** **WebFetch RevenueCat's CURRENT
    webhook docs** — do not decide from memory or from the audit's assertion.
  - Build: whatever the docs actually say. Support the real scheme.
  - Verify: 🧑 **H8-gated for the live proof.** The deliverable is a **docs-verified decision + the code
    behind it**, recorded in the Decision Log with the doc URL and date — **explicitly NOT a live green.**
    ⚠️ **The trap:** `rcSignature` (`_shared/revenuecat.ts:35`) makes a unit test that signs with our own
    helper and verifies with our own verifier **trivially green regardless of whether the scheme is right**.
    **Do not mark C3 `[x]` on a self-consistent test.** Mark `[~]` (code + docs decision landed, live proof
    pending H8).

- [ ] **B15 — H4 residue: rc_event_id NOT NULL · TRANSFER · expires_at:null** *(H4 residue, Low: entitlement expires_at)*
  - Research: split out of B1 because these cannot ride an additive migration or are policy calls.
    (1) `subscription_events.rc_event_id text unique` (`schema.sql:141`) is **nullable** — NULLs never
    conflict in Postgres, so a NULL-id event re-inserts and re-upserts forever. **NOT NULL is a CONTRACTING
    change** → needs a real expand/backfill/contract sequence (B1 carries only the additive `coalesce`
    defense). (2) **TRANSFER** isn't in SQL at all — it's in the ACTIVATING set at `_shared/revenuecat.ts:85`
    and grants the destination **without revoking the source**; correct behavior is a **product decision**.
    (3) `entitlement.ts:18` treats `expires_at: null` as premium-forever while status ≠ expired.
  - Build: the expand/backfill/contract sequence; the TRANSFER decision; the expires_at semantics.
  - Verify: both suites green; `node --test --test-concurrency=1 revenuecat_webhook.test.mjs`. Decision Log
    rows for TRANSFER + expires_at.
  - Note: **strictly after B14** — the right TRANSFER/ordering semantics depend on what RC actually sends.

- [ ] **B16 — M12(c): callable image-deletion path** *(M12c)*
  - Research: `request_image_deletion` (`0016:43-57`) is revoked from anon/authenticated (`0016:131`) and
    granted only to service_role (`:137`), and **a grep across all 20 function dirs finds ZERO callers** —
    while its siblings *are* wired (`account-delete`→`purge_account`, `cleanup`→`crops_due_for_deletion`/
    `mark_crop_deleted`). The SQL author anticipated the wrapper (`0016:40-41` — "returns the paths for the
    Edge Function to purge from storage") and it was never written, so `PrivacyCenter`'s "Delete my scan
    photos now" has **no callable path**.
  - Build: the new Edge Function + `config.toml` entry (`verify_jwt=true` — it is user-mode). **Honor B4's
    collect→delete→log ordering.**
  - Verify: `deno check`; deploy + a live posture curl (no-JWT → 403); the blob is actually gone from
    storage afterwards; `mcp__supabase__list_edge_functions` shows ACTIVE with the right `verify_jwt`.
  - Note: the **app-side** half (`PrivacyCenter.tsx:25-27` is an empty stub) is **P6 wiring scope** — this
    task delivers the callable **server** path only.

- [ ] **B17 — M12(a): decide the locked-section teaser contract** *(M12a)*
  - Research: **the only finding whose right answer might be "delete the client field."** Verified:
    `reading_sections.v1.json:16` sets `additionalProperties:false` and `:39` requires `body`, and Ajv
    (`narrative.ts:239`, invoked `:296`) **REJECTS** a section carrying `teaser` ("must NOT have additional
    properties") — so `teaser` **can never arrive from the server**; a schema change is mandatory to add it.
    Compounding: `worker-narrative:87` defaults `depth_level=1` and `narrative.ts:273` `filterDepth` strips
    depth≥2, so `lockedSections()` (`reveal.ts:48`) returns `[]` against real data and
    `RevealView.tsx:111-122`'s whole "Go deeper" block is **dead**. The schema's own description (line 5)
    says only headline/title/body are model-authored → **a code-derived truncation is the
    contract-consistent option; a 4th generative field is not.** Mishandling leaks premium prose.
  - Build: the decided contract (prefer code-derived truncation) across schema + narrative + app.
  - Verify: `node kb/audit.mjs` · `node prompts/build-prompts.mjs --check` · `cd eval && npm run p5t1` ·
    `cd app && npm run typecheck && npm run lint && npx jest --ci`. ⚠️ **All 39 app tests assert against the
    `PREVIEW_*` fixtures themselves, so a server-contract change leaves 39/39 green — the app suite
    structurally CANNOT catch M12.** Do not treat app-green as evidence here; verify the real payload shape.
    (`@testing-library/react-native` is not installed, so no render test can be added without a new dep.)

- [ ] **B18 — M10: deprecate the un-deduped push enqueue path** *(M10)*
  - Research: `public.enqueue_push` (`0013:4-20`, language sql, no dedupe/cap, calls `queue_send` directly)
    and `public.enqueue_push_deduped` (`0014:35-81`, marketing cap + notification_log slot reservation) are
    **both live and both granted to service_role** (`0013:23`, `0014:84`) — `0013`'s own header calls itself
    "the single enqueue entry point", which `0014` silently superseded without deprecating it. The audit's
    secondary note belongs here too: the marketing cap is **check-then-insert (race)** and **UTC-day based**.
  - Build: migrate any caller, then revoke/drop the raw path — **a contracting step**, hence its own file
    and its own verify, not a passenger in B1.
  - Verify: `git grep -n "enqueue_push\b" -- supabase` shows **no remaining callers** of the raw path;
    `node --test --test-concurrency=1 notification_dedupe.test.mjs queues.test.mjs` + full 100/100.

- [ ] **B19 — M3: fortune-generate resilience (bounded concurrency + resume)** *(M3)*
  - Research: `fortune-generate/index.ts:35-56` awaits one Gemini call + one upsert per bucket across
    `allPillarBuckets()` = **61 entries** (`_shared/pillar.ts:66-75`: 60 sexagenary + 1 generic) with **zero
    concurrency**, and **swallows every per-bucket error at `:50-53`** — so a bad Gemini day silently
    generates only a **prefix** of the 61 and **still returns 200**. `buildFortuneBatch`
    (`_shared/fortune.ts:74`) is genuinely dead in production (its only consumer is `fortune.test.ts:43`).
  - Build: **the Batch-API rewrite is H4c-blocked** → in-scope fix is bounded concurrency +
    resume-missing-buckets + an **honest non-200/alert on partial completion**. EN-only stays (record it).
  - Verify: `deno test ... _shared/fortune.test.ts` (add: partial failure must **not** return 200) + full
    133+; `node --test --test-concurrency=1 fortune_generate.test.mjs` + full 100/100.

- [ ] **B20 — Housekeeping: the Low/informational bullets** *(Low ×5, M11)*
  - Research + Build (six items, grouped because each costs more to track than to fix):
    (a) **remove `hello/`** — an 11-line unauthenticated echo of the decoded-but-unverified JWT sub.
    (b) **constant-time secret gate** — the `token === env.serviceKey` compare is at
    **`_shared/auth-resolve.ts:44`** (**not** `context.ts` — ERRATA); one file, **18-function reach**, with
    an existing `auth-resolve.test.ts` net. Theoretical (the secret *is* the key), but cheap.
    (c) **moddatetime** trigger for `profiles.updated_at` (new migration).
    (d) **narrow the broadcast payload** from the full `scans` row (incl. `storage_path`, `capture_meta`) to
    status — no leak (owner-only topic), just wider than it should be.
    (e) **M11** — align `config.toml:178-217` with live staging (`enable_anonymous_sign_ins=true` per
    cleared H5; manual linking; Turnstile). Harmless until someone pushes config.
    (f) **leaked-password protection** — 🧑 a **dashboard toggle**, not code. Flag `[!]`/human **inside**
    this task; do not let it block the other five.
  - Verify: `ls supabase/functions/hello` **fails**; `deno test ... _shared/auth-resolve.test.ts` + full
    133+; both suites green; `verify_jwt` posture unchanged (`mcp__supabase__list_edge_functions`).
  - Note: **`verify_jwt` is SECURITY-LOAD-BEARING** — `auth-resolve.decodeJwtSub` decodes the JWT sub
    **without verifying it**; user-mode fns need `verify_jwt=true`, workers/webhooks `false`. Never flip one.

- [ ] **B21 — §3.3 test coverage gaps: HTTP handlers · storage round-trip · untested `_shared`** *(audit §3.3)*
  - Research: the audit's own final suggested work item, and the gaps are real (recon confirmed): **(1) no
    test exercises ANY Edge Function HTTP handler** — all 23 Deno test files live in `_shared/`, the ~29
    Node tests speak only SQL, and handler auth/routing was verified by **one-off live curls only**. That
    is a thin net under a **security-load-bearing** matrix (6 user-mode `verify_jwt=true` / 11 worker/public
    gating on the service key in-function). **(2) Storage is tested at SQL-policy level only** — no real
    upload/signed-URL/delete round-trip (B4 should already have added the first one; extend it).
    **(3) Untested `_shared` modules:** `context.ts`, `telemetry.ts`, `palette.ts`.
  - Build: smoke tests for the 17 handlers — at minimum the **posture** matrix per function (no-JWT → 403,
    no-key → 403, key → 200) plus routing/shape. Then the storage round-trip and the three module tests.
  - Verify: both suites green with the new counts (Deno **>133**, Node **100**) — paste them. Every new
    handler test must **fail** if you deliberately flip a `verify_jwt` or drop a gate (prove the net
    actually catches something; a test that passes against broken code is worse than no test).
  - Note: live-Gemini paths (image extraction, caching) are **untestable until H4c** — say so, don't fake
    them. Per-task regression tests (B0–B20) come first; this task closes **what's left over**. If context
    is short, land the handler posture matrix (the highest-value slice) and park the rest `[~]`.

- [ ] **B22 — Record-only: findings that close as decisions, not code** *(C5, M1, M5, Low ×5)*
  - Research + Record — **a single terminal task so the ledger can honestly reach all-`[x]`/`[!]` without
    pretending these are code work.** Write one Decision Log row each:
    - **C5** (free-tier Gemini) = **H4c** — human, already tracked. Hard production blocker (the free tier
      **trains on submitted content** — disqualifying for real palm/face photos). `[!]` human.
    - **M1** (zero-cost repeat scan) — needs **P4 capture-time landmarks that do not exist yet**. A genuine
      deferral, not a bug to fix now. Record the cost/latency consequence.
    - **M5** (explicit context caching) — `_shared/gemini.ts` is 58 lines: `withRetry` + `generateContent`,
      **no `createCache` anywhere**. Hard-blocked by H4c (`429 FreeTier limit=0`). ⚠️ **And it must never be
      interleaved:** `gemini.ts` is imported by **five** functions (worker-scan, worker-narrative,
      worker-compat, chat-send, fortune-generate) — a caching change there widens **every** other finding's
      blast radius. `[!]` H4c.
    - **Low: storage path `[1]` vs `[2]`** — **the audit itself resolves this against the spec** ("the spec
      is wrong, the SQL is right" — `storage.objects.name` excludes the bucket prefix). Correct output is a
      Decision Log row **+ a `Planning/Backend-specs.md` correction** — **not a code edit.**
    - **Low: enum case-sensitivity** — moot (Ajv rejects wrong case first). Record.
    - **Low: `is_pair_member`/`thread_owner` RPC-probing** — standard pattern, UUID-entropy-protected. Record.
    - **Low: invites RLS reads `is_anonymous` from the JWT** — fails **safe**; worth a client-side refresh
      after linking (that is P6/P7 client scope). Record.
    - **Low: `chat_messages` has no client INSERT policy** — **a sound narrowing** of spec §3.3 that keeps
      the entitlement gate authoritative. Record as working-as-intended.
    - **Low: App Store ID placeholder `id0000000000`** — 🧑 **H7**-gated. Record.
  - Verify: every finding ID from the audit's §4/§5 appears exactly once across B0–B22 with a terminal
    state. Produce the **final report**: confirmed vs false-positive vs deferred counts.

---

## Build Log

> One line per completed task: `- B# — <what landed> — <real evidence: test counts / MCP output / paths> — YYYY-MM-DD`

- B6 — `worker-scan/index.ts` + `_shared/retry.ts` (no migration): status guard via new `alreadyProcessed()` (policy extracted to `_shared` so it is unit-testable), `vt` 60→**300**, `subject_profiles` insert error surfaced as telemetry instead of swallowed. Live answer to the ledger's question: **`subject_profiles_user_id_kind_key UNIQUE (user_id,kind)` EXISTS** → H1's insert half is a **silent no-op**, not row growth. H2-scan is self-reinforcing: the subject_profile insert precedes `archive`, so a redelivery matches the subject the scan itself just created → regresses narrating→matched. vt arithmetic: 3 votes × ~107s ≈ **320s > 60s**. `exists_unmatched` telemetry is now B9's live H1 detector. Evidence: `deno check` clean; Deno `138 passed | 0 failed` (+1); `worker_scan+worker_retry` 6/6; Node `# pass 113 / # fail 0` (242881.4ms). +2 regression tests. **M2-scan deferred → B22 w/ M1** (feature_hash is computed *from* the extraction, so it cannot gate the extraction) — 2026-07-17
- B5 — migration `20260717000022_h2_readings_unique.sql` applied + `worker-narrative/index.ts`: guard before the paid model call (redelivery settles instead of regenerating), `23505` handled as success-by-someone-else, `vt` 60→**180**. vt proven too short by arithmetic: withRetry = 5 attempts × 5-20s (§11.2) + ~7s backoff ≈ **107s > 60s**, so a *healthy slow* call was redelivered — no crash needed. Live pre-state: `readings` had only pkey + (user_id,created_at) — no uniqueness. Evidence: `deno check` clean; `worker_narrative` 4/4; Node `# pass 112 / # fail 0` (242257.6ms); Deno `137 passed | 0 failed`. +1 regression test (duplicate depth-1 rejected; depth 1+2 coexist). **"No second model call" not unit-testable until B21** — 2026-07-17
- B4 — migration `20260717000021_h7_storage_ordering.sql` applied + `_shared/cleanup.ts` (`purgeAccountStorageFirst`, `mergedStoragePath`) + `account-delete`/`account-merge` rewired: H7's collect→delete→purge→log-last invariant now lives in ONE reusable function (**B16 must import it**). Precedent: `cleanup/index.ts` already did it right; account-delete was the outlier. `deletion_log` now records a request (`completed_at` NULL) + new `mark_deletion_complete`. merge re-parents AND rewrites the owner path prefix in one statement, returns `storage_moves`; the Edge fn moves blobs first. Evidence: Deno `137 passed | 0 failed` (was 133); `deno check` clean on all 3; `account_merge+data_lifecycle` 14/14; Node `1..111 / # pass 111 / # fail 0` (240969.9ms). +6 regression tests. **Storage round-trip NOT closed → B21 (D-09)** — 2026-07-17
- B3 — migration `20260717000020_c4_h10_lifecycle_predicates.sql` applied: C4 crop predicate restated positively (24h-old crop is due whatever its status; `failed` immediate; `keep_image` exempt — status enumeration DROPPED, not extended) + H10 `sweep_stale_anon` never purges a pair member. Verdicts: C4 limb "keys off created_at" = **FALSE POSITIVE (spec wrong, SQL right — D-07)**; H10 CONFIRMED **worse than stated** (compat keys off `canonical_palm_fs`, not `readings` → a narrative-failed user has 0 readings yet can hold a COMPLETE result). Evidence: `data_lifecycle.test.mjs` 9/9; Node `1..109 / # pass 109 / # fail 0` (237130.2ms). +3 regression tests — 2026-07-17
- B2 — migration `20260717000019_c2_unschedule_destructive_drains.sql` applied: all 5 `drain_stub` crons unscheduled (C2 interim). Evidence: `cron.job` → **0 jobs**; newest `cron.job_run_details` frozen at 21:21:00 = **no run for 4m43s** (was every 10s / 32 runs per 2min). Pre-state captured: 5 active drains, pgmq totals scan 56 / narrative 20 / compat 39 / push 130. Node `1..106 / # pass 106 / # fail 0` (237024.3ms). Test inverted: "each queue has a scheduled drain" → "no cron may invoke drain_stub". **`[~]` — pg_net wiring stays with the buildplan** — 2026-07-17
- B1 — migration `20260717000018_audit_c1_h3_h4_m13_m14.sql` applied to staging (recorded in `supabase_migrations.schema_migrations`): C1 revoke (live acl now `postgres=X/postgres | service_role=X/postgres` — anon/authenticated/PUBLIC gone; **`drain_stub` no longer in `get_advisors`**), 5 M13 indexes (all present in `pg_indexes`), `claim_invite` FOR UPDATE + kind-gated pair, `record_rc_event` + additive `subscription_events.applied_at`. Evidence: Node `1..105 / # pass 105 / # fail 0` (232967.7ms); targeted 32/32; Deno `133 passed | 0 failed`. +5 regression tests — 2026-07-17
- B0 — baseline honestly green: 4 stale global-count assertions scoped to their own fixtures (test-only, no product code). All 4 deltas reconciled to live staging first via MCP (worker_telemetry=2, kb_chunks=141, cards objects=2) → **zero product bugs**. Evidence: Node `1..100 / # pass 100 / # fail 0` (226886.5ms, was 96/100); Deno `133 passed | 0 failed` (3s). Files: `supabase/tests/{queues,rls,storage,worker_narrative}.test.mjs` — 2026-07-17

---

## Decision Log

| # | Date | Decision | Rationale |
|---|---|---|---|
| D-01 | 2026-07-17 | This ledger does **not** update `MVP_Buildplan.md`'s STATE block. | **No precedent:** the buildplan contains zero references to either redesign ledger, and two complete side-ledger rounds (R1–R24, V1–V23) landed without touching it. Silently changing that would misrepresent convention. If the buildplan should learn about this round, that is a deliberate, separate call by the user. **Exception:** if a task lands work the buildplan lists as its own "Next task" (the cron wiring), say so in the final report rather than editing it unilaterally. |
| D-02 | 2026-07-17 | Scope = the audit's **findings** (§4/§5) only; §NOT YET BUILT and §RECOMMENDED ADDITIONS are excluded. | The first is `MVP_Buildplan.md`'s job; the second is a feature backlog, not a defect list. The single exception (C2/C4's dependence on the cron wiring) is delivered as an explicit interim (B2/B3) rather than a silent scope expansion. |
| D-03 | 2026-07-17 | `Backend-audit.md`'s cites are **superseded by the ERRATA table** where they conflict with the code. | Recon verified every anchor against the tree: four cites name files that have never existed. The audit remains the authority on *what the finding is*; the repo is the authority on *where it lives*. |
| D-10 | 2026-07-17 | **USER DECISION — B7 commits all three Noto binaries + the resvg wasm to git (~20MB, `.git` 41MB → ~60MB).** Licence verified first: **SIL OFL 1.1** permits bundling/redistribution with software (no standalone sale; ship the OFL file). | Asked per loop rule 16 rather than guessed. Precedent supports it: `.gitattributes` **already declares `*.ttf`/`*.otf binary`**, so the repo's convention anticipated fonts, and PNG assets are already committed; there is no LFS to complicate it. **Subsetting was evaluated and rejected as impossible, not merely inconvenient:** the card's `attribution` is the user's **display_name** — arbitrary input — and you cannot subset for unpredictable glyphs. That is also what justifies the ~17MB `NotoSerifSC-Regular.otf` despite an EN launch: `card-svg.ts` emits only `font-family="Noto Sans"` and contains no CJK, but a CJK display_name would render as tofu **on the share card**, i.e. the viral asset, for precisely this product's target audience. Alternatives declined: Latin-only (ships that tofu bug), deploy-time fetch (makes deploys non-hermetic — the same class of external dependency M4 dings the unpkg fetch for). |
| D-11 | 2026-07-17 | **USER DECISION — B7 keeps the pre-render but writes it PRIVATE, publishing to the public bucket only on share intent.** | Both options were spec-legal (§13/§9 only require that the *public* bucket hold user-initiated cards). Pre-render-private keeps sharing instant, which is the whole point of pre-rendering: "render on share intent only" would pay resvg cold start + wasm init at the exact moment the P2 viral share is happening. Private-by-default plus publish-on-copy gets the same privacy outcome without that latency, at the cost of one extra copy step. |
| D-09 | 2026-07-17 | **B4 proves H7's "no orphan" property with an injectable seam instead of the live storage round-trip its Verify line asks for.** The real round-trip stays open, reassigned to B21. | Two blockers and one better option. **Blockers:** the Node harness depends on `pg` alone — a live round-trip needs `@supabase/supabase-js` (a new dependency, the same call B17 flags for `@testing-library/react-native`) or hand-rolled Storage REST calls; and it would **persistently mutate staging**, which the begin/rollback harness exists specifically to prevent (a failed test would leave a real object behind). **Better option:** the property H7 is actually about is *"a storage failure must not orphan a crop"* — a live round-trip **cannot test that**, because it cannot make S3 fail on demand. An injected failing `removeObjects` can, and asserts the exact invariant (`purgeRows` never runs). This is the repo's own idiom (`revenuecat.ts`: "Pure/injectable … so it is unit-testable without the network"). What is genuinely NOT covered: that the Storage API calls work at all against a real bucket — that is handler-integration scope, which B21 owns. |
| D-07 | 2026-07-17 | **C4's "deletes 24h after scan creation, not after successful extraction" is closed as a FALSE POSITIVE — the spec is wrong, the SQL is right.** `crops_due_for_deletion` keeps keying the age on `created_at`. **A `Planning/Backend-specs.md` §9 correction is owed** (tracked with B22's storage-path correction). | The choice only affects scans that are **already extracted** — where the crop is spent (pass 2 reads features, never the image). For those, `created_at` deletes **sooner**, so keying on extraction would *only ever retain crops longer* and weaken the D2 claim ("analyzed, then deleted — usually within a day"). It cannot protect a backlogged crop either: that risk lives entirely in the stuck-scan branch, which fires at 24h from creation regardless. And re-analysis with improved extractors already has its designed mechanism — the `keep_image` opt-in, spec §9's own "Opt-in retained scan / until revoked" row. `created_at` is also the promise the user actually experiences ("I took a photo; it is gone within a day"). Applying the audit literally here would have **degraded privacy** while looking like a fix. Precedent: the audit makes exactly this call itself for `storage.objects.name` `[1]` vs `[2]`. |
| D-08 | 2026-07-17 | **`sweep_stale_anon` now refuses to purge any compatibility-pair member**, accepting a bounded MAU cost rather than reassign/tombstone semantics. | This is an irreversible deletion path, so the trade is "retain a few anon rows" vs "silently destroy an active user's pair + result". Verified live that both `compatibility_pairs` FKs cascade and results cascade from the pair, so there is no way to keep the pair while deleting the member. Tombstone/reassign would bound both costs, but inventing tombstone semantics for a **shared relationship row** (who owns it? what does the survivor see?) is a product decision, not a bug fix — out of this ledger's remit. The MAU consequence is real and recorded: an anon who claims an invite and never returns is now retained indefinitely. If that cost bites, the follow-up is a tombstone design, not re-enabling the destructive cascade. |
| D-06 | 2026-07-17 | **B2 unschedules all 5 `drain_stub` crons, not just the 2 the audit names.** | The audit's "disable the drain crons for `compat_jobs`/`push_jobs`" is right about *today* — verified: only those two have live SQL enqueuers (`0011:50,73`; `0013:16`, `0014:76`). But `drain_stub` **archives every message it reads** and **nothing consumes any of these queues**, so every scheduled drain is pure destruction with zero upside — not a worker, just a shredder on a 10s timer. Leaving the scan/narrative drains armed is a live trap for the very next buildplan task (`scan-create`/`scan-ingest`, P4): the first real scan job would be eaten within 10 seconds, and the symptom (a job that simply vanishes) is miserable to debug. The stub's proof-of-path value is retained — `queues.test.mjs` calls `drain_stub` directly and never depended on the schedule. Fully reversible; the exact restore SQL is in the migration header, and restoring is only correct once the command is a real worker invocation. |
| D-04 | 2026-07-17 | **H4's fix departs from the audit's literal prescription.** Instead of "reorder the `exists(profiles)` guard before the event insert", B1 adds `subscription_events.applied_at` and makes the idempotency key guard the **upsert** rather than the log row. | The audit's version does not actually close the finding, and contradicts the code it would have to change. **(1)** `revenuecat-webhook/index.ts` returns **HTTP 200 when `applied=false`** — RC never retries a 200, so declining to consume the key changes nothing; the event is still lost. **(2)** A tri-state return would let the handler 5xx, but `create or replace` **cannot change the `boolean` return type** → contracting, out of B1's additive remit. **(3)** The literal reorder breaks `revenuecat_webhook.test.mjs:58`, which deliberately asserts an unknown-user event is *logged for audit* — matching `subscription_events`' documented purpose ("raw webhook audit log", `schema.sql:139`). The `applied_at` design fixes the audit's stated failure ("every RC retry then dedupes to a no-op forever" — a redelivery now applies) while keeping the audit log complete and all 4 existing tests green. **Residual, stated honestly:** because the handler still 200s, self-healing needs *some* redelivery (an RC dashboard resend, or any later event — which carries a different id and applies normally). Making the handler signal retry is a **product call on posture**: a not-yet-provisioned user resolves on retry, but a merged-away UUID never will, so a blanket 5xx would retry forever against a permanently-dead id. Routed to B15 with the rest of the H4 residue. |
| D-05 | 2026-07-17 | **H4's `latest_event_at` ordering guard is deferred to B15**, not built in B1. | `0009:38` stamps `latest_event_at = now()` — **processing** time, not event time. `now()` is monotonic in processing order, so a guard written against it is true by construction and would be **decorative**: it would look like a fix and prevent nothing. A real out-of-order guard needs RC's actual event timestamp, and `RcEvent` (`_shared/revenuecat.ts:62-70`) **has no timestamp field** — the payload's real shape is exactly what B14 establishes from the vendor docs. The ledger's own B15 note already says ordering semantics depend on what RC actually sends; B1's "add an ordering guard" line is the over-eager one. A fake guard now would be worse than the bug, because it would look closed. |
