# Audit-4 Fix Ledger — Post-Capture UI/UX Redesign (U0–U8)

**Status:** ACTIVE — this file is the single source of truth for the Audit-4 fix loop.
**Derived from:** [Audit-4-PostCapture.md](Audit-4-PostCapture.md) (findings `SN/SH/CC/CO/CP`)
and [Design-Direction.md](Design-Direction.md) (the target — read the cited §§ of BOTH before
executing a task; the finding holds the evidence, the direction holds the destination).
**Specs behind the audit:** `Planning/UIUX/UIUX-Redesign-v2.md` (identity),
`Planning/UIUX/UIUX-specs.md` (behavior), `Planning/mvp_spec.md` §4.5,
`app/src/theme/tokens.ts`.
**Prior ledgers (read-only context, never re-execute):** `Planning/Audits/Audit-2-Frontend/`,
`Planning/Audits/Audit-3-Full/`, `Planning/UIUX/UIUX-Redesign-v2-Tasks.md`,
`Planning/MVP_Buildplan.md` (owns the R-track; paused mid-R3 by the owner — do not touch
capture/camera surfaces or backend from this ledger).
**Created:** 2026-07-25 · Ledger version: 1.0

Legend: `[ ]` todo · `[~]` in progress OR built-with-a-pending-leg (honesty note required) ·
`[x]` done+verified · `[!]` blocked (note required) · 🤖 agent · 🧑 human · 🚦 phase gate ·
∥ parallel-safe

---

## 🔄 STATE — update this block on every run

| Field | Value |
|---|---|
| Current phase | U2 — Today (home) recomposition |
| Next task | U2.G (phase gate) |
| Blocked on | — |
| Waiting on human | — |
| Last run | 2026-07-25 |
| Last completed task | U2.T7 |
| Notes for next run | **Three contracts U0.T1–T3 established — extend them, never route around them.** (1) The AA matrix in `theme/__tests__/tokens.test.ts` is the contrast contract; adding a role means adding its used pairings. Sunken chip/pill labels are `textPrimary` (`textSecondary` on `surfaceSunken` is 4.25:1 and is deliberately absent from the matrix as a text pairing). (2) Accent TEXT is `accentPressed`; `accent` is fills / selected / palm-line only; premium TEXT is `premiumInk`, `premium` is fill only. (3) Decorative glyphs are `textSecondary` on a `surfaceSunken` well — `accentMuted` wells now mean "selected". Screenshot recipe erratum: this host's headless Chrome renders **dark** by default, and metro caches the inlined env var — light shots need `EXPO_PUBLIC_FORCE_SCHEME=light npx expo export --platform web` plus `--clear` whenever the flag's value changes. |

---

## ⚙️ EXECUTION PROTOCOL (the loop algorithm — follow exactly, every iteration)

1. **Load state** — read this file top to bottom; STATE tells you where the last run stopped.
2. **Select task** — the first `[ ]` or `[~]` in document order. Never skip, except past a
   `[!]` to the next `∥`-marked task.
3. **RESEARCH (mandatory, before any code)** — read the finding(s) and Design-Direction §§ the
   task cites; read the CURRENT source of every named file (grep the quoted strings to
   re-anchor cites; wrong cite → AUDIT ERRATA table, proceed against reality); check
   `app/package.json` before assuming a library.
4. **PLAN** — 3–6 lines: files, approach, how Verify passes. Spec-silent choices → Decision Log.
5. **EXECUTE** — smallest coherent change; match surrounding style; theme tokens only;
   reduce-motion + web gate on every animation; typed `track()` for analytics; `PREVIEW_*`
   fixtures for `/dev` routes only.
6. **VERIFY** — run the task's Verify line LITERALLY, plus the standing gates. Only when green:
   mark `[x]` (or `[~]` with the exact pending device/human leg), append one Build Log line,
   update STATE, commit scoped to the task + this ledger
   (`git add <files> && git commit -m "U#.T# <short description>"`).
7. **On failure** — 3 distinct approaches max, then `[!]` with detail, update STATE, move to the
   next `∥` task if one exists, else report and stop. A falsely-green ledger is worse than a
   stalled one.
8. **Session budget** — near the context limit: finish or `[~]`-note the in-flight task, update
   STATE, commit, stop cleanly.

### Standing gates (every task)
- From `app/`: `npm run typecheck` (0), `npm run lint` (0), `npm run test:ci` (baseline 72,
  grows as U0.T2/U8 add tests — never shrinks).
- 🚦 gates additionally re-shoot the phase's screenshot set (recipe in Standing rules) and run
  the acceptance checks named in the gate.
- No task in this ledger touches `supabase/` — if one seems to need it, mark `[!]` and report.

### Standing rules
- **Never fake a green.** Device-only legs (haptics feel, native springs, real keyboard, OS
  share sheet): build fully, verify device-free (web screenshot + tests), mark `[~]` naming the
  device leg.
- **Screenshots:** from `app/`: `npx expo export --platform web` then
  `node scripts/shoot.mjs <outDir> <route:WxH[=name]> …`; root route is `/` never `/index`;
  dark needs `EXPO_PUBLIC_FORCE_SCHEME=dark`; 320-width shots at `320x568`. Save under
  `docs/checkpoints/audit4/`. Native dialogs need a TRUSTED `Input.dispatchMouseEvent` (raw
  CDP), not `Runtime.evaluate .click()`.
- **Copy discipline:** no CJK in default UI; no health claims; deletion promise wording only
  from `app/src/lib/trustCopy.ts`; US spelling; typographic `’`.
- **Color discipline:** the accent litmus (Design-Direction §1 P1) applies to every touched
  screen — ≤2 non-interactive accent occurrences.
- **Analytics discipline:** typed `track()` facade; event changes update `docs/ANALYTICS.md` in
  the same commit.
- **Dependencies:** only `@react-native-community/datetimepicker` may be added (via
  `npx expo install`), Decision Log entry required. Anything else → `[!]`.
- The Supabase MCP is READ-ONLY inspection; irrelevant here except SH-14 verification queries.

### ⚠️ AUDIT ERRATA (append-only — record any Audit-4-PostCapture.md cite that proves wrong)

| Date | Cite | Reality | Impact |
|---|---|---|---|
| 2026-07-25 | Standing rule "dark needs `EXPO_PUBLIC_FORCE_SCHEME=dark`" (implies light is the harness default) | This host's headless Chrome inherits the OS dark preference, so an unflagged export shoots **dark**. Light needs `EXPO_PUBLIC_FORCE_SCHEME=light`. Metro also caches the inlined value — changing the flag needs `--clear` or the previous scheme is re-served. | Every light/dark shot in this ledger; U0.T1 shot a full dark set before catching it. |
| 2026-07-25 | U1.T4 Verify: "shoot `/fortune` … shows the entries" | The REAL `/fortune` route renders the **birth-date blocker** (SH-4) over the whole screen when no birth date is stored, so the header is unreachable there device-free. Shot `/dev/fortune-free` instead, which renders the same `FortuneHome` with fixtures. U2.T5 turns that blocker into a sheet shown AFTER the first fortune, at which point `/fortune` itself becomes shootable. | None — the entry is verified on the same component; re-shoot `/fortune` after U2.T5. |
| 2026-07-25 | U1.T3 Verify: "shoot `/history` (pushed variant via settings route) showing back" | **There is no pushed variant any more.** U1.T1 removed the only `router.push('/history')` call site with the nav rows; `grep -rn "push('/history')" src` → 0. History is tab-root-only, so the shot the verify asks for cannot exist. `HistoryShelf` now takes an `onBack?` prop that renders the arrow when a future route pushes it — dormant but correct. | The verify line predates the tab bar; the SN-3 intent (tab root shows none) is met and shot. |
| 2026-07-25 | U0.T6 Verify: `grep -RnE "fontSize: ?[0-9]\|fontWeight:" app/src/features` → "no hits outside tokens/tests" | Six hits survive in **`src/features/dev/LandmarksBench*.tsx`** — a native camera-landmark diagnostic whose HUD is deliberately outside the design system (neon-on-black over a live video feed) and which is capture-adjacent, i.e. on this ledger's OUT OF SCOPE list. The verify enumerated "tokens/tests" but not dev harnesses. Production feature code is clean. | None — the intent (no type overrides in shipped UI) is fully met. |
| 2026-07-25 | U0.T5 Verify: `grep -RnE "[✓✕↑↗→↘↓↙←↖✨👇]" app/src --include=*.ts*` → "only `/dev` or test fixtures" | The class includes **`→`**, which this codebase uses ~145× in ordinary prose comments (`scan-create → PUT → scan-ingest`). Taken literally the check can never pass and would demand vandalising documentation. Verified instead as: the same class MINUS `→`, excluding comment lines → **0 hits outside `/dev`**. | The grep is unrunnable as written; later glyph checks should scope to rendered strings, not comments. |
| 2026-07-25 | Audit §5 "`surfaceRaised #FFFFFF` on `bg #FAF9F7` = 1.01:1" | WCAG ratio is **1.052:1** (1.01 is a plain lightness delta). The finding's substance is unaffected — 1.05:1 is still invisible without a border, as the U0.T1 before-shot pixel probe confirms (card → shadow AA → page, no border pixel). | None — CC-3 stands; only the quoted number is off. |
| 2026-07-25 | U2.T6 Verify: "grep `'your match'` → 0 production hits" | **0 in `FortuneHome`** — SH-13's actual site, the fallback that rendered "Waiting for your match". Four hits survive elsewhere and are NOT the same defect: `(capture)/primer.tsx` (out of scope, R3 track), `(reading)/pair.tsx` (the pair partner-name default — **U5.T3 owns it**), and `AccountSheet.tsx` ×2, where `inviterName || 'your match'` is a legitimate English phrase for an unknown inviter rather than a name placeholder. | None for SH-13; the pair default is tracked to U5.T3. |

