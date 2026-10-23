import { createDb, ok, fails, eq, done, ACADEMIC_MIGRATIONS } from './harness.mjs'
import { CONFIG_SQL, ID, apiFor, json, period } from './fixtures.mjs'

const db = await createDb(ACADEMIC_MIGRATIONS)
const { rpc, rpcError, one } = apiFor(db)

const A = '00000000-0000-0000-0000-0000000000a1'
const B = '00000000-0000-0000-0000-0000000000b1'
await ok(db, 'users', `insert into public.users (id, name) values ('${A}', 'A'), ('${B}', 'B')`)
await ok(db, 'config', CONFIG_SQL)
// Official first-term result period (Sep–Jan), separate from monthly ones (SCORE-011).
const TERM1 = '10000000-0000-0000-0000-0000000f0001'
await ok(db, 'term period', `insert into academic_reporting_periods (id, calendar_template_id, period_type, term_no, sequence, label_lo, label_en, start_date, end_date)
  values ('${TERM1}', '${ID.calendar}', 'term_official', 1, 1, 'ພາກຮຽນ 1', 'Term 1 (official)', '2026-09-01', '2027-01-31')`)
const setToday = (d) => db.exec(`create or replace function public.academic_today() returns date language sql stable set search_path = '' as $$ select date '${d}' $$`)
await setToday('2026-10-23')

const onboard = (user) => rpc(user, `public.academic_create_profile(${json({
  display_name: 'S', age_band: '16_17', province_code: 'vientiane-prefecture', grade_id: ID.g11, school_id: ID.school, notice_version: '2026-10-draft',
})})`)
const a = await onboard(A)
const b = await onboard(B)
const E = a.enrolment_id
const se = Object.fromEntries((await db.query(`select s.code, se.id from academic_subject_enrolments se join academic_subjects s on s.id = se.subject_id where se.enrolment_id = '${E}'`)).rows.map((r) => [r.code, r.id]))

// ─── Periods (SCORE-002) ─────────────────────────────────────────────────────

const periods = await rpc(A, `public.academic_list_periods('${E}')`)
eq('only this calendar: 9 months + term result', periods.periods.length, 10)
eq('future months disabled', periods.periods.filter((p) => p.period_type === 'monthly').map((p) => p.disabled), [false, false, true, true, true, true, true, true, true])
eq('first unsubmitted month suggested', periods.suggested_period_id, period(1))
eq('period key', periods.periods[0].key, '2026-09')
eq("other student's enrolment -> 404", await rpc(B, `public.academic_list_periods('${E}')`), { error: { code: 'NOT_FOUND', status: 404 } })

// ─── Form, drafts and validation (SCORE-001/003/004/005) ─────────────────────

const form = await rpc(A, `public.academic_get_score_entry('${E}', '${period(2)}')`)
eq('empty form lists the subjects', [form.entry, form.subjects.map((s) => s.code), form.scale.max, form.scale.step], [null, ['LAO', 'MATH', 'PHYS'], 10, 0.5])
eq('period from another calendar -> 404', await rpc(A, `public.academic_get_score_entry('${E}', '${period(2, true)}')`), { error: { code: 'NOT_FOUND', status: 404 } })

const draft = (lines, version = 'null', p = period(2), user = A, enrolment = E) => rpc(user, `public.academic_save_draft('${enrolment}', '${p}', ${json(lines)}, ${version})`)
const draftError = (lines, p = period(2)) => rpcError(A, `public.academic_save_draft('${E}', '${p}', ${json(lines)})`)

