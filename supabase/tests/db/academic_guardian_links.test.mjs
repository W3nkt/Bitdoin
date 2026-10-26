// Guardian links (P3-PAR #52, piece 1): invite codes (PARENT-001), accept and
// two-sided confirmation (PARENT-002), guardian consent for ages 13–15
// (PARENT-003), scopes (PARENT-004), removal (PARENT-007), support suspension
// and admin reinstatement (PARENT-008), re-confirmation at 18 (PARENT-009),
// access lost at once (QG-4).
import { createDb, ok, eq, done, ACADEMIC_MIGRATIONS } from './harness.mjs'
import { CONFIG_SQL, ID, apiFor, json, period } from './fixtures.mjs'

const db = await createDb(ACADEMIC_MIGRATIONS)
const { rpc, rpcError, one } = apiFor(db)
const [S, G, G2, C, OPS, ADM] = ['a1', 'b1', 'b2', 'c1', 'd1', 'e1'].map((s) => `00000000-0000-0000-0000-0000000000${s}`)
const STAFF = { aal: 'aal2' }
await ok(db, 'users', `insert into public.users (id, name, role) values ('${S}', 'Noy', 'CUSTOMER'), ('${G}', 'Mrs Phonsavan', 'CUSTOMER'),
  ('${G2}', 'Mr Bounmy', 'CUSTOMER'), ('${C}', 'Kham', 'CUSTOMER'), ('${OPS}', 'Support', 'OPERATIONS'), ('${ADM}', 'Admin', 'ADMIN')`)
await ok(db, 'config', CONFIG_SQL + `update academic_settings set value = '{"read": {"limit": 5000, "seconds": 60}, "write": {"limit": 5000, "seconds": 60}}' where key = 'rate_limits';`)
await db.exec(`create or replace function public.academic_today() returns date language sql stable set search_path = '' as $$ select date '2026-11-18' $$`)
const profile = (age) => ({ display_name: 'Noy', age_band: age, province_code: 'vientiane-prefecture', grade_id: ID.g11, school_id: ID.school, notice_version: '2026-10-25', subjects: [{ subject_id: ID.math }, { subject_id: ID.phys }] })
const s = await rpc(S, `public.academic_create_profile(${json(profile('16_17'))})`)
const ids = Object.fromEntries((await db.query(`select su.code, se.id from academic_subject_enrolments se join academic_subjects su on su.id = se.subject_id where se.enrolment_id = '${s.enrolment_id}'`)).rows.map((r) => [r.code, r.id]))
await rpc(S, `public.academic_submit_score_entry('${s.enrolment_id}', '${period(1)}', ${json([{ subject_enrolment_id: ids.MATH, status: 'scored', value: 8 }, { subject_enrolment_id: ids.PHYS, status: 'scored', value: 7 }])}, 'k1')`)
const canRead = async (user, scope = 'scores') => (await one(`select (select public.academic_guardian_can_read('${s.profile_id}', '${scope}') from (select set_config('request.jwt.claim.sub', '${user}', true)) x) as v`)).v

// ─── Invites (PARENT-001) ────────────────────────────────────────────────────

const invite = await rpc(S, `public.academic_create_guardian_invite(${json({ careers: true, coach: true })})`)
eq('an 8-character code, 72 hours, single use; Coach chats are not a scope', [/^[A-HJ-NP-Z2-9]{8}$/.test(invite.code), Math.round((new Date(invite.expires_at) - Date.now()) / 3600000), Object.keys(invite.scopes).sort(), invite.scopes.careers],
  [true, 72, ['careers', 'goals_text', 'plan', 'scores'], true])
eq('only the hash of the code is kept', (await one(`select count(*)::int as n from academic_guardian_invites where code_hash = '${invite.code}'`)).n, 0)
for (let i = 0; i < 4; i++) await rpc(S, `public.academic_create_guardian_invite()`)
eq('at most 5 open invites', (await rpcError(S, `public.academic_create_guardian_invite()`))?.code, 'GUARDIAN_INVITE_LIMIT')
const extra = (await rpc(S, `public.academic_list_guardian_links()`)).invites.find((i) => i.id !== invite.id)
await rpc(S, `public.academic_revoke_guardian_invite('${extra.id}')`)
eq('a cancelled invite frees a slot', (await rpc(S, `public.academic_list_guardian_links()`)).invites.length, 4)

// ─── Accept and confirm (PARENT-002) ─────────────────────────────────────────

