// Weekly next actions (P2-REC #50: LEARN-001..003, PRD §14.6.2): every rule
// on the PRD §20.9 student, ranking and caps, only published and available
// content, Academy items for members only, completed lessons skipped, the
// content-gap card and log, impressions once a day, determinism.
import { createDb, ok, eq, done, ACADEMIC_MIGRATIONS } from './harness.mjs'
import { CONFIG_SQL, ID, apiFor, json, period } from './fixtures.mjs'

const db = await createDb(ACADEMIC_MIGRATIONS)
const { rpc, rpcError, one } = apiFor(db)
const [A, B, ADM] = ['a1', 'b1', 'd1'].map((s) => `00000000-0000-0000-0000-0000000000${s}`)
const STAFF = { aal: 'aal2' }
const CHEM = '10000000-0000-0000-0000-0000000000c1'
const BIO = '10000000-0000-0000-0000-0000000000c2'
const ENG = '10000000-0000-0000-0000-0000000000c3'
await ok(db, 'users', `insert into public.users (id, name, role) values ('${A}', 'A', 'CUSTOMER'), ('${B}', 'B', 'CUSTOMER'), ('${ADM}', 'Admin', 'ADMIN')`)
await ok(db, 'config', CONFIG_SQL + `
  insert into academic_subjects (id, code, name_lo, name_en, grade_min, grade_max) values
    ('${CHEM}', 'CHEM', 'ເຄມີ', 'Chemistry', 10, 12), ('${BIO}', 'BIO', 'ຊີວະ', 'Biology', 10, 12), ('${ENG}', 'ENG', 'ອັງກິດ', 'English', 10, 12);
  update academic_settings set value = '{"read": {"limit": 1000, "seconds": 60}, "write": {"limit": 1000, "seconds": 60}}' where key = 'rate_limits';`)
await db.exec(`create or replace function public.academic_today() returns date language sql stable set search_path = '' as $$ select date '2027-05-20' $$`)
const recs = async (user) => (await rpc(user, `public.academic_get_recommendations()`)).items
const view = (items) => items.map((i) => [i.rule_id, i.kind, i.title_en, i.priority])

// ─── The PRD §20.9 student: Mathematics lower and declining, Chemistry stronger and improving ──

const codes = { MATH: ID.math, PHYS: ID.phys, CHEM, BIO, LAO: ID.lao, ENG }
const table = { MATH: [6, 7, 6.5, 5.5, 5, 5.5], PHYS: [7, 6, 6.5, 6, 'missing', 6], CHEM: [7.5, 8, 8, 8.5, 8, 8.5], BIO: [8.5, 9, 8.5, 9, 9, 9.5], LAO: [8, 8, 7.5, 8, 8, 8], ENG: [6, 7, 5, 8, 6, 7.5] }
const onboard = async (user) => {
  const p = await rpc(user, `public.academic_create_profile(${json({ display_name: 'S', age_band: '16_17', province_code: 'vientiane-prefecture', grade_id: ID.g11, school_id: ID.school, notice_version: '2026-10-25', subjects: Object.values(codes).map((id) => ({ subject_id: id })) })})`)
  const ids = Object.fromEntries((await db.query(`select s.code, se.id from academic_subject_enrolments se join academic_subjects s on s.id = se.subject_id where se.enrolment_id = '${p.enrolment_id}'`)).rows.map((r) => [r.code, r.id]))
  return { ...p, ids }
}
const submit = (user, s, seq, lines) => rpc(user, `public.academic_submit_score_entry('${s.enrolment_id}', '${period(seq)}', ${json(Object.entries(lines).map(([code, v]) => (typeof v === 'number'
  ? { subject_enrolment_id: s.ids[code], status: 'scored', value: v } : { subject_enrolment_id: s.ids[code], status: v })))}, '${user}-${seq}')`)
const a = await onboard(A)
const b = await onboard(B)
for (let m = 0; m < 6; m++) {
  const lines = Object.fromEntries(Object.keys(table).map((c) => [c, table[c][m]]))
  await submit(A, a, m + 1, lines)
  await submit(B, b, m + 1, lines)
}

// Diagnostic for Grade 11 Mathematics: Algebra and Geometry, 5 items each.
await ok(db, 'quiz', `
  insert into academic_quiz_topics (id, subject_id, grade_id, code, name_lo, name_en, display_order) values
    ('30000000-0000-0000-0000-000000000001', '${ID.math}', '${ID.g11}', 'algebra', 'ພຶດຊະຄະນິດ', 'Algebra', 1),
    ('30000000-0000-0000-0000-000000000002', '${ID.math}', '${ID.g11}', 'geometry', 'ເລຂາຄະນິດ', 'Geometry', 2),
    ('30000000-0000-0000-0000-000000000003', '${CHEM}', '${ID.g11}', 'reactions', 'ປະຕິກິລິຍາ', 'Reactions', 1);
  insert into academic_quiz_items (topic_id, stem_lo, options, correct_key, explanation_lo, status)
  select t, 'Q' || n || t, '[{"key":"A","text_lo":"1"},{"key":"B","text_lo":"2"}]', 'B', 'x', 'approved'
  from unnest(array['30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002']::uuid[]) t, generate_series(1, 5) n;
  insert into academic_diagnostics (id, subject_id, grade_id, title_lo, title_en, status) values ('40000000-0000-0000-0000-000000000001', '${ID.math}', '${ID.g11}', 'ກວດຄະນິດສາດ', 'Mathematics check', 'published');
  insert into academic_diagnostic_items (diagnostic_id, item_id, position)
  select '40000000-0000-0000-0000-000000000001', id, row_number() over (order by topic_id, stem_lo) from academic_quiz_items;`)
