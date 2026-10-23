import { PGlite } from '@electric-sql/pglite'
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
export const SUPABASE = join(here, '..', '..')
export const MIGRATIONS = join(SUPABASE, 'migrations')

export const readSupabaseFile = (path) => readFileSync(join(SUPABASE, path), 'utf8')

let failures = 0
let passes = 0

export async function createDb(migrations) {
  const db = new PGlite({ extensions: { pg_trgm } })
  await db.exec(readFileSync(join(here, 'bootstrap.sql'), 'utf8'))
  for (const file of migrations) {
    try {
      await db.exec(readFileSync(join(MIGRATIONS, file), 'utf8'))
    } catch (e) {
      console.error(`Migration ${file} failed: ${e.message}`)
      process.exit(1)
    }
  }
  return db
}

export async function ok(db, name, sql) {
  try {
    const r = await db.exec(sql)
    passes++
    return r.at(-1)?.rows ?? []
  } catch (e) {
    failures++
    console.error(`FAIL ${name}: expected success, got: ${e.message}`)
    return []
  }
}

export async function fails(db, name, sql, pattern) {
  try {
    await db.exec(`begin; ${sql}; commit;`)
    failures++
    console.error(`FAIL ${name}: expected error ${pattern}`)
  } catch (e) {
    await db.exec('rollback').catch(() => {})
    if (pattern && !new RegExp(pattern, 'i').test(e.message)) {
      failures++
      console.error(`FAIL ${name}: wrong error: ${e.message}`)
    } else passes++
  }
}

export function eq(name, actual, expected) {
  const a = JSON.stringify(actual), b = JSON.stringify(expected)
  if (a === b) passes++
  else { failures++; console.error(`FAIL ${name}: got ${a}, expected ${b}`) }
}

export function done() {
  console.log(`${passes} passed, ${failures} failed`)
  process.exit(failures ? 1 : 0)
}
