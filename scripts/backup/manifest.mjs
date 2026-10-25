// Writes manifest.json for a backup made by dump.sh: rows per table (counted
// from the COPY blocks, so they match the snapshot exactly), the latest
// migration, module object counts and file checksums. Prints only totals:
// table names and counts are not personal data, but CI logs are public.
//
//   node scripts/backup/manifest.mjs <backup-dir>
import { createHash } from 'node:crypto'
import { readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

export const FILES = ['roles.sql', 'schema.sql', 'data.sql', 'history_schema.sql', 'history_data.sql', 'cron.sql']
const DATA_FILES = ['data.sql', 'history_data.sql']

const unquote = (name) => name.replace(/^"(.*)"$/, '$1').replace(/""/g, '"')

/** Rows per table in a pg_dump --use-copy data file, plus the column list of each. */
export function copyBlocks(sql) {
  const tables = {}
  let current = null
  for (const line of sql.split('\n')) {
    if (current) {
      if (line === '\\.') current = null
      else current.rows.push(line)
      continue
    }
    const match = /^COPY ((?:"(?:[^"]|"")+"|[^ .]+)\.(?:"(?:[^"]|"")+"|[^ (]+)) \(([^)]*)\) FROM stdin;$/.exec(line)
    if (match) {
      const [schema, table] = match[1].match(/"(?:[^"]|"")+"|[^.]+/g).map(unquote)
      current = { name: `${schema}.${table}`, columns: match[2].split(', ').map(unquote), rows: [] }
      if (tables[current.name]) throw new Error(`${current.name} appears twice`)
      tables[current.name] = current
    }
  }
  if (current) throw new Error(`unterminated COPY block for ${current.name}`)
  return tables
}

export function buildManifest(dir) {
  const files = {}
  for (const file of FILES) {
    const body = readFileSync(join(dir, file))
    files[file] = { bytes: statSync(join(dir, file)).size, sha256: createHash('sha256').update(body).digest('hex') }
  }
  const tables = {}
  let migration = null
  for (const file of DATA_FILES) {
    for (const [name, block] of Object.entries(copyBlocks(readFileSync(join(dir, file), 'utf8')))) {
      if (name in tables) throw new Error(`${name} is in more than one data file`)
      tables[name] = block.rows.length
      if (name === 'supabase_migrations.schema_migrations') {
        const at = block.columns.indexOf('version')
        migration = block.rows.map((row) => row.split('\t')[at]).sort().at(-1) ?? null
      }
    }
  }
  const schema = readFileSync(join(dir, 'schema.sql'), 'utf8')
  const count = (re) => (schema.match(re) ?? []).length
  return {
    format: 1,
    created_at: new Date().toISOString(),
    migration,
    tables,
    rows_total: Object.values(tables).reduce((a, b) => a + b, 0),
    module: {
      tables: count(/^CREATE TABLE IF NOT EXISTS "public"\."academic_/gm),
      functions: count(/^CREATE OR REPLACE FUNCTION "public"\."academic_/gm),
      policies: count(/^CREATE POLICY .* ON "public"\."academic_/gm),
      signed_in_functions: count(/^GRANT ALL ON FUNCTION "public"\."academic_.* TO "authenticated";$/gm),
    },
    cron_jobs: (readFileSync(join(dir, 'cron.sql'), 'utf8').match(/^select cron\.schedule\(/gm) ?? []).length,
    files,
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dir = process.argv[2]
  if (!dir) throw new Error('usage: manifest.mjs <backup-dir>')
  const manifest = buildManifest(dir)
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2))
  const bytes = Object.values(manifest.files).reduce((a, f) => a + f.bytes, 0)
  console.log(`manifest: ${Object.keys(manifest.tables).length} tables, ${manifest.rows_total} rows, ${bytes} bytes, migration ${manifest.migration}, `
    + `module ${manifest.module.tables} tables / ${manifest.module.functions} functions / ${manifest.module.policies} policies, ${manifest.cron_jobs} cron jobs`)
}
