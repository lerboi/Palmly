# Palmly — UI/UX Redesign Task Ledger

**Design source of truth:** `Planning/UIUX-Redesign.md` (the "Quiet Cosmos" north star).
**Screen behavior / flows / content:** still `Planning/UIUX-specs.md`.
This ledger is a checkbox task machine, same conventions as `MVP_Buildplan.md`.

Checkbox: `[ ]` not started · `[~]` in progress/partial · `[x]` done+verified · `[!]` blocked.

---

## STATE

- **Active skin:** **Quiet Cosmos (skin #2)** — now the default; Ink & Cinnabar retained as skin #1 for the optional zh view.
- **Last completed:** R15 (Reveal screen — icon-led de-CJK cards, thread/lock/share icons, pending/error)
- **Next task:** R16 (Share modal + modernize compat/red-thread)
- **Blocked on:** —
- **Notes for next run:** Screen tasks rebuild each surface with the primitives:
  `Button`/`Card`(+`elevation`)/`Text`(tones)/`Icon`(19 names in `IconName`)/`Logomark`/
  `AppHeader`+`PrivacyBadge`/upgraded `PalmDiagram`/`CaptureView`. All via tokens (no raw hexes
  in app surfaces — the camera-overlay `OVERLAY` palette in `CaptureView` is a justified
  theme-independent exception), realistic English (no lorem, trim CJK/almanac).
  **R16 = build the Share modal + modernize compat/red-thread.** `(modals)/share` is currently a
  `PlaceholderScreen` → build a real share sheet: preview card(s) with the traced PalmDiagram as
  ~60% hero + a small `Logomark variant="stamp"` corner seal (the ONE place the stamp belongs),
  a modern channel row (Icon-based: message/copy-link/more — use `Icon` names, e.g. `share`,
  `chat`, `check`), and a **compatibility variant** with a lightened red-thread drawn in SVG
  (heritageAccent, NOT 🔴) + a score ring (reuse the ProgressRing idea from `AnalyzingView`, or a
  small circular score). Provide a share-preview FIXTURE. Also modernize `FortuneHome`
  RedThreadRow (grep `RedThread`/🔴 in `src/features/fortune/FortuneHome.tsx`) — RevealView
  CompareCard already done in R15 (uses `Icon name="thread"`). Read `(modals)/share.tsx`,
  `(modals)/_layout.tsx`, and UIUX-specs §2.6/§2.7 (share/compat) first. Verify: screenshots of
  the share sheet + compat variant; grep shows no 🔴 anywhere in `src`. Native share-sheet APIs
  are device-only → build the in-app preview + a fixture, mark any native `Share.share()` leg `[~]`.
  **NOTE:** R16b/R16c/R16d follow (server card-svg reskin, invite-page reskin, in-app invite-claim
  route) — R16b/c edit `supabase/functions/_shared/*` + re-pin Deno tests (run Deno tests too).
  **SCREENSHOTS:** `npx expo export --platform web` then
  `node scripts/shoot.mjs ../docs/checkpoints/redesign "share:390x844=r16-share"`. Only
  `dev/theme` renders desktop; other `dev/*` previews render mobile. ROOT launcher = EMPTY route.
  **Finalize-pass cleanups (R22/R24):** `fonts.cjk`/NotoSerifTC has ZERO default consumers →
  module can go zh-only load; /dev/theme "Section markers" CJK demo + remaining `SealBadge` call
  site (chat R19) still to migrate.

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
