# Palmly — Human Tasks

**What this is:** the running list of things only **you** can do (accounts, API keys, hardware,
dashboards, store setup). The agent build loop writes anything it can't do here and then goes and
does everything else. It re-checks each item at the start of every run — so just do these when you
can and the loop picks them up automatically.

Key/where-it-goes details: [`docs/ENVIRONMENT.md`](../docs/ENVIRONMENT.md). Build order &
per-task verifies: [`Planning/MVP_Buildplan.md`](./MVP_Buildplan.md).

Legend: `[ ]` todo · `[x]` done. Convert to `[x]` when finished (or the agent will when it sees the
evidence).

---

## 🔴 Blocking now — each unblocks agent work that is currently stalled

- [x] **H1 — Android emulator running the app.** ✅ 2026-07-14 — Android Studio + SDK installed;
  Pixel-7 x86_64 AVD created; **Palmly runs on it via a local dev build** (onboarding screen renders,
  no crash — screenshot verified). This satisfies **P1.T4** (dev build installs + launches) and
  unblocks all non-camera on-device UI work (P6 reveal, P7 paywall, P9 fortune/chat UI, P10 settings).
  - **Local dev loop (see `docs/SETUP.md#local-android` + the [[palmly-local-android-build]] memory):**
    `cd app && npx expo start --dev-client` then press **a** (JS/UI changes hot-reload — no rebuild).
    Native/dependency changes → `npx expo run:android` (incremental, fast after the first). Requires
    **JDK 17** (pinned in `~/.gradle/gradle.properties`; JDK 21 breaks the Gradle-9 toolchain resolver).
  - **Still needs a REAL device (not the emulator):** **P2 native landmark spike** (MediaPipe frame-rate
    on hardware — emulators have no real camera/GPU) and all camera capture (P4). Get a physical
    Android phone before P2. iOS remains EAS-cloud + a physical iPhone, later.

- [x] **H2 — PostHog + Sentry projects.** ✅ 2026-07-14 — both created and **verified live**: a
  test PostHog capture → `HTTP 200 {"status":"Ok"}`, a test Sentry envelope → `HTTP 200` + event id.
  `EXPO_PUBLIC_POSTHOG_KEY` (`phc_…`), `EXPO_PUBLIC_POSTHOG_HOST` (`https://us.i.posthog.com`),
  `EXPO_PUBLIC_SENTRY_DSN` are in **`app/.env`** (the Expo project root; agent moved them there from
  the root `.env`). **Sentry org/project = `makeitai` / `react-native`** → use for `SENTRY_ORG` /
  `SENTRY_PROJECT` at P1.T6 source-map upload. **Remaining for full P1.T6 (device):** wire
  `Sentry.init` + PostHog SDK in-app (the `@sentry/wizard` line the user was given, or manual) + the
  on-device `app_opened` event + forced-crash checks. Account/key half is done.

