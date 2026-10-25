// Golden fixtures for F1–F5 (QA-001, #37): every case in
// supabase/tests/golden/f1-f5.v1.json is entered through the student RPCs
// and the engine's dashboard must match the frozen expected values to 1e-9.
// The fixture itself is checked against the independent reference, and G01
// against the figures published in PRD §20.9.
import { readFileSync } from 'node:fs'
import { createDb, ok, eq, done, ACADEMIC_MIGRATIONS } from './harness.mjs'
import { CONFIG_SQL, ID, apiFor, json, period } from './fixtures.mjs'
import { analyse, toNumber } from '../golden/reference.mjs'

const fixture = JSON.parse(readFileSync(new URL('../golden/f1-f5.v1.json', import.meta.url), 'utf8'))
const db = await createDb(ACADEMIC_MIGRATIONS)
const { rpc } = apiFor(db)
await ok(db, 'config', CONFIG_SQL)
// Every month of 2026-27 is open for entry.
await db.exec(`create or replace function public.academic_today() returns date language sql stable set search_path = '' as $$ select date '2027-05-20' $$`)

// Engine v2 (f1-f10@2.0.0) adds labels and trends and leaves F1–F5 unchanged.
eq('fixture version matches the engine', fixture.engine, 'f1-f5@1.0.0')
const close = (a, b) => (a === null || b === null ? a === b : Math.abs(a - b) < 1e-9)
const seqOf = (periodId) => (periodId ? Number(periodId.slice(-4)) : null)
const r2 = (v) => (v === null ? null : Math.round(v * 100) / 100)

// Engine dashboard -> the reference's shape, numbers instead of fractions.
function fromEngine(dash) {
  return {
    periods: dash.periods.map((p) => ({
      seq: p.sequence, recorded: p.recorded, active: p.active, missing: p.missing,
      coverage: p.coverage === null ? null : Number(p.coverage), mean: p.mean === null ? null : Number(p.mean),
      change: p.change && { value: Number(p.change.value), direction: p.change.direction, compared_seq: seqOf(p.change.compared_period_id), skipped: p.change.skipped_periods },
      rolling: p.rolling_mean === null ? null : Number(p.rolling_mean),
    })),
    subjects: Object.fromEntries(dash.subjects.map((s) => [s.name_en, {
      n: s.window_n, mean: s.mean === null ? null : Number(s.mean),
      change: s.change && { value: Number(s.change.value), direction: s.change.direction, compared_seq: seqOf(s.change.compared_period_id) },
    }])),
  }
}

/** Differences between engine output and an expected analysis, as readable strings. */
function compare(actual, expected) {
  const diffs = []
  const num = (path, a, e) => { if (!close(a, toNumber(e))) diffs.push(`${path}: ${a} ≠ ${e}`) }
  const same = (path, a, e) => { if (a !== e) diffs.push(`${path}: ${a} ≠ ${e}`) }
  same('periods', actual.periods.map((p) => p.seq).join(','), expected.periods.map((p) => p.seq).join(','))
  expected.periods.forEach((e, i) => {
    const a = actual.periods[i]
    if (!a) return
    const at = `month ${e.seq}`
    for (const key of ['recorded', 'active', 'missing']) same(`${at} ${key}`, a[key], e[key])
    for (const key of ['coverage', 'mean', 'rolling']) num(`${at} ${key}`, a[key], e[key])
    same(`${at} change`, !!a.change, !!e.change)
    if (a.change && e.change) {
      num(`${at} change`, a.change.value, e.change.value)
      for (const key of ['direction', 'compared_seq', 'skipped']) same(`${at} change ${key}`, a.change[key], e.change[key])
    }
  })
  same('subjects', Object.keys(actual.subjects).sort().join(','), Object.keys(expected.subjects).sort().join(','))
  for (const [name, e] of Object.entries(expected.subjects)) {
    const a = actual.subjects[name]
    if (!a) continue
    same(`${name} n`, a.n, e.n)
    num(`${name} mean`, a.mean, e.mean)
    same(`${name} change`, !!a.change, !!e.change)
    if (a.change && e.change) {
      num(`${name} change`, a.change.value, e.change.value)
      for (const key of ['direction', 'compared_seq']) same(`${name} change ${key}`, a.change[key], e.change[key])
    }
  }
  return diffs
}

