import { createDb, ok, eq, done, readSupabaseFile, ACADEMIC_MIGRATIONS } from './harness.mjs'

const forward = ACADEMIC_MIGRATIONS
  .map((f) => readSupabaseFile(`migrations/${f}`)).join(';\n')
const back = readSupabaseFile('scripts/academic_module_rollback.sql')
const count = `select
  (select count(*)::int from pg_tables where schemaname = 'public' and tablename like 'academic\\_%') as tables,
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and proname like 'academic\\_%') as functions`

const db = await createDb(ACADEMIC_MIGRATIONS)
const before = (await ok(db, 'count', count))[0]
await ok(db, 're-run is idempotent', forward)
eq('re-run keeps settings', (await ok(db, 'settings', `select count(*)::int as n from academic_settings`))[0].n, 3)
await ok(db, 'rollback', back)
eq('rollback removes everything', (await ok(db, 'count', count))[0], { tables: 0, functions: 0 })
eq('core users untouched', (await ok(db, 'users', `select count(*)::int as n from information_schema.tables where table_name = 'users'`))[0].n, 1)
await ok(db, 'forward again', forward)
eq('forward again restores', (await ok(db, 'count', count))[0], before)
done()
