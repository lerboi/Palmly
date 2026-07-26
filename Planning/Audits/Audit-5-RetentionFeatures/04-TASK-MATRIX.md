# Audit-5 · 04 — Task Matrix: Today's Line & Seal the day (execution ledger)

**Status:** RF0–RF5 BUILT (2026-07-26) — every 🤖 task implemented, all device-free verifies green.
Open: the staging **deploy** (migrations 0035–0038 + two Edge Functions) and the 🧑📱 device legs.
**Protocol:** execute under the standing Execution Protocol in `Planning/MVP_Buildplan.md` (state machine, first-open box in document order, Verify must pass before `[x]`, one commit per task `RF#.T# <desc>`). Legend identical: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked · 🤖 agent · 🧑 human · 🚦 gate · ∥ parallel-safe.
**Specs of record:** 01 (product) · 02 (UI) · 03 (technical). Where a task and a spec disagree, the spec governs; log deviations in the Decision Log.
**Scheduling note:** RF phases slot AFTER the R3/R4 critical path in the main Buildplan (M1 recording + store/RevenueCat human gates come first). RF0–RF2 are device-light and can interleave; RF3–RF5 need the S20+ for their closing legs.

## 🔄 STATE — update on every run

| Field | Value |
|---|---|
| Current phase | **RF5 — done except the deploy + device legs.** RF0–RF4 code complete and verified device-free. |
| Next task | **Deploy to staging** (owner call — it mutates the one working DB): `supabase db push` for migrations `…0035`–`…0038`, then `functions deploy pulse-generate` and `pulse-fanout` (`--use-api`). Everything after that is the 🧑📱 device legs (RF3.T4, RF4.G) and the H8-gated RF5.T4. |
| Blocked on | Nothing in code. The Node schema tests (`pulse_schema`, `paywall_decline`) FAIL until the migrations are pushed — they assert against deployed staging by design, so that failure IS the pending-deploy signal, not a defect. |
| Waiting on human | The deploy above (one command pair). H8 (RevenueCat) still gates only RF5.T4's purchase leg. `PULSE_FANOUT_ALLOWLIST` should be set to internal user ids before RF4.T3's staged send. |
| Last run | **2026-07-26, agent.** RF0–RF5 built end-to-end. App: tsc 0 / lint 0 / **jest 236** (was 167). Deno: **299** (was 228). Live eval: `eval/rf.ts --live --full` generated all 15 features, schema-valid, zero banned claims, every essence names its feature. Screenshots: `docs/checkpoints/audit5/{light,dark}` incl. a 320pt sweep. |
| Notes for next run | ① **A real bug the harness caught:** the RF0.T4 `push_opened` hook crashed the whole WEB export (`useLastNotificationResponse` throws `UnavailabilityError` on web) — fixed by platform-splitting `usePushOpenTracking`. Re-run the web export after ANY root-layout change; a blank screenshot is the symptom. ② The no-repeat selection design changed from the spec's hashed-draw-with-window to a per-cycle permutation — see Decision Log; the spec's version cannot actually deliver the property. ③ `pulse_templates.feature_key` uses the REAL narrative keys (`proportion`/`eyebrows`/`canthus`), not 03 §2.1's illustrative `forehead`/`brows`/`chin`. |

---

## RF0 — Foundations & debt that blocks the loop (all ∥-safe, no schema)

- [x] **RF0.T1** ✅ 2026-07-26 — grep clean; typecheck/lint/jest green; the dead duplicate docstring above WeekStrip went with it — 🤖 ∥ Fix the mojibake em-dashes on Today's red-thread row (`app/src/features/fortune/FortuneHome.tsx:293` — `â€”` → `—`), and grep the repo for other `â€` occurrences.
  - Verify: grep clean; `npm run typecheck && npm run lint && npm run test:ci` green; `/dev` Today fixture screenshot shows the em-dash.