eq('the guardian sees the student name and what would be shared', [(await rpc(G, `public.academic_preview_guardian_invite('${invite.code.toLowerCase()}')`)).student_name], ['Noy'])
eq('a wrong code is refused', (await rpcError(G, `public.academic_preview_guardian_invite('ZZZZZZZZ')`))?.code, 'GUARDIAN_CODE_INVALID')
eq('relationship and the declaration are required', [(await rpcError(G, `public.academic_accept_guardian_invite('${invite.code}', 'mother', false)`))?.details?.field,
  (await rpcError(G, `public.academic_accept_guardian_invite('${invite.code}', 'aunt', true)`))?.details?.field], ['declaration', 'relationship'])
eq('the student cannot link to themselves', (await rpcError(S, `public.academic_accept_guardian_invite('${invite.code}', 'mother', true)`))?.code, 'GUARDIAN_SELF')
const link = await rpc(G, `public.academic_accept_guardian_invite('${invite.code}', 'mother', true)`)
eq('accepted: waiting for the student to confirm the name', [link.status, link.guardian_name, link.relationship], ['pending_student', 'Mrs Phonsavan', 'mother'])
eq('a code works once', (await rpcError(G2, `public.academic_accept_guardian_invite('${invite.code}', 'father', true)`))?.code, 'GUARDIAN_CODE_INVALID')
eq('the student is told in the inbox', (await one(`select code from academic_notifications where user_id = '${S}' and category = 'guardian_link'`)).code, 'guardian.request')
eq('before the student confirms, the guardian sees nothing', await canRead(G), false)
eq('another student cannot confirm it', await rpc(C, `public.academic_create_profile(${json(profile('16_17'))})`).then(() => rpc(C, `public.academic_confirm_guardian_link('${link.id}', true)`)), { error: { code: 'NOT_FOUND', status: 404 } })
await rpc(S, `public.academic_confirm_guardian_link('${link.id}', true)`)
eq('confirmed: the guardian can read scores, not career answers unless shared', [await canRead(G), await canRead(G, 'careers'), await canRead(G, 'goals')], [true, true, false])
eq("the guardian's family view lists the child", (await rpc(G, `public.academic_get_family()`)).links.map((l) => [l.student_name, l.status, l.grade]), [['Noy', 'active', 'Grade 11']])

// ─── Scopes (PARENT-004) and removal (PARENT-007) ────────────────────────────

await rpc(S, `public.academic_set_guardian_scopes('${link.id}', ${json({ scores: false })})`)
eq('turning a scope off applies at once', await canRead(G), false)
eq('scope changes are audit-logged', (await one(`select count(*)::int as n from academic_audit_events where action = 'guardian.scopes'`)).n, 1)
await rpc(S, `public.academic_set_guardian_scopes('${link.id}', ${json({ scores: true })})`)
await rpc(S, `public.academic_remove_guardian_link('${link.id}')`)
eq('removed by the student: no access, both told', [await canRead(G), (await rpc(G, `public.academic_get_family()`)).notices[0].code,
  (await one(`select count(*)::int as n from academic_notifications where user_id = '${S}' and code = 'guardian.removed'`)).n], [false, 'guardian.removed', 1])

// ─── Suspension (PARENT-008) ─────────────────────────────────────────────────

const again = await rpc(G, `public.academic_accept_guardian_invite('${(await rpc(S, `public.academic_create_guardian_invite()`)).code}', 'mother', true)`)
await rpc(S, `public.academic_confirm_guardian_link('${again.id}', true)`)
eq('a reason and a note are required', (await rpcError(OPS, `public.academic_support_suspend_guardian_link('${again.id}', 'nope', 'x')`, STAFF))?.details?.field, 'reason')
await rpc(OPS, `public.academic_support_suspend_guardian_link('${again.id}', 'not_guardian', 'Student says this is not her mother')`, STAFF)
eq('suspended by support: access stops at once', await canRead(G), false)
eq('support cannot reinstate', (await rpcError(OPS, `public.academic_admin_reinstate_guardian_link('${again.id}', 'Checked with the school')`, STAFF))?.code, 'FORBIDDEN_ROLE')
await rpc(ADM, `public.academic_admin_reinstate_guardian_link('${again.id}', 'Checked with the school')`, STAFF)
eq('an admin reinstates after review; the case history is kept', [await canRead(G), (await rpc(ADM, `public.academic_support_guardian_links('${s.profile_id}')`, STAFF)).find((l) => l.id === again.id).cases.map((c) => c.action)],
  [true, ['suspend', 'reinstate']])