let user = 0
const newStudent = async (c) => {
  const id = `00000000-0000-0000-0000-${String(++user).padStart(12, '0')}`
  await ok(db, `student ${c.id}`, `insert into public.users (id, name) values ('${id}', '${c.id}')`)
  const names = Object.keys(c.months[0].lines)
  const profile = await rpc(id, `public.academic_create_profile(${json({
    display_name: c.id, age_band: '16_17', province_code: 'vientiane-prefecture', grade_id: ID.g11,
    school_id: c.scale.school === 'school50' ? ID.school50 : ID.school, notice_version: '2026-10-25',
    subjects: names.map((name) => ({ custom_name: name })),
  })})`)
  return { id, enrolment: profile.enrolment_id }
}
const subjectIds = async (enrolment) => Object.fromEntries((await db.query(`select custom_name, id from academic_subject_enrolments where enrolment_id = '${enrolment}'`)).rows.map((r) => [r.custom_name, r.id]))
const wire = (ids, lines) => Object.entries(lines).map(([name, v]) => (typeof v === 'number'
  ? { subject_enrolment_id: ids[name], status: 'scored', value: v }
  : { subject_enrolment_id: ids[name], status: v }))
const submit = (student, enrolment, ids, month, key = `${enrolment}-${month.seq}`) =>
  rpc(student, `public.academic_submit_score_entry('${enrolment}', '${period(month.seq)}', ${json(wire(ids, month.lines))}, '${key}')`)
const dashboard = async (student, enrolment) => fromEngine(await rpc(student, `public.academic_get_dashboard('${enrolment}')`))

for (const c of fixture.cases) {
  // The frozen expectation still equals the reference's answer for the inputs.
  const inputs = c.correction
    ? c.months.map((m) => (m.seq === c.correction.seq ? { ...m, lines: { ...m.lines, [c.correction.subject]: c.correction.value } } : m))
    : c.months
  const recomputed = c.transfer ? { before: analyse(c.months, c.scale), after: analyse(c.transfer.months, c.transfer.scale) } : analyse(inputs, c.scale)
  eq(`${c.id} fixture matches the reference`, JSON.stringify(recomputed), JSON.stringify(c.expected))

  const student = await newStudent(c)
  const ids = await subjectIds(student.enrolment)
  for (const month of c.months) await submit(student.id, student.enrolment, ids, month)

  if (c.retry_seq) {
    const month = c.months.find((m) => m.seq === c.retry_seq)
    const replay = await submit(student.id, student.enrolment, ids, month)
    eq(`${c.id} retry with the same key is replayed`, replay.replayed, true)
  }
  if (c.correction) {
    const line = await (await db.query(`select l.id, l.version from academic_score_lines l join academic_score_entries e on e.id = l.score_entry_id
      where e.reporting_period_id = '${period(c.correction.seq)}' and l.subject_enrolment_id = '${ids[c.correction.subject]}'`)).rows[0]
    await rpc(student.id, `public.academic_correct_score_line('${line.id}', ${line.version}, ${json({ status: 'scored', value: c.correction.value })}, 'golden')`)
  }

  if (c.transfer) {
    const moved = await rpc(student.id, `public.academic_transition_enrolment(${json({ kind: 'transferred', school_id: ID.school50, effective_period_seq: c.transfer.effective_seq })})`)
    const newIds = await subjectIds(moved.enrolment_id)
    for (const month of c.transfer.months) await submit(student.id, moved.enrolment_id, newIds, month)
    eq(`${c.id} ${c.title} — before the transfer`, compare(await dashboard(student.id, student.enrolment), c.expected.before), [])
    eq(`${c.id} after the transfer`, compare(await dashboard(student.id, moved.enrolment_id), c.expected.after), [])
  } else {
    eq(`${c.id} ${c.title}`, compare(await dashboard(student.id, student.enrolment), c.expected), [])
  }

  if (c.prd) {
    const dash = await dashboard(student.id, student.enrolment)
    eq('G01 matches the figures published in PRD §20.9 (2 dp)', {
      period_means: dash.periods.map((p) => r2(p.mean)),
      period_changes: dash.periods.map((p) => p.change && r2(p.change.value)),
      rolling: dash.periods.map((p) => r2(p.rolling)),
      subject_means: Object.fromEntries(Object.entries(dash.subjects).map(([name, s]) => [name, r2(s.mean)])),
    }, c.prd)
  }
}

done()
