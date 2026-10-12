// Bitdoin Academy Lao content standard.
// One source for (1) the rules every AI generator puts in its prompt and
// (2) the automatic checks that reject a batch before it reaches learners.
// Human-readable version: Docs/Academy-Lao-Content-Standard.md — keep both in sync.

export const LAO_CONTENT_RULES = `LAO LANGUAGE STANDARD (mandatory)
1. Write Lao the way an educated native speaker in Laos writes for students today: short, clear, natural sentences. Never translate word-for-word from English, and never write Thai in Lao letters.
2. Use Lao script only (U+0E80–U+0EFF). No Thai letters (e.g. ร ถ ท ว ส ิ ่), no other scripts, no Spanish/other-language words (e.g. "pasado").
3. Spelling: ປຶ້ມ (not ປື້ມ), ຄອມພິວເຕີ, ອິນເຕີເນັດ, ອອນລາຍ, ດິຈິຕອນ, ເວັບໄຊ, ໂປຣແກຣມ, ຄາບອນ, ພລາສຕິກ. Do not use Thai spellings such as ຫາຣ, ປຸ່ຍ, ອອນໄລນ໌, ດິຈິຕອລ.
4. Address the learner as ທ່ານ. Keep one word for one idea across the whole set (see glossary).
5. Keep these English terms as-is in Lao text: AI, Prompt, AI Coach, XP, Pomodoro, Cornell, Outline, Mind Mapping, URL, PDF, Cloud, email, brand/product names, file names, passwords, code.
6. Numbers, money and times: Arabic digits, "ກີບ" for LAK (e.g. 80,000 ກີບ), 24-hour or "5 ໂມງແລງ".
7. Lao-context facts must be real and checkable (provinces, rivers, festivals, currency, the school year opening in September). If unsure, choose a different question — never invent a fact, date, statistic or "official" declaration.
8. Lao names: ແມ່ນ້ຳຂອງ, ນ້ຳງື່ມ, ນ້ຳເທີນ, ນ້ຳຊອງ, ເຊບັ້ງໄຟ, ນະຄອນຫຼວງວຽງຈັນ, ແຂວງຫຼວງພະບາງ, ແຂວງຊຽງຂວາງ, ບຸນປີໃໝ່ລາວ, ບຸນທາດຫຼວງ.

ENGLISH-PRACTICE QUESTIONS (grammar, vocabulary, prepositions, tenses, fill-in-the-blank, "what does X mean")
9. The English sentence being tested stays in English, inside quotes, in BOTH the English and Lao prompt. Example Lao prompt: ເລືອກຄຳບຸບພະບົດ (preposition) ທີ່ຖືກຕ້ອງ: 'She is good ___ math.'
10. For grammar, tense, preposition, fill-in-the-blank and "which English word…" questions, every option's "lo" must be exactly the same English text as its "en". Never translate the options.
11. Only the instruction and the explanation are written in Lao. In explanations, quote the English form being taught (e.g. ໃຊ້ 'did' ເພາະ 'yesterday' ບອກວ່າເປັນອະດີດ).
12. "What does 'X' mean?" questions may give Lao meanings as options, but the English word and sentence stay in English.
13. Grammar terms: preposition = ຄຳບຸບພະບົດ (preposition); past tense = ກິລິຍາອະດີດ (past tense); past participle = ກິລິຍາຮູບທີ 3 (past participle); subject = ປະທານ; verb = ຄຳກິລິຍາ. Always keep the English term in brackets.

QUESTION QUALITY
14. Exactly one option is correct; the other three are clearly wrong (no two acceptable answers, e.g. add "yesterday" when testing past tense).
15. All four options are different in BOTH languages. Options are short (under 8 words).
16. The explanation says why the answer is right in one short sentence and matches the answer.
17. Math: show the working with Lao words ຄູນ (×), ຫານ (÷), ບວກ (+), ລົບ (−); fraction = ເສດສ່ວນ, simplify = ທອນເສດສ່ວນ, greatest common factor = ຕົວຫານຮ່ວມໃຫຍ່ສຸດ.

WORD MATCH
18. "english" is a real English word/phrase in Latin letters; "lao" is its common Lao meaning in Lao script — the word a Lao teacher would write on the board.
19. Within one set, no two English entries share the same Lao meaning (e.g. course = ວິຊາຮຽນ, curriculum = ຫຼັກສູດ; aim = ເປົ້າໝາຍ, objective = ຈຸດປະສົງ).

GLOSSARY (use these exact Lao terms)
homework = ການບ້ານ; assignment = ວຽກທີ່ໄດ້ຮັບມອບໝາຍ; exam = ການສອບເສັງ; essay = ບົດຂຽນ; article = ບົດຄວາມ; pen = ປາກກາ; pencil = ດິນສອ; notebook = ປຶ້ມບັນທຶກ; critical thinking = ການຄິດວິເຄາະ; time management = ການຈັດການເວລາ; plagiarism = ການລັກລອກຜົນງານ; academic integrity = ຄວາມຊື່ສັດທາງວິຊາການ; renewable energy = ພະລັງງານທົດແທນ; pollution = ມົນລະພິດ; conservation = ການອະນຸລັກ; biodiversity = ຄວາມຫຼາກຫຼາຍທາງຊີວະພາບ; compost = ຝຸ່ນບົ່ມ; recycling = ການນຳກັບມາໃຊ້ໃໝ່; productivity = ການເພີ່ມປະສິດທິພາບ; resources = ແຫຼ່ງຮຽນຮູ້; role-play = ສວມບົດບາດ; mentor = ຜູ້ແນະນຳ; coach (person) = ຄູຝຶກ; streak = ມື້ຮຽນຕໍ່ເນື່ອງ; procrastinate = ຜັດວັນປະກັນພຸ່ງ; save money = ເກັບເງິນ; income = ລາຍໄດ້; budget = ງົບປະມານ; change (money) = ເງິນທອນ; domain name = ຊື່ໂດເມນ (domain name); backup = ສຳຮອງ (backup); phishing = ການຫຼອກລວງ (phishing).

BEFORE YOU ANSWER, CHECK: no Thai letters; every Lao sentence makes sense on its own to a Lao student; English-practice sentences and options are still in English; one correct answer; facts are true.`

