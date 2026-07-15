# Palmly — UI/UX Redesign North Star v2 ("Vermilion & Motion")

> **This is the active design source of truth for the redesign loop.** It supersedes the
> **color and motion** direction of `UIUX-Redesign.md` (the "Quiet Cosmos" doc). Everything
> that doc still gets right — sans-first type, role-based tokens, elevation, the in-house icon
> set, English-first, the two server surfaces, the device-free verification method — **stays
> in force**; this doc only overrides §3 (color) and adds a real motion + identity system on
> top. Screen behavior / flows / content still live in `UIUX-specs.md`.
>
> The redesign is executed as a task loop — see `UIUX-Redesign-v2-Tasks.md` for the ledger.

**Founder-locked direction (2026-07-15):**
- **The problem:** "Quiet Cosmos" (indigo `#4B57C4` accent, R1–R24) shipped clean but reads
  **generic and basic — no identity.** A twilight-indigo button could belong to any wellness app.
- **The move:** reintroduce a **modern light-red accent** — **Vermilion** — as the primary
  button / active / selected / link / palm-line color, giving a subtle, contemporary,
  Chinese-inflected identity. This deliberately **reverses** the old doc's "demote cinnabar to a
  whisper" decision. Vermilion is a *modern* red — **not** the old dated dark cinnabar `#C3272B`.
- **Second color:** **none.** Indigo is fully retired. Red is the single accent (over the calm
  neutral base). Gold stays the rare premium marker; green stays success.
- **Motion:** a **tasteful & premium** pass — spring press-feedback, entrance/stagger, the palm
  draw-on, progress/score motion, screen transitions — **every animation with a reduce-motion
  fallback.** Not maximalist; delight through restraint and craft.
- **Scope:** the **full journey**, every screen + both server-rendered surfaces, plus a real
  motion foundation in the design system.

---

## 1. The idea in one paragraph

Palmly is a **calm, premium, modern self-reflection app with a warm, quietly Chinese soul.** It
keeps the Headspace-calm base — warm-white paper, soft elevation, generous whitespace, sans-first
type — but now it has a **point of view**: a single confident **vermilion red** runs through every
button, active state, selected card, link, and the highlighted palm line, so the product finally
*feels like something* instead of a default template. The signature **traced-palm** artifact stays
the hero, its lines now inked in the brand red and drawn on with real craft. Motion is the second
half of the identity: nothing pops in dead — surfaces settle, buttons spring, the palm traces
itself, the red thread ties two people together, a score counts up. **Feel words:** warm, alive,
premium, confident, clear, effortless — *modern-Chinese, never festive, never mystical-kitsch,
never a generic SaaS list.*

---

## 2. What changes from Quiet Cosmos (the delta)

| Area | Quiet Cosmos (R1–R24, now) | Vermilion & Motion (this round) |
|---|---|---|
| **Accent** | Twilight indigo `#4B57C4` / `#8B95F0` | **Vermilion** `#D13B27` / dark `#FF7C63` (§3, V22 AA-corrected) |
| **Second color** | — (indigo was the only one) | **None** — indigo retired; red is the sole accent |
| **Palm-line highlight** | `heritageAccent` (softened cinnabar) | **`accent` (vermilion)** — the brand red *is* the line |
| **Heritage red** | palm line + thread + seal, `#C2554A` | Deepened claret `#9E3B2E`, **thread + seal ONLY** (§3.2) |
| **Motion** | 2 components animate (PalmDiagram, chat dots) | **A motion foundation + motion on every surface** (§4) |
| **Buttons** | flat fill, instant color swap | spring press-scale, `danger`/`premium` variants, brand loader (§4, §5) |
| **Cards / rows** | static `View`, no press feedback | pressable spring affordance + entrance/stagger primitive |
| **Everything else** | *kept* | *kept* — type, elevation, icons, English-first, a11y, server reskin method |

