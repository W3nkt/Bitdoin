// AI Coach academic mode (P3-AI #53): the student-scoped data the model sees
// (AI-002), insufficient data (AI-003), quota (AI-006), circuit breaker
// (AI-008), prompt versions (AI-005), summary cache (AI-009), feedback and
// the reviewer queue (AI-007, ADMIN-009), help numbers (OD-15), deletion.
import { createDb, ok, eq, done, ACADEMIC_MIGRATIONS } from './harness.mjs'
import { CONFIG_SQL, ID, apiFor, json, period } from './fixtures.mjs'

const db = await createDb(ACADEMIC_MIGRATIONS)
const { rpc, rpcError, one } = apiFor(db)
const [A, B, C, ADM] = ['a1', 'b1', 'c1', 'ad'].map((s) => `00000000-0000-0000-0000-0000000000${s}`)
const STAFF = { aal: 'aal2' }
await ok(db, 'users', `insert into public.users (id, name, role) values ('${A}', 'A', 'CUSTOMER'), ('${B}', 'B', 'CUSTOMER'), ('${C}', 'C', 'CUSTOMER'), ('${ADM}', 'Admin', 'ADMIN')`)
await ok(db, 'config', CONFIG_SQL + `update academic_settings set value = '{"read": {"limit": 1000, "seconds": 60}, "write": {"limit": 1000, "seconds": 60}}' where key = 'rate_limits';`)
await db.exec(`create or replace function public.academic_today() returns date language sql stable set search_path = '' as $$ select date '2026-11-18' $$`)
const profile = { display_name: 'S', age_band: '16_17', province_code: 'vientiane-prefecture', grade_id: ID.g11, school_id: ID.school, notice_version: '2026-10-25', subjects: [{ subject_id: ID.math }, { subject_id: ID.phys }] }
const a = await rpc(A, `public.academic_create_profile(${json(profile)})`)
const b = await rpc(B, `public.academic_create_profile(${json(profile)})`)
const subjects = async (enrolment) => Object.fromEntries((await db.query(`select s.code, se.id from academic_subject_enrolments se join academic_subjects s on s.id = se.subject_id where se.enrolment_id = '${enrolment}'`)).rows.map((r) => [r.code, r.id]))
const aIds = await subjects(a.enrolment_id)
const bIds = await subjects(b.enrolment_id)
let key = 0
const submit = (user, enrolment, seq, rows) => rpc(user, `public.academic_submit_score_entry('${enrolment}', '${period(seq)}', ${json(Object.entries(rows).map(([se, v]) => ({ subject_enrolment_id: se, status: 'scored', value: v })))}, 'k${++key}')`)
await submit(A, a.enrolment_id, 1, { [aIds.MATH]: 7, [aIds.PHYS]: 6.5 })
await submit(A, a.enrolment_id, 2, { [aIds.MATH]: 6, [aIds.PHYS]: 7 })
await submit(B, b.enrolment_id, 1, { [bIds.MATH]: 9.5, [bIds.PHYS]: 3 })
const context = async (user) => (await one(`select public.academic_coach_context('${user}') as v`)).v

// ─── What the model sees (AI-002, AI-003) ────────────────────────────────────

const ctx = await context(A)
eq("A's own months and subjects, labelled by month", [ctx.months.map((m) => [m.month_en, Number(m.average)]), ctx.subjects.map((s) => [s.subject_en, s.scores.map((p) => Number(p.score))])],
  [[['Month 1', 6.75], ['Month 2', 6.5]], [['Mathematics', [7, 6]], ['Physics', [6.5, 7]]]])