const e11 = await draftError([{ subject_enrolment_id: se.MATH, status: 'scored', value: 11 }])
eq('11 rejected with details', [e11.code, e11.status, e11.details], ['SCORE_OUT_OF_RANGE', 'PT400', { field: 'lines[0].value', min: 0, max: 10, step: 0.5, received: 11 }])
eq('message says the rule', (await db.query(`select 1`)) && (await draftError([{ subject_enrolment_id: se.MATH, status: 'scored', value: '7.3' }])).code, 'SCORE_OUT_OF_RANGE')
eq("'abc' rejected", (await draftError([{ subject_enrolment_id: se.MATH, status: 'scored', value: 'abc' }])).code, 'VALIDATION_FAILED')
eq('unknown status', (await draftError([{ subject_enrolment_id: se.MATH, status: 'zero' }])).code, 'VALIDATION_FAILED')
eq('subject not on form', (await draftError([{ subject_enrolment_id: ID.math, status: 'missing' }])).details.field, 'lines[0].subject_enrolment_id')
eq('future period refused', (await draftError([{ subject_enrolment_id: se.MATH, status: 'missing' }], period(3))).code, 'PERIOD_IN_FUTURE')

let d = await draft([{ subject_enrolment_id: se.MATH, status: 'scored', value: ' ໗.໕ ' }])
const mathLine = () => d.subjects.find((s) => s.code === 'MATH').line
eq('Lao digits and spaces accepted', [d.entry.state, mathLine().value, mathLine().status, mathLine().source, mathLine().verification], ['draft', 7.5, 'scored', 'manual', 'self_reported'])
d = await draft([{ subject_enrolment_id: se.LAO, status: 'scored', value: '10' }], d.entry.version)
eq('partial drafts accumulate', d.subjects.map((s) => s.line?.value ?? null), [10, 7.5, null])
eq('stale draft version -> 409', (await rpcError(A, `public.academic_save_draft('${E}', '${period(2)}', ${json([])}, 1)`)).code, 'VERSION_CONFLICT')
d = await draft([{ subject_enrolment_id: se.LAO, clear: true }])
eq('cleared line removed', d.subjects.map((s) => s.line?.value ?? null), [null, 7.5, null])
eq('reopening restores draft', (await rpc(A, `public.academic_get_score_entry('${E}', '${period(2)}')`)).subjects.map((s) => s.line?.value ?? null), [null, 7.5, null])
eq('no revisions for draft edits', (await one(`select count(*)::int as n from academic_score_revisions`)).n, 0)

// ─── Submit (SCORE-006/009) ──────────────────────────────────────────────────

const submit = (lines, key, p = period(2), user = A, enrolment = E) => rpc(user, `public.academic_submit_score_entry('${enrolment}', '${p}', ${json(lines)}, '${key}')`)
const submitError = (lines, key, p = period(2)) => rpcError(A, `public.academic_submit_score_entry('${E}', '${p}', ${json(lines)}, '${key}')`)
const full = [
  { subject_enrolment_id: se.LAO, status: 'scored', value: 6 },
  { subject_enrolment_id: se.MATH, status: 'scored', value: '7.5' },
  { subject_enrolment_id: se.PHYS, status: 'exempt' },
]
const incomplete = await submitError(full.slice(0, 2), 'k-1')
eq('every subject needs a score or status', [incomplete.code, incomplete.details.missing_subject_enrolment_ids], ['VALIDATION_FAILED', [se.PHYS]])
eq('idempotency key required', (await submitError(full, ' ')).code, 'VALIDATION_FAILED')

const s1 = await submit(full, 'k-1')
eq('submitted', [s1.entry.state, s1.entry.source, s1.replayed, s1.subjects.map((s) => [s.line.status, s.line.value])],
  ['submitted', 'manual', false, [['scored', 6], ['scored', 7.5], ['exempt', null]]])
eq('exempt stores no value', (await one(`select raw_value, status from academic_score_lines where subject_enrolment_id = '${se.PHYS}'`)), { raw_value: null, status: 'exempt' })

const retry = await submit(full, 'k-1')
eq('retry with same key replays, no duplicate', [retry.replayed, retry.entry.id, retry.entry.version], [true, s1.entry.id, s1.entry.version])
eq('one entry, three lines', await one(`select (select count(*)::int from academic_score_entries where enrolment_id = '${E}') as entries, (select count(*)::int from academic_score_lines) as lines`), { entries: 1, lines: 3 })
const dup = await submitError(full, 'k-2')
eq('new submit for same period -> 409 SCORE_DUPLICATE', [dup.code, dup.status, dup.details.score_entry_id], ['SCORE_DUPLICATE', 'PT409', s1.entry.id])
eq('draft over submitted refused', (await draftError([{ subject_enrolment_id: se.MATH, status: 'missing' }])).code, 'ENTRY_SUBMITTED')
eq('suggestion moves to the next empty month', (await rpc(A, `public.academic_list_periods('${E}')`)).suggested_period_id, period(1))
eq('submit audited', (await one(`select count(*)::int as n from academic_audit_events where action = 'score_entry.submit' and target_id = '${s1.entry.id}'`)).n, 1)

