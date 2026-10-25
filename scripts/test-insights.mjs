// Explanation templates and cause filter for subject labels and trends
// (ANALYSIS-004, DASH-005; P2-ANL #49):
//   npm run test:insights
// Transpiles the pure modules (insights.ts, insightsCopy.ts, format.ts) with
// TypeScript, then runs an evaluation set: every template in both languages,
// every label × trend × confidence combination, and every case of the F6–F10
// golden fixture as the engine returns it.
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

const root = new URL('..', import.meta.url)
const out = await mkdtemp(join(tmpdir(), 'insights-'))
for (const name of ['insights', 'insightsCopy', 'quizCopy', 'recommendationCopy', 'format']) {
  const source = await readFile(new URL(`src/lib/academic/${name}.ts`, root), 'utf8')
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } })
  await writeFile(join(out, `${name}.mjs`), outputText.replace(/from '\.\/(\w+)'/g, "from './$1.mjs'"))
}
const { BANNED_CAUSE_TERMS, namesCause, selectInsights, labelReason, explainSubject } = await import(pathToFileURL(join(out, 'insights.mjs')).href)
const { insightsCopy } = await import(pathToFileURL(join(out, 'insightsCopy.mjs')).href)
const { quizCopy } = await import(pathToFileURL(join(out, 'quizCopy.mjs')).href)
const { recommendationCopy } = await import(pathToFileURL(join(out, 'recommendationCopy.mjs')).href)
await rm(out, { recursive: true })

let passed = 0
const check = (name, fn) => { fn(); passed++; console.log(`  ✓ ${name}`) }
const translator = (lang) => (key, vars = {}) => {
  const entry = insightsCopy[key]
  assert.ok(entry, `missing copy key ${key}`)
  return entry[lang].replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match))
}
const S010 = { min: 0, max: 10 }
const S050 = { min: 0, max: 50 }
const LABELS = ['insufficient_evidence', 'relatively_stronger', 'relatively_lower', 'neutral']
const TRENDS = ['insufficient_evidence', 'volatile', 'improving', 'declining', 'no_clear_trend']
const CONFIDENCE = ['high', 'medium', 'low']

const subjectWith = (label, trend, series = [6, 7, 5.5, 8, 6.5].map((value, i) => ({ period_id: `p${i + 1}`, sequence: i + 1, status: 'scored', value }))) => ({
  subject_enrolment_id: 'se-1', code: 'MATH', name_lo: 'ຄະນິດສາດ', name_en: 'Mathematics', display_order: 0, active: true,
  series, window_n: series.length, mean: 6.6, latest: series.at(-1), change: null, label, trend,
})
const labelOf = (value, confidence, d = -1.2) => ({ value, confidence: ['relatively_stronger', 'relatively_lower'].includes(value) ? confidence : null, rule: `ANALYSIS-002.${value}`, n: 5, mean_deviation: d, periods_above: 1, periods_below: 4 })
const trendOf = (value, confidence) => ({ value, confidence: ['volatile', 'improving', 'declining'].includes(value) ? confidence : null, rule: `ANALYSIS-003.${value}`, n: 5, slope: value === 'declining' ? -0.25 : 0.25, p: 0.1, sd: 0.9, direction: 'up' })

console.log('insights')

check('no template names a banned cause, in English or Lao (insights, quiz and next-action strings)', () => {
  const hits = Object.entries({ ...insightsCopy, ...quizCopy, ...recommendationCopy }).flatMap(([key, entry]) => ['en', 'lo'].filter(lang => namesCause(entry[lang])).map(lang => `${key}.${lang}`))
  assert.deepEqual(hits, [])
})

