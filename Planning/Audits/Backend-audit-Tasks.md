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
- **Baseline suites (re-pinned 2026-07-17; both grow as tasks add regression tests — Node B0 100 → B1 105 → B2 106 → B3 109 → B4 111 → B5 112 → B6 113 → B7 114 → B10 117 → B11 119 → B13 124 → B15 127 → B16 130; Deno 133 → B4 137 → B6 138 → B8 140 → B10 141 → B11 143 → B12 147 → B13 148 → B14 151 → B15 152 → B17 154):**
  **Node 130/130** (`# pass 130 / # fail 0`, 274.4s) · **Deno 154/154** (`154 passed | 0 failed`, 2s)
  · app jest **39/39** (8 suites) — but see B17: the app suite asserts against its own `PREVIEW_*`
  fixtures, so it **structurally cannot** catch a server-contract change. Never cite it as evidence.
  · app jest **39/39** (8 suites). ⚠️ The buildplan's "Deno 130 / Node 100" is **stale** — do not
  quote it. The pre-B0 "Node 96/100" is now historical.
- **The audit's own "can't run the suites" caveat DOES NOT APPLY HERE.** It was written on a Mac with
  no Deno and no `.env.staging`. **This is the Windows dev machine:** Deno 2.9.2 is at
  `C:\Users\leheh\.deno\bin\deno.exe` and `.env.staging` is present. Both suites run. Every task below
  is expected to produce a **real, observed** test count.
- **Last completed:** **B17** (2026-07-17) — M12a closed by **deleting** the `teaser` field (D-25);
  no schema change. Suites: **Node 130/130**, **Deno 154/154**, app jest **39/39**.
- **Next task:** **B18 — M10: deprecate the un-deduped push enqueue path**. A **contracting** step
  (revoke/drop the raw `enqueue_push`), hence its own file + verify. `0013`'s own header calls itself
  "the single enqueue entry point", which `0014` silently superseded. Check callers first:
  `git grep -n "enqueue_push\b" -- supabase`. The audit's secondary note belongs here too: the
  marketing cap is **check-then-insert (race)** and **UTC-day based** — the same class as M8, which
  D-17 fixed by moving the count into the same transaction as the act.
- 🚩 **Standing, ledger-wide (D-24): nothing here is deployed.** Migrations ARE applied to staging;
  Edge Functions are **not** — there is no `SUPABASE_ACCESS_TOKEN`, and `deploy.yml` (merge to main,
  `staging-deploy` env) owns that, gated by **H3/H4b-2**. Every fix is closed *in the repo*, not *in
  production*. Expand-contract is what keeps the old deployed functions working against the new
  schema in the meantime.
- 🚩 **HAND-OFF TO THE USER / BUILDPLAN (from B9/D-14 — reported, not written, per D-01):**
  1. **`Planning/Audits/Backend-audit.md` owes an H1 re-title** — H1 is not "faces lack a geometry
     signature", it is "**`deriveGeometry` reads the wrong source**: `line_geometry` is the model's
     rendering polyline; identity belongs in `feature_sets.geometry` = on-device capture-time
     landmark ratios (§6.6.3)". Re-gate H1 to the two tasks below — **not** to H4c, which is
     causally unrelated. Mark option A **dropped, not deferred**, so nobody rebuilds it with less
     scrutiny the day the paid Gemini key lands.
  2. **`Planning/MVP_Buildplan.md` is missing the only tasks that can actually fix H1** — the
     on-device face path is **not on the roadmap** (P4.T3 is hands-only; P4.T5's face variant reuses
     T2/T4's verify, not T3's; `capture_meta` carries landmark *quality*, not ratios; there is no
     transport). Needs: **(a)** face contours → scale-invariant ratios on device; **(b)** transport
     those ratios via `scan-create` → `worker-scan` writes them to the **existing**
     `feature_sets.geometry` column, with a determinism verify (same face ×5, pairwise distance under
     threshold) — that test is also what finally calibrates `MATCH_THRESHOLD`, still self-annotated
     "chosen conservatively".
  3. **The face extraction prompt does not exist** (`prompts/extraction/v1` is palm-only and teaches
     that a face is the *reject* case, while `extraction.ts` fails the scan on `is_face === false`).
     **Faces cannot work at all today**, under any H1 option. That is §NOT YET BUILT scope, not this
     ledger's, but nothing about faces is real until it is written.
  4. **The constraint D-14 rests on: no face scan may reach a user before (2) lands.**
