import { createDb, ok, fails, eq, done, ACADEMIC_MIGRATIONS } from './harness.mjs'

const db = await createDb(ACADEMIC_MIGRATIONS)

const A = '00000000-0000-0000-0000-0000000000a1' // student A
const B = '00000000-0000-0000-0000-0000000000b1' // student B
const G = '00000000-0000-0000-0000-0000000000c1' // would-be guardian of A
const ADM = '00000000-0000-0000-0000-0000000000d1'
const OPS = '00000000-0000-0000-0000-0000000000e1'
await ok(db, 'users', `insert into public.users (id, name, role) values
  ('${A}', 'A', 'CUSTOMER'), ('${B}', 'B', 'CUSTOMER'), ('${G}', 'G', 'CUSTOMER'), ('${ADM}', 'Admin', 'ADMIN'), ('${OPS}', 'Ops', 'OPERATIONS')`)

// Fixtures written as the owner (postgres), like the RPCs will.
await ok(db, 'fixtures', `
  insert into academic_education_structures (id, code, name_lo, name_en) values ('10000000-0000-0000-0000-000000000001', 'LA', 'ລາວ', 'Lao');
  insert into academic_grades (id, education_structure_id, code, ordinal, level, label_lo, label_en) values ('10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'G11', 11, 'upper_secondary', 'ມ.6', 'Grade 11');
  insert into academic_years (id, code, start_date, end_date, status) values ('10000000-0000-0000-0000-000000000003', '2026-2027', '2026-09-01', '2027-06-30', 'active');
  insert into academic_grading_scales (id, code, name_lo, name_en) values ('10000000-0000-0000-0000-000000000004', 'S1', 'ສ', 'S');
  insert into academic_grading_scale_versions (id, grading_scale_id, version, scale_family, min_value, max_value, step, decimals, normalisable, status, approved_at) values
    ('10000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000004', 1, 'numeric_linear', 0, 10, 0.5, 1, true, 'approved', now()),
    ('10000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000004', 2, 'numeric_linear', 0, 10, 1, 0, true, 'draft', null);
  insert into academic_schools (id, name_lo, province_code) values ('10000000-0000-0000-0000-000000000009', 'ໂຮງຮຽນ', 'VT');
  insert into academic_calendar_templates (id, name, academic_year_id, scope) values ('10000000-0000-0000-0000-00000000000a', 'Nat', '10000000-0000-0000-0000-000000000003', 'national');
  insert into academic_reporting_periods (id, calendar_template_id, period_type, sequence, label_lo, label_en, start_date, end_date) values ('10000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000a', 'monthly', 1, 'ຕຸລາ', 'Oct', '2026-10-01', '2026-10-31');
  insert into academic_subjects (id, code, name_lo, name_en, grade_min, grade_max) values ('10000000-0000-0000-0000-00000000000d', 'MATH', 'ຄະນິດ', 'Math', 10, 12);
`)
const seedStudent = (n, user) => `
  insert into academic_student_profiles (id, user_id, display_name, age_band, province_code) values ('${n}0000000-0000-0000-0000-000000000001', '${user}', 'S${n}', '16_17', 'VT');
  insert into academic_enrolments (id, student_profile_id, academic_year_id, grade_id, school_id, grading_scale_version_id, calendar_template_id)
    values ('${n}0000000-0000-0000-0000-000000000002', '${n}0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-00000000000a');
  insert into academic_subject_enrolments (id, enrolment_id, subject_id) values ('${n}0000000-0000-0000-0000-000000000003', '${n}0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-00000000000d');
  insert into academic_score_entries (id, enrolment_id, reporting_period_id, state, submitted_at) values ('${n}0000000-0000-0000-0000-000000000004', '${n}0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-00000000000b', 'submitted', now() - interval '1 day');
  insert into academic_score_lines (id, score_entry_id, subject_enrolment_id, raw_value, status, grading_scale_version_id) values ('${n}0000000-0000-0000-0000-000000000005', '${n}0000000-0000-0000-0000-000000000004', '${n}0000000-0000-0000-0000-000000000003', 7, 'scored', '10000000-0000-0000-0000-000000000006');
  update academic_score_lines set raw_value = 8 where id = '${n}0000000-0000-0000-0000-000000000005';
  insert into academic_consent_records (student_profile_id, grantor_user_id, grantor_role, purpose, notice_version, method) values ('${n}0000000-0000-0000-0000-000000000001', '${user}', 'student', 'module_processing', 'v1', 'in_app_checkbox');
  insert into academic_audit_events (actor_user_id, actor_role, action, target_type, student_profile_id) values ('${user}', 'student', 'score_entry.submit', 'score_entry', '${n}0000000-0000-0000-0000-000000000001');`
