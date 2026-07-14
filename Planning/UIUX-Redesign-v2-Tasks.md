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
- **Status:** IN PROGRESS — V1–V15 `[x]` (V0 + Launcher…Share + Pair/claim). Screen phase continues
  at V16 (Paywall). Prior round R1–R24 archived in `UIUX-Redesign-Tasks.md`.
- **Dark screenshots (V9+):** build a dark bundle with `EXPO_PUBLIC_FORCE_SCHEME=dark npx expo export`
  then run `shoot.mjs` (RNW can't switch scheme client-side in a static web export). Light = normal
  export. `/dev/theme` still renders both via `forceScheme`.
- **Locked direction (2026-07-15):** modern **vermilion** accent (`#D8402C` / `#FF7C63`), **indigo
  fully retired** (red is the sole accent), **tasteful & premium motion** (foundation-first, every
  animation reduce-motion + web gated). See north star §2–§4.
- **Last completed:** **V15** — Pair-reveal (slide-in palms, drawing thread, counting score ring, fanning icon'd sub-scores) + claim verified (2026-07-15).
- **Next task:** **V16 — Paywall** (`features/paywall/PaywallView.tsx` + `(modals)/paywall.tsx`).
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
- [x] **V2 — Motion foundation: `motion` tokens + shared `useReducedMotion` hook** (2026-07-15)
  - Build: add the `motion` token group (§4.1: `duration`, `easing`, `spring.press`/`.entrance`,
    `stagger.list`/`.reveal`) to `tokens.ts` and surface it on `Theme` in `theme.ts`. Create
    `useReducedMotion()` (in `app/src/theme` or `app/src/hooks`), re-export it, and refactor the two
    inline `AccessibilityInfo.isReduceMotionEnabled` copies (`PalmDiagram.tsx`, `ChatThread.tsx`)
    onto it.
  - Verify: add a jest test pinning `motion.duration`; `tsc`+`jest`+`lint` green; grep shows
    `isReduceMotionEnabled` appears ONLY in the hook, and PalmDiagram/ChatThread import the hook;
    web export of the palm + chat unchanged (static end-states).
  - DONE: `motion` group added to `tokens.ts` (duration ladder, easing as pure cubic-bezier tuples
    so the token module stays reanimated-free, press/entrance springs, list/reveal stagger) +
    surfaced on `Theme` (light+dark). `useReducedMotion()` created in `app/src/theme`, barrel-exported,
    and both inline copies refactored onto it. `motion.test.ts` pins the contract. tsc + lint(0) +
    jest **36/36**. Grep: `isReduceMotionEnabled` lives ONLY in `useReducedMotion.ts` (other hits are
    doc comments); PalmDiagram + ChatThread import + call the hook. Web export unchanged: palm static
    end-state (`v2-theme-palm.png`) + chat (`v2-chat-typing.png`,`v2-chat-empty.png`) render identical
    to pre-refactor (diff is a pure hook extraction — same `animate` gate + opacity/layout). Live
    reanimated legs stay `[~]` device-pending.
- [x] **V3 — Button: press-spring, `danger`/`premium` variants, brand loader, tokenize** (2026-07-15)
  - Build: `app/src/components/ui/Button.tsx` — wrap content in a reanimated `Animated.View` that
    springs `scale`→~0.97 on pressIn / back on pressOut (`motion.spring.press`, gated by
    `useReducedMotion` + web); add `danger` (solid `danger`, `onAccent` label, pressed-darken) and
    `premium` (solid `premium`, `onPremium`, `premiumPressed`) variants; replace the stock
    `ActivityIndicator` with a small brand loader and reserve width so `loading` doesn't reflow;
    replace magic `gap:8`/`height:44|52` with tokens; optional light `expo-haptics` on primary.
  - Verify: `tsc`+`jest`+`lint` green; `/dev/theme` button matrix (primary/secondary/ghost/tonal/
    danger/premium × default/pressed/disabled/loading/icon) screenshot light+dark, resting scale=1
    (unchanged static); grep for `withSpring`+`useReducedMotion`; no new raw hex.
  - DONE: Button rewritten — press-spring (whole control scales to 0.97 via `motion.spring.press`,
    driven by a held-state effect so it stays React-Compiler-lint-clean; reduce-motion/web → resting
    1); `danger` (solid crimson, onAccent label, `dangerPressed` darken) + `premium` (solid champagne,
    onPremium, premiumPressed) variants; brand loader = three staggered palm-dots (label-colored,
    static end-state on web) overlaid on the width-reserved label so `loading` never reflows; heights
    tokenized via new `controlHeight`, gap via `spacing.sm`. Added `dangerPressed` to all 3 skins +
    ROLE_KEYS; `controlHeight` token. PrivacyCenter delete migrated to `variant="danger"` (bg override
    gone). `/dev/theme` extended (premium/danger/premium-loading/disabled-danger). Haptics deferred
    ([~]) — `expo-haptics` not installed; press-spring is the verifiable core (native-only anyway).
    tsc + lint(0) + jest **36/36**; `docs/checkpoints/redesign/v3-buttons.png` (light+dark) shows the
    full matrix at resting scale=1, brand loader replacing ActivityIndicator. Grep: `withSpring` +
    `useReducedMotion` present, no raw hex in Button. Live spring/haptics `[~]`.
- [x] **V4 — Card: unified pressable affordance + entrance/stagger primitive** (2026-07-15)
  - Build: `Card.tsx` — optional `onPress`/`accessibilityLabel`; when pressable, one shared spring
    press-scale + `surfaceSunken`/`accentMuted` pressed tint (reduce-motion → tint only). Add an
    `entering`/index-delay entrance (or a small `AnimatedCard`) built on `FadeInDown` +
    `motion.stagger`, reduce-motion/web → static. Migrate the ad-hoc `<Pressable><Card>` rows
    (`settingsUi.tsx SettingRow`, fortune `RowLink`/`RedThreadRow`, history `ReadingRow`) as
    reference consumers.
  - Verify: add a pressable-card + entrance example to `/dev/theme`; screenshot resting state
    light+dark unchanged; `tsc`+`jest`+`lint` green; grep shows list consumers pass an index delay and
    bare `<Pressable><Card>` trends to zero.
  - DONE: `Card` extended — `onPress`/`accessibilityLabel` → a Pressable surface inside an
    `Animated.View`; shared press-spring (scale 0.985 via `motion.spring.press`, held-state effect,
    reduce-motion/web → 1) + `pressedTint` (`sunken` default / `accent`=accentMuted, always applies);
    `entranceIndex` → `FadeInDown.delay(i·stagger.list)` (native only; web/reduce-motion static).
    Migrated the 3 named reference consumers → `<Card onPress pressedTint="accent" entranceIndex>`:
    history `ReadingRow` (+ list `index`), fortune `RedThreadRow` + `RowLink` (indices 0/1/2). Bare
    `<Pressable><Card>` removed from those files; the 2 remaining (`PaywallView` radio, `RevealView`
    locked-section) are explicitly owned by V16/V13. `SettingRow` press-spring deferred to V20 (its
    "highest-leverage" home; it's a row-in-group, not a `<Pressable><Card>`). `/dev/theme` gains a
    pressable card + 3 staggered-entrance cards. tsc + lint(0) + jest **36/36**; resting-state
    screenshots `docs/checkpoints/redesign/v4-{fortune,history,theme-cards}.png` (light+dark) show the
    migrated rows + dev examples. Live spring/entrance `[~]`.
- [x] **V5 — Logomark: weighted-ink, accent-safe rebuild + opt-in draw-on** (2026-07-15)
  - Build: `Logomark.tsx` — differentiated stroke weights (heart line heaviest) + a subtle unifying
    palm gesture so the mark is ownable; make the two-tone survive the red accent (don't collapse
    heart=`heritageAccent` + head/life=`accent` to one red — pair heart against ink or a tint); fix
    the `tone="onAccent"` heart-line contrast; add an opt-in `animate` stroke-on (dash-offset, shared
    `useReducedMotion`).
  - Verify: extend the `/dev/theme` logomark matrix (tone × variant × filled); screenshot light+dark;
    grep Logomark for raw hex (none); `tsc`+`jest` green.
  - DONE: Logomark rebuilt — heart line heaviest (1.2×), head/life lighter (0.8×) so they read as two
    lines; **two-tone pairs against ink** (`ink`→ink lines + vermilion heart whisper; `accent`→vermilion
    lines + ink heart) so it never collapses to one red; `heritage`/`onAccent` are mono (seal / on-fill
    contrast fix — heart no longer claret-on-accent). Renamed the heart override to `heartColor` (no
    external callers). Opt-in `animate` draw-on (dash-offset, head/life reveal then heart bloom; shared
    `useReducedMotion`; web/reduce-motion → static fully-drawn). Dropped an early base-cup experiment
    (read as a smudge). `/dev/theme` logomark matrix extended (ink/accent/onAccent-on-tile/stamp/stamp-
    filled/draw-on). tsc + lint(0) + jest **36/36**; grep no raw hex in Logomark; screenshots
    `docs/checkpoints/redesign/v5-launcher.png` (88px mark) + `v5-logomark.png` (matrix, light+dark).
    Live draw-on `[~]`. NB brand-asset generator (`scripts/gen-brand-assets.mjs`) still holds the old
    paths/indigo — regenerated in V9.
- [x] **V6 — PalmDiagram: per-line stagger + bloom, label-collision fix, `highlightColor`, silhouette** (2026-07-15)
  - Build: `PalmDiagram.tsx` — per-stroke start delay in classical order (heart→head→life→fate) so
    lines reveal in sequence; bloom the highlighted line's accent glow on completion; add a
    `highlightColor` prop (default `accent`); make the silhouette read as a hand (or derive from
    geometry bounds) and allow dropping it on ≤64px thumbnails. In `geometry.ts` (KEEP PURE) fix
    label placement — per-line anchor + screen-edge gutter + vertical nudge (fixes the Fate/Heart
    overlap) and expose the anchor so `PalmDiagram` sets `textAnchor`.
  - Verify: `geometry.test.ts` updated + green (pure module); `expo export` + screenshots of
    `/welcome` (labels) and a highlighted hero at 390×844 + 320 show no label overlapping a line and
    no clipping; grep for per-stroke `withDelay`; native draw-on `[~]`.
  - DONE: `geometry.ts` (pure) — labels now pinned to edge margins with a per-line `anchor` grown
    inward (heart/head→right/`end`, life→left/`start`, fate→center/`middle`), a 56u screen-edge
    gutter (clamped y), and a heart(−30)/head(+30) vertical nudge so the old Fate/Heart collision is
    gone; `LabelAnchor` type exposed → `PalmDiagram` sets `textAnchor`. `PalmDiagram` — each stroke
    draws on with a per-index `withDelay(i·stagger.reveal)` (classical order); highlighted glow
    **blooms** in (own `bloom` value, fail-safe/web → full glow); new `highlightColor` prop (default
    `accent` — the three-reds palm highlight; drives the gradient stops + glow); silhouette
    auto-drops on ≤64px thumbnails. `geometry.test.ts` +2 (anchor/gutter) → **9** green. tsc + lint(0)
    + jest **38/38**. Screens: `docs/checkpoints/redesign/v6-welcome{,-320}.png` (labels: no clip, no
    line-overlap, heart/head split) + `v6-history.png` (64px thumbs now silhouette-free, cleaner);
    palm highlight renders vermilion. Live stagger/bloom/draw-on `[~]`. (Silhouette shape kept as-is
    for large sizes — the concrete win is the thumbnail drop; a bespoke hand path is a later nicety.)
- [x] **V7 — AppHeader: press feedback + optional scroll divider** (2026-07-15)
  - Build: `AppHeader.tsx` — the back `Pressable` gets the shared reduce-motion-aware press
    affordance; add an optional `showDivider` bottom hairline (`border`) for scrolled content; keep
    `accessibilityLabel="Back"`.
  - Verify: add an `AppHeader showDivider` example to `/dev/theme`; screenshot 390×844; `tsc`+`jest`
    green; a11y label unchanged.
  - DONE: extracted `BackButton` with a reduce-motion-aware press-spring (icon scales to 0.9 on
    hold, held-state effect; web/reduce-motion → static 1); added `showDivider` (bottom hairline +
    paddingBottom) for scrolled content; `accessibilityLabel="Back"` unchanged. `/dev/theme` gains a
    `showDivider` header example. tsc + lint(0) + jest **38/38**;
    `docs/checkpoints/redesign/v7-header.png` (light+dark) shows the divider under "Scrolled content".
    Live press-spring `[~]`.
- [x] **V8 — Extend the `/dev/theme` harness to gate the new system** (2026-07-15)
  - Build: `app/src/app/dev/theme.tsx` — render pressed/active states, a pressable Card, the
    `danger`/`premium` buttons, the brand loader, the motion showcases (entrance/stagger sample,
    logomark + palm draw-on end-states), and the vermilion role swatches, all light+dark.
  - Verify: `expo export` + `/dev/theme` full-system screenshot (light+dark) shows every new
    primitive/state; `tsc`+`jest`+`lint` green.
  - DONE: harness now gates the whole Vermilion system (built incrementally across V3–V7, finished
    here). Added a **States** section — `accentPressed`/`premiumPressed`/`dangerPressed` swatches + a
    selected/active card (accentMuted + accent border) — and a third **palm draw-on end-state** with a
    caption. Already present: vermilion role swatches, full button matrix (primary/tonal/secondary/
    ghost/**danger**/**premium**/icon/**loading brand-loader**/pill/disabled), pressable Card + 3
    staggered-entrance cards, logomark matrix (ink/accent/onAccent/stamp/filled/**draw-on**), header +
    **showDivider**, elevation, icon sheet. tsc + lint(0) + jest **38/38**; full-system screenshot
    `docs/checkpoints/redesign/v8-devtheme-full.png` (light+dark). **V0 FOUNDATION COMPLETE (V1–V8).**

## PHASE V1 — The journey (user-journey order) — every surface: recolor + one motion beat + craft

- [x] **V9 — Launcher** (`app/src/app/index.tsx`) — Logomark **draw-on** + lockup/CTA **entrance
  stagger**; a faint token-driven brand-background (echo the welcome ghost-hand) so it isn't a blank
  page; resolve the mark/CTA accent (single vermilion CTA owns accent; mark reads ink + heart-line
  whisper); rebalance composition + tighter mark→wordmark lockup; group the legal caption under the
  CTA; gate the "Dev · route map" button behind `__DEV__`; drop the `maxWidth:280` literal.
  Verify: screenshots 390×844 + 320, light+dark — no dev button in a `__DEV__=false` build, balanced
  composition, drawn-mark end-state; grep no CJK/raw-hex; motion `[~]`. (2026-07-15)
  - DONE: launcher rebuilt — faint ghost-hand `PalmDiagram` background (opacity 0.07, decorative)
    so it isn't blank; `Logomark tone="ink" animate` (draw-on; ink lines + vermilion heart whisper,
    the single CTA owns the accent); wordmark + tagline + footer **stagger in** (`FadeInDown`, gated,
    web/reduce-motion static); tight mark→wordmark lockup (spacing.sm); legal grouped under the CTA;
    dev button `{__DEV__ ? … : null}`; `maxWidth:280` dropped. tsc + lint(0) + jest **38/38**; grep no
    CJK/raw-hex. Screens `docs/checkpoints/redesign/v9-launcher-{light,320,dark}.png` — balanced,
    drawn-mark end-state, **no dev button** (the production `expo export` has `__DEV__=false`), no
    clip at 320. Entrance/draw-on `[~]`.
  - **Dark-verification tooling** (enables light+dark for V9–V23): react-native-web's `useColorScheme`
    is light-only in a static web export and a client-side scheme flip won't re-commit against the
    pre-rendered light HTML — so added a **build-time** `EXPO_PUBLIC_FORCE_SCHEME` override on the root
    `ThemeProvider` (`app/src/app/_layout.tsx`, inert in normal builds). Dark shots =
    `EXPO_PUBLIC_FORCE_SCHEME=dark npx expo export` then `shoot.mjs`; light = normal export.
  - NB brand-asset PNGs (`scripts/gen-brand-assets.mjs`) still hold indigo/old paths — OUT of the
    redesign-loop route scope (a build script, not a rendered route; a correct regen must apply V5's
    two-tone rules to the icon generator). Tracked as a separate brand-asset follow-up, not a blocker.
- [x] **V10 — Onboarding** (`(onboarding)/welcome|how-it-works|hand-select|claim.tsx`) — welcome:
  drop `showLabels` on the hero (de-clutter), add a Logomark, stagger headline/subhead/CTA;
  how-it-works: **animate the three steps** (stagger + icon pop, spec §A2); hand-select:
  Animated.Pressable **press-spring + animated selection** + wrap in `accessibilityRole="radiogroup"`;
  claim: **draw the red thread** between avatars + fade/scale them, add the privacy trust line, fix
  the avatar asymmetry ('M' vs 'You'); give `(onboarding)/_layout.tsx` a branded spring slide+fade
  transition (reduce-motion → fade/none). Verify: web route-map walks all four at 390×844 (+320),
  light+dark; grep `showLabels` gone from welcome, `radiogroup` present, reduce-motion gates present;
  motion `[~]`. (2026-07-15)
  - DONE: **welcome** — label-free palm hero + small `Logomark tone="ink"` + headline/subhead/CTA
    stagger (`FadeInDown`, gated). **how-it-works** — step cards stagger via Card `entranceIndex` + an
    icon `ZoomIn` pop; trust card rises in. **hand-select** — `HandCard` press-spring (held-state,
    gated) + the selection check `ZoomIn` pops in; cards wrapped in `accessibilityRole="radiogroup"`.
    **claim** — red thread **draws on** (`RedThread animate`, claret, the sole heritage use), avatars
    `ZoomIn`, symmetric now (inviter initial vs the Palmly brand mark, **both accent** — moved the
    inviter off heritage per §3.2), `PrivacyBadge` trust line added. **`(onboarding)/_layout.tsx`** —
    `animation: reduceMotion ? 'none' : 'slide_from_right'` (native; web ignores → screenshots capture
    the settled frame). Also added an opt-in `animate` draw-on to the shared `RedThread`. tsc + lint(0)
    + jest **38/38**; grep: `showLabels` gone from welcome, `radiogroup` present, `useReducedMotion` in
    all 5 files, no CJK/raw-hex. Screens `docs/checkpoints/redesign/v10-{welcome,hiw,hand,claim}.png`
    (light) + `v10-{welcome,hiw,hand,claim}-dark.png` (dark) + `v10-{hand,welcome}-320.png` (no clip).
    Live stagger/pop/press-spring/thread-draw/slide `[~]`.
- [x] **V11 — Capture** (`(capture)/primer|palm|face.tsx` + `features/capture/CaptureView.tsx`) —
  route `OVERLAY.guideReady` + the shutter ring from `theme.colors.accent` (**kill the gold
  `#D9B25A`**); animate the auto-capture ring fill (~800ms, reanimated, reduce-motion → static);
  press-spring + haptics on shutter/controls/toggle; fix the non-uniform guide `Svg` scale
  (320×320 uniform + center the path/oval); a branded primer hero + staggered entrance (keep the 3
  versioned consent strings verbatim); **announce guidance for a11y** (`accessibilityLiveRegion` +
  `announceForAccessibility`) + replace the raw `?` with a designed `help` `Icon`.
  Verify: grep `#D9B25A` → none; screenshots `/primer`,`/palm`,`/face` at 390×844 (+320) show a red
  ready-guide/ring, undistorted guides, branded hero; live ring/feed/haptics `[~]`. (2026-07-15)
  - DONE: `CaptureView` — removed `OVERLAY.guideReady` gold; the ready guide + auto-capture ring now
    read `theme.colors.accent` (vermilion light / coral dark on the dark feed); ring **fills ~800ms**
    when ready (reanimated `AnimatedCircle`, reduce-motion/web → static end-state ~0.7); **press-spring**
    on shutter/controls/toggle (shared `usePressScale`, gated); guide `Svg` now **uniform 320×320**
    (undistorted hand/oval); **a11y** — instruction pill is an `accessibilityLiveRegion="polite"` +
    `announceForAccessibility` on change; the raw `?` → the new `help` `Icon`. Added the `help` icon
    (circle + question glyph) to the in-house set. `primer` — branded camera hero (`ZoomIn`) +
    staggered entrance; the 3 versioned consent strings kept **verbatim**. palm/face unchanged (props
    only). tsc + lint(0) + jest **38/38**; grep: capture has no `#D9B25A` (only the legit `premium`
    token remains) and no raw `?` glyph. Screens `docs/checkpoints/redesign/v11-{primer,palm,face}.png`
    + `-dark` + `primer-320` — vermilion/coral ready guide + ring, undistorted guides, branded primer.
    Live ring-fill / press-spring / haptics / camera-feed / landmark `[~]`.
- [x] **V12 — Analyzing** (`features/reading/AnalyzingView.tsx` + `analyzing.ts`) — remove
  `animate={false}` + `key={stage}` so the palm **self-draws per revealed line**; make the ring
  **live** (animated sweep via `withTiming` + a LinearGradient accent→accentPressed + an ambient
  breath so it never reads hung); animate StepDots + crossfade the stage message; **rotate + elevate**
  the social-proof line (the 3-item array never rotates today); redesign the **failed** state to stay
  Palmly (faint palm behind, warm `heritage`/`danger` tone not the CTA hue, entrance); add
  `AppHeader onBack` to the loading branch (dead prop today) + tokenize magic numbers.
  Verify: grep no `animate={false}`; screenshots of `/(reading)/analyzing` + `/dev/analyzing-failed`
  at 390×844 show traced lines + gradient ring + warm failed state; `jest` (rotation index test)
  green; live sweep/draw `[~]`. (2026-07-15)
  - DONE: main palm now `animate` (each revealed line self-draws via V6 per-stroke stagger; the
    reconciler keeps drawn lines and draws only the newly-revealed one — no `key={stage}`). **Live
    ring** — `ProgressRing` sweeps its dashoffset with `withTiming`, strokes an accent→accentPressed
    `LinearGradient`, and a faint accent glow ring **breathes** (`withRepeat`) so it never reads hung
    (web/reduce-motion → settled static). **StepDots** active dot animates its width; **stage message**
    crossfades (`FadeIn`/`FadeOut` keyed); **social proof** now rotates (`socialProofAt(elapsedMs)`)
    and is **elevated** into a surfaceSunken chip with a sparkle. **Failed** state stays Palmly — a
    faint palm ghost behind, the icon on a neutral tile in a warm `danger` tone (off the CTA accent),
    `FadeIn` entrance. `AppHeader onBack` wired on the loading branch. `analyzing.ts` gains
    `socialProofAt` + `SOCIAL_PROOF_MS`; test +1 (rotation/wrap) → **39**. tsc + lint(0) + jest 39/39;
    grep: no `animate={false}` in AnalyzingView. Screens
    `docs/checkpoints/redesign/v12-{analyzing,failed}{,-dark}.png` — gradient ring + breath, traced
    lines, animated dots, rotating chip, warm failed state. Live sweep/draw/breath/crossfade `[~]`.
- [x] **V13 — Reveal** (`features/reading/RevealView.tsx` + `reveal.ts` + `dev/reveal-pending.tsx`) —
  hero headline → **`variant="editorialHeadline"`** (the one sanctioned serif, this screen only);
  choreograph entrance (draw → headline rise → **90ms** section stagger); rebuild **pending** into a
  living "drawing" moment (drop `animate={false}`, pass signature lines, breathing pulse, rotating
  reassurance); section cards **echo their line** + fix the duplicate/loose `SECTION_ICON` mapping
  (hand_shape→`palm`, distinct icons, no triple `sparkle`); turn the share FAB into a **branded seal**
  with press + scroll-triggered entrance; add a locked-card **teaser** (real title + blurred tease,
  `PREVIEW_READING` body currently `''`); fix the **error identity** (drop `sparkle`; make "Try again"
  honest, not a silent `back()`); add a `/dev/reveal-error` preview. Verify: screenshots reveal +
  pending + error at 390×844 (+320) — serif hero, living pending, teasers, warm error; grep no
  `sparkle` in error, `editorialHeadline` present; entrance/scroll-spring `[~]`. (2026-07-15)
  - DONE: hero headline → **`editorialHeadline`** (the one serif); palm draws on then headline +
    every card **stagger** in via `FadeInDown.delay(i·stagger.reveal=90ms)`. **Pending** rebuilt into
    a living "Drawing your reading…" moment — palm self-draws (signature lines) + **breathes**
    (`withRepeat`) + a **rotating** reassurance (`useRotating`, web holds line 0). `SECTION_ICON` fixed
    to distinct icons (hand_shape→**palm**, markings the only `sparkle`; face-offer→**face**) — the
    triple-sparkle is gone. Share FAB → a **branded claret seal** (`Logomark stamp filled tone=heritage`)
    with a press-spring + `FadeIn` entrance (§3.2: seal in heritage, not accent). **Locked cards** now
    tease — real title + a faded/truncated `teaser` (added to `reveal.ts` + the two locked previews) +
    "Unlock with Premium". **Error** identity fixed — dropped the misleading `sparkle` for a faint
    palm ghost (still-Palmly); **honest** CTAs: "Try again" only when `onRetry` exists + an explicit
    "Go back" (no silent `back()`). New `/dev/reveal-error` (passes a real `onRetry`) + added to the
    dev route map. tsc + lint(0) + jest **39/39**; grep: `editorialHeadline` present, no `sparkle` in
    the error path. Screens `docs/checkpoints/redesign/v13-{reveal,reveal-full,reveal-320,pending,
    error}{,-dark}.png` — serif hero, living pending, teasers, claret seal FAB, honest error. Live
    stagger/draw/breath/press/scroll-in `[~]`. (Section "echo their line" = the fixed per-section
    line-icons; a mini-palm echo per card was left out to avoid clutter/perf — noted.)
- [x] **V14 — Share** (`features/reading/ShareView.tsx` + `(modals)/share.tsx` + `dev/share-compat.tsx`)
  — remove `animate={false}` (palm draw-on back on) + crossfade the solo/compat variant swap; spring
  the `Toggle` thumb (`translateX`) + `Segment` (press-scale + animated selection indicator, wrap in
  `tablist`); make `CHANNELS` real `Pressable`s (onPress stub, `accessibilityRole/Label`, pressed
  spring, `accentMuted` tint); fix the floating-card vertical rhythm (top-anchored, no tab-switch
  jump); bring **compat** to spec — `blurb`+`chips` props, red thread connecting **heart lines** in
  `accent`, labeled score ring; editorial hero headline + **filled** corner seal (heritage claret).
  Verify: screenshots solo + `/dev/share-compat` at 390×844 (+320) — tightened rhythm, thread+chips+
  labeled ring, branded channels, filled seal; grep no `animate={false}`, no raw hex; motion `[~]`. (2026-07-15)
  - DONE: both preview palms `animate` (draw-on); solo/compat now **crossfade** (`FadeIn` keyed) in a
    **top-anchored** slot (no tab-switch jump). `Toggle` thumb **springs** via `translateX`; `Segment`
    gets a press-scale, the row is a `tablist`, each tab a `tab`. `CHANNELS` are real `ChannelButton`
    `Pressable`s (press-spring, `accentMuted` circle, a11y label). **Compat** to spec — new `blurb` +
    `chips` props (dimension pills), both palms **highlight `heart_line`** (accent) tied by the claret
    `RedThread animate`, a **labeled** `ScoreRing` ("COMPATIBILITY" below the ring — moved out to avoid
    arc overlap). Card headline → **editorial serif** (24px) + a **filled** claret corner seal
    (`Logomark stamp filled tone=heritage`). tsc + lint(0) + jest **39/39**; grep no `animate={false}`
    / no raw hex in ShareView. Screens `docs/checkpoints/redesign/v14-share-{solo,compat}{,-dark}.png`
    + `compat-320`. Live crossfade/toggle-spring/press/draw/thread `[~]`.
- [x] **V15 — Pair-reveal + claim** (`features/reading/PairRevealView.tsx` + `(reading)/pair.tsx` +
  `(onboarding)/claim.tsx`) — build the **second choreographed peak**: palms slide in from opposite
  edges (Animated.View translateX + `animate` true), the **red thread draws (~800ms)**, the **score
  ring counts up** 0→N (gold), sub-scores **fan in** (width 0→value, `withDelay(i*90)`) with
  **dimension icons** (Emotion→heart, Mind→mind, Energy→life, Destiny→path, Elements→new glyph); one
  **success haptic** on score-landing (native); distinct `accessibilityLabel` per palm + a spoken
  score summary; tighten so the number is the headline; rebuild **claim** around a brand-artifact
  avatar + the drawn thread + the privacy trust line; press-spring the payoff CTAs. Verify:
  screenshots `/(reading)/pair` + `/(onboarding)/claim` at 390×844 (+320) show the full static
  end-state (thread drawn, bars full+iconed, score placed, trust line); grep reduce-motion gate + two
  distinct a11y labels; choreography/haptic `[~]`. (2026-07-15)
  - DONE: PairRevealView — palms **slide in** from opposite edges (`SlideInLeft`/`SlideInRight`) + draw
    on (`animate`), each with a **distinct a11y label** ("Your palm" / "{partner}'s palm"); `RedThread
    animate`; the **`ScoreRing` counts up** 0→N + its arc sweeps (new `animate` prop + `useCountUp`
    hook + `AnimatedCircle` in ShareView; web/reduce-motion → static N) and is the **headline** (148px,
    "COMPATIBILITY"); the score region carries a **spoken summary** ("You and Mei — 82 out of 100
    compatible"). Sub-scores **fan in** (width 0→value, `withDelay(i·90)`) each with a **dimension
    icon** — added a new **`elements`** glyph (pentagon + centre) to the icon set (Emotion→heart,
    Mind→mind, Energy→life, Destiny→path, Elements→elements). Payoff CTAs press-spring (V3 Button).
    Success haptic deferred `[~]` (dep). **Claim** already met the spec in V10 (Logomark brand-artifact
    avatar + `RedThread animate` + `PrivacyBadge` trust line + press-spring CTAs) — re-verified, no
    change. tsc + lint(0) + jest **39/39**; grep: `useReducedMotion` gate + two distinct palm labels.
    Screens `docs/checkpoints/redesign/v15-{pair,pair-320,claim}{,-dark}.png`. Choreography/count-up/
    fan/haptic `[~]`.
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
- V2 — Added `motion` tokens (duration/easing-tuples/spring/stagger) surfaced on `Theme` + shared `useReducedMotion()` hook; refactored PalmDiagram + ChatThread onto it — tsc + lint(0) + jest 36/36 (motion.test.ts); grep confirms hook is sole `isReduceMotionEnabled` caller; palm/chat static end-states unchanged (`v2-*.png`) — 2026-07-15
- V3 — Button: press-spring (0.97, reduce-motion/web gated), `danger`+`premium` variants, 3-dot brand loader (width-reserved, replaces ActivityIndicator), tokenized heights (`controlHeight`)/gap; added `dangerPressed` to all skins; migrated PrivacyCenter delete to `variant="danger"` — tsc + lint(0) + jest 36/36; `docs/checkpoints/redesign/v3-buttons.png` light+dark full matrix, resting scale=1; haptics deferred ([~], dep not installed) — 2026-07-15
- V4 — Card: `onPress` press-spring (0.985) + `pressedTint` (sunken/accentMuted), `entranceIndex` FadeInDown stagger (reduce-motion/web → static); migrated history ReadingRow + fortune RedThreadRow/RowLink off `<Pressable><Card>` (index-staggered) — tsc + lint(0) + jest 36/36; `v4-{fortune,history,theme-cards}.png` light+dark; PaywallView/RevealView Card-rows deferred to V16/V13 — 2026-07-15
- V5 — Logomark: heart heaviest + two-tone paired against ink (accent-safe), heritage/onAccent mono (onAccent contrast fix), opt-in `animate` draw-on (web/reduce-motion static); `/dev/theme` matrix extended — tsc + lint(0) + jest 36/36; `v5-{launcher,logomark}.png` light+dark; no raw hex in Logomark — 2026-07-15
- V6 — PalmDiagram: per-stroke `withDelay` stagger (classical order) + highlighted-glow bloom + `highlightColor` prop (default accent) + silhouette auto-drop ≤64px; geometry.ts label placement fixed (edge-margin anchor + gutter + heart/head nudge, `LabelAnchor` exposed → `textAnchor`) — tsc + lint(0) + jest 38/38 (geometry 9); `v6-welcome{,-320}.png` no clip/overlap, `v6-history.png` clean thumbs — 2026-07-15
- V7 — AppHeader: `BackButton` reduce-motion-aware press-spring (icon 0.9, web/static safe) + optional `showDivider` bottom hairline; a11y "Back" unchanged; `/dev/theme` example — tsc + lint(0) + jest 38/38; `v7-header.png` light+dark shows the divider — 2026-07-15
- V8 — `/dev/theme` full-system harness: added States (pressed swatches + selected card) + palm draw-on end-state; whole Vermilion system now gated in one surface (light+dark) — tsc + lint(0) + jest 38/38; `v8-devtheme-full.png`. **V0 foundation (V1–V8) complete** — 2026-07-15
- V9 — Launcher: ghost-hand brand bg, `Logomark tone="ink" animate` draw-on (ink + vermilion heart whisper), staggered wordmark/tagline/CTA, legal under CTA, `__DEV__`-gated dev button, dropped maxWidth literal; added build-time `EXPO_PUBLIC_FORCE_SCHEME` dark-shot tooling — tsc + lint(0) + jest 38/38; `v9-launcher-{light,320,dark}.png`, no dev button in prod export, no CJK/hex — 2026-07-15
- V10 — Onboarding: welcome label-free hero + Logomark + stagger; how-it-works staggered step cards + icon pop; hand-select press-spring + animated selection + radiogroup; claim drawn red thread + symmetric accent avatars (brand mark for "you") + privacy line; onboarding slide transition; opt-in `RedThread animate` — tsc + lint(0) + jest 38/38; `v10-*{,-dark,-320}.png` (4 routes, light+dark) — 2026-07-15
- V11 — Capture: ready guide + shutter ring from `theme.colors.accent` (gold killed), ~800ms ring fill, press-spring on controls, uniform 320×320 guide, a11y live-region + announce, new `help` icon (no raw `?`), branded staggered primer (consent verbatim) — tsc + lint(0) + jest 38/38; `v11-{primer,palm,face}{,-dark}.png` + primer-320, vermilion/coral guide, undistorted — 2026-07-15
- V12 — Analyzing: palm self-draws per revealed line, live gradient ring (sweep + accent→accentPressed + breathing glow), animated step dots, crossfading message, rotating+elevated social-proof chip (`socialProofAt`), still-Palmly failed state (faint palm + danger tone + entrance), header wired — tsc + lint(0) + jest 39/39 (rotation test); `v12-{analyzing,failed}{,-dark}.png` — 2026-07-15
- V13 — Reveal: editorial serif hero, draw→headline→90ms card stagger, living "drawing" pending (self-draw + breath + rotating reassurance), distinct section icons (no triple sparkle), claret Logomark-stamp seal FAB, locked-card teasers (faded), honest error (faint palm, Try again/Go back, no sparkle) + `/dev/reveal-error` — tsc + lint(0) + jest 39/39; `v13-{reveal,reveal-full,reveal-320,pending,error}{,-dark}.png` — 2026-07-15
- V14 — Share: palms draw on, solo/compat crossfade in a top-anchored slot, spring toggle thumb + segment press-scale (tablist), real tappable channels, compat card (heart-line accent + claret thread + labeled ScoreRing + chips), editorial 24px headline + filled claret seal — tsc + lint(0) + jest 39/39; `v14-share-{solo,compat}{,-dark}.png` + compat-320 — 2026-07-15
- V15 — Pair-reveal: palms slide in (SlideInLeft/Right) + draw on w/ distinct a11y labels, RedThread draws, ScoreRing counts up 0→N (new `animate` + `useCountUp`) as the headline + spoken summary, sub-scores fan in with dimension icons (new `elements` glyph); claim verified (V10 met spec) — tsc + lint(0) + jest 39/39; `v15-{pair,pair-320,claim}{,-dark}.png` — 2026-07-15