check('the filter catches causes in both languages', () => {
  for (const sentence of [
    'Your Mathematics scores fell because you are lazy.', 'Maybe you lack motivation.', 'This could be ADHD.',
    'Students with high intelligence do better.', 'Your health may be the reason.', 'IQ matters.',
    'ເຈົ້າຂີ້ຄ້ານ ຈຶ່ງໄດ້ຄະແນນຕ່ຳ.', 'ອາດເປັນຍ້ອນສຸຂະພາບ.', 'ເຈົ້າບໍ່ສະຫຼາດພໍ.',
  ]) assert.ok(namesCause(sentence), sentence)
  for (const sentence of ['Subjects needing attention', 'A unique pattern', 'Asking the teacher which topics come next.']) assert.ok(!namesCause(sentence), sentence)
  assert.ok(BANNED_CAUSE_TERMS.length >= 30)
})

check('every label × trend × confidence explains with facts only, in both languages and scales', () => {
  for (const lang of ['en', 'lo']) {
    const t = translator(lang)
    for (const scale of [S010, S050]) {
      for (const l of LABELS) for (const tr of TRENDS) for (const c of CONFIDENCE) {
        const subject = subjectWith(labelOf(l, c), trendOf(tr, c))
        const { facts, suggestions } = explainSubject(subject, scale, lang === 'lo' ? subject.name_lo : subject.name_en, t)
        const where = `${lang} ${l}/${tr}/${c}`
        assert.equal(facts.length, 2, `${where}: one label fact and one trend fact`)
        for (const text of [...facts.map(f => f.text), ...suggestions]) {
          assert.ok(!/\{\w+\}/.test(text), `${where}: unfilled placeholder in "${text}"`)
          assert.ok(!namesCause(text), `${where}: cause in "${text}"`)
        }
        const expectsHelp = l === 'relatively_lower' || tr === 'declining' || tr === 'volatile'
        assert.equal(suggestions.length > 0, expectsHelp, `${where}: suggestions only for lower, declining or volatile`)
        assert.equal(facts[0].confidence, ['relatively_stronger', 'relatively_lower'].includes(l) ? c : null, `${where}: label confidence`)
      }
    }
  }
})

check('a template that named a cause would be dropped by the filter', () => {
  const t = translator('en')
  const leaky = (key, vars) => (key === 'explain.label.lower' ? 'Mathematics is low because of a lack of effort.' : key === 'explain.help.review' ? 'Try to be less lazy.' : t(key, vars))
  const { facts, suggestions } = explainSubject(subjectWith(labelOf('relatively_lower', 'high'), trendOf('declining', 'medium')), S010, 'Mathematics', leaky)
  assert.equal(facts.some(f => /effort/.test(f.text)), false)
  assert.equal(suggestions.some(s => /lazy/.test(s)), false)
  assert.equal(facts.length, 1)
  assert.equal(suggestions.length, 2)
})

check('DASH-005 reason states the rule, e.g. "Above your average in 4 of the last 5 months"', () => {
  const subject = subjectWith({ ...labelOf('relatively_stronger', 'medium', 0.8), periods_above: 4, periods_below: 1 }, null)
  assert.equal(labelReason(subject, S010, translator('en')), 'Above your average in 4 of the last 5 months, by about 0.8')
  assert.equal(labelReason(subject, S010, translator('lo')), 'ສູງກວ່າຄ່າສະເລ່ຍຂອງເຈົ້າ 4 ຈາກ 5 ເດືອນຫຼ້າສຸດ, ປະມານ 0.8')
  assert.equal(labelReason(subjectWith(labelOf('neutral', null), null), S010, translator('en')), null)
})

check('volatile names the real range of scores', () => {
  const { facts } = explainSubject(subjectWith(labelOf('neutral', null), trendOf('volatile', 'medium')), S010, 'English', translator('en'))
  assert.equal(facts[1].text, 'It has changed a lot from month to month, between 5.5 and 8.')
})

