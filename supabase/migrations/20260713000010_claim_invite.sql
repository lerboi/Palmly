-- P8.T4 — invite claim (Backend §4, §8.2). Atomic + idempotent: the recipient's first open resolves
-- a deferred token; this accepts the invite (single-use), links the invitee, and creates the
-- canonical compatibility pair, returning the routing context. SECURITY DEFINER + service-role only
-- (the `invite-claim` Edge Function verifies the token → hash, then calls this).
--
-- Idempotent: a repeat claim by the SAME invitee returns the same pair (no duplicate). Single-use:
-- a claim by a DIFFERENT user once accepted is rejected. Self-claim + expired + revoked are rejected.
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
  select id, inviter_id, invitee_id, status, expires_at into v
    from public.invites where token_hash = p_token_hash;
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

  -- canonical pair (user_a < user_b), race-safe on the unique constraint
  na := least(v.inviter_id, p_invitee);
  nb := greatest(v.inviter_id, p_invitee);
  insert into public.compatibility_pairs (user_a, user_b) values (na, nb)
    on conflict (user_a, user_b) do nothing;
  select id into v_pair from public.compatibility_pairs where user_a = na and user_b = nb;

  return jsonb_build_object('inviter_id', v.inviter_id, 'invitee_id', p_invitee, 'pair_id', v_pair);
end;
$$;

revoke all on function public.claim_invite(text, uuid) from public, anon, authenticated;
grant execute on function public.claim_invite(text, uuid) to service_role;