### 📋 DECISION LOG (append-only)

| ID | Date | Decision |
|---|---|---|
| D1 | 2026-07-25 | **`Card`'s scheme-aware border reads `theme.scheme`, not a new prop.** Direction §2 asks for "light = always bordered, dark = current behavior"; `Theme` already carries `scheme`, so `showBorder = bordered ?? (theme.scheme === 'light' \|\| !lifted)` needs no API surface and leaves an explicit `bordered` winning on both schemes. |
| D2 | 2026-07-25 | **Kept `surfaceSunken #EAE6DE` as Direction §2 prescribes even though it costs `textSecondary`-on-sunken 4.65:1 → 4.25:1.** The direction supersedes on surface separation, and the very next task (U0.T2, CC-6) owns chip/tonal label color — sunken labels move to `textPrimary` (13.93:1) there. Recorded in STATE so U0.T2 cannot miss it. |
| D3 | 2026-07-25 | **Light screenshots are baked with `EXPO_PUBLIC_FORCE_SCHEME=light`, not left to the harness default.** The host Chrome reports the OS dark preference, so "no flag" is not "light" here. Explicit on both schemes = reproducible on any host. |
| D4 | 2026-07-25 | **`premiumInk` light is `#875F04`, not the Direction's `#8A6A1F`.** §2 tuned only against white; premium captions also render on `bg` and on a `surfaceSunken` card (`LegalScreen`), where `#8A6A1F` falls to 4.48/4.05. `#875F04` clears AA on all four surfaces it lands on (5.72 / 5.08 / 4.60 / 4.81) and stays in the same champagne-bronze family. |
| D5 | 2026-07-25 | **Accent TEXT resolves to `accentPressed`; `accent` stays the fill/line/selected color.** Beyond the task's literal scope, but forced by it: U0.T1's deeper `bg` dropped `accent`-on-`bg` to 4.27:1 (it was 4.57 before), and CC-6's chip failure is the same root. This is the exact `premium`/`premiumInk` split one level over — `accentPressed` clears AA on every surface in both schemes (4.74–5.91 light, 7.04–8.52 dark) and reads as the same red. Applied in `Text`'s tone map, `Button`'s tonal/secondary/ghost labels, and the 7 direct `color={colors.accent}` **Text** sites in `src/features` (Icon sites are U0.T3's sweep). |
| D37 | 2026-07-25 | **Switching the fortune fetch to the LOCAL date has a consequence worth stating: the backend generates `fortune_templates` on a UTC date.** In timezones ahead of UTC the local date can be a day the generator hasn't produced yet, which now surfaces as U2.T1's honest retry card. That is strictly better than the defect it replaces — silently pairing today's header with yesterday's fortune — but **whoever owns `fortune-generate` should widen its window** so ahead-of-UTC users aren't briefly empty. Backend is out of scope for this ledger, so it is recorded, not fixed. |
| D38 | 2026-07-25 | **Device locale is tried first, then `en` — not device-locale-only.** `fortune_templates` has rows only for locales the generator has run for, so passing `fr` blindly would turn a missing TRANSLATION into a missing FORTUNE. Two reads at worst, and only when the device isn't English. |
| D35 | 2026-07-25 | **DEPENDENCY ADDED: `@react-native-community/datetimepicker` 9.1.0**, via `npx expo install` (Expo picked the SDK-56-compatible version and registered its config plugin). This is the ONE addition this ledger permits, and U2.T5 is the task it was permitted for. Nothing else was added. |
| D36 | 2026-07-25 | **Web gets a typed `YYYY-MM-DD` field, not the spinner.** `datetimepicker` has no web implementation; the sheet branches on `Platform.OS`. So the harness screenshots the fallback, and the **native spinner is a device-only leg** — which is why this task is `[~]`. The web field keeps the old regex validation and disables Save until it passes, so the fallback is usable rather than decorative. |
| D33 | 2026-07-25 | **The week strip is a TRAILING seven days, not a Sunday–Saturday calendar week.** §4.1 says "seven columns"; a trailing window always shows the user's own recent rhythm, where a calendar week empties out every Monday and would make a real habit look broken. |
| D34 | 2026-07-25 | **The opened-days store is device-local (`AsyncStorage`), and the ledger's OUT OF SCOPE list keeps it that way.** Real retention data is backend work this loop must not do. A local list is honest about what it knows: it undercounts across a reinstall or a second device, and it never invents a run — which is the failure SH-9 actually describes. `streakRun` returns 0 unless the run touches today or yesterday, so a stale streak from last month can never print. |
| D32 | 2026-07-25 | **The day-pillar explainer is an inline disclosure card, not a popover or sheet.** Direction §4.1 says "popover/sheet"; an inline card under the header is simpler, needs no new modal route, is reachable device-free (so the Verify's "explainer opens in web export" is genuinely testable with a trusted tap), and reads fine at 390pt. The pill's label is `textPrimary` on `surfaceSunken` per the U0.T2 chip contract, not the `textSecondary` §4.1 suggests — that pairing is 4.25:1 and deliberately absent from the AA matrix. |
| D30 | 2026-07-25 | **SH-2 is fixed in the state resolver, not at the call site.** `useEntitlement` already exposed `loading`; the route simply ignored it. Folding `entitlementLoading` into `homeState` means the skeleton covers the entitlement window, so the locked/unlocked branch cannot render early **by construction** — and it is unit-testable, which a call-site `&&` would not have been. |
| D31 | 2026-07-25 | **SH-3's reflow proof is not obtainable device-free, and the measurement I built says so rather than pretending otherwise.** I sampled the hero's top edge (60×) — stable, but meaningless, since the tail sits BELOW the hero and never moved it either way. I then sampled `document.body.scrollHeight` to count layout STAGES, which is the right metric — but in a static web export all three tail reads resolve to "nothing to show" (no Supabase session → `isAnonymous` false; no native permission API → no notify row; no pending compat), so the tail is empty and the measurement cannot distinguish before from after. Structurally the fix holds (one `tailReady` gate, one mount, one fade); the visible proof needs a device/session. |
| D28 | 2026-07-25 | **`firstRun` is answered by `hasFirstReadingComplete()`, never by a missing fortune.** That substitution IS SH-1. The session flag is an existing local read (no backend), and the route now waits for BOTH it and the fortune context before leaving `loading` — resolving one without the other is how the flash slipped through. |
| D29 | 2026-07-25 | **A missing fortune ROW on an otherwise-ready screen resolves to the retry card, not to a fourth state.** "Today's reading isn't loading" is honest for an ungenerated row, and the point of SH-1 is that it must not be the first-run hero — a user with a dozen readings must never be told they have never had one. Recorded because the resolver's doc originally said `ready`, which the type system correctly rejected. |
| D27 | 2026-07-25 | **The launcher holds a bare `<Screen/>` until routing resolves, rather than delaying the splash hide.** SN-8 asks that a returning user never see the marketing lockup. The splash is hidden in `_layout.tsx` on `fontsReady`, and that hide also serves every other entry route (deep links into `/reveal`, `/claim`), so gating it on the index route's async state would hang the splash on those. Holding a paper-colored frame inside `index.tsx` is local, achieves the stated outcome, and the two AsyncStorage reads behind `resolved` are fast enough that it reads as part of the splash. |
| D26 | 2026-07-25 | **"Am I a tab root?" is answered by the route, not by `router.canGoBack()`.** I tried `canGoBack()` first; the screenshot caught it still rendering a back arrow on the Ask tab. Inside a tab navigator `canGoBack()` is TRUE simply because switching tabs is history, so it cannot distinguish a tab root from a pushed screen. The fix: `ChatThread` drops its `router.back()` fallback and `HistoryShelf` gains an `onBack?` prop — the route that owns the screen passes one only when it pushed. Tab roots pass nothing and render nothing. |
| D24 | 2026-07-25 | **The pair CTA resolves the caller's OWN newest reading via `loadHistory()[0]`, and hides itself when there is none.** SN-6's "See my full reading" pushed `/reveal` with no id. The compat row (`CompatResultRow`) carries only status/score/sub_scores/narrative — no reading id — and adding one would be a backend change, which this ledger forbids. `loadHistory()` is an existing RLS-scoped client read, so the newest reading is the honest local answer. `onFullReading` is `undefined` while it resolves or when the user has none, and `PairRevealView` omits the button rather than offering a broken one. |
| D25 | 2026-07-25 | **Reveal `Done` uses `router.replace`, not `push`.** Today becomes the root; a finished reveal must not sit in the back stack behind home, or "back" from Today re-enters a reading the user just closed. |
| D22 | 2026-07-25 | **The tab bar carries an explicit `height: 64 + insets.bottom`.** react-navigation sizes the bar for its own ~10px label; Direction §1 P3 asks for `caption` (13px), which overflowed and clipped the labels against the viewport edge — visible in the first shot and confirmed by pixel probe at both 844 and 950 heights, so not a shoot artifact. 56pt still left 2pt of label on the edge; 64pt measures clear. An explicit height opts out of the automatic safe-area addition, so the inset is added back by hand. |
| D23 | 2026-07-25 | **`IconProps.color` widened from `string` to `ColorValue`.** react-navigation hands `tabBarIcon` a `ColorValue`, and stringifying it would be wrong for the platform-opaque case. react-native-svg accepts `ColorValue` throughout, so the wider type is the honest one and every caller benefits. |
| D21 | 2026-07-25 | **The accent litmus is verified by band analysis, not by eye.** Counting "non-interactive accent occurrences" across 14 screenshots by inspection is slow and unrepeatable. Instead: count accent-family pixels per row, group into contiguous bands, and rank by mass. A primary CTA is unmistakable (a ~h104 band at 2× = 52pt, holding 90–100% of the accent), a selected state is a mid-size band, and anything decorative would show up as an unexplained band. Every band on all 5 screens × both schemes resolved to a CTA, a selected state, a link, or a <1% palm-line sliver. This method is reproducible at the U8 final gate and catches regressions a glance would miss. |
| D19 | 2026-07-25 | **The 44pt guard is a token assertion, not a rendered hit-box assertion.** U0.T7's verify asks for "a new unit test asserts `HeaderIconButton` min hit box 44", but this repo has no RN component renderer (`jest-expo` only, all suites pure-logic) and the ledger's dependency rule forbids adding `@testing-library/react-native`. `HeaderIconButton` sizes its box from `controlHeight.md`, so the test guards that token at ≥44 and the rendered box is confirmed in the checkpoint shots. Adding the renderer would be its own task. |
| D20 | 2026-07-25 | **`HeaderTextButton` added alongside `HeaderIconButton`** for chrome that is a word, not a glyph (paywall Restore / Terms / Privacy). Same 44pt floor, spring and tick; a `minHeight` rather than a fixed box so the label still wraps. The task named "paywall text links" without saying how — one shared primitive beats three hand-tuned `hitSlop`s. |
| D17 | 2026-07-25 | **Removed the `background` alias outright rather than leaving it unused.** U0.T6's verify demands `grep -Rn "colors.background" app/src` → **0**, and the alias's own back-compat test referenced it, so "migrate the consumers" alone could never reach 0. It had the only remaining production consumers of the six deprecated aliases; the other five (`text`, `gold`, `onGold`, `jade`, `seal`) have none in `src/` and stay as documented no-ops. |
| D18 | 2026-07-25 | **Merging `Segment`+`FramingPill` into `SelectPill` also fixed a live AA failure U0.T2 could not see.** Both wrote `color={active ? theme.colors.accent : theme.colors.textSecondary}` — a CONDITIONAL, so U0.T2's `color={theme.colors.accent}` grep never matched it, leaving accent-on-accentMuted (4.00:1) and textSecondary-on-surfaceSunken (4.25:1) shipping. The merged primitive uses `accentPressed` / `textPrimary` per the standing contract. **Lesson for later tasks: grep for the token name, not the full expression.** |
| D15 | 2026-07-25 | **`apple` and `google` are house approximations, not the official brand assets — flagged in `Icon.tsx` and here as an owner task.** Direction §2 asks for "brand marks, mono-stroke", and these are drawn in the set's style so the auth buttons read correctly in development and in the harness. But Apple's HIG requires their *supplied* "Sign in with Apple" mark and Google requires the "G" from their official asset pack; shipping a hand-drawn approximation to a store is a compliance failure, not a design choice. **Must be swapped before store submission (🧑).** |
| D16 | 2026-07-25 | **The premium `FortuneCard` (Do/Avoid rows + the Lucky compass) has NO dev route**, so its new `check`/`close` icons and the rotated compass are verified by typecheck + the bearing unit tests only, not by screenshot. U0.T5's own Verify line doesn't ask for that shot, but **U3.T1/U3.T2 must add a `/dev/fortune-premium` fixture route** — the almanac card is the screen the owner complained about and it currently cannot be seen device-free at all. |
| D14 | 2026-07-25 | **Fixed CO-12's overlap out of ledger order, at the owner's request mid-U0.** Root cause was one line, not a composition problem: `ShareView` rendered in a non-scrolling `Screen` with the preview in a `flex: 1` slot, and the compat preview's intrinsic height is ~2× what flex could grant it on an 844pt device. Yoga doesn't clip, so the card painted over the toggle, framing picker and channel row — every "overlap" in the screenshot was that one overflow. `<Screen scroll>` + intrinsic height on the slot. The REST of U6.T1 (edge-to-edge channel row with trailing fade + peek, unified 340pt preview frame, `editorialTitle`, copied-label, channel analytics) is untouched and still owed. |
| D11 | 2026-07-25 | **The one entrance system is a shared `useEntrance()` hook in `@/theme`, consumed by `Card`'s `entranceIndex` and by the two bare-text heroes that aren't cards.** Direction §3 says "`Card entranceIndex` everywhere", but the reveal's headline and summary are `Text`, not cards — wrapping them in cards to get an entrance would be worse. One builder, two consumers, no second system. Consequence: reveal entrances move from `stagger.reveal` (90ms, its old private number) to `stagger.list` (60ms), because that is what the shared system uses. `stagger.reveal` survives for FortuneCard's internal unfold and the pair sub-score bars. |
| D12 | 2026-07-25 | **Added `duration.rotate: 2800`, a fourth token beyond Direction §2's three.** §2 lists breath/thread/ring, but the task's own Verify grep includes `2800` — the rotating-copy interval is an authored beat like the others and had no name. Also re-pointed the streak flame's bare `900` to `breath`, which §2 didn't enumerate (it is a breathing loop, and U2.T4 deletes it anyway). |
| D13 | 2026-07-25 | **`useRotating` is gated on `Platform.OS !== 'web'`, dropping the reduce-motion term.** Direction §3: rotating copy is content, not motion, so it keeps advancing for reduce-motion users; only the `FadeIn` crossfade hard-swaps. The web term stays so the static export screenshots deterministically on line 1. |
| D7 | 2026-07-25 | **The share invite row's `thread` icon KEEPS its claret** — the ledger lists `ShareView.tsx:272` as a violation, but Direction §4.7 is explicit and more specific ("thread toggle icon keeps claret ONLY on the compat-invite row (its motif home)"). The icon literally *is* the red thread. The sibling at `:248` (a `shield`) had no such claim and went ink. Direction supersedes the ledger on color-quantity per the loop's own precedence rule. |
| D8 | 2026-07-25 | **`FeatureIcon`'s default tone is now `ink`, not `accent`** (union `'ink' \| 'heritage' \| 'premiumInk'`, tile always `surfaceSunken`). The reveal renders 6–8 of these per screen; leaving the default accent would have made the ≤2 litmus unreachable no matter what else changed. Two call sites also lost a claret they never earned (`palm` ×2, `check`) — heritage is the thread + seal only. |
| D9 | 2026-07-25 | **The chat assistant's `Logomark` avatar keeps its accent tone.** It is the brand mark (the audit's §6 "do not regress" list names the two-tone mark), not decoration — the same standing as the corner seal. Chat is also not one of the three screens the litmus counts. Revisit if U6.T3's shots read hot. |
| D10 | 2026-07-25 | **Sub-score bars are all-ink**, taking Direction §4.6's second option rather than "accent on the strongest dimension" — the litmus is the tiebreak the direction itself names, and a per-row accent would put 1–4 non-interactive accents on the pair screen. |
| D6 | 2026-07-25 | **CC-4's score numeral was fixed here, not deferred to U5.T3.** The AA matrix carries a "≥24px premium numeral" row; leaving `ShareView`'s ring on `colors.premium` (2.59:1, under even the 3:1 large-text floor) would have made that row describe an intent the code didn't meet. The arc moved with the numeral so ring and value still match. U5.T3 keeps the pair-screen composition work. |

