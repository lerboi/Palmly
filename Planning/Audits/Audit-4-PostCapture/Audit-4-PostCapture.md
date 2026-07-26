# Audit 4 — The Post-Capture Experience (UI · UX · Design)

**Date:** 2026-07-25 · **Auditor:** Claude (Fable 5) · **Status:** COMPLETE — findings frozen
**Scope:** everything the user sees AFTER a capture is taken — analyzing → reveal → home
(fortune/almanac) → chat / history / share / pair / paywall / account / settings — plus the
design-system usage those screens share. Capture/camera surfaces themselves are OUT of scope
(they belong to the R3 ledger in `Planning/MVP_Buildplan.md`).
**Companion files (read in this order):**
1. This file — WHAT is wrong, with evidence.
2. `Design-Direction.md` — WHAT IT SHOULD BE: the target design language + per-screen specs.
3. `Audit-4-Tasks.md` — the executable checkbox ledger (single source of truth for the fix loop).
4. `Prompt.txt` — the `/loop` prompt that runs the ledger.

**Specs behind this audit:** `Planning/UIUX/UIUX-specs.md` (behavior/flows),
`Planning/UIUX/UIUX-Redesign.md` (type/elevation/spacing — partly superseded),
`Planning/UIUX/UIUX-Redesign-v2.md` (ACTIVE visual identity: "Vermilion & Motion"),
`Planning/mvp_spec.md` §4.5, `app/src/theme/tokens.ts` (the shipped token contract).

> **Line-number caveat:** every cite below was verified against the tree on 2026-07-25
> (branch `main`, after commit 56bab15). The tree moves — re-anchor by grepping the quoted
> code/strings before editing, and record drift in the ledger's AUDIT ERRATA table.

---

## §1 Executive verdict

The owner's complaint — *"after the reading, the app stops looking good: the main page with the
calendar and the almanac looks sloppy, the coloring is bad, it isn't Apple-minimal"* — is
**correct, and the causes are identifiable and fixable without new screens or backend work.**

The foundation is genuinely strong: a disciplined token system (`tokens.ts` — zero raw hex
literals in any post-capture feature), a good sans-first type scale, a real motion contract with
reduce-motion gating, an in-house icon set, and well-built primitives (`Button`, `Card`, `Text`,
`Screen`, `Logomark`, `PalmDiagram`). **The problem is not the palette or the primitives — it is
how the screens compose them.** Five root causes produce the "sloppy, unprofessional" feel:

1. **Vermilion is everywhere, so it is nowhere.** The single brand accent (`#D13B27`) is applied
   to every row icon, every chip, every dot, every bar, every tile on every screen. A saturated
   red repeated 10+ times per screen reads alarming and cheap, not confident. The v2 redesign's
   own restraint rule ("one authored moment per surface") was applied to motion but never to
   color.
2. **Everything is the same white card, and the cards barely exist.** `surfaceRaised #FFFFFF` on
   `bg #FAF9F7` is a 1.01:1 difference held apart only by a 6%-opacity shadow (Android
   elevation 1 ≈ invisible). Screens read as flat white-on-white stacks of identical
   rounded rectangles — a settings list, not a home.
3. **The core loop dead-ends.** There is **no in-app path from the reveal to the home screen**
   (SN-1) and no persistent navigation at all (SN-2). The "main page" the owner dislikes is also
   one the user can only reach by killing and relaunching the app.
4. **States lie.** The home's loading state IS the first-run state ("Read my palm" flashes at
   every returning user, and permanently replaces the fortune on any error); fixture content
   (stock palms, score-0 compat cards, "Your match", fake prices) renders on real user paths;
   the streak never renders at all in production.
5. **Dozens of small drifts add up to "sloppy":** contrast failures (2.6:1 gold, 2.7:1
   tertiary-as-content, 4.0:1 chips), ✓/✕/↘ text glyphs instead of the icon set, magic numbers,
   two competing entrance-animation systems, sub-44pt tap targets, off-axis photo, clipped glow,
   overflowing button rows, header inconsistency, verbose developer-voiced copy.

