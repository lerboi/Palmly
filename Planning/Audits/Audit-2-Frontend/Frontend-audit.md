# Palmly — Frontend Audit

**Date:** 2026-07-18
**Scope:** the entire frontend surface — every screen and route in `app/src`, the design system and motion foundation, the two server-rendered loop surfaces (`card-render` share card, `invite-page` teaser) as *experienced* surfaces, the app↔backend integration seam, and the full first-session + returning-session + recipient-session user journeys.
**Method:** 12-agent audit — 8 parallel deep-readers (entry/onboarding, capture, analyzing/reveal/history, share/compat, conversion/retention, design-system/motion, trust surfaces, backend-capability map via the live staging MCP) followed by 4 adversarial cross-cutting critics (first-session journey, virality loop, visual identity eyes-on-pixels, completeness). Every load-bearing claim was re-verified in code by the completeness pass; screenshots in `docs/checkpoints/redesign/final/` were reviewed by eye; staging (`rphtdgoggsldshtdbkaj`) was live-queried (tables, cron, functions, row counts).
**Honest caveats:** web screenshots render reanimated motion as static end-states by design, so all *live* motion/haptic judgments are inferences from code, marked as device-pending. RevenueCat, the physical camera, MediaPipe, push transport, paid Gemini image extraction, the `palmly.app` domain, and Turnstile are **known human-blocked** — findings touching them are tagged; they are judged for impact, not blamed on the code.

> **File:line convention (learned from the backend audit's errata):** this audit is the authority on *what* each finding claims; **the repo is the authority on *where* it lives.** Cites were verified during the audit but the tree moves — re-grep before editing against any specific line number.

> **➡️ Fixes should be tracked in a `Frontend-audit-Tasks.md` checkbox ledger** (F0/F1/F2 items in §8 are written to be lifted directly into one, same convention as `Backend-audit-Tasks.md` B0–B22).

---

## 1. What Palmly is, and what the frontend must deliver (understanding check)

Palmly is an AI mobile app (Expo/React Native + Supabase) that reads a user's **palm (手相, Chinese palmistry)** and **face (面相, physiognomy)** from phone photos, with Chinese/Asian metaphysical tradition as the *primary* framework — explicitly not Western astrology with Asian motifs. Positioned as entertainment/self-reflection; no health/medical/financial claims.

The frontend exists to deliver **two products at once**:

1. **P1 — a trustworthy, effortless reading.** Zero friction to the first wow (no signup before value), a check-deposit-grade guided capture, a staged analyzing loader that builds anticipation, a reveal that lands as a choreographed peak, and repeat-scan consistency surfaced as a brag. Target metrics: <45s cold-launch→camera, p50 <20s in capture, >85% auto-capture.
2. **P2 — a designed-in virality loop.** Every reading yields a branded, screenshot-optimized share card built from *the user's own traced lines* (the moat: recognizably THEIRS, and privacy-safe — a diagram, never the photo). A "compare with a friend" invite → SSR web teaser → install → deferred context → the friend's own capture → a **simultaneous two-sided pair reveal** (the "text each other about it" moment) → both re-share. Target: link-tap → recipient's own reveal in <4 minutes; steps from "cool result" to "shared" ≈ one tap. K > 0 is the win condition, not K > 1.

Retention is a third, separate machine: the daily almanac fortune (free one-line essence, premium full 宜/忌 almanac), grounded chat, history. Monetization: the full first reading and first comparison free; monthly + annual, **no trial** (U3, correctly implemented in copy).

The visual identity is the redesign-v2 **"Vermilion & Motion"** contract: warm-paper calm base, a single confident vermilion accent (`#D13B27` light / `#FF7C63` dark), the three-reds discipline (vermilion = everywhere-accent; claret `#9E3B2E` = red-thread + seal ONLY; crimson = destructive ONLY), sans-first type with one editorial serif moment, and an authored motion vocabulary (press springs, entrance stagger, palm draw-on, ring sweep, thread draw, score count-up) — every animation reduce-motion + web gated. Feel words: *warm, alive, premium, confident, quietly Chinese — never kitsch, never generic SaaS.*

---

## 2. Verdict — executive summary

**Palmly's frontend today is a beautifully dressed stage with exactly one live wire.** A complete user session performs **one network call** (anonymous auth). Across the spec's twelve journey stages A–L, **not one is fully wired**: capture never creates a scan, the analyzing screen hardcodes a frozen mid-pipeline pose and can never advance or be escaped, the reveal/share/pair/fortune/chat/history screens all render polished fixtures ("Mei", score 82, a fake 5-day streak), **every tap in the share sheet silently discards the user's intent** (`onPress={onClose}`), no recipient can ever enter (zero deep-link handling anywhere; the invite-code recovery button routes to the camera), no returning-user session exists (every open forever replays first-run onboarding; home/settings are reachable only from the `__DEV__` route map), account creation does not exist anywhere, and **1 of 29 typed analytics events ever fires** — so none of the five launch-validation metrics can record a row.

The decisive, encouraging fact: **the overwhelming majority of the gap is ordinary client wiring against a launch-grade deployed backend, not the device-blocked work.** Invite mint/claim (with a typed-code fallback), the SSR teaser, compat scoring, the pair-reveal broadcast, pre-rendered cards, account-delete — all deployed on staging and *unused by the UI*. The seam (params, supabase-js reads, one Realtime mount, clipboard/share calls) is plain code.

| Area | Grade | One-line summary |
|---|---|---|
| Visual system & dark mode | **A−** | Genuinely modern-premium; vermilion has a point of view; dark mode is first-class; 320px survives |
| Choreography (authored in code) | **B+** | Reveal + pair peaks are genuinely designed; device feel is ~70% built (no haptics, hard cuts on the reading stack) |
| First-session flow (as wired) | **F** | ~7 taps from launch to a permanently frozen loader; no path to reveal exists |
| Virality loop (client) | **F** | 0% wired; K-factor structurally zero AND unmeasurable |
| Virality loop (server) | **A−** | Launch-grade: tokens, teaser, claim, scoring, broadcast, pre-rendered cards |
| Retention surface | **D** | Built, handsome, unreachable, fixture-fed, no birth-date input, no real fortune row exists |
| Conversion (paywall/account) | **D+** | Paywall sheet is good; no entitlement state, no trigger context, no legal links, account creation absent |
| Trust surfaces | **C−** | Excellent content, orphaned; both delete buttons are silent no-ops — a takedown-screenshot risk |
| Instrumentation | **F** | `app_opened` only; onboarding events don't even exist in the taxonomy |
| Identity ("quietly Chinese") | **C** | Almost entirely absent outside fortune's ganzhi whisper; entry screens read generic-wellness-with-a-red-accent |

**Protect what's already right:** the zero-friction-to-wow rule is fully honored (no signup/name/birthdate/notification ask anywhere before value); copy is health-claim clean (App Review safe); U3 no-trial plan mix is correct; the three-reds token discipline holds in code; a11y label coverage is genuinely broad (59 sites, radiogroup roles, live-region capture announcements); the reveal's editorial serif hero is the single best move in the app; the teaser page's gold "?" curiosity ring is the loop's best asset.

---

## 3. The journey, stage by stage (spec §2 A–L)

### 3.0 Coverage matrix

| Stage | Spec | Status | Evidence (key) |
|---|---|---|---|
| **A0** brand moment | ≤1.5s auto-advancing seal-stamp | **Missing** — launcher is a static tap-gated screen duplicating A1 | `app/src/app/index.tsx` |
| **A1–A3** onboarding | 3 screens, skippable, hand question feeds pipeline | **UI-only** — flows fine; A3 answer discarded | `hand-select.tsx:24,66` → `palm.tsx:11` |
| **B** camera primer | Contextual permission + consent + upload fallback + denied recovery | **UI-only** — no permission API, no picker, no consent log, no denied state | `primer.tsx:74,79` |
| **C** guided capture | 7-state machine, auto-capture, review | **UI-only diorama** (camera known-blocked; state machine/copy/review are NOT) | `CaptureView.tsx:38` |
| **D** analyzing | Staged loader → auto-advance to reveal | **UI-only + hard dead-end** — `useScanStatus` built, mounted by NO route | `analyzing.tsx:11` |
| **E** reveal | Self-drawing hero, sections, locks, share seal, trust footer | **UI-only on fixtures**; per-section highlight unbuilt; SealFab occludes text | `reveal.tsx:10`, `RevealView.tsx` |
| **F** share sheet | 2 taps to shared, pre-composed text, real channels | **UI-only, inert** — every action is `onClose` | `ShareView.tsx:133,143` |
| **G/H** compat sender | Framing pick → link → pending state → pair reveal | Framing picker **missing**; pair reveal fixture; pending row exists on (unreachable) home | `pair.tsx:10-25`, `FortuneHome.tsx:137` |
| **I** paywall | Contextual multi-page, legal links | **UI-only single-page**; 3 of 5 triggers; no context param; no ToS/Privacy links | `PaywallView.tsx` |
| **J** account creation | Sheet at save/compat/fortune, anon linking | **Missing entirely** — anonymous-only; no UI anywhere | `lib/auth.ts` |
| **K** returning home | Fortune + thread row + shelf + chat + settings | **UI-only and UNREACHABLE** — no redirect; `/fortune`,`/settings` only in dev map | `index.tsx`, `dev/index.tsx:38,46` |
| **L** recipient journey | Teaser → deferred link → claim → capture → pair-first | Server teaser **deployed** (domain known-blocked); client leg **missing entirely** | `claim.tsx:16,58-59` |

### 3.1 Cold launch and onboarding (A)

**What happens:** splash (still indigo artwork — §5.3) → `_layout.tsx` fires the app's only analytics event and its only network call (`ensureSession`, non-blocking) → launcher. Path to camera: **5 taps** (Get started → How it works → Choose your hand → Read my palm → Allow camera), **3 via welcome's Skip**. The **<45s-to-camera target is comfortably met** choreographically — screens are short, skippable, signup-free. This is the healthiest stretch of the funnel.

**What's wrong:**
- **The launcher is a tap-gated fourth screen that duplicates welcome.** Spec A0 wants a ≤1.5s auto-advancing brand moment. `index.tsx` requires a tap and its message ("Read your palm from a single photo.") near-duplicates A1's hero — two consecutive brand screens before any concrete value.
- **The hand answer — the app's only quiz question, spec'd as pipeline input — is discarded.** Local `useState` in `hand-select.tsx`, no param on the push; `palm.tsx` re-defaults to `'right'`. A left-handed user answers honestly and is shown a right-hand capture. Silent trust break on the app's first promise.
- **Welcome's Skip bypasses hand-select entirely** (fine today only because the answer goes nowhere).
- **No offline/failed-session handling:** `ensureSession` failure is a `console.warn`; a sessionless user walks the whole funnel and would die at upload — the worst possible place.
- Cold start has a **font flash** (`useFontsReady` computed, never consumed; `SplashScreen.preventAutoHideAsync` never called) and a **reduce-motion race** (`useReducedMotion` initializes `false`, reads the OS pref async — Reduce-Motion users still get first-screen entrance/draw animations).

### 3.2 Camera primer (B)

The best-*timed* ask in the app — post hand-select, with the three D2 reassurance rows ("analyzed on the spot · photo deleted after reading · never used to identify you") that double as the versioned biometric consent text. But it's theater: **"Allow camera" is a bare `router.push`** (no permission API in the project), **no consent-version is logged** despite the rows *being* the consent text (Backend §9 requirement — a compliance gap independent of the device blocker), **"Upload a photo instead" pushes straight to `/analyzing` with no picker** (`expo-image-picker` is not installed — this leg is *not* device-blocked and is simultaneously the spec-mandated library path, the permission-denied recovery, the recipient's low-friction fallback, and the only device-free door into the live pipeline), and **no denied-state → Settings deep-link exists**.

