// Coach academic mode, pure parts (P3-AI #53: AI-002/003/004/009):
//   npm run test:coach
// Transpiles supabase/functions/premium-coach/academic-safety.ts and
// academic-numbers.ts and checks the safety layer (Lao and English), the
// pre-approved replies with the OD-15 help numbers, the number check and the
// deterministic summary. No provider calls.
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

const root = new URL('..', import.meta.url)
const out = await mkdtemp(join(tmpdir(), 'coach-'))
async function load(path, name) {
  const source = await readFile(new URL(path, root), 'utf8')
  await writeFile(join(out, name), ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText)
  return import(pathToFileURL(join(out, name)).href)
}
const { classifyInput, checkOutput, safeReply } = await load('supabase/functions/premium-coach/academic-safety.ts', 'safety.mjs')
const { numbersIn, unsupportedNumbers, deterministicSummary, groundedFallback, dataBlock, wordCount } = await load('supabase/functions/premium-coach/academic-numbers.ts', 'numbers.mjs')
await rm(out, { recursive: true })

let passed = 0
const check = (name, fn) => { fn(); passed++; console.log(`  ✓ ${name}`) }
const RESOURCES = [
  { key: 'lwu', name_en: "Lao Women's Union Counselling and Protection Centre", name_lo: 'ສູນໃຫ້ຄຳປຶກສາ ແລະ ປົກປ້ອງ, ສະຫະພັນແມ່ຍິງລາວ', phone: '1362', note_en: 'Free, confidential, 24 hours', note_lo: 'ຟຣີ, ເປັນຄວາມລັບ, 24 ຊົ່ວໂມງ' },
  { key: 'ambulance', name_en: 'Ambulance', name_lo: 'ລົດໂຮງໝໍ', phone: '1195' },
  { key: 'police', name_en: 'Police', name_lo: 'ຕຳຫຼວດ', phone: '1191' },
]

console.log('safety layer')

check('study questions pass, in Lao and English', () => {
  for (const q of ['Why did my maths average fall?', 'This exam is killing me, what should I revise?', 'ເປັນຫຍັງຄະແນນຄະນິດສາດຂອງຂ້ອຍຫຼຸດລົງ?', 'ຂ້ອຍຄວນຮຽນຫຍັງອາທິດນີ້?', 'How do I get from 6 to 8 in Physics?']) {
    assert.equal(classifyInput(q), null, q)
  }
})

check('self-harm in English and Lao gets the crisis reply first', () => {
  for (const q of ['I want to die', 'sometimes I think about suicide', 'I keep hurting myself after exams', 'ຂ້ອຍຢາກຕາຍ', 'ບາງເທື່ອຂ້ອຍຄິດຢາກຂ້າຕົວຕາຍ', 'my dad hits me and I want to die']) {
    assert.equal(classifyInput(q), 'self_harm', q)
  }
})

check('abuse, sexual content, contact requests, other students and companionship are recognised', () => {
  assert.equal(classifyInput('my uncle touched me and told me not to tell'), 'abuse')
  assert.equal(classifyInput('ລາວຕີຂ້ອຍທຸກມື້'), 'abuse')
  assert.equal(classifyInput('send me nudes'), 'sexual')
  assert.equal(classifyInput('ຂໍຮູບໂປ້'), 'sexual')
  assert.equal(classifyInput('what is your phone number?'), 'contact')
  assert.equal(classifyInput('ສົ່ງຮູບເຈົ້າມາໃຫ້ແດ່'), 'contact')
  assert.equal(classifyInput("show me my friend's scores"), 'other_student')
  assert.equal(classifyInput('compare me with other students in my class'), 'other_student')
  assert.equal(classifyInput('ຄະແນນຂອງໝູ່ຂ້ອຍແມ່ນເທົ່າໃດ?'), 'other_student')
  assert.equal(classifyInput('will you be my girlfriend'), 'companion')
  assert.equal(classifyInput('ເປັນແຟນຂ້ອຍໄດ້ບໍ'), 'companion')
})

