# Palmly — Backend Audit

**Date:** 2026-07-15
**Scope:** the entire backend surface — 17 migrations, 17 deployed Edge Functions, `_shared/` libraries, prompts/schemas/KB, both test suites, live staging state, and the app↔backend integration seam.
**Method:** read of all planning docs (`mvp_spec.md`, `Backend-specs.md`, `MVP_Buildplan.md`, `HowItWorks.md`, `Human-tasks.md`, `docs/ENVIRONMENT.md`); full code audit of `supabase/migrations/` + `supabase/functions/` + `app/src`; **live verification against the staging project** (`rphtdgoggsldshtdbkaj`) via the read-only Supabase MCP (tables, RLS flags, function ACLs, cron jobs, queue metrics, advisors, logs); static census of both test suites.
**Honest caveat:** the Deno (133 tests) and Node (100 tests) suites could **not be re-executed on this Mac** — Deno is not installed and `.env.staging` (staging DB credentials) exists only on the original Windows dev machine. The last recorded green run is 2026-07-14 (Deno 130/130, Node 100/100). Everything else below was verified directly.

> **➡️ Fixes are tracked in [`Backend-audit-Tasks.md`](./Backend-audit-Tasks.md)** (the B0–B22 checkbox
> ledger; loop prompt in `Planning/Prompt`). **Read its ⚠️ AUDIT ERRATA table before acting on any
> file:line cite below** — a 2026-07-17 recon pass verified every anchor against the tree and found four
> cites naming files that have never existed, plus a caveat correction: on the Windows dev machine **both
> suites DO run** (Deno **133/133** green; Node **96/100** — 4 stale global-count assertions, no product
> bugs). This audit remains the authority on *what* each finding claims; the repo is the authority on
> *where* it lives.

---

## 1. What Palmly is (understanding check)

An AI mobile app (Expo/React Native) that reads a user's **palm (手相)** and **face (面相)** from phone photos using **Chinese/Asian metaphysical tradition as the primary framework** — explicitly not Western astrology with Asian motifs. It is positioned as entertainment/self-reflection (no health/medical/financial claims — an App Store compliance requirement, enforced in prompts and output guards).

The product stands on two legs that solve two different problems:

1. **P1 — a trustworthy reading** (acquisition-quality): capture → reading must be fast, smooth, and — the hardest requirement — **consistent across repeat scans of the same hand**. A palm is a fixed physical fact; drift destroys credibility.
2. **P2 — a designed-in viral loop** (growth): branded screenshot-optimized result cards + "compare with a friend" invites → web teaser → install → deferred deep link → compatibility reveal. This is an *acquisition* engine (K-factor > 0 lowers CAC).
3. **Retention** is a *separate* mechanism: the daily almanac fortune (老黄历-style, BaZi-lite day-pillar buckets), progressive depth unlock, and premium grounded chat.

**Monetization:** the complete first palm+face reading and the first compatibility are free (never paywall the "wow"); subscription (monthly+annual, no trial) unlocks the full fortune calendar, unlimited compatibility, deep-dive sections, chat, and history.

**Backend architecture (per `Backend-specs.md`):** Supabase (Postgres+RLS, Auth anonymous-first, Storage, pgmq queues, pg_cron, Realtime Broadcast, pgvector) + Gemini (`gemini-3.5-flash` vision extraction / `gemini-3.1-flash-lite` all text / `gemini-embedding-001`) + RevenueCat + AppsFlyer + Expo Push + PostHog/Sentry. The trust mechanism is a **two-pass pipeline**: pass 1 extracts enum-bucketed structured features from the image (schema-constrained, temp 0, seeded, 2-vote); pass 2 writes the narrative from **features + KB only, never the image**; repeat scans are **recognized** (subject identity matching → canonical feature-set reuse) rather than re-interpreted.

---

## 2. What is actually built and deployed (live-verified)