**There is no "calendar" today.** The perceived calendar is a plain date header + (never-shown)
streak dots. The almanac surface the spec promises — a scannable, screenshot-worthy daily
card with a week rhythm — does not yet exist as a designed object. That gap is the single
biggest design opportunity (see Design-Direction §4.1).

---

## §2 The post-capture journey as-built (walkthrough)

Capture completes → **Analyzing** (`(reading)/analyzing.tsx`): a stock fixture palm — not the
user's — is "traced" under copy claiming "Tracing your heart line…"; the captured photo floats
28px off-axis behind it; the ring parks at 75% for the slowest half of the pipeline; backing out
silently abandons the scan → **Reveal** (`(reading)/reveal.tsx`): the strongest screen (real
geometry, editorial headline, section stagger), but it descends into a pile of cross-sell cards
with the trust footer buried mid-pile, two identical claret stamps (one dead), and a share
affordance that is invisible until 240px of scroll and unlabeled after → **dead end.** The only
exits are back (to nothing useful), share, paywall, or another capture. The home screen is
reached on the *next app launch*, via `app/index.tsx:72`'s cold-start redirect — after a flash
of the marketing launcher → **Home** (`(home)/fortune.tsx`): "Read my palm" flashes while the
fortune loads; a full-screen `YYYY-MM-DD` birth-date form may block everything (and re-nags on
every open, forever, if skipped); then a stack of five near-identical white cards with six
accent-red icons and four hues inside the fortune card alone. Chat, history, share, pair, and
paywall each carry their own section of defects (§4).

---

## §3 Severity model

- 🟥 **Structural** — breaks the journey or the trust story; fix changes flow/architecture.
- 🟧 **Design-defining** — the things that make it "look bad": color, surface, hierarchy.
- 🟨 **Consistency/polish** — drift, magic numbers, component misuse; each small, jointly fatal.
- 🟦 **Copy/tone** — wording that is verbose, technical, or off-brand.
- ⬜ **Micro** — small correctness bugs worth fixing while touching the file.

Finding IDs are stable (`SN` structure/nav · `SH` state honesty · `CC` color/contrast ·
`CO` composition/consistency · `CP` copy). The ledger tasks cite them.

---

## §4 Findings

### SN — Structure & navigation 🟥

| ID | Finding | Evidence |
|---|---|---|
| SN-1 | **No path from reveal → home.** `setFirstReadingComplete()` is written at `(reading)/reveal.tsx:59`; its only consumer is the cold-start redirect `app/index.tsx:46,72`. No Done/Home/"See my fortune" affordance exists on reveal, share, or pair. The user must relaunch the app to reach the main page. | `app/src/app/index.tsx:72`, `features/reading/RevealView.tsx` (no home CTA) |
| SN-2 | **No persistent navigation.** No tab bar anywhere (`grep Tabs|tabBar` → 0). `(home)/_layout.tsx:4` is a bare Stack; fortune/chat/history are siblings joined only by tappable row-cards on home. The home page therefore doubles as a nav menu — the root of its "settings list" feel. | `app/src/app/(home)/_layout.tsx:4` |
| SN-3 | **History is a pushed screen with no back affordance.** `AppHeader` rendered without `onBack`; header also scrolls away with content. iOS-only exit: edge swipe. | `features/reading/HistoryShelf.tsx:35-50` |
| SN-4 | **A returning user cannot start a new scan.** "Read my palm" exists only in the first-run state and the empty history state; a populated home/history has no new-reading entry. | `FortuneHome.tsx:149`, `HistoryShelf.tsx:55-59,222` |
| SN-5 | **Free-user chat is a two-hop trap.** The "Ask about your reading" row shows a `Premium` chip but still navigates → full-screen gate → paywall → back out twice. | `FortuneHome.tsx:127`, `ChatThread.tsx:59-75` |
| SN-6 | **Pair reveal's primary CTA lands on an error screen.** "See my full reading" pushes `/reveal` with no id → `loadReading({})` → null → the reveal error state. A broken CTA at the emotional peak. | `app/(reading)/pair.tsx:77`, `reveal.tsx:45-50` |
| SN-7 | **Analyzing exits are traps.** Back silently abandons an in-flight scan (no confirm; no `/analyzing` re-entry exists). "Notify me" → OS prompt → `router.replace('/')` dumps the user on the marketing launcher with no route back to the scan. | `app/(reading)/analyzing.tsx:57-74` |
| SN-8 | **Returning users see the marketing launcher flash** (animated logo draw included) while the async redirect resolves; a 1500ms auto-advance timer races user taps. | `app/index.tsx:36-66,89` |
| SN-9 | **Modals dismiss like pushes.** Share/paywall/account present as `modal` but Share's header is a back *arrow* (`AppHeader onBack`), not a close ✕; paywall and share slide up identically from the same screen with no differentiation. | `(modals)/_layout.tsx:5`, `ShareView.tsx:218` |
| SN-10 | `analyzing → reveal` uses `router.replace` with a `slide_from_right` push animation — implies a back-path that doesn't exist. The `(reading)` layout also gates animation on reduce-motion only, missing the standard web gate. | `(reading)/_layout.tsx:12`, `analyzing.tsx:53` |

