-- P8.T5 — compatibility lifecycle (Backend §7). The pair already exists (invite-claim). This adds:
--   1. canonical_palm_fs(user) — a user's pinned palm feature_set (compat's reproducible input);
--   2. request_compat(pair, requester) — creates/updates the compatibility_results row, 'computing'
--      if both members have a canonical palm feature_set else 'awaiting_b' (the recipient-hasn't-
--      scanned state the invite flow lands into). Idempotent (a live/complete result is returned as-is);
--   3. resolve_awaiting_compat trigger — when a member's palm canonical is (re)created, fills their
--      slot on any awaiting_b result and, once both are present, flips to 'computing' + enqueues
--      compat_jobs (§7.4);
--   4. broadcast_compat_status trigger — Realtime broadcast to compat:{pair_id} on status change, so
--      BOTH members get the reveal moment; RLS restricts that topic to the pair's members.
-- SECURITY DEFINER helpers are service-role only (driven by compat-request / worker-compat / the
-- reading pipeline), never client-callable.

create or replace function public.canonical_palm_fs(p_user uuid)
returns uuid language sql security definer set search_path = '' as $$
  select canonical_feature_set_id from public.subject_profiles
   where user_id = p_user and kind like 'palm\_%' order by scan_count desc, last_matched_at desc nulls last limit 1;
$$;

create or replace function public.request_compat(p_pair_id uuid, p_requester uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_a uuid; v_b uuid;
  fs_a uuid; fs_b uuid;
  ex_id uuid; ex_status text;
  v_status text; v_id uuid;
begin
  select user_a, user_b into v_a, v_b from public.compatibility_pairs where id = p_pair_id;
  if v_a is null then raise exception 'pair_not_found'; end if;
  if p_requester <> v_a and p_requester <> v_b then raise exception 'not_a_pair_member'; end if;

  select id, status into ex_id, ex_status from public.compatibility_results
    where pair_id = p_pair_id order by created_at desc limit 1;
  if ex_id is not null and ex_status in ('computing', 'complete') then
    return jsonb_build_object('result_id', ex_id, 'status', ex_status, 'both_ready', true);
  end if;

  fs_a := public.canonical_palm_fs(v_a);
  fs_b := public.canonical_palm_fs(v_b);
  v_status := case when fs_a is not null and fs_b is not null then 'computing' else 'awaiting_b' end;

  if ex_id is not null and ex_status = 'awaiting_b' then
    update public.compatibility_results set status = v_status, feature_set_a = fs_a, feature_set_b = fs_b where id = ex_id;
    v_id := ex_id;
  else
    insert into public.compatibility_results (pair_id, status, algorithm_version, feature_set_a, feature_set_b)
      values (p_pair_id, v_status, 'compat.v1', fs_a, fs_b) returning id into v_id;
  end if;

  if v_status = 'computing' then perform public.queue_send('compat_jobs', jsonb_build_object('result_id', v_id)); end if;
  return jsonb_build_object('result_id', v_id, 'status', v_status, 'both_ready', v_status = 'computing');
end;
$$;

-- when a member's palm canonical is (re)created, complete any awaiting_b results they belong to
create or replace function public.resolve_awaiting_compat()
returns trigger language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  if new.kind not like 'palm\_%' then return null; end if;
  for r in
    select cr.id, cp.user_a, cp.user_b, cr.feature_set_a, cr.feature_set_b
    from public.compatibility_results cr
    join public.compatibility_pairs cp on cp.id = cr.pair_id
    where cr.status = 'awaiting_b' and (cp.user_a = new.user_id or cp.user_b = new.user_id)
  loop
    if r.user_a = new.user_id and r.feature_set_a is null then r.feature_set_a := new.canonical_feature_set_id;
    elsif r.user_b = new.user_id and r.feature_set_b is null then r.feature_set_b := new.canonical_feature_set_id;
    end if;
    if r.feature_set_a is not null and r.feature_set_b is not null then
      update public.compatibility_results set status = 'computing', feature_set_a = r.feature_set_a, feature_set_b = r.feature_set_b
        where id = r.id and status = 'awaiting_b';
      perform public.queue_send('compat_jobs', jsonb_build_object('result_id', r.id));
    else
      update public.compatibility_results set feature_set_a = r.feature_set_a, feature_set_b = r.feature_set_b where id = r.id;
    end if;
  end loop;
  return null;
end;
$$;

drop trigger if exists resolve_awaiting_compat on public.subject_profiles;
create trigger resolve_awaiting_compat after insert on public.subject_profiles
  for each row execute function public.resolve_awaiting_compat();

-- completion Realtime broadcast to both members (reuse the P5.T7 pattern) on any status change
create or replace function public.broadcast_compat_status()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform realtime.broadcast_changes('compat:' || new.pair_id::text, 'status', tg_op, tg_table_name, tg_table_schema, new, old);
  return null;
end;
$$;

drop trigger if exists compat_status_broadcast on public.compatibility_results;
create trigger compat_status_broadcast
  after update of status on public.compatibility_results
  for each row when (old.status is distinct from new.status)
  execute function public.broadcast_compat_status();

-- pair members may receive on their compat:{pair_id} topic
drop policy if exists compat_member_receives_status on realtime.messages;
create policy compat_member_receives_status
  on realtime.messages for select to authenticated
  using (
    exists (
      select 1 from public.compatibility_pairs cp
      where realtime.topic() = 'compat:' || cp.id::text
        and (select auth.uid()) in (cp.user_a, cp.user_b)
    )
  );

revoke all on function public.canonical_palm_fs(uuid) from public, anon, authenticated;
revoke all on function public.request_compat(uuid, uuid) from public, anon, authenticated;
grant execute on function public.canonical_palm_fs(uuid) to service_role;
grant execute on function public.request_compat(uuid, uuid) to service_role;
