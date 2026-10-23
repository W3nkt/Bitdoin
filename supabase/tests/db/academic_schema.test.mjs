import { createDb, ok, fails, eq, done } from './harness.mjs'

const db = await createDb(['109_academic_module_schema.sql'])

const U = '00000000-0000-0000-0000-00000000000a'
const ADMIN = '00000000-0000-0000-0000-00000000000b'
await ok(db, 'users', `insert into public.users (id, name, role) values ('${U}', 'Student', 'CUSTOMER'), ('${ADMIN}', 'Admin', 'ADMIN')`)

// Configuration fixtures with fixed ids.
await ok(db, 'config', `
  insert into academic_education_structures (id, code, name_lo, name_en) values ('10000000-0000-0000-0000-000000000001', 'LA-5-4-3', 'ໂຄງສ້າງ', 'Lao 5-4-3');
  insert into academic_grades (id, education_structure_id, code, ordinal, level, label_lo, label_en)
    values ('10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'G11', 11, 'upper_secondary', 'ມ.6', 'Grade 11');
  insert into academic_years (id, code, start_date, end_date, status) values
    ('10000000-0000-0000-0000-000000000003', '2026-2027', '2026-09-01', '2027-06-30', 'active'),
    ('10000000-0000-0000-0000-000000000013', '2027-2028', '2027-09-01', '2028-06-30', 'upcoming');
  insert into academic_grading_scales (id, code, name_lo, name_en) values
    ('10000000-0000-0000-0000-000000000004', 'S1', 'ສະເກວ 10', '0-10'),
    ('10000000-0000-0000-0000-000000000005', 'S2', 'ສະເກວ 50', '0-50'),
    ('10000000-0000-0000-0000-000000000016', 'ORD', 'ລະດັບ', 'Letters');
  insert into academic_grading_scale_versions (id, grading_scale_id, version, scale_family, min_value, max_value, step, decimals, pass_mark, normalisable, status, approved_at) values
    ('10000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000004', 1, 'numeric_linear', 0, 10, 0.5, 1, 5, true, 'approved', now()),
    ('10000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000005', 1, 'numeric_linear', 0, 50, 1, 0, 25, true, 'approved', now()),
    ('10000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000004', 2, 'numeric_linear', 0, 10, 1, 0, 5, true, 'draft', null);
  insert into academic_grading_scale_versions (id, grading_scale_id, version, scale_family, ordinal_levels, status, approved_at) values
    ('10000000-0000-0000-0000-000000000017', '10000000-0000-0000-0000-000000000016', 1, 'ordinal', '[{"code":"C"},{"code":"B"},{"code":"A"}]', 'approved', now());
  insert into academic_schools (id, name_lo, romanised_name, province_code) values ('10000000-0000-0000-0000-000000000009', 'ໂຮງຮຽນ ມັດທະຍົມ ທົດລອງ', 'Hongherien Matthayom Thotlong', 'VT');
  insert into academic_calendar_templates (id, name, academic_year_id, scope) values
    ('10000000-0000-0000-0000-00000000000a', 'National 2026-27', '10000000-0000-0000-0000-000000000003', 'national'),
    ('10000000-0000-0000-0000-00000000001a', 'National 2027-28', '10000000-0000-0000-0000-000000000013', 'national');
  insert into academic_reporting_periods (id, calendar_template_id, period_type, sequence, label_lo, label_en, start_date, end_date) values
    ('10000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000a', 'monthly', 2, 'ຕຸລາ', 'October', '2026-10-01', '2026-10-31'),
    ('10000000-0000-0000-0000-00000000000c', '10000000-0000-0000-0000-00000000000a', 'monthly', 3, 'ພະຈິກ', 'November', '2026-11-01', '2026-11-30'),
    ('10000000-0000-0000-0000-00000000001b', '10000000-0000-0000-0000-00000000001a', 'monthly', 2, 'ຕຸລາ', 'October', '2027-10-01', '2027-10-31');
  insert into academic_subjects (id, code, name_lo, name_en, grade_min, grade_max) values
    ('10000000-0000-0000-0000-00000000000d', 'MATH', 'ຄະນິດສາດ', 'Mathematics', 10, 12),
    ('10000000-0000-0000-0000-00000000000e', 'LAO', 'ພາສາລາວ', 'Lao language', 10, 12);
`)