### SH — State honesty 🟥

| ID | Finding | Evidence |
|---|---|---|
| SH-1 | **Home's loading state IS the first-run state.** `showFirstRun = firstRun \|\| !fortune` — every returning user sees "Your daily fortune starts here / Read my palm" for two network round-trips on every open; a missing `fortune_templates` row or any network error shows it *permanently*, routing a 12-reading user into capture. No skeleton, no error state, no retry. | `FortuneHome.tsx:44`, `app/(home)/fortune.tsx:18,30-53` |
| SH-2 | **Premium flash.** Entitlements default `premium: false` while resolving — paying users briefly see the locked fortune card, the `Premium` chat chip, and the free plan pill on every open. | `lib/entitlements.ts:40` |
| SH-3 | **Home visibly reflows 2–3× per open** as three async effects insert the red-thread row, the notify card, and the claim row after first paint. | `FortuneHome.tsx:50-72,128` |
| SH-4 | **The birth-date ask is hostile.** Full-screen blocker (not a sheet, despite the name) shown BEFORE any value; hand-typed `YYYY-MM-DD` with no picker/no auto-hyphen/no validation message; "Skip" is not persisted → re-nags every single open; save failure is silent and re-asks next launch. | `features/fortune/BirthDateSheet.tsx`, `(home)/fortune.tsx:35,57-66`, `fortuneData.ts:54-68` |
| SH-5 | History load errors render the *empty* state ("No readings yet") to users who have readings. | `app/(home)/history.tsx:21` |
| SH-6 | **Chat errors impersonate the assistant** — network failures render as a Palmly-avatar assistant bubble. | `app/(home)/chat.tsx:58-61` |
| SH-7 | **Fixture content ships on real paths:** the analyzing hero is `PREVIEW_GEOMETRY` (with a11y label "Your palm line diagram"); BOTH pair palms are fixtures; the share compat tab renders score **0** + "Your match" + a hardcoded blurb when opened from reveal (no pairId); share's fallback headline is "My palm reading"; the paywall hero is `PREVIEW_GEOMETRY` under copy claiming "your fate line", with hardcoded prices ("$35.88", "SAVE 40%") and a CTA that just closes the modal. | `analyzing.tsx:67`, `pair.tsx:74`, `share.tsx:57-78`, `ShareView.tsx:74-75`, `(modals)/paywall.tsx:18-21,99,105` |
| SH-8 | **The privacy badge still lies in two places.** Pending reveal + history header use the default "Photo deleted" label while the photo may exist — bypassing the `deletedLabel` honesty apparatus built for exactly this. `deletedLabel` itself hand-rolls a 12-hour AM/PM clock ignoring locale, and shows a time with no date for old readings. | `RevealView.tsx:244,56-66`, `HistoryShelf.tsx:47` |
| SH-9 | **The streak does not exist in production.** The `streak` prop is never passed (default 0 hides the strip); analytics hardcodes `streak: 0`; and the strip clamps at `Math.min(streak, 7)` so a 7-day and 30-day streak would render identically. The dots carry no weekday/today meaning. | `(home)/fortune.tsx:26,67`, `FortuneHome.tsx:37,110,199` |
| SH-10 | "Add your other hand" shows on every palm reveal forever — no dismissal, no already-added check. | `RevealView.tsx:189` |
| SH-11 | The repeat-scan consistency survey renders ABOVE the reading content, asking "does this match what you remember?" before the user has re-read anything. | `RevealView.tsx:152-157` |
| SH-12 | "Your palm is unchanged" banner shows for matched **face** scans (kind-agnostic flag). | `HistoryShelf.tsx:184`, `lib/session.ts:53` |
| SH-13 | Default partner name is the literal string `'your match'` → "Waiting for your match" reads as a placeholder bug. | `FortuneHome.tsx:57,221` |
| SH-14 | **Timezone + locale mismatches.** Fortune row fetched by UTC date while the header renders local date/pillar (wrong pairing for much of the day in UTC±8..12); header localizes via device locale while the fortune body is hardcoded `'en'`. | `lib/fortuneData.ts:14-18`, `FortuneHome.tsx:42`, `(home)/fortune.tsx:47` |
| SH-15 | Pair: a 402 bounces to paywall AFTER the screen renders; the waiting state has no timeout/nudge/retry. | `pair.tsx:44-51,93` |
| SH-16 | Reveal keeps the previous reading's geometry when opening another reading (excluded from the reset block) — reading B's pending state draws reading A's palm. | `app/(reading)/reveal.tsx:25,34-41` |

