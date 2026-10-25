// Diagnostic quizzes (P2-ANL #49: QUIZ-001..003, ANALYSIS-005, F11): publish
// rules, the insights switch, start/resume within 7 days, answers saved one by
// one without exposing the answer, topic bands at their edges, review with
// explanations, other students' attempts, export and deletion.
import { createDb, ok, eq, done, ACADEMIC_MIGRATIONS } from './harness.mjs'
import { CONFIG_SQL, ID, apiFor, json } from './fixtures.mjs'

const db = await createDb(ACADEMIC_MIGRATIONS)
const { rpc, rpcError, one } = apiFor(db)
const ADM = '00000000-0000-0000-0000-0000000000d1'
const [A, B, C] = ['a1', 'b1', 'c1'].map((s) => `00000000-0000-0000-0000-0000000000${s}`)
const STAFF = { aal: 'aal2' }
await ok(db, 'users', `insert into public.users (id, name, role) values ('${ADM}', 'Admin', 'ADMIN'), ('${A}', 'A', 'CUSTOMER'), ('${B}', 'B', 'CUSTOMER'), ('${C}', 'C', 'CUSTOMER')`)
// Three quizzes in a few seconds would trip the 30-writes-a-minute student limit.
await ok(db, 'config', CONFIG_SQL + `update academic_settings set value = 'true' where key = 'insights_enabled';
  update academic_settings set value = '{"read": {"limit": 1000, "seconds": 60}, "write": {"limit": 1000, "seconds": 60}}' where key = 'rate_limits';`)
const admin = (call) => rpc(ADM, call, STAFF)
const errorOf = async (user, call, opts) => await rpcError(user, call, opts)

// ─── Bank: 6 algebra + 4 geometry approved items, plus one draft ─────────────

const topic = async (code, order) => (await admin(`public.academic_admin_save_quiz_topic(${json({ subject_id: ID.math, grade_id: ID.g11, code, name_lo: code, name_en: code[0].toUpperCase() + code.slice(1), display_order: order })})`))
  .topics.find((t) => t.code === code).id
const algebra = await topic('algebra', 1)
const geometry = await topic('geometry', 2)
const options = [{ key: 'A', text_lo: 'ກ' }, { key: 'B', text_lo: 'ຂ' }, { key: 'C', text_lo: 'ຄ' }, { key: 'D', text_lo: 'ງ' }]
const item = async (topicId, n, status = 'approved', origin = 'human') => (await one(`insert into academic_quiz_items
  (topic_id, stem_lo, options, correct_key, explanation_lo, explanation_origin, status, author_id)
  values ('${topicId}', 'Q${n}', ${json(options)}, 'B', 'ເພາະວ່າ B', '${origin}', '${status}', '${ADM}') returning id`)).id
const alg = []
for (let n = 1; n <= 6; n++) alg.push(await item(algebra, n, 'approved', n === 1 ? 'ai' : 'human'))
const geo = []
for (let n = 7; n <= 10; n++) geo.push(await item(geometry, n))
const draftItem = await item(algebra, 11, 'draft')

// ─── Admin: publish rules ────────────────────────────────────────────────────