await fails(db, 'scale version range', `insert into academic_grading_scale_versions (grading_scale_id, version, scale_family, min_value, max_value) values ('10000000-0000-0000-0000-000000000004', 9, 'numeric_linear', 10, 5)`, 'check')
await fails(db, 'ordinal not normalisable', `insert into academic_grading_scale_versions (grading_scale_id, version, scale_family, ordinal_levels, normalisable) values ('10000000-0000-0000-0000-000000000016', 9, 'ordinal', '[{"code":"A"}]', true)`, 'check')
await fails(db, 'second active year', `update academic_years set status = 'active' where code = '2027-2028'`, 'unique|duplicate')
await fails(db, 'duplicate global alias', `
  insert into academic_subject_aliases (subject_id, alias_text, alias_normalised) values ('10000000-0000-0000-0000-00000000000d', 'Maths', 'maths');
  insert into academic_subject_aliases (subject_id, alias_text, alias_normalised) values ('10000000-0000-0000-0000-00000000000d', 'MATHS', 'maths')`, 'duplicate')

// Trigram search finds a romanised spelling.
const found = await ok(db, 'school search', `select id from academic_schools where lower(name_lo || ' ' || coalesce(name_en, '') || ' ' || coalesce(romanised_name, '')) % 'matthayom thotlong'`)
eq('school search hit', found.length, 1)

// Profile and enrolment.
const P = '20000000-0000-0000-0000-000000000001'
const E = '20000000-0000-0000-0000-000000000002'
await ok(db, 'profile', `insert into academic_student_profiles (id, user_id, display_name, age_band, province_code) values ('${P}', '${U}', 'Noy', '16_17', 'VT')`)
await fails(db, 'second profile for user', `insert into academic_student_profiles (user_id, display_name, age_band, province_code) values ('${U}', 'X', '16_17', 'VT')`, 'duplicate')
await fails(db, 'under 13 not supported', `insert into academic_student_profiles (user_id, display_name, age_band, province_code) values ('${ADMIN}', 'X', 'u13', 'VT')`, 'check')
await fails(db, 'blank display name', `insert into academic_student_profiles (user_id, display_name, age_band, province_code) values ('${ADMIN}', '  ', '18_plus', 'VT')`, 'check')

const enrol = (id, extra = {}) => {
  const f = {
    id: `'${id}'`, student_profile_id: `'${P}'`, academic_year_id: `'10000000-0000-0000-0000-000000000003'`,
    grade_id: `'10000000-0000-0000-0000-000000000002'`, school_id: `'10000000-0000-0000-0000-000000000009'`,
    grading_scale_version_id: `'10000000-0000-0000-0000-000000000006'`, calendar_template_id: `'10000000-0000-0000-0000-00000000000a'`,
    ...extra,
  }
  return `insert into academic_enrolments (${Object.keys(f).join(', ')}) values (${Object.values(f).join(', ')})`
}
await fails(db, 'draft scale not assignable', enrol('20000000-0000-0000-0000-0000000000f1', { grading_scale_version_id: `'10000000-0000-0000-0000-000000000008'` }), 'not approved')
await fails(db, 'calendar from other year', enrol('20000000-0000-0000-0000-0000000000f2', { calendar_template_id: `'10000000-0000-0000-0000-00000000001a'` }), 'does not belong')
await fails(db, 'no school', enrol('20000000-0000-0000-0000-0000000000f3', { school_id: 'null' }), 'check')
await fails(db, 'free text must be unverified', enrol('20000000-0000-0000-0000-0000000000f4', { school_id: 'null', school_free_text: `'My school'` }), 'check')
await ok(db, 'enrolment', enrol(E))
await fails(db, 'second active enrolment', enrol('20000000-0000-0000-0000-0000000000f5', { school_id: 'null', school_free_text: `'Other'`, school_verification: `'unverified_school'` }), 'duplicate')

// Subjects on the enrolment, with the per-enrolment limit.
const SE1 = '20000000-0000-0000-0000-000000000003'
const SE2 = '20000000-0000-0000-0000-000000000004'
await ok(db, 'subject enrolments', `
  insert into academic_subject_enrolments (id, enrolment_id, subject_id, display_order) values ('${SE1}', '${E}', '10000000-0000-0000-0000-00000000000d', 1);
  insert into academic_subject_enrolments (id, enrolment_id, custom_name, display_order) values ('${SE2}', '${E}', 'Robotics', 2)`)
