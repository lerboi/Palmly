# Audit-5 · 06 — Market Verification (RF6.T6)

**Date:** 2026-07-28 · **Status:** COMPLETE · **Task:** RF6.T6 (`05-PROVEN-LOOP-ADAPTATION.md` §3)
**Method:** 13-agent multi-angle sweep, every load-bearing finding handed to an independent adversarial
verifier instructed to refute it. All figures below were fetched live on **2026-07-28** unless dated
otherwise. Raw agent transcripts: session workflow `wf_75b7482a-dfd`.

**Why this file exists.** `01-RETENTION-STRATEGY.md` §2 cites "full sourced report in the session
record." That record is gone. `05` §0 then built a plan-invalidating argument on top of one of those
numbers. This file checks them.

**How to read the verdicts.** VERIFIED = found at a source that actually says it. CORRECTED = the
underlying fact is real but our version of it is wrong in a way that matters. REFUTED = the claim is
false. UNVERIFIABLE = no source exists that I could reach; **do not build on these — restate them as
assumptions or drop them.**

---

## §1 Verdict table

| # | Claim as written in 01/05 | Verdict | Corrected value | Confidence |
|---|---|---|---|---|
| 1a | Hint earns **~$14M/yr** | **CORRECTED** | ~$14M is a **Sensor Tower estimate for calendar 2019, US only, gross consumer spend**, published under the app's then-name *Astrology & Palmistry Coach*. Same app's later estimates: ~$1M/mo (Dec 2020) → $400k/mo (Sep 2022) → today "**< 5k downloads**", no revenue modelled. | high |
| 1b | Hint is the **top-earning palmistry app** | **REFUTED** | The 2019 study ranked the **top-10 US *astrology* apps**. No palmistry-specific revenue ranking exists anywhere. Current US astrology top-grosser is **CHANI**, then Co-Star (Statista, Nov 2025). | high |
| 1c | *(implicit in 1a/1b)* Hint is a live competitor | **REFUTED** | **Hint is DELISTED from both app stores.** Verified across 21 Apple storefronts + both Play packages. The business is now a paid web quiz-funnel at `hint.app`. | high |
| 1d | After the scan, Hint retains on **generic astrology, not palm content** | **VERIFIED** | Holds across 2019→2026. Recurring surface is birth-chart horoscopes; palmistry is sold as a **report**. | high |
| 1e | Hint **never** shipped daily palm content | **VERIFIED** (weakly evidenced) | No daily-palm surface found at any point. But evidence-of-absence is **MODERATE for the 2026 web product, WEAK for the 2019–24 app era** — nobody has seen the in-app surface. | medium |
| 1f | **"A well-funded competitor evaluated daily palm content and chose the almanac"** (05 §0) | **REFUTED** | No evidence Hint ever evaluated it. See §2.3 — this inference is the plan's weakest link. | high |
| 2 | **Nobody has shipped daily content from a real biometric scan** | **REFUTED** | **Solma: Palm Reader & AI** (iOS 6760654131) ships exactly this, live since 2026-03-20. Prior art also exists back to 2021. See §2.4. | high |
| 3a | CHANI ~$500K/mo | **CORRECTED** | No defensible single figure. Estimates span **$0.4M–$0.8M/mo**; the only vendor-attributed one is **Appfigures ~$800k/mo iOS-only** (Jul 2025). $500k comes from an aggregator naming no vendor, period or platform. | medium |
| 3b | CHANI 4.9 stars | **VERIFIED** | iOS **4.915 / 55,924** ratings; Play **4.9 / 4.54K**. Current, both stores. | high |
| 3c | CHANI: free daily + contextual depth gating | **VERIFIED** | Confirmed from CHANI's own store copy on both platforms, and it is **sharper than our claim** — see §3.1. Pricing $11.99/mo, $107.99/yr. | high |
| 4a | Faladdin **~1M readings/day sustained** | **CORRECTED** | Real as a *claim*, but it is **frozen company marketing copy**, unchanged since March 2019 and still in today's store listing while claimed downloads grew 15M→50M. No independent verification exists. | medium |
| 4b | Faladdin: 24h-refresh credits + anticipation | **VERIFIED** | Confirmed verbatim from Faladdin's own FAQ, including the monetised wait. One wording correction in §3.2. | high |
| 4c | *(not in 01)* Faladdin as a clean comp | **NEW — CAUTION** | Founder detained Jul 2025, released under judicial supervision Dec 2025; Turkish prosecutors allege money laundering / qualified fraud **on the fortune-telling revenue model itself**. App still ships under an Estonian publisher. | high |
| 5a | Co-Star: daily push is **the core retention mechanic** | **CORRECTED** | Daily push is its **signature and original distinguishing mechanic** — verified. "*The* core retention mechanic" is **unestablished**: nobody has published a retention number for it, and the social/compatibility graph is independently credited as the viral driver. Cadence is now **2–3/day incl. upsells**. | high |
| 5b | Contextual push **14.4% vs 4.2%, ~3.4×**, per CleverTap/MobiLoud | **CORRECTED** | Numbers are real; **attribution and definition are both wrong**. Source is **Batch**, not CleverTap/MobiLoud. And Batch's "contextual" means **automatically triggered**, not personalised copy. See §3.3 — this correction is *favourable* to us. | high |
| 6a | Duolingo: streak-freeze users hold streaks **~48% longer** | **CORRECTED** | **Not Duolingo's number.** It is **Trophy's** cross-customer platform data (Sep 2025): 17.19 vs 11.62 streak days on apps with/without the feature. Observational, cross-app, **not causal, not Duolingo**. | high |
| 6b | Duolingo **~55% next-day return** | **UNVERIFIABLE — DROP IT** | No Duolingo primary anywhere. Circulating versions contradict each other and measure different things. Use instead: **"7-day-streak learners are 2.4× more likely to return next day"** (Duolingo blog, 2020-11-19). | high |
| 7a | Pricing clusters **$9–15/mo, $20–70/yr** | **CORRECTED** | Monthly is **$8–15** (collected table, §3.5). **Annual is wrong**: $49.99 / $83.99 / $107.99. And the claim omits **weekly**, where the category's volume actually sits. | high |
| 7b | Weekly converts **5.4×** better to trial, renews **~35%** | **CORRECTED** | **"5.4×" does not exist.** Nearest real: Adapty "weekly converts **1.7–7.4×** better than annual." The 35% is real but needs the qualifier we dropped: it is weekly **first**-renewal for **Social & Lifestyle specifically**, and it **rebounds to 78% by the third renewal**. | high |
| 8a | Umax: **ratings collapse** from paywalling pre-result | **SPLIT: CORRECTED + FOLKLORE** | Paywall-before-result: real but thinly sourced. **Ratings collapse: folklore.** Umax is **4.56 / 51,226** on iOS today. No collapse in any source. | medium |
| 8b | Nebula: trust collapse from blurring free/paid | **VERIFIED (consequence overstated)** | Billing/trust complaints are abundant and real. But **the rating is 4.57 / 170,481 and undented** — "trust collapse" describes the complaints, not any observable outcome. | medium |
| 8c | The Pattern / Nebula: **visible content recycling** | **VERIFIED** — best-evidenced of the four | Three verbatim Pattern reviews naming repetition, bundled with paywall resentment; **The Pattern carries 3.96★, the lowest in the entire sample** (peers 4.5–4.9). Nebula half is thin. | high |
| 8d | Moonly: content bloat off-hook | **CORRECTED** | Real as a complaint, **no business consequence visible**: 4.64 / 31,374, shipped v2.8.7 on 2026-07-20. Reviewers are angrier about *monetising* each added feature than about the bloat. | medium |

