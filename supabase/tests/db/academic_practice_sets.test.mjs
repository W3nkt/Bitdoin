// Practice sets (P2-REC #50: REC-PRACTICE): offered only for a published
// catalogue entry and the student's grade, 5 servable items with no answers
// up front, final answers with immediate feedback, least-practised first,
// done for 14 days in recommendations, the R5 trigger, export and deletion.
import { createDb, ok, eq, done, ACADEMIC_MIGRATIONS } from './harness.mjs'
import { CONFIG_SQL, ID, apiFor, json } from './fixtures.mjs'

const db = await createDb(ACADEMIC_MIGRATIONS)
const { rpc, rpcError, one } = apiFor(db)
const [A, B] = ['a1', 'b1'].map((s) => `00000000-0000-0000-0000-0000000000${s}`)
await ok(db, 'users', `insert into public.users (id, name) values ('${A}', 'A'), ('${B}', 'B')`)
await ok(db, 'config', CONFIG_SQL + `update academic_settings set value = '{"read": {"limit": 1000, "seconds": 60}, "write": {"limit": 1000, "seconds": 60}}' where key = 'rate_limits';`)
const profile = (grade) => json({ display_name: 'S', age_band: '16_17', province_code: 'vientiane-prefecture', grade_id: grade, school_id: ID.school, notice_version: '2026-10-25' })
const a = await rpc(A, `public.academic_create_profile(${profile(ID.g11)})`)
await rpc(B, `public.academic_create_profile(${profile(ID.g10)})`)
const errorOf = async (user, call) => await rpcError(user, call)

const ALG = '30000000-0000-0000-0000-000000000001'
const GEO = '30000000-0000-0000-0000-000000000002'
await ok(db, 'bank', `
  insert into academic_quiz_topics (id, subject_id, grade_id, code, name_lo, name_en) values
    ('${ALG}', '${ID.math}', '${ID.g11}', 'algebra', 'ພຶດຊະຄະນິດ', 'Algebra'), ('${GEO}', '${ID.math}', '${ID.g11}', 'geometry', 'ເລຂາ', 'Geometry');
  insert into academic_quiz_items (id, topic_id, stem_lo, options, correct_key, explanation_lo, explanation_origin, status)
  select ('50000000-0000-0000-0000-00000000000' || n)::uuid, '${ALG}', 'Q' || n, '[{"key":"A","text_lo":"1"},{"key":"B","text_lo":"2"}]', 'B', 'ເພາະ ' || n,
         case when n = 1 then 'ai' else 'human' end, case when n = 8 then 'draft' else 'approved' end
  from generate_series(1, 8) n;
  insert into academic_quiz_items (topic_id, stem_lo, options, correct_key, explanation_lo, status)
  select '${GEO}', 'G' || n, '[{"key":"A","text_lo":"1"},{"key":"B","text_lo":"2"}]', 'A', 'x', 'approved' from generate_series(1, 3) n;
  insert into academic_content_items (kind, external_id, subject_ids, grade_min, grade_max, topic_ids, difficulty, language, est_minutes, status, published_at) values
    ('practice_set', '${ALG}', array['${ID.math}']::uuid[], 11, 12, array['${ALG}']::uuid[], 1, 'lo', 8, 'published', now());`)

// ─── Availability ────────────────────────────────────────────────────────────

await ok(db, 'insights off', `update academic_settings set value = 'false' where key = 'insights_enabled'`)
eq('insights off: unavailable', (await errorOf(A, `public.academic_start_practice('${ALG}')`))?.code, 'PRACTICE_UNAVAILABLE')
await ok(db, 'insights on', `update academic_settings set value = 'true' where key = 'insights_enabled'`)
eq('a topic without a published practice set: unavailable', (await errorOf(A, `public.academic_start_practice('${GEO}')`))?.code, 'PRACTICE_UNAVAILABLE')
eq('outside the grade band: unavailable', (await errorOf(B, `public.academic_start_practice('${ALG}')`))?.code, 'PRACTICE_UNAVAILABLE')

// ─── A practice set ──────────────────────────────────────────────────────────

