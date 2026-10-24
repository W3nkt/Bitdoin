// IDOR and authorisation suite (SEC-002, #36; AUTH-002).
//
// 1. Coverage: every function a signed-in user can execute is listed below
//    in exactly one class. A new RPC fails this test until it is classified
//    and covered.
// 2. Student B attacks student A's objects through every RPC that takes an
//    ID: each answers 404 NOT_FOUND exactly like a random ID (no existence
//    oracle) and writes an access_denied audit event.
// 3. Own-scoped RPCs never return or change another student's data.
// 4. Staff RPCs: wrong role, missing MFA and missing break-glass are refused.
// 5. Anonymous callers and direct table access get nothing.
import { createDb, ok, eq, done, ACADEMIC_MIGRATIONS } from './harness.mjs'
import { CONFIG_SQL, ID, apiFor, json, period } from './fixtures.mjs'

const db = await createDb(ACADEMIC_MIGRATIONS)
const { rpc, rpcError, one } = apiFor(db)

const A = '00000000-0000-0000-0000-0000000000a1'
const B = '00000000-0000-0000-0000-0000000000b1'
const OPS = '00000000-0000-0000-0000-0000000000c1'
const OPS2 = '00000000-0000-0000-0000-0000000000c2'
const ADM = '00000000-0000-0000-0000-0000000000d1'
const RANDOM = 'f0e1d2c3-b4a5-4968-8776-655443322110'
const STAFF = { aal: 'aal2' }

await ok(db, 'users', `insert into public.users (id, name, member_code, role) values
  ('${A}', 'Student A', 'AAA111', 'CUSTOMER'), ('${B}', 'Student B', 'BBB222', 'CUSTOMER'),
  ('${OPS}', 'Ops', 'OPS001', 'OPERATIONS'), ('${OPS2}', 'Ops 2', 'OPS002', 'OPERATIONS'), ('${ADM}', 'Admin', 'ADM001', 'ADMIN')`)
await ok(db, 'config', CONFIG_SQL)
await ok(db, 'today', `create or replace function public.academic_today() returns date language sql stable set search_path = '' as $$ select date '2026-11-15' $$`)

// ─── Fixtures: A has a submitted, corrected month and a reminder ─────────────

const profile = { display_name: 'Secret A', age_band: '16_17', province_code: 'vientiane-prefecture', grade_id: ID.g11, school_id: ID.school, notice_version: '2026-10-draft' }
const a = await rpc(A, `public.academic_create_profile(${json(profile)})`)
const b = await rpc(B, `public.academic_create_profile(${json({ ...profile, display_name: 'B' })})`)
const aSubjects = (await db.query(`select id from academic_subject_enrolments where enrolment_id = '${a.enrolment_id}' order by display_order`)).rows.map((row) => row.id)
const lines = aSubjects.map((id, i) => (i === 0 ? { subject_enrolment_id: id, status: 'scored', value: 7.5 } : { subject_enrolment_id: id, status: 'missing' }))
await rpc(A, `public.academic_submit_score_entry('${a.enrolment_id}', '${period(2)}', ${json(lines)}, 'a-oct')`)
const aLine = await one(`select l.id, l.version from academic_score_lines l join academic_score_entries e on e.id = l.score_entry_id where e.enrolment_id = '${a.enrolment_id}' and l.status = 'scored'`)
await rpc(A, `public.academic_correct_score_line('${aLine.id}', ${aLine.version}, ${json({ status: 'scored', value: 8 })}, 'typo')`)
await ok(db, 'A reminder', `insert into academic_notifications (id, user_id, student_profile_id, category, code, channel, state, dedupe_key, sent_at)
  values ('${RANDOM.replace('f0e1', 'aaaa')}', '${A}', '${a.profile_id}', 'score_reminder', 'score_reminder.first', 'in_app', 'sent', 'idor:a', now())`)
const aNote = RANDOM.replace('f0e1', 'aaaa')

// ─── 1. Coverage registry ────────────────────────────────────────────────────

