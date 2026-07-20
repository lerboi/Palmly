# Palmly — Full Audit (Audit-3)

**Date:** 2026-07-19
**Scope:** the entire product — planning docs vs code vs live staging. Backend (migrations, Edge Functions, queues, RLS, storage), frontend (every production route + wiring), the deployed state of `palmly-staging` (`rphtdgoggsldshtdbkaj`), all three test suites, and the residual tails of the two prior audits.
**Method:** read all planning/spec/ledger docs (MVP_Buildplan, mvp_spec, Backend-specs, UIUX docs, Audit-1 B0–B22 ledger, Audit-2 F0–F2 ledger, Human-tasks, ENVIRONMENT); ran the three suites live; queried staging via the read-only Supabase MCP (tables, row counts, migrations, functions, cron, advisors, storage, edge logs); computed git-vs-deployed drift per function; and ran an independent code-verification pass over every production route in `app/src` (file:line evidence, not ledger claims).
**Honest caveats:** no device was available — everything camera/haptics/purchase/push-delivery remains device-pending exactly as the prior ledgers say. All cites were verified 2026-07-19; the repo is the authority on *where* things live if the tree moves.

---

## 1. Understanding check — what Palmly is and how it's meant to be built

Palmly is an Expo/React Native (SDK 56) + Supabase app that reads a user's **palm (手相)** and **face (面相)** from photos, with Chinese metaphysical tradition as the primary framework. Entertainment/reflection positioning; strictly no health/medical/financial claims (App Review + ethics). Three machines, deliberately separate:

1. **P1 — the trustworthy reading:** guided on-device capture (MediaPipe landmarks) → canonical crop → Gemini feature extraction (enum-schema, deterministic) → subject-matching consistency layer (repeat scans reuse the canonical feature set) → KB-grounded narrative where **claims are deterministic code and only prose is the model**.
2. **P2 — the viral loop:** every reading yields a branded share card built from the user's own traced lines; invite → SSR teaser (`invite-page`) → install → deferred claim → the friend's own reading → a simultaneous two-sided pair reveal → both re-share. K > 0 is the win condition.
3. **P3 — retention:** daily almanac fortune (60 sexagenary day-pillar buckets + generic), grounded premium chat with pre-model deflection, history. Monetization: generous free tier; monthly+annual subscriptions, no trial, via RevenueCat.

The build is governed by `Planning/MVP_Buildplan.md` (P0–P12 checkbox state machine, milestones M0–M4) plus two completed audit-fix ledgers (Audit-1 backend B0–B22; Audit-2 frontend F0–F2). Single Supabase project pre-launch (prod recreated from git migrations at P12); expand-contract migrations; versioned prompts/KB/schemas.

## 2. Executive verdict

**The device-free build is genuinely done, and it is good.** Three audit loops (backend, frontend, and the redesign before them) have run to completion, and this audit **independently re-verified** their central claims: all three suites are green today (app tsc 0 / lint 0 / **jest 64/64**; **Deno 208/208**; **Node 135/135** against the live deployed schema), production routes are fixture-free and wired to real staging reads/writes, and the recipient door + pair Realtime + account linking + consent + privacy deletion flows exist in code and were live-exercised (edge logs show the full scan-create → scan-ingest → worker-scan → worker-narrative → 200 chain, real 402 entitlement gates, real invite mint/claim, live image/account deletion).

**What separates today from production is no longer "write the app" — it is four specific walls:**

