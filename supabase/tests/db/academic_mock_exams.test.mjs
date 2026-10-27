// Timed mock exams and practice sets (P5-EXAM #56, piece 2: EXAM-001/002,
// migration 165): built from approved quiz-bank items per blueprint session,
// "mock" only for the current intake, server-timed sessions, results per
// subject and topic kept apart, 3 free mock exams a year then Premium.
import { createDb, ok, eq, done, ACADEMIC_MIGRATIONS } from './harness.mjs'
import { CONFIG_SQL, ID, apiFor, json } from './fixtures.mjs'

const db = await createDb(ACADEMIC_MIGRATIONS)
const { rpc, rpcError, one } = apiFor(db)
const [S, B] = ['a1', 'b1'].map((s) => `00000000-0000-0000-0000-0000000000${s}`)
await ok(db, 'users', `insert into public.users (id, name, role) values ('${S}', 'Noy', 'CUSTOMER'), ('${B}', 'Kham', 'CUSTOMER')`)
await ok(db, 'config', CONFIG_SQL + `update academic_settings set value = '{"read": {"limit": 5000, "seconds": 60}, "write": {"limit": 5000, "seconds": 60}}' where key = 'rate_limits';
  update academic_settings set value = 'true' where key = 'entitlements_enforced';
  update academic_settings set value = jsonb_set(value, '{items_per_subject}', '6') where key = 'mock_rules';`)
const profile = { display_name: 'Noy', age_band: '16_17', province_code: 'vientiane-prefecture', grade_id: ID.g12, school_id: ID.school, notice_version: '2026-10-25', subjects: [{ subject_id: ID.math }] }
await rpc(S, `public.academic_create_profile(${json(profile)})`)
await rpc(B, `public.academic_create_profile(${json(profile)})`)

// Approved items: Mathematics 8 (two topics), Physics 6; one draft that must never be served.
const [ALG, GEOM, MECH] = ['61', '62', '63'].map((n) => `600000${n}-0000-0000-0000-000000000000`)
await ok(db, 'quiz bank', `insert into academic_quiz_topics (id, subject_id, grade_id, code, name_lo, name_en) values
  ('${ALG}', '${ID.math}', '${ID.g11}', 'algebra', 'ພຶດຊະຄະນິດ', 'Algebra'), ('${GEOM}', '${ID.math}', '${ID.g12}', 'geometry', 'ເລຂາ', 'Geometry'),
  ('${MECH}', '${ID.phys}', '${ID.g10}', 'mechanics', 'ກົນຈັກ', 'Mechanics');
  insert into academic_quiz_items (topic_id, stem_lo, options, correct_key, explanation_lo, status)
  select case when n <= 5 then '${ALG}' else '${GEOM}' end::uuid, 'M' || n, '[{"key":"A","text_lo":"1"},{"key":"B","text_lo":"2"}]', 'B', 'x', 'approved' from generate_series(1, 8) n;
  insert into academic_quiz_items (topic_id, stem_lo, options, correct_key, explanation_lo, status)
  select '${MECH}', 'P' || n, '[{"key":"A","text_lo":"1"},{"key":"B","text_lo":"2"}]', 'A', 'x', case when n = 7 then 'draft' else 'approved' end from generate_series(1, 7) n;`)

const blueprint = (slug, intake, subjects2) => ({ name_en: `Exam ${slug}`, name_lo: 'ສອບເສັງ', group: 'A', intake_year: intake,
  sessions: [{ label_en: 'Morning', label_lo: 'ເຊົ້າ', minutes: 120, subjects: ['MATH'] }, { label_en: 'Afternoon', label_lo: 'ບ່າຍ', minutes: 90, subjects: subjects2 }],
  source_name: 'NUOL', source_url: 'https://nuol.edu.la/index.php/news/640', verified_on: '2026-10-27', review_by: '2027-04-27' })
await ok(db, 'blueprints', `insert into academic_career_content (kind, slug, draft, published, status, review_by, published_review_by) values
  ('exam_blueprint', 'e-old', '${JSON.stringify(blueprint('old', '2026-2027', ['PHYS']))}', '${JSON.stringify(blueprint('old', '2026-2027', ['PHYS']))}', 'published', '2027-04-27', '2027-04-27'),
  ('exam_blueprint', 'e-now', '${JSON.stringify(blueprint('now', '2027-2028', ['PHYS']))}', '${JSON.stringify(blueprint('now', '2027-2028', ['PHYS']))}', 'published', '2027-04-27', '2027-04-27'),
  ('exam_blueprint', 'e-chem', '${JSON.stringify(blueprint('chem', '2027-2028', ['CHEM']))}', '${JSON.stringify(blueprint('chem', '2027-2028', ['CHEM']))}', 'published', '2027-04-27', '2027-04-27')`)

