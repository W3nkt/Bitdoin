// Golden tests for the Phase 1 analysis engine (BE-004, PRD §20.9 / Appendix C).
// Expected values were recomputed by hand from the raw scores, not copied
// from the PRD table; comparisons are to 2 decimal places.
import { createDb, ok, fails, eq, done, ACADEMIC_MIGRATIONS } from './harness.mjs'
import { CONFIG_SQL, ID, apiFor, json, period } from './fixtures.mjs'

const db = await createDb(ACADEMIC_MIGRATIONS)
const { rpc, rpcError, one } = apiFor(db)

const A = '00000000-0000-0000-0000-0000000000a1'
const B = '00000000-0000-0000-0000-0000000000b1'
const C = '00000000-0000-0000-0000-0000000000c1'
await ok(db, 'users', `insert into public.users (id, name) values ('${A}', 'A'), ('${B}', 'B'), ('${C}', 'C')`)
await ok(db, 'config', CONFIG_SQL + `
  insert into academic_subjects (id, code, name_lo, name_en, grade_min, grade_max) values
    ('10000000-0000-0000-0000-0000000000c1', 'CHEM', 'ເຄມີ', 'Chemistry', 10, 12),
    ('10000000-0000-0000-0000-0000000000c2', 'BIO', 'ຊີວະ', 'Biology', 10, 12),
    ('10000000-0000-0000-0000-0000000000c3', 'ENG', 'ອັງກິດ', 'English', 10, 12);`)
await db.exec(`create or replace function public.academic_today() returns date language sql stable set search_path = '' as $$ select date '2027-03-10' $$`)

const r2 = (v) => (v === null || v === undefined ? null : Math.round(Number(v) * 100) / 100)
const onboard = (user, subjects, extra = {}) => rpc(user, `public.academic_create_profile(${json({
  display_name: 'Noy', age_band: '16_17', province_code: 'vientiane-prefecture', grade_id: ID.g11, school_id: ID.school,
  notice_version: '2026-10-draft', subjects, ...extra,
})})`)
const subjectIds = async (enrolment) => Object.fromEntries((await db.query(`select coalesce(s.code, se.custom_name) as code, se.id
  from academic_subject_enrolments se left join academic_subjects s on s.id = se.subject_id where se.enrolment_id = '${enrolment}'`)).rows.map((r) => [r.code, r.id]))
let key = 0
// rows: { CODE: value | 'missing' | 'not_applicable' | 'exempt' }
const submitMonth = (user, enrolment, seq, ids, rows) => rpc(user, `public.academic_submit_score_entry('${enrolment}', '${period(seq)}', ${json(
  Object.entries(rows).map(([code, v]) => typeof v === 'number'
    ? { subject_enrolment_id: ids[code], status: 'scored', value: v }
    : { subject_enrolment_id: ids[code], status: v }),
)}, 'golden-${++key}')`)
const dashboard = (user, enrolment) => rpc(user, `public.academic_get_dashboard(${enrolment ? `'${enrolment}'` : 'null'})`)

// ─── C1: PRD §20.9 worked example ────────────────────────────────────────────

const codes = ['MATH', 'PHYS', 'CHEM', 'BIO', 'LAO', 'ENG']
const a = await onboard(A, [ID.math, ID.phys, '10000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-0000000000c2', ID.lao, '10000000-0000-0000-0000-0000000000c3'].map((id) => ({ subject_id: id })))
const aIds = await subjectIds(a.enrolment_id)
const table = {
  MATH: [6, 7, 6.5, 5.5, 5, 5.5],
  PHYS: [7, 6, 6.5, 6, 'missing', 6],
  CHEM: [7.5, 8, 8, 8.5, 8, 8.5],
  BIO: [8.5, 9, 8.5, 9, 9, 9.5],
  LAO: [8, 8, 7.5, 8, 8, 8],
  ENG: [6, 7, 5, 8, 6, 7.5],
}
for (let m = 0; m < 6; m++) {
  await submitMonth(A, a.enrolment_id, m + 1, aIds, Object.fromEntries(codes.map((c) => [c, table[c][m]])))
}

let dash = await dashboard(A)
eq('engine and config versions recorded', [dash.engine_version, dash.config_version, dash.numeric], ['f1-f5@1.0.0', 1, true])
eq('F1 period means', dash.periods.map((p) => r2(p.mean)), [7.17, 7.5, 7, 7.5, 7.2, 7.5])
eq('F3 changes vs previous valid period', dash.periods.map((p) => p.change && [r2(p.change.value), p.change.direction, p.change.skipped_periods]),
  [null, [0.33, 'up', 0], [-0.5, 'down', 0], [0.5, 'up', 0], [-0.3, 'down', 0], [0.3, 'up', 0]])
