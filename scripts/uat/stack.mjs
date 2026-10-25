// Local UAT stack for Schooling (QA-004, #40): a local Supabase with every
// repo migration, the curriculum seed, the MoES school list and synthetic
// accounts, plus the app built against it. Nothing touches production:
// every pg_cron job (several call production Edge Functions) is paused, and
// jobs are run on demand instead.
//
//   node scripts/uat/stack.mjs up              start + migrate + seed + accounts
//   node scripts/uat/stack.mjs serve           build the app and serve it on :4174 (keeps running)
//   node scripts/uat/stack.mjs reminders       run the reminder scheduler once
//   node scripts/uat/stack.mjs today <date|reset>   move the module's "today" (reminders agent only)
//   node scripts/uat/stack.mjs sql "<select>"  read-only query, prints JSON rows
//   node scripts/uat/stack.mjs down            stop and delete the stack
//
// Needs Docker. Ports 56520-56529. Accounts: uat-artifacts/accounts.json.
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '../..')
const DIR = join(ROOT, '.uat')
const OUT = join(ROOT, 'uat-artifacts')
const DB = 'supabase_db_bitdoin-uat'
const APP_PORT = 4174
// Data-dependent sanity checks that need production content (see backup-restore.md).
const SKIP = ['059_verify_reading_summaries.sql', '108_forge_sample_content.sql']
export const PASSWORD = 'Uat-pass-2026!'