## OUT OF SCOPE (do not execute here — report, never build)
- RevenueCat purchase wiring, offerings, prices (R1.T4 🧑 + R4) — U6.T6 only makes the paywall
  honest *without* commerce.
- Push provider/token plumbing (F1.T10 tail), store accounts, domain/Turnstile (R1 🧑).
- Camera/capture surfaces (`features/capture/*`, `(capture)/*`) and anything in
  `Planning/MVP_Buildplan.md`'s R3 track — paused by the owner.
- Backend/Edge/schema/migrations. Server card-render templates (F1.T9 tail owns card craft).
- Lunar-calendar library hunt (standing DO-NOT-BUILD default: skip).
- Real streak *backend* data (retention wiring) — U2.T6 builds the honest client surface only.

---

## U0 — Foundations: color, surface, contrast, system (Design-Direction §1–§3)

- [x] **U0.T1** 🤖 Retune the light surface stack for real separation (CC-3, Direction §2):
  in `tokens.ts` vermilionSkin.light set `bg #F4F1EB`, `surfaceSunken #EAE6DE`; make `Card`
  keep its hairline border at every elevation on the light scheme (scheme-aware `showBorder`);
  audit `shadow.sm` consumers — separation must never be shadow-only. Dark unchanged.
  - Verify: standing gates; shoot `/fortune` + `/history` light before/after into
    `docs/checkpoints/audit4/u0/`; cards visibly separate (border present in the PNG); tokens
    test updated for the new hexes.
