// Checks a restored database against the backup's manifest.json: every
// table's row count, the latest migration, the module's tables, functions
// and policies, row-level security on every module table and the module's
// grants. Writes
// verify.json next to the manifest and exits 1 on any difference. Prints
// counts only.
//
//   node scripts/backup/verify.mjs <backup-dir> -- <psql command...>
//   e.g. -- docker exec -i supabase_db_backup-drill psql -U postgres -d postgres
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [dir, dashes, ...psql] = process.argv.slice(2)
if (!dir || dashes !== '--' || !psql.length) throw new Error('usage: verify.mjs <backup-dir> -- <psql command...>')
const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'))

const ident = (name) => `"${name.replace(/"/g, '""')}"`
const literal = (text) => `'${text.replace(/'/g, "''")}'`
const qualified = (name) => {
  const at = name.indexOf('.')
  return `${ident(name.slice(0, at))}.${ident(name.slice(at + 1))}`
}

function query(sql) {
  const result = spawnSync(psql[0], [...psql.slice(1), '-At', '-X', '-q', '-v', 'ON_ERROR_STOP=1', '-f', '-'], { input: sql, encoding: 'utf8', maxBuffer: 64 << 20 })
  if (result.status !== 0) throw new Error(`psql failed: ${result.stderr || result.error}`)
  return JSON.parse(result.stdout.trim())
}

const names = Object.keys(manifest.tables)
const counts = names.length
  ? query(`select json_object_agg(t, n) from (${names.map((name) => `select ${literal(name)} as t, (select count(*) from ${qualified(name)}) as n`).join('\nunion all ')}) s;`)
  : {}
const restored = query(`select json_build_object(
  'migration', (select max(version) from supabase_migrations.schema_migrations),
  'tables', (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
             where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relname like 'academic\\_%'),
  'functions', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                where n.nspname = 'public' and p.prokind = 'f' and p.proname like 'academic\\_%'),
  'policies', (select count(*) from pg_policies where schemaname = 'public' and tablename like 'academic\\_%'),
  'without_rls', (select coalesce(json_agg(c.relname order by c.relname), '[]') from pg_class c join pg_namespace n on n.oid = c.relnamespace
                  where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relname like 'academic\\_%' and not c.relrowsecurity),
  'cron_jobs', (select count(*) from cron.job),
  'signed_in_functions', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                          where n.nspname = 'public' and p.proname like 'academic\\_%' and has_function_privilege('authenticated', p.oid, 'execute')),
  'anon_callable', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                    where n.nspname = 'public' and p.proname like 'academic\\_%' and has_function_privilege('anon', p.oid, 'execute'))
);`)

const problems = []
for (const name of names) {
  if (Number(counts[name]) !== manifest.tables[name]) problems.push(`${name}: ${counts[name]} rows, backup has ${manifest.tables[name]}`)
}
if (restored.migration !== manifest.migration) problems.push(`migration ${restored.migration}, backup has ${manifest.migration}`)
for (const key of ['tables', 'functions', 'policies']) {
  if (restored[key] !== manifest.module[key]) problems.push(`module ${key}: ${restored[key]}, backup has ${manifest.module[key]}`)
}
if (restored.without_rls.length) problems.push(`row-level security off: ${restored.without_rls.join(', ')}`)
if (restored.cron_jobs !== manifest.cron_jobs) problems.push(`cron jobs: ${restored.cron_jobs}, backup has ${manifest.cron_jobs}`)
if (restored.signed_in_functions !== manifest.module.signed_in_functions) {
  problems.push(`grants: signed-in users can call ${restored.signed_in_functions} module functions, backup has ${manifest.module.signed_in_functions}`)
}
if (restored.anon_callable) problems.push(`grants widened: ${restored.anon_callable} module function(s) callable while signed out`)

const report = {
  ok: problems.length === 0,
  checked_at: new Date().toISOString(),
  tables_checked: names.length,
  rows_checked: Object.values(counts).reduce((a, n) => a + Number(n), 0),
  migration: restored.migration,
  module: { tables: restored.tables, functions: restored.functions, policies: restored.policies, signed_in_functions: restored.signed_in_functions },
  cron_jobs: restored.cron_jobs,
  problems,
}
writeFileSync(join(dir, 'verify.json'), JSON.stringify(report, null, 2))
console.log(`verify: ${report.tables_checked} tables, ${report.rows_checked} rows, migration ${report.migration}, `
  + `module ${report.module.tables}/${report.module.functions}/${report.module.policies}, ${report.cron_jobs} cron jobs: ${report.ok ? 'OK' : 'FAILED'}`)
for (const problem of problems) console.log(`  - ${problem}`)
process.exit(report.ok ? 0 : 1)
