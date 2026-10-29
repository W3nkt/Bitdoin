// Local preview of the Lao pipeline for Daily Brain Sprint and Word Match:
// Qwen writes the English, Qwen translates it under strict rules, and the Lao
// reviewer (a separate, stronger model) checks every text before it would be
// saved. No database, nothing deployed.
//
//   deno run --env-file=.env --allow-env --allow-net --allow-read --allow-write=qa-artifacts scripts/preview-arcade-lao.ts
//     --batches 1,3       Brain Sprint batches to generate fresh (default 1,3: grammar, vocabulary)
//     --word-batches 2    Word Match batches to generate fresh (default 2)
//     --out <file.md>     report (default qa-artifacts/arcade-lao-preview.md; a .json with the final items sits beside it)
//     --today-only        only the five Brain Sprint questions from the screenshots (sections 1 and 2)
//     --skip-today        leave those five out; --batches none / --word-batches none skip a section
import {
  REVIEW_MODEL, TRANSLATE_MODEL, generateBrainSprint, generateWordMatch, reviewLao, reviewLog, translateBrainSprint,
  type BrainSprintItem, type WordMatchItem,
} from '../supabase/functions/generate-academy-week/content.ts'

const argValue = (name: string) => { const at = Deno.args.indexOf(name); return at >= 0 ? Deno.args[at + 1] : undefined }
const numbers = (value: string | undefined, fallback: number[]) => value ? value.split(',').map(Number).filter(Number.isInteger) : fallback
const outPath = argValue('--out') ?? 'qa-artifacts/arcade-lao-preview.md'

if (!Deno.env.get('QWEN_API_KEY')) {
  console.error('QWEN_API_KEY is needed (run with --env-file=.env).')
  Deno.exit(1)
}

const draft = (id: string, prompt: string, options: string[], answerIndex: number, explanation: string): BrainSprintItem => ({
  id, prompt: { en: prompt, lo: '' }, options: options.map(en => ({ en, lo: '' })), answerIndex, explanation: { en: explanation, lo: '' },
})

// The five Brain Sprint questions on the owner's screen (screenshots). "qwen" is the
// Lao that was shown. Only "24 × 15" is exact English and exact Lao (migration 108);
// the other English was rebuilt from the Lao on screen, and the explanations of those
// were not on screen, so they carry no Lao to review.
const TODAY: { draft: BrainSprintItem; qwen: { prompt: string; options: string[]; explanation?: string }; rebuilt: boolean }[] = [
  { rebuilt: true, draft: draft('today-1', "What does 'Keep your cool' mean?", ['Turn off the air conditioner', 'Eat very quickly', 'Wear cool clothes', 'Stay calm when making decisions'], 3, "'Keep your cool' means to stay calm, especially when something stressful happens."),
    qwen: { prompt: "'Keep your cool' ມີຄວາມໝາຍວ່າແນວໃດ?", options: ['ປິດເຄື່ອງເຢັນ', 'ກິນໄດ້ໄວ', 'ເຄື່ອງນຸ່ງເຢັນ', 'ຢູ່ໃນສະພາບເຢັນເມື່ອຕັດສິນໃຈ'] } },
  { rebuilt: true, draft: draft('today-2', 'What is the AI Coach in a learning app?', ['A document storage system', 'A human teacher', 'A digital coach powered by AI', 'A game level'], 2, 'An AI Coach is a digital coach that uses AI to guide your learning.'),
    qwen: { prompt: 'AI Coach ໃນແອັບສະເຕີມການຮຽນແມ່ນຫຍັງ?', options: ['ລະບົບເກັບເອກະສານ', 'ຄູມະນຸດ', 'ຄູຝຶກດິຈິຕອນທີ່ໃຊ້ AI', 'ຂັ້ນຂອງເກມ'] } },
  { rebuilt: true, draft: draft('today-3', "What does 'light' mean in the sentence: 'He turned on the light in the room.'?", ['A source of light', 'Not heavy', 'A small amount', 'Not many'], 0, "In this sentence, 'light' is the brightness that comes from a lamp."),
    qwen: { prompt: "'Light' ໃນປະໂຫຍກ: 'ເຂົາໄດ້ເປີດແສງໃນຫ້ອງ.' ມີຄວາມໝາຍວ່າແນວໃດ?", options: ['ແຫຼ່ງແສງສະຫວ່າງ', 'ພາຍໜ້າຖ້າຍ', 'ຈຳນວນນ້ອຍ', 'ບໍ່ຫຼາຍ'] } },
  { rebuilt: false, draft: draft('today-4', 'What is 24 × 15?', ['370', '350', '360', '340'], 2, 'To multiply by 15, multiply by 10 and add half of that result: 24 × 10 = 240, half is 120, so 240 + 120 = 360.'),
    qwen: { prompt: '24 × 15 ເທົ່າໃດ?', options: ['370', '350', '360', '340'], explanation: 'ເພື່ອຄູນດ້ວຍ 15, ຄູນດ້ວຍ 10 ແລ້ວເພີ່ມເຄື່ອງຈັກເຄື່ອງນັ້ນຄາດເດັດ: 24 × 10 = 240, ເຄື່ອງຈັກເຄື່ອງນັ້ນຄາດເດັດແມ່ນ 120, ດັ່ງນັ້ນ 240 + 120 = 360.' } },
  { rebuilt: true, draft: draft('today-5', 'Which word does not belong with the others: apple, banana, carrot, orange?', ['carrot', 'orange', 'apple', 'banana'], 0, 'A carrot is a vegetable; the others are fruits.'),
    qwen: { prompt: 'ຄຳໃດທີ່ບໍ່ເຂົ້າກັນກັບຄຳອື່ນໆ? ອາກົດ, ບານານາ, ດອກກາເລັດ, ອອເຣັງ', options: ['carrot', 'orange', 'apple', 'banana'] } },
]

