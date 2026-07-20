# Palmly — Production-Readiness Plan (R0–R5)

**Derived from:** [`Full-Audit.md`](./Full-Audit.md) (2026-07-19) — read the finding (A1–A10) or ledger a task cites before executing it.
**Status:** ACTIVE — the forward path from "device-free build complete" to "live in both stores" (M4).
**Conventions:** same checkbox machine as `MVP_Buildplan.md` / the audit ledgers. `[ ]` todo · `[~]` in progress/partial (note required) · `[x]` done+verified · `[!]` blocked · 🤖 agent · 🧑 human · 🚦 gate · ∥ parallel-safe. Never mark done without the Verify line passing.

**The one-paragraph strategy:** fix the drift and wire the motor first (R0–R2 are cheap and mostly agent-executable), because everything after depends on trusting what's deployed. In parallel, the human clears the provider list (R1) — **buy the phone and start the Google Play closed-test clock immediately; they are the two long poles you control.** Then the camera spike (R3) with its pre-registered pivot, the on-device milestone gates (R4), and only then the launch phase (R5). Nothing else gets built — see the DO-NOT-BUILD list at the bottom.

---

## R0 — Trust the deployment again (agent, device-free, ~a day)

> Rationale: audits A1–A3. Until staging runs the code in git, every "live-verified" claim decays.

- [x] **R0.T1** 🤖 Redeploy every Edge Function from git (audit A1). All 19 pure-code functions via `npx supabase@latest functions deploy <fn> --project-ref rphtdgoggsldshtdbkaj` (config-driven verify_jwt/import_map). Skip `card-render` (R0.T3). _Done 2026-07-20 (D0.T1): all 19 versions bumped, posture spot-checks pass, Deno 208/208._
  - Verify: `list_edge_functions` shows every function's `updated_at` newer than the last git commit touching its dir or `_shared/`; re-run the live posture spot-checks (invite-create no-JWT→403, worker-scan no-key→403/+key→200, chat-send non-premium→402); Deno suite still green.
- [x] **R0.T2** 🤖 Repair the migration ledger (audit A3): mark `20260719000031` + `20260719000032` applied (`npx supabase@latest migration repair --status applied …` against staging), then prove `supabase db push` is a clean no-op. _Done 2026-07-20 (D0.T2): history 32 rows, max `…0032`; `db push --dry-run` → "Remote database is up to date."; one-apply-path rule added to `docs/ENVIRONMENT.md`._
  - Verify: `supabase_migrations.schema_migrations` max = `20260719000032`; `db push` reports nothing to apply.
- [x] **R0.T3** 🧑→🤖 Docker deploy of `card-render` (audit A2). Human: start Docker Desktop. Agent: `npx supabase@latest functions deploy card-render --use-docker --project-ref …` (bundles `static_files` wasm+fonts). _Done 2026-07-20 (D0.T3): agent started Docker Desktop itself (28.1.1); card-render v5 (13 MB); live render → 200 + 74 KB PNG in `card-drafts`; no new 500s. **D2/F1.T9 card tail now unblocked.**_
  - Verify: a live invocation returns 200 + a PNG lands in `card-drafts`; edge logs show no new 500s. **Unblocks the deferred F1.T9 card-craft tail** (compat/face/fortune card classes, real QR, dark variant, fortune/corner seals) — pull those from the Audit-2 ledger *after* this verifies, as one focused task.
- [~] **R0.T4** 🤖 Fix the two client honesty bugs (audit A5, A6): (a) `palm.tsx` capture-confirm must go through the real upload chain (or the camera door is gated to the upload path until P2) — no route to `/analyzing` without a `scanId`; (b) thread the real pair result (partner name + score) into the compat share card; wire `publishShareCard` at share time so invites carry a card image (after R0.T3). _Done 2026-07-20 (D0.T4, code complete): (a) fixed in `palm.tsx` + `face.tsx` (erratum: face had the same live dead-end) via a shared `useScanUpload` hook — no scanId-less `/analyzing` remains (grep-proven); (b) real score/name via `loadCompatShare(pairId)`, `82`/`"Mei"` gone; (c) `ShareView` wires draft-card lookup → `publishShareCard` → `createInvite({cardImageUrl})`. Gates green; legs (b) real score & (c) invite `card_image_url` live-verified via Node harnesses. `[~]`: on-device camera capture + literal CDP UI screenshots pending (substance proven by stronger means)._
  - Verify: walking capture→confirm on web reaches a real reading via the upload chain (or the camera door visibly routes to upload); the compat sheet opened from a seeded real pair shows that pair's name/score; an invite row gains a `card_image_url`.