| Surface | State (verified live 2026-07-15) |
|---|---|
| Migrations | **17/17 applied** on staging; local files match the applied list exactly |
| Tables | 20 public tables, **RLS enabled on all** (18 spec tables + `worker_telemetry`, `notification_log`) |
| Edge Functions | **17 ACTIVE** (6 `verify_jwt=true` user-mode; 11 worker/public/HMAC) — matches `config.toml` |
| Queues (pgmq) | 5 queues live (`scan_jobs`, `narrative_jobs`, `compat_jobs`, `push_jobs`, `cleanup_jobs`), currently empty |
| pg_cron | 5 drain jobs, healthy (47,831 runs, 100% succeeded) — **but all still call the `drain_stub` no-op** |
| Storage | `scans` (private) + `cards` (public) buckets exist with owner-path RLS |
| Realtime | scan + compat status broadcast triggers and both `realtime.messages` RLS policies present |
| KB | 141 `kb_chunks` loaded (94 palmistry + 47 physiognomy), full keyed coverage — **0/141 embeddings populated** |
| Extensions | pgmq 1.5.1, pg_cron 1.6.4, pgcrypto, vector 0.8.2, vault installed; **pg_net NOT installed** (needed for cron→worker wiring) |
| Data | 107 auth users / 106 profiles (one pre-trigger emulator session — known caveat), 2 telemetry rows, no edge-function invocations in the last 24 h |
| AI pipeline | `worker-narrative` **live-proven end-to-end** on 2026-07-14 (real `gemini-3.1-flash-lite` reading from a seeded feature-set) |

**Prompts/versioning discipline is real:** all five prompt families (`extraction/narrative/compat/fortune/chat` v1) are compiled `.md → .generated.ts` and statically imported (no inline fallbacks); readings/compat rows are stamped with `model_id`/`prompt_version`/`kb_version`(+`algorithm_version`); schemas are versioned JSON with server-side Ajv re-validation on top of Gemini's constrained decoding.

**The build ledger's honesty tiers check out.** Everything `MVP_Buildplan.md`/`HowItWorks.md` claims as "built + verified" I could confirm exists and (where checkable read-only) matches the claim. The project does not have a falsely-green ledger — deviations below were almost all *already flagged* by its own notes; this audit's contribution is the bug list in §4–5, most of which is **not** in the ledger.

---

## 3. Does what's built work as expected?

### 3.1 Proven working
- **Schema/RLS/queues/realtime/storage**: verified live; the Node harness (100 tests incl. 13 adversarial RLS proofs asserting SQLSTATE 42501, invite/compat lifecycles, webhook idempotency, purge/lifecycle sweeps, kb_search ranking) ran green against this exact deployed schema on 2026-07-14.
- **The two-pass AI pipeline** (extraction → consistency → narrative): unit-tested hermetically (133 Deno tests with injected Gemini mocks) and the narrative leg proven live. The consistency design is actually *stronger* than spec — the narrative's section selection/order/tags/feature_refs are pure functions of the features (`selectClaims`); the model only writes prose onto a deterministic skeleton.
- **Compatibility scoring**: deterministic, symmetric, bounded, version-stamped code (`compat.v1`); the model explains the score, never chooses it — exactly per spec §7.
- **Security posture of the function matrix**: user-mode functions require platform JWT verification; worker functions gate on the service key in-function; a live posture check (no-JWT → 403 / no-key → 403 / key → 200) was recorded on deploy day.

### 3.2 Not currently re-verifiable from this machine
- Neither test suite can run here (no Deno binary; no `.env.staging`). **Recommendation:** install Deno on this Mac and copy `.env.staging` over, then re-run both suites — the Deno suite has grown to 133 tests on disk vs the 130 last recorded, so 3 tests have never appeared in a recorded green run.