### CC — Color & contrast 🟧 (the "coloring does not look good")

| ID | Finding | Evidence |
|---|---|---|
| CC-1 | **Accent saturation.** Vermilion `#D13B27` is applied to every nav-row icon, the streak flame + all 7 dots, the fortune sparkle chip, every chat chip, all share channel tiles + monograms, sub-score bars and icons, the analyzing ring + dots + chip icon, section icon tiles… On one home screen the accent appears ~12 times with zero interactive meaning. The result reads alarming/festive — precisely what the v2 spec forbids — and destroys the accent's selected/CTA signal. | `FortuneHome.tsx:188,199,237,276`, `ShareView.tsx:428-435`, `PairRevealView.tsx:174`, `AnalyzingView` throughout |
| CC-2 | **The fortune card runs four hues at once** — accent chip + success-green "Do" + danger-crimson "Avoid" + premium-gold lock line — with `danger #A93226` a near-neighbour of `accent #D13B27`, so "Avoid" reads as brand-red. Markers are font glyphs `✓`/`✕`, not the icon set. | `FortuneCard.tsx:35,49,110-131` |
| CC-3 | **Cards barely separate from the page.** `surfaceRaised #FFFFFF` on `bg #FAF9F7` = 1.01:1, held apart only by `shadowOpacity 0.06/radius 3` (Android elevation 1). All `elevation="sm"` cards read as floating text on white. This is the single biggest "flat/sloppy" contributor. | `tokens.ts:199-202,284-289`, `Card.tsx:53-61` |
| CC-4 | `premium #C79A3C` on white ≈ **2.59:1** at 13px — "Premium" chips, "Unlock with Premium", the paywall eyebrow, and the pair screen's 50px gold score numeral all fail AA (numeral fails even the 3:1 large-text floor). | `FortuneHome.tsx:281`, `RevealView.tsx:395`, `PaywallView.tsx:106`, `ShareView.tsx:707` |
| CC-5 | `textTertiary #9A9AA0` ≈ **2.66:1** used for real content: reveal tradition footnotes, disclaimers, history dates, "No trial · cancel anytime", `palmly.app`, score-ring label. | `RevealView.tsx:354,200`, `HistoryShelf.tsx:117`, `PaywallView.tsx:185` |
| CC-6 | `accent` on `accentMuted` ≈ **4.0:1** — every chip, segment, pill, type-chip (13px) and the tonal button label (16px) sit under the 4.5:1 AA floor. | `Button.tsx:92,139`, `ShareView.tsx:333,385,606`, `HistoryShelf.tsx:106` |
| CC-7 | Off-state toggle track `border` on white ≈ 1.15:1 with a white thumb (≈1:1) — reads as a blank rectangle. Disabled send button: white icon on `border` ≈ 1.3:1 — near-invisible. | `ShareView.tsx:471-475`, `ChatThread.tsx:400-405` |
| CC-8 | The chat composer is edgeless when unfocused: `surfaceSunken` on `bg` ≈ 1.03:1 with a transparent border. | `ChatThread.tsx:350-410` |
| CC-9 | The token test guards ONLY white-on-accent; none of the failing pairings above are covered. | `theme/__tests__/tokens.test.ts:64-75` |

