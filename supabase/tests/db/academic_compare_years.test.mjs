// Compare a subject across school years (P3-PAR #52, DASH-007, migration
// 162): aligned by month, submitted months only, comparable only when both
// scales are the same normalisable family, the caller's own subjects only.
import { createDb, ok, eq, done, ACADEMIC_MIGRATIONS } from './harness.mjs'
import { CONFIG_SQL, ID, apiFor, json, period } from './fixtures.mjs'

const db = await createDb(ACADEMIC_MIGRATIONS)
const { rpc, one } = apiFor(db)
const [A, B] = ['a1', 'b1'].map((s) => `00000000-0000-0000-0000-0000000000${s}`)
await ok(db, 'users', `insert into public.users (id, name, role) values ('${A}', 'A', 'CUSTOMER'), ('${B}', 'B', 'CUSTOMER')`)
await ok(db, 'config', CONFIG_SQL)

const profile = { display_name: 'Noy', age_band: '16_17', province_code: 'vientiane-prefecture', grade_id: ID.g11, school_id: ID.school, notice_version: '2026-10-25',
  subjects: [{ subject_id: ID.math }, { custom_name: 'Robotics' }] }
const a = await rpc(A, `public.academic_create_profile(${json(profile)})`)
await rpc(B, `public.academic_create_profile(${json(profile)})`)
const subjectOf = async (enrolment, where) => (await one(`select id from academic_subject_enrolments where enrolment_id = '${enrolment}' and ${where}`)).id
const scores = async (enrolment, subject, scale, values, next = false, state = 'submitted') => {
  for (const [seq, value] of values) {
    const entry = (await one(`insert into academic_score_entries (enrolment_id, reporting_period_id, state, submitted_at) values ('${enrolment}', '${period(seq, next)}', '${state}', ${state === 'submitted' ? 'now()' : 'null'})
      on conflict (enrolment_id, reporting_period_id) do update set state = excluded.state returning id`)).id
    await db.exec(`insert into academic_score_lines (score_entry_id, subject_enrolment_id, raw_value, status, grading_scale_version_id) values ('${entry}', '${subject}', ${value}, 'scored', '${scale}')`)
  }
}

// 2026-27 (0–10 scale): September to November.
const oldMath = await subjectOf(a.enrolment_id, `subject_id = '${ID.math}'`)
await scores(a.enrolment_id, oldMath, ID.scaleV1, [[1, 6], [2, 7], [3, 6.5]])
// 2027-28 (0–50 scale): a new enrolment with Mathematics again.
await ok(db, 'next year', `update academic_enrolments set state = 'closed', closed_reason = 'promoted' where id = '${a.enrolment_id}';
  insert into academic_enrolments (id, student_profile_id, academic_year_id, grade_id, school_id, grading_scale_version_id, calendar_template_id)
  values ('20000000-0000-0000-0000-000000000001', '${a.profile_id}', '${ID.nextYear}', '${ID.g12}', '${ID.school50}', '${ID.scale50V1}', '${ID.nextCalendar}');
  insert into academic_subject_enrolments (enrolment_id, subject_id) values ('20000000-0000-0000-0000-000000000001', '${ID.math}');
  insert into academic_subject_enrolments (enrolment_id, custom_name) values ('20000000-0000-0000-0000-000000000001', ' robotics ');`)
const newEnrolment = '20000000-0000-0000-0000-000000000001'
const newMath = await subjectOf(newEnrolment, `subject_id = '${ID.math}'`)
await scores(newEnrolment, newMath, ID.scale50V1, [[1, 40]], true)
await scores(newEnrolment, newMath, ID.scale50V1, [[2, 10]], true, 'draft')

const view = await rpc(A, `public.academic_compare_years('${newMath}')`)
eq('the subject and both years, newest first', [view.subject.name_en, view.years.map((y) => [y.year, y.current, y.grade_en])],
  ['Mathematics', [['2027-2028', true, 'Grade 12'], ['2026-2027', false, 'Grade 11']]])
const [now, before] = view.years
eq('aligned by calendar month, submitted months only', [now.series.map((p) => [p.month, Number(p.value)]), before.series.map((p) => [p.month, Number(p.value)])],
  [[[9, 40]], [[9, 6], [10, 7], [11, 6.5]]])
eq('different ranges, same normalisable family: comparable, with normalised values', [before.compatible, before.reason, Number(before.series[0].normalised), Number(now.series[0].normalised), before.scale.max, now.scale.max],
  [true, null, 0.6, 0.8, 10, 50])
eq('a custom subject matches by name', (await rpc(A, `public.academic_compare_years('${await subjectOf(newEnrolment, 'custom_name is not null')}')`)).years.length, 2)
eq("another student's subject is refused", (await rpc(B, `public.academic_compare_years('${newMath}')`)).error?.code, 'NOT_FOUND')

// 2025-26 on a scale that cannot be normalised.
await ok(db, 'earlier year', `insert into academic_years (id, code, start_date, end_date, status) values ('20000000-0000-0000-0000-000000000010', '2025-2026', '2025-09-01', '2026-05-31', 'closed');
  insert into academic_calendar_templates (id, name, academic_year_id, scope) values ('20000000-0000-0000-0000-000000000011', 'National 2025-26', '20000000-0000-0000-0000-000000000010', 'national');
  insert into academic_grading_scales (id, code, name_lo, name_en) values ('20000000-0000-0000-0000-000000000012', 'RAW', 'ດິບ', 'Raw');
  insert into academic_grading_scale_versions (id, grading_scale_id, version, scale_family, min_value, max_value, step, decimals, normalisable, status, approved_at)
    values ('20000000-0000-0000-0000-000000000013', '20000000-0000-0000-0000-000000000012', 1, 'numeric_linear', 0, 20, 1, 0, false, 'approved', now());
  insert into academic_enrolments (id, student_profile_id, academic_year_id, grade_id, school_id, grading_scale_version_id, calendar_template_id, state, closed_reason)
    values ('20000000-0000-0000-0000-000000000014', '${a.profile_id}', '20000000-0000-0000-0000-000000000010', '${ID.g10}', '${ID.school}', '20000000-0000-0000-0000-000000000013', '20000000-0000-0000-0000-000000000011', 'closed', 'promoted');
  -- Fixture only: subjects cannot be added to a closed enrolment through the API.
  set session_replication_role = replica;
  insert into academic_subject_enrolments (enrolment_id, subject_id) values ('20000000-0000-0000-0000-000000000014', '${ID.math}');
  set session_replication_role = origin;`)
const blockedView = await rpc(A, `public.academic_compare_years('${newMath}')`)
const blocked = blockedView.years
eq('a scale that cannot be normalised: listed with the reason and no values', [blocked.length, blocked[2].year, blocked[2].compatible, blocked[2].reason, blocked[2].series], [3, '2025-2026', false, 'not_normalisable', null])

done()