**Non-goals:** no new features, no backend/auth/realtime/edge-logic changes (server edits are
**re-skin only**), no schema/migration changes, no CJK reintroduced, no maximalist animation.

---

## 3. Color — one warm red over a calm base

**Principle unchanged:** tokens are named by **role**, `tokens.ts` holds skins, `theme.ts` maps
roles→skin + back-compat aliases. This round adds a **third skin — "Vermilion" (skin #3)** — and
makes it the `activeSkin`. Ink & Cinnabar (#1) and Quiet Cosmos (#2) stay in the file for parity /
easy rollback. A future re-skin remains a one-line `activeSkin` change.

### ★ The one tunable that sets the whole feel: `accent`
Change light `accent` + dark `accent` (two hexes) and re-run the harness screenshot to re-feel the
entire app. The default is a **modern vermilion**, tuned so **white-on-accent meets WCAG AA (≥4.5:1)
for button labels** — the identity requirement (bright, warm, Chinese-red energy) and the a11y
requirement are both satisfied at the default. If you push it brighter (e.g. `#EE4B34`), the a11y
task **must** re-verify white-on-accent and either keep AA or deepen a hair.

### Vermilion — light
| Role | Hex | Use / note |
|---|---|---|
| `bg` | `#FAF9F7` | warm-white paper (unchanged) |
| `surface` | `#FFFFFF` | cards, sheets |
| `surfaceRaised` | `#FFFFFF` +`shadow` | lifted cards, paywall, fortune hero, sheets |
| `surfaceSunken` | `#F2F0EC` | insets, chat input, tracks, **pressed-row tint** |
| `border` | `#E7E3DC` | hairline dividers |
| `textPrimary` | `#1A1A1F` | headlines, body |
| `textSecondary` | `#6B6B72` | secondary / caption |
| `textTertiary` | `#9A9AA0` | disabled / hint |
| **`accent`** ★ | **`#D13B27`** | **primary CTAs, active, selected, links, palm-line highlight** (white-on 4.81:1 AA — V22 deepened from `#D8402C`=4.48) |
| `accentPressed` | `#B9331F` | pressed CTA |
| `accentMuted` | `#FBE7E2` | tonal button bg, selected tint, icon chips |
| `onAccent` | `#FFFFFF` | text/icon on accent |
| `heritageAccent` | `#9E3B2E` | **deep claret — red-thread motif + corner seal ONLY** (§3.2) |
| `premium` | `#C79A3C` | champagne/amber — the rare premium marker (unchanged) |
| `premiumPressed` | `#AE842F` | pressed premium |
| `onPremium` | `#1A1A1F` | text on premium |
| `success` | `#3F7A5E` | verified / "unchanged" consistency brag (unchanged) |
| `danger` | `#C0392B` | destructive confirm ONLY (deeper/cooler crimson — §3.2) |
| `scrim` | `rgba(20,21,26,0.4)` | modal/backdrop |

### Vermilion — dark (light accent + dark on-color, for AA on a dark ground)
Mirror the Quiet-Cosmos dark strategy: a **lighter** accent so text on it stays legible, with a
**dark `onAccent`** (dark-on-coral), never a reused saturated light hex.
| Role | Hex |
|---|---|
| `bg` | `#14151A` |
| `surface` | `#1E2027` |
| `surfaceRaised` | `#24262F` |
| `surfaceSunken` | `#191B21` |
| `border` | `#2E313B` |
| `textPrimary` | `#F4F4F6` |
| `textSecondary` | `#A9A9B2` |
| `textTertiary` | `#6E6E77` |
| **`accent`** ★ | **`#FF7C63`** (light vermilion-coral) |
| `accentPressed` | `#FF9482` |
| `accentMuted` | `#37201A` |
| `onAccent` | `#2A0E07` (dark text on the light coral — AA) |
| `heritageAccent` | `#E0806F` (light claret for thread/seal on dark) |
| `premium` | `#D9B25A` · `premiumPressed` `#E4C06E` · `onPremium` `#14151A` |
| `success` | `#5AA981` |
| `danger` | `#E9584E` (nudged cooler/crimson so it reads distinct from the warm accent on dark) |
| `scrim` | `rgba(0,0,0,0.55)` |

### 3.1 Migration guardrails
- **Keep the back-compat aliases** (`gold`→`premium`, `jade`→`success`, `seal`→`heritageAccent`,
  `background`→`bg`, `text`→`textPrimary`). Do **not** rename-and-break.
- **Re-pin** `app/src/theme/__tests__/tokens.test.ts` — it currently asserts `accent` `#4B57C4` /
  `#8B95F0` and `heritageAccent` `#C2554A`. Update to the Vermilion contract.
- `app.json` adaptive-icon/splash are already off-cinnabar (`#FAF9F7`) — **leave neutral** (do not
  flood the launcher red). The brand mark carries the red, not the whole splash field.
- **One shared palette for the server surfaces** — the vermilion swap must reach
  `supabase/functions/_shared/*` too (§6), so the posted card + invite page can't drift from the app.

### 3.2 The three-reds discipline (the load-bearing rule this round)
Vermilion introduces three reds. Each is **strictly scoped** — this is what keeps the palette from
turning muddy (the collision the audit flagged on almost every screen):

| Red | Token | Where it may appear | Where it may **not** |
|---|---|---|---|
| **Vermilion** (bright, warm) | `accent` | buttons, active/selected, links, palm-line highlight, icon chips, streak fill, sub-score bars | — it's the everywhere-red |
| **Claret** (deep, heritage) | `heritageAccent` | **only** the red-thread-of-fate motif (share/compat/pair/claim/card) + the corner seal | CTAs, generic icons, body accents |
| **Crimson** (cool, alarm) | `danger` | **only** destructive confirms (delete account) | anything non-destructive |

Concrete consequences the loop must honor:
- The **palm-line highlight moves to `accent`** (vermilion) everywhere (PalmDiagram gradient,
  reveal, history thumbnails, pending). Where old code/audit says "heritage for the palm line,"
  use `accent`.
- Fortune's **"Avoid"** (was `tone="heritage"`) moves to `danger` or `textSecondary` so it doesn't
  fight the vermilion CTAs on the same card.
- **Seals** (share card corner, invite page) render in `heritageAccent` (claret) or ink — never the
  bright accent — so the seal reads distinct from the signature strokes.
- Keep `heritageAccent` deep enough (claret, not cinnabar) that bright-accent vs deep-heritage read
  as an intentional **two-tone pair**, not two similar mid-reds.

---

## 4. Motion — a foundation, then micro-interactions everywhere

Today motion is ad-hoc (only `PalmDiagram` + `ChatThread`) and the reduce-motion boilerplate is
copy-pasted. This round builds a **shared foundation first**, then every surface consumes it.

### 4.1 Motion tokens (new, in `tokens.ts` → surfaced on `Theme`)
```
motion = {
  duration: { instant: 0, fast: 120, base: 220, slow: 360, draw: 1200 },
  easing:   { standard, decelerate },            // reanimated Easing presets
  spring:   { press:    { damping: 18, stiffness: 320, mass: 0.6 },   // taps
              entrance: { damping: 20, stiffness: 180, mass: 1 } },   // cards/screens
  stagger:  { list: 60, reveal: 90 },            // per-index ms
}
```
Add a jest test pinning the `duration` values (contract, like `tokens.test.ts`).

### 4.2 The reduce-motion contract (non-negotiable)
- One shared hook — **`useReducedMotion()`** (in `app/src/theme` or `app/src/hooks`) — encapsulates
  `AccessibilityInfo.isReduceMotionEnabled()` + the `reduceMotionChanged` listener. Refactor the
  two inline copies (`PalmDiagram.tsx`, `ChatThread.tsx`) onto it in the same task.
- The standard gate every animation uses: **`shouldAnimate = !reduceMotion && Platform.OS !== 'web'`**.
  - **reduce-motion on** → render the **static end-state** (no transform/opacity offset), instantly.
  - **web** → static end-state too (this is *why* the device-free screenshot gate stays valid — the
    web export always captures the finished frame; note the live motion leg `[~]` device-pending,
    same honesty convention as R1–R24).

### 4.3 The motion vocabulary (reuse these, don't reinvent per screen)
- **Press** — spring scale ~0.97 on `pressIn`, spring back on `pressOut` (`motion.spring.press`), on
  `Button`, pressable `Card`, `AppHeader` back, `SettingRow`, channel chips. Optional light
  `expo-haptics` tick on native.
- **Entrance / stagger** — `FadeInDown`/opacity+translateY with per-index `delay = i * motion.stagger`
  for card lists (History rows, reveal sections, how-it-works steps, paywall inclusions, fortune
  unfold, chat bubbles).
- **Draw-on** — the PalmDiagram stroke-dashoffset trace (now **per-line staggered** in classical
  order heart→head→life→fate, with a **bloom** on the highlighted line's completion). Reused by the
  **Logomark** (launcher brand beat) and the **red thread** (share/pair/claim, ~800ms).
- **Progress / count-up** — the analyzing ring **sweeps** (`withTiming`) between stages with an
  ambient "alive" breath; the compat/pair **score ring counts up** 0→N.
- **Screen transition** — a gentle spring slide+fade on the onboarding/reading stacks (replace the
  OS-default hard cut); reduce-motion → fade/none.
- **State crossfades** — pending↔ready↔error, analyzing stage messages, share variant swap, typing
  bubble→answer: crossfade, not hard cut.

**Restraint rule:** one authored moment per surface beats five scattered effects. If an animation
doesn't clarify state, reward an action, or carry brand — cut it.

---

## 5. Design-system primitives (build these once — every screen inherits)

- **`Button`** — add reanimated **press-scale**; add first-class **`danger`** and **`premium`**
  variants (stop the `style={{backgroundColor: danger}}` override hack in PrivacyCenter); replace the
  stock `ActivityIndicator` loader with a small **brand loader** (e.g. a pulsing palm-dot / drawing
  mark) and reserve width so `loading` doesn't reflow; tokenize the `gap:8` / `height:44|52` magic
  numbers.
- **`Card`** — optional `onPress`/`accessibilityLabel`; when pressable, one **unified press
  affordance** (spring scale + `surfaceSunken`/`accentMuted` tint); an **entrance** prop (or
  `AnimatedCard`) taking an index delay. Migrate the ad-hoc `<Pressable><Card>` rows (fortune,
  history, settings) onto it so tap targets behave identically app-wide.
- **`Logomark`** — rebuild with **weighted ink** (heart line heaviest, matching the PalmDiagram's
  engraved feel) and a subtle unifying palm gesture so it's ownable, not a wellness squiggle; make
  the two-tone **survive the red accent** (don't let heart=`heritageAccent` and head/life=`accent`
  collapse to one red — pair the heart line against ink or a tint); fix the `tone="onAccent"`
  contrast case; add an opt-in **draw-on** for the launcher.
- **`PalmDiagram`** — **per-line staggered** draw-on + **bloom** on the highlighted line; fix the
  **label collision** (per-line anchor + screen-edge gutter in `geometry.ts` — keep it pure so
  `geometry.test.ts` stays green) and make the **hand silhouette** read as a hand (or derive it from
  geometry bounds; drop it on ≤64px thumbnails); add a **`highlightColor`** prop (default `accent`).
- **`AppHeader`** — press feedback on back; optional `showDivider` hairline for scrolled content.
- **`/dev/theme`** — extend to render **pressed/active states, a pressable Card, the `danger`/
  `premium` buttons, the motion showcases, the brand loader, and the new accent**, so the screenshot
  gate actually catches press/motion/variant regressions (today it only shows resting states).

---

## 6. Per-surface identity principles (detail lives in the ledger)

Every surface follows the same three moves — **recolor to vermilion, add one authored motion beat,
raise craft** — but each has a signature:

- **Launcher** — the brand moment: Logomark **draws on**, lockup + CTA **stagger in**, a faint
  brand-background so it's not a blank page; the single vermilion CTA owns the accent (mark reads
  ink + heart-line whisper); gate the dev button behind `__DEV__`.
- **Onboarding** — label-free palm hero + a Logomark; **animate the how-it-works steps** (spec §A2);
  hand-select gets **press + animated selection** + `radiogroup`; **claim** draws the red thread
  between avatars and shows the privacy trust line.
- **Capture** — the **ready guide + auto-capture ring go vermilion** (kill the gold `#D9B25A`); the
  ring **fills 800ms**; press + haptics; fix the non-uniform guide scale; **announce guidance for
  a11y** + a real `help` icon (no raw "?").
- **Analyzing** — **un-freeze the signature palm** (per-line self-draw as stages advance); a **live
  ring** (sweep + gradient + ambient breath) so it never reads hung; a **still-Palmly failed state**
  (keep a faint palm, warm/danger tone — not the CTA hue); rotate + elevate the social-proof line.
- **Reveal** — the one **editorial serif hero** (`editorialHeadline`); choreographed entrance
  (draw → headline rise → 90ms section stagger); a **living pending** state; section cards **echo
  their palm line**; the share FAB becomes a **branded seal** with press + scroll-in; locked cards
  get a **teaser**; fix the error identity (a sparkle reads as success).
- **Share** — **turn the palm draw-on back on**; spring the toggle/segment; make the channel row
  **real + tappable + branded**; fix the floating-card rhythm; bring the **compat card** to spec
  (red thread connecting heart lines + chips + labeled score ring); editorial hero + **filled seal**.
- **Pair + claim** — build the **second choreographed peak**: palms slide in from opposite edges,
  the **thread draws (~800ms)**, the **score counts up** in gold, sub-scores **fan in (90ms)** with
  dimension icons, one success haptic; rebuild claim around the brand artifact + trust line.
- **Paywall** — a **personalized traced-palm hero** (their locked lines, per spec §2.8 — not a
  generic feature list); vermilion CTA + a small heritage seal touch; **feature-matched icons** +
  staggered inclusions; spring selection; fix the dead vertical space + stabilize price hierarchy.
- **Fortune** — recolor + **resolve the two-reds** (move "Avoid" off heritage); **elevate the card
  to a true hero** (`shadow.md` + `surfaceRaised` + editorial header + promote the free essence
  line); entrance/unfold motion; press feedback; **redesign the streak** from a generic habit widget
  into a branded animated one; first-run state previews the **PalmDiagram** hero.
- **Chat** — a **grounded identity** (a Logomark avatar on answers + a red-thread citation instead
  of a green "verified" shield); **staggered bubble entrance** + typing→answer crossfade; chip/send/
  input micro-interactions; bubble tails; keyboard avoidance + chip-scroll fade + a11y labels.
- **History** — row **stagger + press spring**; **legible thumbnails** (silhouette off at 64px, palm
  vs face distinct); a vermilion **type-chip** + better rhythm; **Logomark** empty state; the
  "unchanged" brag gains a **red-thread** signature (green stays the semantic check).
- **Settings** — the highest-leverage press fix (one `SettingRow` feeds every screen): press
  feedback + **leading icons** + card elevation; a **commercial Plan row** (premium badge / upgrade
  nudge, not a grey "Free"); Methodology becomes an **animated "how it works" timeline**; a real
  `danger` **Button variant** + animated delete-confirm; dedup the privacy trust card; fix inert/
  dead rows.
- **Server surfaces** — a **single shared `_shared/palette.ts`** (kills manual drift); reskin to
  vermilion + **re-pin the Deno tests**; resolve the seal/thread two-reds; give the card **warm
  paper + depth + branded chips**; **fix the kind-aware invite copy bug**; add **reduce-motion-safe
  CSS motion** to the invite page (`@media (prefers-reduced-motion: reduce)` no-op); optionally add a
  **server compat-card variant** so a compatibility invite's preview matches the hook.

---

## 7. Verification (device-free — unchanged from R1–R24 §8)

1. **Static gates every task:** from `app/` — `npm run typecheck`, `npm run lint`, `npm test`
   (incl. the two contract tests: `tokens.test.ts` re-pinned to the Vermilion contract +
   `geometry.test.ts` staying green through the PalmDiagram/label work). Edge-function tasks:
   the Deno tests (`card-svg.test.ts`, `invite-page.test.ts`) — re-pinned; RUN if `deno` is
   available, else render/grep-verify and mark the RUN `[~]`.
2. **Visual:** `npx expo export --platform web` + headless-Chrome screenshots at **390×844** (and a
   **320-wide** pass where clipping matters), saved under `docs/checkpoints/redesign/`. `/dev` walks
   every route; **`/dev/theme` is the primary regression surface** and must render the full new
   system (tokens, motion showcases, button matrix incl. danger/premium, pressable card, icon sheet,
   logomark, PalmDiagram) in light + dark.
3. **Motion honesty:** reanimated motion renders as its **static end-state** on web (that's the
   reduce-motion/web gate working). Screenshot the finished frame; mark the live-motion / haptic /
   native-share / camera-feed / RevenueCat legs **`[~]`** device-pending. **Never fake a green.**
4. **Grep invariants (cheap):** no raw hexes in components (all via tokens); no CJK in default UI;
   no `#D9B25A` gold in the capture ready-state; `isReduceMotionEnabled` appears only inside
   `useReducedMotion`; every new svg icon/animation has an `accessibilityLabel` / reduce-motion gate;
   the retired indigo `#4B57C4` / `rgba(75,87,196…` appears nowhere (incl. the server CTA shadow).

**Definition of done:** all static gates green; **every** route renders a finished, realistic-content
screen at phone size in light + dark with the **vermilion accent** (no indigo anywhere), the
**three-reds discipline** honored, **real motion** on every surface (static end-states verified, live
legs `[~]`), the upgraded Logomark + PalmDiagram, first-class `danger`/`premium` buttons, pressable
cards, and a matching **server card + invite page** driven from one shared palette. `/dev/theme`
shows the whole system.

---

## 8. Decisions defaulted (edit here; the loop re-grounds from this doc each iteration)

- **Accent:** modern **vermilion** `#D13B27` / `#FF7C63` ★ — AA-verified (white-on 4.81:1; V22 deepened from `#D8402C`=4.48). *The one to tune.*
- **Second color:** none — indigo fully retired; red is the sole accent.
- **Heritage red:** deepened to claret `#9E3B2E` / `#E0806F`, **thread + seal only**.
- **Palm-line highlight:** `accent` (vermilion) everywhere.
- **Motion:** tasteful & premium; foundation-first; every animation reduce-motion + web gated.
- **Haptics:** light/selection ticks on native taps + a success pattern on the pair-reveal peak
  (native-only, `[~]`).
- **Type / elevation / icons / English-first / a11y / server-reskin method:** **unchanged** from the
  Quiet Cosmos doc (`UIUX-Redesign.md` §4–§8 still authoritative for those).
- **Skins:** add Vermilion as skin #3 + `activeSkin`; keep #1/#2 for parity/rollback.
- **Neutrals:** kept as-is to limit churn (optional: warm them a hair — nicety, not required).
- **Ledger:** a fresh `V`-numbered machine (`UIUX-Redesign-v2-Tasks.md`); R1–R24 stay complete/archived.
