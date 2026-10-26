// Career guidance (P4-CAR #55, piece 2): questionnaire saved per screen
// (CAREER-001), 3–6 explained options from ≥ 2 clusters (CAREER-002), every
// career open regardless of scores (CAREER-003), fairness (CAREER-004,
// PRD §22.8), what changed (CAREER-007), shortlist (CAREER-010), export.
import { createDb, ok, eq, done, ACADEMIC_MIGRATIONS } from './harness.mjs'
import { CONFIG_SQL, ID, apiFor, json, period } from './fixtures.mjs'

const db = await createDb(ACADEMIC_MIGRATIONS)
const { rpc, rpcError, one } = apiFor(db)
const [A, B] = ['a1', 'b1'].map((s) => `00000000-0000-0000-0000-0000000000${s}`)
await ok(db, 'users', `insert into public.users (id, name, role) values ('${A}', 'Noy', 'CUSTOMER'), ('${B}', 'Bounmy', 'CUSTOMER')`)
await ok(db, 'config', CONFIG_SQL + `update academic_settings set value = '{"read": {"limit": 5000, "seconds": 60}, "write": {"limit": 5000, "seconds": 60}}' where key = 'rate_limits';`)
await db.exec(`create or replace function public.academic_today() returns date language sql stable set search_path = '' as $$ select date '2026-11-18' $$`)
await ok(db, 'subjects', `insert into academic_subjects (id, code, name_lo, name_en, grade_min, grade_max, is_default)
  select gen_random_uuid(), c, c, c, 10, 12, false from unnest(array['ART', 'BIO', 'CHEM', 'CIV', 'ENG', 'GEO', 'HIST', 'ICT']) c`)
// The seeded catalogue (migration 149), as if the reviewers had approved it.
await ok(db, 'publish', `update academic_career_content set status = 'published', published = draft, published_review_by = review_by`)

// Two students identical in everything the ranking may use; they differ in
// name, province and age band, which it must not use (CAREER-004).
const profile = (name, province, age) => ({ display_name: name, age_band: age, province_code: province, grade_id: ID.g11, school_id: ID.school, notice_version: '2026-10-25', subjects: [{ subject_id: ID.math }, { subject_id: ID.phys }] })
const a = await rpc(A, `public.academic_create_profile(${json(profile('Noy', 'vientiane-prefecture', '16_17'))})`)
const b = await rpc(B, `public.academic_create_profile(${json(profile('Bounmy', 'savannakhet', '18_plus'))})`)
let key = 0
for (const [user, p] of [[A, a], [B, b]]) {
  const ids = Object.fromEntries((await db.query(`select s.code, se.id from academic_subject_enrolments se join academic_subjects s on s.id = se.subject_id where se.enrolment_id = '${p.enrolment_id}'`)).rows.map((r) => [r.code, r.id]))
  for (let seq = 1; seq <= 3; seq++) {
    await rpc(user, `public.academic_submit_score_entry('${p.enrolment_id}', '${period(seq)}', ${json([{ subject_enrolment_id: ids.MATH, status: 'scored', value: 9 }, { subject_enrolment_id: ids.PHYS, status: 'scored', value: 4.5 }])}, 'k${++key}')`)
  }
}
const guidance = (user) => rpc(user, `public.academic_get_career_guidance()`)

// ─── Questionnaire (CAREER-001) ──────────────────────────────────────────────

