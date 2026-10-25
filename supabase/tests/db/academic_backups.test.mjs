// Backup monitoring (OPS-003, #43): the backup workflow's run reports, the
// health check's backup and drill alerts, and the Health tab's summary.
import { createDb, ok, eq, done, ACADEMIC_MIGRATIONS } from './harness.mjs'
import { CONFIG_SQL, apiFor, json } from './fixtures.mjs'

const db = await createDb(ACADEMIC_MIGRATIONS)
const { rpc, rpcError, one } = apiFor(db)
const S = '00000000-0000-0000-0000-0000000000a1'
const ADM = '00000000-0000-0000-0000-0000000000d1'
const STAFF = { aal: 'aal2' }
await ok(db, 'users', `insert into public.users (id, name, role) values ('${S}', 'S', 'CUSTOMER'), ('${ADM}', 'Admin', 'ADMIN')`)
await ok(db, 'config', CONFIG_SQL)

const RUN = 'https://github.com/W3nkt/Bitdoin/actions/runs/123456789'
const record = (kind, okFlag, details) => one(`select public.academic_record_backup_run('${kind}', ${okFlag}, ${json(details)}) as r`)
async function recordError(kind, okFlag, details) {
  try {
    await record(kind, okFlag, details)
    return null
  } catch (e) {
    return e.message
  }
}
const health = async () => (await one(`select public.academic_check_health() as r`)).r.raised

// ─── Run reports ─────────────────────────────────────────────────────────────

eq('a backup report is stored', Object.keys((await record('backup', true, { bytes: 5_200_000, tables: 128, rows: 1098, migration: '123', dump_s: 41, run_url: RUN })).r), ['id'])
eq('a drill report is stored', typeof (await record('drill', true, { rto_s: 310, restore_s: 12, verify_s: 3, backup_age_s: 7200, problems: 0, run_url: `${RUN}/attempts/2` })).r.id, 'string')
eq('unknown kinds refused', await recordError('snapshot', true, {}), 'VALIDATION_FAILED')
eq('unknown fields refused (no row data)', await recordError('backup', true, { first_row: 'Noy 7.5' }), 'VALIDATION_FAILED')
eq('text where a number belongs refused', await recordError('backup', true, { rows: 'many' }), 'VALIDATION_FAILED')
eq('negative numbers refused', await recordError('drill', true, { rto_s: -1 }), 'VALIDATION_FAILED')
eq('only GitHub run links', await recordError('backup', false, { run_url: 'https://evil.example/actions/runs/1' }), 'VALIDATION_FAILED')
eq('migration is a version number', await recordError('backup', true, { migration: '123; drop table x' }), 'VALIDATION_FAILED')
eq('signed-in users cannot report runs', (await rpcError(ADM, `public.academic_record_backup_run('backup', true, '{}')`, STAFF))?.status, '42501')
eq('signed-out callers cannot report runs', (await rpcError(null, `public.academic_record_backup_run('backup', true, '{}')`, { role: 'anon' }))?.status, '42501')
eq('run table hidden from clients', (await rpcError(ADM, `(select count(*) from academic_backup_runs)`, STAFF))?.status, '42501')

// ─── Health check ────────────────────────────────────────────────────────────

await ok(db, 'clean', `delete from academic_alerts; delete from academic_backup_runs`)
eq('new install: nothing overdue before the first night', await health(), [])

await ok(db, 'monitoring started two weeks ago', `update academic_private_settings set value = (now() - interval '14 days')::text where key = 'backup_monitoring_since'`)
eq('no runs at all: backup and drill overdue', await health(), ['backup_stale', 'drill_stale'])
eq('one alert per kind a day', await health(), [])

await ok(db, 'clean', `delete from academic_alerts`)
await ok(db, 'recent successes', `insert into academic_backup_runs (kind, ok, finished_at) values
  ('backup', true, now() - interval '3 hours'), ('drill', true, now() - interval '6 days')`)
eq('recent backup and weekly drill: quiet', await health(), [])

await ok(db, 'old runs only', `update academic_backup_runs set finished_at = now() - interval '27 hours' where kind = 'backup';
  update academic_backup_runs set finished_at = now() - interval '9 days' where kind = 'drill'`)
eq('backup older than 26 h and drill older than 8 days: overdue', await health(), ['backup_stale', 'drill_stale'])

await ok(db, 'clean', `delete from academic_alerts; delete from academic_backup_runs`)
await ok(db, 'latest runs failed', `insert into academic_backup_runs (kind, ok, finished_at, details) values
  ('backup', true, now() - interval '3 hours', '{"run_url": "${RUN}"}'),
  ('backup', false, now() - interval '1 hour', '{"run_url": "${RUN}0"}'),
  ('drill', false, now() - interval '2 hours', '{"problems": 2}')`)
eq('latest run failed: failure alerts, not staleness', await health(), ['backup_failed', 'drill_failed'])
const failed = await one(`select details from academic_alerts where kind = 'backup_failed'`)
eq('failure alert links the run and the last success', [failed.details.run_url, typeof failed.details.last_success], [`${RUN}0`, 'string'])
eq('failure alerts are e-mailed like the others', (await one(`select array_agg(kind order by kind) as kinds from public.academic_claim_alert_emails(20)`)).kinds, ['backup_failed', 'drill_failed'])

await ok(db, 'success after the failure', `insert into academic_backup_runs (kind, ok, finished_at) values ('backup', true, now() - interval '1 minute')`)
await ok(db, 'clean', `delete from academic_alerts`)
eq('a later success clears the backup failure', await health(), ['drill_failed'])

// ─── Health tab ──────────────────────────────────────────────────────────────

const view = await rpc(ADM, `public.academic_admin_health()`, STAFF)
eq('Health tab lists backup and drill', Object.keys(view.backups).sort(), ['backup', 'drill'])
eq('latest backup shown with 30-day counts', [view.backups.backup.last.ok, view.backups.backup.runs_30d, view.backups.backup.failed_30d], [true, 3, 1])
eq('latest drill shown as failed', [view.backups.drill.last.ok, view.backups.drill.last.details.problems, view.backups.drill.last_success_at], [false, 2, null])
eq('students cannot read it', (await rpcError(S, `public.academic_admin_health()`, STAFF))?.code, 'FORBIDDEN_ROLE')

await ok(db, 'tie', `delete from academic_alerts; delete from academic_backup_runs;
  insert into academic_backup_runs (kind, ok, finished_at) values ('backup', true, '2026-10-25 01:00+00'), ('backup', false, '2026-10-25 01:00+00')`)
eq('runs finishing at the same instant: the failure counts', (await one(`select public.academic_check_health() as r`)).r.raised.includes('backup_failed'), true)

done()
