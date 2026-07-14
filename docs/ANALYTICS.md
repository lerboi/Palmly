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
| Capture funnel | `capture_started`, `capture_state_dwell`, `capture_completed`, `capture_abandoned`, `upload_ok` |
| Reveal (wow) | `reading_ready`, `reveal_viewed`, `reveal_section_viewed`, `reveal_scroll_depth`, `reveal_time_spent`, `consistency_survey` |
| Viral loop (K-factor) | `share_sheet_opened`, `share_completed`, `invite_created`, `invite_clicked`, `invite_installed`, `invite_accepted`, `pair_reveal_viewed` |
| Paywall funnel | `paywall_viewed`, `paywall_page_viewed`, `paywall_dismissed`, `purchase_completed`, `winback_converted` |
| Fortune retention | `fortune_opened`, `push_opened`, `notification_pref_changed` |
| Account + privacy | `account_linked`, `account_deleted`, `scans_deleted` |
| Chat (premium) | `chat_message_sent`, `chat_deflected` |

Exact prop shapes are the source of truth in `AnalyticsEventMap` (`app/src/lib/analytics.ts`).

## Wiring status
The typed catalogue exists; screens emit `app_opened` today (P1.T6). The remaining events are wired into
their screens as the on-device flows are exercised (capture P4, paywall P7, share P8 — all device/H8/H4c
gated). Server-side counterparts (invite state, subscription events, telemetry) live in the DB tables and
can be joined in PostHog via the shared UUID.