eq('F5 rolling means (3 consecutive valid periods)', dash.periods.map((p) => r2(p.rolling_mean)), [null, null, 7.22, 7.33, 7.23, 7.4])
eq('January coverage 5 of 6, missing kept in denominator', [dash.periods[4].recorded, dash.periods[4].active, dash.periods[4].missing, r2(dash.periods[4].coverage)], [5, 6, 1, 0.83])
const bySubject = Object.fromEntries(dash.subjects.map((s) => [s.code, s]))
eq('F2 subject means over 6 submitted periods', codes.map((c) => r2(bySubject[c].mean)), [5.92, 6.3, 8.08, 8.92, 7.92, 6.58])
eq('F2 window sizes (Physics has 5 values)', codes.map((c) => bySubject[c].window_n), [6, 5, 6, 6, 6, 6])
// Matches Appendix D: Maths +0.5, Physics vs its last value (no January), Chemistry +0.5, Biology +0.5, Lao steady, English +1.5.
eq('F4 latest subject changes', codes.map((c) => bySubject[c].change && [r2(bySubject[c].change.value), bySubject[c].change.direction]),
  [[0.5, 'up'], [0, 'same'], [0.5, 'up'], [0.5, 'up'], [0, 'same'], [1.5, 'up']])
eq('Physics compared with December (last value)', bySubject.PHYS.change.compared_period_id, period(4))
eq('series keeps the gap explicit', bySubject.PHYS.series.map((p) => [p.status, p.value]), [['scored', 7], ['scored', 6], ['scored', 6.5], ['scored', 6], ['missing', null], ['scored', 6]])
eq('summary is the latest period', [dash.summary.latest_period_id, r2(dash.summary.mean), dash.summary.coverage, r2(dash.summary.rolling_mean), dash.summary.change.direction],
  [period(6), 7.5, { recorded: 6, active: 6 }, 7.4, 'up'])
eq('no comparison with others (ANALYSIS-008)', JSON.stringify(dash).match(/percentile|rank|cohort/i), null)
eq('full precision stored', String(dash.periods[0].mean).startsWith('7.1666'), true)

// ─── Snapshots (ANALYSIS-006) ────────────────────────────────────────────────

const snap1 = dash.snapshot_id
eq('unchanged inputs reuse the snapshot', (await dashboard(A)).snapshot_id, snap1)
await rpc(A, `public.academic_save_draft('${a.enrolment_id}', '${period(7)}', ${json([{ subject_enrolment_id: aIds.MATH, status: 'scored', value: 10 }])})`)
eq('drafts never affect analysis', (await dashboard(A)).snapshot_id, snap1)

const febMath = (await one(`select l.id, l.version from academic_score_lines l join academic_score_entries e on e.id = l.score_entry_id
  where e.reporting_period_id = '${period(6)}' and l.subject_enrolment_id = '${aIds.MATH}'`))
await rpc(A, `public.academic_correct_score_line('${febMath.id}', ${febMath.version}, ${json({ status: 'scored', value: 7.5 })}, 'typo')`)
const afterFix = await one(`select id, outputs from academic_analysis_snapshots where enrolment_id = '${a.enrolment_id}' order by created_at desc limit 1`)
eq('correction writes a new snapshot immediately', [afterFix.id !== snap1, r2(afterFix.outputs.periods[5].mean)], [true, 7.83])
// One snapshot per change: six submits and one correction; none replaced.
eq('old snapshots retained', (await one(`select count(*)::int as n from academic_analysis_snapshots where enrolment_id = '${a.enrolment_id}'`)).n, 7)
await fails(db, 'snapshots immutable', `update academic_analysis_snapshots set outputs = '{}'`, 'append-only')
eq('reverting to the same inputs reuses nothing stale', r2((await dashboard(A)).periods[5].mean), 7.83)

// Snapshot rows: owner only.
const asUser = async (user, sql) => (await db.exec(`begin; select set_config('request.jwt.claim.sub', '${user}', true); set local role authenticated; ${sql}; commit;`)).at(-2).rows
await fails(db, 'snapshots are RPC-only (OD-01c)', `select set_config('request.jwt.claim.sub', '${A}', true); set local role authenticated; select * from academic_analysis_snapshots`, 'permission denied')
await ok(db, 'grant for backstop test', `grant select on academic_analysis_snapshots to authenticated`)
eq('RLS backstop: owner reads own snapshots', (await asUser(A, `select count(*)::int as n from academic_analysis_snapshots`))[0].n, 7)
eq('RLS backstop: others read none', (await asUser(B, `select count(*)::int as n from academic_analysis_snapshots`))[0].n, 0)
await ok(db, 'revoke again', `revoke select on academic_analysis_snapshots from authenticated`)
eq('no profile -> 404', (await rpcError(C, `public.academic_get_dashboard()`))?.code, 'PROFILE_REQUIRED')

