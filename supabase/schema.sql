-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

create table if not exists public.students (
  id         bigint generated always as identity primary key,
  -- Owner of the row. Filled in automatically from the logged-in user's token.
  user_id    uuid not null default auth.uid()
             references auth.users (id) on delete cascade,
  name       text not null check (length(trim(name)) > 0),
  grade      numeric(5, 2) not null check (grade between 0 and 100),
  created_at timestamptz not null default now(),
  -- Same name can't be added twice by the same user.
  unique (user_id, name)
);

-- IMPORTANT: without this, anyone with your anon key could read every row.
alter table public.students enable row level security;

-- Each logged-in user can only see and change their own students.
create policy "students_select_own" on public.students
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "students_insert_own" on public.students
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "students_update_own" on public.students
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "students_delete_own" on public.students
  for delete to authenticated
  using (user_id = (select auth.uid()));
