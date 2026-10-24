// Builds the app against a mocked Supabase, serves it with vite preview and
// runs the My Scores browser checks (student and admin). Used by CI and
// locally:  npm run test:e2e   (QA_SKIP_BUILD=1 reuses dist-qa)
//
// Env: QA_PORT (default 4173), QA_OUTPUT (screenshots, default qa-artifacts).
import { spawn } from 'node:child_process'
import { build, preview } from 'vite'

const outDir = 'dist-qa'
const port = Number(process.env.QA_PORT ?? 4173)
const scripts = ['scripts/qa-my-scores.mjs', 'scripts/qa-my-scores-admin.mjs']

if (!process.env.QA_SKIP_BUILD) {
  // Set before Vite loads .env files, so these win over any real project keys.
  process.env.VITE_SUPABASE_URL = 'https://example.supabase.co'
  process.env.VITE_SUPABASE_ANON_KEY = 'test'
  await build({ build: { outDir, emptyOutDir: true }, logLevel: 'warn' })
}

const server = await preview({ build: { outDir }, preview: { port, strictPort: true }, logLevel: 'warn' })
let failed = 0
try {
  for (const script of scripts) {
    const code = await new Promise((resolve) => {
      spawn(process.execPath, [script], {
        stdio: 'inherit',
        env: { ...process.env, MY_SCORES_PREVIEW_URL: `http://localhost:${port}` },
      }).on('exit', resolve)
    })
    if (code !== 0) {
      failed++
      console.error(`FAIL ${script}`)
    }
  }
} finally {
  await new Promise((resolve) => server.httpServer.close(resolve))
}
process.exit(failed ? 1 : 0)