---

## §2 The load-bearing claims

### 2.1 What Hint actually is (identity, established first because everything turns on it)

One app, four names, now gone from both stores:

- iOS **App ID 1374212456**. Shipped 2018 as **"Astrology & Palmistry Coach"** (subtitle *Daily Horoscope
  & Palm Reader*), renamed **"Hint: Horoscope & Astrology"** around 2020–21. Palm was dropped from the
  subtitle by March 2023.
- Publisher **Ruby Labs ltd.** → **Hint America Inc** (Claymont, DE — registered agent only; BBB lists the
  real HQ as London). Founder Roman Taranov, who **resigned as a director on 2025-02-28**.
- **Delisted.** `itunes.apple.com/lookup?id=1374212456` returns `resultCount 0` in **21 storefronts**
  against a working control (Nebula → 1); `apps.apple.com/.../id1374212456` → 404; both Play packages
  (`hint.horoscope.astrology`, `hint.horoscope.app`) → 404 against working controls; the Ruby Labs
  developer page lists **zero apps**. Two verifiers reproduced this independently.
- The business is now a **paid web quiz-funnel** at `hint.app` — ~11.9M visits/3mo, **66.2% from display
  advertising**, declining ~10% MoM (SimilarWeb, June 2026). No store links on the homepage.

**Consequence:** app-intelligence has been blind to this business since mid-2024, so its true current
scale is genuinely unknown — not zero, but unknown.

### 2.2 The $14M

Real, findable, and seven years stale:

> "Astrology & Palmistry Coach was the highest earner for 2019, generating approximately **$14 million in
> user spending**, which represented 35.3 percent of the top 10's total."
> — Sensor Tower, *U.S. Astrology App Revenue Grew 64.7% to Nearly $40 Million in 2019* (March 2020);
> reported by TechCrunch 2020-03-02.