const view = (subjects, numeric = true) => ({ numeric, scale: S010, subjects })
check('card states: hidden without labels, insufficient, none, ready (largest deviation first)', () => {
  assert.equal(selectInsights(view([subjectWith(undefined, undefined)])).state, 'hidden')
  assert.equal(selectInsights(view([subjectWith(labelOf('relatively_lower', 'high'), null)], false)).state, 'hidden')
  assert.equal(selectInsights(view([subjectWith(labelOf('insufficient_evidence', null), null)])).state, 'insufficient')
  assert.equal(selectInsights(view([subjectWith(labelOf('neutral', null), null)])).state, 'none')
  const a = { ...subjectWith(labelOf('relatively_lower', 'low', -0.8), null), subject_enrolment_id: 'a' }
  const b = { ...subjectWith(labelOf('relatively_lower', 'high', -1.4), null), subject_enrolment_id: 'b' }
  const c = { ...subjectWith(labelOf('relatively_stronger', 'high', 1.6), null), subject_enrolment_id: 'c', active: false }
  const picked = selectInsights(view([a, b, c]))
  assert.deepEqual([picked.state, picked.attention.map(s => s.subject_enrolment_id), picked.stronger.length], ['ready', ['b', 'a'], 0])
})

// The golden cases, shaped as the dashboard returns them.
const fixture = JSON.parse(await readFile(new URL('supabase/tests/golden/f6-f10.v1.json', root), 'utf8'))
const toNumber = (fraction) => (fraction === null ? null : Number(BigInt(String(fraction).split('/')[0])) / Number(BigInt(String(fraction).split('/')[1] ?? '1')))
check('every F6–F10 golden case explains cleanly in both languages', () => {
  for (const c of fixture.cases) {
    const subjects = Object.entries(c.expected).map(([name, e], index) => ({
      ...subjectWith(
        { value: e.label.value, confidence: e.label.confidence, rule: '', n: e.label.n, mean_deviation: toNumber(e.label.mean_deviation), periods_above: e.label.above, periods_below: e.label.below },
        { value: e.trend.value, confidence: e.trend.confidence, rule: '', n: e.trend.n, slope: toNumber(e.trend.slope), p: e.trend.p, sd: null, direction: e.trend.direction },
        c.months.filter(m => typeof m.lines[name] === 'number').map(m => ({ period_id: `p${m.seq}`, sequence: m.seq, status: 'scored', value: m.lines[name] })),
      ),
      subject_enrolment_id: `${c.id}-${index}`, name_en: name, name_lo: name,
    }))
    const scale = { min: c.scale.min, max: c.scale.max }
    for (const lang of ['en', 'lo']) {
      const t = translator(lang)
      const { stronger, attention } = selectInsights({ numeric: true, scale, subjects })
      for (const s of [...stronger, ...attention]) assert.ok(!/\{\w+\}/.test(labelReason(s, scale, t)), `${c.id} ${s.name_en} reason`)
      for (const s of subjects) {
        const { facts, suggestions } = explainSubject(s, scale, s.name_en, t)
        for (const text of [...facts.map(f => f.text), ...suggestions]) assert.ok(!/\{\w+\}/.test(text) && !namesCause(text), `${c.id} ${s.name_en} ${lang}: "${text}"`)
      }
    }
  }
  // PRD §20.9: Mathematics is listed as needing attention, Biology then Chemistry as stronger.
  const l01 = fixture.cases[0]
  const subjects = Object.entries(l01.expected).map(([name, e]) => ({ ...subjectWith({ value: e.label.value, confidence: e.label.confidence, rule: '', n: e.label.n, mean_deviation: toNumber(e.label.mean_deviation), periods_above: e.label.above, periods_below: e.label.below }, null), subject_enrolment_id: name, name_en: name }))
  const picked = selectInsights({ numeric: true, scale: S010, subjects })
  assert.deepEqual([picked.stronger.map(s => s.name_en), picked.attention.map(s => s.name_en)], [['BIO', 'CHEM'], ['MATH', 'PHYS']])
})

console.log(`\n${passed} passed`)