- [x] **U0.T2** 🤖 Contrast remediation + the AA test matrix (CC-4..CC-9, Direction §2): add
  `premiumInk` role (light ≈`#8A6A1F`-region tuned to ≥4.5:1 on `#FFFFFF`; dark `#D9B25A`);
  move chip/tonal label color to `accentPressed` (measure ≥4.5:1 on `accentMuted`, else
  `textPrimary`); visible off-toggle track token; extend `theme/__tests__/tokens.test.ts` with
  a computed WCAG matrix over every used pairing (both schemes) per Direction §2 table — the
  test FAILS on any listed pairing <4.5:1 (<3:1 for ≥24px numerals).
  - Verify: standing gates with the new tests green; the matrix covers ≥10 pairings; grep shows
    no remaining `tone="premium"` on 13px text over white (call sites move in U2–U6; this task
    fixes the primitives: `Text` tone map gains `premiumInk`, `Button` tonal label, share
    `Toggle` track, chat send disabled state).
- [x] **U0.T3** 🤖 Icon-color discipline sweep (CC-1, Direction §1 P1): default
  decorative/leading icons to ink across post-capture surfaces — FortuneHome rows/streak,
  FortuneCard chip, share channel tiles + monograms, analyzing step dots + proof chip,
  sub-score bars/icons, settings tiles. Accent remains ONLY on: primary CTA, selected/active,
  highlighted palm line, links. `heritageAccent` only thread-motif + seal (fix
  `ShareView.tsx:248,272` violations).
  - Verify: standing gates; shoot `/fortune`, `/dev/reveal-ready`, `/share` light — count
    non-interactive accent occurrences ≤2 per screen (record the counts in the Build Log line).
- [x] **U0.T4** 🤖 One motion system (CO-10, Direction §2/§3): add `motion.duration.breath:
  1500`, `thread: 800`, `ring: 900`; re-point 1400/1500/800/900 call sites; replace
  RevealView's manual `FadeInDown` stagger with `Card entranceIndex` (hero index 0 — hero
  animates first everywhere, FortuneCard included); `PairRevealView` stagger uses
  `motion.stagger.reveal`; fix `useRotating` over-gating (copy rotates under reduce-motion,
  hard swap).
  - Verify: standing gates; `grep -RnE "(1400|1500|2800|withTiming\(1, \{ duration: 8?900)"
    app/src/features` shows only token-derived durations; motion test extended for the new
    tokens.
- [x] **U0.T5** 🤖 Icons replace glyphs (CO-7, CO-8, Direction §2): add `today`, `compass`
  (rotatable), `logout`, `warning`, `apple`, `google` to `Icon.tsx` (house stroke style, default
  labels); replace `✓/✕` (FortuneCard), text arrows (`DIRECTION_ARROW` → compass rotation map;
  delete leading-space path), "Link copied ✓" (icon + fitting label), `AccountSheet` info→warning,
  settings sign-out back→logout, analyzing failure camera→warning; strip emoji from
  `lib/shareText.ts`.
  - Verify: standing gates; `grep -RnE "[✓✕↑↗→↘↓↙←↖✨👇]" app/src --include=*.ts*` → only
    `/dev` or test fixtures; icon snapshot/dev-theme route renders the six new icons.
- [x] **U0.T6** 🤖 Type-scale + magic-number cleanup (CO-11): add `typography.editorialTitle`
  (serif 24/30/−0.3); replace both ShareView inline overrides + PaywallView `fontSize:11` +
  `fontWeight:'700'`; migrate deprecated `colors.background` → `bg` (Screen, ChatThread,
  PaywallView); merge `Segment`/`FramingPill` into one primitive; tokenize the worst raw
  numbers touched here (radius 44→`pill`, chip paddings→spacing scale).
  - Verify: standing gates; `grep -RnE "fontSize: ?[0-9]|fontWeight:" app/src/features` → no
    hits outside tokens/tests; `grep -Rn "colors.background" app/src` → 0.
- [x] **U0.T7** 🤖 44pt + press-feedback sweep (CO-9): shared `HeaderIconButton` (44pt box,
  spring, `tick()`); adopt for FortuneHome gear/camera, HistoryShelf gear + row share, paywall
  close, share close, AppHeader back (add haptic), paywall text links. `AppHeader` gains
  `onClose` (✕ mode).
  - Verify: standing gates; a new unit test asserts `HeaderIconButton` min hit box 44; grep
    shows no bare `Pressable` around `Icon` in post-capture features (except documented cases).
- [x] **U0.G** 🚦 Foundations gate: standing gates + shoot light/dark `/fortune`, `/history`,
  `/dev/reveal-ready`, `/share`, `/paywall` to `docs/checkpoints/audit4/u0-gate/`; acceptance
  checks 1–3 of Design-Direction §6 pass on these shots; update STATE.

## U1 — Navigation backbone (SN-*, Direction §1 P3)

- [x] **U1.T1** 🤖 Bottom tab bar: convert `(home)/_layout.tsx` to expo-router `Tabs` — Today
  (`/fortune`, `today` icon) · Readings (`/history`, `palm` icon) · Ask (`/chat`, `chat` icon);
  `surface` bg, top hairline, safe-area, active accent/inactive `textSecondary`, labels
  `caption`; remove the Readings/Ask `RowLink`s from FortuneHome (SN-2, SN-5); redirects and
  deep links (`/chat?q=`) keep working.
  - Verify: standing gates; shoot all three tabs light+dark; tab switch works in the web
    export; `router.push('/chat?q=x')` from the fortune bridge still lands with the prefill.
- [~] **U1.T2** 🤖 Close the loop — reveal Done (SN-1): AppHeader right "Done" on the ready
  reveal → `router.replace('/fortune')`; share sheet closed after arriving from reveal returns
  to reveal (unchanged) but reveal Done remains available; pair reveal footer gains secondary
  "Done" → `/fortune` and its "See my full reading" carries `readingId` (SN-6).
  - Verify: standing gates; jest route test (or dev-route walkthrough shot) proving
    reveal→Done lands on Today WITHOUT relaunch; pair CTA opens the real reading in the web
    export (`/dev/reveal-ready` pattern or fixture id).
- [~] **U1.T3** 🤖 Push/modal chrome (SN-3, SN-9, SN-10). ⚠ **U1.T1 note: the Ask (chat) tab root also renders a back arrow now** — `ChatThread` always passes `onBack`. Both History AND Chat need the tab-root-shows-no-back treatment. History gets `onBack` when pushed
  (tab root shows none — read `router.canGoBack()`/route params); share/paywall/account
  headers use `onClose` ✕; `(reading)` stack: `replace` transitions fade (no
  slide-from-right), animation gate includes web.
  - Verify: standing gates; shoot `/history` (pushed variant via settings route) showing back;
    share/paywall shots show ✕ not ←.
- [x] **U1.T4** 🤖 New-scan entries (SN-4): Today header camera `HeaderIconButton` → `/primer`;
  populated Readings gets a top "New reading" flat row → `/primer`.
  - Verify: standing gates; `/fortune` + `/history` (non-empty dev fixture) shots show the
    entries; both navigate in web export.
