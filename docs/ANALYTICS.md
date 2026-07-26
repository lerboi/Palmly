# Palmly — Analytics event taxonomy & validation map (P11.T1)

**One typed emitter.** Every product event is a key in `AnalyticsEventMap` (`app/src/lib/analytics.ts`),
emitted via the typed `track('<event>', props)`. Adding/typo-ing an event or its props is a build error.
PostHog carries product analytics; Sentry carries crashes (both behind the `analytics.ts` facade,
mvp_spec §5.8). Users are identified by their pseudonymous Supabase UUID (`identifyUser`).

Sources: **UIUX §8** (instrumentation map) · **Backend §14** (events) · **mvp_spec §10** (what to validate).

> **Verify status:** the taxonomy + typed emitter are built and typecheck. "Each event visible once in
> PostHog live" is a device + dashboard step (needs a physical run — H1 — against the H2 PostHog project).

---

## The five mvp_spec §10 validation metrics → how each is answered

### 1. Capture → reading completion rate (UX smoothness, §7 / UIUX §8 "is capture effortless?")
- **Funnel** (per device tier): `capture_started` → `capture_completed` → `upload_ok` → `reading_ready` → `reveal_viewed`.
- Completion rate = `reveal_viewed` / `capture_started`. Drop-off = `capture_abandoned` (+ `last_state`).
- In-capture time from `capture_completed.duration_ms` (target p50 <20s); auto rate from `capture_completed.method='auto'` (target >85%); abandon <8%.

### 2. Viral coefficient (K-factor) of the share/compatibility loop
- **Funnel** (the invite state machine, broken down by `channel`): `invite_created` → `invite_clicked` → `invite_installed` → `invite_accepted` → `pair_reveal_viewed`.
- K = (invites created per activated user) × (`invite_accepted` / `invite_created`). Also `share_sheet_opened` → `share_completed` (share rate per reveal).

### 3. D1/D7/D30 retention (does the daily loop pull users back — §4.5, Audit-5 01 §8)
- **Retention cohort** on `fortune_opened` (and `app_opened`) → PostHog retention chart D1/D7/D30.
- Fortune pull-back = `push_opened` (type=`daily_fortune`) → `fortune_opened`; streak from `fortune_opened.streak`.
- **Reveal rate** — the Audit-5 north star beside retention: `pulse_revealed` ÷ DAU. It answers a
  sharper question than "did they open the app": did they perform the daily gesture.
- **Push → open**: `push_opened{type='daily_pulse'}` ÷ pushes enqueued (`worker_telemetry`,
  `pulse-fanout.enqueued`). The category benchmark for a CONTEXTUAL push is ~14% vs ~4% generic
  (01 §2.1) — if `daily_pulse` is not clearing `daily_fortune`, naming the user's own feature is not
  paying for itself and the copy needs work.
- **Seal rate, and the ritual's worth**: `pulse_sealed` split by `method`. `palm` ÷ (`palm`+`tap`) is
  the only honest read on whether the camera ritual earned its build cost; `attempt_ms` on failed
  matches is what would justify moving `SEAL_MATCH_THRESHOLD`.
- **Streak distribution**: histogram of `pulse_revealed.streak`. Watch the day-2 and day-8 cliffs —
  they are where a daily habit is actually won or lost.

### 3b. Today's Line conversion (Audit-5 01 §8)
- **Trigger funnel**: `pulse_revealed` → `paywall_viewed{trigger='pulse_full'}` → (H8)
  `purchase_completed{trigger='pulse_full'}`. Compare against `fortune_full`: the two sit on the same
  screen, so the difference between them is close to a clean read on whether personalization converts.
- **Boundary-day delta**: `paywall_viewed{trigger='cycle_boundary'}` conversion vs `pulse_full` on
  ordinary days. The category's spike is real for astro apps on shared events (retrogrades); the
  hypothesis here is that a PERSONAL boundary beats a shared one.
- **Milestone**: `milestone_reached{day}` → `share_completed` (the give-first half) and, separately,
  → `paywall_viewed{trigger='post_share'|'streak_milestone'}`. If the share rate falls when the soft
  premium line appears on day 7/30, the line is costing more than it earns.
- **Guardrail**: `pulse` generation completeness. `pulse-generate` returns 500 `pulse_incomplete` and
  writes a `worker_telemetry` row naming the missing feature keys — alarm on that exactly as ops
  already alarms on `fortune_incomplete`. A missing template is a user staring at an error card.

