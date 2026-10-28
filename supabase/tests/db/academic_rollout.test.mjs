// Staged launch after the pilot (REL-002 #47, decision ROLLOUT, migration 170):
// 10% / 50% / 100% of accounts by a fixed hash, nested steps, a pilot code
// still lets anyone in, rolling back keeps existing students, criteria for
// moving up with an explicit override, reasons and audit, admin only.
import { createDb, ok, eq, done, ACADEMIC_MIGRATIONS } from './harness.mjs'
import { CONFIG_SQL, ID, apiFor, json } from './fixtures.mjs'

const db = await createDb(ACADEMIC_MIGRATIONS)
const { rpc, rpcError, one } = apiFor(db)
const ADM = '00000000-0000-0000-0000-0000000000d1'
const STAFF = { aal: 'aal2' }
const users = Array.from({ length: 200 }, (_, i) => `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`)
await ok(db, 'users', `insert into public.users (id, name, role) values ('${ADM}', 'Admin', 'ADMIN'), ${users.map((u, i) => `('${u}', 'S${i}', 'CUSTOMER')`).join(', ')}`)
await ok(db, 'config', CONFIG_SQL + `update academic_settings set value = '{"read": {"limit": 5000, "seconds": 60}, "write": {"limit": 5000, "seconds": 60}}' where key = 'rate_limits';`)

const profile = (code) => json({ display_name: 'S', age_band: '16_17', province_code: 'vientiane-prefecture', grade_id: ID.g11, school_id: ID.school, notice_version: '2026-10-25', ...(code ? { pilot_code: code } : {}) })
const createError = async (user, code) => (await rpcError(user, `public.academic_create_profile(${profile(code)})`))?.code
const admin = (call) => rpc(ADM, call, STAFF)
const adminError = async (call, user = ADM, opts = STAFF) => (await rpcError(user, call, opts))?.code
const bucket = async (user) => (await one(`select public.academic_rollout_bucket('${user}') as b`)).b
const open = async (user) => (await rpc(user, `public.academic_rollout_status()`)).open

// ─── Defaults and buckets ────────────────────────────────────────────────────

let view = await admin(`public.academic_admin_list_pilot()`)
eq('starts at 100% with no step clock: applying the migration changes nothing', [view.rollout.percent, view.rollout.since, view.rollout.history], [100, null, []])
const buckets = await Promise.all(users.map(bucket))
eq('buckets are 0-99 and fixed per account', [buckets.every((b) => b >= 0 && b < 100), await bucket(users[0])], [true, buckets[0]])
const share = (limit) => buckets.filter((b) => b < limit).length / users.length
eq('about 10% and 50% of accounts fall in each share', [share(10) > 0.04 && share(10) < 0.18, share(50) > 0.4 && share(50) < 0.6], [true, true])
eq('everyone is open at 100%', await open(users[0]), true)

// ─── Admin changes ───────────────────────────────────────────────────────────

eq('students cannot change the share', await adminError(`public.academic_admin_set_rollout(10, 'start small')`, users[0], {}), 'FORBIDDEN_ROLE')
eq('admins need MFA', await adminError(`public.academic_admin_set_rollout(10, 'start small')`, ADM, {}), 'MFA_REQUIRED')
eq('only 10, 50 or 100', await adminError(`public.academic_admin_set_rollout(25, 'start small')`), 'VALIDATION_FAILED')
eq('a reason is required', await adminError(`public.academic_admin_set_rollout(10, 'ok')`), 'VALIDATION_FAILED')
eq('the same step is refused', await adminError(`public.academic_admin_set_rollout(100, 'again please')`), 'VALIDATION_FAILED')
view = await admin(`public.academic_admin_set_rollout(10, 'GA step 1 after the pilot')`)
eq('moving down needs no criteria; the step clock starts', [view.rollout.percent, view.rollout.since !== null, view.rollout.new_students], [10, true, 0])

// ─── Students at 10% ─────────────────────────────────────────────────────────