### 3.3 Guided capture (C) — P1's signature moment

What exists is a **static two-pose diorama**: palm pinned to `ready`/"Hold still…", face pinned to `searching`. No camera dependency of any kind is installed; `modules/palm-landmarks` contains only a README. The live feed and landmarks are legitimately device-blocked — but the following are not, and the component contract will force a rework if they wait:

- `CaptureState` models **3 of the spec's 7 states**; zero of the five corrective instruction strings ("Move closer", "Flatten your hand, fingers relaxed"…) exist anywhere in the codebase.
- **Auto-capture choreography is absent** — the ring animates to 70% and stops; nothing fires the shutter on completion; the freeze-frame → "Looks sharp"/"Retake" review step doesn't exist; the `captured` state is dead code.
- **The Help "?" button is a dead tap** (`onHelp` never passed — it press-scales, then does nothing, which reads *more* broken). Face's flip-camera control is equally dead.
- **No haptics** (`expo-haptics` not installed) — the spec's whole haptic vocabulary has no implementation path.
- **Visually the signature moment is emotionally empty:** a flat `#17181D` rectangle, no paper-toned vignette (spec demands it; it's a static drawable buildable now), and the `PALM_GUIDE` outline **reads as a lopsided four-fingered cartoon paw** — users must align their hand to this shape.

One genuinely honored spec row: **capture instructions are announced via a live region** — the a11y differentiator's string half is real.

### 3.4 Analyzing (D) — the first session's hard stop

**This is the single most damaging screen in the app as wired.** `analyzing.tsx:11` renders a hardcoded `status="extracting"`, `elapsedMs={7200}` — frozen at "Following your life line…" forever. No back affordance renders (AppHeader skips the back button without `onBack`), the notify-me CTA's `onPress` is `undefined`, and **nothing ever navigates to `/reveal`**. Meanwhile `app/src/lib/useScanStatus.ts` — a production-quality, reconnect-safe fetch-then-subscribe Realtime hook — **is imported by no route**. The staged-message vocabulary, progressive line reveal, overrun softening (45s/75s), and a warm failure state are all *built* in `AnalyzingView` and reachable only via dev routes.

Also: the failure-hint map covers only `not_a_hand` (a timeout gets told to find more light); `useScanStatus` swallows fetch errors with no poll fallback (a dropped socket = silent infinite hang behind "taking a little longer" copy); **"1.2M palms read" ships as fabricated social proof** in a pre-launch app's trust-building loader; and the spec's "their own palm (the captured crop)" trust beat is structurally impossible — the component contract only accepts *post-pipeline* geometry, so the loader can never show the user's actual hand while working.

Backend context that makes this worse: even a real enqueued scan would hang today — **`cron.job` is empty on staging** (drains unscheduled, `pg_net` not installed) and **`scan-create`/`scan-ingest` don't exist**, so the pipeline has no front door and no motor. (Both are plain HTTP functions; neither needs a phone.)

### 3.5 Reveal (E) — a real peak, unreachable and self-occluding

The choreography is genuinely authored: self-drawing PalmDiagram hero, editorial serif headline ("A Water hand — feeling runs deep in you."), 90ms section stagger, locked-depth cards, CompareCard placed *inside* the reading after section two (exactly the P2 placement), claret SealFab, trust footer with consistency brag + PrivacyBadge + methodology link, FaceOfferCard at scroll end. Exits are correctly 1-tap. **It would land — but no production path reaches it**, and at the peak:

- **The SealFab visibly covers the first card's text in the shipped screenshots** (`reveal.png`, worse at 320px) — the share affordance hides the reading it exists to share. No bottom-padding compensation; and its entrance is a 360ms timer, not the spec's "after the first section is read".
- **The per-section line highlight — the reveal's strongest trust mechanic — is unbuilt.** `SECTION_LINE` is defined and never used; sections render a generic icon tile instead of the diagram re-rendered with *that* line lit. Without it the sections read like any horoscope app's text cards.
- **Locked-card taps lose their section**: bare `router.push('/paywall')`; the paywall hardcodes `fate_line`, so a user who tapped "Rare markings" gets a fate-line pitch — the curiosity that opened the paywall is dropped at the door.
- Back is `router.back()` into the spent loader (must become replace-navigation once wired); the "Photo deleted" stamp has no timestamp; the tradition footnote is one template sentence for every section (the authenticity signal reads generated, not learned); the second-hand offer card ("Add your left hand for a fuller reading") is missing entirely.
- **The face-reading reveal does not exist at all.** `reveal.ts` contains only the palm fixture; the FaceOfferCard launches capture→analyzing toward a screen that renders a *palm* fixture; history's "face" row opens the palm reading. A spec-level hero feature (mvp §4.2 — "the easier of the two, consider polishing first") is a door painted on a wall. Ship it or gate the door.

### 3.6 Share sheet (F) — the loop's exit, fully inert

One tap from reveal (correct), segmented solo/compat preview, invite toggle defaulting ON, big vermilion Share CTA — and **every single action discards intent**: `ShareView.tsx:133` `ChannelButton onPress={onClose ?? (() => {})}`, `:143` primary Share `onPress={onClose}`. Verified by grep: **zero occurrences of `Share.share`, `expo-sharing`, `expo-clipboard`, or `functions.invoke` in all of `app/src`.** No invite is ever minted, no card published, no clipboard write, no pre-composed text. A polished sheet that silently swallows the share is worse than none — it trains "sharing is broken." Further:

- The modal takes **no params** — it always shares Mei's fixture Water hand, never the user's reading.
- The **channel row is three generic circles** (Message/Copy link/More) — not the market-ordered WhatsApp · LINE · Zalo · IG · TikTok · Copy · QR · More row the SEA-first funnel depends on, and channels don't fire `invite-create`.
- The **in-app preview diverges from the posted card** (serif headline, no chips, no attribution vs the server's sans-800 + chips + attribution) — users approve an artifact they never see.
- Even fully wired, **the client has no authorized way to obtain a public card URL**: `card-render` is secret-mode for both render and publish; no user-mode ownership-checked publish path exists. And `_shared/invite.ts` hardcodes `INVITE_BASE_URL='https://palmly.app/i'` — dead until the domain lands, though the deployed `invite-page` already serves the identical teaser on the staging functions origin. An env-switchable base URL closes the loop on staging **this week**.

### 3.7 Compat sender + pair reveal (G/H)

The **pair reveal is the best composition in the app** (opposing slide-ins, ~800ms thread draw, gold 148px count-up ring, 5 sub-score bars with 90ms fan, both-sides narrative) — and it cannot occur for any real user: `pair.tsx` hardcodes Mei/82, takes no `pair_id`, has **no Realtime subscription** (the server's `compat_status_broadcast` fires to nobody), and the push template's `palmly://compat/{pair}` deep link **matches no route**. The §2.7.4 "both sides see it simultaneously, then text each other" moment — the loop's compounding step — has server truth and zero client consumption. Additionally: "Share this match" opens the sheet **on the solo tab** (`initialVariant='compat'` exists and isn't passed — a one-line fix at the loop's hottest moment); the **framing picker (friend/partner/crush/family) doesn't exist anywhere** (the tone input for the pair narrative and card copy); the **first-comparison-free gate is unenforced client-side** (`compat-request` deployed, never called — premium pillar #2 has no conversion moment); the **48h nudge has no transport** (`invite_nudge` absent from the NotifType union); and the sender pending state ("Waiting for Mei — nudge them") exists but lives on the unreachable home, and its tap re-opens the sheet with no same-link reshare semantics.

### 3.8 Paywall (I)

A disciplined, App-Store-grade single sheet: personalized traced-palm hero, gold PALMLY PREMIUM eyebrow, four feature-matched inclusions, annual preselected with the gold SAVE 40% seal, "No trial · cancel anytime". Real problems:

- **No Terms/Privacy links in the footer** — Apple requires them on auto-renew purchase screens. **Store-rejection class; ~10 lines** (the `/legal` screen already exists).
- **No trigger context param** from any entry (3 of 5 spec triggers wired; `compat_second` and `post_share` missing entirely) — the hero can't match the tapped section, and `paywall_viewed/dismissed` never fire, so "is the paywall placed right?" is unanswerable.
- **No entitlement state exists anywhere** (`lib/` has no entitlements module) — `fortune.tsx` hardcodes `premium streak={5} partnerName="Mei"`; a real free user would be shown a full premium almanac, a fabricated streak, and a fake pending friend *as their own data*. The funnel has nothing to convert FROM. (RevenueCat purchase is H8-blocked; a local free-by-default store is not.)
- **At 320px the Monthly plan is buried behind the CTA with no scroll cue** — plan choice collapses to annual-only; dark-pattern-adjacent.
- "Restore purchases" is a no-op inside the paywall, and **Settings' Restore row routes to the paywall** — a paying user seeking recovery is shown a sales pitch.
- No decline record → the server's already-written win-back template has no trigger. Spec's multi-page structure (social-proof page, today's-fortune preview) was consciously collapsed to one page — fine, but then amend §2.8 and fold the social proof in; right now it's simply lost.

### 3.9 Account creation (J) — missing entirely

The only wholly absent stage. `auth.ts` is anonymous-only; no sheet, no Apple/Google/OTP, no `linkIdentity` call anywhere in the UI; `account_linked` is typed in analytics and unfireable. Consequences chain: a premium purchase would anchor to a UUID that dies with the device; compat-accept has no identity ("so Mei knows it's you" is impossible — the pair loop's anchor); history has no owner; settings has no "Signed in as / Claim your account" row. Provider console config can lag; the sheet + Supabase anonymous-identity linking is ordinary code.

### 3.10 Returning-user session (K) — does not exist

**No returning-user routing exists.** `index.tsx` has no session/reading check and no Redirect; `/fortune` and `/settings` are pushed only from the `__DEV__` route map. A user who completed a reading yesterday cold-opens into "Get started" forever. This kills at the front door: the daily-fortune retention loop (the monetization centerpiece), the red-thread nudge row (the loop's re-share surface), subscription management and account deletion (store-discoverability requirements). Within the (unreachable) surfaces: fortune's almanac card is the identity high point but **no share affordance exists on it** (the spec's third share-asset class, the highest-frequency share opportunity, forfeited); **no birth-date ask exists app-wide** (grep "birth" = 0) so the fortune the app promises is "tuned to you" has no tuning input, and `fortune_templates` is 0 rows live (the backend has never produced an almanac); **chat's input is a shell** — no `onChangeText`, no send `onPress`; a premium user's first real message is a silent dead-end; history opens the identical fixture from every row, shows an **unearned** "Your palm is unchanged" brag (hardcoded `true`), and hardcodes `en-US` dates.

### 3.11 Recipient journey (L) — the make-or-break path, client leg missing

Server side is genuinely strong: `invite-page` (SSR teaser, per-invite OG, kind-aware copy, UA-routed CTA, WeChat escape overlay, clipboard arming, always-visible 10-hex fallback code, bot-filtered created→clicked funnel) and `invite-claim` (hashed single-use tokens **plus a typed-code resolver**) are deployed. Client side: **zero URL handling in the entire app** (no `useLocalSearchParams`/`getInitialURL`/`Linking` anywhere), no index branch (its own docstring admits it), `claim.tsx` hardcodes `INVITER='Mei'`, and **both** claim buttons — including "Have an invite? Enter code" — push `/primer`, destroying the invite they claim to serve. No deferred mechanism of any kind (no attribution SDK, no clipboard check, no install-referrer read); `app.json` has the `palmly` scheme but no associatedDomains/intentFilters. The teaser's iOS CTA points at `id0000000000` (H7) and og:image falls back to a nonexistent `og-default.png`. **Link-tap → recipient reveal is not <4 minutes; it is infinite.** Only the domain/store-ID/attribution-SDK legs are human-blocked — scheme parsing, the index branch, the code-entry sheet, and AsyncStorage invite persistence are ordinary app code against a deployed resolver.

### 3.12 Trust suite (settings/privacy/methodology/notifications/legal)

Handsome, modern, well-crafted — and **orphaned**: `router.push('/settings')` exists only in the dev map; FortuneHome has no gear; the single production door into any trust screen is the reveal footer's methodology link. Inside: **both privacy-center delete buttons are empty function bodies** with no pending/success/error states ("Delete my scan photos now" / "Delete everything" — visibly do nothing on the one surface a skeptical, privacy-literate user will screenshot); the backend half is split (`account-delete` deployed but never called; `image-delete` **built locally, never deployed**; the hourly cleanup cron unscheduled — so *every* deletion promise in the UI is currently non-functional); **all toggles are ephemeral `useState`** (the keep-photo biometric consent choice is silently discarded); "Fortune delivery time" is an inert value row where the spec mandates a picker; ToS and Privacy Policy rows are duplicate doors to one undifferentiated screen; the four Switches have no a11y labels and render a **teal Material thumb** on the vermilion track in the signed-off web screenshots; and **the deletion promise contradicts itself across surfaces** — "deleted after your reading" vs "within a day" vs the flat "Photo deleted" badge, sometimes on the same screen, with the teaser saying "usually within a day." Materially different claims aimed at exactly the audience the copy exists to convince.

---

## 4. The virality loop audit (the heart of this audit)

### 4.1 Loop-stage table (friction 0 = frictionless, 10 = dead)

| # | Stage | Exists? | Friction | The gap |
|---|---|---|---|---|
| 1 | Reading → share impulse | ✅ 1-tap SealFab + in-reading CompareCard | 2/10 | Upstream: no real reveal ever occurs |
| 2 | Share sheet | ✅ built, **inert** | **10/10** | Every action = `onClose`; no share API/clipboard/invoke in the app |
| 3 | Card/link into a chat app | Server ready; client never calls | **10/10** | No invite mint, no user-mode card publish, base URL hardcoded to dead domain |
| 4 | Friend's first impression | ✅ teaser deployed, good | 5/10 | og-default 404, iOS store URL placeholder, no og:image dimensions |
| 5 | Install → deferred context | ❌ nothing | **10/10** | No SDK, no clipboard read, no referrer read, no UL config |
| 6 | Claim | ✅ screen built, unreachable | **10/10** | Hardcoded 'Mei'; code-entry button routes to the camera |
| 7 | Friend's capture | Static diorama | 9/10 | Camera device-blocked; **library-upload fallback is not** and is stubbed |
| 8 | Pair reveal | ✅ best composition in app, fixture-only | 9/10 | No pair_id, no Realtime sub, push deep-link matches no route |
| 9 | Both re-share | Partially | 6/10 | Opens the **solo** tab at the peak; no auto-prompt; button below the fold |
| 10 | Sender pending/nudge | Row exists on unreachable home | 8/10 | No 48h nudge transport; nudge re-mints instead of re-sharing |
| 11 | Loop re-entry (day 2+) | ❌ | 9/10 | Fortune/history have zero share affordances; every surface post-session-1 is a cul-de-sac |

### 4.2 K-factor: as designed vs as buildable today

K = invites-per-user × invite conversion. Today **i = 0** (no client path mints an invite — the sheet's toggle feeds local state) and **c is undefined** (no recipient can carry context through install). And it is **blind**: `share_sheet_opened`, `share_completed`, `invite_created`, `invite_accepted`, `pair_reveal_viewed` are all typed and none are emitted; the only live funnel edge is the server's bot-filtered created→clicked. Once wired, the bleed ranking to watch: (a) install→claim with no deferred mechanism = near-total context loss; (b) claim→capture — a stranger's link leads to a camera ask and the low-friction library fallback is stubbed; (c) clicked→install on iOS = 100% bleed until the store URL is real; (d) share completion without pre-composed text.

### 4.3 The share card — does it pass the screenshot test? Would a 22-year-old post it?

Eyes-on the real resvg render (`v21-card-feed.png`): **WHAT** reads instantly (headline + palm diagram = palm reading — pass). **WHERE-FROM** passes weakly (30px `palmly.app` + claret seal). **WHOSE** fails — attribution is a 28px corner name, illegible at feed size. Composition faults: a large dead band between headline and hero; fixture polylines render as scratchy sticks overrunning a faint mitten silhouette; the naive end-of-line label anchor collides "Fate" into the heart line (the app fixed label collision in `geometry.ts`; the server never inherited it); chips are 60px decorative dust on a 1350px canvas. **The story variant ships a decorative FAKE QR captioned "scan to compare"** — a broken promise on the most public artifact. Verdict: **it reads like a biology-textbook diagram, not a flex.** What flips it: the person's name at byline weight; one emotionally-charged chip ("Deep heart line — loves for keeps") instead of taxonomy labels; a hand that reads as a hand with the lines inside it; a real QR or none; a dark story variant; and **a compat card class, which does not exist server-side at all** — today a "compare palms" invite previews with a solo card or a 404, so the loop's hook and its preview contradict each other.

### 4.4 The teaser page — the loop's best surface

Genuinely strong (SSR, kind-aware copy, WeChat escape, fallback code always visible, dark + reduced-motion CSS; the gold "?" inside the vermilion ring is the best curiosity device in the product). Three self-inflicted drags: iOS CTA goes straight to the placeholder store URL with no Universal-Link-first ordering (codeable now); the page shows the abstract wheel where inlining the sender's actual card (`context.card_image_url`, already sanitized) would make "Mei" concrete; and "How Palmly reads" — the believability backstop built for exactly this skeptical audience — is unreachable pre-install.

### 4.5 The "one more tap than needed" hunt (nine removable steps)

1. `pair.tsx` opens the share sheet on the solo tab at the pair peak (one line: pass `initialVariant='compat'`).
2. Pre-mint the invite on sheet-open/toggle-on, not on channel tap — the pre-render infra exists so share can be instant.
3. No pre-composed share text anywhere (spec §6.3.3 demands pre-population).
4. Claim's "Enter code" costs the recipient their entire invite.
5. The recipient re-walks generic 5-tap onboarding instead of claim→primer (2 taps).
6. The launcher demands a tap where A0 is an auto-advancing brand beat.
7. Post-pair-reveal re-share requires hunting below the fold — auto-prompt it ~2s after the score lands, both sides.
8. The home nudge re-opens a fresh (solo) sheet instead of re-sharing the SAME link with elapsed-time copy.
9. Fortune/history — the daily surfaces — have zero 1-tap share affordances.

### 4.6 Minimum set for the loop to close measurably on staging (before palmly.app exists)

1. Share execution in `ShareView` (invite-create + clipboard + `Share.share` + pre-composed text).
2. A ~30-line user-mode, ownership-checked card **publish** path over `card-render`'s existing `publishCard`.
3. Env-switchable `INVITE_BASE_URL` defaulting to the deployed functions origin.
4. Recipient door: scheme-param parsing + index branch + a real code-entry sheet calling the deployed resolver + AsyncStorage persistence.
5. The scan front door + analyzing→reveal wiring (so a real result exists to share) + `expo-image-picker` upload.
6. Pair plumbing: `pair_id` param + compat Realtime subscription + deep-link route alignment.
7. ~20 lines of loop analytics emission.

Without these seven, nothing else on the loop matters; with them, K-factor records its first row on staging.

---

## 5. Visual & motion audit

### 5.1 Overall verdict

The Vermilion system is **real and mostly earns "modern premium."** The reveal's editorial serif hero, the fortune almanac's scholar-calm Do/Avoid columns, the paywall sheet, and the pair composition would hold up next to Headspace/Calm-tier 2026 apps. The three-reds discipline is visible in practice, not just in tokens. **Dark mode is first-class** — coral accent with dark-on-coral text, gold ring luminous on near-black; `pair-dark` and `paywall-dark` are the two best frames in the set. **320px survives** with no clipping. The founder's fear — losing identity to blandness — is justified **on the entry surfaces specifically** (welcome/primer/hand-select would pass as any competent scanner app) and answered well on fortune/reveal/pair.

### 5.2 The palm artifact — the #1 craft problem in the product

The brand's single most-repeated image **fails at every size**. At hero size (welcome, reveal, analyzing, paywall, share): `HAND_SILHOUETTE` is a slumped four-digit mitten with no thumb articulation, and **the heart/head lines visibly extend past both edges of the blob — strokes float OVER a splotch instead of sitting IN a palm.** At ≤96px (pair corners, compat preview, hand-select, history thumbs): the silhouette auto-drops and the hairline polylines read as faint scratch marks; the partner palm is a mirrored clone of the user's, so the pair looks cloned. The capture `PALM_GUIDE` reads as a cartoon paw at full-screen. **This artifact is the hero on ~8 screens plus every future share card — its craft ceiling is the share card's craft ceiling.** One redraw (silhouette derived from geometry bounds so lines always sit inside a credible five-digit upright hand; ≤96px forces silhouette-on + 2× strokes; partner geometry differentiated) upgrades hero, loader, cards, pair moment, and thumbnails at once.

### 5.3 The most public pixels are still the retired identity

`icon.png` is a full **indigo** tile; `android-icon-foreground.png` and `splash-icon.png` draw the mark in indigo + old salmon. Every in-app pixel is vermilion; the home-screen icon and cold-start splash — the two most-seen brand touchpoints, and the exact handoff a vermilion invite-card recipient lands on after install — contradict the entire redesign. The code-level "no indigo" grep invariant passes while the most visible pixels fail it. Pure asset regeneration, no device needed.

### 5.4 "Quietly Chinese" is almost entirely absent

Across welcome, how-it-works, hand-select, primer, palm, claim, share, settings, methodology: zero cultural signature — no seal/chop motif, no engraved texture, no lunar date, no named classical concept. The only heritage beats in the whole set are fortune's "Metal Tiger day" whisper and the claret thread. The no-CJK decision removed the labeled line names and **nothing replaced that authenticity signal.** The fix is a systematized *seal-stamp + almanac* layer, not CJK: (1) stamp the seal (scale-down settle + haptic) when the reading is ready; (2) chop-seal corner on cards; (3) seal beside the methodology title; (4) romanized lunar date whisper in the fortune header ("Sixth month · seventh day · Metal Tiger day"); (5) one named classical concept per reveal footnote ("the tradition calls this a three-talent pattern"). Five touches, zero kitsch.

### 5.5 Dead zones (composition, not decoration)

Measured by eye at 844px: hand-select ~45% empty paper; claim ~55% (void above the avatars AND between badge and CTA); primer ~450px of nothing (reads like a styled permission dialog); the solo share tab has a ~330px hollow band. All are top-anchored flex layouts with bottom-pinned CTAs floating in space. Fills that carry identity: ghost-palm watermark band (hand-select), a scaled-up avatar+thread composition + a blurred "what you'll both see" pair-card mock (claim), an engraved two-tone camera+open-palm spot illustration (primer), the chips+attribution row the solo card is missing (share).

### 5.6 What will still feel dead on device (motion gaps)

The authored vocabulary is tasteful and properly reduce-motion/web gated — but "alive" is ~70% built:

- **No haptics exist at all** (`expo-haptics` not installed) — every spring is silent; the pair-score landing has no success pattern; the spec explicitly keeps haptics ON under reduce-motion.
- **The reading stack rides OS-default hard cuts** — the analyzing→reveal handoff (the product's crowning transition) is a jump cut; only onboarding got the authored slide.
- **`motion.spring.entrance` is defined, test-pinned, and consumed by nothing** — entrances are flat timing fades; consume it or delete it.
- The capture ring animates to 70% and stops (no completion→freeze→review choreography, rehearsable today off a mock timer).
- The press-spring block is **copy-pasted 10× with unscoped magic scales** (0.9…0.985) — extract `usePressSpring` + tokenized scales before drift compounds.
- Cold-start **font flash** + **reduce-motion race** (§3.1).

### 5.7 Small but real

The Logomark reads as an ambiguous scribble below ~40px (share-card footer, claim avatar, welcome caption) — cut a compact heavier variant. Settings is wallpapered in nine vermilion icon chips + a red Upgrade pill — when everything is accent, nothing is; move row icons to ink and let the Plan row keep the red. Light `danger #C0392B` is nearly indistinguishable from `accent #D13B27` — "Delete everything" wears the CTA's clothes; cool it or mandate an icon/outline treatment. The teal web Switch thumb (missing `activeThumbColor`) is the only color-discipline break in the suite. Methodology illustrates "we trace your lines" with a generic glyph instead of the app's own self-drawing PalmDiagram — the one page built to convince skeptics never shows the proof artifact.

---

## 6. Trust, honesty & compliance (cross-cutting)

**Fabricated-data inventory (fixture inversion risk):** a real user reaching the built screens would see *premium* fixtures presented as their own data — full almanac + 5-day streak + pending friend "Mei" (fortune), a fake chat conversation, an unearned "Your palm is unchanged" brag, "1.2M palms read" in the loader, a decorative QR captioned "scan to compare," and a share preview of Mei's reading. Nothing structurally prevents shipping these (proposal: an env-gated fixture watermark in non-prod builds).

**Compliance/store-rejection vectors:** paywall lacks ToS/Privacy links (Apple, auto-renew); account deletion + subscription management are unreachable in production (orphaned settings); the 320px paywall buries the Monthly plan; attribution stamps `display_name` on cards with no consent toggle (U6-adjacent, biometric-adjacent product); no consent-version logging on the biometric consent surface (Backend §9); the legal screen's "Template — pending legal review" banner must be release-gated.

**Deep-link hygiene:** 3 of 4 shipped push deep-links (`palmly://reading/{id}`, `palmly://compat/{pair}`, `palmly://home`) resolve to expo-router's black **"Unmatched Route"** dev page — no `+not-found` route exists; only `palmly://fortune` works. Cheap now, painful after push wiring.

**Instrumentation:** 1 of 29 typed events fires (`app_opened`). The taxonomy itself — code AND `docs/ANALYTICS.md` — contains **zero onboarding events**, so the <45s target and per-step drop-off are unmeasurable *by design*, not just by wiring. All five mvp §10 validation metrics have 0/5 client coverage; the consistency micro-survey (metric #5) has a typed event and no UI anywhere.

**Accessibility:** genuinely strong label coverage (59 sites, radiogroup roles, live-region capture announcements) — but zero Dynamic Type guards app-wide (no `maxFontSizeMultiplier`, fixed 44/52 control heights vs the 130% requirement), the four Switches are unlabeled, share-card alt text is unimplemented, and the teaser page has no alt/aria at all.

**Localization (spec §7 "from day one"):** at zero — no ICU catalogs, no i18n dependency, `expo-localization` installed and never imported, `en-US` hardcoded in `fortune.ts` and `history.ts`, all copy as TS constants, no pseudo-locale CI check. Every screen built since the redesign adds more uncatalogued strings — this is the exact "rework later" the spec warns about.

**Deploy/doc drift (verified live):** staging runs a stale `hello` function the ledger believes deleted; local `image-delete` is NOT deployed; `cron.job` is empty (HowItWorks.md still claims 5 scheduled drains); 30 migrations applied (briefing said 17); stale indigo card renders (`r16b/r16c`) sit beside the v21 finals; `global.css` references fonts the app never loads.

---

## 7. Missing features — the definitive deduped list

### Spec-mandated (not device-blocked unless tagged)

| # | Feature | Spec | Notes |
|---|---|---|---|
| M1 | `scan-create` + `scan-ingest` Edge Functions (pipeline front door) | Backend §4 | Plain HTTP; no phone needed |
| M2 | Photo-library upload path (`expo-image-picker`) | §2.2 | Also the device-free e2e door + recipient fallback |
| M3 | Analyzing wiring: scanId param → `useScanStatus` → reveal; failure states; notify-me | §2.4 | Hook already built |
| M4 | Supabase-js reads replacing every `PREVIEW_*` fixture + param plumbing | Backend §4 | reveal/history/pair/share/fortune |
| M5 | Share execution: invite-create + clipboard + OS share + pre-composed text | §2.6 | |
| M6 | User-mode card publish path (server) | §3/Backend §13 | ~30-line ownership-checked wrapper |
| M7 | Recipient door: deep-link parsing, index branch, code-entry sheet, invite persistence | §2.10 | Resolver deployed & idle |
| M8 | Returning-user redirect + settings entry on home | §2.11 | |
| M9 | Account sheet (Apple/Google/OTP, anonymous linking) | §2.9 | Wholly missing stage |
| M10 | Entitlement store (free-by-default) feeding fortune/chat/history/settings | §4.6 | RC purchase itself is H8 |
| M11 | Compat: framing picker, first-free gate, 48h nudge, Realtime pair subscription | §2.7 | |
| M12 | Compat + face + fortune share-card classes; real QR; dark variant; <450KB assertion | §3.1–3.3 | Solo-palm only today |
| M13 | Full 7-state capture contract + corrective copy + review step + denied recovery + consent logging | §2.2–2.3 | Camera feed itself device-blocked |
| M14 | Face-reading reveal content path (or gate the door) | mvp §4.2 | Currently a door painted on a wall |
| M15 | Birth-date sheet at first fortune open | §2.1/U4 | Zero "birth" code app-wide |
| M16 | Fortune share seal (third asset class) + real fortune data (seed `fortune_templates`) | §2.11 | |
| M17 | Chat send pipeline (controlled input, chip→send, optimistic bubble, SSE) | §2.11 | Embeddings leg known-blocked |
| M18 | Privacy center wiring (image-delete deploy + both buttons + persisted toggles + fortune time picker) | §2.11 | |
| M19 | Paywall: legal links, trigger context, decline record, social proof, 320 fold | §2.8 | |
| M20 | Notifications client half: expo-notifications, token→devices, the 3 sanctioned permission moments | §4 | Transport known-blocked |
| M21 | Funnel analytics: emit all 29 events + add onboarding events to taxonomy AND ANALYTICS.md | §8/mvp §5.8 | |
| M22 | Consistency micro-survey after repeat scans | mvp §10 #5 | Typed event exists, no UI |
| M23 | Deep-link route alignment + branded `+not-found` | §4 push table | |
| M24 | Second-hand offer card post-first-reading | §2.3 | |
| M25 | Localization + Dynamic Type foundations (ICU catalogs, Intl dates, `maxFontSizeMultiplier`, Switch labels, card alt text, teaser a11y) | §6–7 | |
| M26 | Haptics vocabulary + reading-stack transition + splash-hold-for-fonts | §5/v2 §4 | |
| M27 | Regenerate the 4 indigo brand rasters in vermilion | v2 §2/§7.4 | Pure asset work |

### Proposals (beyond spec — simplicity/virality serving, brand-safe)

- **P1 — Quiet rarity framing:** one data-honest line on card + reveal ("A Water hand — about 1 in 8 palms") from the deterministic hand-shape distribution; the strongest screenshot hook that fits the scholarly brand; seeds "mine is rarer" comparison and a later "who shares your hand type" surface.
- **P2 — Auto-prompt the both-sides re-share** ~2s after the pair score lands (pre-minted link, pre-composed "We scored 82 — what's yours with me?"), reduce-motion-respecting, one dismissal disables.
- **P3 — Loop re-entry from retention surfaces:** share seal on FortuneCard; trailing share on history rows and the "unchanged" brag; "Compare with a friend" row in Settings; streak stamp on the fortune card. Longer-horizon: **group compatibility** (one link, N claimants, one shared reveal — the natural group-chat unit).
- **P4 — One free chat question** before the gate (value-event trigger consistent with U2's 65%-vs-31% logic) + a fortune→chat bridge chip ("Why is Southeast lucky for me?").
- **P5 — Captured-crop loader hero:** animate the trace over the user's actual client-side palm crop during analyzing (never leaves the device; falls back to the diagram) — restores the §2.4 "working on MY hand" beat.
- **P6 — Dev-mode capture state-machine walk** (timer: searching→too-far→ready→captured→review) so the signature choreography is rehearsable and demoable before the native module lands.
- **P7 — Teaser upgrades:** inline the sender's real card image; UL-first CTA ordering; "How Palmly reads" link — recipient-side believability at the make-or-break step.
- **P8 — Pending-invite persistence** ("Mei is still waiting" re-offer on next open) via AsyncStorage.
- **P9 — Fixture watermark flag** (env-gated) so fixture-rendered screens are visibly marked in non-prod builds.
- **P10 — Launcher as A0:** whole-screen pressable, auto-advance ~1.5s after the Logomark draw — recovers the zero-tap brand moment without deleting the screen.

---

## 8. Recommendations — the prioritized work plan

> Written to be lifted into `Frontend-audit-Tasks.md`. **F0 = loop/session blockers** (the app is a diorama until these land) · **F1 = experience/trust/compliance** · **F2 = polish/identity**. Items are deliberately concrete; verify cites against the tree before editing.

### F0 — Make it a product (loop + first-session blockers)

- **F0.1 — Pipeline front door.** Build `scan-create` (quota + `scans` row + signed upload URL) and `scan-ingest` (storage webhook → `queue_send('scan_jobs')`) per Backend §4 — no phone needed. Install `expo-image-picker`; make primer's "Upload a photo instead" pick → upload → `router.push('/analyzing?scanId=…')`. This chain is simultaneously the spec's library path, the denied-permission recovery, the recipient fallback, and the only device-free way to push a real image through the live pipeline. (Coordinate with the backend loop: cron drains are still unscheduled — until then, manual worker invocation validates.)
- **F0.2 — Wire analyzing → reveal.** `analyzing.tsx` accepts `scanId`, mounts the already-built `useScanStatus` + a mount timer for staged messages, `router.replace('/reveal?scanId=…')` on complete/matched, renders the existing failure UI on failed with a full `failure_reason`→hint map; add a ~10s non-terminal re-poll + surfaced fetch errors (no silent hangs), a back/cancel affordance, and wire `onNotifyMe`. This is the single seam where the live backend meets the live UI.
- **F0.3 — Kill the fixtures.** Supabase-js RLS reads: reveal loads its `readings` row (pending/error states already built), history lists real rows and passes ids, share accepts `reading_id`/`initialVariant`, fortune reads a real row (seed `fortune_templates` with one manual idempotent `fortune-generate` run). Create `lib/entitlements` (free-by-default; RC feeds it later) and flip route defaults to the honest free experience — no fake premium, no fake streak, no "Mei".
- **F0.4 — Give share real hands.** In `ShareView`: invite toggle ON → call `invite-create` once (pre-mint on sheet open), cache URL; "Copy link" → `expo-clipboard` + "Link copied" feedback; primary Share → `Share.share({message: preComposedText + url})`. Server: add the ~30-line user-mode ownership-checked publish branch over `card-render`'s `publishCard`; make `INVITE_BASE_URL` env-switchable defaulting to the deployed functions origin (closes the loop on staging **before** palmly.app exists). Fix Android referrer consistency + add og:image width/height to the teaser.
- **F0.5 — Open the recipient door.** `claim.tsx` reads `useLocalSearchParams` (token, inviter) — `palmly://claim?token=…` works via the existing scheme today; `index.tsx` branches to `/claim` on a present/persisted token; replace the "Enter code" no-op with a one-field sheet calling the deployed `resolve_invite_code`; persist the token in AsyncStorage ("Mei is still waiting" on interrupted sessions); carry inviter context into the primer header; pre-wire `associatedDomains`/`intentFilters` (dormant until the domain).
- **F0.6 — Plumb the pair.** `pair.tsx` accepts `pair_id`, loads `compatibility_results`, subscribes to the compat broadcast channel (mirror `useScanStatus`'s fetch-then-subscribe) for the simultaneous two-sided reveal; pass `initialVariant='compat'` on "Share this match" (one line); align push deep-links with real routes (add `reading/[id]` + `compat/[pairId]` or rewrite templates) and ship a branded `+not-found`.
- **F0.7 — Returning-user session.** Persist a first-reading-complete flag; `index.tsx` Redirects to `/fortune` when set; add the settings gear to FortuneHome's (and HistoryShelf's) AppHeader right slot — one line that un-orphans the entire trust suite.
- **F0.8 — Account sheet (stage J).** Bottom sheet (Apple/Google/phone-OTP) doing Supabase anonymous-identity linking; triggered at save/history ("Keep your reading forever"), compat-accept (mandatory — "so Mei knows it's you"), fortune-open; skippable except compat-accept; "Signed in as / Claim your account" + sign-out row in Settings; fire `account_linked`.
- **F0.9 — Instrument the funnel (~20 lines).** Add onboarding events to `AnalyticsEventMap` AND `docs/ANALYTICS.md` (`onboarding_step_viewed/skipped`, `hand_selected`, `camera_primer_viewed`, `permission_result`), then emit every already-typed event at its call site (capture funnel, reveal, share/invite, `paywall_viewed{trigger}/dismissed`, fortune, pair). All five launch metrics become measurable the day the spine goes live.
- **F0.10 — Regenerate the four indigo brand rasters** (icon, android foreground, splash light/dark) from the current Logomark geometry — ink strokes + vermilion heart on the neutral field; do NOT flood the tile red. Kills the identity contradiction at the loop's install handoff.
- **F0.11 — Redraw the palm artifact family once.** Silhouette derived from geometry bounds (lines can never overshoot), credible five-digit upright hand, ≤96px silhouette-on + 2× strokes, differentiated partner geometry; same redraw for `PALM_GUIDE` + a paper-toned vignette on capture. Highest craft-leverage change in the app: hero, loader, cards, pair, thumbnails all inherit it.
- **F0.12 — Fix the shipped occlusion + the verification record.** Reveal scroll gets bottom padding (~`spacing.xxl`+56) so the SealFab never covers copy (visible in `reveal.png`/`reveal-320.png`), entrance gated on scrolling past section one; fix the screenshot harness to request `/` and `/dev` (not `/index`), re-shoot the launcher light/dark + full-page dev-theme + the six missing 320 variants; delete the stale indigo `r16b/r16c` renders.

### F1 — Experience, trust, compliance

- **F1.1 — Reveal peak completion:** per-section PalmDiagram highlight (`SECTION_LINE` exists unused); locked-tap passes its section to `/paywall` and drives the hero; replace-navigation so back never re-enters the loader; timestamp on the PrivacyBadge; named classical concept per tradition footnote; second-hand offer card; replace "1.2M palms read" with an honest line.
- **F1.2 — Paywall compliance + context:** Terms · Privacy links beside Restore (rejection-class, ~10 lines); trigger param from every entry; social-proof block (honest pre-launch phrasing) or formally amend §2.8; bottom scrim/smaller hero at 320px; local `declined_at` on close (the server win-back template already exists — give it its trigger); Settings Restore row → RC restore stub, never the sales screen.
- **F1.3 — Honest asks:** consent-version logging on "Allow camera" (Backend §9); permission-denied screen + `Linking.openSettings`; notify-me actually requests push permission + navigates home; birth-date sheet on first fortune open; thread the A3 hand answer (`/primer?hand=…` → `palm.tsx` → pipeline).
- **F1.4 — Capture contract completion (pre-device):** 7-state union + the five corrective strings + `landmarks` prop landing pad; completion→freeze→review choreography off a mock timer (dev-mode state-machine walk); Help bottom-sheet (kills the dead "?"); hide/wire face's flip control.
- **F1.5 — Trust surface wiring:** deploy `image-delete` to staging + delete stale `hello`; wire both PrivacyCenter buttons (pending → "Photos deleted ✓" / sign-out-to-launcher); persist notification toggles + keep-photo consent to their existing columns; unify the deletion promise to ONE canonical string across primer/privacy/methodology/legal/teaser ("deleted right after your reading — always within 24 hours"); fortune-time row becomes a real picker or an honest caption; split or merge the ToS/Privacy duplicate doors; release-gate the template banner.
- **F1.6 — Face reading: build or gate.** Either author the face content path (面相 fixture/sections, face hero keyed on `reading.kind`, `solo face` card class, history kind-routing) or hide FaceOfferCard + the history face chip until it exists.
- **F1.7 — Compat loop completion:** framing picker (friend/partner/crush/family) feeding narrative tone + card copy; client-side first-free gate calling the deployed `compat-request`, 2nd+ → `/paywall?trigger=compat_second`; `invite_nudge` NotifType + 48h cron scan; home nudge re-shares the SAME link with elapsed-time copy; auto-prompt the compat sheet ~2s post-score (P2 proposal).
- **F1.8 — Share-asset craft parity:** compat card class + compat og:image (two angled palms, thread joining the HEART lines, gold/`?` ring, both names); real QR or delete the block; dark story variant + sheet style toggle; <450KB assertion; fix the dead band + label collision (port the app's per-line anchors); chips ≤3 with one shared-trait + one friction chip; name at byline weight; show the real draft PNG in the sheet (preview == posted); "Show my name on the card" consent toggle; branded market-ordered channel row with per-channel pre-composed text.
- **F1.9 — Notifications client half:** `expo-notifications` + token → `devices` upsert with tz; the three sanctioned permission moments (75s overrun, fortune opt-in, first compat send); OS-permission status row in settings.
- **F1.10 — Retention surface completion:** chat controlled input + chip→send + optimistic bubble + SSE (one free question — P4); fortune share seal (third card class); lunar-date whisper; consistency micro-survey after a repeat scan resolves matched; `showUnchanged` driven by a real signal.
- **F1.11 — Motion/feel foundation:** `expo-haptics` + `lib/haptics` (tick/select/stamp/success) wired into Button/Card pressIn + the pair-score landing; reading-stack slide transition (copy onboarding's 3 lines); splash-hold on `useFontsReady`; hold mount animations until the reduce-motion pref resolves.
- **F1.12 — Teaser conversion upgrades** (P7): inline sender's card, UL-first CTA ordering, methodology link.

### F2 — Polish & identity

- **F2.1 — The heritage layer** (§5.4's five seal/almanac touches).
- **F2.2 — Dead-zone fills with composition** (§5.5 per-screen prescriptions).
- **F2.3 — Methodology demonstrates:** 180px self-drawing PalmDiagram at step 2.
- **F2.4 — Small-size Logomark variant** (<40px swap-in); launcher auto-advance (P10).
- **F2.5 — Accent scarcity in settings** (ink row icons, red only on Plan) + cool light danger or icon-treat destructive; fix the teal web Switch thumb (`activeThumbColor`).
- **F2.6 — Localization + Dynamic Type foundations** (M25): ICU catalogs starting with capture-guidance strings; Intl dates via the installed-but-unused `expo-localization`; pseudo-locale CI check; default `maxFontSizeMultiplier` ~1.3 + `minHeight` buttons; Switch labels; card alt text; teaser alt/aria.
- **F2.7 — Motion hygiene:** extract `usePressSpring` + tokenized scales (10 call sites); consume `motion.spring.entrance` or delete it + its test; delete dead `global.css` font vars.
- **F2.8 — Rarity framing (P1) + loop re-entry rows (P3) + fixture watermark (P9).**

---

## 9. Verification record & drift appendix

- **The launcher has zero visual evidence:** `index.png`/`index-dark.png` (and `dev-index.png`) are expo-router "Unmatched Route" 404 captures — the harness requested `/index` instead of `/`. The "every screen web-screenshot-verified" claim is false for exactly the screen that opens every session. `dev-theme.png` truncates before the Logomark/PalmDiagram/pressable sections (the primitives this round added are ungated). The 320px set skips analyzing, palm, face, privacy, notifications, legal.
- **Deploy drift (live-verified):** staging runs stale `hello` (verify_jwt=false) that commit B20 deleted locally; local `image-delete` is NOT deployed. Two-way staging↔git function drift — worth a housekeeping pass.
- **Doc drift:** `HowItWorks.md` still claims 5 scheduled drain crons; live `cron.job` is empty (migration 0019 unscheduled the stubs; real drains never scheduled; `pg_net` not installed). 30 migrations applied, not the 17 older docs cite.
- **Live staging state relevant to the frontend:** profiles 106 (anonymous auth genuinely live — the app's one working integration), `kb_chunks` 141 with 0 embeddings, `fortune_templates`/`scans`/`readings`/`invites`/`devices` all 0 rows. `card-render` fonts ARE bundled (Noto Sans/Serif + SC + resvg wasm) — the older "fonts owed" note is stale.
- **Contradictions resolved during audit:** win-back copy EXISTS server-side (all 9 NotifTypes incl. `solar_term`, `winback`, `onboarding_d1–3`; only triggers are missing — earlier reports understated this). Paywall close-X shows immediately vs spec's "after 1s" — keep the code, amend the spec. Tap counts: 5 full / 3 via Skip — both correct. `palmly://home` also matches no route (worse than first reported).
- **Honest device-pending list (do not mark done from web evidence):** all live reanimated motion (draw-ons, springs, ring sweep, thread draw, count-up, stagger, transitions), haptics, camera feed + landmark state machine, native OS share sheet, RevenueCat purchase/restore, push delivery, SSE chat streaming.

## 10. Known-blocked human tasks touching this audit

| Blocker | Gates | Does NOT gate (common misattribution) |
|---|---|---|
| Physical Android phone (H1+) | Camera feed, MediaPipe, auto-capture from real landmarks, on-device motion/haptic verify | The 7-state contract, corrective copy, review step, mock state-machine, image-picker path, ALL wiring in F0 |
| RevenueCat (H8) | Purchase/restore execution, entitlement webhook feed | The entitlement store, free-by-default rendering, paywall context/legal links, decline record |
| Paid Gemini (H4c) | Real palm-line geometry extraction | The reveal/share wiring (text pipeline is live), diagram redraw, per-section highlight |
| Domain `palmly.app` + Turnstile (H6) | Universal links, real invite URLs in production, captcha | Scheme deep links, code-entry sheet, env-switchable base URL, staging-origin loop closure |
| Store accounts (H7) | Real store URLs on the teaser CTA | UL-first ordering logic |
| Push transport + cron security pass | Delivery of any notification; queue auto-drain | Token registration code, permission moments, deep-link route alignment, `+not-found` |

---

*End of audit. Companion: `Planning/Audits/Audit-1-Backend/Backend-audit.md` (backend surface). Next step when ready: derive `Frontend-audit-Tasks.md` from §8's F0–F2 items as a checkbox ledger and point the loop prompt at it.*
