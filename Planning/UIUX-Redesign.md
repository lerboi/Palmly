# Palmly — UI/UX Redesign North Star ("Quiet Cosmos")

> **This is the design source of truth for the redesign.** It supersedes the visual
> identity in `UIUX-specs.md` (that doc still governs *screen behavior, flows, and
> content*; this doc governs *how it looks and feels*). The redesign is executed as a
> task loop — see `Planning/UIUX-Redesign-Tasks.md` for the checkbox ledger.
>
> **Founder-locked direction (2026-07-14):** Vibe = **Calm & premium** (Headspace/Calm
> — soft warm neutrals, one quiet accent, rounded cards, whitespace, gentle motion).
> Heritage = **subtle hints only** (keep the cinnabar accent + traced-palm hero; drop
> CJK glyphs 心智命运 + seal chrome; English-first). Type = **sans-first modern**.
> Scope = **the full journey incl. currently-placeholder screens**.

---

## 1. The idea in one paragraph

Palmly should feel like a **calm, modern, premium self-reflection app** — a considered
friend and a night-sky notebook, **not a Chinese almanac**. It is English-first and
broadly appealing to anyone, Chinese or not. The **heritage survives only as a whisper**:
a warm off-white paper tint, one softened red used sparingly (the highlighted palm line,
the "red thread", a single seal in the share-card corner), and an *optional* "traditional
view" for users who want the CJK detail. The **traced-palm line diagram stays the hero** —
it is geometry, not a cultural motif — but rendered with real craft (a hand silhouette,
weighted ink, a genuine draw-on animation).

**Feel words:** calm, premium, clear, warm, trustworthy, effortless — *quietly magical,
never mystical-kitsch, never festive*.

---

## 2. What we KEEP, SOFTEN, and REMOVE (heritage decisions)

| Element | Decision | What that means |
|---|---|---|
| **Traced-palm line diagram** (`PalmDiagram`) | **KEEP + upgrade** | The signature trust/privacy/share artifact. Culturally neutral geometry. Add a hand silhouette, richer geometry, weighted ink, a real ~1.2s draw-on. Recolor highlight to the new accent; labels default off/English. |
| **Cinnabar red** | **SOFTEN → "heritage accent"** | No longer the primary. Demoted to a *softened* warm red used **only** for: the highlighted palm line, the red-thread compare motif, and the corner seal. Never a full-bleed CTA. |
| **The "photo is deleted" privacy story** | **KEEP** | A first-class, singular trust signal. Shown **once**, prominently — not repeated as chrome on every card/row. |
| **Reveal → share → compare virality loop** | **KEEP** | Core product. Just re-skinned modern. |
| **Warm, literate, non-guilt-tripping voice** | **KEEP** | Broadly appealing. Trim xuanxue/almanac phrasing + classical CJK citations (三才纹, 婚姻线). |
| **Do/Avoid + Love/Career/Wealth fortune structure** | **KEEP** (universal) | Keep the structure; translate 宜/忌 → Do/Avoid, drop the CJK aspect tags. |
| **Jade green success** | **KEEP, rename** | Becomes a semantic `success` token. |
| **Gold premium** | **SOFTEN** | Keep gold as a *rare* premium marker (champagne/amber). Drop the "imperial" framing and the CJK 锁 lock glyph. |
| **CJK section glyphs** 掌/心/智/命/运/丘/纹 on reveal cards | **REMOVE** | Replace with small modern line-icons (heart/mind/life/path). |
| **CJK line labels** 心·智·命·运 on the diagram | **SOFTEN** | Default off / English (Heart/Head/Life/Fate). CJK only under the optional zh "traditional view". |
| **CJK step numerals** 一/二/三 + inline 手相/面相 (Methodology) | **REMOVE** | Use 1/2/3 or step icons; lead English ("palmistry", "face reading"). |
| **Launcher** 掌 seal + "手相 · 面相" tagline | **REMOVE** | New CJK-free logomark + English tagline. |
| **`SealBadge`** (cinnabar chop w/ CJK glyph, hard-coupled to Noto Serif TC) | **REBUILD** | → a CJK-free **Logomark** (stylized palm + three lines). Keep a small refined stamp **only** in the share-card corner. |
| **Almanac day-pillar** 己丑日 (干支) | **SOFTEN** | Demote to a small optional detail; lead with weekday + date. |
| **Noto Serif Display on every headline + Noto Serif TC** | **REMOVE from default** | Sans-first (Noto Sans). Optional single editorial serif hero (see §4). Keep the CJK font module, load only under zh. |
| **Raw emoji as icons** 🔴🔥🔒 | **REMOVE** | Designed react-native-svg line-icons. |
| **Authority-by-ethnicity copy** ("Three thousand years of Chinese palmistry") | **SOFTEN** | "Rooted in centuries of palmistry" / "Cross-checking the classics". |