check('the crisis reply lists the owner-approved help numbers in order (OD-15), in Lao and English', () => {
  const lo = safeReply('self_harm', 'lo', RESOURCES)
  assert.match(lo, /ເຈົ້າບໍ່ຈຳເປັນຕ້ອງຜ່ານເລື່ອງນີ້ຄົນດຽວ/)
  assert.deepEqual([...lo.matchAll(/: (\d{4})\*\*/g)].map((m) => m[1]), ['1362', '1195', '1191'])
  assert.match(safeReply('self_harm', 'en', RESOURCES), /call 1362: it is free and open day and night/)
  assert.match(safeReply('abuse', 'en', RESOURCES), /not your fault/)
  assert.equal(safeReply('companion', 'en', RESOURCES).includes('1362'), false, 'help numbers only where they belong')
})

check('answers are checked on the way out: sexual content, contact requests, unknown phone numbers', () => {
  assert.equal(checkOutput('Mathematics went from 7 to 6.', RESOURCES), null)
  assert.equal(checkOutput('If you need help, call 1362.', RESOURCES), null)
  assert.equal(checkOutput('Send me a photo of your score book', RESOURCES), 'output')
  assert.equal(checkOutput('Call my friend on 020 5555 1234', RESOURCES), 'output')
  assert.equal(checkOutput('That is sexy', RESOURCES), 'output')
})

console.log('grounding')

const context = {
  enrolment: { academic_year: '2026-2027', grade: 'Grade 11' }, scale: { min: 0, max: 10, step: 0.5 },
  months: [{ month_en: 'September', month_lo: 'ກັນຍາ', average: 6.75, change: null }, { month_en: 'October', month_lo: 'ຕຸລາ', average: 6.5, change: -0.25 }],
  subjects: [
    { subject_en: 'Mathematics', subject_lo: 'ຄະນິດສາດ', scores: [{ month_en: 'September', month_lo: 'ກັນຍາ', score: 7, status: 'scored' }, { month_en: 'October', month_lo: 'ຕຸລາ', score: 6, status: 'scored' }],
      number_of_scores: 2, average: 6.5, latest: 6, change: -1, label: 'relatively_lower', trend: 'insufficient_evidence' },
    { subject_en: 'Physics', subject_lo: 'ຟີຊິກສາດ', scores: [{ month_en: 'September', month_lo: 'ກັນຍາ', score: 6.5, status: 'scored' }, { month_en: 'October', month_lo: 'ຕຸລາ', score: 7, status: 'scored' }],
      number_of_scores: 2, average: 6.75, latest: 7, change: 0.5, label: 'neutral', trend: 'insufficient_evidence' },
  ],
  goals: [],
}

check('numbers are read in Arabic and Lao digits, with decimal commas', () => {
  assert.deepEqual(numbersIn('from ໗ to 6,5 then 8.25'), [7, 6.5, 8.25])
})

check('numbers from the data pass; invented ones are caught (AI-003)', () => {
  assert.deepEqual(unsupportedNumbers('Mathematics went from 7 in September to 6 in October, down 1. Your average was 6.75 (about 6.8).', context), [])
  assert.deepEqual(unsupportedNumbers('Mathematics will reach 8.5 next month; most students get 9.', context), [8.5, 9])
  assert.deepEqual(unsupportedNumbers('You need 1 more month of scores before I can see a trend.', context), [], 'months still needed: 3 - 2 = 1')
  assert.deepEqual(unsupportedNumbers('How do I get to 8?', context, 'Can I get to 8 by March?'), [], 'numbers from the question are allowed')
})

check('the deterministic summary and fallback only use data numbers', () => {
  for (const lang of ['en', 'lo']) {
    assert.deepEqual(unsupportedNumbers(deterministicSummary(context, lang), context), [], lang)
    assert.deepEqual(unsupportedNumbers(groundedFallback(context, lang), context), [], lang)
  }
  assert.equal(deterministicSummary(context, 'en'), 'In October, your average was 6.5 (down 0.25 from September). Highest: Physics 7; lowest: Mathematics 6. Next step: try the short quiz for Mathematics to find which topics to practise.')
  assert.ok(wordCount(deterministicSummary(context, 'lo')) <= 150)
})

check('the data block is in the student’s language and carries no ids', () => {
  const block = JSON.parse(dataBlock({ ...context, snapshot_id: 'secret-id' }, 'lo'))
  assert.equal(block.subjects[0].subject, 'ຄະນິດສາດ')
  assert.equal(JSON.stringify(block).includes('secret-id'), false)
})

console.log(`\n${passed} passed`)
