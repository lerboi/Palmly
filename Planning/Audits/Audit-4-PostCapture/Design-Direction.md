# Audit 4 — Design Direction: the target post-capture experience

**Date:** 2026-07-25 · **Status:** LOCKED — this is the design source of truth for the U0–U8 loop
**Relationship to existing specs:** this EXTENDS `Planning/UIUX/UIUX-Redesign-v2.md`
("Vermilion & Motion" stays the identity: same palette, same type scale, same motion contract).
It adds the discipline v2 missed — color *quantity*, surface separation, navigation structure,
and per-screen composition — and it supersedes v2 wherever the two conflict on those topics.
Findings referenced as `SN-x / SH-x / CC-x / CO-x / CP-x` live in `Audit-4-PostCapture.md`.

**North star in one sentence:** *a calm paper page where ink does the work, vermilion appears
exactly where you can act, and every screen has one hero — Apple-level restraint with a warm,
quietly Chinese soul.*

Feel words (unchanged from v2): warm, alive, premium, confident, clear, effortless.
New anti-goals (this round): never red-saturated, never a settings list, never white-on-white,
never a dead end, never a fixture pretending to be the user.

---

## §1 The five principles

### P1 — Ink first, vermilion once (fixes CC-1, CC-2)
Vermilion is the *action* color, not the *decoration* color.

**Allowed accent uses per screen (the whole list):**
1. The one primary CTA (solid button).
2. Selected/active state (tab icon+label, selected segment/plan, focused input border, toggle ON).
3. The highlighted palm line + its bloom (the brand artifact).
4. Text links.

**Everything else is ink:** decorative/leading icons default to `textSecondary` (or
`textPrimary` when they ARE the content); metadata stays `textSecondary`. The streak flame,
list-row icons, chat chips, share channel tiles, sub-score bars, analyzing step dots → ink or
neutral fills (see per-screen specs). `heritageAccent` keeps its two sanctioned homes ONLY
(red-thread motif, corner seal). `premium` appears only as the champagne *fill* of a premium
marker (never as small text on white — CC-4). `success`/`danger` only as semantic marks, at
icon-size, never as headline colors on a card that also shows the accent (CC-2).

**Litmus test (apply to every screen in review):** count non-interactive accent occurrences.
Target ≤2. If removing red from an element changes no meaning, it must not be red.

### P2 — Real surfaces, one hero per screen (fixes CC-3, CO-1, CO-4)
Cards must exist without squinting, and hierarchy must be layout-led, not shadow-led.

- **Retune the light surface stack** (single token change, app-wide): deepen light `bg`
  `#FAF9F7 → #F4F1EB` (warm rice-paper, ~1.08:1 vs white — clearly visible, still airy) and
  `surfaceSunken → #EAE6DE`. Dark mode already separates; leave it.
- **Flat by default:** `Card` keeps its hairline border at every elevation on light
  (`bordered` default becomes scheme-aware: light = always, dark = current behavior). Kill the
  invisible `shadow.sm`-only separation.
- **One `md`-elevation hero per screen, max** — the fortune card on Today, the palm hero block
  on reveal, the preview card on share, the selected plan on paywall. Everything else: flat
  bordered cards or plain (cardless) rows. Never two shadow depths among siblings (CO-4).
- **Grouped lists for navigation/settings-like content** (iOS inset-grouped pattern, already
  built as `SettingGroup`/`SettingRow` in `settingsUi.tsx`): one bordered container, hairline
  separators inside — not N floating cards (CO-1).

### P3 — A navigation backbone (fixes SN-1..SN-5, SN-9)
- **Bottom tab bar** on the `(home)` group — 3 tabs:
  **Today** (fortune) · **Readings** (history) · **Ask** (chat).
  Expo Router `Tabs` layout; icons from the in-house set (`sparkle`→new `sun/today` glyph is NOT
  needed — use `palm` for Readings, `chat` for Ask, add one `today` icon: a 24×24 sun-disc or
  day-dot glyph in the house stroke style). Active = accent icon+label; inactive = textSecondary.
  Tab bar: `surface` bg, top hairline `border`, respects safe area. This single change deletes
  the "home is a menu" problem — the nav rows leave the Today page.
