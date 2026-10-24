// Observability (OPS-002, #42): client metrics carry no content, server
// timing deltas from pg_stat_statements, SLO evaluation, job checks, alert
// e-mail queue and the admin Health data.
import { createDb, ok, eq, done, ACADEMIC_MIGRATIONS } from './harness.mjs'
import { CONFIG_SQL, apiFor, json } from './fixtures.mjs'

const db = await createDb(ACADEMIC_MIGRATIONS)
const { rpc, rpcError, one } = apiFor(db)
const S = '00000000-0000-0000-0000-0000000000a1'
const ADM = '00000000-0000-0000-0000-0000000000d1'
const STAFF = { aal: 'aal2' }
await ok(db, 'users', `insert into public.users (id, name, role) values ('${S}', 'S', 'CUSTOMER'), ('${ADM}', 'Admin', 'ADMIN')`)
await ok(db, 'config', CONFIG_SQL)

// ─── Client metrics: counters only ───────────────────────────────────────────

const record = (items) => rpc(S, `public.academic_record_metrics(${json(items)})`)
const recordError = async (items) => (await rpcError(S, `public.academic_record_metrics(${json(items)})`))?.code
eq('accepts rpc and page items', await record([
  { k: 'rpc', n: 'academic_get_dashboard', ms: 120, s: 200 },
  { k: 'rpc', n: 'academic_get_dashboard', ms: 450, s: 200 },
  { k: 'rpc', n: 'academic_get_dashboard', ms: 90, s: 503 },
  { k: 'rpc', n: 'academic_save_draft', ms: 2000, s: 0 },
  { k: 'rpc', n: 'academic_save_draft', ms: 80, s: 409 },
  { k: 'page', n: 'dashboard_summary', ms: 1800 },
]), { accepted: 6 })
const dash = await one(`select calls, client_errors, server_errors, network_errors, sum_ms, histogram from academic_client_metrics where name = 'academic_get_dashboard'`)
eq('aggregated into one minute bucket with a histogram', dash, { calls: 3, client_errors: 0, server_errors: 1, network_errors: 0, sum_ms: 660, histogram: [1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0] })
eq('network failures and 4xx counted apart', await one(`select client_errors, network_errors from academic_client_metrics where name = 'academic_save_draft'`), { client_errors: 1, network_errors: 1 })
eq('no user, arguments or content columns', (await db.query(`select column_name from information_schema.columns where table_name = 'academic_client_metrics' order by ordinal_position`)).rows.map((r) => r.column_name),
  ['bucket', 'kind', 'name', 'calls', 'client_errors', 'server_errors', 'network_errors', 'sum_ms', 'histogram'])
eq('extra fields refused (no smuggled content)', await recordError([{ k: 'rpc', n: 'academic_get_session', ms: 10, s: 200, note: 'Noy scored 7.5' }]), 'VALIDATION_FAILED')
eq('free-text names refused', await recordError([{ k: 'rpc', n: 'Noy Phommachanh', ms: 10, s: 200 }]), 'VALIDATION_FAILED')
eq('unknown page refused', await recordError([{ k: 'page', n: 'profile_of_noy', ms: 10 }]), 'VALIDATION_FAILED')
eq('implausible durations refused', await recordError([{ k: 'rpc', n: 'academic_get_session', ms: 999999, s: 200 }]), 'VALIDATION_FAILED')
eq('at most 100 items', await recordError(Array.from({ length: 101 }, () => ({ k: 'page', n: 'dashboard_summary', ms: 1 }))), 'VALIDATION_FAILED')
eq('signed-out callers refused', (await rpcError(null, `public.academic_record_metrics('[]'::jsonb)`, { role: 'anon' }))?.status, '42501')
eq('metric tables hidden from clients', (await rpcError(S, `(select count(*) from academic_client_metrics)`))?.status, '42501')

eq('histogram quantiles', await one(`select public.academic_histogram_quantile(array[1,1,0,1,0,0,0,0,0,0,0,0,0], 0.5) as p50,
  public.academic_histogram_quantile(array[1,1,0,1,0,0,0,0,0,0,0,0,0], 0.95) as p95,
  public.academic_histogram_quantile(array[0,0,0,0,0,0,0,0,0,0,0,0,0], 0.95) as empty,
  public.academic_histogram_quantile(array[0,0,0,0,0,0,0,0,0,0,0,0,2], 0.5) as open_ended`), { p50: 200, p95: 500, empty: null, open_ended: 20000 })