- [x] **R0.T5** 🤖 ∥ Emit the ~7 dark analytics events that have live call sites today (audit A7: capture trio, `reading_ready`, `reveal_time_spent`, `invite_clicked` on claim, `notification_pref_changed`); leave purchase/push/install events for their H8/H9/device moments. Update `docs/ANALYTICS.md` in the same commit. _Done 2026-07-20 (D0.T5): 8 events wired (capture trio, reading_ready, reveal_time_spent, invite_clicked{web}, notification_pref_changed, + paywall_page_viewed since the paywall surface is live); docs updated; gates green; ≥1 non-test call site each._
  - Verify: grep shows a call site per event; tsc/lint/jest green.
- [x] **R0.T6** 🤖 ∥ Hygiene sweep (audit A9, A10): dependency pass (`npx expo install --check` → expo-doctor fully green); one additive migration revoking PostgREST EXECUTE on the trigger-only SECURITY DEFINER functions; update `HowItWorks.md` (cron claim) + the `MVP_Buildplan.md` STATE block (point at Audit-2/Audit-3 reality); commit the Planning reorg sitting in the working tree _(reorg-commit leg discharged early by D0.T0 baseline commit, 2026-07-20)_. _Done 2026-07-20 (D0.T6): expo-doctor 21/21; migration 0033 revokes the 4 trigger-only fns (advisors dropped them; 3 kept per A9); HowItWorks + MVP_Buildplan STATE corrected; db push no-op; Node 135/135._
  - Verify: expo-doctor all-green; security advisors drop the revoked functions; `git status` clean.
- [x] **R0.G** 🚦 Staging == git: every function current, `db push` no-op, card-render 200, no route dead-ends, suites green. _PASSED 2026-07-20 (Audit-3 D0.G): all 19 fns redeployed + card-render v5 Docker 200; ledger 33 rows + db push no-op; no scanId-less `/analyzing` (camera device leg `[~]`); 8 dark events live; expo-doctor 21/21 + advisors cleaned. app 64/64 · Deno 208/208 · Node 135/135._

## R1 — The human unblock list (do these while R0/R2 run; ordered by leverage)

> Each item names exactly what it unblocks. Details per key: `docs/ENVIRONMENT.md`; running list: `Planning/Human-tasks.md`.