- **The loop closes:** Reveal gets a persistent header-right **Done** (text button) →
  `router.replace('/fortune')` (also fires after share-close when the share was reached from
  reveal). Pair reveal's footer CTA routes to the real reading (`readingId` threaded — SN-6) and
  its secondary becomes "Done" → Today.
- **Push/modal discipline:** pushed screens always get `AppHeader onBack` (History keeps back
  when pushed from settings; as a tab it shows none). True modals (share/paywall/account) get a
  **close ✕** (the icon exists) top-left/right, never a back arrow (SN-9). `analyzing → reveal`
  transitions as a fade-through (`replace` should not slide like a push — SN-10).
- **New-scan entry:** Today header-right gains a small `camera` icon button (ink), and populated
  Readings gets a "New reading" row/button (SN-4). Free chat: the Today row is gone (tab now);
  the **Ask tab** shows the gate, and the gate's CTA goes straight to paywall (one hop, SN-5).

### P4 — States never lie (fixes SH-1..SH-16)
- Every async surface has four designed states: **loading (skeleton), ready, empty, error
  (with retry)**. Loading is never the first-run state; errors are never empty states; errors
  never speak as the assistant.
- **Fixture content never renders on a production path.** Where real data isn't available yet,
  the design degrades honestly: analyzing shows an *abstract* tracing motif (not "your" palm —
  a11y label included); the share compat tab doesn't exist without a real pair (the invite flow
  does); the paywall hero uses the user's actual latest-reading geometry; prices show only what
  RevenueCat returns (until then, the plan cards render without invented numbers).
- Gated UI (premium flags, opt-ins, banners) reserves layout or enters after resolve — the page
  never visibly reflows on open (SH-2, SH-3).
- The trust badge tells the truth on every surface, in locale-aware time (SH-8).

### P5 — One system, no drift (fixes CO-8..CO-11, CP-*)
- **Icons only** — no `✓ ✕ ↑↗ ✨👇` glyphs; extend the icon set instead (needed: `compass`
  or 8-way direction, `logout`, `warning`, `close-small`; Apple/Google marks on auth buttons).
- **One entrance system:** `Card entranceIndex` (spring) everywhere; RevealView's parallel
  manual system is deleted. Stagger/durations only from `motion` tokens — add
  `duration.breath: 1500`, `duration.thread: 800`, `duration.ring: 900` and use them at every
  call site (1400/1500 unify on `breath`).
- **Type scale only:** add `typography.editorialTitle` (serif 24/30, tracking −0.3) for the
  share-card previews; seal caption uses `caption`; delete `fontSize`/`fontWeight` inline
  overrides.
- **44pt floor everywhere**; every pressable gets the shared spring + `tick()` (headers, gears,
  close buttons, links included).
- **Copy voice:** the considered scholar-friend, one idea per sentence, ≤12 words for
  secondary lines where possible, US spelling, typographic `’`, no product/dev vocabulary.
  Canonical strings live once (trust line, disclaimer → `trustCopy.ts`).

---

## §2 Token & primitive changes (the complete list)

| Change | Detail | Fixes |
|---|---|---|
| `bg` (light) | `#FAF9F7 → #F4F1EB`; `surfaceSunken → #EAE6DE`; verify all on-bg text still AA (textSecondary 6B6B72 on F4F1EB ≈ 4.7:1 — re-measure in the test) | CC-3 |
| `premiumInk` (new role) | `#8A6A1F`-region champagne-ink for premium TEXT on light (target ≥4.5:1 on white); dark keeps `#D9B25A`. `premium` remains the fill color; small premium text switches to `premiumInk` | CC-4 |
| Chip/tonal text | Chip + tonal-button label color moves `accent → accentPressed` (`#B9331F`, ≈4.9:1 on `#FBE7E2`) or `textPrimary`; re-measure in test | CC-6 |
| `textTertiary` policy | Tertiary is for hints/disabled ONLY — all content demotions move to `textSecondary` (footnotes, dates, disclaimers, legal) | CC-5 |
| Toggle/disabled states | Off track = `#CFC9BD`-region (≥1.5:1 vs card, visible); disabled send icon = `textTertiary` on `surfaceSunken` | CC-7 |
| Contrast test | Extend `tokens.test.ts` with a computed AA matrix over every *used* pairing (both schemes): onAccent/accent, chip text/accentMuted, premiumInk/surface, textSecondary/bg, danger+success/surface, onPremium/premium, toggle track/surface. Add a fixed list of banned pairings (premium-as-text-on-white, tertiary-as-content is a lint-level grep) | CC-9 |
| `Card` | Light scheme: hairline border at all elevations. New `hero` convenience (elevation md + border) documented as "one per screen" | CC-3, CO-4 |
| `motion` | `+ breath: 1500, thread: 800, ring: 900`; all magic durations re-pointed | CO-10 |
| `typography` | `+ editorialTitle` (serif 24/30/−0.3) | CO-11 |
| `Icon` | `+ today`, `+ compass` (rotatable 8-way arrow), `+ logout`, `+ warning`, `+ apple`, `+ google` (brand marks, mono-stroke) | CO-7, CO-8 |
| `AppHeader` | `+ onClose` (renders ✕ instead of back), `+ haptic on back`, right-slot buttons get the 44pt/spring/tick treatment via a shared `HeaderIconButton` | SN-9, CO-9 |

