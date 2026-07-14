# Palmly — Developer Setup

How to go from a fresh clone to a running app + backend. Env/secret details live in
[`ENVIRONMENT.md`](./ENVIRONMENT.md); build progress lives in `Planning/MVP_Buildplan.md`.

## Prerequisites

| Tool | Version (verified) | Notes |
|---|---|---|
| Node | 22.x | matches CI (`node-version: 22`) |
| Java (JDK) | **17** | for local Android Gradle builds. **JDK 21 breaks the build** — Expo SDK 56 pins Gradle 9, whose toolchain auto-downloader (foojay) crashes on `IBM_SEMERU`. Pin JDK 17 via `org.gradle.java.home` in `~/.gradle/gradle.properties`. (The Node backend test harness is unaffected by JDK version.) |
| Expo / EAS account | — | `EXPO_TOKEN` for CLI/CI (see ENVIRONMENT §4) |
| **Physical Android device** (or emulator) | — | **required** for the native camera/landmark work (P2+) and to install dev builds; there is no camera on web |
| Docker Desktop | 28.x | for local Supabase (`supabase start`), P3+ |
| Android Studio + SDK | — | only if you want a local emulator / local Gradle builds |

## Env files (git-ignored — never commit)

Create these from the placeholders in `.env.example` (see ENVIRONMENT.md for every key):

- `.env.staging` — Supabase **staging** url/publishable/`sb_secret_`/db-password + `GEMINI_API_KEY` + `EXPO_TOKEN`
- `.env.prod` — same for **prod**
- `app/.env` — the client `EXPO_PUBLIC_*` keys the Expo app reads in local dev (points at staging)

## App (Expo, in `app/`)

```bash
cd app
npm ci                 # install exact locked deps
npm run web            # fastest inner loop: react-native-web in the browser (no camera)
npm run lint           # eslint
npm run typecheck      # tsc --noEmit
npm test               # jest unit tests
npx expo-doctor        # config/dependency health (should be 21/21)
```

### Native dev build (on a device)

The app uses native modules (dev-client now; VisionCamera + MediaPipe from P2), so the camera
and landmark features **cannot** run on web or in Expo Go — you need a **development build**:

```bash
cd app
# Android (works from this Windows host via EAS cloud build):
eas build --platform android --profile development
# → install the resulting .apk on a device/emulator, then:
npx expo start --dev-client   # Metro dev server; open the dev build and connect
```

iOS dev builds also go through EAS cloud (`--platform ios`) and need an Apple account
(deferred — see P0.T4). EAS profiles are in `app/eas.json`
(`development` / `preview` / `production`); EAS Update channels are configured.

### Local Android

Building the dev build **locally** (faster iteration than EAS cloud) on Windows. One-time setup
(verified working 2026-07-14):

1. **Android Studio** → installs the SDK to `%LOCALAPPDATA%\Android\Sdk`; create an AVD (e.g. Pixel 7,
   a system image **with Google Play**). Also install **Android SDK Command-line Tools** (SDK Manager →
   SDK Tools, or the `cmdline-tools` zip) — Gradle needs `sdkmanager` to auto-provision NDK/CMake.
2. **JDK 17** (Temurin) — required. Point Gradle at it globally in `~/.gradle/gradle.properties`:
   ```
   org.gradle.java.home=C:/path/to/jdk-17
   org.gradle.java.installations.auto-download=false
   ```
   (JDK 21 fails: Gradle 9's foojay toolchain resolver hits the removed `IBM_SEMERU` field.)
3. Build + run:
   ```bash
   cd app
   npx expo run:android         # first build ~15-20 min (compiles native + pulls NDK/CMake); then fast
   # day-to-day (JS/UI only, no native change):
   npx expo start --dev-client  # then press "a" to open on the emulator; hot-reloads
   ```
   Dev-client first launch shows Expo's developer menu — tap **Continue** (Ctrl+M reopens it).

Gotchas: a local debug build and an **EAS**-built APK are signed differently → to swap, `adb uninstall
com.palmly.app` first. The **emulator has no real camera/GPU**, so the P2 MediaPipe frame-rate spike +
P4 capture need a **physical** Android phone; everything else (onboarding, reading/paywall/fortune/chat
UI) runs on the emulator. Full detail: the `palmly-local-android-build` agent memory.

> **Red screen "Error loading app: Failed to download remote update"?** The dev build took the
> `expo-updates` on-launch path instead of Metro — it tried to fetch an OTA from `u.expo.dev`, but none
> is published (`eas update` never run) and a dev-client APK has no embedded fallback bundle. Fix:
> **don't cold-launch from the app-drawer icon** — run `npx expo start --dev-client` and press **`a`**
> (or in the dev launcher "Enter URL manually" → `http://10.0.2.2:8081`). Use `--dev-client`, never a
> plain `expo start`/`npm start`. This is a dev launch-flow issue only; a shipped preview/prod build
> showing the same text would instead need `eas update` to publish a bundle.

## Backend (Supabase, from P3) — Docker-free

This project develops the backend **without Docker** (user decision, Decision Log 2026-07-12).
Instead of the local `supabase start` stack, migrations + RLS are exercised against the real
**staging** Postgres inside a transaction that is **always rolled back** — real Supabase platform
(auth schema, `auth.uid()`, roles) with zero persistent change to staging.

```bash
cd supabase/tests
npm ci
npm test          # node:test — applies migrations + runs RLS proofs, all transactional (rollback)
```

- Test harness: `supabase/tests/lib/db.mjs` (pure-JS `pg`; reads the staging DB password from the
  git-ignored `.env.staging`; connects to `db.<ref>.supabase.co`). Helpers: `withRollback`,
  `applyMigrations`, `asRole`/`resetRole` (impersonate `authenticated`/`anon` + JWT claims),
  `seedUser`.
- Migrations are versioned files in `supabase/migrations/` — **never edit an applied migration**;
  add a new one.
- **Deploy** the schema to staging persistently only when needed (e.g. before P5 workers run):
  `CONFIRM=1 node supabase/tests/scripts/apply.mjs` (or, later, the P3.T5 CI `supabase db push`).
- The read-only Supabase **MCP** (`.mcp.json`) points at staging for inspection (`list_tables`, etc.).

> If you ever want the classic local stack instead, `supabase start` + `supabase db reset` +
> `supabase test db` still work once Docker Desktop is running — the migration files are identical.

## CI

`.github/workflows/ci.yml`: on PR/push to `main` runs lint · typecheck · test · expo-doctor;
on push to `main` it triggers an EAS **preview** build behind a manual-approval gate.
Requires two repo settings (one-time, human):

1. **Repo secret** `EXPO_TOKEN` (Settings → Secrets and variables → Actions).
2. **Environment** named `preview-build` with **required reviewers** (Settings → Environments)
   — this is the "manual approval" gate for the preview build job.

## What still blocks the build (as of 2026-07-11)

See the STATE block in `Planning/MVP_Buildplan.md` for the live list. In short:

- A **physical Android device** (USB debugging) or emulator — gates on-device verification of
  P1.T4 and all of P2 (the native landmark spike, the project's highest-risk phase).
- **PostHog + Sentry** project keys — gate P1.T6 (analytics/crash plumbing).
- The two **CI repo settings** above — gate P1.T5's green-PR verification.
