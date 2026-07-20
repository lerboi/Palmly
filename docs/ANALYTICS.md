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

### 3. D1/D7/D30 retention (does the daily fortune pull users back — §4.5)
- **Retention cohort** on `fortune_opened` (and `app_opened`) → PostHog retention chart D1/D7/D30.
- Fortune pull-back = `push_opened` (type=`daily_fortune`) → `fortune_opened`; streak from `fortune_opened.streak`.

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

**Intentionally still pending** (no honest device-free call site — do NOT wire until their gate lands):
`purchase_completed`/`winback_converted` (RevenueCat, H8), `chat_message_sent`/`chat_deflected` (real
chat transport, F1.T11), `invite_installed` (install attribution, H9), `push_opened` (push delivery,
device + H9), the OS-grant leg of `permission_result{kind:'push'}` (device), `consistency_survey`
(fires after a live repeat-scan resolve, device), `account_deleted`/`scans_deleted` (emit at the
privacy actions — device/live). `invite_clicked` install-attribution sources
(`clipboard`/`referrer`/`appsflyer`) also ride H9; the `web`/`manual_code` sources are device-free.
Server-side counterparts (invite state, subscription events) live in the DB tables and join in PostHog
via the shared UUID.
