import { createDb, ok, eq, done, ACADEMIC_MIGRATIONS } from './harness.mjs'
import { CONFIG_SQL, ID, apiFor, json, period, callerSql } from './fixtures.mjs'

const db = await createDb(ACADEMIC_MIGRATIONS)
const { rpc, rpcError, one } = apiFor(db)
const mfa = { aal: 'aal2' }

const A = '00000000-0000-0000-0000-0000000000a1'
const ADM = '00000000-0000-0000-0000-0000000000d1'
const ADM2 = '00000000-0000-0000-0000-0000000000d2'
const OPS = '00000000-0000-0000-0000-0000000000e1'
await ok(db, 'users', `insert into public.users (id, name, role) values
  ('${A}', 'A', 'CUSTOMER'), ('${ADM}', 'Admin', 'ADMIN'), ('${ADM2}', 'Admin 2', 'ADMIN'), ('${OPS}', 'Ops', 'OPERATIONS');
  update public.users set member_code = 'DAN9XY' where id = '${A}'`)
await ok(db, 'config', CONFIG_SQL)
await db.exec(`create or replace function public.academic_today() returns date language sql stable set search_path = '' as $$ select date '2026-11-15' $$`)

const a = await rpc(A, `public.academic_create_profile(${json({ display_name: 'Noy', age_band: '16_17', province_code: 'vientiane-prefecture', grade_id: ID.g11, school_id: ID.school, notice_version: '2026-10-25' })})`)
const lines = (await db.query(`select id from academic_subject_enrolments where enrolment_id = '${a.enrolment_id}'`)).rows.map((r) => ({ subject_enrolment_id: r.id, status: 'scored', value: 7 }))
await rpc(A, `public.academic_submit_score_entry('${a.enrolment_id}', '${period(2)}', ${json(lines)}, 'k1')`)

// Direct table writes as an API caller.
const write = async (user, sql, opts = {}) => {
  try {
    const r = await db.exec(`begin; ${callerSql(user, opts)} ${sql}; commit;`)
    return r.at(-2).affectedRows
  } catch (e) {
    await db.exec('rollback').catch(() => {})
    return e.message
  }
}

// ─── MFA (OD-13) ─────────────────────────────────────────────────────────────

eq('admin without MFA cannot change config', await write(ADM, `update academic_subjects set name_en = 'Maths' where id = '${ID.math}'`), 0)
eq('admin with MFA can', await write(ADM, `update academic_subjects set name_en = 'Maths' where id = '${ID.math}'`, mfa), 1)
eq('admin RPC without MFA -> MFA_REQUIRED', (await rpcError(ADM, `public.academic_support_lookup('${A}')`))?.code, 'MFA_REQUIRED')
eq('customer -> FORBIDDEN_ROLE', (await rpcError(A, `public.academic_support_lookup('${A}')`, mfa))?.code, 'FORBIDDEN_ROLE')
eq('audit log needs MFA', Number(await rpc(ADM, `(select count(*) from academic_audit_events)`)), 0)
eq('audit log with MFA', Number(await rpc(ADM, `(select count(*) from academic_audit_events)`, mfa)) > 0, true)
await ok(db, 'mfa off', `update academic_settings set value = 'false' where key = 'admin_mfa_required'`)
eq('setting off restores aal1 access', await write(ADM, `update academic_subjects set name_en = 'Mathematics' where id = '${ID.math}'`), 1)
await ok(db, 'mfa on', `update academic_settings set value = 'true' where key = 'admin_mfa_required'`)

// ─── Subjects, aliases, scales (ADMIN-002) ───────────────────────────────────

eq('alias normalised', [await write(ADM, `insert into academic_subject_aliases (subject_id, alias_text, alias_normalised) values ('${ID.math}', '  MATHS ', 'x')`, mfa),
  await one(`select alias_text, alias_normalised from academic_subject_aliases`)], [1, { alias_text: 'MATHS', alias_normalised: 'maths' }])

const v2 = await rpc(ADM, `public.academic_admin_create_scale_version('${ID.scale}', ${json({ step: 0.25, decimals: 2 })})`, mfa)
eq('new draft version copies the latest', await one(`select version, status, min_value, max_value, step, decimals, pass_mark, created_by from academic_grading_scale_versions where id = '${v2}'`),
  { version: 2, status: 'draft', min_value: '0.00', max_value: '10.00', step: '0.25', decimals: 2, pass_mark: '5.00', created_by: ADM })