const lines: string[] = []
const say = (text = '') => { lines.push(text); console.log(text) }
const timed = async <T>(label: string, run: () => Promise<T>) => {
  const started = Date.now()
  const result = await run()
  console.error(`  ${label}: ${((Date.now() - started) / 1000).toFixed(1)}s`)
  return result
}
const letters = ['a', 'b', 'c', 'd']
const optionLines = (options: string[], answerIndex?: number) => options.map((option, index) => `   ${letters[index]}) ${option}${index === answerIndex ? '  ✔' : ''}`).join('\n')
const block = (title: string, body: string) => `${title}\n${body}`
const reviewNotes = () => reviewLog.splice(0).map(note => `   • reviewer ${note}`).join('\n')
const failure = (error: unknown) => error instanceof Error ? error.message.slice(0, 500) : String(error)

const final: { brain_sprint: BrainSprintItem[]; word_match: WordMatchItem[]; today: BrainSprintItem[] } = { brain_sprint: [], word_match: [], today: [] }
const save = async () => {
  await Deno.mkdir(outPath.replace(/[\\/][^\\/]+$/, '') || '.', { recursive: true }).catch(() => undefined)
  await Deno.writeTextFile(outPath, lines.join('\n'))
  await Deno.writeTextFile(outPath.replace(/\.md$/, '') + '.json', JSON.stringify(final, null, 2))
}

say(`# Brain Sprint and Word Match: Qwen writes, the Lao reviewer checks`)
say(`Generated ${new Date().toISOString()} · Lao writer: Qwen \`${TRANSLATE_MODEL}\` · Lao reviewer: \`${REVIEW_MODEL}\``)
say()

