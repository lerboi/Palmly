-- RF1.T1 (Audit-5 · 03 §2) — Today's Line: shared content, the daily ledger, and the one new
-- user-callable mutation.
--
-- Three additive pieces, no drops, no renames (expand-contract, Decision Log 2026-07-14):
--   A. `pulse_templates` — the nightly-generated shared content, an exact structural sibling of
--      `fortune_templates`. Keyed by (date, feature_key, locale), NOT by user: the day-pillar is a
--      property of the DATE, so ~15 rows/day cover every user on earth and birth date stays
--      optional for this feature.
--   B. `user_fortunes` gains five columns. The table has existed since migration 0001 with owner
--      RLS, a (user_id, fortune_date) PK and `merge_accounts` handling already written for it — and
--      **zero writers**. It is revived here as the daily ledger rather than reinvented, so streaks
--      survive a reinstall, a second device, and an account merge for free.
--   C. `record_daily_open` — the RPC that records the day and returns the streak. One SECURITY
--      DEFINER function, uid-scoped, date-clamped, `search_path = ''` (house style), sitting beside
--      `set_keep_image` as the second and only other user-callable mutation.
--
-- Why an RPC and not a plain client upsert: the streak must be SERVER truth (the push fan-out
-- targets on it and the client must not be able to mint a 400-day run), and the walk is one
-- window-function query — cheaper and more honest than shipping the whole history to the phone.

-- ── A. pulse_templates ───────────────────────────────────────────────────────────────────────────
create table if not exists public.pulse_templates (
  pulse_date     date not null,
  -- The 15 section keys a real reading can actually produce. Palm keys come from `palmSkeletons`
  -- and face keys from `faceSkeletons` (_shared/narrative.ts) — the SAME keys the reveal renders,
  -- so a feature chosen for today always names a section the user really has. (03 §2.1 sketched
  -- 'forehead'/'brows'/'chin'; the spec's own instruction is to align with the code at build time,
  -- and the code says proportion/eyebrows/canthus. Decision Log 2026-07-26.)
  feature_key    text not null check (feature_key in (
    'heart','head','life','fate','hand_shape','mounts','markings',
    'face_shape','proportion','eyes','eyebrows','nose','mouth','ears','canthus')),
  locale         text not null default 'en',
  day_pillar     text not null,   -- informational: the DATE's own sexagenary pillar (e.g. 甲子)
  content        jsonb not null,  -- schemas/pulse.v1.json
  model_id       text,
  prompt_version text,
  created_at     timestamptz not null default now(),
  primary key (pulse_date, feature_key, locale)
);

comment on table public.pulse_templates is
  'Today''s Line content (Audit-5 · 03 §2.1), generated nightly per (date × feature_key × locale). '
  'Shared content, not user data — like fortune_templates. ~15 rows/day, DAU-independent.';

alter table public.pulse_templates enable row level security;

-- Content, not user data → readable by any authenticated user (the fortune_templates precedent).
drop policy if exists pulse_templates_select_all on public.pulse_templates;
create policy pulse_templates_select_all on public.pulse_templates
  for select to authenticated using (true);

-- ── B. user_fortunes becomes the daily ledger ────────────────────────────────────────────────────
-- `opened_at` (existing) keeps its meaning: the Today tab was opened. The new columns split what
-- used to be one undifferentiated signal into the three the loop actually distinguishes —
-- opened ≠ revealed ≠ sealed. Only `sealed_at` counts toward a streak.
alter table public.user_fortunes
  add column if not exists pulse_feature_key text,
  add column if not exists revealed_at       timestamptz,
  add column if not exists sealed_at         timestamptz,
  add column if not exists seal_method       text,
  add column if not exists day_pillar        text;

-- Added separately + guarded: `add column if not exists` skips its inline constraint on a re-run,
-- so the CHECK is attached explicitly and idempotently.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_fortunes_seal_method_check'
  ) then
    alter table public.user_fortunes
      add constraint user_fortunes_seal_method_check
      check (seal_method is null or seal_method in ('tap','palm'));
  end if;
end $$;

comment on column public.user_fortunes.pulse_feature_key is
  'Which of the user''s own features Today''s Line used on this date (Audit-5 03 §2.2).';
comment on column public.user_fortunes.revealed_at is
  'When the day''s line was revealed (the press-and-hold, or its a11y tap).';
comment on column public.user_fortunes.sealed_at is
  'When the day was SEALED — the one column a streak counts. A tap seals just as truly as the palm '
  'ritual does (02 §6: friction never gates the daily).';
comment on column public.user_fortunes.seal_method is
  '''tap'' (always enough) or ''palm'' (the on-device same-palm ritual). Diagnostic, not a gate.';
comment on column public.user_fortunes.day_pillar is
  'The DATE''s own sexagenary day pillar in pinyin (public.pillar_bucket(fortune_date), e.g. '
  '''jiazi''), stamped server-side so it cannot be spoofed. Distinct from the same row''s '
  '`pillar_bucket`, which is the USER''s birth-date bucket, and from pulse_templates.day_pillar, '
  'which carries the CJK 干支 label for the generator''s prompt.';

-- The streak walk reads (user_id, fortune_date) where sealed_at is not null. The PK already leads
-- with user_id, so it serves the walk; this partial index keeps the scan to sealed days only.
create index if not exists user_fortunes_sealed_idx
  on public.user_fortunes (user_id, fortune_date)
  where sealed_at is not null;

