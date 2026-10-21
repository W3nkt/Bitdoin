// Weekly Content Forge generators: prompts, Qwen calls and the checks that
// reject bad items. No database access here, so the edge function and a local
// preview script run exactly the same generation code.
import { LAO_CONTENT_RULES, brainSprintIssues, collectLaoIssues, repairBrainSprintItem, repairLaoFields, wordMatchIssues } from '../_shared/lao-content-standard.ts'

const positiveInt = (name: string, fallback: number) => {
  const value = Number(Deno.env.get(name))
  return Number.isInteger(value) && value > 0 ? value : fallback
}

const QWEN_API_KEY = Deno.env.get('QWEN_API_KEY') ?? ''
const QWEN_BASE_URL = (Deno.env.get('QWEN_BASE_URL') ?? 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1').replace(/\/$/, '')
// Lessons, mentor, role-play and prompts need the stronger model; the short
// quiz and vocabulary batches use a faster one.
export const MODEL = Deno.env.get('QWEN_CONTENT_MODEL') ?? Deno.env.get('QWEN_TEXT_MODEL') ?? 'qwen-plus'
export const FAST_MODEL = Deno.env.get('QWEN_FAST_MODEL') ?? 'qwen-flash'

// Qwen answers are streamed, so a long but healthy answer is never cut off.
// A step fails only when Qwen goes silent, or when it would outlive the
// Edge Function's 150s background limit.
const QWEN_IDLE_TIMEOUT_MS = positiveInt('ACADEMY_QWEN_IDLE_TIMEOUT_MS', 30_000)
const QWEN_FIRST_TOKEN_TIMEOUT_MS = positiveInt('ACADEMY_QWEN_FIRST_TOKEN_TIMEOUT_MS', 60_000)
const QWEN_TOTAL_TIMEOUT_MS = positiveInt('ACADEMY_QWEN_TOTAL_TIMEOUT_MS', 110_000)

// 35 Brain Sprint questions and 42 Word Match pairs per week, in small batches
// so every request finishes well inside the time limit.
export const BRAIN_SPRINT_BATCHES = 7
export const BRAIN_SPRINT_BATCH_SIZE = 5
// Extra items asked for per batch, so a few rejected ones don't fail it.
const BRAIN_SPRINT_SPARE_ITEMS = 3
export const WORD_MATCH_BATCHES = 6
export const WORD_MATCH_BATCH_SIZE = 7
const WORD_MATCH_SPARE_ITEMS = 4

export const READING_SUMMARY_SLUG = 'reading-summaries'
export const SCHOLARSHIP_SLUG = 'scholarships'
export const BOOK_CHAPTERS = 6

function parseObject(content: string) {
  if (!content.trim()) throw new Error('Empty answer: Qwen returned no content.')
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  try {
    return JSON.parse(cleaned) as Record<string, unknown>
  } catch {
    throw new Error('Invalid JSON: Qwen returned content that could not be read.')
  }
}

// One streamed attempt. Retries are handled by the task queue with a backoff,
// so a failing request is never immediately repeated with the same size.
export async function askQwen(prompt: string, options: { maxTokens: number; model?: string; enableSearch?: boolean; forceSearch?: boolean }) {
  const controller = new AbortController()
  let abortReason = ''
  let idleTimer: ReturnType<typeof setTimeout> | undefined
  const armIdle = (ms: number) => {
    clearTimeout(idleTimer)
    idleTimer = setTimeout(() => {
      abortReason = `Timed out: Qwen sent nothing for ${Math.round(ms / 1000)}s.`
      controller.abort()
    }, ms)
  }
  const totalTimer = setTimeout(() => {
    abortReason = `Timed out: Qwen did not finish within ${Math.round(QWEN_TOTAL_TIMEOUT_MS / 1000)}s.`
    controller.abort()
  }, QWEN_TOTAL_TIMEOUT_MS)

  try {
    armIdle(QWEN_FIRST_TOKEN_TIMEOUT_MS)
    const response = await fetch(`${QWEN_BASE_URL}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${QWEN_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options.model ?? MODEL,
        messages: [
          { role: 'system', content: 'You are the senior curriculum editor for Bitdoin Academy in Laos. Research current, reliable information when relevant. Create safe, original, practical bilingual learning content. Return valid JSON only.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        ...(options.enableSearch ? { enable_search: true, ...(options.forceSearch ? { search_options: { forced_search: true } } : {}) } : {}),
        enable_thinking: false,
        temperature: 0.6,
        max_tokens: options.maxTokens,
        stream: true,
      }),
    })
    if (!response.ok) {
      const result = await response.json().catch(() => null)
      const message = result?.error?.message ?? `Qwen request failed (${response.status}).`
      throw new Error(response.status === 429 ? `Rate limited: ${message}` : message)
    }
    if (!response.body) throw new Error('Empty answer: Qwen returned no stream.')

    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
    let buffer = ''
    let content = ''
    let finishReason: string | null = null
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      armIdle(QWEN_IDLE_TIMEOUT_MS)
      buffer += value
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        if (!data || data === '[DONE]') continue
        let chunk: { error?: { message?: string }; choices?: Array<{ delta?: { content?: string }; finish_reason?: string | null }> }
        try {
          chunk = JSON.parse(data)
        } catch {
          continue
        }
        if (chunk.error) throw new Error(chunk.error.message ?? 'Qwen reported an error while writing.')
        const choice = chunk.choices?.[0]
        content += choice?.delta?.content ?? ''
        if (choice?.finish_reason) finishReason = choice.finish_reason
      }
    }
    if (finishReason === 'length') throw new Error('Too long: Qwen ran out of output space before finishing.')
    return parseObject(content)
  } catch (error) {
    if (controller.signal.aborted) throw new Error(abortReason || 'Timed out: the Qwen request was stopped.')
    throw error
  } finally {
    clearTimeout(totalTimer)
    clearTimeout(idleTimer)
  }
}

export function requireArray(result: Record<string, unknown>, key: string, count: number) {
  const value = result[key]
  if (!Array.isArray(value) || value.length !== count) {
    throw new Error(`Wrong shape: Qwen returned ${Array.isArray(value) ? value.length : 'no'} ${key} (expected ${count}).`)
  }
  return value as Record<string, unknown>[]
}

// Swaps stray Thai vowel/tone marks for their Lao twins, then throws (so the
// queue retries the step) when the content still breaks the Lao content standard.
export function enforceLaoStandard<T>(value: T, extraIssues: string[] = []): T {
  const repaired = repairLaoFields(value)
  const issues = [...collectLaoIssues(repaired), ...extraIssues]
  if (issues.length) throw new Error(`Lao content standard failed: ${issues.slice(0, 5).join('; ')}. Regenerate this batch.`)
  return repaired
}

export const bilingualRules = `Every learner-facing text field must have natural English and natural Lao. Lao must use Lao script, not transliteration, and must not contain Thai script or Thai wording. For English grammar or vocabulary questions, keep the English target words and example sentences unchanged in the Lao version whenever translating them would defeat the learning objective; translate the instructions and explanations into natural Lao. Avoid invented facts, unsafe advice, cheating, politics, gambling, and financial promises. Content must be useful for secondary-school and university-age learners in Laos.
${LAO_CONTENT_RULES}`

// A failed item is written again on its own (not the whole step), but only
// while a new request can still finish inside the step's time limit.
const ITEM_ATTEMPTS = 3
const ITEM_RETRY_WINDOW_MS = 45_000

export async function withRetry<T>(label: string, stepStartedAt: number, write: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await write()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (attempt >= ITEM_ATTEMPTS || Date.now() - stepStartedAt > ITEM_RETRY_WINDOW_MS) throw new Error(`${label}: ${message}`)
      console.warn(`[academy-forge] ${label} attempt ${attempt} failed, writing it again: ${message}`)
    }
  }
}

// ---------------------------------------------------------------------------
// Daily Brain Sprint
// ---------------------------------------------------------------------------

type Localized = { en: string; lo: string }
export type BrainSprintItem = { id: string; topic?: string; prompt: Localized; options: Localized[]; answerIndex: number; explanation: Localized }
export type WordMatchItem = { id: string; english: string; lao: string }

const isLocalizedText = (value: unknown) => {
  const text = value as { en?: unknown; lo?: unknown } | null
  return typeof text?.en === 'string' && typeof text?.lo === 'string' && text.en.trim() !== '' && text.lo.trim() !== ''
}

const isBrainSprintShape = (value: Record<string, unknown>) =>
  typeof value.id === 'string' && isLocalizedText(value.prompt) && isLocalizedText(value.explanation)
  && Array.isArray(value.options) && value.options.length === 4 && value.options.every(isLocalizedText)
  && Number.isInteger(value.answerIndex) && (value.answerIndex as number) >= 0 && (value.answerIndex as number) <= 3

// Each batch leans on one theme so the week's 35 questions spread across all of them.
const BRAIN_SPRINT_FOCUS = [
  'quick math tricks and mental-math shortcuts (e.g. multiply by 11, square numbers ending in 5, quick percentages, divisibility rules): the question applies the trick and the explanation teaches it',
  'English grammar (tenses, prepositions, articles, conditionals, word order, countable/uncountable nouns): the tested sentence and options stay in English',
  'technology and how everyday tech works (phones, internet, Wi-Fi, GPS, batteries, AI, cameras, computers)',
  'English vocabulary and usage: word meanings, collocations, idioms, phrasal verbs, commonly confused words, interesting word origins',
  'science and interesting world knowledge (space, the human body, animals, physics, geography records, famous discoveries)',
  'innovations and inventions that changed the world, and the idea behind each',
  'a mix of logic puzzles, number patterns, English grammar and technology',
]

const BRAIN_SPRINT_OFF_LIMITS = 'Never ask about customs, traditions, festivals, religious ceremonies, public holidays, national days, school calendars or dates of local events, of Laos or any other country (no "When is Lao New Year?", no "Which month does the Lao school year start?"). No politics, no trivia that only tests memorizing a date. Prefer well-established facts; never claim something is the "latest" or "newest", since that changes.'

// Questions about customs, festivals and calendars are not what Brain Sprint is for.
const OFF_TOPIC_EN = /\b(festivals?|new year|pi mai|boun|bun|traditions?|traditional|customs?|ceremon(y|ies)|holidays?|national day|independence day|school year|academic year|semester start|religious|monks?|temples?|baci|that luang)\b/i
const OFF_TOPIC_LO = /ບຸນ|ປະເພນີ|ຮີດຄອງ|ຮິດຄອງ|ພິທີ|ວັນຊາດ|ສົກຮຽນ|ເປີດຮຽນ|ປີໃໝ່ລາວ|ບາສີ|ສູ່ຂວັນ/

export function brainSprintTopicIssues(item: BrainSprintItem, path = 'item'): string[] {
  const text = `${item.prompt.en} ${item.explanation.en}`
  const lao = `${item.prompt.lo} ${item.explanation.lo}`
  return OFF_TOPIC_EN.test(text) || OFF_TOPIC_LO.test(lao) ? [`${path}: off-topic (customs, festivals or calendar dates)`] : []
}

const normalizeText = (value: string) => value.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
const FILLER_WORDS = new Set(['what', 'which', 'who', 'when', 'where', 'why', 'how', 'the', 'and', 'for', 'are', 'was', 'does', 'did', 'this', 'that', 'with', 'from', 'into', 'its', 'can', 'you', 'your', 'use', 'used', 'using', 'most', 'best', 'first'])
// Numbers count, so "43 × 11" and "52 × 11" are different questions.
const contentWords = (value: string) => new Set(normalizeText(value).split(' ').filter(word => /\d/.test(word) || (word.length > 2 && !FILLER_WORDS.has(word))))

// Two questions are duplicates when they share a topic, or when most of their
// meaningful words are the same (a reworded copy of the same question).
function isSameQuestion(a: BrainSprintItem, b: BrainSprintItem) {
  if (a.topic && b.topic && normalizeText(a.topic) === normalizeText(b.topic)) return true
  const wordsA = contentWords(a.prompt.en)
  const wordsB = contentWords(b.prompt.en)
  if (Math.min(wordsA.size, wordsB.size) < 4) return normalizeText(a.prompt.en) === normalizeText(b.prompt.en)
  const shared = [...wordsA].filter(word => wordsB.has(word)).length
  return shared / Math.min(wordsA.size, wordsB.size) >= 0.8
}

// Asks for a few spare questions, repairs the obvious slips (Thai vowel marks,
// translated English-practice options) and drops any question that still breaks
// the Lao standard, is off-topic, or repeats one already in this week's pool —
// every learner's daily set is a slice of the pool, so a unique pool means no
// repeated question within a day.
export async function generateBrainSprint(batchIndex: number, existing: BrainSprintItem[] = []) {
  const requested = BRAIN_SPRINT_BATCH_SIZE + BRAIN_SPRINT_SPARE_ITEMS
  const avoid = existing.map(item => `- ${item.topic ? `[${item.topic}] ` : ''}${item.prompt.en}`).join('\n')
  const result = await askQwen(`Prepare part ${batchIndex + 1} of ${BRAIN_SPRINT_BATCHES} of a weekly Daily Brain Sprint quiz. ${bilingualRules}
Theme of this part: ${BRAIN_SPRINT_FOCUS[batchIndex % BRAIN_SPRINT_FOCUS.length]}.
Brain Sprint is about innovations, technology, English grammar and vocabulary, interesting knowledge and quick math tricks: each question should teach the learner something new and useful. ${BRAIN_SPRINT_OFF_LIMITS}
Every question must have a different topic from every other question, including the ones already in this week's set below.
Return {"items":[${requested} items]}. Each item: {"id":"unique-kebab-slug","topic":"the specific idea tested, 2-5 words, e.g. 'multiplying by 11' or 'how GPS finds location' (not a broad theme like 'math')","prompt":{"en":"","lo":""},"options":[exactly 4 {"en":"","lo":""}],"answerIndex":0,"explanation":{"en":"one short sentence","lo":"one short sentence"}}. Keep every option under 8 words. Be concise.

ALREADY IN THIS WEEK'S SET (do not repeat these topics or questions)
${avoid || '(none)'}`, { maxTokens: 4000, model: FAST_MODEL })
  const raw = Array.isArray(result.items) ? result.items as Record<string, unknown>[] : []
  const issues: string[] = []
  const kept: BrainSprintItem[] = []
  raw.forEach((value, index) => {
    if (!value || typeof value !== 'object' || !isBrainSprintShape(value)) return void issues.push(`items[${index}]: wrong shape`)
    const item = repairBrainSprintItem(value as unknown as BrainSprintItem)
    const itemIssues = [
      ...collectLaoIssues(item, `items[${index}]`), ...brainSprintIssues(item, `items[${index}]`), ...brainSprintTopicIssues(item, `items[${index}]`),
    ]
    const repeated = [...existing, ...kept].find(other => other.id.replace(/^b\d+-/, '') === item.id || isSameQuestion(other, item))
    if (repeated) itemIssues.push(`items[${index}]: repeats "${repeated.prompt.en}"`)
    if (itemIssues.length) return void issues.push(...itemIssues)
    kept.push(item)
  })
  const checked = kept.length >= BRAIN_SPRINT_BATCH_SIZE ? await keepUnambiguous(kept, issues) : kept
  if (checked.length < BRAIN_SPRINT_BATCH_SIZE) {
    throw new Error(`Brain Sprint check failed: only ${checked.length} of ${raw.length} questions passed (need ${BRAIN_SPRINT_BATCH_SIZE}): ${issues.slice(0, 5).join('; ')}. Regenerate this batch.`)
  }
  if (issues.length) console.warn(`[academy-forge] brain_sprint-${batchIndex}: dropped ${raw.length - checked.length} question(s): ${issues.slice(0, 5).join('; ')}`)
  return checked.slice(0, BRAIN_SPRINT_BATCH_SIZE).map(item => ({ ...item, id: `b${batchIndex + 1}-${item.id}` }))
}

// A second model answers each question without the answer key. A question it
// answers differently, or where more than one option fits, has a wrong or
// ambiguous key and is dropped.
async function keepUnambiguous(items: BrainSprintItem[], issues: string[]) {
  const result = await askQwen(`Answer these multiple-choice questions. For each, give the index (0-3) of the single best option, and set "ambiguous" to true when more than one option is acceptable or none is correct.
${items.map((item, index) => `${index}. ${item.prompt.en}\n${item.options.map((option, optionIndex) => `   ${optionIndex}) ${option.en}`).join('\n')}`).join('\n')}
Return {"answers":[${items.length} {"index":0-3,"ambiguous":false}]} in the same order.`, { maxTokens: 800 })
  const answers = Array.isArray(result.answers) ? result.answers as { index?: unknown; ambiguous?: unknown }[] : []
  if (answers.length !== items.length) return items
  return items.filter((item, index) => {
    const answer = answers[index]
    if (Number(answer?.index) === item.answerIndex && answer?.ambiguous !== true) return true
    issues.push(`"${item.prompt.en}": answer key "${item.options[item.answerIndex].en}" ${answer?.ambiguous === true ? 'is not the only acceptable option' : `disagrees with an independent answer "${item.options[Number(answer?.index)]?.en}"`}`)
    return false
  })
}

// ---------------------------------------------------------------------------
// Word Match
// ---------------------------------------------------------------------------

const LATIN_WORD = /^[A-Za-z][A-Za-z'’.\- ]{0,39}$/
const LAO_SCRIPT = /[຀-໿]/
const normalizeEnglish = (word: string) => word.trim().toLowerCase().replace(/s$/, '')

// Like Brain Sprint: spare pairs, and any pair whose English word or Lao meaning
// is already in this week's pool is dropped, so no word repeats within a day.
// One theme per batch, so the week's words cover different parts of life
// instead of repeating the study words of the Lao glossary.
const WORD_MATCH_THEMES = [
  'technology and the internet', 'science and nature', 'work and careers',
  'health and the human body', 'travel, places and transport', 'feelings, character and relationships',
]

export async function generateWordMatch(batchIndex: number, existing: WordMatchItem[] = []) {
  const requested = WORD_MATCH_BATCH_SIZE + WORD_MATCH_SPARE_ITEMS
  const result = await askQwen(`Prepare part ${batchIndex + 1} of ${WORD_MATCH_BATCHES} of a weekly Word Match set. ${bilingualRules}
Theme of this part: ${WORD_MATCH_THEMES[batchIndex % WORD_MATCH_THEMES.length]}. Choose common, useful words at secondary-school level (single words preferred, at most 2-word phrases) that have a short, well-known Lao equivalent: the word a Lao teacher would write on the board, 1-3 Lao words. Skip any word whose Lao meaning you are not sure of. Do not reuse the glossary words above or terms kept in English (AI, Prompt, Cloud, etc.).
Return {"items":[${requested} items]}. Each item: {"id":"unique-kebab-slug","english":"real English word or short phrase","lao":"natural Lao translation"}. English must use Latin script, Lao must use Lao script. Every English word and every Lao meaning must be different from each other and from the words already in this week's set. Be concise.

ALREADY IN THIS WEEK'S SET (do not repeat)
${existing.map(item => `${item.english} = ${item.lao}`).join(', ') || '(none)'}`, { maxTokens: 2000 })
  const raw = Array.isArray(result.items) ? repairLaoFields(result.items as Record<string, unknown>[]) : []
  const issues: string[] = []
  const kept: WordMatchItem[] = []
  raw.forEach((value, index) => {
    const english = typeof value?.english === 'string' ? value.english.trim() : ''
    const lao = typeof value?.lao === 'string' ? value.lao.trim() : ''
    if (typeof value?.id !== 'string' || !LATIN_WORD.test(english) || !LAO_SCRIPT.test(lao)) return void issues.push(`items[${index}]: wrong shape`)
    // A long Lao phrase is an explanation, not a word to match.
    if (lao.length > 24 || english.split(' ').length > 2) return void issues.push(`items[${index}]: "${english}" is not a short word pair`)
    const item = { id: value.id, english, lao }
    const itemIssues = collectLaoIssues(item, `items[${index}]`)
    const pool = [...existing, ...kept]
    if (pool.some(other => normalizeEnglish(other.english) === normalizeEnglish(english))) itemIssues.push(`items[${index}]: "${english}" is already in the set`)
    else itemIssues.push(...wordMatchIssues([...pool, item]).filter(issue => issue.includes(`"${english}"`)))
    if (itemIssues.length) return void issues.push(...itemIssues)
    kept.push(item)
  })
  if (kept.length < WORD_MATCH_BATCH_SIZE) {
    throw new Error(`Word Match check failed: only ${kept.length} of ${raw.length} pairs passed (need ${WORD_MATCH_BATCH_SIZE}): ${issues.slice(0, 5).join('; ')}. Regenerate this batch.`)
  }
  if (issues.length) console.warn(`[academy-forge] word_match-${batchIndex}: dropped ${raw.length - kept.length} pair(s): ${issues.slice(0, 5).join('; ')}`)
  return kept.slice(0, WORD_MATCH_BATCH_SIZE).map(item => ({ ...item, id: `b${batchIndex + 1}-${item.id}` }))
}

// ---------------------------------------------------------------------------
// Reading summaries: one full book summary a week, from a Bookstore book that
// has no summary yet. Written in steps (plan, one step per chapter, finish) so
// every request stays inside the time limit.
// ---------------------------------------------------------------------------

export type CandidateBook = { id: string; title: string; author: string | null }
export type ReaderBlock =
  | { type: 'p'; text: string }
  | { type: 'term'; term: string; body: string }
  | { type: 'list'; items: { label?: string; body: string }[] }
export type ReaderChapter = { heading: string; blocks: ReaderBlock[]; oneline: string }
export type BookPlan = {
  book_id: string
  title: string
  author: string
  deck_en: string
  difficulty: string
  estimated_minutes: number
  chapters: { heading: string; notes: string[] }[]
}
export type BookDraft = { plan: BookPlan; chapters_en: (ReaderChapter | null)[]; chapters_lo: (ReaderChapter | null)[] }

// Compares the work, not the edition: drops "(Special)", subtitles and a leading "The".
const normalizeTitle = (value: string) => value.toLowerCase().replace(/&/g, ' and ').replace(/[([].*?[)\]]/g, ' ').replace(/\s[:–—-]\s?.*$|:.*$/, '')
  .replace(/[^a-z0-9]+/g, ' ').trim().replace(/^the /, '')
const isSameWork = (a: string, b: string) => {
  const [x, y] = [normalizeTitle(a), normalizeTitle(b)]
  return x.length >= 6 && y.length >= 6 && (x === y || x.includes(y) || y.includes(x))
}

// Step 1: choose a Bookstore book that has no summary yet and plan its chapters.
// summarizedTitles are the English titles of published summaries, so another
// edition or translation of an already summarized book is never chosen.
export async function planBookSummary(allCandidates: CandidateBook[], summarizedTitles: string[]): Promise<BookPlan> {
  // Editions whose catalog title already names a summarized work never reach Qwen.
  let candidates = allCandidates.filter(book => !summarizedTitles.some(existing => isSameWork(existing, book.title)))
  const startedAt = Date.now()
  for (let attempt = 1; ; attempt++) {
    if (!candidates.length) throw new Error('No Bookstore book is left without a reading summary.')
    try {
      return await planBookSummaryOnce(candidates, summarizedTitles)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const rejectedId = error instanceof DuplicateBookError ? error.bookId : null
      if (!rejectedId || attempt >= ITEM_ATTEMPTS || Date.now() - startedAt > 70_000) throw error
      // A Thai or Lao edition the title check could only catch afterwards: drop it and choose again.
      console.warn(`[academy-forge] book plan attempt ${attempt} rejected: ${message}`)
      candidates = candidates.filter(book => book.id !== rejectedId)
    }
  }
}

class DuplicateBookError extends Error {
  constructor(message: string, readonly bookId: string) { super(message) }
}

async function planBookSummaryOnce(candidates: CandidateBook[], summarizedTitles: string[]): Promise<BookPlan> {
  const result = await askQwen(`Choose ONE book for this week's Bitdoin Academy reading summary and plan it. Learners are secondary-school and university-age students in Laos.
Pick only from the Bookstore books listed below (titles may be in Thai, Lao or English). Choose a well-known non-fiction book you know well and can summarize accurately: self-development, money, business, productivity, psychology, biography, science or history. Skip textbooks, exam or language-learning books, trading/technical manuals and books you cannot verify.
The book must NOT be the same work as any already summarized book below, including another edition, cover or translation of it.

BOOKSTORE BOOKS (id | title | author)
${candidates.map(book => `${book.id} | ${book.title} | ${book.author ?? ''}`).join('\n')}

ALREADY SUMMARIZED (do not choose these works again)
${summarizedTitles.join('\n') || '(none)'}

Research the book. Return {"book_id":"id from the list","title":"the book's original English title, without edition words like Special, Updated or Anniversary","author":"original author's name in English","deck_en":"4-5 sentences: the book's central argument, how it is told, and what this summary covers","difficulty":"BEGINNER|INTERMEDIATE|ADVANCED","estimated_minutes":12-18,"chapters":[exactly ${BOOK_CHAPTERS} {"heading":"chapter heading that states the idea","notes":[4-6 specific points from the book: its arguments, real stories, examples and named concepts]}]}. The chapters follow the book's own order of ideas; the last chapter covers how to apply the ideas and where to read the book critically. English only.`, { maxTokens: 3000, enableSearch: true })
  const book = candidates.find(item => item.id === result.book_id)
  if (!book) throw new Error('Wrong shape: Qwen chose a book that is not in the Bookstore list.')
  const title = String(result.title ?? '').trim()
  if (!title) throw new Error('Wrong shape: Qwen returned no book title.')
  // Checks the catalog title too: it may name the work even when Qwen's English title differs.
  if (summarizedTitles.some(existing => isSameWork(existing, title) || isSameWork(existing, book.title))) throw new DuplicateBookError(`"${title}" already has a reading summary (another edition or translation).`, book.id)
  const chapters = requireArray(result, 'chapters', BOOK_CHAPTERS).map(chapter => ({
    heading: String(chapter.heading ?? ''),
    notes: Array.isArray(chapter.notes) ? chapter.notes.map(String) : [],
  }))
  if (chapters.some(chapter => !chapter.heading || chapter.notes.length < 3)) throw new Error('Wrong shape: a chapter plan is missing its heading or notes.')
  const minutes = Number(result.estimated_minutes)
  return {
    book_id: book.id, title, author: String(result.author ?? book.author ?? '').trim(),
    deck_en: String(result.deck_en ?? ''),
    difficulty: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].includes(String(result.difficulty)) ? String(result.difficulty) : 'BEGINNER',
    estimated_minutes: Number.isInteger(minutes) ? Math.max(10, Math.min(20, minutes)) : 15,
    chapters,
  }
}

function readChapter(result: Record<string, unknown>): ReaderChapter {
  const blocks = Array.isArray(result.blocks) ? result.blocks as Record<string, unknown>[] : []
  const clean: ReaderBlock[] = blocks.flatMap((block): ReaderBlock[] => {
    if (block.type === 'p' && typeof block.text === 'string' && block.text.trim()) return [{ type: 'p', text: block.text.trim() }]
    if (block.type === 'term' && typeof block.term === 'string' && typeof block.body === 'string') return [{ type: 'term', term: block.term.trim(), body: block.body.trim() }]
    if (block.type === 'list' && Array.isArray(block.items)) {
      const items = (block.items as Record<string, unknown>[]).filter(item => typeof item?.body === 'string')
        .map(item => ({ ...(typeof item.label === 'string' && item.label.trim() ? { label: item.label.trim() } : {}), body: String(item.body).trim() }))
      return items.length ? [{ type: 'list', items }] : []
    }
    return []
  })
  const heading = String(result.heading ?? '').trim()
  const oneline = String(result.oneline ?? '').trim()
  if (!heading || !oneline || clean.filter(block => block.type === 'p').length < 3) throw new Error('Wrong shape: the chapter needs a heading, 3+ paragraphs and a one-line summary.')
  return { heading, blocks: clean, oneline }
}

const CHAPTER_SHAPE = `{"heading":"","blocks":[3-4 {"type":"p","text":"80-120 words"} plus exactly one {"type":"term","term":"key concept","body":"1-2 sentences"} or {"type":"list","items":[3-4 {"label":"short label","body":"one sentence"}]}],"oneline":"the chapter's idea in one sentence"}`

// One chapter: English first, then a natural Lao version of that same chapter,
// so both languages say the same thing.
export async function writeBookChapter(plan: BookPlan, index: number) {
  const startedAt = Date.now()
  const chapter = plan.chapters[index]
  const english = await withRetry(`Chapter ${index + 1} (English)`, startedAt, async () => readChapter(await askQwen(`Write chapter ${index + 1} of ${BOOK_CHAPTERS} of a practical summary of "${plan.title}" by ${plan.author}, for students in Laos.
Chapter heading: "${chapter.heading}". Points to cover: ${chapter.notes.join(' | ')}.
Write an original synthesis in your own words: explain the author's argument, retell the book's stories and examples briefly, and say why it matters for a learner. Name the author's concepts accurately; never invent quotes, numbers or stories. Do not use Markdown.
Return ${CHAPTER_SHAPE}. English only.`, { maxTokens: 2500 })))
  const lao = await withRetry(`Chapter ${index + 1} (Lao)`, startedAt, async () => enforceLaoStandard(readChapter(await askQwen(`Write this book-summary chapter in natural Lao for students in Laos. Keep exactly the same structure, blocks and meaning; translate naturally, never word-for-word. Keep the author's name, the book title and well-known English concept names in English where Lao readers would expect it. ${LAO_CONTENT_RULES}
CHAPTER (JSON): ${JSON.stringify(english)}
Return the same JSON shape with every text in Lao.`, { maxTokens: 8000 }))))
  return { english, lao }
}

export type BookFinish = {
  summary_en: string; summary_lo: string; deck_lo: string
  key_takeaways_en: string[]; key_takeaways_lo: string[]
  glossary_en: { term: string; body: string }[]; glossary_lo: { term: string; body: string }[]
  reflection_questions_en: string[]; reflection_questions_lo: string[]
  quiz: { prompt_en: string; prompt_lo: string; options_en: string[]; options_lo: string[]; correct_index: number; explanation_en: string; explanation_lo: string }[]
}

const strings = (value: unknown, count: number, label: string) => {
  if (!Array.isArray(value) || value.length !== count || value.some(item => typeof item !== 'string' || !item.trim())) throw new Error(`Wrong shape: ${label} needs ${count} items.`)
  return (value as string[]).map(item => item.trim())
}
const terms = (value: unknown, label: string) => {
  if (!Array.isArray(value) || value.length < 4) throw new Error(`Wrong shape: ${label} needs 4+ terms.`)
  return (value as Record<string, unknown>[]).map(item => ({ term: String(item.term ?? '').trim(), body: String(item.body ?? '').trim() }))
}

// Last step: the one-line summary, takeaways, glossary, reflection questions
// and a short quiz, written from the finished chapters.
export async function finishBookSummary(plan: BookPlan, chapters: ReaderChapter[]): Promise<BookFinish> {
  const startedAt = Date.now()
  const outline = chapters.map((chapter, index) => `${index + 1}. ${chapter.heading}: ${chapter.oneline}`).join('\n')
  const english = await withRetry('Summary extras (English)', startedAt, async () => {
    const result = await askQwen(`Finish a practical summary of "${plan.title}" by ${plan.author}. Its chapters:
${outline}
Return {"summary_en":"one sentence: the book's core idea","key_takeaways_en":[5 one-sentence takeaways],"glossary_en":[5-7 {"term":"","body":"1-2 sentences"}],"reflection_questions_en":[3 questions a student can apply to their own life],"quiz":[3 {"prompt":"","options":[4 short options],"answerIndex":0-3,"explanation":"one sentence"}]}. Quiz questions check understanding of the summary, with exactly one correct option. English only.`, { maxTokens: 2500 })
    const quiz = requireArray(result, 'quiz', 3).map(item => ({
      prompt: String(item.prompt ?? ''), options: strings(item.options, 4, 'quiz options'),
      answerIndex: Number(item.answerIndex), explanation: String(item.explanation ?? ''),
    }))
    if (quiz.some(item => !item.prompt || !Number.isInteger(item.answerIndex) || item.answerIndex < 0 || item.answerIndex > 3)) throw new Error('Wrong shape: a quiz question is incomplete.')
    return {
      summary_en: String(result.summary_en ?? '').trim(), key_takeaways_en: strings(result.key_takeaways_en, 5, 'key takeaways'),
      glossary_en: terms(result.glossary_en, 'glossary'), reflection_questions_en: strings(result.reflection_questions_en, 3, 'reflection questions'), quiz,
    }
  })
  // Lao text costs many tokens, so the Lao version is written as two smaller
  // requests at the same time; all of it in one answer ran out of time.
  const translate = (source: unknown, shape: string) => askQwen(`Translate this book-summary material into natural Lao for students in Laos. Keep the same structure and meaning; translate naturally, never word-for-word. Keep the author's name, the book title and well-known English concept names in English where Lao readers would expect it. ${LAO_CONTENT_RULES}
SOURCE (JSON): ${JSON.stringify(source)}
Return ${shape} in the same order as the source. Be concise.`, { maxTokens: 5000 }).then(result => enforceLaoStandard(result))
  const [intro, reference] = await Promise.all([
    withRetry('Summary intro (Lao)', startedAt, async () => {
      const result = await translate({ deck: plan.deck_en, summary: english.summary_en, key_takeaways: english.key_takeaways_en, reflection_questions: english.reflection_questions_en },
        '{"deck_lo":"","summary_lo":"","key_takeaways_lo":[5],"reflection_questions_lo":[3]}')
      return {
        deck_lo: String(result.deck_lo ?? '').trim(), summary_lo: String(result.summary_lo ?? '').trim(),
        key_takeaways_lo: strings(result.key_takeaways_lo, 5, 'Lao key takeaways'),
        reflection_questions_lo: strings(result.reflection_questions_lo, 3, 'Lao reflection questions'),
      }
    }),
    withRetry('Glossary and quiz (Lao)', startedAt, async () => {
      const result = await translate({ glossary: english.glossary_en, quiz: english.quiz.map(({ answerIndex: _, ...item }) => item) },
        '{"glossary_lo":[same terms {"term":"","body":""}],"quiz":[3 {"prompt":"","options":[4],"explanation":""}]}')
      const glossary = terms(result.glossary_lo, 'Lao glossary')
      if (glossary.length !== english.glossary_en.length) throw new Error('Wrong shape: the Lao glossary does not match the English one.')
      const quiz = requireArray(result, 'quiz', 3).map(item => ({ prompt: String(item.prompt ?? ''), options: strings(item.options, 4, 'Lao quiz options'), explanation: String(item.explanation ?? '') }))
      return { glossary_lo: glossary, quiz }
    }),
  ])
  const lao = { ...intro, ...reference }
  return {
    summary_en: english.summary_en, summary_lo: lao.summary_lo, deck_lo: lao.deck_lo,
    key_takeaways_en: english.key_takeaways_en, key_takeaways_lo: lao.key_takeaways_lo,
    glossary_en: english.glossary_en, glossary_lo: lao.glossary_lo,
    reflection_questions_en: english.reflection_questions_en, reflection_questions_lo: lao.reflection_questions_lo,
    quiz: english.quiz.map((item, index) => ({
      prompt_en: item.prompt, prompt_lo: lao.quiz[index].prompt, options_en: item.options, options_lo: lao.quiz[index].options,
      correct_index: item.answerIndex, explanation_en: item.explanation, explanation_lo: lao.quiz[index].explanation,
    })),
  }
}

// ---------------------------------------------------------------------------
// Scholarships: one real, open (or soon opening) scholarship a week, with what
// to prepare, the benefits and a working link to the official source.
// ---------------------------------------------------------------------------

export type ScholarshipResearch = {
  name: string; provider: string; country: string; level: string
  deadline: string | null; deadline_note: string
  official_url: string; overview: string
  eligibility: string[]; documents: string[]; benefits: string[]; how_to_apply: string[]
}

// Pages that answer 200 but say the page or form does not exist.
const SOFT_NOT_FOUND = /page not found|survey not found|404 error|error 404|page (?:does not|doesn't|cannot be) (?:exist|found)|no longer available|page you requested/i
// Application forms and file hosts are not the scholarship's own page.
const NOT_A_SOURCE_PAGE = /(?:^|\.)(?:qualtrics\.com|forms\.gle|docs\.google\.com|drive\.google\.com|forms\.office\.com|typeform\.com|bit\.ly)$/i

// Opens a page and returns its readable text, or null when it is dead, blocked,
// a "not found" page or not an HTML page.
export async function fetchPageText(url: string): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15_000)
  try {
    if (NOT_A_SOURCE_PAGE.test(new URL(url).hostname)) return null
    const response = await fetch(url, { redirect: 'follow', signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BitdoinAcademyBot/1.0)', Accept: 'text/html' } })
    if (!response.ok || !/html/i.test(response.headers.get('content-type') ?? '')) {
      await response.body?.cancel()
      return null
    }
    const text = (await response.text())
      .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ').trim()
    if (text.length < 400 || SOFT_NOT_FOUND.test(text.slice(0, 2000))) return null
    return text
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

const NAME_FILLER = new Set(['scholarship', 'scholarships', 'program', 'programme', 'university', 'the', 'for', 'and', 'of', 'at', 'in', 'award', 'awards'])
// The page must name the scholarship: most of the distinctive words of its name appear in it.
function pageNamesScholarship(text: string, name: string) {
  const words = normalizeText(name.replace(/\([^)]*\)/g, ' ')).split(' ').filter(word => word.length > 2 && !NAME_FILLER.has(word))
  if (!words.length) return false
  const page = normalizeText(text)
  return words.filter(word => page.includes(word)).length / words.length >= 0.6
}

// A rejected answer (dead link, page that doesn't describe it, past deadline,
// already covered) is sent back with the reason, while a new search can still
// finish inside the step.
export async function researchScholarship(today: string, coveredNames: string[]): Promise<ScholarshipResearch> {
  const startedAt = Date.now()
  const rejected: string[] = []
  for (let attempt = 1; ; attempt++) {
    try {
      return await researchScholarshipOnce(today, coveredNames, rejected)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (attempt >= ITEM_ATTEMPTS || Date.now() - startedAt > 70_000) throw error
      console.warn(`[academy-forge] scholarship research attempt ${attempt} rejected: ${message}`)
      rejected.push(message)
    }
  }
}

// 1. Web search proposes a scholarship and its official pages.
// 2. Each page is opened; the first live one that names the scholarship is the source.
// 3. Every detail is taken from that page's own text, so nothing is invented.
async function researchScholarshipOnce(today: string, coveredNames: string[], rejected: string[]): Promise<ScholarshipResearch> {
  const feedback = rejected.length ? `
YOUR EARLIER ANSWERS WERE REJECTED:
${rejected.join('\n')}
Copy each URL exactly from a page you found in the search results; never build or guess a URL. If you cannot find a working official page, choose a different scholarship.` : ''
  const found = await askQwen(`Search the web for ONE scholarship that students from Laos can apply for now or in the coming months: the application deadline must be after ${today} (or the next round must open after ${today}). Prefer fully or largely funded scholarships for bachelor's, master's or short programs (government, university or foundation scholarships, e.g. in Japan, Korea, China, Australia, New Zealand, Thailand, Europe, the US or ASEAN).
Do not choose any scholarship already covered:
${coveredNames.join('\n') || '(none)'}
Return {"name":"official scholarship name","official_urls":["up to 3 URLs of the provider's own web pages that describe this scholarship, most specific first (not application forms, PDFs, news or aggregator sites)"]}. Copy every URL exactly from a search result.${feedback}`, { maxTokens: 800, enableSearch: true, forceSearch: true })
  const name = String(found.name ?? '').trim()
  const urls = (Array.isArray(found.official_urls) ? found.official_urls : []).map(String).map(url => url.trim()).filter(url => /^https:\/\//.test(url)).slice(0, 3)
  if (!name || !urls.length) throw new Error('Wrong shape: the scholarship needs a name and an https official link.')
  if (coveredNames.some(covered => normalizeText(covered) === normalizeText(name))) throw new Error(`${name} was already covered.`)

  const pages = await Promise.all(urls.map(fetchPageText))
  const index = pages.findIndex(text => text !== null && pageNamesScholarship(text, name))
  if (index < 0) throw new Error(`${name}: none of its links (${urls.join(', ')}) opens a live page that describes it.`)
  const officialUrl = urls[index]

  const result = await askQwen(`Below is the text of the official page for the "${name}" scholarship (${officialUrl}). Using ONLY facts stated in this text, describe it for students in Laos. Do not add anything the page does not say; leave a list short rather than guess. Today is ${today}.
PAGE TEXT: ${(pages[index] as string).slice(0, 14_000)}
Return {"name":"official name as on the page","provider":"","country":"host country","level":"study level, e.g. Master's","open_to_laos":true or false (false if the page clearly excludes Lao citizens),"deadline":"YYYY-MM-DD of the next application deadline stated on the page, or null if the page states none","deadline_note":"the deadline or opening date as the page states it, or 'See the official page for dates'","overview":"2-3 sentences","eligibility":[who can apply, as stated],"documents":[documents and things to prepare, as stated],"benefits":[benefits, with amounts if stated],"how_to_apply":[steps, as stated]}. English only.`, { maxTokens: 2500 })
  const list = (key: string, min: number) => {
    const value = Array.isArray(result[key]) ? (result[key] as unknown[]).map(String).map(item => item.trim()).filter(Boolean) : []
    if (value.length < min) throw new Error(`${name}: the official page does not say enough about ${key.replace(/_/g, ' ')}.`)
    return value
  }
  if (result.open_to_laos === false) throw new Error(`${name}: the official page says students from Laos cannot apply.`)
  const research: ScholarshipResearch = {
    name: String(result.name ?? name).trim() || name, provider: String(result.provider ?? '').trim(), country: String(result.country ?? '').trim(),
    level: String(result.level ?? '').trim(),
    deadline: typeof result.deadline === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(result.deadline) ? result.deadline : null,
    deadline_note: String(result.deadline_note ?? '').trim(), official_url: officialUrl,
    overview: String(result.overview ?? '').trim(),
    eligibility: list('eligibility', 2), documents: list('documents', 2), benefits: list('benefits', 1), how_to_apply: list('how_to_apply', 1),
  }
  if (research.deadline && research.deadline < today) throw new Error(`${research.name}: the deadline ${research.deadline} has already passed.`)
  return research
}

type Section = { heading: string; blocks: ReaderBlock[] }

function scholarshipSections(research: ScholarshipResearch, text: Record<string, string | string[]>): Section[] {
  const items = (key: string) => (text[key] as string[]).map(body => ({ body }))
  return [
    { heading: String(text.h_overview), blocks: [{ type: 'p', text: String(text.overview) }, { type: 'list', items: [
      { label: String(text.l_provider), body: research.provider || research.name },
      { label: String(text.l_country), body: String(text.country) },
      { label: String(text.l_level), body: String(text.level) },
      { label: String(text.l_deadline), body: String(text.deadline_note) },
    ] }] },
    { heading: String(text.h_eligibility), blocks: [{ type: 'list', items: items('eligibility') }] },
    { heading: String(text.h_documents), blocks: [{ type: 'list', items: items('documents') }] },
    { heading: String(text.h_benefits), blocks: [{ type: 'list', items: items('benefits') }] },
    { heading: String(text.h_apply), blocks: [{ type: 'list', items: [...items('how_to_apply'), { label: String(text.l_source), body: research.official_url }] }] },
  ]
}

// Builds the lesson in English from the research, then has the same text
// written in Lao. Both use the same fixed sections.
export async function writeScholarship(research: ScholarshipResearch) {
  const startedAt = Date.now()
  const en = {
    title: `${research.name}${research.level ? ` (${research.level})` : ''}`,
    summary: research.overview.split(/(?<=\.)\s/)[0],
    overview: research.overview, country: research.country, level: research.level, deadline_note: research.deadline_note || 'Check the official page for the deadline.',
    eligibility: research.eligibility, documents: research.documents, benefits: research.benefits, how_to_apply: research.how_to_apply,
    takeaways: [`Deadline: ${research.deadline_note || 'see the official page'}`, `Main benefit: ${research.benefits[0]}`, 'Always confirm details and apply on the official page.'],
    h_overview: 'Overview', h_eligibility: 'Who can apply', h_documents: 'What to prepare', h_benefits: 'Benefits', h_apply: 'How to apply',
    l_provider: 'Provider', l_country: 'Host country', l_level: 'Study level', l_deadline: 'Deadline', l_source: 'Official source',
  }
  const lo = await withRetry('Scholarship (Lao)', startedAt, async () => {
    const result = enforceLaoStandard(await askQwen(`Translate this scholarship information into natural Lao for students in Laos. Keep the same keys, list lengths and meaning; keep the scholarship name, organisation names, document names that applicants must use in English (e.g. IELTS, TOEFL, CV) and dates in a clear form. ${LAO_CONTENT_RULES}
SOURCE (JSON): ${JSON.stringify(en)}
Return the same JSON keys with every value in Lao.`, { maxTokens: 8000 })) as Record<string, string | string[]>
    for (const key of ['eligibility', 'documents', 'benefits', 'how_to_apply', 'takeaways'] as const) {
      if (!Array.isArray(result[key]) || result[key].length !== en[key].length) throw new Error(`Wrong shape: the Lao ${key} list does not match the English one.`)
    }
    return result
  })
  return {
    title_en: en.title, title_lo: String(lo.title ?? en.title),
    summary_en: en.summary, summary_lo: String(lo.summary ?? ''),
    content_en: scholarshipSections(research, en), content_lo: scholarshipSections(research, lo),
    key_takeaways_en: en.takeaways, key_takeaways_lo: lo.takeaways as string[],
    application_deadline: research.deadline, source_url: research.official_url,
  }
}
