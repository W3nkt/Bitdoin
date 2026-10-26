// Safety layer for the Coach's academic mode (P3-AI #53: AI-004; OD-15).
// Pure: no Deno or network APIs, so scripts/test-coach.mjs runs it directly.
//
// Every question is checked before it reaches the model. A match never goes
// to the provider: the student gets a pre-approved reply, and for self-harm
// or abuse the help numbers from the 'safeguarding_resources' setting. Every
// answer is checked again on the way out. No persona or companionship; the
// Coach never asks for or shares contact details, photos or meetings, and
// never talks about other students.
//
// The pre-approved replies below are the owner-approved texts (Lao needs the
// owner's native-speaker review, like the other copy files).

export type SafetyCategory = 'self_harm' | 'abuse' | 'sexual' | 'contact' | 'other_student' | 'companion'
export interface Resource { key: string; name_en: string; name_lo: string; phone: string; note_en?: string; note_lo?: string }
type Lang = 'en' | 'lo'

// Capitalised words that are not people's names.
const NOT_NAMES = '(?:January|February|March|April|May|June|July|August|September|October|November|December|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Today|Yesterday|This|That|Last|Next|My|Your|Our|It|What|Which|Who|How|Why|When|Where|Can|Could|Should|Please|Show|Give|Tell|List|Share|Compare|Rank|Explain|Is|Am|Are|Did|Does|Do|The|A|An|I|Mathematics|Maths|Math|Physics|Chemistry|Biology|English|Lao|History|Geography|Grade|Term|Month|Week|Year|Bitdoin|Coach|Mentor)'

// `cased`: checked without ignoring case, for names ("Noy's scores").
const PATTERNS: Record<SafetyCategory, { en: RegExp; lo: string[]; cased?: RegExp }> = {
  self_harm: {
    en: /\b(kill(ing)? myself|suicid\w*|end(ing)? (my life|it all)|want(ed)? to die|wanna die|don'?t want to (live|be alive)|hurt(ing)? myself|self[- ]?harm\w*|cut(ting)? myself|no reason to live|better off dead|better off without me|(no ?one|nobody) would (miss|care about) me)\b/i,
    lo: ['ຂ້າຕົວຕາຍ', 'ຂ້າໂຕຕາຍ', 'ຢາກຕາຍ', 'ທຳຮ້າຍຕົວເອງ', 'ທຳຮ້າຍໂຕເອງ', 'ບໍ່ຢາກມີຊີວິດ', 'ຈົບຊີວິດ', 'ກິນຢາຕາຍ', 'ບໍ່ຢາກມີຊີວິດຢູ່', 'ຖ້າບໍ່ມີຂ້ອຍ', 'ບໍ່ມີໃຜຄິດຮອດຂ້ອຍ'],
  },
  abuse: {
    en: /\b(hits? me|beats? me|beat me up|abus(e|es|ed|ing) me|touch(ed|es|ing) me|rap(e|ed|ing)|molest\w*|sexually assault\w*|threaten(s|ed|ing)? (me|to)|forc(e|es|ed) me)\b/i,
    lo: ['ຕີຂ້ອຍ', 'ທຸບຕີ', 'ຂົ່ມຂືນ', 'ລ່ວງລະເມີດ', 'ຂົ່ມຂູ່ຂ້ອຍ', 'ທຳຮ້າຍຂ້ອຍ', 'ບັງຄັບຂ້ອຍ', 'ຈັບບາຍ'],
  },
  sexual: {
    en: /\b(sex|sexy|sexual|porn\w*|nude|nudes|naked|nsfw|horny|xxx)\b/i,
    lo: ['ເພດສຳພັນ', 'ຮູບໂປ້', 'ລາມົກ', 'ເປືອຍ', 'ມີເພດ', 'ຮ່ວມເພດ'],
  },
  contact: {
    en: /\b(your (phone|number|address|photo|picture|whatsapp|facebook|line)|send (me )?(a |your )?(photo|pic|picture|selfie|nudes?)|meet (me|up|in person)|where do you live|give me your (number|contact))\b/i,
    lo: ['ເບີໂທຂອງເຈົ້າ', 'ສົ່ງຮູບ', 'ນັດພົບ', 'ພົບກັນບໍ', 'ເຈົ້າຢູ່ໃສ', 'ຂໍເບີ'],
  },
  other_student: {
    en: /\b(other students?'? (scores?|grades?|marks?|results?)|(my )?(friend|classmate|sister|brother|child|son|daughter|kid)['’]?s? (scores?|grades?|marks?|results?)|someone else'?s|another student|(rank|compare) me (with|to|against) (others|my class|other students)|who (is|was) (top|best|first) in (my|the) class|i(['’]m| am) (the |a |an |his |her |their |\w+['’]s )?(teacher|admin\w*|parent|mother|father|mom|mum|dad|guardian|principal)|pretend (you(['’]re| are)|to be) (an? |the )?(admin\w*|teacher|developer|principal))\b/i,
    lo: ['ຄະແນນຂອງໝູ່', 'ຄະແນນໝູ່', 'ນັກຮຽນຄົນອື່ນ', 'ຄະແນນຄົນອື່ນ', 'ທຽບກັບໝູ່', 'ໃຜໄດ້ທີ່ໜຶ່ງ', 'ຄະແນນຂອງເພື່ອນ', 'ຄະແນນເພື່ອນ', 'ຄະແນນຂອງເອື້ອຍ', 'ຄະແນນຂອງອ້າຍ', 'ຄະແນນຂອງນ້ອງ', 'ຄະແນນລູກຂ້ອຍ', 'ຂ້ອຍເປັນພໍ່ແມ່', 'ຂ້ອຍແມ່ນຄູ', 'ຂ້ອຍເປັນຄູ', 'ທຳທ່າເປັນຜູ້ດູແລ'],
    // A name's scores ("Noy's scores", "did Noy get"), but not "October's average".
    cased: new RegExp(`\\b(?!${NOT_NAMES}\\b)[A-Z][a-z]+['’]s ([A-Za-z]+ ){0,2}(scores?|grades?|marks?|results?|average|data|report)\\b|\\b(did|does|has|is) (?!${NOT_NAMES}\\b)[A-Z][a-z]+ (get|gets|got|score|scored|do|doing|pass|fail)\\b`),
  },
  companion: {
    en: /\b(be my (girl ?friend|boy ?friend|gf|bf|partner|lover|wife|husband)|i love you|date me|marry me|kiss me)\b/i,
    lo: ['ເປັນແຟນ', 'ຮັກເຈົ້າ', 'ແຕ່ງງານກັບ', 'ຈູບ'],
  },
}

