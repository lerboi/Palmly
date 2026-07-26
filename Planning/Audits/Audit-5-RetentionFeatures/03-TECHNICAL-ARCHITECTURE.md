# Audit-5 · 03 — Technical Architecture: Today's Line & Seal the day

**Date:** 2026-07-26 · **Status:** PROPOSED
**Ground rules honored throughout:** expand-contract migrations only (additive; never drop/rename in one step) · text+CHECK, no PG enums (repo convention — zero `create type` exists) · every schema change is a new versioned file in `supabase/migrations/` · secrets via Vault/EAS only · all-Gemini (`gemini-3.1-flash-lite` for text) · server truth / client hint entitlement split (spec §7.6) · deterministic math mirrored client/server exactly like the existing pillar precedent (`_shared/pillar.ts` ↔ `app/src/features/fortune/fortune.ts`).

Code namespace: **`pulse`** (server + client modules). UI copy never uses the word (02 §9).

---

## §1 System overview

```
NIGHTLY (cron 03:10 UTC)                          MORNING (cron */15)
pulse-generate ──► pulse_templates                pulse-fanout ──► enqueue_push_deduped
  ~15 Gemini calls   (date, feature_key, locale)    (08:30 device-local shard)   │
  DAU-independent                                                                ▼
                                                  push_jobs ──► push-dispatch (EXISTS)
CLIENT (Today tab)                                                    quiet hours · prefs ·
  lib/pulseData.ts ──reads──► pulse_templates                         1/day marketing cap
  shared/pulseMath mirror: selection + chapters                       (all already built)
  reveal/seal ──writes──► user_fortunes (REVIVED, additive columns)
                └─ rpc record_daily_open → {streak, longest, sealed}
SEAL RITUAL (on-device only)
  live landmarks → handSignature.ts (EXISTS) → compare vs
  feature_sets.geometry.hand (owner-readable via existing RLS) → no upload, 0 tokens
```

Everything new rides existing rails: pgmq + cron wiring pattern (`20260720000034`), `enqueue_push_deduped` as the single push entry point, `withErrorEnvelope`/`requireMode` function chassis, versioned prompts/schemas, worker-pool generation with resume (`_shared/fortune.ts`). No Realtime needed (pulse is a read + an owner write; no server push mid-session).

---

## §2 Database (one migration: `202607XX0000NN_rf1_pulse_schema.sql` — number after current head `…0034`)

### 2.1 New table `pulse_templates` (shared content — mirrors `fortune_templates` exactly)

```sql
create table public.pulse_templates (
  pulse_date   date not null,
  feature_key  text not null check (feature_key in (
    -- palm (reveal.ts section keys)
    'heart','head','life','fate','hand_shape','mounts','markings',
    -- face (FACE_SECTION_ICON keys — align with app/src/features/reading/reveal.ts at build time)
    'face_shape','forehead','brows','eyes','nose','mouth','ears','chin')),
  locale       text not null default 'en',
  day_pillar   text not null,          -- informational: the DATE's sexagenary pillar bucket
  content      jsonb not null,
  model_id     text,
  prompt_version text,
  created_at   timestamptz not null default now(),
  primary key (pulse_date, feature_key, locale)
);
alter table public.pulse_templates enable row level security;
create policy pulse_templates_read on public.pulse_templates
  for select to authenticated using (true);   -- shared content, like fortune_templates
```