let g = await guidance(A)
eq('24 items, 4 per screen, nothing answered yet', [g.questionnaire.items.length, g.questionnaire.items_per_screen, g.result, g.catalogue_size], [24, 4, null, 19])
eq('finishing before starting is refused', (await rpcError(A, `public.academic_finish_career_questionnaire()`))?.code, 'CAREER_NOT_STARTED')
await rpc(A, `public.academic_start_career_questionnaire()`)
await rpc(A, `public.academic_save_career_answers(${json({ 1: 0, 2: 1, 3: 0, 4: 3 })})`)
eq('progress is saved after each screen', (await guidance(A)).in_progress.answers, { 1: 0, 2: 1, 3: 0, 4: 3 })
eq('answers are 0 to 3 or not sure', (await rpcError(A, `public.academic_save_career_answers(${json({ 5: 4 })})`))?.details?.field, 'answers')
eq('"Not sure" does not count towards finishing', (await rpcError(A, `public.academic_finish_career_questionnaire()`))?.code, 'CAREER_TOO_FEW_ANSWERS')
// Investigating & science and Organising & data high; building and creating low.
const ANSWERS = { 5: 3, 6: 3, 7: 0, 8: 0, 9: null, 10: 1, 11: 1, 12: 1, 13: 1, 14: 1, 15: 1, 16: 3, 17: 3, 18: 2, 19: 3, 20: 0, 21: 1, 22: 1, 23: 1, 24: 3 }
await rpc(A, `public.academic_save_career_answers(${json(ANSWERS)}, ${json({ work_setting: 'office', study_length: '4to5', away_from_home: 'maybe' })})`)
g = await rpc(A, `public.academic_finish_career_questionnaire()`)

// ─── Options (CAREER-002/003) ────────────────────────────────────────────────

const levels = Object.fromEntries(Object.entries(g.area_scores.areas).map(([k, v]) => [k, v.level]))
eq('interests are ranked against the student\'s own other areas', [levels.I, levels.C, levels.R], ['high', 'high', 'low'])
const options = g.result.options
const clusters = options.map((o) => o.cluster)
eq('3 to 6 options from at least 2 clusters, at most 2 per cluster', [options.length >= 3 && options.length <= 6, new Set(clusters).size >= 2, Math.max(...clusters.map((c) => clusters.filter((x) => x === c).length)) <= 2], [true, true, true])
eq('each option says why it appears; no score, rank or percentage is sent', [options.every((o) => o.factors.interest?.length > 0), JSON.stringify(options).match(/"(tier|support|score|rank|percent\w*|stated)"/)], [true, null])
eq('the stronger subject is named as evidence', options.some((o) => (o.factors.subjects ?? []).includes('MATH')), true)
eq('preferences that match are named too', options.some((o) => (o.factors.preferences ?? []).includes('work_setting')), true)
eq('not only grades: a high-interest option without subject support is included', options.some((o) => o.factors.interest && !o.factors.subjects && o.career.primary_area && ['I', 'C'].includes(o.career.primary_area)), true)
eq('options carry the published career, with its preparation', options.every((o) => o.career.title_lo && Array.isArray(o.career.preparation_en)), true)
eq('first result: no "what changed" yet', [g.result.reason, g.result.changes], ['first', null])

// ─── Shortlist and what changed (CAREER-007/010) ─────────────────────────────

const lawyer = options.some((o) => o.slug === 'lawyer')
eq('lawyer is not among the options for these interests', lawyer, false)
eq('saving a career adds it to the shortlist', (await rpc(A, `public.academic_set_career_saved('lawyer', true)`)).shortlist, ['lawyer'])
g = await guidance(A)
eq('a saved career always appears among the options, marked as saved', g.result.options.find((o) => o.slug === 'lawyer')?.factors.saved, true)
eq('"What changed" lists what was added and why', [g.result.changes.added, g.result.reason], [['lawyer'], 'shortlist'])
eq('unknown careers cannot be saved', (await rpcError(A, `public.academic_set_career_saved('astronaut', true)`))?.details?.field, 'slug')
await rpc(A, `public.academic_set_career_saved('lawyer', false)`)
eq('unsaving removes it again', (await guidance(A)).shortlist, [])

// ─── Retake (CAREER-007) ─────────────────────────────────────────────────────