- [ ] **H3 — CI green-check settings (P1.T5).** In the GitHub repo (`lerboi/Palmly`):
  1. **Settings → Secrets and variables → Actions →** add repo secret **`EXPO_TOKEN`**.
  2. **Settings → Environments →** create an environment named **`preview-build`** and add yourself
     as a **required reviewer** (this is the manual-approval gate for the preview build job).
  3. Open one test PR against `main` and confirm the CI checks go green in the Actions tab.
  - (The agent has no `gh` CLI / GitHub token, so it can't do these three or read Actions results.)

---

## 🟡 Needed soon — upcoming phases

- [x] **H4 — `GEMINI_API_KEY` set as an Edge-Function secret (staging).** ✅ 2026-07-14 — set via
  `supabase secrets set GEMINI_API_KEY=… --project-ref rphtdgoggsldshtdbkaj`; confirmed present in
  `supabase secrets list` (digest `17728948…`). The functions read it via `Deno.env.get()` (Edge
  secrets), which is the correct mechanism — not SQL-side Vault. Applies to functions on next deploy.

- [~] **H4b — Supabase deploy secrets.** (1) ✅ 2026-07-14 — Supabase **personal access token**
  created + in `.env` as `SUPABASE_ACCESS_TOKEN` (validated against the Management API: lists 1
  project `palmly-staging`, confirming prod deleted). The agent can now drive the CLI (deploy,
  secrets). (2) ⬜ **Still todo (browser, needed only for *automatic* CI deploys):** add GitHub repo
  secrets (Settings → Secrets → Actions): `SUPABASE_ACCESS_TOKEN`, `SUPABASE_STAGING_PROJECT_REF`
  (`rphtdgoggsldshtdbkaj`), `SUPABASE_STAGING_DB_PASSWORD` — so `.github/workflows/deploy.yml`
  deploys on merge to `main`. **Gates:** P3.T5 "deployed by CI" + P3.G. *(Manual CLI deploy from the
  agent needs only part 1, which is done.)*

- [ ] **H4c — Confirm/enable Gemini PAID tier (important).** The current `GEMINI_API_KEY` behaves as
  **free-tier**: explicit context caching returns `429 FreeTier limit=0` and implicit caching never
  hits (so P5.T1's caching verify can't pass). Two consequences: (1) the ~10× cost saving from
  caching (Backend §6.4) is off; (2) **hard production blocker** — Backend §13: the free tier trains
  on submitted content, which is unacceptable for real palm/face photos. In Google AI Studio / Cloud
  Console, attach billing to the project behind this key (or issue a new key on a billing-enabled
  project) and confirm cached-content storage quota > 0. Functional `generateContent` already works,
  so the build proceeds meanwhile; this must be resolved before real user data / launch.

- [x] **H5 — Enable anonymous sign-ins.** ✅ 2026-07-14 — enabled on staging; verified via the auth
  endpoint: `POST /auth/v1/signup {}` now returns **HTTP 200** with an anonymous session (was `422
  anonymous_provider_disabled`). Throwaway test user cleaned up. The profile trigger + app code were
  already done; this completes P3.T6's server side (the on-device relaunch-reuse check still needs H1).

- [ ] **H6 — Cloudflare Turnstile + domain `palmly.app`.** Buy the domain; in Cloudflare create a
  Turnstile widget. Put `EXPO_PUBLIC_TURNSTILE_SITE_KEY` (client) + `TURNSTILE_SECRET_KEY` (server)
  per ENVIRONMENT.md. **Needed at P3.T6** (anonymous-auth invisible CAPTCHA) and **P8.T3** (teaser DNS).

- [ ] **H6b — KB authenticity review (P5.T5).** When the agent has drafted `kb/v1/` (palmistry +
  physiognomy entries), a native-reader / practitioner reviews it for authenticity; notes go to
  `kb/REVIEW.md`. The agent will flag you when the draft exists.

---

## 🟢 Later milestones (not blocking near-term)

- [ ] **H7 — Store accounts (P0.T4, revisit ~P7).** Apple Developer Program ($99/yr, Individual —
  no D-U-N-S) + Google Play Console ($25 one-time, Personal). Bundle id `com.palmly.app` is locked
  in config. **Start Google Play early** — new personal accounts must run a ≥12-tester / ≥14-day
  closed test before production (~3-week gate). Deferred by your decision; needed for P7 (IAP), P8
  (TestFlight/Internal builds), P12 (submission).
- [ ] **H8 — RevenueCat (P7).** Account + iOS/Android apps + `premium` entitlement + offerings
  (monthly + annual, no trial per U3). Public SDK keys → `EXPO_PUBLIC_REVENUECAT_*`.
- [ ] **H9 — AppsFlyer Zero (P8).** Account + both apps; during setup ask support the **two D1
  questions** in ENVIRONMENT.md §7 and paste answers into the Build Log.
- [ ] **H10 — Extraction eval set (P12.T1).** 30–50 consenting real palm photos (varied skin
  tones/ages/lighting) + adversarial samples (blur, non-hand); stored outside git with a consent
  manifest in `eval/`.

---

## Notes / status the agent left you

- **Supabase: ONE project now (2026-07-14).** You deleted `palmly-prod`; everything targets the
  single `palmly-staging` project (`rphtdgoggsldshtdbkaj`). **Do every Supabase/dashboard task once**
  (H4, H4b, H5, H6 Turnstile) — no prod copy. A fresh prod is created at launch (P12) from the git
  migrations. Migrations are kept backward-compatible so the one DB stays safe. (`.env.prod` is now
  unused; safe to ignore or delete.)

- **Build `e081b5db`** (Android dev build) was queued 2026-07-11 and may now be finished:
  https://expo.dev/accounts/lehehroi/projects/palmly/builds/e081b5db-97c2-4444-a5fa-c88a232a6ee7 —
  when a device is available (H1), install this APK to close P1.T4.
- **Docker Desktop** must be *running* for local Supabase dev (P3). The agent tries to start it
  itself; if it couldn't, start Docker Desktop manually and the loop continues.
