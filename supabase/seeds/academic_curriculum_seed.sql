-- ============================================================
-- My Scores — curriculum and calendar seed (DB-003, #18)
--
-- Production curriculum, approved by the owner on 2026-10-23: Lao 5+4+3
-- structure, Grades 10–12, the 0–10 monthly scale (steps of 0.5), the
-- 2026–2027 national calendar, the subject catalogue and aliases. Loaded
-- in production on 2026-10-23.
--
-- Run after migrations 109+ (Supabase SQL Editor or psql). Re-running is
-- safe: rows that already exist are left as they are, so later edits made
-- in the admin screens are never overwritten.
--
-- IDs are md5('bitdoin.academic.<kind>.<code>')::uuid, so they are identical
-- in every environment and future seeds can reference them.
-- ============================================================

-- Education structure and upper-secondary grades (Phase 1 = Grades 10–12).
-- Lao labels confirmed by the owner.
insert into public.academic_education_structures (id, code, name_lo, name_en, effective_from_year, notes) values
  (md5('bitdoin.academic.structure.LA-5-4-3')::uuid, 'LA-5-4-3', 'ລະບົບ 5+4+3', 'Lao 5+4+3', 2009,
   'Current structure. 6+3+3 reform starts with Grade 6 in 2028-2029.')
on conflict (id) do nothing;

insert into public.academic_grades (id, education_structure_id, code, ordinal, level, label_lo, label_en) values
  (md5('bitdoin.academic.grade.LA-5-4-3.G10')::uuid, md5('bitdoin.academic.structure.LA-5-4-3')::uuid, 'G10', 10, 'upper_secondary', 'ມ.5', 'Grade 10'),
  (md5('bitdoin.academic.grade.LA-5-4-3.G11')::uuid, md5('bitdoin.academic.structure.LA-5-4-3')::uuid, 'G11', 11, 'upper_secondary', 'ມ.6', 'Grade 11'),
  (md5('bitdoin.academic.grade.LA-5-4-3.G12')::uuid, md5('bitdoin.academic.structure.LA-5-4-3')::uuid, 'G12', 12, 'upper_secondary', 'ມ.7', 'Grade 12')
on conflict (id) do nothing;

-- 0–10 monthly scale in steps of 0.5, pass mark 5.
insert into public.academic_grading_scales (id, code, name_lo, name_en) values
  (md5('bitdoin.academic.scale.LA-0-10')::uuid, 'LA-0-10', 'ຄະແນນ 0–10', 'Score 0–10')
on conflict (id) do nothing;

insert into public.academic_grading_scale_versions
  (id, grading_scale_id, version, scale_family, min_value, max_value, step, decimals, pass_mark, normalisable, status, approved_at) values
  (md5('bitdoin.academic.scale.LA-0-10.v1')::uuid, md5('bitdoin.academic.scale.LA-0-10')::uuid, 1,
   'numeric_linear', 0, 10, 0.5, 1, 5, true, 'approved', now())
on conflict (id) do nothing;

-- 2026–2027 national calendar: monthly periods September–May; term 1 is
-- September–January, term 2 February–May.
insert into public.academic_years (id, code, start_date, end_date, status) values
  (md5('bitdoin.academic.year.2026-2027')::uuid, '2026-2027', '2026-09-01', '2027-05-31', 'active')
on conflict (id) do nothing;

insert into public.academic_calendar_templates (id, name, academic_year_id, scope) values
  (md5('bitdoin.academic.calendar.2026-2027.national')::uuid, 'National default 2026–2027',
   md5('bitdoin.academic.year.2026-2027')::uuid, 'national')
on conflict (id) do nothing;

insert into public.academic_reporting_periods
  (id, calendar_template_id, period_type, term_no, sequence, label_lo, label_en, start_date, end_date)
select
  md5('bitdoin.academic.period.2026-2027.national.monthly.' || m.seq)::uuid,
  md5('bitdoin.academic.calendar.2026-2027.national')::uuid,
  'monthly', m.term_no, m.seq, m.label_lo, m.label_en,
  m.month_start, (m.month_start + interval '1 month - 1 day')::date
from (values
  (1, 1, 'ກັນຍາ',   'September', date '2026-09-01'),
  (2, 1, 'ຕຸລາ',    'October',   date '2026-10-01'),
  (3, 1, 'ພະຈິກ',   'November',  date '2026-11-01'),
  (4, 1, 'ທັນວາ',   'December',  date '2026-12-01'),
  (5, 1, 'ມັງກອນ',  'January',   date '2027-01-01'),
  (6, 2, 'ກຸມພາ',   'February',  date '2027-02-01'),
  (7, 2, 'ມີນາ',    'March',     date '2027-03-01'),
  (8, 2, 'ເມສາ',    'April',     date '2027-04-01'),
  (9, 2, 'ພຶດສະພາ', 'May',       date '2027-05-01')
) as m(seq, term_no, label_lo, label_en, month_start)
on conflict (id) do nothing;

-- Default subjects for Grades 10–12 (PRD §23.7). Civics and Arts (Lao names
-- confirmed by the owner, 2026-10-23) are in the catalogue but not
-- pre-selected, since not every school reports them.
insert into public.academic_subjects (id, code, name_lo, name_en, grade_min, grade_max, is_default)
select md5('bitdoin.academic.subject.' || s.code)::uuid, s.code, s.name_lo, s.name_en, 10, 12, s.is_default
from (values
  ('MATH', 'ຄະນິດສາດ',                'Mathematics',                 true),
  ('PHYS', 'ຟີຊິກສາດ',                'Physics',                     true),
  ('CHEM', 'ເຄມີສາດ',                 'Chemistry',                   true),
  ('BIO',  'ຊີວະສາດ',                 'Biology',                     true),
  ('LAO',  'ພາສາລາວ-ວັນນະຄະດີ',       'Lao Language & Literature',   true),
  ('ENG',  'ພາສາອັງກິດ',              'English',                     true),
  ('HIST', 'ປະຫວັດສາດ',               'History',                     true),
  ('GEO',  'ພູມສາດ',                  'Geography',                   true),
  ('ICT',  'ເຕັກໂນໂລຊີຂໍ້ມູນຂ່າວສານ', 'Information Technology',      true),
  ('PE',   'ພະລະສຶກສາ',               'Physical education',          false),
  ('CIV',  'ສຶກສາສາດ',                'Civics',                      false),
  ('ART',  'ສິລະປະກຳ',                'Arts',                        false)
) as s(code, name_lo, name_en, is_default)
on conflict (id) do nothing;

-- Global aliases (school_id null). alias_normalised = lower(trim(alias)).
insert into public.academic_subject_aliases (id, subject_id, alias_text, alias_normalised, source)
select
  md5('bitdoin.academic.alias.' || a.code || '.' || lower(btrim(a.alias)))::uuid,
  md5('bitdoin.academic.subject.' || a.code)::uuid,
  a.alias, lower(btrim(a.alias)), 'admin'
from (values
  ('MATH', 'ຄະນິດ'), ('MATH', 'ເລກ'), ('MATH', 'Math'), ('MATH', 'Maths'),
  ('PHYS', 'ຟີຊິກ'), ('PHYS', 'Physic'),
  ('CHEM', 'ເຄມີ'),
  ('BIO',  'ຊີວະ'),
  ('LAO',  'ພາສາລາວ'), ('LAO', 'ລາວ'), ('LAO', 'ວັນນະຄະດີ'),
  ('ENG',  'ອັງກິດ'), ('ENG', 'Eng'),
  ('HIST', 'ປະຫວັດ'),
  ('GEO',  'ພູມ'),
  ('ICT',  'ໄອທີ'), ('ICT', 'IT'), ('ICT', 'ຄອມພິວເຕີ'),
  ('PE',   'ກິລາ')
) as a(code, alias)
on conflict (id) do nothing;

insert into public.academic_settings (key, value, description) values
  ('seed_status', '"production"', 'Curriculum/calendar seed approved by the owner for production (2026-10-23).')
on conflict (key) do update set value = excluded.value, description = excluded.description;