eq('invalid scale settings', (await rpcError(ADM, `public.academic_admin_create_scale_version('${ID.scale}', ${json({ min_value: 20 })})`, mfa))?.code, 'VALIDATION_FAILED')
eq('unknown field', (await rpcError(ADM, `public.academic_admin_create_scale_version('${ID.scale}', ${json({ status: 'approved' })})`, mfa))?.code, 'VALIDATION_FAILED')
eq('approved versions are not edited destructively', await write(ADM, `update academic_grading_scale_versions set max_value = 20 where id = '${ID.scaleV1}'`, mfa), 'Grading scale version 10000000-0000-0000-0000-000000000006 is approved and cannot be changed')

await ok(db, 'four eyes on', `update academic_settings set value = 'true' where key = 'scale_four_eyes_required'`)
eq('creator cannot approve with four-eyes', (await rpcError(ADM, `public.academic_admin_approve_scale_version('${v2}')`, mfa))?.code, 'FOUR_EYES_REQUIRED')
eq('second admin approves', (await rpc(ADM2, `public.academic_admin_approve_scale_version('${v2}')`, mfa)).status, 'approved')
eq('approver recorded', (await one(`select approved_by from academic_grading_scale_versions where id = '${v2}'`)).approved_by, ADM2)
eq('cannot approve twice', (await rpcError(ADM2, `public.academic_admin_approve_scale_version('${v2}')`, mfa))?.code, 'ALREADY_APPROVED')
await ok(db, 'four eyes off', `update academic_settings set value = 'false' where key = 'scale_four_eyes_required'`)
eq('existing enrolment keeps v1; new ones get v2', [(await one(`select grading_scale_version_id from academic_enrolments where id = '${a.enrolment_id}'`)).grading_scale_version_id,
  (await one(`select public.academic_resolve_scale_version(null) as v`)).v], [ID.scaleV1, v2])

// ─── Schools: merge and review tasks (ADMIN-003) ─────────────────────────────

const DUP = '10000000-0000-0000-0000-0000000000c9'
await ok(db, 'duplicate school', `insert into academic_schools (id, name_lo, province_code) values ('${DUP}', 'ໂຮງຮຽນ ທົດລອງ (ຊ້ຳ)', 'vientiane-prefecture')`)
// A closed enrolment at the duplicate school (transfer in the past).
await ok(db, 'student on duplicate', `
  insert into public.users (id, name) values ('00000000-0000-0000-0000-0000000000b1', 'B');
  insert into academic_student_profiles (id, user_id, display_name, age_band, province_code) values ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1', 'B', '18_plus', 'vientiane-prefecture');
  insert into academic_enrolments (id, student_profile_id, academic_year_id, grade_id, school_id, grading_scale_version_id, calendar_template_id)
    values ('30000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', '${ID.year}', '${ID.g11}', '${DUP}', '${ID.scaleV1}', '${ID.calendar}');
  update academic_enrolments set state = 'closed', closed_reason = 'left' where id = '30000000-0000-0000-0000-000000000002';
  insert into academic_subject_aliases (subject_id, alias_text, alias_normalised, school_id) values ('${ID.math}', 'Lek', 'lek', '${DUP}')`)