await fails(db, 'duplicate subject', `insert into academic_subject_enrolments (enrolment_id, subject_id) values ('${E}', '10000000-0000-0000-0000-00000000000d')`, 'duplicate')
await fails(db, 'duplicate custom name', `insert into academic_subject_enrolments (enrolment_id, custom_name) values ('${E}', ' robotics ')`, 'duplicate')
await ok(db, 'lower limit', `update academic_settings set value = '2' where key = 'max_subjects_per_enrolment'`)
await fails(db, 'subject limit', `insert into academic_subject_enrolments (enrolment_id, subject_id) values ('${E}', '10000000-0000-0000-0000-00000000000e')`, 'at most 2')
await ok(db, 'restore limit', `update academic_settings set value = '25' where key = 'max_subjects_per_enrolment'`)

// Score entries.
const SC = '20000000-0000-0000-0000-000000000005'
await fails(db, 'period from another calendar', `insert into academic_score_entries (enrolment_id, reporting_period_id) values ('${E}', '10000000-0000-0000-0000-00000000001b')`, 'not in the enrolment calendar')
await ok(db, 'draft entry', `insert into academic_score_entries (id, enrolment_id, reporting_period_id, idempotency_key) values ('${SC}', '${E}', '10000000-0000-0000-0000-00000000000b', 'k1')`)
await fails(db, 'duplicate entry for period (SCORE-009)', `insert into academic_score_entries (enrolment_id, reporting_period_id) values ('${E}', '10000000-0000-0000-0000-00000000000b')`, 'duplicate')
await fails(db, 'submitted needs submitted_at', `update academic_score_entries set state = 'submitted' where id = '${SC}'`, 'check')

// Score lines and scale validation (SCORE-003/004/008).
const line = (value, extra = '') => `insert into academic_score_lines (score_entry_id, subject_enrolment_id, raw_value, status, grading_scale_version_id${extra ? ', ordinal_code' : ''}) values ('${SC}', '${SE1}', ${value}, ${value === 'null' ? `'missing'` : `'scored'`}, '10000000-0000-0000-0000-000000000008'${extra})`
await fails(db, 'above max', line(11), 'between 0.00 and 10.00')
await fails(db, 'off step', line(7.3), 'decimal|steps')
await fails(db, 'off step 7.25', line(7.25), 'decimal|steps')
await fails(db, 'scored without value', `insert into academic_score_lines (score_entry_id, subject_enrolment_id, status, grading_scale_version_id) values ('${SC}', '${SE1}', 'scored', '10000000-0000-0000-0000-000000000006')`, 'expects a number')
await fails(db, 'missing with value', `insert into academic_score_lines (score_entry_id, subject_enrolment_id, raw_value, status, grading_scale_version_id) values ('${SC}', '${SE1}', 5, 'missing', '10000000-0000-0000-0000-000000000006')`, 'check')
await ok(db, 'valid line 7.5', line(7.5))
const L1 = (await ok(db, 'line row', `select id, grading_scale_version_id, normalised_value from academic_score_lines where subject_enrolment_id = '${SE1}'`))[0]
eq('scale copied from enrolment, not client', L1.grading_scale_version_id, '10000000-0000-0000-0000-000000000006')
eq('normalised 7.5/10', L1.normalised_value, '0.7500')
await ok(db, 'missing line', `insert into academic_score_lines (score_entry_id, subject_enrolment_id, status, grading_scale_version_id) values ('${SC}', '${SE2}', 'missing', '10000000-0000-0000-0000-000000000006')`)
await fails(db, 'duplicate current line', line(8), 'duplicate')

// Subject from another enrolment is rejected.
await ok(db, 'other user', `insert into public.users (id, name) values ('00000000-0000-0000-0000-00000000000c', 'Other');
  insert into academic_student_profiles (id, user_id, display_name, age_band, province_code) values ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', 'Ola', '18_plus', 'VT');
  insert into academic_enrolments (id, student_profile_id, academic_year_id, grade_id, school_id, grading_scale_version_id, calendar_template_id)
    values ('30000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-00000000000a');
  insert into academic_subject_enrolments (id, enrolment_id, subject_id) values ('30000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-00000000000d');
  insert into academic_score_entries (id, enrolment_id, reporting_period_id) values ('30000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-00000000000b')`)