### CO — Composition & consistency 🟧/🟨

| ID | Finding | Evidence |
|---|---|---|
| CO-1 | **Home is a monotonous card stack with inverted motion hierarchy**: the hero fortune card has NO entrance while the secondary nav rows spring-stagger in; every element is the same full-width white card; the screen carries no grouping, rhythm, or single focal point. | `FortuneHome.tsx:106-131` |
| CO-2 | **The reveal's tail is a cross-sell pile in the wrong order**: sections → locked → SecondHandOffer → **TrustFooter (mid-page!)** → Face/Palm offer → disclaimer. The trust story is buried between two ads. `CompareCard` interrupts the reading flow after section 2 as the page's only centered, only `md`-elevation card. | `RevealView.tsx:186-203,363-381` |
| CO-3 | **Two identical claret stamps on the reveal** — decorative `ReadyStamp` (top, not tappable) and `SealFab` (share). The share affordance is invisible until 240px of scroll, unlabeled after, positioned outside the safe area (overlaps the home-indicator), and its `shadow.md` sits on a transparent view (no iOS shadow / rectangular Android halo). | `RevealView.tsx:130,207,566-579` |
| CO-4 | Elevation/hierarchy drift among siblings: section/locked/offer/survey = `sm` but CompareCard = `md`; LockedCard titles are `bodyMedium` (16/500) vs SectionCard `heading` (18/700) — the premium chapters look *less* important; `UnchangedBanner` fights the Card API (re-adds border + bg the elevation removed); the 88px empty/failure tile has three different treatments and two radii (20 vs hardcoded 44). | `RevealView.tsx:331-404`, `HistoryShelf.tsx:176-180,209`, `AnalyzingView.tsx:93` |
| CO-5 | **Half the reveal thumbnails are identical.** `SECTION_LINE` maps only 4 keys — hand_shape/mounts/markings render the same unhighlighted grey palm; face sections collapse to one `'face'` icon. `silhouette={false}` is silently ignored ≤96px (4 call sites + 2 wrong comments); at mini sizes the glow underlay math inverts (halo wider than line) and the highlight bloom is effectively invisible. | `reveal.ts:28-36,89-92`, `PalmDiagram.tsx:75-77,130-160`, `HistoryShelf.tsx:78,93` |
| CO-6 | **Overflow bugs:** the fortune Lucky row (3 × minWidth 84 + gaps = 284pt) overflows a 320pt device's 256pt content box; Do/Avoid squeezes into ~120pt columns; the consistency survey's three `size="lg"` buttons need ~337pt in a ~311pt box on a 375pt device. | `FortuneCard.tsx:72-76,142-149`, `RevealView.tsx:524-528` |
| CO-7 | **Icon semantics misfire:** camera icon = reading failure; `info` icon tinted `danger` as an error mark; `back` arrow = "Sign out"; `thread` means four different things (copy-link, invite toggle, compare feature, decoration); `shield` and `document` each double-booked in settings; auth buttons carry no Apple/Google marks and are visually identical. | `AnalyzingView.tsx:99`, `AccountSheet.tsx:141,150-152`, `SettingsHub.tsx:38-39,76-78`, `ShareView.tsx:272,403` |
| CO-8 | **Text glyphs where the icon set should be:** `✓`/`✕` markers, `↑↗→↘` direction arrows (with a leading-space bug on unmapped values), "Link copied ✓" (truncates at width 68 → "Link copie…"), `✨👇` emoji in outbound share text — against the icon module's own no-emoji rule. | `FortuneCard.tsx:113`, `fortune.ts:101-110`, `ShareView.tsx:295,420`, `lib/shareText.ts:13` |
| CO-9 | **Header system fragmentation:** FortuneHome hand-rolls its header (no AppHeader, no 44pt min, bare-Pressable gear with no spring/haptic at a 40pt target); history's gear = 38pt, share icon = 42pt — all under the app's own 44pt floor; AppHeader's back has a spring but no haptic while Button/Card tick; headers scroll away (no collapse/pin). | `FortuneHome.tsx:84-104`, `HistoryShelf.tsx:42-46,127-135`, `AppHeader.tsx:58-75` |
| CO-10 | **Two competing entrance systems** (RevealView's manual `FadeInDown 90ms/220` vs Card's `entranceIndex` spring 60ms) plus magic durations everywhere: breaths 1400ms vs 1500ms for the same idea, thread 800, ring 900 + a JS `setInterval` count-up that desyncs from the UI-thread arc, hardcoded 90 stagger, 2800 rotation. `useRotating` over-gates: reduce-motion freezes pending copy on line 1 forever. | `AnalyzingView.tsx:231`, `RevealView.tsx:92,217,225`, `ShareView.tsx:31-45,627-685`, `PairRevealView.tsx:163` |
| CO-11 | **Scale bypasses:** `fontSize: 24/lineHeight: 30` pasted twice over `editorialHeadline` (with 34px-tuned tracking); `fontSize: 11` seal; `fontWeight: '700'` on a family-driven type system (no-op/synthetic on Android); deprecated `colors.background` alias in 3 files; `Segment`/`FramingPill` are 95% duplicates that drifted; magic numbers catalog (44/28/46/22/72/68/196/…). | `ShareView.tsx:435,530,586`, `PaywallView.tsx:286`, `Screen.tsx:42` |
| CO-12 | **Share sheet layout:** non-scrolling screen whose intrinsic content overflows small devices (card overlaps toggles; Share button below the fold); channel row clipped by screen padding with the 7th tile cut and no scroll hint; real-PNG preview (maxWidth 340) vs vector fallback (full width) differ; the compat "partner" palm is the user's own palm mirrored (`differentiateGeometry` exists but is unused here); `copied` never resets; `onShare('share')` emits an unknown analytics channel; claret used as generic icon tint (2 violations of its own token comment). | `ShareView.tsx:217-308,501-577`, `share.tsx:57-78` |
| CO-13 | **Analyzing geometry:** the breathing glow is clipped 1px by its own SVG viewport; the captured photo is 28px off-axis behind the palm; the ring parks at 75% for the slowest pipeline stretch and draws a round nub at 0%; two failure CTAs route to the same destination; the 75s overrun state overflows a 4.7" screen (no scroll). | `AnalyzingView.tsx:110-135,211-260`, `analyzing.ts:24-27` |
| CO-14 | **Chat mechanics:** no auto-scroll (new messages land below the fold — first-order chat bug); Android keyboard avoidance unimplemented; chip-fade height hardcoded 44 (breaks under Dynamic Type); `key={c}` collides on duplicate chips; empty state top-aligned vs populated bottom-aligned; prefill arrives unfocused at the bottom of the screen; double-send silently dropped. | `ChatThread.tsx:79-121`, `(home)/chat.tsx:45-50` |
| CO-15 | `letterSpacing` + `textAlign:'center'` shifts the birth-date and OTP values visibly left of center; text inputs ship without horizontal padding. | `BirthDateSheet.tsx:51-72`, `AccountSheet.tsx:100-110,180` |
| CO-16 | **Pair details:** SubScoreBar's fixed `width:72` label + `width:28` value break at the app's own 1.3× Dynamic Type cap; `DIM_ICON` is keyed on display copy; the red thread is a fixed 72×60 SVG whose endpoints align with neither palm size; empty narrative renders bare headings ("Where you click" over nothing); ScoreRing's a11y label sits on a non-`accessible` View; the success haptic re-fires on every re-mount; the share modal auto-presents at 2s, over the still-running choreography. | `PairRevealView.tsx:45-51,78-80,133-134,168-189`, `pair.tsx:60-69`, `compat.ts:94-95` |