await ok(db, 'student A data', seedStudent(2, A))
await ok(db, 'student B data', seedStudent(3, B))
await ok(db, 'ops audit', `insert into academic_audit_events (actor_user_id, actor_role, action, target_type) values ('${OPS}', 'support', 'support.lookup', 'student_profile')`)

const STUDENT_TABLES = ['academic_student_profiles', 'academic_enrolments', 'academic_subject_enrolments', 'academic_score_entries', 'academic_score_lines', 'academic_score_revisions', 'academic_consent_records']

// Runs SQL as an API caller and returns the last result's rows.
async function as(user, sql, role = 'authenticated') {
  const res = await db.exec(`begin;
    select set_config('request.jwt.claim.sub', '${user ?? ''}', true);
    select set_config('request.jwt.claim.role', '${role}', true);
    select set_config('request.jwt.claims', '{"aal":"aal2"}', true);
    set local role ${role};
    ${sql};
    commit;`)
  return res.at(-2)?.rows ?? []
}
async function visible(user, role) {
  const out = {}
  for (const t of STUDENT_TABLES) out[t] = (await as(user, `select count(*)::int as n from ${t}`, role))[0].n
  return out
}
const all = (n) => Object.fromEntries(STUDENT_TABLES.map((t) => [t, n]))

// Student data is RPC-only (OD-01c): direct reads are refused outright.
await fails(db, 'direct reads revoked', `select set_config('request.jwt.claim.sub', '${A}', true); set local role authenticated; select * from academic_score_lines`, 'permission denied')
// Re-grant here only, to prove the RLS policies still hold as a backstop.
await ok(db, 'grant for backstop tests', STUDENT_TABLES.map((t) => `grant select on ${t} to authenticated;`).join(' '))

const setFlag = (on) => db.exec(`update academic_settings set value = '${on}' where key = 'my_scores_enabled'`)

// Module off: even owners see nothing; admins still can (for their own testing).
await setFlag(false)
// ...except their own consent history, so they can always review or withdraw it.
eq('flag off: owner sees only consent history', await visible(A), { ...all(0), academic_consent_records: 1 })
eq('flag off: module disabled for student', (await as(A, `select public.academic_module_enabled() as on`))[0].on, false)
eq('flag off: enabled for admin', (await as(ADM, `select public.academic_module_enabled() as on`))[0].on, true)

await setFlag(true)
eq('owner sees exactly own rows', await visible(A), all(1))
eq('owner sees own profile only', (await as(A, `select user_id from academic_student_profiles`)).map((r) => r.user_id), [A])
eq('other student sees only theirs', (await as(B, `select user_id from academic_student_profiles`)).map((r) => r.user_id), [B])

// IDOR: asking for B's records by id returns nothing (the API maps this to 404).
eq('IDOR profile by id', await as(A, `select id from academic_student_profiles where id = '30000000-0000-0000-0000-000000000001'`), [])
eq('IDOR enrolment by id', await as(A, `select id from academic_enrolments where id = '30000000-0000-0000-0000-000000000002'`), [])
eq('IDOR score lines by entry', await as(A, `select id from academic_score_lines where score_entry_id = '30000000-0000-0000-0000-000000000004'`), [])
eq('IDOR revisions by line', await as(A, `select id from academic_score_revisions where score_line_id = '30000000-0000-0000-0000-000000000005'`), [])
eq('IDOR helper denies', (await as(A, `select public.academic_can_read_profile('30000000-0000-0000-0000-000000000001') as ok`))[0].ok, false)

// Guardian (Phase 3 stub) and a non-student user get nothing.
eq('guardian stub sees nothing', await visible(G), all(0))
await fails(db, 'guardian helper not callable by clients', `select set_config('request.jwt.claim.sub', '${G}', true); set local role authenticated; select public.academic_guardian_can_read('20000000-0000-0000-0000-000000000001', 'scores')`, 'permission denied')