const supabase = (args, opts = {}) => execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['--prefix', ROOT, 'supabase', ...args], { cwd: DIR, encoding: 'utf8', shell: process.platform === 'win32', ...opts })
const psql = (sql, { tolerant = false } = {}) => {
  const result = spawnSync('docker', ['exec', '-i', DB, 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-q', '-At', '-v', `ON_ERROR_STOP=${tolerant ? 0 : 1}`, '-1', '-f', '-'], { input: sql, encoding: 'utf8', maxBuffer: 64 << 20 })
  if (result.status !== 0 && !tolerant) throw new Error(result.stderr || 'psql failed')
  return { out: result.stdout, err: result.stderr, ok: result.status === 0 }
}
const status = () => JSON.parse(supabase(['status', '-o', 'json']))

function ensureProject() {
  if (existsSync(join(DIR, 'supabase', 'config.toml'))) return
  mkdirSync(DIR, { recursive: true })
  supabase(['init', '--force'])
  const file = join(DIR, 'supabase', 'config.toml')
  let toml = readFileSync(file, 'utf8')
  toml = toml
    .replace(/^project_id = .*/m, 'project_id = "bitdoin-uat"')
    .replace(/^(port|shadow_port) = 543(\d\d)$/gm, '$1 = 565$2')
    .replace(/^site_url = .*/m, `site_url = "http://localhost:${APP_PORT}"`)
    .replace(/(\[auth\.mfa\.totp\][^[]*?)enroll_enabled = false/s, '$1enroll_enabled = true')
    .replace(/(\[auth\.mfa\.totp\][^[]*?)verify_enabled = false/s, '$1verify_enabled = true')
  writeFileSync(file, toml)
}

async function up() {
  ensureProject()
  console.log('starting Supabase (first run pulls images)…')
  supabase(['start', '-x', 'studio,imgproxy,mailpit,logflare,vector,edge-runtime,realtime,postgres-meta,supavisor'], { stdio: 'inherit' })

  const applied = new Set(psql(`create schema if not exists supabase_migrations;
    create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);
    select version from supabase_migrations.schema_migrations;`).out.split('\n').filter(Boolean))
  const failed = []
  for (const file of readdirSync(join(ROOT, 'supabase', 'migrations')).filter((f) => f.endsWith('.sql')).sort()) {
    const version = file.split('_')[0]
    if (applied.has(version)) continue
    if (SKIP.includes(file)) { console.log(`skip ${file} (needs production content)`); continue }
    const run = psql(readFileSync(join(ROOT, 'supabase', 'migrations', file), 'utf8'), { tolerant: true })
    if (!run.ok || /ERROR:/.test(run.err)) { failed.push(`${file}: ${run.err.split('\n').find((l) => l.includes('ERROR')) ?? run.err.slice(0, 200)}`); continue }
    psql(`insert into supabase_migrations.schema_migrations (version, name) values ('${version}', '${file.slice(version.length + 1, -4)}') on conflict do nothing;`)
  }
  if (failed.length) throw new Error(`migrations failed:\n${failed.join('\n')}`)

  // Scheduled jobs call production functions: pause them all.
  psql(`select cron.alter_job(jobid, active := false) from cron.job;`)
  psql(readFileSync(join(ROOT, 'supabase', 'seeds', 'academic_curriculum_seed.sql'), 'utf8'), { tolerant: true })
  psql(`update public.academic_settings set value = 'true' where key = 'my_scores_enabled';`)

  await accounts()
  console.log(`\nUAT stack ready. Next: node scripts/uat/stack.mjs serve   (app on http://localhost:${APP_PORT})`)
}

// 40 students, 5 admins, 2 support agents, 1 finance; each persona gets its own (Docs/my-scores/uat/agent-guide.md).
async function accounts() {
  const s = status()
  const service = s.SERVICE_ROLE_KEY ?? s.SECRET_KEY
  const wanted = [
    ...Array.from({ length: 40 }, (_, i) => ({ email: `uat-s${String(i + 1).padStart(2, '0')}@example.test`, name: `UAT Student ${i + 1}`, role: 'CUSTOMER' })),
    ...[1, 2, 3, 4, 5].map((i) => ({ email: `uat-admin${i}@example.test`, name: `UAT Admin ${i}`, role: 'ADMIN' })),
    ...[1, 2].map((i) => ({ email: `uat-ops${i}@example.test`, name: `UAT Support ${i}`, role: 'OPERATIONS' })),
    { email: 'uat-finance1@example.test', name: 'UAT Finance', role: 'FINANCE' },
  ]
  for (const account of wanted) {
    const response = await fetch(`${s.API_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: account.email, password: PASSWORD, email_confirm: true, user_metadata: { full_name: account.name } }),
    })
    if (!response.ok && response.status !== 422) throw new Error(`create ${account.email}: ${response.status} ${await response.text()}`)
  }
  psql(wanted.filter((a) => a.role !== 'CUSTOMER').map((a) => `update public.users set role = '${a.role}' where email = '${a.email}';`).join('\n'))
  mkdirSync(OUT, { recursive: true })
  writeFileSync(join(OUT, 'accounts.json'), JSON.stringify({ app: `http://localhost:${APP_PORT}`, password: PASSWORD, accounts: wanted }, null, 2))
  console.log(`${wanted.length} accounts ready (uat-artifacts/accounts.json)`)
}

async function serve() {
  const s = status()
  process.env.VITE_SUPABASE_URL = s.API_URL
  process.env.VITE_SUPABASE_ANON_KEY = s.ANON_KEY ?? s.PUBLISHABLE_KEY
  process.env.VITE_VAPID_PUBLIC_KEY = 'BAcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc'
  const { build, preview } = await import('vite')
  await build({ root: ROOT, build: { outDir: join(ROOT, 'dist-uat'), emptyOutDir: true }, logLevel: 'warn' })
  await preview({ root: ROOT, build: { outDir: join(ROOT, 'dist-uat') }, preview: { port: APP_PORT, strictPort: true } })
  console.log(`app on http://localhost:${APP_PORT} against ${s.API_URL}`)
}

const [command, arg] = process.argv.slice(2)
switch (command) {
  case 'up': await up(); break
  case 'accounts': await accounts(); break
  case 'serve': await serve(); break
  case 'reminders': console.log(psql(`select public.academic_schedule_score_reminders();`).out.trim()); break
  case 'today':
    psql(arg === 'reset'
      ? `create or replace function public.academic_today() returns date language sql stable set search_path = '' as $$ select (now() at time zone 'Asia/Vientiane')::date $$;`
      : `create or replace function public.academic_today() returns date language sql stable set search_path = '' as $$ select date '${String(arg).replace(/[^0-9-]/g, '')}' $$;`)
    console.log(`academic_today() = ${psql('select public.academic_today();').out.trim()}`)
    break
  case 'sql': {
    if (!/^\s*(select|with)\b/i.test(arg ?? '')) throw new Error('read-only: start with select or with')
    console.log(psql(`set transaction read only; select coalesce(json_agg(t), '[]') from (${arg}) t;`).out.trim())
    break
  }
  case 'down': supabase(['stop', '--no-backup'], { stdio: 'inherit' }); break
  default: console.log('usage: node scripts/uat/stack.mjs up | serve | reminders | today <YYYY-MM-DD|reset> | sql "<select>" | down')
}