eq('merge needs a reason', (await rpcError(ADM, `public.academic_admin_merge_schools('${DUP}', '${ID.school}', '')`, mfa))?.code, 'VALIDATION_FAILED')
eq('cannot merge into itself', (await rpcError(ADM, `public.academic_admin_merge_schools('${DUP}', '${DUP}', 'duplicate')`, mfa))?.code, 'VALIDATION_FAILED')
const merged = await rpc(ADM, `public.academic_admin_merge_schools('${DUP}', '${ID.school}', 'Same school typed twice')`, mfa)
eq('merge re-points closed enrolments too', [merged.enrolments_moved, (await one(`select school_id, state from academic_enrolments where id = '30000000-0000-0000-0000-000000000002'`))], [1, { school_id: ID.school, state: 'closed' }])
eq('old record becomes an alias', await one(`select status, merged_into_id from academic_schools where id = '${DUP}'`), { status: 'merged', merged_into_id: ID.school })
eq('aliases moved', (await one(`select school_id from academic_subject_aliases where alias_normalised = 'lek'`)).school_id, ID.school)
eq('merge audited with reason', (await one(`select actor_user_id, reason from academic_audit_events where action = 'config.school_merge'`)), { actor_user_id: ADM, reason: `into ${ID.school}: Same school typed twice` })
eq('merged school resolves to target in onboarding', (await one(`select public.academic_resolve_school('{"school_id":"${DUP}"}'::jsonb)->>'school_id' as id`)).id, ID.school)
eq('admins cannot write enrolments directly', await write(ADM, `update academic_enrolments set is_repeat = true`, mfa), 'permission denied for table academic_enrolments')

// Unverified school typed by a student -> admin links it.
await rpc(A, `public.academic_transition_enrolment(${json({ kind: 'transferred', school_free_text: 'Ban Nong', effective_period_seq: 3 })})`)
const task = await one(`select id, enrolment_id from academic_review_tasks where status = 'open'`)
eq('students cannot resolve tasks', (await rpcError(A, `public.academic_admin_resolve_school_task('${task.id}', '${ID.school50}')`, mfa))?.code, 'FORBIDDEN_ROLE')
eq('admin links the school', (await rpc(ADM, `public.academic_admin_resolve_school_task('${task.id}', '${ID.school50}', 'Found it')`, mfa)).status, 'resolved')
eq('enrolment verified', await one(`select school_id, school_free_text, school_verification from academic_enrolments where id = '${task.enrolment_id}'`), { school_id: ID.school50, school_free_text: null, school_verification: 'verified' })
eq('task closed with resolver', await one(`select status, resolved_by, resolution from academic_review_tasks where id = '${task.id}'`), { status: 'resolved', resolved_by: ADM, resolution: { school_id: ID.school50, note: 'Found it' } })

// ─── Calendars: school override (ADMIN-004) ──────────────────────────────────

const cal = await rpc(ADM, `public.academic_admin_create_school_calendar('${ID.school}', '${ID.nextYear}', ${json([
  { period_type: 'monthly', sequence: 9, remove: true },
  { period_type: 'monthly', sequence: 1, label_en: 'September (from 5th)', start_date: '2027-09-05' },
  { period_type: 'semester_official', sequence: 1, term_no: 1, label_lo: 'ພາກ 1', label_en: 'Semester 1', start_date: '2027-09-01', end_date: '2028-01-31' },
])})`, mfa)
const periods = (await db.query(`select period_type, sequence, label_en, start_date::text from academic_reporting_periods where calendar_template_id = '${cal}' order by period_type, sequence`)).rows
eq('only overridden periods differ', [periods.length, periods.find((p) => p.sequence === 1 && p.period_type === 'monthly'), periods.find((p) => p.sequence === 2).label_en, periods.some((p) => p.sequence === 9)],
  [9, { period_type: 'monthly', sequence: 1, label_en: 'September (from 5th)', start_date: '2027-09-05' }, 'Month 2', false])
eq('new enrolments at that school use it', (await one(`select public.academic_resolve_calendar('${ID.nextYear}', '${ID.school}', 'vientiane-prefecture') as c`)).c, cal)
eq('other schools keep national', (await one(`select public.academic_resolve_calendar('${ID.nextYear}', '${ID.school50}', 'luang-prabang') as c`)).c, ID.nextCalendar)
eq('one school calendar per year', (await rpcError(ADM, `public.academic_admin_create_school_calendar('${ID.school}', '${ID.nextYear}')`, mfa))?.code, 'CALENDAR_EXISTS')
eq('periods with scores cannot be deleted', await write(ADM, `delete from academic_reporting_periods where id = '${period(2)}'`, mfa), 'update or delete on table "academic_reporting_periods" violates foreign key constraint "academic_score_entries_reporting_period_id_fkey" on table "academic_score_entries"')

// ─── Roles (ADMIN-001) ───────────────────────────────────────────────────────