// ─── Corrections (SCORE-007) ─────────────────────────────────────────────────

const math = s1.subjects.find((s) => s.code === 'MATH').line
const correct = (line, version, value, reason, user = A) => rpc(user, `public.academic_correct_score_line('${line}', ${version}, ${json(value)}, ${reason === undefined ? 'null' : `'${reason}'`})`)
eq('stale version', (await rpcError(A, `public.academic_correct_score_line('${math.id}', ${math.version - 1}, ${json({ status: 'scored', value: 8 })})`)).code, 'VERSION_CONFLICT')
eq('long reason', (await rpcError(A, `public.academic_correct_score_line('${math.id}', ${math.version}, ${json({ status: 'scored', value: 8 })}, '${'x'.repeat(121)}')`)).code, 'VALIDATION_FAILED')
eq('correction validated', (await rpcError(A, `public.academic_correct_score_line('${math.id}', ${math.version}, ${json({ status: 'scored', value: 10.5 })})`)).code, 'SCORE_OUT_OF_RANGE')
const fixed = await correct(math.id, math.version, { status: 'scored', value: 8 }, 'Teacher re-marked')
eq('corrected and marked edited', [fixed.value, fixed.edited, fixed.version], [8, true, math.version + 1])
const same = await correct(math.id, fixed.version, { status: 'scored', value: '8.0' })
eq('same value records nothing', same.version, fixed.version)
const revs = await rpc(A, `public.academic_get_line_revisions('${math.id}')`)
eq('revision history', revs.revisions.map((r) => [r.old_value, r.new_value, r.changed_by, r.reason]), [[7.5, 8, 'student', 'Teacher re-marked']])
eq("other student's line -> 404", await correct(math.id, fixed.version, { status: 'scored', value: 1 }, undefined, B), { error: { code: 'NOT_FOUND', status: 404 } })
eq("other student's revisions -> 404", await rpc(B, `public.academic_get_line_revisions('${math.id}')`), { error: { code: 'NOT_FOUND', status: 404 } })
eq('IDOR attempts audited', (await one(`select count(*)::int as n from academic_audit_events where action = 'access_denied' and actor_user_id = '${B}' and target_id = '${math.id}'`)).n, 2)
eq('value unchanged by IDOR', (await one(`select raw_value from academic_score_lines where id = '${math.id}'`)).raw_value, '8.00')

// Drafts cannot be "corrected"; they are just edited.
await setToday('2026-11-05')
const nov = await draft([{ subject_enrolment_id: se.MATH, status: 'scored', value: 9 }], 'null', period(3))
eq('correction of a draft line refused', (await rpcError(A, `public.academic_correct_score_line('${nov.subjects.find((s) => s.code === 'MATH').line.id}', 1, ${json({ status: 'scored', value: 8 })})`)).code, 'ENTRY_NOT_SUBMITTED')

// ─── Subject changes mid-year (SCORE-013) ────────────────────────────────────

await rpc(A, `public.academic_set_subjects('${E}', ${json([{ subject_id: ID.math }, { subject_id: ID.phys }])}, 3)`)
eq('dropped subject leaves new periods', (await rpc(A, `public.academic_get_score_entry('${E}', '${period(3)}')`)).subjects.map((s) => s.code), ['MATH', 'PHYS'])
eq('earlier period keeps its score', (await rpc(A, `public.academic_get_score_entry('${E}', '${period(2)}')`)).subjects.map((s) => [s.code, s.line?.value ?? null]), [['MATH', 8], ['PHYS', null], ['LAO', 6]])
const novDone = await submit([{ subject_enrolment_id: se.MATH, status: 'scored', value: 9 }, { subject_enrolment_id: se.PHYS, status: 'not_applicable' }], 'k-nov', period(3))
eq('submit after drop needs only current subjects', novDone.entry.state, 'submitted')

