# Audit-5 · 02 — UI/UX Spec: Today's Line & Seal the day

**Date:** 2026-07-26 · **Status:** PROPOSED
**Design authority:** this spec EXTENDS `Planning/Audits/Audit-4-PostCapture/Design-Direction.md` (LOCKED) and `Planning/UIUX/UIUX-Redesign-v2.md`. Same tokens, same motion contract, same principles (ink first / vermilion once · real surfaces, one hero · states never lie · one system, no drift). Where this spec is silent, Audit-4 governs. Nothing here re-themes the app.

---

## §1 Reconciling the "Apple + glassmorphism" brief with the locked system

The brief asks for Apple-inspired, ultra-clean minimalism with *subtle glassmorphism*. The locked system already delivers the Apple restraint ("calm paper page where ink does the work… Apple-level restraint with a warm, quietly Chinese soul") — and deliberately contains **zero blur**: warm paper surfaces + hairline borders, not translucency. Ruling:

1. **No new glass on paper surfaces.** Cards, sheets, tabs, paywall stay exactly per Audit-4. Glassmorphism scattered over rice-paper would be drift (P5) and would cost the warm identity.
2. **One sanctioned glass home: content over live camera.** The Seal-the-day ritual renders UI over a camera feed — the one context where translucency is the *honest* material (Apple uses it the same way). The ritual's copy plate and seal chip may use a translucent `scrim`-tinted plate; a real blur (`expo-glass-effect`, already a declared dep, currently unused) is a device-only enhancement behind a capability check, with the opaque scrim as universal fallback. This mirrors the existing precedent in `claim.tsx` (obscured preview via opacity, blur noted as future device-only).
3. Everything else "Apple" arrives via what the system already enforces: one hero per screen, grouped lists, hairline separation, big quiet type, 44pt targets, spring physics, honest states.

---

## §2 New/changed components (inventory)

| Component | Path (new unless noted) | Purpose |
|---|---|---|
| `PulseCard` | `app/src/features/pulse/PulseCard.tsx` | The Today hero: unrevealed / revealing / revealed(free) / revealed(premium) / error / skeleton |
| `PulseSeal` | `app/src/features/pulse/PulseSeal.tsx` | The press-and-hold reveal control (ring fill + seal stamp); reused as the milestone stamp |
| `ChapterChip` | `app/src/features/pulse/ChapterChip.tsx` | "The rebuild · through Aug 14" — caption chip on `surfaceSunken`; premium tap-through |
| `ChapterSheet` | `app/src/features/pulse/ChapterSheet.tsx` | Bottom sheet: chapter reading + next-chapter preview (premium body, free teaser) |
| `SealCheckIn` | `app/src/features/checkin/SealCheckIn.tsx` + `useSealCheckIn.native.ts` | Full-screen camera ritual (on-device only); reuses the capture engine in no-upload mode |
| `MilestoneMoment` | `app/src/features/pulse/MilestoneMoment.tsx` | Day 3/7/14/30 sheet → recap share card entry |
| `BoundaryBanner` | `app/src/features/pulse/BoundaryBanner.tsx` | Chapter-turn day flat row on Today |
| `WeekStrip` (change) | `app/src/features/fortune/FortuneHome.tsx` | Re-pointed from AsyncStorage to server ledger; adds a tiny seal glyph on camera-sealed days |
| `FortuneCard` (change) | `app/src/features/fortune/FortuneCard.tsx` | Demoted from hero (`md`) to flat bordered card; content unchanged |
| Paywall (change) | `app/src/features/paywall/PaywallView.tsx` | New triggers `pulse_full` / `cycle_boundary` / `streak_milestone` with matched hero copy; hero lights *today's* feature |
| Icons (extend `Icon.tsx`) | `seal` (chop outline), `streak` (calm flame — exists as flame usage? add if absent), `chapter` (book/scroll glyph) | House stroke style, 24×24, no emoji (Audit-4 P5) |

Fixture routes to add under `app/src/app/dev/`: `pulse-unrevealed`, `pulse-free`, `pulse-premium`, `pulse-error`, `pulse-boundary`, `checkin-walk`, `milestone-7`. (The fixture watermark system already exists.)

---

## §3 Today tab — recomposition (extends Audit-4 §4.1)

