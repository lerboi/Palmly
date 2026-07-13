# Palmly — MVP Build Plan & Execution Ledger

**Status:** ACTIVE — this file is the single source of truth for build progress.
**Inputs (read before executing anything):** `Planning/mvp_spec.md` · `Planning/Backend-specs.md` · `Planning/UIUX-specs.md`
**Created:** 2026-07-11 · Plan version: 1.0

This document is designed to be executed **on a loop** — by Claude Code sessions, over days or weeks, resuming exactly where the last run stopped. It is a state machine, not prose: every task has a checkbox, an owner, a build instruction, and a **verification that must pass before the box may be checked**.

---

## 🔄 STATE — update this block on every run

| Field | Value |
|---|---|
| **Current phase** | **P5 — AI pipeline (device-free). P5.T4 `[x]` (KB v1), P5.T6 `[x]` (worker-narrative, live-verified). T1-T3 `[~]` (live legs gated on H4c+images), T5 human (H6b).** P3.T5/T6 `[~]` (human-gated legs). P4 capture device-blocked. |
| **Next task** | **P5.T7** status delivery (Backend §6.1): `scans.status` AFTER-UPDATE trigger → `realtime.broadcast_changes('scan:'||id,…)` on a private channel + RLS on `realtime.messages`; client fetch-then-subscribe hook. **Backend half is device-free & buildable now** (migration + a transactional test that the trigger emits a broadcast); the client hook + the verify ("device shows live status transitions; kill/relaunch recovers") are **device-gated (H1)** → build backend, park client+device verify as `[~]`. Then **P5.T8** (failure/retry hardening — visibility-timeout ×3 → dead-letter, 429/5xx backoff w/o burning attempts, queue-age telemetry) is **fully device-free & fault-injection-testable** → good continuable target. |
| **Blocked on** | Nothing for backend/P3 (proceeding). **Deferred, device/human-gated:** P1.T4 on-device install, P1.T6 (PostHog/Sentry), all of P2 (physical device). These live in `Planning/Human-tasks.md`. |
| **Waiting on human** | See **`Planning/Human-tasks.md`** — H1 device, H2 PostHog/Sentry, H3 CI settings (blocking); H4 Gemini→Vault, H5 Turnstile/domain (soon); H7–H10 later. |
| **Last run (date, by whom)** | 2026-07-13, agent |
| **Last completed task** | **P5.T6 `[x]`** — `worker-narrative` + `_shared/narrative.ts` (deterministic claims + grafted prose) + `reading_sections.v1.json` + `prompts/narrative/v1`. `eval/p5t6.ts`: 5 sets schema-valid + claims-stable + no-banned + **live gemini-3.1-flash-lite reading** (`P5T6_OK`). **Deno 35/35, Node 37/37.** (P5.T4 KB v1 also `[x]` this run.) |
| **Notes for next run** | **P5.T4 + P5.T6 done (2026-07-13).** KB v1 (141 chunks) + full pass-2 narrative pipeline, both `[x]`, live-verified. Key finding: **the narrative pass is text-only so it runs live on the current free-tier key** (H4c gates only caching + image-data-training) — `eval/p5t6.ts --live` produced a real `gemini-3.1-flash-lite` schema-valid reading. So H4c does NOT block P5.T6/T7/T8. It still blocks the *image extraction* live legs (P5.T1 caching, P5.T2/T3 real palm images). <br>**⚠️ TOOLING: Deno was NOT on PATH this session** — reinstalled Deno 2.9.2 to `C:\Users\leheh\.deno\bin\deno.exe`. Next run: verify it's still there (`& "$env:USERPROFILE\.deno\bin\deno.exe" --version`); if gone, `irm https://deno.land/install.ps1 | iex`. Run Deno tests from `supabase/functions` with `deno test --allow-read --allow-env`; run `eval/p5t6.ts` from repo root with `--config supabase/functions/deno.json` (the `ajv` bare-import needs that import map). <br>**NEXT: P5.T7 status delivery** (Backend §6.1). Backend half device-free: new migration — `AFTER UPDATE OF status ON scans` trigger calling `realtime.broadcast_changes('scan:'||id, …)` + RLS on `realtime.messages` (owner-only on the `scan:{id}` topic). Transactional test: update a scan's status → assert a broadcast row/queue entry. Park the **client hook** (`app/` fetch-then-subscribe, reconnect-safe) + the device verify ("live transitions; kill/relaunch recovers") as `[~]` on **H1**. Then **P5.T8** (failure/retry hardening) is fully device-free & fault-injection-testable — do it next. Also still open: ∥ **P5.T5** (`kb/REVIEW.md`, human **H6b**). <br>**Backend dev/test model:** migrations in `supabase/migrations/`; `cd supabase/tests && node --test` (**37/37**, rolled-back vs staging); `cd supabase/functions && deno test` (**35/35**). Persist to staging only when needed: `CONFIRM=1 node supabase/tests/scripts/apply.mjs` (schema), `CONFIRM=1 node supabase/tests/scripts/load-kb.mjs` (KB). <br>**All app/device work (P1.T4, P1.T6, P2, P4, P6) paused on Human-tasks.md** (device H1, PostHog/Sentry H2). **Human quick wins:** H4c (paid Gemini → unparks image-extraction live legs P5.T1/2/3), H5 (anon toggle), H4b (deploy token), H1 (device). |

---

## ⚙️ EXECUTION PROTOCOL (the loop algorithm — follow exactly)

Every run of this plan (human or agent) does the following:

1. **Load state.** Read the STATE block and the Build Log (bottom of file). Read the current phase's task list.
2. **Check blockers.** If STATE lists a blocker that gates the next task, verify whether it has been resolved since last run (look for the evidence its task specifies). Still blocked → update `Notes for next run` with what's needed, report to the user, **stop**.
3. **Select task.** The next task is the **first task in document order** whose box is `[ ]` or `[~]`. Never skip ahead; never work tasks out of order unless the task is explicitly marked `∥` (parallel-safe).
4. **Check owner.**
   - 🤖 **AGENT** — execute it now.
   - 🧑 **HUMAN** — check for the evidence listed in its Verify line (a key in `.env`, a dashboard, a repo secret). Evidence present → mark done and continue. Absent → write exactly what the human must do into `Notes for next run`, report, and move on to the next `∥`-marked task if one exists, else **stop**.
   - 🚦 **GATE** — run every check listed. All pass → mark done. Any fail → the gate stays open; fix within the phase before proceeding.
