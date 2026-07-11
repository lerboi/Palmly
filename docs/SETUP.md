# Palmly — Developer Setup

How to go from a fresh clone to a running app + backend. Env/secret details live in
[`ENVIRONMENT.md`](./ENVIRONMENT.md); build progress lives in `Planning/MVP_Buildplan.md`.

## Prerequisites

| Tool | Version (verified) | Notes |
|---|---|---|
| Node | 22.x | matches CI (`node-version: 22`) |
| Java (JDK) | 21 | for local Android Gradle builds |
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

## Backend (Supabase, from P3)

```bash
supabase start                  # local stack (needs Docker running)
supabase db reset               # apply migrations + seed from scratch
supabase test db                # pgTAP suite (RLS proofs)
```

Migrations are versioned files in `supabase/migrations/` — **never edit an applied migration**;
add a new one. The read-only Supabase **MCP** (`.mcp.json`) points at staging for inspection.

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