Everything else in the token file stays. **No new dependencies** except
`@react-native-community/datetimepicker` (Expo-supported) for the birth-date sheet — record in
the Decision Log when installed.

---

## §3 System behaviors

- **Entrance choreography rule:** the hero animates first (index 0); supporting rows follow.
  Never let secondary content out-animate the hero (CO-1).
- **Skeletons:** a `Skeleton` block (surfaceSunken fill, subtle opacity breath, reduce-motion →
  static) shipped as a primitive; used by Today (fortune card shape) and Readings (row shapes).
- **Reduce-motion:** unchanged contract; fix the one over-gate (`useRotating` copy rotation is
  content, not motion — keep rotating, crossfade → hard swap under reduce-motion).
- **Haptics:** unchanged vocabulary; add the missing `tick()` to header back + icon buttons;
  pair-success haptic fires once per pair-id (not per mount).

---

## §4 Per-screen target designs

### §4.1 Today (FortuneHome) — the screen the owner named. Complete recomposition.

**Top→bottom (ready state):**
1. **Header row** (fixed metrics, `AppHeader`-based): left — `title`-variant "Today" is NOT
   used; instead the date IS the title: `display` weekday ("Friday"), beneath it
   `bodyLarge/secondary` "July 25" + a tappable ink info-chip "Wood Rat day ⓘ" (caption,
   `surfaceSunken` pill, `textSecondary`; tap → 2-sentence popover explaining the day-pillar —
   CP-5). Right — two 44pt `HeaderIconButton`s: `camera` (new scan, SN-4) and `settings`, both
   ink.
2. **Week strip — the "calendar" the owner expected (new, replaces StreakStrip):** seven 36pt
   columns: weekday initial (caption/secondary) over a day-dot. Past days with a fortune-open =
   filled ink dot; today = accent ring + filled dot (the ONE ambient accent on this screen
   beyond the CTA); future = hairline dot. Under it, only when a real streak ≥2 exists:
   `caption/secondary` "{n}-day streak" with a small ink flame (no infinite pulse — SH-9,
   CC-1). Data comes from real fortune-open history; until wired, the strip shows the plain
   week with today marked and NO streak line (honest default).
3. **The almanac hero card** (the one `md` card — see §4.2).
4. **Red-thread row** (only with a real pending pair): flat bordered card, claret thread icon
   (its sanctioned home), name required — no "your match" (SH-13).
5. **Notify opt-in** — demoted from a card to a single-line inline row under the hero: bell
   (ink) + "Get tomorrow's fortune as a notification" + Turn on / dismiss ✕. One line, one
   idea (CP-2). Hidden on web.
6. Nothing else. Readings/Ask/Claim rows leave with the tab bar (P3). Claim-account moves to a
   one-time dismissible banner on **Readings** (where the "don't lose these" story is real).