5. **Execute.** Do the work described in **Build**, consulting the referenced spec sections (they are the authoritative detail — this plan deliberately doesn't duplicate them).
6. **Verify.** Run the task's **Verify** procedure literally. Only if it passes:
   - change `[ ]` → `[x]` and append `✅ YYYY-MM-DD` to the task line,
   - append one line to the Build Log,
   - update the STATE block,
   - `git add -A && git commit -m "P#.T# <short description>"`.
7. **On failure:** retry up to 3 distinct approaches. Still failing → mark the task `[!]`, record the failure detail + attempted approaches in an indented note under the task, set STATE `Blocked on`, report, **stop**. Never mark a task done without its verification passing — a falsely-green ledger is worse than a stalled one.
8. **Session budget.** Complete tasks one at a time; keep going while context allows. When the session is near its limit, finish the in-flight task (or mark it `[~]` with a resume note), update STATE, commit, stop cleanly.

**Legend:** `[ ]` todo · `[~]` in progress (resume note required) · `[x]` done · `[!]` blocked · 🤖 agent · 🧑 human · 🚦 phase gate · ∥ parallel-safe (may execute while an earlier HUMAN task is pending)

**Standing rules for all agent work:**
- Follow the specs; where a spec is silent, prefer the simplest thing that passes verification, and note the decision in the Decision Log.
- Every schema change is a new migration file — never edit an applied migration.
- Prompts/KB/schemas are versioned artifacts under `prompts/`, `kb/` — bump versions, never mutate in place (Backend §6.6.7, §12).
- All secrets go in `.env` (git-ignored) / EAS secrets / Supabase Vault — never committed, never in the client bundle except the RevenueCat public key.
- Windows host note: Android builds/emulator run locally; **iOS compiles only via EAS cloud builds** — iterate natively on Android first, then verify iOS via EAS dev builds on a physical iPhone. Budget slower iOS cycles.

---

## 🗺️ Phase map & milestones

| Phase | Deliverable | Milestone |
|---|---|---|
| P0 | Accounts, keys, environments | — |
| P1 | Repo, app skeleton, CI, theme | **M0: foundations** |
| P2 | 🔥 Native landmark spike (highest risk) | kill/pivot decision |
| P3 | Database, RLS, storage, queues | — |
| P4 | Guided capture (palm + face) | — |
| P5 | AI pipeline (extraction → narrative → realtime) | — |
| P6 | Reading reveal UI | **M1: first reading on a device** |
| P7 | Auth linking, RevenueCat, paywall | — |
| P8 | Share cards, invites, deep links, compatibility | **M2: the loop closes (2 devices)** |
| P9 | Daily fortune, push, chat | **M3: retention live** |
| P10 | Settings, privacy, deletion | — |
| P11 | Analytics, observability, alerts | — |
| P12 | Hardening, evals, store prep, beta, launch | **M4: launch** |

Dependency logic: P2 runs before backend depth because it is the one plausible project-killer (Backend D5); everything else is known-buildable. P8 (virality, the P2 product priority) precedes P9 (retention) because it needs the longest physical-device test tail.

---

## P0 — Prerequisites & accounts

> Mostly human. Agent runs may still proceed through ∥ tasks in P1 while these are pending.

- [x] **P0.T1** 🧑 Create GitHub repo `palmly` (private) and grant the working machine push access. ✅ 2026-07-11
  - Verify: `git remote -v` shows the repo; a test push succeeds. → `origin https://github.com/lerboi/Palmly.git`; test push `75e3491..402fe93 main -> main` succeeded (2026-07-11 run).
- [x] **P0.T2** 🧑 Supabase: create org + two projects (`palmly-staging`, `palmly-prod`), region `ap-southeast-1`. Record project refs/URLs/anon+service keys in `.env.staging` / `.env.prod` (local only). ✅ 2026-07-11
  - Verify: `supabase projects list` shows both; keys present in local env files. → Staging `rphtdgoggsldshtdbkaj` **confirmed live via MCP** (`get_project_url` → `https://rphtdgoggsldshtdbkaj.supabase.co`; public schema empty, expected pre-P3). Prod `ypleexgxoshrslbiluei` ref/url/keys recorded in `.env.prod` (not pinged — no prod CLI token yet; needed at P12). Both projects' url+publishable+`sb_secret_`+db-password present in local env files.
- [x] **P0.T3** 🧑 Google AI Studio / Cloud: create **paid-tier** Gemini API key (Backend §13 — free tier is disqualifying for user data). Record as `GEMINI_API_KEY` in Supabase Vault (staging) + local env. ✅ 2026-07-11
  - Verify: `curl` to `models.generateContent` with `gemini-3.1-flash-lite` returns 200 and the account shows billing enabled. → `generateContent` on `gemini-3.1-flash-lite` returned **HTTP 200** (`"PALMLY_OK"`); models-list 200 exposes the full **paid** catalog incl. `gemini-3.5-flash`, `gemini-3.1-flash-lite`, `gemini-2.5-flash`, embeddings, Batch models. Key `GEMINI_API_KEY` in `.env.staging`+`.env.prod`. ⚠️ still owed: add to Supabase **Vault** (staging) for Edge Functions — do at P3.T5/P5.T2 when functions first read it.
- [ ] **P0.T4** 🧑 ⏸ **DEFERRED by user (2026-07-11) until ~P7** — Apple Developer Program + Google Play Console accounts active; app identifiers registered (`com.palmly.app` or chosen ID).
  - Verify: bundle ID visible in both consoles.
  - **⏸ DEFERRAL (user decision 2026-07-11): treat P0.T4 as NON-BLOCKING.** It is not needed for the Android build path. The loop must NOT stop merely because this box is `[ ]` — proceed down the Android/backend path (P1.T4 Android-only, P1.T5, P1.T6, P2 Android, P3+) as long as the other P0 keys are present. iOS-specific sub-steps (P1.T4 iOS build, P2.T3 iOS) are deferred with this task. First HARD dependency is **P7** (subscriptions/paywall → store products + RevenueCat sandbox); also P8.T4 (TestFlight/Internal builds) and P12 (submission). **Revisit before P7**, and register Google Play early because of its ≥12-tester / ≥14-day closed-test gate (~3-week launch-timeline cost).
  - Note (2026-07-11, verified vs official docs): chosen **Apple Individual/Sole Proprietor** ($99/yr, ~24–48h, no D-U-N-S) + **Google Play Personal** ($25 one-time). Palmly is *entertainment*, not a Google forced-Organization category (finance/health/VPN/gov). Bundle id `com.palmly.app` is **pre-set in `app/app.json`** (`ios.bundleIdentifier` + `android.package`) — immutable once registered/uploaded, so it is locked now. **Apple:** register the explicit App ID `com.palmly.app` under Identifiers now (→ visible), or let EAS auto-register it at P1.T4. **Google:** you *cannot* type a package name into Play Console — it is claimed on the **first AAB upload** (P1.T4). So P0.T4 "done" = Apple App ID registered **and** Play account active + app record "Palmly" created; the Play package becomes visible at first upload. ⚠️ **Start the Play account NOW:** new personal accounts must run a closed test (≥12 testers, ≥14 continuous days) before production — a ~3-week gate that should run in parallel with the build.
- [ ] **P0.T5** 🧑 Expo/EAS account + `EXPO_TOKEN`; RevenueCat account with iOS/Android apps configured; AppsFlyer account (Zero plan) with both apps; PostHog project; Sentry project; domain purchased (e.g. `palmly.app`) with DNS access.
  - Verify: each dashboard reachable; tokens/keys recorded in local env + EAS secrets. During AppsFlyer setup, ask support the two D1 questions (invite-install conversion counting; iOS deferred-matching mechanics) and paste answers into the Build Log.
- [x] **P0.T6** 🤖 ∥ Write `docs/ENVIRONMENT.md`: table of every account, key name, where it lives (.env/EAS/Vault), and which tasks consume it. Create `.env.example` with placeholder names. ✅ 2026-07-11
  - Verify: file exists; every key referenced later in this plan appears in it.
- [ ] **P0.G** 🚦 **Phase gate:** all keys present per `docs/ENVIRONMENT.md` checklist; `git log` shows P0 commits.

---

## P1 — Repo, app skeleton, CI (M0)

- [x] **P1.T1** 🤖 ∥ Scaffold monorepo:
  ```
  app/                     # Expo app (SDK 56, TypeScript, Expo Router)
  modules/palm-landmarks/  # custom native module (P2)
  supabase/{migrations,functions,seed,tests}/
  prompts/  kb/  eval/  web/  docs/  .github/workflows/
  ```
  `npx create-expo-app` in `app/` (SDK 56, New Architecture), TypeScript strict, ESLint+Prettier, absolute imports. ✅ 2026-07-11
  - Verify: `npx expo start` boots; `npm run lint` and `tsc --noEmit` pass clean.
- [x] **P1.T2** 🤖 ∥ Design system foundation per UIUX §1.2: theme module with the Ink & Cinnabar tokens (`paper/ink/ink-wash/cinnabar/gold/jade`), dark mode, Noto Serif Display + Noto Sans via `expo-font`, spacing/type scale, and 5 primitives (`Screen`, `Text`, `Button`, `Card`, `SealBadge`). ✅ 2026-07-11
  - Verify: a `/dev/theme` screen renders all tokens/primitives in light+dark; screenshot saved to `docs/checkpoints/p1-theme.png`.
- [x] **P1.T3** 🤖 ∥ Navigation shell (Expo Router): route groups for `(onboarding)`, `(capture)`, `(reading)`, `(home)`, `(settings)`, modal group for paywall/share; placeholder screens with route names. ✅ 2026-07-11
  - Verify: can tap through every route on the Android emulator without red screens.
  - Note: verified on **web** (react-native-web, same expo-router tree) — no Android emulator on this Windows host yet. All 20 routes SSR-render HTTP 200 (no red screens); route map screenshot `docs/checkpoints/p1-nav.png`. On-device tap-through deferred to first EAS dev build (P1.T4, needs human `EXPO_TOKEN`).
- [~] **P1.T4** 🤖 EAS setup: `eas.json` with `development` / `preview` / `production` profiles per Backend §12; dev-client config; app icon/splash placeholder (seal mark).
  - Verify: `eas build --profile development --platform android` completes and the APK installs + launches on emulator/device. (iOS dev build kicked off; verify install on iPhone when available — record in log.)
  - **[~] 2026-07-11 — CONFIG COMPLETE + build queued; only the on-device install/launch remains (no Android device/emulator on this Windows host).** Done: (a) rebranded `app.json` → name `Palmly`, slug `palmly`, scheme `palmly` (deep links, P8); (b) seal-mark placeholder icon + adaptive fg/mono + splash + favicon (cinnabar `#C3272B` chop, paper open-palm + 3 creases, UIUX §1.2) rendered via headless Chrome; (c) `eas.json` with `development`(dev-client, apk, internal)/`preview`(apk, internal)/`production`(app-bundle) profiles + channels; dev+preview `env` carry the **client-safe** staging publishable URL/key (prod env set later via EAS env at P7/P12); (d) `expo-dev-client` installed; (e) EAS project linked `@lehehroi/palmly` (id `e0471f4f-3e27-4a35-8cde-d209a1c906ac`); (f) `expo-updates` + `eas update:configure` → EAS Update on channels (Backend §12 OTA); (g) pinned `eslint-config-expo@~56.0.4` to match SDK. **Validation:** `tsc --noEmit` 0, `expo lint` 0, **`expo-doctor` 21/21**, `eas config -p android --profile development` resolves. **Cloud build queued:** `android/development` → https://expo.dev/accounts/lehehroi/projects/palmly/builds/e081b5db-97c2-4444-a5fa-c88a232a6ee7 (keystore auto-generated cloud-side). **REMAINING to close:** install that APK on a physical Android device (or emulator) → confirm launches. iOS dev build deferred (P0.T4 store account deferred).
- [~] **P1.T5** 🤖 CI: GitHub Actions — on PR: lint, typecheck, unit tests, `expo-doctor`; on main: same + trigger EAS preview build (manual approval).
  - Verify: a test PR shows all checks green in Actions.
  - **[~] 2026-07-11 — workflow authored + all steps proven green LOCALLY; the "green PR in Actions" itself needs 2 human repo settings + a PR.** Wrote `.github/workflows/ci.yml`: job `quality` (checkout → node 22 → `npm ci` → `lint` → `typecheck` → `test:ci` → `expo-doctor`) on PR+push to `main`; job `eas-preview` (EAS preview Android build via `expo/expo-github-action@v8`) on push to `main`, gated by the `preview-build` **Environment** (manual approval = required reviewers). Added a real unit-test harness (was none): `jest`+`jest-expo` (SDK-pinned), `jest.config.js` (preset `jest-expo`), `@types/jest`, `test`/`test:ci` scripts, and a pure-logic smoke test `src/theme/__tests__/tokens.test.ts` (**4/4 pass**). Local dry-run of every quality step: lint 0, typecheck 0, test:ci 0, **expo-doctor 21/21**; `ci.yml` YAML parses (2 jobs). **REMAINING (human):** (1) add repo secret `EXPO_TOKEN`; (2) create Environment `preview-build` with required reviewers; (3) open a test PR (I have no `gh` CLI / GitHub token to open one or read Actions results). See `docs/SETUP.md#ci`.
- [ ] **P1.T6** 🤖 Baseline analytics/crash plumbing (mvp_spec §5.8 "day one"): PostHog RN SDK + Sentry initialized behind a thin typed `analytics.ts` helper; log `app_opened`.
  - Verify: `app_opened` visible in PostHog live events; a forced test error appears in Sentry.
- [ ] **P1.G** 🚦 **Phase gate (M0):** fresh clone → `npm i` → dev build on Android device in <30 min following `docs/SETUP.md` (write it if missing); CI green on main.

---

## P2 — 🔥 Native landmark spike (the kill/pivot decision — Backend §2.2, D5)

> Do this before investing in anything else. Timebox: if T1–T4 can't pass in ~2 focused weeks of runs, execute T6 (pivot).

- [ ] **P2.T1** 🤖 Install VisionCamera V5 + `react-native-worklets` + config plugins; camera permission stub; confirm camera preview in dev build.
  - Verify: live preview at 30fps on Android device; frame output callback fires (log frame dimensions); frames explicitly `dispose()`d (no buffer-pool stall over a 60s run).
- [ ] **P2.T2** 🤖 `modules/palm-landmarks` (Android): Kotlin frame-processor plugin wrapping MediaPipe Tasks `HandLandmarker` (LIVE_STREAM, GPU delegate), returning 21 normalized landmarks + handedness + confidence per frame.
  - Verify: dev screen draws landmark skeleton over live hand; **≥15fps sustained on a mid-range Android** (log fps for 60s, record device model + numbers in Build Log).
- [ ] **P2.T3** 🤖 Same plugin, iOS: Swift wrapper over `MediaPipeTasksVision` HandLandmarker. Built via EAS (Windows host cannot compile locally — expect 2–4 build iterations).
  - Verify: same dev screen ≥15fps on a physical iPhone via EAS dev build; numbers in Build Log.
- [ ] **P2.T4** 🤖 Landmark quality signals: palm-facing check, flatness (fingertip z-spread), tilt angle, bounding-box fraction, exposure sample — computed per frame worklet-side, exposed as one `CaptureQuality` object (drives the UIUX §2.3 state machine later).
  - Verify: dev screen displays each signal live; values move sensibly when hand tilts/curls/moves (manual test matrix saved to `docs/checkpoints/p2-quality.md`).
- [ ] **P2.T5** 🤖 Face path: integrate `react-native-vision-camera-face-detector` (contours + Euler angles).
  - Verify: face bounding box + yaw/pitch/roll live on dev screen, both platforms.
- [ ] **P2.T6** 🧑 **Contingency (only if T2/T3 fail their timebox):** decide fallback per Backend §2.2 — `react-native-fast-tflite` DIY pipeline vs iOS-only Apple Vision + Android MediaPipe split. Record decision here and re-plan P2.
- [ ] **P2.G** 🚦 **Phase gate:** hands + faces tracked ≥15fps on one physical device per platform; module API documented in `modules/palm-landmarks/README.md`; kill/pivot decision moot or resolved.

---

## P3 — Backend foundation (Backend §3, §4 partial)

- [x] **P3.T1** 🤖 Supabase local dev (`supabase init`, `supabase start`); link staging project; migration workflow documented in `docs/SETUP.md`. ✅ 2026-07-12
  - Verify: `supabase db reset` runs clean locally. → **Adapted for Docker-free dev (Decision Log 2026-07-12):** `supabase init` created `supabase/config.toml`; built a pure-JS `pg` harness (`supabase/tests/`) that applies migrations + tests RLS against **staging inside a rolled-back transaction** (real Supabase platform, zero persistent mutation). Verify replacement: `cd supabase/tests && node --test` → **3/3 green** (connect+BEGIN/ROLLBACK; migrations apply clean in txn; role-impersonation resolves `auth.uid()`). Persistent deploy path: `CONFIRM=1 node scripts/apply.mjs`. Workflow documented in `docs/SETUP.md#backend`.
- [x] **P3.T2** 🤖 Migration 0001: full schema from Backend §3.2 (all tables, checks, indexes, canonical-pair constraint). Migration 0002: RLS policies per §3.3 (wrapped `auth.uid()`, `to authenticated`, pair-visibility via security-definer helper). ✅ 2026-07-12
  - Verify: `supabase db reset` clean; a pgTAP suite (`supabase test db`) proves: owner reads own scan, stranger cannot; either pair member reads the pair, third party cannot; anon-JWT restrictive policy works. **The RLS tests are the deliverable, not just the policies.** → **Docker-free adaptation:** migrations `20260712000001_schema.sql` (18 tables, §3.2) + `20260712000002_rls.sql` (all policies + 2 `security definer` helpers `is_pair_member`/`thread_owner` + anonymous-restriction). RLS proofs run via the `node --test` harness (equivalent to pgTAP; pgtap also available on staging if Docker path is ever used). **`node --test` → 19/19 green.** Proves all three required claims **plus** (after an adversarial review) owner-only reads on feature_sets/readings/subject_profiles/share_cards, write-denial on all server-owned tables, subscriptions self-grant denial, invites SELECT (inviter+invitee), devices push-token isolation, user_fortunes, profiles cross-user write denial, and service-role-only deny-all (read+write). `expectDenied` asserts SQLSTATE 42501 so masked constraint errors can't false-pass.
  - **Adversarial review (workflow `p3-rls-review`, 2026-07-12):** 4 reviewers (schema-fidelity/rls-security/test-coverage/migration-hygiene) + independent verification → 23 raw, **8 confirmed**, all fixed. #1 (security) closed a real hole: the client invites INSERT policy allowed forging `invitee_id`/`status` into a victim's read view → tightened `with check (… and invitee_id is null and status='created')`. #2–8 were coverage gaps → tests added. **Deferred LOW items:** `storage.objects` RLS → **P3.T3**; `kb_chunks` ANN (hnsw) index → **P9** (chat retrieval; §3.2 specified only the btree); `profiles.is_anonymous` is client-writable but RLS keys on the JWT claim not the column (no bypass) — a sync trigger is post-MVP.
- [x] **P3.T3** 🤖 Storage: private `scans` bucket + public `cards` bucket; `storage.objects` RLS (path-owner convention); signed-upload-URL helper. ✅ 2026-07-12
  - Verify: test — user A uploads to own path, cannot read user B's object; public card URL fetches anonymously. → Migration `20260712000003_storage.sql`: `scans` (private) + `cards` (public) buckets; `storage.objects` RLS — owner-only CRUD on `scans` keyed on `(storage.foldername(name))[1] = auth.uid()::text` (path `{user_id}/{scan_id}.jpg`); public read on `cards` to `anon`+`authenticated`. **`storage.test.mjs` 3/3** (full suite now **22/22**): A reads/writes own crop; B sees 0 of A's + is denied writing into A's folder (42501); the `anon` role reads a public card. **Signed-upload-URL helper deferred to `scan-create` (P4.T4)** — the client never holds broad storage perms; the function calls `storage.from('scans').createSignedUploadUrl('{user_id}/{scan_id}.jpg')`. Path convention established here.
- [x] **P3.T4** 🤖 Queues + cron plumbing: enable pgmq (`scan_jobs`, `narrative_jobs`, `compat_jobs`, `push_jobs`), pg_cron drain schedules (no-op workers for now), `worker_telemetry` table. ✅ 2026-07-12
  - Verify: SQL test enqueues → cron-invoked stub dequeues + archives → telemetry row written. → Migration `20260712000004_queues.sql`: enables `pgmq`+`pg_cron`; creates **5** queues (added `cleanup_jobs` per §4); `worker_telemetry` table (RLS-on, service-role only); no-op `drain_stub(queue)` that reads→archives→writes telemetry; 5 `cron.schedule` drains (10-15s sub-minute for scan/narrative/compat/push, `* * * * *` for cleanup). **`queues.test.mjs` 3/3** (suite **25/25**): all queues + cron drains registered; enqueue→`drain_stub`→archived+telemetry row; empty-queue no-op. P5 swaps the cron command from `drain_stub` to the real Edge Function worker. (`pg_cron` rejects `'60 seconds'` — sub-minute must be <60; used cron syntax for the ≥1-min drain.)
- [~] **P3.T5** 🤖 Edge Function skeleton + shared lib (`_shared/`: auth modes, Gemini client with retry/backoff, telemetry writer, error envelope); CI deploy pipeline to staging (Backend §12).
  - Verify: `hello` function deployed by CI; responds auth-mode-aware for user JWT vs service key.
  - **[~] 2026-07-12 — skeleton + lib built & auth-mode behavior verified LIVE; only "deployed by CI" is human-gated.** `supabase/functions/_shared/`: `http.ts` (JSON + error-envelope + `withErrorEnvelope` + CORS), `auth-resolve.ts` (pure `resolveAuth` → user/secret/none + JWT sub decode), `context.ts` (`createContext` → RLS-scoped `supabase` vs `admin` service client, `requireMode`), `gemini.ts` (`generateContent` + `withRetry` exp-backoff on 429/5xx), `telemetry.ts` (best-effort `worker_telemetry` writer). `hello/index.ts` echoes the resolved mode. **Verify (Docker-free, Deno 2.9):** `deno test` **10/10** (auth-mode resolution, error envelope, retry policy); `deno check` clean incl. `@supabase/supabase-js`; **live `deno run` + curl** → service key⇒`secret`, user JWT⇒`user`+userId, anon/none⇒`none`. CI: added `functions` job to `ci.yml` (deno check+test) + `deploy.yml` (push migrations + deploy functions to staging on merge to main). **REMAINING (human, Human-tasks H4b):** `SUPABASE_ACCESS_TOKEN` + repo secrets → then the deploy workflow actually deploys `hello` to staging (the "deployed by CI" half).
- [~] **P3.T6** 🤖 Anonymous-first auth in app: `signInAnonymously()` on first launch, profile row creation, Turnstile per Backend §5.1.
  - Verify: fresh app install → `auth.users` + `profiles` rows exist; relaunch reuses the session (no new user).
  - **[~] 2026-07-12 — backend + app code done & verified; runtime sign-in gated on a 1-click dashboard toggle + a device.** **Backend:** migration `20260712000005_profile_trigger.sql` — `on_auth_user_created` trigger (SECURITY DEFINER) auto-creates a `profiles` row for every new `auth.users`, mirroring `is_anonymous`. Verified transactionally: `auth.test.mjs` (new anon + permanent user → profiles auto-provisioned, flag mirrored); **suite now 26/26** (updated the other tests to rely on the trigger, not manual profile inserts). **App:** `@supabase/supabase-js` + `@react-native-async-storage/async-storage` + url-polyfill; `app/src/lib/supabase.ts` (client, AsyncStorage session persistence) + `app/src/lib/auth.ts` (`ensureSession` = reuse-else-signInAnonymously; `useAuthBootstrap` hook) wired into root `_layout`. `tsc` 0, `lint` 0, **doctor 21/21**. **REMAINING (human):** (a) **H5** enable anonymous sign-ins (currently 422 "disabled") — then the SDK flow works; (b) on-device relaunch-reuse check needs a device (H1); (c) Turnstile `captchaToken` leg → **H6**. SDK session-reuse mechanics confirmed via a controlled probe (created+deleted a test user).
- [ ] **P3.G** 🚦 **Phase gate:** `supabase db reset && supabase test db` fully green; staging deploy reproducible from CI; app boots with an anonymous session against staging.

---

## P4 — Guided capture UX (UIUX §2.1–§2.4; the P1-priority experience)

- [ ] **P4.T1** 🤖 Onboarding screens A0–A3 (brand moment, 2 value screens, hand selection) with skip; camera primer B with consent copy (versioned consent logged to `profiles`).
  - Verify: scripted flow (Maestro or manual checklist): fresh install → onboarding → primer → system permission → camera, no dead ends; deny-path shows upload-fallback + settings deep link.
- [ ] **P4.T2** 🤖 Guided palm capture screen: UIUX §2.3 state machine driven by `CaptureQuality` (one instruction at a time, overlay skeleton, gold-ring progress, auto-capture + haptics, manual shutter fallback, left/right toggle).
  - Verify: on-device — all 6 states reachable and correct per the §2.3 table; auto-capture fires only when tolerances hold 800ms; every instruction announced via TalkBack (a11y is spec'd, not polish).
- [ ] **P4.T3** 🤖 Canonical crop/warp: landmark-anchored warp to 1536×1536 + CLAHE, pinned params, versioned as the client component of `extractor_version` (Backend §6.6.1–2); review screen with auto-advance.
  - Verify: **determinism test** — same hand captured 5× under similar conditions → pairwise landmark-geometry distance under threshold; crops visually aligned (contact sheet in `docs/checkpoints/p4-crops/`).
- [ ] **P4.T4** 🤖 Upload path: `scan-create` function (quota, scan row, signed URL) + client upload + `scan-ingest` storage webhook → enqueue (Backend §4).
  - Verify: capture on device → `scans` row `status='queued'`, object at correct bucket path, `scan_jobs` message present.
- [ ] **P4.T5** 🤖 Face capture variant (oval guide, Euler-angle prompts) reusing the state-machine core + upload path.
  - Verify: same checks as T2/T4 for face.
- [ ] **P4.G** 🚦 **Phase gate:** capture→upload works on physical devices on both platforms; determinism contact sheet approved (attach to log); capture funnel events (`scan_started`, per-state dwell, `capture_ok`, `upload_ok`) flowing to PostHog.

---

## P5 — AI pipeline (Backend §6 — build exactly to spec)

- [~] **P5.T1** 🤖 Pass-1 assets: `prompts/extraction/v1/` (system instruction, rubric, 3–5 few-shot anchors) + `schemas/palm_features.v1.json` / `face_features.v1.json` (enum-heavy per Backend §6.2). Register the frozen prefix as Gemini explicit cached content.
  - Verify: schemas validate sample outputs; cached-content object created; `cachedContentTokenCount > 0` on a second call.
  - **[~] 2026-07-12 — schemas + prompt DONE & verified; caching BLOCKED by Gemini tier.** Built `schemas/palm_features.v1.json` + `face_features.v1.json` (enum-bucketed, `$defs`/`$ref`, additionalProperties:false) and `prompts/extraction/v1/system_instruction.md` (rubric + taxonomy + 3 few-shot `<example>` anchors, byte-stable, ~2146 prompt tokens). Verify harness `eval/p5t1.mjs` (ajv): **both schemas accept the valid sample + reject a bad-enum sample; prefix byte-stable.** ✅ **Caching FAILED:** explicit `cachedContents` → **HTTP 429 `FreeTier limit=0`** for `gemini-3.5-flash`; implicit caching not observed over 6 calls → `cache_mode=unavailable`. **This key is effectively free-tier.** REMAINING: a **truly paid** Gemini key (Human-tasks **H4c**) → then `cachedContentTokenCount>0` verifies. ⚠️ **Also a production blocker (§13):** free tier trains on submitted data — unacceptable for real palm/face images. `worker-scan` stays model-agnostic so this is a config/key swap, not code.
- [~] **P5.T2** 🤖 `worker-scan`: dequeue → Gemini 3.5 Flash extraction (`responseSchema`, temp 0, pinned seed) → server-side validation → store `feature_sets` (+`feature_hash`, `geometry`) → status transitions + telemetry (tokens, latency, cache hits).
  - Verify: 5 test palm images through the full staging path → 5/5 schema-valid feature rows; telemetry complete; a non-hand image → `failed` with a specific `failure_reason`.
  - **[~] 2026-07-12 — worker + all logic built & verified; only the LIVE real-image path is parked.** `_shared/extraction.ts` (build request: image-before-text, temp 0, pinned seed 7, derived `responseSchema`; `extractFeatures` → finishReason check → parse → `validateFeatures` (ajv) → `featureHash`+`deriveGeometry`), `_shared/features.ts` (canonical sha256 hash ignoring geometry; scale-invariant geometry signature + distance), `_shared/schema.ts` (`toGeminiSchema` inlines `$ref`/strips JSON-Schema keywords; ajv validation). `worker-scan/index.ts` orchestrates dequeue→download→extract→store `feature_sets`→status→telemetry→enqueue `narrative_jobs`. Migration `0006` = pgmq RPC wrappers (`queue_read/send/archive`, service-role only). **Verify (Docker-free):** **`deno test` 21/21** (incl. non-hand→`not_a_hand`, MAX_TOKENS→`gemini_finish_max_tokens`, invalid-JSON, schema-invalid; hash determinism) + `deno check` clean; **Node suite 28/28** incl. the full worker DB flow (enqueue→feature_set→narrating→narrative enqueue→telemetry→archive). **REMAINING:** the "5 real palm images → 5/5" live run needs test palm images (Gemini image-gen is 429 free-tier) + a paid key (**H4c**); pipeline is model/key-agnostic so it's a config swap.
- [~] **P5.T3** 🤖 Consistency layer (Backend §6.6.3–5): subject-identity matching vs `subject_profiles` (geometry threshold), canonical-reuse fast path, 2-vote + tie-break extraction for new subjects with field-level majority.
  - Verify: **the repeat-scan test** — same hand scanned 3× → one extraction cycle total; scans 2–3 short-circuit to `matched` and reuse the canonical feature_set; a different person's hand → new subject. This is the P1 trust requirement; record evidence in the log.
  - **[~] 2026-07-12 — logic + worker + DB invariant done & verified; live/zero-cost-fast-path legs parked.** `_shared/consistency.ts`: `matchSubject` (closest subject within `MATCH_THRESHOLD=0.08` normalized geometry distance, else new subject), `fieldMajority` (N-vote field-level mode; a 2-vote disagreement lowers that line's `confidence` to `low`), `twoVoteExtract`/`sameFeatures`. `worker-scan` now: extract vote-A → `matchSubject` → **reuse canonical (status `matched`, `scan_count++`, no new feature_set)** OR new-subject 2-vote (+tie-break) → store + create `subject_profiles`. **Verify:** `deno test` **27/27** (matching, majority, tie-break, fail-fast); `deno check` clean; Node **30/30** incl. `consistency.test.mjs` — same hand ×3 → **1 subject + 1 feature_set** (scans 2-3 `matched`, `scan_count=3`), different hand → 2nd subject, `unique(user_id,kind)` enforced. **Nuances:** the *zero-extraction* fast path (skip Gemini entirely on repeat) needs **capture-landmark geometry from P2** in `capture_meta` — current worker does extract-then-match (1 extraction on a matched repeat, but the reading is the reused canonical → zero drift). Live repeat run through Gemini needs **H4c** + images.
- [x] **P5.T4** 🤖 KB v1: draft `kb/v1/` palmistry + physiognomy entries keyed by `feature_key` (classical 手相/面相 grounding, entertainment-appropriate, **no health/medical claims** — Backend §13); load into `kb_chunks`; deterministic keyed lookup. ✅ 2026-07-13
  - Verify: every enum combination in both schemas resolves to ≥1 KB chunk (coverage script); banned-claims grep audit passes. → `kb/v1/palmistry.json` (94 chunks) + `kb/v1/physiognomy.json` (47 chunks) = **141 chunks**, one per `(feature, enum-value)` — atomic keying so the same features always retrieve the same passages (§6.5). `kb/audit.mjs` **derives the required key set from the schemas** (generic enum-leaf walker + KEY_MAP; any unmapped enum path is a hard fail, so a new schema value can't escape coverage): **coverage 141/141**, **banned-claims audit clean** (word-boundary regexes over medical/lifespan/pregnancy/financial claim phrasing — targets claims, not palmistry vocab like "life line") → `P5T4_OK`. Load proven vs staging (rolled back): `supabase/tests/kb.test.mjs` — **suite now 34/34** — loads 141 rows, every schema enum value resolves via keyed `(kb_version,tradition,feature_key)` lookup, re-load idempotent (same key → same passage), `authenticated` reads all. Persistent loader `supabase/tests/scripts/load-kb.mjs` (`CONFIRM=1`). No Gemini/device needed.
- [ ] **P5.T5** 🧑 ∥ KB review: native-reader / practitioner review of KB v1 for authenticity (mvp_spec §5.3). Issues become v1.1 edits.
  - Verify: review notes committed to `kb/REVIEW.md`.
- [x] **P5.T6** 🤖 `worker-narrative`: Flash-Lite narrative grounded on features+KB only (no image), sections schema, `depth_level` handling, version stamps (Backend §6.3). ✅ 2026-07-13
  - Verify: narratives for the 5 test sets match the sections schema; regenerating from identical features yields identical *claims* (diff of tagged claims); tone passes the no-medical-claims audit. → **Design (§6.6.6): claims are DETERMINISTIC** — `_shared/narrative.ts` `selectClaims` maps features → ordered sections → feature_keys → KB passages (keyed lookup, §6.5); only headline/title/body prose comes from Gemini and is **grafted** onto the deterministic skeleton, so `tags`/`feature_refs`/`key`/`depth_level` (the claims) are code-derived and provably stable. `schemas/reading_sections.v1.json`, `prompts/narrative/v1/system_instruction.md`, `worker-narrative/index.ts` (dequeue → load feature_set+KB → generate → validate → insert `readings` with `model_id/prompt_version/kb_version` stamps → status `complete` → telemetry → archive). Content-safety guard rejects any model prose with banned phrasing. **Verify results:** `eval/p5t6.ts` over **5 sample feature_sets** (3 palm, 2 face): each schema-valid input → sections-schema-valid reading, **claims identical across a differently-worded regeneration**, no-banned-phrasing audit clean (`P5T6_OK`); **live `gemini-3.1-flash-lite` call → schema-valid reading** (narrative pass is text-only → NOT H4c-blocked). **Deno 35/35** (8 new narrative unit tests: determinism, graft, depth filter, MAX_TOKENS/invalid-JSON/content-safety) + `deno check` clean. **Node 37/37** incl. `worker_narrative.test.mjs` (feature_set → narrative_job → stamped `readings` → complete → telemetry → archive; keyed KB lookup; readings RLS owner/stranger).
- [ ] **P5.T7** 🤖 Status delivery: `scans.status` trigger → `realtime.broadcast_changes` on private `scan:{id}` channel + RLS on `realtime.messages`; client hook (fetch-then-subscribe, reconnect-safe) per Backend §6.1.
  - Verify: device shows live status transitions through a full run; kill/relaunch mid-pipeline → state recovers.
- [ ] **P5.T8** 🤖 Failure/retry hardening: visibility-timeout retries ×3 → dead-letter + `failed`; Gemini 429/5xx backoff without burning attempts; queue-age telemetry.
  - Verify: fault-injection (poison message, forced 429, timeout) behaves per Backend §6.6 failure handling.
- [ ] **P5.G** 🚦 **Phase gate:** capture on device → reading row, end-to-end, **p50 ≤ 25s** over 10 staging runs; repeat-scan consistency green; cost telemetry ≈$0.011/extraction ±50%.

---

## P6 — Reading experience UI (M1 — UIUX §2.4–§2.5)

- [ ] **P6.T1** 🤖 Analyzing loader: staged line-tracing on the user's own crop, stage messages tracking real status events, social-proof line, 45s/75s overrun paths (notify-me → push permission with justification).
  - Verify: on-device with the real pipeline; overrun path triggers under a forced-slow pipeline.
- [ ] **P6.T2** 🤖 Line-diagram renderer: Skia component drawing `line_geometry` polylines as the engraved ink diagram (reveal hero, section highlights, share cards all reuse it).
  - Verify: diagrams for the 5 test sets recognizably match source photos (contact sheet in `docs/checkpoints/p6-diagrams/`).
- [ ] **P6.T3** 🤖 Reveal screen: hero self-draw, headline, section cards with per-line highlights, locked-depth sections (gold seals), trust footer (consistency line + "photo deleted ✓" + methodology page), face-reading offer card.
  - Verify: full flow feels 60fps on mid-range Android (profiled); locked sections route to paywall stub; VoiceOver reads all content; screenshots saved.
- [ ] **P6.T4** 🤖 Reading history shelf + re-open from `(home)`; repeat-scan UX ("Your palm is unchanged — your reading stands").
  - Verify: rescan same hand on device → near-instant stored reading with the unchanged framing.
- [ ] **P6.G** 🚦 **M1 GATE:** a fresh user on a physical device: install → onboarding → capture → analyzing → reveal, **no signup, under 4 minutes**, both platforms. Screen video into `docs/checkpoints/m1/`. 🧑 Human sanity check: does the wow land? Log the verdict.

---

## P7 — Accounts, subscriptions, paywall (Backend §5, UIUX §2.8–§2.9)

- [ ] **P7.T1** 🤖 Identity linking: Apple/Google `linkIdentity()` + phone OTP; account sheet (UIUX §2.9) at save/compat/fortune triggers; `account-merge` edge-case function (Backend §5.1.3).
  - Verify: anonymous user with 2 readings links Apple ID → same UUID, readings intact; merge path covered by an integration test.
- [ ] **P7.T2** 🧑 Store products: subscriptions in App Store Connect + Play Console (monthly + annual, **no trial** — UIUX U3 decision); RevenueCat `premium` entitlement + offerings; SEA regional pricing per UIUX §2.8.
  - Verify: offerings fetch in sandbox on both platforms.
- [ ] **P7.T3** 🤖 RevenueCat SDK (`appUserID` = Supabase UUID), `revenuecat-webhook` (HMAC, idempotent on `rc_event_id`, upsert `subscriptions`), two-layer gating helper per Backend §5.2.
  - Verify: sandbox purchase on device → webhook event row + `premium` active; server-side gate flips; expiry flips it back (RC sandbox time-travel).
- [ ] **P7.T4** 🤖 Paywall: Paywalls v2 template per UIUX §2.8 (3 pages, personal locked-section peek, plan layout, close-✕, decline → 24h win-back job into `push_jobs`), fired from the 5 contextual triggers only.
  - Verify: every trigger opens the paywall with the correct hero context; purchase unlocks deep-dive generation live; paywall funnel events in PostHog.
- [ ] **P7.G** 🚦 **Phase gate:** sandbox purchase→entitlement→server-gated feature end-to-end on both platforms; walk the flow to prove no paywall is reachable before the first reading.

---

## P8 — The viral loop (M2 — Backend §7–§8, UIUX §2.6–§2.7, §2.10, §3)

- [ ] **P8.T1** 🤖 `card-render` function (`npm:@vercel/og`, Noto fonts embedded): solo palm variant, feed 4:5 + story 9:16 per UIUX §3 anatomy (diagram hero reusing the line-render logic, chips, seal rail); immutable-cache upload to `cards`; pre-render hook in `worker-narrative`.
  - Verify: cards for the 5 test sets pass the UIUX §3.2 screenshot-test checklist (review saved to `docs/checkpoints/p8-cards/`); render fits the 2s CPU budget (function logs); files <450KB.
- [ ] **P8.T2** 🤖 Share sheet (UIUX §2.6): variant carousel, channel row (remote-config order), pre-composed per-channel text, compare-toggle → `invite-create`.
  - Verify: share to WhatsApp + copy-link on device attaches the right card/text/link; `invites` row with hashed token; PostHog share events fire.
- [ ] **P8.T3** 🤖 Teaser page: `invite-page` on the custom domain (`palmly.app/i/{token}`) — SSR HTML <50KB, per-invite OG tags, CTA arming clipboard (iOS) / referrer URL (Android), store redirects, human-readable fallback code, WeChat open-in-browser overlay (Backend §8.2, UIUX §2.10).
  - Verify: `curl` shows correct OG tags per token; loads <1s on throttled 3G; CTA routes correctly for installed/not-installed × iOS/Android on device.
- [ ] **P8.T4** 🤖 Deferred deep-link resolution: AppsFlyer SDK + `resolveDeferredContext()` (iOS clipboard read on first open, Play Install Referrer, AppsFlyer callback, manual code entry) → `invite-claim` (idempotent, hash-verified) → recipient routing context.
  - Verify: with TestFlight/Internal-track builds — uninstalled device clicks link → installs → first open lands in "waiting for you" context. Log which mechanism resolved (`source`) for each of ≥6 matrix runs.
- [ ] **P8.T5** 🤖 Compatibility service: deterministic scorer (`algorithm_version` v1 — Five-Element interactions + line pairings per Backend §7, warm-skewed distribution), `compat-request`/`worker-compat`, `awaiting_b` lifecycle, Flash-Lite both-perspectives narrative, both-sides Realtime + push on completion.
  - Verify: unit tests — same pair always same score; distribution over 500 synthetic pairs lands in the 55–85 skew; two staging users produce a pair result end-to-end.
- [ ] **P8.T6** 🤖 Pair reveal + recipient flow UI: red-thread choreography, sub-score fan, sender pending-state card, recipient personalized onboarding → pair reveal *then* own reading (UIUX §2.7/§2.10); compatibility + fortune share-card variants.
  - Verify: two physical devices run the full theatre simultaneously; recordings in `docs/checkpoints/m2/`.
- [ ] **P8.G** 🚦 **M2 GATE — the loop closes:** on two physical devices with a fresh recipient: reading → share → WhatsApp → teaser → install → deferred landing → recipient scan → pair reveal both sides → recipient reshares. Full K-factor funnel visible in PostHog (`invite_created → clicked → installed → accepted`). Webview matrix (WhatsApp/LINE/Zalo minimum) tested and logged. 🧑 Human walkthrough verdict logged.

---

## P9 — Retention layer (M3 — Backend §10, mvp_spec §4.5, UIUX §2.11, §4)

- [ ] **P9.T1** 🤖 Day-pillar bucketing: deterministic `element_profile` → `pillar_bucket` (BaZi-lite per mvp_spec §8 — lightweight); birth-date capture UI at fortune first-open.
  - Verify: unit tests — known dates map to expected pillars; missing birth date → graceful generic bucket.
- [ ] **P9.T2** 🤖 `fortune-generate` nightly cron → Gemini **Batch API** (next-day × 60 buckets × en) → `fortune_templates`; poller ingest; almanac content schema per Backend §3.2.
  - Verify: a staging cron run yields complete next-day coverage; spot-read 5 for tone + claims audit; cost logged (~$0.25/day scale).
- [ ] **P9.T3** 🤖 Fortune home (UIUX §2.11): dual-calendar date, free one-liner + premium full almanac (U4 gating), streak strip, red-thread row, readings shelf; fortune share card.
  - Verify: free vs premium render per entitlement; fortune-open writes `user_fortunes`; share card passes the checklist.
- [ ] **P9.T4** 🤖 Push infrastructure: `devices` token registration, `push_jobs` + `push-dispatch` (≤500/s, receipts, `DeviceNotRegistered` pruning), timezone-sharded fortune send, prefs, quiet hours (Backend §10).
  - Verify: staged send lands on test devices with correct copy + deep link at the right local time (2 simulated timezones); receipts recorded; prefs toggle suppresses.
- [ ] **P9.T5** 🤖 Notification content per the UIUX §4 table (reading-ready, compat-complete, invite-accepted, fortune, win-back, day-1–3 onboarding), templated, caps/dedupe server-side.
  - Verify: each trigger fires exactly once in an E2E staging pass; forced double-trigger dedupes.
- [ ] **P9.T6** 🤖 Chat (premium): `chat-send` SSE streaming, grounded on the thread's reading features + pgvector KB retrieval, suggestion chips from the user's own features, thread UI (UIUX §2.11).
  - Verify: on-device chat cites the user's actual lines; entitlement gate holds; a 10-prompt adversarial mini-suite (medical/off-topic) deflects gracefully.
- [ ] **P9.G** 🚦 **M3 GATE:** a subscribed test user receives the morning fortune push, opens to the almanac, and asks the chat a question grounded in their reading — one continuous session, recorded.

---

## P10 — Settings, privacy, deletion (Backend §9, UIUX §2.11)

- [ ] **P10.T1** 🤖 Settings screens: subscription management links, notification granularity + fortune time, language stub, methodology page, legal pages (templates — 🧑 legal review flagged in log), restore purchases.
  - Verify: every row functional; nothing dead-ends.
- [ ] **P10.T2** 🤖 Privacy center + data lifecycle: `cleanup` cron (24h crop deletion via Storage API, expired invites, stale anon users), "delete my scans now", `account-delete` full erasure (rows + storage + RC subscriber + AppsFlyer request + `deletion_log`), opt-in keep-my-scan toggle (D2).
  - Verify: **erasure test** — a populated test account deleted → a script asserts zero rows across all tables, zero storage objects, RC subscriber gone; crop auto-deletion confirmed with `image_deleted_at` set; the "photo deleted ✓" UI reflects truth.
- [ ] **P10.G** 🚦 **Phase gate:** deletion script green; retention behavior matches the privacy-policy language read side-by-side.

---

## P11 — Analytics & observability completeness (Backend §12, §14; UIUX §8)

- [ ] **P11.T1** 🤖 Event taxonomy audit: implement/verify every event in UIUX §8 + Backend §14 (capture funnel, K-factor states, paywall funnel, fortune retention, consistency micro-survey). One typed emitter module.
  - Verify: `docs/ANALYTICS.md` maps every mvp_spec §10 metric → a concrete PostHog event/funnel/cohort, each verified live once.
- [ ] **P11.T2** 🤖 Ops dashboards + alerts: worker telemetry dashboard (queue age, model latency, cache-hit ratio, per-job cost, extraction failure rate); alert rules per Backend §12 (queue p95 >60s, failures >5%, cache <80%, spend anomaly) wired to email/Slack.
  - Verify: each alert fires under forced staging conditions.
- [ ] **P11.G** 🚦 **Phase gate:** all five mvp_spec §10 validation metrics answerable from dashboards today, with live data.

---

## P12 — Hardening, evals, store prep, launch (M4)

- [ ] **P12.T1** 🧑 ∥ Assemble the **extraction eval set**: 30–50 consenting real palm photos (varied skin tones, ages, lighting) + adversarial samples (blur, non-hand). Stored outside git; manifest with consent flags in `eval/`.
  - Verify: manifest committed.
- [ ] **P12.T2** 🤖 **Extraction bake-off (Backend D3 gate):** `eval/` harness runs the set through `gemini-3.5-flash` vs `claude-sonnet-5` — per-field agreement, repeat-run stability (3 runs each), human-graded plausibility on 10 samples; decision rule pre-registered in the harness README.
  - Verify: `eval/REPORT.md` produced; 🧑 sign-off on the winner in the Build Log. If Gemini loses on stability or crease detection, flip the `worker-scan` model config (config-only change) and log the cost impact.
- [ ] **P12.T3** 🤖 Load test: k6 against staging at the Backend §11.2 spike shape (8 scan-jobs/s peak, realtime subscriptions, teaser hits); confirm queue backpressure and zero user-facing errors; prod spend cap OFF; prod compute sized from results.
  - Verify: k6 report meets targets; chosen prod compute tier logged.
- [ ] **P12.T4** 🤖 Security pass: checklist over the two unauthenticated surfaces (invite-claim, webhooks) + RLS review + secrets audit + rate-limit verification (Backend §13).
  - Verify: `docs/SECURITY.md` checklist green; issues fixed or accepted-with-note.
- [ ] **P12.T5** 🤖 Compliance & copy audit: no-health-claims sweep across KB/prompts/notifications/store copy; "for reflection & entertainment" placement; privacy labels (App Store nutrition + Play Data Safety) drafted from the Backend §9 table.
  - Verify: audit pass logged; labels drafted in `docs/STORE.md`.
- [ ] **P12.T6** 🧑 Store assets & listings: screenshots (from M1/M2 recordings), preview video, descriptions, keywords; regional price tiers entered; TestFlight + Play closed-track groups created.
  - Verify: both listings review-ready.
- [ ] **P12.T7** 🤖 Beta cycle: distribute to 10–20 testers; triage crashes/UX blockers into new tasks appended to this phase; watch the five validation metrics for early signal.
  - Verify: crash-free rate >99%; capture completion >75% among testers; blocker list empty or accepted.
- [ ] **P12.T8** 🧑 **Launch go/no-go:** review M-gates, eval report, load test, beta metrics, store readiness. Record the decision.
- [ ] **P12.T9** 🤖 Production launch: prod migrations + function deploy, env cutover checklist, store submissions via EAS Submit, monitor dashboards through the first 72h, hotfix protocol (EAS Update for JS).
  - Verify: live in both stores; prod dashboards nominal; STATE block set to **MVP SHIPPED** 🎉.
- [ ] **P12.G** 🚦 **M4 GATE:** live in both stores; all mvp_spec §10 metrics collecting production data.

---

## 📔 BUILD LOG (append one line per completed task — newest last)

| Date | Task | Result / evidence | Notes |
|---|---|---|---|
| 2026-07-11 | P0.T6 | `docs/ENVIRONMENT.md` (7 sections: accounts, client keys, server secrets, CI, store, file layout, D1 Qs) + `.env.example` (all placeholders) created. Coverage check: GEMINI_API_KEY, EXPO_TOKEN, REVENUECAT, SUPABASE, POSTHOG, SENTRY, APPSFLYER, TURNSTILE all present in both files (2/2). | Also initialized local git (`main`) + `.gitignore` so per-task commits work; GitHub remote still owed by human (P0.T1). |
| 2026-07-11 | P1.T1 | Scaffolded `app/` via `create-expo-app --template expo-template-default@sdk-56` → expo ~56.0.15, RN 0.85.3, React 19.2.3, New Arch, expo-router. TS strict already on; absolute imports `@/*`→`./src/*`. Added eslint-config-expo@57 flat config + prettier + `typecheck`/`format` scripts. Verify: `tsc --noEmit` exit 0; `npm run lint` exit 0; `expo start` → packager-status:running + Metro bundle HTTP 200 (8.96MB, 13s). Monorepo dirs created: modules/palm-landmarks, supabase/{migrations,functions,seed,tests}, prompts, kb, eval, web, .github/workflows (READMEs/.gitkeep). | Fixed 2 template issues to pass verify: CSS-module TS decls (`types/css.d.ts`) + rewrote `use-color-scheme.web.ts` to `useSyncExternalStore` (react-hooks/set-state-in-effect). |
| 2026-07-11 | P1.T2 | Design system in `app/src/theme/` (tokens.ts palette+spacing+radii+strokes+type scale, theme.ts light/dark semantic, ThemeProvider w/ expo-font Noto Serif Display + Noto Sans + Noto Serif TC). 5 primitives in `app/src/components/ui/` (Screen, Text, Button, Card, SealBadge). `/dev/theme` shows both schemes. Root `_layout.tsx` → minimal Stack + ThemeProvider + SafeAreaProvider. Verify: tsc + lint clean; headless-Chrome screenshot of `/dev/theme` (web, :8082) → **`docs/checkpoints/p1-theme.png`** shows all 6 tokens, type scale (serif+sans+CJK loaded), CJK markers 心智命运, all 5 primitives, in light+dark. | Chrome extension unavailable → captured via `chrome --headless=new --screenshot` at 1440×2000 (static-rendered route). Text enforces §1.2 rule: cinnabar never <18pt (dev warn). |
| 2026-07-11 | P1.T3 | Navigation shell: 6 route groups `(onboarding)`/`(capture)`/`(reading)`/`(home)`/`(settings)`/`(modals)` each with a Stack `_layout`, 17 placeholder screens named per UIUX §2 flow + reusable `PlaceholderScreen`, root launcher `index.tsx`, dev route map `/dev`. Deleted template `explore.tsx` + `app-tabs.*`. Verify: tsc+lint clean; all **20 routes SSR HTTP 200** (no red screens) on web :8082; route map screenshot `docs/checkpoints/p1-nav.png`. On-device deferred (no emulator; needs EAS dev build P1.T4). | Typed routes on → nav hrefs cast to `Href`. |
| 2026-07-11 | P0.T1 | GitHub remote present + push verified: `git remote -v` → `origin https://github.com/lerboi/Palmly.git`; pushed 4 pending docs commits `75e3491..402fe93 main -> main` (fast-forward). | Human created the private repo since last run. |
| 2026-07-11 | P0.T2 | Both Supabase projects provisioned + keys recorded. Staging `rphtdgoggsldshtdbkaj` **live** (MCP `get_project_url` 200; public schema empty pre-P3). Prod `ypleexgxoshrslbiluei` ref/url/publishable/`sb_secret_`/db-pw in `.env.prod`. | Prod not pinged (no prod CLI token; not needed until P12). |
| 2026-07-11 | P0.T3 | Gemini **paid** key valid: `generateContent` on `gemini-3.1-flash-lite` → HTTP 200 (`PALMLY_OK`); models-list exposes paid catalog incl. `gemini-3.5-flash`, Batch, embeddings. | Still owed: mirror `GEMINI_API_KEY` into Supabase Vault (staging) at P3.T5/P5.T2. |
| 2026-07-11 | P1.T4 `[~]` | EAS config complete + validated: 3 profiles (`eas.json`), `expo-dev-client`, EAS project `@lehehroi/palmly` linked, `expo-updates`/channels wired, seal placeholder icon+splash, `app.json` rebranded (Palmly/palmly/scheme). `tsc` 0, `lint` 0, **`expo-doctor` 21/21**. Android dev build queued (build `e081b5db`). | **Parked `[~]`**: on-device install/launch unverifiable — no Android device/emulator on host. This is the first hard hardware blocker. |
| 2026-07-11 | P1.T5 `[~]` | `.github/workflows/ci.yml` (quality job: lint/typecheck/test:ci/expo-doctor on PR+push; eas-preview job w/ manual-approval Environment on main). Added jest+jest-expo harness + smoke test (4/4). Local dry-run: lint 0, tc 0, test 0, **doctor 21/21**; YAML valid. + `docs/SETUP.md`. | **Parked `[~]`**: green-PR verify needs human repo secret `EXPO_TOKEN` + `preview-build` Environment + a PR (no `gh`/token on host to open/observe). |
| 2026-07-12 | P3.T1 | Docker-free backend harness: `supabase init` (config.toml) + `supabase/tests/` pure-JS `pg` harness (`lib/db.mjs`: withRollback, applyMigrations, asRole/resetRole, seedUser) + `scripts/apply.mjs` (guarded persistent deploy). Verify: `node --test` **3/3** against staging (all transactional/rolled-back). Proven capabilities: `auth.users` seed, role+JWT impersonation → `auth.uid()`, RLS enforcement, clean rollback. | Reorder (P3 before P2) + Docker-free, both per user; see Decision Log. |
| 2026-07-12 | P3.T2 | Migrations 0001 (18-table schema §3.2) + 0002 (RLS §3.3: all policies, `is_pair_member`/`thread_owner` security-definer helpers, anon-restriction). RLS test suite (`node --test`) **19/19** green. Ran adversarial-review workflow (4 reviewers + verify): 23 raw → 8 confirmed → all fixed, incl. a real invites INSERT forgery hole (tightened WITH CHECK) + 7 coverage gaps. `expectDenied` now asserts SQLSTATE 42501. | Deliverable = the RLS tests. Deferred LOW: storage RLS→T3, kb hnsw→P9. |
| 2026-07-12 | P3.T3 | Migration 0003 storage: `scans` (private) + `cards` (public) buckets; `storage.objects` RLS — owner-only CRUD on scans (`foldername(name)[1]=auth.uid()`), public read on cards. `storage.test.mjs` **3/3** (suite 22/22). | Signed-URL helper → scan-create (P4.T4). |
| 2026-07-12 | P3.T4 | Migration 0004 queues: `pgmq`+`pg_cron`; 5 queues (scan/narrative/compat/push/cleanup); `worker_telemetry`; `drain_stub` no-op worker + 5 cron drains. `queues.test.mjs` **3/3** (suite **25/25**): enqueue→drain→archive→telemetry. | P5 swaps cron `drain_stub`→Edge Function worker. |
| 2026-07-12 | P3.T5 `[~]` | Edge Function skeleton + `_shared/` (http/error-envelope, auth-resolve, context, gemini+retry, telemetry) + `hello`. **Deno 2.9** `deno test` **10/10** + `deno check` clean + **live curl**: service key⇒secret, JWT⇒user, anon⇒none. CI: `functions` job in `ci.yml` + `deploy.yml` (staging). | **Parked `[~]`**: "deployed by CI" needs `SUPABASE_ACCESS_TOKEN` (Human-tasks H4b). Auth-mode behavior verified live. |
| 2026-07-12 | P3.T6 `[~]` | Backend: migration 0005 `on_auth_user_created` trigger → auto-provisions `profiles` (mirrors `is_anonymous`); `auth.test.mjs`, suite **26/26**. App: supabase-js + AsyncStorage client (`lib/supabase.ts`) + anon-first `ensureSession`/`useAuthBootstrap` (`lib/auth.ts`) wired into root layout; tsc 0, lint 0, doctor 21/21. | **Parked `[~]`**: `signInAnonymously` is disabled on staging (422) → **H5** toggle; on-device reuse check needs **H1** device; Turnstile → **H6**. |
| 2026-07-12 | P5.T1 `[~]` | `schemas/palm_features.v1.json`+`face_features.v1.json` (enum-heavy) + `prompts/extraction/v1/system_instruction.md` (rubric+taxonomy+3 few-shot, byte-stable). `eval/p5t1.mjs` (ajv): schemas accept valid / reject bad-enum; prefix stable. | **Parked `[~]`**: Gemini caching → 429 `FreeTier limit=0` (+ implicit not hitting) ⇒ key is free-tier. Needs paid key (**H4c**); also a §13 production blocker. |
| 2026-07-12 | P5.T2 `[~]` | `worker-scan` + `_shared/extraction,features,schema` (extract→validate→hash→geometry) + migration 0006 pgmq RPC wrappers. **`deno test` 21/21** (all failure modes + hash determinism), `deno check` clean, **Node 28/28** incl. full worker DB flow. | **Parked `[~]`**: live "5 images→5/5" needs test images (Gemini img-gen 429) + paid key (**H4c**). |
| 2026-07-12 | P5.T3 `[~]` | `_shared/consistency.ts` (matchSubject/fieldMajority/twoVoteExtract) + worker reuse/2-vote integration. `deno test` **27/27**, `deno check` clean, Node **30/30** incl. repeat-scan invariant (same hand ×3 → 1 canonical reused; different → new subject). | **Parked `[~]`**: zero-extraction fast path needs P2 capture geometry; live run needs **H4c**+images. |
| 2026-07-13 | P5.T4 | KB v1: `kb/v1/palmistry.json` (94) + `physiognomy.json` (47) = **141 chunks**, one per `(feature, enum-value)`, classical 手相/面相, entertainment-framed, no-health. `kb/audit.mjs` derives required keys from the schemas (enum-leaf walker + KEY_MAP; unmapped path = hard fail) → **coverage 141/141**, **banned-claims clean** (`P5T4_OK`). `kb/load.mjs` (byte-stable rows, embedding null) + `supabase/tests/kb.test.mjs` (load 141 → keyed lookup every enum value → idempotent re-load → authenticated read) → **suite 34/34** vs staging (rolled back). Persistent loader `scripts/load-kb.mjs` (`CONFIRM=1`). | H4c re-checked → still free-tier. Device-free/Gemini-free. Practitioner review = P5.T5 (H6b). |
| 2026-07-13 | P5.T6 | `worker-narrative` + `_shared/narrative.ts` (deterministic `selectClaims` → KB-keyed grounding → Gemini prose → graft onto claim skeleton → validate → content-safety) + `schemas/reading_sections.v1.json` + `prompts/narrative/v1/`. Claims (tags/feature_refs/depth) are code-derived → identical across regenerations; wording varies. `eval/p5t6.ts`: **5 sets** schema-valid + claims-stable + no-banned (`P5T6_OK`) **+ live gemini-3.1-flash-lite → schema-valid reading**. **Deno 35/35**, `deno check` clean; **Node 37/37** incl. `worker_narrative.test.mjs` (stamped readings, keyed lookup, RLS). | Narrative pass is text-only → **live works despite H4c** (H4c gates caching + image-data-training only). Reinstalled Deno 2.9.2 (was absent this session). |

## 🧾 DECISION LOG (append when a build-time decision deviates from or refines the specs)

| Date | Decision | Why | Spec section affected |
|---|---|---|---|
| 2026-07-11 | Plan created (v1.0) | — | — |
| 2026-07-11 | Initialized local git repo (`main`) during P0.T6 even though P0.T1 (GitHub remote) is a pending human task | Per-task commits (Execution Protocol step 6) require a local repo; creating the GitHub *remote* + push access remains the human's P0.T1 work. Non-destructive, unblocks all agent ∥ work. | Buildplan Execution Protocol |
| 2026-07-11 | Documented **two** cloud Supabase projects (staging+prod) + local `supabase start` for dev, not the three in Backend §12 | Ledger P0.T2 specifies two; P3.T1 uses local Docker for dev. Reconciled in `docs/ENVIRONMENT.md`. | Backend §12 |
| 2026-07-11 | Pinned Expo **SDK 56** (56.0.15) as the plan specifies, though SDK 57 is now npm `latest`. `eslint-config-expo` pinned to `^57.0.0` (its `latest`; no stable `sdk-56` tag exists — only a canary) | Plan/§Standing rules say follow the specs; VisionCamera V5 + MediaPipe validation (Backend §2) was done against SDK 56. eslint rules are SDK-agnostic so @57 lints SDK-56 code fine. Revisit if a P2 native dep requires SDK 57. | Backend §2.1, §12 |
| 2026-07-11 | Kept template's `src/app/` router root + `@/*`→`./src/*` alias (create-expo-app default) rather than a root `app/` routes dir | It's the current Expo convention, already wired into tsconfig; no reason to fight the template. P1.T3 route groups go under `app/src/app/`. | UIUX nav / P1.T3 |
| 2026-07-11 | Defined spacing scale (4px base: xs4…huge64), radii, stroke widths (engraved 1.5px), and type scale (display/title serif 34/24, body sans 16, etc.) — UIUX §1.2 specifies colors/fonts but not numeric scales | Spec is silent on numbers; picked a conventional modest scale. Recorded in `app/src/theme/tokens.ts`. | UIUX §1.2 |
| 2026-07-11 | Replaced template's `NativeTabs` demo root layout with a minimal `Stack` + Palmly `ThemeProvider` + `SafeAreaProvider` | NativeTabs renders native-only (unusable on web, where the P1.T2 screenshot was captured) and only declared index/explore; a Stack makes `/dev/theme` reachable and gives the app a global ThemeProvider. Real route groups come in P1.T3. | P1.T3, UIUX nav |
| 2026-07-11 | P0.T4 accounts: **Apple Individual** + **Google Play Personal**; bundle id `com.palmly.app` pre-set in `app/app.json` | Verified vs official docs (2026): Individual = no D-U-N-S, ~24-48h; Palmly is entertainment so not forced-Organization on Google. Bundle/package immutable once registered/uploaded → lock early. Google package claimed at first AAB upload, not pre-registerable. | P0.T4, P1.T4 |
| 2026-07-11 | **P0.T4 DEFERRED to ~P7 (user decision); marked non-blocking** — Android/backend path proceeds without store accounts; iOS sub-steps (P1.T4 iOS, P2.T3 iOS) deferred with it | Store accounts aren't needed until P7 (subscriptions); Android dev builds need no store account. Lets the build advance through P1–P6 core on Android while the human sets up only EXPO_TOKEN/GitHub/Supabase/Gemini. Google Play's ≥14-day test gate flagged to register early. | P0.T4, P0.G, P1.T4, P2, P7 |
| 2026-07-11 | Verified UI on **web** (react-native-web) via headless Chrome, not an Android emulator | No Android emulator/device available on this host yet; web render exercises the same RN component tree + theme. Device verification deferred to P1.T4 (EAS dev build, needs human EXPO_TOKEN) and on-device tasks. | Buildplan Windows host note |
| 2026-07-12 | **Reordered P3 (backend) ahead of the device-blocked P2 spike; and building the backend DOCKER-FREE** | User: "carry on... try to do everything else" + "don't use docker if possible". P2 (native camera/MediaPipe) is 100% blocked on a physical device (→ Human-tasks H1); all of P3 is device-free. Docker-free: migrations + RLS tested against **staging** in rolled-back transactions via a pure-JS `pg` harness — real Supabase platform, no persistent mutation, no local stack. Adapts P3 verifies that referenced `supabase db reset` / `supabase test db` to the harness (`node --test`). Local `supabase start` still works if Docker is ever started (same migration files). P2 stays open until a device exists. | Buildplan P2-before-P3 ordering; §12 local-dev-via-Docker; P3 verifies |
| 2026-07-12 | Human tasks tracked in `Planning/Human-tasks.md` | User asked for a dedicated file of everything only they can do; loop writes blockers there and does everything else. | Loop protocol |
| 2026-07-13 | **KB `feature_key` = atomic per-`(feature, enum-value)` keys** (e.g. `heart_line.depth.deep`), not per-combination compound keys. Narrative worker composes one chunk per salient extracted value. | §6.5 gives examples (`heart_line.deep_long_curved`) but the full per-line enum cross-product is combinatorial (~1944/line) and not hand-authorable or reviewable; atomic keying is the sum of enum values (141 total), matches how classical readings compose descriptors, keeps determinism ("same features → same passages"), and is what P5.T5 practitioner review can actually audit. | Backend §6.5, §6.6.6 |
| 2026-07-13 | **KB coverage excludes meta/quality/pipeline enum fields** (`*.confidence`, `overall_confidence`, `exposure_quality`) and free-string `notable_markings.location` (markings keyed by `type`). `line_geometry`/booleans are non-enum so never required. | These drive pipeline logic and rendering, not narrative grounding — no KB passage to author. Exclusions are explicit in `kb/audit.mjs` KEY_MAP; any *unmapped* enum path still hard-fails, so only deliberately-excluded fields escape coverage. | Backend §6.2, §6.5 |
| 2026-07-13 | **Narrative claims are deterministic code, only prose is the model (P5.T6).** `selectClaims` computes each reading's sections + `tags`/`feature_refs` (feature_keys) + `depth_level` from the stored features via keyed KB lookup; Gemini writes headline/title/body, which are *grafted* onto that fixed skeleton. Model-supplied section keys/tags are never trusted. | §6.6.6 requires "wording varies, claims cannot" and P5.T6 verify requires "regenerating from identical features yields identical claims." Making the claim-bearing fields code-derived makes that guarantee provable and testable **offline** (no live model), and neutralises model nondeterminism. Also lets premium depth-2 unlock reuse the same skeleton (§6.3). | Backend §6.3, §6.6.6 |
| 2026-07-13 | **Narrative depth mapping (v1):** palm depth-1 (free) = hand_shape + heart/head/life lines; depth-2 (premium) = fate, mounts, markings. Face depth-1 = face_shape + proportion (三停+五眼) + eyes; depth-2 = brows, nose, mouth, ears, 卧蚕. Line sections surface breaks/islands/chains only when ≠ `none`. | §6.3 says depth-1 covers "major lines/proportions", depth-2+ adds sections from the same feature_set; the split + notable-morphology rule are spec-silent details chosen for a focused free reading with real premium upside. | Backend §6.3, mvp_spec §4.5 |