### CP — Copy & tone 🟦

| ID | Finding | Evidence |
|---|---|---|
| CP-1 | Developer vocabulary reaches users: "Trouble reaching the **server**", "**YYYY-MM-DD**", "your birth day sets your **day-pillar**", "quiet hours respected", "This **lands** the moment both palms are in". | `AnalyzingView.tsx:186`, `BirthDateSheet.tsx:47,54`, `FortuneHome.tsx:241`, `pair.tsx:107-109` |
| CP-2 | Verbose multi-clause lines where one calm sentence would do (notify opt-in, both cross-sell offers, second-hand offer). | `FortuneHome.tsx:241`, `RevealView.tsx:437,455,496` |
| CP-3 | The legal deletion promise rotates as "social proof"/reassurance filler in two waiting states. | `analyzing.ts:64`, `RevealView.tsx:72` |
| CP-4 | `FAILURE_DEFAULT` blames the user's lighting for any unmapped failure, including server faults. | `analyzing.ts:42` |
| CP-5 | "· Wood Rat day" — unexplained jargon with no tap-to-learn affordance. | `FortuneHome.tsx:91-93` |
| CP-6 | The free teaser is a 7-item interpunct feature list in low-contrast gold ("Do · Avoid · lucky direction · hours · love, career & wealth"). | `FortuneCard.tsx:50` |
| CP-7 | The legal line exists in three variants ("For reflection & entertainment" / "For reflection and entertainment." / `reading.disclaimer`); "Same palm, same reading…" duplicated with drift; three near-identical "Ask about your reading" strings. | `index.tsx:116`, `PairRevealView.tsx:143`, `RevealView.tsx:413`, `HistoryShelf.tsx:189` |
| CP-8 | Typographic drift: `&apos;` (renders `'`) vs `’` between adjacent screens; British/US mix ("Colour", "favourable" vs "Personalized"). | `pair.tsx:86,108`, `FortuneCard.tsx:74`, `fortune.ts:113` |
| CP-9 | Product-team voice mid-wow: "Does this reading match what you remember?", "Thanks — that helps **us** keep your readings consistent", errors as assistant speech. | `RevealView.tsx:519`, `chat.tsx:60` |
| CP-10 | Plan states use four labels for two states ("Palmly Free/Premium/Upgrade/Active"); the fortune claim-account reason promises a streak feature that doesn't exist. | `SettingsHub.tsx:96,122`, `AccountSheet.tsx:33` |

