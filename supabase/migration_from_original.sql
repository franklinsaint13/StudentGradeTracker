-- What it does:
--   1. Creates the shared subjects table with Math, English, Science and Arts.
--   2. Creates the grades table (one grade per student per subject) with security rules.
--   3. REMOVES the old single "grade" column from students. Those old grades are
--      not copied anywhere, because they do not belong to any one subject.
--      Re-enter grades in the new table afterwards.
-- Your students are kept.

begin;

-- ---------- 1. the four fixed subjects ----------
-- Shared by everyone. Nobody can add, rename or delete them from the app.

create table public.subjects (
  id   bigint generated always as identity primary key,
  name text not null unique
);

insert into public.subjects (name)
values ('Math'), ('English'), ('Science'), ('Arts');

-- ---------- 2. grades: one per student per subject ----------

create table public.grades (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid()
             references auth.users (id) on delete cascade,
  student_id bigint not null references public.students (id) on delete cascade,
  subject_id bigint not null references public.subjects (id) on delete restrict,
  grade      numeric(5, 2) not null check (grade between 0 and 100),
  updated_at timestamptz not null default now(),
  unique (student_id, subject_id)
);

-- ---------- 3. security rules ----------
-- IMPORTANT: without this, anyone with your anon key could read every row.

alter table public.subjects enable row level security;
alter table public.grades   enable row level security;

-- Logged-in users can READ the subjects; nobody can change them.
create policy "subjects_read_all" on public.subjects
  for select to authenticated using (true);

-- You can only grade YOUR OWN students.
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

-- ---------- 4. the old single-grade column is no longer used ----------

alter table public.students drop column grade;

commit;
