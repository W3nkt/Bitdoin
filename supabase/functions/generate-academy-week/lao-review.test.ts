// deno test supabase/functions/generate-academy-week/lao-review.test.ts
import { collectLaoPairs, keepEnglish, reviewLaoUnits, type ReviewAsk } from './lao-review.ts'

const same = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
}
const fails = async (run: () => Promise<unknown>, part: string) => {
  try { await run() } catch (error) { if (String((error as Error).message).includes(part)) return; throw error }
  throw new Error(`expected an error containing "${part}"`)
}

const quiz = (id = 'q1') => ({
  id, answerIndex: 0,
  prompt: { en: "What does 'keep your cool' mean?", lo: "'keep your cool' ໝາຍຄວາມວ່າແນວໃດ?" },
  options: [{ en: 'stay calm', lo: 'ຮັກສາຄວາມສະຫງົບ' }, { en: 'wear cool clothes', lo: 'ນຸ່ງເຄື່ອງເຢັນ' }, { en: '360', lo: '360' }, { en: 'carrot', lo: 'carrot' }],
  explanation: { en: 'It means to stay calm.', lo: 'ໝາຍເຖິງການຮັກສາຄວາມສະຫງົບ.' },
})

Deno.test('pairs {en, lo}, {english, lao} and _en/_lo texts, and skips identical ones', () => {
  same(collectLaoPairs(quiz()).map(pair => pair.path.join('.')), ['prompt.lo', 'options.0.lo', 'options.1.lo', 'explanation.lo'])
  same(collectLaoPairs({ id: 'w', english: 'chair', lao: 'ຕັ່ງ' }).map(pair => pair.path.join('.')), ['lao'])
  const lesson = {
    slug: 'x', title_en: 'Study well', title_lo: 'ຮຽນໃຫ້ດີ',
    content_en: [{ heading: 'Plan', body: 'Make a plan.' }], content_lo: [{ heading: 'ແຜນ', body: 'ເຮັດແຜນ.' }],
    key_takeaways_en: ['One', 'Two'], key_takeaways_lo: ['ໜຶ່ງ', 'ສອງ'],
  }
  same(collectLaoPairs(lesson).map(pair => pair.path.join('.')), ['title_lo', 'content_lo.0.heading', 'content_lo.0.body', 'key_takeaways_lo.0', 'key_takeaways_lo.1'])
})

Deno.test('pairs a chapter held under english / lao, and the parts of a quiz of a book', () => {
  const chapter = { english: { heading: 'Habits', blocks: [{ type: 'p', text: 'Habits matter.' }] }, lao: { heading: 'ນິໄສ', blocks: [{ type: 'p', text: 'ນິໄສສຳຄັນ.' }] } }
  same(collectLaoPairs(chapter).map(pair => pair.path.join('.')), ['lao.heading', 'lao.blocks.0.text'])
  const book = { quiz: [{ prompt_en: 'Q?', prompt_lo: 'ຄຳຖາມ?', options_en: ['a b', 'c d'], options_lo: ['ກ', 'ຂ'], correct_index: 1 }] }
  same(collectLaoPairs(book).map(pair => pair.path.join('.')), ['quiz.0.prompt_lo', 'quiz.0.options_lo.0', 'quiz.0.options_lo.1'])
})

// A scripted reviewer: answers by the id (u<unit>p<pair>) or the field name of each pair.
type Answer = { verdict: string; cause?: string; reason?: string }
const reviewer = (decide: (pair: { id: string; field: string }) => Answer | undefined, calls: string[] = []): ReviewAsk => async (_system, prompt) => {
  calls.push(prompt)
  const pairs = JSON.parse(prompt.slice(prompt.indexOf('PAIRS (JSON)\n') + 'PAIRS (JSON)\n'.length)) as { id: string; field: string }[]
  return { verdicts: pairs.map(pair => ({ id: pair.id, ...(decide(pair) ?? { verdict: 'ok' }) })) }
}

Deno.test('the reviewer only judges: a verdict never changes the content', async () => {
  const input = quiz()
  const before = JSON.stringify(input)
  const [result] = await reviewLaoUnits(reviewer(pair => pair.field === 'options[1].lo' ? { verdict: 'reject', cause: 'lao', reason: 'wrong word' } : undefined), 'quiz', [input])
  same(JSON.stringify(result.value), before)
  same(result.rejected.length, 1)
  same(result.englishFault, false)
})

Deno.test('a rejection names the pair, its English and its Lao so the translator can fix it', async () => {
  const [result] = await reviewLaoUnits(reviewer(pair => pair.field === 'options[1].lo' ? { verdict: 'reject', cause: 'lao', reason: 'keep it in English' } : undefined), 'quiz', [quiz()])
  const message = result.rejected[0]
  if (!message.includes('options[1].lo') || !message.includes('wear cool clothes') || !message.includes('ນຸ່ງເຄື່ອງເຢັນ') || !message.includes('keep it in English')) throw new Error(message)
})

Deno.test('a rejection that blames the English is flagged, so the item is dropped and not translated again', async () => {
  const [result] = await reviewLaoUnits(reviewer(pair => pair.field === 'prompt.lo' ? { verdict: 'reject', cause: 'english', reason: 'ambiguous question' } : undefined), 'quiz', [quiz()])
  same(result.englishFault, true)
})

Deno.test('a rejection marks only its own unit', async () => {
  const results = await reviewLaoUnits(reviewer(pair => pair.id.startsWith('u0') && pair.field === 'prompt.lo' ? { verdict: 'reject', reason: 'x' } : undefined), 'quiz', [quiz('q1'), quiz('q2')])
  same(results.map(result => result.rejected.length), [1, 0])
})

Deno.test('anything that is not a clear "ok" counts as a rejection', async () => {
  const [result] = await reviewLaoUnits(reviewer(pair => pair.field === 'explanation.lo' ? { verdict: 'maybe' } : undefined), 'quiz', [quiz()])
  same(result.rejected.length, 1)
  const [accepted] = await reviewLaoUnits(reviewer(() => ({ verdict: ' OK ' })), 'quiz', [quiz()])
  same(accepted.rejected.length, 0)
})

Deno.test('a pair without a verdict is asked again, then the review fails instead of passing unreviewed content', async () => {
  const calls: string[] = []
  const silent: ReviewAsk = async (_system, prompt) => { calls.push(prompt); return { verdicts: [] } }
  await fails(() => reviewLaoUnits(silent, 'quiz', [quiz()]), 'Lao review incomplete')
  same(calls.length, 2)
})

Deno.test('nothing to review means no model call', async () => {
  const calls: string[] = []
  await reviewLaoUnits(reviewer(() => undefined, calls), 'words', [{ id: 'w', english: '360', lao: '360' }])
  same(calls.length, 0)
})

Deno.test('keepEnglish puts the English back in place of each rejected Lao text, on a copy', async () => {
  const input = quiz()
  const [result] = await reviewLaoUnits(reviewer(pair => pair.field === 'options[1].lo' ? { verdict: 'reject', reason: 'x' } : undefined), 'quiz', [input])
  const kept = keepEnglish(input, result.rejections)
  same(kept.options[1], { en: 'wear cool clothes', lo: 'wear cool clothes' })
  same(kept.options[0].lo, 'ຮັກສາຄວາມສະຫງົບ')
  same(input.options[1].lo, 'ນຸ່ງເຄື່ອງເຢັນ')
})
