// JavaScript budget for the My Scores dashboard (DASH-006): the module's
// initial JS for the route is at most 170 KB gzipped, on top of the shell
// every page already loads (React, Supabase, the app entry). Also fails when
// a page-specific chunk (charts, html2canvas, dompurify) slips into that shell.
//
//   npm run test:bundle              builds into a temporary folder
//   node scripts/bundle-budget.mjs dist-qa   checks an existing build that
//                                            has .vite/manifest.json
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { gzipSync } from 'node:zlib'

const BUDGET_KB = 170
const NOT_IN_SHELL = ['charts', 'html2canvas', 'dompurify']
// The route chunk and the dashboard it opens on (lazy inside MyScores.tsx).
const ROUTE = ['MyScores', 'src/components/academic/Dashboard.tsx']

let dir = process.argv[2]
let temporary = null
if (!dir) {
  temporary = dir = mkdtempSync(path.join(tmpdir(), 'bitdoin-bundle-'))
  const { build } = await import('vite')
  await build({ build: { outDir: dir, emptyOutDir: true, manifest: true }, logLevel: 'warn' })
}

try {
  const manifest = JSON.parse(readFileSync(path.join(dir, '.vite/manifest.json'), 'utf8'))
  const gzipKb = (file) => gzipSync(readFileSync(path.join(dir, file)), { level: 9 }).length / 1024
  const closure = (key, seen = new Set()) => {
    if (seen.has(key)) return seen
    seen.add(key)
    for (const next of manifest[key].imports ?? []) closure(next, seen)
    return seen
  }
  const find = (id) => {
    const key = manifest[id] ? id : Object.keys(manifest).find((k) => manifest[k].name === id && k.endsWith('.js'))
    if (!key) throw new Error(`No chunk for ${id} in the manifest`)
    return key
  }
  const list = (keys) => [...keys].map((k) => ({ file: manifest[k].file, kb: gzipKb(manifest[k].file) })).sort((a, b) => b.kb - a.kb)
  const total = (rows) => rows.reduce((sum, row) => sum + row.kb, 0)
  const print = (rows) => rows.forEach((row) => console.log(`  ${row.kb.toFixed(1).padStart(7)} KB  ${row.file}`))

  const shell = closure(Object.keys(manifest).find((k) => manifest[k].isEntry))
  const shellRows = list(shell)
  console.log(`Shell loaded by every page: ${total(shellRows).toFixed(1)} KB gzipped`)
  print(shellRows)

  const route = new Set()
  for (const id of ROUTE) for (const key of closure(find(id))) if (!shell.has(key)) route.add(key)
  const routeRows = list(route)
  const routeKb = total(routeRows)
  console.log(`My Scores dashboard on top of the shell: ${routeKb.toFixed(1)} KB gzipped (budget ${BUDGET_KB} KB)`)
  print(routeRows)

  const leaked = [...shell].filter((k) => NOT_IN_SHELL.includes(manifest[k].name))
  const failures = [
    ...leaked.map((k) => `${manifest[k].file} is loaded by every page; keep it with the pages that use it`),
    ...(routeKb > BUDGET_KB ? [`My Scores dashboard JS is ${routeKb.toFixed(1)} KB, over the ${BUDGET_KB} KB budget`] : []),
  ]
  for (const failure of failures) console.error(`FAIL ${failure}`)
  if (!failures.length) console.log('ok  bundle budget')
  process.exitCode = failures.length ? 1 : 0
} finally {
  if (temporary) rmSync(temporary, { recursive: true, force: true })
}