const ALG = '30000000-0000-0000-0000-000000000001'
const GEO = '30000000-0000-0000-0000-000000000002'
const quiz = await rpc(A, `public.academic_start_quiz('40000000-0000-0000-0000-000000000001')`)
// Algebra 1 of 5 (needs practice), Geometry 3 of 5 (developing).
let algSeen = 0
let geoSeen = 0
for (const item of quiz.items) {
  const right = item.topic.name_en === 'Algebra' ? algSeen++ < 1 : geoSeen++ < 3
  await rpc(A, `public.academic_answer_quiz_item('${quiz.attempt_id}', '${item.id}', '${right ? 'B' : 'A'}')`)
}
const result = await rpc(A, `public.academic_finish_quiz('${quiz.attempt_id}')`)
eq('quiz bands as set up', result.topics.map((t) => [t.name_en, t.band]), [['Algebra', 'needs_practice'], ['Geometry', 'developing']])

// Catalogue: Academy records and entries.
await ok(db, 'academy', `
  insert into premium_lessons (id, slug, title_en, title_lo, status, published_at) values
    ('20000000-0000-0000-0000-000000000001', 'linear-equations', 'Linear equations lesson', 'ບົດສົມຜົນ', 'PUBLISHED', now() - interval '2 days'),
    ('20000000-0000-0000-0000-000000000002', 'later', 'Future lesson', 'ອະນາຄົດ', 'PUBLISHED', now() + interval '5 days');
  insert into premium_weekly_challenges (id, slug, title_en, title_lo, starts_on, ends_on) values
    ('20000000-0000-0000-0000-000000000011', 'lab-week', 'Lab week challenge', 'ອາທິດທົດລອງ', '2027-05-17', '2027-05-23');
  insert into academic_content_items (kind, external_id, subject_ids, grade_min, grade_max, topic_ids, difficulty, language, est_minutes, quality_score, status, published_at) values
    ('practice_set', '${ALG}', array['${ID.math}']::uuid[], 10, 12, array['${ALG}']::uuid[], 1, 'lo', 8, null, 'published', now() - interval '3 days'),
    ('academy_lesson', '20000000-0000-0000-0000-000000000001', array['${ID.math}']::uuid[], 10, 12, array['${ALG}']::uuid[], 1, 'en', 15, 5, 'published', now() - interval '1 day'),
    ('academy_lesson', '20000000-0000-0000-0000-000000000002', array['${ID.math}']::uuid[], 10, 12, array['${ALG}']::uuid[], 1, 'en', 15, 5, 'published', now()),
    ('practice_set', '${GEO}', array['${ID.math}']::uuid[], 10, 12, array['${GEO}']::uuid[], 2, 'lo', 8, 3, 'published', now() - interval '3 days'),
    ('practice_set', '${GEO}'::uuid, array['${ID.math}']::uuid[], 10, 12, array['${GEO}']::uuid[], 1, 'lo', 8, 5, 'draft', null)
  on conflict (kind, external_id) do nothing;
  insert into academic_content_items (kind, external_id, subject_ids, grade_min, grade_max, topic_ids, difficulty, language, est_minutes, quality_score, status, published_at) values
    ('academy_challenge', '20000000-0000-0000-0000-000000000011', array['${CHEM}']::uuid[], 10, 12, array['30000000-0000-0000-0000-000000000003']::uuid[], 3, 'lo', 30, 4, 'published', now());`)

// ─── Ranking ─────────────────────────────────────────────────────────────────

let items = await recs(A)
eq('free student: missing month, foundation practice for Algebra, consolidation for Geometry (LEARN-001)', view(items),
  [['R1', 'enter_scores', 'Month 7', 100], ['R3', 'practice_set', 'Algebra', 80], ['R4', 'practice_set', 'Geometry', 60]])
eq('each action has a reason, a time and an action', [items[1].reason.code, items[1].reason.topic_en, items[1].reason.band, items[1].est_minutes, items[1].route],
  ['R3', 'Algebra', 'needs_practice', 8, `/academy/scores/practice/${ALG}`])
