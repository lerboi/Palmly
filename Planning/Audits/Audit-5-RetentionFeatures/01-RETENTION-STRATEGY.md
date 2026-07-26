# Audit-5 · 01 — Retention Strategy: the daily loop rooted in the palm

**Date:** 2026-07-26 · **Status:** PROPOSED (planning artifact — decisions marked ⚠️ need owner sign-off)
**Companions:** `02-UI-UX-SPEC.md` (screens & interactions) · `03-TECHNICAL-ARCHITECTURE.md` (schema & pipelines) · `04-TASK-MATRIX.md` (execution ledger)
**Grounding:** full codebase audit 2026-07-26 (frontend + backend, summarized in §1) + market research (sources in §2). Respects the locked decisions in `Planning/mvp_spec.md` §4.6/§8, Decision Log 2026-07-11 (no-trial monthly+annual), and Audit-4 `Design-Direction.md` (design source of truth).

---

## §0 The one-paragraph thesis

Palmly's acquisition hook (scan → real reading) is one-and-done because the *input* never changes. Every successful comp solves this the same way: hold the static input constant and let **time** be the variable (Co-Star: today's sky × your chart; The Pattern: dated cycles × your chart). Palmly's current daily layer (the almanac fortune) already does "time," but it is keyed to a *birth-date bucket shared by ~1/60th of users* — it never touches the thing the user actually gave us: **their palm**. The fix is not a new content vertical; it is routing the existing daily engine *through the user's own stored biometrics*. Market research confirms nobody has shipped daily content computed from real palm/face features — the category's top palmistry earner (Hint, ~$14M/yr) uses the palm only as an ad hook and retains with generic astrology. That is the whitespace.

**The loop we ship:** every morning, one reveal — *Today's Line*: one feature from YOUR reading (your actual heart line, drawn from your actual geometry) read through today's day-pillar energy. Sealed with an optional 5-second on-device palm check-in ("your lines hold — day 12") that costs zero tokens and no upload. Free = the reveal essence + the ritual + the streak. Premium = the full daily reading, the line's dated chapter (Line Cycles), the full almanac, and chat about today.

---

## §1 Current state (codebase audit, 2026-07-26)

What exists and works — the strategy builds on ALL of this, replaces none of it:

| Asset | State | Why it matters here |
|---|---|---|
| Palm + face pipeline | LIVE, proven on-device 2026-07-25. Real readings, `feature_sets.features.line_geometry` drawable client-side, deterministic skeleton + grafted prose. | The daily feature pool: 7 palm section keys + 8 face section keys per user, each with real geometry to draw. |
| Hand-signature matcher | LIVE. 4 finger chains + palm width in canonical space; matches pre-extraction in 233ms, **0 tokens**. Signature stored in `feature_sets.geometry.hand`, owner-readable via RLS. Client computes it locally (`app/src/features/capture/handSignature.ts`). | An on-device "same palm" verification exists **for free** — the daily ritual can be biometrically real without any server cost. No competitor can do this. |
| Daily fortune | LIVE. Nightly cron → Gemini → `fortune_templates` (61 day-pillar buckets × locale, ~$0.25–0.50/day, DAU-independent). Client: `FortuneCard` free essence / premium almanac. | The generation pattern (pre-generated shared templates, idempotent, resumable) is the template for Today's Line. The bucket-generic content is the thing being personalized. |
| Streaks | Client-local only (`palmly.fortune_opens.v1` AsyncStorage). `user_fortunes` table exists with owner RLS but has **zero writers**. | The streak must move server-side anyway (reinstall/2nd device/push targeting). The table is already there — revive, don't invent. |
| Push infra | Templates for 10 notification types, quiet hours, marketing cap 1/day, dedupe — all built. **Only `compat_complete` is ever enqueued.** No daily-fortune fan-out exists (gap C.10). | The morning push — the single strongest retention lever in the category — is a producer away from working. |
| Paywall | UI complete, personalized hero (user's own geometry), 6 trigger taxonomy. CTA disabled pending RevenueCat (H8). `post_share` trigger has no call site; winback decline is stored locally, never reaches the server. | New triggers slot into an existing, well-built system. Purchase wiring is a human gate, not a design blocker. |
| Chat | LIVE, premium, grounded in the user's actual features, "Ask about today" prefill already exists (`askPrefill()`). | The daily reveal's natural "go deeper" bridge is already built. |
| Design system | Vermilion & Motion v2 + Audit-4 discipline (ink-first, one hero/screen, 3 tabs Today·Readings·Ask, honest states). | The new surfaces extend this system — see `02-UI-UX-SPEC.md`. |
| KB | 141 chunks (palmistry + physiognomy). `kb_chunks.tradition` CHECK already allows `'almanac'` — **zero rows**. | A reserved, unused slot for grounding daily content in chat. |

**The diagnosed problem, precisely:** the daily surface is disconnected from the hook because (a) fortune content is bucket-generic — two users with the same birth-date bucket see identical text, and a user who skipped birth date sees the `generic` bucket like everyone else; (b) nothing daily ever *shows the user their own palm*; (c) the streak is a local dot-strip with no server truth, no milestone moments, and no push; (d) the morning push — the loop's front door — doesn't exist.

---

## §2 What the market proved (research synthesis)

Full sourced report in the session record; the load-bearing findings:

1. **The daily push IS the retention product.** Co-Star's entire loop rests on a voiced one-liner push; contextual pushes get ~3.4× the open rate of generic (14.4% vs 4.2% — CleverTap/MobiLoud benchmarks).
2. **Static input → dated cycles** is the category's best trick (The Pattern's "Your Timing": "this chapter of you runs until ⟨date⟩"). Its known failure: content that visibly repeats inside a cycle — users punish it in reviews.
3. **One-per-day ritual scarcity** (tarot card-of-the-day, no re-draws; Faladdin's 24h-refresh credits + "your reading is being prepared" anticipation) makes the daily unit feel sacred instead of feed-like. Faladdin sustains ~1M readings/day on this.
4. **Streaks work and insurance doubles them** (Duolingo: 55% next-day return; streak-freeze users hold streaks +48% longer).
5. **Daily body-state tracking is a validated desire, badly served** (Aura Scanner: "come back daily to see how your energy shifts" — with fake measurements). Palmly can do it honestly.
6. **Paywall placement:** free daily unit forever, gate *depth* contextually (CHANI: ~$500K/mo, 4.9★, generous free dailies). Never pre-result (Umax's ratings collapse), never blur free/paid (Nebula's trust collapse). Pair/compatibility depth is where the category's willingness-to-pay concentrates.
7. **Pricing:** category clusters $9–15/mo, $20–70/yr. Weekly converts 5.4× better to trial but renews worst-in-class (35%) and generates every trust-destroying review. Palmly's settled monthly+annual/no-trial stance matches the trust-preserving pole (CHANI), with trial/weekly reserved for post-launch RevenueCat experiments (Decision Log 2026-07-11 — unchanged).

**Category failure modes to design against:** visible content recycling (Pattern/Nebula), billing opacity (Nebula/Hint), paywall-before-value (Umax), content bloat off-hook (Moonly — already a spec §8 rule).

---

## §3 The two features

### Feature 1 — **Today's Line** (code name `pulse`; UI never says "pulse")

> Every day, the app reads ONE feature of your own palm (or face) through today's energy. Your actual line, drawn from your stored geometry, lit on the card. One reveal per day. It persists all day. Tomorrow it's a different line, a different day-pillar, a different reading.

**Mechanics:**
- **Selection** — deterministic, per user per day: hash(user_id, date) picks from the section keys the user's canonical reading actually has (palm: heart/head/life/fate/hand_shape/mounts/markings; face: its 8 keys; both-kind users draw from the union). A no-repeat window (~5 days) forces rotation. Same math on client and server (mirrored like the pillar math) so the push and the card always agree.
- **Content** — pre-generated nightly, keyed to (date, feature_key, locale): the **date's own** sexagenary pillar (the "Wood Rat day" the header already shows) × the feature. ~15 templates/day — because the day's pillar is a property of the *date*, not the user. Personalization comes from *which* feature is yours today, *your* geometry drawn and lit, and (premium) the interaction with your birth-element fortune. **Cost: ~15 Flash-Lite calls/day ≈ $0.03–0.06/day, DAU-independent** — cheaper than the existing fortune run.
- **Reveal** — one per day, press-and-hold on the card (the "one true message" scarcity mechanic). Revealed state persists all day (server row, not local flag).
- **Anti-repetition** (the Pattern's failure, designed against): 15 feature lenses × 60 day-pillars = 900 combinations before exact template reuse, and the visible artifact (which of YOUR lines, lit on YOUR palm) changes daily even when prose themes rhyme.

**Free:** the essence (one serif line, e.g. *"Your heart line favors patience on a Fire Rooster day."*) + their lit diagram + the reveal ritual.
**Premium:** the full daily reading — the line's guidance across career/love/wealth, "watch for," the line's current **chapter** (below), and the "Ask about today's line" chat bridge.

### Feature 2 — **Seal the day** (on-device palm check-in + server streaks)

> Optional ritual: hold your palm to the camera for a few seconds. On-device (the same MediaPipe tracking that guided your capture), Palmly re-traces your lines live over your hand, confirms the same-palm signature, and stamps the day with the vermilion seal: "Your lines hold. Day 12."

**Mechanics:**
- **Zero cost, zero upload, zero tokens.** The client already computes the hand signature locally; comparison against the stored canonical signature (owner-readable `feature_sets.geometry.hand`) is a distance function. No photo leaves the device — the privacy story is a headline, not a footnote.
- **Tap is always enough.** The camera ritual is the *deluxe* seal, never a gate: tapping the reveal also counts the day. (Friction kills dailies; the ritual is for the users who want the ritual — and they will screenshot it.)
- **Streaks move server-side:** the dead `user_fortunes` table is revived as the daily ledger (opened / revealed / sealed, method, feature key). The week strip and streak count read server truth; the existing local history is replayed into it once at migration so nobody's streak resets.
- **The trust ticker compounds:** every seal re-proves the product's core promise ("same palm, same reading — your lines don't lie") mechanically. Day 47 of "your lines hold" is a moat no horoscope app can copy.
- **Streak insurance (post-MVP flag):** one "quiet day" per week that doesn't break the streak — Duolingo's +48% mechanic, reframed in-voice ("the almanac counts rest days too").

### The premium narrative layer — **Line Cycles** (ships inside Feature 1's premium depth)

Each major feature carries a dated **chapter** (e.g., *Fate line — "The rebuild" · through Aug 14*), computed deterministically from line geometry hash + date (pure code, zero model calls, mirrored client/server). Free users see the chapter *name and end date* on the card (the tease is the date). Premium gets the chapter reading, what the next chapter is, and the **boundary moment**: on chapter-turn days the push and the card lead with it. Cycle boundaries are the category's proven conversion spike (astro apps convert on retrogrades/full moons; ours are *personal*, which is stronger).

### Explicitly deferred (scope discipline, spec §8)
- **Daily pair weather** (your hand × their hand today) — the research says pair depth is the premium anchor, but it needs the compat base loop live on 2 devices at scale first. Designed-for (schema leaves room), not built now.
- Face daily micro-scan (front-camera state ritual), BaZi depth, solar-term content surfaces, streak insurance UI — all noted post-MVP.

---

## §4 The daily habit loop (end to end)

```
 08:30 local (quiet-hours + prefs respected, marketing cap 1/day)
 ┌──────────────────────────────────────────────────────────────┐
 │ PUSH  "Your heart line has something to say about Friday."   │  ← personalized: names THEIR line
 └──────────────┬───────────────────────────────────────────────┘
                ▼
 TODAY TAB  week strip (server streak) · Today's Line card (unrevealed)
                ▼  press-and-hold  (or "Seal with your palm" → 5s camera ritual)
 REVEAL     their line lights on their geometry · essence line (free)
                ▼
 DEPTH      premium: full reading · chapter · almanac · "Ask about today's line"
    free:   one lock line + CTA → paywall (trigger: pulse_full)
                ▼
 LOOP OUT   streak +1 (server) · milestone days → recap share card →
            share → invite → compat → (future) daily pair weather
```

Session shape: 30–90 seconds free, 2–4 minutes premium (chat). The loop's *front door* is the push; its *reason* is scarcity (one reveal, today only); its *soul* is the user's own palm on screen every single day; its *receipt* is the streak + "your lines hold."

---

## §5 Positioning

- **Product line:** "Your palm, read daily." The scan is chapter one, not the product. Onboarding, store copy, and the reveal's "Done" moment all hand off to Today with this framing.
- **Voice:** the considered scholar-friend (Audit-4 §P5) — never Co-Star's chaos-cryptic, never horoscope-generic. The push is one calm, specific sentence that names *your* feature.
- **Honesty line (non-negotiable, extends Audit-4 P4):** things that are *measured* are presented as measured (same-palm signature, streak, geometry); things that are *tradition* are presented as tradition (the reading of the day). The check-in never claims to measure mood/energy/health from the hand. Canonical disclaimer stays: "For reflection and entertainment."
- **Privacy as feature:** "Sealing the day happens on your phone. No photo is taken, nothing is uploaded." — this sentence appears in the ritual UI itself.

---

## §6 Free vs premium (exact split)

| Surface | Free (forever) | Premium |
|---|---|---|
| Today's Line | Essence line + their lit diagram + reveal ritual + chapter name/end-date | Full reading (career/love/wealth through the lens, "watch for"), chapter reading + next-chapter preview, boundary readings |
| Seal the day | Fully free (ritual, streak, week strip, milestones) | — (never gate the ritual) |
| Almanac (existing) | `overall` essence | Full almanac (do/avoid, domains, lucky trio) — unchanged |
| Chat (existing) | gate screen | Unlimited, now with "Ask about today's line" grounded chip |
| Pulse archive | Today only | Past Today's-Line readings browsable (rides on existing history shelf) |
| Compat (existing) | First comparison | Unlimited — unchanged |
| Reveal deep sections (existing) | depth-1 sections | depth-2+ — unchanged |

Rule inherited from spec §4.6 and CHANI's proof: **the daily unit and the ritual are never paywalled.** Depth is.

## §7 Conversion triggers (the complete list)

| # | Trigger id | Moment | Surface | Notes |
|---|---|---|---|---|
| T1 | `pulse_full` **(new)** | Daily, post-reveal — user has just received value and hit the lock line | Today's Line card lock → paywall, hero shows *today's* line lit | The workhorse. Fires at most once/day organically; the paywall hero reuses the personalized-geometry system that already exists. |
| T2 | `cycle_boundary` **(new)** | Chapter-turn days (~every 2–6 weeks per line) | Boundary banner on Today + that day's push copy | The category's proven spike, made personal. Also the winback re-entry hook ("your Fate chapter turned while you were away"). |
| T3 | `streak_milestone` **(new)** | Day 3 / 7 / 14 / 30 seal | Milestone moment sheet → weekly recap share card (free) with a soft premium line | Give first (the share card is free — it feeds acquisition), sell second. |
| T4 | `fortune_full`, `chat_entry`, `locked_section`, `compat_second`, `settings` (existing) | unchanged | unchanged | Untouched. |
| T5 | `post_share` (existing, **dead — wire it**) | After a successful share/recap-card share | Share sheet close | Taxonomy already includes it; no call site emits it today. |
| T6 | `winback` (existing template, **half-wired**) | 24h after paywall decline; reframed by T2 when a boundary passed | Push | Decline timestamp is currently local-only — must reach the server for the template to ever fire. |

**Pricing/packaging:** unchanged — monthly + annual, no trial at launch (Decision Log 2026-07-11). Research supports this as the trust-preserving pole; weekly/trial variants remain post-launch RevenueCat Paywalls experiments. ⚠️ One owner decision: annual price anchoring copy on the paywall ("Best value" framing already built) once H8 lands real prices.

## §8 Measurement (PostHog — events specified in 03 §9)

North stars: **D1/D7/D30 retention** and **reveal rate** (% of DAU that opens Today's Line). Loop diagnostics: push opt-in rate, push→open rate, seal rate (camera vs tap), streak distribution, `pulse_full` paywall view→(H8)purchase, boundary-day conversion delta, recap-card share rate. Guardrails: fortune/pulse generation completeness (existing `fortune_incomplete` pattern), Today load p95, ritual match failure rate.

## §9 Risks & mitigations

| Risk | Mitigation |
|---|---|
| Content repetition perceived (Pattern's failure) | 900-combination matrix before template reuse; the visible artifact rotates through *their* features; no-repeat window; monitor a "seen this before" survey variant of the existing consistency survey. |
| Ritual friction kills the daily | Tap always counts; camera is deluxe-optional; reveal ≤2 taps from cold open; push deep-links straight to Today. |
| Honesty drift (pseudo-measurement creep) | §5 honesty line is acceptance criteria in 02; copy review gate in 04. |
| Push fatigue | Existing 1/day marketing cap + quiet hours already enforced server-side; single morning push only. |
| Pre-H8 limbo (no purchases possible) | All triggers land on the existing honest paywall ("Pricing coming soon"); loop ships and retention is measurable before monetization switches on — conversion instrumentation is ready the day H8 lands. |
| Fortune vs Line hierarchy confusion | One hero per screen (Audit-4): Today's Line IS the hero; the almanac demotes to a flat card. Specified precisely in 02 §3. |
