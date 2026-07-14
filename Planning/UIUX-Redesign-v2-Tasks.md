# Palmly — UI/UX Redesign v2 Task Ledger ("Vermilion & Motion")

**Design source of truth:** `Planning/UIUX-Redesign-v2.md` (the "Vermilion & Motion" north star —
color, motion, primitives, per-surface principles, verification). It overrides only the color/motion
of the older `UIUX-Redesign.md`; that doc's type/elevation/icons/English-first/a11y/server-reskin
guidance still applies. **Screen behavior / flows / content:** still `UIUX-specs.md`.
This ledger is a checkbox task machine — same conventions as `MVP_Buildplan.md` and the completed
`UIUX-Redesign-Tasks.md` (R1–R24, archived).

Checkbox: `[ ]` not started · `[~]` in progress/partial (or built + device-pending motion) · `[x]`
done+verified · `[!]` blocked.

---

## STATE

- **Active skin target:** **Vermilion (skin #3)** — ADDED + `activeSkin` (V1 done). Ink &
  Cinnabar (#1) + Quiet Cosmos (#2) stay in `tokens.ts` for parity / rollback.
- **Status:** IN PROGRESS — V1 `[x]`. V0 foundation continues (V2–V8) before screens (V9+). Prior
  round R1–R24 ("Quiet Cosmos") is complete + archived in `UIUX-Redesign-Tasks.md`.
- **Locked direction (2026-07-15):** modern **vermilion** accent (`#D8402C` / `#FF7C63`), **indigo
  fully retired** (red is the sole accent), **tasteful & premium motion** (foundation-first, every
  animation reduce-motion + web gated). See north star §2–§4.
- **Last completed:** **V1** — Vermilion skin #3 + `activeSkin`, token contract re-pinned (2026-07-15).
- **Next task:** **V2 — Motion foundation: `motion` tokens + shared `useReducedMotion` hook**.
- **Blocked on:** —
- **Key standing decisions to honor (north star §3.2 — the three-reds discipline):**
  - `accent` (vermilion) = everywhere-red: buttons, active/selected, links, **palm-line highlight**,
    icon chips, streak, sub-scores.
  - `heritageAccent` (claret) = **red-thread motif + corner seal ONLY**.
  - `danger` (crimson) = **destructive confirm ONLY**.
  - Move Fortune "Avoid" off `heritage`; move seals off the bright accent; keep `accentMuted` tints
    for pressed rows / selected state.
- **Expected device-pending `[~]` legs (layout verified via fixtures / static end-state):** all live
  reanimated motion (draw-ons, springs, ring sweep, thread draw, score count-up, stagger, screen
  transitions), all haptics, the camera feed + landmark state machine, the native OS share sheet,
  RevenueCat purchase, and the Deno test RUNs if `deno` isn't installed.

---

## EXECUTION PROTOCOL (per iteration)

1. **Re-ground:** read `Planning/UIUX-Redesign-v2.md` IN FULL, then this ledger. For the surface
   you're touching, read its behavior/content in `UIUX-specs.md` and **read the current source
   file(s) before editing** (match surrounding style).
2. **Pick** the first task in document order that is `[ ]` or `[~]`. **Never reorder** — the V0
   foundation (V1–V8) must land before the screen tasks (V9+), because every screen consumes the new
   tokens, motion hook, and upgraded primitives.
3. **Build** it to the north star. **Only design tokens** (no raw hexes in components — the camera
   `OVERLAY` neutrals are the one justified exception, and even its identity colors now read from
   `accent`). Realistic English content (no lorem, no CJK). Honor the three-reds discipline. Every
   animation uses `useReducedMotion()` + the `!reduceMotion && Platform.OS !== 'web'` gate; every new
   icon/animation gets an `accessibilityLabel` / reduce-motion fallback.
4. **Verify** with the task's Verify line. Static gates first (`npm run typecheck`, `npm run lint`,
   `npm test` from `app/`; Deno tests for edge tasks), then the visual check (`npx expo export
   --platform web` + headless-Chrome screenshot at 390×844, and 320-wide where clipping matters,
   saved under `docs/checkpoints/redesign/`). Live motion renders as its static end-state on web —
   screenshot that and mark the live leg `[~]`. **Never report a green you did not see.**
5. **Only when Verify passes:** mark `[x]` + today's date, add a one-line Build Log entry with
   evidence (screenshot path / test counts), update STATE, and `git commit` as `V#.<slug>`.
6. If a task fails 3 genuinely different approaches → `[!]`, record what you tried, set STATE
   "Blocked on", move to the next unblocked task.
7. **Loop control:** keep going while context allows; before it runs low, park the in-flight task
   `[~]` with a resume note, update STATE, commit, end the iteration. When every task is `[x]` (or
   the rest are `[!]`), give a final report and stop.

**Standing rules:** never break backend/edge-function *logic*, auth, realtime, or device-gated stubs
(server edits are **re-skin only**). Preserve `ThemeProvider`'s `forceScheme` prop (the `/dev/theme`
harness renders light+dark side-by-side). Ship the back-compat token aliases (don't rename-break). No
schema/migration/secret changes — none of this touches the DB.

---

## PHASE V0 — Foundation (tokens, motion, primitives) — must land first

- [x] **V1 — Add the Vermilion skin (skin #3) + retire indigo; re-pin the token contract** (2026-07-15)
  - Build: in `app/src/theme/tokens.ts` add `vermilionSkin` with the north-star §3 light+dark hexes
    (accent `#D8402C`/`#FF7C63`, pressed/muted/onAccent, heritage claret `#9E3B2E`/`#E0806F`, danger
    crimson, rest as listed); set `activeSkin = vermilionSkin`. Keep skins #1/#2 in the file. Keep
    ALL back-compat aliases. Confirm no other file hardcodes `#4B57C4`/`#8B95F0`/indigo.
  - Verify: re-pin `app/src/theme/__tests__/tokens.test.ts` to the Vermilion contract; `tsc`+`jest`+
    `lint` green; `expo export --platform web` + `/dev/theme` screenshot (light+dark) shows the
    vermilion swatch strip + red primary/tonal buttons + red PalmDiagram gradient, no indigo; grep
    finds no `#4B57C4`/`rgba(75,87,196` anywhere in `app/src`.
  - DONE: `vermilionSkin` added as skin #3 + `activeSkin`; #1/#2 kept for rollback; all aliases kept.
    tsc + lint(0) + jest **31/31** green (tokens.test re-pinned to Vermilion: accent `#D8402C`/`#FF7C63`,
    heritage `#9E3B2E`/`#E0806F`, onAccent `#FFFFFF`/`#2A0E07`, indigo negatively asserted). Screens:
    `docs/checkpoints/redesign/v1-theme{,-full,-palm}.png` (light+dark) — vermilion swatch strip, red
    primary/tonal/secondary/ghost buttons, vermilion numeral/markers/logomark-accent, red palm lines,
    claret heritage seal. Grep: indigo remains ONLY in the deliberately-retained Quiet-Cosmos skin #2
    def + its parity test assertion (north star §3/§8 keep #2 for rollback) — no component/active path
    uses indigo. Brand-asset generator (`app/scripts/gen-brand-assets.mjs`) still hardcodes indigo;
    deferred to V9 (Launcher) where the mark is regenerated + screenshotted.
- [ ] **V2 — Motion foundation: `motion` tokens + shared `useReducedMotion` hook**
  - Build: add the `motion` token group (§4.1: `duration`, `easing`, `spring.press`/`.entrance`,
    `stagger.list`/`.reveal`) to `tokens.ts` and surface it on `Theme` in `theme.ts`. Create
    `useReducedMotion()` (in `app/src/theme` or `app/src/hooks`), re-export it, and refactor the two
    inline `AccessibilityInfo.isReduceMotionEnabled` copies (`PalmDiagram.tsx`, `ChatThread.tsx`)
    onto it.
  - Verify: add a jest test pinning `motion.duration`; `tsc`+`jest`+`lint` green; grep shows
    `isReduceMotionEnabled` appears ONLY in the hook, and PalmDiagram/ChatThread import the hook;
    web export of the palm + chat unchanged (static end-states).
- [ ] **V3 — Button: press-spring, `danger`/`premium` variants, brand loader, tokenize**
  - Build: `app/src/components/ui/Button.tsx` — wrap content in a reanimated `Animated.View` that
    springs `scale`→~0.97 on pressIn / back on pressOut (`motion.spring.press`, gated by
    `useReducedMotion` + web); add `danger` (solid `danger`, `onAccent` label, pressed-darken) and
    `premium` (solid `premium`, `onPremium`, `premiumPressed`) variants; replace the stock
    `ActivityIndicator` with a small brand loader and reserve width so `loading` doesn't reflow;
    replace magic `gap:8`/`height:44|52` with tokens; optional light `expo-haptics` on primary.
  - Verify: `tsc`+`jest`+`lint` green; `/dev/theme` button matrix (primary/secondary/ghost/tonal/
    danger/premium × default/pressed/disabled/loading/icon) screenshot light+dark, resting scale=1
    (unchanged static); grep for `withSpring`+`useReducedMotion`; no new raw hex.
- [ ] **V4 — Card: unified pressable affordance + entrance/stagger primitive**
  - Build: `Card.tsx` — optional `onPress`/`accessibilityLabel`; when pressable, one shared spring
    press-scale + `surfaceSunken`/`accentMuted` pressed tint (reduce-motion → tint only). Add an
    `entering`/index-delay entrance (or a small `AnimatedCard`) built on `FadeInDown` +
    `motion.stagger`, reduce-motion/web → static. Migrate the ad-hoc `<Pressable><Card>` rows
    (`settingsUi.tsx SettingRow`, fortune `RowLink`/`RedThreadRow`, history `ReadingRow`) as
    reference consumers.
  - Verify: add a pressable-card + entrance example to `/dev/theme`; screenshot resting state
    light+dark unchanged; `tsc`+`jest`+`lint` green; grep shows list consumers pass an index delay and
    bare `<Pressable><Card>` trends to zero.
- [ ] **V5 — Logomark: weighted-ink, accent-safe rebuild + opt-in draw-on**
  - Build: `Logomark.tsx` — differentiated stroke weights (heart line heaviest) + a subtle unifying
    palm gesture so the mark is ownable; make the two-tone survive the red accent (don't collapse
    heart=`heritageAccent` + head/life=`accent` to one red — pair heart against ink or a tint); fix
    the `tone="onAccent"` heart-line contrast; add an opt-in `animate` stroke-on (dash-offset, shared
    `useReducedMotion`).
  - Verify: extend the `/dev/theme` logomark matrix (tone × variant × filled); screenshot light+dark;
    grep Logomark for raw hex (none); `tsc`+`jest` green.
- [ ] **V6 — PalmDiagram: per-line stagger + bloom, label-collision fix, `highlightColor`, silhouette**
  - Build: `PalmDiagram.tsx` — per-stroke start delay in classical order (heart→head→life→fate) so
    lines reveal in sequence; bloom the highlighted line's accent glow on completion; add a
    `highlightColor` prop (default `accent`); make the silhouette read as a hand (or derive from
    geometry bounds) and allow dropping it on ≤64px thumbnails. In `geometry.ts` (KEEP PURE) fix
    label placement — per-line anchor + screen-edge gutter + vertical nudge (fixes the Fate/Heart
    overlap) and expose the anchor so `PalmDiagram` sets `textAnchor`.
  - Verify: `geometry.test.ts` updated + green (pure module); `expo export` + screenshots of
    `/welcome` (labels) and a highlighted hero at 390×844 + 320 show no label overlapping a line and
    no clipping; grep for per-stroke `withDelay`; native draw-on `[~]`.
- [ ] **V7 — AppHeader: press feedback + optional scroll divider**
  - Build: `AppHeader.tsx` — the back `Pressable` gets the shared reduce-motion-aware press
    affordance; add an optional `showDivider` bottom hairline (`border`) for scrolled content; keep
    `accessibilityLabel="Back"`.
  - Verify: add an `AppHeader showDivider` example to `/dev/theme`; screenshot 390×844; `tsc`+`jest`
    green; a11y label unchanged.
- [ ] **V8 — Extend the `/dev/theme` harness to gate the new system**
  - Build: `app/src/app/dev/theme.tsx` — render pressed/active states, a pressable Card, the
    `danger`/`premium` buttons, the brand loader, the motion showcases (entrance/stagger sample,
    logomark + palm draw-on end-states), and the vermilion role swatches, all light+dark.
  - Verify: `expo export` + `/dev/theme` full-system screenshot (light+dark) shows every new
    primitive/state; `tsc`+`jest`+`lint` green.

## PHASE V1 — The journey (user-journey order) — every surface: recolor + one motion beat + craft

- [ ] **V9 — Launcher** (`app/src/app/index.tsx`) — Logomark **draw-on** + lockup/CTA **entrance
  stagger**; a faint token-driven brand-background (echo the welcome ghost-hand) so it isn't a blank
  page; resolve the mark/CTA accent (single vermilion CTA owns accent; mark reads ink + heart-line
  whisper); rebalance composition + tighter mark→wordmark lockup; group the legal caption under the
  CTA; gate the "Dev · route map" button behind `__DEV__`; drop the `maxWidth:280` literal.
  Verify: screenshots 390×844 + 320, light+dark — no dev button in a `__DEV__=false` build, balanced
  composition, drawn-mark end-state; grep no CJK/raw-hex; motion `[~]`.
- [ ] **V10 — Onboarding** (`(onboarding)/welcome|how-it-works|hand-select|claim.tsx`) — welcome:
  drop `showLabels` on the hero (de-clutter), add a Logomark, stagger headline/subhead/CTA;
  how-it-works: **animate the three steps** (stagger + icon pop, spec §A2); hand-select:
  Animated.Pressable **press-spring + animated selection** + wrap in `accessibilityRole="radiogroup"`;
  claim: **draw the red thread** between avatars + fade/scale them, add the privacy trust line, fix
  the avatar asymmetry ('M' vs 'You'); give `(onboarding)/_layout.tsx` a branded spring slide+fade
  transition (reduce-motion → fade/none). Verify: web route-map walks all four at 390×844 (+320),
  light+dark; grep `showLabels` gone from welcome, `radiogroup` present, reduce-motion gates present;
  motion `[~]`.
- [ ] **V11 — Capture** (`(capture)/primer|palm|face.tsx` + `features/capture/CaptureView.tsx`) —
  route `OVERLAY.guideReady` + the shutter ring from `theme.colors.accent` (**kill the gold
  `#D9B25A`**); animate the auto-capture ring fill (~800ms, reanimated, reduce-motion → static);
  press-spring + haptics on shutter/controls/toggle; fix the non-uniform guide `Svg` scale
  (320×320 uniform + center the path/oval); a branded primer hero + staggered entrance (keep the 3
  versioned consent strings verbatim); **announce guidance for a11y** (`accessibilityLiveRegion` +
  `announceForAccessibility`) + replace the raw `?` with a designed `help` `Icon`.
  Verify: grep `#D9B25A` → none; screenshots `/primer`,`/palm`,`/face` at 390×844 (+320) show a red
  ready-guide/ring, undistorted guides, branded hero; live ring/feed/haptics `[~]`.
- [ ] **V12 — Analyzing** (`features/reading/AnalyzingView.tsx` + `analyzing.ts`) — remove
  `animate={false}` + `key={stage}` so the palm **self-draws per revealed line**; make the ring
  **live** (animated sweep via `withTiming` + a LinearGradient accent→accentPressed + an ambient
  breath so it never reads hung); animate StepDots + crossfade the stage message; **rotate + elevate**
  the social-proof line (the 3-item array never rotates today); redesign the **failed** state to stay
  Palmly (faint palm behind, warm `heritage`/`danger` tone not the CTA hue, entrance); add
  `AppHeader onBack` to the loading branch (dead prop today) + tokenize magic numbers.
  Verify: grep no `animate={false}`; screenshots of `/(reading)/analyzing` + `/dev/analyzing-failed`
  at 390×844 show traced lines + gradient ring + warm failed state; `jest` (rotation index test)
  green; live sweep/draw `[~]`.
- [ ] **V13 — Reveal** (`features/reading/RevealView.tsx` + `reveal.ts` + `dev/reveal-pending.tsx`) —
  hero headline → **`variant="editorialHeadline"`** (the one sanctioned serif, this screen only);
  choreograph entrance (draw → headline rise → **90ms** section stagger); rebuild **pending** into a
  living "drawing" moment (drop `animate={false}`, pass signature lines, breathing pulse, rotating
  reassurance); section cards **echo their line** + fix the duplicate/loose `SECTION_ICON` mapping
  (hand_shape→`palm`, distinct icons, no triple `sparkle`); turn the share FAB into a **branded seal**
  with press + scroll-triggered entrance; add a locked-card **teaser** (real title + blurred tease,
  `PREVIEW_READING` body currently `''`); fix the **error identity** (drop `sparkle`; make "Try again"
  honest, not a silent `back()`); add a `/dev/reveal-error` preview. Verify: screenshots reveal +
  pending + error at 390×844 (+320) — serif hero, living pending, teasers, warm error; grep no
  `sparkle` in error, `editorialHeadline` present; entrance/scroll-spring `[~]`.
- [ ] **V14 — Share** (`features/reading/ShareView.tsx` + `(modals)/share.tsx` + `dev/share-compat.tsx`)
  — remove `animate={false}` (palm draw-on back on) + crossfade the solo/compat variant swap; spring
  the `Toggle` thumb (`translateX`) + `Segment` (press-scale + animated selection indicator, wrap in
  `tablist`); make `CHANNELS` real `Pressable`s (onPress stub, `accessibilityRole/Label`, pressed
  spring, `accentMuted` tint); fix the floating-card vertical rhythm (top-anchored, no tab-switch
  jump); bring **compat** to spec — `blurb`+`chips` props, red thread connecting **heart lines** in
  `accent`, labeled score ring; editorial hero headline + **filled** corner seal (heritage claret).
  Verify: screenshots solo + `/dev/share-compat` at 390×844 (+320) — tightened rhythm, thread+chips+
  labeled ring, branded channels, filled seal; grep no `animate={false}`, no raw hex; motion `[~]`.
- [ ] **V15 — Pair-reveal + claim** (`features/reading/PairRevealView.tsx` + `(reading)/pair.tsx` +
  `(onboarding)/claim.tsx`) — build the **second choreographed peak**: palms slide in from opposite
  edges (Animated.View translateX + `animate` true), the **red thread draws (~800ms)**, the **score
  ring counts up** 0→N (gold), sub-scores **fan in** (width 0→value, `withDelay(i*90)`) with
  **dimension icons** (Emotion→heart, Mind→mind, Energy→life, Destiny→path, Elements→new glyph); one
  **success haptic** on score-landing (native); distinct `accessibilityLabel` per palm + a spoken
  score summary; tighten so the number is the headline; rebuild **claim** around a brand-artifact
  avatar + the drawn thread + the privacy trust line; press-spring the payoff CTAs. Verify:
  screenshots `/(reading)/pair` + `/(onboarding)/claim` at 390×844 (+320) show the full static
  end-state (thread drawn, bars full+iconed, score placed, trust line); grep reduce-motion gate + two
  distinct a11y labels; choreography/haptic `[~]`.
- [ ] **V16 — Paywall** (`features/paywall/PaywallView.tsx` + `(modals)/paywall.tsx`) — add a
  **personalized traced-palm hero** (their locked lines highlighted; accept a geometry/lockedLines
  fixture — spec §2.8 "their diagram, their line names", not a generic feature list); vermilion CTA +
  a small heritage-seal identity touch; replace the four identical `check`s with **feature-matched
  icons** + a staggered inclusion entrance; spring plan-selection + card/CTA press; remove the
  `flex:1` **dead space** + stabilize the plan-price hierarchy (lead billed price + SAVE, stop the
  selection-based color flip); polish the premium seal alignment, `Restore` hitSlop, and the footer
  (separate the link from the legal line). Verify: screenshots paywall at 390×844 (+320) light+dark —
  palm hero above the fold, no dead gap, stable price hierarchy, feature icons; grep no raw hex,
  reduce-motion gates; selection/press motion `[~]`.
- [ ] **V17 — Fortune** (`features/fortune/FortuneHome.tsx` + `FortuneCard.tsx` + `fortune.ts`) —
  recolor to vermilion + **resolve the two-reds** (move `DoDont` "Avoid" off `heritage` → `danger`/
  `textSecondary`; keep the red-thread as the only heritage; fix `PREVIEW_FORTUNE.lucky_color:
  'Indigo'`); **elevate the card to a true hero** (`elevation="md"` + `surfaceRaised`, editorial
  header, accent-chip sparkle, **promote the free `overall` essence** to the visual anchor); entrance
  + staggered premium **unfold** motion; press feedback on `RowLink`/`RedThreadRow`/CTAs; redesign
  **StreakStrip** from a generic flame+dots widget into a branded, animated, a11y-labelled streak;
  first-run state previews the **PalmDiagram** hero (not a stock empty card); polish the almanac
  (designed direction glyph, 320-wide wrap guard on the lucky row, shared `SectionLabel`, `DoDont`
  markers + stable keys, surface the day-pillar whisper `almanacDate().pillar`). Verify: screenshots
  `/(home)/fortune` + `/dev/fortune-free` + `/dev/fortune-empty` at 390×844 + 320, light+dark; grep
  only the red-thread keeps `heritageAccent`, no raw hex; motion `[~]`.
- [ ] **V18 — Chat** (`features/chat/ChatThread.tsx` + `chat.ts`) — grounded identity: a small
  **Logomark avatar** on assistant bubbles + a **red-thread/palm citation** replacing the green
  `shield`/`success` "verified" line (keep `citationLabel()` copy); differentiate the empty-state
  tile from the paywall gate; **staggered bubble entrance** + typing→answer crossfade; chip
  press-spring + entrance, send-button press-spring, input focus transition; tokenize the magic
  pixels + give bubbles a speaker **tail** (asymmetric corner); wrap in `KeyboardAvoidingView`; add a
  right-edge **fade/peek** to the chip scroller (last chip currently hard-clips) + `accessibilityLabel`
  on chips. Verify: screenshots `/dev/chat-typing` + `/dev/chat-empty` at 390×844 (+320) — avatar,
  red citation, tailed bubbles, chip fade; grep no `name="shield"`/`tone="success"` on the citation,
  no raw pixel literals; bubble/typing motion `[~]`.
- [ ] **V19 — History** (`features/reading/HistoryShelf.tsx`) — row **entrance stagger** +
  **press-spring** (+ `accentMuted` pressed tint); make the 64px thumbnail **legible** (`silhouette=
  false`, palm vs face distinct) with the line in `accent` (vermilion); wrap the palm/face icon in a
  vermilion **type-chip** + fix row rhythm/hierarchy + separate rows on the warm-white bg; correct the
  inverted elevation (rows `sm` vs empty `md`); rework the **empty state** around the **Logomark**
  with a gentle entrance; turn `UnchangedBanner` into an earned **red-thread**-inflected trust brag
  (green stays the semantic check, heritage red is the ornament). Verify: screenshots
  `/(home)/history` + `/dev/history-empty` at 390×844 — distinct thumbnails, type-chips, Logomark
  empty state, thread banner; `geometry.test.ts` green; grep no raw hex; motion `[~]`.
- [ ] **V20 — Settings** (`features/settings/{SettingsHub,MethodologyScreen,NotificationSettings,
  PrivacyCenter,LegalScreen,settingsUi}.tsx`) — the highest-leverage fix in `settingsUi.tsx
  SettingRow`: press feedback + a `leadingIcon` prop + `SettingGroup` `elevation="sm"` (feeds every
  screen); wire icons across the suite; give the **Plan row commercial identity** (premium badge when
  premium / an accent upgrade nudge when free — not a grey "Free"); rebuild **MethodologyScreen** as
  an **animated timeline** (connector line + feature icons + tokenized step badges + staggered
  entrance + optional heritage "trace your lines" tint); make delete a first-class flow — a real
  `danger` **Button variant** (from V3) instead of the `style` override + an animated, scrolled-into-
  view confirm; **dedup** the privacy trust card (adopt `PrivacyBadge`); fix the dead/inert rows
  (Language no-op chevron, static timing rows). Verify: screenshots `/settings`,`/methodology`,
  `/notifications`,`/privacy`,`/legal` at 390×844 (+320), light+dark, both plan states; grep no CJK/
  raw hex, `danger` variant used (no `backgroundColor` override); motion `[~]`.

## PHASE V2 — Server surfaces, accessibility, finalize

- [ ] **V21 — Server surfaces** (`supabase/functions/_shared/card-svg.ts` + `invite-page.ts` +
  their tests) — extract one shared `_shared/palette.ts` (kills the "kept in sync manually" drift)
  and consume it in both; reskin `accent` → vermilion (incl. the raw indigo `rgba(75,87,196,.28)`
  CTA shadow) and **re-pin** `card-svg.test.ts` + `invite-page.test.ts`; resolve the seal/thread
  two-reds (seal → ink/claret, not the bright accent); give the card **warm paper (`#FAF9F7`) +
  depth + `accentMuted` chips** so it matches the app preview + fix the stale "display serif"
  comment; **fix the kind-aware invite copy bug** (h1 + CTA hardcoded compatibility regardless of
  `o.kind`); add **reduce-motion-safe CSS motion** to the invite page (`@keyframes` + `@media
  (prefers-reduced-motion: reduce)` no-op, dark-mode `@media prefers-color-scheme`, stays <50KB);
  optionally add a **server compat-card variant** (two palms + red thread + score ring) so a
  compatibility invite's og:image matches the hook. Verify: `deno` tests re-pinned + green (or
  render/grep-verified + RUN `[~]` if deno absent); grep no `#4B57C4`/`rgba(75,87,196`; rasterize the
  card PNG + screenshot the invite HTML (light+dark, reduce-motion emulation) under
  `docs/checkpoints/redesign/`; byteLen invite <50KB.
- [ ] **V22 — Accessibility + contrast + reduce-motion audit** — record AA for the Vermilion palette
  (white-on-`accent` ≥4.5:1 light **and** dark; `textSecondary`/`success`/`danger`/`heritage` on
  surface; dark accent + `onAccent`) and deepen `accent` a hair if any button-label case misses;
  confirm every svg `Icon`/`Logomark`/`PalmDiagram` has an `accessibilityLabel`/`decorative`; confirm
  every animation added this round routes through `useReducedMotion` (grep `isReduceMotionEnabled`
  appears only in the hook); dynamic-type spot check. Verify: contrast numbers recorded in the Build
  Log; grep clean; `tsc`+`jest`+`lint` green.
- [ ] **V23 — Finalize** — extend `/dev/theme` to the full Vermilion system + confirm the "dev — state
  previews" route group reaches every state (analyzing-failed, reveal-pending/error, share-compat,
  chat-typing/empty, fortune-free/empty, history-empty, paywall states); finalize `tokens.test.ts` +
  `geometry.test.ts` + `motion` test; run the WHOLE device-free suite (`tsc`+`lint`+`jest` + `expo
  export --platform web` + headless screenshots of **every** route at 390×844 & 320, light+dark +
  the two Deno-surface renders); confirm no route reads generic/indigo, the three-reds discipline
  holds, and every surface has its authored motion end-state. Update `docs/checkpoints/redesign/` and
  mark the round DONE in STATE, then STOP the loop. Verify: full suite green (Deno RUN `[~]` if deno
  absent); every-route screenshot sweep saved; STATE = done.

---

## Build Log

_(append one line per completed task: `V# — <what> — <evidence> — <date>`)_

- V1 — Added `vermilionSkin` (skin #3) + `activeSkin`; retired indigo (kept #1/#2 + all aliases); re-pinned `tokens.test.ts` to the Vermilion contract — tsc + lint(0) + jest 31/31; `docs/checkpoints/redesign/v1-theme{,-full,-palm}.png` light+dark show vermilion swatches/buttons/markers/palm, no indigo — 2026-07-15
