// "Report a problem" (PRIV-008): categories, priority for safety reports with
// a 1-business-day first-response target, one alert per safety report without
// the student's words, a daily limit, the support queue, export and deletion.
import { createDb, ok, eq, done, ACADEMIC_MIGRATIONS } from './harness.mjs'
import { CONFIG_SQL, ID, apiFor, json } from './fixtures.mjs'

const db = await createDb(ACADEMIC_MIGRATIONS)
const { rpc, rpcError, one } = apiFor(db)
const [A, B, OPS, ADM] = ['a1', 'b1', 'c1', 'd1'].map((s) => `00000000-0000-0000-0000-0000000000${s}`)
const STAFF = { aal: 'aal2' }
await ok(db, 'users', `insert into public.users (id, name, member_code, role) values ('${A}', 'A', 'AAA111', 'CUSTOMER'), ('${B}', 'B', 'BBB222', 'CUSTOMER'),
  ('${OPS}', 'Ops', 'OPS001', 'OPERATIONS'), ('${ADM}', 'Admin', 'ADM001', 'ADMIN')`)
await ok(db, 'config', CONFIG_SQL)
await rpc(A, `public.academic_create_profile(${json({ display_name: 'A', age_band: '16_17', province_code: 'vientiane-prefecture', grade_id: ID.g11, school_id: ID.school, notice_version: '2026-10-25' })})`)

// ─── Business days (Mon–Fri, Vientiane UTC+7) ────────────────────────────────

const due = async (from, days) => (await one(`select to_char(public.academic_add_business_days('${from}'::timestamptz, ${days}) at time zone 'UTC', 'Dy YYYY-MM-DD HH24:MI') as d`)).d
eq('Friday 10:00 Vientiane + 1 business day = Monday 10:00', await due('2026-10-23 03:00Z', 1), 'Mon 2026-10-26 03:00')
eq('Saturday + 1 = Monday', await due('2026-10-24 03:00Z', 1), 'Mon 2026-10-26 03:00')
eq('Wednesday + 3 = Monday', await due('2026-10-21 03:00Z', 3), 'Mon 2026-10-26 03:00')
eq('Friday 18:00 UTC is Saturday 01:00 in Vientiane: due Monday 01:00 there (Sunday 18:00 UTC)', await due('2026-10-23 18:00Z', 1), 'Sun 2026-10-25 18:00')

// ─── Reporting ───────────────────────────────────────────────────────────────

const report = (user, input) => rpc(user, `public.academic_report_problem(${json(input)})`)
const errorOf = async (user, call, opts) => await rpcError(user, call, opts)
eq('a category is required', (await errorOf(A, `public.academic_report_problem(${json({ category: 'spam', description: 'Something is wrong' })})`))?.details?.field, 'category')
eq('a description is required', (await errorOf(A, `public.academic_report_problem(${json({ category: 'other', description: 'bad' })})`))?.details?.field, 'description')

const r1 = await report(A, { category: 'guardian_link', description: 'Someone I do not know is linked as my parent.', screen: '/academy/scores/data?tab=1' })
const businessDays = async (id) => (await one(`select (select count(*) from generate_series(created_at::date + 1, first_response_due::date, '1 day') d where extract(isodow from d) < 6)::int as n from academic_problem_reports where id = '${id}'`)).n
eq('safety categories are priority with a 1-business-day target', [r1.priority, await businessDays(r1.id)], ['priority', 1])
const r2 = await report(A, { category: 'ai_answer', description: 'The explanation said something rude.' })
const r3 = await report(A, { category: 'other', description: 'The chart is hard to read on my phone.' })
eq('"other" is normal with 3 business days', [r3.priority, await businessDays(r3.id)], ['normal', 3])
eq('the screen is kept without the query string', (await one(`select screen from academic_problem_reports where id = '${r1.id}'`)).screen, '/academy/scores/data')
const alerts = (await db.query(`select kind, details from academic_alerts where kind = 'priority_report' order by created_at`)).rows
eq('one alert per safety report, none for "other"', alerts.map((a) => a.details.category), ['guardian_link', 'ai_answer'])
eq("alerts never carry the student's words", JSON.stringify(alerts).includes('parent'), false)
const noProfile = await report(B, { category: 'account_misuse', description: 'Someone is using my name.' })
eq('users without a Schooling profile can report too', [(await one(`select student_profile_id from academic_problem_reports where id = '${noProfile.id}'`)).student_profile_id, noProfile.priority], [null, 'priority'])
await report(A, { category: 'other', description: 'Fourth report today.' })
await report(A, { category: 'other', description: 'Fifth report today.' })
eq('five reports a day', (await errorOf(A, `public.academic_report_problem(${json({ category: 'other', description: 'Sixth report today.' })})`))?.code, 'RATE_LIMITED')
eq('reports are audited', (await one(`select count(*)::int as n from academic_audit_events where action = 'support.report'`)).n, 6)
eq('the table is hidden from users', (await errorOf(A, `(select count(*) from academic_problem_reports)`))?.status, '42501')