**States:** loading = header + week strip + fortune-card skeleton (SH-1); error = flat card
"Today's reading isn't loading — try again" + retry button (never first-run); first-run (truly
no reading) = current traced-palm hero card (it's good), full-bleed as the hero slot.
**Reflow rule:** thread/notify rows mount hidden and fade in after resolve; entitlement waits
for resolve before rendering the locked/unlocked branch (skeleton covers it — SH-2/3).
**Data correctness:** local-date bucket everywhere (SH-14), locale passed through to the
fortune fetch.

### §4.2 The almanac card (FortuneCard) — from "info dump" to "daily artifact"

The screenshot-worthy object the spec promised. One card, ink-led, generous:
- **Eyebrow:** `caption/secondary` uppercase "TODAY'S FORTUNE" — no icon chip (CC-1).
- **Essence:** `editorialHeadline`-adjacent moment — the free one-liner set in the serif at
  22–24px (`accent` variant swapped to a new serif use is allowed by v2's "one editorial moment
  per surface"; Today's is this line). This is the card's hero and the share crop.
- **Premium body (unfolds):**
  - **Do / Avoid** as two flat rows (not columns — CO-6): leading 16px `check` icon in
    `success` / `close` icon in `danger` (icon-size color only, headings stay ink — CC-2),
    items as `body` text, full width, comfortable wrap.
  - Hairline divider, then **Career · Love · Wealth** as stacked label+line pairs (unchanged
    structure, labels move `tertiary → secondary`).
  - **Lucky row → responsive:** Direction (new `compass` icon rotated to the bearing — kills
    the text arrows + leading-space bug), Color, Hours as a wrapping grid with `flexBasis`
    thirds that collapses to 2+1 under 360pt (CO-6).
- **Free state:** essence + ONE lock line — `lock` icon (ink) + `small/secondary` "The full
  almanac — do & avoid, lucky hours, love, career, wealth — is Premium." + primary-styled
  tonal CTA "Unlock the full almanac" with AA-fixed label (CP-6, CC-6).
- **Footer:** ghost "Ask about today" (accent text link, one of the sanctioned accent uses) —
  prefill guarded against empty values, chat opens focused (CO-14).

### §4.3 Birth-date ask — from blocker to sheet (SH-4)
A true bottom sheet over Today (scrim + drag handle), shown AFTER the first fortune renders,
never before value. Native date picker (`datetimepicker`, spinner mode) — no typed
`YYYY-MM-DD`. Copy: "When were you born? / Your birth date tunes each day's fortune to you."
(no "day-pillar" — CP-1). Skip persists permanently (a Settings row "Add birth date" remains
the way back in). Save failure shows an inline warm error and keeps the sheet open.

### §4.4 Reveal — keep the wow, clean the tail
Keep: real-geometry hero draw, editorial headline, section stagger, ReadyStamp beat.
Changes:
1. **One stamp.** ReadyStamp stays (the arrival beat); the FAB is replaced by a labeled
   **share pill** — `share` icon + "Share" on `surface` with hairline border + `shadow.md` on a
   real background, safe-area-inset bottom-right, appearing after the hero as now (CO-3).
   Header-right: **Done** → Today (SN-1).
2. **Section thumbs:** heart/head/life/fate keep mini palms with a *visible* highlight (mini
   bloom/underlay retuned — CO-5); hand_shape/mounts/markings get their own feature icons
   (`palm`, `elements`, `sparkle` respectively) in ink tiles; face sections map to distinct
   icons (`face`, `mind`, `heart`, …).
3. **Tail order (CO-2):** free sections → CompareCard (stays after section 2, but restyled to
   the standard flat row-card, `sm`→flat, left-aligned) → locked sections ("Go deeper" — titles
   set in `heading` like free sections, premium marker via `premiumInk` — CO-4/CC-4) → ONE
   consolidated "Continue" card offering the other hand AND the other reading kind as two rows
   (SecondHand + Face/Palm offers merge; dismissible, hidden once done — SH-10) → **TrustFooter
   last** (same palm/same reading + honest badge + methodology) → disclaimer.
4. Consistency survey moves BELOW the first section card and uses three `size="md"` buttons
   that fit (SH-11, CO-6). Matched-face wording variant (SH-12 sibling).
5. Pending state: badge says "Photo deletes within 24 hours" (the honest default — SH-8);
   reassurance rotation keeps rotating under reduce-motion (hard swap).
6. Reading-switch resets geometry with the rest of the state (SH-16).

### §4.5 Analyzing — honest anticipation
- The traced palm stays as an **abstract motif**: a11y label "Palm illustration", stage copy
  loses the possessive where it isn't true ("Tracing the heart line…") until real geometry
  exists post-extraction; if a previous reading's geometry exists (rescan), use it — then the
  possessive is honest.
- Geometry fixes: SVG viewport padded so the glow never clips; photo centered on the ring axis;
  arc starts empty (no 0% nub); progress creeps asymptotically 75→92% during long extraction
  so it never parks (CO-13).
- Step dots: active = ink pill, done = ink dot, upcoming = hairline dot (accent leaves — CC-1;
  the ring keeps the accent gradient as the screen's single accent moment).
- Failure: `warning` icon (new) in `danger` on `surfaceSunken` tile; reason-specific copy
  (lighting copy only for lighting reasons — CP-4); CTAs "Try again" (primary → camera) and
  "Upload a photo" (secondary → primer in upload mode) actually diverge (CO-13).
- Back during scan → confirm sheet ("Your reading is still brewing — leave anyway?"); Notify
  flow returns to a safe holding screen, not the launcher (SN-7).
- Overrun layout scrolls on small devices.

### §4.6 Pair reveal — the second peak, mechanically sound
Real geometries on both sides when available (partner via stored pair data;
`differentiateGeometry` only as the no-data fallback). Score numeral: `premiumInk` on light
(CC-4). SubScoreBar: labels `flex:1` + numeric column min-width via tabular text (CO-16), bars
in ink with the accent reserved for the user's stronger dimension — or all-ink (litmus test).
Auto-present share waits for choreography completion (~2.8s) or a "Share this" pill appears
instead of a modal takeover (owner-taste call recorded in Decision Log). Empty narrative blocks
render nothing (no bare headings). Waiting state gets a nudge action + timeout copy. Success
haptic once per pairId. "See my full reading" carries the readingId (SN-6); secondary "Done" →
Today.

### §4.7 Share sheet — a sheet that fits
Scrollable content; edge-to-edge channel row (breaks out of Screen padding) with a trailing
fade + peek; unified preview width (both real-PNG and vector previews render in the same
340pt-max frame); `editorialTitle` replaces the inline 24/30 override. Compat tab only with a
real pair; from reveal, the compat entry becomes "Invite to compare" (invite-first UI, no
score-0 fixture — SH-7). Channel tiles: ink monogram/icon on `surfaceSunken` (CC-1), "Link
copied" → `check` icon + label that fits, state resets on regenerate. Toggles: visible off
track; thread toggle icon keeps claret ONLY on the compat-invite row (its motif home);
copy-link uses the `share` icon (CO-7). Close ✕ header (SN-9). Partner palm =
`differentiateGeometry` (CO-12). Outbound share text loses the emoji (CO-8).

### §4.8 Readings (History) — a shelf, not a list of guesses
Tab root (no back as a tab; back when pushed). Header pinned (outside scroll) with
`PrivacyBadge` moved into a one-line trust footer at the bottom of the list (the badge that
must never lie — 24h default wording, SH-8). Rows: thumbnail tile distinct per kind — palm =
mini palm WITH silhouette (embrace it — it reads as a hand; fix the doc comments), face = the
`face` icon tile (no fake palm — CO-5); type chip in ink (`surfaceSunken` + `textSecondary` —
CC-1/CC-6); date `secondary`; share action grown to 44pt with its own haptic (suppress the
row's — CO-9); chevron dropped (the row is obviously tappable — CO-4). "Unchanged" banner:
kind-aware copy (SH-12), standard flat bordered card with `success` icon only (no
green-heading fight with the Card API). Claim banner also shows in the empty state. "New
reading" affordance always present (SN-4).

### §4.9 Ask (Chat) — grounded and mechanical-solid
Gate (free): the tab shows the pitch + "Unlock chat" → paywall directly (SN-5), with a real
title in the header. Thread: auto-scroll on send/receive/typing (CO-14); Android
`KeyboardAvoidingView` behavior set; error = inline system row (small, `warning` icon,
centered, retry link) — never an assistant bubble (SH-6); send button disabled state =
`surfaceSunken` + `textTertiary` icon (CC-7); composer gets a visible hairline border
unfocused → accent focused (CC-8); chips: ink text on `surfaceSunken` (CC-1, CC-6), fade
height derived from measured content; prefill focuses the input and opens the keyboard.
Empty and short-thread states share one alignment (bottom, above the chips).

### §4.10 Paywall — personal and honest
Hero uses the user's latest reading geometry (fall back to the abstract motif + generic copy
if none — SH-7); inclusion icons ink; ONE accent moment = the CTA; plan cards: selected =
accent border + `accentMuted` wash (as now) but unselected loses its shadow (flat bordered);
`PremiumSeal` text = `caption` on `premium` fill (fills are fine) with parallel secondary
lines on both plans; prices render only from RevenueCat offerings once R1.T4 lands — until
then the plan area shows the two cards WITHOUT invented numbers ("Annual — best value" /
"Monthly"), CTA disabled with "Purchases arrive with the store build" caption in dev builds
only (honesty > pretend-commerce; revisit at R4). Disclosure line `small/secondary` (CC-5).
Close ✕ 44pt with spring+tick (CO-9).

### §4.11 Account sheet — provider-correct
Apple button: black fill, Apple mark, "Continue with Apple" (per HIG); Google: white fill,
hairline border, Google "G" mark; phone: outlined with `chat`-style phone glyph (add if
needed). Error card: `warning` icon in `danger` (CO-7). OTP/date inputs: horizontal padding +
centered without letterSpacing shift (CO-15). Reason copy drops the streak promise until the
streak ships (CP-10).

---

## §5 Copy sheet (canonical rewrites)

| Where | Now | Target |
|---|---|---|
| Analyzing connection | "Trouble reaching the server — still trying…" | "Still connecting…" |
| Analyzing overrun | (ok) | keep |
| Failure default | "Let's try again with a bit more light." | "That one didn't take — let's try again." (lighting copy only for lighting reasons) |
| Notify opt-in | "A gentle daily notification — the almanac, tuned to you. One a day, quiet hours respected." | "One quiet notification each morning." |
| Birth-date | "Your birth day sets your day-pillar — so your fortune is tuned to you, not everyone." | "Your birth date tunes each day's fortune to you." |
| Free tease | "Do · Avoid · lucky direction · hours · love, career & wealth" | "The full almanac — do & avoid, lucky hours, love, career, wealth — is Premium." |
| Red thread (no name) | "Waiting for your match" | row hidden without a real name |
| Second hand offer | "Traditional readers weigh both hands — one innate, one cultivated. Add your left for a fuller reading." | "One hand is innate, the other cultivated. Add your left." |
| Face offer | "Run the same reading on your face — proportions, features, and what they reveal." | "Your face tells the other half." (title carries it; body one line) |
| Survey | "Does this reading match what you remember?" / "Thanks — that helps us keep your readings consistent." | "Same as you remember?" / "Noted — thank you." |
| Chat error | assistant bubble | system row: "Not sent — check your connection." + Retry |
| Claim (history) | "Create a free account so they follow you to any phone." | "Keep your readings on any phone." |
| Pair waiting | "…This lands the moment both palms are in." | "You'll both see it the moment their palm is in." |
| Legal line | 3 variants | one string in `trustCopy.ts`: "For reflection and entertainment." |
| Trust line | 2 variants | one string in `trustCopy.ts`: "Same palm, same reading — your lines don't lie." |

Rules: US spelling, `’` everywhere (fix `&apos;` sites), sentence case, no em-dash chains.

---

## §6 Acceptance (what "done" looks like)

1. **Accent litmus:** light+dark screenshots of Today, Reveal, Readings, Ask, Share, Paywall
   each show ≤2 non-interactive accent occurrences.
2. **Surface litmus:** cards visibly separate from the page in a light-mode screenshot at
   default brightness (border or ≥1.05:1 bg delta), no shadow-only separation.
3. **Contrast suite green:** the extended `tokens.test.ts` AA matrix passes; no
   `tone="tertiary"` on content strings (grep-gated list).
4. **Journey:** capture → analyzing → reveal → **Done → Today** works with no relaunch; every
   pushed screen has back; every modal has ✕; tabs switch Today/Readings/Ask.
5. **No fixture on production paths:** grep `PREVIEW_` imports outside `/dev` +
   the audit's SH-7 list all resolved.
6. **320pt sweep:** fortune card, survey buttons, share sheet, lucky row render without
   overflow at 320×568.
7. All standing suites green (`typecheck`, `lint`, `test:ci`) + the full-route screenshot
   sweep re-shot to `docs/checkpoints/audit4/`.