---

## 3. Color tokens (role-based; the heritage is one swappable "skin")

**Principle:** tokens are named by **role**, not by heritage material. `tokens.ts` keeps the
raw palette as a named **skin** object; `theme.ts` maps **roles → skin values**. "Ink &
Cinnabar" becomes skin #1 (kept for parity / optional traditional view); **"Quiet Cosmos"
is skin #2 and the active default.** A future re-skin is then a one-file change.

### ★ The one tunable that sets the whole feel: `accent`
The **primary accent** is the single most defining choice. Default below is **twilight
indigo** (calm, premium, night-sky, clearly distinct from the heritage red + the success
green). **To change the entire app's feel, change just these two hexes** (light + dark) and
re-run the loop's harness screenshot. Alternatives to try: muted teal `#2F8F83`, slate blue
`#425A8B`, or a warm graphite `#3A3A42` for maximum restraint.

### Quiet Cosmos — light
| Role | Hex | Use |
|---|---|---|
| `bg` | `#FAF9F7` | App background (a whisper of warmth, not dusty beige) |
| `surface` | `#FFFFFF` | Cards, sheets |
| `surfaceRaised` | `#FFFFFF` + `shadow.md` | Lifted cards, the paywall, streak, sheets |
| `surfaceSunken` | `#F2F0EC` | Insets, chat input, track backgrounds |
| `border` | `#E7E3DC` | Hairline dividers/outlines |
| `textPrimary` | `#1A1A1F` | Headlines, body |
| `textSecondary` | `#6B6B72` | Secondary/caption |
| `textTertiary` | `#9A9AA0` | Disabled/hint |
| **`accent`** ★ | **`#4B57C4`** | Primary CTAs, active states, links, selected |
| `accentPressed` | `#3E49AA` | Pressed CTA |
| `accentMuted` | `#ECEDF9` | Tonal button bg, selected tint |
| `onAccent` | `#FFFFFF` | Text/icon on accent |
| `heritageAccent` | `#C2554A` | **Softened cinnabar** — palm-line highlight, red-thread, seal ONLY |
| `premium` | `#C79A3C` | Champagne/amber — the rare premium marker |
| `onPremium` | `#1A1A1F` | Text on premium |
| `success` | `#3F7A5E` | Verified / "unchanged" consistency brag |
| `danger` | `#C0392B` | Destructive confirm (was reusing cinnabar) |
| `scrim` | `rgba(20,21,26,0.4)` | Modal/backdrop |

### Quiet Cosmos — dark (explicit dark-tuned accents; no reusing saturated light hexes)
| Role | Hex |
|---|---|
| `bg` | `#14151A` (cool near-black, not festive) |
| `surface` | `#1E2027` |
| `surfaceRaised` | `#24262F` |
| `border` | `#2E313B` |
| `textPrimary` | `#F4F4F6` |
| `textSecondary` | `#A9A9B2` |
| **`accent`** ★ | **`#8B95F0`** |
| `accentPressed` | `#A3ACF5` |
| `accentMuted` | `#23253A` |
| `heritageAccent` | `#D98A7E` |
| `premium` | `#D9B25A` |
| `success` | `#5AA981` |
| `danger` | `#E06B5E` |