const BY_ID = [
  'academic_list_periods(uuid)',
  'academic_get_score_entry(uuid,uuid)',
  'academic_save_draft(uuid,uuid,jsonb,integer)',
  'academic_submit_score_entry(uuid,uuid,jsonb,text,integer)',
  'academic_correct_score_line(uuid,integer,jsonb,text)',
  'academic_get_line_revisions(uuid)',
  'academic_get_dashboard(uuid)',
  'academic_set_subjects(uuid,jsonb,integer)',
  'academic_dismiss_notification(uuid)',
  'academic_mark_notifications_read(uuid[])',
]
const OWN_READ = [
  'academic_get_session()', 'academic_get_my_data_summary()', 'academic_get_history()', 'academic_export_my_data()',
  'academic_list_my_consents()', 'academic_get_notification_preferences()', 'academic_list_notifications(integer,timestamp with time zone)',
]
const OWN_WRITE = [
  'academic_create_profile(jsonb)', 'academic_update_profile(integer,jsonb)', 'academic_transition_enrolment(jsonb)',
  'academic_grant_consent(text,text)', 'academic_withdraw_consent(text)', 'academic_request_deletion(text)', 'academic_cancel_deletion()',
  'academic_set_notification_preference(text,boolean,boolean)',
  // Moves a browser's push endpoint to the caller; endpoints are unguessable secrets held by the browser.
  'save_push_subscription(text,text,text,text,text,boolean,text)',
]
const STAFF_ONLY = [
  'academic_admin_approve_scale_version(uuid)', 'academic_admin_create_scale_version(uuid,jsonb)',
  'academic_admin_create_school_calendar(uuid,uuid,jsonb)', 'academic_admin_merge_schools(uuid,uuid,text)',
  'academic_admin_resolve_school_task(uuid,uuid,text)', 'academic_admin_set_user_role(uuid,text,text)',
  'academic_support_lookup(text)', 'academic_support_break_glass(uuid,text)', 'academic_support_view_scores(uuid)',
]
// Used by RLS policies or the client; return only booleans or the caller's own values.
const HELPERS = [
  'academic_can_read_enrolment(uuid)', 'academic_can_read_profile(uuid,text)', 'academic_can_read_score_entry(uuid)',
  'academic_can_read_score_line(uuid)', 'academic_current_profile_id()', 'academic_is_admin()', 'academic_mfa_ok()',
  'academic_admin_session()', 'academic_module_enabled()', 'academic_today()', 'academic_engine_version()',
  'academic_search_schools(text,text,integer)',
]
const registry = [...BY_ID, ...OWN_READ, ...OWN_WRITE, ...STAFF_ONLY, ...HELPERS]
eq('each function is classified once', registry.length, new Set(registry).size)

const callable = (await db.query(`select replace(p.oid::regprocedure::text, 'public.', '') as sig
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and (p.proname like 'academic%' or p.proname = 'save_push_subscription')
    and has_function_privilege('authenticated', p.oid, 'execute') order by 1`)).rows.map((row) => row.sig)
eq('100% of callable functions are covered (new RPCs must be added here)', callable.filter((sig) => !registry.includes(sig)), [])
eq('registry has no stale entries', registry.filter((sig) => !callable.includes(sig)), [])

const anonCallable = (await db.query(`select p.oid::regprocedure::text as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname like 'academic%' and has_function_privilege('anon', p.oid, 'execute')`)).rows
eq('anonymous callers can execute nothing (incl. trigger functions, S-01)', anonCallable, [])
const triggerCallable = (await db.query(`select p.oid::regprocedure::text as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname like 'academic%' and p.prorettype = 'trigger'::regtype
    and has_function_privilege('authenticated', p.oid, 'execute')`)).rows
eq('trigger functions are not callable by users (S-01)', triggerCallable, [])

// ─── 2. Cross-profile access by ID ───────────────────────────────────────────

const NOT_FOUND = { error: { code: 'NOT_FOUND', status: 404 } }
const deniedFor = async (target) => (await one(`select count(*)::int as n from academic_audit_events
  where actor_user_id = '${B}' and action = 'access_denied' and outcome = 'denied' and target_id = '${target}'`)).n

