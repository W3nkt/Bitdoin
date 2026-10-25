// Feedback on next actions and repetition control (P2-REC #50: LEARN-005):
// not now 14 days, not helpful 180 days, done 30 days, at most 3 days of
// showing in any 30 (R1 exempt), hidden actions make room for the next ones,
// keys from the student's own impressions only, export.
import { createDb, ok, eq, done, ACADEMIC_MIGRATIONS } from './harness.mjs'
import { CONFIG_SQL, ID, apiFor, json, period } from './fixtures.mjs'

const db = await createDb(ACADEMIC_MIGRATIONS)
const { rpc, rpcError, one } = apiFor(db)
const [A, B] = ['a1', 'b1'].map((s) => `00000000-0000-0000-0000-0000000000${s}`)
await ok(db, 'users', `insert into public.users (id, name) values ('${A}', 'A'), ('${B}', 'B')`)
await ok(db, 'config', CONFIG_SQL + `update academic_settings set value = '{"read": {"limit": 1000, "seconds": 60}, "write": {"limit": 1000, "seconds": 60}}' where key = 'rate_limits';`)
await db.exec(`create or replace function public.academic_today() returns date language sql stable set search_path = '' as $$ select date '2027-05-20' $$`)

// The PRD §20.9 Mathematics row with Physics and Lao, six months entered (March and April missing).
const onboard = (user) => rpc(user, `public.academic_create_profile(${json({ display_name: 'S', age_band: '16_17', province_code: 'vientiane-prefecture', grade_id: ID.g11, school_id: ID.school, notice_version: '2026-10-25', subjects: [{ subject_id: ID.math }, { subject_id: ID.phys }, { subject_id: ID.lao }] })})`)
const a = await onboard(A)
await onboard(B)
const ids = Object.fromEntries((await db.query(`select s.code, se.id from academic_subject_enrolments se join academic_subjects s on s.id = se.subject_id where se.enrolment_id = '${a.enrolment_id}'`)).rows.map((r) => [r.code, r.id]))
const rows = { MATH: [6, 7, 6.5, 5.5, 5, 5.5], PHYS: [7, 6, 6.5, 6, 7, 6], LAO: [8, 8, 7.5, 8, 8, 8] }
for (let m = 0; m < 6; m++) {
  await rpc(A, `public.academic_submit_score_entry('${a.enrolment_id}', '${period(m + 1)}', ${json(Object.keys(rows).map((c) => ({ subject_enrolment_id: ids[c], status: 'scored', value: rows[c][m] })))}, 'a-${m}')`)
}
const ALG = '30000000-0000-0000-0000-000000000001'
const GEO = '30000000-0000-0000-0000-000000000002'
const LESSON = '20000000-0000-0000-0000-000000000001'
await ok(db, 'quiz and catalogue', `
  insert into academic_quiz_topics (id, subject_id, grade_id, code, name_lo, name_en, display_order) values
    ('${ALG}', '${ID.math}', '${ID.g11}', 'algebra', 'ພຶດຊະຄະນິດ', 'Algebra', 1), ('${GEO}', '${ID.math}', '${ID.g11}', 'geometry', 'ເລຂາຄະນິດ', 'Geometry', 2);
  insert into academic_quiz_items (topic_id, stem_lo, options, correct_key, explanation_lo, status)
  select t, 'Q' || n, '[{"key":"A","text_lo":"1"},{"key":"B","text_lo":"2"}]', 'B', 'x', 'approved' from unnest(array['${ALG}', '${GEO}']::uuid[]) t, generate_series(1, 5) n;
  insert into academic_diagnostics (id, subject_id, grade_id, title_lo, title_en, status) values ('40000000-0000-0000-0000-000000000001', '${ID.math}', '${ID.g11}', 'ກວດ', 'Mathematics check', 'published');
  insert into academic_diagnostic_items (diagnostic_id, item_id, position) select '40000000-0000-0000-0000-000000000001', id, row_number() over (order by topic_id, stem_lo) from academic_quiz_items;
  insert into academic_quiz_attempts (diagnostic_id, student_profile_id, item_ids, status, expires_at, completed_at, results)
  values ('40000000-0000-0000-0000-000000000001', '${a.profile_id}', (select array_agg(id) from academic_quiz_items), 'completed', now(), now() - interval '2 days',
    '[{"topic_id": "${ALG}", "name_lo": "ພຶດຊະຄະນິດ", "name_en": "Algebra", "correct": 1, "total": 5, "band": "needs_practice"},
      {"topic_id": "${GEO}", "name_lo": "ເລຂາຄະນິດ", "name_en": "Geometry", "correct": 3, "total": 5, "band": "developing"}]');
  insert into premium_subscriptions (user_id) values ('${A}');
  insert into premium_lessons (id, slug, title_en, title_lo, status, published_at) values ('${LESSON}', 'linear', 'Linear equations lesson', 'ບົດສົມຜົນ', 'PUBLISHED', now() - interval '1 day');
  insert into academic_content_items (kind, external_id, subject_ids, grade_min, grade_max, topic_ids, difficulty, language, est_minutes, quality_score, status, published_at) values
    ('practice_set', '${ALG}', array['${ID.math}']::uuid[], 10, 12, array['${ALG}']::uuid[], 1, 'lo', 8, null, 'published', now()),
    ('academy_lesson', '${LESSON}', array['${ID.math}']::uuid[], 10, 12, array['${ALG}']::uuid[], 1, 'en', 15, 5, 'published', now()),
    ('practice_set', '${GEO}', array['${ID.math}']::uuid[], 10, 12, array['${GEO}']::uuid[], 2, 'lo', 8, 3, 'published', now());`)

