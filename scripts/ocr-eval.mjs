// Score-book OCR evaluation (AI-010, QG-3; release runbook, "Switching
// score-book scanning on"). Runs the production prompt and extraction code
// (supabase/functions/academic-ocr/extract.ts) over a labelled hold-out set
// and reports numeric accuracy on clear photos, silent errors and flag recall.
//
//   QWEN_API_KEY=... node scripts/ocr-eval.mjs <dir> [--model qwen3-vl-plus] [--passes 2] [--limit 20] [--gate]
//   node scripts/ocr-eval.mjs <dir> --replay        (re-score saved replies, no provider calls)
//
// <dir>/labels.json:
//   { "scale": { "min": 0, "max": 10, "step": 0.5 },
//     "images": [{ "file": "p01.jpg", "clear": true, "month": 10,
//                  "subjects": [{ "name_lo": "ຄະນິດສາດ", "name_en": "Mathematics" }],
//                  "truth": { "ຄະນິດສາດ": 7.5, "ຟີຊິກສາດ": null } }] }
// Photos should be prepared like the app sends them (JPEG, at most 2000 px on
// the long edge, under 3 MB). "truth" null means the cell is blank or
// unreadable to a person; "subjects" are the names the student would have
// (they go into the prompt). Replies are saved in <dir>/replies/<model>/ and
// the report in <dir>/report-<model>.json. Photos contain student data: keep
// the set out of the repository and delete it when the evaluation is done.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'
import { GATES, bboxUnits, jpegSize, scoreImage, summarise } from './ocr-eval-score.mjs'