eq('reads and writes classified', await one(`select public.academic_rpc_kind('academic_get_dashboard') as a, public.academic_rpc_kind('academic_list_periods') as b,
  public.academic_rpc_kind('academic_submit_score_entry') as c, public.academic_rpc_kind('academic_support_lookup') as d`), { a: 'read', b: 'read', c: 'write', d: 'read' })

// ─── Server time from pg_stat_statements ─────────────────────────────────────

eq('no pg_stat_statements: nothing collected', await one(`select public.academic_collect_server_metrics() as n`), { n: 0 })
await ok(db, 'fake pg_stat_statements', `create table extensions.pg_stat_statements (query text, calls bigint, total_exec_time double precision, mean_exec_time double precision, stddev_exec_time double precision);
  insert into extensions.pg_stat_statements values
    ('WITH pgrst_source AS (SELECT pgrst_call.pgrst_scalar FROM (SELECT "public"."academic_get_dashboard"("p_enrolment_id" := $1) pgrst_scalar) pgrst_call)', 100, 5000, 50, 10),
    ('WITH pgrst_source AS (SELECT pgrst_call.pgrst_scalar FROM (SELECT "public"."academic_save_draft"($1) pgrst_scalar) pgrst_call)', 10, 1000, 100, 0),
    ('select * from public.books', 999, 1, 1, 0)`)
eq('first sample only sets the cursor', await one(`select public.academic_collect_server_metrics() as n`), { n: 0 })
// 50 more dashboard calls: mean 200 ms, sd 0; save_draft unchanged.
await ok(db, 'more calls', `update extensions.pg_stat_statements set calls = 150, total_exec_time = 15000, mean_exec_time = 100,
  stddev_exec_time = sqrt((100 * (100 + 2500) + 50 * 40000) / 150.0 - 10000) where query like '%get_dashboard%'`)
eq('second sample records the window', await one(`select public.academic_collect_server_metrics() as n`), { n: 1 })
const win = await one(`select rpc, kind, calls, round(mean_ms) as mean, round(p95_est_ms) as p95 from academic_server_metrics`)
eq('window mean is the delta, not the lifetime mean', [win.rpc, win.kind, win.calls, Number(win.mean)], ['academic_get_dashboard', 'read', 50, 200])
eq('p95 estimate close to the window values (all 200 ms)', Math.abs(Number(win.p95) - 200) <= 2, true)
await ok(db, 'stats reset', `update extensions.pg_stat_statements set calls = 5, total_exec_time = 100 where query like '%get_dashboard%'`)
eq('a statistics reset does not create negative windows', await one(`select public.academic_collect_server_metrics() as n, (select count(*)::int from academic_server_metrics where calls < 0) as negative`), { n: 1, negative: 0 })

// ─── Health check and alerts ─────────────────────────────────────────────────

await ok(db, 'clean', `delete from academic_server_metrics; delete from academic_client_metrics; delete from academic_alerts`)
eq('quiet system raises nothing', (await one(`select public.academic_check_health() as r`)).r.raised, [])

await ok(db, 'slow reads', `insert into academic_server_metrics (window_end, rpc, kind, calls, mean_ms, p95_est_ms)
  values (now() - interval '5 minutes', 'academic_get_dashboard', 'read', 40, 250, 420),
         (now() - interval '5 minutes', 'academic_get_history', 'read', 3, 900, 2000)`)
await ok(db, 'errors', `insert into academic_client_metrics (bucket, kind, name, calls, server_errors, histogram)
  values (date_trunc('minute', now()) - interval '10 minutes', 'rpc', 'academic_get_dashboard', 100, 2, array_fill(0, array[13]))`)
await ok(db, 'slow dashboards', `insert into academic_client_metrics (bucket, kind, name, calls, histogram)
  values (date_trunc('minute', now()) - interval '10 minutes', 'page', 'dashboard_summary', 30, array[0,0,0,0,0,0,0,0,5,10,15,0,0])`)
await ok(db, 'failed job', `insert into cron.job_run_details (jobid, status, start_time)
  select jobid, 'failed', now() - interval '10 minutes' from cron.job where jobname = 'academic-score-reminders'`)