- **App-side follow-up B7 creates (NOT this ledger's scope — P6 wiring):** the share button must now
  call `card-render` with `{action:'publish', card_id}` before handing the URL to the share sheet.
  Until then a pre-rendered card exists but is never published — which is the *correct*, private
  default, not a regression.
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
| ~~H6: push-dispatch "archives regardless of ticket outcome" → **Worse:** `:47` pushes `msg_id` into `archived` before `sendExpoPush` at `:53` — jobs die even when the Expo POST *throws*.~~ | 🔴 **THIS ERRATA ROW WAS ITSELF WRONG — struck 2026-07-17 by B8 (D-12).** Unreachable on two counts: (1) `:47` only appends to a **local array**; the real `queue_archive` RPC is at `:63`, **after** the send — a throw there would *prevent* the archive, not cause it. (2) **`sendExpoPush` never throws** (`_shared/push.ts:80` docstring; `:84-95` converts a 5xx into error tickets and catches network throws). **The audit's plainer original wording is the correct one** and is CONFIRMED: control always reaches the unconditional archive, so a failed Expo batch was silently deleted. Fixed in B8. |
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

- [x] **B7 — card-render: private-by-default · share-intent publication · fonts · self-hosted wasm** *(H8, M4)* — **2026-07-17**
  - **DONE: H8 CONFIRMED · M4 CONFIRMED (visually — and it is worse than prose conveys).** Landed as
    `supabase/migrations/20260717000023_h8_cards_private_by_default.sql` + `card-render/render.ts` +
    `card-render/index.ts` + 15MB of vendored assets (counter re-read: max was 22).
  - **M4 proven by LOOKING at the PNG, as the Verify demands — not by inference.** Rendered the same
    card twice through real resvg (`scratchpad/render-proof.ts`), with and without the bundled fonts:
    - **without fonts (what ships today): 35,852 B — headline, both chips, `palmly.app` and the
      attribution are ALL MISSING.** The chips render as empty pink pills. The viral asset with every
      string gone.
    - **with fonts: 54,460 B — headline, chips, domain, and the CJK attribution 美玲 all present.**
    +18,608 B of rasterized text. This also **empirically vindicates D-10's CJK call**: 美玲 renders
    only because `NotoSerifSC-Regular.otf` is bundled; without it that is tofu **on the share card**.
  - **Assets vendored + verified by magic bytes, not filename** (a real trap: the first
    `NotoSerifSC` URL 404'd and curl wrote the **311KB GitHub error page** into a plausible-looking
    `.otf`): `NotoSans-Regular.ttf` 621,572 B `00010000` · `NotoSerif-SemiBold.ttf` 739,428 B
    `00010000` · `NotoSerifSC-Regular.otf` 11,625,800 B `4f54544f` ("OTTO", the static SC-subset
    Regular from `noto-cjk/Serif/SubsetOTF/SC` — **not** the 24MB pan-CJK or the 25MB variable) ·
    `index_bg.wasm` 2,478,606 B `0061736d` (`\0asm`) · `fonts/LICENSE` (OFL). **Total 15MB — under
    the ~20MB D-10 approved.**
  - **H8 CONFIRMED + FIXED.** New **private `card-drafts` bucket** (owner-read only, mirroring the
    `scans` idiom); `renderAndStoreCard` writes there and returns **no public URL**; the new
    `publishCard` (`action:'publish'`) is the **only** path that copies onto the CDN, stamping
    `published_at` **after** the copy succeeds (the same never-claim-a-state-storage-hasn't-reached
    discipline as B4/H7). `cards_public_read` **dropped** — it let any client enumerate every
    published card of every user; the bucket stays `public=true` so CDN URL fetches (share sheet,
    invite-page OG image) are untouched, because those never consult RLS.
  - **`loadFonts` now throws instead of `catch {}`.** The silent swallow is *why* M4 shipped: with
    `loadSystemFonts:false` a missing file is not a degraded card, it is a card with no text, and
    the catch turned that into a no-op. Also added `share_cards` unique `(user_id, source_id, variant)`
    so a re-render upserts rather than duplicating — and cannot silently un-publish a shared card;
    a re-render of an already-published card refreshes the public copy so the CDN cannot serve a
    stale PNG. (`share_cards` verified empty — 0 rows, 0 duplicate groups — before adding it.)
  - Verify (observed, every item literally): `git grep -n "unpkg.com" -- supabase/functions` → **0
    hits** ✅ (first pass returned 1 — my own explanatory comment; reworded, since a comment
    containing the string would permanently defeat the check for anyone re-running it) ·
    `ls card-render/fonts` → the 3 files + LICENSE ✅ · **looked at the PNG, text present** ✅ ·
    public bucket holds no un-shared card ✅ (pinned by test) · **advisors no longer flag
    `public_bucket_allows_listing`** ✅ (it was present in B1's run) · `deno check card-render/*` →
    clean · Deno **138/138** · full Node **114/114** (`# pass 114 / # fail 0`, 247.8s).
  - Regression tests (+2, and one rewritten): `storage.test.mjs` — the old *"cards bucket: publicly
    readable by the anonymous role"* **encoded the bug** and was rewritten: the bucket is still
    `public=true`, but **neither `anon` nor a signed-in stranger can list it**. New: `card-drafts` is
    private, owner-readable, invisible to B and to anon.
  - ⚠️ **Honest limits:** (1) the publish/copy path is exercised only through `deno check` + the SQL
    pins — a live Storage-API round-trip is **B21**'s (D-09). (2) The published path stays
    `${userId}/${sourceId}_${variant}.png`; H8 called it "guessable, **enumerable**" — enumeration is
    what the dropped policy fixes, and both segments are UUIDs, which the audit's own Low finding
    accepts as "UUID-entropy-protected". Path randomization was not asked for and was not added.
  - 📋 Original research note + the answered decisions (kept for provenance):
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

- [~] **B8 — push-dispatch: archive-after-send · receipts · N+1 · loop-until-empty** *(H6)* — **2026-07-17** — 3 of 4 limbs landed; **receipts deferred** (needs the cron — same boundary as C2/B2).
  - **DONE: H6 PARTLY CONFIRMED. The AUDIT is right; the ⚠️ ERRATA row on H6 is WRONG — see D-12.**
    No migration; all changes in `push-dispatch/index.ts` + `_shared/push.ts`.
  - 🔴 **ERRATA CORRECTION (the ledger's own table was in error).** It claims: *"Worse: `:47` pushes
    `msg_id` into `archived` before `sendExpoPush` is even called at `:53` — jobs die even when the
    Expo POST throws."* **That scenario is unreachable, on two counts:**
    1. `:47` only pushes into a **local array**. The actual `queue_archive` RPC is at **`:63`, AFTER**
       the send. If the send threw, `:63` would never run and pgmq would redeliver — the *opposite*
       of "jobs die".
    2. **`sendExpoPush` never throws at all.** Its own docstring (`_shared/push.ts:80`) says so, and
       `:84-95` proves it: a 5xx becomes error tickets (`:87`), a network throw is caught (`:93`).
       "When the Expo POST throws" is not a state this code can reach.
    **The audit's plainer original claim — "all read jobs are archived regardless of ticket outcome
    … a failed Expo batch (5xx) silently drops those notifications" — is the correct one, and is
    CONFIRMED.** The ERRATA reached for a scarier framing and landed on a fiction. Table corrected.
  - **Archive-on-failure CONFIRMED + FIXED.** Because `sendExpoPush` returns error tickets instead of
    throwing, control *always* reached the unconditional archive at `:63` — so an Expo outage deleted
    every notification in the batch: never sent, never retried, no trace. Now each job's ticket slice
    is attributed back to its `msg_id` and archived **only when nothing about it is worth retrying**.
  - **Retry policy from Expo's CURRENT docs** (fetched 2026-07-17,
    <https://docs.expo.dev/push-notifications/sending-notifications/>): retryable =
    `MessageRateExceeded` ("implement exponential backoff and slowly retry") + `TOO_MANY_REQUESTS`
    (>600/s) + our own transport failures (5xx/network/`no_ticket` — the message never reached Expo);
    permanent = `DeviceNotRegistered`, `MessageTooBig`, `MismatchSenderId`, `InvalidCredentials`
    (re-sending can never make these land, so retrying would pin the job until it dead-letters).
    A job with **zero** messages (all devices gated by prefs/quiet hours) has no tickets → archived.
  - **N+1 CONFIRMED + FIXED** (`:42`) — one `devices` query per job meant a 100-job tick paid 100
    serialized round-trips before a single push went out. Now one `.in('user_id', …)` per chunk,
    grouped in memory.
  - **Loop-until-empty CONFIRMED + FIXED** (`:33`) — one 100-job chunk per 15s tick made a 10K-user
    fortune fan-out take ~25 min, for a send that is supposed to land at 8:30 *local*. Now drains
    until empty under a **20s wall-clock budget**, deliberately well inside the 60s queue vt so a slow
    tick cannot have its own in-flight messages redelivered underneath it.
  - 🔶 **Receipts NOT built — deferred, with the same rationale as C2/B2 (D-13).** Expo's docs are
    explicit: *"check push receipts 15 minutes after sending"*. That makes receipt polling
    **inherently a separately scheduled job**, needing (a) ticket-id persistence and (b) a cron to
    poll later — **and the cron wiring is exactly what this ledger puts out of scope** (§NOT YET
    BUILT A.3; the audit itself also lists "Expo receipt polling" under §NOT YET BUILT C.10).
    Writing a poller with no schedule would produce **dead code** — precisely the thing M3 dings
    `buildFortuneBatch` for. So B8 closes `[~]`: the drop-on-failure bug (the part that loses data
    today) is fixed; receipts ride with the cron work.
    **Consequence recorded honestly:** `DeviceNotRegistered` pruning stays *largely ineffective*,
    because Expo returns it predominantly at **receipt** time — confirmed in the docs, which list it
    under both ticket- and receipt-time errors. Ticket-time pruning (already implemented) catches only
    the subset Expo rejects immediately.
  - Verify (observed): `deno check push-dispatch/index.ts _shared/push.ts` → clean; `_shared/push.test.ts`
    **9/9**; Deno **140/140** (+2); `push_dispatch.test.mjs` **4/4**; full Node **114/114**
    (`# pass 114 / # fail 0`, 247.2s).
  - Regression tests added (2, both Deno): `isRetryableTicket` pins **both** directions — a 5xx /
    network / `no_ticket` / rate-limit ticket must be retried (the H6 drop), and `ok` /
    DeviceNotRegistered / MessageTooBig / MismatchSenderId / InvalidCredentials must **not** be
    (retrying those would pin the job until dead-letter). Plus a test pinning the *premise* the whole
    fix rests on: **a 503 yields error tickets rather than throwing**, which is exactly how the old
    code reached its archive loop during an outage.
  - ⚠️ **Honest limit:** the per-job archive attribution lives in the unexported handler body, so it
    is covered by `deno check` + the classifier's unit tests, not end-to-end — same handler-test gap
    as B5/B6, and **B21**'s to close.
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

- [x] **B9 — H1: face repeat-scan consistency (face geometry signature)** *(H1 — schema/geometry half)* — **2026-07-17** — **closed as DECISION (D-14): confirmed, deliberately not fixed here, re-scoped. No code written — by design.**
  - **H1 CONFIRMED by executing the real modules** (not by reading them):
    ```
    deriveGeometry(faceA)                    = {"heart":null,"head":null,"life":null,"fate":null}
    distance(faceA, faceA)                   = Infinity      ← a face vs ITSELF
    matchSubject(faceA vs its OWN profile)   = null
    distance(palmA, palmA)                   = 0             ← palm control
    ```
    Mechanism: `deriveGeometry` (`_shared/features.ts:69`) reads **only** `features.line_geometry`;
    `geometryDistance` (`:80`) returns **`Infinity` when `n === 0`** (every key skipped). It **fails
    CLOSED** — no false-match leak — so this is urgent-by-COST, not urgent-by-danger. ERRATA
    confirmed: they live in `features.ts`, not `consistency.ts`.
  - 🔴 **THE AUDIT'S PRESCRIPTION RESTS ON A FALSE PREMISE — and this ledger repeated it.** Both say
    to build "a face-specific geometry signature (e.g. **landmark ratios from the face schema**)".
    **`face_features.v1.json` HAS NO LANDMARK DATA.** Every leaf is an enum: `face_shape`,
    `three_courts`, `five_eyes_spacing`, `eyebrows.shape`, `eyes.shape`, `eyes.set`, `nose.shape`,
    `nose.bridge`, `mouth.shape`, `ears.set`, `ears.size`, `canthus_wolong`, `confidence` (+ the
    `is_face` boolean). **Zero numbers. There are no ratios to compute.** The fix is therefore not
    "derive from what's there" — it is a change to the **trust-critical extraction contract**.
  - **What the palm precedent actually is** (checked, because it decides the shape of the fix):
    `line_geometry` is **`required` at palm's top level**, and `prompts/extraction/v1` *teaches* the
    model to emit it — "ordered polylines … `[x, y]` points in a **0–1000 normalized frame**" — with
    worked few-shot examples. So palm geometry is **model-emitted**, not computed from anything. The
    parallel face fix means making the model emit face landmarks too.
  - **Versioning is safe as additive-to-v1** (the Note demanded an explicit call): `feature_sets` and
    `readings` are **empty on staging (0 rows, verified)** and no face scan has ever run, so there is
    no v1 data to break. That matters because a real `v2` is **not** viable:
    `prompts/build-prompts.mjs:29` hardcodes `'v1'`, so a `prompts/*/v2` would emit no
    `.generated.ts` while `--check` still prints `PROMPTS_OK` — **a false green in CI** (`ci.yml:70`),
    with no v2 precedent anywhere in the repo or git history. **→ additive-to-v1, decided (D-15).**
  - ✅ **RESOLVED — DECISION (D-14, revised): H1 is CONFIRMED but is deliberately NOT fixed on the
    matching path. Both proposed fixes are wrong, and the bug is unreachable today.** Decided from an
    11-agent adversarial investigation (4 ground-truth readers → 3 independent design lenses → 3
    skeptics → synthesis); the panel was **unanimous 3/3**, and every load-bearing claim below was
    **re-verified by hand afterwards** rather than taken on the panel's word.
  - **Option A (teach the model to emit face landmarks) is not merely unverifiable — it is
    actively harmful, and the codebase has ALREADY RULED on it, twice:**
    - `features.ts:2-3` — *"feature_hash is the consistency key: the same enum buckets → the same
      hash (**line_geometry excluded, since exact pixel paths vary** while the semantic reading does
      not)"*. The authors state outright that model-emitted coordinates are **unstable**.
    - `consistency.ts:51-52` — `if (Array.isArray(vals[0]) || k === 'line_geometry') out[k] = vals[0]`
      — across votes of the **SAME image**, geometry is not voted on at all; it takes vote #1,
      because the authors knew the votes would not agree.
    So A would anchor **identity** in the one field the code documents as varying. Worse:
    - 🧨 **The strip-list landmine (verified):** `features.ts:26` and `consistency.ts:68` both
      hardcode **`line_geometry` only**. A sibling `landmark_geometry` would leak into `featureHash`
      (destroying the determinism of the consistency key) **and** into `sameFeatures` → the 3rd
      tie-break vote would fire on **every** new-subject face scan → **+50% extraction cost,
      permanently — the exact cost H1 exists to remove.**
    - 🔓 **It flips the failure posture from CLOSED to OPEN.** Today a face never matches: expensive,
      never wrong. Under A, template-regressed coordinates give distance ≈ 0 *always* → hand your
      phone to a friend and `worker-scan` short-circuits to `matched` and serves them **your**
      reading — on the surface P2's growth loop is built on. **Expensive becomes wrong.**
  - **Option B (enum signature) is dead — my own argument for it was refuted.** I argued "the
    narrative is a pure function of the features, so matching enums ⇒ the same reading anyway". That
    holds only for **exact** equality, and B is by definition a **tolerant** distance. One differing
    enum of twelve = **0.0833**. Any threshold ≥ that serves a reading the face never earned (while
    the reveal UI says "your palm is unchanged — your reading stands"); any threshold below it demands
    exact equality — which **reinvents `feature_hash`** (already computed at `worker-scan:166`,
    already stored, **never read**) and would essentially never fire, since `twoVoteExtract` exists
    *precisely because* the extractor disagrees with itself on identical bytes. **No threshold is both
    sound and useful.** C inherits B's corpse and pays twice → **C is the over-engineering on this
    ballot.**
  - **The decisive fact: the face path cannot execute.** `scan-create`/`scan-ingest` **do not exist**
    (verified: 0 matches in `supabase/functions/`), `scans`/`feature_sets`/`readings`/
    `subject_profiles` are **all 0 rows**, and the extraction prompt is **palm-only** (verified: it
    emits `is_hand:false` for a non-hand and carries **zero 面相 taxonomy**, yet is passed as the
    system instruction for `kind:'face'`). H1's cost is a real per-scan cost **multiplied by zero
    scans**. Paying in trust-critical surface to fix a leak in a pipe with no water is the definition
    of over-engineering — which is exactly what the user asked to avoid.
  - 🔴 **H1 is MIS-STATED by the audit, and the correction is the real deliverable.** It is not
    "faces lack a geometry signature". It is: **`deriveGeometry` reads the wrong source.**
    `features.line_geometry` is the model's **rendering** polyline; the identity signature belongs in
    **`feature_sets.geometry`**, which the spec describes as **on-device capture-time landmark
    ratios matched BEFORE any model call (§6.6.3)** — the audit's own **M1** already calls the
    current vote-A-derived approach a known deferral needing "P4 capture geometry". **So A builds more
    of an architecture the spec has already superseded.**
  - ⚠️ **The honest caveat that makes D correct rather than lazy** (the skeptics refuted the
    comfortable version): **"defer to H4c" is defer-to-nothing** — H4c unblocks paid Gemini, which has
    no causal relationship to `deriveGeometry` reading the wrong column. And **P4 as currently scoped
    does not save faces either**: P4.T3 (the only task producing landmark geometry) is scoped to
    hands, P4.T5's face variant reuses T2/T4's verify rather than T3's, and there is **no transport**
    (`capture_meta` carries landmark *quality*, not ratios). **The on-device face path is not on the
    roadmap at all.** Two tasks must be filed for D to be honest — see the STATE hand-off. **D-01
    forbids this ledger from editing `MVP_Buildplan.md`, so they are reported, not written.**
  - 🚧 **THE CONSTRAINT THIS DECISION RESTS ON: no face scan may reach a user before the on-device
    face-landmark path lands.** If that constraint is ever broken, revisit — but the answer still is
    not B; it is re-sequencing the device work.
  - ❌ **One panel recommendation REJECTED after checking it myself:** the synthesis called
    `worker-scan`'s `exists_unmatched` path a separate bug ("the canonical stays pinned to the user's
    first-ever scan forever") and wanted the canonical updated. **That is wrong — pinning is what
    "canonical" MEANS.** §6.6.4 reuses the canonical feature-set precisely so repeat scans do not
    drift; updating it per scan would *cause* the drift P1 forbids. The incoherence it describes (two
    readings for one face while the profile points at scan #1) is a **symptom of H1**, downstream of
    it, and disappears when matching works. No code change.
  - Verify: no code was written, so the suites are untouched — **Node 114/114, Deno 140/140** still
    stand from B8. The bug remains provable on demand via the execution snippet above.
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

- [x] **B10 — Chat: history ordering + persisted citations** *(H5, M12b)* — **2026-07-17**
  - **DONE: H5 CONFIRMED (+ ERRATA confirmed) · M12b CONFIRMED.** Landed as
    `supabase/migrations/20260717000024_h5_chat_ordering_m12b_citations.sql` + `chat-send/index.ts`
    (counter re-read: max was 23).
  - **H5 CONFIRMED** — `chat-send/index.ts:96` read `.order('created_at', {ascending:true}).limit(8)`
    → the **eight OLDEST** turns; any thread past 8 messages conversed against its first 8 forever,
    never seeing what the user just said. **ERRATA confirmed:** `chat.ts:149`'s `slice(-8)` is a
    genuine **no-op** (the list is already ≤8), so the order clause was the whole bug.
  - 🔑 **The audit's fix ("order descending + limit + reverse") is NOT sufficient on its own — and
    this is the real find.** Ordering by `created_at` **cannot order a turn at all**:
    - `created_at` defaults to `now()` = `transaction_timestamp()` — **constant within a
      transaction** (proven on staging: `select now() = now()` → **true**);
    - `chat-send` inserts the **user AND assistant rows of a turn in ONE statement**, so they get an
      **identical `created_at`**;
    - `id` is `gen_random_uuid()` — **random**, so it cannot break the tie.
    Their relative order is therefore **undefined**, and "most recent 8" could hand the model
    **[assistant, user]** — a corrupted turn. Flipping to `descending` would have inherited this.
    Fixed with a monotonic `seq bigint generated by default as identity` + index
    `(thread_id, seq desc)`; the handler now orders on `seq`. Safe: `chat_messages`/`chat_threads`
    are **0 rows** (verified), so nothing to backfill and no existing order to invent. (D-16.)
  - **M12b CONFIRMED** — `grep -ric citation supabase/migrations/` → **0 hits**. Citations were
    returned in the HTTP body only; the insert never wrote them and the reload selected only
    `role, content`, so a reloaded thread silently lost the "cites your…" trust line and a grounded
    answer became indistinguishable from an ungrounded guess. Added additive `citations jsonb`;
    `chat-send` now persists them on the assistant turn. (The client half is P6 wiring, out of scope.)
  - Verify (observed): `deno check chat-send/index.ts` → clean; `chat.test.mjs` **6/6**;
    `_shared/chat.test.ts` **13/13**; full **Deno 141/141**; full **Node 117/117**
    (`# pass 117 / # fail 0`, 267.8s).
  - Regression tests added (4): **Node** — 10 turns → the new query returns `m3..m10` chronologically
    **and the OLD query provably cannot see `m10`** (H5 demonstrated, not just asserted); both rows of
    a turn **do** share `created_at` while `seq` is monotonic and recovers question-then-answer;
    citations survive a reload and are owner-readable. **Deno** — `buildChatRequest` keeps the tail
    when handed 12 turns (pins the shared module's half; it did **not** save us from H5, and the test
    says so).
  - Note recorded, not fixed: chat deflection regexes are **English-only** — the audit agrees this is
    acceptable for an EN launch. Revisit at localization.
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

- [x] **B11 — Compat surface: free-tier gate atomicity + display_name injection** *(M8, M9)* — **2026-07-17**
  - **DONE: M8 CONFIRMED (both limbs) · M9 CONFIRMED.** Landed as
    `supabase/migrations/20260717000025_m8_compat_free_gate_atomic.sql` + `compat-request/index.ts` +
    `_shared/compat-narrative.ts` (counter re-read: max was 24).
  - **M8 CONFIRMED — and the window could not be closed where the audit implies.** `:23-29` counted
    in one PostgREST transaction and `:32` acted in another; no lock survives between two HTTP
    round-trips, so two parallel first requests both read zero and both went free. **The check had to
    move inside `request_compat`**, which is the only place it shares a transaction with the insert.
    Now: `perform 1 from public.profiles where id = p_requester for update` serializes the user's
    concurrent requests, then the count and the act happen together.
  - 🎯 **The interpolation limb fixed itself by deletion.** Moving the gate into SQL **removed** the
    `.or(\`user_a.eq.${'${ctx.userId}'},…\`)` string-interpolated filter entirely — there is no longer
    a template-built filter to worry about. `isUuid(ctx.userId)` is asserted anyway, as the ledger
    asked: the sub now reaches SQL as a typed uuid param (not an injection vector), but a gate should
    not rest on `verify_jwt` alone for the shape of its subject.
  - **Shape chosen: a 3-arg OVERLOAD, and `p_has_premium` is passed in rather than recomputed (D-17).**
    Arity differs, so it is unambiguous beside the existing 2-arg function — a 3rd arg *with a
    default* would have made the 2-arg call ambiguous ("function is not unique") and **broken it**.
    Premium is passed because `entitlement.ts`'s `isPremiumRow` is the single definition of that rule
    and **B15 is about to change its `expires_at: null` semantics** — duplicating it in SQL now would
    have created a second place to update and handed B15 a drift bug. The flag cannot be forged: the
    caller is an Edge Function with the service key reading `subscriptions` itself, and
    `request_compat` is service_role-only.
  - **M9 CONFIRMED + FIXED at the boundary.** `worker-compat` reads `profiles.display_name` raw and
    passes it to `generateCompatNarrative` → the model → prose **shown to the other person in the
    pair**. Sanitizing now happens inside `buildCompatRequest` (the one place every caller must pass
    through) rather than at the call site. **Unicode-aware by necessity, not politeness:** this
    product's users are largely CJK-named, so an ASCII allowlist would itself be a bug — instead
    strip only what is meaningless in a name but meaningful in a prompt (control/format chars:
    newlines, which let a "name" open a fresh instruction line, and bidi overrides; plus
    `<>{}[]`\|` framing), collapse whitespace, cap at 40.
  - Verify (observed): `deno check compat-request/index.ts _shared/compat-narrative.ts
    worker-compat/index.ts` → clean; `compat_lifecycle + worker_compat` **8/8**;
    `_shared/compat-narrative.test.ts` **5/5**; full **Deno 143/143** (+2); full **Node 119/119**
    (`# pass 119 / # fail 0`, 287.1s).
  - Regression tests added (4): **Node** — the free tier grants exactly one comparison, the
    already-owned pair is **never re-charged** (idempotent, gated *after* the early-return), premium
    is unlimited; plus a **structural pin** that the `for update` lock and the `payment_required`
    gate live inside the function. **Deno** — the **injection fixture** the Verify asked for: a
    newline-bearing "IGNORE ALL PREVIOUS INSTRUCTIONS" name is neutralized, while `美玲`,
    `Mei-Ling O'Brien` and a bidi-override name are handled correctly; and `buildCompatRequest` proves
    the raw hostile string never reaches the payload while a legitimate CJK name still does.
  - ⚠️ **Honest limit:** the concurrency test is a **structural pin**, not an observed race — the
    fixture lives in an uncommitted, always-rolled-back transaction, so a second connection cannot see
    it to race for it (same constraint as B1's H3 test). It catches a regression that drops the lock;
    it does not watch two claimants serialize.
  - Recorded, not fixed (the audit agrees): chat deflection regexes are **English-only** —
    acceptable for an EN launch; revisit at localization.
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

- [x] **B12 — Invite surface: context validation + clicked-attribution accuracy** *(M6, M7)* — **2026-07-17**
  - **DONE: M6 CONFIRMED · M7 PARTLY CONFIRMED (the ledger's read was right; one audit limb is a
    FALSE POSITIVE).** No migration — all four changes are in `_shared/invite.ts`,
    `_shared/invite-page.ts`, `invite-create/index.ts`, `invite-page/index.ts`.
  - **M6 CONFIRMED** — `invite-create:31` persisted `body.context ?? {}` verbatim; nothing else
    constrains it (`schema.sql:120` is `context jsonb not null default '{}'` with the intended shape
    only in a *comment*). `invite-page` then renders it on the **trusted domain** as the headline
    name and the OG image. Fixed at the **write**, not the read: `sanitizeInviteContext` keeps only
    `{inviter_name, reading_id, card_variant, card_image_url}`, caps the name at 40, validates the
    uuid/variant, and requires the OG image to be **https on our own origins** (`palmly.app` or the
    `SUPABASE_URL` host — derived from env so it follows staging/prod without a code edit).
    **Drops rather than throws** (D-18): the payload is cosmetic, so failing an invite over a client
    bug would break the growth loop, while an attacker's value simply never reaches the page.
  - **M7 — the ledger's ERRATA-style read is CONFIRMED: `invite-page:47-48` was already a correct
    compare-and-set** (`.eq('status','created')` makes it idempotent and non-regressing), so the fix
    is purely the UA gate. Added `isLinkPreviewBot`: every messenger fetches a shared link to build
    its preview, so the **first hit on nearly every invite is a crawler** — crediting it made
    `clicked` measure *"was this link shared into a chat app"*, not *"did a person tap it"*, which is
    the number the growth loop is steered by. Bots still get the page (that is what the OG tags are
    **for**); they just do not move the funnel.
  - 🔴 **M7's caching limb is a FALSE POSITIVE as stated — but fixing the bot filter FORCED a caching
    change anyway, for a different and worse reason (D-19).** The audit says 5-min CDN caching
    "undercounts real repeat clicks". It cannot: `created→clicked` is a **one-way transition**, so
    repeat clicks are never counted by design, cached or not. **The real problem only appears once
    bots stop flipping the status:** a crawler's request would prime the cache, and the real person's
    click seconds later would be served from it — never reaching the function, never counted. So the
    bot filter and `max-age=300` are incompatible. Also found while there: the response is
    **UA-routed** (App Store / Play / web CTA) with **no `Vary`**, so a shared cache could hand an
    Android user the iOS store link — an unreported bug. Now `Cache-Control: no-store` +
    `Vary: User-Agent`. Crawlers fetch a given invite once, so nothing here was worth caching.
  - Verify (observed): `deno check invite-create/index.ts invite-page/index.ts _shared/invite.ts
    _shared/invite-page.ts` → clean; `_shared/invite.test.ts + _shared/invite-page.test.ts` **17/17**;
    `invite_create + invite_page` (Node) **7/7**; full **Deno 147/147** (+4); full **Node 119/119**
    (`# pass 119 / # fail 0`, 266.6s).
  - Regression tests added (4): the OG-image allowlist rejects attacker-hosted images, plaintext http
    **on our own host**, and the `palmly.app.evil.example` **suffix-confusion** host; the context
    allowlist drops unknown keys (`is_admin`, `evil`) and invalid values while capping the name; the
    bot list covers 11 real crawler UAs; and — the one that protects revenue — **four real browser
    UAs must still count, including WeChat's `MicroMessenger` in-app browser**, since a false positive
    silently eats a genuine click from a large share of this product's audience.
  - 🐛 **Test bug caught by the suite, not the code:** my first bidi assertion expected `A‮B` → `AB`.
    The code is right and the test was wrong — a format char becomes a **space**, not nothing,
    because deleting it would let a zero-width joiner silently fuse two tokens into one (exactly the
    trick it would be used for). Assertion corrected to `A B`.
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

- [x] **B13 — H9: manual short-code claim path + rate limiting** *(H9)* — **2026-07-17**
  - **DONE: H9 CONFIRMED (both limbs).** Landed as
    `supabase/migrations/20260717000026_h9_short_code_and_rate_limits.sql` + `_shared/ratelimit.ts` +
    `_shared/invite.ts` + `invite-claim` + `invite-create` + `chat-send` + `compat-request` +
    `cleanup` (counter re-read: max was 25).
  - **H9 CONFIRMED** — `deriveShortCode` was printed on the teaser (`invite-page/index.ts:81`) and its
    own docstring said *"manual claim matches invites where token_hash starts with it"*, but
    **nothing resolved it**: `invite-claim:33` only hashed the full 43-char token. The spec's "always
    present, guarantees the loop closes" fallback terminated in UI text, exactly as the audit says.
    Spec §13's required rate limiting did not exist anywhere (`rate%` tables live: **0**).
  - 🔐 **THE POSTURE DECISION (D-20, delegated to the loop) — the short code is WIDENED 6 → 10 hex,
    and that is the load-bearing half of the fix.** The audit frames H9's risk as "collision +
    brute-force implications … that is exactly why the spec pairs it with rate limiting". **Rate
    limiting alone is not enough, and the arithmetic is why:** a prefix match hits **ANY** live
    invite, so a guesser's odds are `N / 2^bits`, *not* 1-in-the-code-space. At the original 6 hex
    (**24 bits = 16.7M**) with 100k live invites that is **~1 in 167 guesses** to hijack a stranger's
    invite — and a hit **burns** it (claims are single-use), locking the real recipient out. No
    per-user limit survives that: an attacker just makes more accounts. **10 hex = 40 bits = 1.1e12**
    → ~1 in 1.1M at a *million* live invites. **Free to change:** the code is **derived, never
    stored** (recomputed from `token_hash` on every render), and `invites` has **1 row**.
  - Build: `resolve_invite_code(text)` — normalizes what a human types (any case, with/without the
    separator or spaces), resolves **only claimable** invites (`created|clicked|installed`, unexpired
    — correct *and* it shrinks the live target pool), and **refuses an ambiguous prefix rather than
    guessing** between two people's invites. Backed by an `invites (token_hash text_pattern_ops)`
    index — the default opclass is collation-aware and **cannot** serve a prefix `LIKE`.
  - Rate limiting: counters live in **Postgres, not in the process** — Edge Functions are stateless
    and horizontally scaled, so an in-memory counter counts one instance and nothing else.
    `check_rate_limit` **increments and compares in a single atomic statement** (the M8 lesson: a
    count in one round-trip and a decision in another is not a limit). Limits are tuned to the
    **threat, not a uniform number**: `invite_claim_code` **5/h** (the brute-force surface),
    `invite_claim_token` 30/h (a 256-bit token is unguessable — the limit is anti-abuse only),
    `invite_create` 30/h, `chat_send` 60/h, `compat_request` 30/h. **Fails OPEN and logs** if the
    counter errors: this is a mitigation layered over real controls (the token, the code's entropy,
    the entitlement gate), never the thing that makes them safe. `sweep_rate_limits()` is wired into
    the existing `cleanup` sweep so spent windows cannot accumulate forever.
  - Verify (observed): `git grep -n "deriveShortCode\|resolve_invite_code" -- supabase/functions` →
    shows a **resolver** (`invite-claim/index.ts:48`), not just invite.ts/invite-page.ts ✅;
    **a brute-force attempt IS throttled** — 50 guesses in one hour yield exactly **5** attempts (the
    other 45 refused); `deno check` clean on all 6 changed functions; `rate_limit.test.mjs` **5/5**;
    full **Deno 148/148**; full **Node 124/124** (`# pass 124 / # fail 0`, 262.8s).
  - Regression tests added (7): the limit allows exactly `limit` then refuses, and is **per (scope,
    subject)** so one abuser cannot throttle everyone; a structural pin that the counter is the
    `returning` of the upsert itself (no read-then-write race); the brute-force throttle; the resolver
    accepts all four shapes a human might type; **the OLD 6-hex code is now explicitly `code_too_short`**;
    unclaimable/expired invites do not resolve; an **ambiguous prefix is refused**; and the entropy
    itself is asserted (`SHORT_CODE_HEX * 4 === 40`) so shrinking it reads as the security regression
    it would be.
  - 🐛 **The suite caught my own change, twice — both were the tests doing their job.**
    (1) `invite-page.test.ts:93` pinned the **old 6-hex contract** (`'A1B-2C3'`) — i.e. it was
    asserting the insecure length; updated to `'A1B2C-3DEAD'`. (2) `schema.test.mjs`'s table census
    ("nothing extra") went 20 → 21 when `rate_limits` landed; added to the list.
  - **Scope held:** H9's fix overlaps §NOT YET BUILT (B.6 + B.7), and only the **finding** was built —
    the resolver + the four §13 limits. No teaser story (H6-gated), no CAPTCHA, no per-IP limiting.
  - ⚠️ **Residual, stated plainly:** limiting is **per-user**, and anonymous sign-in is cheap
    (30/h/IP), so a determined attacker with many accounts still gets more attempts than one. That is
    survivable **only because the entropy carries the real weight** (D-20) — which is precisely why
    the code was widened rather than merely throttled. Per-IP limiting and Turnstile are §NOT YET
    BUILT B.8's, not this ledger's.
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

- [~] **B14 — C3: verify the RevenueCat webhook signature scheme against current RC docs** *(C3)* — **2026-07-17** — docs-verified decision landed; `[~]` **by design** (the live proof is H8-gated).
  - 🟢 **DONE: C3 is a FALSE POSITIVE. The scheme is RIGHT.** No code change — the implementation
    matches RevenueCat's current documented wire format point for point.
  - **The audit says:** *"RevenueCat's shipped webhook auth is a **static `Authorization` header
    value** configured in the dashboard — not a t/v1 HMAC scheme … If RC doesn't send this exact
    header, every webhook 401s → `subscriptions` never updates → chat/compat server gates permanently
    402 paying customers. Highest-blast-radius single item in the codebase."* §6 also ranks C3 the
    **#1 risk**. **It is wrong.**
  - **Docs verified 2026-07-17** — <https://www.revenuecat.com/docs/integrations/webhooks>, which has
    a section titled **"Webhook Signature Verification (HMAC)"**:
    | RevenueCat's docs | `_shared/revenuecat.ts` |
    |---|---|
    | `X-RevenueCat-Webhook-Signature: t=<unix_timestamp>,v1=<hmac_sha256_hex>` | parses `t` + `v1` off that exact header (`:46-53`) |
    | HMAC-SHA256 over `"<timestamp>.<raw_json_body>"` | `hmacSha256Hex(secret, \`${t}.${rawBody}\`)` (`:57`) |
    | "the **raw request body bytes, exactly as received** — before any JSON parsing" | `await req.text()` **before** `JSON.parse` (`revenuecat-webhook/index.ts`) |
    | constant-time comparison | `constantTimeEqual` (`:58`) |
    | "optionally reject … (e.g. 5 minutes)" | `toleranceSec = 300` (`:43`) |
    RC offers **both** an optional `Authorization` header **and** optional HMAC signing. The audit saw
    the first and concluded the second does not exist.
  - 🔬 **Methodology note — I nearly got fooled the way the audit did.** My first `WebFetch` prompt
    *named* the `t=…,v1=…` format while asking whether it existed; a small summarizer echoing my own
    hypothesis back is not evidence. Re-asked with a **neutral** prompt that described no format at
    all (same answer, incl. the section title), then corroborated via an independent **WebSearch**
    retrieval path. Three sources agree.
  - 🪤 **The trap, escaped by construction.** The ledger warns that `rcSignature` makes a
    sign-with-ours/verify-with-ours test **trivially green regardless of the scheme**. So the new
    tests use an **INDEPENDENT ORACLE**: a vector computed by `node:crypto`'s `createHmac` (a
    different implementation from our WebCrypto helper) straight from RC's documented format, with
    the hex **hardcoded**. Our verifier accepts bytes it did not generate. Nothing in that test is
    produced by the code under test.
  - Verify (observed): `_shared/revenuecat.test.ts` **10/10**; full **Deno 151/151** (+3); full
    **Node 124/124** (`# pass 124 / # fail 0`, 264.4s). **Explicitly NOT a live green** — no RC
    account exists (H8), and `REVENUECAT_WEBHOOK_SECRET` is unset on staging.
  - Regression tests added (3): our verifier accepts an **independently computed** signature; our
    `rcSignature` **reproduces `node:crypto` exactly** (so the helper and verifier cannot drift into
    agreeing with each other on a wrong format); and the concatenation is **order-sensitive** —
    a signature over `"<body>.<t>"` is rejected, because that is the mistake that would silently 401
    every paying customer.
  - 🧑 **THE REAL RESIDUAL — a CONFIGURATION dependency, not a code defect, and the audit's framing
    would have hidden it (D-21).** RC's HMAC signing is **opt-in**: you toggle it per-integration and
    the signing secret is **shown exactly once, at creation or rotation, and can never be retrieved
    again**. Our handler **requires** the signature (`missing_signature` → 401) and 500s if
    `REVENUECAT_WEBHOOK_SECRET` is unset. So the audit's feared outcome — every webhook rejected,
    paying customers permanently 402'd — **is reachable, but via the dashboard, not the code.**
    **H8 setup, exactly:**
    1. In the RC dashboard, open the webhook integration and **toggle HMAC webhook signing ON**.
    2. **Copy the signing secret immediately** — it is displayed once and is unrecoverable; rotating
       is the only recovery.
    3. Set it as `REVENUECAT_WEBHOOK_SECRET` on the Edge Functions (never in git — `docs/ENVIRONMENT.md`).
    4. Send a test event and confirm **200 + `applied: true`**, then confirm the `subscriptions` row.
       Note RC treats **anything other than 200 as failure** and retries 5× (5/10/20/40/80 min) before
       **giving up permanently** — so a wrong secret silently burns the retry budget within ~2.6h.
  - **Not built, deliberately:** support for RC's optional `Authorization` header. Accepting *either*
    mechanism would turn two independent controls into an OR and **weaken** the surface; HMAC is
    strictly stronger and is what the code already implements correctly.
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

- [x] **B15 — H4 residue: rc_event_id NOT NULL · TRANSFER · expires_at:null** *(H4 residue, Low: entitlement expires_at)* — **2026-07-17**
  - **DONE: NOT NULL CONFIRMED+fixed · TRANSFER CONFIRMED and WORSE than stated · ordering guard now
    BUILT (D-05 discharged) · expires_at:null = DECISION (working as intended).** Landed as
    `supabase/migrations/20260717000027_h4_residue_notnull_transfer_ordering.sql` +
    `_shared/revenuecat.ts` + `revenuecat-webhook/index.ts` (counter re-read: max was 26).
  - **(1) `rc_event_id` NOT NULL — CONFIRMED, contracted.** Live: `is_nullable = YES`, and **0 rows /
    0 nulls**, so the backfill was a verified no-op rather than an assumed one (it is still written to
    run, using the same `md5:` surrogate rule `record_rc_event` already applies). B1 shipped the
    expand half; this is the contraction, which is exactly why it needed its own task.
  - **(2) TRANSFER — CONFIRMED, and the audit UNDERSTATES it.** The audit says TRANSFER "grants the
    destination without revoking the source". **We grant NOBODY.** RC's docs (verified 2026-07-17,
    `/docs/integrations/webhooks/event-types-and-fields`, corroborated via a second search path):
    a TRANSFER carries `transferred_from` / `transferred_to` — **App User ID ARRAYS** — and **no
    `app_user_id`**. The webhook's `isUuid(event.app_user_id) ? … : null` therefore resolved to
    **null**, so `record_rc_event` logged the event and applied nothing: the destination never got
    what they paid for, *and* the source kept premium.
    The source is the harder half: *"The webhook is sent only for the destination user, although the
    event appears in both customer histories."* — **RC will never send us an event about the source**,
    so the TRANSFER is the only moment it can be revoked (D-22). Now: destination resolved from
    `transferred_to`, each `transferred_from` revoked via the new `revoke_rc_entitlement`. Both arrays
    are filtered through `isUuid` — they can contain RC's `$RCAnonymousID:…`, which is nobody we can gate.
  - **(3) Ordering guard — BUILT here, and D-05 is discharged.** B1 deferred it because
    `latest_event_at = now()` is **processing** time (monotonic by construction → any guard would be
    decorative) and `RcEvent` had **no timestamp field**. B14 settled the payload: RC sends
    **`event_timestamp_ms`**. It rides inside `p_payload`, so **no signature change was needed**.
    `latest_event_at` now records the EVENT's time, and the upsert carries
    `where subscriptions.latest_event_at <= excluded.latest_event_at` — a delayed RENEWAL can no
    longer resurrect a lapsed subscription. Falls back to `now()` when absent (degrades to the old
    behaviour rather than dropping the event).
  - **(4) `expires_at: null` → premium-forever — DECISION: working as intended, no change (D-23).**
  - Verify (observed): `deno check revenuecat-webhook/index.ts _shared/revenuecat.ts` → clean;
    `revenuecat_webhook.test.mjs` **8/8**; `_shared/revenuecat.test.ts` **11/11**; full **Deno
    152/152** (+1); full **Node 127/127** (`# pass 127 / # fail 0`, 271.6s).
  - Regression tests added (4): a null `rc_event_id` is now rejected **by the database itself**; the
    **ordering guard** — a newer EXPIRATION lands, then a *delayed* RENEWAL from before it must NOT
    resurrect the subscription, and `latest_event_at` holds the **event** time (vectors computed with
    `Date.UTC`, not by the code under test), while a genuinely newer event still applies;
    `revoke_rc_entitlement` expires the source, keeps the row as the audit trail, and reports false
    for a stranger; `transferParties` resolves both arrays and **filters RC anonymous ids**.
  - 🐛 **Two of my own regressions, both caught by the suites:** the NOT NULL broke
    `data_lifecycle.test.mjs`'s `populate()` fixture, which was inserting a `subscription_events` row
    with no id — the constraint doing its job (real writers always supply one); and a test bound `$1`
    to both a `uuid` and a `text` column (`42P08 inconsistent types deduced`), fixed with explicit
    casts.
  - ⚠️ **Honest limit:** the TRANSFER wiring in the handler (resolve destination → record → revoke
    sources) is covered by `deno check` + the unit tests of its parts, not end-to-end — the same
    handler-test gap as B5/B6/B8, and **B21**'s to close. The live proof is **H8**-gated (D-21).
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

- [x] **B16 — M12(c): callable image-deletion path** *(M12c)* — **2026-07-17**
  - **DONE: M12c CONFIRMED.** Landed as `supabase/migrations/20260717000028_m12c_image_paths_collect.sql`
    + `supabase/functions/image-delete/index.ts` + `config.toml` (counter re-read: max was 27).
  - **CONFIRMED exactly as written:** `git grep request_image_deletion -- supabase/functions` → **ZERO
    callers**, while every sibling IS wired (`account-delete` → `purge_account`; `cleanup` →
    `crops_due_for_deletion`/`mark_crop_deleted`). The SQL author even anticipated the wrapper
    (`0016:40-41` — "returns the paths for the Edge Function to purge from storage") and it was never
    written, so PrivacyCenter's "Delete my scan photos now" targeted a function no client could reach.
  - **Reused B4's invariant rather than re-implementing it**, as the ledger demanded: `image-delete`
    **imports `purgeAccountStorageFirst`** — the four deps map exactly onto collect → delete objects →
    purge rows → log completion last. That is why B4 built it injectable.
  - 🔑 **Why the new read-only collect had to exist (the non-obvious part):**
    `request_image_deletion` returns the paths **and nulls `storage_path` in the same call**, so using
    it to discover what to delete would destroy the only reference to the blobs **before** the Storage
    API is touched — the exact H7 ordering bug B4 fixed for account-delete. `image_paths_for_deletion`
    is `stable`, mutates nothing, and carries a predicate **deliberately identical** to
    `request_image_deletion`'s (`0021:84-87`): if the two ever drift, image-delete would remove one set
    of blobs and null a different set of rows. **A test pins that they agree.**
  - Scope: scans bucket only — a share card is content the user chose to publish, not a photo of them.
    `verify_jwt = true` (user-mode: the JWT is what decides **whose** photos are deleted) — the ledger's
    standing warning that `verify_jwt` is security-load-bearing applies directly here.
  - Verify (observed): `deno check image-delete/index.ts` → clean; `data_lifecycle.test.mjs` **13/13**;
    full **Deno 152/152**; full **Node 130/130** (`# pass 130 / # fail 0`, 274.5s).
  - Regression tests added (3, +1 widened): the collect returns only live crops **and provably mutates
    nothing** (3 paths still present, 0 deletion_log rows — the whole reason it exists); **collect and
    purge see the same crops** (drift here deletes the wrong things); the D2 audit row stays
    `completed_at` NULL until `mark_deletion_complete`, and the **reading survives while the photo
    goes**. The service-role-only posture test now also covers `image_paths_for_deletion`,
    `mark_deletion_complete` and `account_storage_paths`.
  - 🧑 **The deploy + live-curl legs of Verify are NOT doable by this loop, and are not being faked
    (D-24).** There is **no `SUPABASE_ACCESS_TOKEN`** on this machine or in `.env.staging`, and the
    repo deploys via `.github/workflows/deploy.yml` on merge to main, gated by the `staging-deploy`
    environment — whose secrets are the **H3/H4b-2 human gate** (audit §NOT YET BUILT F.18). Confirmed
    live: `list_edge_functions` shows the 17 deployed functions and **not** `image-delete`. This is
    true of **every** function change in this ledger (B4, B7, B8, B11, B12, B13, B15, B16) — they are
    code-complete, typechecked and committed; deployment is CI's step, and the posture curl belongs
    there. **Until then M12c's button still has no live path** — the code exists, the deploy does not.
  - Note: the **app-side** half (`PrivacyCenter.tsx:25-27` is an empty stub) is **P6 wiring scope**, as
    the ledger says — this task delivers the callable server path only. The client calls
    `POST /functions/v1/image-delete` with the user's JWT and no body.
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

- [x] **B17 — M12(a): decide the locked-section teaser contract** *(M12a)* — **2026-07-17**
  - **DONE: M12a CONFIRMED on every limb — and the ledger's own hunch was right: the correct answer
    IS "delete the client field" (D-25).** No migration, no schema change. Changed:
    `app/src/features/reading/reveal.ts` + `RevealView.tsx`.
  - **CONFIRMED:** `reading_sections.v1.json` is `additionalProperties: false` with
    `required: [key,title,body,depth_level,tags,feature_refs]`, and its own description says **"only
    `headline`, `title`, `body` are model-authored"** — everything else is code-derived. Meanwhile
    `reveal.ts:12` declared `teaser?: string` and `RevealView.tsx:299` rendered it, fed **only** by
    the `PREVIEW_*` fixtures. And the block is dead twice over: `filterDepth` (`narrative.ts:273`) +
    `worker-narrative`'s `depthLevel = 1` mean depth-2 sections are **never generated or stored**, so
    `lockedSections()` returns `[]` against all real data.
  - 🔑 **The decisive fact the audit missed: there is nothing to truncate.** Depth-2 prose is
    generated **only ON UNLOCK** (§NOT YET BUILT C.12), so before purchase the locked prose **does
    not exist**. "Code-derived truncation" — the ledger's own suggested preference — has no source
    text to truncate from. Any field that could only ever be filled by premium prose is an
    **invitation to ship the very leak the finding warns about**.
  - **Decided (D-25): delete `teaser`; do NOT add it to the schema.** The locked card already
    null-guarded it, so removal degrades gracefully — it still shows lock icon + **real title** +
    "Unlock with Premium". And the title is the honest tease: it is code-derived from the
    deterministic claim skeleton, so it says *"you have a Fate Line chapter"* without generating —
    or leaking — a word of premium prose, and without a model call.
  - 🔬 **Refines the audit's mechanism (worth knowing):** it says Ajv is what stops a teaser reaching
    the client. Reading the code, the **first** line of defence is stronger: `graft`
    (`narrative.ts:247-262`) **rebuilds every section from the deterministic skeleton** and takes only
    `title`/`body` from the model — an **allowlist by construction**, so a model-invented field is
    dropped before Ajv ever sees it. Ajv's `additionalProperties:false` guards the second case: **our
    own code** adding a field. Both are now pinned by tests.
  - Verify (observed — every leg, run literally, including the two NOT in CI):
    `node kb/audit.mjs` → **`required=141 chunks=141` / `P5T4_OK`** · `node prompts/build-prompts.mjs
    --check` → **`PROMPTS_OK`** · `cd eval && npm run p5t1` → **`P5T1_OK`** · `cd app && npm run
    typecheck` → clean, `npm run lint` → clean, `npx jest --ci` → **39/39 (8 suites)** · full **Deno
    154/154** (+2) · full **Node 130/130**.
  - ⚠️ **App-green is NOT evidence here, exactly as the ledger warns** — all 39 app tests assert
    against the `PREVIEW_*` fixtures, so the suite structurally cannot catch M12. What IS evidence:
    (1) **`tsc --noEmit` passes with the field deleted**, which proves no code path still reads it and
    no fixture still supplies it — a real check, since a leftover reference would fail the build;
    (2) the two new **server-side** tests below, which verify the real payload shape rather than the
    fixtures. (`@testing-library/react-native` is not installed, so no render test could be added
    without a new dep — unchanged, and not worth one for a branch being deleted.)
  - Regression tests added (2, Deno): **a model that emits `teaser` → the narrative still validates
    but NO stored section carries the field** (proves graft's allowlist against the real pipeline);
    and **the real schema file, compiled with Ajv, rejects a teaser-bearing section** while accepting
    the legitimate shape — so re-adding it server-side **cannot be quiet**. That second test is the
    one that stops M12a being "fixed" the wrong way later.
  - **Scope note:** this touches the app, which SCOPE normally excludes — but M12a **is** a contract
    finding, the ledger's Build says "across schema + narrative + app", and the change is the removal
    of a **contract lie** (a declared field the server can never send), not a fix to a fixture-driven
    screen.
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

- B17 — **no migration, no schema change: the fix was DELETING the client field** (D-25). `reveal.ts` + `RevealView.tsx`: `teaser?: string` removed (it was fed only by `PREVIEW_*` fixtures and rendered by a branch that is dead twice over — `filterDepth` + `depthLevel=1` mean `lockedSections()` returns `[]` on real data). **The decisive fact the audit missed: there is nothing to truncate** — depth-2 prose is generated only ON UNLOCK (C.12), so filling a teaser would mean generating premium prose the user has not bought and shipping it behind a CSS blur, i.e. M12a's own suggestion produces M12a's leak. The title IS the tease (code-derived from the claim skeleton, zero tokens, zero leak). **Refines the audit:** Ajv is the *second* line of defence — `graft` (narrative.ts:247-262) rebuilds sections from the skeleton and is an allowlist by construction, so a model-invented field never reaches the validator. Evidence (all Verify legs, incl. the 2 NOT in CI): `kb/audit.mjs` → **required=141 chunks=141 / P5T4_OK**; `build-prompts --check` → **PROMPTS_OK**; `eval p5t1` → **P5T1_OK**; app typecheck+lint clean, `jest --ci` **39/39**; Deno `154 passed | 0 failed` (+2); Node `# pass 130 / # fail 0`. +2 tests (graft drops a model teaser; the real schema rejects one) — 2026-07-17
- B16 — migration `20260717000028_m12c_image_paths_collect.sql` applied + new `supabase/functions/image-delete/index.ts` + `config.toml` (`verify_jwt = true`): M12c CONFIRMED (**zero callers** of `request_image_deletion` while every sibling was wired). The Edge fn **imports `purgeAccountStorageFirst`** rather than re-implementing B4's ordering. New read-only `image_paths_for_deletion` exists because `request_image_deletion` returns the paths AND nulls them in one call — using it to collect would destroy the reference before the blob is gone (the H7 bug); its predicate is identical to that function's, **pinned by a test**. Evidence: `deno check` clean; `data_lifecycle` 13/13; Deno `152 passed | 0 failed`; Node `# pass 130 / # fail 0` (274494.1ms). +3 tests, +1 widened. 🧑 **Deploy + live curl NOT doable — no SUPABASE_ACCESS_TOKEN; deploy.yml/CI owns it (H3/H4b-2). `list_edge_functions` confirms image-delete is undeployed (D-24)** — 2026-07-17
- B15 — migration `20260717000027_h4_residue_notnull_transfer_ordering.sql` applied + `_shared/revenuecat.ts` + `revenuecat-webhook/index.ts`: **rc_event_id NOT NULL** (contract; live 0 rows/0 nulls, backfill verified no-op), **TRANSFER fixed — and the audit understates it: we granted NOBODY** (RC sends `transferred_from`/`transferred_to` arrays and **no app_user_id**, so `isUuid(app_user_id)` was null → logged, never applied), plus the source is now revoked because **RC never sends an event about it** ("the webhook is sent only for the destination user") — D-22. **Ordering guard BUILT, D-05 discharged:** B14 established RC sends `event_timestamp_ms`, which rides in `p_payload` → no signature change; `latest_event_at` is now the EVENT's time with `where latest_event_at <= excluded.latest_event_at`, so a delayed RENEWAL can't resurrect a lapsed sub. `expires_at:null` = **working as intended (D-23)** — RC documents null as legitimate for lifetime/non-subscription, and failing closed would 402 paying customers. Evidence: `deno check` clean; `revenuecat_webhook` 8/8; `revenuecat.test.ts` 11/11; Deno `152 passed | 0 failed`; Node `# pass 127 / # fail 0` (271576.3ms). +4 tests. Suites caught 2 of my own regressions (a fixture relying on the nullable id; a `$1` bound to both uuid and text) — 2026-07-17
- B14 — **no code change: C3 is a FALSE POSITIVE.** RC's current docs (verified 2026-07-17, <https://www.revenuecat.com/docs/integrations/webhooks>) have a **"Webhook Signature Verification (HMAC)"** section documenting exactly `X-RevenueCat-Webhook-Signature: t=<unix_ts>,v1=<hmac_sha256_hex>` over `"<t>.<raw_json_body>"` + constant-time compare + ~5min replay window — line for line what `_shared/revenuecat.ts` already implements. The audit called this the **#1 risk in the codebase**; rewriting it would have replaced a correct control with a weaker one. Trap escaped by construction: the +3 tests use an **independent oracle** (`node:crypto` vector, hardcoded hex) so nothing under test signs its own homework; one pins that the reversed `"<body>.<t>"` concatenation is **rejected**. **Real residual re-filed as H8 config (D-21):** HMAC signing is opt-in and the secret is shown ONCE — if the toggle is off, RC gives up after 5 retries (~2.6h) and paying customers are permanently 402'd. Evidence: `revenuecat.test.ts` 10/10; Deno `151 passed | 0 failed` (+3); Node `# pass 124 / # fail 0` (264399.6ms). **`[~]` — live proof H8-gated** — 2026-07-17
- B13 — migration `20260717000026_h9_short_code_and_rate_limits.sql` applied + `_shared/ratelimit.ts` + `_shared/invite.ts` + invite-claim/invite-create/chat-send/compat-request/cleanup: H9's resolver (`resolve_invite_code` — normalizes typed input, claimable-only, **refuses ambiguity rather than guessing**, `text_pattern_ops` index) + spec §13 rate limiting (Postgres counters — Edge fns are stateless; **increment+compare in ONE atomic statement**; limits tuned to the threat: code 5/h vs token 30/h; **fails open + logs**; swept by `cleanup`). **The short code is widened 6->10 hex (24->40 bits) — D-20, the load-bearing half:** a prefix match hits ANY live invite, so at 24 bits with 100k invites a guesser wins in **~1 in 167** and *burns* the invite; rate limiting cannot rescue that, entropy can. Free — the code is derived, never stored. Evidence: `git grep` shows a real resolver at `invite-claim:48`; **50 guesses/hour -> exactly 5 allowed**; `deno check` clean x6; `rate_limit.test.mjs` 5/5; Deno `148 passed | 0 failed`; Node `# pass 124 / # fail 0` (262768.3ms). +7 tests. The suite caught 2 of my own regressions (a test pinning the OLD 6-hex length; the 20->21 table census) — 2026-07-17
- B12 — `_shared/invite.ts` (`sanitizeInviteContext`, `isAllowedCardUrl`) + `_shared/invite-page.ts` (`isLinkPreviewBot`) + `invite-create` + `invite-page` (no migration): M6 validated at the **write** — allowlist {inviter_name, reading_id, card_variant, card_image_url}, name capped 40, OG image must be **https on our own origins** (env-derived, follows staging/prod). M7: the compare-and-set was **already correct** (ledger right) — the fix is the UA gate, since the first hit on nearly every invite is a crawler, making `clicked` measure "was this shared into a chat app". **M7's caching limb is a FALSE POSITIVE** (a one-way transition can't undercount repeat clicks) **but caching still had to change (D-19)**: the bot filter would let a crawler prime the cache and swallow the real click, and the page is UA-routed with **no `Vary`** (a cached iOS page → Android user gets the wrong store) → `no-store` + `Vary: User-Agent`. Evidence: `deno check` clean; `invite.test.ts+invite-page.test.ts` 17/17; Node `invite_create+invite_page` 7/7; Deno `147 passed | 0 failed` (+4); Node `# pass 119 / # fail 0` (266595.2ms). +4 tests (incl. WeChat MicroMessenger must still count) — 2026-07-17
- B11 — migration `20260717000025_m8_compat_free_gate_atomic.sql` applied + `compat-request/index.ts` + `_shared/compat-narrative.ts`: M8's count→act moved **inside** `request_compat` (3-arg overload, `for update` on the requester's profile row) — it was unclosable from the Edge fn, since the count and the act were separate PostgREST transactions. **The interpolated `.or()` limb was fixed by deletion** (the filter no longer exists); `isUuid` asserted anyway. Premium passed, not recomputed, so **B15's `expires_at` change stays single-source** (D-17). M9: `sanitizeName` at the model boundary in `buildCompatRequest` — Unicode-aware (CJK names intact; an ASCII allowlist would itself be a bug), strips control/format + framing chars, caps at 40. Evidence: `deno check` clean; `compat_lifecycle+worker_compat` 8/8; `compat-narrative.test.ts` 5/5; Deno `143 passed | 0 failed` (+2); Node `# pass 119 / # fail 0` (287052.6ms). +4 tests incl. the injection fixture — 2026-07-17
- B10 — migration `20260717000024_h5_chat_ordering_m12b_citations.sql` applied + `chat-send/index.ts`: H5 order fix (most-recent-8, reversed) + additive `citations jsonb` (M12b) + monotonic `seq` identity column & `(thread_id, seq desc)` index. **The audit's literal fix was insufficient (D-16)**: `created_at` is `now()` = transaction_timestamp (**proven: `select now()=now()` → true**) and chat-send inserts both rows of a turn in ONE statement → identical timestamps, random uuid pk → a turn's order is **undefined**, so "descending + reverse" could feed the model **[assistant, user]**. ERRATA confirmed: `chat.ts:149` `slice(-8)` is a no-op. Evidence: `deno check` clean; `chat.test.mjs` 6/6; `_shared/chat.test.ts` 13/13; Deno `141 passed | 0 failed`; Node `# pass 117 / # fail 0` (267825.0ms). +4 regression tests (the Node one **demonstrates** the old query cannot see the newest turn) — 2026-07-17
- B9 — **no code, by design.** H1 CONFIRMED by executing the real modules (`distance(faceA,faceA)=Infinity`, `matchSubject`→`null`, palm control `=0`) and closed as **DECISION D-14** after an 11-agent adversarial investigation (unanimous 3/3), every claim re-verified by hand. **The audit's fix is unbuildable** (face schema is 100% enums — no landmarks to make ratios from) and **both alternatives are wrong**: option A would anchor identity in the one field the code documents as unstable (`features.ts:2-3` "exact pixel paths vary"; `consistency.ts:51-52` won't even merge it across votes of the *same image*), would leak past the hardcoded strip-lists (`features.ts:26`, `consistency.ts:68`) into `featureHash`+`sameFeatures` → **a 3rd vote on every face scan, +50% cost forever**, and would flip the posture **closed→open** (a friend's face → `matched` → your reading). Option B is unsound at every threshold (1 enum of 12 = 0.0833). **Decisive**: `scan-create`/`scan-ingest` don't exist, all four tables are 0 rows, and the extraction prompt is palm-only → the cost is real × **zero scans**. Real finding: **`deriveGeometry` reads the wrong source**; identity belongs in `feature_sets.geometry` (on-device ratios, §6.6.3 — M1's known deferral). Hand-off filed in STATE — 2026-07-17
- B8 — `push-dispatch/index.ts` + `_shared/push.ts` (no migration): archive **only** jobs with no retryable ticket (per-job attribution), N+1 devices query → one `.in()` per chunk, loop-until-empty under a 20s budget (inside the 60s vt). **🔴 The ERRATA's own H6 row was WRONG and is struck (D-12)** — `sendExpoPush` **never throws** (`push.ts:80` docstring, `:84-95`), and `:47` only appends to a local array while the real archive is at `:63` *after* the send; the **audit's plainer claim is the right one** and is CONFIRMED. Retry policy taken from Expo's live docs (retryable: MessageRateExceeded/TOO_MANY_REQUESTS/transport; permanent: DeviceNotRegistered/MessageTooBig/MismatchSenderId/InvalidCredentials). **Receipts deferred → cron (D-13); `[~]`.** Evidence: `deno check` clean; Deno `140 passed | 0 failed` (+2); `push_dispatch` 4/4; Node `# pass 114 / # fail 0` (247158.8ms) — 2026-07-17
- B7 — migration `20260717000023_h8_cards_private_by_default.sql` applied + `card-render/{render,index}.ts` + **15MB vendored assets** (3 Noto fonts + OFL LICENSE + `index_bg.wasm`, each verified by **magic bytes** — the first SC URL 404'd and curl wrote a 311KB GitHub error page into a plausible `.otf`). H8: new private `card-drafts` bucket, `publishCard` is the only CDN path, `cards_public_read` dropped (**advisors no longer flag `public_bucket_allows_listing`**), `share_cards.published_at` + unique(user_id,source_id,variant). M4: wasm vendored, `loadFonts` throws instead of `catch {}`. **M4 proven visually**: same card rendered twice — no fonts **35,852 B, headline/chips/domain/attribution ALL MISSING**; with fonts **54,460 B, all present incl. CJK 美玲** (which vindicates D-10). Evidence: `git grep unpkg.com` → **0 hits**; `deno check` clean; Deno `138 passed | 0 failed`; Node `# pass 114 / # fail 0` (247766.4ms). +2 tests, 1 rewritten (the old "cards publicly readable" test encoded the bug) — 2026-07-17
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
| D-25 | 2026-07-17 | **M12(a): the `teaser` field is DELETED from the client, and deliberately NOT added to the schema. Decided by the loop (rule 16).** | The ledger guessed the answer might be "delete the client field", and it is — for a reason neither it nor the audit states. **There is nothing to truncate.** Depth-2 prose is generated **only on unlock** (§NOT YET BUILT C.12), so before purchase the locked prose does not exist; "code-derived truncation" has no source text. The only way to fill a `teaser` would be to generate premium prose for a section the user has **not paid for** and ship it to the device behind a CSS blur — which is precisely the leak M12a warns about, arrived at *by implementing M12a's own suggestion*. Adding it to the schema also contradicts that schema's own description ("only `headline`, `title`, `body` are model-authored") and would make a 4th generative field on the trust-critical pass. **What the tease should be instead:** the section `title`, which is already code-derived from the deterministic claim skeleton — it conveys *"you have a Fate Line chapter"* for zero tokens and zero leak, and the locked card already renders it. The card null-guarded `teaser`, so deleting it degrades gracefully rather than emptying the paywall. **When C.12 lands**, if a richer tease is wanted, it must be derived from the skeleton — never from prose the user has not bought. Two tests now hold this line: graft drops a model-emitted teaser, and the real schema rejects one. |
| D-24 | 2026-07-17 | **No Edge Function in this ledger is deployed, and B16's "deploy + live posture curl" Verify leg is recorded as not-doable rather than skipped quietly.** | There is no `SUPABASE_ACCESS_TOKEN` on this machine or in `.env.staging`, so `supabase functions deploy` cannot authenticate; the Supabase MCP is **read-only by project policy** (CLAUDE.md: "an inspection window, not a way to change anything"); and the repo's actual deploy path is `.github/workflows/deploy.yml` on merge to main, gated by the `staging-deploy` environment whose secrets are the **H3/H4b-2 human gate** (§NOT YET BUILT F.18). Deploying one function ad-hoc would also be *wrong* even if possible: it would put `image-delete` live while its siblings (B7's card-render, B8's push-dispatch, B15's webhook) stayed on old code — an inconsistent surface no reviewer approved. **Why this is safe:** migrations ARE applied (the test harness requires it) and every one was additive or expand-first, so the currently-deployed OLD functions still work against the new schema — e.g. `request_compat`'s 2-arg overload still exists (D-17), the old webhook always supplies `event.id` so the NOT NULL cannot bite it, and `chat-send`'s old `created_at` ordering still resolves. That is precisely what expand-contract buys. **Consequence to state plainly:** these fixes are not live until a deploy runs, so the audit's findings are closed *in the repo*, not *in production*. |
| D-22 | 2026-07-17 | **TRANSFER: the destination is resolved from `transferred_to`, and every `transferred_from` is REVOKED — decided by the loop (rule 16).** | RC's docs settle what the audit could only guess at: a TRANSFER carries `transferred_from`/`transferred_to` arrays and **no `app_user_id`**, and **"the webhook is sent only for the destination user"**. Two consequences the audit missed. **(a) We granted nobody**, not "the destination without revoking the source" — `isUuid(event.app_user_id)` was null for every TRANSFER, so the event was logged and never applied; a user who transferred their purchase got nothing. **(b) Revoking the source cannot be deferred to some later event, because there is no later event.** RC has already moved the entitlement server-side and will never tell us about the source again, so the TRANSFER webhook is the only moment we can act. Not revoking means one paid entitlement gates two accounts, forever, silently. Chose `status='expired'` + empty entitlements over deleting the row: `subscriptions` is the record of who held what, and `isPremiumRow` already treats `expired` as a hard stop. Both arrays are filtered through `isUuid` — they can contain RC's `$RCAnonymousID:…`, which is not a user we can gate; granting or revoking one would be a type-confusion bug. |
| D-23 | 2026-07-17 | **The Low finding "entitlement.ts:18 treats `expires_at: null` as premium-forever" is closed as WORKING AS INTENDED — no code change.** | RC documents null expiry as **legitimate**: *"This can be `null` for non-subscription purchases or lifetime products"* — and `NON_RENEWING_PURCHASE` is already in our ACTIVATING set, so null must mean "no expiry", which is what the code does. The alternative — treat null as not-premium — would **402 a paying customer** on an RC data quirk, i.e. precisely the failure C3 exists to warn about and the one the monetization design says never to inflict. It is also not unbounded: EXPIRATION sets `status='expired'` and `isPremiumRow` stops there, so "forever" is really "until RC says otherwise". **The residual, stated rather than papered over:** a null expiry removes the *self-healing* time check — with a real `expires_at` we lapse on our own clock even if a webhook never arrives, whereas with null we depend entirely on delivery, and RC gives up after 5 retries (~2.6h, D-21). That tail is worth revisiting **only if Palmly ever ships a lifetime SKU**; today it sells monthly/annual only, so a null expiry should never legitimately occur, and inventing a stricter rule now would add a paying-customer-facing failure mode to guard against an event that cannot happen. |
| D-21 | 2026-07-17 | **C3 is closed as a FALSE POSITIVE — the RevenueCat signature scheme is correct — and the real risk is re-filed as an H8 CONFIGURATION step.** | The audit calls C3 the **#1 risk in the codebase** on the claim that RC ships "a static `Authorization` header value … not a t/v1 HMAC scheme". RC's current docs (verified 2026-07-17, <https://www.revenuecat.com/docs/integrations/webhooks>) contain a section **"Webhook Signature Verification (HMAC)"** documenting exactly `X-RevenueCat-Webhook-Signature: t=<unix_timestamp>,v1=<hmac_sha256_hex>` over `"<t>.<raw_json_body>"`, with constant-time comparison and an optional ~5-minute replay window — which is, line for line, what `_shared/revenuecat.ts` already does. RC offers **both** an optional Authorization header **and** optional HMAC signing; the audit saw the first and concluded the second did not exist. **Rewriting this to chase the audit would have replaced a correct, stronger control with a weaker one — the single most expensive possible outcome here.** **But the audit's instinct was not worthless:** the feared lockout IS reachable, because HMAC signing is **opt-in per integration** and the secret is **shown once, unrecoverable**. If the toggle is off or the secret is wrong, our handler 401s/500s every delivery and RC gives up after 5 retries (~2.6h) — permanently 402'ing paying customers. That is a **dashboard** failure, not a code one, so it is filed as an explicit H8 checklist rather than 'fixed'. **Not** adding support for the Authorization header: accepting either mechanism would make two independent controls an OR and weaken the surface. |
| D-20 | 2026-07-17 | **B13's short code is WIDENED from 6 to 10 hex (24 -> 40 bits), and that — not the rate limiting — is the load-bearing half of H9's fix.** Delegated to the loop by the user; decided on arithmetic. | The audit treats H9's risk as "collision + brute-force implications … that is exactly why the spec pairs it with rate limiting". **Rate limiting alone cannot save a 24-bit code, because a prefix match hits ANY live invite:** the guesser's odds are `N / 2^bits`, not one-in-the-code-space. At 6 hex (16.7M) with 100k live invites that is **~1 in 167 guesses** to hijack a stranger's invite — and a hit **burns** it (claims are single-use), so the real recipient is locked out too: hijack *and* denial of service on the growth loop. Per-user throttling does not fix a per-*account* attack when anonymous sign-up is cheap. At 10 hex (1.1e12) it is ~1 in 1.1M at a **million** live invites, which no realistic throttle budget searches. **The change is free**: the code is *derived from token_hash, never stored*, so there is no data to migrate (`invites` holds 1 row); the cost is typing `XXXXX-XXXXX` instead of `XXX-XXX` on the rare fallback path — ordinary redemption-code UX. Collisions fall out too: at 24 bits they are near-certain at scale, at 40 bits rare — and an ambiguous prefix is **refused, never guessed**, because handing a claimant somebody else's invite is the one failure this code must not have. |
| D-19 | 2026-07-17 | **M7's "5-min CDN caching undercounts real repeat clicks" is a FALSE POSITIVE as written — yet B12 still changed the caching, to `no-store` + `Vary: User-Agent`, for two different reasons.** | **Why the audit's claim is wrong:** `created→clicked` is a **one-way transition**, so repeat clicks are never counted whether or not the page is cached. Caching cannot undercount a number nobody records. **Why the caching had to change anyway:** (1) **The bot filter and `max-age=300` are incompatible.** Today a crawler's request flips the status, so caching is harmless. Once bots stop flipping it, the crawler's fetch **primes the cache** and the real person's click seconds later is served from it — never reaching the function, never counted. The fix for M7's real limb would have created a worse version of the bug the audit imagined. (2) **The response is UA-routed with no `Vary`** — the CTA is an App Store, Play, or web URL chosen from the user-agent, so a shared cache could hand an Android user the iOS store link. That is an unreported bug, found only because M7 sent me to look at this header. Crawlers fetch a given invite once, so nothing here was worth caching; `no-store` costs one cheap SSR render per click. |
| D-18 | 2026-07-17 | **`sanitizeInviteContext` DROPS invalid values instead of rejecting the request.** | The invite context is **cosmetic** (headline name, OG image, routing hints). Throwing would mean a legitimate client bug — a stale `card_variant`, a mis-built URL — **fails invite-create outright and breaks the P2 growth loop**, which is the one thing the audit says never to paywall or block. Dropping degrades gracefully: the page falls back to `profiles.display_name` and `OG_DEFAULT`, both of which it already handles. An attacker gains nothing either way — their value never reaches the page — so the only party a throw would punish is a real user with a buggy client. Validation lives at the **write** rather than the read for the same reason B4 collects before deleting: the trusted-domain render is the last place you want to be deciding whether data is safe. |
| D-17 | 2026-07-17 | **M8's atomic gate is a 3-arg `request_compat` OVERLOAD that takes `p_has_premium` as a parameter, rather than recomputing entitlement in SQL or adding a partial unique index.** | **Why it had to move into SQL at all:** the count and the act were separate PostgREST round-trips, and no lock survives between two HTTP transactions — so the window was unclosable from the Edge Function. **Why an overload, not a default arg:** adding a 3rd parameter *with a default* makes the existing 2-arg call ambiguous ("function is not unique") and would **break** it; differing arity is unambiguous, leaves the old function intact (expand), and lets B18 contract it later. **Why not a partial unique index** (the ledger's guess at the shape): `compatibility_results` has no `requester_id`, so no index on it can express "at most one free result per *user*" — the user lives on `compatibility_pairs`. Adding a requester column + an `is_free` flag would still need the function to know premium-ness, so it lands back here anyway, plus two new columns. **Why premium is passed rather than recomputed:** `isPremiumRow` (`entitlement.ts:13`) is the single definition of that rule and **B15 is chartered to change its `expires_at: null` semantics** — a SQL copy would create a second place to update and hand B15 a silent drift bug. The flag cannot be forged: the only caller is an Edge Function running with the service key that reads `subscriptions` itself, and `request_compat` is revoked from anon/authenticated. **Bonus:** moving the gate deleted the string-interpolated `.or()` filter, so M8's second limb was fixed by subtraction. |
| D-16 | 2026-07-17 | **B10 adds a monotonic `seq` column rather than implementing H5's fix as literally prescribed.** | The audit says "order descending + limit + reverse", but that is **not deterministic in this schema**, so the literal fix would have been quietly half-broken. `created_at` defaults to `now()` = `transaction_timestamp()`, which is **constant within a transaction** (proven on staging: `select now() = now()` → true), and `chat-send` inserts **both rows of a turn in a single statement** — so a question and its answer carry an **identical timestamp**, while the `gen_random_uuid()` pk is random and cannot break the tie. "The most recent 8" could therefore hand the model **[assistant, user]**, i.e. a conversation with the answer before the question. Today's ascending read has the same ambiguity; it is simply invisible because the whole bug is that it never reaches recent turns at all. A `bigint generated by default as identity` + `(thread_id, seq desc)` index makes the ordering unambiguous and the index an ordered backwards scan. Free to add here: `chat_messages` is **0 rows**, so there is no backfill and no pre-existing order to invent. If chat data ever exists, this reasoning expires. |
| D-15 | 2026-07-17 | **B9's schema change is additive-to-v1, not a new v2.** (The B9 Note demanded this be decided explicitly.) | A real `v2` is a trap, not an option: `prompts/build-prompts.mjs:29` **hardcodes `'v1'`** and skips any family lacking that exact path, so a `prompts/*/v2` would emit **no** `.generated.ts` while `--check` still prints `PROMPTS_OK` — **a false green in CI** (`ci.yml:70`). There is no v2 precedent in the repo or its history, so a v2 means fixing the compiler first — a separate, larger job. Additive-to-v1 is also **safe here specifically**: `feature_sets` and `readings` are **empty on staging (0 rows, verified)** and no face scan has ever run, so there is no v1 data a new required field could invalidate. If face data ever exists, this reasoning expires. |
| D-14 | 2026-07-17 | **H1 is CONFIRMED but deliberately NOT fixed on the matching path (option D). Both proposed fixes are wrong; the finding itself is mis-stated; the bug is unreachable today.** Decided by the loop on the user's instruction to choose, after an 11-agent adversarial investigation (unanimous 3/3) whose every load-bearing claim was then re-verified by hand. | **1. The face path cannot execute.** `scan-create`/`scan-ingest` **do not exist** (verified), `scans`/`feature_sets`/`readings`/`subject_profiles` are **all 0 rows**, and `prompts/extraction/v1` is **palm-only** — it emits `is_hand:false` for a non-hand, carries zero 面相 taxonomy, and is still passed as the system instruction for `kind:'face'`. H1's cost is real per scan, **× zero scans**. **2. Option A is actively harmful, and the code already ruled on it:** `features.ts:2-3` excludes geometry from the consistency key **"since exact pixel paths vary"**, and `consistency.ts:51-52` refuses to merge geometry across votes of the *same image* (takes vote #1) — the authors knew coordinates don't agree. A would anchor **identity** in exactly that. Plus the verified **strip-list landmine**: `features.ts:26` / `consistency.ts:68` hardcode `line_geometry` **only**, so a sibling `landmark_geometry` leaks into `featureHash` (killing determinism) and `sameFeatures` → a 3rd tie-break vote on **every** face scan = **+50% extraction cost forever**, the very cost H1 exists to remove. And it flips the posture **closed → open**: template-regressed coords give distance ≈ 0 always → a friend's face short-circuits to `matched` and is served **your** reading. **3. Option B is dead** — my own "narrative is a pure function ⇒ matching enums is sound" argument holds only for **exact** equality, but B is a **tolerant** distance: 1 differing enum of 12 = 0.0833, so any usable threshold serves a reading the face never earned, and any sound threshold reinvents `feature_hash` (already computed at `worker-scan:166`, stored, **never read**) and would never fire — `twoVoteExtract` exists *because* the extractor disagrees with itself. **No threshold is both sound and useful.** C = A+B, so **C is the over-engineering.** **4. The finding is mis-stated:** it is not "faces lack a signature", it is **`deriveGeometry` reads the wrong source** — `line_geometry` is the model's *rendering* polyline; identity belongs in `feature_sets.geometry`, spec'd as **on-device capture-time landmark ratios matched BEFORE any model call (§6.6.3)**, which the audit's own **M1** already flags as a known deferral. So A builds more of an architecture the spec superseded. **Honest caveats (the skeptics killed the comfortable version):** "defer to H4c" is defer-to-**nothing** (H4c is causally unrelated to reading the wrong column), and **P4 as scoped does not save faces** — P4.T3 is hands-only, P4.T5 reuses T2/T4's verify, and `capture_meta` carries landmark *quality*, not ratios. **The on-device face path is not on the roadmap at all**, so two tasks must be filed (reported, not written — D-01). **This decision rests on one constraint: no face scan reaches a user before that path lands.** |
| D-12 | 2026-07-17 | **The ⚠️ ERRATA table's own H6 row is struck as WRONG.** The audit's plainer original claim stands; D-03's "trust the ERRATA over the audit" does **not** hold here. | The row claimed jobs die "even when the Expo POST *throws*" — a state this code cannot reach. `:47` only appends to a **local array**; the real `queue_archive` RPC is at `:63`, **after** the send, so a throw there would *prevent* archiving, not cause it. And `sendExpoPush` **never throws** — its own docstring says so (`_shared/push.ts:80`) and `:84-95` proves it (5xx → error tickets; network throw → caught). The bug is real but is exactly what the audit said plainly: control **always** reaches the unconditional archive, so a failed batch is silently deleted. **Lesson worth keeping: the ERRATA is recon, not scripture** — it was verified against the tree, but this row reasoned from line numbers without reading the callee, reached for a scarier framing, and landed on a fiction. Verify each row against the code the way D-03 says to verify the audit. |
| D-13 | 2026-07-17 | **H6's receipt-polling limb is deferred to the buildplan's cron work; B8 closes `[~]`.** | Expo's docs are explicit — *"check push receipts 15 minutes after sending"* — which makes receipt polling **inherently a separately scheduled job**: it needs ticket-id persistence **plus a cron to poll later**. The cron→worker wiring is precisely what this ledger's SCOPE excludes (§NOT YET BUILT A.3), and the audit itself files "Expo receipt polling" under §NOT YET BUILT C.10. Shipping a poller with no schedule would be **dead code** — the exact defect M3 raises against `buildFortuneBatch` ("genuinely dead in production; its only consumer is a test"). Same boundary and same `[~]` treatment as C2/B2: the limb that loses data **today** (archiving failed batches) is fixed now; the limb that needs a scheduler goes with the scheduler. **Recorded consequence:** `DeviceNotRegistered` pruning stays largely ineffective until then, since Expo returns it predominantly at receipt time — which is the audit's own point, and remains true. |
| D-10 | 2026-07-17 | **USER DECISION — B7 commits all three Noto binaries + the resvg wasm to git (~20MB, `.git` 41MB → ~60MB).** Licence verified first: **SIL OFL 1.1** permits bundling/redistribution with software (no standalone sale; ship the OFL file). | Asked per loop rule 16 rather than guessed. Precedent supports it: `.gitattributes` **already declares `*.ttf`/`*.otf binary`**, so the repo's convention anticipated fonts, and PNG assets are already committed; there is no LFS to complicate it. **Subsetting was evaluated and rejected as impossible, not merely inconvenient:** the card's `attribution` is the user's **display_name** — arbitrary input — and you cannot subset for unpredictable glyphs. That is also what justifies the ~17MB `NotoSerifSC-Regular.otf` despite an EN launch: `card-svg.ts` emits only `font-family="Noto Sans"` and contains no CJK, but a CJK display_name would render as tofu **on the share card**, i.e. the viral asset, for precisely this product's target audience. Alternatives declined: Latin-only (ships that tofu bug), deploy-time fetch (makes deploys non-hermetic — the same class of external dependency M4 dings the unpkg fetch for). |
| D-11 | 2026-07-17 | **USER DECISION — B7 keeps the pre-render but writes it PRIVATE, publishing to the public bucket only on share intent.** | Both options were spec-legal (§13/§9 only require that the *public* bucket hold user-initiated cards). Pre-render-private keeps sharing instant, which is the whole point of pre-rendering: "render on share intent only" would pay resvg cold start + wasm init at the exact moment the P2 viral share is happening. Private-by-default plus publish-on-copy gets the same privacy outcome without that latency, at the cost of one extra copy step. |
| D-09 | 2026-07-17 | **B4 proves H7's "no orphan" property with an injectable seam instead of the live storage round-trip its Verify line asks for.** The real round-trip stays open, reassigned to B21. | Two blockers and one better option. **Blockers:** the Node harness depends on `pg` alone — a live round-trip needs `@supabase/supabase-js` (a new dependency, the same call B17 flags for `@testing-library/react-native`) or hand-rolled Storage REST calls; and it would **persistently mutate staging**, which the begin/rollback harness exists specifically to prevent (a failed test would leave a real object behind). **Better option:** the property H7 is actually about is *"a storage failure must not orphan a crop"* — a live round-trip **cannot test that**, because it cannot make S3 fail on demand. An injected failing `removeObjects` can, and asserts the exact invariant (`purgeRows` never runs). This is the repo's own idiom (`revenuecat.ts`: "Pure/injectable … so it is unit-testable without the network"). What is genuinely NOT covered: that the Storage API calls work at all against a real bucket — that is handler-integration scope, which B21 owns. |
| D-07 | 2026-07-17 | **C4's "deletes 24h after scan creation, not after successful extraction" is closed as a FALSE POSITIVE — the spec is wrong, the SQL is right.** `crops_due_for_deletion` keeps keying the age on `created_at`. **A `Planning/Backend-specs.md` §9 correction is owed** (tracked with B22's storage-path correction). | The choice only affects scans that are **already extracted** — where the crop is spent (pass 2 reads features, never the image). For those, `created_at` deletes **sooner**, so keying on extraction would *only ever retain crops longer* and weaken the D2 claim ("analyzed, then deleted — usually within a day"). It cannot protect a backlogged crop either: that risk lives entirely in the stuck-scan branch, which fires at 24h from creation regardless. And re-analysis with improved extractors already has its designed mechanism — the `keep_image` opt-in, spec §9's own "Opt-in retained scan / until revoked" row. `created_at` is also the promise the user actually experiences ("I took a photo; it is gone within a day"). Applying the audit literally here would have **degraded privacy** while looking like a fix. Precedent: the audit makes exactly this call itself for `storage.objects.name` `[1]` vs `[2]`. |
| D-08 | 2026-07-17 | **`sweep_stale_anon` now refuses to purge any compatibility-pair member**, accepting a bounded MAU cost rather than reassign/tombstone semantics. | This is an irreversible deletion path, so the trade is "retain a few anon rows" vs "silently destroy an active user's pair + result". Verified live that both `compatibility_pairs` FKs cascade and results cascade from the pair, so there is no way to keep the pair while deleting the member. Tombstone/reassign would bound both costs, but inventing tombstone semantics for a **shared relationship row** (who owns it? what does the survivor see?) is a product decision, not a bug fix — out of this ledger's remit. The MAU consequence is real and recorded: an anon who claims an invite and never returns is now retained indefinitely. If that cost bites, the follow-up is a tombstone design, not re-enabling the destructive cascade. |
| D-06 | 2026-07-17 | **B2 unschedules all 5 `drain_stub` crons, not just the 2 the audit names.** | The audit's "disable the drain crons for `compat_jobs`/`push_jobs`" is right about *today* — verified: only those two have live SQL enqueuers (`0011:50,73`; `0013:16`, `0014:76`). But `drain_stub` **archives every message it reads** and **nothing consumes any of these queues**, so every scheduled drain is pure destruction with zero upside — not a worker, just a shredder on a 10s timer. Leaving the scan/narrative drains armed is a live trap for the very next buildplan task (`scan-create`/`scan-ingest`, P4): the first real scan job would be eaten within 10 seconds, and the symptom (a job that simply vanishes) is miserable to debug. The stub's proof-of-path value is retained — `queues.test.mjs` calls `drain_stub` directly and never depended on the schedule. Fully reversible; the exact restore SQL is in the migration header, and restoring is only correct once the command is a real worker invocation. |
| D-04 | 2026-07-17 | **H4's fix departs from the audit's literal prescription.** Instead of "reorder the `exists(profiles)` guard before the event insert", B1 adds `subscription_events.applied_at` and makes the idempotency key guard the **upsert** rather than the log row. | The audit's version does not actually close the finding, and contradicts the code it would have to change. **(1)** `revenuecat-webhook/index.ts` returns **HTTP 200 when `applied=false`** — RC never retries a 200, so declining to consume the key changes nothing; the event is still lost. **(2)** A tri-state return would let the handler 5xx, but `create or replace` **cannot change the `boolean` return type** → contracting, out of B1's additive remit. **(3)** The literal reorder breaks `revenuecat_webhook.test.mjs:58`, which deliberately asserts an unknown-user event is *logged for audit* — matching `subscription_events`' documented purpose ("raw webhook audit log", `schema.sql:139`). The `applied_at` design fixes the audit's stated failure ("every RC retry then dedupes to a no-op forever" — a redelivery now applies) while keeping the audit log complete and all 4 existing tests green. **Residual, stated honestly:** because the handler still 200s, self-healing needs *some* redelivery (an RC dashboard resend, or any later event — which carries a different id and applies normally). Making the handler signal retry is a **product call on posture**: a not-yet-provisioned user resolves on retry, but a merged-away UUID never will, so a blanket 5xx would retry forever against a permanently-dead id. Routed to B15 with the rest of the H4 residue. |
| D-05 | 2026-07-17 | **H4's `latest_event_at` ordering guard is deferred to B15**, not built in B1. | `0009:38` stamps `latest_event_at = now()` — **processing** time, not event time. `now()` is monotonic in processing order, so a guard written against it is true by construction and would be **decorative**: it would look like a fix and prevent nothing. A real out-of-order guard needs RC's actual event timestamp, and `RcEvent` (`_shared/revenuecat.ts:62-70`) **has no timestamp field** — the payload's real shape is exactly what B14 establishes from the vendor docs. The ledger's own B15 note already says ordering semantics depend on what RC actually sends; B1's "add an ordering guard" line is the over-eager one. A fake guard now would be worse than the bug, because it would look closed. |