eq('scores per subject are counted (fewer than 3 = not enough data yet)', ctx.subjects.map((s) => s.number_of_scores), [2, 2])
eq("nothing of B's reaches A's context", JSON.stringify(ctx).includes('9.5'), false)
eq('no profile: nothing', await context(C), null)
eq('the context function is for the server only', (await rpcError(A, `public.academic_coach_context('${A}')`))?.status, '42501')
await ok(db, 'enforce', `update academic_settings set value = 'true' where key = 'entitlements_enforced'`)
eq('without Premium the Coach sees what the student sees: no confidence detail', [(await context(A)).detail_locked, (await context(A)).subjects.every((s) => s.label_confidence === null)], [true, true])
await ok(db, 'not enforced', `update academic_settings set value = 'false' where key = 'entitlements_enforced'`)

// ─── Status, help numbers (OD-15) ────────────────────────────────────────────

const status = await rpc(A, `public.academic_coach_status()`)
eq('off until switched on; help numbers in order', [status.available, status.busy, status.resources.map((r) => r.phone)], [false, false, ['1362', '1195', '1191', '1190', '1623', '1624', '1625']])
eq('this month: 10 Coach messages on Free', status.quota.limit, 10)

// ─── Quota (AI-006) and circuit breaker (AI-008) ─────────────────────────────

const take = async (user) => (await one(`select public.academic_coach_take_quota('${user}') as v`)).v
const first = await take(A)
for (let i = 0; i < 9; i++) await take(A)
eq('the 11th message this month is refused', [first.remaining, await take(A)], [9, null])
await ok(db, 'provider failed: refund', `select public.academic_coach_refund('${A}', '${first.period_key}')`)
eq('a failed call gives the message back', (await rpc(A, `public.academic_coach_status()`)).quota.remaining, 1)
const record = async (okCall) => (await one(`select public.academic_coach_record_call('coach_academic', ${okCall}, ${!okCall}, 21000, 'qwen-plus') as v`)).v
for (let i = 0; i < 3; i++) await record(true)
eq('fewer than 5 calls: closed', await record(false), false)
eq('5 calls, 2 failed (40% > 20%): the breaker opens', await record(true) || await record(false), true)
eq('students see "busy"', (await rpc(A, `public.academic_coach_status()`)).busy, true)
await ok(db, 'window passes', `update academic_ai_calls set created_at = now() - interval '10 minutes'`)
eq('after the window it closes again', (await rpc(A, `public.academic_coach_status()`)).busy, false)

// ─── Prompt versions (AI-005) and the summary cache (AI-009) ─────────────────

const prompt = async (id) => (await one(`select public.academic_prompt('${id}') as v`)).v
eq('active prompts have an id and a semantic version', [(await prompt('academic_chat')).version, (await prompt('academic_feedback')).version], ['1.0.0', '1.0.0'])
eq('1.1.0 is added switched off until it passes the evaluation (migration 147)', (await one(`select active from academic_prompt_templates where prompt_id = 'academic_chat' and version = '1.1.0'`)).active, false)
await ok(db, 'switch to 1.1.0', `update academic_prompt_templates set active = false where prompt_id = 'academic_chat';
  update academic_prompt_templates set active = true where prompt_id = 'academic_chat' and version = '1.1.0'`)
eq('switching a version is a configuration change', (await prompt('academic_chat')).version, '1.1.0')
await ok(db, 'roll back', `update academic_prompt_templates set active = false where prompt_id = 'academic_chat'; update academic_prompt_templates set active = true where prompt_id = 'academic_chat' and version = '1.0.0'`)
eq('and rolls back the same way', (await prompt('academic_chat')).version, '1.0.0')
const cacheKey = `${ctx.snapshot_id}|1.0.0|lo`
await ok(db, 'cache a summary', `select public.academic_ai_cache_put('${cacheKey}', '${ctx.snapshot_id}', '1.0.0', 'lo', 'ສະຫຼຸບ', 'ai', 'qwen-plus')`)
eq('a cached summary is served by snapshot, prompt version and language', (await one(`select public.academic_ai_cache_get('${cacheKey}') as v`)).v.body, 'ສະຫຼຸບ')
await ok(db, '31 days later', `update academic_ai_cache set expires_at = now() - interval '1 second'`)
eq('expired after 30 days', (await one(`select public.academic_ai_cache_get('${cacheKey}') as v`)).v, null)