// Order matters: a message about self-harm and something else gets the crisis reply.
const ORDER: SafetyCategory[] = ['self_harm', 'abuse', 'sexual', 'contact', 'other_student', 'companion']

export function classifyInput(text: string): SafetyCategory | null {
  const value = text.normalize('NFC')
  return ORDER.find((category) => PATTERNS[category].en.test(value) || PATTERNS[category].cased?.test(value) || PATTERNS[category].lo.some((word) => value.includes(word))) ?? null
}

/**
 * The answer on its way out: sexual content, asking for contact details or
 * photos, or a phone-like number that is not one of the help numbers.
 */
export function checkOutput(text: string, resources: Resource[]): 'output' | null {
  const value = text.normalize('NFC')
  if (PATTERNS.sexual.en.test(value) || PATTERNS.sexual.lo.some((word) => value.includes(word))) return 'output'
  if (PATTERNS.contact.en.test(value) || PATTERNS.contact.lo.some((word) => value.includes(word))) return 'output'
  const allowed = new Set(resources.map((r) => r.phone.replace(/\D/g, '')))
  for (const match of value.replace(/[໐-໙]/g, (d) => String(d.charCodeAt(0) - 0x0ed0)).matchAll(/\+?\d[\d\s-]{5,}\d/g)) {
    if (!allowed.has(match[0].replace(/\D/g, ''))) return 'output'
  }
  return null
}

/**
 * AI-002: an answer that gives scores to a person named in the question
 * ("Souksavanh's scores are…", "Souksavanh got 6"). The model only has the
 * signed-in student's data, so this would be their own scores under someone
 * else's name; the caller replaces it with the other_student reply. Names are
 * recognised by capital letters, so this covers English only.
 */
export function attributesToOther(answer: string, question: string): boolean {
  const names = [...new Set(question.match(new RegExp(`\\b(?!${NOT_NAMES}\\b)[A-Z][a-z]{2,}\\b`, 'g')) ?? [])]
  return names.some((name) => new RegExp(`\\b${name}(['’]s\\b| (got|gets|scored|scores|has|had|received|is getting|was)\\b)`).test(answer))
}