// Common mistakes seen in past generated content. Matching any of these rejects the batch.
const BANNED_LAO = [
  'pasado', 'ຫາຣ', 'ປຸ່ຍ', 'ຄາດເດັກ', 'ຕົວປັກກິ່ງ', 'ຖາດຕໍ່ໄປ', 'ປື້ມ', 'ອອນໄລນ', 'ດິຈິຕອລ', 'ບົດຄຳນຳທີ່ຖືກຕ້ອງ',
  'ຊີ້ນສັມພາດ', 'ຄວາມເປັນເອກະລາດໃນການສຶກສາ', 'ພິສູດອ່ານ', 'ມື້ນເປື', 'ກິລິຍາຊ່ອງ',
]

const NON_LAO_SCRIPT = /[฀-๿඀-෿ក-៿က-႟一-鿿Ѐ-ӿ]/

export function laoTextIssues(text: string): string[] {
  const issues: string[] = []
  const foreign = text.match(NON_LAO_SCRIPT)
  if (foreign) issues.push(`non-Lao script "${foreign[0]}"`)
  for (const term of BANNED_LAO) if (text.includes(term)) issues.push(`banned term "${term}"`)
  return issues
}

const isLaoKey = (key: string) => /(?:^|_)(?:lo|lao)$/i.test(key)

// Walks any generated object and collects problems in Lao fields ("lo", "lao", "*_lo").
export function collectLaoIssues(value: unknown, path = '', inLao = false, out: string[] = []): string[] {
  if (typeof value === 'string') {
    if (inLao) for (const issue of laoTextIssues(value)) out.push(`${path}: ${issue}`)
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => collectLaoIssues(item, `${path}[${index}]`, inLao, out))
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      collectLaoIssues(child, path ? `${path}.${key}` : key, inLao || isLaoKey(key), out)
    }
  }
  return out
}

type Localized = { en: string; lo: string }
type BrainItem = { prompt: Localized; options: Localized[]; answerIndex: number; explanation: Localized }

// Quoted English practice sentence with a blank, e.g. 'She is good ___ math.'
const QUOTED_BLANK = /['‘’"“”]([^'‘’"“”]*_{2,}[^'‘’"“”]*)['‘’"“”]/
const ENGLISH_PRACTICE = /\b(preposition|grammar|tense|verb|fill|blank|correct word|correct sentence|which word|synonym|antonym|means the same)\b/i

export function brainSprintIssues(item: BrainItem, path = 'item'): string[] {
  const issues: string[] = []
  const lo = item.options.map(option => option.lo.trim())
  const en = item.options.map(option => option.en.trim().toLowerCase())
  if (new Set(lo).size !== lo.length) issues.push(`${path}: Lao options are not all different`)
  if (new Set(en).size !== en.length) issues.push(`${path}: English options are not all different`)
  const blank = item.prompt.en.match(QUOTED_BLANK)
  if (blank && !item.prompt.lo.includes(blank[1].trim())) {
    issues.push(`${path}: English practice sentence "${blank[1].trim()}" must stay in English in the Lao prompt`)
  }
  const englishOptions = item.options.every(option => /^[\x20-\x7E’‘]+$/.test(option.en))
  if ((blank || ENGLISH_PRACTICE.test(item.prompt.en)) && englishOptions && item.options.some(option => option.lo.trim() !== option.en.trim())) {
    issues.push(`${path}: English-practice options must be identical in "lo" and "en"`)
  }
  return issues
}

const normalizeEnglish = (word: string) => word.trim().toLowerCase().replace(/s$/, '')

export function wordMatchIssues(items: { english: string; lao: string }[]): string[] {
  const seen = new Map<string, string>()
  const issues: string[] = []
  for (const item of items) {
    const lao = item.lao.trim()
    const other = seen.get(lao)
    if (other && normalizeEnglish(other) !== normalizeEnglish(item.english)) issues.push(`"${other}" and "${item.english}" share the Lao meaning "${lao}"`)
    else seen.set(lao, item.english.trim())
  }
  return issues
}
