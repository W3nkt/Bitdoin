// Closed pilot and ratings (REL-001, #46): invite codes gate set-up only in
// pilot mode, capacity and inactive cohorts, admin-only management with an
// audit trail, rating events, per-cohort metrics and the go/no-go block.
import { createDb, ok, eq, done, ACADEMIC_MIGRATIONS } from './harness.mjs'
import { CONFIG_SQL, ID, apiFor, json } from './fixtures.mjs'

const db = await createDb(ACADEMIC_MIGRATIONS)
const { rpc, rpcError, one } = apiFor(db)
const ADM = '00000000-0000-0000-0000-0000000000d1'
const STAFF = { aal: 'aal2' }
const students = Array.from({ length: 6 }, (_, i) => `00000000-0000-0000-0000-0000000000${(0xa1 + i).toString(16)}`)
await ok(db, 'users', `insert into public.users (id, name, role) values ('${ADM}', 'Admin', 'ADMIN'), ${students.map((s, i) => `('${s}', 'S${i}', 'CUSTOMER')`).join(', ')}`)
await ok(db, 'config', CONFIG_SQL)

const profile = (code) => json({ display_name: 'S', age_band: '16_17', province_code: 'vientiane-prefecture', grade_id: ID.g11, school_id: ID.school, notice_version: '2026-10-25', ...(code === undefined ? {} : { pilot_code: code }) })
const create = (user, code) => rpc(user, `public.academic_create_profile(${profile(code)})`)
const createError = async (user, code) => (await rpcError(user, `public.academic_create_profile(${profile(code)})`))?.code
const admin = (call) => rpc(ADM, call, STAFF)
const adminError = async (call, user = ADM, opts = STAFF) => (await rpcError(user, call, opts))?.code

// ─── Admin manages cohorts ───────────────────────────────────────────────────

eq('pilot mode starts off', (await admin(`public.academic_admin_list_pilot()`)).pilot_mode, false)
eq('students cannot manage cohorts', await adminError(`public.academic_admin_list_pilot()`, students[5]), 'FORBIDDEN_ROLE')
eq('admins need MFA', await adminError(`public.academic_admin_list_pilot()`, ADM, {}), 'MFA_REQUIRED')
eq('gate cannot open without a cohort', await adminError(`public.academic_admin_set_pilot_mode(true, 'pilot day')`), 'PILOT_NO_COHORTS')

let list = await admin(`public.academic_admin_save_pilot_cohort(${json({ name: 'Matthayom Thotlong', school_id: ID.school, max_students: 2 })})`)
const school = list.cohorts[0]
eq('cohort created with a readable 6-character code', [/^[A-HJ-NP-Z2-9]{6}$/.test(school.code), school.name, school.school_id, school.max_students, school.students, school.active], [true, 'Matthayom Thotlong', ID.school, 2, 0, true])
list = await admin(`public.academic_admin_save_pilot_cohort(${json({ name: 'Youth club', max_students: null })})`)
const club = list.cohorts[1]
eq('codes are unique', school.code !== club.code, true)
eq('names are required', await adminError(`public.academic_admin_save_pilot_cohort(${json({ name: '  ' })})`), 'VALIDATION_FAILED')
eq('caps are bounded', await adminError(`public.academic_admin_save_pilot_cohort(${json({ name: 'x', max_students: 0 })})`), 'VALIDATION_FAILED')
eq('switching needs a reason', await adminError(`public.academic_admin_set_pilot_mode(true, 'ok')`), 'VALIDATION_FAILED')
eq('pilot gate on', (await admin(`public.academic_admin_set_pilot_mode(true, 'Pilot starts with two schools')`)).pilot_mode, true)
eq('audited with the reason', (await db.query(`select action, reason from academic_audit_events where action like 'pilot.%' order by occurred_at`)).rows.map((r) => [r.action, r.reason]),
  [['pilot.cohort_create', null], ['pilot.cohort_create', null], ['pilot.mode', 'on: Pilot starts with two schools']])
eq('cohort table hidden from students', (await rpcError(students[5], `(select count(*) from academic_pilot_cohorts)`))?.status, '42501')

// ─── Students and the gate ───────────────────────────────────────────────────

