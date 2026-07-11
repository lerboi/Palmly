# Palm & Face Reading App — MVP Product & Technical Specification

**Status:** Pre-build planning document
**Purpose:** This document is a complete brief for building an MVP mobile app. It should give any developer, designer, or AI assistant enough context to understand the product, why it's shaped this way, and how to build it — without needing prior conversation history.

---

## 1. Vision

An AI-powered mobile app that reads a user's **palm** and **face** from phone-camera photos, using **Chinese/Asian metaphysical traditions** (手相 palmistry, 面相 physiognomy) as the primary framework — not Western astrology with Asian elements bolted on, which is how most existing competitors approach it.

The product is built around two things happening at once:
1. A genuinely good, photo-based reading experience (the "core function").
2. A deliberate, designed-in **social sharing / compatibility loop** that makes the app spread organically among friend groups — this is treated as a core product feature, not a marketing afterthought.

**What this is not:** a clone of Western astrology/wellness apps (e.g. Moonly), and not an "everything app" cramming in tarot, runes, aromatherapy, etc. on day one. Scope discipline is a deliberate design choice — see Section 8.

---

## 2. Target Audience & Distribution

- **Primary audience:** Southeast Asian users, the broader Chinese/Asian diaspora, and English-speaking global users with an existing appetite for "Asian mysticism" content (this appetite is real and already proven — see Section 3).
- **Do NOT restrict distribution to Southeast Asia only.** There is no technical or cost reason to exclude Western markets, and Western wellness-app subscribers generally have higher willingness-to-pay. Ship in English first; localize into Bahasa Indonesia, Thai, Vietnamese, Tagalog, Malay etc. in a later phase based on real usage data, not assumptions.
- **Distribution channel:** Standard global Apple App Store + Google Play listings.
- **Explicitly out of scope for MVP: formal Mainland China publishing.** China requires an MIIT ICP/Mobile App Filing tied to a China-registered business entity, and Chinese advertising law explicitly bans promoting/advertising fortune-telling, divination, and feng shui products. Pursuing formal China distribution is a possible *future* phase (with a local publishing partner and legal review), not part of MVP scope. Organic content on Xiaohongshu is still a valid marketing channel even without formal China app distribution — see Section 6.

---

## 3. Competitive Landscape (context, not exhaustive)

Existing players prove the category has real demand, but none are built ground-up around Chinese/Asian tradition as the primary lens:

- **AstroGuru** — 20M+ installs; palmistry + astrology + tarot + daily horoscope bundle; palm feature does basic 3-line scanning.
- **Life Palmistry** — 5M+ downloads; palm/face/finger analysis plus novelty features (future-baby predictor, gender-swap filter).
- **Palmist** — 1.2M+ users; AI palm reader, biorhythms, "find compatible people" matching, life-event predictions.
- **AI Palm Reader (Jenova)** — newer entrant already doing multi-tradition (Western/Vedic/Chinese) synthesis with bilateral hand comparison and couple compatibility — the closest existing analogue to this product's differentiation angle.
- **Moonly** — Western astrology/wellness app (tarot, runes, moon phases, manifestation); not a palm-reading competitor directly, but the reference point for what NOT to repeat on paywall/UX (see Section 4.6 and 7).

**The actual gap:** most competitors do shallow "3-4 line pattern matching + templated paragraph" analysis, and treat Chinese/Vedic traditions as a secondary feature rather than the core framework. Differentiation comes from depth, authenticity to the tradition, and UX polish — not from "AI reads your palm" being novel, because it no longer is.

---

## 4. Core MVP Feature Set

Keep this list tight. Every feature below earns its place; do not add features outside this list without deliberately re-scoping.

### 4.1 Palm Reading (hero feature)
- Guided camera capture flow for the palm (dominant hand required, non-dominant hand optional/recommended for a fuller reading).
- On-device hand landmark detection drives real-time capture guidance (flatten hand, move closer/further, lighting check, auto-capture when positioned correctly).
- Backend pipeline detects/traces the major lines (heart, head, life, fate) and, where feasible, mounts and notable markings.
- AI-generated narrative reading grounded in Chinese palmistry (手相) as the primary interpretive framework.
- Reading must be **consistent across repeat scans of the same hand** — this is a trust requirement, not a nice-to-have (see Section 5.3).

### 4.2 Face Reading (secondary hero feature)
- Guided camera capture for a front-facing face photo.
- On-device face landmark detection for capture guidance and proportion measurement.
- AI-generated narrative reading grounded in Chinese physiognomy (面相) — face shape, proportions (e.g. "three courts, five eyes" framework), feature analysis.
- Face reading is technically the easier of the two features to get right (face landmark detection is more mature than palm-line detection) — consider building/polishing this first if sequencing engineering effort.