Top→bottom, ready state. **The one `md` hero is now the PulseCard.** Everything else flat/bordered or plain. Accent litmus (≤2 non-interactive accent occurrences) still holds: ① today's ring in the week strip, ② the lit line in the pulse diagram (the brand artifact, sanctioned).

```
┌─────────────────────────────────────────────┐
│ Friday                          [cam] [gear]│   header (unchanged, Audit-4 §4.1)
│ July 26 · [Wood Rat day ⓘ]                  │
│                                             │
│  M   T   W   T   F   S   S                  │   week strip — server truth now
│  ●   ●   ◉   ●   ⬤   ○   ○                 │   ⬤=today(accent ring) ◉=sealed(mini seal)
│  12-day streak 🔥(ink)                       │   streak line only when ≥2 (unchanged rule)
│                                             │
│ ╔═══════════════════════════════════════╗   │
│ ║ TODAY · YOUR HEART LINE        (md hero)  │   ← PulseCard, states in §4
│ ║                                       ║   │
│ ║        [ mini PalmDiagram —           ║   │
│ ║          THEIR geometry,              ║   │
│ ║          heart line lit + bloom ]     ║   │
│ ║                                       ║   │
│ ║  “Your heart line favors patience     ║   │   essence — editorialTitle serif
│ ║   on a Fire Rooster day.”             ║   │
│ ║                                       ║   │
│ ║  [chapter chip: Steady water · Aug 14]║   │
│ ║  — premium body OR lock line (§4) —   ║   │
│ ╚═══════════════════════════════════════╝   │
│                                             │
│ ┌─────────────────────────────────────┐     │   almanac — DEMOTED to flat bordered
│ │ THE ALMANAC                          │     │   card; internal layout per Audit-4
│ │ essence line … (+unfold / lock line) │     │   §4.2 unchanged otherwise
│ └─────────────────────────────────────┘     │
│ [boundary banner — chapter-turn days only]  │   flat row (§7)
│ [red-thread row — real pending pair only]   │   unchanged
│ [notify opt-in row]                         │   unchanged
└─────────────────────────────────────────────┘
```

Rules carried over verbatim: loading = header + strip + card skeleton; error card never speaks as first-run; tail rows mount after resolve (no reflow); local-date bucketing; entitlement resolves before the locked/unlocked branch renders. First-run (no reading yet) keeps the existing `FirstRunState` traced-palm hero — Today's Line simply doesn't exist until a reading does, and the empty state's CTA ("Read my palm") already says exactly the right thing.

**Hierarchy rationale (fixes the fortune-vs-line question):** one hero per screen is the law; the personalized artifact outranks the generic one. The almanac loses its `md` elevation, keeps its content and its own paywall trigger. Two premium unfolds on one screen is acceptable because in the free state each is exactly one lock line (Audit-4 §4.2 pattern), and premium users see the pulse unfold + almanac unfold as a single calm column.

---

## §4 PulseCard states

**S0 · Skeleton** — card-shaped `Skeleton` (existing primitive), shown while pulse+entitlement resolve.

**S1 · Unrevealed (the daily hook)**
```
╔═══════════════════════════════════════╗
║ TODAY · YOUR HEART LINE               ║   eyebrow: caption/secondary uppercase;
║                                       ║   feature name IS the tease
║     [ diagram: silhouette + all       ║
║       lines faint ink; heart line     ║
║       NOT yet lit ]                   ║
║                                       ║
║          ( ◯  Hold to reveal )        ║   PulseSeal §5 — the only CTA
║                                       ║
║   Seal it with your palm ›            ║   text link (accent, sanctioned) → §6
╚═══════════════════════════════════════╝
```
One reveal per day; after 00:00 local the card returns to S1 with tomorrow's feature. No re-draws, no preview of the essence (scarcity is the mechanic — research §2.3/2.4).

**S2 · Reveal transition** — on hold-complete: `stamp()` haptic → the day's line draws on in `duration.draw` (1200ms) with the accent bloom (the existing `PalmDiagram` highlight system, unchanged) → essence fades up `FadeInDown` after the line lands (hero animates first — Audit-4 §3). Reduce-motion: instant line + crossfade, per the existing gate idiom.

