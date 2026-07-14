# Palmly — UI/UX Redesign Task Ledger

**Design source of truth:** `Planning/UIUX-Redesign.md` (the "Quiet Cosmos" north star).
**Screen behavior / flows / content:** still `Planning/UIUX-specs.md`.
This ledger is a checkbox task machine, same conventions as `MVP_Buildplan.md`.

Checkbox: `[ ]` not started · `[~]` in progress/partial · `[x]` done+verified · `[!]` blocked.

---

## STATE

- **Active skin:** **Quiet Cosmos (skin #2)** — now the default; Ink & Cinnabar retained as skin #1 for the optional zh view.
- **Last completed:** R6 (Icon component + 19-icon line set; barrel-exported; dev icon sheet)
- **Next task:** R7
- **Blocked on:** —
- **Notes for next run:** R7 = rebuild `SealBadge.tsx` → a CJK-free `Logomark` (stylized
  palm + three lines) in react-native-svg; expose a small `stamp` size for the share-card
  corner only; author a new app-icon + splash asset set (app.json `icon`/adaptiveIcon
  foreground/splash image point at the new assets). `Icon` set exists now (`@/components/ui`,
  names in `IconName`). SealBadge is still used by /dev/theme header + the "Card & seal"
  section — swap those to Logomark. SealBadge also still references `fonts.cjk`; once it's gone,
  only PalmDiagram (R10) keeps `fonts.cjk`. NOTE for R7 asset authoring: PNG icon/splash assets
  are binary — generating them device-free is hard; if blocked, build the `Logomark` SVG + mark
  the raster app-icon/splash export leg `[~]` (device/asset-pipeline pending), same honesty
  convention as camera/paywall. Screenshot: `app/scripts/shoot.mjs`. Foundation R1–R10 first.

---

## EXECUTION PROTOCOL (per iteration)

1. **Re-ground:** read `Planning/UIUX-Redesign.md` in full, then this ledger. Read the exact
   spec sections behind the screen you're touching in `Planning/UIUX-specs.md`.
2. **Pick** the first task in document order that is `[ ]` or `[~]`.
3. **Build** it to the north star. Read the current file(s) first; match surrounding code
   style. Use **only design tokens** (no raw hexes in components). Keep realistic,
   non-lorem content in every screen.
4. **Verify** with the task's Verify line. Static gates first (`tsc --noEmit`, `expo lint`,
   `jest`, all from `app/`), then the visual check (web export + headless-Chrome screenshot
   at 390×844, save under `docs/checkpoints/redesign/`). For native-only surfaces (camera,
   paywall, reanimated motion) verify the layout via fixture stand-ins and mark the on-device
   leg `[~]` — never fake a green you didn't see.
5. **Only when Verify passes:** mark `[x]` + today's date, add a one-line Build Log entry
   with evidence (the screenshot path / test counts), update STATE, and
   `git commit` as `R#.T# <description>`.
6. If a task fails 3 genuinely different approaches → `[!]`, record what you tried, set STATE
   "Blocked on", move on to the next unblocked task.
7. **Loop control:** keep going while context allows; before it runs low, park the in-flight
   task `[~]` with a resume note, update STATE, commit, end the iteration. When every task is
   `[x]` (or the rest are `[!]`), give a final report and stop.