// Admin and operations: no standing access to student records.
eq('admin sees no student records', await visible(ADM), all(0))
eq('operations sees no student records', await visible(OPS), all(0))

// anon: no access at all.
await fails(db, 'anon cannot read profiles', `set local role anon; select * from academic_student_profiles`, 'permission denied')
await fails(db, 'anon cannot read config', `set local role anon; select * from academic_subjects`, 'permission denied')

// Students cannot write their own records directly (RPCs only).
const asUser = (user, sql) => `select set_config('request.jwt.claim.sub', '${user}', true); select set_config('request.jwt.claims', '{"aal":"aal2"}', true); set local role authenticated; ${sql}`
await fails(db, 'student direct insert profile', asUser(G, `insert into academic_student_profiles (user_id, display_name, age_band, province_code) values ('${G}', 'G', '18_plus', 'VT')`), 'permission denied')
await fails(db, 'student direct update score', asUser(A, `update academic_score_lines set raw_value = 10 where id = '20000000-0000-0000-0000-000000000005'`), 'permission denied')
await fails(db, 'student direct delete entry', asUser(A, `delete from academic_score_entries`), 'permission denied')
await fails(db, 'student direct consent insert', asUser(A, `insert into academic_consent_records (student_profile_id, grantor_user_id, grantor_role, purpose, notice_version, method) values ('20000000-0000-0000-0000-000000000001', '${A}', 'student', 'push', 'v1', 'in_app_checkbox')`), 'permission denied')
await fails(db, 'student direct audit insert', asUser(A, `insert into academic_audit_events (actor_role, action, target_type) values ('student', 'x', 'y')`), 'permission denied')
eq('A score unchanged', (await db.query(`select raw_value from academic_score_lines where id = '20000000-0000-0000-0000-000000000005'`)).rows[0].raw_value, '8.00')

// Configuration: everyone signed in reads; only ADMIN writes.
eq('student reads subjects', (await as(A, `select count(*)::int as n from academic_subjects`))[0].n, 1)
eq('student sees approved scale versions only', (await as(A, `select version from academic_grading_scale_versions`)).map((r) => r.version), [1])
eq('admin sees draft scale versions', (await as(ADM, `select count(*)::int as n from academic_grading_scale_versions`))[0].n, 2)
await fails(db, 'student cannot add subject', asUser(A, `insert into academic_subjects (code, name_lo, name_en, grade_min, grade_max) values ('X', 'x', 'x', 10, 12)`), 'row-level security')
eq('student cannot flip flag', await as(A, `update academic_settings set value = 'false' where key = 'my_scores_enabled' returning key`), [])
eq('flag still on', (await db.query(`select value from academic_settings where key = 'my_scores_enabled'`)).rows[0].value, true)
eq('operations cannot edit config', (await as(OPS, `update academic_subjects set name_en = 'Hacked' returning id`)), [])
await as(ADM, `insert into academic_subjects (code, name_lo, name_en, grade_min, grade_max) values ('PHYS', 'ຟີຊິກ', 'Physics', 10, 12)`)
eq('admin added subject', (await db.query(`select count(*)::int as n from academic_subjects where code = 'PHYS'`)).rows[0].n, 1)
await fails(db, 'admin still bound by scale immutability', asUser(ADM, `update academic_grading_scale_versions set max_value = 20 where id = '10000000-0000-0000-0000-000000000006'`), 'cannot be changed')
await fails(db, 'admin cannot delete period with scores', asUser(ADM, `delete from academic_reporting_periods where id = '10000000-0000-0000-0000-00000000000b'`), 'foreign key')

// Audit log.
// 3 seeded events + the admin's audited subject insert.
eq('admin reads all audit events', (await as(ADM, `select count(*)::int as n from academic_audit_events`))[0].n, 4)
eq('operations reads own actions only', (await as(OPS, `select actor_user_id from academic_audit_events`)).map((r) => r.actor_user_id), [OPS])
eq('student reads no audit events', (await as(A, `select count(*)::int as n from academic_audit_events`))[0].n, 0)

// Service role bypasses RLS for export/deletion jobs.
eq('service role sees everything', await visible(null, 'service_role'), all(2))

done()