const health = (await one(`select public.academic_check_health() as r`)).r
eq('targets missed raise alerts', [...health.raised].sort(), ['job_failed', 'slo_availability', 'slo_dashboard', 'slo_latency'])
eq('latency judged on RPCs with enough calls (3 slow calls ignored)', health.hour.read_p95_ms, 420)
eq('availability 98% < 99.5%', health.day.availability, 0.98)
eq('dashboard p75 from the histogram (23rd of 30 loads is in the 5 s bucket)', health.day.dashboard_p75_ms, 5000)
eq('one alert per kind a day', (await one(`select public.academic_check_health() as r`)).r.raised, [])
const alert = await one(`select details from academic_alerts where kind = 'job_failed'`)
eq('job alert names the job', alert.details.job, 'academic-score-reminders')
eq('alert details carry no user IDs', JSON.stringify((await db.query(`select details from academic_alerts`)).rows).includes(S), false)

await ok(db, 'stale push', `insert into academic_notifications (user_id, category, code, channel, state, dedupe_key, created_at)
  values ('${S}', 'score_reminder', 'score_reminder.second', 'push', 'pending', 'obs:stuck', now() - interval '3 hours');
  update academic_settings set value = '{"start": "00:00", "end": "00:00"}' where key = 'notification_quiet_hours'`)
eq('stuck push reminders raise push_backlog', (await one(`select public.academic_check_health() as r`)).r.raised, ['push_backlog'])

await ok(db, 'old metrics', `insert into academic_client_metrics (bucket, kind, name, calls) values (now() - interval '91 days', 'rpc', 'academic_get_session', 1)`)
await one(`select public.academic_check_health() as r`)
eq('metrics older than 90 days are removed', (await one(`select count(*)::int as n from academic_client_metrics where bucket < now() - interval '90 days'`)).n, 0)

// ─── Alert e-mail queue ──────────────────────────────────────────────────────

const claim = async () => (await db.query(`select id, kind, recipient from public.academic_claim_alert_emails(10)`)).rows
const claimed = await claim()
eq('every alert is queued for the on-call address', [claimed.length, [...new Set(claimed.map((r) => r.recipient))]], [5, ['bitdoin0@gmail.com']])
await ok(db, 'sent', `select public.academic_complete_alert_emails(array[${claimed.slice(0, 4).map((r) => `'${r.id}'`).join(',')}]::uuid[], array['${claimed[4].id}']::uuid[], 'Resend 403')`)
eq('sent alerts are not sent again; failures retry', (await claim()).map((r) => r.id), [claimed[4].id])
for (let i = 0; i < 4; i++) await claim()
eq('after 5 attempts a failing alert stops retrying', await claim(), [])
eq('service functions hidden from clients', (await rpcError(ADM, `(select count(*) from public.academic_claim_alert_emails(1))`, STAFF))?.status, '42501')

// ─── Admin ───────────────────────────────────────────────────────────────────

eq('students cannot read health', (await rpcError(S, `public.academic_admin_health()`, STAFF))?.code, 'FORBIDDEN_ROLE')
eq('admins need MFA', (await rpcError(ADM, `public.academic_admin_health()`))?.code, 'MFA_REQUIRED')
const view = await rpc(ADM, `public.academic_admin_health()`, STAFF)
eq('health view: 48 hourly points, jobs, alert counts', [view.series.length, view.jobs.length >= 4, view.alerts.unsent, view.alerts.last_error], [48, true, 1, 'Resend 403'])
eq('health view shows the failed job', view.jobs.find((j) => j.job === 'academic-score-reminders').failed_24h, 1)
const test = await rpc(ADM, `public.academic_admin_test_alert()`, STAFF)
eq('test alert queued for e-mail, even twice in a day', [(await claim()).map((r) => r.id).includes(test.id), !!(await rpc(ADM, `public.academic_admin_test_alert()`, STAFF)).id], [true, true])
eq('test alert audited', (await one(`select count(*)::int as n from academic_audit_events where action = 'admin.test_alert' and actor_user_id = '${ADM}'`)).n, 2)
eq('on-call address is not readable by clients', (await rpcError(ADM, `(select value from academic_private_settings where key = 'alert_email')`, STAFF))?.status, '42501')

eq('schedules registered', (await db.query(`select jobname, schedule from cron.job where jobname in ('academic-collect-metrics', 'academic-health-check', 'academic-alert-emails') order by jobname`)).rows,
  [{ jobname: 'academic-alert-emails', schedule: '*/5 * * * *' }, { jobname: 'academic-collect-metrics', schedule: '*/5 * * * *' }, { jobname: 'academic-health-check', schedule: '10 * * * *' }])

done()
