// MVP metrics (ANL-002, #45; PRD §32.2): definitions, minimum group size 20,
// opted-out students left out, admin-only access.
import { createDb, ok, eq, done, ACADEMIC_MIGRATIONS } from './harness.mjs'
import { CONFIG_SQL, ID, apiFor, json, period } from './fixtures.mjs'

const db = await createDb(ACADEMIC_MIGRATIONS)
const { rpc, rpcError, one } = apiFor(db)
const S = '00000000-0000-0000-0000-0000000000a1'
const ADM = '00000000-0000-0000-0000-0000000000d1'
const STAFF = { aal: 'aal2' }
await ok(db, 'users', `insert into public.users (id, name, role) values ('${S}', 'S', 'CUSTOMER'), ('${ADM}', 'Admin', 'ADMIN')`)
await ok(db, 'config', CONFIG_SQL)

const metrics = () => rpc(ADM, `public.academic_admin_usage_metrics()`, STAFF)

eq('students cannot read metrics', (await rpcError(S, `public.academic_admin_usage_metrics()`, STAFF))?.code, 'FORBIDDEN_ROLE')
eq('admins need MFA', (await rpcError(ADM, `public.academic_admin_usage_metrics()`))?.code, 'MFA_REQUIRED')
const empty = await metrics()
eq('empty store: 12 weeks, 6 months, 6 cohorts', [empty.weeks.length, empty.months.length, empty.cohorts.length, empty.min_group], [12, 6, 6, 20])
eq('empty store: zero counts, no rates', [empty.weeks.at(-1).profiles_created, empty.weeks.at(-1).onboarding_rate, empty.months.at(-1).recording_students], [0, null, 0])

// ─── Synthetic events (Tuesday three weeks ago, Vientiane time) ─────────────

const T = `((date_trunc('week', now() at time zone 'Asia/Vientiane') - interval '3 weeks' + interval '1 day 10 hours') at time zone 'Asia/Vientiane')`
const insert = (rows) => ok(db, 'events', `insert into academic_usage_events (id, name, occurred_at, pseudonym, role, locale, platform, app_version, grade_code, props) values ${rows.join(',\n')}`)
const row = (name, pseudonym, at, props = {}, grade = 'G11') =>
  `(gen_random_uuid(), '${name}', ${at}, ${pseudonym ? `'${pseudonym}'` : 'null'}, 'student', 'lo', 'android', 'test', ${pseudonym ? `'${grade}'` : 'null'}, ${json(props)})`
const pseud = (i) => i.toString(16).padStart(32, '0')
const range = (n, from = 1) => Array.from({ length: n }, (_, i) => i + from)

// 30 start set-up, 24 finish; 12 of them record within 7 days, 12 after 10 days.
await insert(range(30).map(() => row('onboarding_started', null, T)))
await insert(range(24).flatMap((i) => [
  row('onboarding_completed', pseud(i), T, { duration_ms: 90000, school_listed: true }),
  row('profile_created', pseud(i), T, { source: i <= 18 ? 'academy_menu' : 'profile_link', age_band: '16_17' }),
  row('module_session_started', pseud(i), T),
  row('score_entry_submitted', pseud(i), `${T} + interval '${i <= 12 ? 2 : 10} days'`, { period: '2026-2027:monthly:1', lines_scored: 8, lines_status_counts: { scored: 8 }, duration_ms: 60000 + i * 1000, method: 'manual', first: true }, 'G10'),
]))
// 20 of them look at the dashboard twice, 4 once.
await insert(range(24).flatMap((i) => [row('dashboard_viewed', pseud(i), T, { has_trend: false }), ...(i <= 20 ? [row('dashboard_viewed', pseud(i), T, { has_trend: false })] : [])]))
// This month: 21 Grade 11 and 3 Grade 12 students record.
await insert(range(24, 100).map((i) => row('score_entry_submitted', pseud(i), `now() - interval '1 minute'`, { period: '2026-2027:monthly:2', lines_scored: 8, lines_status_counts: { scored: 8 }, duration_ms: 50000, method: 'manual', first: true }, i < 121 ? 'G11' : 'G12')))

const m = await metrics()
const weekKey = (await one(`select (date_trunc('week', now() at time zone 'Asia/Vientiane') - interval '3 weeks')::date::text as k`)).k
const week = m.weeks.find((w) => w.week_start === weekKey)
eq('profiles created that week', week.profiles_created, 24)
eq('onboarding completion = completed / started', [week.onboarding_started, week.onboarding_completed, week.onboarding_rate], [30, 24, 0.8])
eq('first-entry rate: first submission within 7 days of the profile', [week.first_entry_cohort, week.first_entry_rate, week.first_entry_final], [24, 0.5, true])