const page = await rpc(S, `public.academic_mock_exams()`)
eq('the current intake makes mock exams, an older one practice sets; subjects without enough items are named',
  [page.intake_year, page.free_left, page.entitled, page.blueprints.map((b) => [b.slug, b.kind, b.missing]).sort((x, y) => x[0].localeCompare(y[0]))],
  ['2027-2028', 3, false, [['e-chem', 'mock', ['CHEM']], ['e-now', 'mock', []], ['e-old', 'practice', []]]])
eq('not enough questions: refused', (await rpcError(S, `public.academic_start_mock('e-chem')`))?.code, 'MOCK_NOT_READY')

let view = await rpc(S, `public.academic_start_mock('e-old')`)
eq('a practice set: two sessions, 6 items each, only approved ones, nothing shown before Start',
  [view.kind, view.sessions.map((s) => s.item_count), view.sessions[0].items, (await one(`select count(*)::int as n from academic_mock_attempts a,
    jsonb_array_elements(a.sessions) s, jsonb_array_elements_text(s->'items') x join academic_quiz_items i on i.id = x::uuid where i.status <> 'approved'`)).n],
  ['practice', [6, 6], null, 0])
eq('one exam at a time', (await rpcError(S, `public.academic_start_mock('e-now')`))?.code, 'MOCK_IN_PROGRESS')
eq('answers wait for Start', (await rpcError(S, `public.academic_answer_mock_item('${view.attempt_id}', '${'0'.repeat(8)}-0000-0000-0000-000000000000', 'A')`))?.code, 'MOCK_SESSION_CLOSED')
view = await rpc(S, `public.academic_start_mock_session('${view.attempt_id}')`)
const s1 = view.sessions[0]
eq('Start opens the timer (120 minutes) and shows the questions without answers', [Math.round((new Date(s1.ends_at) - new Date(s1.started_at)) / 60000), s1.items.length, 'correct_key' in s1.items[0]], [120, 6, false])
for (const item of s1.items.slice(0, 4)) await rpc(S, `public.academic_answer_mock_item('${view.attempt_id}', '${item.id}', 'B')`)
eq("another student cannot answer it", (await rpc(B, `public.academic_answer_mock_item('${view.attempt_id}', '${s1.items[0].id}', 'B')`)).error?.code, 'NOT_FOUND')
view = await rpc(S, `public.academic_finish_mock_session('${view.attempt_id}')`)
eq('handing in moves to the next part, which waits for Start', [view.status, view.session_index, view.sessions[1].started_at, view.sessions[1].items], ['in_progress', 1, null, null])
view = await rpc(S, `public.academic_start_mock_session('${view.attempt_id}')`)
// Time runs out: the session closes on the next request and late answers are refused.
await db.exec(`update academic_mock_attempts set sessions = jsonb_set(sessions, '{1,ends_at}', to_jsonb(now() - interval '2 minutes')) where id = '${view.attempt_id}'`)
eq('after the time (and grace), answers are refused', (await rpcError(S, `public.academic_answer_mock_item('${view.attempt_id}', '${view.sessions[1].items[0].id}', 'A')`))?.code, 'MOCK_SESSION_CLOSED')
view = await rpc(S, `public.academic_get_mock('${view.attempt_id}')`)
eq('the last part closed by time: finished with results per subject and topic', [view.status, view.result.total, view.result.correct, view.result.subjects.map((x) => x.code)], ['finished', 12, 4, ['MATH', 'PHYS']])
eq('topic bands as QUIZ-002 (fewer than 3 items: not enough)', view.result.topics.every((t) => ['secure', 'developing', 'needs_practice', 'not_enough'].includes(t.band)), true)
eq('the review shows answers and explanations once finished', [view.review.length, 'correct_key' in view.review[0]], [12, true])

// Free allowance: 3 mock exams a school year, then Premium.
for (let i = 0; i < 3; i++) {
  const m = await rpc(S, `public.academic_start_mock('e-now')`)
  await db.exec(`update academic_mock_attempts set status = 'finished', finished_at = now() where id = '${m.attempt_id}'`)
}
eq('practice sets do not use the allowance; after 3 mock exams Premium is needed', [(await rpc(S, `public.academic_mock_exams()`)).free_left, (await rpcError(S, `public.academic_start_mock('e-now')`))?.code], [0, 'ENTITLEMENT_REQUIRED'])
await ok(db, 'premium', `insert into premium_subscriptions (user_id, plan_id, status) select '${S}', id, 'ACTIVE' from premium_plans where price_lak > 0 limit 1`)
eq('with Academy Premium: more mock exams', (await rpc(S, `public.academic_start_mock('e-now')`)).kind, 'mock')
eq('practice sets stay free', (await rpc(B, `public.academic_start_mock('e-old')`)).kind, 'practice')
eq('kept apart from school scores and quizzes, and in Download my data', [(await rpc(S, `public.academic_export_my_mocks()`)).length, (await one(`select count(*)::int as n from academic_quiz_attempts`)).n], [5, 0])

done()
