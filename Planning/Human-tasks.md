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

- [ ] **H1 — A physical Android device (or emulator).** Enable USB debugging (Developer Options →
  USB debugging) and plug it in; or install Android Studio and create an emulator (AVD).
  - **Why it matters:** it's the single biggest unblocker. It finishes **P1.T4** (install the dev
    build already built — see note below) and lets the loop start **P2, the native landmark
    spike — the project's #1-risk, kill-or-pivot phase**. P2's verify explicitly requires a real
    mid-range Android (frame-rate on hardware), so web/CI cannot substitute. All camera UX
    (P4), the reveal UI (P6), and the 2-device viral loop (P8) also need real devices.
  - Once attached: the loop will `eas build -p android --profile development` (or reuse the queued
    build) and verify install + launch.

- [ ] **H2 — PostHog + Sentry projects.** Create a PostHog project and a Sentry project, then put
  these in `app/.env` (client-safe) and `.env.staging`:
  - `EXPO_PUBLIC_POSTHOG_KEY`, `EXPO_PUBLIC_POSTHOG_HOST` (e.g. `https://us.i.posthog.com`)
  - `EXPO_PUBLIC_SENTRY_DSN`
  - (for release source-maps, later) `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`
  - **Unblocks:** P1.T6 (analytics/crash plumbing — `app_opened` event + a test crash).

- [ ] **H3 — CI green-check settings (P1.T5).** In the GitHub repo (`lerboi/Palmly`):
  1. **Settings → Secrets and variables → Actions →** add repo secret **`EXPO_TOKEN`**.
  2. **Settings → Environments →** create an environment named **`preview-build`** and add yourself
     as a **required reviewer** (this is the manual-approval gate for the preview build job).
  3. Open one test PR against `main` and confirm the CI checks go green in the Actions tab.
  - (The agent has no `gh` CLI / GitHub token, so it can't do these three or read Actions results.)

---

## 🟡 Needed soon — upcoming phases

- [ ] **H4 — Mirror `GEMINI_API_KEY` into Supabase Vault (staging).** The Edge Functions read the
  Gemini key from Vault, not from the client. Supabase dashboard → staging project → Vault → add
  secret `GEMINI_API_KEY`. **Needed at P3.T5 / P5** (AI workers).

- [ ] **H5 — Cloudflare Turnstile + domain `palmly.app`.** Buy the domain; in Cloudflare create a
  Turnstile widget. Put `EXPO_PUBLIC_TURNSTILE_SITE_KEY` (client) + `TURNSTILE_SECRET_KEY` (server)
  per ENVIRONMENT.md. **Needed at P3.T6** (anonymous-auth CAPTCHA) and **P8.T3** (teaser page DNS).

- [ ] **H6 — KB authenticity review (P5.T5).** When the agent has drafted `kb/v1/` (palmistry +
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

- **Build `e081b5db`** (Android dev build) was queued 2026-07-11 and may now be finished:
  https://expo.dev/accounts/lehehroi/projects/palmly/builds/e081b5db-97c2-4444-a5fa-c88a232a6ee7 —
  when a device is available (H1), install this APK to close P1.T4.
- **Docker Desktop** must be *running* for local Supabase dev (P3). The agent tries to start it
  itself; if it couldn't, start Docker Desktop manually and the loop continues.
