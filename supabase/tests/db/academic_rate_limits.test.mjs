import { createDb, ok, eq, done, ACADEMIC_MIGRATIONS } from './harness.mjs'
import { CONFIG_SQL, ID, apiFor, json } from './fixtures.mjs'

const db = await createDb(ACADEMIC_MIGRATIONS)
const { rpc, rpcError, one } = apiFor(db)
const mfa = { aal: 'aal2' }

const A = '00000000-0000-0000-0000-0000000000a1'
const B = '00000000-0000-0000-0000-0000000000b1'
const OPS = '00000000-0000-0000-0000-0000000000e1'
const students = Array.from({ length: 5 }, (_, i) => `00000000-0000-0000-0000-00000000010${i}`)
await ok(db, 'users', `insert into public.users (id, name, role) values ('${A}', 'A', 'CUSTOMER'), ('${B}', 'B', 'CUSTOMER'), ('${OPS}', 'Ops', 'OPERATIONS'),
  ${students.map((s, i) => `('${s}', 'S${i}', 'CUSTOMER')`).join(', ')}`)
await ok(db, 'config', CONFIG_SQL)
const profile = { display_name: 'S', age_band: '18_plus', province_code: 'vientiane-prefecture', grade_id: ID.g11, school_id: ID.school, notice_version: '2026-10-draft' }
for (const u of [A, B, ...students]) await rpc(u, `public.academic_create_profile(${json(profile)})`)
await ok(db, 'fresh counters', `delete from academic_rate_counters; delete from academic_audit_events`)

// ─── Read limit: 120 per minute (PRIV-007) ───────────────────────────────────

let first429 = null
for (let i = 1; i <= 125 && first429 === null; i++) {
  const e = await rpcError(A, `public.academic_get_session()`)
  if (e) first429 = { at: i, code: e.code, status: e.status, details: e.details }
}
eq('429 exactly after 120 reads', [first429?.at, first429?.code, first429?.status, first429?.details?.bucket, first429?.details?.limit], [121, 'RATE_LIMITED', 'PT429', 'read', 120])
eq('retry_after within the minute', first429.details.retry_after > 0 && first429.details.retry_after <= 60, true)
eq('stays limited for the window', (await rpcError(A, `public.academic_get_dashboard()`))?.code, 'RATE_LIMITED')
eq('other users unaffected', (await rpc(B, `public.academic_get_session()`)).next_step, 'ready')
await ok(db, 'next window', `update academic_rate_counters set window_start = window_start - interval '1 minute' where user_id = '${A}'`)
eq('next window resets', (await rpc(A, `public.academic_get_session()`)).next_step, 'ready')

// ─── Write limit: 30 per minute ──────────────────────────────────────────────

await ok(db, 'fresh counters', `delete from academic_rate_counters`)
let firstWrite429 = null
let version = (await one(`select version from academic_student_profiles where user_id = '${B}'`)).version
for (let i = 1; i <= 32 && firstWrite429 === null; i++) {
  const e = await rpcError(B, `public.academic_update_profile(${version++}, ${json({ display_name: `B${i}` })})`)
  if (e) firstWrite429 = { at: i, code: e.code, bucket: e.details?.bucket }
}
eq('429 after 30 writes', firstWrite429, { at: 31, code: 'RATE_LIMITED', bucket: 'write' })
eq('reads still allowed while writes are limited', (await rpc(B, `public.academic_get_session()`)).next_step, 'ready')
eq('limited write changed nothing', (await one(`select display_name from academic_student_profiles where user_id = '${B}'`)).display_name, 'B30')

// Limits are configuration, not code.
await ok(db, 'tighter limit', `update academic_settings set value = '{"read": {"limit": 2, "seconds": 60}, "write": {"limit": 30, "seconds": 60}}' where key = 'rate_limits'; delete from academic_rate_counters`)
await rpc(B, `public.academic_get_session()`)
await rpc(B, `public.academic_get_session()`)
eq('configured limit applies', (await rpcError(B, `public.academic_get_session()`))?.details?.limit, 2)
await ok(db, 'restore limits', `update academic_settings set value = '{"read": {"limit": 120, "seconds": 60}, "write": {"limit": 30, "seconds": 60}}' where key = 'rate_limits'; delete from academic_rate_counters`)

// ─── Anomaly alerts ──────────────────────────────────────────────────────────

await ok(db, 'clear alerts', `delete from academic_alerts; delete from academic_audit_events`)
for (const s of students.slice(0, 3)) await rpc(OPS, `public.academic_support_lookup('${s}')`, mfa)
eq('3 profiles in 24 h is fine', (await one(`select count(*)::int as n from academic_alerts`)).n, 0)
await rpc(OPS, `public.academic_support_lookup('${students[3]}')`, mfa)
eq('4th distinct profile raises an alert', await one(`select kind, actor_user_id, details->>'profiles_24h' as n, status from academic_alerts`),
  { kind: 'multi_profile_access', actor_user_id: OPS, n: '4', status: 'open' })
await rpc(OPS, `public.academic_support_lookup('${students[4]}')`, mfa)
eq('one alert per actor per day', (await one(`select count(*)::int as n from academic_alerts`)).n, 1)

// A student's own profile never counts.
for (let i = 0; i < 6; i++) await rpc(A, `public.academic_export_my_data()`)
eq('own profile accesses do not alert', (await one(`select count(*)::int as n from academic_alerts where actor_user_id = '${A}'`)).n, 0)

// Probing other students' IDs.
const foreign = (await one(`select id from academic_enrolments where student_profile_id = (select id from academic_student_profiles where user_id = '${B}')`)).id
for (let i = 0; i < 21; i++) await rpc(A, `public.academic_list_periods('${foreign}')`)
eq('denied-access burst alert', await one(`select kind, details->>'denied_1h' as n from academic_alerts where actor_user_id = '${A}'`), { kind: 'access_denied_burst', n: '21' })

// Alerts are for admins with MFA only.
eq('students cannot see alerts', Number(await rpc(A, `(select count(*) from academic_alerts)`)), 0)
eq('ops cannot see alerts', Number(await rpc(OPS, `(select count(*) from academic_alerts)`, mfa)), 0)
await ok(db, 'admin', `insert into public.users (id, name, role) values ('00000000-0000-0000-0000-0000000000d1', 'Admin', 'ADMIN')`)
eq('admin with MFA sees alerts', Number(await rpc('00000000-0000-0000-0000-0000000000d1', `(select count(*) from academic_alerts)`, mfa)), 2)

// Housekeeping.
await ok(db, 'old counter', `insert into academic_rate_counters (user_id, bucket, window_start, count) values ('${A}', 'read', now() - interval '2 days', 5)`)
eq('cleanup removes old windows', (await one(`select public.academic_cleanup_rate_counters() as n`)).n, 1)
eq('cleanup scheduled hourly', (await one(`select schedule from cron.job where jobname = 'academic-cleanup-rate-counters'`)).schedule, '7 * * * *')
eq('counters hidden from clients', (await rpcError(A, `(select count(*) from academic_rate_counters)`))?.status, '42501')

done()