const monthKey = (await one(`select to_char(${T} at time zone 'Asia/Vientiane', 'YYYY-MM') as k`)).k
const month = m.months.find((x) => x.month === monthKey)
const lateMonth = (await one(`select to_char((${T} + interval '10 days') at time zone 'Asia/Vientiane', 'YYYY-MM') as k`)).k
if (lateMonth === monthKey) {
  eq('North Star: distinct students recording in the month', month.recording_students >= 24, true)
  eq('entry duration p50 (24 timed entries)', month.entry_duration_p50_ms, 72500)
}
eq('active students and dashboard twice-a-month rate', [month.active_students, month.dashboard_twice_rate], [24, Number((20 / 24).toFixed(4))])
eq('acquisition source shares (last 90 days)', m.sources.map((s) => [s.source, s.profiles, s.share]), [['academy_menu', null, 0.75], ['profile_link', null, 0.25]])
eq('grades this month: groups under 20 hidden', m.grades.filter((g) => g.grade_code !== 'G10'), [{ grade_code: 'G11', recording_students: 21 }, { grade_code: 'G12', recording_students: null }])
const current = m.cohorts.at(-1)
eq('current cohort: retention not due yet', [current.m1_due, current.m1_rate, current.m3_rate], [false, null, null])

// ─── Small groups ───────────────────────────────────────────────────────────

await ok(db, 'small week', `insert into academic_usage_events (id, name, occurred_at, pseudonym, role, locale, platform, app_version, props)
  select gen_random_uuid(), 'onboarding_started', ${T} - interval '1 week', null, 'student', 'en', 'desktop', 'test', '{}' from generate_series(1, 5)`)
const small = (await metrics()).weeks.find((w) => w.week_start === (new Date(new Date(weekKey).getTime() - 7 * 86400000)).toISOString().slice(0, 10))
eq('1–19 is hidden, the rate too', [small.onboarding_started, small.onboarding_rate], [null, null])
eq('helpers: count and rate thresholds', await one(`select public.academic_metric_count(19) as a, public.academic_metric_count(20) as b, public.academic_metric_count(0) as c,
  public.academic_metric_rate(5, 19) as d, public.academic_metric_rate(5, 20) as e`), { a: null, b: 20, c: 0, d: null, e: '0.2500' })

// ─── Period completion: only students with usage statistics on ──────────────

await ok(db, 'last month', `update academic_reporting_periods set start_date = (date_trunc('month', now()) - interval '1 month')::date,
  end_date = (date_trunc('month', now()) - interval '1 day')::date where id = '${period(1)}'`)
await db.exec(`create or replace function public.academic_today() returns date language sql stable set search_path = '' as $$ select current_date $$`)
const users = range(22).map((i) => `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`)
await ok(db, 'students', `insert into public.users (id, name) values ${users.map((u) => `('${u}', 'x')`).join(',')}`)
const enrolments = []
for (const u of users) {
  const p = await rpc(u, `public.academic_create_profile(${json({ display_name: 'x', age_band: '16_17', province_code: 'vientiane-prefecture', grade_id: ID.g11, school_id: ID.school, notice_version: '2026-10-25' })})`)
  enrolments.push(p.enrolment_id)
}
await ok(db, 'joined earlier', `update academic_enrolments set created_at = now() - interval '90 days'`)
for (const [i, e] of enrolments.entries()) {
  if (i >= 11) break
  const lines = (await db.query(`select id from academic_subject_enrolments where enrolment_id = '${e}'`)).rows.map((r) => ({ subject_enrolment_id: r.id, status: 'scored', value: 5 }))
  await rpc(users[i], `public.academic_submit_score_entry('${e}', '${period(1)}', ${json(lines)}, 'k')`)
}
await rpc(users[21], `public.academic_withdraw_consent('usage_statistics')`)
const lastMonth = (await metrics()).months.find((x) => x.month === (new Date(new Date().getFullYear(), new Date().getMonth() - 1, 15)).toISOString().slice(0, 7))
eq('period completion: 11 of 21 (the student who opted out is left out)', [lastMonth.period_expected, lastMonth.period_completion_rate], [21, Number((11 / 21).toFixed(4))])

done()
