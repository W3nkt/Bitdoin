// Study planner (P3-PLAN #54): goals with feasibility (PLAN-001), commitment
// (PLAN-002), weekly tasks (PLAN-003), missed tasks (PLAN-004), pause and
// edit (PLAN-006), the Free limit, and other students' goals and tasks.
import { createDb, ok, eq, done, ACADEMIC_MIGRATIONS } from './harness.mjs'
import { CONFIG_SQL, ID, apiFor, json, period } from './fixtures.mjs'

const db = await createDb(ACADEMIC_MIGRATIONS)
const { rpc, rpcError, one } = apiFor(db)
const [A, B] = ['a1', 'b1'].map((s) => `00000000-0000-0000-0000-0000000000${s}`)
await ok(db, 'users', `insert into public.users (id, name) values ('${A}', 'A'), ('${B}', 'B')`)
await ok(db, 'config', CONFIG_SQL + `update academic_settings set value = '{"read": {"limit": 1000, "seconds": 60}, "write": {"limit": 1000, "seconds": 60}}' where key = 'rate_limits';`)
const today = (d) => db.exec(`create or replace function public.academic_today() returns date language sql stable set search_path = '' as $$ select date '${d}' $$`)
await today('2026-11-18') // a Wednesday in November (month 3)
const profile = { display_name: 'S', age_band: '16_17', province_code: 'vientiane-prefecture', grade_id: ID.g11, school_id: ID.school, notice_version: '2026-10-25', subjects: [{ subject_id: ID.math }, { subject_id: ID.phys }, { custom_name: 'Robotics' }] }
const a = await rpc(A, `public.academic_create_profile(${json(profile)})`)
const b = await rpc(B, `public.academic_create_profile(${json(profile)})`)
const subjects = async (enrolment) => Object.fromEntries((await db.query(`select coalesce(s.code, se.custom_name) as code, se.id from academic_subject_enrolments se left join academic_subjects s on s.id = se.subject_id where se.enrolment_id = '${enrolment}'`)).rows.map((r) => [r.code, r.id]))
const ids = await subjects(a.enrolment_id)
let key = 0
const submit = (user, enrolment, seq, rows) => rpc(user, `public.academic_submit_score_entry('${enrolment}', '${period(seq)}', ${json(Object.entries(rows).map(([se, v]) => (typeof v === 'number' ? { subject_enrolment_id: se, status: 'scored', value: v } : { subject_enrolment_id: se, status: v })))}, 'k${++key}')`)
await submit(A, a.enrolment_id, 1, { [ids.MATH]: 5, [ids.PHYS]: 6, [ids.Robotics]: 'missing' })
await submit(A, a.enrolment_id, 2, { [ids.MATH]: 6, [ids.PHYS]: 6, [ids.Robotics]: 'missing' })
const planner = (user = A) => rpc(user, `public.academic_get_planner()`)
const errorOf = (user, call) => rpcError(user, call)

// ─── Goals and feasibility (PLAN-001, PRD §19.7) ─────────────────────────────

let view = await planner()
eq('months to choose start after this one; November -> March is 4 months', [view.periods[0].label_en, view.periods.find((p) => p.id === period(7)).months], [view.periods[0].label_en, 4])
eq('subjects carry their baseline (mean of the last 3 scores)', view.subjects.filter((s) => s.baseline !== null).map((s) => [s.name_en, Number(s.baseline)]).sort(), [['Mathematics', 5.5], ['Physics', 6]])
const preview = (se, target, p = period(7)) => rpc(A, `public.academic_preview_goal('${se}', ${target}, '${p}')`)
eq('PRD example: 6.0 -> 8.0 by March from November = 0.5 a month, Stretch', [(await preview(ids.PHYS, 8)).feasibility, Number((await preview(ids.PHYS, 8)).required_gain)], ['stretch', 0.5])
eq('≤ 0.25 a month is Steady; target at or below baseline is Maintain', [(await preview(ids.PHYS, 7)).feasibility, (await preview(ids.PHYS, 6)).feasibility], ['steady', 'maintain'])
const ambitious = await preview(ids.MATH, 8)
eq('> 0.5 a month is Ambitious, with a halfway milestone (never blocked)', [ambitious.feasibility, Number(ambitious.milestone_value), ambitious.milestone_period_id], ['ambitious', 6.5, period(5)])
eq('the target must be on the scale', (await errorOf(A, `public.academic_preview_goal('${ids.MATH}', 7.3, '${period(7)}')`))?.details?.field, 'target')
eq('the month must be after this one', (await errorOf(A, `public.academic_preview_goal('${ids.MATH}', 8, '${period(3)}')`))?.details?.field, 'target_period_id')
eq('a subject without scores has no baseline yet', (await errorOf(A, `public.academic_preview_goal('${ids.Robotics}', 8, '${period(7)}')`))?.details?.field, 'subject_enrolment_id')
eq("another student's subject -> 404", await rpc(B, `public.academic_preview_goal('${ids.MATH}', 8, '${period(7)}')`), { error: { code: 'NOT_FOUND', status: 404 } })
eq('no goal yet: a suggested goal from the subject needing attention, or none', view.suggestion === null || typeof view.suggestion.subject_enrolment_id === 'string', true)