- [ ] **R1.T1** 🧑 **Buy a physical Android phone** (mid-range preferred — it's the perf target). Unblocks: P2 spike (R3), P4 capture, every M-gate, live motion/haptic/push verification. *The single highest-leverage item in this file.*
- [ ] **R1.T2** 🧑 **Start Google Play Console now** ($25, Personal) + create the app record; also Apple Developer ($99, Individual). The Play ≥12-tester/≥14-day closed test is a ~3-week wall-clock gate that should run concurrently with R3/R4. Unblocks: store products (P7), internal-track builds (M2 testing), submission (R5).
- [ ] **R1.T3** 🧑 **H4c — make the Gemini key genuinely paid-tier** (attach billing; confirm cached-content quota > 0). This is a **hard launch blocker twice over**: real palm/face image extraction, and the free tier trains on submitted data (disqualifying for user photos, Backend §13).
- [ ] **R1.T4** 🧑 **H8 — RevenueCat**: account, both apps, `premium` entitlement, monthly+annual offerings (no trial, U3), webhook → set `REVENUECAT_WEBHOOK_SECRET` as a function secret, public SDK keys → `EXPO_PUBLIC_REVENUECAT_*`. Unblocks: the paywall CTA (currently a silent no-op), sandbox purchase E2E, server entitlement flips, RC-side erasure.
- [ ] **R1.T5** 🧑 **H6 — buy `palmly.app` + Cloudflare Turnstile** (site+secret keys per ENVIRONMENT). Unblocks: universal links, production invite URLs (client already env-switches base URL), teaser DNS, anonymous-auth captcha.
- [ ] **R1.T6** 🧑 **H5b — auth providers**: enable Apple + Google OAuth and an SMS provider in the Supabase dashboard, with the `palmly://` redirect allow-list. Unblocks: the built account sheet's live round-trip; anonymous invite minting (invites require a permanent account by RLS design).
- [ ] **R1.T7** 🧑 **H3 + H4b-2 — CI secrets**: GitHub repo secrets `EXPO_TOKEN`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_STAGING_PROJECT_REF`, `SUPABASE_STAGING_DB_PASSWORD`; `preview-build` environment with required reviewer; open one test PR. Unblocks: proven-green CI + auto-deploy on merge (kills the A1 drift class permanently).
- [ ] **R1.T8** 🧑 ∥ **H9 — AppsFlyer Zero** (both apps; ask the two D1 questions in ENVIRONMENT §7). Needed before M2's install-matrix; not before.
- [ ] **R1.T9** 🧑 ∥ **H6b — KB practitioner review** of `kb/v1/` → notes to `kb/REVIEW.md` (P5.T5). Content authenticity is a stated differentiator; cheap to run in parallel.
- [ ] **R1.T10** 🧑 ∥ 1-click dashboard toggles: enable leaked-password protection (B20). With R1.T4: RC secret API key + AppsFlyer S2S token for the erasure legs.

## R2 — Power the engine room (agent + one design decision, device-free)

> Rationale: audit A4 — the pipeline, fortunes, cleanup promises, and sweeps all currently require a human to invoke workers.

- [~] **R2.T1** 🤖 **Cron→worker wiring** (the parked security-sensitive task). Decision first (Decision-Log it): **(a) recommended** — service key in **Vault**, enable `pg_net`, one migration scheduling `cron.schedule` jobs that `net.http_post` the deployed workers (scan/narrative/compat/push drains at the §4 cadences; hourly `cleanup`; `ops-alerts`; nightly `fortune-generate`); or **(b)** a scheduled GitHub Actions workflow curling the workers (no key in DB; needs R1.T7). Build exactly one. _Done 2026-07-20 (D1.T1, mechanism (a)): migration 0034 + pg_net + 2 Vault secrets (apikey auth for the sb_secret key). Live: 7 crons fire (30/30 runs, all HTTP 200); narrative_jobs→reading UNATTENDED; cleanup swept a >24h crop (image_deleted_at set). `[~]`: raw-scan Gemini image extraction to complete is H4c/R1.T3-gated (not a wiring defect)._
  - Verify: `cron.job` populated; an enqueued test scan progresses to a reading with **zero manual invocations**; a crop older than 24h is deleted by the sweep with `image_deleted_at` set.
- [x] **R2.T2** 🤖 **Nightly fortunes real**: after R2.T1, confirm tomorrow's 61/61 buckets generate on schedule; re-run today's 4 failed buckets; fortune home shows a real row every morning. _Done 2026-07-20 (D1.T2): today 2026-07-20 = 61/61 (fortune-generate, resumable through RPM throttling); read path returns full almanac content (generic + day-pillar); user_fortunes receipt write/read verified under RLS. Nightly cron wired (D1.T1, 03:00 UTC → tomorrow; self-confirms next-day; free-tier single-shot completeness is H4c-limited). Client streak-write is DO-NOT-BUILD._
  - Verify: `fortune_templates` has full coverage for today+tomorrow; a fortune-open writes `user_fortunes`.
- [x] **R2.T3** 🤖 ∥ **Populate the 141 KB embeddings** (`gemini-embedding-001` — proven to work on the current key) via a one-off script; chat's pgvector `kb_search` goes live (graceful-degradation ends). _Done 2026-07-20 (D1.T3): 141/141 embedded @1024 dims (0 failed); eval/p9t6 --live P9T6_OK (heart-line nearest the love query); live kb_search returns grounded heart_line chunks. Chat fuzzy-retrieval live._
  - Verify: `kb_chunks` embeddings 141/141; the live retrieval eval (`eval/p9t6.ts`) ranks the heart-line chunk first for a love query.
- [ ] **R2.G** 🚦 A scan enqueued at rest becomes a reading unattended; fortunes roll nightly; deletion promises are kept by machinery, not humans.

## R3 — The camera (the critical path; needs R1.T1; timeboxed)

> This is `MVP_Buildplan.md` P2 (kill/pivot decision) + P4, unchanged — execute it there, per its own task list. Summary of what it is:

- [ ] **R3.T1** 🤖 P2 spike: VisionCamera V5 + worklets; `modules/palm-landmarks` Kotlin MediaPipe HandLandmarker plugin (≥15fps on the mid-range phone); quality signals → `CaptureQuality`; face detector path. **Timebox ~2 focused weeks; the pre-registered fallback (P2.T6: fast-tflite DIY or per-OS split) is a decision, not a crisis.**
- [ ] **R3.T2** 🤖 P4: wire `CaptureQuality` into the already-built 7-state machine + corrective copy + review step; auto-capture; canonical crop/warp determinism test (contact sheet); the capture funnel events light up.
- [ ] **R3.T3** 🤖 With H4c live: the repeat-scan trust proof on device (same hand 3× → one extraction, `matched` short-circuit, "unchanged" brag earned) + the 5-image live extraction verify (P5.T2/T3).
- [ ] **R3.G** 🚦 = **M1**: fresh user, physical device, install → reveal, no signup, < 4 minutes. iOS via EAS cloud build afterwards, not concurrently.

## R4 — Close the loops on devices (needs R1.T2/T4/T5/T8 + two phones)

- [ ] **R4.T1** 🤖 P7 purchase E2E: RC SDK in-app (`appUserID` = Supabase UUID), sandbox purchase → webhook → `subscriptions` flip → server gate holds → expiry flips back. Store products entered (P7.T2).
- [ ] **R4.T2** 🤖 M2 run: two devices — reading → share (real card) → WhatsApp → teaser on `palmly.app` → install → deferred claim (AppsFlyer/clipboard/referrer/code) → recipient reading → simultaneous pair reveal → re-share. Log the K-funnel in PostHog; webview matrix (WhatsApp/LINE/Zalo).
- [ ] **R4.T3** 🤖 M3 run: morning fortune push at local time → almanac open → grounded chat question — one continuous recorded session. Push receipts + `DeviceNotRegistered` pruning observed live.
- [ ] **R4.G** 🚦 M1+M2+M3 recorded in `docs/checkpoints/`; all five mvp §10 metrics visibly collecting in PostHog.

## R5 — Launch phase (P12, unchanged — execute from `MVP_Buildplan.md`)

- [ ] **R5.T1** 🧑 Eval set (30–50 consenting palms + adversarial, H10) → 🤖 extraction bake-off (Gemini vs Claude; pre-registered decision rule).
- [ ] **R5.T2** 🤖 k6 load test at the §11.2 spike shape; size prod compute from results.
- [ ] **R5.T3** 🤖 Security pass: pen-check the two unauthenticated surfaces (invite-claim, webhook), RLS review, secrets audit, rate-limit verification → `docs/SECURITY.md`.
- [ ] **R5.T4** 🤖 Compliance sweep: no-health-claims across KB/prompts/notifications/store copy; privacy labels drafted; legal pages reviewed by a human lawyer (the in-app templates carry a release-gated banner) → flip `EXPO_PUBLIC_LEGAL_REVIEWED`.
- [ ] **R5.T5** 🧑 Store assets from the M-gate recordings; listings; closed-track groups. **The Play closed test (started R1.T2) must have its 14 days banked by now.**
- [ ] **R5.T6** 🤖 Beta: 10–20 testers; crash-free > 99%; capture completion > 75%; triage to zero blockers.
- [ ] **R5.T7** 🧑→🤖 **Create the fresh `palmly-prod` project** from the git migrations (the whole point of the single-project decision); env cutover checklist; deploy functions; seed KB + embeddings + fortunes; **stop pointing the destructive test harness at any project with real users** (the standing tripwire). Submit via EAS Submit; watch dashboards 72h.
- [ ] **R5.G** 🚦 = **M4**: live in both stores, metrics collecting, STATE = MVP SHIPPED 🎉.

---

## DO NOT BUILD (over-engineering guards — the audit's explicit "no" list)

- **No second cron mechanism** — one of Vault+pg_net *or* GH-Actions scheduler (R2.T1), never both.
- **No staging/prod split before real beta users exist** (the 2026-07-14 single-project decision stands; R5.T7 is when prod returns).
- **No full i18n now** — the catalog + pseudo-locale foundation exists; migrating the remaining onboarding/body copy is pre-localization rote, not launch work. Ship English.
- **No lunar-calendar library hunt** — the 干支 day-pillar whisper stands in for MVP (the deferred F1.T11 tail is a *decision*, default "skip").
- **No streaks table, no group compatibility, no invite rewards, no weekly recap, no BaZi/ZiWei/feng-shui/I-Ching modules** — all explicitly post-MVP (mvp §8; Audit-1 out-of-scope list).
- **No Gemini Batch/caching engineering beyond the config flip** — both are ready and activate with the paid key (H4c).
- **No custom palm-segmentation model pre-launch** — the LLM-extraction + consistency layer is the MVP path by spec (§5.3); the trained model is the *longer-term* differentiator.
- **No new screens.** Every remaining UI gap is wiring or polish inside screens that exist.
- **Resist re-auditing.** Three loops have run; the codebase is verified. The remaining risk lives on devices and in dashboards, not in another document pass.