eq('pilot mode: a code is required', await createError(students[0]), 'PILOT_CODE_REQUIRED')
eq('unknown code refused', await createError(students[0], 'ZZZZZZ'), 'PILOT_CODE_INVALID')
eq('check shows the cohort name for a valid code', await rpc(students[0], `public.academic_check_pilot_code('${school.code.toLowerCase().slice(0, 3)}-${school.code.toLowerCase().slice(3)} ')`), { code: school.code, name: 'Matthayom Thotlong' })
eq('check refuses a bad code', (await rpcError(students[0], `public.academic_check_pilot_code('ABC')`))?.code, 'PILOT_CODE_INVALID')
await create(students[0], school.code.toLowerCase())
await create(students[1], ` ${school.code} `)
eq('codes are case- and space-insensitive; profiles record the cohort', (await one(`select count(*)::int as n from academic_student_profiles where pilot_cohort_id = '${school.id}'`)).n, 2)
eq('a full cohort refuses more students', await createError(students[2], school.code), 'PILOT_FULL')
await admin(`public.academic_admin_save_pilot_cohort(${json({ id: club.id, name: 'Youth club', active: false })})`)
eq('an inactive cohort refuses new students', await createError(students[2], club.code), 'PILOT_CODE_INVALID')
eq('existing students keep access', (await rpc(students[0], `public.academic_get_session()`)).next_step, 'ready')
eq('admin list counts students per cohort', (await admin(`public.academic_admin_list_pilot()`)).cohorts.map((c) => [c.name, c.students, c.active]), [['Matthayom Thotlong', 2, true], ['Youth club', 0, false]])

await admin(`public.academic_admin_set_pilot_mode(false, 'Open to everyone')`)
eq('gate off: no code needed', (await create(students[2])).created, true)
await admin(`public.academic_admin_save_pilot_cohort(${json({ id: club.id, name: 'Youth club', active: true })})`)
await create(students[3], club.code)
eq('gate off: a code still tags the cohort', (await one(`select pilot_cohort_id from academic_student_profiles where user_id = '${students[3]}'`)).pilot_cohort_id, club.id)

// ─── Ratings ─────────────────────────────────────────────────────────────────

let n = 0
const event = (name, props) => ({ event_id: `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`, name, occurred_at: new Date().toISOString(), locale: 'lo', platform: 'android', app_version: 't', props })
eq('ratings accepted as usage events', (await rpc(students[0], `public.academic_track_events(${json([event('feedback_submitted', { question: 'usefulness', rating: '5' }), event('feedback_submitted', { question: 'entry_ease', rating: '4' })])})`)).accepted, 2)
eq('ratings outside 1-5 refused', (await rpcError(students[0], `public.academic_track_events(${json([event('feedback_submitted', { question: 'usefulness', rating: '9' })])})`))?.code, 'VALIDATION_FAILED')
eq('ratings carry no text', (await rpcError(students[0], `public.academic_track_events(${json([event('feedback_submitted', { question: 'usefulness', rating: '4', comment: 'great' })])})`))?.code, 'VALIDATION_FAILED')

// ─── Metrics per cohort ──────────────────────────────────────────────────────

const pseud = (i) => `c${String(i).padStart(31, '0')}`
await ok(db, 'pilot events', `insert into academic_usage_events (id, name, occurred_at, pseudonym, role, locale, platform, app_version, props)
  select gen_random_uuid(), 'feedback_submitted', now() - interval '1 day', 'p' || lpad(i::text, 31, '0'), 'student', 'lo', 'android', 't',
         jsonb_build_object('question', 'usefulness', 'rating', case when i <= 15 then '5' else '2' end)
  from generate_series(1, 25) i`)
await ok(db, 'returning entries', `insert into academic_usage_events (id, name, occurred_at, pseudonym, role, locale, platform, app_version, props)
  select gen_random_uuid(), 'score_entry_submitted', now() - interval '2 days', '${pseud(0)}', 'student', 'lo', 'android', 't',
         jsonb_build_object('first', i = 1, 'duration_ms', 60000 + i * 1000, 'period', '2026-2027:monthly:2', 'method', 'manual')
  from generate_series(1, 22) i`)
const all = await admin(`public.academic_admin_usage_metrics()`)
eq('ratings: latest answer per student, share of 4-5', [all.ratings.usefulness.respondents, all.ratings.usefulness.share_4_or_5], [26, 0.6154])
eq('pilot block: usefulness and returning entry time (first entries left out)', [all.pilot.usefulness_rate, all.pilot.usefulness_respondents, all.pilot.returning_entry_p50_ms, all.pilot.returning_entries],
  [0.6154, 26, 72000, 21])
const one_cohort = await admin(`public.academic_admin_usage_metrics('${school.id}')`)
eq('cohort view counts only that cohort; set-up starts are not attributable', [one_cohort.cohort_id, one_cohort.ratings.usefulness.respondents, one_cohort.weeks[11].onboarding_started, one_cohort.statistics.on],
  [school.id, null, null, null])
eq('unknown cohort refused', await adminError(`public.academic_admin_usage_metrics('${students[0]}')`), 'NOT_FOUND')

done()
