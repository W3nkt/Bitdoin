import { createDb, ok, fails, eq, done, ACADEMIC_MIGRATIONS } from './harness.mjs'

const db = await createDb(ACADEMIC_MIGRATIONS)

const A = '00000000-0000-0000-0000-0000000000a1'
const B = '00000000-0000-0000-0000-0000000000b1'
const ADM = '00000000-0000-0000-0000-0000000000d1'
const GHOST = '00000000-0000-0000-0000-0000000000f1' // valid JWT shape, no Bitdoin account
await ok(db, 'users', `insert into public.users (id, name, role) values ('${A}', 'A', 'CUSTOMER'), ('${B}', 'B', 'CUSTOMER'), ('${ADM}', 'Admin', 'ADMIN')`)

const HEADERS = JSON.stringify({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1', 'user-agent': 'Mozilla/5.0 test' })
const caller = (user, role = 'authenticated') => `
  select set_config('request.jwt.claim.sub', '${user ?? ''}', true);
  select set_config('request.jwt.claim.role', '${role}', true);
    select set_config('request.jwt.claims', '{"aal":"aal2"}', true);
  select set_config('request.headers', '${HEADERS}', true);
  set local role ${role};`

// Runs SQL as an API caller; returns the rows of the final statement.
async function as(user, sql, role) {
  const res = await db.exec(`begin; ${caller(user, role)} ${sql}; commit;`)
  return res.at(-2)?.rows ?? []
}
const session = async (user) => (await as(user, `select public.academic_get_session() as s`))[0].s

// Raised errors carry SQLSTATE PT<status> and the code as the message.
async function errorOf(user, sql, role) {
  try {
    await db.exec(`begin; ${caller(user, role)} ${sql}; commit;`)
    return null
  } catch (e) {
    await db.exec('rollback').catch(() => {})
    return { code: e.message, sqlstate: e.code }
  }
}

// ─── Session resolution (AUTH-001) ───────────────────────────────────────────

eq('no session -> 401', await errorOf(null, `select public.academic_get_session()`), { code: 'UNAUTHENTICATED', sqlstate: 'PT401' })
eq('unknown user -> 401', await errorOf(GHOST, `select public.academic_get_session()`), { code: 'UNAUTHENTICATED', sqlstate: 'PT401' })
await fails(db, 'anon cannot call', `${caller(null, 'anon')} select public.academic_get_session()`, 'permission denied')

let s = await session(A)
eq('module off -> unavailable', [s.module_enabled, s.next_step, s.profile], [false, 'unavailable', null])
eq('resolves existing user', s.user, { id: A, role: 'CUSTOMER', language: 'lo' })
eq('admin can use module before launch', (await session(ADM)).next_step, 'onboarding')

await ok(db, 'enable module', `update academic_settings set value = 'true' where key = 'my_scores_enabled'`)
eq('no profile -> onboarding', (await session(A)).next_step, 'onboarding')

// Profile without consent -> consent step; writes refused.
await ok(db, 'config', `
  insert into academic_education_structures (id, code, name_lo, name_en) values ('10000000-0000-0000-0000-000000000001', 'LA', 'ລາວ', 'Lao');
  insert into academic_grades (id, education_structure_id, code, ordinal, level, label_lo, label_en) values ('10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'G11', 11, 'upper_secondary', 'ມ.6', 'Grade 11');
  insert into academic_years (id, code, start_date, end_date, status) values ('10000000-0000-0000-0000-000000000003', '2026-2027', '2026-09-01', '2027-05-31', 'active');
  insert into academic_grading_scales (id, code, name_lo, name_en) values ('10000000-0000-0000-0000-000000000004', 'S1', 'ສ', 'S');
  insert into academic_grading_scale_versions (id, grading_scale_id, version, scale_family, min_value, max_value, step, decimals, normalisable, status, approved_at) values ('10000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000004', 1, 'numeric_linear', 0, 10, 0.5, 1, true, 'approved', now());
  insert into academic_calendar_templates (id, name, academic_year_id, scope) values ('10000000-0000-0000-0000-00000000000a', 'Nat', '10000000-0000-0000-0000-000000000003', 'national');
  insert into academic_student_profiles (id, user_id, display_name, age_band, province_code) values ('20000000-0000-0000-0000-000000000001', '${A}', 'Noy', '16_17', 'VT');`)
s = await session(A)
eq('profile without consent -> consent', [s.next_step, s.profile.display_name, s.consent.module_processing], ['consent', 'Noy', false])
eq('write without consent -> 403', await errorOf(A, `select public.academic_require_profile(true)`, 'postgres'), { code: 'CONSENT_REQUIRED', sqlstate: 'PT403' })

await ok(db, 'consent', `insert into academic_consent_records (student_profile_id, grantor_user_id, grantor_role, purpose, notice_version, method) values ('20000000-0000-0000-0000-000000000001', '${A}', 'student', 'module_processing', '2026-10-draft', 'in_app_checkbox')`)
eq('consent but no enrolment -> new_school_year', (await session(A)).next_step, 'new_school_year')
await ok(db, 'enrolment', `insert into academic_schools (id, name_lo, province_code) values ('10000000-0000-0000-0000-000000000009', 'ໂຮງຮຽນ', 'VT');
  insert into academic_enrolments (id, student_profile_id, academic_year_id, grade_id, school_id, grading_scale_version_id, calendar_template_id)
  values ('20000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-00000000000a')`)
s = await session(A)
eq('ready', [s.next_step, s.active_enrolment_id], ['ready', '20000000-0000-0000-0000-000000000002'])

// A new notice version requires re-acknowledgement (PRIV-001).
await ok(db, 'new notice', `update academic_settings set value = '"2027-01"' where key = 'consent_notice_version'`)
eq('notice change -> consent', (await session(A)).next_step, 'consent')
await ok(db, 'restore notice', `update academic_settings set value = '"2026-10-draft"' where key = 'consent_notice_version'`)

// Year rollover (PROFILE-004).
await ok(db, 'roll over year', `update academic_years set status = 'closed' where code = '2026-2027';
  insert into academic_years (code, start_date, end_date, status) values ('2027-2028', '2027-09-01', '2028-05-31', 'active')`)
eq('rollover -> new_school_year', (await session(A)).next_step, 'new_school_year')
await ok(db, 'undo rollover', `delete from academic_years where code = '2027-2028'; update academic_years set status = 'active' where code = '2026-2027'`)

// The session never exposes another user's data, whatever the client sends.
eq('B is onboarding, not A', [(await session(B)).user.id, (await session(B)).profile], [B, null])

// Profile guard for writes.
eq('write as owner resolves own profile', (await as(A, `select (public.academic_require_profile(true)).id as id`, 'postgres'))[0].id, '20000000-0000-0000-0000-000000000001')
eq('no profile -> 404', await errorOf(B, `select public.academic_require_profile(false)`, 'postgres'), { code: 'PROFILE_REQUIRED', sqlstate: 'PT404' })
await ok(db, 'deletion pending', `update academic_student_profiles set status = 'deletion_pending', deletion_requested_at = now(), deletion_scope = 'profile' where user_id = '${A}'`)
eq('read-only profile refuses writes', await errorOf(A, `select public.academic_require_profile(true)`, 'postgres'), { code: 'PROFILE_READ_ONLY', sqlstate: 'PT409' })
eq('read-only profile still readable', (await as(A, `select (public.academic_require_profile(false)).status as s`, 'postgres'))[0].s, 'deletion_pending')
await ok(db, 'reactivate', `update academic_student_profiles set status = 'active', deletion_requested_at = null, deletion_scope = null where user_id = '${A}'`)
await ok(db, 'module off again', `update academic_settings set value = 'false' where key = 'my_scores_enabled'`)
eq('module off -> 403', await errorOf(A, `select public.academic_require_profile(false)`, 'postgres'), { code: 'MODULE_DISABLED', sqlstate: 'PT403' })
await ok(db, 'module on', `update academic_settings set value = 'true' where key = 'my_scores_enabled'`)

// Internal helpers are not callable from the API.
for (const fn of [`academic_require_profile(true)`, `academic_audit('x', 'y')`, `academic_deny('score_line', null)`, `academic_raise('X', 400)`, `academic_request_hash('ip')`]) {
  await fails(db, `client cannot call ${fn}`, `${caller(A)} select public.${fn}`, 'permission denied')
}
await fails(db, 'private settings hidden', `${caller(ADM)} select * from academic_private_settings`, 'permission denied')

// ─── Audit (BE-007) ──────────────────────────────────────────────────────────

await ok(db, 'clear audit', `delete from academic_audit_events`)

// Denial: audit row survives because the 404 is returned, not raised (AUTH-002).
const denied = (await as(A, `select public.academic_deny('score_line', '30000000-0000-0000-0000-000000000005') as r`, 'postgres'))[0].r
eq('deny returns 404 envelope', denied, { error: { code: 'NOT_FOUND', status: 404 } })
const ev = (await db.query(`select actor_user_id, actor_role, action, target_type, target_id, student_profile_id, outcome, length(ip_hash) as ip_len, length(user_agent_hash) as ua_len from academic_audit_events`)).rows
eq('access_denied event', ev, [{ actor_user_id: A, actor_role: 'student', action: 'access_denied', target_type: 'score_line', target_id: '30000000-0000-0000-0000-000000000005', student_profile_id: '20000000-0000-0000-0000-000000000001', outcome: 'denied', ip_len: 64, ua_len: 64 }])
const rawIp = (await db.query(`select count(*)::int as n from academic_audit_events where ip_hash like '%203.0.113.7%' or ip_hash = encode(sha256(convert_to('203.0.113.7', 'UTF8')), 'hex')`)).rows[0].n
eq('ip is salted, not stored or plainly hashed', rawIp, 0)

// Admin configuration writes are audited automatically.
await ok(db, 'clear audit', `delete from academic_audit_events`)
await as(ADM, `insert into academic_subjects (id, code, name_lo, name_en, grade_min, grade_max) values ('10000000-0000-0000-0000-00000000000d', 'MATH', 'ຄະນິດ', 'Math', 10, 12)`)
await as(ADM, `update academic_subjects set name_en = 'Mathematics' where code = 'MATH'`)
await as(ADM, `update academic_settings set value = 'true' where key = 'my_scores_enabled'`)
await as(ADM, `delete from academic_subjects where code = 'MATH'`)
eq('config writes audited', (await db.query(`select actor_role, action, target_type, target_id, reason from academic_audit_events order by occurred_at, action`)).rows.map((r) => [r.actor_role, r.action, r.target_type, r.target_id, r.reason]), [
  ['admin', 'config.insert', 'subjects', '10000000-0000-0000-0000-00000000000d', null],
  ['admin', 'config.update', 'subjects', '10000000-0000-0000-0000-00000000000d', null],
  ['admin', 'config.update', 'settings', null, 'my_scores_enabled'],
  ['admin', 'config.delete', 'subjects', '10000000-0000-0000-0000-00000000000d', null],
])
eq('no score values or names in audit', (await db.query(`select count(*)::int as n from academic_audit_events where reason ilike '%math%'`)).rows[0].n, 0)

// Role grants are audited.
await ok(db, 'clear audit', `delete from academic_audit_events`)
await as(ADM, `update public.users set role = 'OPERATIONS' where id = '${B}'`, 'postgres')
await as(ADM, `update public.users set name = 'Bee' where id = '${B}'`, 'postgres')
eq('role change audited once', (await db.query(`select actor_user_id, action, target_id, reason from academic_audit_events`)).rows, [{ actor_user_id: ADM, action: 'admin.role_change', target_id: B, reason: 'CUSTOMER -> OPERATIONS' }])
eq('operations caller recorded as support', (await as(B, `select public.academic_actor_role() as r`, 'postgres'))[0].r, 'support')

// Tamper tests: nobody alters or forges audit rows through the API.
await fails(db, 'admin cannot update audit', `${caller(ADM)} update academic_audit_events set outcome = 'success'`, 'permission denied')
await fails(db, 'admin cannot delete audit', `${caller(ADM)} delete from academic_audit_events`, 'permission denied')
await fails(db, 'student cannot forge audit', `${caller(A)} insert into academic_audit_events (actor_role, action, target_type) values ('admin', 'x', 'y')`, 'permission denied')
await fails(db, 'owner cannot update audit either', `update academic_audit_events set outcome = 'error'`, 'append-only')
eq('admin can read audit', (await as(ADM, `select count(*)::int as n from academic_audit_events`))[0].n, 1)

// Migrations/seeds (no API caller) do not flood the log.
await ok(db, 'clear audit', `delete from academic_audit_events`)
await ok(db, 'system config write', `insert into academic_subjects (code, name_lo, name_en, grade_min, grade_max) values ('ENG', 'ອັງກິດ', 'English', 10, 12)`)
eq('system writes not logged', (await db.query(`select count(*)::int as n from academic_audit_events`)).rows[0].n, 0)

done()