### 3.3 Test coverage gaps (real, worth closing)
1. **No test exercises any Edge Function HTTP handler** (`index.ts` of all 17). Deno tests cover only `_shared/*`; Node tests speak only SQL. Handler auth/routing was verified by one-off live curls only.
2. **Storage is tested at SQL-policy level only** — no actual upload/signed-URL/delete round-trip through the Storage API.
3. **The cron→worker invocation path has no test** (it also doesn't exist yet — see F1).
4. Untested `_shared` modules: `context.ts`, `telemetry.ts`, `palette.ts`.
5. Live-Gemini paths (image extraction, caching) untestable until H4c (paid tier).

---

## 4. Does it match the spec? — Critical & high findings

Severity reflects *impact when the pipeline goes live*, since almost nothing is user-facing yet. IDs are for cross-referencing; file:line cites are from the audited source.

### 🔴 CRITICAL

**C1 — `drain_stub` is callable by any client with the anon key (confirmed live in ACLs).**
`supabase/migrations/20260712000004_queues.sql:38-57` never revokes the default PUBLIC EXECUTE (every later SECURITY DEFINER migration does). Live `pg_proc` ACL confirms `anon` and `authenticated` can execute. It is SECURITY DEFINER in the exposed `public` schema, so `POST /rest/v1/rpc/drain_stub {"p_queue":"scan_jobs","p_batch":10}` with only the publishable key **reads and archives up to 10 messages from any pgmq queue**, silently destroying other users' queued scan/compat/push jobs and polluting telemetry. Fix: same revoke/grant treatment as migration 0006 (new migration; also drop the stub entirely once cron is rewired). The security advisors also flag this function (plus `handle_new_user`, `broadcast_*`, `is_pair_member`, `resolve_awaiting_compat`, `thread_owner`) as RPC-exposed SECURITY DEFINER — revoke EXECUTE from `anon`/`authenticated` on everything that isn't required for RLS evaluation.

**C2 — The live cron is actively destroying real jobs.**
Migrations 0011/0013/0014 already enqueue *real* messages (`request_compat`, `resolve_awaiting_compat`, `enqueue_push*`), and the 5 live cron jobs archive those queues into the trash every 10–15 s via `drain_stub`. Any early worker deployment or end-to-end test that races the stub loses jobs. This is half of F1 (cron→worker wiring) but deserves its own line: **the current state isn't just "not wired", it's destructive**. Interim option: disable the drain crons for `compat_jobs`/`push_jobs` until the real wiring lands.

**C3 — RevenueCat webhook signature scheme is very likely wrong → all paying users would be locked out.**
`_shared/revenuecat.ts:38-59` implements a Stripe-style `t=<ts>,v1=<hexHMAC>` signature header. RevenueCat's shipped webhook auth is a **static `Authorization` header value** configured in the dashboard — not a t/v1 HMAC scheme. If RC doesn't send this exact header, every webhook 401s → `subscriptions` never updates → chat/compat server gates permanently 402 paying customers. The HMAC *implementation* is excellent (raw-body, constant-time, replay window); the *scheme* must be verified against current RC docs before H8. Highest-blast-radius single item in the codebase. (Also: `REVENUECAT_WEBHOOK_SECRET` is unset on staging — expected pre-H8.)

**C4 — The D2 privacy promise is currently dead code.**
There is **no cron for `cleanup`** (or `fortune-generate`, or `ops-alerts`) — live `cron.job` contains only the 5 queue drains. The 24 h photo-deletion machinery exists (`20260713000016_data_lifecycle.sql`) but nothing invokes it. Additionally the deletion predicate deviates from spec §9: it deletes 24 h after *scan creation* (not after successful extraction), does not delete failed scans immediately, and **scans stuck in non-terminal states (`uploaded`/`queued`/`extracting`) are never swept** — an abandoned upload retains the crop indefinitely, contradicting the "analyzed, then deleted — usually within a day" marketing claim. Fix with the cron wiring + a predicate that covers stuck/failed scans.

**C5 — Gemini key is free-tier (H4c).**
Confirmed by the ledger: explicit caching returns `429 FreeTier limit=0`. Two consequences: image extraction can't be validated, and the free tier *trains on submitted content* — disqualifying for real palm/face photos. Hard production blocker, human-owned, already tracked.

### 🟠 HIGH

**H1 — Face repeat-scan consistency is structurally broken.**
`schemas/face_features.v1.json` has no `line_geometry`; `deriveGeometry` reads only palm lines → face geometry is all-null → `geometryDistance` = ∞ → **a face can never match its subject profile**. Every repeat face scan takes the full new-subject path (2–3 paid votes + a new narrative — drift risk, the exact thing P1 forbids), and the follow-up `subject_profiles` insert violates `unique(user_id,'face')` — an error `worker-scan/index.ts:166` silently ignores. Needs a face-specific geometry signature (e.g. landmark ratios from the face schema) + handling of the insert error.

**H2 — Worker idempotency/redelivery holes (double Gemini charges, status regressions).**
- `worker-narrative/index.ts:107-148`: no "reading already exists for (feature_set_id, depth_level)" guard → crash after the model call → visibility-timeout redelivery → second charge + duplicate `readings` row (`worker-compat` has this guard; the other two workers don't).
- `worker-scan`: if the final `archive` fails after enqueueing narrative, redelivery re-extracts, *matches* the just-created subject, and sets `status='matched'` — potentially regressing a `narrating`/`complete` scan mid-pipeline (broadcast fires the regression to the client) while a duplicate narrative job is still in flight.
- `vt=60s` is too short for a 2–3-vote extraction with retries/backoff → concurrent duplicate processing of the same scan and `read_ct` creeping toward dead-letter while the first worker is still succeeding.

**H3 — `claim_invite` double-claim race.**
`20260713000010_claim_invite.sql:20-33` reads the invite without `FOR UPDATE`; two users claiming concurrently under READ COMMITTED both pass the status check, the second UPDATE overwrites `invitee_id`, and **two compatibility pairs are created** — "single-use" violated. One-line fix (`select … for update`).

**H4 — `record_rc_event` can permanently drop an entitlement update.**
`20260713000009_rc_event.sql:22-40`: the event insert (consuming the `rc_event_id` idempotency key) happens *before* the `exists(profiles)` guard — a webhook for a not-yet-provisioned or merged-away UUID skips the subscriptions upsert, and every RC retry then dedupes to a no-op forever. Also `rc_event_id` is nullable (NULL never conflicts → non-idempotent), event **ordering** is unguarded (a delayed RENEWAL retry arriving after EXPIRATION overwrites newer state), and `TRANSFER` grants the destination without revoking the source. Related: `entitlement.ts:18` treats `expires_at: null` as premium-forever while status ≠ expired.

**H5 — Chat sends the *oldest* 8 messages as history.**
`chat-send/index.ts:96` orders ascending with `limit(8)`, then `chat.ts:149` slices the last 8 *of those*. Any thread longer than 8 turns permanently converses against its first 8 messages. Order descending + limit + reverse.

**H6 — push-dispatch loses jobs and never records receipts.**
`push-dispatch/index.ts:47,63`: all read jobs are archived regardless of ticket outcome — a failed Expo batch (5xx) silently drops those notifications. Spec §4 receipts are never fetched, so `DeviceNotRegistered` (predominantly a receipt-time error) pruning is largely ineffective. Also N+1 device queries and a hard 100-jobs-per-15s ceiling (a 10 K-user fortune send ≈ 25 min) with no loop-until-empty.

**H7 — Account-deletion can orphan biometric images irrecoverably.**
`account-delete/index.ts:17-27` purges the DB first, then best-effort removes storage objects; a storage failure leaves palm/face crops in the bucket with **zero** remaining DB reference and no retry path (cleanup sweeps work off `scans` rows, now gone). GDPR/D2 exposure. Same family: `merge_accounts` (`0008:34`) re-parents scans but leaves objects under `{loser_id}/…` (survivor can't read them; orphaned on loser deletion), and `deletion_log.completed_at` is written *before* storage work actually completes (`0016:55,97`). Fix ordering: collect paths → delete objects → then purge rows; log completion last.

**H8 — Share cards are published publicly before any user share intent.**
`worker-narrative/index.ts:148` fires `card-render` for **every** completed reading; `render.ts:63-68` writes the PNG (with display-name attribution) to the **public** `cards` bucket. Spec §13/§9: the public bucket contains only *user-initiated* share cards. Compounding it, the advisors flag the `cards_public_read` policy as allowing **bucket listing** (public buckets don't need a broad SELECT for URL access). Render on share intent instead (or keep pre-render but store private and copy/publish on first share), and drop the listing policy.

**H9 — The invite loop's guaranteed fallback doesn't close.**
The teaser prints a human short code (`deriveShortCode`), but **no endpoint can resolve a short code** — only the full token hashes correctly in `invite-claim`. The spec's "always present, guarantees the loop closes" manual path is UI theater right now. Also missing per spec §13: **rate-limiting on `invite-claim`** (explicitly required — it's an unauthenticated-adjacent brute-force surface), and on invite-create/chat-send/compat-request generally.

**H10 — `sweep_stale_anon` deletes other people's data.**
`0016:104-125`: purging a stale anonymous user cascades `compatibility_pairs` on either side → an anonymous invitee who claimed but never scanned (>30 d) silently wipes the **inviter's** pair/result. Guard should consider pair membership (or reassign/tombstone), not just "no readings".

---

## 5. Medium / low findings

### 🟡 Medium

| ID | Finding | Where / failure mode |
|---|---|---|
| M1 | **Zero-cost repeat scan not achieved** — geometry is derived from extraction vote A, so every repeat scan still costs one 3.5-Flash call (~$0.011). Spec §6.6.3 matches on capture-time landmarks *before* any model call. Known deferral (needs P4 capture geometry), but it weakens both the cost model (§11.3 lever 1) and the "recognized, not re-read" latency story. | `worker-scan` + `_shared/consistency.ts` |
| M2 | **Transient store failures double-charge Gemini** — `store_failed` → retry → full re-extraction/regeneration; no feature_hash short-circuit on redelivery. | `worker-scan/index.ts:164`, `worker-narrative/index.ts:144` |
| M3 | **fortune-generate is a 61-call sequential loop** in one invocation (Batch API + poller not implemented; `buildFortuneBatch` exists unused). Wall-clock risk; partial completion isn't retried until the next night. EN-only. | `fortune-generate/index.ts:35-56` |
| M4 | **card-render renders text-less PNGs** — `card-render/fonts/` doesn't exist and `loadFonts()` swallows the miss; headline/chips/labels are dropped. Also resvg-wasm is fetched from unpkg.com at cold start (external runtime dependency). | `render.ts:14,22-27` |
| M5 | **Explicit Gemini context caching not implemented** — system prefixes sent inline every call; only implicit caching can ever hit. The §6.4 cost model (~80–90% off the big token block) depends on it. Blocked by H4c anyway; implement when the paid key lands. | `_shared/gemini.ts` |
| M6 | **Invite content spoofing surface** — `invite-create` accepts arbitrary `context.inviter_name`/`card_image_url` that `invite-page` renders on the trusted domain (XSS-escaped, but phishing framing/OG-image unconstrained; no length caps, no URL allowlist). | `invite-create/index.ts:22-31` |
| M7 | **K-factor `clicked` inflation** — messenger link-preview crawlers flip `created→clicked`; 5-min CDN caching also undercounts real repeat clicks. Filter known bot UAs; move `clicked` to the CTA tap beacon. | `invite-page/index.ts:47-48` |
| M8 | **compat-request free-tier gate race** — non-atomic count→act (two parallel first requests both pass); plus `ctx.userId` string-interpolated into a PostgREST `.or()` filter (safe only while verify_jwt guarantees a UUID sub). | `compat-request/index.ts:23-29` |
| M9 | **Prompt-injection via display_name** — `worker-compat` passes raw `profiles.display_name` into the model payload; a hostile name is an injection channel into prose shown to the *other* person. Sanitize/cap names at the model boundary. Chat deflection regexes are English-only (bypassable); acceptable for EN launch, revisit at localization. | `worker-compat/index.ts:77-91` |
| M10 | **Two push enqueue paths** — `enqueue_push` (0013) bypasses the 0014 dedupe/cap gate entirely; both are live and service-role-granted. Deprecate the raw one. Marketing cap is also check-then-insert (race) and UTC-day based. | migrations 0013/0014 |
| M11 | **`config.toml` drift vs live** — local config has `enable_anonymous_sign_ins=false`, `enable_manual_linking=false`, no Turnstile; live staging has anon sign-ins ON (H5 cleared). Harmless until someone pushes config; align it. | `config.toml:178-217` |
| M12 | **App↔backend contract gaps** (will bite at P6 wiring): (a) `RevealView` renders `section.teaser` for locked sections but `reading_sections.v1.json` has no `teaser` field and requires full `body` — as-is the tease has no data source and mishandling would leak premium prose; (b) chat `citations` exist only in the HTTP response, never persisted to `chat_messages` — a reloaded thread loses the "cites your…" trust line; (c) `PrivacyCenter`'s "Delete my scan photos now" targets `request_image_deletion`, which is service-role-only with **no Edge Function wrapping it** — no callable path. | `app/src/features/*`, `0016` |
| M13 | **5 RLS policy columns unindexed** (spec §3.3 "always index policy columns"): `compatibility_results.pair_id`, `chat_threads.user_id`, `share_cards.user_id`, `devices.user_id`, `invites.invitee_id` — advisors confirm the unindexed FKs. Cheap migration. | `0001` |
| M14 | **`claim_invite` creates a pair for `kind='generic'` invites too** — spec ties pair creation to compatibility invites. | `0010:36-40` |

### 🟢 Low / informational
- `hello` function still deployed (skeleton; echoes decoded-but-unverified JWT sub). Remove before launch.
- Internal "secret" gate is plain `===` against the service-role key (not timing-safe — theoretical; the secret *is* the key, so the gate is exactly key-possession).
- `profiles.updated_at` never auto-updates (no moddatetime trigger).
- Broadcast payload carries the full `scans` row (incl. `storage_path`, `capture_meta`) on an owner-only topic — no leak, just wider than "status".
- `is_pair_member`/`thread_owner` RPC-probing given a guessed UUID — standard pattern, UUID-entropy-protected.
- Invites RLS reads `is_anonymous` from the JWT — a just-upgraded user is blocked from creating invites until token refresh (fails safe; worth a client-side refresh after linking).
- Leaked-password protection disabled (auth advisors) — moot while auth is anon+OAuth/OTP, enable anyway.
- App Store ID placeholder `id0000000000` in invite-page store routing (H7-gated).
- Enum comparison is case-sensitive vs spec's "case-insensitive" — moot (Ajv rejects wrong case first).
- `20260712000003_storage.sql` uses path segment `[1]` not spec's `[2]` — **the spec is wrong**, the SQL is right (`storage.objects.name` excludes the bucket prefix). Documented judgment call.
- `chat_messages` has no client INSERT policy (writes go through `chat-send` service-role) — a sound narrowing of spec §3.3, keeps the entitlement gate authoritative.

---

## 6. Verdict

**Architecture fidelity: excellent.** The implemented backend is a faithful — in places *stronger-than-spec* — realization of the two product priorities. The consistency system (enum schemas + 2-vote + subject matching + deterministic claim skeleton + version stamping everywhere) is genuinely differentiated engineering for P1, and the invite/compat/webhook spine for P2 is race-aware (canonical pair ordering, hash-at-rest tokens, idempotent claim) in ways most MVPs are not. Test discipline (233 tests across two suites, adversarial RLS proofs, hermetic model mocks) is far above typical MVP standard.

**Operational readiness: not yet a running system.** Four missing links mean no user could get a reading end-to-end today even with the app finished: no `scan-create`/`scan-ingest` entry point, cron drains still point at a (publicly callable — C1) no-op stub, no cleanup/fortune/ops crons at all, and the Gemini key is free-tier. All four are known and tracked in the ledger; C1/C2 and the §4–5 bug list above are this audit's net-new findings.

**Biggest risks in order:** C3 (RevenueCat scheme — verify before building the paywall on it), C1/C2 (queue integrity), C4 (privacy-promise machinery unwired), H1 (face consistency), H2 (double-charging/regression under retry), H7/H8 (biometric-data handling gaps).

---
---

# ⬜ NOT YET BUILT — required by the specs

> Everything in this section is *already mandated* by `mvp_spec.md` / `Backend-specs.md` / the build plan — it is missing, stubbed, or explicitly parked. Ordered roughly by how much it blocks.

### A. Pipeline entry & plumbing (blocks everything)
1. **`scan-create`** — quota check (10 scans/day/user — currently enforced *nowhere*), `scans` row insert, signed upload URL. (Buildplan P4.T4)
2. **`scan-ingest`** — storage-upload webhook → `queue_send('scan_jobs')`. Nothing in the repo enqueues scan jobs in production today.
3. **Cron→worker wiring** — new migration: enable `pg_net`, reschedule the 5 drains from `drain_stub` to `net.http_post` against the deployed workers (service key via Vault/GUC — the security-sensitive design the ledger parked), **plus the missing schedules**: hourly `cleanup`, nightly `fortune-generate`, periodic `ops-alerts`. Kill + de-expose `drain_stub` in the same migration (C1/C2).
4. **KB embeddings population job** — 141 chunks × `gemini-embedding-001` (1024-dim) so chat's pgvector `kb_search` leg goes live.
5. **Paid Gemini tier (H4c, human)** — unblocks real image extraction, the 2-vote consistency validation on real palms, explicit context caching (M5), and the Batch API.

### B. Viral loop completion
6. **Manual invite-code claim path** — endpoint resolving the teaser's short code (H9), completing spec §8.2's guaranteed fallback.
7. **Rate limiting** on `invite-claim` (spec §13 explicit), `invite-create`, `chat-send`, `compat-request`.
8. **Teaser on the real domain** (H6 human: `palmly.app` + DNS) + real App Store ID + Turnstile CAPTCHA on anonymous sign-in.
9. **Share-card correctness**: bundle Noto TTFs into `card-render` (text-less PNGs today), self-host the resvg wasm, and move publication to share-intent (H8).

### C. Retention layer completion
10. **Push enqueuers** — only `compat_complete` is wired. Missing per spec §10: reading-ready (backgrounded pipeline), invite-accepted, the timezone-sharded daily-fortune fan-out, solar-term events, day-1–3 subscriber onboarding, paywall-decline win-back. Plus **Expo receipt polling** and not archiving failed batches (H6).
11. **Fortune Batch API + poller** (M3) and locales beyond `en`.
12. **Depth-level 2+ generation path** — an entitlement-gated endpoint that enqueues deeper sections from the same stored feature-set (schema/worker already accept `depth_level`; nothing requests it). Progressive unlock is a headline retention mechanic (spec §4.5) with no trigger today.
13. **Chat SSE streaming transport** (currently sync JSON; parked on device availability).

### D. Monetization & account lifecycle
14. **RevenueCat end-to-end** (H8 human): account/products/entitlement + webhook secret + **verify the signature scheme (C3)** + sandbox purchase → server-gate proof.
15. **`account-delete` vendor legs** — RevenueCat subscriber deletion + AppsFlyer erasure request (TODOs), plus the storage-ordering fix (H7).
16. **Client account-linking flow** (Apple/Google `linkIdentity`, phone OTP) wired to `account-merge` — backend exists, no client caller.

### E. App↔backend wiring (the app is 95% fixture-driven today)
The only live client calls are anonymous auth + analytics. Every built screen (reveal, analyzing, fortune, chat, history, settings, privacy) renders `PREVIEW_*` fixtures; `useScanStatus` (fetch-then-subscribe realtime hook) is written but mounted nowhere; `configureRevenueCat()` is a no-op stub never called; push-token registration, storage upload, entitlement reads, invite claim, and the privacy actions have no client code. Also fix the three contract gaps before wiring (M12: `teaser` field, persisted chat citations, a callable image-deletion path).

### F. Ops & launch
17. **Ops alert delivery** (Slack/email webhook — detection RPC exists, delivery is a TODO) + the worker-telemetry dashboard.
18. **CI deploy secrets** (H3/H4b-2 human) → green PR checks + auto-deploy on merge.
19. **P12 items** (untouched, correctly sequenced last): extraction eval set + Gemini-vs-Claude bake-off gate, k6 load test at the §11.2 spike shape, security pen-pass on the two unauthenticated surfaces, no-health-claims compliance sweep, store assets, beta, prod project recreation from migrations + cutover.
20. **Housekeeping**: remove `hello`; add the 5 missing RLS-column indexes (M13); align `config.toml` with live auth settings (M11); moddatetime for `profiles.updated_at`; batch-regeneration tooling for prompt/KB upgrades (§6.6.7).

---
---

# 💡 RECOMMENDED ADDITIONS — not in the specs

> Filtered hard against the spec's own scope discipline (§8): nothing here adds a new content vertical (no BaZi module, no I-Ching, no wellness bloat). Each item leans on infrastructure that already exists, and names the lever it pulls.

### 1. Invite-reward entitlement grants (virality × monetization)
Give the *inviter* one durable micro-unlock per accepted invite — e.g. one deep-dive section or one extra compatibility slot ("Your bond with Mei unlocked the Mounts chapter"). Backend cost is tiny: a counter on `invites.accepted` + a check alongside the existing two-layer entitlement gate. Directly multiplies K-factor (gives the *sender* a selfish reason to send beyond showing off) without violating the "never paywall the first experience" rule. RevenueCat isn't even needed — it's a parallel server-side grant.

### 2. Server-authoritative fortune streaks + milestone moments (retention)
`user_fortunes` already records `opened_at` and the UI already shows a streak strip — but the streak is client-cosmetic. Compute it server-side (one SQL window function), expose it on the fortune read, and emit milestone pushes (7/30/100 days) through the existing dedupe/cap gate. Optionally a single "streak restored" grace token per month — streak-repair is one of the highest-ROI retention mechanics in daily-habit apps, and this version costs no model calls.

### 3. Weekly recap share card (retention → virality bridge)
A Sunday-evening cron composes "Your week in the almanac" (best day, worst day, streak, next week's headline) from data already in `fortune_templates`/`user_fortunes` — zero new model calls — and renders it through the existing `card-render` (`share_cards.source_type` already allows `'fortune'`). Creates a *recurring* share moment; today only the one-time reading and compat cards are shareable, so the viral surface decays after week one.

### 4. 本命年 / zodiac-year + solar-term flavor in fortunes (quality, authenticity)
Deterministic code over the existing `pillar_bucket` math: flag the user's zodiac year (本命年 — a huge culturally-resonant hook for the target audience), 节气 solar terms, and 初一/十五 in the fortune payload and notification copy. Spec §10 already lists solar-term pushes; this extends the same computation into the daily content for ~zero marginal cost and materially deepens the authenticity moat (the stated differentiator vs competitors).

### 5. "Ask about today" — fortune-grounded chat chip (retention × premium conversion)
Chat grounding currently anchors on the user's reading. Add today's fortune bucket content to the grounding context and surface one daily suggestion chip ("Why is today good for negotiations?"). Bridges the two retention surfaces (fortune brings them in daily; chat is the premium habit), gives free users a *visible* daily reason to want chat, and reuses the existing grounding assembly in `chat-send` wholesale.

### 6. Remote `app_config` table (velocity/quality)
One key/value table (authenticated-read, service-role-write) for share-channel ordering (the UIUX spec already says "remote-config order"), paywall copy variants, feature kill-switches, and pipeline SLA thresholds. The UIUX/growth loop will need weekly tuning at launch; today every tweak is an app release or an EAS update. ~30 lines of backend; disproportionate iteration-speed payoff during the launch window.

### 7. Dead-letter replay + pipeline heartbeat (ops quality)
Two small service-role RPCs: `replay_dead_letter(queue, limit)` (re-enqueue dead-lettered jobs after a fix — today a dead-lettered scan is a permanently lost paid extraction and a user staring at a failed state) and a heartbeat row each worker tick so `ops_alerts()` can detect "cron silently stopped" — the failure mode this project is *guaranteed* to hit at least once given the Vault/pg_net wiring ahead. Cheap insurance on the trust-critical path.

*Deliberately not recommended:* palm-of-the-day social feeds, cross-user matching/discovery (privacy posture forbids it — `subject_profiles` matching is explicitly within-account only), full BaZi readings, web app versions, or multi-model ensembles — all violate either the scope discipline in `mvp_spec.md` §8 or the privacy positioning in Backend §9.

---

## Suggested immediate order of work (backend only)

1. **One migration**: revoke `drain_stub` from anon/authenticated + add the 5 RLS indexes + `claim_invite` FOR UPDATE + `record_rc_event` guard-before-insert (C1, H3, H4, M13).
2. **Cron→worker wiring migration** (pg_net + Vault key) incl. hourly cleanup, nightly fortune, ops-alerts — and delete the stub (C2, C4).
3. **Build `scan-create` + `scan-ingest`** (+ quota) — the pipeline's front door.
4. **Worker hardening pass**: narrative idempotency guard, scan redelivery guard, vt tuning, push-dispatch failure/receipt handling (H2, H6, M2).
5. **Face geometry fix** (H1) — before any real face traffic.
6. **Verify RevenueCat scheme** the day H8 starts (C3); fix `account-delete` ordering (H7) alongside.
7. Re-run both suites on this machine (install Deno, copy `.env.staging`) and add at least smoke tests for the 17 HTTP handlers.
