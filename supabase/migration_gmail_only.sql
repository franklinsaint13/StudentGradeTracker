-- MIGRATION: only real, unique Gmail accounts may be created.
-- Run ONCE in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to run again. Your existing students and grades are not touched.
--
-- Rules enforced by the DATABASE (so they apply to every sign-up route:
-- the website, Google sign-in, or someone calling Supabase directly):
--   * the address must end in @gmail.com (or @googlemail.com)
--   * no "+" aliases (name+anything@gmail.com is the same inbox as name@gmail.com)
--   * letters, numbers and single dots only, 6 to 30 characters (Gmail's own rules)
--   * the same inbox can't register twice using dots: a.b@gmail.com = ab@gmail.com
--
-- This does NOT prove the inbox exists. That is done by turning ON
-- Authentication -> Sign In / Providers -> Email -> "Confirm email" (so the person must
-- click a link sent to the inbox), and by "Sign in with Google".

create or replace function public.enforce_real_gmail()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  addr  text := lower(trim(coalesce(new.email, '')));
  loc   text := split_part(addr, '@', 1);
  dom   text := split_part(addr, '@', 2);
  norm  text := replace(loc, '.', '');
begin
  if dom not in ('gmail.com', 'googlemail.com') then
    raise exception 'Only Gmail addresses are allowed.';
  end if;
  if loc !~ '^[a-z0-9]+(\.[a-z0-9]+)*$' then
    raise exception 'That is not a valid Gmail address.';
  end if;
  if length(norm) < 6 or length(norm) > 30 then
    raise exception 'A Gmail username has 6 to 30 characters.';
  end if;
  if exists (
    select 1 from auth.users u
    where u.id <> new.id
      and lower(split_part(u.email, '@', 2)) in ('gmail.com', 'googlemail.com')
      and replace(lower(split_part(u.email, '@', 1)), '.', '') = norm
  ) then
    raise exception 'That Gmail already has an account.';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_real_gmail() from public, anon, authenticated;

drop trigger if exists enforce_real_gmail_insert on auth.users;
create trigger enforce_real_gmail_insert
  before insert on auth.users
  for each row execute function public.enforce_real_gmail();

-- Also stop someone changing a good address into a bad one later.
drop trigger if exists enforce_real_gmail_update on auth.users;
create trigger enforce_real_gmail_update
  before update of email on auth.users
  for each row
  when (new.email is distinct from old.email)
  execute function public.enforce_real_gmail();

-- Optional: see who is already signed up and whether each address was verified.
--   select email, email_confirmed_at, last_sign_in_at from auth.users order by created_at;
-- Fake accounts can be removed in Authentication -> Users (their students go with them).