const recs = async () => (await rpc(A, `public.academic_get_recommendations()`)).items
const kinds = async () => (await recs()).map((i) => `${i.rule_id}:${i.kind}`)
const feedback = (key, response, user = A) => rpc(user, `public.academic_recommendation_feedback('${key}', '${response}')`)
const age = (key, days) => ok(db, `age ${key}`, `update academic_recommendation_feedback set created_at = now() - interval '${days} days' where item_key = '${key}'`)

let items = await recs()
eq('start: missing month, the lesson, the practice set', items.map((i) => `${i.rule_id}:${i.kind}`), ['R1:enter_scores', 'R3:academy_lesson', 'R3:practice_set'])
const lessonKey = items[1].key
const practiceKey = items[2].key

// ─── Responses ───────────────────────────────────────────────────────────────

eq('only done, not now or not helpful', (await rpcError(A, `public.academic_recommendation_feedback('${lessonKey}', 'meh')`))?.details?.field, 'response')
eq('only actions the student was shown', (await rpcError(A, `public.academic_recommendation_feedback('practice_set:00000000-0000-0000-0000-000000000000', 'done')`))?.code, 'NOT_FOUND')
eq("another student cannot use A's keys", (await rpcError(B, `public.academic_recommendation_feedback('${lessonKey}', 'not_now')`))?.code, 'NOT_FOUND')

eq('feedback recorded', await feedback(lessonKey, 'not_now'), { item_key: lessonKey, response: 'not_now' })
eq('not now: hidden, and the next action fills the space', await kinds(), ['R1:enter_scores', 'R3:practice_set', 'R4:practice_set'])
await age(lessonKey, 15)
eq('back after 14 days', await kinds(), ['R1:enter_scores', 'R3:academy_lesson', 'R3:practice_set'])

await feedback(lessonKey, 'not_helpful')
eq('not helpful: hidden', (await kinds()).includes('R3:academy_lesson'), false)
await age(lessonKey, 100)
eq('still hidden after 100 days', (await kinds()).includes('R3:academy_lesson'), false)
await age(lessonKey, 181)
eq('back after 180 days', (await kinds()).includes('R3:academy_lesson'), true)

await feedback(practiceKey, 'done')
eq('done: hidden for 30 days', (await kinds()).filter((k) => k === 'R3:practice_set').length, 0)
await age(practiceKey, 31)
eq('back after 30 days', (await kinds()).includes('R3:practice_set'), true)

// ─── Repetition (at most 3 days in 30; R1 exempt) ────────────────────────────

const pastDays = (key) => ok(db, `three past days for ${key}`, `delete from academic_recommendation_impressions where item_key = '${key}';
  insert into academic_recommendation_impressions (student_profile_id, item_key, rule_id, kind, shown_on)
  select '${a.profile_id}', '${key}', 'R3', 'academy_lesson', date '2027-05-20' - d from generate_series(1, 3) d`)
await pastDays(lessonKey)
eq('shown on 3 of the last 30 days: hidden today', (await kinds()).includes('R3:academy_lesson'), false)
const r1Key = (await recs())[0].key
await ok(db, 'R1 shown on 3 past days', `delete from academic_recommendation_impressions where item_key = '${r1Key}';
  insert into academic_recommendation_impressions (student_profile_id, item_key, rule_id, kind, shown_on)
  select '${a.profile_id}', '${r1Key}', 'R1', 'enter_scores', date '2027-05-20' - d from generate_series(1, 3) d`)
eq('"Enter scores" is never hidden by repetition', (await kinds())[0], 'R1:enter_scores')
await ok(db, 'an older showing', `update academic_recommendation_impressions set shown_on = date '2027-05-20' - 40 where item_key = '${lessonKey}' and shown_on = date '2027-05-19'`)
eq('outside the 30 days it counts no more', (await kinds()).includes('R3:academy_lesson'), true)
eq('shown today stays for the day', (await kinds()).includes('R3:academy_lesson'), true)

// ─── Export ──────────────────────────────────────────────────────────────────

const exported = await rpc(A, `public.academic_export_my_recommendations()`)
eq('export: what was shown and every response', [exported.shown.length > 0, exported.feedback.map((f) => f.response)], [true, ['not_now', 'not_helpful', 'done']])
eq('feedback is hidden from users', (await rpcError(A, `(select count(*) from academic_recommendation_feedback)`))?.status, '42501')

done()