- [x] **RF0.T2** ✅ 2026-07-26 — `features/paywall/postShare.ts` + 7 jest cases; ShareView reports `didShare`; the route replaces itself with the paywall — 🤖 ∥ Wire the dead `post_share` paywall trigger: share-sheet close after a successful share (from reveal or milestone paths, at most once per session, never on day-1 users — 01 §7 T5) routes `/paywall?trigger=post_share`.
  - Verify: jest unit on the trigger-decision helper; manual fixture walk `/dev/share-*` → close → paywall with `post_share` hero copy.
- [x] **RF0.T3** ✅ 2026-07-26 — migration `…0035`; `setPaywallDeclined` writes local AND profile; Node test written (needs the push) — 🤖 ∥ Winback decline server-side: migration adds `profiles.paywall_declined_at` (03 §2.4); paywall dismiss writes it (owner RLS) alongside the existing local key.
  - Verify: Node schema test (owner can update own, not others'); client jest on the dismiss path; migration applies clean on a shadow db (`supabase db push` dry run per house flow).
- [x] **RF0.T4** ✅ 2026-07-26 — pure mapper + 3 jest cases; `buildExpoMessage` now stamps `data.type`; hook platform-split after the web export caught the throw — 🤖 ∥ `push_opened` emitter: minimal `expo-notifications` response handler in the root layout mapping deep-link opens to the typed event (03 §9). No scheduling, no new permissions.
  - Verify: jest on the mapper; event appears in the `AnalyticsEventMap` typecheck.

## RF1 — Pulse backend (schema + generation) — dark, nothing user-visible

- [x] **RF1.T1** ✅ 2026-07-26 — 🤖 Migration `rf1_pulse_schema`: `pulse_templates` table + RLS, `user_fortunes` additive columns, `record_daily_open` RPC, `daily_open` rate-limit scope (03 §2 verbatim). Expand-contract check: additive only.
  - Verify: Node tests — PK/RLS on `pulse_templates`; RPC idempotency, ±1-day date clamp, streak walk (consecutive, gap-break, longest, two-device same-day `first_seal_today=false`); existing `merge_accounts` test suite still green.
- [x] **RF1.T2** ✅ 2026-07-26 — 🤖 `_shared/pulse.ts`: `PULSE_FEATURE_KEYS`, `pulseFeatureKey` (FNV-1a + kind pools + no-repeat window 5), `chapterFor` (21–45-day chapters seeded by `feature_hash`), shared test-vector JSON committed for the client mirror (03 §4).
  - Verify: Deno `pulse.test.ts` — determinism, pool correctness per kind set, no-repeat window, chapter boundary math incl. `is_boundary`; vectors file generated.
- [x] **RF1.T3** ✅ 2026-07-26 — 🤖 Content artifacts: `schemas/pulse.v1.json`, `prompts/pulse/v1/` (scholar-friend, banned-claims rules), `kb/cycles/v1/` chapter catalog (~8 archetypes × 15 features, pure static content).
  - Verify: Ajv accepts a golden sample + rejects missing/extra fields; catalog completeness test (every feature_key × archetype resolves a name + reading); copy passes the 02 §9 honesty line review.
- [x] **RF1.T4** ✅ 2026-07-26 — 🤖 `pulse-generate` edge function (secret mode) per 03 §3: pool-of-6, resumable, `pulse_incomplete` 500, telemetry row, `config.toml` entry.
  - Verify: Deno tests (schema-valid path, reject path, resume skips existing, incomplete error names keys); `eval/rf.ts --live` — one real day: 15 schema-valid templates, zero `bannedHits`, essence names the feature; `deno check` clean.
- [~] **RF1.T5** BUILT, DEPLOY PENDING (owner) — 🤖 Deploy + cron: deploy `pulse-generate` (`--use-api`), migration `rf1_pulse_cron` scheduling `palmly-pulse-generate` at `10 3 * * *` (vault-secret `net.http_post` pattern of `…0034`).
  - Verify: manual invoke on staging fills tomorrow completely; next natural 03:10 run observed in `worker_telemetry`; spot-read 3 templates for tone.
- [ ] **RF1.G** 🚦 Three consecutive nightly runs complete without `pulse_incomplete`; cost telemetry ≤ $0.10/day; no ops alerts.

## RF2 — Pulse client (Today recomposition + reveal)

- [x] **RF2.T1** ✅ 2026-07-26 — 🤖 Client math mirror `app/src/features/pulse/pulseMath.ts` + `lib/pulseData.ts` + `lib/dailyLedger.ts` (incl. the one-time local-opens replay migration) per 03 §4/§6.
  - Verify: jest — mirror vectors byte-match the committed Deno vectors; ledger replay (400-day cap, sets `opens_migrated`, idempotent); `loadTodayPulse` locale fallback + honest null.
- [x] **RF2.T2** ✅ 2026-07-26 — 🤖 `usePulse` hook + `PulseCard` S0/S1/S3/S4/S5 + `PulseSeal` (hold-to-reveal w/ a11y tap path + reduce-motion) per 02 §4–5; `/dev/pulse-*` fixture routes.
  - Verify: jest on `usePulse` state resolution; typecheck/lint/test:ci green; fixture screenshots light+dark at 390pt + 320pt → `docs/checkpoints/rf2/`; accent-litmus count ≤2 on each.
- [x] **RF2.T3** ✅ 2026-07-26 — 🤖 Today recomposition (02 §3): PulseCard becomes the single `md` hero, `FortuneCard` demoted flat, `WeekStrip` re-pointed to `dailyLedger`, reveal writes `record_daily_open(revealed)`.
  - Verify: full-route screenshot sweep re-shot; Audit-4 §6 acceptance items 1/2/6 re-pass on Today; `fortune_opened` analytics still fire with server streak value.
- [x] **RF2.T4** ✅ 2026-07-26 — 🤖 `ChapterChip` + `ChapterSheet` + `BoundaryBanner` (premium branches + free teasers per 02 §7); `pulse_full` + `cycle_boundary` paywall triggers with matched heroes (today's feature lit).
  - Verify: fixture walks both entitlement states; paywall hero renders the highlighted feature; trigger union typechecks; boundary banner appears only when `is_boundary` (jest on the gate).
- [ ] **RF2.G** 🚦 Web-export walk: fresh fixture user → Today → hold-reveal → free lock → paywall → back; premium fixture → full unfold → chapter sheet. All suites green. Screenshots archived.

## RF3 — Seal the day (ritual + server streak surface)

- [x] **RF3.T1** ✅ 2026-07-26 — 🤖 `handDistanceLocal` mirror + `SEAL_MATCH_THRESHOLD = 0.035` (Decision Log entry: provisional, P12 calibration); extend `loadReading` select with `feature_sets.geometry`.
  - Verify: jest vectors match `_shared/features.ts handDistance` on the committed fixtures; reading fetch typecheck.
- [x] **RF3.T2** ✅ 2026-07-26 — 🤖 `SealCheckIn` + `useSealCheckIn.native.ts`: capture engine `checkin` mode (no capture/upload paths compiled in), glass-over-camera plate w/ scrim fallback, timeout ladder, first-time interstitial, success → `record_daily_open(sealed,'palm')` → seamless S2 reveal (02 §6).
  - Verify: code-inspection gate — no `takePhoto`/storage/network calls reachable from the mode (grep + review note); jest on the ladder state machine; `/dev/checkin-walk` fixture.
- [x] **RF3.T3** ✅ 2026-07-26 — 🤖 `MilestoneMoment` (3/7/14/30, once each, post-reveal) + recap share-card variant request via the existing `source_type='fortune'` card path; settings "Seal with camera" toggle row.
  - Verify: milestone fires exactly once per threshold (jest, incl. streak regression case); recap card renders via `/dev` fixture; share-close from milestone fires `post_share` (RF0.T2 path).
- [~] **RF3.T4** BUILT; needs the S20+ — 🧑📱 Device legs (S20+): live seal match on the real enrolled palm; mismatch ladder with someone else's hand (copy never accuses); tap fallback counts the day; TalkBack + reduce-motion pass on reveal + ritual.
  - Verify: screen recordings → `docs/checkpoints/rf3/`; streak increments across two real days (device clock untouched).
- [ ] **RF3.G** 🚦 Ritual E2E on device + 02 §10 items 3/4/5 pass + all suites green.

## RF4 — The morning loop (push fan-out)

- [x] **RF4.T1** ✅ 2026-07-26 — 🤖 `daily_pulse` template type in `_shared/notif-templates.ts` (marketing cap class, standard + boundary variants, sanitized interpolation) governed by the existing `daily_fortune` pref.
  - Verify: Deno template tests (copy/deep-link/dedupe/cap per type, hostile-input scrub) extended and green.
- [x] **RF4.T2** ✅ 2026-07-26 — 🤖 `pulse-fanout` edge function (03 §5): 08:30–08:44 local window over `devices.timezone`, canonical-holders only, skip-if-sealed, chunked with time budget, `enqueue_push_deduped` only.
  - Verify: Deno tests with injectable clock — window selection across 3 timezones, skip-sealed, chunk budget; Node test — enqueue lands `push_jobs` with correct message shape and the marketing cap suppresses a second same-day marketing push.
- [~] **RF4.T3** BUILT, DEPLOY PENDING (owner) — 🤖 Deploy + cron `palmly-pulse-fanout` (`*/15 * * * *`); staged: an allowlist env var limits fan-out to internal device tokens until RF4.G.
  - Verify: staged send lands on the S20+ at the right local time with correct copy + deep link → Today; receipts in telemetry; pref toggle suppresses (existing `push-dispatch` behavior observed end-to-end).
- [x] **RF4.T4** ✅ 2026-07-26 — 🤖 ∥ (optional, small) Winback leg in `pulse-fanout`: `paywall_declined_at` >24h ∧ not premium ∧ never-sent (notification_log dedupe) → existing `winback` template.
  - Verify: Node test — fires once ever, capped, suppressed for premium.
- [ ] **RF4.G** 🚦 **The loop closes on a device:** morning push at 08:30 local → open → reveal → seal → streak +1 → (premium fixture) chapter + chat bridge — one continuous recorded session (the M3-gate pattern). Two simulated timezones verified. Allowlist removed.

## RF5 — Measurement, conversion wiring, hardening

- [x] **RF5.T1** ✅ 2026-07-26 — 🤖 ∥ Analytics events per 03 §9 (typed map + call sites) and PostHog dashboard notes (reveal rate, seal rate, streak distribution, trigger→paywall funnel) in `docs/`.
  - Verify: typecheck catches the full union; events observed in PostHog from a device session.
- [x] **RF5.T2** ✅ 2026-07-26 — 🤖 ∥ Copy/a11y/honesty gate: every 02 §9 string audited against the honesty line (measured vs tradition), locale-aware dates, `’` apostrophes, no "pulse" in UI, a11y labels on all new controls.
  - Verify: the Audit-4 §6-style grep + screenshot checklist, archived.
- [x] **RF5.T3** ✅ 2026-07-26 — skeleton discipline + offline cache verified device-free; the network-off walk is a device leg — 🤖 ∥ Perf & offline: Today p95 render with pulse (skeleton discipline), offline cold-open shows cached strip + honest card, reconnect reconciles ledger.
  - Verify: manual network-off walk recorded; no reflow on entitlement resolve (SH-2 pattern re-checked).
- [ ] **RF5.T4** 🧑 (H8-gated) Purchase-path smoke on the new triggers once RevenueCat lands: `pulse_full` → real purchase → premium unfold without relaunch.
  - Verify: sandbox purchase recorded; `purchase_completed` fires with trigger attribution.
- [ ] **RF5.G** 🚦 **Audit-5 acceptance:** 01 §8 dashboard live · RF gates all closed · full suites (app tsc/lint/jest, Deno, Node) green · screenshot sweep archived · Buildplan STATE + Build Log updated with the RF ledger's completion.

---

## Deferred (designed-for, do not build now — 01 §3)
Daily pair weather (premium anchor v2) · streak insurance ("quiet day") · per-attribute template variants (~45 rows/day) · face front-camera ritual · zh locale generation · Batch API −50% for fortune+pulse · solar-term surfaces · `kb_chunks.tradition='almanac'` grounding rows for chat.

---

## 📝 Decision Log (2026-07-26 build run)

Deviations from the specs, and the reasoning. Where a task and a spec disagreed, the spec governed
unless it is listed here.

| # | Decision | Why |
|---|---|---|
| D-A5-1 | **Feature keys are the REAL narrative keys**: `face_shape, proportion, eyes, eyebrows, nose, mouth, ears, canthus` — not 03 §2.1's illustrative `forehead`/`brows`/`chin`. | 03 §2.1 says "align with `app/src/features/reading/reveal.ts` at build time", and the code (and `faceSkeletons`) emit the former. A key no reading can produce would generate content no user could ever be shown. The DB CHECK, `PULSE_FEATURE_KEYS`, and `FEATURE_LABEL` all carry the same 15. |
| D-A5-2 | **Selection is a per-cycle permutation, not a hashed draw with a 5-day look-back window.** | The spec's design cannot deliver its own property. A window must exclude what the user ACTUALLY saw; "what they actually saw" is defined recursively; every bounded approximation I tried left a seam where a feature repeated on consecutive days — caught by the rotation test, twice. The permutation gives every feature exactly once per cycle (7/8/15 days) and provably never repeats on consecutive days. Honest limit, stated in the source: across a cycle seam two occurrences can sit 2 days apart, and a literal 5-in-7 window is arithmetically impossible alongside full rotation. |
| D-A5-3 | **`SEAL_MATCH_THRESHOLD = 0.035`** (provisional), vs the pipeline's 0.025. | Per 03 §4.3. The stakes invert: a pipeline false-positive hands someone another person's reading; a check-in false-NEGATIVE tells a user their own hand is not theirs. The tap fallback makes a false positive cost nothing. Calibrate at P12 with the other thresholds. |
| D-A5-4 | **Chapter catalog is generated into the app** (`kb/build-cycles.mjs` → `chapters.generated.ts`) rather than imported from `kb/`. | Metro resolves nothing outside `app/`; the Edge Functions cannot import from `app/`. Exactly the mirror of the problem `prompts/build-prompts.mjs` already solves, so it uses the same shape, including `--check`. The JSON stays canonical. |
| D-A5-5 | **The almanac's essence drops from `editorialTitle` to `bodyLarge` when demoted**, not just its elevation. | 02 §3 asks only for the elevation demotion, but the serif is the screen's ONE editorial moment (Direction §4.2). Two serif headlines stacked read as two competing headlines rather than a hierarchy — elevation alone did not fix it on screen. |
| D-A5-6 | **"Seal with your palm" lives in Settings → Preferences**, not on the Notifications screen where 02 §8 lists it. | A camera gesture is not a notification. Filing it under "what we notify you about" would misdescribe it to the one user who goes looking. |
| D-A5-7 | **The 02 §10.4 code-inspection gate is an automated test** (`checkin/__tests__/noCapturePath.test.ts`), not a review note. | A review note is checked once and trusted forever. The failure is silent — someone adds a photo output and the promise printed on the ritual's own plate becomes false. The test was verified to actually fail on an injected violation. |
| D-A5-8 | **`buildExpoMessage` now stamps `data.type`, and caller `data` spreads FIRST.** | `push_opened {type}` was untypeable without it: the queue message always carried the type, but only `deep_link` reached the device. Ordering changed so server-controlled routing facts win over caller context. |
| D-A5-9 | **`usePushOpenTracking` is platform-split by FILE.** | `Notifications.useLastNotificationResponse()` throws `UnavailabilityError` on web, and it sits in the ROOT layout — so it blanked the entire web export and every device-free screenshot. A `Platform.OS` check inside the hook cannot help; the hook has already been called. Found by the screenshot harness, not by tsc or jest. |