eq('identical inputs give identical output (LEARN-002)', await recs(A), items)
eq('impressions logged once a day with rule ids', (await db.query(`select rule_id, kind from academic_recommendation_impressions order by rule_id`)).rows.map((r) => [r.rule_id, r.kind]),
  [['R1', 'enter_scores'], ['R3', 'practice_set'], ['R4', 'practice_set']])

await ok(db, 'A subscribes to the Academy', `insert into premium_subscriptions (user_id) values ('${A}')`)
items = await recs(A)
eq('members also get Academy lessons; best quality first, 80 then 75; future lessons never (REC-ACCESS, LEARN-003)', view(items),
  [['R1', 'enter_scores', 'Month 7', 100], ['R3', 'academy_lesson', 'Linear equations lesson', 80], ['R3', 'practice_set', 'Algebra', 75]])
eq('the lesson opens in the Academy', items[1].route, '/academy/lesson/linear-equations')
await ok(db, 'lesson done', `insert into premium_lesson_progress (user_id, lesson_id, completed_at) values ('${A}', '20000000-0000-0000-0000-000000000001', now())`)
eq('completed Academy lessons are skipped', view(await recs(A)).map((r) => r[2]), ['Month 7', 'Algebra', 'Geometry'])

// Months 7 and 8 continue each subject's pattern.
await submit(A, a, 7, { MATH: 5, PHYS: 6, CHEM: 9, BIO: 9.5, LAO: 8, ENG: 6 })
await submit(A, a, 8, { MATH: 4.5, PHYS: 6, CHEM: 9, BIO: 10, LAO: 8, ENG: 7 })
items = await recs(A)
eq('no missing month: the stretch challenge for Chemistry (stronger and improving) comes in', view(items),
  [['R3', 'practice_set', 'Algebra', 80], ['R4', 'practice_set', 'Geometry', 60], ['R7', 'academy_challenge', 'Lab week challenge', 40]])
await ok(db, 'interests', `update academic_student_profiles set interest_subject_codes = array['CHEM'] where user_id = '${A}'`)
eq('+10 for a subject of interest', (await recs(A)).find((i) => i.rule_id === 'R7').priority, 50)

// ─── Content gaps (LEARN-003) ────────────────────────────────────────────────

await ok(db, 'retire the Algebra practice set', `update academic_content_items set status = 'retired' where kind = 'practice_set' and external_id = '${ALG}'`)
items = await recs(A)
eq('nothing to practise Algebra: the gap card instead', [items[0].kind, items[0].title_en, items[0].route, items[0].reason.code], ['gap', 'Algebra', null, 'gap'])
await recs(A)
eq('gaps are logged once a day: Algebra practice (R3), and stretch for Biology (none) and Chemistry (members only, from the free-student days) (R7)',
  (await db.query(`select g.rule_id, s.code, g.topic_id from academic_content_gap_events g join academic_subjects s on s.id = g.subject_id order by g.rule_id, s.code`)).rows.map((r) => [r.rule_id, r.code, r.topic_id]),
  [['R3', 'MATH', ALG], ['R7', 'BIO', null], ['R7', 'CHEM', null]])
eq('gap cards are not impressions', (await one(`select count(*)::int as n from academic_recommendation_impressions where kind = 'gap'`)).n, 0)

// ─── R5 and R2 ───────────────────────────────────────────────────────────────

await ok(db, 'two weeks after the quiz', `update academic_quiz_attempts set completed_at = now() - interval '15 days' where id = '${quiz.attempt_id}'`)
eq('re-test after 14 days while a topic is below Secure (R5)', view(await recs(A)).find((r) => r[0] === 'R5'), ['R5', 'diagnostic', 'Mathematics check', 70])
items = await recs(B)
eq('no quiz taken: diagnose the subject needing attention (R2), after the missing month', view(items), [['R1', 'enter_scores', 'Month 7', 100], ['R2', 'diagnostic', 'Mathematics check', 90]])
eq('R2 says why', [items[1].reason.subject_en, items[1].reason.label, items[1].route], ['Mathematics', 'relatively_lower', '/academy/scores/quiz/40000000-0000-0000-0000-000000000001'])

// ─── Switch, admin, access ───────────────────────────────────────────────────

const gaps = await rpc(ADM, `public.academic_admin_content_gaps()`, STAFF)
eq('content team sees gaps as student counts, most needed first', gaps.map((g) => [g.rule_id, g.subject_code, g.grade_code, g.topic_name, g.students]),
  [['R7', 'BIO', 'G11', null, 2], ['R7', 'CHEM', 'G11', null, 2], ['R3', 'MATH', 'G11', 'Algebra', 1]])
eq('students cannot read gaps', (await rpcError(A, `public.academic_admin_content_gaps()`))?.code, 'FORBIDDEN_ROLE')
await ok(db, 'insights off', `update academic_settings set value = 'false' where key = 'insights_enabled'`)
eq('insights off: no next actions', await recs(A), [])
eq('the logs are hidden from users', (await rpcError(A, `(select count(*) from academic_recommendation_impressions)`))?.status, '42501')

done()
