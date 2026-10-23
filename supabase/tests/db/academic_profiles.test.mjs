import { createDb, ok, fails, eq, done, ACADEMIC_MIGRATIONS } from './harness.mjs'
import { CONFIG_SQL, ID, apiFor, json, period } from './fixtures.mjs'

const db = await createDb(ACADEMIC_MIGRATIONS)
const { rpc, rpcError, one } = apiFor(db)

const A = '00000000-0000-0000-0000-0000000000a1'
const B = '00000000-0000-0000-0000-0000000000b1'
await ok(db, 'users', `insert into public.users (id, name) values ('${A}', 'A'), ('${B}', 'B')`)
await ok(db, 'config', CONFIG_SQL)

const valid = {
  display_name: '  Noy  ', age_band: '16_17', province_code: 'vientiane-prefecture', grade_id: ID.g11,
  school_id: ID.school, notice_version: '2026-10-draft',
}
const create = (user, input) => rpc(user, `public.academic_create_profile(${json(input)})`)
const createError = (user, input) => rpcError(user, `public.academic_create_profile(${json(input)})`)

// ─── Validation (PROFILE-001) ────────────────────────────────────────────────

const invalid = async (name, input, field, code = 'VALIDATION_FAILED') => {
  const e = await createError(A, input)
  eq(name, [e?.code, e?.status, e?.details?.field], [code, code === 'VALIDATION_FAILED' ? 'PT400' : e?.status, field])
}
await invalid('no name', { ...valid, display_name: ' ' }, 'display_name')
await invalid('long name', { ...valid, display_name: 'x'.repeat(41) }, 'display_name')
await invalid('age band', { ...valid, age_band: 'u13' }, 'age_band')
await invalid('province', { ...valid, province_code: 'XX' }, 'province_code')
await invalid('bad grade id', { ...valid, grade_id: 'not-a-uuid' }, 'grade_id')
await invalid('no school', { ...valid, school_id: undefined }, 'school_id')
await invalid('both schools', { ...valid, school_free_text: 'Other' }, 'school_id')
await invalid('unknown school', { ...valid, school_id: ID.math }, 'school_id')
await invalid('goals too many chips', { ...valid, goals: { chips: ['a', 'b', 'c', 'd'] } }, 'goals')
await invalid('goal text too long', { ...valid, goals: { text: 'x'.repeat(201) } }, 'goals')
await invalid('unknown interest', { ...valid, interest_subject_codes: ['MATH', 'NOPE'] }, 'interest_subject_codes')
await invalid('lower secondary gated (PROFILE-008)', { ...valid, grade_id: ID.g9 }, 'grade_id', 'GRADE_NOT_SUPPORTED')
eq('no notice -> consent required', (await createError(A, { ...valid, notice_version: undefined }))?.code, 'CONSENT_REQUIRED')
eq('old notice -> outdated', (await createError(A, { ...valid, notice_version: '2025-01' }))?.code, 'NOTICE_OUTDATED')
eq('nothing stored after failures', (await one(`select count(*)::int as n from academic_student_profiles`)).n, 0)

await ok(db, 'module off', `update academic_settings set value = 'false' where key = 'my_scores_enabled'`)
eq('module off -> 403', (await createError(A, valid))?.code, 'MODULE_DISABLED')
await ok(db, 'module on', `update academic_settings set value = 'true' where key = 'my_scores_enabled'`)

// ─── Onboarding creates profile + consent + enrolment + default subjects ────

const created = await create(A, { ...valid, goals: { chips: ['University'], text: '  Pass exams ' }, interest_subject_codes: ['MATH', 'MATH'] })
eq('created', created.created, true)
const profile = await one(`select * from academic_student_profiles where user_id = '${A}'`)
eq('profile fields', [profile.display_name, profile.age_band, profile.consent_state, profile.status, profile.goals, profile.interest_subject_codes],
  ['Noy', '16_17', 'active', 'active', { chips: ['University'], text: 'Pass exams' }, ['MATH']])
const consent = await one(`select purpose, notice_version, grantor_user_id, method from academic_consent_records where student_profile_id = '${profile.id}'`)
eq('consent recorded before data', consent, { purpose: 'module_processing', notice_version: '2026-10-draft', grantor_user_id: A, method: 'in_app_checkbox' })
const enr = await one(`select * from academic_enrolments where id = '${created.enrolment_id}'`)
eq('enrolment', [enr.academic_year_id, enr.grade_id, enr.school_id, enr.grading_scale_version_id, enr.calendar_template_id, enr.state],
  [ID.year, ID.g11, ID.school, ID.scaleV1, ID.calendar, 'active'])