const base = { subject_id: ID.math, grade_id: ID.g11, title_lo: 'ກວດຄະນິດສາດ ມ.6', title_en: 'Grade 11 Mathematics check' }
const problemsOf = (list, id) => Object.keys(list.diagnostics.find((d) => d.id === id).problems).sort()
let list = await admin(`public.academic_admin_save_diagnostic(${json({ ...base, item_ids: alg.slice(0, 5).concat(geo.slice(0, 4)) })})`)
const diag = list.diagnostics[0]
eq('9 items is too few', problemsOf(list, diag.id), ['items'])
list = await admin(`public.academic_admin_save_diagnostic(${json({ ...base, id: diag.id, item_ids: [...alg, ...geo.slice(0, 2), draftItem] })})`)
eq('a draft item, a topic with 2 items and 9 items are refused', problemsOf(list, diag.id), ['approved', 'items', 'topics'])
eq('publishing an incomplete diagnostic fails', (await errorOf(ADM, `public.academic_admin_set_diagnostic_status('${diag.id}', 'publish')`, STAFF))?.code, 'DIAGNOSTIC_INCOMPLETE')
eq('each item once', (await errorOf(ADM, `public.academic_admin_save_diagnostic(${json({ ...base, id: diag.id, item_ids: [alg[0], alg[0]] })})`, STAFF))?.details?.field, 'item_ids')
list = await admin(`public.academic_admin_save_diagnostic(${json({ ...base, id: diag.id, item_ids: [...alg, ...geo] })})`)
eq('10 approved items, 6 + 4 per topic: ready', [problemsOf(list, diag.id), list.diagnostics[0].item_ids.length], [[], 10])
list = await admin(`public.academic_admin_set_diagnostic_status('${diag.id}', 'publish')`)
eq('published', list.diagnostics[0].status, 'published')
eq('published diagnostics are locked', (await errorOf(ADM, `public.academic_admin_save_diagnostic(${json({ ...base, id: diag.id, item_ids: [...alg, ...geo] })})`, STAFF))?.code, 'DIAGNOSTIC_LOCKED')
eq('students cannot manage diagnostics', (await errorOf(A, `public.academic_admin_list_diagnostics()`))?.code, 'FORBIDDEN_ROLE')

// ─── Students ────────────────────────────────────────────────────────────────

const onboard = (user, grade = ID.g11) => rpc(user, `public.academic_create_profile(${json({
  display_name: 'S', age_band: '16_17', province_code: 'vientiane-prefecture', grade_id: grade, school_id: ID.school,
  notice_version: '2026-10-25', subjects: [{ subject_id: ID.math }, { custom_name: 'Robotics' }],
})})`)
const a = await onboard(A)
await onboard(B)
await onboard(C, ID.g10)
const subjectOf = async (enrolment, custom = false) => (await one(`select id from academic_subject_enrolments where enrolment_id = '${enrolment}' and ${custom ? 'custom_name is not null' : `subject_id = '${ID.math}'`}`)).id
const aMath = await subjectOf(a.enrolment_id)

let offer = await rpc(A, `public.academic_get_quiz_offer('${aMath}')`)
eq('offer: the published diagnostic for the subject and grade (ANALYSIS-005)', [offer.diagnostic?.id, offer.diagnostic?.items, offer.attempt, offer.last_result], [diag.id, 10, null, null])
eq('no offer for a custom subject', (await rpc(A, `public.academic_get_quiz_offer('${await subjectOf(a.enrolment_id, true)}')`)).diagnostic, null)
eq("another student's subject -> 404", await rpc(B, `public.academic_get_quiz_offer('${aMath}')`), { error: { code: 'NOT_FOUND', status: 404 } })
await ok(db, 'insights off', `update academic_settings set value = 'false' where key = 'insights_enabled'`)
eq('insights off: no offer', (await rpc(A, `public.academic_get_quiz_offer('${aMath}')`)).diagnostic, null)
eq('insights off: cannot start', (await errorOf(A, `public.academic_start_quiz('${diag.id}')`))?.code, 'QUIZ_UNAVAILABLE')
await ok(db, 'insights on', `update academic_settings set value = 'true' where key = 'insights_enabled'`)
eq('another grade cannot start it', (await errorOf(C, `public.academic_start_quiz('${diag.id}')`))?.code, 'QUIZ_UNAVAILABLE')

let attempt = await rpc(A, `public.academic_start_quiz('${diag.id}')`)
eq('started: 10 items in order, one topic each, no answers yet', [attempt.items.length, attempt.items.map((i) => i.stem_lo).join(','), attempt.items[6].topic.name_en, attempt.answers],
  [10, 'Q1,Q2,Q3,Q4,Q5,Q6,Q7,Q8,Q9,Q10', 'Geometry', {}])
eq('the answer is never sent while answering', /correct|explanation/.test(JSON.stringify(attempt)), false)
eq('resumable for 7 days', Math.round((new Date(attempt.expires_at) - Date.now()) / 86400000), 7)

