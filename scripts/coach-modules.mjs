// Loads the Coach's pure academic-mode files (supabase/functions/premium-coach/
// academic-*.ts) in Node for scripts/test-coach.mjs and scripts/coach-eval.mjs:
// each is transpiled to a temporary .mjs, with imports between them rewritten.
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

const root = new URL('..', import.meta.url)
const FILES = ['academic-numbers', 'academic-safety', 'academic-prompt']

export async function loadCoachModules() {
  const out = await mkdtemp(join(tmpdir(), 'coach-'))
  try {
    for (const name of FILES) {
      const source = await readFile(new URL(`supabase/functions/premium-coach/${name}.ts`, root), 'utf8')
      const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
      await writeFile(join(out, `${name}.mjs`), js.replace(/from '\.\/(academic-[a-z]+)\.ts'/g, "from './$1.mjs'"))
    }
    const [numbers, safety, prompt] = await Promise.all(FILES.map((name) => import(pathToFileURL(join(out, `${name}.mjs`)).href)))
    return { ...numbers, ...safety, ...prompt }
  } finally {
    await rm(out, { recursive: true })
  }
}