- [x] **U1.T5** 🤖 Launcher honesty (SN-8): hold the splash until the redirect resolves
  (returning users never see the marketing launcher or its logo draw); delete the 1500ms
  auto-advance race (explicit Get started only); keep `__DEV__` route-map behind `__DEV__` but
  out of the default tree per MVP ledger note.
  - Verify: standing gates; web export: with `hasFirstReadingComplete` seeded true the first
    rendered frame is `/fortune` (assert via shoot of `/`); with it false, the launcher renders
    with no timer navigation (manual tap only).
- [x] **U1.G** 🚦 Navigation gate: standing gates + Design-Direction §6 check 4 (journey:
  analyzing→reveal→Done→Today; every pushed screen back; every modal ✕; tabs switch) verified
  in the web export; shots to `docs/checkpoints/audit4/u1-gate/`; update STATE.

## U2 — Today (home) recomposition (Direction §4.1, §4.3)

- [x] **U2.T1** 🤖 Honest states (SH-1): add `Skeleton` primitive (surfaceSunken, breath,
  reduce-motion static); `(home)/fortune.tsx` exposes `loading`/`error` to `FortuneHome`;
  loading = header + week-strip + fortune-skeleton; error = retry card (never first-run);
  first-run ONLY when `firstRun` is truly known (no reading).
  - Verify: standing gates + new jest states test (loading ≠ first-run; error shows retry);
    dev routes `/dev/fortune-*` extended with `loading`/`error` fixtures; shots of both.
- [~] **U2.T2** 🤖 Kill the reflow + premium flash (SH-2, SH-3): entitlement/notify/thread/
  claim resolve behind the skeleton or fade in without shifting layout (reserve or animate
  height); premium branch renders only after entitlement resolves.
  - Verify: standing gates; jest asserts no locked-branch render while entitlement pending;
    web export visual check (no visible jump on `/fortune` load).
- [x] **U2.T3** 🤖 Today header (CO-9, CP-5, Direction §4.1): rebuild on shared metrics —
  display weekday, `bodyLarge/secondary` date, "Wood Rat day" becomes a tappable ink pill with
  a 2-sentence explainer popover/sheet; right: camera + settings `HeaderIconButton`s.
  - Verify: standing gates; shot shows the pill; a11y labels on both header buttons; explainer
    opens in web export.
- [x] **U2.T4** 🤖 Week strip — the calendar (SH-9, Direction §4.1): new `WeekStrip` (7
  columns: weekday initial + dot; today = accent ring; past-opened = ink fill; future =
  hairline) driven by a local fortune-opened-dates store (write on fortune render; this is
  client-honest, no backend); streak line only when a real computed run ≥2 exists; delete
  `StreakStrip` + its dead `d0..d6`/clamp logic; drop the infinite flame pulse.
  - Verify: standing gates + unit tests for the run computation (0/1/3/8-day cases; month
    boundary); `/fortune` shot shows the strip; analytics `fortune_opened.streak` reports the
    computed value (no hardcoded 0).
- [~] **U2.T5** 🤖 Birth-date sheet (SH-4, CO-15, Direction §4.3): true bottom sheet (scrim,
  handle, slide-up; reduce-motion static) shown AFTER the first fortune render; native
  datetimepicker spinner (`npx expo install @react-native-community/datetimepicker`, Decision
  Log entry); skip persists (AsyncStorage flag) + Settings row "Add birth date" as the way
  back; save failure = inline warm error, sheet stays; copy per Direction §5.
  - Verify: standing gates; jest: skip persisted → sheet never re-shows; failure keeps sheet
    with error; web fallback renders a usable date input (web has no native spinner — document
    the fallback in the ledger note).
- [x] **U2.T6** 🤖 Rows cleanup (SH-13, CP-2): notify opt-in → one-line inline row (hidden on
  web); red-thread row requires a real partner name (else hidden); claim-account row moves to
  Readings (banner, empty state included — CO's history note); FortuneCard gets `entranceIndex`
  0 (hero first).
  - Verify: standing gates; `/fortune` shot: post-hero content is ≤ hero+strip+2 rows; grep
    `'your match'` → 0 production hits.
- [x] **U2.T7** 🤖 Date correctness (SH-14): fortune bucket key = LOCAL date (one shared
  `localDateKey()` util replacing `todayUtc()` for fetch + header; unit-test the UTC±
  boundaries); pass device locale into `loadTodayFortune`; delete dead CJK `pillar` compute +
  `PREVIEW_FORTUNE` from the production module (move to `/dev` fixture file); fix `fortune.do`
  → `dos`/`donts` naming.
  - Verify: standing gates + boundary unit tests (UTC+10 morning, UTC−8 evening) green;
    grep `todayUtc` → 0.
- [ ] **U2.G** 🚦 Today gate: standing gates; shoot `/fortune` light+dark+320 (all states via
  dev fixtures) to `docs/checkpoints/audit4/u2-gate/`; accent litmus ≤2; no reflow; update
  STATE.

## U3 — The almanac card (Direction §4.2)

- [ ] **U3.T1** 🤖 Recompose `FortuneCard` (CC-2, CO-6): eyebrow sans icon-chip; essence in the
  serif moment (`editorialTitle` size range); Do/Avoid → full-width rows with 16px
  `check`/`close` icons (`success`/`danger` on the ICON only, headings ink); aspects labels
  `secondary`; four-hue check: card shows accent only on its CTA/link.
  - Verify: standing gates; shots light+dark+320; accent litmus on the card; no `✓✕` glyphs.
- [ ] **U3.T2** 🤖 Lucky row responsive (CO-6): compass icon rotated per direction (map with a
  safe fallback — no leading space), wrap grid `flexBasis` thirds collapsing 2+1 <360pt; hours
  string fits at 320pt.
  - Verify: standing gates + a 320×568 shot with no clipped/orphaned Lucky cells; unit test for
    the direction→rotation map incl. unmapped input.
- [ ] **U3.T3** 🤖 Free state + bridge (CP-6, CO-14-part): single lock line per Direction §5;
  CTA "Unlock the full almanac" with the AA-fixed tonal label (U0.T2); "Ask about today"
  prefill guards empty values and opens chat focused (autoFocus param honored by ChatThread —
  coordinate with U6.T4 if not yet landed; whichever lands second wires the focus).
  - Verify: standing gates; free + premium shots; prefill with empty direction produces a
    well-formed question (unit test).
- [ ] **U3.G** 🚦 Almanac gate: standing gates + shots (free/premium × light/dark × 375/320) to
  `docs/checkpoints/audit4/u3-gate/`; update STATE.

## U4 — Reveal (Direction §4.4)

- [ ] **U4.T1** 🤖 Tail order + consolidation (CO-2, SH-10): reorder to sections → Compare
  (flat row-card restyle) → locked → ONE "Continue" card (other-hand + other-kind rows;
  dismiss persists; hidden when done) → TrustFooter LAST → disclaimer; survey moves below
  section 1 with `size="md"` buttons (SH-11, CO-6) + kind-aware copy.
  - Verify: standing gates; `/dev/reveal-ready` + `/dev/reveal-face` shots show the order;
    survey buttons fit at 320pt; dismiss persists across remount (jest).
- [ ] **U4.T2** 🤖 Share affordance + Done (CO-3): replace SealFab with the labeled share pill
  (surface bg, border, `shadow.md` on a real background, safe-area inset); ReadyStamp stays as
  the sole stamp; Done in the header (lands in U1.T2 — this task finishes the pill/stamp
  visuals if U1.T2 already added Done).
  - Verify: standing gates; reveal shot shows one stamp + the labeled pill within safe area;
    iOS shadow renders (verify style props — background set), Android `elevation` on a filled
    view.
- [ ] **U4.T3** 🤖 Section visuals (CO-5): distinct thumbs — 4 line-sections keep mini palms
  with a retuned visible highlight (fix mini underlay/bloom math in `PalmDiagram`: silhouette
  behavior documented honestly, `silhouette` prop respected or removed); hand_shape/mounts/
  markings + face sections get distinct ink feature icons; LockedCard titles `heading` +
  `premiumInk` marker; elevation unified (hero block only `md`).
  - Verify: standing gates + PalmDiagram unit test for mini stroke/underlay ratios; reveal shot:
    every section thumb visually distinct; locked titles match free title weight.
- [ ] **U4.T4** 🤖 Reveal honesty (SH-8, SH-16): pending badge → "Photo deletes within 24
  hours"; `deletedLabel` locale-aware (Intl time, date included when not today); geometry
  resets on reading-id change; history header badge same honest default (coordinate U6.T5).
  - Verify: standing gates + unit tests (deletedLabel: today/older/kept/absent; geometry reset
    on id change); grep default `PrivacyBadge` usages — none claim deletion without data.
- [ ] **U4.G** 🚦 Reveal gate: standing gates; shots light/dark/320 of ready+pending+error to
  `docs/checkpoints/audit4/u4-gate/`; accent litmus; update STATE.

## U5 — Analyzing + Pair (Direction §4.5, §4.6)

- [ ] **U5.T1** 🤖 Analyzing geometry & honesty (CO-13, SH-7): pad the ring SVG viewport (glow
  never clips); center the photo on the ring axis; arc empty at 0%; progress creeps 75→92%
  during extraction (never parks); abstract-motif honesty (a11y label + non-possessive stage
  copy; possessive + real geometry when a prior reading exists); step dots ink.
  - Verify: standing gates + unit test for the creep function; `/dev/analyzing*` shots (0%,
    mid, overrun) — no clip, photo concentric; copy matches Direction §5.
- [ ] **U5.T2** 🤖 Analyzing exits + failure (SN-7, CP-4, CO-13): back during scan → confirm
  sheet; notify flow → holding screen with a way back (not the launcher); failure state:
  `warning` icon, reason-specific copy (lighting only for lighting), CTAs diverge (camera vs
  upload); overrun layout scrolls at 320×568.
  - Verify: standing gates; failure dev route shows both CTAs hitting different destinations;
    320 shot of overrun scrolls (content not clipped).
- [ ] **U5.T3** 🤖 Pair mechanics (CO-16, SH-15, CC-4). ⚠ **Add a `/dev/pair-*` fixture route first** — `(reading)/pair` is currently unreachable device-free, which left U1.T2's pair leg `[~]` (D24). Then: real geometries when stored (fallback
  `differentiateGeometry`); score numeral `premiumInk`; SubScoreBar flex labels + tabular
  values (no fixed 72/28); `DIM_ICON` keyed on stable keys; empty narrative renders nothing;
  ScoreRing `accessible` with a single label; success haptic once per pairId; auto-present
  share delayed past choreography end OR replaced by a "Share this" pill (owner-taste — pick,
  record in Decision Log); waiting state timeout + nudge; 402 pre-checked before render.
  - Verify: standing gates + unit tests (empty narrative, haptic-once guard, dim-icon
    fallback); `/dev/share-compat`-style pair shot at 1.3× font scale — bars aligned.