const answer = (user, id, item, key) => rpc(user, `public.academic_answer_quiz_item('${id}', '${item}', '${key}')`)
eq('progress saved per answer', await answer(A, attempt.attempt_id, alg[0], 'A'), { answered: 1, total: 10 })
eq('an answer can be changed before finishing', await answer(A, attempt.attempt_id, alg[0], 'B'), { answered: 1, total: 10 })
eq('resuming returns the same attempt and answers', [(await rpc(A, `public.academic_start_quiz('${diag.id}')`)).attempt_id, (await rpc(A, `public.academic_start_quiz('${diag.id}')`)).answers], [attempt.attempt_id, { [alg[0]]: 'B' }])
eq('unknown option refused', (await errorOf(A, `public.academic_answer_quiz_item('${attempt.attempt_id}', '${alg[1]}', 'F')`))?.details?.field, 'key')
eq('item outside the quiz refused', (await errorOf(A, `public.academic_answer_quiz_item('${attempt.attempt_id}', '${draftItem}', 'B')`))?.details?.field, 'item_id')
eq('finishing early is refused with the count', (await errorOf(A, `public.academic_finish_quiz('${attempt.attempt_id}')`))?.details, { missing: 9 })
eq('results wait for the end', (await errorOf(A, `public.academic_get_quiz_result('${attempt.attempt_id}')`))?.code, 'QUIZ_NOT_FINISHED')

// Other students: 404 and audited, nothing changes.
const NOT_FOUND = { error: { code: 'NOT_FOUND', status: 404 } }
eq("another student cannot answer, finish or read A's attempt", [
  await answer(B, attempt.attempt_id, alg[1], 'B'),
  await rpc(B, `public.academic_finish_quiz('${attempt.attempt_id}')`),
  await rpc(B, `public.academic_get_quiz_result('${attempt.attempt_id}')`),
], [NOT_FOUND, NOT_FOUND, NOT_FOUND])
eq('denials are audited', (await one(`select count(*)::int as n from academic_audit_events where actor_user_id = '${B}' and action = 'access_denied' and target_id = '${attempt.attempt_id}'`)).n, 3)

// Algebra 5 of 6 (83%, secure), geometry 2 of 4 (50%, developing: the edge).
for (const id of alg.slice(1)) await answer(A, attempt.attempt_id, id, id === alg[5] ? 'C' : 'B')
for (const [i, id] of geo.entries()) await answer(A, attempt.attempt_id, id, i < 2 ? 'B' : 'D')
let result = await rpc(A, `public.academic_finish_quiz('${attempt.attempt_id}')`)
eq('topic results with bands (QUIZ-002, F11)', result.topics.map((t) => [t.name_en, t.correct, t.total, t.band]), [['Algebra', 5, 6, 'secure'], ['Geometry', 2, 4, 'developing']])
const reviewed = result.items[5]
eq('review shows chosen, correct and the explanation (QUIZ-003)', [reviewed.chosen_key, reviewed.correct_key, reviewed.is_correct, reviewed.explanation_lo], ['C', 'B', false, 'ເພາະວ່າ B'])
eq('AI-drafted explanations are flagged for a label', [result.items[0].explanation_origin, result.items[1].explanation_origin], ['ai', 'human'])
eq('finishing again returns the same result', (await rpc(A, `public.academic_finish_quiz('${attempt.attempt_id}')`)).topics, result.topics)
eq('answers are closed after finishing', (await errorOf(A, `public.academic_answer_quiz_item('${attempt.attempt_id}', '${alg[0]}', 'A')`))?.code, 'QUIZ_CLOSED')
offer = await rpc(A, `public.academic_get_quiz_offer('${aMath}')`)
eq('offer links the last result; not strong in every topic (ANALYSIS-007)', [offer.attempt, offer.last_result?.id, offer.last_result?.strong], [null, attempt.attempt_id, false])
const firstTopics = result.topics

