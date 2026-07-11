# Palmly — Environment, Accounts & Secrets Inventory

**Source of truth for P0.T6.** Every account, key, and secret the build consumes, where it
lives, and which task needs it. When a task references a key, it must appear in this table —
if you add a new secret anywhere in the codebase, add a row here in the same PR.

**Standing rule (MVP_Buildplan §Standing rules):** secrets go in `.env` (git-ignored) /
EAS secrets / Supabase Vault — **never committed**, and **never in the client bundle except the
RevenueCat public SDK keys** (client-safe by design). Only `.env.example` (placeholders) is
tracked in git.

**Note on Supabase project count:** Backend §12 sketches three projects
(`palmly-dev`, `palmly-staging`, `palmly-prod`); the ledger (P0.T2) provisions **two cloud
projects — `palmly-staging` + `palmly-prod`** — and uses `supabase start` (local Docker) for
day-to-day dev (P3.T1). This file follows the ledger.

---

## 1. Accounts (human-provisioned — P0)

| Account | Purpose | Provisioning task | Consumed by |
|---|---|---|---|
| **GitHub** (`palmly`, private) | Repo + Actions CI | P0.T1 | P1.T5 (CI), all commits |
| **Supabase** org + 2 projects (`palmly-staging`, `palmly-prod`, `ap-southeast-1`) | DB, Auth, Storage, Edge Functions, Queues, Realtime, pgvector | P0.T2 | P3–P12 |
| **Google AI Studio / Cloud** (paid tier) | Gemini API (vision + text) | P0.T3 | P5, P8, P9 (all AI) |
| **Apple Developer Program** | iOS signing, App Store Connect, subscriptions | P0.T4 | P1.T4, P7.T2, P12 |
| **Google Play Console** | Android app, billing, closed track | P0.T4 | P1.T4, P7.T2, P12 |
| **Expo / EAS** | Cloud builds, EAS Submit, EAS Update (OTA) | P0.T5 | P1.T4, P2.T3, P12 |
| **RevenueCat** (iOS + Android apps) | Subscriptions, entitlements, Paywalls v2 | P0.T5 | P7 |
| **AppsFlyer** (OneLink, Zero plan) | Deferred deep-link attribution | P0.T5 | P8 |
| **PostHog** project | Product analytics, funnels, cohorts | P0.T5 | P1.T6, P4.G, P7.T4, P8.G, P11 |
| **Sentry** project | Crash + error monitoring (app + Edge Functions) | P0.T5 | P1.T6, P11 |
| **Cloudflare** | Turnstile CAPTCHA + DNS for `palmly.app` | P0.T5 | P3.T6 (Turnstile), P8.T3 (teaser DNS) |
| **Domain** `palmly.app` | Teaser page host, deep links | P0.T5 | P8.T3 |

---

## 2. Client-bundle keys (safe to ship — `EXPO_PUBLIC_*` / app config)

These are compiled into the app. They are **publishable/public** keys by design. Live in
`app/.env` locally and as EAS secrets / build-profile env for CI builds.

> **Supabase key format:** current Supabase projects issue new-style API keys —
> `sb_publishable_…` (client-safe → `EXPO_PUBLIC_SUPABASE_ANON_KEY`) and
> `sb_secret_…` (**server-only** → `SUPABASE_SERVICE_ROLE_KEY`, never in the client bundle).
> These replace the legacy `anon` / `service_role` JWTs; supabase-js accepts either.

| Key | Value source | First used |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → URL | P3.T6 |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API → `anon`/publishable key | P3.T6 |
| `EXPO_PUBLIC_POSTHOG_KEY` | PostHog → Project Settings → Project API Key | P1.T6 |
| `EXPO_PUBLIC_POSTHOG_HOST` | PostHog host (e.g. `https://us.i.posthog.com`) | P1.T6 |
| `EXPO_PUBLIC_SENTRY_DSN` | Sentry → Project → Client Keys (DSN) | P1.T6 |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY` | RevenueCat → API keys → Apple public SDK key | P7.T3 |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | RevenueCat → API keys → Google public SDK key | P7.T3 |
| `EXPO_PUBLIC_APPSFLYER_DEV_KEY` | AppsFlyer → App Settings → Dev Key | P8.T4 |
| `EXPO_PUBLIC_APPSFLYER_APP_ID` | Apple numeric App ID (iOS OneLink) | P8.T4 |
| `EXPO_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare → Turnstile → Site Key | P3.T6 |

