// Lao content reviewer. A second AI agent, separate from the one that wrote the
// Lao, reads every English/Lao pair of generated content before it is saved.
// It is a judge, not a writer: for each pair it says ok or reject (and whether
// the Lao or the English is at fault). It never writes or corrects Lao, because
// a model that is not sure of its Lao makes good Lao worse when it is allowed to
// rewrite it; a rejected text goes back to the translator, or is dropped.
// Nothing here talks to the network or the database: the model call is passed in,
// so the pairing and the way verdicts are applied can be tested offline.
import { LAO_CONTENT_RULES } from '../_shared/lao-content-standard.ts'

export type ReviewAsk = (system: string, prompt: string) => Promise<Record<string, unknown>>
export type LaoPair = { path: (string | number)[]; en: string; lo: string }
// `rejected` says what is wrong, for the translator. `englishFault`: the English itself is the problem, so a new translation cannot help.
export type Rejection = { path: (string | number)[]; en: string }
export type ReviewedUnit<T> = { value: T; rejected: string[]; englishFault: boolean; rejections: Rejection[] }

// The Lao key of a pair and the key that holds its English: lo/en, lao/english, x_lo/x_en.
const englishKeyOf = (key: string) => key === 'lo' ? 'en' : key === 'lao' ? 'english' : /_lo$/.test(key) ? key.replace(/_lo$/, '_en') : null
const isEnglishSide = (key: string, record: Record<string, unknown>) =>
  (key === 'en' && 'lo' in record) || (key === 'english' && 'lao' in record) || (/_en$/.test(key) && key.replace(/_en$/, '_lo') in record)

// English and Lao hold the same structure (a string, a list, a chapter), so
// they are walked together and every pair of texts at the same place is a pair.
// A text that is identical on both sides (English kept as English, a number,
// a url) has nothing to review.
function pairParallel(en: unknown, lo: unknown, path: (string | number)[], out: LaoPair[]) {
  if (typeof en === 'string' && typeof lo === 'string') {
    if (en.trim() && lo.trim() && en.trim() !== lo.trim() && /[A-Za-z]/.test(en)) out.push({ path, en, lo })
  } else if (Array.isArray(en) && Array.isArray(lo)) {
    for (let index = 0; index < Math.min(en.length, lo.length); index++) pairParallel(en[index], lo[index], [...path, index], out)
  } else if (en && lo && typeof en === 'object' && typeof lo === 'object') {
    for (const key of Object.keys(lo as object)) {
      if (key in (en as object)) pairParallel((en as Record<string, unknown>)[key], (lo as Record<string, unknown>)[key], [...path, key], out)
    }
  }
}

export function collectLaoPairs(value: unknown, path: (string | number)[] = [], out: LaoPair[] = []): LaoPair[] {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectLaoPairs(item, [...path, index], out))
  } else if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    for (const [key, child] of Object.entries(record)) {
      const englishKey = englishKeyOf(key)
      if (englishKey && englishKey in record) pairParallel(record[englishKey], child, [...path, key], out)
      else if (!isEnglishSide(key, record)) collectLaoPairs(child, [...path, key], out)
    }
  }
  return out
}

const pathLabel = (path: (string | number)[]) => path.map((part, index) => typeof part === 'number' ? `[${part}]` : index ? `.${part}` : part).join('')

function setAt(root: unknown, path: (string | number)[], text: string) {
  let target = root as Record<string | number, unknown>
  for (const part of path.slice(0, -1)) target = target[part] as Record<string | number, unknown>
  target[path[path.length - 1]] = text
}

// "If it does not make sense, do not translate": the rejected Lao texts are replaced by their English,
// so no Lao the reviewer refused is ever saved and nothing has to be written by the reviewer.
export function keepEnglish<T>(value: T, rejections: Rejection[]): T {
  const copy = structuredClone(value)
  for (const rejection of rejections) setAt(copy, rejection.path, rejection.en)
  return copy
}

const REVIEWER_SYSTEM = 'You are the Lao content reviewer for Bitdoin Academy, a learning app for students in Laos. You are a strict native Lao editor from Vientiane and a careful English-Lao translator. You did not write the Lao you review and you do not trust it: you check every pair against the English. You judge only: you never write or correct Lao yourself. A wrong or odd Lao sentence shown to a student is worse than English left in English. Return valid JSON only.'