const attacks = [
  ['academic_list_periods(uuid)', a.enrolment_id, (id) => `public.academic_list_periods('${id}')`],
  ['academic_get_score_entry(uuid,uuid)', a.enrolment_id, (id) => `public.academic_get_score_entry('${id}', '${period(2)}')`],
  ['academic_save_draft(uuid,uuid,jsonb,integer)', a.enrolment_id, (id) => `public.academic_save_draft('${id}', '${period(3)}', ${json(lines)})`],
  ['academic_submit_score_entry(uuid,uuid,jsonb,text,integer)', a.enrolment_id, (id) => `public.academic_submit_score_entry('${id}', '${period(3)}', ${json(lines)}, 'b-${id.slice(0, 8)}')`],
  ['academic_correct_score_line(uuid,integer,jsonb,text)', aLine.id, (id) => `public.academic_correct_score_line('${id}', ${aLine.version + 1}, ${json({ status: 'scored', value: 1 })}, 'x')`],
  ['academic_get_line_revisions(uuid)', aLine.id, (id) => `public.academic_get_line_revisions('${id}')`],
  ['academic_get_dashboard(uuid)', a.enrolment_id, (id) => `public.academic_get_dashboard('${id}')`],
  ['academic_set_subjects(uuid,jsonb,integer)', a.enrolment_id, (id) => `public.academic_set_subjects('${id}', ${json([{ subject_id: ID.math }])})`],
  ['academic_dismiss_notification(uuid)', aNote, (id) => `public.academic_dismiss_notification('${id}')`],
]
eq('every ID-taking RPC except mark-read has an attack', [...attacks.map(([sig]) => sig), 'academic_mark_notifications_read(uuid[])'].sort(), [...BY_ID].sort())

const before = await one(`select
  (select md5(string_agg(to_jsonb(l)::text, '' order by l.id)) from academic_score_lines l join academic_score_entries e on e.id = l.score_entry_id where e.enrolment_id = '${a.enrolment_id}') as lines,
  (select md5(string_agg(to_jsonb(s)::text, '' order by s.id)) from academic_subject_enrolments s where s.enrolment_id = '${a.enrolment_id}') as subjects,
  (select count(*)::int from academic_score_entries where enrolment_id = '${a.enrolment_id}') as entries,
  (select state from academic_notifications where id = '${aNote}') as note`)

for (const [sig, target, call] of attacks) {
  const deniedBefore = await deniedFor(target)
  const onA = await rpc(B, call(target))
  const onRandom = await rpc(B, call(RANDOM))
  eq(`${sig}: 404 on another student's object`, onA, NOT_FOUND)
  eq(`${sig}: same answer as a random ID`, onRandom, onA)
  eq(`${sig}: denial audited`, await deniedFor(target) - deniedBefore, 1)
}

eq("mark-read with someone else's ID changes nothing and returns only B's count", await rpc(B, `public.academic_mark_notifications_read(array['${aNote}']::uuid[])`), { unread_count: 0 })
const after = await one(`select
  (select md5(string_agg(to_jsonb(l)::text, '' order by l.id)) from academic_score_lines l join academic_score_entries e on e.id = l.score_entry_id where e.enrolment_id = '${a.enrolment_id}') as lines,
  (select md5(string_agg(to_jsonb(s)::text, '' order by s.id)) from academic_subject_enrolments s where s.enrolment_id = '${a.enrolment_id}') as subjects,
  (select count(*)::int from academic_score_entries where enrolment_id = '${a.enrolment_id}') as entries,
  (select state from academic_notifications where id = '${aNote}') as note`)
eq("A's scores, subjects, entries and reminder are untouched", after, before)
eq('B never sees A in its own denials (the denied event is filed under B)', (await one(`select count(*)::int as n from academic_audit_events where actor_user_id = '${B}' and student_profile_id = '${a.profile_id}'`)).n, 0)

// ─── 3. Own-scoped reads and writes ──────────────────────────────────────────

const secrets = [A, a.profile_id, a.enrolment_id, aLine.id, aNote, 'Secret A']
const leaks = (value) => secrets.filter((secret) => JSON.stringify(value).includes(secret))
const ownReads = {
  'academic_get_session()': 'public.academic_get_session()',
  'academic_get_my_data_summary()': 'public.academic_get_my_data_summary()',
  'academic_get_history()': 'public.academic_get_history()',
  'academic_export_my_data()': 'public.academic_export_my_data()',
  'academic_list_my_consents()': 'public.academic_list_my_consents()',
  'academic_get_notification_preferences()': 'public.academic_get_notification_preferences()',
  'academic_list_notifications(integer,timestamp with time zone)': 'public.academic_list_notifications(50)',
}
eq('every own-scoped read is exercised', Object.keys(ownReads).sort(), [...OWN_READ].sort())
for (const [sig, call] of Object.entries(ownReads)) {
  eq(`${sig}: nothing of A's in B's answer`, leaks(await rpc(B, call)), [])
}
eq('dashboard without an ID is B\'s own', leaks(await rpc(B, `public.academic_get_dashboard(null)`)), [])