let set = await rpc(A, `public.academic_start_practice('${ALG}')`)
eq('5 approved items of the topic, no answers or explanations up front', [set.items.length, set.items.every((i) => i.feedback === null), /correct|explanation/.test(JSON.stringify(set.items.map(({ feedback, ...i }) => i)))], [5, true, false])
eq('drafts are never served', set.items.some((i) => i.stem_lo === 'Q8'), false)
const first = set.items[0]
let feedback = await rpc(A, `public.academic_answer_practice_item('${set.attempt_id}', '${first.id}', 'A')`)
eq('an answer returns the feedback at once', [feedback.is_correct, feedback.correct_key, feedback.explanation_lo, feedback.explanation_origin], [false, 'B', 'ເພາະ 1', 'ai'])
feedback = await rpc(A, `public.academic_answer_practice_item('${set.attempt_id}', '${first.id}', 'B')`)
eq('answers are final', [feedback.chosen_key, feedback.is_correct], ['A', false])
eq('unknown option refused', (await errorOf(A, `public.academic_answer_practice_item('${set.attempt_id}', '${set.items[1].id}', 'F')`))?.details?.field, 'key')
const resumed = await rpc(A, `public.academic_start_practice('${ALG}')`)
eq('resuming shows answered items with feedback', [resumed.attempt_id, resumed.items[0].feedback?.chosen_key, resumed.items[1].feedback], [set.attempt_id, 'A', null])
eq('finishing early is refused', (await errorOf(A, `public.academic_finish_practice('${set.attempt_id}')`))?.code, 'PRACTICE_UNANSWERED')
for (const item of set.items.slice(1)) await rpc(A, `public.academic_answer_practice_item('${set.attempt_id}', '${item.id}', 'B')`)
eq('finished: 4 of 5 correct', await rpc(A, `public.academic_finish_practice('${set.attempt_id}')`), { attempt_id: set.attempt_id, correct: 4, total: 5 })
eq('closed after finishing', (await errorOf(A, `public.academic_answer_practice_item('${set.attempt_id}', '${first.id}', 'B')`))?.code, 'PRACTICE_CLOSED')
const next = await rpc(A, `public.academic_start_practice('${ALG}')`)
eq('the next set starts with the items practised least', next.items.slice(0, 2).map((i) => i.stem_lo).sort(), ['Q6', 'Q7'])
const NOT_FOUND = { error: { code: 'NOT_FOUND', status: 404 } }
eq("another student cannot answer or finish A's practice", [await rpc(B, `public.academic_answer_practice_item('${next.attempt_id}', '${next.items[0].id}', 'B')`), await rpc(B, `public.academic_finish_practice('${next.attempt_id}')`)], [NOT_FOUND, NOT_FOUND])

// ─── Recommendations ─────────────────────────────────────────────────────────

const recommendable = async () => (await one(`select count(*)::int as n from public.academic_recommendable_content(array['practice_set'], '${ALG}', null, 11::smallint, null, null, false, '${A}')`)).n
eq('a practice set finished in the last 14 days is done', await recommendable(), 0)
await ok(db, 'two weeks later', `update academic_practice_attempts set completed_at = now() - interval '15 days' where id = '${set.attempt_id}'`)
eq('after 14 days it can be suggested again', await recommendable(), 1)
await ok(db, 'a quiz before the practice', `
  insert into academic_diagnostics (id, subject_id, grade_id, title_lo, title_en, status) values ('40000000-0000-0000-0000-000000000001', '${ID.math}', '${ID.g11}', 'ກ', 'Check', 'published');
  insert into academic_quiz_attempts (id, diagnostic_id, student_profile_id, item_ids, status, expires_at, completed_at, results)
  values ('60000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '${a.profile_id}', array['50000000-0000-0000-0000-000000000001']::uuid[], 'completed', now(), now() - interval '20 days',
          '[{"topic_id": "${ALG}", "band": "needs_practice", "correct": 1, "total": 5}, {"topic_id": "${GEO}", "band": "developing", "correct": 2, "total": 3}]');`)
const practisedAll = async () => (await one(`select public.academic_practised_all('${a.profile_id}', q) as v from academic_quiz_attempts q where id = '60000000-0000-0000-0000-000000000001'`)).v
eq('R5 trigger: every Needs-practice topic practised since the quiz', await practisedAll(), true)
await ok(db, 'practice older than the quiz', `update academic_practice_attempts set completed_at = now() - interval '30 days' where id = '${set.attempt_id}'`)
eq('practice from before the quiz does not count', await practisedAll(), false)

// ─── Export and deletion ─────────────────────────────────────────────────────

const exported = await rpc(A, `public.academic_export_my_quizzes()`)
eq('export lists practice with answers', [exported.practice.length, exported.practice[0].topic, exported.practice[0].correct, exported.practice[0].answers.length], [2, 'Algebra', 4, 5])
eq('practice tables are hidden from users', (await errorOf(A, `(select count(*) from academic_practice_attempts)`))?.status, '42501')
await rpc(A, `public.academic_request_deletion('scores')`)
await ok(db, 'age request', `update academic_student_profiles set deletion_requested_at = now() - interval '15 days' where user_id = '${A}'`)
await ok(db, 'purge', `select public.academic_purge_due_deletions()`)
eq("deleting scores deletes practice", (await one(`select count(*)::int as n from academic_practice_attempts where student_profile_id = '${a.profile_id}'`)).n, 0)

done()
