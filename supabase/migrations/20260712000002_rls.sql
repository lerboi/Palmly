-- Migration 0002 — Row-Level Security (Backend spec §3.3).
-- Rules: always `to authenticated`, always wrap `(select auth.uid())` (initPlan caching),
-- index policy columns (done in 0001). Writes to server-owned tables go through service_role
-- Edge Functions (service_role has BYPASSRLS), so authenticated gets read-own + the few
-- client-driven writes. Anonymous users are `authenticated` with an is_anonymous JWT claim.

-- ---------- security-definer helpers (bypass RLS → no RLS-on-RLS recursion) ----------
create or replace function public.is_pair_member(p_pair_id uuid, p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.compatibility_pairs p
    where p.id = p_pair_id and p_uid in (p.user_a, p.user_b)
  );
$$;

create or replace function public.thread_owner(p_thread_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select t.user_id from public.chat_threads t where t.id = p_thread_id;
$$;

grant execute on function public.is_pair_member(uuid, uuid) to authenticated;
grant execute on function public.thread_owner(uuid) to authenticated;

-- ---------- enable RLS on every table ----------
alter table public.profiles              enable row level security;
alter table public.scans                 enable row level security;
alter table public.feature_sets          enable row level security;
alter table public.subject_profiles      enable row level security;
alter table public.readings              enable row level security;
alter table public.compatibility_pairs   enable row level security;
alter table public.compatibility_results enable row level security;
alter table public.invites               enable row level security;
alter table public.subscriptions         enable row level security;
alter table public.subscription_events   enable row level security;
alter table public.fortune_templates     enable row level security;
alter table public.user_fortunes         enable row level security;
alter table public.chat_threads          enable row level security;
alter table public.chat_messages         enable row level security;
alter table public.share_cards           enable row level security;
alter table public.devices               enable row level security;
alter table public.kb_chunks             enable row level security;
alter table public.deletion_log          enable row level security;

-- ---------- profiles: owner-only (id = auth.uid()) ----------
create policy profiles_select_own on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- ---------- owner-only READ tables (writes via service_role workers) ----------
create policy scans_select_own on public.scans
  for select to authenticated using ((select auth.uid()) = user_id);
create policy feature_sets_select_own on public.feature_sets
  for select to authenticated using ((select auth.uid()) = user_id);
create policy subject_profiles_select_own on public.subject_profiles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy readings_select_own on public.readings
  for select to authenticated using ((select auth.uid()) = user_id);
create policy share_cards_select_own on public.share_cards
  for select to authenticated using ((select auth.uid()) = user_id);
-- subscriptions: SELECT only, owner-only. All writes come from the RevenueCat webhook (service role).
create policy subscriptions_select_own on public.subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);

-- ---------- compatibility: pair visibility ----------
create policy compat_pairs_select_member on public.compatibility_pairs
  for select to authenticated using ((select auth.uid()) in (user_a, user_b));
-- results check pair membership through the security-definer helper (avoids RLS-on-RLS recursion)
create policy compat_results_select_member on public.compatibility_results
  for select to authenticated using (public.is_pair_member(pair_id, (select auth.uid())));

-- ---------- invites: inviter/invitee read; insert own & permanent-account-only ----------
create policy invites_select_party on public.invites
  for select to authenticated
  using ((select auth.uid()) = inviter_id or (select auth.uid()) = invitee_id);
-- Client may create only a fresh, unclaimed invite FOR ITSELF. `invitee_id is null` is
-- load-bearing: it keeps a client-inserted row out of every other user's read surface
-- (invites_select_party matches inviter_id OR invitee_id), closing an impersonation/pollution
-- vector where an attacker forges invitee_id=<victim> + a spoofed context.inviter_name. The
-- service-role invite-claim function later fills invitee_id / advances status (bypasses RLS).
create policy invites_insert_own on public.invites
  for insert to authenticated
  with check ((select auth.uid()) = inviter_id and invitee_id is null and status = 'created');
-- Restrictive: "actions reserved for permanent accounts" (§3.3) — anonymous users cannot
-- send invites (appear by name to a friend). Combines with the permissive insert above.
create policy invites_insert_permanent_only on public.invites
  as restrictive for insert to authenticated
  with check (((select auth.jwt()) ->> 'is_anonymous')::boolean is false);

-- ---------- fortunes ----------
-- fortune_templates: content is not user data → readable by any authenticated user.
create policy fortune_templates_select_all on public.fortune_templates
  for select to authenticated using (true);
-- user_fortunes: owner-only; client marks opened_at.
create policy user_fortunes_select_own on public.user_fortunes
  for select to authenticated using ((select auth.uid()) = user_id);
create policy user_fortunes_insert_own on public.user_fortunes
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy user_fortunes_update_own on public.user_fortunes
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ---------- chat (premium) ----------
create policy chat_threads_select_own on public.chat_threads
  for select to authenticated using ((select auth.uid()) = user_id);
create policy chat_threads_insert_own on public.chat_threads
  for insert to authenticated with check ((select auth.uid()) = user_id);
-- chat_messages has no user_id → ownership through the thread (security-definer helper).
create policy chat_messages_select_own on public.chat_messages
  for select to authenticated using ((select auth.uid()) = public.thread_owner(thread_id));

-- ---------- devices: full owner CRUD (client registers/updates/removes push tokens) ----------
create policy devices_select_own on public.devices
  for select to authenticated using ((select auth.uid()) = user_id);
create policy devices_insert_own on public.devices
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy devices_update_own on public.devices
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy devices_delete_own on public.devices
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------- knowledge base: readable by any authenticated user (not user data) ----------
create policy kb_chunks_select_all on public.kb_chunks
  for select to authenticated using (true);

-- ---------- deliberately NO authenticated policies (service_role only) ----------
-- subscription_events (raw webhook audit) and deletion_log (compliance audit): RLS enabled
-- with zero policies → deny-all to authenticated; only service_role (BYPASSRLS) touches them.
