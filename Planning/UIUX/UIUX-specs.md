# Palmly — UI/UX Specification

**Status:** Planning — v1.0 (July 2026)
**Companion doc:** `Planning/Backend-specs.md` (pipeline timings, entitlements, invite mechanics referenced throughout)
**Ground truth:** `Planning/mvp_spec.md`

Every screen and interaction below is evaluated against the two product priorities:

1. **P1 — Trustworthy reading experience:** effortless capture, fast reveal, consistent repeat readings.
2. **P2 — The virality loop:** minimize steps between "I got a cool result" and "my friend is looking at their own palm."

---

## ⚠️ 0. Flagged assumptions & product decisions embedded in this doc

| # | Topic | Assumption / recommendation |
|---|---|---|
| **U1** | **Onboarding length** | 3 intent screens max, skippable. Research: 3-step flows complete at ~72% vs ~16% at 7 steps ([Chameleon benchmark](https://www.businessofapps.com/data/app-onboarding-rates/)); 80%+ of subscriptions happen within two minutes of download ([RevenueCat](https://www.revenuecat.com/state-of-subscription-apps/)). The palm capture itself is our "investment quiz" — we don't need 20 questions before value. |
| **U2** | **Paywall structure** | Contextual paywall **after** the free reading (the value event), multi-page (2–3 screens). Value-event-triggered paywalls show 65% trial-start vs 31% for immediate hard paywalls and 3.3× revenue/install ([Adapty 2026 via RocketShip](https://www.rocketshiphq.com/adapty-subscription-app-benchmark-2025-summary/)); multi-page onboarding paywalls convert 37% better than single-page ([Superwall, 40M opens](https://superwall.com/blog/new-postmulti-page-onboarding-paywalls-convert-37-better-than-single-page-heres-why)). |
| **U3** | **Plan mix** — ✅ **DECIDED (2026-07-11): monthly + annual, NO trial at launch** | Spec said monthly + annual-with-trial; category data shows **trials reduce LTV −21.2% in the Lifestyle category** ([Adapty benchmarks](https://adapty.io/blog/lifestyle-app-subscription-benchmarks/)), and you chose the no-trial-annual launch configuration on that basis. Weekly-tier and trial variants remain available as remote A/B experiments via RevenueCat Paywalls v2 (weekly drives 55.6% of category revenue — worth testing once baseline data exists, but it carries churn/refund-reputation risk per Hint's Trustpilot pattern). |
| **U4** | **Free vs paid fortune split** | Spec paywalls the daily fortune entirely. Assumption: free users see today's *one-line* fortune (retention hook + paywall bait); the full almanac (宜/忌 lists, directions, hours, love/career/wealth) is premium. A fully-invisible paid feature can't drive the daily-open habit that makes people subscribe to it. |
| **U5** | **Which hand** | Tradition varies (男左女右 "left for men, right for women" vs modern dominant-hand practice). Default: **dominant hand primary**, optional second hand, with a one-line cultural note in the reading ("Traditional readers also weigh your left/right hand as innate vs cultivated") — sidesteps gender assumptions and matches the spec's dominant-hand requirement. |
| **U6** | **Compatibility identity** | Recipient's name appears on the shared pair card only after both consent (implicit via "Share our result" tap). Score + first names only — no photos of either person ever appear on share assets. |

---

## 1. Visual identity — "Ink & Cinnabar" (水墨 × 朱砂)

### 1.1 Direction

Rooted in the actual visual language of Chinese metaphysics practice — ink-wash painting (水墨), woodblock diagram engraving, cinnabar seal stamps (印章), almanac typography (老黄历), and the red thread of fate (姻缘红线) — **not** the purple-nebula/tarot-sparkle aesthetic of Western astrology apps (the exact weakness the spec names in Moonly).

**Feel words:** considered, warm, literate, quietly premium — a scholar's studio, not a fortune-teller's tent.

### 1.2 Design tokens

| Token | Value | Use |
|---|---|---|
| `paper` | `#F7F2E7` (rice paper) | Default light background; subtle paper-grain texture at ≤4% opacity |
| `ink` | `#1E1B16` (warm ink black) | Primary text, line diagrams; dark-mode background |
| `ink-wash` | `#5A544A` | Secondary text, hairline rules |
| `cinnabar` | `#C3272B` | Primary accent: CTAs, seal stamps, the red thread, active states |
| `gold` | `#B8912F` (muted imperial gold) | Premium/locked markers, score rings, celebratory moments — used sparingly |
| `jade` | `#3F7A5E` | Success/verified states only |
| Dark mode | `ink` bg / `paper` text, cinnabar + gold unchanged | Night reading is a core use case |

- **Contrast note (a11y §9):** cinnabar on paper passes AA for large text/UI only — body text is always `ink`; cinnabar is never used for text under 18pt.
- **Typography:** Display — **Noto Serif Display** (high-contrast serif; ships day-one Thai/Vietnamese-ready glyph coverage across the Noto family, which is the localization insurance policy). Body — **Noto Sans** (or system stack). Accent chinese characters (section markers like 心 · 智 · 命 · 运) — **Noto Serif TC**, always decorative-plus-translated, never load-bearing alone. Numerals on score rings use the display serif for warmth.
- **Iconography/illustration:** single-weight engraved line style (1.5px @1x), like woodblock diagrams. The hero illustration system is the **user's own palm rendered as a line diagram** — traced from their actual `line_geometry` (Backend §6.2) — ink lines on paper with cinnabar highlights on the line being discussed. This is simultaneously the trust artifact ("these are *my* lines"), the privacy story (diagram, never photo), and the share asset (§6).
- **The seal:** app icon and brand mark is a square cinnabar seal (印) containing a stylized palm with three lines. Every share card is "stamped" with it — small, corner-placed, like an artist's chop. Subtle branding that reads as craft, not watermark (spec §6.3: branding without needing a click to understand).
- **Do / Don't:** ✅ paper texture, engraved lines, seal stamps, red thread, almanac tables, generous whitespace. ❌ purple/teal gradients, sparkles/star-fields, neon glow, stock "mystical woman silhouette," emoji-heavy UI, 3D crystal balls, generic sans-serif tech minimalism.

---

## 2. Complete screen flow

Map of the journey (screens specified in §§2.1–2.10):

```
First open ▸ A. Welcome & intent (3 screens, skippable)
          ▸ B. Camera primer → system permission
          ▸ C. Guided palm capture (auto-capture)
          ▸ D. Analyzing (staged loader)
          ▸ E. Reading reveal  ──▸ F. Share prompt          (P2 exit №1)
                               ──▸ G. Face reading offer (loop C–E)
                               ──▸ H. Compatibility invite   (P2 exit №2)
                               ──▸ I. Paywall (multi-page, contextual)
                               ──▸ J. Account creation (only at save/compat/fortune)
Returning ▸ K. Daily fortune home ▸ chat ▸ history ▸ settings
Recipient ▸ L. Teaser page → install → deferred landing → C–E → pair reveal
```

### 2.1 A — First open (target: <45 seconds to camera)

- **A0 Brand moment (≤1.5s):** cinnabar seal stamps onto paper with a soft haptic; ink wash spreads. Skippable by tap. Sets craft tone instantly.
- **A1 "Your palm remembers"** — one-line value prop over an engraved palm diagram with the four major lines labeled (心 heart / 智 head / 命 life / 运 fate, translated). Copy: *"Three thousand years of Chinese palmistry, read from a single photo."*
- **A2 "How it works"** — three inline steps (scan → we trace your lines → your reading), each icon animating once. Includes the trust line: *"Your photo is analyzed, then deleted. What stays is your reading."* (D2 policy, stated before we ever ask for the camera.)
- **A3 Hand selection** — "Which hand do you write with?" (U5) — the only "quiz" question, and it doubles as pipeline input. CTA: **"Read my palm."**
- No signup, no name, no birth date, no notification prompt anywhere in A (spec §7: zero friction to wow). Birth date is asked later, only when the user opens daily fortune (where it's needed for the day-pillar).
- **P2 note:** if the app was opened via an invite deep link, flow A is replaced by the recipient variant (§2.10) — context banner first, framing second.

### 2.2 B — Camera primer & permission

Shown at the moment of intent (user just tapped "Read my palm"), never at launch — contextual permission requests show up to 28% higher grant rates, and primer screens raise opt-in 20–40 points vs cold prompts ([NN/g](https://www.nngroup.com/articles/permission-requests/), [priming data](https://www.dogtownmedia.com/the-ask-when-and-how-to-request-mobile-app-permissions-camera-location-contacts/)).

- Full-screen sheet: engraved camera + palm illustration. Header: *"Palmly needs your camera to see your palm."* Three reassurance rows: 📷 *analyzed on the spot* · 🗑 *photo deleted after reading* (D2) · 🚫 *never shared, never used to identify you*.
- Primary CTA "Allow camera" → triggers the **system** prompt. Secondary: "Upload a photo instead" (photo-library path — also the recovery path for users who previously denied; camera-denied state deep-links to Settings with instructions).
- This screen doubles as the biometric-consent surface (Backend §9): the reassurance rows are the consent text, versioned and logged on acceptance.

### 2.3 C — Guided palm capture (P1's signature moment)

Interaction model borrowed from check-deposit/ID-scan apps per spec §7, driven by the on-device MediaPipe landmarks (Backend §2.2):

- **Layout:** full-bleed camera. A paper-toned vignette frames a palm-shaped guide region. Top: single instruction line (large, high-contrast pill). Bottom: hand-side toggle (pre-set from A3), manual shutter (fallback), help.
- **Live overlay:** as soon as a hand is detected, its 21 landmarks render as a faint engraved skeleton with fingertip nodes — the "we can see you" signal. The guide region's stroke transitions ink → gold as conditions approach capture-ready.
- **Guidance state machine** (one instruction at a time, never stacked):

| State | Trigger (landmark/exposure signal) | Instruction | Overlay |
|---|---|---|---|
| searching | no hand | "Hold your **right** palm up to the camera" | pulsing guide |
| too far / too close | bounding box < 55% / > 90% of guide | "Move closer" / "A little further" | guide scales hint |
| not flat | fingertip z-spread / splay ratio off | "Flatten your hand, fingers relaxed" | fingertip nodes blink |
| tilted | palm-normal angle > 12° | "Face your palm to the camera" | 3D tilt ghost |
| dark / glare | exposure histogram | "Find a little more light" | vignette dims |
| **ready** | all tolerances met | "Hold still…" | ring fills 800ms → **auto-capture** |

- **Auto-capture:** ring completes → shutter + double haptic + freeze-frame. The tolerances that gate capture are the same tolerances that make repeat scans consistent (Backend §6.6.1) — UX polish and reading consistency are the same mechanism.
- **Review (2s, auto-advancing):** frozen crop with traced guide overlay, "Looks sharp" ✓ / "Retake". Auto-advances if quality score is high; only blocks on borderline captures.
- **Accessibility:** every state-machine instruction is simultaneously announced via VoiceOver/TalkBack (spoken guidance makes the flow genuinely usable non-visually — and it's the same string, no extra content cost). Haptic vocabulary: light tick on state change, double tap on capture.
- Optional second hand: after the first reading (not before — never delay the wow), a card offers "Add your left hand for a fuller reading."

### 2.4 D — Analyzing (the anticipation builder)

Pipeline p50 is ~15–25s (Backend §6.1) — enough to need staging, short enough to hold attention.

- **Their own palm** (the captured crop, client-side, before deletion ever matters) with lines being traced in cinnabar ink as stages progress — the loader literally shows the product working on *their* hand:
  1. "Tracing your heart line…" (heart line polyline draws)
  2. "Reading your head line…"
  3. "Following your life line…"
  4. "Consulting the classics…" (KB stage; seal stamps appear)
- One rotating social-proof line below (*"1.2M palms read"* — real number once real). "Personalized plan loader" screens of this shape are the standard high-converting astrology-funnel pattern ([Adapty](https://adapty.io/blog/high-performing-paywall-2026/)).
- **Overrun handling:** at 45s, message softens ("Taking a little longer — your lines are worth it"); at 75s, offer *"We'll notify you the moment it's ready"* → requests notification permission **with this concrete justification** (best possible priming context) and frees the user. Push deep-links back to the reveal.
- Failure state: specific, warm, one-tap retry ("We couldn't see your lines clearly — let's try with a bit more light"). Never a generic error. Capture-quality hints come from the pipeline's failure_reason.

### 2.5 E — Reading reveal (the wow)

- **Hero:** ink-diagram of their palm (from `line_geometry` — the photo is already dispensable) draws itself in 1.2s; headline trait rises beneath: e.g. *"A Water hand — feeling runs deep in you."* One-line shareable essence.
- **Body:** vertical scroll of section cards — Heart 心 · Head 智 · Life 命 · Fate 运 · Hand shape · Mounts. Each card: the diagram re-renders with that line highlighted in cinnabar, 2–3 paragraph narrative, small "what this means in the tradition" footnote (authenticity signal — cite the concept, e.g. 三才纹).
- **Locked depth (premium):** below the free sections, real section titles visible under gold seal locks — *"Minor lines: your 婚姻线 marriage lines," "Rare markings," "Cross-tradition notes"*. Tapping → paywall (§2.8) with that section as the hero. Locked-but-visible depth converts the curiosity the free reading generates (U2 research).
- **Persistent share affordance:** floating cinnabar "Share" seal, appears after the first section is read (not instantly — let value land first). Also a full-width **"Compare with a friend"** card after section two — the compatibility hook placed *inside* the reading, not buried in a menu (P2).
- **Trust affordances:** footer row — *"Same palm, same reading. Rescan anytime — your lines don't lie."* (surfacing Backend §6.6.4's consistency guarantee as a brag) + *"Photo deleted ✓"* stamp with timestamp + "How Palmly reads" link (methodology page: landmarks → traced lines → classical interpretation; transparency as differentiation).
- Face reading offer appears as a card at scroll end ("Your face tells the other half — 面相"), running the same B→E loop with face capture (oval guide, yaw/pitch prompts from Euler angles, blink-to-capture optional).

### 2.6 F — Share prompt & share sheet (P2 exit №1)

- Triggered contextually: after scroll-through, after face reading completes, after compatibility reveal — never as a modal interrupt mid-reading.
- **Share sheet (custom, above the OS sheet):** card preview carousel (feed 4:5 / story 9:16 variants, §6) → channel row ordered by market: **WhatsApp · LINE · Zalo · Instagram · TikTok · Copy link · QR · More** (OS sheet). Channel order is remote-configurable per store country (spec §6.3.5). Each channel share fires `invite-create` when the "compare" toggle is on.
- **One toggle on the sheet:** "Invite them to compare palms" (default ON for the compatibility card, OFF for the solo card). Pre-composed text per channel/locale: *"Palmly read my palm — I'm a Water hand 🌊 See what yours says & check our compatibility: {link}"*.
- Copy pre-population + one-tap-to-channel keeps "result → shared" at two taps (spec §6.3.3).

### 2.7 G/H — Compatibility flow (sender side)

1. Entry points: reveal-screen card, home tab "Compare," share sheet toggle.
2. **Sender picks framing:** friend / partner / crush / family (tone modifier for the narrative; also share-card copy variant).
3. Link generated (`invite-create`) → straight into the share sheet. Sender's pending state shows as a red-thread card on home: *"Waiting for Mei — your thread is tied 🔴"* with nudge-reshare after 48h.
4. **When the friend completes:** push + in-app **pair reveal**: two palm diagrams slide in from opposite edges, a red thread draws between them, score ring counts up in gold, sub-scores fan out (emotion 心 · mind 智 · energy 命 · destiny 运 · elements 五行), then the narrative. Both sides see the same choreography simultaneously (Realtime) — a designed "text each other about it" moment (P2's compounding step: shared emotional peak → both re-share).
5. First comparison free (it *is* the loop); subsequent gated to premium with the paywall variant that leads on "unlimited compatibility."

### 2.8 I — Paywall (contextual, multi-page — U2/U3)

- **Placement:** fires on value-adjacent triggers only: locked deep-dive tap, daily-fortune full view, 2nd compatibility, chat entry, and once post-first-reading-share (the peak-delight beat) — never before the first reading (spec §4.6 hard rule).
- **Structure (multi-page, 2–3 screens per Superwall's 37% finding):**
  - P1 *value*: "Your palm has more to say" — animated peek of the user's own locked sections (their diagram, their line names) + daily fortune preview for today's actual date. Personal, not generic feature lists.
  - P2 *social proof + what's included*: testimonial with locale-matched name, "readings delivered" counter, and a plain-language inclusion list (daily almanac · unlimited compatibility · deep-dive lines · chat). (If a trial variant is later A/B-tested, this page swaps in the trial-timeline graphic — today unlock → day-N reminder → renews — which measurably reduces trial anxiety.)
  - P3 *plans* (launch config per U3 — **no trial, direct purchase**): annual pre-selected (per-month framing + "SAVE 40%" gold seal), monthly beside it. Restore purchases + legal links. Close "✕" always visible top-left after 1s (soft paywall — review-safe and matches our funnel economics).
- Rendered via RevenueCat **Paywalls v2** remote templates: plan mix, trial toggle, pricing, and page order are all experimentable without releases (U3). Regional pricing per SEA guidance (50–80% below US price points, rounded to local conventions: ₱199, Rp 121,000 etc. — [RevenueCat regional pricing](https://www.revenuecat.com/blog/growth/5-quick-fixes-for-bad-default-global-pricing-on-app-stores/)).
- **Post-decline win-back:** 24h later, one push + in-app banner with a welcome offer (discounted annual) — standard 2026 pattern, capped at once per user.

### 2.9 J — Account creation (never before value — spec §4.3)

- Triggered only by: **Save/History** ("Keep your reading forever"), **Compatibility send/accept** (identity needed for the pair), **Daily fortune** (birth date + persistence), device migration.
- Sheet, not screen: Apple / Google / phone-OTP. One field maximum visible at once. Copy states the *why*: "Create a free account so your reading is never lost."
- Under the hood this is anonymous-identity linking (Backend §5.1) — every reading already belongs to them; the sheet never threatens data loss and never blocks back-navigation.
- Skippable everywhere except compatibility-accept (identity is structurally required there; the sheet says so honestly: "so Mei knows it's you").

### 2.10 L — Recipient journey, end-to-end (P2's make-or-break path)

**No-app recipient, from tap to their own reveal:**

1. **Messenger preview card** (the first impression, before any click): og:image renders inviter's first name + two seal-framed palm silhouettes + red thread + "?" score ring. Title: *"Mei 🤝 You — palm compatibility."* Served by our teaser page (Backend §8.2), so this is fully ours to design and localize; preview image kept <300KB for WhatsApp caching.
2. **Teaser page** (`palmly.app/i/{token}`, mobile-web, <50KB, no JS framework): inviter avatar/name, *"Mei wants to compare palms with you,"* a blurred/teased compatibility wheel, three-step explainer, one giant cinnabar CTA **"See our compatibility."** Below the fold: what Palmly is, privacy line, human-readable invite code (the always-works fallback). The CTA tap is engineered load-bearing: it fires the Universal/App Link (escaping in-app webviews), arms the iOS clipboard token, or routes to the store with the Android referrer attached (Backend §8.2). WeChat visitors get the "open in browser ⋯" overlay first.
3. **Install → first open:** deferred context resolves (clipboard/referrer/SDK). **The recipient does NOT get the generic onboarding.** They land on a personalized variant: *"Mei is waiting"* banner with the red-thread motif → single explainer screen (*"Scan your palm to reveal your compatibility — you'll get your own full reading too"*) → camera primer (§2.2) → capture (§2.3) → analyzing (§2.4) → **pair reveal first** (§2.7.4), *then* their own full reading beneath it. Rationale: they came for the comparison — pay off that intent first, then over-deliver with their own reading; both moments are share-prompted (loop compounds).
4. If deferred context fails silently (webview edge cases): first-open screen includes "Have an invite? Enter code" — recovers the loop manually.
5. Recipient account prompt appears only at the pair-accept step (§2.9), with inviter-name framing.

**Target: link-tap → their own reveal in under 4 minutes, with zero typing except the OS install flow.**

### 2.11 K — Returning-user home (daily fortune)

- **Layout (top→bottom):** date in both calendars (July 11 · 六月初七) → **today's fortune card** in almanac style: one-line essence free (U4); premium expands to 宜 do / 忌 don't lists, lucky direction compass, lucky hours, love/career/wealth meters → red-thread row (pending/complete compatibilities) → my readings shelf (palm/face cards) → chat entry ("Ask about your reading").
- Fortune card is itself shareable (third share asset class) — almanac aesthetics are inherently screenshot-friendly.
- Streaks: subtle ink-dot calendar strip, no aggressive gamification (fits brand; streak loss never punished with guilt copy).
- **Chat (premium):** entered from a reading section or home; suggestion chips grounded in *their* features ("What does my broken fate line mean for this year?"). Responses stream; each answer cites which of their lines it draws on (trust + grounding made visible).
- **Settings/account:** subscription management (deep-link to store management), notification granularity (fortune time picker, social on/off), language, privacy center — *delete my scans now* (instant, shows the D2 policy state), *delete account* (in-app, full erasure), data policy in plain language, "How Palmly reads" methodology page, restore purchases, legal.

---

## 3. Share card — design spec (the core viral asset)

Treated as a first-class product surface per spec §4.4/§7. Rendered server-side (Backend `card-render`) so every card is pixel-identical across devices, localized, and ready *before* the user hits share (pre-rendered during the pipeline).

### 3.1 Variants & geometry

| Variant | Size | Target |
|---|---|---|
| `feed_4x5` | 1080×1350 | WhatsApp/LINE/Zalo message previews, Instagram feed, Xiaohongshu |
| `story_9x16` | 1080×1920 | IG/TikTok stories, full-screen reshare |
| Classes | solo palm · solo face · compatibility · daily fortune | each in both sizes |

### 3.2 Layout anatomy (solo palm, 4:5)

```
┌──────────────────────────────┐
│  paper texture, hairline border              │
│  ①  headline trait — display serif           │  "A Water hand —
│      (max 2 lines, largest element)          │   feeling runs deep."
│                                              │
│  ②  THE HERO: user's own palm as an          │  engraved ink diagram,
│      engraved line diagram, cinnabar         │  60% of card height —
│      highlights on 2 signature lines,        │  unique per person,
│      small labels 心智命运                     │  recognizably THEIRS
│                                              │
│  ③  trait chips (2–3): "Deep heart line ·    │
│      Double fate line · Fire mounts"         │
│  ④  footer rail: [seal logo] palmly.app ·    │  ⑤ QR (story variant
│      first-name attribution (optional)       │     only, corner)
└──────────────────────────────┘
```

- **Hierarchy:** headline → diagram → chips → brand. A stranger seeing a screenshot understands *what it is* (a palm reading), *whose* (name/diagram), and *where from* (seal + domain) in <2 seconds without tapping — the spec's screenshot test.
- **The diagram is the moat:** every card is visually unique (their actual traced lines), which reads as personal and authentic where competitors share generic zodiac art. It's also privacy-safe (never the photo).
- **Compatibility variant:** two diagrams angled toward each other, red thread connecting heart lines, gold score ring center (the number is the headline), both first names in small caps (U6), one shared-trait chip + one friction chip ("Fire meets Water — sparks and steam").
- **Branding:** seal + wordmark occupy ≤6% of card area, always bottom rail — present in every crop, never loud (spec: subtle branding).
- **Anti-clutter rules:** max 3 chips; no UI chrome, no stars ratings, no "download now" copy; the QR appears only on story variant (stories can't carry links for non-verified accounts; feeds get the link in the share text instead).

### 3.3 Rendering & localization rules

- Text lives in the server render layer (never baked into illustration assets) → every locale re-renders natively; Noto family across Latin/Thai/Vietnamese/CJK guarantees glyph coverage.
- Contrast: all text `ink` on `paper` (AA); cinnabar/gold only for graphic elements.
- Dark variant auto-generated (ink paper inversion) — offered as a style toggle in the share sheet.
- File output: PNG, <450KB (WhatsApp preview-friendly), immutable CDN cache.
- Every card embeds the invite link's short code in the QR + share text — the card without its link still carries `palmly.app`.

---

## 4. Notification strategy & tone

Voice: the considered scholar-friend — observational, a little poetic, never demanding, never guilt-tripping. Xuanxue content works when it feels like wisdom, not spam. Every push deep-links to its exact context.

| Trigger | Timing | Example copy (EN) | Notes |
|---|---|---|---|
| Reading ready (app backgrounded) | pipeline complete | "Your lines have been read. 🖋 Come see what they say." | Functional; highest open intent |
| Compatibility complete | both scans done | "The thread is tied — you and Mei scored **82**." | Number in the push = curiosity + share bait; both sides simultaneously |
| Invite accepted | friend's first scan done | "Mei just scanned her palm. Your result is minutes away." | Keeps sender warm during friend's pipeline |
| Daily fortune | 8:30 user-local (user-adjustable) | "初七 · A day that favors beginnings. Your lucky direction: East." | Content-first — the hook is the actual almanac, never "we miss you"; sharded by timezone (Backend §10) |
| Solar terms / lunar events | ~2–4/month | "立秋 begins today — the almanac counsels patience in money matters." | Spec §4.5 "real calendar events, not re-engagement spam" |
| New-subscriber onboarding (days 1–3) | morning, post-purchase | "Day 2 with Palmly: your 婚姻线 analysis is waiting." | Launch config has no trial (U3); this sequence cements the daily habit early. If a trial variant is A/B-tested later, the same slots become trial-engagement pushes (84% of trial cancels happen by Day 1) |
| Win-back (paywall declined) | +24h, once ever | "A gift while your reading is fresh: 40% off your first year." | Single-shot, capped |

Caps: max 1 content push/day (fortune) + event-driven pushes deduped within 30min; quiet hours 22:00–08:00 local enforced server-side; granular toggles in settings (fortune / social / offers separately). Permission is requested only at a justified moment (§2.4 overrun, fortune opt-in, or first compatibility send — whichever comes first), never at launch.

---

## 5. Motion & interaction feel

- **Metaphor set:** ink diffusion (screen transitions — 350ms, custom bezier ease-out), brush-stroke draws (lines, progress), seal stamps (confirmations — scale-down + haptic), red thread (compatibility connective tissue), paper lift (cards — 2–4dp shadow max, no glassmorphism).
- **Haptics vocabulary:** light tick = capture-guidance state change; double tap = auto-capture; soft thud = seal stamp/confirm; success pattern = reveal + pair-score landing. Haptics mirror visual beats 1:1 — never decorative.
- **Choreographed peaks (the two moments that must feel expensive):** (1) reading reveal — diagram self-draw 1.2s → headline rise → sections settle in a 90ms stagger; (2) pair reveal — opposing slide-in, thread draw 800ms, score count-up with gold particle restraint (≤12 particles; we are not a slot machine).
- **Performance budget:** 60fps floor on mid-range Android (the SEA fleet); all hero animation via Reanimated/Skia on the UI thread; no full-screen blurs on Android; loader animations must run during network work without jank (they're masking latency — if they stutter, trust dies with them).
- **Reduced motion:** `prefers-reduced-motion` swaps draws/particles for 200ms cross-fades; auto-capture countdown becomes a static 3-2-1; haptics preserved (they're not motion).

---

## 6. Accessibility

- **Capture accessibility (the differentiator):** the guidance state machine's single-instruction model maps 1:1 to spoken VoiceOver/TalkBack announcements + haptic ticks — a blind or low-vision user can complete a palm scan guided entirely by voice. Test this explicitly; competitors can't do it.
- Contrast: AA minimum everywhere (`ink`/`paper` = 13.9:1); cinnabar/gold never carry text <18pt; locked/score/status states always have a non-color signal (lock glyph, label).
- Dynamic Type to 130% without truncation (section cards reflow; share *sheet* respects it — share *cards* are fixed-render images and exempt).
- Touch targets ≥44pt; the share seal and paywall close ✕ specifically audited (dark-pattern-free close is both ethical and App-Review-safe).
- All reading content is real text (copyable, screen-readable) — never text-in-image inside the app; alt text auto-generated for share cards ("Palm reading card for Mei: Water hand, deep heart line, score 82").

---

## 7. Localization readiness (EN first; ID/TH/VI/Tagalog/MS later — spec §2)

Build these in now so later localization is content work, not rework:

1. **ICU MessageFormat** strings from day one (plurals/gender/select), no concatenation; all strings in catalogs including capture-guidance and notification templates.
2. **No text baked into any image asset** — in-app illustrations are text-free; share-card text is server-rendered per locale (§3.3).
3. **Noto font family** everywhere → Thai/Vietnamese diacritics/CJK render day-one; line-height presets already sized for Thai stacked diacritics (1.5× body).
4. **Expansion budget:** layouts tested at +40% string length (pseudo-locale in CI) — instruction pills, chips, and paywall plan rows are the known tight spots.
5. **Locale ≠ language:** currency/price points from RevenueCat offerings per storefront; lunar-calendar rendering already locale-aware (it's a core feature, not an i18n afterthought); date/number via `Intl`.
6. **Cultural variables externalized:** hand-selection convention note (U5), fortune-content tone, channel order in the share sheet, and share-text templates are all remote-config per market.
7. RTL: not required for target markets; avoid hard-coded left/right in layout primitives anyway (use start/end) — free insurance.
8. 中文 accents (section glyphs, seal) are decorative constants, not translated UI — they're the brand, and they're always paired with localized labels.

---

## 8. Instrumentation map (what UX success means — spec §10)

| Question | Events / measures |
|---|---|
| Is capture effortless? (P1) | `capture_started → state_dwell(each guidance state) → auto_capture vs manual vs abandon`, per device tier; target: p50 <20s in-capture, >85% auto-capture rate, <8% abandon |
| Is the wow landing? | reveal scroll depth, section completion, time-on-reveal, "consistency" micro-survey after repeat scans |
| Is the loop turning? (P2) | share-sheet opens per reveal, shares by channel, teaser CTA rate, install→claim rate, claim→recipient-reveal completion, K-factor per channel (invite state machine) |
| Is the paywall placed right? | paywall views per trigger source, page-depth on multi-page flow, view→trial/paid by variant (Paywalls v2 experiments), 24h win-back conversion |
| Is fortune retaining? | fortune-open DAU, push→open rate, streak length distribution vs D7/D30 |