eq('students cannot use the support tools', (await rpcError(S, `public.academic_support_guardian_links('${s.profile_id}')`))?.code, 'FORBIDDEN_ROLE')

// ─── Re-confirmation at 18 (PARENT-009) ──────────────────────────────────────

const version = (await one(`select version from academic_student_profiles where id = '${s.profile_id}'`)).version
await rpc(S, `public.academic_update_profile(${version}, ${json({ age_band: '18_plus' })})`)
eq('turning 18: each link asks to be kept within 30 days', (await rpc(S, `public.academic_list_guardian_links()`)).links[0].reconfirm_by, '2026-12-18')
await db.exec(`create or replace function public.academic_today() returns date language sql stable set search_path = '' as $$ select date '2026-12-20' $$`)
eq('no answer in 30 days: paused, not deleted', [(await one(`select public.academic_guardian_daily() as v`)).v.paused, await canRead(G), (await rpc(S, `public.academic_list_guardian_links()`)).links[0].status], [1, false, 'paused'])
await rpc(S, `public.academic_keep_guardian_link('${again.id}')`)
eq('kept by the student: active again', await canRead(G), true)

// ─── Unconfirmed links lapse ─────────────────────────────────────────────────

const pending = await rpc(G2, `public.academic_accept_guardian_invite('${(await rpc(S, `public.academic_create_guardian_invite()`)).code}', 'father', true)`)
await ok(db, 'eight days pass', `update academic_guardian_links set confirm_by = now() - interval '1 hour' where id = '${pending.id}'`)
eq('not confirmed in 7 days: the link lapses', [(await one(`select public.academic_guardian_daily() as v`)).v.lapsed, (await one(`select status from academic_guardian_links where id = '${pending.id}'`)).status], [1, 'removed'])

// ─── Ages 13–15: guardian consent first (PARENT-003) ─────────────────────────

const [K] = ['f1'].map((x) => `00000000-0000-0000-0000-0000000000${x}`)
await ok(db, 'young student', `insert into public.users (id, name, role) values ('${K}', 'Kham', 'CUSTOMER')`)
const k = await rpc(K, `public.academic_create_profile(${json(profile('13_15'))})`)
eq('a 13–15 profile waits for a guardian', [(await rpc(K, `public.academic_get_session()`)).next_step, (await rpc(K, `public.academic_get_session()`)).profile.consent_state], ['guardian_consent', 'pending_guardian'])
eq('no scores are stored before consent', (await rpcError(K, `public.academic_submit_score_entry('${k.enrolment_id}', '${period(1)}', '[]', 'k9')`))?.code, 'GUARDIAN_CONSENT_REQUIRED')
eq('an ordinary invite is not possible yet', (await rpcError(K, `public.academic_create_guardian_invite()`))?.code, 'GUARDIAN_CONSENT_REQUIRED')
const consentInvite = await rpc(K, `public.academic_create_guardian_invite('{}', 'consent')`)
eq('the guardian sees it is a consent request', (await rpc(G2, `public.academic_preview_guardian_invite('${consentInvite.code}')`)).purpose, 'consent')
await rpc(G2, `public.academic_accept_guardian_invite('${consentInvite.code}', 'guardian', true)`)
eq('the guardian agreed: consent recorded, the student can go on', [(await rpc(K, `public.academic_get_session()`)).next_step,
  (await one(`select grantor_role, method from academic_consent_records where purpose = 'guardian_consent'`))], ['ready', { grantor_role: 'guardian', method: 'guardian_link_flow' }])
eq('the guardian still sees nothing until the student confirms them', await canRead(G2), false)

// ─── The guardian's view of a child (PARENT-005, migration 153) ──────────────