// ─── C4: only three months ───────────────────────────────────────────────────

const b = await onboard(B, [{ custom_name: 'S1' }, { custom_name: 'S2' }, { custom_name: 'S3' }, { custom_name: 'S4' }, { custom_name: 'S5' }, { custom_name: 'S6' }])
const bIds = await subjectIds(b.enrolment_id)
eq("other student's dashboard -> 404", await dashboard(B, a.enrolment_id), { error: { code: 'NOT_FOUND', status: 404 } })
await submitMonth(B, b.enrolment_id, 1, bIds, { S1: 6, S2: 6, S3: 6, S4: 6, S5: 6, S6: 6 })
dash = await dashboard(B)
eq('one month: mean, no change, no rolling, no subject mean', [r2(dash.summary.mean), dash.summary.change, dash.summary.rolling_mean, dash.subjects[0].mean], [6, null, null, null])
await submitMonth(B, b.enrolment_id, 2, bIds, { S1: 6.5, S2: 6, S3: 6, S4: 6, S5: 6, S6: 6 })
dash = await dashboard(B)
eq('Δ 0.08 is "about the same"; subject mean from 2 values', [r2(dash.summary.change.value), dash.summary.change.direction, r2(dash.subjects.find((s) => s.name_en === 'S1').mean)], [0.08, 'same', 6.25])

// ─── C5: statuses and coverage ───────────────────────────────────────────────

// Nov: 2 scored, 1 missing, 2 N/A, 1 exempt -> active 3, coverage 0.67, mean shown.
await submitMonth(B, b.enrolment_id, 3, bIds, { S1: 8, S2: 7, S3: 'missing', S4: 'not_applicable', S5: 'not_applicable', S6: 'exempt' })
// Dec: 2 scored, 4 missing -> coverage 0.33, mean hidden.
await submitMonth(B, b.enrolment_id, 4, bIds, { S1: 9, S2: 9, S3: 'missing', S4: 'missing', S5: 'missing', S6: 'missing' })
// Jan: full month again.
await submitMonth(B, b.enrolment_id, 5, bIds, { S1: 7, S2: 7, S3: 7, S4: 7, S5: 7, S6: 7 })
dash = await dashboard(B)
const [, , nov, dec, jan] = dash.periods
eq('N/A and exempt leave the denominator', [nov.recorded, nov.active, nov.missing, r2(nov.coverage), r2(nov.mean)], [2, 3, 1, 0.67, 7.5])
eq('coverage below 0.5 hides the mean', [dec.recorded, dec.active, r2(dec.coverage), dec.mean, dec.change, dec.rolling_mean], [2, 6, 0.33, null, null, null])
eq('change skips the invalid month (CALC-3)', [r2(jan.change.value), jan.change.direction, jan.change.compared_period_id, jan.change.skipped_periods], [-0.5, 'down', period(3), 1])
eq('rolling needs 3 consecutive valid months', [r2(nov.rolling_mean), jan.rolling_mean], [6.53, null])
// F2 counts subject values from the low-coverage month too (CALC-2): S1 = 6, 6.5, 8, 9, 7.
eq('F2 includes scores from hidden-mean months', r2(dash.subjects.find((s) => s.name_en === 'S1').mean), 7.3)
eq('statuses never count as 0', r2(dash.subjects.find((s) => s.name_en === 'S6').mean), 6.33)

// ─── C2-like: band scales with the grading scale ─────────────────────────────

const c = await onboard(C, [{ custom_name: 'X' }], { school_id: ID.school50 })
const cIds = await subjectIds(c.enrolment_id)
await submitMonth(C, c.enrolment_id, 1, cIds, { X: 30 })
await submitMonth(C, c.enrolment_id, 2, cIds, { X: 31 })
dash = await dashboard(C)
eq('0–50 scale: band 1.25, +1 is "same"', [r2(dash.about_same_band), dash.summary.change.direction, dash.scale.max], [1.25, 'same', 50])
await submitMonth(C, c.enrolment_id, 3, cIds, { X: 33 })
eq('+2 on 0–50 is "up"', (await dashboard(C)).summary.change.direction, 'up')

// ─── Deleting scores deletes their snapshots (PRIV-005) ──────────────────────

await rpc(C, `public.academic_request_deletion('scores')`)
await ok(db, 'age request', `update academic_student_profiles set deletion_requested_at = now() - interval '15 days' where user_id = '${C}'`)
await ok(db, 'purge', `select public.academic_purge_due_deletions()`)
eq('snapshots with score values removed', (await one(`select count(*)::int as n from academic_analysis_snapshots where enrolment_id = '${c.enrolment_id}'`)).n, 0)
dash = await dashboard(C)
eq('fresh empty dashboard afterwards', [dash.periods.length, dash.summary], [0, null])

done()