const math = await rpc(A, `public.academic_save_goal(${json({ subject_enrolment_id: ids.MATH, target: 8, target_period_id: period(7) })})`)
eq('saved with baseline, target, end month and label', [Number(math.baseline), Number(math.target), math.target_period.label_en, math.feasibility, Number(math.milestone.value)], [5.5, 8, view.periods.find((p) => p.id === period(7)).label_en, 'ambitious', 6.5])
eq('one goal per subject', (await errorOf(A, `public.academic_save_goal(${json({ subject_enrolment_id: ids.MATH, target: 7, target_period_id: period(7) })})`))?.details?.field, 'subject_enrolment_id')
const edited = await rpc(A, `public.academic_save_goal(${json({ id: math.id, target: 7, target_period_id: period(9) })})`)
eq('editing keeps the baseline and relabels: 5.5 -> 7 over 6 months is Steady', [Number(edited.baseline), edited.feasibility, edited.milestone, edited.version], [5.5, 'steady', null, 2])
eq("another student cannot edit or archive A's goal", [await rpc(B, `public.academic_save_goal(${json({ id: math.id, target: 9, target_period_id: period(9) })})`), await rpc(B, `public.academic_archive_goal('${math.id}')`)],
  [{ error: { code: 'NOT_FOUND', status: 404 } }, { error: { code: 'NOT_FOUND', status: 404 } }])

// Free: one goal (PRD §30.3); weekly plans need planner_full.
await ok(db, 'enforce', `update academic_settings set value = 'true' where key = 'entitlements_enforced'`)
eq('Free: a second goal needs Premium', (await errorOf(A, `public.academic_save_goal(${json({ subject_enrolment_id: ids.PHYS, target: 8, target_period_id: period(7) })})`))?.code, 'ENTITLEMENT_REQUIRED')
eq('Free: weekly plans need Premium', (await errorOf(A, `public.academic_save_plan(${json({ days: [1, 3, 6], minutes_per_day: 20 })})`))?.code, 'ENTITLEMENT_REQUIRED')
eq('Free: the planner says so, goals still shown', [(await planner()).entitled, (await planner()).goals.length, (await planner()).week], [false, 1, null])
await ok(db, 'not enforced', `update academic_settings set value = 'false' where key = 'entitlements_enforced'`)
const phys = await rpc(A, `public.academic_save_goal(${json({ subject_enrolment_id: ids.PHYS, target: 8, target_period_id: period(7) })})`)
eq('with planner_full: more goals', phys.feasibility, 'stretch')

// ─── Commitment and weekly tasks (PLAN-002/003) ──────────────────────────────

eq('at least one rest day', (await errorOf(A, `public.academic_save_plan(${json({ days: [1, 2, 3, 4, 5, 6, 7], minutes_per_day: 20 })})`))?.details?.field, 'days')
eq('minutes from the options only', (await errorOf(A, `public.academic_save_plan(${json({ days: [1, 3, 6], minutes_per_day: 25 })})`))?.details?.field, 'minutes_per_day')
view = await rpc(A, `public.academic_save_plan(${json({ days: [6, 1, 3, 3], minutes_per_day: 20 })})`)
eq('saved: Mon, Wed, Sat, 20 minutes', [view.plan.days, view.plan.minutes_per_day], [[1, 3, 6], 20])
let tasks = view.week.tasks
eq('this week from today: Wednesday and Saturday', tasks.map((t) => t.date), ['2026-11-18', '2026-11-21'])
eq('self-study for goal subjects, alternating, each within the commitment', tasks.map((t) => [t.kind, t.subject_en, t.est_minutes]), [['self_study', 'Mathematics', 20], ['self_study', 'Physics', 20]])
eq('opening again does not plan twice', (await planner()).week.tasks.length, 2)
eq("another student cannot touch A's task", await rpc(B, `public.academic_update_task('${tasks[0].id}', 'done')`), { error: { code: 'NOT_FOUND', status: 404 } })
eq('done by the student', (await rpc(A, `public.academic_update_task('${tasks[0].id}', 'done')`)).state, 'done')

