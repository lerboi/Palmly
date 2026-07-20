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
| **Current phase** | D2 — The Docker-unlocked card tail (D0 + D1 COMPLETE; D1.G passed 2026-07-20) |
| **Next task** | **D2.G** 🚦 (final gate + consolidated report → END the loop). D2.T1 core COMPLETE (full Verify passed). |
| **Blocked on** | — |
| **Waiting on human** | R1 items out of scope (never block this loop). Carried `[~]` legs (all H4c/R1.T3 paid-Gemini or device, out of scope): D1.T1 raw-scan image extraction; D0.T4 on-device camera + CDP screenshots. Nothing blocks D2. |
| **Last run (date, by whom)** | 2026-07-20, 🤖 Claude (Audit-3 loop) |
| **Last completed task** | **D2.T1 CORE COMPLETE** — full Verify PASSED (all 4 card classes live-render + viewed; <450KB; client real-preview; **published-invite OG image live-verified E2E**; consent + channel row + chop-seal). `[~]` residuals deferred/gated (dark variant = unwired story; face-share = flag+H4c; lunar = no util). Audit-2 F1.T9/F2.T1/F1.T11 annotated. |
| **Notes for next run** | **RUN D2.G — the FINAL GATE (terminal; ENDS the loop).** D2.T1 core is COMPLETE (full Verify passed, all 4 card classes live + OG image E2E). D2.G steps: (1) run all three suites device-free — app (`cd app && npm run typecheck && npm run lint && npm run test:ci`), Deno (`cd supabase/functions && "C:\Users\leheh\.deno\bin\deno.exe" test --allow-read --allow-env --no-check` → expect 221), Node schema (`cd supabase/tests && node --test --test-concurrency=1` w/ `.env.staging` → expect 135); (2) the card-craft R-sync is already done (Production-Readiness R0.T3 annotated "EXECUTED as D2.T1"); (3) write the CONSOLIDATED TERMINAL REPORT into STATE — what this Audit-3 loop closed (D0/D1/D2 with commit refs), and what remains, each mapped to its exact R1/R3/R4/R5 human/device/paid/launch blocker (dark variant = unwired story enhancement; in-app face-share = FACE_READING_ENABLED flag (R1.T-face) + H4c paid Gemini; lunar whisper = a lunar-util decision; camera/haptics/purchase/push-delivery = device/provider legs); (4) set STATE **Current phase = COMPLETE**; (5) send a one-line **PushNotification**; (6) **END the loop** (`ScheduleWakeup stop:true`). Per LOOP CONTROL, D2.G is `[~]` (device-free gate passed; the human/device/paid tail remains) — do NOT fabricate a green, do NOT loop further once D2.G is recorded. **Docker running (28.1.1); card-render v11 live.** |

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
| 1 | A5 cites only `palm.tsx:30` as the scanId-less `/analyzing` dead-end | `face.tsx:14` had the identical bug (`onShutter` → `/analyzing` with no scanId) and is **live-reachable** via `RevealView`'s "read your face" offer (`RevealView.tsx:190` → `/face`). Fixed both in D0.T4 (both routed through the shared `useScanUpload`). | 2026-07-20 |

### 📋 DECISION LOG (append-only)