eq('role change needs reason', (await rpcError(ADM, `public.academic_admin_set_user_role('${OPS}', 'CUSTOMER', '')`, mfa))?.code, 'VALIDATION_FAILED')
eq('role granted', (await rpc(ADM, `public.academic_admin_set_user_role('${A}', 'OPERATIONS', 'Pilot support helper')`, mfa)).role, 'OPERATIONS')
eq('grant audited with actor and reason', await one(`select actor_user_id, target_id, reason from academic_audit_events where action = 'admin.role_change' order by occurred_at desc limit 1`),
  { actor_user_id: ADM, target_id: A, reason: 'CUSTOMER -> OPERATIONS: Pilot support helper' })
await rpc(ADM, `public.academic_admin_set_user_role('${A}', 'CUSTOMER', 'Pilot finished')`, mfa)
await rpc(ADM, `public.academic_admin_set_user_role('${ADM2}', 'CUSTOMER', 'Left the team')`, mfa)
eq('last admin cannot be removed', (await rpcError(ADM, `public.academic_admin_set_user_role('${ADM}', 'CUSTOMER', 'Stepping down')`, mfa))?.code, 'LAST_ADMIN')
eq('operations cannot grant roles', (await rpcError(OPS, `public.academic_admin_set_user_role('${OPS}', 'ADMIN', 'Promote myself')`, mfa))?.code, 'FORBIDDEN_ROLE')

// ─── Support lookup and break-glass (ADMIN-005) ──────────────────────────────

const look = await rpc(OPS, `public.academic_support_lookup('BA-FRE-dan9xy')`, mfa)
eq('lookup by member code', [look.user.id, look.profile.status, look.enrolments.length, look.consents.length], [A, 'active', 2, 2])
eq('lookup shows no scores or names', /"raw_value"|"value"|Noy|display_name/.test(JSON.stringify(look)), false)
eq('lookup by user id', (await rpc(OPS, `public.academic_support_lookup('${A}')`, mfa)).profile.id, a.profile_id)
eq('unknown -> 404', await rpc(OPS, `public.academic_support_lookup('nobody')`, mfa), { error: { code: 'NOT_FOUND', status: 404 } })
eq('scores need break-glass', await rpc(OPS, `public.academic_support_view_scores('${a.profile_id}')`, mfa), { error: { code: 'BREAK_GLASS_REQUIRED', status: 403 } })
eq('break-glass needs a real reason', (await rpcError(OPS, `public.academic_support_break_glass('${a.profile_id}', 'because')`, mfa))?.code, 'VALIDATION_FAILED')
const bg = await rpc(OPS, `public.academic_support_break_glass('${a.profile_id}', 'Ticket 1234: student reports wrong October score')`, mfa)
eq('30-minute window', Math.round((new Date(bg.expires_at) - Date.now()) / 60000), 30)
const view = await rpc(OPS, `public.academic_support_view_scores('${a.profile_id}')`, mfa)
eq('scores visible inside the window', view.enrolments.flatMap((e) => e.terms).flatMap((t) => t.periods).length, 1)
eq('window is per staff member', await rpc(ADM, `public.academic_support_view_scores('${a.profile_id}')`, mfa), { error: { code: 'BREAK_GLASS_REQUIRED', status: 403 } })
await ok(db, 'expire window', `update academic_break_glass_sessions set started_at = now() - interval '31 minutes', expires_at = now() - interval '1 minute'`)
eq('closed after 30 minutes', await rpc(OPS, `public.academic_support_view_scores('${a.profile_id}')`, mfa), { error: { code: 'BREAK_GLASS_REQUIRED', status: 403 } })
eq('every support action audited', (await db.query(`select action, outcome from academic_audit_events where actor_user_id = '${OPS}' order by occurred_at`)).rows.map((r) => `${r.action}:${r.outcome}`),
  ['support.lookup:success', 'support.lookup:success', 'support.lookup:denied', 'support.view_scores:denied', 'support.break_glass:success', 'support.view_scores:success', 'support.view_scores:denied'])
eq('break-glass reason recorded', (await one(`select reason from academic_audit_events where action = 'support.break_glass'`)).reason, 'Ticket 1234: student reports wrong October score')
eq('sessions hidden from clients', (await rpcError(OPS, `(select count(*) from academic_break_glass_sessions)`, mfa))?.status, '42501')

done()
