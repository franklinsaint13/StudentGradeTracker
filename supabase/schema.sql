-- FRESH INSTALL ONLY: use this on a brand-new Supabase project.
-- If you already have the older tables, use the migration files instead.
-- Run in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

-- ---------- tables ----------

create table if not exists public.students (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid()
             references auth.users (id) on delete cascade,
  -- Full display name built by the API, e.g. "Baylon, Daniel Vincent D. Jr."
  name       text not null check (length(trim(name)) > 0),
  last_name       text not null check (length(trim(last_name))  between 1 and 50 and last_name  !~ '[0-9]'),
  first_name      text not null check (length(trim(first_name)) between 1 and 50 and first_name !~ '[0-9]'),
  middle_initial  text not null check (char_length(middle_initial) = 1 and middle_initial !~ '[0-9]'),
  suffix          text check (suffix in ('Jr.', 'Sr.', 'II', 'III', 'IV', 'V')),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

-- The four subjects are fixed and shared by everyone. Nobody can add, rename or
-- delete them from the app. Listed in this order (by id).
create table if not exists public.subjects (
  id   bigint generated always as identity primary key,
  name text not null unique
);

insert into public.subjects (name)
values ('Math'), ('English'), ('Science'), ('Arts')
on conflict (name) do nothing;

-- One grade per student per subject.
create table if not exists public.grades (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid()
             references auth.users (id) on delete cascade,
  student_id bigint not null references public.students (id) on delete cascade,
  subject_id bigint not null references public.subjects (id) on delete restrict,
  grade      numeric(5, 2) not null check (grade between 0 and 100),
  updated_at timestamptz not null default now(),
  unique (student_id, subject_id)
);

-- ---------- row level security ----------
-- IMPORTANT: without this, anyone with your anon key could read every row.

alter table public.students enable row level security;
alter table public.subjects enable row level security;
alter table public.grades   enable row level security;

-- students: each user only sees and changes their own
create policy "students_select_own" on public.students
  for select to authenticated using (user_id = (select auth.uid()));
create policy "students_insert_own" on public.students
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "students_update_own" on public.students
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "students_delete_own" on public.students
  for delete to authenticated using (user_id = (select auth.uid()));

-- subjects: logged-in users can READ them. There are no insert/update/delete
-- policies, so nobody can change them through the API.
create policy "subjects_read_all" on public.subjects
  for select to authenticated using (true);

-- grades: you can only grade YOUR OWN students.
create policy "grades_select_own" on public.grades
  for select to authenticated using (user_id = (select auth.uid()));
create policy "grades_insert_own" on public.grades
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.students s
                where s.id = student_id and s.user_id = (select auth.uid()))
  );
create policy "grades_update_own" on public.grades
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.students s
                where s.id = student_id and s.user_id = (select auth.uid()))
  );
create policy "grades_delete_own" on public.grades
  for delete to authenticated using (user_id = (select auth.uid()));
