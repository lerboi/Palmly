# Palmly — MVP Build Plan & Execution Ledger

**Status:** ACTIVE — this file is the single source of truth for build progress.
**Inputs (read before executing anything):** `Planning/mvp_spec.md` · `Planning/Backend-specs.md` · `Planning/UIUX-specs.md`
**Created:** 2026-07-11 · Plan version: 1.0

This document is designed to be executed **on a loop** — by Claude Code sessions, over days or weeks, resuming exactly where the last run stopped. It is a state machine, not prose: every task has a checkbox, an owner, a build instruction, and a **verification that must pass before the box may be checked**.

---

## 🔄 STATE — update this block on every run

| Field | Value |
|---|---|
| **Current phase** | P1 (agent ∥ work in progress) |
| **Next task** | P1.T2 (∥ design system / theme) |
| **Blocked on** | — (P0.T1–T5 are HUMAN, see "Waiting on human") |
| **Waiting on human** | **P0.T1–T5 (accounts/keys).** See "Notes for next run" for the exact checklist. |
| **Last run (date, by whom)** | 2026-07-11, agent |
| **Last completed task** | P1.T1 (Expo SDK 56 scaffold + monorepo) |
| **Notes for next run** | Local git repo initialized (`main`). Agent ∥ path: P0.T6 ✅ done. Next ∥ agent tasks are P1.T1→T3 (scaffold/theme/nav) — proceed with those while the human tasks below are pending. Next agent ∥ tasks: P1.T2 (theme) then P1.T3 (nav shell) — both buildable now, no keys needed. P1.T4–T6 (EAS build, CI, analytics) need human keys (EXPO_TOKEN / GitHub repo / PostHog+Sentry). **HUMAN must do before P0.G / P1.T4–T6 / P3+ can proceed:** (1) **P0.T1** create private GitHub repo `palmly` + `git remote add origin` + push access; (2) **P0.T2** Supabase org + `palmly-staging` & `palmly-prod` (region ap-southeast-1), put URLs/anon+service keys in `.env.staging`/`.env.prod`; (3) **P0.T3** paid-tier `GEMINI_API_KEY` → Supabase Vault (staging) + local env; (4) **P0.T4** Apple Developer + Google Play accounts, register bundle id `com.palmly.app`; (5) **P0.T5** Expo/EAS `EXPO_TOKEN`, RevenueCat (iOS+Android apps), AppsFlyer Zero (+ask the 2 D1 questions), PostHog, Sentry, domain `palmly.app` + DNS/Cloudflare Turnstile. Fill values into `.env.*` per `docs/ENVIRONMENT.md`. **App structure note:** routes live in `app/src/app/` (template convention), path alias `@/*`→`./src/*`. |

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

- [ ] **P0.T1** 🧑 Create GitHub repo `palmly` (private) and grant the working machine push access.
  - Verify: `git remote -v` shows the repo; a test push succeeds.
- [ ] **P0.T2** 🧑 Supabase: create org + two projects (`palmly-staging`, `palmly-prod`), region `ap-southeast-1`. Record project refs/URLs/anon+service keys in `.env.staging` / `.env.prod` (local only).
  - Verify: `supabase projects list` shows both; keys present in local env files.
- [ ] **P0.T3** 🧑 Google AI Studio / Cloud: create **paid-tier** Gemini API key (Backend §13 — free tier is disqualifying for user data). Record as `GEMINI_API_KEY` in Supabase Vault (staging) + local env.
  - Verify: `curl` to `models.generateContent` with `gemini-3.1-flash-lite` returns 200 and the account shows billing enabled.
- [ ] **P0.T4** 🧑 Apple Developer Program + Google Play Console accounts active; app identifiers registered (`com.palmly.app` or chosen ID).
  - Verify: bundle ID visible in both consoles.
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
- [ ] **P1.T2** 🤖 ∥ Design system foundation per UIUX §1.2: theme module with the Ink & Cinnabar tokens (`paper/ink/ink-wash/cinnabar/gold/jade`), dark mode, Noto Serif Display + Noto Sans via `expo-font`, spacing/type scale, and 5 primitives (`Screen`, `Text`, `Button`, `Card`, `SealBadge`).
  - Verify: a `/dev/theme` screen renders all tokens/primitives in light+dark; screenshot saved to `docs/checkpoints/p1-theme.png`.
- [ ] **P1.T3** 🤖 ∥ Navigation shell (Expo Router): route groups for `(onboarding)`, `(capture)`, `(reading)`, `(home)`, `(settings)`, modal group for paywall/share; placeholder screens with route names.
  - Verify: can tap through every route on the Android emulator without red screens.
- [ ] **P1.T4** 🤖 EAS setup: `eas.json` with `development` / `preview` / `production` profiles per Backend §12; dev-client config; app icon/splash placeholder (seal mark).
  - Verify: `eas build --profile development --platform android` completes and the APK installs + launches on emulator/device. (iOS dev build kicked off; verify install on iPhone when available — record in log.)
- [ ] **P1.T5** 🤖 CI: GitHub Actions — on PR: lint, typecheck, unit tests, `expo-doctor`; on main: same + trigger EAS preview build (manual approval).
  - Verify: a test PR shows all checks green in Actions.
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

- [ ] **P3.T1** 🤖 Supabase local dev (`supabase init`, `supabase start`); link staging project; migration workflow documented in `docs/SETUP.md`.
  - Verify: `supabase db reset` runs clean locally.
