// Golden fixtures for labels and trends, F6–F10 (P2-ANL, #49): every case in
// supabase/tests/golden/f6-f10.v1.json is entered through the student RPCs
// and the engine's dashboard must match the frozen expected values to 1e-9.
// The fixture itself is checked against the independent reference, and L01
// against the table published in PRD §20.9.
import { readFileSync } from 'node:fs'
import { createDb, ok, eq, done, ACADEMIC_MIGRATIONS } from './harness.mjs'
import { CONFIG_SQL, ID, apiFor, json, period } from './fixtures.mjs'
import { analyseSubjects, toNumber, erfc } from '../golden/reference.mjs'

const fixture = JSON.parse(readFileSync(new URL('../golden/f6-f10.v1.json', import.meta.url), 'utf8'))
const db = await createDb(ACADEMIC_MIGRATIONS)
const { rpc, one } = apiFor(db)
eq('insights are on after all migrations (134)', (await one(`select value from academic_settings where key = 'insights_enabled'`)).value, true)
await ok(db, 'config', CONFIG_SQL + `update academic_settings set value = 'true' where key = 'insights_enabled';`)
await db.exec(`create or replace function public.academic_today() returns date language sql stable set search_path = '' as $$ select date '2027-05-20' $$`)

const close = (a, b) => (a === null || b === null ? a === b : Math.abs(a - b) < 1e-9)
const r2 = (v) => (v === null ? null : Math.round(v * 100) / 100)
const num = (v) => (v === null || v === undefined ? null : Number(v))

eq('fixture version matches the engine', fixture.engine, (await one(`select public.academic_engine_version() as v`)).v)
const config = (await one(`select version, thresholds from academic_analysis_configs order by version desc limit 1`))
eq('config v2 carries the fixture thresholds', [config.version, config.thresholds.deviation_threshold, config.thresholds.consistency_threshold,
  config.thresholds.slope_threshold, config.thresholds.volatility_sd, config.thresholds.significance, config.thresholds.trend_window],
[2, Number(fixture.config.deviation), Number(fixture.config.consistency), Number(fixture.config.slope), Number(fixture.config.volatility_sd), fixture.config.significance, 'enrolment'])

// The normal tail matches the reference's independent erfc across the range p is read in.
const tails = (await db.query(`select z, public.academic_normal_tail(z) as p from unnest(array[0, 0.5, 1.2816, 1.6449, 1.96, 2.9, 3.1, 4.5, 8]::float8[]) as z`)).rows
eq('normal tail agrees with erfc to 1e-12', tails.filter((row) => Math.abs(row.p - erfc(row.z / Math.SQRT2) / 2) > 1e-12).map((row) => row.z), [])

/** Differences between engine subjects and expected labels/trends, as readable strings. */
function compare(subjects, expected) {
  const diffs = []
  const same = (path, a, e) => { if (a !== e) diffs.push(`${path}: ${a} ≠ ${e}`) }
  const near = (path, a, e) => { if (!close(a, e)) diffs.push(`${path}: ${a} ≠ ${e}`) }
  const byName = Object.fromEntries(subjects.map((s) => [s.name_en, s]))
  same('subjects', Object.keys(byName).sort().join(','), Object.keys(expected).sort().join(','))
  for (const [name, e] of Object.entries(expected)) {
    const s = byName[name]
    if (!s) continue
    for (const key of ['value', 'confidence', 'n']) same(`${name} label ${key}`, s.label[key], e.label[key])
    same(`${name} label above`, s.label.periods_above, e.label.above)
    same(`${name} label below`, s.label.periods_below, e.label.below)
    near(`${name} label D`, num(s.label.mean_deviation), toNumber(e.label.mean_deviation))
    same(`${name} label rule`, s.label.rule, `ANALYSIS-002.${e.label.value}`)
    for (const key of ['value', 'confidence', 'n', 'direction']) same(`${name} trend ${key}`, s.trend[key], e.trend[key])
    near(`${name} trend slope`, num(s.trend.slope), toNumber(e.trend.slope))
    near(`${name} trend p`, num(s.trend.p), e.trend.p)
    near(`${name} trend sd`, num(s.trend.sd), e.trend.variance === null ? null : Math.sqrt(toNumber(e.trend.variance)))
    same(`${name} trend rule`, s.trend.rule, `ANALYSIS-003.${e.trend.value}`)
  }
  return diffs
}

