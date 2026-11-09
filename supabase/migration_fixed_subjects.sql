-- MIGRATION: switch to the four fixed subjects (Math, English, Science, Arts).
-- Use this if you already ran migration_subjects.sql (subjects were per user).
-- Run ONCE in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
--
-- What it does:
--   1. Replaces the per-user "subjects" table with one shared, read-only table
--      containing Math, English, Science and Arts.
--   2. KEEPS grades whose old subject was named Math, English, Science or Arts
--      (matched by name, ignoring upper/lower case).
--   3. REMOVES grades under any other subject, such as "General". Re-enter those
--      in the table afterwards.
-- Your students are kept.

begin;

-- ---------- 1. the new fixed subjects ----------

create table public.subjects_fixed (
  id   bigint generated always as identity primary key,
  name text not null unique
);

insert into public.subjects_fixed (name)
values ('Math'), ('English'), ('Science'), ('Arts');

-- ---------- 2. carry matching grades over ----------

-- Policies that mention the old subjects table must go before it can be dropped.
drop policy "grades_insert_own" on public.grades;
drop policy "grades_update_own" on public.grades;

-- Re-pointing subject ids can briefly clash with these, so remove and re-add them.
alter table public.grades drop constraint grades_subject_id_fkey;
alter table public.grades drop constraint grades_student_id_subject_id_key;

-- Work out where each grade goes. If one student somehow has two old subjects that
-- map to the same new subject (e.g. "Math" and "math"), keep the most recent.
create temporary table grade_map on commit drop as
select g.id as grade_id,
       f.id as new_subject_id,
       row_number() over (
         partition by g.student_id, f.id
         order by g.updated_at desc, g.id desc
       ) as rn
from public.grades g
join public.subjects o on o.id = g.subject_id
join public.subjects_fixed f on lower(f.name) = lower(o.name);

-- Remove everything that does not map (other subjects, or duplicates).
delete from public.grades
where id not in (select grade_id from grade_map where rn = 1);

update public.grades g
set subject_id = m.new_subject_id
from grade_map m
where m.grade_id = g.id and m.rn = 1;

-- ---------- 3. swap the tables ----------

drop table public.subjects;
alter table public.subjects_fixed rename to subjects;

alter table public.grades
  add constraint grades_subject_id_fkey
  foreign key (subject_id) references public.subjects (id) on delete restrict;
alter table public.grades
  add constraint grades_student_id_subject_id_key unique (student_id, subject_id);

-- ---------- 4. security rules ----------

alter table public.subjects enable row level security;

-- Logged-in users can read the subjects; nobody can change them.
create policy "subjects_read_all" on public.subjects
  for select to authenticated using (true);

-- You can only grade YOUR OWN students.
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

commit;
