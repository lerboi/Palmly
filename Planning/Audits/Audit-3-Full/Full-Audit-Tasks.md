# Palmly — Full-Audit Fix Ledger (D0–D2) — the agent-executable subset

**Status:** ACTIVE — this file is the single source of truth for the Audit-3 device-free fix loop.
**Derived from:** [`Full-Audit.md`](./Full-Audit.md) findings A1–A10 (read the finding a task cites
before executing it) and [`Production-Readiness-Plan.md`](./Production-Readiness-Plan.md) (R0–R5 —
this ledger is exactly its **agent-executable, device-free, human-unblocked subset**: R0 + R2 + the
Docker-conditional card leg + the card tail it unlocks).
**Specs behind the audit:** `Planning/mvp_spec.md` · `Planning/Backend-specs.md` ·
`Planning/UIUX/UIUX-specs.md` · `Planning/MVP_Buildplan.md`. Env/secret map: `docs/ENVIRONMENT.md`.
**Prior ledgers (read-only context, never re-execute):** `../Audit-1-Backend/Backend-audit-Tasks.md`
(B0–B22, closed) · `../Audit-2-Frontend/Frontend-audit-Tasks.md` (F0–F2, closed — D2.T1 pulls its
deferred card tail).
**Created:** 2026-07-20 · Ledger version: 1.0

This ledger is a checkbox state machine executed **on a loop**, same conventions as
`MVP_Buildplan.md` and the two prior audit ledgers. Every task has an owner, a Build instruction,
and a **Verify procedure that must pass before its box may be checked**.

**Legend:** `[ ]` todo · `[~]` in progress OR built-with-a-pending-leg (honesty note required) ·
`[x]` done+verified · `[!]` blocked (note required) · 🤖 agent · 🧑 human · 🚦 phase gate ·
∥ parallel-safe (may be taken out of order when an earlier task is `[!]`).

**Sync rule:** every task here maps to a task in `Production-Readiness-Plan.md` (named in its
header). When a box changes state here, update the matching R-task's box **in the same commit** so
the two ledgers never diverge.

---

## 🔄 STATE — update this block on every run

| Field | Value |
|---|---|
| **Current phase** | D0 — Trust the deployment again |
| **Next task** | **D0.T3** (Docker deploy of `card-render`) — ∥ conditional |
| **Blocked on** | — |
| **Waiting on human** | Nothing yet. Human items live in Production-Readiness-Plan R1 (phone, store accounts, paid Gemini H4c, RevenueCat H8, domain H6, auth providers H5b, CI secrets, AppsFlyer H9, KB review, dashboard toggles) — they are **out of scope** here and must never block this loop; if a task turns out to need one, mark it `[!]` naming the R1 item and move on. |
| **Last run (date, by whom)** | 2026-07-20, 🤖 Claude (Audit-3 loop) |
| **Last completed task** | D0.T2 — migration ledger repaired (`0031`/`0032` marked applied); `db push --dry-run` → "Remote database is up to date."; history now 32 rows, max `20260719000032`; one-apply-path rule documented in `docs/ENVIRONMENT.md`; Node 135/135. |
| **Notes for next run** | D0.T3 (∥, conditional): probe Docker (`docker info`); if unreachable, try starting Docker Desktop then re-probe ~2 min; if genuinely absent → mark `[!]` "needs human: install/start Docker Desktop" and continue (D2 stays gated). If reachable: `npx supabase@latest functions deploy card-render --use-docker --project-ref rphtdgoggsldshtdbkaj`; verify a live 200 + PNG in `card-drafts`. NOTE for all deploys: `SUPABASE_ACCESS_TOKEN` (root `.env`) is a valid `sbp_` PAT — source it from **repo-root cwd** (Bash tool persists cwd between calls; wrong cwd → empty token → 403). For DB commands build `--db-url` from `.env.staging` via node `encodeURIComponent(pw)` (password has special chars). |

---

## ⚙️ EXECUTION PROTOCOL (the loop algorithm — follow exactly, every iteration)