await fails(db, 'cross-enrolment subject', `insert into academic_score_lines (score_entry_id, subject_enrolment_id, raw_value, status, grading_scale_version_id) values ('${SC}', '30000000-0000-0000-0000-000000000003', 5, 'scored', '10000000-0000-0000-0000-000000000006')`, 'not part of this enrolment')
// SCORE-008 example: 38/50 under S2 -> 0.76.
await ok(db, 'S2 line', `insert into academic_score_lines (score_entry_id, subject_enrolment_id, raw_value, status, grading_scale_version_id) values ('30000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000003', 38, 'scored', '10000000-0000-0000-0000-000000000006')`)
const s2 = await ok(db, 'S2 row', `select raw_value, normalised_value, grading_scale_version_id from academic_score_lines where score_entry_id = '30000000-0000-0000-0000-000000000004'`)
eq('SCORE-008 raw and normalised', [s2[0].raw_value, s2[0].normalised_value, s2[0].grading_scale_version_id], ['38.00', '0.7600', '10000000-0000-0000-0000-000000000007'])

// Ordinal scale validation.
await ok(db, 'ordinal enrolment', `update academic_enrolments set grading_scale_version_id = '10000000-0000-0000-0000-000000000017' where id = '30000000-0000-0000-0000-000000000002';
  insert into academic_score_entries (id, enrolment_id, reporting_period_id) values ('30000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-00000000000c')`)
await fails(db, 'unknown ordinal', `insert into academic_score_lines (score_entry_id, subject_enrolment_id, ordinal_code, status, grading_scale_version_id) values ('30000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000003', 'Z', 'scored', '10000000-0000-0000-0000-000000000006')`, 'not a level')
await ok(db, 'valid ordinal', `insert into academic_score_lines (score_entry_id, subject_enrolment_id, ordinal_code, status, grading_scale_version_id) values ('30000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000003', 'A', 'scored', '10000000-0000-0000-0000-000000000006')`)

// Draft edits leave no revision; submission in the same transaction leaves none either.
await ok(db, 'draft edit', `update academic_score_lines set raw_value = 8 where subject_enrolment_id = '${SE1}'`)
await ok(db, 'submit with last-minute edit', `begin;
  update academic_score_entries set state = 'submitted', submitted_at = now() where id = '${SC}';
  update academic_score_lines set raw_value = 8.5 where subject_enrolment_id = '${SE1}';
  commit;`)
eq('no revisions yet', (await ok(db, 'count', `select count(*)::int as n from academic_score_revisions`))[0].n, 0)
await fails(db, 'submitted back to draft', `update academic_score_entries set state = 'draft', submitted_at = null where id = '${SC}'`, 'cannot return to draft')
const ver = (await ok(db, 'version before', `select version from academic_score_lines where subject_enrolment_id = '${SE1}'`))[0].version

// Correction by the student with a reason (SCORE-007).
await ok(db, 'correction', `begin;
  select set_config('request.jwt.claim.sub', '${U}', true);
  select set_config('academic.revision_reason', 'Teacher fixed my mark', true);
  update academic_score_lines set raw_value = 9 where subject_enrolment_id = '${SE1}';
  commit;`)
const rev = await ok(db, 'revision', `select old_value, new_value, actor_role, actor_user_id, reason from academic_score_revisions`)
eq('revision recorded', rev, [{ old_value: '8.50', new_value: '9.00', actor_role: 'student', actor_user_id: U, reason: 'Teacher fixed my mark' }])
eq('version bumped', (await ok(db, 'version after', `select version from academic_score_lines where subject_enrolment_id = '${SE1}'`))[0].version, ver + 1)
await ok(db, 'admin correction', `begin;
  select set_config('request.jwt.claim.sub', '${ADMIN}', true);
  update academic_score_lines set status = 'exempt', raw_value = null where subject_enrolment_id = '${SE1}';
  commit;`)
eq('admin revision', (await ok(db, 'admin rev', `select actor_role, new_status, reason from academic_score_revisions order by created_at desc limit 1`))[0], { actor_role: 'admin', new_status: 'exempt', reason: null })
await fails(db, 'revision immutable', `update academic_score_revisions set reason = 'x'`, 'append-only')
await fails(db, 'line cannot move', `update academic_score_lines set subject_enrolment_id = '${SE2}' where subject_enrolment_id = '${SE1}'`, 'cannot move')

