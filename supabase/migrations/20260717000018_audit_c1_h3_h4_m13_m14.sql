-- Backend audit fixes (Backend-audit.md §4/§5, ledger B1): C1, M13, H3, M14, H4-SQL.
-- All additive / backward-compatible — the contracting legs (rc_event_id NOT NULL, dropping the
-- raw enqueue path) are deliberately deferred to their own tasks (B15/B18).

-- ── C1 — drain_stub is executable by any client holding the publishable key ────────────────────
-- 20260712000004_queues.sql:38 never revoked the default PUBLIC EXECUTE, so
-- `POST /rest/v1/rpc/drain_stub {"p_queue":"scan_jobs"}` with only the anon key reads + archives up
-- to 10 messages off ANY pgmq queue (SECURITY DEFINER, in the Data-API-exposed `public` schema).
-- Same revoke/grant treatment as 20260712000006_queue_rpc.sql:20-25.
--
-- Scope note: the advisors also flag handle_new_user / broadcast_scan_status /
-- broadcast_compat_status / resolve_awaiting_compat, but those `return trigger` and cannot be
-- invoked over the Data API. is_pair_member/thread_owner ARE callable but are RLS helpers — their
-- policies evaluate AS `authenticated`, so revoking that grant would break RLS (audit: "everything
-- that isn't required for RLS evaluation"). kb_search is granted to `authenticated` intentionally
-- (0015:39) and is not SECURITY DEFINER. drain_stub is the only genuinely over-exposed function.
--
-- The 5 cron drains (0004:60-64) keep working: pg_cron runs them as the scheduling role
-- (postgres/owner), whose EXECUTE is independent of the PUBLIC grant. Never revoke from the owner.
revoke all on function public.drain_stub(text, int) from public, anon, authenticated;
grant execute on function public.drain_stub(text, int) to service_role;

-- ── M13 — index the RLS policy columns (Backend §3.3 "always index policy columns") ────────────
-- Verified unindexed on live staging: each of these tables carries only its pkey (+ unrelated
-- uniques). No CONCURRENTLY — the CLI wraps each migration in a single transaction, where it is
-- illegal; these tables are tiny.
create index if not exists compatibility_results_pair_id_idx on public.compatibility_results (pair_id);
create index if not exists chat_threads_user_id_idx          on public.chat_threads (user_id);
create index if not exists share_cards_user_id_idx           on public.share_cards (user_id);
create index if not exists devices_user_id_idx               on public.devices (user_id);
create index if not exists invites_invitee_id_idx            on public.invites (invitee_id);

-- ── H3 + M14 — claim_invite: double-claim race + pair-creation gated to compatibility invites ──
-- H3: 0010:20 read the invite without FOR UPDATE — under READ COMMITTED two concurrent claimants
-- both passed the status check, the second UPDATE overwrote invitee_id, and each inserted its own
-- canonical pair → "single-use" violated. FOR UPDATE serializes them; the loser now sees
-- status='accepted' with a different invitee_id and raises invite_already_claimed.
-- M14: the pair insert was unconditional, but `kind` was never fetched by the select — so gating it
-- requires widening the select too (invites_kind_check → 'compatibility' | 'generic').
-- A generic invite now returns pair_id = NULL; `kind` is returned so the caller can route on it.
create or replace function public.claim_invite(p_token_hash text, p_invitee uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v record;
  v_pair uuid;
  na uuid;
  nb uuid;
begin
  -- FOR UPDATE: serialize concurrent claims of the same invite (single-use, H3)
  select id, inviter_id, invitee_id, status, expires_at, kind into v
    from public.invites where token_hash = p_token_hash
    for update;
  if v.id is null then raise exception 'invite_not_found'; end if;
  if v.status = 'revoked' then raise exception 'invite_revoked'; end if;
  if v.expires_at < now() then raise exception 'invite_expired'; end if;
  if v.inviter_id = p_invitee then raise exception 'cannot_claim_own_invite'; end if;
  if v.status = 'accepted' and v.invitee_id is not null and v.invitee_id <> p_invitee then
    raise exception 'invite_already_claimed'; -- single-use: taken by someone else
  end if;

  -- accept (idempotent for the same invitee; keep the original accepted_at)
  update public.invites
    set status = 'accepted', invitee_id = p_invitee, accepted_at = coalesce(accepted_at, now())
    where id = v.id;

  -- canonical pair (user_a < user_b), race-safe on the unique constraint. Compatibility invites
  -- only — a generic invite links the invitee but ties no pair (M14).
  if v.kind = 'compatibility' then
    na := least(v.inviter_id, p_invitee);
    nb := greatest(v.inviter_id, p_invitee);
    insert into public.compatibility_pairs (user_a, user_b) values (na, nb)
      on conflict (user_a, user_b) do nothing;
    select id into v_pair from public.compatibility_pairs where user_a = na and user_b = nb;
  end if;

  return jsonb_build_object('inviter_id', v.inviter_id, 'invitee_id', p_invitee,
                            'pair_id', v_pair, 'kind', v.kind);
end;
$$;

revoke all on function public.claim_invite(text, uuid) from public, anon, authenticated;
grant execute on function public.claim_invite(text, uuid) to service_role;

-- ── H4-SQL — record_rc_event could permanently drop an entitlement update ──────────────────────
-- 0009:22-24 consumed the rc_event_id idempotency key BEFORE the :31 exists(profiles) guard, so an
-- event for a not-yet-provisioned user was logged but never applied — and every later delivery hit
-- :26 (`inserted = 0`) and returned false. The entitlement was lost forever.
--
-- Fix: the key now guards the *upsert*, not merely the log row. `applied_at` records whether an
-- event actually reached `subscriptions`; a redelivery of a logged-but-unapplied event re-attempts
-- it once the profile exists. This keeps subscription_events a complete raw audit log (schema.sql:139)
-- and preserves the existing contract: a duplicate of an APPLIED event stays an idempotent no-op.
--
-- NOT fixed here, deliberately: `latest_event_at = now()` stamps PROCESSING time, not event time —
-- an out-of-order guard needs RC's real event timestamp, whose payload shape B14 establishes from
-- the vendor docs. A guard written on now() is monotonic by construction and would be decorative.
-- Deferred to B15 with the rc_event_id NOT NULL contraction. (Decision Log D-05.)
alter table public.subscription_events add column if not exists applied_at timestamptz;

comment on column public.subscription_events.applied_at is
  'When this event was applied to public.subscriptions. NULL = logged for audit but never applied '
  '(unknown / not-yet-provisioned user); a redelivery re-attempts it rather than deduping to a '
  'permanent no-op (audit H4).';

create or replace function public.record_rc_event(
  p_rc_event_id   text,
  p_user_id       uuid,
  p_type          text,
  p_payload       jsonb,
  p_rc_app_user_id text,
  p_status        text,
  p_entitlements  jsonb
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- NULLs never conflict in Postgres, so a null rc_event_id would re-insert and re-upsert forever.
  -- Additive defense: fall back to a deterministic surrogate derived from the payload, so repeated
  -- deliveries of the same id-less event still dedupe. (B15 makes the column NOT NULL.)
  v_key      text := coalesce(p_rc_event_id, 'md5:' || md5(p_payload::text));
  v_inserted int;
  v_applied  boolean;
begin
  insert into public.subscription_events (rc_event_id, user_id, type, payload)
    values (v_key, p_user_id, p_type, p_payload)
    on conflict (rc_event_id) do nothing;
  get diagnostics v_inserted = row_count;

  -- Was this exact event already APPLIED? FOR UPDATE also serializes concurrent duplicate
  -- deliveries, so they cannot both reach the upsert.
  select applied_at is not null into v_applied
    from public.subscription_events where rc_event_id = v_key
    for update;
  if v_applied then
    return false; -- duplicate delivery of an applied event → idempotent no-op
  end if;

  -- upsert the authoritative entitlement row only when the event maps to a known user
  if p_user_id is not null and exists (select 1 from public.profiles where id = p_user_id) then
    insert into public.subscriptions (user_id, rc_app_user_id, entitlements, status, latest_event_at, updated_at)
      values (p_user_id, p_rc_app_user_id, p_entitlements, p_status, now(), now())
    on conflict (user_id) do update
      set rc_app_user_id  = excluded.rc_app_user_id,
          entitlements    = excluded.entitlements,
          status          = excluded.status,
          latest_event_at = now(),
          updated_at      = now();
    update public.subscription_events set applied_at = now() where rc_event_id = v_key;
    return true;
  end if;

  -- Unknown/absent user: keep the audit row with applied_at NULL so a redelivery after the profile
  -- is provisioned still applies it. Return whether THIS delivery was newly recorded.
  return v_inserted > 0;
end;
$$;

revoke all on function public.record_rc_event(text, uuid, text, jsonb, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.record_rc_event(text, uuid, text, jsonb, text, text, jsonb) to service_role;