// ─── Feedback (AI-007) and review (ADMIN-009) ────────────────────────────────

const conv = (await one(`insert into premium_coach_conversations (user_id, title, mode, student_profile_id) values ('${A}', 'Maths', 'academic', '${a.profile_id}') returning id`)).id
await ok(db, 'question', `insert into premium_coach_messages (conversation_id, user_id, role, content, created_at) values ('${conv}', '${A}', 'user', 'Why did my maths fall?', now() - interval '1 minute')`)
const answer = (await one(`insert into premium_coach_messages (conversation_id, user_id, role, content, prompt_version, model_id, numbers_checked) values ('${conv}', '${A}', 'assistant', 'Mathematics went from 7 in September to 6 in October.', '1.0.0', 'qwen-plus', true) returning id`)).id
const general = (await one(`insert into premium_coach_conversations (user_id, title) values ('${A}', 'General') returning id`)).id
const generalAnswer = (await one(`insert into premium_coach_messages (conversation_id, user_id, role, content) values ('${general}', '${A}', 'assistant', 'hi') returning id`)).id
eq('thumbs-down on an academic answer', (await rpc(A, `public.academic_coach_feedback('${answer}', ${json({ rating: -1 })})`)).rating, -1)
eq("another student cannot rate A's answer", await rpc(B, `public.academic_coach_feedback('${answer}', ${json({ rating: 1 })})`), { error: { code: 'NOT_FOUND', status: 404 } })
eq('general Coach answers are not part of this queue', await rpc(A, `public.academic_coach_feedback('${generalAnswer}', ${json({ rating: 1 })})`), { error: { code: 'NOT_FOUND', status: 404 } })
eq('rating must be 1 or -1', (await rpcError(A, `public.academic_coach_feedback('${answer}', ${json({ rating: 3 })})`))?.details?.field, 'rating')
let queue = await rpc(ADM, `public.academic_admin_ai_review('open')`, STAFF)
eq('reviewers see the item without the text until the student shares it', [queue.items.length, queue.items[0].answer, queue.items[0].prompt_version], [1, null, '1.0.0'])
await rpc(A, `public.academic_coach_feedback('${answer}', ${json({ report_category: 'unsafe', share_text: true, comment: 'Felt wrong' })})`)
queue = await rpc(ADM, `public.academic_admin_ai_review('open')`, STAFF)
eq('a safety report is priority; shared text shows question and answer', [queue.items[0].priority, queue.items[0].question, queue.items[0].answer.startsWith('Mathematics')], [true, 'Why did my maths fall?', true])
eq('students cannot read the queue', (await rpcError(A, `public.academic_admin_ai_review('open')`))?.code, 'FORBIDDEN_ROLE')
eq('the rubric needs all three ratings', (await rpcError(ADM, `public.academic_admin_rate_ai('${queue.items[0].id}', ${json({ accuracy: 5, lao: 4 })})`, STAFF))?.details?.field, 'safety')
await rpc(ADM, `public.academic_admin_rate_ai('${queue.items[0].id}', ${json({ accuracy: 5, lao: 4, safety: 5, note: 'Fine' })})`, STAFF)
eq('reviewed items leave the open queue', [(await rpc(ADM, `public.academic_admin_ai_review('open')`, STAFF)).items.length, (await rpc(ADM, `public.academic_admin_ai_review('reviewed')`, STAFF)).items[0].review.safety], [0, 5])
eq('review results by prompt version and model feed the evaluation (AI-010)', (await rpc(ADM, `public.academic_admin_ai_review('open')`, STAFF)).ratings.map((r) => [r.prompt_version, r.model_id, Number(r.reviewed), Number(r.lao)]),
  [['1.0.0', 'qwen-plus', 1, 4]])