const subjects = async (enrolment) => (await db.query(`select coalesce(s.code, se.custom_name) as name, se.start_period_seq as s, se.end_period_seq as e
  from academic_subject_enrolments se left join academic_subjects s on s.id = se.subject_id where enrolment_id = '${enrolment}' order by se.end_period_seq is not null, se.display_order`)).rows
eq('grade 11 defaults pre-selected (PE not default, PHYS from G11)', (await subjects(created.enrolment_id)).map((r) => r.name), ['LAO', 'MATH', 'PHYS'])
eq('session ready', (await rpc(A, `public.academic_get_session()`)).next_step, 'ready')

const again = await create(A, { ...valid, display_name: 'Changed' })
eq('idempotent per user', [again.created, again.profile_id, again.enrolment_id], [false, profile.id, created.enrolment_id])
eq('still one profile', (await one(`select count(*)::int as n from academic_student_profiles`)).n, 1)

// Unverified school -> review task; school default scale is used.
const b = await create(B, { ...valid, school_id: undefined, school_free_text: ' Ban Nong School ', subjects: [{ subject_id: ID.math }, { custom_name: 'Robotics' }] })
const bEnr = await one(`select school_free_text, school_verification, grading_scale_version_id from academic_enrolments where id = '${b.enrolment_id}'`)
eq('free-text school', bEnr, { school_free_text: 'Ban Nong School', school_verification: 'unverified_school', grading_scale_version_id: ID.scaleV1 })
eq('review task created', await one(`select kind, status, payload from academic_review_tasks where enrolment_id = '${b.enrolment_id}'`),
  { kind: 'unverified_school', status: 'open', payload: { school_free_text: 'Ban Nong School', province_code: 'vientiane-prefecture' } })
eq('custom subjects kept', (await subjects(b.enrolment_id)).map((r) => r.name), ['MATH', 'Robotics'])
eq('students cannot see review tasks', Number(await rpc(B, `(select count(*) from academic_review_tasks)`)), 0)

// ─── Profile edits with If-Match (PROFILE-006/007) ───────────────────────────

const v = profile.version
eq('stale version -> 409', (await rpcError(A, `public.academic_update_profile(${v - 1}, ${json({ display_name: 'Nok' })})`))?.code, 'VERSION_CONFLICT')
eq('unknown field', (await rpcError(A, `public.academic_update_profile(${v}, ${json({ user_id: B })})`))?.code, 'VALIDATION_FAILED')
const upd = await rpc(A, `public.academic_update_profile(${v}, ${json({ display_name: 'Nok', district_code: '1-01', goals: null })})`)
eq('updated + version bumped', upd.version, v + 1)
eq('edit applied', await one(`select display_name, district_code, goals, province_code from academic_student_profiles where id = '${profile.id}'`),
  { display_name: 'Nok', district_code: '1-01', goals: null, province_code: 'vientiane-prefecture' })

// ─── Subjects (PROFILE-003, SCORE-013) ───────────────────────────────────────

const E = created.enrolment_id
// A score for MATH in period 2 (written as the owner, like the score RPC will).
await ok(db, 'math score', `
  insert into academic_score_entries (id, enrolment_id, reporting_period_id) values ('30000000-0000-0000-0000-000000000001', '${E}', '${period(2)}');
  insert into academic_score_lines (score_entry_id, subject_enrolment_id, raw_value, status, grading_scale_version_id)
  select '30000000-0000-0000-0000-000000000001', se.id, 7, 'scored', '${ID.scaleV1}' from academic_subject_enrolments se where se.enrolment_id = '${E}' and se.subject_id = '${ID.math}'`)
const setSubjects = (user, items, seq = 3, enrolment = E) => rpc(user, `public.academic_set_subjects('${enrolment}', ${json(items)}, ${seq})`)
const res = await setSubjects(A, [{ subject_id: ID.lao }, { subject_id: ID.pe }, { custom_name: 'Robotics' }])
eq('drop MATH (has scores) ends it; drop PHYS (no scores) removes it; add PE and custom from period 3',
  await subjects(E), [{ name: 'LAO', s: 1, e: null }, { name: 'PE', s: 3, e: null }, { name: 'Robotics', s: 3, e: null }, { name: 'MATH', s: 1, e: 2 }])