let child = await rpc(G, `public.academic_guardian_child('${again.id}')`)
eq('within the 3-day correction window nothing of the month shows', [child.scores.months.length, child.scores.hidden_recent], [0, true])
await ok(db, 'four days later', `update academic_score_entries set submitted_at = now() - interval '4 days'`)
child = await rpc(G, `public.academic_guardian_child('${again.id}')`)
eq('the guardian sees the shared scores: months and subjects', [child.name, child.scores.months.length, child.scores.subjects.map((x) => [x.name_en, Number(x.latest)])], ['Noy', 1, [['Mathematics', 8], ['Physics', 7]]])
eq('sections the student did not share are left out', [child.plan !== null, child.careers, child.goals_text], [true, null, null])
eq('suggestions are ways to support, at most three', [child.suggestions.length <= 3, child.suggestions.some((x) => x.kind === 'ask_support')], [true, true])
await rpc(S, `public.academic_set_guardian_scopes('${again.id}', ${json({ scores: false, plan: false })})`)
child = await rpc(G, `public.academic_guardian_child('${again.id}')`)
eq('turning scores and plan off removes them at once', [child.scores, child.plan, child.suggestions], [null, null, []])
eq('every view is audit-logged', (await one(`select count(*)::int as n from academic_audit_events where action = 'guardian.view'`)).n, 3)
eq('another guardian cannot open this child', await rpc(G2, `public.academic_guardian_child('${again.id}')`), { error: { code: 'NOT_FOUND', status: 404 } })
eq('the student cannot open it as a guardian', await rpc(S, `public.academic_guardian_child('${again.id}')`), { error: { code: 'NOT_FOUND', status: 404 } })

// ─── Monthly reports (PARENT-006, migration 154) ─────────────────────────────

await rpc(S, `public.academic_set_guardian_scopes('${again.id}', ${json({ scores: true, plan: true })})`)
await ok(db, 'enforce', `update academic_settings set value = 'true' where key = 'entitlements_enforced'`)
eq('without Academy Premium on either account, no report is written', (await one(`select public.academic_guardian_generate_reports() as v`)).v, 0)
await ok(db, 'guardian premium', `insert into premium_subscriptions (user_id, plan_id, status) select '${G}', id, 'ACTIVE' from premium_plans where price_lak > 0 limit 1`)
eq('with Premium, a report for the month past its correction window', (await one(`select public.academic_guardian_generate_reports() as v`)).v, 1)
eq('one report per month', (await one(`select public.academic_guardian_generate_reports() as v`)).v, 0)
const reportId = (await rpc(G, `public.academic_guardian_child('${again.id}')`)).reports[0].id
const report = await rpc(G, `public.academic_guardian_report('${reportId}')`)
eq('seven sections: period, recorded, changes, stronger, needs attention, activities, next steps',
  ['period', 'recorded', 'changes', 'stronger', 'needs_attention', 'activities', 'next_steps'].every((k) => k in report.content), true)
eq('subjects recorded and their scores, with the generation date', [report.content.recorded.recorded, report.content.changes.subjects.map((x) => [x.name_en, Number(x.latest)]), !!report.content.period.generated_at],
  [2, [['Mathematics', 8], ['Physics', 7]], true])
eq('the guardian is told in the app', (await one(`select category, code from academic_notifications where user_id = '${G}' and code = 'guardian.report'`)), { category: 'guardian_report', code: 'guardian.report' })
eq('opening it marks it read', (await rpc(G, `public.academic_guardian_child('${again.id}')`)).reports[0].read, true)
eq('nobody else can open it', await rpc(G2, `public.academic_guardian_report('${reportId}')`), { error: { code: 'NOT_FOUND', status: 404 } })
await ok(db, 'not enforced', `update academic_settings set value = 'false' where key = 'entitlements_enforced'`)

// ─── Limits (§14.9.4) ────────────────────────────────────────────────────────

const extras = ['f2', 'f3', 'f4', 'f5'].map((x) => `00000000-0000-0000-0000-0000000000${x}`)
await ok(db, 'more guardians', `insert into public.users (id, name, role) values ${extras.map((id, i) => `('${id}', 'Guardian ${i}', 'CUSTOMER')`).join(', ')}`)
for (const id of extras.slice(0, 3)) await rpc(id, `public.academic_accept_guardian_invite('${(await rpc(S, `public.academic_create_guardian_invite()`)).code}', 'other', true)`)
eq('a student has at most 4 guardians', (await rpcError(extras[3], `public.academic_accept_guardian_invite('${(await rpc(S, `public.academic_create_guardian_invite()`)).code}', 'other', true)`))?.code, 'GUARDIAN_LIMIT_STUDENT')

// ─── A removed link ends access to its reports ───────────────────────────────

await rpc(G, `public.academic_guardian_remove_link('${again.id}')`)
eq('after the link ends, reports are no longer available', await rpc(G, `public.academic_guardian_report('${reportId}')`), { error: { code: 'NOT_FOUND', status: 404 } })

// ─── Schedule ────────────────────────────────────────────────────────────────

eq('the daily job is scheduled', (await db.query(`select schedule from cron.job where jobname = 'academic-guardian-daily'`)).rows, [{ schedule: '40 19 * * *' }])

done()
