// deno test supabase/functions/_shared/lao-content-standard.test.ts
import { hasEnglishPracticeOptions, isMeaningQuestion, quotedEnglish, quotedEnglishIssues } from './lao-content-standard.ts'

const same = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
}

const item = (promptEn: string, promptLo: string, explanationEn = 'x', explanationLo = 'x', options: string[] = ['a', 'b', 'c', 'd']) => ({
  prompt: { en: promptEn, lo: promptLo },
  explanation: { en: explanationEn, lo: explanationLo },
  options: options.map(en => ({ en, lo: en })),
})

Deno.test('finds quoted English, straight or curly, and keeps apostrophes inside words', () => {
  same(quotedEnglish("What does 'Keep your cool' mean?"), ['Keep your cool'])
  same(quotedEnglish('What does ‘light’ mean in: ‘She turned on the light.’?'), ['light', 'She turned on the light.'])
  same(quotedEnglish("Complete: 'Don't worry about it.'"), ["Don't worry about it."])
  same(quotedEnglish("What is 24 × 15? Use '15' and ' '"), [])
})

Deno.test('a translated quoted sentence is rejected, a kept one passes', () => {
  const english = "What does 'light' mean in the sentence: 'She turned on the light.'?"
  same(quotedEnglishIssues(item(english, "'light' ໃນປະໂຫຍກ 'ນາງເປີດໄຟ.' ໝາຍເຖິງຫຍັງ?"), { optionsStayEnglish: false }).length, 1)
  same(quotedEnglishIssues(item(english, "'light' ໃນປະໂຫຍກ: 'She turned on the light.' ໝາຍເຖິງຫຍັງ?"), { optionsStayEnglish: false }), [])
})

Deno.test('curly and straight quotes count as the same text', () => {
  same(quotedEnglishIssues(item("What does 'keep your cool' mean?", 'ຄຳວ່າ ‘keep your cool’ ໝາຍເຖິງຫຍັງ?'), { optionsStayEnglish: false }), [])
})

Deno.test('English quoted in the explanation must stay only when it comes from the question', () => {
  const prompt = "Choose the correct word: 'She ___ to school yesterday.'"
  same(quotedEnglishIssues(item(prompt, "ເລືອກຄຳທີ່ຖືກຕ້ອງ: 'She ___ to school yesterday.'", "Use 'yesterday' to show the past.", "ໃຊ້ 'ມື້ວານ' ເພື່ອບອກອະດີດ."), { optionsStayEnglish: false }).length, 1)
  // A quoted meaning that is not in the question may be translated.
  same(quotedEnglishIssues(item("What does 'keep your cool' mean?", "'keep your cool' ໝາຍເຖິງຫຍັງ?", "It means 'to stay calm'.", "ໝາຍເຖິງ 'ການຮັກສາຄວາມສະຫງົບ'."), { optionsStayEnglish: false }), [])
})

Deno.test('English words listed in the question must stay English when they are the options', () => {
  const options = ['carrot', 'orange', 'apple', 'banana']
  const english = 'Which word does not belong with the others: apple, banana, carrot, orange?'
  same(quotedEnglishIssues(item(english, 'ຄຳໃດບໍ່ເຂົ້າພວກ: ໝາກແອັບເປິ້ນ, ກ້ວຍ, ແຄລອດ, ໝາກກ້ຽງ?', 'x', 'x', options), { optionsStayEnglish: true }).length, 4)
  same(quotedEnglishIssues(item(english, 'ຄຳໃດບໍ່ເຂົ້າພວກ: apple, banana, carrot, orange?', 'x', 'x', options), { optionsStayEnglish: true }), [])
})

Deno.test('a "what does X mean" question has Lao options; choosing between English words keeps them English', () => {
  for (const meaning of ["What does 'take off' mean when used about a plane?", "The word 'robot' comes from a Czech word meaning what?", "What does 'light' mean in the sentence: 'He turned on the light.'?"]) {
    same(isMeaningQuestion(meaning), true)
  }
  for (const choice of ["Which word means the same as 'happy'?", "Choose the correct word: 'She ___ to school yesterday.'", 'Which word does not belong with the others: apple, banana, carrot, orange?', 'What is 24 × 15?']) {
    same(isMeaningQuestion(choice), false)
  }
  const options = ['on', 'at', 'to', 'of'].map(en => ({ en, lo: '' }))
  const draft = (en: string) => ({ prompt: { en, lo: '' }, options, answerIndex: 0, explanation: { en: 'x', lo: '' } })
  same(hasEnglishPracticeOptions(draft("Choose the correct preposition: 'The cat is ___ the table.'")), true)
  same(hasEnglishPracticeOptions(draft("What does the verb 'run' mean in 'run a company'?")), false)
})