### ⬜ Micro-bugs (fix while touching the file)

- Leading space on unmapped lucky directions; empty-direction chat prefill "Why is  my lucky…" — `FortuneCard.tsx:73,86`
- `fortune.do` reserved-word property — `fortune.ts:10`
- Dead CJK payloads shipped: `AlmanacDate.pillar` (computed every render, never rendered), `SECTION_GLYPH`, `LINE_LABEL` gating English labels on a CJK map — `fortune.ts:70-88`, `reveal.ts:43-51`, `geometry.ts:113-119`
- `PREVIEW_FORTUNE`, `PREVIEW_CHIPS`, `PREVIEW_THREAD` fixtures exported from production modules — `fortune.ts:112-122`, `chat.ts:40-61`
- History `now` captured once (says "Today" past midnight); `relativeDate('')` renders an empty gap — `HistoryShelf.tsx:28`, `history.ts:28`
- `scrollEventThrottle 16` runs the reveal depth loop ~60×/s — `RevealView.tsx:99-111`
- Captured-photo `file://` URI passed through the route query string for a decorative thumb — `useScanUpload.ts:50`
- `Constants.expoConfig?.version ?? '1.0.0'` fake version fallback — `SettingsHub.tsx:21`
- Settings: Terms and Privacy both push bare `/legal` (paywall passes `?section=`) — `SettingsHub.tsx:77-78`
- `__DEV__` route-map button in the production component tree (also flagged by MVP ledger: remove TEMP welcome dev button before M1) — `index.tsx:118-126`

