// Coach evaluation pipeline (P3-AI #53: AI-002, AI-003, AI-004, AI-010; QG-5).
//
//   npm run eval:coach                     safety layer only, no provider calls
//   npm run eval:coach -- --live           every item through the model, as production does
//   npm run eval:coach -- --replay <dir>   re-score a saved run (results.json)
//
// Options:
//   --prompt academic_chat@1.1.0     chat prompt version from the migrations (default: the latest active one)
//   --prompt-file <path>             a candidate chat prompt not yet in a migration
//   --summary-prompt academic_feedback@1.0.0
//   --model qwen-plus                default: QWEN_ACADEMIC_MODEL, then QWEN_TEXT_MODEL, then qwen-plus
//   --ratings <csv>                  the native raters' sheet for this run (Lao rating gate)
//   --baseline <report.json>         production baseline (default scripts/coach-eval/baseline.json)
//   --only <set>                     grounding | insufficient | summary | safety | cross_student
//   --limit <n>  --concurrency <n>   --out <dir>   --gate (exit 1 unless release is allowed)
//
// The set (scripts/coach-eval/test-set.json) and the synthetic students
// (contexts.json) are fixed: change them only with a new set version, never to
// make a candidate pass. Prompt bodies and the help numbers are read from the
// migrations, so the run uses exactly what production uses.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadCoachModules } from './coach-modules.mjs'
import { compareWithBaseline, decide, gateResults, parseCsv, ratingSheet, scoreItem, summarise } from './coach-eval-score.mjs'

const root = new URL('..', import.meta.url)
const path = (p) => new URL(p, root)
const args = process.argv.slice(2)
const flag = (name) => args.includes(`--${name}`)
const option = (name, fallback = null) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : fallback }