### 4.3 Lightweight Accounts
- Account creation is **never required to get the first reading.** Users get their palm/face reading fully, free, with zero signup friction.
- Prompt account creation only when the user wants to: save a result, unlock the daily fortune layer, or start a compatibility comparison with someone else.
- Auth: phone number or social login (Apple/Google) — minimal fields, fast.

### 4.4 Compatibility & Sharing Loop (the growth engine — see Section 6 for full strategy)
- Every reading produces a **branded, screenshot-optimized result card** (this is a first-class design deliverable, not a byproduct).
- "Compare with a friend" flow: user generates a shareable link; recipient can preview the sender's result and take their own reading; a compatibility score/narrative is generated by comparing both people's palm/face data.
- Recipient experience must be near-frictionless: a lightweight mobile-web preview of the compatibility teaser before any app-install requirement, and if they do install, a **deferred deep link** must carry them straight into the relevant compatibility context (not a generic app store landing page).
- Share targets should match actual regional usage (WhatsApp, Line, WeChat, Zalo — not just iMessage/SMS defaults).

### 4.5 Recurring Content Layer (retention — solves the "one-and-done" churn problem)
This is the layer that keeps subscribers past month one, since a static palm/face reading alone gives no reason to return.
- **Daily/weekly fortune calendar**, modeled on the traditional Chinese almanac (老黄历) concept — auspicious/inauspicious activities, lucky directions, good/bad days for decisions, ideally tied to a simplified day-pillar (BaZi-lite) calculation. This changes every day, unlike the static reading, and is the primary daily-open driver.
- **Progressive depth unlock**: initial reading covers the major lines/basic proportions; deeper content (mounts, minor lines, rare markings, cross-tradition notes) unlocks over subsequent sessions/weeks rather than all at once.
- **Ongoing AI chat** grounded in the user's own reading — lets them ask follow-up questions ("what does this mean for my career this month") rather than treating the reading as a single static report.
- Notifications tied to real calendar/astrological events (not generic re-engagement spam).

### 4.6 Monetization
- **Free tier:** the complete core palm + face reading, unrestricted. Do not paywall the "wow" moment — Moonly's reviews show this specific mistake (users who couldn't preview enough to know what they'd be paying for called it borderline false advertising) and it should not be repeated.
- **Paid subscription unlocks:** the daily fortune calendar, unlimited friend compatibility checks, deep-dive line/mount analysis, ongoing chat, and saved reading history.
- Model: monthly + annual subscription (annual with a trial period converts better per industry paywall data), managed via RevenueCat or Adapty (see Section 5.6).

---

## 5. Technical Architecture

### 5.1 Mobile App Framework
**Recommendation: React Native (with Expo/EAS Build), using `react-native-vision-camera` for camera + frame-processor work.**

Reasoning:
- Vision Camera's frame processors run native code directly per camera frame, making React Native currently the strongest cross-platform option for real-time image AI work (hand/face landmark overlay during guided capture).
- Most of this app's actual "intelligence" is cloud-API-driven (LLM vision calls), which is React Native's stated strength; on-device ML here is limited to landmark detection for capture UX, not heavy continuous inference.
- Larger JS/React hiring pool and Expo's managed tooling (EAS Build, OTA updates) speed up MVP iteration.

**Valid alternative: Flutter.** Slightly stronger for heavy on-device ML (first-party MediaPipe/TensorFlow Lite integration) and produces pixel-perfect, identical UI across iOS/Android, which matters for a highly-designed, brand-driven app. If the build team is more Flutter-native or wants tighter on-device performance, this is a legitimate alternative — document the choice, don't run both.

### 5.2 Guided Capture (On-Device ML)
- **MediaPipe Hand Landmarker** (21 3D hand keypoints, real-time, on-device, free/open-source) for palm capture guidance: live outline overlay, "flatten your hand" / "move closer" / "better lighting" prompts, auto-capture when well-positioned.
- **MediaPipe Face Landmarker** (face mesh) for the equivalent face-capture guidance flow.
- This solves the biggest UX complaint found in competitor reviews (users finding it "confusing and time-consuming" to line up their palm correctly) — treat this capture flow as a genuine differentiator, not boilerplate.

### 5.3 Palm/Face Line Detection & Interpretation Pipeline
Palm-line detection specifically is a real, only-partially-solved computer vision problem (active academic research area, not an off-the-shelf solved library like hand landmarks are). Build in this order:

1. **Normalize the input:** use hand landmarks to crop/warp the palm into a standard orientation, then apply contrast enhancement to make faint creases more visible.
2. **MVP path (fast to build):** send the normalized photo to a vision-capable LLM (Claude with vision) with a detailed palmistry/physiognomy reference prompt, and have it both describe detected features and generate the narrative in one pass.
3. **Consistency fix (important, do this before/soon after MVP launch):** don't rely purely on step 2 for repeat-scan consistency — a vision-LLM asked to freely describe an image can give different answers on repeat calls. Add a lightweight deterministic pass (classical edge detection / a small trained segmentation model) that extracts concrete line geometry *first*, store that structured data, and feed it to the LLM as grounding for the narrative. This way, the same photo of the same hand reliably produces the same detected lines and a consistent (though not necessarily word-for-word identical) narrative.
4. **Longer-term path:** train a proper segmentation model on a labeled palm-line dataset (would require sourcing/labeling data, ideally with input from a palmistry practitioner) for real detection-quality differentiation versus competitors who still do basic 3-4-line template matching.
5. **"Accuracy" framing:** there is no ground-truth for whether a palmistry interpretation is "true" — treat accuracy as (a) reliable hand/face detection, which is a solved problem, and (b) consistent, well-grounded line detection, which is achievable to an entertainment-app standard, not (c) scientific predictive validity, which isn't a coherent goal for this content category.

### 5.4 AI / LLM Layer
- **Anthropic Claude (vision-capable)** for narrative generation, grounded in the structured feature/line data from Section 5.3 plus a curated palmistry/physiognomy knowledge base.
- Consider a retrieval-augmented setup (vector search over a curated reference corpus of palmistry/physiognomy meanings) so narratives stay internally consistent and personalized rather than generic — this pairs naturally with Supabase's pgvector extension (Section 5.5).

### 5.5 Backend
**Recommendation: Supabase** (PostgreSQL + Auth + Storage + Edge Functions + pgvector).

Reasoning:
- The core data model here is relational (users, readings, friend/compatibility relationships, subscription status) — Postgres joins are a natural fit.
- pgvector supports the RAG/knowledge-grounding approach in 5.4 without needing a separate vector database.
- Predictable, compute-based pricing. This matters specifically here: Firebase's per-operation billing model is known to spike unexpectedly under viral growth — a real risk for a product explicitly designed for viral spread.

**Alternative: Firebase** — stronger mobile SDK maturity (push notifications, offline sync, crash reporting all bundled), reasonable if the team is already Google-ecosystem-native, but weigh the billing-spike risk against that convenience given this app's growth model.

### 5.6 Subscription / Paywall Management
- **RevenueCat** (or Adapty) to handle cross-platform (iOS + Android) subscription logic, entitlements, and paywall A/B testing from one API/SDK, rather than building App Store/Play Store billing integration from scratch.

### 5.7 Growth Loop Infrastructure
- **Deferred deep linking is a non-negotiable technical requirement**, not an optional nice-to-have — without it, a friend who clicks a shared compatibility link and doesn't already have the app will land on a generic store page and lose all context, killing the loop's conversion rate. Use **Branch** (or AppsFlyer) for this.
- Server-side (or edge-function-based) image generation for the branded shareable result cards, so they render consistently regardless of device.

### 5.8 Analytics
- Mixpanel, Amplitude, or PostHog for funnel tracking, viral coefficient (K-factor) measurement, and retention cohort analysis (D1/D7/D30). This is required from day one, not added later — you cannot validate this product's core growth hypothesis without it.

### 5.9 Push Notifications
- Firebase Cloud Messaging (FCM) is the standard choice regardless of backend decision, used for the daily-fortune-calendar re-engagement notifications described in Section 4.5.

---

## 6. Growth & Virality Strategy

### 6.1 Primary acquisition channel: organic content, not paid ads
The target content category (Chinese/Asian metaphysics — Xuanxue) is currently a genuinely viral, organically-spreading topic on Xiaohongshu and TikTok. Growth strategy should lean on:
- Shareable, creator-friendly content format (the reading itself is inherently "show and tell" content).
- Native creator/organic posting rather than traditional paid app-install ad campaigns — this is partly a strategic choice (organic content matches how this trend already spreads) and partly a legal one (Chinese advertising law bans promoting fortune-telling/divination/feng shui services, so paid ads for this content category inside China specifically are legally restricted regardless).

