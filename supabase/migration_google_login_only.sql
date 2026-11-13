-- MIGRATION: "Log in with Google" only works for people who SIGNED UP first.
-- Run ONCE in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to run again. Your students and grades are not touched.
--
-- Why: Supabase creates an account the first time any Google account is used, even if
-- the person pressed "Log in". The website now remembers whether they pressed Log in or
-- Sign up. If a brand-new Google account came in through "Log in", the website calls this
-- function, which deletes that just-created account (only if it is under 2 minutes old
-- and only a Google account), then signs the person out and tells them to sign up first.
--
-- Accounts that already exist are never deleted by this function.

create or replace function public.discard_new_google_account()
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid     uuid := auth.uid();
  removed int;
begin
  if uid is null then
    return false;
  end if;

  delete from auth.users u
  where u.id = uid
    and u.created_at > now() - interval '2 minutes'
    and coalesce(u.raw_app_meta_data ->> 'provider', '') = 'google'
    and not exists (
      select 1 from auth.identities i
      where i.user_id = u.id and i.provider = 'email'
    );

  get diagnostics removed = row_count;
  return removed > 0;
end;
$$;

revoke all on function public.discard_new_google_account() from public, anon;
grant execute on function public.discard_new_google_account() to authenticated;