-- ── C. record_daily_open ─────────────────────────────────────────────────────────────────────────
/**
 * Record today for the caller and return their streak.
 *
 * Idempotent by construction: the (user_id, fortune_date) PK means a re-open, a re-reveal, or a
 * second device on the same day all land on ONE row. `first_seal_today` tells the client whether
 * this particular call is the one that sealed the day — that is what gates the milestone
 * celebration, so a user who taps, then does the camera ritual, is congratulated once, not twice.
 *
 * Timestamps only ever move forward from null: `opened_at`/`revealed_at`/`sealed_at` are set with
 * COALESCE so a later call cannot rewrite when the day actually happened. `seal_method` is the one
 * field allowed to UPGRADE — tap → palm, never palm → tap — because doing the ritual after tapping
 * is a real (and better) seal, while re-opening the app later is not a downgrade.
 *
 * p_date is clamped to [today-1, today+1] UTC. That is wide enough for every timezone on earth
 * (UTC-12..+14 straddle at most one boundary) and narrow enough that nobody can backfill a streak.
 */
create or replace function public.record_daily_open(
  p_date        date,
  p_bucket      text,
  p_feature_key text default null,
  p_method      text default null,
  p_revealed    boolean default false
)
returns table (current_streak int, longest_streak int, first_seal_today boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := (select auth.uid());
  v_today  date := (now() at time zone 'utc')::date;
  v_method text := case when p_method in ('tap','palm') then p_method else null end;
  v_was_sealed boolean;
  v_ok     boolean;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if p_date is null or p_date < v_today - 1 or p_date > v_today + 1 then
    raise exception 'date_out_of_range' using errcode = '22007';
  end if;

  -- Hygiene only (Backend §13). The write is cheap and idempotent, so this exists to stop a runaway
  -- client, not to police users. FAIL OPEN: if the limiter itself errors, the day still counts —
  -- losing someone's streak to a counter-table hiccup would be a far worse failure.
  begin
    v_ok := public.check_rate_limit('daily_open', v_uid::text, 60, interval '1 hour');
  exception when others then
    v_ok := true;
  end;
  if not v_ok then
    raise exception 'rate_limited' using errcode = '53400';
  end if;

  select (uf.sealed_at is not null) into v_was_sealed
    from public.user_fortunes uf
   where uf.user_id = v_uid and uf.fortune_date = p_date;

  insert into public.user_fortunes as uf
    (user_id, fortune_date, pillar_bucket, opened_at, pulse_feature_key, day_pillar,
     revealed_at, sealed_at, seal_method)
  values
    (v_uid, p_date, coalesce(nullif(p_bucket, ''), 'generic'), now(), p_feature_key,
     public.pillar_bucket(p_date),
     case when p_revealed then now() end,
     case when v_method is not null then now() end,
     v_method)
  on conflict (user_id, fortune_date) do update set
    -- First write wins for every "when did this happen" stamp.
    opened_at         = coalesce(uf.opened_at, excluded.opened_at),
    revealed_at       = coalesce(uf.revealed_at, excluded.revealed_at),
    sealed_at         = coalesce(uf.sealed_at, excluded.sealed_at),
    -- 'palm' outranks 'tap'; nothing outranks 'palm'.
    seal_method       = case
                          when excluded.seal_method = 'palm' then 'palm'
                          else coalesce(uf.seal_method, excluded.seal_method)
                        end,
    pulse_feature_key = coalesce(uf.pulse_feature_key, excluded.pulse_feature_key),
    day_pillar        = coalesce(uf.day_pillar, excluded.day_pillar),
    pillar_bucket     = excluded.pillar_bucket;

  -- Gaps-and-islands over the sealed days: consecutive dates share (date − row_number), so each
  -- distinct value is one unbroken run. One pass, no recursion, no per-day round trip.
  return query
  with sealed as (
    select uf.fortune_date as d
      from public.user_fortunes uf
     where uf.user_id = v_uid and uf.sealed_at is not null
  ),
  grouped as (
    select d, d - (row_number() over (order by d))::int as grp from sealed
  ),
  runs as (
    select count(*)::int as len, max(d) as ends_on from grouped group by grp
  )
  select
    -- A run is "current" only if it touches today (or yesterday — a streak is not broken until a
    -- day is actually missed). Anything older is history, and must not be printed as live.
    coalesce((select r.len from runs r where r.ends_on in (p_date, p_date - 1) order by r.ends_on desc limit 1), 0),
    coalesce((select max(r.len) from runs r), 0),
    (v_method is not null and coalesce(v_was_sealed, false) = false);
end;
$$;

comment on function public.record_daily_open(date, text, text, text, boolean) is
  'Audit-5 03 §2.3 — record the caller''s day (opened/revealed/sealed) and return '
  '{current_streak, longest_streak, first_seal_today}. Idempotent per (user, date); date clamped '
  'to ±1 UTC day so no client can backfill a run; streak is SERVER truth (the push fan-out and the '
  'milestone moments both read it).';

revoke all on function public.record_daily_open(date, text, text, text, boolean) from public, anon;
grant execute on function public.record_daily_open(date, text, text, text, boolean) to authenticated;