// Retake (QUIZ-004): opens 7 days after finishing.
eq('within 7 days no retake is offered, with the date it opens', [offer.start_id, Math.round((new Date(offer.retake_from) - new Date(result.completed_at)) / 86400000)], [null, 7])
eq('starting early is refused', (await errorOf(A, `public.academic_start_quiz('${diag.id}')`))?.code, 'QUIZ_TOO_SOON')
await ok(db, 'a week later', `update academic_quiz_attempts set completed_at = completed_at - interval '8 days' where id = '${attempt.attempt_id}'`)
eq('after 7 days the retake is offered', (await rpc(A, `public.academic_get_quiz_offer('${aMath}')`)).start_id, diag.id)
// Geometry 1 of 4 (needs practice), algebra 4 of 6 (67%, developing).
const retake = await rpc(A, `public.academic_start_quiz('${diag.id}')`)
eq('a retake is a new attempt', retake.attempt_id !== attempt.attempt_id, true)
for (const [i, id] of alg.entries()) await answer(A, retake.attempt_id, id, i < 4 ? 'B' : 'A')
for (const [i, id] of geo.entries()) await answer(A, retake.attempt_id, id, i < 1 ? 'B' : 'A')
result = await rpc(A, `public.academic_finish_quiz('${retake.attempt_id}')`)
eq('bands below the edges', result.topics.map((t) => t.band), ['developing', 'needs_practice'])
eq('results show the change per topic against the previous attempt (QUIZ-004)', [result.previous?.attempt_id, result.previous?.topics], [attempt.attempt_id, firstTopics])

// Expiry: an unfinished attempt older than 7 days closes; starting again opens a new one.
const stale = await rpc(B, `public.academic_start_quiz('${diag.id}')`)
await ok(db, 'age attempt', `update academic_quiz_attempts set expires_at = now() - interval '1 minute' where id = '${stale.attempt_id}'`)
eq('expired attempts take no answers', (await errorOf(B, `public.academic_answer_quiz_item('${stale.attempt_id}', '${alg[0]}', 'B')`))?.details, { status: 'expired' })
eq('starting after expiry begins a new attempt', (await rpc(B, `public.academic_start_quiz('${diag.id}')`)).attempt_id !== stale.attempt_id, true)

// Items retired after publishing are not served in new attempts (QUIZ-005).
await ok(db, 'retire one geometry item', `update academic_quiz_items set status = 'retired', retired_at = now() where id = '${geo[3]}'`)
await ok(db, 'clear B attempts', `delete from academic_quiz_attempts where student_profile_id = (select id from academic_student_profiles where user_id = '${B}')`)
eq('below 10 servable items the quiz is unavailable', (await errorOf(B, `public.academic_start_quiz('${diag.id}')`))?.code, 'QUIZ_UNAVAILABLE')
await ok(db, 'lower the minimum', `update academic_settings set value = '{"min_items": 9, "max_items": 15, "min_per_topic": 3, "resume_days": 7}' where key = 'diagnostic_rules'`)
eq('new attempts skip the retired item', (await rpc(B, `public.academic_start_quiz('${diag.id}')`)).items.length, 9)

// Parallel forms (QUIZ-004): same blueprint, different items.
const algP = []
for (let n = 21; n <= 26; n++) algP.push(await item(algebra, n))
const geoP = []
for (let n = 27; n <= 30; n++) geoP.push(await item(geometry, n))
const parallel = { ...base, title_en: 'Form B', parallel_of: diag.id }
list = await admin(`public.academic_admin_save_diagnostic(${json({ ...parallel, item_ids: [...algP.slice(0, 5), alg[0], ...geoP] })})`)
const formB = list.diagnostics.find((d) => d.title_en === 'Form B')
eq('a parallel form cannot reuse the main form\'s items', problemsOf(list, formB.id), ['overlap'])
list = await admin(`public.academic_admin_save_diagnostic(${json({ ...parallel, id: formB.id, item_ids: [...algP.slice(0, 5), ...geoP] })})`)
eq('a parallel form follows the main blueprint', problemsOf(list, formB.id), ['parallel'])
eq('only a main form of the same subject and grade can be the parent', (await errorOf(ADM, `public.academic_admin_save_diagnostic(${json({ ...parallel, grade_id: ID.g10, item_ids: algP })})`, STAFF))?.details?.field, 'parallel_of')
list = await admin(`public.academic_admin_save_diagnostic(${json({ ...parallel, id: formB.id, item_ids: [...algP, ...geoP] })})`)
list = await admin(`public.academic_admin_set_diagnostic_status('${formB.id}', 'publish')`)
eq('publishing a parallel form keeps the main form', list.diagnostics.filter((d) => d.status === 'published').map((d) => d.title_en).sort(), ['Form B', 'Grade 11 Mathematics check'])