// ─── Support queue ───────────────────────────────────────────────────────────

eq('students cannot read the queue', (await errorOf(A, `public.academic_support_list_reports()`))?.code, 'FORBIDDEN_ROLE')
eq('support needs MFA', (await errorOf(OPS, `public.academic_support_list_reports()`, {}))?.code, 'MFA_REQUIRED')
await ok(db, 'age the first report', `update academic_problem_reports set first_response_due = now() - interval '1 hour' where id = '${r1.id}'`)
let queue = await rpc(OPS, `public.academic_support_list_reports()`, STAFF)
eq('priority first, earliest due first; reporter shown by member code', queue.slice(0, 4).map((r) => [r.category, r.priority, r.reporter_member_code]),
  [['guardian_link', 'priority', 'AAA111'], ['ai_answer', 'priority', 'AAA111'], ['account_misuse', 'priority', 'BBB222'], ['other', 'normal', 'AAA111']])
eq('overdue when the target passed without a response', [queue[0].overdue, queue[1].overdue], [true, false])

let updated = await rpc(OPS, `public.academic_support_update_report('${r1.id}', 'in_progress')`, STAFF)
eq('first response recorded', [updated.status, updated.responded_at !== null], ['in_progress', true])
queue = await rpc(OPS, `public.academic_support_list_reports()`, STAFF)
eq('no longer overdue once answered', [queue.find((r) => r.id === r1.id).overdue, queue.find((r) => r.id === r1.id).handled_by_name], [false, 'Ops'])
eq('resolving needs a note', (await errorOf(OPS, `public.academic_support_update_report('${r1.id}', 'resolved', 'ok')`, STAFF))?.details?.field, 'note')
await rpc(ADM, `public.academic_support_update_report('${r1.id}', 'resolved', 'Guardian link removed and account checked.')`, STAFF)
eq('resolved reports leave the active queue', (await rpc(OPS, `public.academic_support_list_reports()`, STAFF)).some((r) => r.id === r1.id), false)
eq('... and appear under all', (await rpc(OPS, `public.academic_support_list_reports('all')`, STAFF)).find((r) => r.id === r1.id).resolution_note, 'Guardian link removed and account checked.')
eq('resolved is final', (await errorOf(OPS, `public.academic_support_update_report('${r1.id}', 'in_progress')`, STAFF))?.code, 'REPORT_BAD_TRANSITION')
eq('queue changes are audited', (await db.query(`select action from academic_audit_events where action like 'support.report_%' order by occurred_at`)).rows.map((r) => r.action), ['support.report_in_progress', 'support.report_resolved'])

// ─── Export and deletion ─────────────────────────────────────────────────────

eq('export: own reports only', [(await rpc(A, `public.academic_export_my_reports()`)).reports.length, (await rpc(B, `public.academic_export_my_reports()`)).reports.length], [5, 1])
await rpc(A, `public.academic_request_deletion('profile')`)
await ok(db, 'age request', `update academic_student_profiles set deletion_requested_at = now() - interval '15 days' where user_id = '${A}'`)
await ok(db, 'purge', `select public.academic_purge_due_deletions()`)
eq('deleting the Schooling profile keeps support reports, unlinked', (await one(`select count(*)::int as n, count(student_profile_id)::int as linked from academic_problem_reports where reporter_user_id = '${A}'`)), { n: 5, linked: 0 })

done()
