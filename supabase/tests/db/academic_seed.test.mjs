import { createDb, ok, fails, eq, done, readSupabaseFile, ACADEMIC_MIGRATIONS } from './harness.mjs'

const db = await createDb(ACADEMIC_MIGRATIONS)
const seed = readSupabaseFile('seeds/academic_draft_seed.sql')

await fails(db, 'refuses without opt-in', seed, 'unverified')
eq('nothing loaded', (await db.query(`select count(*)::int as n from academic_subjects`)).rows[0].n, 0)

const optIn = `set academic.allow_draft_seed = 'on';`
await ok(db, 'loads with opt-in', optIn + seed)
await ok(db, 're-run is safe', optIn + seed)

const counts = (await db.query(`select
  (select count(*)::int from academic_grades) as grades,
  (select count(*)::int from academic_grading_scale_versions where status = 'approved') as scales,
  (select count(*)::int from academic_reporting_periods) as periods,
  (select count(*)::int from academic_subjects) as subjects,
  (select count(*)::int from academic_subjects where is_default) as default_subjects,
  (select count(*)::int from academic_subject_aliases) as aliases`)).rows[0]
eq('seed counts', counts, { grades: 3, scales: 1, periods: 9, subjects: 10, default_subjects: 9, aliases: 19 })

eq('stable ids', (await db.query(`select id = md5('bitdoin.academic.subject.MATH')::uuid as ok from academic_subjects where code = 'MATH'`)).rows[0].ok, true)
eq('marked unverified', (await db.query(`select value from academic_settings where key = 'seed_status'`)).rows[0].value, 'draft_unverified')
eq('periods are contiguous months', (await db.query(`select bool_and(p.start_date = prev.end_date + 1) as ok
  from academic_reporting_periods p join academic_reporting_periods prev
    on prev.calendar_template_id = p.calendar_template_id and prev.sequence = p.sequence - 1`)).rows[0].ok, true)
eq('last period ends with the year', (await db.query(`select p.end_date = y.end_date as ok from academic_reporting_periods p
  join academic_calendar_templates c on c.id = p.calendar_template_id join academic_years y on y.id = c.academic_year_id
  where p.sequence = 9`)).rows[0].ok, true)

// The seed is enough for a student to enrol and record a score.
await ok(db, 'student can use seed', `
  insert into public.users (id, name) values ('00000000-0000-0000-0000-0000000000a1', 'S');
  insert into academic_student_profiles (id, user_id, display_name, age_band, province_code)
    values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Noy', '16_17', 'VT');
  insert into academic_enrolments (id, student_profile_id, academic_year_id, grade_id, school_free_text, school_verification, grading_scale_version_id, calendar_template_id)
    values ('20000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', md5('bitdoin.academic.year.2026-2027')::uuid,
            md5('bitdoin.academic.grade.LA-5-4-3.G11')::uuid, 'My school', 'unverified_school',
            md5('bitdoin.academic.scale.LA-0-10.v1')::uuid, md5('bitdoin.academic.calendar.2026-2027.national')::uuid);
  insert into academic_subject_enrolments (id, enrolment_id, subject_id)
    values ('20000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', md5('bitdoin.academic.subject.MATH')::uuid);
  insert into academic_score_entries (id, enrolment_id, reporting_period_id)
    values ('20000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002', md5('bitdoin.academic.period.2026-2027.national.monthly.2')::uuid);
  insert into academic_score_lines (score_entry_id, subject_enrolment_id, raw_value, status, grading_scale_version_id)
    values ('20000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000003', 7.5, 'scored', md5('bitdoin.academic.scale.LA-0-10.v1')::uuid)`)
await fails(db, 'seed scale rejects 7.3', `update academic_score_lines set raw_value = 7.3 where score_entry_id = '20000000-0000-0000-0000-000000000004'`, 'steps of 0.50')
await fails(db, 'seed scale rejects 11', `update academic_score_lines set raw_value = 11 where score_entry_id = '20000000-0000-0000-0000-000000000004'`, 'between 0.00 and 10.00')

done()