const inside = users.filter((_, i) => buckets[i] < 10)
const middle = users.filter((_, i) => buckets[i] >= 10 && buckets[i] < 50)
const outside = users.filter((_, i) => buckets[i] >= 50)
eq('status follows the share', [await open(inside[0]), await open(middle[0]), await open(outside[0])], [true, false, false])
eq('outside the share set-up is refused', await createError(middle[0]), 'ROLLOUT_NOT_OPEN')
eq('nothing is stored for them', (await one(`select count(*)::int as n from academic_student_profiles where user_id = '${middle[0]}'`)).n, 0)
eq('inside the share set-up works', (await rpc(inside[0], `public.academic_create_profile(${profile()})`)).created, true)
await admin(`public.academic_admin_save_pilot_cohort(${json({ name: 'Late school' })})`)
const code = (await admin(`public.academic_admin_list_pilot()`)).cohorts[0].code
eq('a pilot code still lets anyone in, tagged to the cohort', [(await rpc(outside[0], `public.academic_create_profile(${profile(code)})`)).created,
  (await one(`select pilot_cohort_id is not null as tagged from academic_student_profiles where user_id = '${outside[0]}'`)).tagged], [true, true])

// ─── Criteria for moving up ──────────────────────────────────────────────────

const criteria = async () => Object.fromEntries((await admin(`public.academic_admin_list_pilot()`)).rollout.criteria.map((c) => [c.key, c.met]))
eq('criteria: under 7 days blocks; no traffic is not enough data; no alerts or reports', await criteria(),
  { days: false, availability: null, read_p95_ms: null, write_p95_ms: null, dashboard_p75_ms: null, open_alerts: true, priority_reports: true })
const up = await rpcError(ADM, `public.academic_admin_set_rollout(50, 'step 2')`, STAFF)
eq('moving up with an unmet criterion is refused and names it', [up?.code, up?.details?.unmet], ['ROLLOUT_CRITERIA_UNMET', ['days']])
await db.exec(`update academic_settings set value = jsonb_set(value, '{since}', to_jsonb(now() - interval '8 days')) where key = 'rollout'`)
await db.exec(`insert into academic_alerts (kind, status, details) values ('slo_latency', 'open', '{}')`)
await db.exec(`insert into academic_problem_reports (reporter_user_id, category, priority, description, first_response_due)
  values ('${users[1]}', 'account_misuse', 'priority', 'someone saw my scores', now())`)
eq('open alerts and unresolved priority reports block', await criteria(),
  { days: true, availability: null, read_p95_ms: null, write_p95_ms: null, dashboard_p75_ms: null, open_alerts: false, priority_reports: false })
await db.exec(`update academic_alerts set status = 'acknowledged'; update academic_problem_reports set status = 'resolved'`)
await db.exec(`insert into academic_client_metrics (bucket, kind, name, calls, server_errors, client_errors, network_errors)
  values (date_trunc('hour', now()) - interval '1 day', 'rpc', 'academic_get_dashboard', 100, 5, 0, 0)`)
eq('availability below target blocks once there is enough traffic', (await criteria()).availability, false)
view = await admin(`public.academic_admin_set_rollout(50, 'Owner accepts the error blip', true)`)
eq('confirmed: moves up and the audit names what was not met', [view.rollout.percent, view.rollout.history[0].reason], [50, '10% to 50% (not met: availability): Owner accepts the error blip'])
eq('the 10% group stays in at 50%', [await open(inside[0]), await open(middle[0]), await open(outside[1])], [true, true, false])

// ─── Rollback and the pilot gate ─────────────────────────────────────────────

await rpc(middle[0], `public.academic_create_profile(${profile()})`)
await admin(`public.academic_admin_set_rollout(10, 'Roll back: support backlog')`)
eq('rolling back keeps students who already set up', (await rpc(middle[0], `public.academic_get_session()`)).next_step, 'ready')
eq('but stops new set-ups in the closed part', await createError(middle[1]), 'ROLLOUT_NOT_OPEN')
await admin(`public.academic_admin_set_pilot_mode(true, 'Back to the pilot')`)
eq('pilot mode: a code is required for everyone', await createError(inside[1]), 'PILOT_CODE_REQUIRED')
await db.exec(`update academic_settings set value = jsonb_set(value, '{since}', to_jsonb(now() - interval '30 days')) where key = 'rollout'`)
await admin(`public.academic_admin_set_pilot_mode(false, 'Pilot over again')`)
eq('switching the gate off restarts the step clock', (await criteria()).days, false)
eq('every change audited with its reason', (await db.query(`select reason from academic_audit_events where action = 'rollout.change' order by occurred_at`)).rows.map((r) => r.reason),
  ['100% to 10%: GA step 1 after the pilot', '10% to 50% (not met: availability): Owner accepts the error blip', '50% to 10%: Roll back: support backlog'])
eq('helpers are server-only', (await db.query(`select p.proname from pg_proc p where p.proname in ('academic_rollout_bucket', 'academic_rollout_open', 'academic_rollout_criteria')
  and (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute'))`)).rows, [])

done()