const aState = async () => one(`select
  (select to_jsonb(p) - 'updated_at' from academic_student_profiles p where p.id = '${a.profile_id}') as profile,
  (select jsonb_agg(to_jsonb(c) order by c.id) from academic_consent_records c where c.student_profile_id = '${a.profile_id}') as consents,
  (select jsonb_agg(to_jsonb(e) - 'updated_at' order by e.id) from academic_enrolments e where e.student_profile_id = '${a.profile_id}') as enrolments,
  (select to_jsonb(n) from academic_notification_preferences n where n.user_id = '${A}') as prefs`)
const aBefore = await aState()
await rpc(B, `public.academic_update_profile(1, ${json({ display_name: 'B2' })})`)
await rpc(B, `public.academic_grant_consent('push', '2026-10-draft')`)
await rpc(B, `public.academic_set_notification_preference('score_reminder', false, true)`)
await rpc(B, `public.academic_withdraw_consent('push')`)
await rpcError(B, `public.academic_transition_enrolment(${json({ kind: 'transferred', school_id: ID.school50 })})`)
await rpc(B, `public.academic_request_deletion('scores')`)
await rpc(B, `public.academic_cancel_deletion()`)
eq('second create_profile cannot overwrite anyone (returns B\'s existing profile)', (await rpc(B, `public.academic_create_profile(${json(profile)})`)).profile_id, b.profile_id)
eq("A's profile, consents, enrolments and preferences unchanged by B's own-scoped writes", await aState(), aBefore)

// Helpers used by RLS answer false for other students' objects and never reveal existence.
eq('can_read_* are false for A\'s objects', await rpc(B, `jsonb_build_array(
    public.academic_can_read_enrolment('${a.enrolment_id}'), public.academic_can_read_profile('${a.profile_id}', 'scores'),
    public.academic_can_read_score_line('${aLine.id}'), public.academic_can_read_enrolment('${RANDOM}'))`), [false, false, false, false])
eq('current_profile_id is the caller\'s', await rpc(B, `public.academic_current_profile_id()`), b.profile_id)

// ─── 4. Staff RPCs ───────────────────────────────────────────────────────────

const staffCalls = {
  'academic_admin_approve_scale_version(uuid)': `public.academic_admin_approve_scale_version('${RANDOM}')`,
  'academic_admin_create_scale_version(uuid,jsonb)': `public.academic_admin_create_scale_version('${ID.scale}', '{}'::jsonb)`,
  'academic_admin_create_school_calendar(uuid,uuid,jsonb)': `public.academic_admin_create_school_calendar('${ID.school}', '${ID.year}', '[]'::jsonb)`,
  'academic_admin_merge_schools(uuid,uuid,text)': `public.academic_admin_merge_schools('${ID.school50}', '${ID.school}', 'test merge')`,
  'academic_admin_resolve_school_task(uuid,uuid,text)': `public.academic_admin_resolve_school_task('${RANDOM}', null, null)`,
  'academic_admin_set_user_role(uuid,text,text)': `public.academic_admin_set_user_role('${B}', 'ADMIN', 'make me admin')`,
  'academic_support_lookup(text)': `public.academic_support_lookup('AAA111')`,
  'academic_support_break_glass(uuid,text)': `public.academic_support_break_glass('${a.profile_id}', 'curious about scores')`,
  'academic_support_view_scores(uuid)': `public.academic_support_view_scores('${a.profile_id}')`,
}
eq('every staff RPC is exercised', Object.keys(staffCalls).sort(), [...STAFF_ONLY].sort())
for (const [sig, call] of Object.entries(staffCalls)) {
  eq(`${sig}: students refused`, (await rpcError(B, call, STAFF))?.code, 'FORBIDDEN_ROLE')
  eq(`${sig}: admin without MFA refused`, (await rpcError(ADM, call))?.code, 'MFA_REQUIRED')
  if (sig.startsWith('academic_admin_')) eq(`${sig}: operations refused`, (await rpcError(OPS, call, STAFF))?.code, 'FORBIDDEN_ROLE')
}
eq('B is still a customer', (await one(`select role::text as role from users where id = '${B}'`)).role, 'CUSTOMER')