---

## §5 Contrast measurements (light Vermilion skin, computed)

| Pairing | Ratio | Verdict | Where |
|---|---|---|---|
| `premium #C79A3C` on `#FFFFFF` (13px) | 2.59:1 | ❌ AA | Premium chips, unlock lines, paywall eyebrow |
| `premium` 50px score numeral on white | 2.59:1 | ❌ even 3:1 | Pair score ring |
| `textTertiary #9A9AA0` on `bg #FAF9F7` (13px) | 2.63–2.66:1 | ❌ AA | Footnotes, disclaimers, dates, legal |
| `accent #D13B27` on `accentMuted #FBE7E2` (13–16px) | 4.00:1 | ❌ AA | All chips/segments/pills, tonal button |
| `onAccent #FFFFFF` on `border #E7E3DC` | ~1.3:1 | ❌ | Disabled send icon |
| `border` track on white card (off toggle) | 1.15:1 | ❌ | Share toggles |
| `surfaceRaised #FFFFFF` on `bg #FAF9F7` | 1.01:1 | ❌ separation | Every card |
| `textSecondary #6B6B72` on `bg` | 5.02:1 | ✅ | — |
| `success #3F7A5E` / `danger #A93226` on white | 5.05 / 6.62:1 | ✅ | — |
| `onAccent` on `accent` (buttons) | 4.81:1 | ✅ (tested) | The one guarded pairing |

---

## §6 What is GOOD — do not regress

1. **The token/skin architecture** — role-based, three skins, one-line reskin; zero raw hexes in
   any post-capture feature. Fix color by *usage rules and a few token values*, not by rebuilding.
2. **The type scale** — sans-first Noto Sans ramp + one editorial serif moment is right; the
   failures are inline overrides, not the scale.
3. **The motion contract** — tokens, springs, the reduce-motion + web gate applied ~everywhere.
4. **The icon set + Logomark** — coherent in-house stroke set; the two-tone mark is genuinely good.
5. **`PalmDiagram` draw-on** — the brand moment; the reveal hero with real geometry works.
6. **Primitives** (`Button`/`Card`/`Text`/`Screen`) — well-typed, haptic-aware; misuse is at call sites.
7. **The honesty apparatus** — `deletedLabel`, honest streak-hiding, real-data discipline in
   `FortuneCard` — the *instinct* is right; the audit only found the spots it missed.
8. **Copy at its best** ("Your lines are safe — this was just a hiccup on our side.") shows the
   voice works when it's short.

## §7 What happens next

`Design-Direction.md` defines the target (five principles + per-screen specs).
`Audit-4-Tasks.md` turns both files into an executable ledger (U0–U8) for the `/loop` prompt in
`Prompt.txt`. No production code changes were made by this audit.
