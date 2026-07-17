-- M8 (ledger B11) — the free-tier compatibility gate is a non-atomic count→act.
--
-- compat-request/index.ts:23-29 asked "does this user already have a compat result on another
-- pair?" in ONE transaction, then acted (request_compat) in ANOTHER. Two parallel first requests
-- both read zero, both pass, and the free user gets two free comparisons. The window cannot be
-- closed from the Edge Function: the count and the insert are separate PostgREST round-trips, and
-- no lock survives between them. **The check has to run in the same transaction as the act**, which
-- means it has to live here.
--
-- Shape (Decision Log D-17): a 3-arg OVERLOAD, not a replacement.
--   * Different arity → unambiguous alongside the existing `request_compat(uuid, uuid)`; a 3rd arg
--     with a DEFAULT would make the 2-arg call ambiguous ("function is not unique") and break it.
--   * `p_has_premium` is passed in rather than recomputed here on purpose: `entitlement.ts`'s
--     `isPremiumRow` is the single source of that rule, and **B15 is about to change its
--     `expires_at: null` semantics** — duplicating it in SQL now would create a second place to
--     update and a drift bug waiting to happen. The caller is an Edge Function running with the
--     service key that reads `subscriptions` (the audit's "source of truth") itself; this function
--     is service_role-only and is never client-callable, so the flag cannot be forged by a user.
--   * The old 2-arg overload is left in place (expand); contracting it belongs with B18's pass.
--
-- Body is 0011:21-52 verbatim except for the gate — deliberately, so the diff is only the fix.
create or replace function public.request_compat(p_pair_id uuid, p_requester uuid, p_has_premium boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_a uuid; v_b uuid;
  fs_a uuid; fs_b uuid;
  ex_id uuid; ex_status text;
  v_status text; v_id uuid;
  n_other int;
begin
  select user_a, user_b into v_a, v_b from public.compatibility_pairs where id = p_pair_id;
  if v_a is null then raise exception 'pair_not_found'; end if;
  if p_requester <> v_a and p_requester <> v_b then raise exception 'not_a_pair_member'; end if;

  -- Idempotent re-request of a pair that already has a live/complete result: returned as-is, and
  -- deliberately BEFORE the gate — a user must never be charged for a comparison they already own.
  select id, status into ex_id, ex_status from public.compatibility_results
    where pair_id = p_pair_id order by created_at desc limit 1;
  if ex_id is not null and ex_status in ('computing', 'complete') then
    return jsonb_build_object('result_id', ex_id, 'status', ex_status, 'both_ready', true);
  end if;

  -- ── M8: the free-tier gate, now atomic ───────────────────────────────────────────────────────
  -- §4.6: premium → unlimited; otherwise the user's FIRST comparison is free (never paywall the
  -- recipient's first experience — it is the growth loop). The row lock serializes this user's
  -- concurrent requests, so the second one sees the first's result instead of racing past it. The
  -- count then happens in the SAME transaction as the insert below.
  if not p_has_premium then
    perform 1 from public.profiles where id = p_requester for update;
    select count(*) into n_other
      from public.compatibility_results r
      join public.compatibility_pairs cp on cp.id = r.pair_id
     where (cp.user_a = p_requester or cp.user_b = p_requester)
       and r.pair_id <> p_pair_id
       and r.status in ('computing', 'complete');
    if n_other >= 1 then raise exception 'payment_required'; end if;
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

revoke all on function public.request_compat(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.request_compat(uuid, uuid, boolean) to service_role;
