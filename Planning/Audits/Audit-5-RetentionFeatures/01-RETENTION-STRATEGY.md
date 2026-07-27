# Audit-5 · 01 — Retention Strategy: the daily loop rooted in the palm

**Date:** 2026-07-26 · **Status:** PROPOSED (planning artifact — decisions marked ⚠️ need owner sign-off)
**Companions:** `02-UI-UX-SPEC.md` (screens & interactions) · `03-TECHNICAL-ARCHITECTURE.md` (schema & pipelines) · `04-TASK-MATRIX.md` (execution ledger)
**Grounding:** full codebase audit 2026-07-26 (frontend + backend, summarized in §1) + market research (sources in §2). Respects the locked decisions in `Planning/mvp_spec.md` §4.6/§8, Decision Log 2026-07-11 (no-trial monthly+annual), and Audit-4 `Design-Direction.md` (design source of truth).

---

## §0 The one-paragraph thesis

Palmly's acquisition hook (scan → real reading) is one-and-done because the *input* never changes. Every successful comp solves this the same way: hold the static input constant and let **time** be the variable (Co-Star: today's sky × your chart; The Pattern: dated cycles × your chart). Palmly's current daily layer (the almanac fortune) already does "time," but it is keyed to a *birth-date bucket shared by ~1/60th of users* — it never touches the thing the user actually gave us: **their palm**. The fix is not a new content vertical; it is routing the existing daily engine *through the user's own stored biometrics*.

⚠️ **Corrected 2026-07-28 (RF6.T6 — see `06-MARKET-VERIFICATION.md`).** This paragraph previously claimed "nobody has shipped daily content computed from real palm/face features … the category's top palmistry earner (Hint, ~$14M/yr) uses the palm only as an ad hook … That is the whitespace." **Both halves were wrong.** (a) Daily-content-from-a-stored-palm-scan **has** been shipped — `Solma: Palm Reader & AI` (iOS 6760654131) does exactly it today, a `$12.99/mo "Daily Palm Insight"` subscription shipped in 2021 and was abandoned, and a questionnaire-driven "Daily Palmistry" runs at 100K+ installs. None has any evidence of traction. (b) Hint's ~$14M is a **Sensor Tower estimate for calendar 2019, US only, gross**, from a ranking of **astrology** apps, published under its old name; the app is now **delisted from both stores** and the business is a paid web funnel. **The accurate position: this is not whitespace and not a proven loser — it is untested. Nobody has shown the loop retains, and nobody has shown it fails.**

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

⚠️ **This section was verified claim-by-claim on 2026-07-28 (RF6.T6). Several figures were wrong and are corrected in place below. Full evidence, sources and confidence ratings: `06-MARKET-VERIFICATION.md`.** The original "full sourced report in the session record" no longer exists; treat anything not carrying a source below as unverified.