// ─── Official term results (SCORE-011) ───────────────────────────────────────

const term = await submit([{ subject_enrolment_id: se.MATH, status: 'scored', value: 8.5 }, { subject_enrolment_id: se.PHYS, status: 'scored', value: 7 }], 'k-term', TERM1)
eq('official term result stored separately', [term.period.period_type, term.subjects.map((s) => s.line.value)], ['term_official', [8.5, 7]])
eq('monthly October untouched', (await one(`select count(*)::int as n from academic_score_entries where enrolment_id = '${E}' and state = 'submitted'`)).n, 3)

// ─── Transfers: closed enrolment read-only, new range enforced ───────────────

await setToday('2027-02-10')
const tr = await rpc(A, `public.academic_transition_enrolment(${json({ kind: 'transferred', school_id: ID.school50, effective_period_seq: 6 })})`)
eq('old enrolment read-only', (await rpcError(A, `public.academic_save_draft('${E}', '${period(4)}', ${json([])})`)).code, 'ENROLMENT_CLOSED')
eq('old correction refused', (await rpcError(A, `public.academic_correct_score_line('${math.id}', ${fixed.version}, ${json({ status: 'scored', value: 9 })})`)).code, 'ENROLMENT_CLOSED')
eq('before transfer month refused on new enrolment', (await rpcError(A, `public.academic_save_draft('${tr.enrolment_id}', '${period(5)}', ${json([])})`)).code, 'PERIOD_NOT_IN_ENROLMENT')
const newSe = (await db.query(`select se.id from academic_subject_enrolments se where se.enrolment_id = '${tr.enrolment_id}' and se.subject_id = '${ID.math}'`)).rows[0].id
const feb = await submit([{ subject_enrolment_id: newSe, status: 'scored', value: 38 }, ...(await db.query(`select id from academic_subject_enrolments where enrolment_id = '${tr.enrolment_id}' and subject_id <> '${ID.math}'`)).rows.map((r) => ({ subject_enrolment_id: r.id, status: 'missing' }))], 'k-feb', period(6), A, tr.enrolment_id)
eq('new school scale (0–50) applies after transfer', [feb.scale.max, feb.subjects.find((s) => s.code === 'MATH').line.value, feb.subjects.find((s) => s.code === 'MATH').line.normalised_value], [50, 38, 0.76])
eq('new enrolment periods start at transfer', (await rpc(A, `public.academic_list_periods('${tr.enrolment_id}')`)).periods.filter((p) => p.period_type === 'monthly').map((p) => p.sequence), [6, 7, 8, 9])

// ─── History (SCORE-010/012) ─────────────────────────────────────────────────

const hist = await rpc(A, `public.academic_get_history()`)
eq('two enrolments, newest first', hist.enrolments.map((e) => [e.state, e.read_only, e.scale.max]), [['active', false, 50], ['closed', true, 10]])
const oldTerms = hist.enrolments[1].terms
eq('grouped by term, periods in date order', oldTerms.map((t) => [t.term_no, t.periods.map((p) => `${p.period_type}:${p.key}:${p.entry.state}`)]),
  [[1, ['monthly:2026-10:submitted', 'monthly:2026-11:submitted', 'term_official:2026-09:submitted']]])
const octMath = oldTerms[0].periods[0].lines.find((l) => l.code === 'MATH').line
eq('history shows source, verification, edited', [octMath.value, octMath.source, octMath.verification, octMath.edited], [8, 'manual', 'self_reported', true])
eq('B sees only own history', (await rpc(B, `public.academic_get_history()`)).enrolments.map((e) => e.enrolment_id), [b.enrolment_id])

// Direct writes remain impossible for students.
await fails(db, 'no direct score writes', `select set_config('request.jwt.claim.sub', '${A}', true); set local role authenticated; update academic_score_lines set raw_value = 1`, 'permission denied')

done()