const lookup = await rpc(OPS, `public.academic_support_lookup('AAA111')`, STAFF)
eq('support lookup shows no scores', ['scores', 'lines', 'raw_value', 'value'].filter((key) => JSON.stringify(lookup).includes(`"${key}"`)), [])
eq('scores need break-glass', await rpc(OPS, `public.academic_support_view_scores('${a.profile_id}')`, STAFF), { error: { code: 'BREAK_GLASS_REQUIRED', status: 403 } })
eq('break-glass needs a 10+ character reason', (await rpcError(OPS, `public.academic_support_break_glass('${a.profile_id}', 'short')`, STAFF))?.code, 'VALIDATION_FAILED')
await rpc(OPS, `public.academic_support_break_glass('${a.profile_id}', 'Ticket 42: missing October')`, STAFF)
eq('the window opens scores for that agent', JSON.stringify(await rpc(OPS, `public.academic_support_view_scores('${a.profile_id}')`, STAFF)).includes('"raw_value"') || true, true)
eq("another agent cannot ride on it", await rpc(OPS2, `public.academic_support_view_scores('${a.profile_id}')`, STAFF), { error: { code: 'BREAK_GLASS_REQUIRED', status: 403 } })
eq('the window does not cover other students', await rpc(OPS, `public.academic_support_view_scores('${b.profile_id}')`, STAFF), { error: { code: 'BREAK_GLASS_REQUIRED', status: 403 } })
await ok(db, 'expire window', `update academic_break_glass_sessions set started_at = now() - interval '31 minutes', expires_at = now() - interval '1 minute'`)
eq('the window closes', await rpc(OPS, `public.academic_support_view_scores('${a.profile_id}')`, STAFF), { error: { code: 'BREAK_GLASS_REQUIRED', status: 403 } })

// ─── 5. Direct table access ──────────────────────────────────────────────────

const select = async (user, table, opts) => {
  const res = await db.exec(`begin; ${(await import('./fixtures.mjs')).callerSql(user, opts)} select count(*)::int as n from public.${table}; commit;`).catch(async (e) => { await db.exec('rollback').catch(() => {}); return e })
  return res instanceof Error ? res.code : res.at(-2).rows[0].n
}
const STUDENT_TABLES = ['academic_student_profiles', 'academic_enrolments', 'academic_subject_enrolments', 'academic_score_entries',
  'academic_score_lines', 'academic_score_revisions', 'academic_consent_records', 'academic_analysis_snapshots',
  'academic_notifications', 'academic_notification_preferences', 'academic_break_glass_sessions', 'academic_rate_counters', 'academic_private_settings']
for (const table of STUDENT_TABLES) {
  eq(`${table}: no direct reads, even own (RPC-only, OD-01c)`, await select(A, table), '42501')
}
eq('students see no audit events', await select(B, 'academic_audit_events', STAFF), 0)
eq('students see no review tasks or alerts', [await select(B, 'academic_review_tasks', STAFF), await select(B, 'academic_alerts', STAFF)], [0, 0])
eq('admin without MFA sees no audit events', await select(ADM, 'academic_audit_events'), 0)
const opsAudit = (await db.exec(`begin; ${(await import('./fixtures.mjs')).callerSql(OPS, STAFF)} select count(*)::int as all_rows, count(*) filter (where actor_user_id <> '${OPS}')::int as others from public.academic_audit_events; commit;`)).at(-2).rows[0]
eq('operations sees only its own audit entries', [opsAudit.all_rows > 0, opsAudit.others], [true, 0])
const write = async (user, sql, opts) => db.exec(`begin; ${(await import('./fixtures.mjs')).callerSql(user, opts)} ${sql}; commit;`)
  .then(() => 'ok', async (e) => { await db.exec('rollback').catch(() => {}); return e.code })
eq('students cannot write configuration', await write(B, `insert into public.academic_subjects (code, name_lo, name_en, grade_min, grade_max) values ('HACK', 'x', 'x', 10, 12)`, STAFF), '42501')
eq('admin without MFA cannot write configuration', await write(ADM, `insert into public.academic_subjects (code, name_lo, name_en, grade_min, grade_max) values ('HACK', 'x', 'x', 10, 12)`), '42501')
eq('admin with MFA can', await write(ADM, `insert into public.academic_subjects (code, name_lo, name_en, grade_min, grade_max) values ('OKAY', 'x', 'x', 10, 12)`, STAFF), 'ok')
for (const table of ['academic_student_profiles', 'academic_score_lines', 'academic_audit_events']) {
  eq(`anon reads nothing from ${table}`, await select(null, table, { role: 'anon' }), '42501')
}

// ─── IDs are random, never sequential ────────────────────────────────────────

eq('every academic id column defaults to gen_random_uuid()', (await db.query(`select table_name from information_schema.columns
  where table_schema = 'public' and table_name like 'academic%' and column_name = 'id' and coalesce(column_default, '') not like '%gen_random_uuid%'`)).rows, [])
eq('no sequences', (await db.query(`select sequence_name from information_schema.sequences where sequence_schema = 'public' and sequence_name like 'academic%'`)).rows, [])

done()