// ─── Weekly random sample from consenting students (ADMIN-009, migration 146) ─

// Today is Wednesday 18 November: the sample covers Monday 9 to Sunday 15 November.
const chat = async (user, profileId, at, model = 'qwen-plus') => {
  const c = (await one(`insert into premium_coach_conversations (user_id, title, mode, student_profile_id) values ('${user}', 'Week', 'academic', '${profileId}') returning id`)).id
  await ok(db, 'question', `insert into premium_coach_messages (conversation_id, user_id, role, content, created_at) values ('${c}', '${user}', 'user', 'How is my physics?', '${at}'::timestamptz - interval '1 minute')`)
  return (await one(`insert into premium_coach_messages (conversation_id, user_id, role, content, model_id, prompt_version, created_at) values ('${c}', '${user}', 'assistant', 'Physics went from 6.5 to 7.', ${model ? `'${model}'` : 'null'}, '1.0.0', '${at}') returning id`)).id
}
const aWeek = await chat(A, a.profile_id, '2026-11-10 03:00+00')
await chat(A, a.profile_id, '2026-11-12 03:00+00', null) // a pre-approved safety reply: not an AI answer
await chat(A, a.profile_id, '2026-11-17 03:00+00') // this week: sampled next Monday
await chat(B, b.profile_id, '2026-11-11 03:00+00') // B has not agreed
const sample = async (week) => (await one(`select public.academic_coach_weekly_sample(${week ? `'${week}'` : ''}) as v`)).v
eq('nobody agreed yet: nothing is sampled', await sample('2026-11-02'), 0)
eq('sharing with reviewers is off until the student turns it on', (await one(`select count(*)::int as n from academic_consent_records where purpose = 'coach_review'`)).n, 0)
await rpc(A, `public.academic_grant_consent('coach_review', '2026-10-25')`)
eq("last week's AI answers from students who agreed: 1% or 50, whichever is larger, so all of them here", await sample(), 1)
queue = await rpc(ADM, `public.academic_admin_ai_review('open')`, STAFF)
eq('the sampled answer is in the queue with its text, after reports', [queue.items.length, queue.items[0].source, queue.items[0].sample_week, queue.items[0].question, queue.items[0].answer, queue.sample.items, Number(queue.sample.consenting_students)],
  [1, 'sample', '2026-11-09', 'How is my physics?', 'Physics went from 6.5 to 7.', 1, 1])
eq('a week is sampled once', await sample(), 0)
eq('the sample runs every Monday morning in Vientiane', (await db.query(`select schedule from cron.job where jobname = 'academic-coach-review-sample'`)).rows, [{ schedule: '30 18 * * 0' }])
eq('only the server runs the sample', (await rpcError(A, `public.academic_coach_weekly_sample()`))?.status, '42501')
await rpc(A, `public.academic_withdraw_consent('coach_review')`)
eq('withdrawing takes the open sampled answers out of the queue', [(await rpc(ADM, `public.academic_admin_ai_review('open')`, STAFF)).items.length, (await one(`select count(*)::int as n from academic_coach_feedback where message_id = '${aWeek}'`)).n], [0, 0])

// ─── Deletion ────────────────────────────────────────────────────────────────

await rpc(A, `public.academic_request_deletion('profile')`)
await ok(db, 'age request', `update academic_student_profiles set deletion_requested_at = now() - interval '15 days' where user_id = '${A}'`)
await ok(db, 'purge', `select public.academic_purge_due_deletions()`)
eq('deleting the profile deletes academic chats and their feedback; the general Coach chat stays',
  [(await one(`select count(*)::int as n from premium_coach_conversations where mode = 'academic' and user_id = '${A}'`)).n, (await one(`select count(*)::int as n from academic_coach_feedback`)).n,
   (await one(`select count(*)::int as n from premium_coach_conversations where id = '${general}'`)).n], [0, 0, 1])

done()