const args = process.argv.slice(2)
const flag = (name) => args.includes(`--${name}`)
const option = (name, fallback) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : fallback }
const dir = args.find((a, i) => !a.startsWith('--') && !['--model', '--passes', '--limit'].includes(args[i - 1]))
if (!dir || !existsSync(join(dir, 'labels.json'))) {
  console.error('Usage: node scripts/ocr-eval.mjs <dir with labels.json> [--model m] [--passes 1|2] [--limit n] [--replay] [--gate]')
  process.exit(2)
}
const model = option('model', process.env.QWEN_OCR_MODEL || 'qwen3-vl-plus')
const passes = Number(option('passes', '2')) >= 2 ? 2 : 1
const replay = flag('replay')
const limit = Number(option('limit', '0')) || Infinity
const baseUrl = (process.env.QWEN_BASE_URL ?? 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1').replace(/\/$/, '')
const apiKey = process.env.QWEN_API_KEY ?? ''
if (!replay && !apiKey) {
  console.error('QWEN_API_KEY is not set (or use --replay to re-score saved replies).')
  process.exit(2)
}

// The Edge Function's own extraction code.
const out = await mkdtemp(join(tmpdir(), 'ocr-eval-'))
const source = readFileSync(new URL('../supabase/functions/academic-ocr/extract.ts', import.meta.url), 'utf8')
await writeFile(join(out, 'extract.mjs'), ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText)
const { buildExtraction, buildPrompt, parseModelJson, validateModelOutput, PROMPT_VERSION } = await import(pathToFileURL(join(out, 'extract.mjs')).href)
await rm(out, { recursive: true })

const labels = JSON.parse(readFileSync(join(dir, 'labels.json'), 'utf8'))
const replies = join(dir, 'replies', model.replace(/[^\w.-]/g, '_'))
mkdirSync(replies, { recursive: true })

/** Same request as supabase/functions/_shared/qwen-vision.ts. */
async function callModel(base64, prompt) {
  const started = Date.now()
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: [
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` }, min_pixels: 65536, max_pixels: 4194304 },
        { type: 'text', text: prompt },
      ] }],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 4000,
    }),
    signal: AbortSignal.timeout(60_000),
  })
  if (!response.ok) throw new Error(`provider ${response.status}: ${(await response.text()).slice(0, 200)}`)
  const data = await response.json()
  return { content: data?.choices?.[0]?.message?.content ?? '', ms: Date.now() - started, usage: data?.usage ?? null }
}

/** One pass, retried once on a schema failure, as in the Edge Function. Saved for --replay. */
async function readPass(image, pass, base64, prompt) {
  const file = join(replies, `${image.file}.${pass}.json`)
  let saved = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null
  if (!saved && replay) return { output: null, error: 'no saved reply', ms: null }
  if (!saved || saved.prompt_version !== PROMPT_VERSION) {
    if (replay) return { output: null, error: 'saved reply is for another prompt version', ms: null }
    saved = { prompt_version: PROMPT_VERSION, attempts: [] }
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const reply = await callModel(base64, prompt)
        saved.attempts.push(reply)
        validateModelOutput(parseModelJson(reply.content))
        break
      } catch (error) {
        saved.attempts.push({ error: String(error.message ?? error) })
      }
    }
    writeFileSync(file, JSON.stringify(saved, null, 2))
  }
  const ms = saved.attempts.reduce((sum, a) => sum + (a.ms ?? 0), 0)
  for (const attempt of [...saved.attempts].reverse()) {
    if (!attempt.content) continue
    try { return { output: validateModelOutput(parseModelJson(attempt.content)), ms, usage: attempt.usage } } catch { /* earlier attempt */ }
  }
  return { output: null, error: saved.attempts.at(-1)?.error ?? 'schema_invalid', ms }
}

const fields = []
const failures = []
const latencies = []
const boxes = []
let tokens = 0
const images = labels.images.slice(0, limit)
for (const [index, image] of images.entries()) {
  const bytes = readFileSync(join(dir, image.file))
  const size = jpegSize(bytes)
  if (!size) console.warn(`  ! ${image.file}: not a JPEG; the app always sends JPEG`)
  if (bytes.length > 3 * 1024 * 1024) console.warn(`  ! ${image.file}: over 3 MB; the app sends at most 3 MB`)
  const scale = image.scale ?? labels.scale ?? { min: 0, max: 10, step: 0.5 }
  const prompt = buildPrompt(image.subjects ?? Object.keys(image.truth).map((name) => ({ name_lo: name, name_en: null })), scale)
  const base64 = bytes.toString('base64')
  const results = await Promise.all(Array.from({ length: passes }, (_, pass) => readPass(image, pass, base64, prompt)))
  const [a, b] = results
  if (!a.output) {
    failures.push({ file: image.file, error: a.error })
    // A failed scan sends the student to typing: every field is flagged, none silent.
    fields.push(...scoreImage({ periods: [] }, image))
    console.log(`  ${index + 1}/${images.length} ${image.file}: failed (${a.error})`)
    continue
  }
  const extraction = buildExtraction(a.output, b?.output ?? null, scale, { model_id: model, processing_ms: Math.max(...results.map((r) => r.ms ?? 0)) })
  latencies.push(extraction.processing_ms)
  tokens += results.reduce((sum, r) => sum + (r.usage?.total_tokens ?? 0), 0)
  if (size) for (const period of extraction.periods) for (const row of period.rows) boxes.push({ bbox: row.bbox, ...size })
  const scored = scoreImage(extraction, image)
  fields.push(...scored)
  console.log(`  ${index + 1}/${images.length} ${image.file}: ${scored.filter((f) => f.correct).length}/${scored.length} right, ${scored.filter((f) => f.silent).length} silent`)
}

const percentile = (values, p) => {
  if (!values.length) return null
  const sorted = [...values].sort((x, y) => x - y)
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]
}
const summary = summarise(fields)
const report = {
  model, prompt_version: PROMPT_VERSION, passes, photos: images.length, failed_scans: failures.length,
  ...summary,
  latency_ms: { p50: percentile(latencies, 0.5), p95: percentile(latencies, 0.95) },
  total_tokens: tokens,
  bbox_units: bboxUnits(boxes),
  failures,
  generated_at: new Date().toISOString(),
}
writeFileSync(join(dir, `report-${model.replace(/[^\w.-]/g, '_')}.json`), JSON.stringify({ ...report, fields }, null, 2))

const pct = (v) => (v === null ? 'n/a' : `${(v * 100).toFixed(1)}%`)
const mark = (ok) => (ok ? 'PASS' : 'FAIL')
console.log(`\n${model} · ${PROMPT_VERSION} · ${passes} pass(es) · ${images.length} photos · ${summary.fields} fields`)
console.log(`  ${mark(summary.gates.accuracy)}  numeric accuracy, clear photos  ${pct(summary.accuracy)}  (gate >= ${pct(GATES.accuracy)}, ${summary.clear_numeric_fields} fields)`)
console.log(`  ${mark(summary.gates.silent)}  silent errors                   ${pct(summary.silent_rate)}  (gate <= ${pct(GATES.silent)}, ${summary.silent} fields)`)
console.log(`  ${mark(summary.gates.recall)}  flag recall                     ${pct(summary.flag_recall)}  (gate >= ${pct(GATES.recall)}, ${summary.wrong} wrong fields)`)
console.log(`  info  confirmation bypasses: 0 by design (academic_confirm_ocr_job is the only path; npm run test:db)`)
console.log(`  info  failed scans ${failures.length}; flagged ${pct(summary.flag_rate)} of fields; latency p50 ${report.latency_ms.p50 ?? 'n/a'} ms, p95 ${report.latency_ms.p95 ?? 'n/a'} ms; ${tokens} tokens`)
console.log(`  info  box units: ${report.bbox_units.verdict} (review-screen crops assume pixels)`)
if (flag('gate') && !Object.values(summary.gates).every(Boolean)) process.exit(1)
