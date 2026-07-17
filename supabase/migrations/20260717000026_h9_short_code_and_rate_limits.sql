-- H9 (ledger B13) — the invite loop's "guaranteed" manual fallback does not close, and spec §13's
-- required rate limiting does not exist.
--
-- Two pieces: a resolver for the human-typed short code, and the rate-limit primitive §13 demands on
-- invite-claim / invite-create / chat-send / compat-request.

-- ── Rate limiting (spec §13) ─────────────────────────────────────────────────────────────────────
-- Edge Functions are stateless and horizontally scaled, so an in-process counter counts nothing.
-- The DB is the only shared, atomic place to put this. Fixed window, incremented and read in ONE
-- statement so two concurrent requests cannot both observe "under the limit" — the same lesson as
-- M8: a count in one round-trip and a decision in another is not a limit.
create table if not exists public.rate_limits (
  scope        text not null,        -- 'invite_claim_code' | 'invite_create' | 'chat_send' | …
  subject      text not null,        -- normally the user id
  window_start timestamptz not null,
  count        int not null default 0,
  primary key (scope, subject, window_start)
);

-- Service-role only: no policies, exactly like worker_telemetry / notification_log. The advisors'
-- `rls_enabled_no_policy` INFO on those tables is the established, intentional pattern here.
alter table public.rate_limits enable row level security;

comment on table public.rate_limits is
  'Fixed-window rate-limit counters (Backend §13). Edge Functions are stateless, so the counter has '
  'to live somewhere shared and atomic. Swept by sweep_rate_limits(); nothing here is user data.';

/**
 * Consume one unit of quota. Returns TRUE if the caller is still within the limit.
 *
 * Deliberately increments FIRST and compares after: the insert…on conflict…returning is a single
 * atomic statement, so N concurrent callers get N distinct counts and exactly `p_limit` of them see
 * true. A read-then-write version would let a burst straight through.
 */
create or replace function public.check_rate_limit(p_scope text, p_subject text, p_limit int, p_window interval)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secs  numeric := extract(epoch from p_window);
  v_start timestamptz;
  n       int;
begin
  if p_subject is null or p_subject = '' then return true; end if; -- nothing to key on → do not block
  -- floor now() onto the window grid so every caller in the same window shares a counter row
  v_start := to_timestamp(floor(extract(epoch from now()) / v_secs) * v_secs);

  insert into public.rate_limits (scope, subject, window_start, count)
    values (p_scope, p_subject, v_start, 1)
  on conflict (scope, subject, window_start)
    do update set count = public.rate_limits.count + 1
  returning count into n;

  return n <= p_limit;
end;
$$;

/** Housekeeping: counters are worthless once their window has passed. Called by the cleanup sweep. */
create or replace function public.sweep_rate_limits(p_keep interval default '1 day')
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare n int;
begin
  delete from public.rate_limits where window_start < now() - p_keep;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ── H9: resolve the human-typed short code → the invite's token_hash ─────────────────────────────
-- `deriveShortCode` (_shared/invite.ts) has always been printed on the teaser and its own docstring
-- says "manual claim matches invites where token_hash starts with it" — but nothing ever resolved
-- it: invite-claim only hashes the full 43-char token. The spec's "always present, guarantees the
-- loop closes" fallback terminated in UI text.
--
-- WIDENED TO 10 HEX (Decision Log D-20). The old 6 hex is 24 bits = 16.7M codes, and because a
-- prefix match hits ANY live invite, an attacker's odds are N/16.7M — at 100k live invites that is
-- **1 in 167 guesses** to hijack a stranger's invite, which ALSO burns it (claims are single-use, so
-- the real recipient is locked out). No rate limit rescues 24 bits at that density. 10 hex = 40 bits
-- = 1.1e12 → ~1 in 1.1M at a million live invites. The code is DERIVED, never stored, so widening it
-- costs nothing.
--
-- Only claimable invites are resolvable: it is both correct and shrinks the attacker's target pool.
-- An ambiguous prefix is REJECTED, never guessed — at 40 bits collisions are rare, and handing a
-- claimant somebody else's invite is exactly the failure this code must not have.
create or replace function public.resolve_invite_code(p_code text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_norm text;
  v_hash text;
  n      int;
begin
  -- accept what a human types: any case, with or without the separator/spaces
  v_norm := lower(regexp_replace(coalesce(p_code, ''), '[^0-9A-Fa-f]', '', 'g'));
  if length(v_norm) < 10 then raise exception 'code_too_short'; end if;
  v_norm := substr(v_norm, 1, 10);

  select count(*) into n from public.invites
   where token_hash like v_norm || '%'
     and status in ('created', 'clicked', 'installed')
     and expires_at > now();

  if n = 0 then raise exception 'invite_not_found'; end if;
  if n > 1 then raise exception 'ambiguous_code'; end if; -- never guess between two people's invites

  select token_hash into v_hash from public.invites
   where token_hash like v_norm || '%'
     and status in ('created', 'clicked', 'installed')
     and expires_at > now();
  return v_hash;
end;
$$;

-- A prefix LIKE 'abc%' is index-usable only with a text_pattern_ops index (the default opclass is
-- collation-aware and cannot serve it). token_hash is lowercase hex, so this is exact and cheap.
create index if not exists invites_token_hash_prefix_idx
  on public.invites (token_hash text_pattern_ops);

revoke all on function public.check_rate_limit(text, text, int, interval) from public, anon, authenticated;
revoke all on function public.sweep_rate_limits(interval) from public, anon, authenticated;
revoke all on function public.resolve_invite_code(text) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, text, int, interval) to service_role;
grant execute on function public.sweep_rate_limits(interval) to service_role;
grant execute on function public.resolve_invite_code(text) to service_role;
