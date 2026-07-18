-- F1.T3 (frontend audit) — biometric-consent record on the profile (Backend §9).
--
-- The camera primer's three reassurance rows ("analyzed on the spot · photo deleted after your
-- reading · never used to identify you") ARE the versioned biometric-consent text. Backend §9
-- requires logging WHICH version of that text the user accepted, and WHEN — but no consent column
-- existed anywhere in the schema (verified against the live staging `profiles` before writing).
--
-- Expand-contract / additive only: two NULLable columns, no default, no backfill, no drop/rename —
-- so this is backward-compatible with the single pre-launch DB (Decision Log 2026-07-14) and with
-- every already-deployed reader. The client writes `consent_version` (a string tied to the exact
-- primer copy, e.g. 'camera_biometric.v1') + `consented_at` on the "Allow camera" accept.

alter table public.profiles
  add column if not exists consent_version text,
  add column if not exists consented_at timestamptz;

comment on column public.profiles.consent_version is
  'Version string of the biometric-consent text the user accepted at the camera primer (Backend §9, F1.T3).';
comment on column public.profiles.consented_at is
  'When the user accepted the biometric-consent text (F1.T3).';