const REPLIES: Record<SafetyCategory | 'output', Record<Lang, string>> = {
  self_harm: {
    en: 'You don’t have to deal with this alone. If you are in danger right now, call 1195. To talk to someone in confidence, call 1362: it is free and open day and night. Talking to a parent, teacher or adult you trust can help too.',
    lo: 'ເຈົ້າບໍ່ຈຳເປັນຕ້ອງຜ່ານເລື່ອງນີ້ຄົນດຽວ. ຖ້າເຈົ້າຢູ່ໃນອັນຕະລາຍດຽວນີ້, ໃຫ້ໂທ 1195. ຖ້າຢາກລົມກັບໃຜຜູ້ໜຶ່ງແບບເປັນຄວາມລັບ, ໃຫ້ໂທ 1362: ຟຣີ ແລະ ເປີດທັງກາງເວັນ ແລະ ກາງຄືນ. ການລົມກັບພໍ່ແມ່, ຄູ ຫຼື ຜູ້ໃຫຍ່ທີ່ເຈົ້າໄວ້ໃຈ ກໍຊ່ວຍໄດ້ເຊັ່ນກັນ.',
  },
  abuse: {
    en: 'What you describe is not okay, and it is not your fault. You deserve to be safe. If you are in danger right now, call 1191 (police) or 1195 (ambulance). To talk to someone in confidence, call 1362: it is free and open day and night. You can also tell a teacher or an adult you trust.',
    lo: 'ສິ່ງທີ່ເຈົ້າເລົ່າມາ ບໍ່ຖືກຕ້ອງ ແລະ ບໍ່ແມ່ນຄວາມຜິດຂອງເຈົ້າ. ເຈົ້າຄວນໄດ້ຮັບຄວາມປອດໄພ. ຖ້າເຈົ້າຢູ່ໃນອັນຕະລາຍດຽວນີ້, ໃຫ້ໂທ 1191 (ຕຳຫຼວດ) ຫຼື 1195 (ລົດໂຮງໝໍ). ຖ້າຢາກລົມກັບໃຜຜູ້ໜຶ່ງແບບເປັນຄວາມລັບ, ໃຫ້ໂທ 1362: ຟຣີ ແລະ ເປີດທັງກາງເວັນ ແລະ ກາງຄືນ. ເຈົ້າຍັງສາມາດບອກຄູ ຫຼື ຜູ້ໃຫຍ່ທີ່ເຈົ້າໄວ້ໃຈໄດ້.',
  },
  sexual: {
    en: 'I can’t help with that. I’m here for your studies: ask me about your scores or what to practise next.',
    lo: 'ຂ້ອຍຊ່ວຍເລື່ອງນັ້ນບໍ່ໄດ້. ຂ້ອຍຢູ່ນີ້ເພື່ອການຮຽນຂອງເຈົ້າ: ຖາມຂ້ອຍກ່ຽວກັບຄະແນນ ຫຼື ສິ່ງທີ່ຄວນຝຶກຕໍ່ໄປໄດ້.',
  },
  contact: {
    en: 'I don’t ask for or share phone numbers, addresses or photos, and I can’t meet anyone. Let’s keep to your studies here.',
    lo: 'ຂ້ອຍບໍ່ຂໍ ແລະ ບໍ່ແບ່ງປັນເບີໂທ, ທີ່ຢູ່ ຫຼື ຮູບ, ແລະ ຂ້ອຍນັດພົບໃຜບໍ່ໄດ້. ມາລົມກັນເລື່ອງການຮຽນຢູ່ບ່ອນນີ້ເທາະ.',
  },
  other_student: {
    en: 'I can only see your own scores, so I can’t talk about other students. I’m happy to explain yours: what would you like to know?',
    lo: 'ຂ້ອຍເຫັນແຕ່ຄະແນນຂອງເຈົ້າເອງ, ສະນັ້ນຂ້ອຍລົມເລື່ອງນັກຮຽນຄົນອື່ນບໍ່ໄດ້. ຂ້ອຍຍິນດີອະທິບາຍຄະແນນຂອງເຈົ້າ: ເຈົ້າຢາກຮູ້ຫຍັງ?',
  },
  companion: {
    en: 'I’m your study coach, not a friend or partner, but I’m glad to help with your studies. What would you like to look at?',
    lo: 'ຂ້ອຍເປັນຄູຝຶກການຮຽນຂອງເຈົ້າ, ບໍ່ແມ່ນໝູ່ ຫຼື ແຟນ, ແຕ່ຂ້ອຍຍິນດີຊ່ວຍເລື່ອງການຮຽນ. ເຈົ້າຢາກເບິ່ງຫຍັງ?',
  },
  output: {
    en: 'Sorry, I couldn’t give a safe answer to that. Please ask about your own scores or what to study next.',
    lo: 'ຂໍໂທດ, ຂ້ອຍບໍ່ສາມາດໃຫ້ຄຳຕອບທີ່ປອດໄພສຳລັບເລື່ອງນັ້ນໄດ້. ກະລຸນາຖາມກ່ຽວກັບຄະແນນຂອງເຈົ້າ ຫຼື ສິ່ງທີ່ຄວນຮຽນຕໍ່ໄປ.',
  },
}

/** The pre-approved reply; self-harm and abuse add the help numbers (OD-15). */
export function safeReply(category: SafetyCategory | 'output', lang: Lang, resources: Resource[]): string {
  const text = REPLIES[category][lang]
  if (category !== 'self_harm' && category !== 'abuse') return text
  const lines = resources.map((r) => `- **${lang === 'lo' ? r.name_lo : r.name_en}: ${r.phone}**${(lang === 'lo' ? r.note_lo : r.note_en) ? ` (${lang === 'lo' ? r.note_lo : r.note_en})` : ''}`)
  return `${text}\n\n${lines.join('\n')}`
}