const REVIEW_RULES = `REVIEW RULES (the English is the source of truth; the Lao is under review)
1. Meaning: the Lao says exactly what the English says. Nothing is added, dropped or changed (numbers, names, negations, which option is correct).
2. Sense: read the Lao the way a Lao student would. If any part does not make sense, is a word-for-word copy of English, reads like Thai, or uses a word for a different thing, it fails (for example ຕາຕະລາງ, a data table, for a table you put a book on, which is ໂຕະ).
3. No made-up transliteration: an English word spelled in Lao letters to copy its sound (apple, banana, carrot, orange, inversion, conditional…) fails. These are fine and must NOT be rejected: an established Lao loanword that Lao textbooks and speakers use (ໂທລະສັບ, ອິນເຕີເນັດ, ຄອມພິວເຕີ, ຮໍໂມນ, ໂມເລກຸນ), and a Lao term followed by the English in brackets (ເຣົາເຕີ (router), ຊື່ໂດເມນ (domain name)), which is this app's house style for technical terms.
4. English being tested (a word, phrase, idiom, sentence, a list of words, or options that are English choices) stays in English exactly as written, in the question, the options and the explanation, and is never translated or spelled in Lao letters. Only the instruction and the explanation wording is Lao. Options that are meanings of an English word or phrase are Lao.
5. Style: ທ່ານ for "you", short natural sentences, Arabic digits, Lao script only (no Thai letters or words).

VERDICT FOR EACH PAIR (you only judge; you never rewrite the Lao)
- "ok": the Lao passes every rule. A different but acceptable way of saying it is still ok.
- "reject": the Lao has a REAL error: a wrong or nonsense word, a changed meaning, a made-up transliteration, tested English that was translated, Thai, or you cannot tell what it means. Do not reject for a near-synonym, a slightly different nuance, or a different but correct way of saying it: those are ok. Say in "reason" what is wrong and what the translator should do (for example: keep 'carrot' in English; 'ໂຕະ' is the word for this table). Set "cause" to "lao" when a better Lao version, or leaving the word in English, would fix it, and to "english" when the English itself is unclear, wrong or ambiguous.
Return {"verdicts":[{"id":"same id","verdict":"ok" or "reject","cause":"lao" or "english","reason":"one short sentence, only for reject"}]}: exactly one entry for every pair, with the same ids.`

// Pairs are sent in chunks that fit one answer; the chunks are reviewed at the same time.
const CHUNK_CHARS = 9000
const CHUNK_PAIRS = 40

type Slot = { unit: number; pair: LaoPair; id: string }
type Verdict = { verdict?: unknown; cause?: unknown; reason?: unknown }

function chunkSlots(slots: Slot[]) {
  const chunks: Slot[][] = []
  let current: Slot[] = []
  let size = 0
  for (const slot of slots) {
    const length = slot.pair.en.length + slot.pair.lo.length
    if (current.length && (size + length > CHUNK_CHARS || current.length >= CHUNK_PAIRS)) {
      chunks.push(current)
      current = []
      size = 0
    }
    current.push(slot)
    size += length
  }
  if (current.length) chunks.push(current)
  return chunks
}

async function askVerdicts(ask: ReviewAsk, context: string, slots: Slot[]) {
  const answer = await ask(REVIEWER_SYSTEM, `${LAO_CONTENT_RULES}

${REVIEW_RULES}

WHAT IS BEING REVIEWED: ${context}

PAIRS (JSON)
${JSON.stringify(slots.map(slot => ({ id: slot.id, field: pathLabel(slot.pair.path), en: slot.pair.en, lo: slot.pair.lo })))}`)
  const verdicts = new Map<string, Verdict>()
  for (const entry of Array.isArray(answer.verdicts) ? answer.verdicts as Record<string, unknown>[] : []) {
    if (typeof entry?.id === 'string') verdicts.set(entry.id, entry)
  }
  return verdicts
}

// Reviews each unit (one quiz question, one word pair, one lesson…). A unit with
// a rejected pair comes back with `rejected` filled (what is wrong, for the
// translator), so the caller decides whether to translate it again, drop it or
// fail. The content itself is never changed here.
// A pair the reviewer left without a verdict is asked once more, then the whole
// review fails: content that was not reviewed is never passed on.
export async function reviewLaoUnits<T>(ask: ReviewAsk, context: string, units: T[], log: string[] = []): Promise<ReviewedUnit<T>[]> {
  const reviewed: ReviewedUnit<T>[] = units.map(value => ({ value, rejected: [], englishFault: false, rejections: [] }))
  const slots: Slot[] = reviewed.flatMap((entry, unit) => collectLaoPairs(entry.value).map((pair, index) => ({ unit, pair, id: `u${unit}p${index}` })))
  if (!slots.length) return reviewed

  const verdicts = new Map<string, Verdict>()
  const collect = async (pending: Slot[]) => {
    for (const answer of await Promise.all(chunkSlots(pending).map(chunk => askVerdicts(ask, context, chunk)))) {
      for (const [id, verdict] of answer) verdicts.set(id, verdict)
    }
  }
  await collect(slots)
  const missing = slots.filter(slot => !verdicts.has(slot.id))
  if (missing.length) await collect(missing)
  const stillMissing = slots.filter(slot => !verdicts.has(slot.id))
  if (stillMissing.length) throw new Error(`Lao review incomplete: ${stillMissing.length} of ${slots.length} texts got no verdict from the reviewer. Regenerate this step.`)

  for (const slot of slots) {
    const entry = reviewed[slot.unit]
    const verdict = verdicts.get(slot.id)!
    if (String(verdict.verdict ?? '').toLowerCase().trim() === 'ok') continue
    // Anything that is not a clear "ok" counts as a rejection.
    const reason = typeof verdict.reason === 'string' && verdict.reason.trim() ? verdict.reason.trim() : 'the reviewer did not accept this Lao'
    entry.rejected.push(`${pathLabel(slot.pair.path)} (English “${slot.pair.en.slice(0, 60)}”, Lao “${slot.pair.lo.slice(0, 80)}”): ${reason}`)
    entry.rejections.push({ path: slot.pair.path, en: slot.pair.en })
    if (String(verdict.cause ?? '').toLowerCase().trim() === 'english') entry.englishFault = true
    log.push(`rejected ${pathLabel(slot.pair.path)} “${slot.pair.lo.slice(0, 60)}”: ${reason}`)
  }
  return reviewed
}