// Approved scale versions are immutable.
await fails(db, 'edit approved scale', `update academic_grading_scale_versions set max_value = 20 where id = '10000000-0000-0000-0000-000000000006'`, 'cannot be changed')
await fails(db, 'delete approved scale', `delete from academic_grading_scale_versions where id = '10000000-0000-0000-0000-000000000007'`, 'retire')
await ok(db, 'retire scale', `update academic_grading_scale_versions set status = 'retired' where id = '10000000-0000-0000-0000-000000000007'`)
await fails(db, 'unretire scale', `update academic_grading_scale_versions set status = 'approved' where id = '10000000-0000-0000-0000-000000000007'`, 'cannot be changed')
await ok(db, 'edit draft scale', `update academic_grading_scale_versions set step = 0.5 where id = '10000000-0000-0000-0000-000000000008'`)

// Consent records are append-only (PRIV-003).
const C = '40000000-0000-0000-0000-000000000001'
await ok(db, 'consent', `insert into academic_consent_records (id, student_profile_id, grantor_user_id, grantor_role, purpose, notice_version, method) values ('${C}', '${P}', '${U}', 'student', 'module_processing', '2026-10-draft', 'in_app_checkbox')`)
await fails(db, 'second active consent', `insert into academic_consent_records (student_profile_id, grantor_user_id, grantor_role, purpose, notice_version, method) values ('${P}', '${U}', 'student', 'module_processing', '2026-10-draft', 'in_app_checkbox')`, 'duplicate')
await fails(db, 'edit consent', `update academic_consent_records set notice_version = 'v2' where id = '${C}'`, 'append-only')
await fails(db, 'delete consent', `delete from academic_consent_records where id = '${C}'`, 'append-only')
await ok(db, 'withdraw consent', `update academic_consent_records set withdrawn_at = now() where id = '${C}'`)
await fails(db, 'withdraw twice', `update academic_consent_records set withdrawn_at = now() + interval '1 day' where id = '${C}'`, 'append-only')
await ok(db, 'consent again after withdrawal', `insert into academic_consent_records (student_profile_id, grantor_user_id, grantor_role, purpose, notice_version, method) values ('${P}', '${U}', 'student', 'module_processing', '2026-10-draft', 'in_app_checkbox')`)

// Audit events.
await ok(db, 'audit', `insert into academic_audit_events (actor_user_id, actor_role, action, target_type, target_id, student_profile_id) values ('${U}', 'student', 'score_entry.submit', 'score_entry', '${SC}', '${P}')`)
await fails(db, 'audit update', `update academic_audit_events set outcome = 'denied'`, 'append-only')
await ok(db, 'audit delete as user is a no-op', `begin; select set_config('request.jwt.claim.role', 'authenticated', true); set local role authenticated; delete from academic_audit_events; commit;`)
eq('audit row survives', (await ok(db, 'audit count', `select count(*)::int as n from academic_audit_events`))[0].n, 1)

// RLS is on for every module table and anon has no privileges.
const rls = await ok(db, 'rls', `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and c.relname like 'academic\\_%' and not c.relrowsecurity`)
eq('every academic table has RLS', rls, [])
const anon = await ok(db, 'anon grants', `select table_name from information_schema.role_table_grants where grantee = 'anon' and table_name like 'academic\\_%'`)
eq('anon has no grants', anon, [])
await ok(db, 'authenticated sees nothing', `begin; set local role authenticated; select set_config('request.jwt.claim.sub', '${U}', true);
  create temp table seen as select count(*)::int as n from academic_student_profiles; commit;`)

// Deleting the account removes the student's data but keeps consent evidence.
await ok(db, 'delete user', `delete from public.users where id = '${U}'`)
const left = await ok(db, 'leftovers', `select
  (select count(*)::int from academic_student_profiles where id = '${P}') as profiles,
  (select count(*)::int from academic_enrolments where id = '${E}') as enrolments,
  (select count(*)::int from academic_score_lines where score_entry_id = '${SC}') as lines,
  (select count(*)::int from academic_score_revisions) as revisions,
  (select count(*)::int from academic_consent_records where student_profile_id is null and grantor_user_id is null) as orphan_consents,
  (select count(*)::int from academic_audit_events) as audit`)
eq('cascade + retention', left[0], { profiles: 0, enrolments: 0, lines: 0, revisions: 0, orphan_consents: 2, audit: 1 })

done()
