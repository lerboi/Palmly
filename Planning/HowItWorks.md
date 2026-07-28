# Palmly — How It All Works

> A builder-facing guide for the solo founder + AI agent building Palmly.
> Written to be **exhaustive and honest**: it clearly separates what is
> **built + verified**, what is **built but pending a physical device**, and
> what is **not yet built**.

**Repo root:** `C:\Users\leheh\.Projects\Palmly`
**Last verified:** 2026-07-14 (backend live-validated on staging; app screens web-screenshot-verified)

---

## Table of contents

1. [What Palmly is](#1-what-palmly-is)
2. [What's been built so far](#2-whats-been-built-so-far)
3. [How it all fits together (architecture)](#3-how-it-all-fits-together-architecture)
4. [The end-to-end user flow](#4-the-end-to-end-user-flow)
5. [The AI reading pipeline in detail](#5-the-ai-reading-pipeline-in-detail)
6. [The features](#6-the-features)
7. [What Android Studio is for](#7-what-android-studio-is-for)
8. [Getting the dev server running](#8-getting-the-dev-server-running)
9. [How to test everything](#9-how-to-test-everything)
10. [The backend on staging + how to deploy](#10-the-backend-on-staging--how-to-deploy)
11. [Repository map](#11-repository-map)
12. [What YOU need to do next](#12-what-you-need-to-do-next)

---

## 1. What Palmly is

**Palmly is an AI-powered mobile app that reads your palm (手相, Chinese palmistry) and face (面相, physiognomy) from phone-camera photos**, using Chinese/Asian metaphysical tradition as the *primary* interpretive framework — not Western astrology with Asian motifs bolted on. That framing gap is the wedge against competitors.

It is deliberately positioned as **entertainment and self-reflection** — never medical advice, never fortune-telling-as-fact, never financial advice. The spec avoids all health/medical claims (an App Store compliance requirement) and reframes "accuracy" as **reliable detection + consistency**, not predictive validity.

- **Platform:** Mobile-first, React Native / Expo. English-first, localizing later (Bahasa, Thai, Vietnamese, Tagalog, Malay).
- **Audience:** Southeast Asian users + the Chinese/Asian diaspora + English-speaking fans of "Asian mysticism" content.
- **Distribution:** Standard Apple App Store + Google Play (formal Mainland China distribution is out of scope).

### The core loop + growth hypothesis

Palmly is built around **two things at once: a genuinely good reading, and a designed-in viral loop** (treated as a core feature, not a marketing afterthought):

```
Single palm photo
   → personalized reading
      → branded shareable result card
         → "compare with a friend" invite
            → friend previews near-frictionless, takes their own reading
               → they share → repeat
```

- The **share artifact** is a branded, screenshot-optimized card that must pass the "screenshot test" (legible, subtly stamped, understandable without a click).
- The **compatibility flow** is a two-device loop: the sender generates a link; the recipient gets a lightweight mobile-web teaser and **deferred deep linking** carries them post-install straight into the compatibility context.
- **Growth hypothesis** = status/distribution virality (the Spotify-Wrapped / Wordle-grid mechanic). The invite loop is primarily an **acquisition** engine (lowers CAC; K > 0 is valuable, K > 1 not required).
- **Retention is a separate problem**, solved by the **daily-fortune layer**, not the invite loop. Both are required.

### The feel — "Ink & Cinnabar" (水墨 × 朱砂)

Rooted in the real visual language of Chinese metaphysics — ink-wash painting, woodblock diagram engraving, cinnabar seal stamps (印章), almanac typography, the red thread of fate. Deliberately **not** the purple-nebula/tarot-sparkle look of Western astrology apps. Feel words: *considered, warm, literate, quietly premium — a scholar's studio, not a fortune-teller's tent.*

| Token | Hex | Role |
|---|---|---|
| `paper` | `#F7F2E7` | Rice-paper light background |
| `ink` | `#1E1B16` | Text, line diagrams, dark-mode background |
| `ink-wash` | `#5A544A` | Secondary text |
| **`cinnabar`** | **`#C3272B`** | **Primary accent** — CTAs, seals, the red thread |
| `gold` | `#B8912F` | Premium / locked, score rings, celebratory (used sparingly) |
| `jade` | `#3F7A5E` | Success / verified only |

The **hero illustration is the user's OWN palm rendered as a traced line diagram** from their actual line geometry — ink lines on paper with cinnabar highlighting the line being discussed. This one artifact is simultaneously the **trust artifact** ("these are *my* lines"), the **privacy story** (a diagram, never the photo), and the **share asset**. Type: Noto Serif Display (display), Noto Sans (body), Noto Serif TC (decorative CJK section markers 心 · 智 · 命 · 运).

---

## 2. What's been built so far

**Plain summary.** The **entire backend** (database, RLS, storage, realtime, edge functions, queues, the AI narrative pipeline) is **built, deployed, and live-validated on the single staging project**. **Every core app screen that does not require the camera or a paid vendor is built and web-screenshot-verified, but is pending on-device confirmation** (marked `[~]`). Four surfaces that touch hardware or a paid vendor are **genuine placeholders, not yet built**: the native camera spike (P2), guided capture (P4), the paywall (P7), and the share / pair-reveal / recipient UI (P8).

### Three honesty tiers

- **BUILT + VERIFIED** — code-complete and proven (backend live-validated on staging via the real deployed worker; app screens verified by headless-Chrome screenshots of the web export). This is the strongest claim in the project and it still is *not* the same as "verified on a physical phone."
- **BUILT, PENDING A DEVICE (`[~]`)** — code-complete and web-verified, but the on-device leg (60fps animation, VoiceOver, real camera data, live realtime status, a subscribed device) has not been run because there is no physical Android phone yet.
- **NOT BUILT (PLACEHOLDER `[ ]`)** — the route/nav shell may exist (rendering the shared `PlaceholderScreen`), but the real feature is unbuilt and correctly gated behind hardware or a paid vendor.

### Phase status (P0–P12)

| Phase | Status | Summary |
|---|---|---|
| **P0** Accounts, keys, environments | Mostly done; gate open | GitHub, single Supabase staging project, Gemini key, env docs `[x]`. Apple/Play accounts + EAS/RevenueCat/AppsFlyer/domain deferred to ~P7. |
| **P1** Repo, app skeleton, CI (M0) | Foundations done | Scaffold, design system, nav shell, EAS `[x]`. CI `[~]` (green locally; needs repo settings + a test PR). Analytics `[~]` (plumbing live-smoke-verified; dashboard visibility device-gated). |
| **P2** 🔥 Native landmark spike | **NOT STARTED — device-gated** | The #1 project-risk kill/pivot spike. Needs a **physical Android phone** (emulator has no real camera/GPU). |
| **P3** Backend foundation | **Built + deployed + live-validated** | 17 migrations + 17 Edge Functions deployed; security posture verified. Only CI auto-deploy + on-device relaunch-reuse + Turnstile remain. |
| **P4** Guided capture UX | **NOT STARTED — device-gated** | Onboarding, camera primer, guided capture, upload path — all need the camera (depends on P2). |
| **P5** AI pipeline | **Built + core pipeline live-validated** | Text narrative + embeddings proven live end-to-end on the free tier. Real-image legs gated on paid Gemini (H4c); realtime status device-gated (H1). |
| **P6** Reading reveal UI (M1) | **Built `[~]` — web-verified** | Loader, line-diagram renderer, reveal screen, history shelf all web-screenshot-verified. On-device 60fps/VoiceOver/self-draw + real data pending. |
| **P7** Accounts, subscriptions, paywall | Backend `[~]`; paywall NOT built | account-merge + RevenueCat webhook/gate built + device-free-verified. Store products `[ ]` and **paywall `[ ]` NOT built** (needs RevenueCat H8). |
| **P8** Viral loop (M2) | Backend built `[~]`; all UI NOT built | Card-render, invite-create, teaser page, claim, compat scorer all built + verified. **Pair-reveal + share-sheet + recipient-flow UI `[ ]` NOT built.** |
| **P9** Retention layer (M3) | Mixed: fortune/chat UI built `[~]`, push backend built | Fortune generate + home UI, push infra, notif content, grounded chat all built/verified. Remaining legs device/deploy-gated. |
| **P10** Settings, privacy, deletion | UI built `[~]`, backend built | Settings screens + privacy center web-verified; full DB erasure core verified. Live backend calls + toggle persistence + vendor legs pending. |
| **P11** Analytics & observability | Built `[~]` | Typed ~30-event emitter (tsc-verified); alert detection + metric aggregation verified. Email/Slack delivery + PostHog dashboards human/deploy-gated. |
| **P12** Hardening, evals, store prep, launch (M4) | **NOT STARTED** | Eval set, bake-off, load test, security pass, compliance, store assets, beta, launch. Gated on everything upstream. |

### Backend ground truth (live-verified 2026-07-14)

| Thing | Count / state |
|---|---|
| Migrations applied | **17** (`20260712000001_schema` … `20260713000017_ops_telemetry`) |
| Edge Functions `ACTIVE` | **17** (6 with `verify_jwt=true`, 11 with `false`) |
| Public tables (all RLS-enabled) | ~**20** |
| pgmq queues | **5** (`scan_jobs`, `narrative_jobs`, `compat_jobs`, `push_jobs`, `cleanup_jobs`) |
| KB chunks | **141** (2 traditions: palmistry + physiognomy; 141 distinct `feature_key`s) |
| KB embeddings populated | **0 / 141** (keyed grounding live; fuzzy pgvector retrieval not yet live) |
| Core pipeline proven | `worker-narrative` produced a real `gemini-3.1-flash-lite` reading end-to-end |

### App screens — BUILT vs PLACEHOLDER

BUILT routes are thin adapters that render a real feature-module view seeded with `PREVIEW_*` fixture data (so they are screenshot-verifiable on web without a device). PLACEHOLDER routes all render the shared `app/src/components/PlaceholderScreen.tsx` and only wire onward navigation.

| Route group | Screens | State |
|---|---|---|
| Root | `index` (launcher), `dev/*` | BUILT (launcher + dev-only route map) |
| `(onboarding)` | `welcome`, `how-it-works`, `hand-select` | **PLACEHOLDER** |
| `(capture)` | `primer`, `palm`, `face` | **PLACEHOLDER** (device/native-gated) |
| `(reading)` | `analyzing`, `reveal` | **BUILT `[~]`** |
| `(home)` | `fortune`, `history`, `chat` | **BUILT `[~]`** |
| `(settings)` | `settings`, `notifications`, `methodology`, `legal`, `privacy` | **BUILT `[~]`** (all 5) |
| `(modals)` | `paywall`, `share` | **PLACEHOLDER** |

**Checks green as of last run:** app `tsc` 0 errors / lint 0 / jest 28/28; Deno Edge-function tests 130/130; Node DB/RLS harness 100/100; `expo-doctor` 21/21.

---

## 3. How it all fits together (architecture)

Three big pieces: the **Expo app** (client), **Supabase** (the whole backend platform), and **Google Gemini** (the models). The client never talks to Gemini directly and never holds broad database or storage permissions — everything privileged goes through service-role Edge Functions.

```
┌─────────────────────────────────────────────────────────────────────┐
│  EXPO APP  (React Native, expo-router file routing, import alias @/)  │
│  · anon-first auth (signInAnonymously → persisted AsyncStorage UUID)  │
│  · PalmDiagram (pure geometry.ts → react-native-svg)                  │
│  · analytics facade → PostHog (product) + Sentry (crash)             │
│  · realtime hook (fetch-then-subscribe on scan:{id})                 │
└───────────────┬───────────────────────────────┬─────────────────────┘
                │ publishable anon key           │ Realtime Broadcast
                │ (RLS-scoped Data API)          │ (private scan:{id} topic)
                ▼                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  SUPABASE  (single staging project rphtdgoggsldshtdbkaj, Postgres 17)│
│                                                                       │
│   Postgres + RLS ──── ~20 tables, every policy `to authenticated`     │
│      │                wrapping (select auth.uid()); anon users ARE    │
│      │                authenticated with an is_anonymous JWT claim    │
│      │                                                                │
│   Storage ──────────  private `scans` bucket (owner-only, path        │
│      │                {user_id}/{scan_id}.jpg) · public `cards` bucket│
│      │                                                                │
│   Realtime ─────────  AFTER UPDATE OF status trigger broadcasts every │
│      │                scan transition to scan:{id} (owner-only RLS)   │
│      │                                                                │
│   Edge Functions ───  17 Deno fns. 6 user-mode (verify_jwt=true),     │
│      │  (service_role  11 worker/public/HMAC (verify_jwt=false,       │
│      │   BYPASSRLS)     authenticate in-fn via service key or HMAC)   │
│      │                                                                │
│   pgmq queues ──────  5 queues, driven only by SECURITY DEFINER RPC   │
│      │                wrappers granted to service_role only           │
│      │                                                                │
│   pg_cron ──────────  0 jobs — drains unscheduled (mig 0019);         │
│                       real cron→worker wiring = Audit-3 D1.T1 (A4)     │
└───────────────┬───────────────────────────────────────────────────────┘
                │ worker-scan / worker-narrative / worker-compat /
                │ fortune-generate / chat-send  (server-side only)
                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  GOOGLE GEMINI                                                        │
│   · gemini-3.5-flash        — pass-1 extraction (image + schema)      │
│   · gemini-3.1-flash-lite   — narrative / compat / fortune / chat     │
│   · gemini-embedding-001    — KB embeddings (1024-dim)               │
└─────────────────────────────────────────────────────────────────────┘
```

### Why it was built "device-free" (and how it was verified anyway)

There is no physical phone yet, so the whole project was engineered so that everything except literal camera/GPU work could be built and **verified without a device**. Two techniques carry this:

1. **Web-export screenshots for the UI.** Every BUILT screen is a thin adapter over a feature-module view seeded with `PREVIEW_*` fixtures. The app exports as a static web bundle (`expo export --platform web`), served locally, and each route is screenshotted with headless Chrome at phone dimensions. The Supabase client (`app/src/lib/supabase.ts`) is **SSR-safe** — during the node-based web export (no `window`) it swaps in a no-op session store so the export does not throw. Reference screenshots live in `docs/checkpoints/`.
2. **A Docker-free DB/RLS test harness against real staging.** The Node harness (`supabase/tests/`) applies the migrations and runs RLS proofs against the **real staging Postgres** inside transactions that are **always rolled back** — so you get the real platform (auth schema, `auth.uid()`, roles) with zero persistent change. Edge-function logic is factored into pure `_shared/*.ts` modules unit-tested under Deno with injectable `geminiCall`/`fetch`.

The core AI pipeline was additionally proven **live** by seeding a scan + schema-valid `feature_set`, enqueuing `narrative_jobs`, and invoking the deployed `worker-narrative` with the service key — which produced a real `gemini-3.1-flash-lite` reading.

---

## 4. The end-to-end user flow

The intended journey (UIUX §2), first-time user → returning user. For each step: the screen(s), the backend that powers it, and the build state.

| # | Step | Screen(s) | Backend | State |
|---|---|---|---|---|
| 1 | **First open** | `(onboarding)/welcome` → `how-it-works` → `hand-select` | anon-first auth (`ensureSession()`) | **PLACEHOLDER** — nav shell exists; real onboarding is P4.T1 |
| 2 | **Camera primer & consent** | `(capture)/primer` | — (client-side permission) | **PLACEHOLDER** — P4.T1, device-gated |
| 3 | **Guided palm capture** | `(capture)/palm`, `(capture)/face` | `scan-create` + `scan-ingest` *(planned, not built)* | **PLACEHOLDER** — needs camera + MediaPipe (P2) + P4.T2 |
| 4 | **Analyzing loader** | `(reading)/analyzing` → `AnalyzingView` | Realtime `scan:{id}` broadcasts (`useScanStatus`) | **BUILT `[~]`** — web-verified (`docs/checkpoints/p6-analyzing.png`) |
| 5 | **Reading reveal** | `(reading)/reveal` → `RevealView` | `readings` row from `worker-narrative` | **BUILT `[~]`** — web-verified (`docs/checkpoints/p6-reveal.png`) |
| 6 | **Share sheet** | `(modals)/share` | `card-render` (built) | **Share UI = PLACEHOLDER**; card-render backend built `[~]` |
| 6 | **Compatibility invite** | (share toggle → pair reveal) | `invite-create`, `invite-page`, `invite-claim`, `worker-compat` | **Backend BUILT `[~]`**; **pair-reveal UI NOT built** (P8.T6) |
| 7 | **Returning-user home / daily fortune** | `(home)/fortune` → `FortuneHome` | `fortune-generate` → `fortune_templates`, `user_fortunes` | **BUILT `[~]`** — both tiers web-verified (`p9-fortune-{free,premium}.png`) |
| 8 | **Premium chat** | `(home)/chat` → `ChatThread` | `chat-send` (keyed KB + pgvector) | **BUILT `[~]`** — thread UI web-verified; grounded backend live-verified |
| 9 | **Settings + Privacy** | `(settings)/*` | `account-delete` → `purge_account`, `request_image_deletion` | **BUILT `[~]`** — web-verified (`p10-{settings,notifications,privacy}.png`) |
| 10 | **Paywall** | `(modals)/paywall` | RevenueCat (H8) | **PLACEHOLDER** — P7.T4 not built |
| — | **Account creation** | anon-link sheet | `account-merge` + anon-first auth | **Backend built `[~]`**; on-device link/OTP sheet not built |
| — | **Recipient journey** | teaser → deferred landing → onboarding → pair reveal | `invite-page`, `invite-claim` | **Teaser + claim backend built `[~]`**; recipient UI PLACEHOLDER |

**History shelf** (`(home)/history` → `HistoryShelf`) is also **BUILT `[~]`** — re-openable past readings with 64px palm-diagram thumbnails and an optional jade "unchanged" consistency banner.

**Honest bottom line.** The middle-to-end that is pure UI over an existing backend (analyzing → reveal → fortune home → chat → settings/privacy) is **built and web-verified, awaiting on-device confirmation**. The two ends that touch hardware or a paid vendor — **onboarding + camera primer + guided capture** (front) and **share sheet / pair-reveal / recipient flow + paywall** (viral loop + monetization) — are **genuine placeholders**, correctly gated behind a physical phone, RevenueCat, and the domain/AppsFlyer.

---

## 5. The AI reading pipeline in detail

> **Accuracy caveat (updated Audit-3, 2026-07-20).** The pipeline's HTTP entry point **is** built now: `scan-create` (quota + signed upload URL) and `scan-ingest` (client-invoked confirm + enqueue) are **deployed** and driven by the client upload chain (`uploadPickedScan`: scan-create → PUT → scan-ingest → `/analyzing?scanId=…`). **20** Edge Functions are deployed today (not 17). What is NOT yet live: `cron.job` is **empty** (see §10) — the workers are deployed and manually invocable but not auto-drained yet (Audit-3 A4 → task D1.T1).

### The designed flow

```
scan-create (planned)          quota check → insert scans row (status=queued)
                                → return scoped signed upload URL
        │
client uploads crop            → private scans bucket at {user_id}/{scan_id}.jpg
        │
scan-ingest (planned)          storage webhook → queue_send('scan_jobs', {scan_id})
        │
worker-scan  ─────────────────────────────────────────────────────────────────
  · download crop → base64, status=extracting
  · EXTRACTION: gemini-3.5-flash, temp 0, seed 7, constrained responseSchema
      (from schemas/palm_features.v1.json), bundled frozen system prefix;
      finishReason!=STOP → fail; JSON-parse → Ajv validate → is_hand guard
  · CONSISTENCY: derive scale-invariant geometry; matchSubject vs the user's
      subject_profiles for that hand (MATCH_THRESHOLD = 0.08)
       ├─ MATCH → bump scan_count, status=matched, REUSE canonical feature_set
       │          (no new extraction, no narration → the "unchanged" guarantee)
       └─ NEW → 2-vote extraction (+ 3rd tie-break on disagreement, then
                fieldMajority; disagreeing enum fields flagged confidence:low)
  · insert feature_sets + canonical subject_profiles; status=narrating
  · queue_send('narrative_jobs', {scan_id, feature_set_id}); write telemetry
        │
worker-narrative ──────────────────────────────────────────────────────────────
  · load feature_set + pinned KB tradition (kb_version='v1') into
      feature_key → passage map
  · DETERMINISTIC selectClaims: features → ordered sections → feature_keys.
      Which sections appear, their order, tags, feature_refs = PURE functions
      of the features. Identical features → identical claims.
  · PROSE: gemini-3.1-flash-lite, temp 0, seed 11, responseSchema —
      features + KB only, NO IMAGE. Model title/body GRAFTED onto the
      deterministic skeleton (keys/tags/feature_refs/depth_level never from
      the model; KB passage is the fallback body).
  · Ajv-validate against reading_sections.v1.json + banned-claims guard
      (rejects any medical/lifespan/pregnancy/financial prose)
  · insert readings (model/prompt/kb version + token stamps);
      best-effort fire card-render; status=complete; telemetry
        │
Realtime: AFTER UPDATE OF status trigger broadcasts every transition to the
private topic scan:{id}. Client fetch-then-subscribes → drives analyzing → reveal.
```

### The Gemini models

| Purpose | Model | Config |
|---|---|---|
| Pass-1 extraction | **`gemini-3.5-flash`** | temp 0, seed 7, constrained `responseSchema`, image + system prefix |
| Narrative prose | **`gemini-3.1-flash-lite`** (`narrative.v1`) | temp 0, seed 11, features + KB only, no image |
| Compatibility narrative | **`gemini-3.1-flash-lite`** (`compat.v1`) | scores as ground truth |
| Daily fortune | **`gemini-3.1-flash-lite`** (`fortune.v1`) | per bucket × locale |
| Premium chat | **`gemini-3.1-flash-lite`** (`chat.v1`) | grounded + deflection guard |
| KB embeddings | **`gemini-embedding-001`** | `outputDimensionality: 1024` (matches `vector(1024)`) |

Deterministic scorer `compat.v1` is **code, not a model**. Versioned prompt prefixes are bundled as generated static imports (`prompts/{extraction,narrative,compat,fortune,chat}/v1/system_instruction.generated.ts`) — a runtime `Deno.readTextFile` outside the function dir does not bundle, so the prefix is imported statically.

### The KB grounding (RAG)

The `kb_chunks` table holds **141 chunks** across 2 traditions (palmistry + physiognomy; `almanac` is allowed but not yet loaded), with **141 distinct `feature_key`s** — one passage per key, full keyed coverage. Grounding has two legs:

- **Keyed grounding (LIVE):** `selectClaims` looks up passages by deterministic `feature_key` (e.g. `heart_line.length.long`). This is the primary grounding and it works today. `selectClaims` reports `missingKeys` if a key is absent (currently none).
- **Fuzzy pgvector retrieval (NOT yet live):** chat widens grounding with cosine similarity over `embedding vector(1024)` (an hnsw index exists). But **embeddings are 0/141 populated**, so this leg returns nothing until the embed-populate job runs (`gemini-embedding-001`, a device-free task on the remaining list). Chat still anchors on keyed grounding meanwhile.

### The "same palm, same reading" consistency guarantee

A palm is a fixed physical fact, so the same palm photographed twice **must** produce a recognizably consistent reading — a trust requirement. The mechanism:

- `feature_sets` stores a **deterministic, enum-bucketed** `features` jsonb plus a scale-invariant `geometry` and a `feature_hash` (sha256 of the canonicalized features).
- `subject_profiles` is the **consistency anchor**: one canonical identity per `(user_id, kind)` where kind ∈ `palm_left | palm_right | face`, pointing at a `canonical_feature_set_id`.
- On a repeat scan, `worker-scan` derives geometry and `matchSubject` compares it to the canonical (threshold `0.08`). On a match it **reuses the canonical feature_set entirely** — no new extraction, no re-narration — so there is **zero drift**.
- Because the narrative's section selection, order, tags, and feature_refs are **pure functions of the features** (only the prose comes from the model), identical features yield identical claims.

### Why photos are deleted (privacy)

The reading is grounded in **features + KB, never the raw image** (the narrative pass sends no image at all). So the photo has no reason to persist:

- The private `scans` bucket stores the crop at `{user_id}/{scan_id}.jpg`, owner-only.
- The `scans` row carries `image_deleted_at` + `keep_image` (opt-in, off by default). `storage_path` is nulled on deletion.
- The hourly `cleanup` function deletes crop objects **>24h past a terminal scan** (D2 retention) and writes a `deletion_log` entry.
- The hero the user sees is the **traced line diagram**, never the photo — the privacy story and the trust artifact are the same object.

> **Production/privacy blocker to know:** real-image extraction + context caching on `gemini-3.5-flash` is **blocked on the current free-tier key** (`FreeTier limit=0`), and the free tier *trains on submitted data* — unacceptable for real palm/face images. Unblocking is **H4c (paid Gemini)**. `worker-scan` is model-agnostic, so this is a key/config swap, not a code change. The text narrative + embeddings run fine on the free tier — that is what was live-proven.

---

## 6. The features

### Palm reading (hero)
Guided camera capture with on-device landmark detection for real-time guidance; the backend traces the major lines (heart 心 / head 智 / life 命 / fate 运) plus mounts; AI narrative grounded in 手相. **Reveal + rendering built `[~]` (web-verified); capture is placeholder (device-gated).**

### Face reading (secondary hero)
Guided front-face capture, 面相 analysis (face shape, proportions, "three courts five eyes"). Backend pipeline supports `kind='face'`; capture UI is placeholder.

### Consistency guarantee
Same palm twice → recognizably consistent reading, via the deterministic line-geometry pass + subject matching described in §5. **Built + validated in the backend.**

### Compatibility scoring (viral loop)
Friend-vs-friend narrative + score. Backend fully built + verified:
- `compatibility_pairs` uses canonical ordering `check (user_a < user_b)` + `unique` = race-proof one-pair-per-couple.
- `compat-request` — **first comparison is free** (never paywall the recipient's first experience); further ones require premium (enforced in the function, not RLS).
- `worker-compat` runs the deterministic scorer `compat.v1` (scores are ground truth), then `gemini-3.1-flash-lite` writes a both-perspectives narrative, stores `score` + `sub_scores` (emotion/mind/life_energy/destiny/elements), broadcasts to `compat:{pair_id}`, and pushes both members through the dedupe/cap gate.
- `invite-create` mints a 32-byte token (returned once in the link; only its sha256 is stored) and returns `palmly.app/i/{token}`. `invite-page` renders the public SSR teaser and marks `clicked` (K-factor funnel). `invite-claim` hashes the deferred token and atomically accepts + links the invitee + creates the canonical pair.
- **The share-sheet, pair-reveal, and recipient-onboarding UI are NOT built (P8.T6).**

### Daily almanac fortune (老黄历-style) — the retention driver
Auspicious/inauspicious activities, lucky directions, good/bad days, tied to a simplified BaZi-lite day-pillar.
- **Free users get today's one-line fortune** (hook + paywall bait). **Full almanac is premium** (宜/忌 lists, directions, hours, love/career/wealth).
- `fortune_templates` are generated **per sexagenary bucket × locale, not per user** (60 buckets + `generic`) by the nightly `fortune-generate` function. `user_fortunes` tracks read receipts / streaks / notification targeting.
- **`FortuneHome` + `FortuneCard` built `[~]`; both entitlement states web-verified.**

### Premium grounded chat
Ongoing AI chat grounded in the user's *own* reading, for follow-up questions.
- `chat-send` is entitlement-gated. Grounding = the reading's own `feature_refs` (keyed KB) widened by fuzzy pgvector `kb_search` on the question embedding. Unsafe/off-topic questions are deflected pre-model. Both turns persisted server-side (`chat_messages` has no client insert policy).
- **Backend live-verified end-to-end** (deflection + citation + retrieval). **Thread UI web-verified.** SSE streaming transport is device-gated; the fuzzy leg waits on the embed-populate job.

### Freemium subscription
- The **complete core palm + face reading is free and unrestricted** (never paywall the "wow" moment — the Moonly mistake). The **first reading + first compatibility are free**.
- Paid (monthly + annual, **no trial at launch**) unlocks the full fortune calendar, unlimited compatibility, deep-dive line/mount analysis, chat, and saved history.
- **Accounts are never required for the first reading** — prompted only to save, unlock fortune, or start a compatibility.
- `subscriptions` (PK `user_id`, `entitlements` jsonb) is the server-side gate, mirrored from RevenueCat via the HMAC-verified `revenuecat-webhook`. **Backend built `[~]`; the paywall UI is NOT built (needs RevenueCat H8; `REVENUECAT_WEBHOOK_SECRET` currently unset).**

### Privacy / deletion
`PrivacyCenter` — "Photo deleted ✓" card, a "Keep my scan photo" opt-in switch (off by default), "Delete my scan photos now" (→ `request_image_deletion`), and account deletion with an inline confirm (→ `account-delete` edge fn → `purge_account`, which cascades every table + writes `deletion_log`, then removes storage objects via the Storage API so no S3 blobs orphan). **Privacy UI web-verified; full DB erasure core verified. Device handlers stubbed; backend built.**

---

## 7. What Android Studio is for

Android Studio is **not** where you write code. It provides three things:

1. **The Android SDK** (`%LOCALAPPDATA%\Android\Sdk`) that Gradle/Expo compile against.
2. **The emulator (AVD)** — the Pixel-7 virtual device you run the app on without a physical phone.
3. **Local Gradle dev builds** — so `npx expo run:android` can compile the native app on your machine (faster iteration than EAS cloud builds).

### Why you cannot use Expo Go (a dev-client build is required)

Palmly bundles **custom native modules that are not in the prebuilt Expo Go binary**: `react-native-svg`, `@sentry/react-native`, `posthog-react-native`, `expo-dev-client`, `react-native-reanimated` + `react-native-worklets`, `expo-glass-effect` (and from P2, VisionCamera + MediaPipe). Expo Go ships only a fixed set of native modules; any project with extra native code must run a **development build** — a custom dev client compiled *with* those modules baked in.

So instead of scanning a QR into Expo Go, you install Palmly's own dev build (APK) once, then connect it to the Metro JS dev server for hot reload. You only recompile the native app when native dependencies change.

> The emulator has **no real camera/GPU**, so the P2 MediaPipe landmark spike and P4 capture need a **physical** Android phone. Everything else (onboarding shells, reading reveal, paywall stub, fortune, chat, settings) runs on the emulator.

---

## 8. Getting the dev server running

### Prerequisites

| Tool | Version | Why exactly this |
|---|---|---|
| **Node** | **22.x** | Matches CI. Used by the app, jest, and the Node DB test harness. |
| **JDK** | **17** (Temurin/Adoptium) | Required for local Android Gradle builds. |
| **Android Studio + SDK + cmdline-tools** | current | Provides the SDK, the emulator (AVD), and local Gradle dev builds. |
| **Deno** | 2.x, at `C:\Users\leheh\.deno\bin\deno.exe` | Runs the Edge Function unit tests. |
| Docker Desktop | optional | Only for the classic local `supabase start` stack — this project develops the backend **Docker-free**, you do **not** need it. |

**Why JDK 17 and not 21:** Expo SDK 56 pins **Gradle 9**, whose foojay toolchain auto-downloader crashes on the removed `IBM_SEMERU` field under **JDK 21**. Pin JDK 17. (Node backend tests are unaffected by JDK version — JDK only matters for compiling the Android app.)

**Pin JDK 17 for Gradle (one-time).** Create `C:\Users\leheh\.gradle\gradle.properties`:

```properties
org.gradle.java.home=C:/Program Files/Eclipse Adoptium/jdk-17.0.x-hotspot
org.gradle.java.installations.auto-download=false
```

(Point `org.gradle.java.home` at your actual JDK 17 path; forward slashes.)

**Android Studio + emulator (one-time).**
1. Install Android Studio → it installs the SDK to `%LOCALAPPDATA%\Android\Sdk`.
2. SDK Manager → SDK Tools → enable **Android SDK Command-line Tools** (Gradle needs `sdkmanager` to auto-provision NDK/CMake).
3. Device Manager → create an AVD: **Pixel 7**, a system image **with Google Play** (needed for billing/notification native paths).
4. Ensure `ANDROID_HOME` points at the SDK:

```bash
# bash
export ANDROID_HOME="$LOCALAPPDATA/Android/Sdk"
```
```powershell
# PowerShell
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
```
(Verify with `adb --version`.)

### The 3 git-ignored env files

`.gitignore` ignores `.env` and `.env.*`. There is no tracked template any more (`.env.example` was removed 2026-07-29) — see `docs/ENVIRONMENT.md` for every key name. Never commit real values.

**`.env` (repo root)** — CI/tooling tokens + public analytics keys:
```
EXPO_TOKEN=...                 # Expo → Access Tokens (EAS CLI/CI, OTA)
SUPABASE_ACCESS_TOKEN=sbp_...  # Supabase → Account → Access Tokens (CLI deploy)
EXPO_PUBLIC_POSTHOG_KEY=phc_...
EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
EXPO_PUBLIC_SENTRY_DSN=https://...ingest.sentry.io/...
```

**`.env` (repo root)** — everything the backend test harness + manual deploy read (this was
`.env.staging` until 2026-07-29; the two files were consolidated into one):
```
SUPABASE_STAGING_PROJECT_REF=rphtdgoggsldshtdbkaj
SUPABASE_STAGING_DB_PASSWORD=...          # Supabase → Project Settings → Database
EXPO_PUBLIC_SUPABASE_URL=https://rphtdgoggsldshtdbkaj.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
EXPO_TOKEN=...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...    # server-only, NEVER in client bundle
GEMINI_API_KEY=...                         # Google AI Studio (paid tier for real image extraction)
```
The harness (`supabase/tests/lib/db.mjs`) builds the direct DB URL from these as
`postgresql://postgres:<SUPABASE_STAGING_DB_PASSWORD>@db.rphtdgoggsldshtdbkaj.supabase.co:5432/postgres`.

**`app/.env`** — only the `EXPO_PUBLIC_*` keys the Expo bundle reads in local dev (points at staging):
```
EXPO_PUBLIC_SUPABASE_URL=https://rphtdgoggsldshtdbkaj.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
EXPO_PUBLIC_POSTHOG_KEY=phc_...
EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
EXPO_PUBLIC_SENTRY_DSN=https://...ingest.sentry.io/...
```

> Key format: `sb_publishable_…` = client-safe anon key; `sb_secret_…` = server-only service-role key (Edge Functions inject it automatically when deployed; it only needs to be in the local root `.env` for tests/scripts). **Never put `sb_secret_…` or `GEMINI_API_KEY` in `app/.env`** — that ships to devices.

### The commands

**Day-to-day (JS/UI only — no native change):**
```bash
cd app
npx expo start --dev-client   # starts Metro
# press "a" → opens the installed dev build on the running emulator; edits hot-reload
```
First launch of the dev client shows Expo's developer menu — tap **Continue** (Ctrl+M reopens it).

**First run, or after adding/upgrading a native dependency:**
```bash
cd app
npx expo run:android          # compiles native + pulls NDK/CMake. FIRST build ~15–20 min; subsequent builds fast
```
This produces and installs the dev build, then attaches Metro. Run it again only when native deps change.

**Web preview (fastest inner loop, no camera):**
```bash
cd app
npm run web                   # react-native-web in the browser; no camera/native modules
```

**Gotchas:**
- **Red screen "Error loading app: Failed to download remote update"?** The dev build launched into the `expo-updates` OTA path instead of connecting to Metro — it tried to fetch a published EAS Update from `u.expo.dev` (per `app.json` → `updates.url`), found none (you've never run `eas update`), and a dev-client APK carries no fallback JS bundle, so it hard-errors. **It is _not_ a dead Metro.** Cause: the app was cold-launched from the emulator's **app-drawer icon** (or the on-launch update check won the race) instead of being connected to Metro. Fix: run `npx expo start --dev-client` and press **`a`** — or on the dev-launcher home screen tap the server under "Development servers", or "Enter URL manually" → `http://10.0.2.2:8081`. Never open the dev build from the app-drawer icon while developing. (Confirmed 2026-07-14 via logcat: `UpdatesDevLauncherController.fetchUpdateWithConfiguration` → `UpdateFailedToLoad`. This is a dev launch-flow issue only — a shipped preview/prod build showing the same text would instead need `eas update` to publish a bundle; don't conflate the two.)
- **Always launch via Metro with `--dev-client` — not `npm start` alone.** The `package.json` `start` script now includes `--dev-client`, but a plain `expo start` advertises Expo-Go mode and won't cleanly bind the dev-client build (→ the red screen above). On Windows PowerShell, `cd app && npx expo start …` is a parser error — run `cd app` and the expo command on separate lines. A healthy connection shows Metro logging "Android Bundling …" and the Palmly UI; a JS-level red **LogBox** (with a JS stack) is fine — that means Metro loaded your bundle. The failure state is specifically the *native* "Failed to download remote update" screen.
- A local debug build and an EAS-built APK are signed differently. To swap between them: `adb uninstall com.palmly.app` first.
- The emulator has no real camera/GPU → P2/P4 need a physical phone. Everything else runs on the emulator.
- If the emulator's anon session predates the profile trigger (no `profiles` row), clear app data / reinstall for a fresh anon user.

---

## 9. How to test everything

### App (from `app/`)

```bash
cd app
npm ci                 # exact locked install (first time / after dep changes)
npm run typecheck      # tsc --noEmit            → expect 0 errors
npm run lint           # expo lint (eslint)      → expect 0 errors
npm test               # jest                    → 28 tests pass
npm run test:ci        # jest --ci (CI variant)
npx expo-doctor        # config/dependency health → 21/21
```

### Backend — Edge Function unit tests (Deno, from `supabase/functions`)

```bash
cd supabase/functions
C:/Users/leheh/.deno/bin/deno.exe test --allow-read --allow-env    # 130 tests pass
```
(`deno check` should also be clean. The Deno import map is `supabase/functions/deno.json`.)

### Backend — DB / RLS tests (Docker-free harness against staging, from `supabase/tests`)

Runs migrations + RLS proofs against the **real staging** Postgres inside transactions that are **always rolled back** — real platform (auth schema, `auth.uid()`, roles) with zero persistent change. Reads the DB password from `.env`.

```bash
cd supabase/tests
npm ci
node --test            # 100 tests pass (applies migrations + RLS, all transactional/rollback)
```
Never edit an applied migration — add a new versioned file in `supabase/migrations/`.

### Device-free UI screenshot verification (how every built screen was verified)

No device needed — export the web bundle, serve it, and screenshot a route with headless Chrome:

```bash
cd app
npx expo export --platform web            # emits dist/
npx serve dist -l 8080                    # or any static server for dist/
# in another shell, screenshot a route with headless Chrome:
chrome --headless --disable-gpu --screenshot=shot.png --window-size=390,844 "http://localhost:8080/<route>"
```
Reference screenshots live in `docs/checkpoints/` (e.g. `p6-*.png`, `p9-*.png`, `p10-*.png`).

### Expected green counts

| Suite | Dir | Command | Pass |
|---|---|---|---|
| App typecheck | `app/` | `npm run typecheck` | 0 errors |
| App lint | `app/` | `npm run lint` | 0 errors |
| App jest | `app/` | `npm test` / `npm run test:ci` | 28 |
| Expo doctor | `app/` | `npx expo-doctor` | 21/21 |
| Edge fn (Deno) | `supabase/functions/` | `deno test --allow-read --allow-env` | 130 |
| DB/RLS (Node) | `supabase/tests/` | `node --test` | 100 |

---

## 10. The backend on staging + how to deploy

The entire backend is **live on the single staging project** `palmly-staging` (ref `rphtdgoggsldshtdbkaj`, region `ap-southeast-1`, Postgres 17). This is the **one working DB pre-launch** — prod was deleted 2026-07-14 and is recreated at launch (P12) from the git migrations. All Supabase config is done once, here.

### Inspect it (read-only)

Use the **Supabase MCP** (`.mcp.json`, read-only against staging) — `mcp__supabase__*` tools rather than guessing:

| Tool | Use |
|---|---|
| `mcp__supabase__list_tables` | tables + columns |
| `mcp__supabase__execute_sql` | run read-only SQL |
| `mcp__supabase__list_migrations` | applied migrations |
| `mcp__supabase__list_edge_functions` / `get_edge_function` | Edge Functions |
| `mcp__supabase__get_logs` then `mcp__supabase__get_advisors` | start here when debugging; advisors surface security/perf issues |
| `mcp__supabase__list_extensions` | pgmq, pgvector, pg_cron, … |

**Schema changes never go through the MCP** — every change is a new versioned, backward-compatible (expand-contract) migration file in `supabase/migrations/`. Additive only in one step; never a breaking drop/rename (single long-lived DB).

### Deploy — use `npx supabase@latest` for everything

Do **not** use a globally-installed `supabase` (an older pinned CLI cannot parse the newer `config.toml`).

**1. Push database migrations** (direct staging DB URL from `.env`):
```bash
cd C:/Users/leheh/.Projects/Palmly
npx supabase@latest db push \
  --db-url "postgresql://postgres:<SUPABASE_STAGING_DB_PASSWORD>@db.rphtdgoggsldshtdbkaj.supabase.co:5432/postgres"
```
Alternative guarded persistent apply: `CONFIRM=1 node supabase/tests/scripts/apply.mjs`.

**2. Deploy Edge Functions** (`config.toml` drives `verify_jwt` + `import_map` per function — no `--import-map` flag needed):
```bash
cd C:/Users/leheh/.Projects/Palmly
export SUPABASE_ACCESS_TOKEN=sbp_...        # PowerShell: $env:SUPABASE_ACCESS_TOKEN="sbp_..."
npx supabase@latest functions deploy --project-ref rphtdgoggsldshtdbkaj
```
Deploy one function (name from `config.toml [functions.*]`):
```bash
npx supabase@latest functions deploy worker-narrative --project-ref rphtdgoggsldshtdbkaj
```
Live posture check after deploy: `invite-create` with no JWT → 403; `worker-scan` with no service key → 403, with the key → 200.

**3. Automated CI deploy (the intended path).** `.github/workflows/deploy.yml` runs on push to `main`, gated by the `staging-deploy` GitHub Environment: `supabase link` → `db push --password` → `functions deploy`. Requires repo secrets `SUPABASE_ACCESS_TOKEN`, `SUPABASE_STAGING_PROJECT_REF`, `SUPABASE_STAGING_DB_PASSWORD`. `.github/workflows/ci.yml` runs lint · typecheck · test · expo-doctor on every PR/push, and triggers an EAS preview build (behind a manual-approval Environment) on push to main.

### The 17 Edge Functions at a glance

**User-mode (`verify_jwt = true`) — 6:** `account-merge`, `account-delete`, `compat-request`, `chat-send`, `invite-claim`, `invite-create`. These *must* be `verify_jwt=true` because they decode the JWT `sub` without verifying the signature (trusting the platform gate) — a forged `sub` would otherwise be accepted.

**Worker/public/HMAC (`verify_jwt = false`) — 11:** `worker-scan`, `worker-narrative`, `worker-compat`, `push-dispatch`, `card-render`, `cleanup`, `ops-alerts`, `fortune-generate` (all `requireMode 'secret'` — service-key auth in-function); `revenuecat-webhook` (HMAC-SHA256 over the raw body); `invite-page` (public SSR) and `hello` (echo skeleton).

### The one remaining backend task — cron self-draining

`cron.job` is currently **empty (0 jobs)** — the earlier `drain_stub` schedules (a no-op that read → archived → wrote telemetry, proving the enqueue→drain→archive→telemetry path without calling the real workers) were **unscheduled** by migration `0019_c2_unschedule_destructive_drains`. So nothing auto-drains today: the deployed workers are invoked manually with the service key, and **the pipeline is not yet self-draining** (Audit-3 finding A4). The remaining wiring — **Audit-3 task D1.T1** — is one new migration that `cron.schedule`s `net.http_post` calls against the deployed workers at the Backend-spec cadences (`scan_jobs`/`narrative_jobs` ~10s, `compat_jobs`/`push_jobs` ~15s, hourly `cleanup`/`ops-alerts`, nightly `fortune-generate`). It needs `pg_net` (available, not yet installed) and a cron-readable service key in Supabase Vault (security-sensitive, key-in-DB) — the one place the standing "no pg_cron/pg_net" parking rule is lifted (Audit-3 loop).

---

## 11. Repository map

```
C:\Users\leheh\.Projects\Palmly\
├─ app\                              # the Expo React Native app
│  ├─ src\
│  │  ├─ app\                        # expo-router file routing (route groups)
│  │  │  ├─ _layout.tsx              # root: GestureHandler → SafeArea → Theme → Stack
│  │  │  ├─ index.tsx                # launcher (BUILT)
│  │  │  ├─ (onboarding)\ (capture)\ (reading)\ (home)\ (settings)\ (modals)\
│  │  │  └─ dev\                     # dev-only route map + theme gallery
│  │  ├─ features\                   # reading, fortune, chat, settings (logic .ts + view .tsx)
│  │  ├─ components\
│  │  │  ├─ palm-diagram\            # geometry.ts (pure) + PalmDiagram.tsx (svg)
│  │  │  ├─ ui\                      # 5 primitives: Screen, Text, Button, Card, SealBadge
│  │  │  └─ PlaceholderScreen.tsx    # every PLACEHOLDER route renders this
│  │  ├─ theme\                      # tokens.ts, theme.ts, ThemeProvider.tsx
│  │  └─ lib\                        # supabase, auth, analytics, useScanStatus, revenuecat
│  ├─ .env                          # EXPO_PUBLIC_* only (git-ignored)
│  └─ package.json
├─ supabase\
│  ├─ config.toml                    # per-function verify_jwt + import_map matrix (NOT under functions/)
│  ├─ migrations\                    # 17 versioned .sql files (source of truth for schema)
│  ├─ functions\                     # 17 Edge Functions (Deno)
│  │  ├─ _shared\                    # pure, unit-tested libs (extraction, consistency,
│  │  │                             #   narrative, gemini, retry, http…)
│  │  └─ deno.json                   # Deno import map
│  └─ tests\                         # Docker-free Node DB/RLS harness (node --test)
├─ schemas\                          # (repo root) palm_features / face_features / reading_sections / fortune .v1.json
├─ prompts\                          # (repo root) build-prompts.mjs + <domain>/v1/system_instruction.md
│                                    #   → .generated.ts (statically imported by the AI functions)
├─ kb\                               # knowledge base source (kb/v1/, kb/REVIEW.md)
├─ eval\                             # device-free verification scripts (p6t2 diagrams, p8t1 cards, …)
├─ docs\
│  ├─ SETUP.md  ENVIRONMENT.md  ANALYTICS.md
│  └─ checkpoints\                   # reference screenshots (p6-*, p9-*, p10-*)
├─ Planning\
│  ├─ MVP_Buildplan.md               # the build ledger (single source of truth, P0–P12)
│  ├─ mvp_spec.md  Backend-specs.md  UIUX-specs.md
│  ├─ Human-tasks.md                 # the human-unblock list
│  └─ HowItWorks.md                  # this document
├─ .github\workflows\                # ci.yml + deploy.yml
├─ .mcp.json                         # read-only Supabase MCP config
└─ CLAUDE.md                         # project guide for the AI agent
```

---

## 12. What YOU need to do next

### The consolidated human-unblock list (priority order)

1. **A physical Android phone — the #1 unblocker.** It validates every built `[~]` screen on-device and opens **P2** (the MediaPipe camera spike, the #1 project risk), **P4** capture, and the **M1/M2/M3** milestone gates. The emulator already runs all non-camera UI, but real camera/GPU work needs hardware.
2. **H8 — RevenueCat.** Account + iOS/Android apps + `premium` entitlement + monthly/annual offerings (no trial) → unblocks **P7 paywall**.
3. **H4c — Paid Gemini tier.** Attach billing to the key → real palm/face **image extraction** (P5.T1/T2/T3) + context caching. Also a production/privacy blocker (free tier trains on submitted data).
4. **H6 — Domain `palmly.app` + Cloudflare Turnstile.** → P8.T3 teaser DNS + P3.T6 anonymous-auth CAPTCHA.
5. **H3 + H4b-2 — GitHub CI/deploy secrets.** `EXPO_TOKEN` + `preview-build` environment + a test PR; `SUPABASE_ACCESS_TOKEN` / `PROJECT_REF` / `DB_PASSWORD` repo secrets → green CI + auto-deploy.
6. **H7 — Store accounts (later).** Apple Developer + Google Play. **Start Google Play early** — new personal accounts face a ≥12-tester / ≥14-day closed-test gate (~3-week timeline cost).
7. **H9 — AppsFlyer Zero (later).** Both apps + support answers for the two D1 attribution questions.
8. **H10 — Extraction eval set (later).** 30–50 consenting real palm photos + adversarial samples, stored outside git with a consent manifest.
9. **H6b — KB authenticity review (later).** Native-reader/practitioner review of the drafted `kb/v1/` → `kb/REVIEW.md`.

*(Already cleared 2026-07-14: H1 emulator, H2 PostHog/Sentry, H4 Gemini edge secret, H4b-1 CLI deploy token, H5 anonymous sign-ins.)*

### Eyeball the built screens on the emulator right now

You do not need any of the above to see the built UI today. With the emulator running:

```bash
cd app
npx expo start --dev-client
# press "a"  → opens the dev build on the emulator
```
Then navigate from the launcher's **"Dev · route map"** button (`/dev`) to hop directly to any built screen. The BUILT routes that render with `PREVIEW_*` fixtures and look complete:

- `/analyzing` — the anticipation loader (progressive line-trace)
- `/reveal` — the reading "wow" screen (ink-diagram hero, section cards, gold-locked premium sections, trust footer)
- `/fortune` — the returning-user daily-almanac home (free vs premium via the seed)
- `/history` — the past-readings shelf
- `/chat` — the premium grounded-chat thread UI
- `/settings`, `/notifications`, `/methodology`, `/legal`, `/privacy` — all five settings screens

The PLACEHOLDER routes (`/welcome`, `/how-it-works`, `/hand-select`, `/primer`, `/palm`, `/face`, `/paywall`, `/share`) render the shared stub and only wire onward navigation — that is the deliberate BUILT-vs-PLACEHOLDER seam.

Or, for the fastest look with no emulator at all, use the web preview: `cd app && npm run web`.

---

*This guide reflects ground truth as of 2026-07-14. When in doubt, the authoritative sources are `Planning/MVP_Buildplan.md` (the build ledger with its STATE block) for status, `supabase/migrations/*.sql` for schema, and `supabase/config.toml` for the function security matrix.*