let user = 0
const newStudent = async (c) => {
  const id = `00000000-0000-0000-0000-${String(++user).padStart(12, '0')}`
  await ok(db, `student ${c.id}`, `insert into public.users (id, name) values ('${id}', '${c.id}')`)
  const profile = await rpc(id, `public.academic_create_profile(${json({
    display_name: c.id, age_band: '16_17', province_code: 'vientiane-prefecture', grade_id: ID.g11,
    school_id: c.scale.school === 'school50' ? ID.school50 : ID.school, notice_version: '2026-10-25',
    subjects: Object.keys(c.months[0].lines).map((name) => ({ custom_name: name })),
  })})`)
  return { id, enrolment: profile.enrolment_id }
}
const subjectIds = async (enrolment) => Object.fromEntries((await db.query(`select custom_name, id from academic_subject_enrolments where enrolment_id = '${enrolment}'`)).rows.map((r) => [r.custom_name, r.id]))
const wire = (ids, lines) => Object.entries(lines).map(([name, v]) => (typeof v === 'number'
  ? { subject_enrolment_id: ids[name], status: 'scored', value: v }
  : { subject_enrolment_id: ids[name], status: v }))

for (const c of fixture.cases) {
  eq(`${c.id} fixture matches the reference`, JSON.stringify(analyseSubjects(c.months, c.scale)), JSON.stringify(c.expected))

  const student = await newStudent(c)
  const ids = await subjectIds(student.enrolment)
  for (const month of c.months) {
    await rpc(student.id, `public.academic_submit_score_entry('${student.enrolment}', '${period(month.seq)}', ${json(wire(ids, month.lines))}, '${student.enrolment}-${month.seq}')`)
  }
  const dash = await rpc(student.id, `public.academic_get_dashboard('${student.enrolment}')`)
  eq(`${c.id} ${c.title}`, compare(dash.subjects, c.expected), [])

  if (c.prd) {
    const published = Object.fromEntries(dash.subjects.map((s) => [s.name_en, {
      D: r2(num(s.label.mean_deviation)), above: s.label.periods_above, sd: r2(num(s.trend.sd)), slope: r2(num(s.trend.slope)), p: r2(num(s.trend.p)),
      label: s.label.value, label_confidence: s.label.confidence, trend: s.trend.value, trend_confidence: s.trend.confidence,
    }]))
    eq('L01 matches the table published in PRD §20.9 (2 dp)', published, c.prd)
  }
}

// ─── Snapshots and the F1–F5 part ────────────────────────────────────────────

const last = fixture.cases.at(-1)
const owner = `00000000-0000-0000-0000-${String(user).padStart(12, '0')}`
const snapshot = await one(`select s.engine_version, s.config_version, s.outputs from academic_analysis_snapshots s
  join academic_enrolments e on e.id = s.enrolment_id join academic_student_profiles p on p.id = e.student_profile_id
  where p.user_id = '${owner}' order by s.created_at desc limit 1`)
eq(`${last.id} snapshot records engine v2 and config v2`, [snapshot.engine_version, snapshot.config_version], ['f1-f10@2.0.0', 2])
eq('labels and trends are stored in the immutable snapshot (ANALYSIS-006)', snapshot.outputs.subjects.every((s) => s.label && s.trend), true)
eq('no comparison with other students (ANALYSIS-008)', JSON.stringify(snapshot.outputs).match(/percentile|rank|cohort/i), null)

// ─── insights_enabled switch (migration 130) ─────────────────────────────────

const ownEnrolment = (await one(`select e.id from academic_enrolments e join academic_student_profiles p on p.id = e.student_profile_id where p.user_id = '${owner}'`)).id
await ok(db, 'switch off', `update academic_settings set value = 'false' where key = 'insights_enabled'`)
let off = await rpc(owner, `public.academic_get_dashboard('${ownEnrolment}')`)
eq('switched off: students get no labels or trends', off.subjects.some((s) => 'label' in s || 'trend' in s), false)
eq('switched off: F1–F5 are unchanged', [off.subjects.length, off.summary !== null, off.subjects.every((s) => 'mean' in s && 'series' in s)], [snapshot.outputs.subjects.length, true, true])
eq('switched off: the snapshot still holds them', (await one(`select outputs from academic_analysis_snapshots where id = '${off.snapshot_id}'`)).outputs.subjects.every((s) => s.label && s.trend), true)
await ok(db, 'setting removed', `delete from academic_settings where key = 'insights_enabled'`)
off = await rpc(owner, `public.academic_get_dashboard('${ownEnrolment}')`)
eq('missing setting counts as off', off.subjects.some((s) => 'label' in s), false)

const internals = ['academic_normal_tail(double precision)', 'academic_mann_kendall_p(numeric[])', 'academic_theil_sen(integer[],numeric[])',
  'academic_subject_label(jsonb,jsonb,integer[],jsonb,numeric)', 'academic_subject_trend(jsonb,jsonb,numeric)',
  'academic_analyse_subjects(jsonb,jsonb,integer[],jsonb,numeric,boolean)']
eq('statistics helpers are not callable by users', (await db.query(`select f from unnest(array[${internals.map((f) => `'public.${f}'`).join(',')}]) as f
  where has_function_privilege('authenticated', f::regprocedure, 'execute') or has_function_privilege('anon', f::regprocedure, 'execute')`)).rows, [])

done()