---

## 3. Server-only secrets (Supabase Vault / Edge Function env — NEVER in client)

Set via `supabase secrets set` (staging/prod) and Supabase Vault. `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are auto-injected into deployed Edge Functions
by the platform — they only need to be in the **local** `.env` for tests/scripts.

| Secret | Value source | Consumed by |
|---|---|---|
| `GEMINI_API_KEY` | Google AI Studio (paid tier) | P5.T2 (`worker-scan`), P5.T6, P7 compat, P9 (`fortune-generate`, `chat-send`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API → `service_role` key | Local tests, seed scripts, `_shared` (P3.T5) |
| `TURNSTILE_SECRET_KEY` | Cloudflare → Turnstile → Secret Key | P3.T6 (verify challenge server-side) |
| `REVENUECAT_WEBHOOK_AUTH` | Shared secret set in RC → Integrations → Webhook Authorization header | P7.T3 (`revenuecat-webhook`) |
| `REVENUECAT_SECRET_API_KEY` | RevenueCat → API keys → Secret (v2 REST) | P10.T2 (`account-delete` subscriber delete) |
| `APPSFLYER_S2S_API_TOKEN` | AppsFlyer → Security → S2S / API token | P10.T2 (data-deletion request) |

---

## 4. CI / build secrets (GitHub Actions repo secrets + EAS secrets)

| Secret | Value source | Consumed by |
|---|---|---|
| `EXPO_TOKEN` | Expo → Access Tokens | P1.T4/T5 (EAS build in CI), P12.T9 |
| `SUPABASE_ACCESS_TOKEN` | Supabase → Account → Access Tokens (CLI) | P3.T5 (deploy functions/migrations from CI) |
| `SUPABASE_STAGING_PROJECT_REF` | Supabase → staging project ref | P3.T5 CI deploy |
| `SUPABASE_PROD_PROJECT_REF` | Supabase → prod project ref | P12.T9 |
| `SUPABASE_STAGING_DB_PASSWORD` | Supabase → staging DB password | P3.T5 (`supabase db push`) |
| `SUPABASE_PROD_DB_PASSWORD` | Supabase → prod DB password | P12.T9 |
| `SENTRY_AUTH_TOKEN` | Sentry → Auth Tokens (source-map upload) | P1.T6 / release builds |
| `SENTRY_ORG` / `SENTRY_PROJECT` | Sentry org + project slugs | P1.T6 |

---

## 5. Store-submission material (EAS Submit — files & secrets, git-ignored)

| Item | Value source | Consumed by |
|---|---|---|
| `APPLE_TEAM_ID` | Apple Developer → Membership | P12.T9 (EAS Submit iOS) |
| `ASC_KEY_ID` / `ASC_ISSUER_ID` | App Store Connect → Users & Access → Integrations → App Store Connect API | P12.T9 |
| App Store Connect API key `.p8` | ASC → download once (store as file / EAS secret) | P12.T9 |
| Google Play service-account JSON | Play Console → Setup → API access → service account | P12.T9 (EAS Submit Android) |

---

## 6. Local file layout

| File | Purpose | Git |
|---|---|---|
| `.env.example` | Placeholder names for every key above | **tracked** |
| `.env.staging` | Real staging keys (P0.T2/T3) | ignored |
| `.env.prod` | Real prod keys | ignored |
| `app/.env` | Client `EXPO_PUBLIC_*` for local dev | ignored |
| `supabase/.env` | Local function secrets for `supabase functions serve` | ignored |

---

## 7. AppsFlyer D1 questions (answer during P0.T5 setup — paste into Build Log)

1. Do **owned-media** invite installs (our teaser links) count against AppsFlyer Zero's
   12K-conversion cap?
2. What is AppsFlyer's **iOS deferred-matching** mechanism/behavior (probabilistic vs
   deterministic; clipboard usage) post-ATT?
