-- MIGRATION: use this if you ALREADY ran the old schema.sql (one grade per student).
-- Run ONCE in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
--
-- What it does:
--   1. Creates the new "subjects" and "grades" tables with security rules.
--   2. Moves every existing grade into a subject called "General".
--   3. Removes the old "grade" column from students.
-- Your students and their grades are kept.

begin;

-- ---------- 1. new tables ----------

create table if not exists public.subjects (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid()
             references auth.users (id) on delete cascade,
  name       text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.grades (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid()
             references auth.users (id) on delete cascade,
  student_id bigint not null references public.students (id) on delete cascade,
  subject_id bigint not null references public.subjects (id) on delete cascade,
  grade      numeric(5, 2) not null check (grade between 0 and 100),
  updated_at timestamptz not null default now(),
  unique (student_id, subject_id)
);

alter table public.subjects enable row level security;
alter table public.grades   enable row level security;

create policy "subjects_select_own" on public.subjects
  for select to authenticated using (user_id = (select auth.uid()));
create policy "subjects_insert_own" on public.subjects
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "subjects_update_own" on public.subjects
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "subjects_delete_own" on public.subjects
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "grades_select_own" on public.grades
  for select to authenticated using (user_id = (select auth.uid()));
create policy "grades_insert_own" on public.grades
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.students s
                where s.id = student_id and s.user_id = (select auth.uid()))
    and exists (select 1 from public.subjects j
                where j.id = subject_id and j.user_id = (select auth.uid()))
  );
create policy "grades_update_own" on public.grades
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.students s
                where s.id = student_id and s.user_id = (select auth.uid()))
    and exists (select 1 from public.subjects j
                where j.id = subject_id and j.user_id = (select auth.uid()))
  );
create policy "grades_delete_own" on public.grades
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------- 2. keep existing grades under a "General" subject ----------

insert into public.subjects (user_id, name)
select distinct user_id, 'General' from public.students
on conflict (user_id, name) do nothing;

insert into public.grades (user_id, student_id, subject_id, grade)
select st.user_id, st.id, sj.id, st.grade
from public.students st
join public.subjects sj on sj.user_id = st.user_id and sj.name = 'General'
where st.grade is not null
on conflict (student_id, subject_id) do nothing;

-- ---------- 3. the old single-grade column is no longer used ----------

alter table public.students drop column grade;

commit;