**S3 · Revealed — free**
```
║ [lit diagram]                         ║
║ “Your heart line favors patience…”    ║   essence, editorialTitle
║ [Steady water · through Aug 14]       ║   ChapterChip (name+date free = the tease)
║ ───────────────────────────────────   ║
║ 🔒 Today’s full reading of your       ║   ONE lock line, small/secondary,
║    heart line is Premium.             ║   lock icon ink (Audit-4 §4.2 pattern)
║ [ Unlock today’s reading ]            ║   tonal CTA → /paywall?trigger=pulse_full
```

**S4 · Revealed — premium**
```
║ [lit diagram] + essence               ║
║ [ChapterChip] → ChapterSheet          ║
║ ───────────────────────────────────   ║
║ Career  one line through the lens     ║   stacked label+line pairs, exactly the
║ Love    one line                      ║   almanac's premium typography (P5: one
║ Wealth  one line                      ║   system — no new list style)
║ Watch for  one line                   ║
║ ───────────────────────────────────   ║
║ Ask about today’s line →              ║   ghost accent link → /chat?q=… (prefill
╚═══════════════════════════════════════╝   via existing askPrefill pattern)
```

**S5 · Error** — flat card, "Today's line isn't loading — try again." + retry. Never fabricated content (template row missing → this state; matches the fortune's existing honest-null pattern).

---

## §5 PulseSeal — the hold-to-reveal control

- 64pt circular target (≥44pt floor), centered; hairline ring in `border`, label "Hold to reveal" `small/secondary` beneath.
- **Press-and-hold 600ms:** ring fills clockwise (accent, `duration.ring` 900 curve cut to 600ms fill), `tick()` at start, scale via the shared press spring. Release early → ring drains back (no penalty, no copy). Complete → `stamp()` haptic + the seal glyph stamps in (scale-settle, `spring.entrance`) → S2.
- **Accessibility:** `accessibilityRole="button"`, label "Reveal today's line", **plain tap activates under screen readers and when hold fails twice** (the hold is flavor, never a gate — same philosophy as tap-vs-camera). Reduce-motion: tap-to-reveal, no fill animation.
- Reused at half scale as the milestone stamp in `MilestoneMoment`.

---

## §6 Seal the day — the check-in ritual (SealCheckIn)

Entry: "Seal it with your palm ›" link on S1, or the header camera icon long-press (discoverable, not required). Native only (web: link hidden — capability-gated like torch).

```
┌─────────────────────────────────────────────┐
│  ✕                                          │   close (modal discipline, SN-9)
│                                             │
│         [ LIVE CAMERA FEED ]                │
│      hand outline guide (HandOutline,       │
│      existing capture guide asset)          │
│      → on detect: user’s stored line        │
│        geometry traces over their live      │
│        palm (landmark-anchored)             │
│                                             │
│  ┌───────────── glass plate ─────────────┐  │   §1.2: translucent scrim plate;
│  │ Hold steady — reading your lines…     │  │   blur only where supported
│  │ On your phone only. No photo taken,   │  │   ← the privacy line, always visible
│  │ nothing uploaded.                     │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

- **Flow:** reuses the guided-capture engine (`useGuidedCapture` guidance states: searching → too far/close → ready) in a `checkin` mode that **never captures a frame**: at `ready`+hold, it computes the hand signature from live landmarks (existing `handSignature.ts`) and compares to the stored canonical signature on-device. Success (distance ≤ threshold): the traced lines flash to accent bloom once → vermilion seal stamps center-screen → "Your lines hold. **Day 12.**" → auto-dismiss (800ms) back to Today with the PulseCard revealing (S2 continues seamlessly — the ritual IS the reveal gesture).
- **Timeout ladder (states never lie):** 10s no-match → "Palms shift with angle and light — try flattening your hand." 20s → "Seal it with a tap instead" primary button (falls back to tap-reveal; the day still counts, `method='tap'`). Signature mismatch is **never** described as "not your palm" — copy blames light/angle only (a false-negative accusation would be both wrong and hostile).
- **First-time interstitial** (once): one screen, three lines — what it is, on-device promise, "you can always just tap." Skip persists.
- No torch UI, no hand toggle, no review step — this is a 5-second gesture, not a capture.

---

## §7 Chapters, boundaries, milestones

**ChapterSheet** (premium; free sees name/date + one teaser line + lock): chapter title (editorialTitle), date range caption, reading body, hairline, "Next: ⟨name⟩ · begins Aug 15" preview row. Standard `ConfirmSheet` chassis (drag handle, scrim-cancel).

**BoundaryBanner** (chapter-turn days only, free+premium): flat bordered row under the almanac — `chapter` icon (ink) + "Your fate line begins a new chapter today." + chevron-free tap → premium: ChapterSheet on the new chapter; free: `/paywall?trigger=cycle_boundary`. Auto-hides next day. That day's push leads with the boundary instead of the standard line copy.

**MilestoneMoment** (day 3/7/14/30, fires once per milestone, after the reveal completes — never before value): bottom sheet — seal stamp (reused PulseSeal art) + "Twelve days of your lines holding." + primary "Share your week" → existing share sheet with the **recap card** variant (rides the existing `source_type='fortune'` card-render motif) + ghost "Keep going" dismiss. Premium soft-line (one caption, no lock UI): milestone sheets on 7/30 append "Your full daily readings are Premium" text link. Share close from this path fires the (currently dead) `post_share` paywall trigger — at most once per milestone, never day-1.

---

## §8 Push, paywall, and cross-surface touches

- **Push copy contract** (server-templated, existing voice rules): morning push names the feature — "Your heart line has something to say about Friday." Boundary days: "Your fate line turns a page today." Deep link `palmly://fortune` (existing route). One marketing push/day cap already server-enforced — no new cadence.
- **Paywall** (`PaywallView`): new trigger heroes — `pulse_full`: "The rest of today's reading" over the user's geometry with *today's* feature lit (the hero system already accepts a highlighted line); `cycle_boundary`: "A new chapter of your fate line"; `streak_milestone`: soft variant. INCLUSIONS list gains one row: "Your line, read daily". No layout changes.
- **Settings:** Notifications screen's existing `daily_fortune` pref now truthfully governs the morning push (it becomes real when the fan-out ships). A "Seal with camera" row (toggle, default on where supported) joins the existing group.
- **Readings tab / Ask tab:** untouched, except chat gains the grounded chip "What does my heart line mean today?" when arriving via the pulse bridge (existing chips system).

## §9 Copy sheet (canonical strings, extends Audit-4 §5)

| Where | String |
|---|---|
| Eyebrow | `TODAY · YOUR {FEATURE}` (feature names reuse `ENGLISH_LINE_LABEL` + face labels) |
| Unrevealed CTA | "Hold to reveal" / a11y "Reveal today's line" |
| Ritual link | "Seal it with your palm" |
| Ritual privacy line | "On your phone only. No photo is taken, nothing is uploaded." |
| Ritual success | "Your lines hold. Day {n}." (day 1: "Your lines hold.") |
| Ritual fallback | "Seal it with a tap instead" |
| Lock line | "Today's full reading of your {feature} is Premium." |
| Lock CTA | "Unlock today's reading" |
| Boundary banner | "Your {feature} begins a new chapter today." |
| Milestone | "{N} days of your lines holding." |
| Push (standard) | "Your {feature} has something to say about {weekday}." |
| Push (boundary) | "Your {feature} turns a page today." |
| Empty/error | "Today's line isn't loading — try again." |

Rules unchanged: US spelling, typographic ', sentence case, ≤12 words for secondary lines, no dev vocabulary ("pulse" never appears in UI), honesty line from 01 §5 applies to every string above.

## §10 Acceptance (adds to Audit-4 §6)

1. Accent litmus holds on recomposed Today (≤2 non-interactive accent occurrences, light+dark screenshots).
2. One `md` hero on Today = PulseCard; almanac renders flat bordered.
3. Reveal works end-to-end with reduce-motion on (tap path) and with screen reader (announced states).
4. Ritual: no frame is ever written to disk or network (code-inspection gate + no new storage/network calls in the check-in path); privacy line visible in every ritual state; fallback ladder reachable.
5. Free state shows exactly one lock line per card; premium state shows zero lock UI.
6. 320pt sweep: PulseCard all states, ChapterSheet, MilestoneMoment render without overflow.
7. All states have fixtures under `/dev`; no fixture content on production paths (grep gate unchanged).