offer = await rpc(A, `public.academic_get_quiz_offer('${aMath}')`)
eq('just finished: the next form waits', [offer.start_id, offer.retake_from !== null], [null, true])
await ok(db, 'a week later', `update academic_quiz_attempts set completed_at = completed_at - interval '8 days' where id = '${retake.attempt_id}'`)
offer = await rpc(A, `public.academic_get_quiz_offer('${aMath}')`)
eq('then the form not taken yet is offered', offer.start_id, formB.id)
const third = await rpc(A, `public.academic_start_quiz('${formB.id}')`)
eq('the parallel form has different items', third.items.some((i) => [...alg, ...geo].includes(i.id)), false)
for (const i of third.items) await answer(A, third.attempt_id, i.id, 'B')
result = await rpc(A, `public.academic_finish_quiz('${third.attempt_id}')`)
eq('change per topic across forms of the family', [result.topics.map((t) => t.band), result.previous?.attempt_id], [['secure', 'secure'], retake.attempt_id])
eq('strong in every topic is flagged for conflicting evidence (ANALYSIS-007)', (await rpc(A, `public.academic_get_quiz_offer('${aMath}')`)).last_result.strong, true)
await ok(db, 'a week later', `update academic_quiz_attempts set completed_at = completed_at - interval '8 days' where id = '${third.attempt_id}'`)
eq('with every form taken, the one finished longest ago comes next', (await rpc(A, `public.academic_get_quiz_offer('${aMath}')`)).start_id, diag.id)

// A new published diagnostic retires the old one.
list = await admin(`public.academic_admin_save_diagnostic(${json({ ...base, title_en: 'v2', item_ids: [...alg, ...geo.slice(0, 3)] })})`)
const v2 = list.diagnostics.find((d) => d.title_en === 'v2')
list = await admin(`public.academic_admin_set_diagnostic_status('${v2.id}', 'publish')`)
eq('publishing v2 retires v1 and its parallel form', list.diagnostics.map((d) => [d.title_en, d.status]).sort(), [['Form B', 'retired'], ['Grade 11 Mathematics check', 'retired'], ['v2', 'published']])
eq('a retired diagnostic cannot be started', (await errorOf(A, `public.academic_start_quiz('${diag.id}')`))?.code, 'QUIZ_UNAVAILABLE')
eq('retiring needs a note', (await errorOf(ADM, `public.academic_admin_set_diagnostic_status('${v2.id}', 'retire', 'no')`, STAFF))?.details?.field, 'note')
eq('admin list counts attempts', [list.diagnostics.find((d) => d.id === diag.id).attempts, list.diagnostics.find((d) => d.id === diag.id).completed], [3, 2])

// ─── Export and deletion ─────────────────────────────────────────────────────

const exported = await rpc(A, `public.academic_export_my_quizzes()`)
eq('export lists every attempt with topics and answers', [exported.attempts.length, exported.attempts[0].topics.length, exported.attempts[0].answers.length, exported.attempts[0].answers[0]], [3, 2, 10, { position: 1, question: 'Q1', chosen: 'B', correct: 'B' }])
eq('quiz tables are hidden from users', (await errorOf(A, `(select count(*) from academic_quiz_attempts)`))?.status, '42501')
await rpc(A, `public.academic_request_deletion('scores')`)
await ok(db, 'age request', `update academic_student_profiles set deletion_requested_at = now() - interval '15 days' where user_id = '${A}'`)
await ok(db, 'purge', `select public.academic_purge_due_deletions()`)
eq("deleting scores deletes quiz attempts too; the profile stays", [
  (await one(`select count(*)::int as n from academic_quiz_attempts a join academic_student_profiles p on p.id = a.student_profile_id where p.user_id = '${A}'`)).n,
  (await one(`select status from academic_student_profiles where user_id = '${A}'`)).status,
], [0, 'active'])

done()