Qualifiers our doc dropped: **modelled estimate**, **calendar 2019**, **US only**, **gross consumer spend
(pre-store-fee)**, and it ranked **astrology** apps — the study's own title and body say so. Sensor Tower's
own HTML hyperlinks that app name to its `ruby-labs-ltd/1374212456` page, so the identity chain is the
vendor's, not an inference.

The decay, from Sensor Tower's own pages via Wayback and live fetch:

| Period | Estimate | Source |
|---|---|---|
| CY2019 | ~$14M (US, gross) | Sensor Tower blog, Mar 2020 |
| Dec 2020 | ~$1M/mo, 600–700k downloads | Wayback captures 2021-01-26, 2021-02-02 |
| Sep 2022 | $400k/mo, **8k** downloads | Wayback 2022-10-15 |
| 2026-07-28 | **"< 5k downloads"**, no revenue clause | live fetch, iOS *and* Android |

No primary figure exists and probably cannot: **RUBY LABS LTD** (UK 11382334) files *total exemption full
accounts* five years running — small-company regime, **no profit-and-loss account**. The Delaware trading
entities have no public filings.

**The palmistry-niche superlative is false.** Dedicated palm-first apps are commercially trivial: the best
figure found anywhere is **Life Palmistry at $50k/mo**; the entire iOS palm cohort probed (8 apps) reports
"< $5k revenue." A current dedicated palm-app roundup (MysticMag, updated 2026-06-02) doesn't mention Hint
at all. Money in this space sits in **astrology apps that bolt on a palm scan**, not in palmistry.

### 2.3 What Hint does post-scan — and why the 05 §0 inference still fails

**The descriptive claim holds.** Across every era, the recurring surface is astrology and palmistry is a
report:

- **2019** (peak palmistry, app literally named *Astrology & Palmistry Coach*): feature list reads "Daily,
  monthly and yearly horoscopes" … and separately "Palmistry — you will also get a **real-time palm
  reading**." Of five screenshots, one is palm — a *camera capture screen*. The recurring day-tabbed
  surfaces are Horoscope and Biorhythms.