eq('response lists ended last', res.subjects.map((s) => [s.code ?? s.name_en, s.end_period_seq]), [['LAO', null], ['PE', null], ['Robotics', null], ['MATH', 2]])
const robotics = res.subjects.find((s) => s.custom).id
await setSubjects(A, [{ subject_id: ID.lao }, { subject_id: ID.math }, { id: robotics, custom_name: 'Robotics & AI' }])
eq('re-add MATH reactivates the same row; rename custom', (await subjects(E)).map((r) => [r.name, r.e]), [['LAO', null], ['MATH', null], ['Robotics & AI', null]])
eq('listed twice', (await rpcError(A, `public.academic_set_subjects('${E}', ${json([{ subject_id: ID.lao }, { subject_id: ID.lao }])}, 3)`))?.code, 'VALIDATION_FAILED')
const many = Array.from({ length: 26 }, (_, i) => ({ custom_name: `S${i}` }))
eq('max 25 subjects', (await rpcError(A, `public.academic_set_subjects('${E}', ${json(many)}, 3)`))?.code, 'SUBJECT_LIMIT')
eq("another student's enrolment -> 404 envelope", await setSubjects(B, [{ subject_id: ID.math }]), { error: { code: 'NOT_FOUND', status: 404 } })
eq('denial audited', (await one(`select count(*)::int as n from academic_audit_events where action = 'access_denied' and target_id = '${E}' and actor_user_id = '${B}'`)).n, 1)

// ─── Transfers and year rollover (PROFILE-004/005) ───────────────────────────

const transition = (user, input) => rpc(user, `public.academic_transition_enrolment(${json(input)})`)
const transitionError = (user, input) => rpcError(user, `public.academic_transition_enrolment(${json(input)})`)
eq('promotion before rollover refused', (await transitionError(A, { kind: 'promoted' }))?.code, 'YEAR_NOT_ROLLED_OVER')
eq('transfer needs month', (await transitionError(A, { kind: 'transferred', school_id: ID.school50 }))?.code, 'VALIDATION_FAILED')
eq('started with active enrolment refused', (await transitionError(A, { kind: 'started', grade_id: ID.g11, school_id: ID.school }))?.code, 'ENROLMENT_EXISTS')

// Mid-year transfer in January (period 5) to a school with a 0–50 scale.
const tr = await transition(A, { kind: 'transferred', school_id: ID.school50, effective_period_seq: 5 })
const oldE = await one(`select state, closed_reason, end_period_seq from academic_enrolments where id = '${E}'`)
eq('old enrolment closed at prior month', oldE, { state: 'closed', closed_reason: 'transferred', end_period_seq: 4 })
const newE = await one(`select academic_year_id, grade_id, school_id, grading_scale_version_id, start_period_seq, state from academic_enrolments where id = '${tr.enrolment_id}'`)
eq('new enrolment from effective month with its own scale', newE, { academic_year_id: ID.year, grade_id: ID.g11, school_id: ID.school50, grading_scale_version_id: ID.scale50V1, start_period_seq: 5, state: 'active' })
eq('subjects copied from period 5', (await subjects(tr.enrolment_id)).map((r) => [r.name, r.s]), [['LAO', 5], ['MATH', 5], ['Robotics & AI', 5]])
eq('old scores untouched', (await one(`select raw_value from academic_score_lines where score_entry_id = '30000000-0000-0000-0000-000000000001'`)).raw_value, '7.00')

// Closed enrolments are read-only, even for the table owner.
await fails(db, 'closed enrolment cannot change', `update academic_enrolments set is_repeat = true where id = '${E}'`, 'ENROLMENT_CLOSED')
await fails(db, 'closed enrolment: no new subjects', `insert into academic_subject_enrolments (enrolment_id, custom_name) values ('${E}', 'Late')`, 'ENROLMENT_CLOSED')
await fails(db, 'closed enrolment: no new scores', `insert into academic_score_entries (enrolment_id, reporting_period_id) values ('${E}', '${period(3)}')`, 'ENROLMENT_CLOSED')
await fails(db, 'closed enrolment: scores frozen', `update academic_score_lines set raw_value = 8 where score_entry_id = '30000000-0000-0000-0000-000000000001'`, 'ENROLMENT_CLOSED')
eq('set_subjects on closed', (await rpcError(A, `public.academic_set_subjects('${E}', ${json([])}, 3)`))?.code, 'ENROLMENT_CLOSED')

