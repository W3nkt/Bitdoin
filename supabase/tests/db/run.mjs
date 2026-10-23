// Runs every *.test.mjs in this folder against a fresh in-memory Postgres
// (PGlite) with Supabase auth stubs. Usage: npm run test:db [-- name-filter]
import { readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const filter = process.argv[2] ?? ''
const files = readdirSync(here).filter((f) => f.endsWith('.test.mjs') && f.includes(filter)).sort()

let failed = 0
for (const file of files) {
  const result = spawnSync(process.execPath, [join(here, file)], { encoding: 'utf8' })
  const output = `${result.stdout}${result.stderr}`.trim()
  console.log(`${result.status === 0 ? 'ok  ' : 'FAIL'} ${file}\n${output.replace(/^/gm, '     ')}`)
  if (result.status !== 0) failed++
}
console.log(`\n${files.length - failed}/${files.length} test files passed`)
process.exit(failed ? 1 : 0)