- **2020** (the verifier closed the original researcher's blind spot here, and it went *against* refuting):
  description headlines "Palm Readings … with our unique AI and ML algorithms," yet all four screenshots
  show the recurring surface as a transit-astrology feed ("Moon in Scorpio — Today"), palm again only as a
  "Scanning" viewfinder.
- **2022–24**: tab bar is **Horoscope / Compatibility / You / Guidance** — no palm tab. The daily card reads
  *"Your daily hint: Positive thinking is your greatest asset today—as your emotions (Moon) and your luck
  (Jupiter) are in harmony"* — explicitly planet-derived.
- **2026 live**: `hint.app`'s help centre has **26 articles and zero about palmistry**; the subscription
  gives "a **Personalized feed based on your Natal Chart**" plus "Detailed **Palmistry and Soulmate
  Reports**"; the only cadence article is about horoscopes not updating.
- Independent hands-on: Refinery29 (2022-05-17) and BuzzFeed (2022-05-06) both walk the app and never
  mention palm reading; Good e-Reader (2026-07-06) and AIChief (2026-07-14) both describe palm as a one-time
  detailed report with only daily horoscopes recurring.

**Three corrections to how 05 §0 states it:**

1. **"One-off" is wrong on entitlements.** The archived funnel bundle sold "**Unlimited** palm readings" and
   a "1:1 Personal Palmistry Advisor." Unlimited ≠ daily, but the palm was not a single artifact either.
2. **Palmistry never left the app.** Apple's own `versionHistory` records **v8.4.0 (2023-07-17): "introducing
   the new Palmistry reading Feature."** Any argument built on counting the word "palm" in store descriptions
   is leaky — it missed a shipped feature.
3. **The evidence of absence is weaker than the confident phrasing implies.** Nobody in this sweep has run
   the 2019–24 app. Changelog coverage is a ~7-release sample; APKPure/APKCombo/APKFab all 403/410. Two
   hands-on YouTube teardowns are confirmed to exist but their transcripts are unobtainable.

**And now the part that matters most.** 05 §0 argues:

> "the equally available reading is that a well-funded competitor in this exact niche evaluated the idea and
> chose the almanac instead."

**This does not survive.** There is no evidence Hint ever *evaluated* daily palm content — absence of a
feature is not evidence of a deliberation. Worse, Hint is not a competitor whose product judgment should
carry weight:

- It is **delisted from both stores**.
- It never built a retention loop for *anything*. Its model is paid acquisition (66% display traffic) into a
  $1-trial → $29.99/mo auto-renewal, sold as a "professional **psychic consultation service**" with the
  astrology content legally framed as "complimentary materials."
- Its dominant review theme is unauthorised billing. Trustpilot's own AI summary over 19,111 reviews:
  "Many reported unexpected recurring charges, often stating they did not knowingly sign up." A BBB alert is
  on file. Its 2024 Play listing sat at **1.1★, with 1,260 of 1,307 ratings at one star**.
- Its Trustpilot 4.1 cannot be read as satisfaction: the live site unlocks the full palm reading in exchange
  for leaving a review ("It's yours, completely for free. Help others discover Hint too. Leave a review.").

**A company that monetises confusion and has since been delisted did not run the experiment we're citing it
for.** Whatever the case against daily palm content is, this is not it.

### 2.4 Has anyone shipped daily content from a real biometric scan? — **Yes. REFUTED.**

**Solma: Palm Reader & AI** — iOS **6760654131**, developer **Nixes EOOD**, bundle `io.nixes.Linea`, first
released **2026-03-20**, v1.0.3 (2026-07-01). App Store subtitle: **"Daily Palm Reading & Fortune."** Its own
store copy:

> "Solma scans your palm and gives you a real reading… **Then it remembers. Every morning, you get a new
> insight written just for you.** It's built from your palm, your birth chart, the current moon phase, and
> whatever matters most to you right now — love, career, growth, health, or finances. **Each day's reading
> picks up where yesterday left off**, like a letter from someone who knows you."

Its privacy policy (effective 2026-03-14) confirms the mechanism: "Solma uses **Google's Gemini AI** to
analyze your palm photo and generate personalized readings and **daily insights**"; "Palm images are …
**stored** to display your profile"; "**Daily insights** older than 90 days may be automatically removed."

This is not store-copy theatre. The verifier pulled the actual App Store screenshot asset and read a shipped
**"Today" tab**: *Today / Friday, March 13*, a *"Waxing Gibbous · Day 23"* moon-phase-plus-day-counter, a
**CAREER** focus pill, a *TODAY'S READING* body referencing **"your Earth hand steadiness"**, and a four-tab
nav **Today | Journal | Palm | Settings** with Today as home. Release notes: "*A more personal daily insight,
with a gentle morning reminder.*"

**That is Palmly's architecture — one stored palm scan, Gemini, a daily insight through a rotating lens, a
journal, a day counter — shipped four months ahead of us.**

Its traction: **zero ratings in all 15 storefronts checked.** Nixes is a small generalist studio (its other
apps are a photo-to-art filter, a motion image editor, and an AI rewriter); Solma is 8.4 MB and three
versions old. So it is architectural precedent, not a strategic threat — and critically, **not evidence the
loop fails either.** An unmarketed side project from a filter-app studio tells you nothing about demand.

Older and more interesting prior art:

- **"Daily Palm Insight"** — a real auto-renewable SKU at **$12.99/month** inside *Palm Reader: Palmistry
  Fortune* (iOS 1237535080, 4.47★/6,477). **Abandoned since 2021-09-07.** A 3★ reviewer describes what
  shipped: *"It is a one page app of palm reading, a daily quote in palm 'revelations,' and readings history.
  That's it. It isn't worth 11.99."* — i.e. someone monetised this exact loop, thinly, and stopped.
- **Grupo Precedo's *Palmistry - Palm Reading*** (Play, 100K+ installs, 4.0★/1.77K) ships Palmly's *product
  shape* — "**Daily Palmistry** … we also track the daily changes in your palm lines … your daily levels of
  love, health, wealth, and work" — from a **questionnaire**, and brags in the listing: "**without the need
  for cameras or unreliable hand scanners.**"
- Several large Play apps *claim* daily-from-palm (HoangSi's *Palmistry - AI Palm Reader*, 10M+ downloads,
  "Daily Tip … based on your hand analysis"; *Palm Reader: See Your Future*, 500K+). **Treat these as
  unverified.** Store copy in this category is demonstrably unreliable — **Astroline** claims "receive palm
  reading predictions every day" while its own help centre *and* its own marketing site describe only
  Scan → Read → Rescan. And across **72 Play reviews** extracted from those four apps, the daily-palm feature
  is mentioned **zero times**.
- Adjacent categories are **re-scan** loops, not stored-scan loops: aura apps ("come back daily for fresh
  scans"), skin scoring (YouCam, TroveSkin — new selfie each time), Oura/WHOOP/Amazfit readiness (fresh
  overnight measurement against a rolling personal baseline). The one exception, *Auraly: Daily Aura*, has no
  camera at all — it does deterministically-seeded daily content, which is Palmly's mechanic without the
  biometric.

**The honest restatement:** not "nobody has done this," but **"several have shipped it, none at scale, and
none has produced any evidence that it retains."** It is untested, not unattempted.

### 2.5 The failure mode the biometric corpus actually punishes — and it isn't repetition

This is the most useful thing the sweep turned up, and it is not in 01 or 05.

For *astrology* apps, the killer is visible recycling — **The Pattern** proves it (§3.6). But for apps built
on a **scan**, the review corpora punish something else entirely: **non-determinism and fake measurement.**

> "I scanned my dog's paws and it gave a reading. It just copies and pastes reading for people."
> "Took a picture of a piece of paper and it gave me the same exact reaction as my palms!!!!"
> "I took a picture of darkness and they gave me a reading."
> "Me and my daughter compared the results and we got the same exact reading."
> — *Palm Reader: Palmistry Fortune*, App Store reviews

> "It's just a random number generator essentially. I did 7 readings back to back and got an equal number of
> different results." · "it gave me and my boyfriend the exact same aura. It's not real."
> — *Aura & Energy Detector with AI* (4.29★/537), App Store reviews

Two verifiers independently read **100 recent reviews** across those aura corpora and found **no complaints
about the daily content being repetitive** — every negative is about the scan being random or shared.

**Palmly's deterministic geometry plus the on-device same-palm seal is a direct answer to the dominant
failure mode of this specific niche.** 05 §4 calls the seal "the one part of the plan with no competitor
precedent at all … a genuine bet." The evidence says it is better than a bet: it is the antidote to the thing
that actually kills scan-based apps. **RF6.T3 should be argued on those grounds.**

---

## §3 Secondary claims

### 3.1 CHANI — VERIFIED, and it should replace Hint as our proof point

Both stores enumerate the split in CHANI's own words. **Free:** birth chart overview, **daily horoscopes**
("that outline how the astrology of the day will impact you"), moon phases, the week ahead, current sky,
astro weather. **Premium:** transits ("a daily, **hyper-personalized** look at how the planets in the sky are
interacting with **your unique birth chart** … build upon your horoscopes"), chart readings, year ahead,
meditations. Pricing **$11.99/mo, $107.99/yr**. Teardowns confirm a soft paywall not shown on entry.

The structural point is sharper than 01 §2.6 states: **the free daily unit is sign-level; what is sold is
personalisation depth against your own chart, framed as building on top of the free daily rather than
replacing it.** CHANI also runs a free daily *and* a paid daily (featured meditation) in parallel.

That is almost exactly Palmly's `06` free/premium split — and CHANI is the **current #1 US astrology
grosser** at 4.9★ on both stores. **The trust-preserving pole is winning the category.**

### 3.2 Faladdin — mechanics VERIFIED, volume CORRECTED, business status is a caution

From Faladdin's own FAQ, verbatim: "**Every day you get one free credit for each kind of fortune reading**";
the credit reloads **24 hours** after a reading; **Premium's upsell is literally a shorter timer** —
"refreshed every **8 hours** instead of 24, and they gain 1 extra credit everyday." The wait is directly
monetised: "if you want to view your fortune reading quickly without having to wait, you can **speed up your
reading by paying 0.5 credits**," or watch an ad. There is also an unread-inbox block that prevents
submitting a new request until you open the pending one.

*Wording correction:* the string **"your reading is being prepared" is not confirmed** — Faladdin's own
phrasing is "when your fortune reading is **ready**." Zero hits for `prepar*` in the FAQ or review corpus.

**1M readings/day** is company marketing copy, repeated unchanged in store listings since **March 2019**
through 2020, 2025 and today — while claimed downloads went 15M → 50M. Turkish Minute (2025-07-16)
explicitly attributes it to "store descriptions," not measurement. Rest of World (2020) has the only
structured version (700k TR / 200k AR / 100k EN). No independent verification exists.

**New and material:** founder Sertaç Taşdelen was **detained in July 2025** — assets and all Arteria Yazılım
equity seized on a MASAK report; released under judicial supervision in December 2025 with prosecution
continuing on money-laundering charges, 3–7 years plus fines sought; Turkey's Commerce Ministry issued an
**advertising suspension against the platforms in 2024**. Prosecutors' theory targets the fortune-telling
revenue model itself. The app ships actively under Estonian publisher Truemium OÜ (v5.1.30, 2026-06-19).

**Cite Faladdin for the scarcity mechanic. Never cite it as a business model.**

### 3.3 The push benchmark — CORRECTED, and the correction is *in our favour*

The real source is **Batch** (a French mobile-CRM vendor), *The Great Push Notifications & Mobile Engagement
Benchmark 2025* — 800bn messages, 1.2bn unique visitors, ~10,000 apps/sites, July 2024–July 2025,
Europe-weighted:

> "the open rate for **contextual** campaigns is **14.4%**, compared to **4.19%** for **generic** ones"

**Batch's definitions are not ours.** *Contextual* = "**automatically triggered** after an action or a
previously defined time." *Generic* = "**sent manually** to a group of users with little or no targeting."
That is **triggered-vs-manual-broadcast**, not personalised-copy-vs-generic-copy.

Neither CleverTap nor MobiLoud is the origin. CleverTap relays an *earlier* Batch edition with **different**
numbers (16.3% vs 4.7%); its own benchmark is CTR (~2.25% avg, **iOS 3.4%** — the likely origin of our
drifted "3.4×"). MobiLoud contains none of these figures at all; its personalisation stat is Airship's "4×
higher reaction rates."

**Why this helps us:** Palmly's 08:30 `pulse-fanout` **is** an automatically-triggered scheduled send — Batch's
"contextual" category. The benchmark applies to our architecture, just not for the reason 01 §2.1 gives. But
it must be labelled a **cross-industry, Europe-weighted benchmark with no Co-Star or astrology relevance.**

### 3.4 Duolingo — both numbers drifted

**"+48%" is Trophy's, not Duolingo's.** Trophy (trophy.so, a gamification-infrastructure vendor), Duolingo
case study, 2025-09-26: "among daily streak users who have passed seven days, those on apps **with** streak
freeze functionality average **17.19** days on streak, compared to **11.62** for those without — a 48%
difference. At fourteen days … **30.63** vs **18.87**." That is **observational, across Trophy's customer
apps, not a Duolingo experiment and not causal.**

**"~55% next-day return" is unsourced.** No Duolingo primary carries it; the circulating versions measure
different things (one says 55% *month-over-month* DAU retention; another has a 2012 12% next-day figure with
no 55% follow-up).

**What Duolingo actually publishes** — use these instead:

- "learners who reach a streak of 7 are **2.4× more likely** to continue using Duolingo the next day"
  (blog, 2020-11-19). Same post: +3.3% D14 retention, +10.5% share of daily learners on a streak.
- Jorge Mazal (ex-CPO, Feb 2023): share of DAU with a 7+ day streak rose **~3× to more than half of DAU**;
  CURR +21%, "a reduction in the daily churn of our best users by over 40%."
- Jackson Shuttleworth (Group PM, Retention, Dec 2024): "**two streak freezes worked better than one, but
  three streak freezes were no better than two**"; streak repair/earn-back is "a retention winner."

**Actionable for RF6.T4:** Duolingo's own on-record finding is *ordinal* — **two** freezes beat one. Our plan
specifies **one** quiet day per rolling 7, which is below the evidenced optimum. Either raise it to two, or
make the window a tunable constant and say so in the task.

### 3.5 Pricing — collected table beats the claim

US App Store in-app-purchase sections, fetched 2026-07-28:

| App | Monthly | Annual | Other |
|---|---|---|---|
| TimePassages | $7.99 | — | $0.99/chart, $9.99 passes |
| Co-Star | $8.99 (Pro-Star) | **none listed** | $11.99 Year Ahead, $6.99 Eros, packs $2.99–6.99 |
| CHANI | $11.99 | **$107.99** | — |
| The Pattern | $14.99 | **$83.99** | $29.99 quarterly, $24.99 Connect+ quarterly |
| Sanctuary | $14.99 | **$49.99** | readings $4.99–49.99 |
| Nebula | *periods not disclosed* | — | five SKUs $2.99/$7.99/$29.99/$39.99/$49.99 |
| Faladdin | $9.99/$11.99/$24.99 | trial-gated | **weekly $5.99, $9.99** |
| Umax | $9.99/$12.99/$24.99 | — | **weekly $3.99–$9.99** |
| Astrotalk | *not a subscription* | — | wallet recharges $5–$1,000 |

So: **monthly $8–15** (not $9–15), and **annual $50–$108 for the premium Western apps** — the "$20–70" band
captures one of three. The claim also omits **weekly**, which Adapty 2026 says now generates **56% of all app
revenue**.

**"5.4×" does not exist in any report.** Closest real figures: Adapty 2026 — "weekly plans convert **1.7–7.4×**
better than **annual** across all price tiers" (a range, weekly-vs-annual paywall conversion, *not*
"conversion to trial"); RevenueCat 2025 — "hard paywalls convert at **5.5×** the rate of freemium" (an
unrelated metric, and the likely origin of the garbled number).

**The 35% is real with a qualifier we dropped.** RevenueCat (115,000+ apps, updated 2026-04-24): weekly
**first**-renewal median is **35% for Social & Lifestyle specifically** — lowest of all categories (Education
58%, Health & Fitness 54%) — and it **rebounds to 78% by the third weekly renewal**. Long-horizon is the real
indictment: weekly 12-month retention **3.4%** vs monthly 17.5% vs annual 44.1%.

**Worth flagging for the H8 pricing decision:** RevenueCat 2026 reports **~72% of annual subscribers now
cancel within Year 1**, worsened from ~56% a year earlier, with 35% of those cancellations in month 1. Our
locked monthly+annual/no-trial stance still matches the trust-preserving pole (CHANI), but annual is not the
safe harbour it was two years ago.

### 3.6 Failure modes — one is strong, three are weaker than we've been treating them

- **The Pattern / content recycling — VERIFIED, and the best-evidenced claim in the whole set.** Three
  independent verbatim reviews: *"every week you get the same prompts basically"* (2023-02-10); *"content
  barely ever changes like mine has pretty much been the same ever since I joined"* (2022-12-07); *"I just
  get a recycling of the same messages"* (2022-01-08). Crucially they are **bundled with paywall resentment
  in the same reviews** — "Almost everything costs money now"; "more and more content goes behind paywalls."
  **Users punish *pay more + get the same thing*, not repetition alone.** And there is a measurable penalty:
  The Pattern sits at **3.96★/14,353 — the lowest rating of every app sampled** (Co-Star 4.8/205K, CHANI
  4.9/56K, Sanctuary 4.80/44K, Nebula 4.57/170K, Moonly 4.64/31K).
- **Umax — SPLIT.** Fortune (2024-07-01) confirms $3.99/week, 7M+ downloads, ~$500k/mo self-reported. The
  blur-then-paywall *sequencing* is asserted only by an SEO/affiliate site — thin. **The ratings collapse is
  folklore:** Umax is **4.56/51,226** on iOS and ~4.47/~380K on Play today. (Caveat: no rating-history chart
  was obtainable, so a recent decline could hide inside a lifetime average.) Incidental but telling: Umax's
  last iOS update was **2024-06-28** — abandoned for two years while still selling weekly subscriptions.
- **Nebula — real complaints, no visible consequence.** The strongest primary quote for the specific
  free/paid-blurring mechanic is one review: *"everything started becoming unavailable unless subscribed."*
  Structurally corroborated by its IAP list — five SKUs all labelled just "Premium subscription" at
  $2.99–$49.99 **with no billing period shown**. But the app is **4.57★/170,481 and shipping**. "Trust
  collapse" describes the complaint volume, not an outcome.
- **Moonly — real but thin, and mis-aimed.** One clear on-point review (*"core lunar calendar … now less
  featured and less convenient to access"*, 2025-09-04) plus a cluster about locked meditations, course
  pricing and AI. **No business consequence:** 4.64★/31,374, v2.8.7 shipped 2026-07-20. And the anger is
  aimed at *monetising* each added feature more than at the bloat itself.

**Net for our design rules:** the anti-bloat rule (spec §8) and the anti-recycling rule survive, but the
mechanism is clearer than we had it — **what users punish is paying more for the same thing.** Free content
that repeats is tolerated; paid content that repeats is not.

---

## §4 Does the RF6 reframe still hold?

The reframe rests on two premises. The evidence treats them very differently.

**P1 — "daily palm content is the unproven half." → Survives, but the argument for it must be rebuilt.**

The *stated* argument in 05 §0 is dead: Hint did not evaluate and reject daily palm content; there is no
evidence it evaluated anything. Hint is a delisted paid-acquisition funnel with a BBB billing alert, not a
competitor whose product judgment we should defer to. **Delete that inference.**

But the *conclusion* survives on better evidence. Daily-content-from-a-stored-palm-scan **has** been shipped —
Solma today, a $12.99/mo "Daily Palm Insight" SKU back in 2021, a questionnaire-driven "Daily Palmistry" at
100K+ installs — and **not one of them has produced any evidence that it retains.** Solma has zero ratings
after four months; the 2021 subscription was abandoned. So the honest position is stronger and more useful
than the original: this is **not whitespace, and not a proven loser — it is genuinely untested.** "Unproven"
was the right word all along; "a competitor tested it and said no" was never true.

**P2 — "the almanac/astrology substrate is the proven one." → Supported, but by a different app.**

Proven by **CHANI**: current #1 US astrology grosser, 4.9★ on both stores, free daily unit forever with depth
gated contextually against the user's own chart, $11.99/$107.99, no trial games. That is a near-exact
validation of Palmly's §6 split — and it is the trust-preserving pole, not the weekly-churn pole, that is
winning. **Swap the proof point from Hint to CHANI wherever it appears.**

**A third thing the evidence says that the plan doesn't.**

The plan treats the seal as a differentiator wrapped in proven mechanics — "the one genuine bet." The
review corpora say it is more than that. For **scan-based** apps specifically, the dominant complaint is not
repetition but **non-determinism and fake measurement** ("I scanned my dog's paws and it gave a reading";
"7 readings back to back, 7 different results"; "it gave me and my boyfriend the exact same aura"). Palmly's
deterministic geometry and free on-device same-palm re-check are a direct structural answer to the failure
mode that actually kills apps in this niche. **RF6.T3 is the best-evidenced task in the ledger, not the most
speculative one.**

**Verdict: the reframe holds. Its central argument does not, and must be replaced.**

Task-by-task:

| Task | Standing after verification |
|---|---|
| **RF6.T1** — prompt v2 + repetition gate | **Strengthened.** The Pattern's recycling failure is the best-evidenced claim in the set, our own live eval output shows the defect, and the reviews show users punish repetition *hardest when they're paying for it*. Proceed as written. |
| **RF6.T2** — merge the two cards | **Proceed, on different grounds.** The Hint justification is dead. The merge still stands on the honesty argument (§1) and Audit-4's one-hero rule — both independent of any market claim. **Rewrite §0 before executing so the task isn't justified by a refuted premise.** |
| **RF6.T3** — promote the seal | **Upgrade to the plan's strongest task.** Re-argue it from the non-determinism failure mode, not from "no competitor precedent." |
| **RF6.T4** — streak insurance | **Proceed, retune.** The +48% is Trophy's cross-app data, not Duolingo's, and not causal. Duolingo's own finding is that **two** freezes beat one and three are no better. One per rolling 7 is below the evidenced optimum. |
| **RF6.T5** — weekly recap | Unaffected by anything here. Scope warning in 05 still governs. |
| **RF6.G** — 25% reveal-rate kill rule | **More valuable now, not less.** Nobody in the category has evidence this loop retains. Keep the rule; keep the retreat cheap. |

**One new competitor to watch:** Solma (iOS 6760654131). Same architecture, four months ahead, zero traction.
Re-check its rating count at RF6.G — if it is still at zero, that is weak evidence the loop doesn't sell
itself; if it has moved, read its reviews before we ship copy.

---

## §5 Corrections applied to `01-RETENTION-STRATEGY.md` in place

Per the RF6.T6 brief, wrong claims were corrected in the source file rather than only noted here. Changes:

1. **§0 thesis** — removed "Market research confirms nobody has shipped daily content computed from real
   palm/face features … That is the whitespace." Replaced with the accurate position (shipped by several,
   proven by none) and the Hint figure corrected. *(§0 is outside the brief's "section 2" scope, but it
   carried the single most load-bearing false sentence in the file; leaving it would have guaranteed the next
   session rebuilt on it.)*
2. **§2.1** — push benchmark re-attributed to Batch 2025 with its real definitions (triggered vs manual
   broadcast); "core retention mechanic" softened to "signature mechanic."
3. **§2.3** — Faladdin's 1M/day relabelled as unverified company marketing; legal overhang noted.
4. **§2.4** — Duolingo: 48% re-attributed to Trophy and labelled observational; 55% removed; the real
   published figures (2.4×, CURR +21%, two-freezes-beat-one) substituted.
5. **§2.6** — CHANI's revenue figure qualified; the model claim (which is the load-bearing half) retained and
   strengthened; CHANI noted as current category #1.
6. **§2.7** — pricing bands corrected ($8–15/mo; annual $50–108); "5.4×" removed as non-existent; the 35%
   given its Social & Lifestyle / first-renewal qualifier plus the 78% rebound.
7. **§2 failure-modes line** — Umax ratings collapse marked folklore; Nebula/Moonly consequences marked
   undented; The Pattern marked as the one strongly-evidenced case, with the "paying for repetition" nuance.

Everything else in 01 stands. Nothing in §1 (codebase audit), §3–§9 was touched.

---

## §6 What remains unverifiable — do not build on these

- **Hint's current revenue.** No vendor models a delisted app; the UK entity files no P&L; the Delaware
  entities file nothing. Genuinely unknown, not zero.
- **Whether Hint's daily surface ever drew on palm data internally.** Its 2023 Play copy asserts it does
  ("in part even reading palmistry and information from the pattern of your palms"), in a listing that also
  accidentally names a competitor. No screenshot, changelog or teardown corroborates. Unresolvable without
  running an app that no longer exists.
- **Whether Hint was removed by the stores or withdrawn.** No FTC action, lawsuit or announcement found.
- **Whether the four large Play apps claiming daily-palm features actually ship them.** Store copy in this
  category is proven unreliable, and 72 extracted reviews mention the feature zero times.
- **Duolingo's next-day-return figure.** Nothing published.
- **Umax's rating history.** Paywalled at every vendor; only lifetime averages obtainable.

**Source-quality warnings for whoever works this next:** `web.archive.org` is blocked to WebFetch but works
via `curl --compressed`. `hint.app` is a Next.js SPA — its real copy lives in the RSC flight payload and
WebFetch strips it; use raw curl. Trustpilot, AppBrain, JustUseApp, Statista and Apple Discussions are
Cloudflare/WAF-blocked. AppGrooves' domain no longer resolves — any Hint figure tracing to it is citing a dead
site. And search-result summarisation repeatedly asserted number pairings ("12% → 55%", "customer.io confirms
14.4%") that **vanished when the actual pages were fetched.** Fetch before believing.
