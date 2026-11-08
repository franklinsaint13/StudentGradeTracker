-- What it does:
--   * Adds the columns last_name, first_name, middle_initial and suffix to students.
--   * Existing students are kept exactly as they are (their parts stay empty).
--     Delete and re-add any that you want in the new format.
--   * New students must have all of last name, first name and middle initial
--     (suffix is optional and must be Jr., Sr., II, III, IV or V). Digits are
--     not allowed in any part.
-- The "name" column keeps the full display name, e.g. "Baylon, Daniel Vincent D. Jr.".

begin;

alter table public.students
  add column last_name      text,
  add column first_name     text,
  add column middle_initial text,
  add column suffix         text;

alter table public.students
  add constraint students_name_parts_check check (
    -- old rows: no parts at all
    (last_name is null and first_name is null and middle_initial is null and suffix is null)
    or
    -- new rows: all required parts present and valid
    (
      last_name is not null and first_name is not null and middle_initial is not null
      and length(trim(last_name))  between 1 and 50 and last_name  !~ '[0-9]'
      and length(trim(first_name)) between 1 and 50 and first_name !~ '[0-9]'
      and char_length(middle_initial) = 1 and middle_initial !~ '[0-9]'
      and (suffix is null or suffix in ('Jr.', 'Sr.', 'II', 'III', 'IV', 'V'))
    )
  );

commit;