1. **The camera.** P2 (VisionCamera + MediaPipe native module) has literally not started — `modules/palm-landmarks/` contains only a README, and no camera dependency is installed. This is the plan's own declared #1 project risk with a kill/pivot timebox, and it gates M1 (first reading on a device), all of P4, and every store screenshot. **It needs a physical Android phone (the #1 human unblock).**
2. **Deploy/config drift + the unpowered engine room.** ~10 of 20 deployed Edge Functions run stale 2026-07-14 bundles that predate the backend-audit fixes; `card-render` is live-broken (500 on every call since the API-based redeploy dropped its wasm/fonts — needs a Docker deploy); staging's migration ledger is 2 behind the repo (0031/0032 applied out-of-band → the next `db push` collides); `cron.job` is empty by deliberate security-parking, so nothing auto-drains, fortunes exist only for 2026-07-18 (57/61 buckets), and KB embeddings are still 0.
3. **Provider config only a human can do.** RevenueCat (purchase is a silent no-op today), paid-tier Gemini (image extraction + a hard data-training compliance blocker), the `palmly.app` domain + Turnstile, Apple/Google/SMS auth providers, store accounts (Google Play's ≥12-tester/≥14-day closed-test gate makes this urgent), AppsFlyer, CI secrets.
4. **The launch phase itself.** P12 has not started: extraction eval set + bake-off, load test, security pen-pass on the two unauthenticated surfaces, compliance/label sweep, store assets, beta cycle, prod-project creation.

Nothing found in this audit contradicts the architecture or requires rework. The residual defects found today (§4) are small and mostly wiring-level; the honest overall state is: **a launch-grade backend and a wired, polished client, idling without a motor (cron), a camera, or a cash register.**

## 3. Verification record (2026-07-19)

| Check | Result |
|---|---|
| App gates (`app/`) | `tsc --noEmit` 0 · `expo lint` 0 · jest **64/64** (12 suites) |
| Edge functions (`supabase/functions`) | Deno **208/208** (incl. verify_jwt posture tests) |
| DB/schema/RLS (`supabase/tests`) | Node **135/135** vs live staging in rolled-back txns (~4.6 min) |
| `expo-doctor` | **1 check fails** — 5 packages a patch behind (known errata #4; hygiene pass owed) |
| Migrations | Repo **32**; staging ledger records **30** (see A3) |
| Edge Functions deployed | **20** ACTIVE; verify_jwt matrix matches `config.toml` (10 user-mode `true`, 10 worker/public `false`); stale `hello` gone; `image-delete` deployed ✓ |
| Live rows | profiles **145** (auth.users 146 — one benign pre-trigger orphan) · kb_chunks **141** (embeddings **0**) · fortune_templates **57** (one day: 2026-07-18) · scans/readings/invites/devices/share_cards/subscriptions **0** (test data cleaned) · worker_telemetry 8 · **cron.job 0** |
| Storage | `scans` (private) · `cards` (public, published-only by design) · `card-drafts` (private) ✓ |
| Edge logs (24h) | scan-create/ingest/worker-scan/worker-narrative/invite-create/claim/chat-send/compat-request/account-delete/image-delete all 200/402 as designed; **card-render 500 on every call since v2** (v1 was 200) |
| Deep-link config | `scheme: palmly`, `associatedDomains: applinks:palmly.app`, Android intentFilters `/i` — pre-wired, dormant until H6 ✓ |
| Screenshot evidence | 73 entries under `docs/checkpoints/audit2/` incl. live-pipeline captures ✓ |
| Advisors (security) | No criticals. WARNs: SECURITY DEFINER fns callable via PostgREST RPC (A9); leaked-password protection off (known 🧑 toggle); expected anon-access policies (anonymous-first product); INFO deny-all RLS tables (by design) |

## 4. Findings — new in this audit

Severity: 🔴 blocks launch · 🟠 blocks beta / high · 🟡 medium · ⚪ low/hygiene.

### A1 🟠 Edge-function deploy drift: ~10 functions run pre-audit-fix bundles
`worker-scan`, `worker-narrative`, `push-dispatch`, `cleanup`, `fortune-generate`, `revenuecat-webhook`, `account-merge`, `account-delete`, `compat-request`, `chat-send` were deployed **2026-07-14** and their code (or `_shared/`) changed in git on **2026-07-17** (backend-audit fixes B0–B22 — the Audit-1 ledger's own D-24 warned "none of this is deployed"). Concretely user-facing: the deployed `chat-send` v2 lacks the rate-limit, the history-window fix, and citations-at-rest. `ops-alerts` (bundled 07-14) may also carry stale `_shared`. **Fix:** one redeploy-from-git pass over all functions (except `card-render` — see A2), then re-run the live posture checks. Cheap, mechanical, high-value.

### A2 🟠 `card-render` is live-broken (500 on every invocation)
Verified in edge logs: v1 (07-18 morning) returned 200; v2/v4 — deployed via `--use-api` — return **500** every time, including the best-effort pre-render calls from `worker-narrative`. Root cause (Audit-2 errata #2): its resvg `index_bg.wasm` + Noto fonts are runtime `static_files` that only bundle with a **Docker** deploy. Until then: no share-card PNG, no OG image on invites, and the orphaned `share-card-publish` client path (A6) has nothing to publish. **Fix:** start Docker Desktop once → `npx supabase@latest functions deploy card-render --use-docker` → verify a 200 render + regenerate a real card.

### A3 🟡 Migration-ledger drift: 0031/0032 applied out-of-band
Repo has 32 migrations; `supabase_migrations.schema_migrations` on staging ends at `20260717000030`, yet the objects from `20260719000031_f1t3_consent_columns` and `20260719000032_f1t5_set_keep_image_rpc` **exist live** (verified: `profiles.consent_version/consented_at`, `set_keep_image`). The next `supabase db push` will try to re-apply both and collide. **Fix:** `supabase migration repair --status applied 20260719000031 20260719000032` (or insert the two version rows), then prove a clean `db push` no-op. Also decide and document the *one* apply path going forward (db push, not ad-hoc scripts).

### A4 🔴 The engine room is unpowered: no cron, stale fortunes, 0 embeddings
`cron.job` is empty (deliberate security-parking of the cron→worker wiring — the pgmq drains, `cleanup`, `push-dispatch`, `ops-alerts`, and nightly `fortune-generate` all require manual invocation). Consequences visible today: `fortune_templates` holds **one partial day** (2026-07-18, 57/61 buckets — 4 buckets failed in the seed run) and **nothing for today**, so the retention centerpiece renders empty each morning; scans only progress when a human invokes workers; crops are never auto-deleted (the 24h deletion promise is currently kept only by the manual path); expired invites/stale anons never sweep. This is the single most important backend task left. **Fix (simplest honest design):** store the service key in **Vault**; a migration schedules `pg_cron` jobs that call `net.http_post` against the deployed workers (pg_net 0.20.3 is available but not yet installed — enable it in the same migration); include the nightly `fortune-generate` and re-run the 4 failed buckets. Alternative if a key-in-DB is unwanted: a scheduled GitHub Actions workflow curling the workers with the secret — fewer moving parts in the DB, but requires H4b-2 secrets. Pick one; do not build both.

### A5 🟠 The guided-camera path dead-ends in an infinite loader
`palm.tsx:30`: the capture stand-in's `onConfirm` pushes `/analyzing` **without a scanId**, so `useScanStatus` never resolves — the primary "Allow camera → capture → Looks sharp" path hangs forever; only the secondary "Upload a photo instead" reaches a reading. Known-blocked for the *real* camera, but the dead-end itself is not: either route the stand-in's confirm through the same `uploadPickedScan` chain, or gate the camera door to the upload path until P2 lands. A first-timer takes the obvious path today and hits the exact frozen-loader failure the frontend audit called the app's most damaging screen.

### A6 🟡 The compat share card still ships fabricated data; card publish is orphaned
`share.tsx:60-61` hardcodes `score={82}` / `partnerName="Mei"` into the compat card variant — and the sheet is auto-presented 2s after a **real** pair score lands (`pair.tsx:66`), so real users are prompted to send a card bearing a fake name and score. Thread the real `pairId` result through. Related: `publishShareCard` → `share-card-publish` exists client-side and is **called by nothing** (grep-verified), so no invite carries a card image even once A2 is fixed.

### A7 🟡 12 of 38 typed analytics events are never emitted
Verified by grep: `capture_state_dwell`, `capture_completed`, `capture_abandoned`, `reading_ready`, `reveal_time_spent`, `invite_clicked`, `invite_installed`, `paywall_page_viewed`, `purchase_completed`, `winback_converted`, `push_opened`, `notification_pref_changed` have zero call sites outside tests/dev. The capture-funnel trio and purchase events matter most — metric #1 (completion rate) and #4 (free→paid) are partially dark. Some (purchase, push_opened, invite_installed) legitimately wait on H8/H9/device; the rest are ~1-line emissions at existing call sites.

### A8 ⚪ Paywall decline is client-local only
`setPaywallDeclined` writes AsyncStorage; nothing reaches the server, so the already-built winback notification template has no trigger data. Fine to defer; note it so the "winback exists" claim isn't over-trusted.

### A9 ⚪ RPC surface hygiene + one dashboard toggle
Advisors: 7 SECURITY DEFINER functions are executable via PostgREST RPC by `anon`/`authenticated` — `handle_new_user`, `broadcast_scan_status`, `broadcast_compat_status`, `resolve_awaiting_compat` (trigger-only; would error if called, but revoke EXECUTE anyway), `is_pair_member`, `thread_owner` (harmless read helpers), `set_keep_image` (intentional). One additive hardening migration revoking EXECUTE where unneeded closes the lint. Separately: **leaked-password protection is still off** (1-click dashboard toggle, known from B20).

### A10 ⚪ Hygiene: deps, docs, working tree
(a) `expo-doctor` fails 1 check — 5 packages one patch behind (`npx expo install --check`). (b) Doc drift: `HowItWorks.md` still claims 5 scheduled cron drains; `MVP_Buildplan.md`'s STATE block predates the entire frontend round (still says "P6 UI complete… loop stopped 2026-07-14") — update it to point at the Audit-2 outcome + this audit. (c) The Planning reorg (moved audits/UIUX dirs) sits uncommitted in the working tree. (d) ~145 anonymous test users accumulate on staging with no running stale-anon sweep (rides A4).

## 5. State by phase (vs `MVP_Buildplan.md`)

| Phase | State | What actually remains |
|---|---|---|
| P0 accounts | ~70% | H7 stores (⚠️ Play 14-day gate), H8 RC, H9 AppsFlyer, H6 domain, H4c paid Gemini |
| P1 skeleton/CI (M0) | ~95% | CI never proven green in Actions (H3 + H4b-2 secrets); deps patch drift |
| **P2 native landmark spike** | **0%** | **Not started; needs a physical phone; the declared kill/pivot risk** |
| P3 backend foundation | ✅ done | Cron→worker wiring parked (A4); migration-ledger repair (A3) |
| P4 guided capture | UI shell only | Real camera/landmarks (P2), auto-capture, determinism test — device |
| P5 AI pipeline | ~90% device-free | Live *image* extraction + caching (H4c); repeat-scan live proof; P5.G p50≤25s gate |
| P6 reveal UI (M1) | Built + wired | M1 gate itself = device run |
| P7 accounts/paywall | Code done | H8 RC + store products + sandbox purchase E2E; provider config (H5b) |
| P8 viral loop (M2) | Built + wired, live-proven device-free | card-render Docker (A2), card publish wiring (A6), domain (H6), AppsFlyer (H9), two-device M2 gate |
| P9 retention (M3) | Built + wired | Nightly fortune + embeddings (A4), push transport, M3 gate |
| P10 privacy/settings | ✅ live-verified | Vendor erasure legs (RC/AppsFlyer) ride H8/H9 |
| P11 analytics/ops | ~70% | 12 dark events (A7); dashboards + alert delivery (human) |
| **P12 hardening/launch (M4)** | **0%** | Eval set+bake-off, load test, security pass, compliance sweep, store prep, beta, prod cutover |

## 6. Prior-audit residuals (consolidated, still true today)

From the Audit-1 (backend) and Audit-2 (frontend) ledgers — all verified still open, none newly regressed:
- **Docker** for `card-render` (= A2) → unblocks F1.T9 card-craft parity (compat/face/fortune card classes, real QR, dark variant), fortune share seal, card-corner seal, card-side rarity.
- **Device legs:** live motion/haptic feel, OS push grant + token + `devices` write, camera everything, on-device M-gates.
- **Provider legs:** H5b auth providers, H8 RevenueCat, H4c paid Gemini, H6 domain/Turnstile, H7 store URLs.
- **F1.T11 tail:** lunar-date whisper (needs a small conversion util decision) + server-side one-free-chat allowance.
- **Low-value rote:** onboarding string migration into the i18n catalog, richer server card alt text, the `final/` full-route re-shoot, fortune streak (needs real streak data).
- Audit-1's `[~]`s: B2 (cron-gated), B8/B14 (H8-gated), B20 (leaked-password toggle), B21 (Docker-gated test splits), B22 (H4c/H7).

## 7. What "production-ready" means from here

The four milestone gates map cleanly onto the four walls in §2:
- **M1 (first reading on a device)** ← P2 spike + P4 capture + A5 fix + a phone.
- **M2 (the loop closes on two devices)** ← A2+A6 (cards), H6 (domain), H9 (AppsFlyer), H7 (store URLs), two phones.
- **M3 (retention live)** ← A4 (cron/fortunes/embeddings), push transport, H8 (premium chat is paid).
- **M4 (launch)** ← P12 in full + a fresh prod project from the git migrations + store review.

Everything in §4 except A4 is hours-not-days of work. The long poles are: the physical-phone-gated P2/P4 (weeks, with a pre-registered pivot), the Google Play 14-day closed-test clock (start now), and P12's eval/load/beta cycle. The detailed ordered plan — with owners, verify lines, and explicit do-not-build guards — is the companion file: **[`Production-Readiness-Plan.md`](./Production-Readiness-Plan.md)**.

---

*Audit complete. Companions: `Planning/Audits/Audit-1-Backend/` (backend round, closed), `Planning/Audits/Audit-2-Frontend/` (frontend round, closed), and this folder's `Production-Readiness-Plan.md` (the forward path).*
