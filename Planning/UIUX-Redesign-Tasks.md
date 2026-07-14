# Palmly — UI/UX Redesign Task Ledger

**Design source of truth:** `Planning/UIUX-Redesign.md` (the "Quiet Cosmos" north star).
**Screen behavior / flows / content:** still `Planning/UIUX-specs.md`.
This ledger is a checkbox task machine, same conventions as `MVP_Buildplan.md`.

Checkbox: `[ ]` not started · `[~]` in progress/partial · `[x]` done+verified · `[!]` blocked.

---

## STATE

- **Active skin:** **Quiet Cosmos (skin #2)** — now the default; Ink & Cinnabar retained as skin #1 for the optional zh view.
- **Last completed:** R23 (a11y — PalmDiagram label added; all svg labelled; reduce-motion + AA verified)
- **Next task:** R24 (FINALIZE — /dev/theme full system + full device-free suite + mark DONE + STOP loop)
- **Blocked on:** — (note: `deno` is NOT installed here — Deno test RUNS are `[~]`; re-pin + render/grep-verify.
  Web-export ScrollView top-aligns short content — scroll screens need a taller capture; correct on device.)
- **Notes for next run:** Screen tasks rebuild each surface with the primitives:
  `Button`/`Card`(+`elevation`)/`Text`(tones)/`Icon`(19 names in `IconName`)/`Logomark`/
  `AppHeader`+`PrivacyBadge`/upgraded `PalmDiagram`/`CaptureView`. All via tokens (no raw hexes
  in app surfaces — the camera-overlay `OVERLAY` palette in `CaptureView` is a justified
  theme-independent exception), realistic English (no lorem, trim CJK/almanac).
  **R23 = accessibility pass.** Mostly VERIFY (much was built in incrementally). Do:
  (1) grep every svg component for `accessibilityLabel`/`decorative`: `Icon` (has default labels +
  `decorative` opt-out ✓), `Logomark` (has `accessibilityLabel="Palmly"` ✓), `PalmDiagram` (Svg —
  CHECK: may need an `accessibilityLabel`/role since it's a meaningful image; add one), the capture
  guide SVGs, ProgressRing/ScoreRing/RedThread (decorative — ensure not announced or labelled).
  Confirm interactive Pressables have `accessibilityRole`+`accessibilityLabel` (most do). (2)
  reduce-motion fallbacks: PalmDiagram draw-on (✓ AccessibilityInfo + Platform), chat typing dots
  (✓), analyzing ring is static (no motion). Confirm each. (3) AA contrast + dynamic-type: record a
  manual check — accent `#4B57C4` on `#FFFFFF` ≈ 6.5:1 (AA ✓), on `#FAF9F7` similar; success/danger/
  heritage on surface; text tokens. Note the numbers in the ledger. Verify: grep shows labels
  present (was zero pre-redesign); contrast check recorded; `tsc`/`jest`/`lint` green.
  **After R23:** R24 (finalize `/dev/theme`: render the full new system — tokens, elevation, button
  matrix, icon sheet incl. palm/face/history, logomark, PalmDiagram — light+dark; REPLACE the
  "Section markers" CJK demo with the feature icons; add first-run/empty/failed dev-preview links;
  optionally delete the now-unused `SealBadge` + move `fonts.cjk`/NotoSerifTC to zh-only load; run
  the WHOLE device-free suite — tsc+lint+jest + web export + screenshots of every route + the two
  Deno-surface renders — and mark the redesign DONE in STATE, then STOP the loop).
  `src/features/reading/reveal.ts`, `fortune.ts`, `src/features/chat/chat.ts`,
  `src/features/reading/history.ts`, `src/features/reading/analyzing.ts` to universally-legible
  English — trim any remaining xuanxue/almanac phrasing + classical CJK citations, while KEEPING
  the warm, specific, human quality. Most were already anglicized through R11–R21, so this is
  largely a VERIFY + trim pass: `grep -rnP "[\x{4e00}-\x{9fff}]" src/features` and confirm the only
  CJK left is intentional zh-locale/domain DATA (fortune.ts `dayPillarCn` STEM/BRANCH arrays +
  comments — kept for the traditional view; NOT rendered) — trim anything else. Optionally add a
  small zh-locale strings map for the traditional view (nice-to-have, skippable). Do NOT break the
  jest fixtures/tests (fortune pillar test pins 甲子; keep `dayPillarCn`). Verify: every built
  screen still renders realistic (non-lorem) content (spot-check via existing screenshots — no
  re-shoot needed unless copy changed a rendered string); grep shows no stray rendered CJK.
  **After R22:** R23 (a11y — every svg `Icon`/`Logomark`/`PalmDiagram` has an
  `accessibilityLabel` or `decorative`; reduce-motion fallbacks present on PalmDiagram draw-on +
  analyzing ring + chat typing [all already gated]; AA contrast + dynamic-type spot check — record
  it), R24 (finalize `/dev/theme` to render the FULL new system + add first-run/empty/failed
  variants; run the whole device-free suite; note DONE). `SealBadge` now has ZERO app call sites
  (only its file + barrel + maybe /dev/theme) — safe to delete in R24 or keep the deprecated shim.
  `fonts.cjk`/NotoSerifTC has zero DEFAULT consumers (PalmDiagram uses it only under `traditional`)
  → can move to zh-only load in R24; /dev/theme "Section markers" CJK demo → replace with icons in R24.
  **Finalize-pass cleanups (R22/R24):** `fonts.cjk`/NotoSerifTC has ZERO default consumers →
  zh-only load; /dev/theme "Section markers" CJK demo + the chat `SealBadge` call (R19) to migrate.

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
- [x] **R7 — Rebuild SealBadge → CJK-free Logomark + new app-icon/splash set** _(2026-07-14)_ _(on-device launcher/splash render pending [~])_
  - Build: replace `SealBadge.tsx` (掌/印 glyph + Noto Serif TC coupling) with a stylized
    palm+three-lines `Logomark` in `react-native-svg`; expose a small `stamp` size for the
    share-card corner only. Author a new app-icon + splash asset set.
  - Verify: harness renders the logomark light+dark; grep confirms Noto Serif TC no longer
    required to render the brand mark; app.json icon/splash point at the new assets.
- [x] **R8 — Remove the dead-scaffold cluster (bigger than just collapsible)** _(2026-07-14)_
  - Build: delete/rebuild the Expo-template legacy cluster on the *second* theme system:
    `components/ui/collapsible.tsx`, `themed-text.tsx`, `themed-view.tsx`,
    `animated-icon.tsx(.web)`, `hint-row.tsx`, `web-badge.tsx`, `external-link.tsx`, plus the
    orphan `@/constants/theme.ts` + `@/hooks/use-theme.ts`/`use-color-scheme.ts` (a separate
    `useTheme` + blue `#3c87f7`) and Expo-branded assets (`expo-logo.png`, `logo-glow.png`,
    `expo-badge*.png`). Keep only what's actually imported by real screens.
  - Verify: `tsc --noEmit` + `eslint` clean; grep finds no imports of removed modules; only
    the real design system remains.
- [x] **R9 — Shared AppHeader + nav shell; dedupe the privacy line** _(2026-07-14)_
  - Build: an `AppHeader` (back affordance + optional title) adopted across reveal/chat/
    history/fortune/settings (currently `headerShown:false` + inline serif titles). Reduce the
    repeated "✓ Photo deleted" to **one** prominent placement per surface.
  - Verify: screenshots show a header + back; grep shows the privacy string once per screen.
- [x] **R10 — Upgrade the PalmDiagram hero + de-CJK labels + draw-on animation** _(2026-07-14)_ _(native draw-on motion [~])_
  - Build: `PalmDiagram.tsx`/`geometry.ts` — soft hand silhouette/negative space, richer
    multi-point geometry, weighted/gradient ink; recolor highlight to the new accent;
    `showLabels` default off / English; implement the real ~1.2s reanimated draw-on (currently
    stubbed) with a reduce-motion fallback.
  - Verify: `geometry.test.ts` stays green; analyzing + reveal screenshots show a premium
    hand-like diagram (not floating strokes); record a gif of the draw-on if web-capturable.

## PHASE R1 — The journey (built + placeholder), in user-journey order

- [x] **R11 — Redesign the launcher** (`app/src/app/index.tsx`) — logomark + English tagline
  ("Read your palm from a single photo"); new-accent primary CTA; no CJK. Verify: screenshot,
  no CJK on first screen. _(2026-07-14)_
- [x] **R12 — Build onboarding welcome / how-it-works / hand-select** (3 `(onboarding)`
  placeholders → real screens): brand moment (logomark reveal + value prop), a 3-step
  explainer using line-icons + the upgraded PalmDiagram, a two-card hand-select with elevation
  + selected state. Realistic English copy. Verify: dev route-map walks all three; no
  `PlaceholderScreen`. _(2026-07-14)_
- [x] **R13 — Build capture primer / palm / face** (3 `(capture)` placeholders → real UI):
  calm permission/consent primer (photo-deleted reassurance + Allow / upload-instead), guided
  palm + face capture states (align/hold/captured) with a modern framing guide + new-accent
  active/locked. Use **fixture stand-ins** for the camera feed so layout is screenshot-able;
  mark the live-camera leg `[~]`. Verify: screenshots of each state; no `PlaceholderScreen` in
  `(capture)`. _(2026-07-14)_ _(live-camera feed + landmark state machine [~])_
- [x] **R14 — Redesign the Analyzing loader** — center the upgraded PalmDiagram + real tracing
  animation; add a progress ring / step indicator; give the message vertical presence; reframe
  `analyzing.ts` copy off ethnicity. **Also design the `failed`/retry state** (`useScanStatus`
  models it). Verify: happy + failed screenshots; no empty/unfinished read. _(2026-07-14)_ _(smooth ring/self-draw motion [~])_
- [x] **R15 — Redesign the Reveal screen** _(2026-07-14)_ — remove cinnabar CJK section glyphs → feature
  line-icons; sans-first headline (fixes the 34px serif wrap); vary/drop the repeated 92px
  thumbnails; standard lock icon (drop 锁); share icon (keep the seal special, one mark);
  English-lead 面相/三才纹 titles; recolor the highlighted line; **add a pending/error state.**
  Verify: screenshot — no decorative CJK, headline fits, one privacy line.
- [x] **R16 — Build the Share modal + modernize compat/red-thread** _(2026-07-14)_ _(native OS share sheet [~])_ — `(modals)/share` → real
  share sheet: preview cards with the traced diagram as ~60% hero + a small corner seal, a
  modern channel row, a compatibility variant with a lightened red-thread (svg, not 🔴) +
  score ring. Update `RevealView` CompareCard + `FortuneHome` RedThreadRow. Provide a
  share-preview fixture. Verify: screenshots; grep shows no 🔴.
- [x] **R16b — Reskin the SERVER share card** (`supabase/functions/_shared/card-svg.ts`) _(2026-07-14)_ _(Deno test RUN [~] — deno not installed)_ — new
  palette (factor to ONE shared palette source so the app preview + posted image match),
  English line labels, CJK-free corner seal, sans headline. Re-pin `card-svg.test.ts`. Verify:
  render a sample card SVG → screenshot matches the app's share preview; Deno test green.
- [x] **R16c — Reskin the invite landing page** (`supabase/functions/_shared/invite-page.ts` +
  `buildInviteGonePage`) _(2026-07-14)_ _(Deno test RUN [~] — deno not installed)_ — new palette/CTA/typography, CJK-free, English-first. Re-pin
  `invite-page.test.ts`. Verify: render the HTML → screenshot; Deno test green.
- [x] **R16d — Build the in-app invite-claim / pair-reveal recipient route** _(2026-07-14)_ _(native deep-link resolution + thread/count-up motion [~])_ — the receiving
  end of the red-thread loop (currently no route exists though `scheme:"palmly"` is declared).
  A claim/landing screen + the compatibility pair-reveal screen (score ring + both-sides
  narrative), seeded with a fixture. Verify: dev route-map reaches it; screenshots.
- [x] **R17 — Build the Paywall modal** _(2026-07-14)_ _(RevenueCat-native purchase leg [~])_ — `(modals)/paywall` → clean modern paywall: value
  stack, plan cards with elevation + rounded-rect, gold reserved as the single premium marker,
  one confident primary CTA in the new accent. Provide plan-card fixtures (names/prices/no-trial
  copy). Mark the RevenueCat-native leg `[~]`. Verify: phone-size screenshot; no cinnabar fill.
- [x] **R18 — De-almanac the Fortune home + card** _(2026-07-14)_ — lead with weekday + date, demote 己丑日 to
  a small optional detail; split Do/Avoid, aspects, lucky stats into distinct grouped sections
  with real spacing (fix `gap:1` cram); 宜/忌 → Do/Avoid, drop 事业/感情/财运 CJK tags;
  rename/drop the "Cinnabar red" lucky colour; designed streak component + svg icon (drop 🔥);
  **add the empty/first-run state.** Verify: premium + free screenshots — calm hierarchy, no
  CJK, no edge-clipped streak.
- [x] **R19 — Redesign the Chat thread + flesh the fixture** _(2026-07-14)_ _(typing-dot pulse motion [~])_ — expand `PREVIEW_THREAD` to a
  realistic 3–4 turn conversation; add a premium empty/first-run state + a streaming/typing
  indicator; make `PREVIEW_CHIPS` distinct from asked questions (drop the duplicate first
  chip); elevate the "Cites your…" grounding line; replace the "↑" glyph with the send icon and
  the 问 gate seal with a neutral chat icon. Verify: screenshot — full conversation (no void),
  typing indicator, distinct chips.
- [x] **R20 — Redesign the History shelf** _(2026-07-14)_ — replace row CJK 掌/面 glyphs with a small type
  line-icon; show the privacy line once (header badge) not per row; keep the "unchanged"
  consistency brag on the `success` token; vary thumbnails; **add the empty (zero-readings)
  state.** Verify: screenshot — no per-row CJK, one privacy signal.
- [x] **R21 — Migrate the Settings suite** _(2026-07-14)_ — token-migrate SettingsHub/Notifications/
  Methodology/Privacy/Legal; adopt `AppHeader`. In `MethodologyScreen.tsx` replace 一/二/三 with
  1/2/3 or step icons and strip inline CJK (心/智/命/运, 手相, 面相) leading English; map
  jade→success, gold→premium/notice, destructive-confirm→danger token; wire the Language row
  toward the optional zh "traditional view". Verify: screenshots of all five; grep confirms no
  CJK in Methodology; confirm the notifications right-edge clipping was only a capture artifact
  (re-shoot at 320 + 390 wide).

## PHASE R2 — Content, accessibility, finalize

- [x] **R22 — Re-author fixtures to universal English** _(2026-07-14)_ — sweep `PREVIEW_*` in `reveal.ts,
  fortune.ts, chat.ts, history.ts, analyzing.ts` to universally-legible English (trim
  xuanxue/almanac phrasing + classical CJK citations) while keeping the warm, specific, human
  quality. Optionally add zh-locale strings for the "traditional view". Verify: every built
  screen still renders realistic (non-lorem) content; grep finds no stray CJK outside zh.
- [x] **R23 — Accessibility pass** _(2026-07-14)_ — `accessibilityLabel`/`accessibilityRole` on all new svg
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
- R7 — Brand mark: new `Logomark.tsx` (react-native-svg, three traced palm lines — heart line
  in the heritage whisper; `mark`/`stamp` forms, `tone` roles, `filled` stamp). `SealBadge`
  rebuilt as a deprecated shim over `Logomark` (drops the `fonts.cjk`/CJK-glyph coupling) so its
  5 call sites stay compiling + CJK-free until the screen tasks migrate them. Regenerated the
  app-icon/splash/favicon/adaptive-foreground/monochrome PNGs from the Logomark via a device-free
  headless-Chrome generator (`scripts/gen-brand-assets.mjs`); added a dark splash variant + wired
  app.json. Evidence: `tsc` clean, `jest` 31/31, `expo lint` clean; grep shows the brand mark no
  longer needs Noto Serif TC (only PalmDiagram keeps `fonts.cjk`, R10); harness screenshot
  `docs/checkpoints/redesign/r7-logomark.png` (mark/accent/stamp/filled, light+dark) + generated
  `assets/images/icon.png` + `splash-icon.png` viewed in isolation. On-device launcher/splash
  render is `[~]` (can't observe a home-screen icon device-free). — 2026-07-14
- R8 — Deleted the dead Expo-template scaffold cluster (second theme system): `animated-icon`
  `.tsx/.web.tsx/.module.css`, `external-link`, `hint-row`, `themed-text`, `themed-view`,
  `ui/collapsible`, `web-badge`, orphan `constants/theme.ts`, `hooks/use-theme.ts` +
  `use-color-scheme.ts/.web.ts` (a separate `useTheme` + blue `#3c87f7`), and the Expo-branded
  assets `expo-logo`/`logo-glow`/`expo-badge`/`expo-badge-white`/`react-logo{,@2x,@3x}`. All were
  self-referential (grep-verified no real-screen importer); `PlaceholderScreen` + `SealBadge`
  shim kept. Evidence: `tsc` clean, `jest` 31/31, `expo lint` clean, grep finds no imports of any
  removed module. Only the real design system remains under `components/`. — 2026-07-14
- R9 — Shared `AppHeader` (back via `Icon name="back"` + optional sans title + trailing slot) +
  a single `PrivacyBadge` (shield + "Photo deleted", success tone). Adopted in HistoryShelf
  (header title + ONE badge; removed the per-row "✓ Photo deleted") and RevealView (back header +
  footer badge); showcased in /dev/theme. Also rewrote `scripts/shoot.mjs` to drive Chrome via
  the DevTools Protocol with true mobile device emulation — phone routes now render at a real
  390px viewport instead of Chrome's ~500px window floor (which had faked horizontal overflow).
  Evidence: `tsc` clean, `jest` 31/31, `expo lint` clean; grep shows the privacy string once per
  screen; screenshots `docs/checkpoints/redesign/r9-history.png` (one badge, no per-row privacy)
  + `r9-reveal.png` (back header, no clipping). Full AppHeader adoption on chat/fortune/settings
  lands with their screen tasks (R18/R19/R21). — 2026-07-14
- R10 — PalmDiagram upgraded: faint hand silhouette (negative space so lines read as a palm),
  weighted ink + a wider accent glow under the highlighted/signature line(s), accent-gradient
  main stroke; `showLabels` now DEFAULT OFF and English-first (`ENGLISH_LINE_LABEL`
  Heart/Head/Life/Fate; `traditional` prop opts into CJK). `geometry.ts` gained a per-stroke
  `length` (seeds the draw-on) + `ENGLISH_LINE_LABEL`, keeping `LINE_LABEL` (CJK) as raw data so
  `geometry.test.ts` stays green. Real ~1.2s reanimated draw-on (dash-offset) with an
  `AccessibilityInfo` reduce-motion fallback; fail-safe progress starts fully-drawn so the
  diagram is never blank on web / if the worklet is absent. Evidence: `tsc` clean, `jest` 31/31
  (geometry contract intact), `expo lint` clean, screenshots
  `docs/checkpoints/redesign/r10-reveal.png` + `r10-analyzing.png` — a premium hand-like diagram
  (not floating strokes), no CJK labels, accent-highlighted lines. Native draw-on motion is
  `[~]` (web renders the static end-state; the animation plays on device). — 2026-07-14
- R11 — Launcher (`app/src/app/index.tsx`) rebuilt as the brand moment: `Logomark` (accent) +
  "Palmly" wordmark + English tagline "Read your palm from a single photo." + a single indigo
  "Get started" CTA + "For reflection & entertainment" caption; dropped the CJK `手相·面相`
  tagline and the `SealBadge`. Tokens throughout. Evidence: `tsc` clean, `jest` 31/31, `expo
  lint` clean, grep finds no CJK in `index.tsx`, screenshot
  `docs/checkpoints/redesign/r11-launcher.png` — calm premium first screen, no CJK. — 2026-07-14
- R12 — Onboarding built (3 `(onboarding)` placeholders → real screens): `welcome.tsx` (A1 —
  PalmDiagram hero w/ English labels + reframed value prop "Rooted in centuries of palmistry",
  back + Skip), `how-it-works.tsx` (A2 — three elevated icon step-cards camera/sparkle/heart +
  the D2 trust line in a sunken shield card), `hand-select.tsx` (A3 — two elevated selectable
  hand cards with accent selected-state + mirrored left-hand diagram + cultural note, CTA "Read
  my palm"). All tokens, realistic English, no CJK/PlaceholderScreen. Evidence: `tsc` clean,
  `jest` 31/31, `expo lint` clean, grep clean, screenshots `r12-welcome.png` / `r12-how.png` /
  `r12-hand.png`. — 2026-07-14
- R13 — Capture built (3 `(capture)` placeholders → real UI): `primer.tsx` (B — camera hero +
  "Palmly needs your camera" + three icon consent/reassurance rows in a sunken card + Allow /
  Upload-instead; the rows are the versioned biometric-consent text), and a shared
  `features/capture/CaptureView.tsx` fixture driving `palm.tsx` (C — gold hand-shaped framing
  guide, "Hold still…" pill, shutter + auto-capture ring, Right/Left toggle — the ready state)
  and `face.tsx` (oval guide, dashed searching state). Live `expo-camera` feed + landmark state
  machine are device-only → a neutral feed STAND-IN with full overlay chrome; on-device leg
  `[~]`. Camera-overlay colors are a small theme-independent `OVERLAY` palette (sits on a dark
  feed, not an app surface). Evidence: `tsc` clean, `jest` 31/31, `expo lint` clean, grep clean
  (no PlaceholderScreen/CJK), screenshots `r13-primer.png` / `r13-palm.png` / `r13-face.png`. — 2026-07-14
- R14 — Analyzing loader redesigned (`AnalyzingView.tsx`): the progressively-traced PalmDiagram
  now sits inside a static accent progress ring (fills by pipeline stage) with a step-dot
  indicator; the message gained vertical presence (title + step dots + social proof). Reframed
  `analyzing.ts` `SOCIAL_PROOF` off ethnicity ("Three thousand years of Chinese palmistry" →
  "Rooted in centuries of palmistry"). Rebuilt the `failed`/retry state: camera icon + specific
  hint + "Try again" (primary) / "Upload a photo instead" (secondary) via a `/dev/analyzing-failed`
  preview. Also generalized `shoot.mjs` so only `dev/theme` renders desktop (other dev previews =
  mobile). Evidence: `tsc` clean, `jest` 31/31 (analyzing logic contract intact), `expo lint`
  clean, screenshots `r14-analyzing.png` (ring + step dots + traced palm) + `r14-failed.png`
  (calm retry). Smooth ring/self-draw motion is `[~]` (static state verified). — 2026-07-14
- R15 — Reveal screen redesigned (`RevealView.tsx` + `reveal.ts` fixture): section cards are now
  icon-led (a `FeatureIcon` tile per section — `SECTION_ICON` maps heart/head/life/fate/hand/
  markings → heart/mind/life/path/sparkle) with elevation, dropping the repeated 92px per-card
  diagrams and the cinnabar CJK glyphs; `CompareCard` uses `Icon name="thread"` (heritage) not
  🔴; `LockedCard` uses `Icon name="lock"` (premium) + "Unlock with Premium" + chevron, not the
  锁 box; the floating share is a single accent FAB with `Icon name="share"` (not the 分 seal);
  `FaceOfferCard` + the markings fixture title are English-lead (面相/三才纹 gone); disclaimer →
  tertiary tone. Added calm `pending` + `error` states (`state` prop) with a `/dev/reveal-pending`
  preview. Evidence: `tsc` clean, `jest` 31/31, `expo lint` clean, grep shows no CJK/🔴/锁 in
  RevealView; screenshots `r15-reveal.png` (full — hero, icon cards, thread CompareCard, lock
  Go-deeper, one privacy line) + `r15-pending.png`. — 2026-07-14
- R16 — Share sheet built (`(modals)/share` PlaceholderScreen → `ShareView`): a segmented
  solo/compatibility preview. Solo = an elevated share CARD with the traced PalmDiagram hero
  (~60%) + headline + a single `Logomark variant="stamp"` corner seal + palmly.app footer.
  Compat = two palms with a lightened **red-thread drawn in SVG** (heritageAccent, not 🔴) + a
  **gold score ring** (premium, "82") + "You & Mei". Plus an "Invite them to compare palms"
  toggle (thread icon) and a modern icon channel row (Message/Copy link/More) + a Share CTA.
  Updated `FortuneHome` RedThreadRow (🔴 → `Icon name="thread"` heritage). Fixtures via
  `PREVIEW_*`; `/dev/share-compat` previews the compat variant. Native OS share sheet + brand
  channels are `[~]`. Evidence: `tsc` clean, `jest` 31/31, `expo lint` clean, grep shows **no 🔴
  anywhere in src**; screenshots `r16-share.png` (solo) + `r16-compat.png` (compat). — 2026-07-14
- R16b — Server share card `card-svg.ts` reskinned to Quiet Cosmos: `PALETTE` → the skin #2 hexes
  (bg `#FFFFFF`, border `#E7E3DC`, ink `#1A1A1F`/`#6B6B72`, signature/highlight `#4B57C4`, seal
  `#C2554A`) with a comment noting it mirrors `app/src/theme/tokens.ts`; `LINE_LABEL` 心智命运 →
  English Heart/Head/Life/Fate (Noto Sans); added the faint hand silhouette behind the lines to
  match the app diagram; the 相 cinnabar chop → a CJK-free heritage **Logomark stamp** (the 3
  palm-line paths); headline + attribution serif → Noto Sans 800. Function LOGIC/signature
  unchanged. Re-pinned `card-svg.test.ts` (相→heritage stamp + no-CJK invariant; cinnabar→accent
  hex; 心/运→Heart/Fate; ink hex). `deno` is NOT installed here → the **Deno test RUN is `[~]`**,
  but I verified all re-pinned assertions hold against the real generated SVG (grep) and rendered
  the card to a screenshot that matches the app preview. Added `scripts/gen-card.ts` (renders the
  SVG via Node type-stripping) + excluded `scripts/` from app tsconfig so it doesn't break `tsc`.
  Evidence: app `tsc`/`jest` 31/31/`lint` clean, assertion grep all-OK + no CJK + 12 paths,
  screenshot `docs/checkpoints/redesign/r16b-card.png`. — 2026-07-14
- R16c — Invite landing page `invite-page.ts` reskinned to Quiet Cosmos: `STYLE` palette →
  skin #2 (bg `#FAF9F7`, accent CTA `#4B57C4` + indigo shadow, step markers `#ECEDF9`/`#4B57C4`,
  border `#E7E3DC`, text `#1A1A1F`/`#6B6B72`, privacy `#3F7A5E`), fonts serif → a system sans
  stack (public HTML can't bundle Noto), h1 weight 800 + tracking; the 相 seal chop (both
  `buildInvitePage` + `buildInviteGonePage`) → a CJK-free heritage `SEAL_SVG` (Logomark stamp);
  the "?" mystery wheel recolored (ring → accent, "?" → premium gold, sans). Module LOGIC
  unchanged; existing tests (content/behavior) still hold + added a Quiet-Cosmos/CJK-free
  assertion to `invite-page.test.ts`. `deno` not installed → **Deno test RUN `[~]`**, but
  verified assertions against the real generated HTML (grep) + rendered it. Added
  `scripts/gen-invite.ts`. Evidence: assertions all-OK + no CJK, app `tsc`/`jest`/`lint`
  unaffected, screenshot `docs/checkpoints/redesign/r16c-invite.png`. — 2026-07-14
- R16d — Built the recipient end of the red-thread loop: `(onboarding)/claim.tsx` (a personalized
  landing — two-avatar red-thread motif inviter↔"You", "{Mei} is waiting", explainer, "Scan my
  palm" CTA + "Have an invite? Enter code" recovery) and `(reading)/pair.tsx` →
  `features/reading/PairRevealView.tsx` (two traced palms + red thread, a large gold `ScoreRing`
  "82", "You & Mei", five English sub-score bars Emotion/Mind/Energy/Destiny/Elements — de-CJK'd
  from 心智命运五行, a both-sides "Where you click / stretch" narrative, See-full-reading + Share
  CTAs). Exported `ScoreRing`(+size)/`RedThread` from `ShareView` for reuse. Both reachable via the
  `/dev` route map. Native deep-link resolution (`scheme:"palmly"`→claim) + the thread-draw/
  score count-up are `[~]` (static end-state verified). Evidence: `tsc` clean, `jest` 31/31,
  `expo lint` clean, no CJK; screenshots `r16d-claim.png` + `r16d-pair.png`. — 2026-07-14
- R17 — Paywall built (`(modals)/paywall` PlaceholderScreen → `features/paywall/PaywallView`): a
  clean single-sheet value stack — close ✕ (Icon), a gold "PALMLY PREMIUM" marker (sparkle), the
  "Your palm has more to say" headline + value line, a 4-item green-check inclusion list (daily
  almanac / unlimited compatibility / deep-dive lines / chat), two elevated selectable plan cards
  (Annual pre-selected — accent border/tint + filled radio + a **gold "SAVE 40%" seal** + per-mo
  framing; Monthly beside it), a single **indigo** "Unlock Palmly Premium" CTA, and Restore +
  "No trial · cancel anytime". No-trial launch config; plan fixtures ($2.99/mo annual, $4.99/mo).
  Gold used ONLY as the premium marker; no cinnabar fill. RevenueCat Paywalls-v2 purchase flow is
  `[~]`. Evidence: `tsc` clean, `jest` 31/31, `expo lint` clean, grep shows no cinnabar/CJK,
  screenshot `docs/checkpoints/redesign/r17-paywall.png`. — 2026-07-14
- R18 — Fortune home de-almanac'd (`FortuneHome.tsx` + `FortuneCard.tsx` + `fortune.ts`): header
  leads with weekday + date (`Tuesday` / `July 14`) — the 干支 day-pillar is demoted to the
  optional zh view (kept in `dayPillarCn`/`almanacDate` data for tests + traditional view, not
  rendered). StreakStrip 🔥 → `Icon name="streak"`; `RowLink` 掌/问 glyphs → `Icon` history/chat
  + `chevron`; FortuneCard 运 header → `Icon sparkle`; premium expands into grouped sections with
  dividers + real spacing (fixed the `gap:1` cram); 宜/忌 → "Do"/"Avoid" (success/heritage),
  事业/感情/财运 → Career/Love/Wealth, 🔒 → `Icon lock`; renamed the "Cinnabar red" lucky colour →
  "Indigo". Added a calm first-run empty state (`firstRun` prop → "Your daily fortune starts
  here" + Read-my-palm CTA). Added a `history` clock icon to the Icon set. Evidence: `tsc` clean,
  `jest` 31/31 (pillar contract intact), `expo lint` clean, no rendered CJK/emoji in fortune;
  screenshots `r18-premium.png` / `r18-free.png` / `r18-empty.png`. — 2026-07-14
- R19 — Chat thread redesigned (`ChatThread.tsx` + `chat.ts`): the `问` gate seal → `Icon chat`
  tile; the `↑` send glyph → `Icon send`; grounded bubbles (indigo user right / elevated
  surfaceRaised assistant left) with the "Cites your <line>" footer elevated to a shield-icon +
  `success`-tone row; a premium first-run empty state (chat-icon tile + "Ask anything about your
  reading" + chips); a reanimated 3-dot typing indicator (native pulse; reduce-motion + web →
  static graded-opacity dots). Expanded `PREVIEW_THREAD` to a realistic 4-turn conversation and
  made `PREVIEW_CHIPS` distinct follow-ups (dropped the duplicate-of-first-question chip). Input
  bg → surfaceSunken; chips → accentMuted pills. Added `/dev/chat-typing` + `/dev/chat-empty`
  previews. Evidence: `tsc` clean, `jest` 31/31, `expo lint` clean, no CJK/SealBadge/↑ in chat;
  screenshots `r19-chat.png` (full thread), `r19-typing.png` (dots), `r19-empty.png`. The
  typing-dot pulse is `[~]` (web renders static); web-export ScrollView top-aligns (captured
  taller — bounds correctly on device). — 2026-07-14
- R20 — History shelf redesigned (`HistoryShelf.tsx`): per-row CJK 掌/面 kind glyphs → new
  `Icon` **palm** (open-hand) + **face** (smiley) type-icons (added to the Icon set); rows are
  elevated cards with a chevron; the privacy signal stays ONCE in the header (`PrivacyBadge`); the
  `UnchangedBanner` retinted to the `success` token (green border + check icon + heading); the
  zero-readings `EmptyState` polished to premium (history-icon tile + copy + "Read my palm" CTA).
  Added `/dev/history-empty` preview. Evidence: `tsc` clean, `jest` 31/31, `expo lint` clean, no
  CJK in HistoryShelf; screenshots `r20-history.png` (banner + palm/face rows) + `r20-empty.png`. — 2026-07-14
- R21 — Settings suite migrated (all 5 screens + `settingsUi.tsx`): each adopts `AppHeader`
  (back + title); `settingsUi` `SettingRow` danger → the `danger` token, "›" → `Icon chevron`.
  `MethodologyScreen.tsx` fully de-CJK'd — 一/二/三 → numbered 1/2/3 tiles (accentMuted), "heart
  心/head 智/life 命/fate 运" → "heart, head, life and fate", "手相/面相" → "palmistry and
  face-reading"; trust card → success shield. `PrivacyCenter` jade card → success shield, the
  destructive account-delete row + confirm card → the `danger` token (red row + red "Delete
  everything" button). `LegalScreen` gold notice card → premium tone on surfaceSunken (⚠️ emoji
  dropped). `SettingsHub` Language row wired (stub) toward the zh traditional view. Evidence:
  `tsc` clean, `jest` 31/31, `expo lint` clean, grep shows **no CJK anywhere in settings**;
  screenshots `r21-settings.png` / `r21-methodology.png` / `r21-notif.png` + `r21-notif-320.png`
  (no clipping at 320 or 390) / `r21-privacy.png` / `r21-legal.png`. — 2026-07-14
- R22 — Fixture English sweep: verified every rendered `PREVIEW_*` (reveal/fortune/chat/history/
  analyzing) is already warm, specific English (anglicized incrementally through R11–R21; markings
  三才纹→English R15, lucky "Cinnabar red"→"Indigo" R18, SOCIAL_PROOF de-ethnicity'd R14). Romanized
  the remaining CJK **comments** (ganzhi day-pillar, section markers, eight compass points) so the
  grep-invariant is clean; the only CJK left in feature code is intentional zh-view **data** — the
  `dayPillarCn` STEM/BRANCH arrays (test-pinned) + `SECTION_GLYPH` values (documented NOT-rendered,
  zh-traditional-view only). Evidence: `tsc` clean, `jest` 31/31, `grep` over `src/features` shows
  CJK only in `fortune.ts`/`fortune.test.ts`/`reveal.ts` (all intentional zh data). No rendered
  string changed → prior screenshots stand as the "realistic English content" evidence. — 2026-07-14
- R23 — Accessibility pass. Added an `accessibilityLabel` (default "Your palm line diagram",
  role=image; `""`→decorative/aria-hidden) to `PalmDiagram` (the one gap). Audited: every svg
  component carries labels/roles — `Icon` (default label per name + `decorative` opt-out),
  `Logomark` ("Palmly"), `PalmDiagram`, `AppHeader` (back), `Button`, plus interactive Pressables
  across screens. Reduce-motion fallbacks confirmed on both animations (`PalmDiagram` draw-on +
  chat typing dots — `AccessibilityInfo.isReduceMotionEnabled` + Platform; the analyzing ring is
  static). Contrast (AA) recorded: accent `#4B57C4` on `#FFFFFF` ~6.4:1 / on `#FAF9F7` ~6.2:1;
  white-on-indigo ~6.4:1; textSecondary `#6B6B72` ~5.0:1; success `#3F7A5E` ~4.8:1; danger
  `#C0392B` ~4.9:1; dark accent `#8B95F0` on `#14151A` ~6.3:1 — all >=4.5 (AA). heritage `#C2554A`
  ~4.4:1 used only for icons/graphical accents (>=3:1). Dynamic type: all copy uses the scalable
  `Text` variant scale. Evidence: `tsc` clean, `jest` 31/31, `expo lint` clean; a11y-label grep
  non-zero across all svg components (was zero pre-redesign). — 2026-07-14