1. **The daily push is the category's signature mechanic.** Co-Star's original distinguishing feature is a daily push in a deliberate voice — human-written snippets assembled against ephemeris data, "conversational, zero bullshit, lovingly savage" (Banu Guler, 2019); still a headline App Store feature bullet. ⚠️ *Corrected:* nobody has published a retention number attributing Co-Star's retention to push, its social/compatibility graph is independently credited as the viral driver, and by 2026 its cadence has crept to 2–3/day including upsells — so do **not** call push "the core retention mechanic." ⚠️ *Corrected:* the 14.4% vs 4.2% figures are **Batch's** (*The Great Push Notifications & Mobile Engagement Benchmark 2025*: 14.4% vs 4.19%, 800bn messages, ~10,000 apps, Jul 2024–Jul 2025, Europe-weighted), **not CleverTap's or MobiLoud's** — and Batch defines *contextual* as **automatically triggered**, *generic* as **manually broadcast**. It is a delivery-mechanism split, not personalised-copy vs generic-copy, and it is cross-industry with no astrology relevance. It does still apply to our morning fan-out, which is a triggered scheduled send.
2. **Static input → dated cycles** is the category's best trick (The Pattern's "Your Timing": "this chapter of you runs until ⟨date⟩"). Its known failure is **verified and is the best-evidenced claim in this section**: three independent App Store reviews name repetition directly ("every week you get the same prompts basically"; "I just get a recycling of the same messages"), and The Pattern carries **3.96★ — the lowest rating of every app sampled** (peers 4.5–4.9). Key nuance the original missed: those complaints are **bundled with paywall resentment in the same reviews** — users punish *paying more for the same thing*, not repetition alone.
3. **One-per-day ritual scarcity** (tarot card-of-the-day, no re-draws; Faladdin's 24h-refresh credits) makes the daily unit feel sacred instead of feed-like. The mechanic is **verified from Faladdin's own FAQ**: one free credit per reading type per day, reloading 24h after use; Premium's upsell is literally a **shorter timer** (8h instead of 24h) plus one extra credit; the wait is monetised ("speed up your reading by paying 0.5 credits" or watch an ad); an unread-inbox block gates new requests. ⚠️ *Corrected:* the string "your reading is being prepared" is **not** Faladdin's — theirs is "when your fortune reading is **ready**." ⚠️ *Corrected:* "~1M readings/day" is **unverified company marketing copy**, unchanged in store listings since March 2019 while claimed downloads grew 15M→50M; no independent measurement exists. ⚠️ **Caution:** Faladdin's founder was detained in July 2025 and prosecution continues on money-laundering charges aimed at the fortune-telling revenue model itself; Turkey suspended the platforms' advertising in 2024. Cite the mechanic, never the business.
4. **Streaks work and insurance extends them.** ⚠️ *Corrected:* the "+48%" is **Trophy's** cross-customer platform data (17.19 vs 11.62 streak days on apps with/without streak freeze), **observational and not Duolingo's**; the "55% next-day return" is **unsourced and has been dropped**. Duolingo's own published figures: **"learners who reach a streak of 7 are 2.4× more likely to continue the next day"** (blog, 2020-11-19); share of DAU with a 7+ day streak rose ~3× to more than half of DAU, CURR +21% ≈ >40% less daily churn among best users (Mazal, 2023); and on freezes specifically, **"two streak freezes worked better than one, but three were no better than two"** (Shuttleworth, Group PM Retention, Dec 2024). *That last one means our one-quiet-day-per-7 design sits below the evidenced optimum — see RF6.T4.*
5. **Daily body-state tracking is a validated desire, badly served.** Verified across a crowded aura-app category ("come back daily for fresh scans"; "daily sessions") in which developers admit fabrication in their own listings ("does not provide true Aura Detection functionality"). ⚠️ *Sharpened:* those apps' loops are **re-scan** loops, not one-stored-scan loops. More important, the reviews show what this category actually punishes — **non-determinism and fake measurement**, not repetition: "I scanned my dog's paws and it gave a reading"; "7 readings back to back, 7 different results"; "it gave me and my boyfriend the exact same aura." **This is the failure mode Palmly's deterministic geometry + on-device same-palm seal directly answers, and it is the strongest strategic finding in the verification.**
6. **Paywall placement:** free daily unit forever, gate *depth* contextually. **CHANI verified and promoted to the section's primary proof point** (it is the current #1 US astrology grosser, 4.915★/55,924 on iOS and 4.9 on Play): its own store copy enumerates a free tier (daily horoscopes, moon phases, week ahead, current sky, astro weather, chart overview) and sells **personalisation depth against your own chart** on top of it — transits are framed as "build upon your horoscopes." $11.99/mo, $107.99/yr, soft paywall not shown on entry. ⚠️ *Corrected:* "~$500K/mo" is an aggregator figure naming no vendor, period or platform; qualified estimates span $0.4–0.8M/mo (best-attributed: Appfigures ~$800k/mo **iOS-only**, Jul 2025). Treat CHANI's revenue as decoration and its **model** as the load-bearing part. ⚠️ *Corrected:* Umax's "ratings collapse" is **folklore** — it is 4.56★/51,226 today; the paywall-before-result mechanic is real but thinly sourced. Nebula's billing/trust complaints are real, but its rating is **undented at 4.57★/170,481**, so "trust collapse" describes complaint volume, not an outcome.
7. **Pricing.** ⚠️ *Corrected from a directly collected table (US App Store IAP, 2026-07-28):* monthly clusters **$8–15** (TimePassages $7.99, Co-Star $8.99, CHANI $11.99, The Pattern $14.99, Sanctuary $14.99). **Annual is $50–108, not $20–70** (Sanctuary $49.99, Pattern $83.99, CHANI $107.99). The original omitted **weekly**, where the category's volume actually sits (Faladdin $5.99/$9.99; Umax $3.99–9.99; Adapty 2026: weekly now generates 56% of all app revenue). ⚠️ *Corrected:* **"5.4× better to trial" does not exist in any report** — the nearest real figures are Adapty's "weekly converts **1.7–7.4×** better than **annual**" and RevenueCat's unrelated "hard paywalls convert at 5.5× the rate of freemium." The **35%** is real but is weekly **first**-renewal for **Social & Lifestyle specifically** (lowest of all categories) and **rebounds to 78% by the third renewal**; the real indictment is long-horizon — weekly 12-month retention **3.4%** vs monthly 17.5% vs annual 44.1%. Palmly's settled monthly+annual/no-trial stance still matches the trust-preserving pole (CHANI). ⚠️ **New, relevant at H8:** RevenueCat 2026 reports **~72% of annual subscribers now cancel within Year 1** (up from ~56%), 35% of them in month 1 — annual is no longer the safe harbour it was.

**Category failure modes to design against** (verdicts from `06` §3.6): visible content recycling — **verified, The Pattern, and the strongest of the four**, with the sharpening that users punish *paid* repetition hardest; billing opacity — **verified for both Nebula and Hint** (Hint's dominant review theme, a BBB alert, and a 2024 Play listing at 1.1★ with 1,260 of 1,307 ratings at one star), though neither app's store rating shows damage; paywall-before-value — real but thinly sourced for Umax, and its "ratings collapse" is folklore; content bloat off-hook — **real but with no visible business consequence** for Moonly (4.64★, actively shipping), and its reviewers are angrier about monetising each added feature than about the bloat itself (already a spec §8 rule regardless).

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