### 6.2 In-app viral loop (the "self-marketing loop")
- Mechanism type: **status virality / distribution virality** — the product output (a personalized, visually distinctive reading result) is inherently something people want to show off, the same mechanic behind Spotify Wrapped or Wordle's shareable grid.
- Loop: user gets reading → shares branded result card and/or a "compare with me" invite link → friend previews with near-zero friction → friend takes their own reading → friend shares their own result → repeat.
- Track viral coefficient (K-factor = invites sent per user × conversion rate of those invites). Treat any K-factor meaningfully above 0 as valuable (it reduces paid CAC even if it doesn't produce standalone exponential growth) — do not expect or require K > 1 for this to be worth investing in.
- **Important distinction:** the sharing loop is primarily an **acquisition** mechanism (new users, lower CAC), not a **retention** mechanism. Monthly subscriber retention depends on Section 4.5's recurring content layer, not on the invite loop by itself — both are required, they solve different problems.

### 6.3 Design rules for the loop to actually work
1. Never gate the core reading behind signup (kills top-of-funnel completion).
2. The result card must pass the "screenshot test" — look good, be legible, and carry subtle branding, without requiring a click to understand.
3. Reduce every step between "I got a cool result" and "I shared it" to as close to one tap as possible; pre-populate share text.
4. The invited friend's landing experience must preserve context (deferred deep linking, Section 5.7) — a generic app store page kills conversion.
5. Match sharing channels to the actual apps the target audience uses to message people (WhatsApp/Line/WeChat/Zalo, not just default OS share sheets assuming iMessage/SMS).

---

## 7. UX/UI Principles

These are treated as first-class requirements, not polish applied at the end:

- **Zero friction to the first "wow" moment.** No signup wall, no unnecessary steps, before a user sees their reading.
- **Capture flow must feel effortless**, not fiddly — borrow interaction patterns from ID-scanning or mobile check-deposit apps (live guidance overlay, auto-capture, clear real-time feedback), since a clunky capture flow was a specific, named weakness in existing competitor apps.
- **Distinctive, authentic visual identity** rooted in the actual tradition being drawn from (ink-wash textures, red/gold palette, real line-diagram illustrations) — not generic stock "mystical" clip art, which was a specific, named weakness in Moonly's reviews.
- **Consistency builds trust.** The same hand or face photographed twice should produce a recognizably consistent reading — inconsistency here damages credibility faster than in astrology apps, because a palm is a fixed physical fact, not something with a legitimate excuse to change.
- **The result/share card is a core design deliverable**, treated with the same design rigor as the main app screens — it is simultaneously a feature and the app's primary marketing asset.

---

## 8. Content Scope Discipline

**In scope for MVP:**
- Chinese palmistry (手相) — palm lines, hand shape, mounts.
- Chinese face reading / physiognomy (面相) — face shape, proportions, features.

**Explicitly deferred to post-MVP** (do not build in v1, resist scope creep):
- BaZi (八字) / Four Pillars full readings.
- Zi Wei Dou Shu (紫微斗数).
- Feng shui (including photo-based room/desk scanning).
- I Ching (易经) divination.
- Any unrelated wellness content (meditation, aromatherapy, general affirmations) — Moonly's reviews specifically flagged this kind of content bloat as diluting the product; do not repeat it.

The daily fortune calendar in Section 4.5 is the one exception allowed to draw lightly on simplified BaZi/almanac logic, since it's the core retention mechanic — but it should stay lightweight, not become a full BaZi reading module in v1.

---

## 9. Known Risks & Open Questions

- **Palm-line detection is a genuinely unsolved-to-perfection CV problem.** Budget real engineering time for the hybrid detection approach in Section 5.3; do not assume a plug-and-play library gets you production-quality line tracing.
- **Biometric-adjacent data handling.** Palm and face photos should not be persisted longer than necessary, with clear user consent and a documented deletion policy — several competitors explicitly market "we don't permanently store your image" as a trust feature; consider matching that.
- **App store compliance on claims.** Avoid any language that reads as health/medical claims (traditional palmistry sometimes claims to reveal health issues) — this risks review rejection independent of the mysticism content itself.
- **Category crowding.** "AI palm reading" is not blue ocean (see Section 3) — differentiation must be real (depth, authenticity, capture UX, consistency) and should be validated early, not assumed.
- **Viral loop is not guaranteed to hit a high K-factor.** Plan a diversified acquisition strategy (organic content + the in-app loop together) rather than treating the loop as a sole growth channel.

---

## 10. What the MVP Needs to Validate

Before investing beyond MVP, the build should produce clear signal on:
1. **Completion rate** of the capture-to-reading flow (is the UX actually smooth, per Section 7?).
2. **Viral coefficient (K-factor)** of the share/compatibility loop.
3. **D1/D7/D30 retention**, specifically whether the daily fortune calendar (Section 4.5) actually pulls users back day-over-day.
4. **Free-to-paid conversion rate**, and whether the generous free tier (Section 4.6) is converting well enough or needs adjustment.
5. **Consistency perception** — informal user feedback on whether repeat scans feel trustworthy/consistent.

---

*End of specification.*