function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    if (!existsSync(path(file))) continue
    for (const line of readFileSync(path(file), 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
}

const migrations = readdirSync(path('supabase/migrations')).filter((f) => f.endsWith('.sql')).sort()
  .map((f) => readFileSync(path(`supabase/migrations/${f}`), 'utf8')).join('\n')

/** Prompt versions defined in the migrations: { 'academic_chat@1.0.0': { body, active } }. */
function promptsFromMigrations() {
  const out = {}
  for (const m of migrations.matchAll(/\('([a-z_]+)', '(\d+\.\d+\.\d+)', (true|false), \$prompt\$([\s\S]*?)\$prompt\$\)/g)) out[`${m[1]}@${m[2]}`] = { body: m[4], active: m[3] === 'true' }
  return out
}
function helpNumbers() {
  const m = migrations.match(/\('safeguarding_resources', '([\s\S]*?)', 'OD-15/)
  return JSON.parse(m[1].replace(/''/g, "'"))
}
function pickPrompt(prompts, id, requested) {
  if (requested) {
    if (!prompts[requested]) throw new Error(`No prompt ${requested} in the migrations`)
    return { key: requested, body: prompts[requested].body }
  }
  const active = Object.entries(prompts).filter(([k, v]) => k.startsWith(`${id}@`) && v.active).at(-1)
  return { key: active[0], body: active[1].body }
}

const mods = await loadCoachModules()
const set = JSON.parse(readFileSync(path('scripts/coach-eval/test-set.json'), 'utf8'))
const contexts = Object.fromEntries(JSON.parse(readFileSync(path('scripts/coach-eval/contexts.json'), 'utf8')).map((c) => [c.id, c]))
const resources = helpNumbers()
let items = set.items
if (option('only')) items = items.filter((i) => i.set === option('only'))
if (option('limit')) items = items.slice(0, Number(option('limit')))

loadEnv()
const live = flag('live')
const replayDir = option('replay')
const prompts = promptsFromMigrations()
const chatPrompt = option('prompt-file')
  ? { key: `academic_chat@candidate (${option('prompt-file')})`, body: readFileSync(option('prompt-file'), 'utf8') }
  : pickPrompt(prompts, 'academic_chat', option('prompt'))
const summaryPrompt = pickPrompt(prompts, 'academic_feedback', option('summary-prompt'))
const model = option('model') || process.env.QWEN_ACADEMIC_MODEL || process.env.QWEN_TEXT_MODEL || 'qwen-plus'
const baseUrl = (process.env.QWEN_BASE_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1').replace(/\/$/, '')
if (live && !process.env.QWEN_API_KEY) throw new Error('--live needs QWEN_API_KEY (in .env.local)')

/** The provider call, with the Edge Function's settings (academic-mode.ts). */
async function callModel(messages, lang) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20000)
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.QWEN_API_KEY}` },
      body: JSON.stringify({ model, messages, temperature: 0.3, max_tokens: lang === 'lo' ? 1500 : 600, stream: false, enable_thinking: false }),
      signal: controller.signal,
    })
    const result = await response.json().catch(() => null)
    const content = typeof result?.choices?.[0]?.message?.content === 'string' ? result.choices[0].message.content.trim() : ''
    if (!response.ok || !content) throw new Error(`provider ${response.status}`)
    return content.replace(/<END>\s*$/, '').trim()
  } finally {
    clearTimeout(timer)
  }
}

/** One item, the way handleAcademic answers it. */
async function run(item) {
  const context = contexts[item.context]
  const base = { id: item.id }
  if (item.kind === 'chat') {
    const category = mods.classifyInput(item.question)
    if (category) return { ...base, input_category: category, answer: mods.safeReply(category, item.lang, resources), source: 'safety' }
  }
  if (!live) return { ...base, input_category: null, answer: null, source: 'offline' }
  const started = Date.now()
  try {
    const call = (messages) => callModel(messages, item.lang)
    if (item.kind === 'summary') {
      const g = await mods.groundedAnswer(call, mods.summaryMessages(summaryPrompt.body, item.lang, context), context, '', (text) => mods.wordCount(text) <= 150, item.lang)
      const ok = g.answer && !mods.checkOutput(g.answer, resources)
      return { ...base, input_category: null, answer: ok ? g.answer : mods.deterministicSummary(context, item.lang), source: ok ? 'ai' : 'template', first: g.first, first_unsupported: g.firstUnsupported, retried: g.retried, latency_ms: Date.now() - started }
    }
    const g = await mods.groundedAnswer(call, mods.chatMessages(chatPrompt.body, item.lang, context, [], item.question), context, item.question, undefined, item.lang)
    let answer = g.answer ?? mods.groundedFallback(context, item.lang)
    let source = g.answer ? 'ai' : 'fallback'
    if (mods.checkOutput(answer, resources)) { answer = mods.safeReply('output', item.lang, resources); source = 'output_safety' }
    else if (mods.attributesToOther(answer, item.question)) { answer = mods.safeReply('other_student', item.lang, resources); source = 'output_safety' }
    return { ...base, input_category: null, answer, source, first: g.first, first_unsupported: g.firstUnsupported, retried: g.retried, latency_ms: Date.now() - started }
  } catch (error) {
    return { ...base, input_category: null, answer: null, source: 'error', error: String(error?.message ?? error) }
  }
}

async function runAll(list, concurrency) {
  const out = new Array(list.length)
  let next = 0
  let done = 0
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (next < list.length) {
      const i = next++
      out[i] = await run(list[i])
      if (live && ++done % 20 === 0) console.log(`  ${done}/${list.length}`)
    }
  }))
  return out
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const outDir = option('out') ?? (replayDir || join('qa-artifacts', 'coach-eval', `${stamp}-${live ? 'live' : 'offline'}`))
mkdirSync(outDir, { recursive: true })

let results
let config
if (replayDir) {
  const saved = JSON.parse(readFileSync(join(replayDir, 'results.json'), 'utf8'))
  results = saved.results
  config = saved.config
} else {
  config = { set_version: set.version, mode: live ? 'live' : 'offline', model: live ? model : null, chat_prompt: chatPrompt.key, summary_prompt: summaryPrompt.key, items: items.length, started_at: new Date().toISOString() }
  console.log(`Coach evaluation: ${items.length} items, ${config.mode}${live ? `, ${model}, ${chatPrompt.key}, ${summaryPrompt.key}` : ''}`)
  results = await runAll(items, Number(option('concurrency', live ? 4 : 1)))
  writeFileSync(join(outDir, 'results.json'), JSON.stringify({ config, results }, null, 1))
}

const byId = Object.fromEntries(set.items.map((i) => [i.id, i]))
const scored = results.map((r) => scoreItem(byId[r.id], r, contexts[byId[r.id].context], mods, resources))
const ratingsFile = option('ratings') ?? (existsSync(join(outDir, 'ratings.csv')) ? join(outDir, 'ratings.csv') : null)
const ratings = ratingsFile ? parseCsv(readFileSync(ratingsFile, 'utf8')) : []
const metrics = summarise(scored, { ratings, errors: results.filter((r) => r.source === 'error').length })
const baselinePath = option('baseline') ?? 'scripts/coach-eval/baseline.json'
const baseline = existsSync(baselinePath) ? JSON.parse(readFileSync(baselinePath, 'utf8')) : null
const regressions = baseline ? compareWithBaseline(metrics, baseline.metrics) : []
const gates = gateResults(metrics)
const decision = decide(gates, regressions)
if (metrics.provider_errors > Math.max(2, 0.05 * results.length)) {
  decision.blocking.push(`too many provider errors to trust this run (${metrics.provider_errors})`)
  decision.release = false
}

const failures = scored.filter((s) => s.pass === false).map((s) => ({ id: s.id, set: s.set, lang: s.lang, question: byId[s.id].question, answer: results.find((r) => r.id === s.id)?.answer, failures: s.failures }))
const report = { config, metrics, gates, baseline: baseline ? { path: baselinePath, config: baseline.config } : null, regressions, decision, failures, needs_review: metrics.cross_student.needs_review }
writeFileSync(join(outDir, 'report.json'), JSON.stringify(report, null, 1))

if (config.mode === 'live' && !existsSync(join(outDir, 'ratings.csv'))) {
  const rows = scored.filter((s) => s.live && s.lang === 'lo' && s.set !== 'cross_student').map((s) => ({ id: s.id, lang: s.lang, question: byId[s.id].question, answer: results.find((r) => r.id === s.id).answer }))
  writeFileSync(join(outDir, 'ratings.csv'), ratingSheet(rows))
}

const pct = (v) => (v === null || v === undefined ? '—' : typeof v === 'number' && v <= 1 && v >= 0 && !Number.isInteger(v) ? `${(v * 100).toFixed(1)}%` : String(v))
const md = [
  `# Coach evaluation — ${config.mode}`, '',
  `Set ${config.set_version} · ${config.items} items · model ${config.model ?? '—'} · ${config.chat_prompt} · ${config.summary_prompt}`, '',
  `**Release: ${decision.release ? 'allowed' : 'blocked'}**`, ...decision.blocking.map((b) => `- ${b}`), '',
  '| Gate | Value | Status |', '|---|---|---|',
  ...Object.values(gates).map((g) => `| ${g.label}${g.advisory ? ' (advisory)' : ''} | ${pct(g.value)} | ${g.status} |`), '',
  `Safety layer by category: ${Object.entries(metrics.safety_by_category).map(([k, v]) => `${k} ${v.caught}/${v.total}`).join(', ')}. Ordinary questions stopped by mistake: ${metrics.false_positives}.`,
  `Cross-student red team: ${metrics.cross_student.total} prompts, ${metrics.cross_student.stopped_by_safety_layer} stopped by the safety layer, ${metrics.cross_student.answered_by_model} answered by the model, ${metrics.cross_student.not_run} not run.`,
  `First replies with unsupported numbers: ${pct(metrics.unsupported_first_rate)}; answers replaced by the data-only fallback: ${pct(metrics.fallback_rate)}; relevance (expected values or subjects named): ${pct(metrics.relevance)}; Lao rated: ${metrics.lao_rated}.`, '',
  ...(failures.length ? ['## Failures', '', ...failures.map((f) => `- **${f.id}** (${f.lang}) ${f.question} — ${f.failures.join('; ')}`)] : []),
  ...(report.needs_review.length ? ['', '## Read these red-team answers', '', 'No disclosure found, but the answer does not plainly say the Coach only sees the student\'s own scores:', '', ...report.needs_review.map((id) => `- ${id}`)] : []),
].join('\n')
writeFileSync(join(outDir, 'report.md'), md + '\n')
console.log(md.split('\n').slice(0, 20).join('\n'))
console.log(`\nReport: ${join(outDir, 'report.md')}`)
if (flag('gate') && !decision.release) process.exit(1)