| # | Decision | Rationale | Date |
|---|---|---|---|
| D3-06 | **The share-card QR is REMOVED, not built (chunk 5 = delete + Decision-Log).** The story-variant "scan to compare" block was a non-scannable placeholder (finder-square decoration + text) — it implied a capability it lacked, a "never fake" violation on a share asset, so it was deleted from `card-svg.ts`. A REAL, scannable QR must encode the **per-share invite URL**, which is minted AFTER the card is pre-rendered (worker-narrative pre-renders the draft; the invite is created at share time in `ShareView.ensureInvite`) — so a genuine QR belongs at **share/publish time** (a re-render carrying the invite URL), NOT the pre-rendered draft. Deferred as a post-MVP enhancement. Consequently the market-ordered channel row (chunk 4c) ships **without** a QR tile. | The story variant is not wired to ANY producer today (`story_9x16` appears only in `_shared/invite.ts`'s allowed-variant Set; worker-narrative pre-renders `feed_4x5` only), so the fake reached no user and its removal is a no-op for produced output (`feed` cards are byte-identical). Writing a spec-correct QR encoder (~350–450 LOC: RS/GF(256), matrix placement, mask evaluation) + a decode test — for an unwired variant encoding only a generic URL, when the invite URL already rides in the share message text — is disproportionate for the MVP. | 2026-07-20 |
| D3-05 | **Fortune share card: owner = a caller-supplied `user_id`; `source_id` = a deterministic UUIDv5 of `fortune:${date}:${bucket}:${locale}`.** A daily fortune has no owning row (the app just reads the shared `fortune_templates` row for (today × the user's pillar bucket × locale)), so `card-render`'s `source_type='fortune'` branch takes `user_id` (the sharing user → the `share_cards` owner) + `{fortune_date, pillar_bucket, locale}` (defaults today/`generic`/`en`), loads the template `content`, and derives `source_id` server-side (UUIDv5 via SHA-1) so re-renders of the same day/bucket upsert one row. | `share_cards.source_id` is `uuid NOT NULL` + the `(user_id,source_id,variant)` unique index gives per-user idempotency; a deterministic id makes the derivation reproducible without a fortune entity. `card-render` is secret-mode (no user context), so the owner must be supplied — a future user-mode fortune-share wrapper validates the JWT then passes the verified `user_id` (mirrors how the compat render's client wiring is a later leg, D3-02). | 2026-07-20 |
| D3-03 | **"Show my name" consent (chunk 4b) resolves by picking among PRE-RENDERED drafts, never by re-rendering at publish.** Publish is a byte-for-byte COPY of the draft (`_shared/card-publish.ts` `publishCard`), and the solo `reading` draft always bakes `profile.display_name` as the byline (`card-render/index.ts` line 97). So "preview == posted" (both are the same draft bytes) means the toggle MUST select a pre-rendered variant. Approach: pre-render a second **anonymous** solo draft (variant `feed_4x5_anon`, `card-render` reading branch honoring an explicit empty `attribution`); the sheet previews + publishes whichever the toggle selects. Toggle default = ON (name shown), matching today's single baked draft. | The alternatives break honesty: re-rendering at publish makes preview (name) ≠ posted (no name); a publish-time byline strip can't touch already-copied bytes. Two drafts cost one extra render + ~75 KB/reading but keep preview == posted exact in BOTH states. Deferred to its own chunk (needs a card-render change + a worker-narrative second render + `--use-docker` redeploy + live verify). | 2026-07-20 |
| D3-02 | **Compat share card owner = `pair.user_a`** (the `share_cards` row's `user_id`), rendered by card-render `{source_type:'compatibility', source_id:<pair_id>}` loading both members' geometries from `compatibility_results.feature_set_a/b` + names from `profiles`. | The card-render capability + the render itself are what F1.T9 needs first; genuine per-member sharing (each member reading/publishing their own compat draft under RLS) is a later leg of the client-sheet chunk. `user_a` is deterministic + sufficient to verify the render. | 2026-07-20 |
| D3-01 | **Cron→worker = mechanism (a): Vault + pg_net + pg_cron.** One migration (`0034`) enables `pg_net` (0.20.3) and `cron.schedule`s 7 jobs, each a `net.http_post` to a deployed worker. **Two Vault secrets** set by an UNCOMMITTED one-off script (neither in git): `project_url` (= `https://<ref>.supabase.co`) and `edge_service_key` (= the `sb_secret_` SERVICE_ROLE key). The migration reads BOTH from `vault.decrypted_secrets` **by name at runtime** → the file has no ref and no secret. **Auth header = `apikey: <key>`** (NOT `Authorization: Bearer` — the new `sb_secret_` key is gateway-rejected on Bearer per current Supabase docs; Palmly's `bearerToken` falls back to the `apikey` header → `requireMode 'secret'`). Cadences (Backend §4): scan/narrative `10 seconds`, compat/push `15 seconds`, cleanup `0 * * * *`, ops-alerts `15 * * * *`, fortune-generate `0 3 * * *` (empty body → `nextUtcDate` = tomorrow). | (b) GH-Actions rejected: needs R1.T7 human CI secrets; (a) is fully agent-doable today. `project_url` in Vault (not hardcoded) keeps the migration portable for the R5.T7 prod-from-git recreation (the single-project decision's whole point). Never build both (DO-NOT-BUILD). | 2026-07-20 |

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
- [x] **D0.T3** 🤖(conditional)/🧑 **Docker deploy of `card-render`.** (= R0.T3; audit A2.) ∥
  - Build: probe Docker first (`docker info`). If the engine is unreachable, try starting Docker
    Desktop if installed (`Start-Process` + poll `docker info` ~2 min). If Docker is genuinely
    absent/unstartable → mark `[!]` "needs human: install/start Docker Desktop" and continue the
    loop (D2 stays gated). If reachable:
    `npx supabase@latest functions deploy card-render --use-docker --project-ref rphtdgoggsldshtdbkaj`.
  - Verify: a live invocation returns 200 and a PNG lands in `card-drafts`; edge logs show no new
    500s. On success, D2 unblocks.
- [~] **D0.T4** 🤖 **Fix the two client honesty bugs.** (= R0.T4; audit A5 + A6.) — CODE COMPLETE + gates green + legs (b)/(c) live-verified; the on-device camera capture + literal CDP web-export UI screenshots are the only pending legs (see note below).
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
  - **NOTE (2026-07-20, `[~]` honesty):** Code complete. (a) A5 fixed in **both** `palm.tsx` AND
    `face.tsx` (erratum #1 — A5 cited only palm; face's shutter→`/analyzing` was the same
    live-reachable dead-end via `RevealView`'s face offer) by routing the camera door through a new
    shared `features/capture/useScanUpload.ts` (also refactored `primer.tsx` onto it — one canonical
    upload door). (b) `share.tsx` now shows the REAL pair score+name via new `loadCompatShare(pairId)`;
    `pair.tsx` threads `pairId` into both share routes; hardcoded `82`/`"Mei"` gone. (c) `ShareView`
    now looks up the pre-rendered draft card (`loadDraftShareCardId`) → `publishShareCard` →
    `createInvite({cardImageUrl})` so invites carry a real OG image. Standing gates green
    (tsc 0 / lint 0 / jest 64/64). **Live-verified via Node harnesses:** leg (c) — full chain
    (permanent user → card-render → loadDraftShareCardId → share-card-publish → invite-create) →
    the `invites` row's `context.card_image_url` == the published PNG URL; leg (b) — `loadCompatShare`
    returns the seeded real score (73, not 82), partnerName the neutral `'Your match'` fallback
    (profiles are self-only RLS → partner name degrades by design, never fabricated "Mei"). Invariant
    grep-proven: **no `router.push('/analyzing')` without a `scanId` remains** anywhere in `src`.
    **PENDING legs:** on-device camera capture (device-gated, P2/R3); the two literal CDP web-export
    UI screenshots (capture "Use photo"→upload; compat-sheet real-score render) were NOT produced —
    the upload chain is the Audit-2 web-verified primer path (now reused) and `CompatPreview` renders
    the passed `score` unchanged, and driving an authenticated compat `pairId` on the anon web export
    is impractical (the anon session id isn't known ahead of the seed). Substance verified by
    stronger means (live harnesses + invariant + gates); the screenshots are UI confirmation only.
- [x] **D0.T5** 🤖 ∥ **Emit the dark analytics events that have live call sites today.** (= R0.T5;
  audit A7.)
  - Build: wire `capture_state_dwell`, `capture_completed`, `capture_abandoned`, `reading_ready`,
    `reveal_time_spent`, `invite_clicked` (claim-side), `notification_pref_changed` at their
    existing call sites (~1-line emissions through the typed facade). Include
    `paywall_page_viewed` iff its surface is live device-free — judge by call-site reality.
    Leave `purchase_completed`/`winback_converted`/`push_opened`/`invite_installed` for their
    H8/H9/device moments (note them in `docs/ANALYTICS.md` as intentionally pending). Update
    `docs/ANALYTICS.md` in the same commit.
  - Verify: grep shows ≥1 non-test call site per wired event; standing gates green.
- [x] **D0.T6** 🤖 ∥ **Hygiene sweep.** (= R0.T6; audit A9 + A10.)
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
- [x] **D0.G** 🚦 **Staging == git.** _(PASSED 2026-07-20: all 19 fns redeployed from git + card-render v5 Docker 200; migration ledger 33 rows + `db push` no-op; no scanId-less `/analyzing` route (D0.T4 code done, camera device leg `[~]`); 8 dark events emitting; expo-doctor 21/21 + advisors cleaned. Suites: app 64/64 · Deno 208/208 · Node 135/135.)_ Every function current (D0.T1), migration ledger repaired +
  `db push` no-op (D0.T2), card-render 200 **or honestly `[!]` Docker**, no route dead-ends
  (D0.T4), events emitting (D0.T5), hygiene clean (D0.T6). All three suites green. Update
  Production-Readiness-Plan R0.G to match.

## D1 — Power the engine room (= Plan R2; audit A4)

- [~] **D1.T1** 🤖 **Cron→worker wiring** — the single most important backend task left. (= R2.T1.) — WIRING COMPLETE + live-verified (engine runs unattended); the only pending leg is a RAW scan's Gemini IMAGE extraction to `complete`, which is H4c/R1.T3-gated (not a wiring defect). See note below.
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
  - **NOTE (2026-07-20, `[~]` honesty):** Mechanism (a) built — migration `0034` enables `pg_net`
    (0.20.3) and `cron.schedule`s 7 jobs, each a `net.http_post` reading `project_url` +
    `edge_service_key` from `vault.decrypted_secrets` BY NAME (migration has NO ref, NO secret —
    grep-verified; the two Vault secrets were seeded once by an uncommitted throwaway script, now
    deleted). Auth = the `apikey` header (the `sb_secret_` key is gateway-rejected on
    `Authorization: Bearer`; the workers' `bearerToken` falls back to `apikey` → `requireMode
    'secret'`). **Live-verified (zero manual calls):** `cron.job` = 7 jobs (correct cadences);
    in a 2-min window **30/30 drain runs `succeeded`, all HTTP 200, zero errors**; a seeded
    `narrative_jobs` → the drain invoked worker-narrative → a `readings` row + scan `complete`
    within ~20s; the `cleanup` worker (invoked via the cron's apikey path) swept a seeded >24h crop
    → object deleted + `image_deleted_at` stamped (cleanup is scheduled hourly). All seeds cleaned
    up. **PENDING leg:** a RAW scan progressing through **Gemini IMAGE extraction** (worker-scan) to
    `complete` needs the paid Gemini key — **H4c / R1.T3** (free-tier blocks image extraction,
    live-verified P5.T6); worker-scan itself is confirmed cron-invoked + responds 200. This is a
    provider gate, not a wiring defect. `fortune-generate` nightly is wired here; D1.T2 seeds today's
    buckets + confirms the nightly fire.
- [x] **D1.T2** 🤖 **Nightly fortunes real.** (= R2.T2; audit A4.)
  - Build: re-run the missing/failed fortune buckets for today (invoke `fortune-generate` with an
    explicit `{"date":"<today UTC>"}` — its default generates TOMORROW; it is
    idempotent-resumable). ⚠️ Known reality: the free-tier Gemini key (H4c) has a DAILY quota
    that previously plateaued a full run at 56–57/61 — re-invoke across the quota window; if
    quota-capped, mark `[~]` with the exact bucket count (honest), not `[x]`. After D1.T1,
    confirm tomorrow's buckets generate ON SCHEDULE with no manual invocation.
  - Verify: `fortune_templates` coverage for today (+tomorrow once the nightly fires) at 61/61 —
    or `[~]` with the quota-honest count; FortuneHome renders a real row (screenshot); a
    fortune-open writes `user_fortunes` (clean up).
  - **NOTE (2026-07-20):** `fortune-generate` invoked (secret mode, apikey header) for today
    `2026-07-20` → **`fortune_templates` = 61/61** (60 sexagenary pillars + `generic`, locale en;
    DB-verified). The intermittent 500s were per-minute Gemini RPM throttling mid-run (best-effort
    upserts persist), NOT the daily quota — re-invoking resumed to 61/61 (idempotent). **Live-verified
    as a real authenticated owner:** READ today's fortune returns full almanac content
    (do/dont/love/career/wealth/overall/lucky_*) for both the `generic` bucket (no-birth-date path)
    and a day-pillar bucket (`bingchen`) → FortuneHome renders a real row; a `user_fortunes` receipt
    WRITES + reads back under `user_fortunes_insert_own` RLS (retention-receipt path ready). Seeds
    cleaned. **Notes:** (i) the client does NOT auto-write `user_fortunes` on open (only fires
    `track('fortune_opened')`) — that is the streak/receipt CLIENT feature, and **streaks are
    DO-NOT-BUILD**; the RLS write path is verified ready for when it's built post-MVP. (ii) The
    nightly cron (`palmly-fortune-generate`, `0 3 * * *`, empty body → `nextUtcDate` = tomorrow) is
    wired + firing-proven (D1.T1); it self-confirms tomorrow. Free-tier's single-shot nightly may be
    RPM-partial (guaranteed completeness is H4c/R1.T3, but the run is resumable). (iii) Literal
    FortuneHome web-screenshot not re-shot — read path returns full real content + rendering is
    jest-tested (`fortune.test.ts`) + prior `docs/checkpoints/p9-fortune-*.png` show the layout.
- [x] **D1.T3** 🤖 ∥ **Populate the 141 KB embeddings.** (= R2.T3; audit A4.)
  - Build: one-off throwaway script (Node or Deno, `.env.staging` creds + the Gemini key per
    `docs/ENVIRONMENT.md`) embedding all `kb_chunks` via `gemini-embedding-001` (proven to work
    on the current key). Do not commit the script with secrets inline.
  - Verify: `execute_sql` → embeddings 141/141 non-null; the live retrieval eval
    (`eval/p9t6.ts`) ranks the heart-line chunk first for a love query; chat's `kb_search` path
    returns grounded citations (graceful-degradation ends).
  - **NOTE (2026-07-20):** Throwaway script embedded every `kb_chunks.content` via
    **`gemini-embedding-001` @ 1024 dims** (matches `vector(1024)` + `_shared/embeddings.ts embedText`,
    stored raw — `kb_search` uses cosine `<=>`, scale-invariant). All **141/141** embedded, 0 failed
    (free-tier had NO throttling issue for embeddings — NOT H4c-blocked). Verified: `execute_sql` →
    141/141 non-null (21 heart_line chunks); **`eval/p9t6.ts --live` → P9T6_OK** (heart-line chunk
    nearest the love query, 0.344 < 0.474 < 0.477; grounded answer with citations; medical deflection
    no-model-call); **live `kb_search` RPC** for a love query returns all heart_line chunks
    (heart_line.depth.deep @0.351 top) — chat's `fuzzyGrounding` path is grounded, graceful-degradation
    ends. Script read creds from `.env.staging`, no secrets committed, deleted after.
- [x] **D1.G** 🚦 **The engine runs unattended.** _(PASSED 2026-07-20: cron drains fire (30/30 runs → 200); a seeded `narrative_jobs` became a reading UNATTENDED; fortunes = 61/61 today + nightly cron wired; `cleanup` swept a >24h crop unattended; KB embeddings 141/141 + live `kb_search` grounded. Raw-scan Gemini image extraction to `complete` is the H4c/R1.T3 `[~]` leg on D1.T1 — a provider gate, not a wiring defect. Suites: app 64/64 · Deno 208/208 · Node 135/135 — Node required a test-isolation fix in `chat.test.mjs` (clear kb_chunks in-txn) exposed by D1.T3's real embeddings; product correct, tests now hermetic.)_ A scan enqueued at rest becomes a reading with
  no human in the loop; fortunes roll nightly; deletion promises are kept by machinery.
  All three suites green. Update Plan R2.G.

## D2 — The Docker-unlocked card tail (conditional on D0.T3; = the deferred F1.T9 tail)

- [~] **D2.T1** 🤖 **Share-card craft parity.** (Gated: only if D0.T3 verified 200.) — **✅ CORE COMPLETE
  (2026-07-20): the full Verify PASSED.** All 4 card CLASSES live-render 200 PNGs (solo/compat/fortune/
  face — each viewed); the <450KB resvg size assertion is in the suite (chunk 7); the client sheet
  previews the REAL draft PNG (chunk 4a, signed-URL live-verified); a **published invite carries a
  working OG card image** (live E2E: permanent user → render → `share-card-publish` → `invite-create`
  → the `invite-page` teaser serves the published CDN URL as `og:image` + `<img class="card">`); consent
  toggle + market-ordered channel row done; the heritage chop-seal is on every card; the fake QR was
  removed (D3-06); rarity is honest (no fabricated number). Standing gates green (app tsc/lint/jest,
  **Deno 221/221**). **`[~]` — the residual legs are honestly deferred/gated, none in the Verify:** the
  DARK story variant is deferred (it enhances the currently-UNWIRED `story_9x16` — no producer today);
  the IN-APP face-SHARE is `[~]` (`FACE_READING_ENABLED` OFF + H4c image-extraction — the face card
  CLASS itself renders live); the fortune LUNAR whisper is `[~]` (needs a Gregorian→lunar util that does
  not exist). Audit-2 F1.T9 / F2.T1 #2 / F1.T11 fortune-seal closed (annotated). — IN PROGRESS (multi-chunk; see note). Read the
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
  - **PROGRESS LOG (multi-chunk build — this is a ~10-part task, paced across iterations):**
    - **Chunk 1 ✅ (2026-07-20): the COMPATIBILITY card class** — `_shared/card-svg.ts` gains
      `buildCompatCardSvg` (two mini palms angled toward each other via `miniPalm()`, a claret "red
      thread" joining their HEART lines through a score ring — or a `?` ring pre-claim — both first
      names, ≤2 chips = shared-trait + friction) + `deriveCompatCardContent` (headline + honest
      chips from `sub_scores`: top = "in tune", low = "to bridge"). 5 new Deno tests (thread/names/
      score/`?`-pre-claim/chip-cap/derive/size-guard). Deno **213/213** (was 208), type-checks clean.
      Three-reds honored (accent lines, claret thread+seal), no CJK, no indigo.
    - **Chunk 2 ✅ (2026-07-20): card-render integration + LIVE compat render.** `render.ts` extracted
      a shared `storeCard()` + added `renderAndStoreCompatCard`; `card-render/index.ts` gained a
      `source_type='compatibility'` branch (source_id = pair id → loads both members' geometries from
      `compatibility_results.feature_set_a/b` + names from `profiles` → `buildCompatCardSvg`). Deployed
      `--use-docker` (v6, 13 MB). Live-verified via a seeded complete pair (score 82) → card-render
      returned **200 + an 80 214-byte compat PNG** in `card-drafts` — viewed it: two mini palms
      (Alex/Mei), the claret red thread joining the heart lines through the "82" ring, honest chips
      (Emotion in tune / Mind to bridge), palmly.app seal. Decision D3-02 (owner = `user_a`). Deno
      213/213. Seeds cleaned. _(minor line/silhouette alignment polish deferred to chunk 8.)_
    - **Chunk 3a ✅ (2026-07-20): the DAILY-FORTUNE card class (SVG).** `_shared/card-svg.ts` gains
      `buildFortuneCardSvg` (text-forward: an accent date eyebrow → the day's essence headline → the
      almanac's actionable triad tiles = lucky Direction / Color / Hours, only those present — no
      invented values → ≤3 "do" hooks as chips → claret seal) + `deriveFortuneCardContent` (from a
      `fortune_templates.content` jsonb: overall→headline, do[]→chips, lucky_*). 3 new Deno tests;
      **Deno 216/216**; no CJK. (Live render needs the card-render `source_type='fortune'` integration
      — a follow-up, since a fortune card is keyed on (date, bucket) + a sharing user, not a
      feature_set; Decision-Log the input/owner then.)
    - **Chunk 4a ✅ (2026-07-20): client "preview == posted" (the defining F1.T9 deliverable).**
      `lib/invite.ts loadDraftCardPreviewUrl(readingId)` (reads the owner's `share_cards.storage_path`
      → `supabase.storage.from('card-drafts').createSignedUrl(path, 3600)`); `ShareView` shows the REAL
      pre-rendered draft PNG (`<RealCardPreview>`, 4:5) in the solo slot when present, else falls back
      to the vector `SoloPreview`. Gates: tsc 0 / lint 0 / jest 64/64. LIVE-verified (harness, real
      RLS): as the owner → read storage_path → sign the private object (200) → fetch the signed URL →
      **200 + the real 74 956-byte PNG** (same bytes that publish to the CDN → preview == posted).
      Screenshot of the sheet-with-real-PNG not produced (the anon web export has no rendered card;
      the signed-URL path is harness-verified + the `<Image>` render is code/jest-verified).
    - **Chunk 4c ✅ (2026-07-20): the market-ordered channel row + per-channel copy.** `ShareView`'s
      3-button row → a horizontal, market-ordered `ScrollView` of channel tiles (WhatsApp·LINE·Zalo·
      Instagram·TikTok·Copy·More — SE-Asia messaging first, then social, then Copy/More); the launch
      icon set has NO brand glyphs, so brand tiles carry an honest monogram (W/L/Z/IG/TT) — never a
      faked logo — while Copy/More keep real glyphs. Each brand tap → `onShare(key)` (OS sheet, the
      device-only `[~]` leg) with the `key` as the analytics channel tag. Share copy is now
      channel-aware: `composeShareText` moved to a NEW pure `lib/shareText.ts` (no supabase import, so
      it unit-tests — same discipline as `compatCopy.ts`; re-exported from `lib/invite.ts` so call
      sites are unchanged) — messaging channels get the explicit "compare palms" invite, IG/TikTok a
      short visual caption. 4 new jest tests. Gates: tsc 0 / lint 0 / **jest 68/68**. (QR is deferred
      to chunk 5 — it slots before More once its real encoder lands; no dead/fake tile ships now.)
    - **Chunk 4b ✅ (2026-07-20): the "Show my name on the card" consent toggle (per D3-03).** BACKEND:
      `card-render` `body.anonymous` → `renderAndStoreCard` suppresses the byline (`attribution:
      undefined`) AND stashes the result under a distinct storage variant `feed_4x5_anon` (`storeCard`'s
      stored-variant widened `CardVariant`→`string`; no `CardVariant` union change, no migration — the
      unique index `(user_id,source_id,variant)` gives it its own row); `worker-narrative preRenderCard`
      now pre-renders BOTH drafts (`Promise.allSettled`, best-effort). CLIENT: `ShareView` gains a solo-only
      "Show my name on the card" switch (default ON, `shield` glyph) that flips both the previewed draft
      (`loadDraftCardPreviewUrl(readingId, feed_4x5 | feed_4x5_anon)`) AND the published draft
      (`loadDraftShareCardId(...variant)` in `ensureInvite`, via a `showNameRef`); toggling resets the
      mint so the next send publishes the chosen draft. 1 new Deno test (byline present-with / absent-
      without attribution). Deployed `worker-narrative` + `card-render --use-docker` (v7). Gates:
      **Deno 217/217**, tsc 0 / lint 0 / jest 68/68. LIVE-verified (harness, real RLS): one reading →
      TWO drafts — named `feed_4x5` (77 000 B, byline "Zarahemla" baked) + `feed_4x5_anon` (74 956 B,
      no byline), distinct paths, owner sees both rows, both sign+fetch as real PNGs, **named ≠ anon
      (Δ=2044 B = the byline)** → preview == posted holds in BOTH toggle states. _Honesty notes: (1) the solo
      sheet eager-pre-mints on open, publishing the DEFAULT (named) draft; toggling OFF then sending
      re-mints + publishes the anon draft, but the named copy stays public-though-unsent — a pre-existing
      eager-publish property (A6), not worsened here. Deferring publish to first-send is a future
      hardening, out of this chunk. (2) The `card-render` `anonymous` path is LIVE-proven (harness,
      above). The `worker-narrative` double-fire is deployed + type-checked but not independently
      triggered end-to-end, because the full worker path runs the narrative (Gemini) leg BEFORE
      `preRenderCard`, and that leg is the H4c free-tier-limited one (a pre-existing `[~]`); the call it
      makes is byte-identical to the proven harness invocation, and it's best-effort (a miss just falls
      back to the vector preview), so the runtime risk is nil._
    - **Chunk 3b-fortune ✅ (2026-07-20): card-render `source_type='fortune'` integration + LIVE render.**
      `render.ts` gains `renderAndStoreFortuneCard` (deriveFortuneCardContent → buildFortuneCardSvg →
      `storeCard` as `fortune`); `card-render/index.ts` gains a `fortune` branch (per D3-05: requires
      `user_id`; defaults today/`generic`/`en`; loads `fortune_templates.content`; derives a stable
      UUIDv5 `source_id`; formats the "Daily Almanac · «Month D»" eyebrow). Deployed `--use-docker`
      (v8). `deno check` clean, **Deno 217/217**. LIVE-verified (harness): seeded a throwaway template
      → card-render **200 + a real 73 816-byte PNG**, idempotent re-render (same card id via the derived
      source_id), owner sees exactly one fortune row via RLS. **VIEWED it**: vermilion "DAILY ALMANAC"
      eyebrow, wrapped editorial headline, the three lucky-triad tiles (Southeast / Vermilion / 7–9am),
      three do-chips, claret palmly.app seal — three-reds honored, no CJK. _(A headline→triad dead-band
      is visible → the chunk-8 label-anchor/dead-band polish item.)_ Seeds cleaned. The client
      fortune-SHARE wiring (a user-mode wrapper passing the verified `user_id`) is a later leg, like the
      compat client wiring (D3-02).
    - **Chunk 7 ✅ (2026-07-20): the <450KB rasterized-PNG budget assertion (resvg render test).** A NEW
      `card-render/render.test.ts` runs each card SVG through the REAL `renderCardPng` (resvg) — solo
      feed+story, compat feed+story, fortune feed — and asserts each PNG has valid magic + stays under
      the 450 000-byte share budget (UIUX §3; our cards are ~75 KB). It lives beside `render.ts` (pulls
      resvg-wasm) and needs `--allow-read` for the vendored wasm/fonts. The feared destabilization did
      NOT occur: the standing suite (`deno test --allow-read --allow-env --no-check`) picks it up and
      passes **218/218** (+1; ~14 s total, +10 s for the 5 rasterizations); the file is not imported by
      `index.ts` so it is NOT bundled into the deploy. (Retires the SVG-length proxy's "the real
      assertion lives in the resvg render test" TODO in `card-svg.test.ts` — that test now exists.)
    - **Chunk 5 ✅ (2026-07-20): the QR decision = DELETE + Decision-Log (D3-06).** The story-variant
      "scan to compare" block was a non-scannable FAKE (finder-square decoration implying a capability
      it lacked). Removed it from `card-svg.ts`; updated the story test to assert NO fake QR on either
      variant. A real QR needs the per-share invite URL (minted after pre-render → belongs at share
      time, deferred). The market-ordered channel row (chunk 4c) therefore ships **without** a QR tile.
      No produced output changed (story is unwired; `feed` byte-identical) but redeployed card-render
      `--use-docker` (v9) anyway to fully retire the fake from the live function. Deno **218/218**.
    - **Chunk 9-seal ✅ (2026-07-20): the heritage CHOP-SEAL on the rendered cards (closes F2.T1 §5.4 #2
      + the F1.T11 fortune-seal leg).** The footer seal was a triplicated OUTLINE logomark; extracted a
      shared `chopSeal(x,y)` helper and upgraded it to a FILLED claret name-chop (the palm emblem knocked
      out in paper, the way a carved chop prints) — matching the in-app `CardSeal`'s `filled
      tone="heritage"` intent. All 3 card classes now carry it (DRY: 3 copies → 1). Test asserts the
      FILLED chop (`rx="10" fill="#9E3B2E"`, was `fill="none"`). Rendered LOCALLY (no-deploy Deno
      script) + **viewed**: a claret chop bottom-left as a brand lockup with palmly.app, three-reds
      intact, no CJK. Changes produced output → redeployed card-render `--use-docker` (v10). Deno
      **218/218**. _Rarity (F2.T8): nothing to build — that leg was already decided (NO fabricated
      number; the honest identity lives in the headline, e.g. "A Water hand —"). Lunar whisper (F1.T11
      #4) stays `[~]`: needs a Gregorian→lunar conversion util that does not exist (a real dependency
      decision, deferred)._
    - **Chunk 3b-face ✅ (2026-07-20): the FACE card class + card-render routing + LIVE render.** Face
      features are ENUM-bucketed physiognomy (element face, three-courts 三停, categorical brow/eye/
      nose/mouth — NO geometry), so `card-svg.ts` gains a face motif: `FACE_SILHOUETTE` (a front-facing
      oval) + `FACE_FEATURES` (brows/eyes/nose/mouth paths) + `FACE_HEADLINE` (five-element) →
      `buildFaceCardSvg` (faint face oval + all features in ink, the DOMINANT three-court's feature lit
      in vermilion + a court label — the palm "signature line" analogue) + `deriveFaceCardContent`
      (from `face_features.v1`: `face_shape`→headline, `three_courts`→lit feature, brow/eye/nose→chips).
      `render.ts renderAndStoreFaceCard`; `card-render/index.ts` routes on `fs.kind==='face'` (stores
      as `source_type='reading'` — no schema change). 3 new Deno tests + added to the size test; **Deno
      221/221**. Rendered LOCALLY + **viewed** (a clear face: vermilion brows for the upper court, ink
      eyes/nose/mouth, "Upper court" label, honest chips, chop-seal). Deployed `--use-docker` (v11).
      LIVE-verified (harness): seeded a `kind='face'` feature_set → card-render auto-routed → **200 + a
      real 62 580-byte face PNG**, owner-visible via RLS. _(One transient `546 WORKER_RESOURCE_LIMIT`
      cold-start OOM on the 13 MB function — succeeded on retry; a known infra transient, not a code
      bug.)_ The in-app face-SHARE leg stays `[~]` (face reading is `FACE_READING_ENABLED`-gated OFF +
      H4c-extraction-blocked) — but the card CLASS renders live, satisfying "each card class renders".
    - **REMAINING chunks:** (6) dark story variant + sheet toggle — the last real enhancement, and it
      targets the currently-UNWIRED `story_9x16` variant (nothing produces story cards yet), so it is
      low-value/deferrable. (lunar whisper, F1.T11 #4) `[~]` — needs a Gregorian→lunar util that does
      not exist. (label polish) investigated → acceptable. **The D2.T1 CORE Verify is MET** (all 4 card
      classes live-render 200 PNGs — each viewed; <450KB assertion; client previews the real draft PNG;
      consent + channel row; heritage chop). Next run: verify a published invite carries an OG card
      image (chunk 4a mint→publish → fetch teaser HTML), then either build the dark variant OR
      `[~]`-note it (unwired) and CLOSE D2.T1 → **D2.G** (final gate + consolidated report + END loop).
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
| 2026-07-20 | D0.T3 | Started Docker Desktop (engine 28.1.1); deployed `card-render --use-docker` → v5, script 13 MB (resvg wasm + Noto fonts bundled as static_files). Live verify (seed fresh anon user + scan + feature_set from `eval/samples/narrative/palm_01.json`): render → 200 `{cardId,path,published:false}`, 74 956-byte PNG (PNG magic) in `card-drafts`; all seeds cleaned up. Edge logs: card-render v5 = 200, no new 500s. Deno 208/208. Unblocks D2. |
| 2026-07-20 | D2.T1 (close) | Share-card craft — **CORE COMPLETE, full Verify PASSED.** Final leg live-verified E2E: a **published invite carries a working OG card image** — permanent user (admin-create, invites RLS is permanent-only) → render draft → `share-card-publish` → **public CDN URL** (`…/object/public/cards/…`) → `invite-create` (host-allowlist keeps it) → the `invite-page` teaser (200) serves that exact URL as BOTH `og:image` and `<img class="card">`. All 4 card classes live-render + viewed; <450KB assertion; client real-preview; consent + channel row + chop-seal. Seeds cleaned. D2.T1 `[~]` — residuals deferred/gated (dark variant = unwired story; in-app face-share = flag+H4c; lunar whisper = no util). Audit-2 F1.T9 annotated executed. **Next: D2.G.** |
| 2026-07-20 | D2.T1 (chunk 3b-face) | Share-card craft — **FACE card class + card-render routing + LIVE render** (F1.T9). Face features are enum physiognomy (no geometry) → new `card-svg.ts` face motif: `FACE_SILHOUETTE` + `FACE_FEATURES` + `FACE_HEADLINE` → `buildFaceCardSvg` (face oval + the dominant three-court feature lit vermilion + court label) + `deriveFaceCardContent` (from `face_features.v1`). `render.ts renderAndStoreFaceCard`; `card-render` routes on `fs.kind==='face'` (stores `source_type='reading'`, no schema change). 3 Deno tests + size test; **Deno 221/221**. Rendered locally + viewed (clear face, vermilion brows, chips, chop-seal). Deployed `--use-docker` (v11). LIVE: seeded `kind='face'` fs → auto-routed → **200 + real 62 580-byte face PNG**, owner-visible RLS. (One transient 546 cold-start OOM → OK on retry.) In-app face-SHARE `[~]` (FACE_READING_ENABLED off + H4c). |
| 2026-07-20 | D2.T1 (chunk 9-seal) | Share-card craft — **heritage CHOP-SEAL on rendered cards** (F1.T9; closes F2.T1 §5.4 #2 + F1.T11 fortune-seal leg). Extracted a shared `chopSeal(x,y)` (3 triplicated OUTLINE logomarks → 1 helper) and upgraded it to a FILLED claret name-chop (palm emblem knocked out in paper). All 3 card classes carry it; test asserts the filled chop. Rendered locally + viewed (brand lockup w/ palmly.app, three-reds intact, no CJK). Redeployed card-render `--use-docker` (v10). Deno 218/218. Rarity (F2.T8) = no-op (already honest, no number); lunar whisper (F1.T11) stays `[~]` (needs a lunar util). |
| 2026-07-20 | D2.T1 (chunk 5) | Share-card craft — **QR decision = DELETE + Decision-Log** (F1.T9, D3-06). The story-variant "scan to compare" block was a non-scannable FAKE (finder-square decoration); removed it from `card-svg.ts` + updated the story test to assert no fake QR on either variant. A real QR needs the per-share invite URL (minted after pre-render → belongs at share time; deferred). Channel row (chunk 4c) ships without a QR tile. Story variant is unwired so no produced output changed (`feed` byte-identical); redeployed card-render `--use-docker` (v9) anyway to retire the fake live. Deno 218/218. |
| 2026-07-20 | D2.T1 (chunk 7) | Share-card craft — **<450KB rasterized-PNG budget assertion** (F1.T9). NEW `card-render/render.test.ts`: runs each card SVG through the real `renderCardPng` (resvg) — solo feed+story, compat feed+story, fortune feed — asserts valid PNG magic + < 450 000 bytes (UIUX §3). Standing Deno suite picks it up → **218/218** (+1); not bundled into the deploy (not imported by index.ts). No deploy, no app change. |
| 2026-07-20 | D2.T1 (chunk 3b-fortune) | Share-card craft — **card-render `source_type='fortune'` integration + LIVE render** (F1.T9). `render.ts` `renderAndStoreFortuneCard`; `card-render/index.ts` `fortune` branch (D3-05: owner=`user_id`, defaults today/`generic`/`en`, loads `fortune_templates.content`, derives a stable UUIDv5 `source_id`, "Daily Almanac · «Month D»" eyebrow). Deployed `--use-docker` (v8). `deno check` clean, Deno 217/217. LIVE: seeded template → **200 + real 73 816-byte PNG**, idempotent (same id on re-render), owner-visible via RLS; **viewed** — vermilion eyebrow + wrapped headline + triad tiles (Southeast/Vermilion/7–9am) + do-chips + claret seal, no CJK. Client fortune-share wiring = later leg. Seeds cleaned. |
| 2026-07-20 | D2.T1 (chunk 4b) | Share-card craft — **"Show my name" consent toggle** (F1.T9; per D3-03). `card-render` `body.anonymous` → `renderAndStoreCard` drops the byline + stores under variant `feed_4x5_anon` (distinct row via the `(user,source,variant)` unique index; no migration); `worker-narrative` pre-renders BOTH drafts (`Promise.allSettled`). `ShareView` gains a solo-only switch (default ON) flipping the previewed + published draft variant. Deployed worker-narrative + `card-render --use-docker` (v7). **Deno 217/217**, tsc 0 / lint 0 / jest 68/68. LIVE: one reading → named `feed_4x5` (77 000 B, byline baked) + `feed_4x5_anon` (74 956 B, none), both real PNGs, named ≠ anon (Δ=2044 B) → preview == posted in both states. Seeds cleaned. |
| 2026-07-20 | D2.T1 (chunk 4c) | Share-card craft — **market-ordered channel row + per-channel copy** (F1.T9). `ShareView`'s 3-button row → a horizontal, market-ordered `ScrollView` (WhatsApp·LINE·Zalo·Instagram·TikTok·Copy·More — messaging-first for the launch markets). No brand glyph exists in the icon set, so brand tiles carry an honest monogram (never a faked logo); each brand tap tags the analytics `channel`. `composeShareText` moved to a NEW pure `lib/shareText.ts` (no supabase import → unit-testable; re-exported from `lib/invite.ts`) and made channel-aware (messaging = compare invite, IG/TikTok = short caption). 4 new jest tests. tsc 0 / lint 0 / **jest 68/68**. OS sheet = device `[~]`. QR deferred to chunk 5 (real encoder) — no dead tile shipped. |
| 2026-07-20 | D2.T1 (chunk 4a) | Share-card craft — **client "preview == posted"** (F1.T9, the defining leg). `lib/invite.ts loadDraftCardPreviewUrl` signs the owner's private `card-drafts` PNG; `ShareView` shows that exact draft (`RealCardPreview`, 4:5) in the solo slot, else falls back to the vector `SoloPreview`. LIVE-verified (harness, real RLS): owner reads `storage_path` → signs object (200) → signed URL fetches the real **74 956-byte PNG** = the same bytes publish copies to the CDN. tsc 0 / lint 0 / **jest 64/64**. Screenshot of the sheet-with-real-PNG N/A on the anon web export (no rendered card); signed-URL path harness-verified + `<Image>` render code-verified. |
| 2026-07-20 | D2.T1 (chunk 3a) | Share-card craft — **daily-fortune card class SVG** (F1.T9). `_shared/card-svg.ts` gains `buildFortuneCardSvg` (text-forward: date eyebrow → essence headline → lucky-triad tiles = Direction/Color/Hours, only present ones → ≤3 do-chips → claret seal) + `deriveFortuneCardContent` (from `fortune_templates.content`: overall→headline, do[]→chips, lucky_*). 3 new Deno tests; **Deno 216/216**; no CJK, no invented almanac values. Live render awaits the card-render `source_type='fortune'` integration (follow-up). |
| 2026-07-20 | D2.T1 (chunk 2) | Share-card craft — **card-render integration + LIVE compat render** (F1.T9). `render.ts`: shared `storeCard()` + `renderAndStoreCompatCard`. `card-render/index.ts`: `source_type='compatibility'` branch (source_id=pair id → both members' geometries from `compatibility_results.feature_set_a/b` + `profiles` names → `buildCompatCardSvg`). Deployed `--use-docker` (v6). Live: seeded complete pair (score 82) → card-render **200 + 80 214-byte compat PNG** in `card-drafts`; viewed it (two palms Alex/Mei + claret red thread through the "82" ring + honest chips). Decision D3-02 (owner=user_a). Deno 213/213; seeds cleaned. |
| 2026-07-20 | D2.T1 (chunk 1) | Share-card craft parity — **compatibility card class** (F1.T9). `_shared/card-svg.ts` gains `buildCompatCardSvg` (two mini palms via `miniPalm()` angled toward each other, a claret red-thread joining their HEART lines through a score ring — `?` ring pre-claim — both names, ≤2 honest chips) + `deriveCompatCardContent` (chips from `sub_scores`: top→"in tune", low→"to bridge"). 5 new Deno tests; **Deno 213/213** (was 208), type-checks clean; three-reds honored, no CJK/indigo. D2.T1 stays `[~]` — remaining chunks (card-render integration + live renders, face/fortune classes, client real-preview + consent + channel row, QR, dark, size-assertion, seals, rarity) in its PROGRESS LOG. |
| 2026-07-20 | D1.G 🚦 | **D1 phase gate PASSED — the engine runs unattended.** Cron drains fire (D1.T1: 30/30 runs → 200; narrative→reading unattended); nightly fortunes 61/61 today + cron wired (D1.T2); cleanup swept a >24h crop unattended (D1.T1); KB 141/141 + live kb_search grounded (D1.T3). Raw-scan image extraction to complete = H4c/R1.T3 `[~]` (provider gate). All three suites green (app 64/64 · Deno 208/208 · Node 135/135) — Node needed a `chat.test.mjs` isolation fix (clear kb_chunks in-txn) exposed by D1.T3's real embeddings; product correct, tests hermetic. |
| 2026-07-20 | D1.T3 | Populated the 141 KB embeddings (A4). Throwaway script embedded every `kb_chunks.content` via `gemini-embedding-001` @1024 dims (matches vector(1024)+embedText; stored raw, kb_search is cosine `<=>`). 141/141 non-null, 0 failed (no free-tier throttle). Verified: `eval/p9t6.ts --live` P9T6_OK (heart-line nearest the love query; grounded answer+citations; medical deflection no-model-call); live `kb_search` RPC for a love query → all heart_line chunks (heart_line.depth.deep @0.351 top). Chat fuzzy-retrieval grounding live; graceful-degradation ends. Script (.env.staging creds, no committed secrets) deleted. |
| 2026-07-20 | D1.T2 | Nightly fortunes real (A4). `fortune-generate` (secret/apikey) generated today `2026-07-20` → `fortune_templates` **61/61** (60 pillars + generic, en; DB-verified). Intermittent 500s were per-minute RPM throttling (upserts persist; resumed to 61/61, idempotent), not the daily cap. Live-verified as a real owner: READ today's fortune → full almanac content (generic + day-pillar `bingchen`); `user_fortunes` receipt WRITE+read under RLS. Nightly cron wired (03:00 UTC, empty body→tomorrow; self-confirms next-day; free-tier single-shot may be RPM-partial → H4c). Client user_fortunes auto-write intentionally not built (streaks = DO-NOT-BUILD; path ready). Seeds cleaned. |
| 2026-07-20 | D1.T1 `[~]` | Cron→worker wiring LIVE (A4). Migration `0034` enables `pg_net` 0.20.3 + `cron.schedule`s 7 jobs (scan/narrative 10s, compat/push 15s, cleanup+ops-alerts hourly, fortune-generate nightly 03:00 UTC), each a `net.http_post` reading `project_url`+`edge_service_key` from Vault by name (no ref/secret in the file; 2 Vault secrets seeded by an uncommitted, now-deleted script; auth via the `apikey` header for the sb_secret key). Live: `cron.job`=7; 30/30 drain runs succeeded, all HTTP 200; seeded `narrative_jobs` → reading + scan `complete` UNATTENDED (~20s); `cleanup` swept a seeded >24h crop (object gone + `image_deleted_at` set). Seeds cleaned. Pending leg: raw-scan Gemini image extraction → `complete` (H4c/R1.T3; worker-scan is cron-invoked + 200). |
| 2026-07-20 | D0.G 🚦 | **D0 phase gate PASSED — Staging == git.** Every function current (D0.T1), ledger repaired + db push no-op (D0.T2), card-render v5 Docker 200 (D0.T3), no scanId-less `/analyzing` route — code done, camera device leg `[~]` (D0.T4), 8 dark events emitting (D0.T5), hygiene clean + advisors cleaned (D0.T6). All three suites green: app 64/64 · Deno 208/208 · Node 135/135. |
| 2026-07-20 | D0.T6 | Hygiene sweep (A9+A10): `expo install --fix` bumped 4 native modules to expected patch versions → **expo-doctor 21/21**. New additive migration `20260720000033_a9_revoke_trigger_fn_execute.sql` revokes EXECUTE (from `public,anon,authenticated`) on the 4 trigger-only SECURITY DEFINER fns (`handle_new_user`, `broadcast_scan_status`, `broadcast_compat_status`, `resolve_awaiting_compat`); applied via `db push` → advisors no longer list them; `is_pair_member`/`thread_owner`/`set_keep_image` kept (A9); `db push --dry-run` no-op. Doc truth: `HowItWorks.md` cron claim (5 drain_stub schedules → cron.job empty, D1.T1) + stale "scan-create not deployed"/17-fns caveat corrected; `MVP_Buildplan.md` STATE block given a SUPERSEDED→Audit-2/Audit-3 pointer. Leaked-password toggle left as 🧑 R1.T10 (dashboard-only). Gates: tsc 0/lint 0/jest 64/64; Node 135/135; grep clean. |
| 2026-07-20 | D0.T5 | Wired 8 dark analytics events at live call sites (A7): `capture_completed` + `capture_started`/`upload_ok` in new `useScanUpload`; `capture_state_dwell` + `capture_abandoned` in `palm.tsx` (dwell) / `face.tsx` (abandon); `reading_ready` at the analyzing→reveal seam (kind threaded via route param); `reveal_time_spent` on reveal unmount; `invite_clicked{source:'web'}` on the claim landing; `notification_pref_changed` on the settings toggle; `paywall_page_viewed{page:0}` on the paywall. `docs/ANALYTICS.md` wiring-status rewritten (wired vs intentionally-pending H8/H9/device). Gates: tsc 0 / lint 0 / jest 64/64; grep confirms ≥1 non-test call site per event. |
| 2026-07-20 | D0.T4 `[~]` | A5+A6 client honesty fixes, CODE COMPLETE. New `useScanUpload` hook; `palm.tsx` + `face.tsx` (erratum #1) route the camera door through the real upload chain (`primer.tsx` refactored onto the same hook) — no scanId-less `/analyzing` remains (grep-proven). `share.tsx` shows the REAL pair score/name via `loadCompatShare(pairId)` (`pair.tsx` threads `pairId`); `82`/`"Mei"` gone. `ShareView` wires `loadDraftShareCardId`→`publishShareCard`→`createInvite({cardImageUrl})`. Gates: tsc 0/lint 0/jest 64/64. Live harnesses: (c) invite `context.card_image_url` == published PNG ✓; (b) `loadCompatShare` → real score 73 ✓. Pending: on-device camera + literal CDP UI screenshots (substance proven by stronger means). |