// ─── Missed tasks (PLAN-004) and the weekly review ───────────────────────────

await today('2026-11-23') // next Monday
view = await planner()
const moved = view.week.tasks.find((t) => t.first_date === '2026-11-21')
eq('a missed task moves to the next study day once, quietly', [moved.date, moved.moved, moved.needs_decision], ['2026-11-23', true, false])
eq('the new week is planned: Mon, Wed, Sat within 5 tasks', view.week.tasks.filter((t) => !t.moved).map((t) => t.date), ['2026-11-23', '2026-11-25', '2026-11-28'])
eq('weekly review: planned vs done, neutral', [view.review.planned, view.review.done, view.review.minutes], [2, 1, 20])
await today('2026-11-25')
view = await planner()
eq('missed again: offered as skip or keep, nothing lost', view.week.decisions.map((t) => t.id).includes(moved.id), true)
const kept = await rpc(A, `public.academic_update_task('${moved.id}', 'keep')`)
eq('keep: moved to the next study day', [kept.date, kept.needs_decision], ['2026-11-25', false])
const monday = view.week.tasks.find((t) => t.state === 'scheduled' && t.id !== moved.id)
eq('skip', (await rpc(A, `public.academic_update_task('${monday.id}', 'skip')`)).state, 'skipped')
eq('unknown action', (await errorOf(A, `public.academic_update_task('${monday.id}', 'delete')`))?.details?.field, 'action')

// ─── Edit and pause (PLAN-006) ───────────────────────────────────────────────

view = await rpc(A, `public.academic_save_plan(${json({ days: [2, 4, 5], minutes_per_day: 45 })})`)
const after = view.week.tasks.filter((t) => t.date > '2026-11-25' && t.state === 'scheduled' && !t.moved)
eq('a change applies from tomorrow: only Thu/Fri, two 22-minute sessions a day, at most 5 tasks this week',
  [after.length > 0, after.every((t) => ['2026-11-26', '2026-11-27'].includes(t.date) && t.est_minutes === 22), view.week.tasks.filter((t) => !t.moved && t.date >= '2026-11-23' && t.date <= '2026-11-29').length <= 5], [true, true, true])
eq('today stays as planned', view.week.tasks.some((t) => t.date === '2026-11-25'), true)
eq('a pause must be within 90 days', (await errorOf(A, `public.academic_pause_plan('2027-06-01')`))?.details?.field, 'paused_until')
view = await rpc(A, `public.academic_pause_plan('2026-12-07')`)
eq('paused: no tasks until the date', [view.plan.paused_until, view.week.tasks.filter((t) => t.state === 'scheduled' && t.date >= '2026-11-25').length], ['2026-12-07', 0])
await today('2026-11-30')
eq('nothing is planned during the pause', (await planner()).week.tasks.filter((t) => t.date >= '2026-11-30').length, 0)
await today('2026-12-08')
eq('after the pause the week is planned again', (await planner()).week.tasks.filter((t) => t.date >= '2026-12-08' && t.state === 'scheduled').length > 0, true)
view = await rpc(A, `public.academic_pause_plan(null)`)
eq('resuming clears the pause', view.plan.paused_until, null)

// ─── Archive, other students, privacy ────────────────────────────────────────

eq('archive a goal', (await rpc(A, `public.academic_archive_goal('${phys.id}')`)).status, 'archived')
eq("B's planner has none of A's goals", (await planner(B)).goals, [])
eq('planner tables are hidden from users', (await errorOf(A, `(select count(*) from academic_study_tasks)`))?.status, '42501')
await rpc(A, `public.academic_request_deletion('profile')`)
await ok(db, 'age request', `update academic_student_profiles set deletion_requested_at = now() - interval '15 days' where user_id = '${A}'`)
await ok(db, 'purge', `select public.academic_purge_due_deletions()`)
eq('deleting the profile deletes goals, plan and tasks', (await one(`select (select count(*) from academic_learning_goals)::int + (select count(*) from academic_study_plans)::int + (select count(*) from academic_study_tasks)::int as n`)).n, 0)

done()
