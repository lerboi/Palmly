# Audit-5 · 05 — Proven-Loop Adaptation (RF6)

**Date:** 2026-07-28 · **Status:** PLAN — not started
**Supersedes where it conflicts:** `01-RETENTION-STRATEGY.md` §0/§3 framing and `02-UI-UX-SPEC.md` §3
hierarchy. Everything else in 01–03 stands. `04-TASK-MATRIX.md` (RF0–RF5) is COMPLETE and DEPLOYED —
this ledger adapts what shipped, it does not rebuild it.

**Read this first if you are starting from a cleared context.** §6 tells you exactly what already
exists on disk and on staging; §7 has the commands and the traps. Do not re-derive the codebase.

## 🔄 STATE — update this block on every run

| Field | Value |
|---|---|
| Current phase | Burst 2 in progress. **RF6.T1 + T2 COMPLETE.** T3 next. |
| Next task | **RF6.T3** (promote the seal to the screen's backbone). |
| Blocked on | Nothing. ⚠️ Owner deploy gate: `pulse-generate` still runs **v1** on staging — v2 needs a redeploy to take effect. |
| Last run | 2026-07-28 — RF6.T2 merged daily card |
| Notes for next run | **Read `06-MARKET-VERIFICATION.md` §4 first.** RF6.T6 refuted the argument §0 was built on: Hint is delisted, its $14M was a 2019 US astrology estimate, and it never evaluated daily palm content. The whitespace claim is also false — `Solma` (iOS 6760654131) ships our exact architecture today with zero traction. §0 has been rewritten; 01 §0/§2 corrected in place (7 corrections, `06` §5). **The reframe still holds, but T2 must now be justified by the honesty argument (§1) + Audit-4's one-hero rule, NOT by "Hint chose the almanac."** T1 is strengthened (Pattern recycling is the best-evidenced claim in the set). **T3 is upgraded to the strongest task** — argue it from the non-determinism failure mode (`06` §2.5), not from "no competitor precedent". **T4 must be retuned to 2 freezes per rolling 7** (see its task note). RF6.G's kill rule is now more valuable, not less. |

**Execution protocol (inlined so you need not chase it through three files).** Work the first
unchecked box in document order; `∥` tasks may be taken out of order. Run the task's **Verify**
literally, and only if it passes: tick the box with `✅ YYYY-MM-DD`, update this STATE block, and
commit `RF6.T# <short description>`. On failure, try up to three distinct approaches, then mark
`[!]`, write what you tried under the task, set `Blocked on`, and stop. **Never tick a box whose
Verify did not pass** — a falsely-green ledger is worse than a stalled one. Standing repo rules
(`CLAUDE.md`, `Planning/MVP_Buildplan.md` §Execution Protocol) still apply: new migration per schema
change, expand-contract only, versioned artifacts bump rather than mutate, secrets never committed.

**Git:** the RF0–RF5 work is committed on branch `audit5-retention-features` (2 commits, not
pushed). Continue on that branch — do not branch again, and do not rebase onto `main`.

---

## §0 Why this ledger exists

RF0–RF5 shipped a complete daily loop. Two facts surfaced afterwards that change what it should be:

**1. The daily-content premise is the unproven half — but not for the reason first written here.**

> ⚠️ **Revised 2026-07-28 after RF6.T6.** The original version of this point read: "`Hint` — the
> category's top palmistry earner (~$14M/yr) — uses the palm scan as an acquisition hook and retains
> users on generic astrology … a well-funded competitor in this exact niche evaluated the idea and
> chose the almanac instead." **That inference is refuted.** See `06-MARKET-VERIFICATION.md` §2.

What survives, with sources:

- **Hint does retain on generic astrology, not palm content** — VERIFIED across 2019→2026 (store
  snapshots, its 2026 help centre, two independent hands-on reviews). `06` §2.3.
- **Everything else about Hint collapses.** The ~$14M is a Sensor Tower estimate for **calendar 2019,
  US only, gross**, from a ranking of **astrology** apps, published under the app's old name; its own
  later estimates fall to "< 5k downloads"; and **Hint is delisted from both app stores** (verified,
  21 Apple storefronts + both Play packages). It is a paid web funnel with a BBB billing alert whose
  dominant review theme is unauthorised charges. `06` §2.1–2.2.
- **Therefore the "competitor evaluated and rejected it" reading is not available.** There is no
  evidence Hint evaluated daily palm content, and it never built a retention loop for anything.
- **The whitespace claim is also false, in the other direction.** Daily content from a stored palm
  scan **has shipped**: `Solma: Palm Reader & AI` (iOS 6760654131, live 2026-03-20, subtitle "Daily
  Palm Reading & Fortune", Gemini + stored palm + a shipped Today tab) is our architecture four months
  ahead — with **zero ratings in 15 storefronts**. A `$12.99/mo "Daily Palm Insight"` SKU shipped in
  2021 and was abandoned. `06` §2.4.

**The honest premise, stated as the assumption it is:** daily palm content is neither whitespace nor a
proven loser. Several have shipped it, none at scale, **and nobody has produced evidence either way**.
We are running an untested experiment, which is exactly why RF6.G's kill criterion earns its place.

**2. The prose repetition the research warned about is already present in our own output.** From the
live `eval/rf.ts --live --full` run on a Fire Goat day:

> heart — "…glows with extra warmth under the Fire Goat's gentle, flickering light."
> hand_shape — "…finds a new, radiant clarity under the warmth of this Fire Goat day."
> proportion — "…find a new, radiant harmony under this Fire Goat day."
> ears — "…catch the subtle rhythms of this Fire Goat day with grace and clarity."

And on the Water Tiger day now live on staging, heart/head/life/fate all "flow with the deep,
intuitive currents of this Water Tiger day."

Same-day sameness is invisible (the reader sees one). The damage is **across days**: one sentence
skeleton with the nouns swapped. That is precisely the Pattern/Nebula failure 01 §9 names as the
category killer, and the v1 prompt walks into it by making the day-pillar the subject of every
sentence.

**What is NOT in doubt.** The habit machinery is proven and already built: triggered daily push
(Co-Star; the 3.4× benchmark is Batch's and applies to *triggered* sends, which ours is), streaks
(Duolingo), one-per-day scarcity (tarot / Faladdin's 24h credits, verified from their own FAQ),
free-daily-unit with contextual depth gating (**CHANI — verified, and now the section's proof point:
current #1 US astrology grosser, 4.9★ both stores**), dated cycles from a static input (The Pattern).
None of it depends on palmistry being daily. Keep all of it. `06` §3.

**3. A third fact the research surfaced, which changes what the seal is for.** In apps built on a
*scan*, the review corpora do not punish repetition — they punish **non-determinism and fake
measurement**: *"I scanned my dog's paws and it gave a reading"*, *"7 readings back to back, 7
different results"*, *"it gave me and my boyfriend the exact same aura."* Palmly's deterministic
geometry and free on-device same-palm re-check answer that failure mode directly. **RF6.T3 is the
best-evidenced task in this ledger, not the most speculative one** — §4 undersells it. `06` §2.5.

---

## §1 The pivot, in one paragraph

**Stop claiming the palm changed. Put the daily variance on the thing that genuinely varies — the
almanac — and make the palm the LENS it is read through.** The generated content already has this
shape (`essence` = feature × day-pillar); RF2 simply split it across two competing cards and framed
the palm as the daily variable. Merge them into one unit whose honest sentence is *"today, through
your heart line"* rather than *"your heart line says today."* This is the proven pattern for a static
input — re-surface what the user already owns through a rotating lens (Wrapped, Photos Memories,
Strava's "on this day") — and it costs mostly copy and one card merge, not architecture.

---

## §2 Keep / change / cut

| Thing | Verdict | Why |
|---|---|---|
| `pulse_templates`, `pulse-generate`, nightly cron | **Keep** | The content shape is right; only the prompt's framing is wrong. |
| Feature rotation (per-cycle permutation) | **Keep** | This IS the rotating lens. It is the load-bearing mechanic now, not a garnish. |
| `record_daily_open`, server streaks, week strip | **Keep** | Proven mechanic, correctly built. |
| Seal the day (on-device same-palm) | **Keep + promote** | The only un-copyable thing here. §4. |
| Line Cycles (chapters) | **Keep** | The Pattern's proven trick, and ours are personal. |
| `pulse-fanout` morning push | **Keep** | Proven. Copy changes with the reframe (RF6.T2). |
| **Two competing cards on Today** | **CHANGE — merge** | One hero. The almanac carries "today", the feature carries "you". |
| **"Your heart line favors patience today"** framing | **CHANGE** | Implies the palm changed. Invites the obvious objection. |
| **v1 prompt (pillar is the sentence subject)** | **CHANGE — v2** | Evidenced repetition defect. |
| Streak insurance | **ADD** | Deferred at RF0. ⚠️ The "+48%" is Trophy's cross-app observational data, not Duolingo's; Duolingo's own finding is "two freezes beat one, three no better" — retune to 2 per rolling 7 (T4). |
| Weekly recap | **ADD** | The Wrapped-shaped re-surfacing. §4. |
| Face features in the daily pool | **HOLD, revisit at RF6.G** | Muddies "your palm" as the identity. Cheap to drop later; do not churn now. |

Nothing is deleted. This is a reframe plus two additions.

---

## §3 Tasks

Same protocol as `04-TASK-MATRIX.md`: first unchecked box in document order, Verify must pass before
`[x]`, one commit per task `RF6.T# <desc>`.

**Sequencing — this ledger is run in BURSTS, and the burst overrides document order.** The prompts
for each are committed beside this file (`Prompt.txt` is the index).

| Burst | Tasks | Mode | Why that mode |
|---|---|---|---|
| 1 | **RF6.T6** | ultracode (multi-agent) | Genuine fan-out research across independent sources, and it is the one task that can invalidate this whole ledger. Run it FIRST despite its position below. |
| 2 | **RF6.T1 → T3** | xhigh (single agent) | One editorial decision expressed in four places. Coherence-bound, not compute-bound — splitting it across agents produces four dialects of the same sentence. |
| 3 | RF6.T4, T7 | xhigh | Independent of the UI path; T4 is a migration + SQL streak walk, T7 is docs. |
| 4 | RF6.T5 | ultracode or xhigh | Largest task, needs a NEW `card-svg` layout variant. Worth exploring several designs if run multi-agent. |

Do not attempt the whole ledger in one session: there is a deploy gate the owner controls, a device
leg that needs their hands, and T5 is a session on its own.

- [x] **RF6.T1** ✅ 2026-07-28 🤖 **Prompt v2 — kill the skeleton.** New `prompts/pulse/v2/system_instruction.md`
  (never edit v1 — versioned artifact rule). Rules to add, stated as hard constraints:
  the **feature is the grammatical subject** of `essence`; the day-pillar's name **may not appear in
  `essence` at all** (it may inform the tone and may appear in `reading`); no two features may share
  an opening construction; ban the crutch verbs the v1 output leaned on
  (`finds/flows/glows/catches … under/with the <pillar>`). Bump `PULSE_PROMPT_VERSION` to
  `'pulse.v2'` in `_shared/pulse-generate.ts`; leave `PULSE_SEED` at 17.
  - Build: also add a **structural-repetition gate** to `eval/rf.ts` — normalize each essence
    (lowercase, strip the feature label), take the first 4 tokens and the main verb, and FAIL if
    more than 3 of 15 collide, or if any essence contains the pillar or animal name.
  - Verify: `deno run … eval/rf.ts --live --full` → 15 essences, gate passes, and read them: they
    must sound like 15 different sentences. `node prompts/build-prompts.mjs` then `--check` clean.
    Deno suite green. ✅ 15/15 · gate 0/15 colliding · `PROMPTS_OK` · Deno **304 passed** (+5).
  - **What the plan did not say, and what it cost.** Three plumbing hard-points hardcoded `v1`:
    `prompts/build-prompts.mjs` (its walk, so `v2/` generated NOTHING while `--check` stayed green —
    a silent no-op with every test passing), `pulse-generate/index.ts`'s import, and `eval/rf.ts`.
    The build script now walks `prompts/*/v*/` and fails loudly if the walk matches nothing.
  - **The real finding: a prompt rule cannot fix this, because the calls are blind.** The 15 features
    are 15 INDEPENDENT calls sharing one prompt and one pinned seed, so "no two features may share an
    opening construction" is not a rule the model is able to obey. Told to vary, it simply picked a
    *new* skeleton: v2 draft 1 produced 5× `prefers the quiet X over Y` and 5× `holds its X while the
    air grows restless`. **The caller now assigns the construction**: `PULSE_SHAPES` (15 shapes) +
    `PULSE_STANCES` (4), permuted per date in `pulseComposition()` and passed in the payload, so every
    feature on a day gets a different frame *by construction* and no feature wears one as a habit.
    Asserted, not hoped: `pulseComposition: every feature gets a DIFFERENT shape on the same day`.
  - **Rule zero is enforced in the generator, not only in the eval.** A prompt rule with no
    enforcement leaks — v2's first live run put "this Fire day" into 1 of 15. `essenceNamesDay()`
    now rejects it in `generatePulse` (`failureReason: 'essence_names_day'`), and the eval imports
    that same function so the gate and production cannot drift into two rules. Element adjective
    forms are irregular (`fire`→`fiery`, `metal`→`metallic`), so they are spelled out rather than
    suffix-guessed.
  - **The gate's teeth are proven independently of the mock.** `selfTest()` feeds the gate the four
    real v1 essences quoted in §0 and asserts it FAILS. Without it the gate is only ever exercised by
    a mock this same file wrote.
  - ⚠️ **Operational risk for whoever deploys this.** A content rejection loses that feature for the
    whole day (the reader draws an error card). Seed is pinned, so a deterministic rejection would
    fail the same feature every night. Two were hit while iterating: a 90-char overflow on
    `consequence`, and `content_safety \binvest in\b` on an innocuous "invest in yourself" — the
    banned-claims filter is a blunt string match. Both are now routed around in the prompt by name.
    The idempotent re-run / `force` is the operational answer, same as for `essence_generic`.
  - ⚠️ **Not deployed.** `pulse-generate` on staging still runs v1 until the owner redeploys. The
    version stamp and the import moved together on purpose — a function that stamps `pulse.v2` while
    sending v1's text would be worse than one that is simply behind.
  - **Residual, for a later pass (diction, not skeleton):** "quiet" appeared 4× and "room" 3× in the
    accepted run. Structural repetition is solved; adjective ruts are not, and they are cheap to
    tune in the prompt whenever the owner wants.

- [x] **RF6.T2** ✅ 2026-07-28 🤖 **Merge the two cards into one daily unit.** Today gets ONE hero: the almanac's
  daily tone, read through today's feature, over the reader's lit diagram. The `FortuneCard`
  premium unfold (do/avoid, lucky trio) becomes the merged card's premium section rather than a
  second card. Free state keeps exactly one lock line.
  - Copy reframe (this is the point of the task, not a side effect):
    eyebrow `TODAY · THROUGH YOUR {FEATURE}`; the lock line and CTA lose "today's reading of your
    {feature}" in favour of the day's reading; push copy becomes
    *"Today, read through your {feature}"* — it must stop implying the line itself changed.
  - **The merged card's contract, so this is not re-invented:** `PulseCard` absorbs the almanac and
    becomes the only hero. Order top→bottom — eyebrow `TODAY · THROUGH YOUR {FEATURE}`; the lit
    diagram; the almanac's `overall` as the serif essence (it is the day's voice, and the day is now
    the subject); the pulse `essence` as the personal line beneath it; `ChapterChip`. Premium then
    unfolds ONE column: pulse `reading` → career/love/wealth/watch → the almanac's do/avoid + lucky
    trio → "Ask about today". Free gets exactly ONE lock line covering both halves, then one tonal
    CTA (`trigger=pulse_full`). `FortuneCard` is NOT deleted — it keeps its props and its own
    `fortune_full` trigger for `/dev/fortune-*` fixtures and as the RF6.G retreat path; it simply
    stops being rendered on Today.
  - `homeState()` still gates on the FORTUNE (loading/error/firstRun) — the merged card needs both
    halves, so it renders only when the fortune resolved AND `usePulse` is ready; if the pulse errors
    but the fortune is fine, show the almanac-only card rather than the error card (a degraded day is
    still a day).
  - Files: `features/pulse/PulseCard.tsx`, `features/fortune/FortuneCard.tsx`,
    `features/fortune/FortuneHome.tsx` (`pulseSlot` collapses), `app/(home)/fortune.tsx`,
    `_shared/notif-templates.ts` (`daily_pulse`).
  - Verify: `/dev/pulse-free`, `/dev/pulse-premium` re-shot light+dark+320pt; exactly ONE `md` card
    on Today; accent litmus ≤2 non-interactive; the copy gate
    (`features/pulse/__tests__/copyGate.test.ts`) still passes; jest + tsc + lint green.
    ✅ Shot to `docs/checkpoints/audit5/rf6/{light,dark}` at 390 and 320. Accent litmus: **1**
    non-interactive on the card (the lit line) + the week strip's today ring = 2. jest **243** (+4),
    tsc + lint clean, copy gate green, Deno **304**.
  - **The decision 05 did not make: what the card shows BEFORE the reveal.** The contract gives the
    revealed order only. Ruling: **the almanac's `overall` renders immediately, ungated.** It was
    never behind a gesture, and hiding it to feed the hold would have taken away content the reader
    already had — the reveal would be buying back what we just confiscated. What the hold gates is
    the reading *through their own feature*, which is the honest scarce half. This also matches the
    one verified competitor pattern in the file: CHANI's free daily unit forever, depth gated
    contextually (`06` §3.1).
  - **One hero is now a tested resolver, not a JSX condition.** `todayCards()` in
    `features/fortune/fortune.ts`, same idiom as `homeState`, asserted for "never both" across all
    four input combinations. The standalone `FortuneCard` renders only when the merged card is
    absent — which is also the RF6.G retreat path and the only remaining route to `fortune_full`.
  - **`PulseCardError` (02 §4's S5) was DELETED, not kept.** With the degraded day rendering the
    almanac alone, its only remaining trigger was the almanac itself failing — a state `FortuneHome`
    already owns, with the same copy. Keeping a second identical error card would have been the
    exact drift P5 forbids. `/dev/pulse-error` now shows the two states that can actually happen.
  - **Content deliberately dropped in the merge:** the almanac's own career/love/wealth. The
    personal ones say the same three things through the reader's own feature, and printing both
    would be the bloat Audit-4 spent a phase removing. Do/avoid + lucky trio are shared with
    `FortuneCard` via exported `AlmanacDoAvoid` / `AlmanacLucky` rather than reimplemented.
  - **A fixture was demonstrating the banned pattern.** `PREVIEW_PULSE.essence` was still
    "Your heart line favors patience on a Fire Rooster day." — the v1 construction RF6.T1 had just
    killed, rendering on `/dev` as the reference card. Swapped for a real v2 line from the live run.
    Caught by looking at the screenshot, not by any gate.
  - ⚠️ **For RF6.T7 (burst 3):** `fortune_full` is now unreachable from Today, so the planned
    "`pulse_full` vs `fortune_full` conversion" metric is degenerate. Compare against the pre-merge
    baseline instead, or drop the split.
  - ⚠️ **Known gap, correctly deferred to T4:** a pulse-error day cannot be sealed (there is no
    personal line to reveal), so the run breaks. That is already true today and is not made worse
    here — streak insurance is the right fix, not a T2 invention.

- [ ] **RF6.T3** 🤖 **Promote the seal to the screen's backbone.** The measured claim should not be
  reachable only from the unrevealed card. Put `Day {n} · your lines hold` in the Today header area
  beside the week strip, present whether or not the day is revealed, tapping into the ritual.
  Keep the S1 link and the RF5 header long-press.
  - Verify: visible in all four card states in `/dev`; a11y label reads the full claim; screenshots
    archived; jest green.

- [ ] **RF6.T4** 🤖 **Streak insurance.** One "quiet day" per rolling 7 does not break a run
  (Duolingo's mechanic, 01 §2.4 / §3). Implement in the streak walk inside `record_daily_open` as a
  NEW migration (expand-contract; do not edit `…0036`). In-voice copy: *"the almanac counts rest
  days too."* Surface the used/available freeze in the week strip.
  - ⚠️ **Retune after RF6.T6.** The "+48%" this was sized against is **Trophy's cross-app
    observational data, not Duolingo's** (`06` §3.4). Duolingo's own on-record finding is ordinal:
    **"two streak freezes worked better than one, but three were no better than two"** (Shuttleworth,
    Group PM Retention, Dec 2024). **One per rolling 7 is below the evidenced optimum** — implement
    the allowance as a named constant, default it to **2 per rolling 7**, and make the window/count
    tunable rather than hard-coded.
  - Verify: extend `supabase/tests/pulse_schema.test.mjs` — a single gap inside the window keeps the
    run; two gaps break it; the freeze is consumed at most once per 7 days; existing streak tests
    still pass. Node suite green vs deployed staging.

- [ ] **RF6.T5** 🤖 **Weekly recap — "your week in lines."** A Sunday card + shareable image
  re-surfacing the seven features the reader was shown, their seal count, and the chapter they are
  in. Free. **Scope warning — this is the largest task here, not a small one.**
  `share_cards.source_type` already allows `'fortune'` (migration 0001), but `_shared/card-svg.ts`
  only knows two layout variants, `feed_4x5` and `story_9x16`; there is **no recap layout**. This
  task must add a third variant to `card-svg.ts` and its render test. Budget accordingly, or split
  the in-app card (cheap) from the shareable image (not cheap) and ship the in-app half first.
  - Verify: `/dev/recap-week` fixture; the new variant renders under the 450KB share budget (extend
    the existing `card-render/render.test.ts`, which asserts that budget for all classes); Deno
    suite green; share-close fires `post_share` (RF0.T2 path); screenshots archived.

- [x] **RF6.T6** ✅ 2026-07-28 🤖 ∥ **Verify the market claims this plan leans on.** §0's Hint/CHANI/Faladdin
  figures come from 01 §2, which cites a session record we no longer have. Confirm or correct: what
  Hint actually does post-scan; whether anyone has since shipped daily content from a real biometric
  scan; current category pricing. Write findings into a new `06-MARKET-VERIFICATION.md` and correct
  01 §2 in place if wrong.
  - Verify: every load-bearing claim in §0 either has a citation or is restated as an assumption. ✅
  - **Outcome:** `06-MARKET-VERIFICATION.md` written (22 claims, 13-agent sweep with adversarial
    verification). **The §0 Hint argument was refuted and has been rewritten; the whitespace claim was
    also refuted (`Solma`, iOS 6760654131, ships our architecture today with zero traction).** 01 §0
    and §2 corrected in place — 7 numbered corrections, listed in `06` §5. **The reframe survives; its
    central argument did not and has been replaced.** Read `06` §4 before executing T1–T5.

- [ ] **RF6.T7** 🤖 ∥ **Measurement + the kill criterion.** Dashboard notes in `docs/ANALYTICS.md`
  for: reveal rate (`pulse_revealed` ÷ DAU), D1/D7/D30, seal method split, push→open by type,
  `pulse_full` vs `fortune_full` conversion. State the decision rule below as a written commitment.
  - Verify: every metric resolves against events that already exist in `AnalyticsEventMap`.

- [ ] **RF6.G** 🚦 Two weeks of data. **Decision rule:** if reveal rate is **< 25% of DAU** at week
  two, the daily reading is not carrying the loop — cut Today's Line back to a plain almanac card
  and keep the seal + streak + recap as the daily unit. The generation cost is DAU-independent, so
  running the experiment is cheap; the point of writing the rule down now is to make the retreat
  cheap too.

---

## §4 The twist

**The receipt.** Every horoscope app asserts. Palmly can *verify* — the seal re-proves, on-device
and for free, that this is the same hand it read. "Day 47 of your lines holding" is a **measured**
sentence, and no competitor can produce it because none of them has an enrolled biometric they can
re-check without a server.

That is the differentiator, and RF6.T3/T4/T5 are all about making it the spine rather than a
flourish hanging off an unrevealed card:

- **T3** puts the measured claim on screen every day, unconditionally.
- **T4** protects the run, so the number keeps growing (proven mechanic).
- **T5** turns the number into something shareable — which is also the acquisition loop.

Note honestly: this is the one part of the plan with **no competitor precedent at all**, because
nobody else could build it. Proven mechanics wrap it; the twist itself is a genuine bet.

---

## §5 Guardrails — do NOT do these

- **Do not delete RF0–RF5 work.** This is a reframe. The schema, generation, fan-out, ritual and
  chapters all stay.
- **Do not edit `prompts/pulse/v1/` or `kb/cycles/v1/`.** Versioned artifacts — bump, never mutate
  (Backend §6.6.7).
- **Do not edit an applied migration.** `…0035`–`…0038` are deployed. New behaviour = new file.
- **Do not add a second daily push.** One morning send, existing caps.
- **Do not let the reframe leak pseudo-measurement.** The seal measures hand *shape*. It does not
  measure mood, energy or health. `copyGate.test.ts` enforces this — keep it passing.
- **Do not re-theme.** Audit-4 `Design-Direction.md` still governs.

---

## §6 What already exists (read before touching anything)

**Shipped, committed on branch `audit5-retention-features`, deployed to staging.**

Backend — migrations `20260726000035`–`38` applied; `pulse-generate` + `pulse-fanout` deployed;
both crons active (`10 3 * * *`, `*/15 * * * *`). Live-verified: a full night generates 15/15, the
re-run skips 15, unauthenticated fan-out returns 403.

| Path | What it is |
|---|---|
| `supabase/functions/_shared/pulse.ts` | Feature selection (per-cycle permutation) + `chapterFor`. Mirrored by the client. |
| `supabase/functions/_shared/pulse.vectors.json` | Shared vectors — **both** test suites assert against this. Regenerating it is an algorithm change. |
| `supabase/functions/_shared/pulse-generate.ts` | Generation core + `FEATURE_LABEL` + `essenceNamesFeature`. |
| `supabase/functions/_shared/pulse-fanout.ts` | Morning window / skip rules / winback predicate. |
| `supabase/functions/_shared/cycles.ts` + `kb/cycles/v1/chapters.json` | 8 archetypes × 15 features = 120 chapter readings. |
| `app/src/features/pulse/pulseMath.ts` | Byte-identical client mirror of `_shared/pulse.ts`. Change one → change both. |
| `app/src/features/pulse/*` | `PulseCard`, `PulseSeal`, `ChapterChip/Sheet`, `BoundaryBanner`, `MilestoneMoment`, `streak.ts`. |
| `app/src/features/checkin/*` | The ritual. `noCapturePath.test.ts` enforces no capture/upload. |
| `app/src/lib/dailyLedger.ts` | Server ledger + offline cache + one-time local-history replay. |
| `kb/build-cycles.mjs` | Generates the app's copy of the chapter catalog (Metro cannot read `kb/`). |

**Device-verified on the S20+ (2026-07-27):** the card renders the reader's own traced lines,
hold-to-reveal produces real content, the chapter dates from their own geometry, the streak reads
server truth, the ledger row matches the card, and the ritual reaches a live camera.

**Not done:** the live palm MATCH (needs a hand in front of the camera), and RF5.T4 (purchase path,
H8-gated).

**Operational state you are inheriting — check before shipping anything user-visible:**

- `PULSE_ENABLED = true` in `app/src/lib/capabilities.ts`. Today's Line is ON.
- `PULSE_FANOUT_ALLOWLIST` is **unset** on the deployed function, which means the 08:30 fan-out will
  push to **every** user who has a push token the moment one registers. Staging currently has zero
  push devices, so nothing has gone out. Set it to internal user ids before any real send, or
  confirm with the owner that a broad send is intended.
- The next free migration number is **`20260728000039`**. `…0035`–`…0038` are applied to staging.
- Deploy commands are in §7; both Edge Functions are already deployed and both crons are active, so
  a code change to `pulse-generate` or `pulse-fanout` needs a re-deploy to take effect.

---

## §7 How to verify (commands + traps)

```
app/          npm run typecheck && npm run lint && npm run test:ci     # 239 tests
supabase/functions/   deno test --allow-read --allow-env               # 299 tests
supabase/tests/       node --test --test-concurrency=1                 # 159, vs DEPLOYED staging
prompts/      node prompts/build-prompts.mjs --check
kb/           node kb/build-cycles.mjs --check
eval/         deno run --allow-read --allow-env --allow-net --config supabase/functions/deno.json eval/rf.ts --live --full
screenshots   cd app && EXPO_PUBLIC_FORCE_SCHEME=light npx expo export --platform web --clear
              node scripts/shoot.mjs ../docs/checkpoints/audit6/light "dev/pulse-free:390x844" …
device        adb at C:/Users/leheh/AppData/Local/Android/Sdk/platform-tools/adb.exe ; serial R58N91Q16BL
```

**Traps that cost time last run — all real, all hit:**

1. **A blank web screenshot means a JS throw, not a layout bug.** Probe with headless Chrome and read
   `Runtime.exceptionThrown` before touching CSS. A root-layout throw blanks *every* route.
2. **Platform-split pairs MUST share one file extension.** `foo.ts` + `foo.native.tsx` resolves the
   base on device — Metro walks `sourceExts` and `ts` precedes `tsx`. This silently killed the whole
   ritual. `app/src/__tests__/platformSplit.test.ts` now guards it; keep it passing.
3. **Metro zombies hold port 8081** and answer `/status` while 404-ing the bundle. Check the real
   entry: `curl "localhost:8081/node_modules/expo-router/entry.bundle?platform=android&dev=true"`
   → expect 200 / ~7MB. Kill the listener and restart if not.
4. **The phone's Wi-Fi dead-associates** (DNS fails, ping fails). `adb shell svc wifi disable` then
   `enable`.
5. **The Supabase MCP is read-only.** Schema changes go through a migration file + `db push`. Never
   through the MCP.
6. **Node tests run against DEPLOYED staging**, so a new migration must be pushed before they pass —
   a failure there may mean "not deployed yet", not "broken".
7. **Never assert absolute row counts** in `pgmq.a_*` or `worker_telemetry`; live crons append to
   them. Use deltas.

---

## §8 What this plan is betting, stated plainly

The habit machinery is proven and stays. The reframe (T1/T2) removes a claim the product cannot
support and replaces it with one it can — which is both more honest and the pattern that actually
works for static inputs. The additions (T4/T5) are proven mechanics. The twist (§4) is the one
genuine bet, and it is the only thing here a competitor cannot copy.

If RF6.G fails at 25%, the retreat is small: the almanac becomes the daily card again and the seal
keeps the streak. Nothing built in RF0–RF5 is wasted in that outcome, which is the main reason to
adapt rather than rebuild.