eq('retaking within 90 days is refused…', (await rpcError(A, `public.academic_start_career_questionnaire('retake')`))?.code, 'CAREER_RETAKE_TOO_SOON')
g = await rpc(A, `public.academic_start_career_questionnaire('interests_changed')`)
eq('…unless the student says their interests have changed; preferences are kept', [g.in_progress.reason, g.in_progress.answers, g.in_progress.preferences.work_setting], ['interests_changed', {}, 'office'])
// Now building & fixing and helping & teaching.
const NEW = { 1: 3, 2: 3, 3: 3, 4: 1, 5: 1, 6: 1, 7: 1, 8: 0, 10: 3, 11: 3, 12: 3, 16: 0, 17: 0, 18: 1, 20: 3, 23: 3 }
await rpc(A, `public.academic_save_career_answers(${json(NEW)})`)
g = await rpc(A, `public.academic_finish_career_questionnaire()`)
eq('the new result says interests changed and lists what moved', [g.result.reason, g.result.changes.added.length > 0, g.result.changes.removed.length > 0], ['interests_changed', true, true])

// ─── Fairness (CAREER-004, PRD §22.8) ────────────────────────────────────────

eq('the ranking function takes no gender, ethnicity, province, income or disability input',
  (await one(`select proargnames from pg_proc where proname = 'academic_career_rank'`)).proargnames, ['p_interest', 'p_preferences', 'p_stronger_subjects', 'p_saved'])
// Counterfactual: random answer sets given by both students, who differ only in name, province and age band.
let seed = 7
const random = () => (seed = (seed * 48271) % 2147483647) / 2147483647
let identical = 0
const RUNS = 12
for (let run = 0; run < RUNS; run++) {
  const answers = Object.fromEntries(Array.from({ length: 24 }, (_, i) => [i + 1, random() < 0.1 ? null : Math.floor(random() * 4)]))
  const prefs = { work_setting: ['office', 'outdoors', 'workshop_lab', 'with_people', 'not_sure'][Math.floor(random() * 5)], study_length: ['le3', '4to5', '6plus', 'not_sure'][Math.floor(random() * 4)] }
  const results = []
  for (const user of [A, B]) {
    await rpc(user, `public.academic_start_career_questionnaire('interests_changed')`)
    await rpc(user, `public.academic_save_career_answers(${json(answers)}, ${json(prefs)})`)
    results.push((await rpc(user, `public.academic_finish_career_questionnaire()`)).result.options.map((o) => [o.slug, o.factors]))
  }
  if (JSON.stringify(results[0]) === JSON.stringify(results[1])) identical++
}
eq(`${RUNS} random answer sets: identical options for profiles that differ only in name, province and age band`, identical, RUNS)

// ─── Academy Premium (owner decision, migration 151) ─────────────────────────

await ok(db, 'enforce', `update academic_settings set value = 'true' where key = 'entitlements_enforced'`)
g = await guidance(A)
eq('on Free the options are locked; interests stay', [g.options_locked, g.result, g.area_scores !== null], [true, null, true])
await ok(db, 'premium', `insert into premium_subscriptions (user_id, plan_id, status) select '${A}', id, 'ACTIVE' from premium_plans where price_lak > 0 limit 1`)
g = await guidance(A)
eq('with Premium the options come from the questionnaire already answered', [g.options_locked, g.result.options.length >= 3], [false, true])
await ok(db, 'not enforced', `update academic_settings set value = 'false' where key = 'entitlements_enforced'`)

// ─── Export (PRIV-004) and access ────────────────────────────────────────────

const exported = await rpc(A, `public.academic_export_my_guidance()`)
eq('"Download my data" includes questionnaires, results and the shortlist, and the planner and Coach sections',
  [exported.careers.questionnaires.length >= 3, exported.careers.results.length >= 3, Array.isArray(exported.planner.goals), Array.isArray(exported.coach.conversations)], [true, true, true, true])
eq('the ranking is for the server only', (await rpcError(A, `public.academic_career_rank('{}', '{}', '{}', '{}')`))?.status, '42501')

done()