1. **Load state.** Read this STATE block, the Build Log (bottom), and the current phase's task
   list. Read the `Full-Audit.md` finding(s) the selected task cites — they hold the WHY, the
   evidence, and the exact failure the task prevents.
2. **Select task.** The next task is the **first task in document order** whose box is `[ ]` or
   `[~]`. Never skip ahead, except: if the selected task is `[!]` blocked, take the next ∥-marked
   task instead.
3. **RESEARCH (mandatory, before writing any code).**
   - Read the **current** source of every file the task names, in full, before editing. The
     audit's file:line cites were verified 2026-07-19 but the tree moves — grep for the quoted
     code/strings to re-anchor every cite; if a cite is wrong, record it in the ERRATA table and
     proceed against reality.
   - Read the spec sections the task cites (this ledger deliberately doesn't duplicate them).
   - For anything backend-touching, inspect live staging FIRST via the **read-only Supabase MCP**
     (`mcp__supabase__list_tables`, `execute_sql`, `list_edge_functions`, `get_edge_function`,
     `list_migrations`, `get_logs`, `get_advisors`) — never guess schema or deployed state.
   - Check `app/package.json` before assuming a library exists; install Expo-managed deps with
     `npx expo install <pkg>` only.
4. **PLAN.** Write a short 3–6 line plan (files, approach, how Verify will pass) before editing.
   Where the spec is silent, choose the simplest thing that passes Verify and record it in the
   Decision Log below.
5. **EXECUTE.** Smallest coherent change. Match surrounding code style (theme tokens only — no raw
   hexes; reduce-motion + web gating on every animation; the typed `track()` facade for all
   analytics; `PREVIEW_*` fixtures stay `/dev`-only). Migrations: **new files only,
   expand-contract (additive)** — never edit an applied migration.
6. **VERIFY.** Run the task's Verify line LITERALLY, plus the standing gates (below). Only when
   everything passes: mark `[x]` (or `[~]` with a note naming exactly which leg remains), append
   one Build Log line, update the STATE block, tick the matching R-task in
   `Production-Readiness-Plan.md`, and commit (`git add -A && git commit -m "D#.T# <short desc>"`
   — scope the commit to the task + the two ledgers; never sweep unrelated changes).
7. **On failure:** 3 distinct approaches max, then mark `[!]` with the failure detail + approaches
   tried, update STATE, move to the next ∥ task if one exists, else report and stop. A
   falsely-green ledger is worse than a stalled one.
8. **Session budget.** One task at a time; keep going while context allows. Near the limit: finish
   or `[~]`-note the in-flight task, update STATE, commit, stop the turn cleanly — the next
   iteration resumes from the STATE block, never from conversation memory.

### Standing gates (every task)

- App-touching tasks, from `app/`: `npm run typecheck` (0 errors) · `npm run lint` (0 problems) ·
  `npm run test:ci` (green; baseline 64/64).
- Edge-function tasks, from `supabase/functions`: `deno test --allow-read --allow-env` (baseline
  208/208; Deno at `C:\Users\leheh\.deno\bin\deno.exe`).
- Migration/schema tasks, from `supabase/tests`: `node --test --test-concurrency=1` (needs
  `.env.staging`; baseline 135/135; ~5 min).
- Phase gates (🚦) run **all three**.

### Standing rules

- **Never fake a green.** Anything camera/haptics/purchase/push-delivery/native-share is
  device-pending: build fully, verify what is device-free-verifiable, mark the live leg `[~]`
  honestly.
- **Deploys:** `npx supabase@latest functions deploy <fn> --project-ref rphtdgoggsldshtdbkaj`
  (`SUPABASE_ACCESS_TOKEN` lives in the git-ignored root `.env` — check `.env.staging` too; never
  the globally installed CLI, it cannot parse config.toml). Per-fn `verify_jwt` is encoded in
  `supabase/config.toml`. `card-render` is the ONE exception: it must be deployed
  `--use-docker` (its resvg wasm + Noto fonts are `static_files` that a `--use-api` deploy
  silently drops — Audit-2 ERRATA #2).
- **The Supabase MCP is READ-ONLY.** Every seed row, SQL UPDATE, `queue_send`, or Vault write a
  Verify needs runs through a throwaway Node/pg script using `.env.staging` credentials (pattern:
  `supabase/tests/`). Seed rows the app must READ must be owned by the app session's user id
  (RLS). **Clean up every seeded row when a verify finishes; never commit scripts containing
  secrets.**
- **⚠️ pg_cron/pg_net rule CHANGE:** the prior ledgers' "do NOT schedule pg_cron / install pg_net"
  parking rule is **lifted for D1.T1 only** — that task IS the sanctioned cron→worker wiring,
  per Full-Audit A4 / Plan R2.T1. It remains in force everywhere else: no other task may add cron
  jobs or pg_net calls, and the service key may live **only** in Vault (written by an uncommitted
  one-off script) — never in a migration file, never in git, never in client code.
- **Screenshots** (when a Verify wants one), from `app/`: `npx expo export --platform web`, then
  `node scripts/shoot.mjs <outDir> <route:WxH[=name]> …` (root route is `/`, never `/index`; dark
  mode = separate `EXPO_PUBLIC_FORCE_SCHEME=dark` export). Save under `docs/checkpoints/audit3/`.
  To DRIVE the web export (clicks, file pickers, real network) use a raw-CDP script in the
  shoot.mjs style.
- **Copy discipline:** no CJK in default UI; no health/medical claims; the canonical deletion
  promise (`app/src/lib/trustCopy.ts`) is the only deletion wording allowed anywhere.
- **Analytics discipline:** every event through the typed facade in `app/src/lib/analytics.ts`;
  update `AnalyticsEventMap` AND `docs/ANALYTICS.md` in the same commit.
- **DO NOT BUILD** (carried from the Plan, binding here): no second cron mechanism (D1.T1 builds
  exactly one); no staging/prod split; no full i18n; no lunar-calendar lib; no streaks table /
  group compat / invite rewards / weekly recap; no Gemini Batch engineering beyond the config
  flip; no custom segmentation model; **no new screens**; no re-auditing.

### ⚠️ AUDIT ERRATA (append-only — record any Full-Audit.md cite that proves wrong)

| # | Audit claim / cite | Reality found | Date |
|---|---|---|---|
| — | | | |

### 📋 DECISION LOG (append-only)

| # | Decision | Rationale | Date |
|---|---|---|---|
| D3-01 | *(reserved for D1.T1: cron mechanism choice — record (a) Vault+pg_net or (b) GH-Actions here with rationale before building)* | | |

---

## OUT OF SCOPE (do not execute here — report, never build)

- **R1 (all)** — human/provider/purchase items. If newly unblocked mid-loop (e.g. Docker running,
  a secret appearing), only D0.T3/D2 react; everything else stays out.
- **R3/R4** — device-gated (physical phone, two-device M-gates, RevenueCat sandbox).
- **R5** — the launch phase (eval set, load test, security pen-pass, compliance sweep, store prep,
  prod cutover). Deliberately sequenced AFTER the M-gates by the Plan; running it now would
  violate the Plan's ordering. Not this loop's job even though parts are 🤖.
- **A8** (server-side paywall-decline signal) — audit says defer; noted, not built.
- Anything on the DO-NOT-BUILD list above.

---

## D0 — Trust the deployment again (= Plan R0; audit A1–A3, A5–A7, A9–A10)

- [x] **D0.T0** 🤖 **Preflight + baseline commit.**
  - Build: (1) Prove the toolchain: `npx supabase@latest projects list` succeeds with the env
    token (source root `.env`); Deno runs; `.env.staging` present; `mcp__supabase__list_migrations`
    answers. (2) Commit the Planning reorg already sitting in the working tree (moved
    audit/UIUX dirs, CLAUDE.md pointer updates) **plus this ledger + Prompt.txt** as one baseline
    commit, so every later commit is task-scoped against a clean tree. (Discharges the
    "commit the reorg" leg of R0.T6 early.)
  - Verify: `git status` clean after the commit; the three baseline suites run green (app
    64/64 · Deno 208/208 · Node 135/135) — this pins the "before" state.
- [x] **D0.T1** 🤖 **Redeploy every pure-code Edge Function from git.** (= R0.T1; audit A1.)
  - Build: deploy all **19** functions EXCEPT `card-render` (that's D0.T3):
    `account-delete account-merge chat-send cleanup compat-request fortune-generate image-delete
    invite-claim invite-create invite-page ops-alerts push-dispatch revenuecat-webhook scan-create
    scan-ingest share-card-publish worker-compat worker-narrative worker-scan`.
    Config-driven verify_jwt/import_map from `supabase/config.toml`.
  - Verify: `mcp__supabase__list_edge_functions` shows every function's `updated_at` ≥ today and
    version bumped; live posture spot-checks pass (invite-create no-JWT → 401/403; worker-scan
    no-service-key → 401/403 and +key → 200; chat-send non-premium → 402); Deno suite green.
- [x] **D0.T2** 🤖 **Repair the migration ledger.** (= R0.T2; audit A3.)
  - Build: `npx supabase@latest migration repair --status applied 20260719000031 20260719000032`
    against staging (db creds from `.env.staging`), then prove `supabase db push` is a clean
    no-op. Document (one line in `docs/ENVIRONMENT.md` or the Buildplan standing rules) that
    **db push is the one apply path** going forward.
  - Verify: `execute_sql` on `supabase_migrations.schema_migrations` → max version =
    `20260719000032` (32 rows); `db push` reports nothing to apply; Node schema suite green.
- [ ] **D0.T3** 🤖(conditional)/🧑 **Docker deploy of `card-render`.** (= R0.T3; audit A2.) ∥
  - Build: probe Docker first (`docker info`). If the engine is unreachable, try starting Docker
    Desktop if installed (`Start-Process` + poll `docker info` ~2 min). If Docker is genuinely
    absent/unstartable → mark `[!]` "needs human: install/start Docker Desktop" and continue the
    loop (D2 stays gated). If reachable:
    `npx supabase@latest functions deploy card-render --use-docker --project-ref rphtdgoggsldshtdbkaj`.
  - Verify: a live invocation returns 200 and a PNG lands in `card-drafts`; edge logs show no new
    500s. On success, D2 unblocks.
- [ ] **D0.T4** 🤖 **Fix the two client honesty bugs.** (= R0.T4; audit A5 + A6.)
  - Build: (a) `app/src/app/(capture)/palm.tsx` — the capture stand-in's confirm currently pushes
    `/analyzing` with **no scanId** (infinite loader). Either route its confirm through the same
    `uploadPickedScan` chain the picker uses, or gate the camera door to the upload path until P2
    lands — **no route to `/analyzing` without a scanId may remain**. (b) `share.tsx` compat card
    variant hardcodes `score={82}` / `partnerName="Mei"` — thread the REAL pair result (name +
    score) from the pair the sheet was opened for. (c) wire `publishShareCard` →
    `share-card-publish` at share time so invites carry a card image (grep-verified currently
    called by nothing); if D0.T3 is `[!]`, wire it fully and mark the live-PNG leg `[~]`.
  - Verify: driving capture→confirm on the web export reaches a real reading via the upload chain
    (or the camera door visibly routes to upload) — screenshot; the compat sheet opened from a
    seeded real pair shows that pair's name/score (seed via Node/pg harness, clean up); after a
    share, the invite row gains `card_image_url` (live PNG only if D0.T3 passed). Standing gates.
- [ ] **D0.T5** 🤖 ∥ **Emit the dark analytics events that have live call sites today.** (= R0.T5;
  audit A7.)
  - Build: wire `capture_state_dwell`, `capture_completed`, `capture_abandoned`, `reading_ready`,
    `reveal_time_spent`, `invite_clicked` (claim-side), `notification_pref_changed` at their
    existing call sites (~1-line emissions through the typed facade). Include
    `paywall_page_viewed` iff its surface is live device-free — judge by call-site reality.
    Leave `purchase_completed`/`winback_converted`/`push_opened`/`invite_installed` for their
    H8/H9/device moments (note them in `docs/ANALYTICS.md` as intentionally pending). Update
    `docs/ANALYTICS.md` in the same commit.
  - Verify: grep shows ≥1 non-test call site per wired event; standing gates green.
- [ ] **D0.T6** 🤖 ∥ **Hygiene sweep.** (= R0.T6; audit A9 + A10.)
  - Build: (a) dependency pass: `npx expo install --check` from `app/` until `npx expo-doctor` is
    fully green. (b) one additive migration revoking PostgREST EXECUTE from `anon`/`authenticated`
    on the trigger-only SECURITY DEFINER functions (`handle_new_user`, `broadcast_scan_status`,
    `broadcast_compat_status`, `resolve_awaiting_compat`; leave `is_pair_member`/`thread_owner`/
    `set_keep_image` per A9), applied via `db push`. (c) doc truth: fix `HowItWorks.md`'s "5
    scheduled cron drains" claim (reality: A4 → D1); update the `MVP_Buildplan.md` STATE block to
    point at the Audit-2 outcome + Audit-3 + this ledger. (d) note the leaked-password toggle as
    the 🧑 R1.T10 item — do not attempt it (dashboard-only).
  - Verify: `npx expo-doctor` all checks pass; `mcp__supabase__get_advisors` (security) no longer
    lists the revoked functions; `db push` clean; standing gates + Node suite green; `git status`
    clean.
- [ ] **D0.G** 🚦 **Staging == git.** Every function current (D0.T1), migration ledger repaired +
  `db push` no-op (D0.T2), card-render 200 **or honestly `[!]` Docker**, no route dead-ends
  (D0.T4), events emitting (D0.T5), hygiene clean (D0.T6). All three suites green. Update
  Production-Readiness-Plan R0.G to match.

## D1 — Power the engine room (= Plan R2; audit A4)

- [ ] **D1.T1** 🤖 **Cron→worker wiring** — the single most important backend task left. (= R2.T1.)
  - Decision FIRST (Decision-Log it): default **(a) recommended** — service key in **Vault**,
    enable `pg_net` (0.20.3 available, not installed), one new migration that `cron.schedule`s
    jobs calling `net.http_post` against the deployed workers: scan/narrative/compat/push drains
    at the Backend-specs cadences, hourly `cleanup`, `ops-alerts`, nightly `fortune-generate`.
    Option (b) (GH-Actions scheduler) requires R1.T7 CI secrets (human) — only pick it if (a)
    proves impossible, and never build both.
  - Security protocol for (a): the migration reads the key from
    `vault.decrypted_secrets` **by name at runtime** — the migration file contains NO key
    material (grep it before commit). The Vault secret itself is inserted once by an
    **uncommitted** throwaway Node/pg script using `.env.staging`. Use
    `mcp__supabase__search_docs` for the current Vault + pg_cron + pg_net patterns.
  - Verify: `cron.job` populated (execute_sql); an enqueued test scan (seeded via harness)
    progresses queued→extracting→complete→reading with **zero manual worker invocations**; a
    seeded >24h-old crop is deleted by the sweep with `image_deleted_at` set; migration file
    contains no secrets; Node suite green; clean up seeds.
- [ ] **D1.T2** 🤖 **Nightly fortunes real.** (= R2.T2; audit A4.)
  - Build: re-run the missing/failed fortune buckets for today (invoke `fortune-generate` with an
    explicit `{"date":"<today UTC>"}` — its default generates TOMORROW; it is
    idempotent-resumable). ⚠️ Known reality: the free-tier Gemini key (H4c) has a DAILY quota
    that previously plateaued a full run at 56–57/61 — re-invoke across the quota window; if
    quota-capped, mark `[~]` with the exact bucket count (honest), not `[x]`. After D1.T1,
    confirm tomorrow's buckets generate ON SCHEDULE with no manual invocation.
  - Verify: `fortune_templates` coverage for today (+tomorrow once the nightly fires) at 61/61 —
    or `[~]` with the quota-honest count; FortuneHome renders a real row (screenshot); a
    fortune-open writes `user_fortunes` (clean up).
- [ ] **D1.T3** 🤖 ∥ **Populate the 141 KB embeddings.** (= R2.T3; audit A4.)
  - Build: one-off throwaway script (Node or Deno, `.env.staging` creds + the Gemini key per
    `docs/ENVIRONMENT.md`) embedding all `kb_chunks` via `gemini-embedding-001` (proven to work
    on the current key). Do not commit the script with secrets inline.
  - Verify: `execute_sql` → embeddings 141/141 non-null; the live retrieval eval
    (`eval/p9t6.ts`) ranks the heart-line chunk first for a love query; chat's `kb_search` path
    returns grounded citations (graceful-degradation ends).
- [ ] **D1.G** 🚦 **The engine runs unattended.** A scan enqueued at rest becomes a reading with
  no human in the loop; fortunes roll nightly; deletion promises are kept by machinery.
  All three suites green. Update Plan R2.G.

## D2 — The Docker-unlocked card tail (conditional on D0.T3; = the deferred F1.T9 tail)

- [ ] **D2.T1** 🤖 **Share-card craft parity.** (Gated: only if D0.T3 verified 200.) Read the
  Audit-2 ledger's F1.T9 task + its `Blocked on`/STATE notes first — this is that deferred tail,
  executed once, as one focused task: compat/face/daily-fortune card classes in
  `_shared/card-svg.ts` + `card-render`, real QR (or delete + Decision-Log), dark variant,
  <450KB Deno size assertion, client sheet honesty (real draft PNG preview, "show my name"
  consent toggle, market-ordered channel row), fortune share seal (F1.T11 leg), card-corner seal
  (F2.T1 leg), card-side rarity (F2.T8 leg — honest framing, no fabricated number). Redeploy
  `card-render --use-docker`.
  - Verify: Deno green (size assertion included); live renders of each card class return 200
    PNGs into `card-drafts` (view them); the client sheet previews a real draft PNG (screenshot);
    an invite published after this carries a working OG card image (fetch the teaser HTML).
    Standing gates. Tick the corresponding `[~]`/`[!]` notes in the Audit-2 ledger as closed
    (annotate, don't rewrite history).
- [ ] **D2.G** 🚦 **FINAL GATE + consolidated report.** All three suites green. Then write the
  terminal report into STATE: what this loop closed (with commit refs), what remains and exactly
  which R1/R3/R4/R5 item each remaining thing waits on. Update `Production-Readiness-Plan.md`
  checkboxes to match reality, set this STATE's Current phase to **COMPLETE**, send the user a
  one-line PushNotification, and END the loop.

---

## 🧱 Build Log (append one line per completed task)

| Date | Task | Result |
|---|---|---|
| 2026-07-20 | D0.T0 | Toolchain proven (`supabase projects list`→palmly-staging ACTIVE_HEALTHY; Deno 2.9.2; `.env`/`.env.staging` present; MCP `list_migrations` answers=30). Planning reorg + this ledger + Prompt.txt committed as one baseline. Baseline suites pinned green: app 64/64 · Deno 208/208 · Node 135/135. |
| 2026-07-20 | D0.T1 | Redeployed all 19 pure-code Edge Functions from git (all except `card-render`) via `npx supabase@latest functions deploy` — every version bumped +1, `updated_at`=today; `card-render` left at v4 (D0.T3). Posture spot-checks live-verified: invite-create no-JWT→401, worker-scan no-key→403 & +service-key→200 (`{"processed":0}`), chat-send non-premium→402. Deno 208/208. Minted anon users for the chat check cleaned up. |
| 2026-07-20 | D0.T2 | `migration repair --status applied 20260719000031 20260719000032` (via `--db-url` from `.env.staging`) → history now 32 rows, max `20260719000032`, both present. `db push --dry-run` → "Remote database is up to date." (no-op). One-apply-path standing rule (db push only; never out-of-band DDL) documented in `docs/ENVIRONMENT.md`. Node 135/135. |
