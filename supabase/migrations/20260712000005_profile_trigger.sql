-- Migration 0005 — auto-provision a profile for every new auth user (Backend §3.6, §5.1).
-- Anonymous-first: signInAnonymously() creates an auth.users row; this trigger creates the
-- matching public.profiles row (mirroring is_anonymous), so the client never has to. Runs as
-- SECURITY DEFINER (bypasses the profiles insert RLS). Idempotent via ON CONFLICT.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, is_anonymous)
  values (new.id, coalesce(new.is_anonymous, false))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