**Standing rules:** never break backend/edge-function *logic* (only re-skin the server SVG/
HTML in R16b/R16c). Preserve `ThemeProvider`'s `forceScheme` prop (the `/dev/theme` harness
renders light+dark side-by-side with it). Ship back-compat token aliases (don't rename-break).
Every new icon gets an `accessibilityLabel`; every new animation gets a reduce-motion fallback.

---

## PHASE R0 — Design-system foundation

- [x] **R1 — Re-tokenize color into role-based semantic tokens + swappable skin + aliases** _(2026-07-14)_
  - Build: in `app/src/theme/tokens.ts` split the raw palette into a named `skin` object;
    add a role-based semantic map (`bg surface surfaceRaised surfaceSunken border textPrimary
    textSecondary textTertiary accent accentPressed accentMuted onAccent heritageAccent
    premium onPremium success danger scrim`). Rewrite `theme.ts` light/dark to consume roles,
    keeping **Ink & Cinnabar as the active skin so nothing changes visually yet**. Ship
    **back-compat aliases** (`gold`→`premium`, `jade`→`success`, keep `seal`) and keep the
    `Text` `Tone='gold'|'jade'|'onGold'` names working so no consumer breaks.
  - Verify: `tsc --noEmit` + `jest` green; rewrite `app/src/theme/__tests__/tokens.test.ts`
    to assert the new role contract; grep shows consumers still compile.
- [x] **R2 — Add the "Quiet Cosmos" palette values + dark-tuned accent; fix app.json colors** _(2026-07-14)_
  - Build: add skin #2 with the §3 hexes (light + dark) and make it active. Give dark accents
    explicit dark-tuned values. Update `app.json` `android.adaptiveIcon.backgroundColor` and
    the `expo-splash-screen` colors off cinnabar/rice-paper.
  - Verify: extend `/dev/theme`, headless-screenshot light+dark; no raw cinnabar CTA remains;
    dark mode no longer reads festive.
- [x] **R3 — Sans-first typography; optional editorial serif; drop TC from default** _(2026-07-14)_
  - Build: repoint `display/title/heading/numeral` to the Noto Sans weight ramp (add weights
    to `fontModules` — no new dep). Keep Noto Serif Display as optional `editorialHeadline`;
    remove Noto Serif TC from the default scale (load only under zh). Revisit the `Text.tsx`
    <18pt accent guard.
  - Verify: `/dev/theme` shows sans headlines; grep confirms no default use of `fonts.cjk`;
    `tsc`/`jest` green.
- [x] **R4 — Elevation/shadow scale + surfaceRaised + rounded-rect radii; Card elevation** _(2026-07-14)_
  - Build: add `shadow.sm/md/lg` (iOS + Android `elevation`) + `surfaceRaised`; add an
    `elevation` prop to `Card.tsx` (keep flat option); make `radii.md 12` the default corner.
  - Verify: harness renders a lifted card next to a flat card, light+dark.
- [x] **R5 — Broaden the Button primitive** _(2026-07-14)_
  - Build: `Button.tsx` — add rounded-rect radius (new default) + `pill` option; add `tonal`,
    `loading`, `icon` variants; explicit disabled/pressed tokens (not opacity-only); map
    intents to the new accent.
  - Verify: harness renders the full matrix (primary/secondary/ghost/tonal × default/pressed/
    disabled/loading/with-icon) screenshot; `tsc`/`jest` green.
- [x] **R6 — In-house svg line-icon set (replace emoji + CJK glyphs)** _(2026-07-14)_
  - Build: an `Icon` component + set in `react-native-svg`: heart, mind, life, path, lock,
    share, send, streak, thread, chevron, back (+ any others screens need). Each with an
    `accessibilityLabel`. No new library.
  - Verify: harness renders an icon sheet; `tsc` green.
- [ ] **R7 — Rebuild SealBadge → CJK-free Logomark + new app-icon/splash set**
  - Build: replace `SealBadge.tsx` (掌/印 glyph + Noto Serif TC coupling) with a stylized
    palm+three-lines `Logomark` in `react-native-svg`; expose a small `stamp` size for the
    share-card corner only. Author a new app-icon + splash asset set.
  - Verify: harness renders the logomark light+dark; grep confirms Noto Serif TC no longer
    required to render the brand mark; app.json icon/splash point at the new assets.
- [ ] **R8 — Remove the dead-scaffold cluster (bigger than just collapsible)**
  - Build: delete/rebuild the Expo-template legacy cluster on the *second* theme system:
    `components/ui/collapsible.tsx`, `themed-text.tsx`, `themed-view.tsx`,
    `animated-icon.tsx(.web)`, `hint-row.tsx`, `web-badge.tsx`, `external-link.tsx`, plus the
    orphan `@/constants/theme.ts` + `@/hooks/use-theme.ts`/`use-color-scheme.ts` (a separate
    `useTheme` + blue `#3c87f7`) and Expo-branded assets (`expo-logo.png`, `logo-glow.png`,
    `expo-badge*.png`). Keep only what's actually imported by real screens.
  - Verify: `tsc --noEmit` + `eslint` clean; grep finds no imports of removed modules; only
    the real design system remains.
- [ ] **R9 — Shared AppHeader + nav shell; dedupe the privacy line**
  - Build: an `AppHeader` (back affordance + optional title) adopted across reveal/chat/
    history/fortune/settings (currently `headerShown:false` + inline serif titles). Reduce the
    repeated "✓ Photo deleted" to **one** prominent placement per surface.
  - Verify: screenshots show a header + back; grep shows the privacy string once per screen.
- [ ] **R10 — Upgrade the PalmDiagram hero + de-CJK labels + draw-on animation**
  - Build: `PalmDiagram.tsx`/`geometry.ts` — soft hand silhouette/negative space, richer
    multi-point geometry, weighted/gradient ink; recolor highlight to the new accent;
    `showLabels` default off / English; implement the real ~1.2s reanimated draw-on (currently
    stubbed) with a reduce-motion fallback.
  - Verify: `geometry.test.ts` stays green; analyzing + reveal screenshots show a premium
    hand-like diagram (not floating strokes); record a gif of the draw-on if web-capturable.

## PHASE R1 — The journey (built + placeholder), in user-journey order

- [ ] **R11 — Redesign the launcher** (`app/src/app/index.tsx`) — logomark + English tagline
  ("Read your palm from a single photo"); new-accent primary CTA; no CJK. Verify: screenshot,
  no CJK on first screen.
- [ ] **R12 — Build onboarding welcome / how-it-works / hand-select** (3 `(onboarding)`
  placeholders → real screens): brand moment (logomark reveal + value prop), a 3-step
  explainer using line-icons + the upgraded PalmDiagram, a two-card hand-select with elevation
  + selected state. Realistic English copy. Verify: dev route-map walks all three; no
  `PlaceholderScreen`.
- [ ] **R13 — Build capture primer / palm / face** (3 `(capture)` placeholders → real UI):
  calm permission/consent primer (photo-deleted reassurance + Allow / upload-instead), guided
  palm + face capture states (align/hold/captured) with a modern framing guide + new-accent
  active/locked. Use **fixture stand-ins** for the camera feed so layout is screenshot-able;
  mark the live-camera leg `[~]`. Verify: screenshots of each state; no `PlaceholderScreen` in
  `(capture)`.
- [ ] **R14 — Redesign the Analyzing loader** — center the upgraded PalmDiagram + real tracing
  animation; add a progress ring / step indicator; give the message vertical presence; reframe
  `analyzing.ts` copy off ethnicity. **Also design the `failed`/retry state** (`useScanStatus`
  models it). Verify: happy + failed screenshots; no empty/unfinished read.
- [ ] **R15 — Redesign the Reveal screen** — remove cinnabar CJK section glyphs → feature
  line-icons; sans-first headline (fixes the 34px serif wrap); vary/drop the repeated 92px
  thumbnails; standard lock icon (drop 锁); share icon (keep the seal special, one mark);
  English-lead 面相/三才纹 titles; recolor the highlighted line; **add a pending/error state.**
  Verify: screenshot — no decorative CJK, headline fits, one privacy line.
- [ ] **R16 — Build the Share modal + modernize compat/red-thread** — `(modals)/share` → real
  share sheet: preview cards with the traced diagram as ~60% hero + a small corner seal, a
  modern channel row, a compatibility variant with a lightened red-thread (svg, not 🔴) +
  score ring. Update `RevealView` CompareCard + `FortuneHome` RedThreadRow. Provide a
  share-preview fixture. Verify: screenshots; grep shows no 🔴.
- [ ] **R16b — Reskin the SERVER share card** (`supabase/functions/_shared/card-svg.ts`) — new
  palette (factor to ONE shared palette source so the app preview + posted image match),
  English line labels, CJK-free corner seal, sans headline. Re-pin `card-svg.test.ts`. Verify:
  render a sample card SVG → screenshot matches the app's share preview; Deno test green.
- [ ] **R16c — Reskin the invite landing page** (`supabase/functions/_shared/invite-page.ts` +
  `buildInviteGonePage`) — new palette/CTA/typography, CJK-free, English-first. Re-pin
  `invite-page.test.ts`. Verify: render the HTML → screenshot; Deno test green.
- [ ] **R16d — Build the in-app invite-claim / pair-reveal recipient route** — the receiving
  end of the red-thread loop (currently no route exists though `scheme:"palmly"` is declared).
  A claim/landing screen + the compatibility pair-reveal screen (score ring + both-sides
  narrative), seeded with a fixture. Verify: dev route-map reaches it; screenshots.
- [ ] **R17 — Build the Paywall modal** — `(modals)/paywall` → clean modern paywall: value
  stack, plan cards with elevation + rounded-rect, gold reserved as the single premium marker,
  one confident primary CTA in the new accent. Provide plan-card fixtures (names/prices/no-trial
  copy). Mark the RevenueCat-native leg `[~]`. Verify: phone-size screenshot; no cinnabar fill.
- [ ] **R18 — De-almanac the Fortune home + card** — lead with weekday + date, demote 己丑日 to
  a small optional detail; split Do/Avoid, aspects, lucky stats into distinct grouped sections
  with real spacing (fix `gap:1` cram); 宜/忌 → Do/Avoid, drop 事业/感情/财运 CJK tags;
  rename/drop the "Cinnabar red" lucky colour; designed streak component + svg icon (drop 🔥);
  **add the empty/first-run state.** Verify: premium + free screenshots — calm hierarchy, no
  CJK, no edge-clipped streak.
- [ ] **R19 — Redesign the Chat thread + flesh the fixture** — expand `PREVIEW_THREAD` to a
  realistic 3–4 turn conversation; add a premium empty/first-run state + a streaming/typing
  indicator; make `PREVIEW_CHIPS` distinct from asked questions (drop the duplicate first
  chip); elevate the "Cites your…" grounding line; replace the "↑" glyph with the send icon and
  the 问 gate seal with a neutral chat icon. Verify: screenshot — full conversation (no void),
  typing indicator, distinct chips.
- [ ] **R20 — Redesign the History shelf** — replace row CJK 掌/面 glyphs with a small type
  line-icon; show the privacy line once (header badge) not per row; keep the "unchanged"
  consistency brag on the `success` token; vary thumbnails; **add the empty (zero-readings)
  state.** Verify: screenshot — no per-row CJK, one privacy signal.
- [ ] **R21 — Migrate the Settings suite** — token-migrate SettingsHub/Notifications/
  Methodology/Privacy/Legal; adopt `AppHeader`. In `MethodologyScreen.tsx` replace 一/二/三 with
  1/2/3 or step icons and strip inline CJK (心/智/命/运, 手相, 面相) leading English; map
  jade→success, gold→premium/notice, destructive-confirm→danger token; wire the Language row
  toward the optional zh "traditional view". Verify: screenshots of all five; grep confirms no
  CJK in Methodology; confirm the notifications right-edge clipping was only a capture artifact
  (re-shoot at 320 + 390 wide).

## PHASE R2 — Content, accessibility, finalize

- [ ] **R22 — Re-author fixtures to universal English** — sweep `PREVIEW_*` in `reveal.ts,
  fortune.ts, chat.ts, history.ts, analyzing.ts` to universally-legible English (trim
  xuanxue/almanac phrasing + classical CJK citations) while keeping the warm, specific, human
  quality. Optionally add zh-locale strings for the "traditional view". Verify: every built
  screen still renders realistic (non-lorem) content; grep finds no stray CJK outside zh.
- [ ] **R23 — Accessibility pass** — `accessibilityLabel`/`accessibilityRole` on all new svg
  icons; `AccessibilityInfo.isReduceMotionEnabled` fallbacks on the PalmDiagram draw-on,
  analyzing ring, chat typing; validate AA contrast + dynamic-type for the new accent. Verify:
  grep shows labels present (today there are zero); manual contrast check recorded.
- [ ] **R24 — Update the /dev harness + final verification pass** — extend `/dev/theme` to
  render the full new system (tokens, elevation, button matrix, icon sheet, logomark,
  PalmDiagram) light+dark, and add first-run/empty/failed variants for analyzing(failed),
  Fortune(no reading), History(empty), Chat(first-run). Finalize `tokens.test.ts` +
  `geometry.test.ts`. Run the whole device-free suite. Verify: `tsc --noEmit` + `eslint` +
  `jest` all green; Deno tests green; web export + headless screenshots at 390×844 (and 320) of
  **every** route match the redesign and every previously-placeholder route now renders a real
  screen. Update `docs/checkpoints/redesign/` and note the "done" state in STATE.

---

## Build Log

_(append one line per completed task: `R#.T# — <what> — <evidence> — <date>`)_

- R1 — Role-based token system: split raw palette into a `Skin` object (18 semantic roles ×
  light/dark), `activeSkin` indirection (kept at Ink & Cinnabar so zero visual change), and
  `theme.ts` back-compat aliases (`background`→`bg`, `text`→`textPrimary`, `gold`→`premium`,
  `onGold`→`onPremium`, `jade`→`success`, `seal`→`heritageAccent`). Rewrote `tokens.test.ts`
  to pin the role contract + alias mapping. Evidence: `tsc --noEmit` clean, `jest` 30/30
  (7 suites), `expo lint` clean. — 2026-07-14
- R2 — Quiet Cosmos skin (skin #2) added with §3 light+dark hexes incl. explicit dark-tuned
  accents (light periwinkle `#8B95F0` + near-black `onAccent`); flipped `activeSkin` to it;
  `app.json` adaptive-icon bg `#C3272B`→`#FAF9F7` and splash `#F7F2E7/#1E1B16`→`#FAF9F7/#14151A`;
  `/dev/theme` swatch strip now renders the 13 role tokens from the live theme. Evidence: `tsc`
  clean, `jest` 31/31, `expo lint` clean, screenshot `docs/checkpoints/redesign/dev-theme.png`
  (light+dark) — indigo primary CTA, no cinnabar fill, calm dark bg. — 2026-07-14
- R3 — Sans-first type scale: repointed display(800)/title(700)/heading(700)/numeral(700) to
  the Noto Sans weight ramp (added `NotoSans_700Bold` + `800ExtraBold` modules, no new dep);
  added `bodyLarge` (17/26) + optional `editorialHeadline` (Noto Serif Display 600, reveal hero
  only); negative tracking on display/title; retired `fonts.cjk` from the default scale (only
  PalmDiagram/SealBadge still use it, R10/R7). Retired the Text.tsx "accent <18pt" guard (indigo
  is AA at all sizes) and added `success`/`premium`/`danger`/`tertiary`/`heritage`/`onPremium`
  tones (kept gold/jade/onGold aliases). Evidence: `tsc` clean, `jest` 31/31, `expo lint` clean,
  screenshot `docs/checkpoints/redesign/dev-theme.png` — sans headlines, sans numeral, one
  optional serif hero. — 2026-07-14
- R4 — Elevation: added `shadow.sm/md/lg` (iOS `shadow*` + Android `elevation`) to tokens +
  `Theme`; `Card` gained an `elevation` prop (flat by default; any lift switches fill to
  `surfaceRaised` + drops the hairline). Bumped radii per §5 (`sm 8`, `md 12` = default card/
  button corner, `lg 16`) and pointed `Card` at `radii.md` (12, visually identical to the old
  `lg`). Evidence: `tsc` clean, `jest` 31/31, `expo lint` clean, screenshot
  `docs/checkpoints/redesign/r4-elevation.png` — flat vs sm/md/lg cards lift correctly in
  light (soft shadow) + dark (lighter raised fill). — 2026-07-14
- R5 — Button broadened: added `tonal` variant, `loading` (ActivityIndicator), `icon` (leading
  node), and `shape` (`rounded`=radii.md default / `pill`); disabled + pressed now use explicit
  tokens (surfaceSunken/textTertiary/accentPressed/accentMuted) instead of opacity; secondary
  border + text moved to the indigo accent; used the Pressable children-function so a pressed
  tonal fill flips its label to onAccent. Extended /dev/theme to the full matrix. Evidence:
  `tsc` clean, `jest` 31/31, `expo lint` clean, screenshot
  `docs/checkpoints/redesign/r5-buttons.png` (light+dark) — all variants + states render. — 2026-07-14
- R6 — In-house line-icon set: `Icon.tsx` (react-native-svg, 24×24 stroke paths via a shared
  `<G>`) with 19 icons (heart/mind/life/path/lock/share/send/streak/thread/chevron/back/check/
  close/chat/camera/upload/bell/shield/sparkle), each with a default `accessibilityLabel` +
  `decorative` opt-out; barrel-exported `Icon`/`IconName`. Wired the Button `icon` slot (real
  sparkle) + a dev/theme "Icons" sheet incl. an accent-recolor row. No new library. Evidence:
  `tsc` clean, `jest` 31/31, `expo lint` clean, screenshot
  `docs/checkpoints/redesign/r6-icons.png` — 19 distinct line icons recolor correctly in
  light+dark. — 2026-07-14
