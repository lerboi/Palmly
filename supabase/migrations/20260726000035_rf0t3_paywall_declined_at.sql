-- RF0.T3 (Audit-5 · 03 §2.4) — the win-back decline, server-side.
--
-- `_shared/notif-templates.ts` has shipped a `winback` push template since P9, and the paywall has
-- recorded a decline since F1.2 — but the decline was written ONLY to AsyncStorage
-- (`palmly.paywall_declined_at.v1`), which no server can read. The template was therefore
-- orphaned: nothing on the backend could ever know a user had declined, so the 24h nudge could
-- never fire for anyone. This column is the missing half.
--
-- Expand-contract / additive only: one NULLable column, no default, no backfill, no drop or rename
-- — safe against the single pre-launch DB (Decision Log 2026-07-14) and every deployed reader. The
-- existing `profiles_update_own` policy already scopes writes to `id = auth.uid()`, so the client
-- writes its own decline and can touch nobody else's; no new policy, no new grant, no RPC.
--
-- The local key stays as-is. It is the instant, offline-safe read for anything client-side; this
-- column is what the fan-out (RF4.T4) selects on. Two writes, one truth, neither able to lie about
-- the other's user.

alter table public.profiles
  add column if not exists paywall_declined_at timestamptz;

comment on column public.profiles.paywall_declined_at is
  'When this user last dismissed the paywall (Audit-5 RF0.T3, 03 §2.4). Written by the client '
  'alongside the local key; read by the pulse-fanout win-back leg (>24h old, not premium, never '
  'sent) so the long-orphaned `winback` notification template can finally fire.';