- [ ] **P3.T2** 🤖 Migration 0001: full schema from Backend §3.2 (all tables, checks, indexes, canonical-pair constraint). Migration 0002: RLS policies per §3.3 (wrapped `auth.uid()`, `to authenticated`, pair-visibility via security-definer helper).
  - Verify: `supabase db reset` clean; a pgTAP suite (`supabase test db`) proves: owner reads own scan, stranger cannot; either pair member reads the pair, third party cannot; anon-JWT restrictive policy works. **The RLS tests are the deliverable, not just the policies.**
- [ ] **P3.T3** 🤖 Storage: private `scans` bucket + public `cards` bucket; `storage.objects` RLS (path-owner convention); signed-upload-URL helper.
  - Verify: test — user A uploads to own path, cannot read user B's object; public card URL fetches anonymously.
- [ ] **P3.T4** 🤖 Queues + cron plumbing: enable pgmq (`scan_jobs`, `narrative_jobs`, `compat_jobs`, `push_jobs`), pg_cron drain schedules (no-op workers for now), `worker_telemetry` table.
  - Verify: SQL test enqueues → cron-invoked stub dequeues + archives → telemetry row written.
- [ ] **P3.T5** 🤖 Edge Function skeleton + shared lib (`_shared/`: auth modes, Gemini client with retry/backoff, telemetry writer, error envelope); CI deploy pipeline to staging (Backend §12).
  - Verify: `hello` function deployed by CI; responds auth-mode-aware for user JWT vs service key.
- [ ] **P3.T6** 🤖 Anonymous-first auth in app: `signInAnonymously()` on first launch, profile row creation, Turnstile per Backend §5.1.
  - Verify: fresh app install → `auth.users` + `profiles` rows exist; relaunch reuses the session (no new user).
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

- [ ] **P5.T1** 🤖 Pass-1 assets: `prompts/extraction/v1/` (system instruction, rubric, 3–5 few-shot anchors) + `schemas/palm_features.v1.json` / `face_features.v1.json` (enum-heavy per Backend §6.2). Register the frozen prefix as Gemini explicit cached content.
  - Verify: schemas validate sample outputs; cached-content object created; `cachedContentTokenCount > 0` on a second call.
- [ ] **P5.T2** 🤖 `worker-scan`: dequeue → Gemini 3.5 Flash extraction (`responseSchema`, temp 0, pinned seed) → server-side validation → store `feature_sets` (+`feature_hash`, `geometry`) → status transitions + telemetry (tokens, latency, cache hits).
  - Verify: 5 test palm images through the full staging path → 5/5 schema-valid feature rows; telemetry complete; a non-hand image → `failed` with a specific `failure_reason`.
- [ ] **P5.T3** 🤖 Consistency layer (Backend §6.6.3–5): subject-identity matching vs `subject_profiles` (geometry threshold), canonical-reuse fast path, 2-vote + tie-break extraction for new subjects with field-level majority.
  - Verify: **the repeat-scan test** — same hand scanned 3× → one extraction cycle total; scans 2–3 short-circuit to `matched` and reuse the canonical feature_set; a different person's hand → new subject. This is the P1 trust requirement; record evidence in the log.
- [ ] **P5.T4** 🤖 KB v1: draft `kb/v1/` palmistry + physiognomy entries keyed by `feature_key` (classical 手相/面相 grounding, entertainment-appropriate, **no health/medical claims** — Backend §13); load into `kb_chunks`; deterministic keyed lookup.
  - Verify: every enum combination in both schemas resolves to ≥1 KB chunk (coverage script); banned-claims grep audit passes.
- [ ] **P5.T5** 🧑 ∥ KB review: native-reader / practitioner review of KB v1 for authenticity (mvp_spec §5.3). Issues become v1.1 edits.
  - Verify: review notes committed to `kb/REVIEW.md`.
- [ ] **P5.T6** 🤖 `worker-narrative`: Flash-Lite narrative grounded on features+KB only (no image), sections schema, `depth_level` handling, version stamps (Backend §6.3).
  - Verify: narratives for the 5 test sets match the sections schema; regenerating from identical features yields identical *claims* (diff of tagged claims); tone passes the no-medical-claims audit.
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

## 🧾 DECISION LOG (append when a build-time decision deviates from or refines the specs)

| Date | Decision | Why | Spec section affected |
|---|---|---|---|
| 2026-07-11 | Plan created (v1.0) | — | — |
| 2026-07-11 | Initialized local git repo (`main`) during P0.T6 even though P0.T1 (GitHub remote) is a pending human task | Per-task commits (Execution Protocol step 6) require a local repo; creating the GitHub *remote* + push access remains the human's P0.T1 work. Non-destructive, unblocks all agent ∥ work. | Buildplan Execution Protocol |
| 2026-07-11 | Documented **two** cloud Supabase projects (staging+prod) + local `supabase start` for dev, not the three in Backend §12 | Ledger P0.T2 specifies two; P3.T1 uses local Docker for dev. Reconciled in `docs/ENVIRONMENT.md`. | Backend §12 |
| 2026-07-11 | Pinned Expo **SDK 56** (56.0.15) as the plan specifies, though SDK 57 is now npm `latest`. `eslint-config-expo` pinned to `^57.0.0` (its `latest`; no stable `sdk-56` tag exists — only a canary) | Plan/§Standing rules say follow the specs; VisionCamera V5 + MediaPipe validation (Backend §2) was done against SDK 56. eslint rules are SDK-agnostic so @57 lints SDK-56 code fine. Revisit if a P2 native dep requires SDK 57. | Backend §2.1, §12 |
| 2026-07-11 | Kept template's `src/app/` router root + `@/*`→`./src/*` alias (create-expo-app default) rather than a root `app/` routes dir | It's the current Expo convention, already wired into tsconfig; no reason to fight the template. P1.T3 route groups go under `app/src/app/`. | UIUX nav / P1.T3 |