- [ ] **U5.G** 🚦 standing gates; shots to `docs/checkpoints/audit4/u5-gate/`; update STATE.

## U6 — Share, Chat, History, Paywall, Account (Direction §4.7–§4.11)

- [ ] **U6.T1** 🤖 Share sheet layout (CO-12). ⚠ **The `scrollable` leg ALREADY LANDED on 2026-07-25** (owner reported the sheet looked "distorted / overlapped" while U0 was in flight — see Build Log + D14). Do not re-do it; the remaining scope is everything else in this line:  edge-to-edge channel row with
  trailing fade + peek (last tile visibly partial); unified 340pt-max preview frame for PNG and
  vector; `editorialTitle`; toggles visible off-state; copied → icon+fitting label, resets on
  regenerate; channel analytics values from `CHANNELS` only.
  - Verify: standing gates; 320×568 + 375 shots — nothing overlapped/below fold; grep
    `onShare('share')` → 0.
- [ ] **U6.T2** 🤖 Share compat honesty (SH-7, CO-12): no score-0/"Your match" path — from
  reveal the compat entry is invite-first (no fabricated card); compat card variant renders
  only with a real pair (real names/score); partner palm via `differentiateGeometry` until real
  partner geometry exists (Decision Log the fallback).
  - Verify: standing gates + jest: `ShareView` with no pair shows invite variant (no score
    ring); with pair fixture shows real values; grep the default blurb string → `/dev` only.
- [ ] **U6.T3** 🤖 Chat mechanics (CO-14, SH-6, CC-7/8): auto-scroll (`onContentSizeChange` +
  ref) for send/receive/typing; Android `KeyboardAvoidingView` behavior (`height` +
  `keyboardVerticalOffset` or `android:windowSoftInputMode` note); error → inline system row
  with retry (never assistant bubble); send disabled = sunken+tertiary; composer hairline
  border unfocused; chips ink; chip-fade height measured; `key` stable; empty/short-thread
  alignment unified; prefill autoFocus.
  - Verify: standing gates + jest (error renders system row not assistant message; autoscroll
    called on append); chat shots light/dark; gate CTA goes straight to paywall.
- [ ] **U6.T4** 🤖 History shelf (CO-5, SH-5, SH-12, CO-4): pinned header (outside scroll) +
  back when pushed (U1.T3); error state with retry (never empty-state lie); thumbs — palm mini
  (silhouette embraced, comments fixed) vs face icon tile (no fake palm geometry; delete
  `FACE_GEOMETRY`); type chip ink; date `secondary` + safe fallback; share action 44pt with own
  haptic (row haptic suppressed on inner press); chevron dropped; Unchanged banner kind-aware +
  standard card; claim banner incl. empty state; `now` refreshes on focus.
  - Verify: standing gates + jest (error state, kind-aware banner, date fallback); shots
    empty/populated light+dark.
- [ ] **U6.T5** 🤖 Paywall honest + polished (SH-7, CC-4/5, CO-9): hero from the user's latest
  reading geometry (abstract fallback + generic copy when none); inclusion icons ink; unselected
  plan flat-bordered; parallel plan secondary lines; no invented prices — plan cards labeled
  without numbers until RevenueCat (keep `PLANS` shape, strings from a single
  `PLACEHOLDER_OFFERS` marked clearly; CTA disabled note per Direction §4.10); `PremiumSeal`
  caption-on-fill; disclosure `small/secondary`; close/restore/links 44pt+spring.
  - Verify: standing gates; paywall shots light/dark; grep `'$35.88'|'SAVE 40%'|'$4.99'` → 0
    production hits; a11y labels on close/links.
- [ ] **U6.T6** 🤖 Account sheet (CO-7, CO-15, CP-10): Apple black-fill + mark, Google
  white-fill + G mark (mono-stroke marks in `Icon.tsx` per U0.T5), phone outlined distinct;
  `warning` icon errors; input horizontal padding + centered OTP without tracking shift; drop
  the streak promise line.
  - Verify: standing gates; account shots (choices/phone/otp); the three provider buttons are
    visually distinct in the PNG.
- [ ] **U6.G** 🚦 standing gates; shots to `docs/checkpoints/audit4/u6-gate/`; update STATE.

## U7 — Copy, a11y, dead code (Direction §5)

- [ ] **U7.T1** 🤖 Copy sweep: implement every Direction §5 rewrite; single canonical legal +
  trust strings in `trustCopy.ts` (all 3 disclaimer variants, both trust-line variants);
  settings `?section=` for Terms/Privacy; plan pill two labels; `&apos;`→`’` sweep; US
  spelling ("Colour"→"Color", "favourable"→"favorable" — fixture files included).
  - Verify: standing gates; grep each old string → 0 production hits; i18n catalog updated for
    changed keys (`t()` sites) with tests green.
- [ ] **U7.T2** 🤖 A11y + dead-code pass: fixture diagrams never labeled "Your palm"
  (context-aware label prop threaded); ScoreRing accessible; week-strip/streak labels; delete
  `SECTION_GLYPH`, decouple `LINE_LABEL` CJK gating, remove `HandOutline` from post-capture
  exports if truly unused (verify first), `PREVIEW_*` moved to `/dev`-only modules;
  `scrollEventThrottle` for the depth tracker raised (≥100ms) with thresholds intact.
  - Verify: standing gates; grep `PREVIEW_` imports outside `/dev`+tests → 0; TalkBack-relevant
    labels asserted in jest where practical (`[~]` note for the live TalkBack leg — device).
- [ ] **U7.G** 🚦 standing gates; update STATE.

## U8 — Final acceptance 🚦

- [ ] **U8.G** 🚦 The Design-Direction §6 acceptance, in full: (1) accent litmus shots ≤2 per
  screen; (2) surface litmus; (3) contrast suite green; (4) journey walk in web export;
  (5) fixture grep clean; (6) 320pt sweep clean; (7) full-route screenshot sweep light + dark +
  320 to `docs/checkpoints/audit4/final/`; all three standing suites green. Then: STATE →
  COMPLETE, consolidated `[~]` device-leg list written into STATE (expected: live haptics,
  native springs/keyboard, datetimepicker native spinner, OS share sheet, real-device TalkBack),
  final Build Log line, commit.

---

## 🧱 Build Log (append one line per completed task)