if (!Deno.args.includes('--skip-today')) {
  // --- 1. The reviewer on the Lao that was on screen -----------------------
  say(`## 1. Would the reviewer have caught the Lao on your screen?`)
  say(`The reviewer is given the English and the Lao exactly as the app showed it, and only judges (it never rewrites). English rebuilt from the screenshots, except "24 × 15" (exact English and exact Lao).`)
  say()
  try {
    const onScreen: BrainSprintItem[] = TODAY.map(entry => ({
      ...entry.draft,
      prompt: { en: entry.draft.prompt.en, lo: entry.qwen.prompt },
      options: entry.draft.options.map((option, index) => ({ en: option.en, lo: entry.qwen.options[index] })),
      explanation: { en: entry.draft.explanation.en, lo: entry.qwen.explanation ?? entry.draft.explanation.en },
    }))
    const reviewed = await timed('reviewer on the Lao that was on screen', () => reviewLao('Daily Brain Sprint: multiple-choice quiz questions for Lao students (prompt, four options, explanation). A question that tests English keeps the tested English in English.', onScreen))
    TODAY.forEach((entry, index) => {
      const result = reviewed[index]
      say(`### ${index + 1}. ${entry.draft.prompt.en}`)
      say('```')
      say(block('SHOWN ON SCREEN (Qwen, before)', `   ${entry.qwen.prompt}\n${optionLines(entry.qwen.options)}${entry.qwen.explanation ? `\n   ${entry.qwen.explanation}` : ''}`))
      say()
      say(result.rejected.length
        ? `REVIEWER: REJECTED\n${result.rejected.map(reason => `   • ${reason}`).join('\n')}`
        : 'REVIEWER: ok (it found nothing wrong)')
      say('```')
      say()
    })
  } catch (error) {
    say(`Reviewer check failed: ${failure(error)}`)
    say()
  }
  reviewLog.splice(0)
  await save()

  // --- 2. Today's five questions, translated again ------------------------
  say(`## 2. Today's 5 questions written again (strict rules, reviewer, translated again when rejected)`)
  say()
  try {
    const issues: string[] = []
    const items = await timed('Qwen translation + reviewer, 5 questions', () => translateBrainSprint(TODAY.map(entry => entry.draft), TODAY.length, issues))
    final.today.push(...items)
    TODAY.forEach((entry, index) => {
      const item = items.find(candidate => candidate.id === entry.draft.id)
      say(`### ${index + 1}. ${entry.draft.prompt.en}`)
      say('```')
      say(`English options:\n${optionLines(entry.draft.options.map(option => option.en), entry.draft.answerIndex)}\nEnglish explanation: ${entry.draft.explanation.en}`)
      say()
      say(item
        ? block('SAVED (Lao)', `   ${item.prompt.lo}\n${optionLines(item.options.map(option => option.lo), item.answerIndex)}\n   ${item.explanation.lo}`)
        : 'NOT SAVED: the question was dropped (the Forge would use a spare question)')
      const problems = issues.filter(issue => issue.startsWith(entry.draft.id))
      if (problems.length) say(`Problems found on the way:\n${problems.map(problem => `   • ${problem}`).join('\n')}`)
      say('```')
      say()
    })
  } catch (error) {
    say(`Translation failed: ${failure(error)}`)
    say()
  }
  reviewLog.splice(0)
  await save()
}

if (!Deno.args.includes('--today-only')) {
  // --- 3. Fresh Brain Sprint batches: the real pipeline --------------------
  say(`## 3. Fresh Brain Sprint batches (the real pipeline: Qwen English, Qwen Lao, reviewer)`)
  say()
  for (const batch of argValue('--batches') === 'none' ? [] : numbers(argValue('--batches'), [1, 3])) {
    console.error(`Brain Sprint batch ${batch}…`)
    try {
      const items = await timed(`batch ${batch}`, () => generateBrainSprint(batch))
      final.brain_sprint.push(...items)
      items.forEach(item => {
        say(`### Batch ${batch + 1} · ${item.prompt.en}`)
        say('```')
        say(`English options:\n${optionLines(item.options.map(option => option.en), item.answerIndex)}\nEnglish explanation: ${item.explanation.en}`)
        say()
        say(block('SAVED (Lao)', `   ${item.prompt.lo}\n${optionLines(item.options.map(option => option.lo), item.answerIndex)}\n   ${item.explanation.lo}`))
        say('```')
        say()
      })
      const notes = reviewNotes()
      if (notes) say(`Reviewer work in this batch:\n${notes}\n`)
    } catch (error) {
      say(`### Batch ${batch + 1} failed: ${failure(error)}`)
      say()
    }
    await save()
  }

  // --- 4. Fresh Word Match batches -----------------------------------------
  say(`## 4. Fresh Word Match batches (Qwen English words, Qwen Lao, reviewer)`)
  say()
  for (const batch of argValue('--word-batches') === 'none' ? [] : numbers(argValue('--word-batches'), [2])) {
    console.error(`Word Match batch ${batch}…`)
    try {
      const pairs = await timed(`word batch ${batch}`, () => generateWordMatch(batch))
      final.word_match.push(...pairs)
      say(`### Word batch ${batch + 1}`)
      say('```')
      pairs.forEach(pair => say(`${pair.english.padEnd(18)}${pair.lao}`))
      say('```')
      const notes = reviewNotes()
      if (notes) say(`Reviewer work in this batch:\n${notes}\n`)
      say()
    } catch (error) {
      say(`### Word batch ${batch + 1} failed: ${failure(error)}`)
      say()
    }
    await save()
  }
}

await save()
console.error(`\nReport: ${outPath}`)