> **Migration guardrail:** `gold`, `jade`, `seal` and the `Tone='gold'|'jade'|'onGold'`
> text API are read in 10+ places. `theme.ts` must ship **back-compat aliases**
> (`gold`→`premium`, `jade`→`success`) so `tsc`/`jest` stay green while consumers migrate
> incrementally — do **not** rename-and-break in one step. Also update the **hardcoded
> heritage hexes in `app.json`** (`android.adaptiveIcon.backgroundColor "#C3272B"`, the
> `expo-splash-screen` colors) or the Android adaptive icon will still flood cinnabar.

---

## 4. Typography — sans-first

Promote **Noto Sans** (already bundled; ships weights 100–900, so a full ramp needs **no new
dependency**) to the whole scale. Huge Latin/Cyrillic/Greek coverage = universal + ready for
localization. Remove **Noto Serif TC** from the default scale (keep the module, load only
under the optional zh locale). Keep **Noto Serif Display** only as an *optional* editorial
variant for **one** hero headline (the reveal) — or drop it entirely for a fully-sans,
maximally-modern default. Default recommendation: **fully sans**, serif hero optional.

| Variant | Font / weight | Size / line |
|---|---|---|
| `display` | Noto Sans 800 | 34 / 40, tracking −0.5 |
| `title` | Noto Sans 700 | 26 / 32, tracking −0.3 |
| `heading` | Noto Sans 700 | 18 / 24 |
| `bodyLarge` | Noto Sans 400/500 | 17 / 26 |
| `body` | Noto Sans 400 | 16 / 24 |
| `caption` | Noto Sans 500 | 13 / 18 |
| `numeral` | Noto Sans 700 | 30 (was serif) |
| `editorialHeadline` *(optional)* | Noto Serif Display 600 | reveal hero only |

Revisit the `Text.tsx` "accent must be ≥18pt" guard — the new indigo passes AA at more
sizes than cinnabar did. Add `success` / `premium` / `danger` tones.

---

## 5. Shape, elevation, spacing, motion

- **Elevation:** add a real `shadow.sm/md/lg` scale (iOS `shadow*` + Android `elevation`)
  and a `surfaceRaised` token. Cards, sheets, the paywall, plan cards, and the streak
  component should **lift** subtly. (Current system has *no* shadow token — everything is
  flat, which reads dated.)
- **Radii:** `sm 8`, **`md 12` (new default for cards + buttons)**, `lg 16`, `xl 20`,
  `pill 999` (now *optional*, not forced on every button).
- **Spacing:** keep the 4px base but grant **more generous section spacing** (fixes the
  crammed fortune card `gap:1`).
- **Motion** (via `react-native-reanimated` 4.3.1, already a dep): the ~1.2s PalmDiagram
  draw-on, spring screen/card transitions, a chat typing indicator, an analyzing progress
  ring. **Every motion needs an `AccessibilityInfo.isReduceMotionEnabled` fallback.**
- **Icons:** a small **in-house `react-native-svg` line-icon set** (heart/mind/life/path,
  lock, share, send, streak, thread, chevron, back) replaces all raw emoji and decorative
  CJK glyphs. No icon library exists in the project — build one. Each icon needs an
  `accessibilityLabel`.

---

## 6. Tone of voice

Keep the warm, literate, "considered friend" voice — it's broadly appealing. English-first,
universally legible. Trim almanac/xuanxue-specific phrasing and classical CJK citations.
Reframe authority **without ethnicity**. The privacy promise ("your photo is deleted") stays
a first-class, singular trust line. Proposed tagline: **"Read your palm from a single photo."**

---

## 7. The two server-rendered surfaces (do NOT forget these)

The images/pages the outside world actually sees are **server-rendered** and each hardcodes
its own cinnabar/gold/CJK — reskinning only the app leaves them Chinese:

- **`supabase/functions/_shared/card-svg.ts`** — the share **card image** users post
  (palette lines ~10–17, CJK `LINE_LABEL` ~31–37, a 相 seal chop ~144–146, serif headline
  ~164). Must be reskinned to match the app, ideally from **one shared palette source** so
  the in-app share preview and the posted image can't drift. Re-pin `card-svg.test.ts`.
- **`supabase/functions/_shared/invite-page.ts`** — the public **invite landing page** at
  `palmly.app/i/{token}` (the first impression for every invited non-user; `#F7F2E7` bg,
  `#C3272B` CTA/seal, 相 glyph, serif). Top of the acquisition funnel. Reskin + re-pin
  `invite-page.test.ts`. This is a live public surface independent of the app build.

---

## 8. Verification (device-free, like the existing checkpoints)

1. **Static gates on every task:** `tsc --noEmit`, ESLint, `jest` — including the two
   contract tests that anchor the system: `app/src/theme/__tests__/tokens.test.ts`
   (rewrite to pin the **new role-based token contract**) and
   `app/src/components/palm-diagram/__tests__/geometry.test.ts` (must stay green through the
   PalmDiagram upgrade — `geometry.ts` is pure/RN-free).
2. **Visual verification:** `expo export --platform web` + headless-Chrome screenshots at
   **390×844** (plus a **320-wide** pass to catch right-edge clipping). The `/dev` route map
   walks every route; **`/dev/theme` is the primary regression surface** — extend it to
   render the new tokens, elevation, full button matrix, icon sheet, logomark, and
   PalmDiagram in **light + dark**. Save new shots under `docs/checkpoints/redesign/`.
3. **Native-only caveats (verify honestly, don't fake green):** guided **capture**
   (`expo-camera`) and the **paywall** (RevenueCat native) do **not** render in web export.
   Build them with **fixture/mock stand-ins** so the *layout* is screenshot-verifiable, and
   mark the on-device leg `[~]` (built, pending device) — same honesty convention as the
   existing build plan. Reanimated-on-web SVG draw-on may not capture headlessly; verify the
   static end-state via screenshot and note motion as device-pending if the gif fails.
4. **Grep invariants (cheap):** after the CJK strip, grep built feature/theme files for CJK
   codepoints and for 🔴/🔥/🔒 — should return only zh-locale strings (or nothing); grep for
   direct hex usage in components (should be none — all via tokens); grep for imports of the
   deleted dead-scaffold modules (should be none).

**Definition of done:** all static gates green; **every** route (built + previously-placeholder)
renders a finished, realistic-content screen at phone size in light + dark with no decorative
CJK, no raw-emoji icons, real elevation, the new accent (no cinnabar full-fill CTAs), the
upgraded PalmDiagram hero, and matching server card + invite page.

---

## 9. Decisions defaulted (change any in this doc; the loop reads from here)

These were defaulted so the loop isn't blocked. Edit this doc to change; the loop re-grounds
from it each iteration.

- **Primary accent:** twilight indigo `#4B57C4` / `#8B95F0` ★ (see §3). *← the one to tune.*
- **Heritage red:** kept but softened + tiny (`#C2554A`). Not fully removed.
- **Serif:** fully sans by default; optional serif hero on the reveal is a nicety, not required.
- **CJK:** removed from default UI; font modules retained and loaded only under an optional zh
  "traditional view" (wired to the Settings Language row).
- **Fortune almanac depth:** day-pillar demoted to a small optional detail; universal
  Do/Avoid + Love/Career/Wealth kept.
- **Paper-grain texture:** skipped — clean warm-tinted flat surfaces instead.
- **Brand mark:** the loop authors a CJK-free SVG palm logomark + app-icon/splash set (a
  professional logo pass can replace it later).
- **Dark mode:** treated as a launch-quality theme (tokens do both light + dark anyway).
- **Compat/pair-reveal recipient route:** **built** as part of this overhaul (scope = full
  journey), plus the server invite page reskinned regardless.