| Date | Task | One-line result |
|---|---|---|
| 2026-07-25 | U2.T7 | **Header and fortune finally agree on what day it is (SH-14).** The row was fetched by `toISOString()` — a UTC day — while the header rendered the LOCAL weekday/date/pillar, so for much of the day in UTC±8..12 the user read "Saturday July 25" above Friday's fortune. Both now use the shared `localDateKey()` (the same helper the week strip uses); `grep todayUtc` → **0**. Device locale is threaded through with an `en` fallback (D38), and the local-date switch's backend consequence is recorded (D37). Dead weight removed: the CJK `AlmanacDate.pillar` that was computed on every render and never rendered, and `PREVIEW_FORTUNE`, which now lives in a `/dev`-only `fixtures.ts` — `grep PREVIEW_FORTUNE` outside `/dev` → **0**. `fortune.do`/`.dont` → `dos`/`donts`. **4 boundary tests** pin UTC+10 morning, UTC−8 evening, both ends of the local day, and the roll at local (not UTC) midnight. Tests 109 → 112. |
| 2026-07-25 | U2.T6 | **Today is a page with one hero, not a card stack.** The `'your match'` fallback is deleted, so the red-thread row requires a REAL partner name and hides itself otherwise (SH-13 — the default literally rendered "Waiting for your match", reading as an unfinished placeholder). The notify opt-in drops from a three-clause card to ONE line ("One quiet notification each morning.") and is hidden on web, where there is no push to opt into (CP-2). The claim row moved to Readings, where "don't lose these" is a real story next to a shelf; the shelf's EMPTY state gained the banner too. `RowLink` + its `IconName` import are now dead and deleted. **Post-hero content on `/dev/fortune-free`: 0 rows** (header + week strip + hero card), against the audit's "stack of five near-identical white cards with six accent-red icons". Gates green, 109 tests. |
| 2026-07-25 | U2.T5 [~] | **The birth-date blocker becomes a sheet (SH-4).** It was a full-screen form — despite the name — shown BEFORE any value, asking for a hand-typed `YYYY-MM-DD` with no picker and no validation message; Skip persisted nothing so it re-nagged on every open forever; a failed save was silent. Now: `Modal` + scrim + drag handle + slide-up, offered only after the fortune is on screen, with the platform date spinner (D35/D36). Skip is persisted permanently and Settings gains an "Add birth date" row (`?birthDate=1`) as the way back. A failed save keeps the sheet up with a warm inline error. **This also un-blocks `/fortune` for the harness** — the route was unshootable since U1.T4's erratum, and now shoots the real header + hero. 4 new tests pin the ask-rule (never before a fortune, never after a skip, not while resolving, not when already stored). `[~]` PENDING: the native spinner is device-only. Tests 105 → 109. |
| 2026-07-25 | U2.T4 | **Today finally has the calendar the audit said was missing (SH-9).** `StreakStrip` is deleted — its seven dots were keyed `d0..d6` with no weekday or "today" meaning, it clamped at `Math.min(streak, 7)` so a month-long habit looked like a week, it pulsed a flame forever, and because the `streak` prop was never passed it **never rendered in production at all**. `WeekStrip` replaces it: seven trailing days (D33), weekday initial over a dot, opened = ink fill, today = accent ring (the one ambient accent §4.1 allows), missed = hairline; the streak line appears only for a real run ≥2. Driven by a device-local opened-days store (D34). Analytics `fortune_opened.streak` now reports the computed run — `grep "streak: 0" app/src` → 0 hits. **15 new tests** cover 0/1/3/8-day runs (no clamp), month AND year boundaries, the anchor-on-yesterday rule, a broken run going to 0, and an earlier gap being ignored. Tests 90 → 105. |
| 2026-07-25 | U2.T3 | Today's header rebuilt (CO-9, CP-5): the day-pillar stops being decoration. "· Wood Rat day" was low-contrast tertiary jargon with no affordance; it is now an ink pill on a sunken well with a help glyph, and tapping it opens a two-sentence explainer in plain language (no CJK, no "day-pillar" term) — D32. Header keeps the camera + settings `HeaderIconButton`s from U1.T4. **5/5 checks passed with a trusted tap:** both header buttons carry a11y labels, the pill is a `role="button"` labelled "Metal Rat day — what does this mean?", the explainer starts closed, and tapping opens it. Gates green, 90 tests. |
| 2026-07-25 | U2.T2 [~] | **Premium flash killed (SH-2)** — `entitlementLoading` folded into `homeState`, so the skeleton covers the entitlement read and the locked branch cannot render while it is pending; paying users no longer glimpse the locked fortune card on every open. Guarded by a new test (D30). **Reflow restructured (SH-3)** — the notify, red-thread and claim rows were three independent async inserts; they now mount as ONE block behind a single `tailReady` flag and fade in together. `[~]` PENDING LEG: the reflow's *visible* proof is not obtainable device-free — I built the right measurement (count distinct `scrollHeight` values = layout stages) and it reports 1 stage, but in a static export all three tail reads resolve to "nothing to show", so the tail is empty and the number proves little (D31). Needs a device/session. Tests 89 → 90. |
| 2026-07-25 | U2.T1 | **The Today states stop lying (SH-1).** `showFirstRun = firstRun \|\| !fortune` collapsed three situations into the first-run hero: still-loading (so "Read my palm" flashed at every returning user, every open), fetch-failed (so it showed *permanently*, routing a 12-reading user into capture), and genuinely-new. Now a pure `homeState()` resolver owns the precedence, a `Skeleton` primitive (surfaceSunken + breath, static on web/reduce-motion) covers loading, and a retry card covers failure. `firstRun` comes from `hasFirstReadingComplete()` (D28), never from a missing fortune. Route tracks loading/failed/retry explicitly. Dev fixtures `/dev/fortune-loading` + `/dev/fortune-error` added and shot. **6 new tests pin the precedence**, including that loading and error are not interchangeable. Tests 83 → 89. |
| 2026-07-25 | **U1.G** 🚦 | **Navigation gate PASSED — 13/13 checks, all driven by TRUSTED CDP gestures in the web export, not by rendering alone.** Journey: `/dev/reveal-ready` → click Done → `/fortune`. Tabs: Readings→`/history`, Ask→`/chat`, Today→`/fortune`. Tab roots expose no `[aria-label="Back"]` (chat, history); all three modals expose `[aria-label="Close"]` (share, paywall, account); all five pushed screens expose Back (settings, legal, methodology, notifications, privacy); Readings "New reading" → `/primer`. **Out-of-scope legs, stated plainly:** §6 check 4 also names `capture → analyzing`, which this ledger cannot touch (R3 camera track paused by the owner) and which needs a live scan + backend — everything from `reveal` onward is proven. Shots → `docs/checkpoints/audit4/u1-gate/`. Standing gates: typecheck 0, lint 0, 83 tests. |
| 2026-07-25 | U1.T5 | Launcher honesty (SN-8): the 1500ms auto-advance is **deleted** (`grep setTimeout src/app/index.tsx` → 0) so advancing is only ever an explicit tap, and the route holds a bare themed frame until the redirect resolves (D27) instead of mounting the marketing lockup and starting its logo draw. **Verified two-sided by polling the DOM 70× over 3.5s from navigation, with the returning-user flag seeded into localStorage before boot:** returning → launcher tagline **never** painted, settles `/fortune`; fresh → tagline paints, stays `/`. The timer's removal is code-verified (it was web-gated, so the web run alone couldn't prove it). Gates green, 83 tests. |
| 2026-07-25 | U1.T4 | Two standing new-scan entries (SN-4): a `camera` `HeaderIconButton` on the Today header (left of settings), and a flat ink "New reading" row above the populated shelf. "Read my palm" previously existed ONLY in the first-run and empty states, so a returning user with readings had no way to start another one. **Both click-verified with trusted CDP gestures → `/primer`**, not just rendered. Shelf entrance indices shifted by one so the new row animates first. Gates green, 83 tests. |
| 2026-07-25 | U1.T3 [~] | Tab roots stop offering a back arrow (SN-3): `ChatThread`'s `router.back()` fallback removed and `HistoryShelf` given an `onBack?` prop, after `canGoBack()` proved unusable inside a tab navigator (D26 — caught by screenshot, not by reasoning). The account modal gains a ✕ (suppressed in `mandatory` mode, where there is no legitimate dismiss), joining share and paywall from U0.T7 — every true modal now closes rather than "goes back" (SN-9). `(reading)` stack: `reveal` and `pair` fade instead of sliding, since analyzing hands off with `replace` and a slide promises a back-path that doesn't exist (SN-10); the animation gate picked up the standard `Platform.OS !== 'web'` term it was missing. `[~]` PENDING: the native fade FEEL is device-only (web correctly renders settled), and the pushed-History variant has no caller (errata). Gates green, 83 tests. |
| 2026-07-25 | U1.T2 [~] | **The core loop closes.** `RevealView` gains a header-right **Done** → `router.replace('/fortune')` (D25) on the ready state; `PairRevealView` gains a secondary Done; the pair's "See my full reading" now carries a real `readingId` (D24) or is omitted. **Proven with a TRUSTED click, not inferred:** `/dev/reveal-ready` → click Done → `/fortune`, no relaunch — SN-1 was the audit's third root cause and is now closed. `[~]` PENDING LEG: the pair CTA's "opens the REAL reading" half is verified by construction only — `(reading)/pair` has no dev fixture route, so exercising it needs a live pairId + session. **U5.T3 should add `/dev/pair-*`** (same gap as the premium FortuneCard, D16). Gates green, 83 tests. |
| 2026-07-25 | U1.T1 | `(home)` converted from a bare `Stack` to expo-router `Tabs` — **Today · Readings · Ask** (order from the `Tabs.Screen` children, not filenames), `surface` bg + top hairline, active accent / inactive ink, `caption` labels, safe-area aware (D22). The Readings and Ask `RowLink`s left FortuneHome, so Today is a page rather than a menu (SN-2) and free chat is no longer a two-hop trap — the Ask TAB shows the gate and its CTA goes straight to the paywall (SN-5). **Tab switching proven with TRUSTED `Input.dispatchMouseEvent` clicks**, not just per-route renders: `/fortune → /history → /chat → /fortune`. Shot light+dark. `/chat?q=…` still resolves under Tabs; the *visible* prefill is entitlement-gated (a free user gets the gate), and that code path was not touched. Gates green, 83 tests. |
| 2026-07-25 | **U0.G** 🚦 | **Foundations gate PASSED.** 14 shots (fortune/history/today/readings/reveal/share/paywall × light+dark) → `docs/checkpoints/audit4/u0-gate/`. §6 check 1 (accent litmus) verified by band analysis (D21) in BOTH schemes: history 99% CTA + 1% link; paywall 90% CTA + 10% selected plan + 1% Restore link; share 93% CTA + 4% ON toggle + 3% selected segment; reveal 100% CTA + <1% palm-line slivers; today = the two interactive buttons. **Zero non-interactive accent blocks on any screen.** Check 2 (surface litmus) holds by the U0.T1 pixel probe + the tokens test's ≥1.05 assertions both ways. Check 3 (contrast suite) green — the 25-pairing AA matrix passes in both schemes. Standing gates: typecheck 0, lint 0, 83 tests (baseline 72). |
| 2026-07-25 | U0.T7 | `HeaderIconButton` (44pt box, press spring, `tick()`) + `HeaderTextButton` (D20) added and adopted at every chrome affordance: `AppHeader`'s back (which had a spring but **never** a haptic), FortuneHome's gear, HistoryShelf's gear + per-row share (was 38pt / 18px-glyph-sized), the paywall close (+ its Restore/Terms/Privacy links), and the share sheet. `AppHeader` gains **`onClose`** so true modals dismiss with a ✕ instead of a back arrow (SN-9) — verified on the real `/share` and `/paywall` routes, not just the dev previews. Verify grep: the one surviving `Pressable`-around-`Icon` is ShareView's full-width consent **row** (`role="switch"`, ~52pt tall) — a documented exception, not an icon button. Tests 82 → 83. |
| 2026-07-25 | U0.T6 | `typography.editorialTitle` (serif 24/30/−0.3) added and the two ShareView headlines stop overriding `editorialHeadline` down to 24 while keeping its 34px-tuned tracking; paywall seal's `fontSize: 11` dropped to plain `caption`; the channel monogram's no-op `fontWeight: '700'` becomes `variant="heading"` (family-driven weight, not synthetic on Android). `Segment`+`FramingPill` merged into one `SelectPill` — which also fixed a live AA failure U0.T2's grep couldn't match (D18). `colors.background` migrated at all 6 sites AND the alias deleted, so the verify grep is literally **0**; alias test updated. Six circle radii → `radii.pill`. Verify 1 clean except `features/dev/` (errata). Tests 81 → 82. |
| 2026-07-25 | U0.T5 | Six icons added (`today` sun-disc, `compass`, `logout`, `warning`, `apple`, `google`) plus an `Icon rotate` prop that turns the group about its centre. Glyphs retired: `DIRECTION_ARROW` (↑↗→↘↓↙←↖) → `DIRECTION_BEARING` degrees driving one rotated compass — which also kills the leading-space bug, since an unmapped direction now renders NO icon instead of `' ' + label`; FortuneCard's ✓/✕ → `check`/`close` icons; "Link copied ✓" → the tile's icon becomes a check so the label shrinks to "Copied" and stops truncating; `shareText` emoji stripped; privacy result messages de-glyphed AND `PrivacyCenter` now reads the result's `ok` flag instead of sniffing the copy for a ✓; `PlaceholderScreen`'s "← Back". Semantics fixed: AccountSheet `info`→`warning`, settings sign-out `back`→`logout`, analyzing failure `camera`→`warning`. All six verified rendering in the `/dev/theme` grid. Tests 79 → 81. |
| 2026-07-25 | (U6.T1 partial — owner request) | Share sheet no longer overlaps itself: `<Screen scroll>` + intrinsic-height preview slot, replacing a `flex: 1` slot inside a fixed-height screen whose child was ~2× taller than its box. Verified light at 390×1500 and 320×568 — preview, framing picker, invite toggle, channel row and Share button now stack in order at both widths, nothing painted over anything. Gates green, 79 tests. Still owed by U6.T1: channel-row peek/fade (the last tile is still clipped), unified 340pt frame, `editorialTitle`, copied-label, channel analytics. |
| 2026-07-25 | U0.T4 | Motion unified: `duration` gains `thread 800 / ring 900 / breath 1500 / rotate 2800`, and every literal beat re-pointed (analyzing glow 1400 and reveal breath 1500 — two numbers for one idea — both now `breath`; share thread 800 + score ring 900; streak pulse 900; pair bars `index * 90` → `stagger.reveal`). RevealView's parallel `FadeInDown` duration-stagger is deleted: a shared `useEntrance()` in `@/theme` now backs both `Card entranceIndex` and the two non-card heroes, with `entranceIndex` threaded into SectionCard/CompareCard/LockedCard/ConsistencySurvey and FortuneCard pinned to hero index 0. `useRotating` de-over-gated (rotates under reduce-motion; crossfade hard-swaps). Verify grep `(1400\|1500\|2800\|withTiming\(1, \{ duration: 8?900)` over `app/src/features` → **0 hits**. motion.test.ts +2 (79 tests); lint clean including the 6 exhaustive-deps warnings the re-pointing surfaced. |
| 2026-07-25 | U0.T3 | Ink sweep over 13 files: FortuneHome streak flame + all 7 dots + notify bell + row icons, FortuneCard eyebrow chip, chat gate tile + chips, analyzing proof chip + step dots, pair dimension glyphs + sub-score bars, history type chip + claim sparkle, paywall inclusion icons, share channel tiles + dimension chips, methodology steps, reveal face illustration — all `accent` → `textSecondary`, and every `accentMuted` well that held one → `surfaceSunken`. `FeatureIcon` defaults to ink (D8); 3 unearned claret icons + a `shield` fixed; the 2 RN `<Switch>`es picked up `trackOff`. **Accent litmus (light, 390pt): Today 0 · reveal-ready 0 · share 0** non-interactive accent occurrences (CC-1 measured ~12 on Today alone). Accent now survives only on CTAs, selected segment/pill/toggle, the palm-line highlight, and links; claret only on thread + seal. Gates green, 77 tests. |
| 2026-07-25 | U0.T2 | New `premiumInk` (`#875F04`/`#D9B25A`) + `trackOff` (`#CFC9BD`/`#454A57`) roles across all 3 skins; accent TEXT → `accentPressed` (`Text` tone map, `Button` tonal/secondary/ghost, 7 feature call sites); off-toggle track 1.15→1.65:1; disabled send icon 1.30→2.25:1; score ring numeral+arc 2.59→5.72:1. `tokens.test.ts` gains a 25-pairing AA matrix run over BOTH schemes plus a banned-pairing guard — it immediately caught a live regression U0.T1 had introduced (`accent` on the new `bg` = 4.27:1), which is what drove D5. `grep tone="premium"` → 0. Tests 73 → 77. |
| 2026-07-25 | U0.T1 | Light `bg #FAF9F7→#F4F1EB`, `surfaceSunken #F2F0EC→#EAE6DE`, `Card` border scheme-aware (light borders at every elevation); card/page separation 1.052→1.127:1 and a real hairline now renders — pixel probe of the u0 before/after shots reads `ffffff → e7e3dc e7e3dc → f4f1eb` where before it read `ffffff → (shadow AA) → faf9f7`; the 4 raw `shadow.sm` sites all already carry hairlines (none shadow-only); tokens test +1 (73). |