Design note: the pillar dimension is keyed by **date** (the day's own pillar — what the header already shows as "Wood Rat day"), not by user bucket. That collapses the matrix to ~15 rows/day and makes birth date optional for the feature. The user-bucket personalization stays where it already lives (`fortune_templates`).

`content` shape — `schemas/pulse.v1.json` (Ajv, `additionalProperties:false`, all required — same discipline as `fortune.v1`):

```json
{ "essence":  "string ≤ 90 chars, second person, names the feature",
  "reading":  "2–3 sentences",
  "career":   "one line", "love": "one line", "wealth": "one line",
  "watch":    "one line",
  "chapter_tone": "one line usable inside a chapter reading" }
```

### 2.2 Revive `user_fortunes` as the daily ledger (additive columns only)

```sql
alter table public.user_fortunes
  add column if not exists pulse_feature_key text,
  add column if not exists revealed_at       timestamptz,
  add column if not exists sealed_at         timestamptz,
  add column if not exists seal_method       text check (seal_method in ('tap','palm')),
  add column if not exists day_pillar        text;
```

Existing PK `(user_id, fortune_date)`, existing owner select/insert/update RLS, existing `merge_accounts` handling — all inherited free. `opened_at` (existing column) keeps meaning "Today tab opened"; `revealed_at` = pulse revealed; `sealed_at` = the day counted for the streak.

### 2.3 RPC `record_daily_open` (the one new user-callable mutation, alongside `set_keep_image`)

```sql
create or replace function public.record_daily_open(
  p_date date, p_bucket text, p_feature_key text, p_method text, p_revealed boolean
) returns table (current_streak int, longest_streak int, first_seal_today boolean)
language plpgsql security definer set search_path = '' as $$ ... $$;
grant execute on function public.record_daily_open to authenticated;
```

Behavior: `auth.uid()` scoped; **rejects `p_date` outside [today−1, today+1] in UTC** (tolerates every timezone without trusting arbitrary backfill); upserts the ledger row (idempotent — re-seals don't double-count, `first_seal_today` tells the client whether to celebrate); computes streak by walking consecutive `sealed_at is not null` days back from `p_date` (single window-function query — zero model calls, per the Audit-1 §RECOMMENDED ADDITIONS design) plus the historical max for `longest_streak`. Streak milestones are *derived client-side* from the returned number (3/7/14/30) — no server milestone state.

### 2.4 Winback decline goes server-side (additive)

```sql
alter table public.profiles add column if not exists paywall_declined_at timestamptz;
```

Client already stores this locally (`palmly.paywall_declined_at.v1`); it now also writes the profile column (owner-update RLS exists). This is what lets the existing-but-orphaned `winback` template ever fire.

### 2.5 Cron (same vault-secret `net.http_post` pattern as migration `…0034`)

| Job | Schedule | Target |
|---|---|---|
| `palmly-pulse-generate` | `10 3 * * *` (10 min after fortunes) | `pulse-generate`, empty body ⇒ tomorrow UTC |
| `palmly-pulse-fanout` | `*/15 * * * *` | `pulse-fanout` |

---

## §3 Edge function: `pulse-generate` (secret mode, `verify_jwt=false` + `requireMode('secret')`)

Sibling of `fortune-generate`, reusing its exact chassis (`_shared/fortune.ts` patterns):

- Body `{date?, locale?, force?}`; default `nextUtcDate()`, `'en'`.
- Computes the date's pillar via existing `_shared/pillar.ts` (`dayPillar(date)` — the date's own pillar, not a birth bucket).
- ~15 sync `generateContent` calls (`FORTUNE_CONCURRENCY`-style pool of 6): model `gemini-3.1-flash-lite`, temp 0.4, pinned seed (17 — next in the 7/11/13 series), `responseSchema` from `schemas/pulse.v1.json`, prompt `prompts/pulse/v1/` (versioned artifact; scholar-friend voice; the no-medical/financial banned-claims audit via existing `bannedHits`).
- Idempotent + resumable (reads existing `(pulse_date, locale)` rows, skips unless `force`); **HTTP 500 `pulse_incomplete`** naming missing keys (mirror of `fortune_incomplete` so ops treats them identically); one `worker_telemetry` row per run.
- MVP generates palm keys (7) + face keys (8); a `PULSE_FEATURE_KEYS` const in `_shared/pulse.ts` is the single source both for generation and the CHECK constraint's companion validation.

**Cost:** ~15 calls × (~1K in / ~400 out) Flash-Lite ≈ **$0.03–0.06/day, DAU-independent.** (Existing fortunes: ~$0.25–0.50/day. Batch API −50% remains a shared future lever — `buildFortuneBatch` already exists unwired.)

## §4 Deterministic math: `_shared/pulse.ts` + client mirror `app/src/features/pulse/pulseMath.ts`

Mirrored byte-identically (the pillar-math precedent; a shared Deno/jest test vector file keeps them honest):

1. **`pulseFeatureKey(userId, dateKey, availableKinds)`** — the pool is derived from `subject_profiles.kind` values only (`palm_* → 7 palm keys`, `face → 8 face keys`; union when both) so server fan-out and client agree without reading narratives. Selection = FNV-1a hash(userId + dateKey) over the pool with a **no-repeat window of 5** (walk back 5 dateKeys, exclude, pick from remainder). Client-side only: if the picked key is absent from the loaded reading (edge case), fall forward deterministically to the next key — the push named a real feature in the overwhelming case.
2. **`chapterFor(featureKey, geometryHash, date)`** — Line Cycles: chapter length 21–45 days seeded by (featureKey, geometryHash from the user's `feature_hash` — already stored on `feature_sets`); returns `{index, name_key, starts_on, ends_on, is_boundary}`. Chapter names/readings come from a **static versioned catalog** `kb/cycles/v1/` (pure content, zero model calls; ~8 chapter archetypes × 15 features). Boundary day = `date == starts_on`.
3. **`handDistanceLocal(sig_a, sig_b)`** — client mirror of `_shared/features.ts handDistance` for the seal ritual. Check-in threshold `SEAL_MATCH_THRESHOLD = 0.035` (looser than the pipeline's 0.025 — false negatives are hostile here, stakes are lower; provisional, calibrated with the other thresholds at P12 evals, Decision-Log on install).

## §5 Edge function: `pulse-fanout` (secret; the missing C.10 daily producer)

Every 15 min: select devices in the **08:30–08:44 local window** (`devices.timezone`, the `Intl` resolution pattern already in `push-dispatch`), join `profiles` (locale) + `subject_profiles` (kinds; users with ≥1 canonical only) + today's ledger row (skip if already sealed — don't push at someone mid-streak-day), compute `pulseFeatureKey`, then `renderNotification('daily_pulse', {feature_label, weekday, is_boundary}, locale)` → `enqueue_push_deduped`.

- New template type **`daily_pulse`** in `_shared/notif-templates.ts` (cap_class `marketing`; copy per 02 §9; boundary variant when `chapterFor(...).is_boundary`). The existing `daily_fortune` pref key governs it (settings copy already says "daily fortune" — one pref, one morning push).
- Everything downstream exists: dedupe key/day, **1/day marketing cap**, quiet hours, Expo batching, DeviceNotRegistered pruning. This function is a *producer only*.
- Optional same-function leg (RF4.T4): winback — `profiles.paywall_declined_at` older than 24h, no premium, winback not yet sent (the `notification_log` dedupe makes "once-ever" cheap to enforce).
- Batch hygiene: chunked scan (500 devices/query) with a time budget like `push-dispatch`'s `BUDGET_MS`.

## §6 Client architecture (no new state libraries — the local-state + hooks pattern stands)

| Module | Role |
|---|---|
| `app/src/lib/pulseData.ts` | `loadTodayPulse(featureKey, locale)` → `pulse_templates` by local date key (existing `localDateKey()`), locale fallback chain, `null` → honest error state. `loadPulseArchive(days)` for the premium archive. |
| `app/src/lib/dailyLedger.ts` | Replaces `fortuneOpens.ts` as truth: `recordOpen/ recordReveal / recordSeal` → `rpc('record_daily_open')`; returns streak. Keeps a thin AsyncStorage write-behind (`palmly.daily_ledger_cache.v1`) so the week strip renders instantly offline and reconciles on next success. **One-time migration:** replay `palmly.fortune_opens.v1` into `user_fortunes` (bulk owner-RLS insert, capped 400 days), then set `palmly.opens_migrated.v1` — nobody's streak resets. |
| `app/src/features/pulse/usePulse.ts` | The screen hook (mirrors `useEntitlement` shape): resolves reading→kinds→featureKey→template→ledger in one effect with the `active` cancellation flag; exposes `{state, pulse, chapter, streak, reveal(), seal(method)}`. |
| `app/src/features/pulse/*` | `PulseCard/PulseSeal/ChapterChip/ChapterSheet/BoundaryBanner/MilestoneMoment` per 02 §2. |
| `app/src/features/checkin/*` | `SealCheckIn` + `useSealCheckIn.native.ts`: guided-capture engine in `mode:'checkin'` — landmark stream → `handSignature` → `handDistanceLocal` vs stored signature (from the already-fetched reading's `feature_sets.geometry.hand`; add `geometry` to the `loadReading` select — owner RLS already permits). **Never calls takePhoto/upload; the mode physically lacks those paths.** Web/unsupported → entry hidden (capability flag, like `FACE_READING_ENABLED`). |
| `app/src/lib/capabilities.ts` | `PULSE_ENABLED` build flag for staged rollout. |
| Gating | Client-side entitlement branch exactly like `FortuneCard` (templates are shared non-secret content; the server-402 pattern stays reserved for per-user paid compute: chat/compat). |

Fortune surfaces untouched except: `FortuneHome` recomposition (02 §3), `WeekStrip` re-pointed to `dailyLedger`, and `FortuneCard` elevation demotion.

## §7 Failure & edge behavior (states never lie)

| Case | Behavior |
|---|---|
| Template row missing (generation gap) | `null` → error card + retry (existing fortune pattern); `pulse_incomplete` alarms via existing ops thresholds |
| No reading yet | Today keeps `FirstRunState`; no pulse surfaces anywhere |
| No birth date | Fully functional (date-pillar keyed); almanac keeps its own `generic` behavior |
| Offline cold open | Ledger cache renders strip+streak; pulse card shows error-retry (no fabricated reading); seal queues nothing (retry on reconnect via next `record_daily_open`) |
| Clock skew / timezone travel | RPC's ±1-day window absorbs it; streak math is server-side and date-keyed |
| Two devices same day | RPC idempotent upsert; `first_seal_today=false` on the second |
| Seal mismatch | Copy blames light/angle only; tap fallback always counts the day |

## §8 Security & privacy posture

- No new attack surface on user data: one SECURITY DEFINER RPC (date-clamped, uid-scoped, `search_path=''` — house style), one shared-content table, additive columns behind existing RLS. No storage writes anywhere in the feature. No cross-user reads (matching stays within-account, per the standing privacy rule).
- Rate limits: `record_daily_open` is cheap and idempotent — reuse `check_rate_limit('daily_open', uid, 60, 1h)` failOpen for hygiene.
- The seal ritual processes frames in memory on-device only; acceptance gate 02 §10.4 makes "no frame persisted/uploaded" a code-inspection checklist item.

## §9 Analytics (extend the typed `AnalyticsEventMap`)

`pulse_revealed {feature_key, method: 'tap'|'palm', streak, premium}` · `pulse_sealed {method, matched, attempt_ms}` · `chapter_viewed {feature_key, boundary}` · `milestone_reached {day}` · `paywall_viewed.trigger` union += `'pulse_full'|'cycle_boundary'|'streak_milestone'` · `push_opened {type}` finally gets its emitter (notification response handler — the one `expo-notifications` client gap worth closing here).

## §10 Test plan (house conventions)

- **Deno** (`supabase/functions`, colocated `.test.ts`): `pulse.test.ts` (selection determinism + no-repeat window + kind pools; chapter boundaries; catalog completeness), `pulse-generate` (schema-valid/reject, resumability, incomplete error — mirror `fortune.test.ts`'s 4), `notif-templates` additions, fan-out window/skip-sealed logic with injectable clock.
- **Node vs deployed schema** (`supabase/tests/*.mjs`): `pulse_templates` PK/RLS read, `user_fortunes` additive columns + RPC (idempotency, date clamp, streak walk incl. gap-break, two-device day), `paywall_declined_at` owner write.
- **Jest** (`app/`): pulseMath mirror vectors (shared JSON fixture with the Deno side — the pillar-math precedent), `usePulse` state resolution, ledger migration replay, `handDistanceLocal` vectors.
- **Live eval** (`eval/rf.ts --live`): one real generation day — 15 schema-valid templates, no banned claims, essence names the feature.
- **Device legs:** seal ritual on the S20+ (match, mismatch-ladder, tap fallback), push land at 08:30 in 2 simulated timezones, reduce-motion + TalkBack pass on the reveal.

## §11 Rollout

1. Ship schema + generation first (dark: nothing reads it) → observe 3 nightly runs' telemetry.
2. Client behind `PULSE_ENABLED` → dev/preview builds → device legs → flip on.
3. Fan-out last (needs real streak data to avoid pushing at day-0 users) — staged: internal devices → all.
4. Post-launch (H8-dependent): conversion readout on `pulse_full` vs `fortune_full`; then the deferred layer (pair dailies, streak insurance, per-attribute template variants ×3 ≈ 45 rows/day, zh locale, Batch −50%).