// Year rollover: promoted to G12 with G12 defaults; repeat keeps subjects.
await ok(db, 'rollover', `update academic_years set status = 'closed' where id = '${ID.year}'; update academic_years set status = 'active' where id = '${ID.nextYear}'`)
eq('session asks for new school year', (await rpc(A, `public.academic_get_session()`)).next_step, 'new_school_year')
const promo = await transition(A, { kind: 'promoted' })
eq('previous closed as promoted', (await one(`select closed_reason from academic_enrolments where id = '${tr.enrolment_id}'`)).closed_reason, 'promoted')
eq('new enrolment G12 next year, same school', await one(`select academic_year_id, grade_id, school_id, calendar_template_id, is_repeat from academic_enrolments where id = '${promo.enrolment_id}'`),
  { academic_year_id: ID.nextYear, grade_id: ID.g12, school_id: ID.school50, calendar_template_id: ID.nextCalendar, is_repeat: false })
eq('G12 default subjects', (await subjects(promo.enrolment_id)).map((r) => r.name), ['LAO', 'MATH', 'PHYS'])
eq('session ready again', (await rpc(A, `public.academic_get_session()`)).next_step, 'ready')

const bRepeat = await transition(B, { kind: 'repeated' })
eq('repeat: same grade, flagged, subjects copied', [
  (await one(`select grade_id, is_repeat, school_free_text from academic_enrolments where id = '${bRepeat.enrolment_id}'`)),
  (await subjects(bRepeat.enrolment_id)).map((r) => r.name),
], [{ grade_id: ID.g11, is_repeat: true, school_free_text: 'Ban Nong School' }, ['MATH', 'Robotics']])
eq('repeat with free-text school opens another review task', (await one(`select count(*)::int as n from academic_review_tasks where student_profile_id = (select id from academic_student_profiles where user_id = '${B}')`)).n, 2)

// G12 cannot be promoted further; leaving closes without a new enrolment.
await ok(db, 'next rollover', `insert into academic_years (id, code, start_date, end_date, status) values ('10000000-0000-0000-0000-000000000023', '2028-2029', '2028-09-01', '2029-05-31', 'upcoming');
  insert into academic_calendar_templates (name, academic_year_id, scope) values ('National 2028-29', '10000000-0000-0000-0000-000000000023', 'national');
  update academic_years set status = 'closed' where id = '${ID.nextYear}'; update academic_years set status = 'active' where code = '2028-2029'`)
eq('no grade after G12', (await transitionError(A, { kind: 'promoted' }))?.code, 'GRADE_NOT_AVAILABLE')
const left = await transition(A, { kind: 'left' })
eq('left school', [left.enrolment_id, (await one(`select closed_reason from academic_enrolments where id = '${promo.enrolment_id}'`)).closed_reason], [null, 'left'])
eq('no current enrolment', (await transitionError(A, { kind: 'left' }))?.code, 'NO_ACTIVE_ENROLMENT')
eq('history preserved', (await one(`select count(*)::int as n from academic_enrolments where student_profile_id = '${profile.id}'`)).n, 3)

// ─── School search (PROFILE-002) ─────────────────────────────────────────────

const search = async (q, province = null) => (await db.exec(`begin; select set_config('request.jwt.claim.sub', '${A}', true); set local role authenticated;
  select id from public.academic_search_schools('${q}', ${province ? `'${province}'` : 'null'}); commit;`)).at(-2).rows.map((r) => r.id)
eq('Lao search', await search('ທົດລອງ'), [ID.school])
eq('romanised search, typo tolerant', await search('matayom thotlong'), [ID.school])
eq('province filter', await search('sakon', 'vientiane-prefecture'), [])
eq('short query returns nothing', await search('m'), [])
await fails(db, 'anon cannot search', `set local role anon; select * from public.academic_search_schools('school')`, 'permission denied')

// ─── My data (PROFILE-007) ───────────────────────────────────────────────────

const summary = await rpc(A, `public.academic_get_my_data_summary()`)
eq('my data counts', summary.counts, { enrolments: 3, score_entries_submitted: 0, score_entries_draft: 1, scores: 1, corrections: 0, uploads: 0, guardian_links: 0 })
eq('my data consents', summary.consents.map((c) => c.purpose), ['module_processing'])

done()