### 4. Free-to-paid conversion (is the §4.6 free tier converting)
- **Funnel** (by `trigger` + `variant`): `paywall_viewed` → `paywall_page_viewed` → `purchase_completed`.
- Conversion = distinct `purchase_completed` users / distinct users; `paywall_dismissed` for abandonment; `winback_converted` for the 24h win-back.

### 5. Consistency perception (do repeat scans feel trustworthy — §6.6.4)
- `consistency_survey.response` distribution (`consistent`/`inconsistent`/`unsure`), fired after a repeat scan resolves to the same reading.

---

## Event catalogue (grouped as in UIUX §8)

| Group | Events |
|---|---|
| App | `app_opened` |
| Onboarding funnel | `onboarding_step_viewed{step}`, `onboarding_skipped{at}`, `hand_selected{hand}` |
| Capture funnel | `camera_primer_viewed`, `permission_result{granted,kind}` (kind: camera \| push — F1.T10 push moments), `capture_started`, `capture_state_dwell`, `capture_completed`, `capture_abandoned`, `upload_ok` |
| Reveal (wow) | `reading_ready`, `analyzing_notify_me`, `reveal_viewed`, `reveal_section_viewed`, `reveal_scroll_depth`, `reveal_time_spent`, `consistency_survey` |
| Viral loop (K-factor) | `share_sheet_opened`, `share_completed`, `invite_created`, `invite_clicked`, `invite_installed`, `invite_accepted`, `pair_reveal_viewed` |
| Paywall funnel | `paywall_viewed`, `paywall_page_viewed`, `paywall_dismissed`, `purchase_completed`, `winback_converted` |
| Fortune retention | `fortune_opened`, `push_opened`, `notification_pref_changed` |
| Today's Line (Audit-5) | `pulse_revealed{feature_key,method,streak,premium}`, `pulse_sealed{method,matched,attempt_ms}`, `chapter_viewed{feature_key,boundary}`, `milestone_reached{day}` |
| Account + privacy | `account_linked`, `account_deleted`, `scans_deleted` |
| Chat (premium) | `chat_message_sent`, `chat_deflected` |

Exact prop shapes are the source of truth in `AnalyticsEventMap` (`app/src/lib/analytics.ts`).

## Wiring status
The typed catalogue exists and is **emitted from its wired surfaces** (F0.T12 sweep + Audit-3 D0.T5):
`app_opened` (root), `onboarding_step_viewed`/`onboarding_skipped`/`hand_selected` (onboarding A1–A3),
`camera_primer_viewed`/`permission_result{kind:'camera'}` (primer), `capture_started`/`upload_ok`/
`capture_completed` (upload flow, `useScanUpload`), `capture_state_dwell` (palm capture state machine),
`capture_abandoned` (palm + face capture, on leave-without-completing), `reading_ready` (analyzing→reveal
seam), `reveal_viewed`/`reveal_section_viewed`/`reveal_scroll_depth`/`reveal_time_spent` (reveal),
`share_sheet_opened`/`invite_created`/`share_completed` (share sheet), `invite_clicked{source:'web'}`
(claim landing, deep-link arrival), `invite_accepted` (claim), `pair_reveal_viewed` (pair),
`account_linked` (account sheet), `paywall_viewed{trigger}`/`paywall_page_viewed{page:0}`/
`paywall_dismissed` (paywall), `fortune_opened` (fortune), `notification_pref_changed` (notification
settings toggle), `analyzing_notify_me` (analyzing overrun).

**Audit-5 additions (RF5.T1), all wired:** `pulse_revealed` (Today, on reveal), `pulse_sealed`
(the check-in route, both the palm and tap exits), `chapter_viewed` (the boundary banner),
`milestone_reached` (the milestone sheet), and `push_opened` — which finally has an emitter
(`usePushOpenTracking`, root layout, RF0.T4) after shipping without one since P11. Its per-type
breakdown depends on `buildExpoMessage` stamping `data.type`, added in the same task.

**Intentionally still pending** (no honest device-free call site — do NOT wire until their gate lands):
`purchase_completed`/`winback_converted` (RevenueCat, H8), `chat_message_sent`/`chat_deflected` (real
chat transport, F1.T11), `invite_installed` (install attribution, H9), the OS-grant leg of `permission_result{kind:'push'}` (device), `consistency_survey`
(fires after a live repeat-scan resolve, device), `account_deleted`/`scans_deleted` (emit at the
privacy actions — device/live). `invite_clicked` install-attribution sources
(`clipboard`/`referrer`/`appsflyer`) also ride H9; the `web`/`manual_code` sources are device-free.
Server-side counterparts (invite state, subscription events) live in the DB tables and join in PostHog
via the shared UUID.
