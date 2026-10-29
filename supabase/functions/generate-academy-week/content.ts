// Weekly Content Forge generators: prompts, Qwen calls and the checks that
// reject bad items. No database access here, so the edge function and a local
// preview script run exactly the same generation code.
import { LAO_CONTENT_RULES, brainSprintIssues, collectLaoIssues, hasEnglishPracticeOptions, isMeaningQuestion, quotedEnglishIssues, repairLaoFields, wordMatchIssues } from '../_shared/lao-content-standard.ts'
import { keepEnglish, reviewLaoUnits, type ReviewAsk } from './lao-review.ts'

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
const BRAIN_SPRINT_SPARE_ITEMS = 5
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
export type SearchSource = { url: string; title: string }

// `sources`, when given, is filled with the pages the web search really returned, so a caller can check what the model
// says against them instead of trusting URLs it may have invented.
export async function askQwen(prompt: string, options: { maxTokens: number; model?: string; system?: string; temperature?: number; enableSearch?: boolean; forceSearch?: boolean; sources?: SearchSource[] }) {
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
          { role: 'system', content: options.system ?? 'You are the senior curriculum editor for Bitdoin Academy in Laos. Research current, reliable information when relevant. Create safe, original, practical bilingual learning content. Return valid JSON only.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        ...(options.enableSearch ? { enable_search: true, ...(options.forceSearch || options.sources ? { search_options: { ...(options.forceSearch ? { forced_search: true } : {}), ...(options.sources ? { enable_source: true } : {}) } } : {}) } : {}),
        enable_thinking: false,
        temperature: options.temperature ?? 0.6,
        max_tokens: options.maxTokens,
        stream: true,
      }),
    })
    if (!response.ok) {
      const result = await response.json().catch(() => null)
      const message = result?.error?.message ?? `Qwen request failed (${response.status}).`
      // A model that does not accept the source list still answers without it.
      if (response.status === 400 && options.sources && /enable_source|search_options/i.test(message)) {
        return askQwen(prompt, { ...options, sources: undefined })
      }
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
        let chunk: { error?: { message?: string }; choices?: Array<{ delta?: { content?: string }; finish_reason?: string | null }>; search_info?: { search_results?: Array<{ url?: string; title?: string }> } }
        try {
          chunk = JSON.parse(data)
        } catch {
          continue
        }
        if (chunk.error) throw new Error(chunk.error.message ?? 'Qwen reported an error while writing.')
        for (const found of chunk.search_info?.search_results ?? []) {
          if (options.sources && found.url && !options.sources.some(source => source.url === found.url)) options.sources.push({ url: found.url, title: found.title ?? '' })
        }
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
// Lao reviewer agent. Nothing with Lao in it is saved before a second model has
// read it (see lao-review.ts). The reviewer only judges: a rejected text goes
// back to the translator with the reviewer's reason, or is dropped, and a review
// that cannot finish fails the step, so unreviewed content never reaches students.
// ---------------------------------------------------------------------------

// The Lao is written and reviewed by the newest Qwen generation. qwen-plus and qwen-max wrote Lao with
// mistakes (a translated quoted sentence, gibberish for 'half of') and, as reviewers, passed them and
// rejected good Lao with invented reasons; qwen3.8-max caught all of them. Set QWEN_TRANSLATE_MODEL /
// QWEN_REVIEW_MODEL to change them. The English is written by the faster models above.
export const TRANSLATE_MODEL = Deno.env.get('QWEN_TRANSLATE_MODEL') || 'qwen3.8-max'
export const REVIEW_MODEL = Deno.env.get('QWEN_REVIEW_MODEL') || 'qwen3.8-max'
// What the reviewer rejected, for the preview script.
export const reviewLog: string[] = []

const askReviewer: ReviewAsk = (system, prompt) => askQwen(prompt, { maxTokens: 4000, model: REVIEW_MODEL, system, temperature: 0.1 })

export async function reviewLao<T>(context: string, units: T[]) {
  const reviewed = await reviewLaoUnits(askReviewer, context, units, reviewLog)
  if (reviewLog.length > 200) reviewLog.splice(0, reviewLog.length - 200)
  const rejected = reviewed.flatMap(entry => entry.rejected)
  if (rejected.length) console.warn(`[academy-forge] Lao reviewer rejected ${rejected.length} text(s) of ${context.slice(0, 40)}: ${rejected.slice(0, 2).join('; ')}`)
  return reviewed
}

// Content that is saved whole (a lesson, a chapter, a scholarship). `write`
// produces it, given what the reviewer rejected last time (empty the first time):
// the translator is asked again with those reasons, once, while there is time.
// A Lao text the reviewer still rejects is left in English (never saved as Lao):
// failing the step instead would lose the whole week's content for one sentence.
export async function writeReviewed<T>(context: string, write: (problems: string[]) => Promise<T>, startedAt = Date.now(), attempts = 2): Promise<T> {
  let problems: string[] = []
  for (let attempt = 1; ; attempt++) {
    const content = await write(problems)
    const [reviewed] = await reviewLao(context, [content])
    if (!reviewed.rejected.length) return content
    problems = reviewed.rejected.slice(0, 8)
    if (attempt >= attempts || Date.now() - startedAt > REVIEW_RETRY_WINDOW_MS) {
      console.warn(`[academy-forge] ${context}: ${reviewed.rejections.length} Lao text(s) stay in English because the reviewer still rejected them: ${reviewed.rejected.slice(0, 3).join('; ')}`)
      return keepEnglish(content, reviewed.rejections)
    }
    console.warn(`[academy-forge] ${context}: the Lao reviewer sent it back (${problems.length} problem(s)); translating again`)
  }
}

// A second translation only starts while it can still finish inside the step.
const REVIEW_RETRY_WINDOW_MS = 55_000

// Added to a translation prompt when the reviewer sent the first one back.
export const reviewFeedback = (problems: string[]) => problems.length
  ? `\n\nA REVIEWER REJECTED YOUR EARLIER LAO. Fix exactly these problems. Where a word cannot be translated safely, keep it in English (Latin letters); never spell English sounds in Lao letters:\n${problems.map(problem => `- ${problem}`).join('\n')}\n`
  : ''

// ---------------------------------------------------------------------------
// Daily Brain Sprint
// ---------------------------------------------------------------------------

type Localized = { en: string; lo: string }
export type BrainSprintItem = { id: string; topic?: string; prompt: Localized; options: Localized[]; answerIndex: number; explanation: Localized }
export type WordMatchItem = { id: string; english: string; lao: string }

const isFilled = (value: unknown) => typeof value === 'string' && value.trim() !== ''

// Qwen writes Brain Sprint questions in English only; a second request writes the Lao and the Lao reviewer checks it.
const isEnglishBrainSprintShape = (value: Record<string, unknown>) =>
  isFilled(value.id) && isFilled(value.prompt) && isFilled(value.explanation)
  && Array.isArray(value.options) && value.options.length === 4 && value.options.every(isFilled)
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

// Three jobs, kept apart. One request writes the questions in English only. A
// second request translates them under strict rules. The Lao reviewer, a
// stronger model, then reads every question before it is kept. Lao written in
// the same request as the English was often unnatural, and it translated the
// English being tested (the Lao sentence no longer held the word asked about).
const ENGLISH_QUIZ_RULES = `Write clear, natural English only: another model translates it into Lao afterwards, so write no Lao.
- Exactly one option is correct; the other three are clearly wrong (no two acceptable answers, e.g. add "yesterday" when testing the past tense). All four options are different and under 8 words. The explanation is one short sentence that matches the answer.
- Facts must be real and checkable. If unsure, choose a different question; never invent a fact, date, statistic or "official" declaration.
- When a question tests English itself (the meaning of a word, idiom or phrasal verb, grammar, vocabulary, collocations), put the English being tested in single quotes inside the question, e.g. What does 'keep your cool' mean? or Choose the correct word: 'She ___ to school yesterday.' A "meaning of a word in a sentence" question needs a sentence in which the word clearly has one meaning, and its four options must not overlap in meaning.
- Math: show the working in the explanation.`

export const LAO_TRANSLATOR_SYSTEM = 'You are a careful English-to-Lao translator for an English-learning academy in Laos. You write the Lao an educated native speaker in Vientiane writes today, never Thai. You translate faithfully: you never change a question, its options, their order or the correct answer. You are strict about what you do not know: when a word or phrase has no established Lao equivalent, or you are not certain a Lao version is correct and makes sense, you leave it in English (Latin letters) and never spell English sounds in Lao letters. A reviewer will check every word you write. Return valid JSON only.'

const BRAIN_SPRINT_TRANSLATION_RULES = `HOW TO TRANSLATE EACH QUESTION
1. Decide "kind":
   - "english_practice": the question tests English itself (grammar, tenses, prepositions, articles, vocabulary, idioms, phrasal verbs, collocations, spelling, synonyms, "what does X mean", odd one out among English words).
   - "general": maths, science, technology, logic or world knowledge.
2. english_practice: the English being tested is NOT translated. Every English word, phrase, idiom or sentence the learner has to read or choose between stays in English, character for character as in the English version: inside quotes, and also when the question lists English words without quotes. If you translate it the question stops working (for "What does 'light' mean in the sentence: 'She turned on the light.'?" the Lao question must still contain 'light' and 'She turned on the light.' in English, otherwise there is no word "light" left to ask about). Only the instruction and the explanation are Lao. When the explanation points to the English being taught, quote that English in the Lao explanation too ('went', 'yesterday').
   - "options_are_english": true ONLY when the learner chooses between English words, phrases or sentences (grammar, tense, preposition, fill in the blank, "which word", "which sentence", collocation, odd one out): return the options exactly as in English.
   - "options_are_english": false for every question of the form "What does X mean?" or "X comes from a word meaning what?": its options are meanings, so write each option as the natural Lao meaning of that idea, short and clear, never in English. Never translate an idiom word for word (do not turn 'keep your cool' into something about cold things).
3. general: translate the question, the options and the explanation into natural Lao and set "options_are_english" to false. Keep numbers, the signs × ÷ + − = and units as they are. Maths wording: multiply by = ຄູນດ້ວຍ, divide by = ຫານດ້ວຍ, half = ເຄິ່ງໜຶ່ງ, equals = ເທົ່າກັບ.
4. Translate every sentence of the question and the explanation: do not shorten, restructure, reorder or add anything. Read the Lao back before you answer: it must sound like a Lao teacher speaking, with exactly the meaning of the English. Short sentences. No Thai words or letters. Keep each Lao option under 8 words.
5. If a word or phrase does not translate well, keep it in English. Never spell an English word in Lao letters to copy its sound (not apple, banana, carrot, orange or any other everyday word), and never use a Lao word you are not sure means the same thing. Technical terms: the Lao term with the English in brackets, e.g. ເຣົາເຕີ (router). Do not leave a plain English word in the middle of a Lao sentence when a Lao word exists.
6. Return {"items":[{"id":"same id","kind":"english_practice or general","options_are_english":true or false,"prompt":"the Lao question","options":[exactly 4 strings in the same order],"explanation":"the Lao explanation"}]}: one entry per question, in the same order.`

const TRANSLATION_RETRY_WINDOW_MS = 75_000

// What the translator said about a question, kept so the checks can run again after the reviewer's fixes.
type BrainSprintMeta = { englishPractice: boolean; optionsStayEnglish: boolean }
type BrainSprintOutcome = {
  draft: BrainSprintItem
  item?: BrainSprintItem
  issues: string[]
  meta?: BrainSprintMeta
  // The reviewer says the English itself is the problem: a new translation cannot repair it, so it is dropped, not retried.
  final?: boolean
  // For the preview: the Lao the reviewer rejected.
  before?: BrainSprintItem
}

// The request for a few questions. `feedback` holds what was wrong with an
// earlier answer for the same question, so the retry fixes that.
export function brainSprintTranslationPrompt(drafts: BrainSprintItem[], feedback: Record<string, string[]> = {}) {
  const source = drafts.map(draft => ({
    id: draft.id, prompt: draft.prompt.en, options: draft.options.map(option => option.en),
    correct_option_index: draft.answerIndex, explanation: draft.explanation.en,
  }))
  const problems = drafts.filter(draft => feedback[draft.id]?.length).map(draft => `- ${draft.id}: ${feedback[draft.id].join('; ')}`)
  return `${LAO_CONTENT_RULES}

${BRAIN_SPRINT_TRANSLATION_RULES}
${problems.length ? `\nYOUR PREVIOUS ANSWER WAS REJECTED. Fix these problems:\n${problems.join('\n')}\n` : ''}
QUESTIONS (JSON)
${JSON.stringify(source)}`
}

// Options that are meanings of an English word must be read by a Lao student, so they need Lao.
const untranslatedOptionIssues = (item: BrainSprintItem, path: string) =>
  item.options.filter(option => /[A-Za-z]{3}/.test(option.en) && !LAO_SCRIPT.test(option.lo))
    .map(option => `${path}: the option "${option.en}" is not a choice between English words, so it must be written as its Lao meaning`)

function brainSprintItemIssues(item: BrainSprintItem, meta: BrainSprintMeta, path: string) {
  return [
    ...collectLaoIssues(item, path), ...brainSprintIssues(item, path), ...brainSprintTopicIssues(item, path),
    ...(meta.englishPractice ? quotedEnglishIssues(item, { optionsStayEnglish: meta.optionsStayEnglish }, path) : []),
    ...(meta.englishPractice && !meta.optionsStayEnglish ? untranslatedOptionIssues(item, path) : []),
    ...(LAO_SCRIPT.test(item.prompt.lo) && LAO_SCRIPT.test(item.explanation.lo) ? [] : [`${path}: the Lao prompt and explanation must be written in Lao`]),
  ]
}

// Builds the finished question from a translator's answer and runs every check on it.
export function checkBrainSprintTranslation(draft: BrainSprintItem, entry: unknown): BrainSprintOutcome {
  const found = (entry ?? {}) as Record<string, unknown>
  // Options the learner chooses between in English are copied, never trusted to the translator.
  // A "what does X mean" question has Lao options whatever the translator says; a general-knowledge question
  // only keeps English options when the translator also calls it English practice.
  const optionsAreEnglish = !isMeaningQuestion(draft.prompt.en)
    && (hasEnglishPracticeOptions(draft) || (found.options_are_english === true && found.kind === 'english_practice'))
  const prompt = isFilled(found.prompt) ? String(found.prompt).trim() : ''
  const explanation = isFilled(found.explanation) ? String(found.explanation).trim() : ''
  const options = Array.isArray(found.options) ? found.options.map(option => typeof option === 'string' ? option.trim() : '') : []
  if (!prompt || !explanation || (!optionsAreEnglish && (options.length !== 4 || options.some(option => !option)))) {
    const missing = [!prompt && 'prompt', !explanation && 'explanation', !optionsAreEnglish && options.length !== 4 && `${options.length} options instead of 4`, !optionsAreEnglish && options.length === 4 && options.some(option => !option) && 'an empty option'].filter(Boolean)
    return { draft, issues: [`${draft.id}: the translation is incomplete (${missing.join(', ')}; answer had ${Object.keys(found).join('/') || 'nothing for this question'})`] }
  }
  const meta = { englishPractice: found.kind === 'english_practice' || optionsAreEnglish, optionsStayEnglish: optionsAreEnglish }
  const item = repairLaoFields<BrainSprintItem>({
    ...draft,
    prompt: { en: draft.prompt.en, lo: prompt },
    explanation: { en: draft.explanation.en, lo: explanation },
    options: draft.options.map((option, optionIndex) => ({ en: option.en, lo: optionsAreEnglish ? option.en : options[optionIndex] })),
  })
  const issues = brainSprintItemIssues(item, meta, draft.id)
  return issues.length ? { draft, issues, meta } : { draft, item, issues, meta }
}

export const pickTranslation = (returned: Record<string, unknown>[], id: string, index: number) =>
  returned.find(entry => entry?.id === id) ?? (returned.length > index ? returned[index] : undefined)

const BRAIN_SPRINT_REVIEW_CONTEXT = 'Daily Brain Sprint: multiple-choice quiz questions for Lao secondary-school and university students. Each unit is one question: "prompt", four "options" and an "explanation", each with its English and its Lao. The question is English practice when it tests English itself (a word, idiom, grammar, a sentence, a list of words); then the English being tested must stay in English everywhere, while options that are meanings of an English word or phrase must be Lao.'

// One translation request for a few questions, then the reviewer reads what
// passed the checks. A question the reviewer fixed is checked again.
// `review: false` shows the translator's own Lao (preview only).
export async function translateBrainSprintOnce(drafts: BrainSprintItem[], feedback: Record<string, string[]> = {}, review = true): Promise<BrainSprintOutcome[]> {
  const result = await askQwen(brainSprintTranslationPrompt(drafts, feedback), { maxTokens: 6000, model: TRANSLATE_MODEL, system: LAO_TRANSLATOR_SYSTEM, temperature: 0.2 })
  const returned = Array.isArray(result.items) ? result.items as Record<string, unknown>[] : []
  const outcomes = drafts.map((draft, index) => checkBrainSprintTranslation(draft, returned.length === drafts.length ? pickTranslation(returned, draft.id, index) : returned.find(entry => entry?.id === draft.id)))
  const passed = outcomes.filter(outcome => outcome.item)
  if (!review || !passed.length) return outcomes
  const reviewed = await reviewLao(BRAIN_SPRINT_REVIEW_CONTEXT, passed.map(outcome => outcome.item!))
  return outcomes.map(outcome => {
    if (!outcome.item) return outcome
    const entry = reviewed[passed.indexOf(outcome)]
    if (!entry.rejected.length) return outcome
    // Sent back to the translator with the reviewer's reasons, unless the English is at fault.
    return { draft: outcome.draft, issues: entry.rejected.map(reason => `${outcome.draft.id}: the Lao reviewer rejected it: ${reason}`), meta: outcome.meta, final: entry.englishFault, before: outcome.item }
  })
}

// Translates and reviews `need` questions. A question that failed a check, or
// that the reviewer rejected, is translated again with the reasons (unless the
// reviewer blames the English: then it is dropped); spare questions fill the
// gaps, while the step still has time.
export async function translateBrainSprint(drafts: BrainSprintItem[], need: number, issues: string[] = [], startedAt = Date.now()) {
  const done: BrainSprintItem[] = []
  const spares = [...drafts]
  let batch = spares.splice(0, need)
  let feedback: Record<string, string[]> = {}
  for (let round = 1; round <= 3 && batch.length; round++) {
    if (round > 1 && Date.now() - startedAt > TRANSLATION_RETRY_WINDOW_MS) break
    const outcomes = await translateBrainSprintOnce(batch, feedback)
    const retry: BrainSprintItem[] = []
    feedback = {}
    for (const outcome of outcomes) {
      if (outcome.item) done.push(outcome.item)
      else {
        issues.push(...outcome.issues)
        if (!outcome.final) {
          retry.push(outcome.draft)
          feedback[outcome.draft.id] = outcome.issues
        }
      }
    }
    // Questions that can still be repaired go round again, together with as many fresh spares as are still missing.
    const missing = need - done.length
    batch = missing > 0 ? [...retry, ...spares.splice(0, missing)] : []
  }
  return done
}

// Asks Qwen for a few spare English questions and drops any that is off-topic,
// repeats one already in this week's pool, or whose answer key an independent
// check disputes; the Lao is then written and reviewed, and any question whose
// Lao breaks the Lao standard or is rejected by the reviewer is dropped too. Every learner's daily set is a slice of the
// pool, so a unique pool means no repeated question within a day.
export async function generateBrainSprint(batchIndex: number, existing: BrainSprintItem[] = []) {
  const startedAt = Date.now()
  const requested = BRAIN_SPRINT_BATCH_SIZE + BRAIN_SPRINT_SPARE_ITEMS
  const avoid = existing.map(item => `- ${item.topic ? `[${item.topic}] ` : ''}${item.prompt.en}`).join('\n')
  const result = await askQwen(`Prepare part ${batchIndex + 1} of ${BRAIN_SPRINT_BATCHES} of a weekly Daily Brain Sprint quiz for secondary-school and university students in Laos. ${ENGLISH_QUIZ_RULES}
Theme of this part: ${BRAIN_SPRINT_FOCUS[batchIndex % BRAIN_SPRINT_FOCUS.length]}.
Brain Sprint is about innovations, technology, English grammar and vocabulary, interesting knowledge and quick math tricks: each question should teach the learner something new and useful. ${BRAIN_SPRINT_OFF_LIMITS}
Every question must have a different topic from every other question, including the ones already in this week's set below.
Return {"items":[${requested} items]}. Each item: {"id":"unique-kebab-slug","topic":"the specific idea tested, 2-5 words, e.g. 'multiplying by 11' or 'how GPS finds location' (not a broad theme like 'math')","prompt":"the question","options":[exactly 4 short strings],"answerIndex":0,"explanation":"one short sentence"}. Keep every option under 8 words. Be concise.

ALREADY IN THIS WEEK'S SET (do not repeat these topics or questions)
${avoid || '(none)'}`, { maxTokens: 3000, model: FAST_MODEL })
  const raw = Array.isArray(result.items) ? result.items as Record<string, unknown>[] : []
  const issues: string[] = []
  const kept: BrainSprintItem[] = []
  raw.forEach((value, index) => {
    if (!value || typeof value !== 'object' || !isEnglishBrainSprintShape(value)) return void issues.push(`items[${index}]: wrong shape`)
    // The English question, with the Lao left empty until it is translated.
    const draft: BrainSprintItem = {
      id: String(value.id).trim(), ...(isFilled(value.topic) ? { topic: String(value.topic).trim() } : {}),
      prompt: { en: String(value.prompt).trim(), lo: '' }, explanation: { en: String(value.explanation).trim(), lo: '' },
      options: (value.options as string[]).map(option => ({ en: option.trim(), lo: '' })), answerIndex: value.answerIndex as number,
    }
    const itemIssues = brainSprintTopicIssues(draft, `items[${index}]`)
    if (new Set(draft.options.map(option => option.en.toLowerCase())).size !== 4) itemIssues.push(`items[${index}]: English options are not all different`)
    const repeated = [...existing, ...kept].find(other => other.id.replace(/^b\d+-/, '') === draft.id || isSameQuestion(other, draft))
    if (repeated) itemIssues.push(`items[${index}]: repeats "${repeated.prompt.en}"`)
    if (itemIssues.length) return void issues.push(...itemIssues)
    kept.push(draft)
  })
  const checked = kept.length >= BRAIN_SPRINT_BATCH_SIZE ? await keepUnambiguous(kept, issues) : kept
  const translated = checked.length >= BRAIN_SPRINT_BATCH_SIZE ? await translateBrainSprint(checked, BRAIN_SPRINT_BATCH_SIZE, issues, startedAt) : []
  if (translated.length < BRAIN_SPRINT_BATCH_SIZE) {
    throw new Error(`Brain Sprint check failed: only ${translated.length} of ${raw.length} questions passed (need ${BRAIN_SPRINT_BATCH_SIZE}): ${issues.slice(0, 5).join('; ')}. Regenerate this batch.`)
  }
  if (issues.length) console.warn(`[academy-forge] brain_sprint-${batchIndex}: ${issues.length} problem(s): ${issues.slice(0, 5).join('; ')}`)
  return translated.slice(0, BRAIN_SPRINT_BATCH_SIZE).map(item => ({ ...item, id: `b${batchIndex + 1}-${item.id}` }))
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

const WORD_MATCH_TRANSLATION_RULES = `HOW TO TRANSLATE EACH WORD
1. "lao" is the Lao word a teacher in Laos would write on the board for this English word at secondary-school level: its most common everyday meaning, 1-3 Lao words, Lao script only.
2. A loanword that Lao textbooks and speakers use is right (ຮໍໂມນ, ໂມເລກຸນ, ໂທລະສັບ, ອິນເຕີເນັດ). Keep the part of speech: a noun stays a noun (interview = ການສຳພາດ, not the verb ສຳພາດ), a verb stays a verb, an adjective an adjective. Prefer the term Lao people already use for it; a loanword is right when that is what Lao speakers say (e.g. ໂທລະສັບ, ອິນເຕີເນັດ, ຟຣີແລນເຊີ), and never invent a new compound. Use the glossary terms above exactly.
3. If the English word has no short, well-known Lao equivalent (it would take a sentence to explain), or you are not sure of its Lao meaning, set "skip" to true and "lao" to "". Never write the English sound in Lao letters; skip the word instead.
4. Two different English words must never share a Lao meaning: when a word would get the same Lao as another word in this list or in the list of meanings already used, set "skip" to true on the later one.
5. Return {"items":[{"id":"same id","lao":"","skip":false}]}: one entry per word, in the same order.`

// `taken` are the pairs already in the week's set, so a new word cannot reuse a Lao meaning.
export const wordMatchTranslationPrompt = (words: { id: string; english: string }[], taken: WordMatchItem[] = []) => `${LAO_CONTENT_RULES}

${WORD_MATCH_TRANSLATION_RULES}

LAO MEANINGS ALREADY USED THIS WEEK (do not reuse): ${taken.map(item => `${item.english} = ${item.lao}`).join(', ') || '(none)'}

WORDS (JSON)
${JSON.stringify(words)}`

// Keeps the words whose Lao passes every check; the reason for each dropped word goes to `issues`.
export function checkWordMatchTranslations(words: { id: string; english: string }[], answer: unknown, taken: WordMatchItem[] = [], issues: string[] = []) {
  const returned = Array.isArray(answer) ? repairLaoFields(answer as Record<string, unknown>[]) : []
  const kept: WordMatchItem[] = []
  words.forEach((word, index) => {
    const found = returned.find(entry => entry?.id === word.id) ?? (returned.length === words.length ? returned[index] : undefined)
    const lao = typeof found?.lao === 'string' ? found.lao.trim() : ''
    if (found?.skip === true || !lao) return void issues.push(`"${word.english}": no short, well-known Lao equivalent`)
    // A long Lao phrase is an explanation, not a word to match.
    if (!LAO_SCRIPT.test(lao) || lao.length > 24) return void issues.push(`"${word.english}": "${lao}" is not a short Lao word`)
    const item = { id: word.id, english: word.english, lao }
    const itemIssues = collectLaoIssues(item, word.english)
    const pool = [...taken, ...kept]
    if (pool.some(other => normalizeEnglish(other.english) === normalizeEnglish(word.english))) itemIssues.push(`"${word.english}" is already in the set`)
    else itemIssues.push(...wordMatchIssues([...pool, item]).filter(issue => issue.includes(`"${word.english}"`)))
    if (itemIssues.length) return void issues.push(...itemIssues)
    kept.push(item)
  })
  return kept
}

const WORD_MATCH_REVIEW_CONTEXT = 'Word Match: an English word and its Lao meaning for a matching game for Lao students. "lao" must be the common everyday Lao word for the English word (the word a Lao teacher would write on the board), the same part of speech (a noun stays a noun), 1-3 Lao words, in Lao script. Never a Lao spelling of the English sound. If there is no established Lao word for it, or you are not certain, reject the pair.'

// Qwen writes the Lao, the checks run, then the reviewer reads what passed. A
// word the reviewer rejects is dropped (the reviewer never rewrites Lao); the spare
// words of the batch fill the gap. `review: false` shows the translator's own Lao (preview only).
export async function translateWordMatch(words: { id: string; english: string }[], taken: WordMatchItem[] = [], issues: string[] = [], review = true) {
  const result = await askQwen(wordMatchTranslationPrompt(words, taken), { maxTokens: 3000, model: TRANSLATE_MODEL, system: LAO_TRANSLATOR_SYSTEM, temperature: 0.2 })
  const kept = checkWordMatchTranslations(words, result.items, taken, issues)
  if (!review || !kept.length) return kept
  const accepted: WordMatchItem[] = []
  for (const entry of await reviewLao(WORD_MATCH_REVIEW_CONTEXT, kept)) {
    if (entry.rejected.length) {
      issues.push(...entry.rejected)
      continue
    }
    const item = entry.value
    const itemIssues = [
      ...collectLaoIssues(item, item.english),
      ...(LAO_SCRIPT.test(item.lao) && item.lao.length <= 24 ? [] : [`"${item.english}": "${item.lao}" is not a short Lao word`]),
      ...wordMatchIssues([...taken, ...accepted, item]).filter(issue => issue.includes(`"${item.english}"`)),
    ]
    if (itemIssues.length) issues.push(...itemIssues)
    else accepted.push(item)
  }
  return accepted
}

// Qwen chooses spare English words, then writes and the reviewer checks their
// Lao. A word is dropped when it has no short Lao equivalent, the reviewer rejects it, repeats an English word of this week's
// pool, or shares a Lao meaning with another word, so no word repeats in a day.
export async function generateWordMatch(batchIndex: number, existing: WordMatchItem[] = []) {
  const requested = WORD_MATCH_BATCH_SIZE + WORD_MATCH_SPARE_ITEMS
  const result = await askQwen(`Prepare part ${batchIndex + 1} of ${WORD_MATCH_BATCHES} of a weekly Word Match set for secondary-school and university students in Laos. English only: another model gives each word its Lao meaning afterwards, so write no Lao.
Theme of this part: ${WORD_MATCH_THEMES[batchIndex % WORD_MATCH_THEMES.length]}. Choose common, useful words at secondary-school level (single words preferred, at most 2-word phrases) that have one clear everyday meaning and a short, well-known Lao equivalent. Skip words with several unrelated meanings. Do not use study-routine words (homework, exam, essay, assignment, notebook, pen, pencil, mentor, coach, streak) or terms kept in English (AI, Prompt, Cloud, URL, PDF, email).
Return {"items":[${requested} items]}. Each item: {"id":"unique-kebab-slug","english":"real English word or short phrase"}. English must use Latin script. Every English word must be different from the others and from the words already in this week's set. Be concise.

ALREADY IN THIS WEEK'S SET (do not repeat)
${existing.map(item => item.english).join(', ') || '(none)'}`, { maxTokens: 1500 })
  const raw = Array.isArray(result.items) ? result.items as Record<string, unknown>[] : []
  const issues: string[] = []
  const words: { id: string; english: string }[] = []
  raw.forEach((value, index) => {
    const english = typeof value?.english === 'string' ? value.english.trim() : ''
    if (!isFilled(value?.id) || !LATIN_WORD.test(english)) return void issues.push(`items[${index}]: wrong shape`)
    if (english.split(' ').length > 2) return void issues.push(`items[${index}]: "${english}" is not a short word`)
    if ([...existing, ...words].some(other => normalizeEnglish(other.english) === normalizeEnglish(english))) return void issues.push(`items[${index}]: "${english}" is already in the set`)
    words.push({ id: String(value.id).trim(), english })
  })
  const kept = words.length >= WORD_MATCH_BATCH_SIZE ? await translateWordMatch(words, existing, issues) : []
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
  // The Lao reviewer reads the Lao chapter against the English one; a chapter it rejects is translated again with its reasons.
  return writeReviewed(`chapter ${index + 1} of the reading summary of "${plan.title}"`, async problems => ({
    english,
    lao: await withRetry(`Chapter ${index + 1} (Lao)`, startedAt, async () => enforceLaoStandard(readChapter(await askQwen(`Write this book-summary chapter in natural Lao for students in Laos. Keep exactly the same structure, blocks and meaning; translate naturally, never word-for-word. Keep the author's name, the book title and well-known English concept names in English where Lao readers would expect it. ${LAO_CONTENT_RULES}${reviewFeedback(problems)}
CHAPTER (JSON): ${JSON.stringify(english)}
Return the same JSON shape with every text in Lao.`, { maxTokens: 8000, model: TRANSLATE_MODEL })))),
  }), startedAt)
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
  const translate = (source: unknown, shape: string, problems: string[]) => askQwen(`Translate this book-summary material into natural Lao for students in Laos. Keep the same structure and meaning; translate naturally, never word-for-word. Keep the author's name, the book title and well-known English concept names in English where Lao readers would expect it. ${LAO_CONTENT_RULES}${reviewFeedback(problems)}
SOURCE (JSON): ${JSON.stringify(source)}
Return ${shape} in the same order as the source. Be concise.`, { maxTokens: 5000, model: TRANSLATE_MODEL }).then(result => enforceLaoStandard(result))
  // The Lao reviewer reads everything below beside its English (the book deck is
  // written in the plan, so it is carried along); text it rejects is translated again with its reasons.
  const { deck_en: _deck, ...finished } = await writeReviewed(`takeaways, glossary and quiz of the reading summary of "${plan.title}"`, async problems => {
    const [intro, reference] = await Promise.all([
      withRetry('Summary intro (Lao)', startedAt, async () => {
        const result = await translate({ deck: plan.deck_en, summary: english.summary_en, key_takeaways: english.key_takeaways_en, reflection_questions: english.reflection_questions_en },
          '{"deck_lo":"","summary_lo":"","key_takeaways_lo":[5],"reflection_questions_lo":[3]}', problems)
        return {
          deck_lo: String(result.deck_lo ?? '').trim(), summary_lo: String(result.summary_lo ?? '').trim(),
          key_takeaways_lo: strings(result.key_takeaways_lo, 5, 'Lao key takeaways'),
          reflection_questions_lo: strings(result.reflection_questions_lo, 3, 'Lao reflection questions'),
        }
      }),
      withRetry('Glossary and quiz (Lao)', startedAt, async () => {
        const result = await translate({ glossary: english.glossary_en, quiz: english.quiz.map(({ answerIndex: _, ...item }) => item) },
          '{"glossary_lo":[same terms {"term":"","body":""}],"quiz":[3 {"prompt":"","options":[4],"explanation":""}]}', problems)
        const glossary = terms(result.glossary_lo, 'Lao glossary')
        if (glossary.length !== english.glossary_en.length) throw new Error('Wrong shape: the Lao glossary does not match the English one.')
        const quiz = requireArray(result, 'quiz', 3).map(item => ({ prompt: String(item.prompt ?? ''), options: strings(item.options, 4, 'Lao quiz options'), explanation: String(item.explanation ?? '') }))
        return { glossary_lo: glossary, quiz }
      }),
    ])
    const lao = { ...intro, ...reference }
    return {
      deck_en: plan.deck_en,
      summary_en: english.summary_en, summary_lo: lao.summary_lo, deck_lo: lao.deck_lo,
      key_takeaways_en: english.key_takeaways_en, key_takeaways_lo: lao.key_takeaways_lo,
      glossary_en: english.glossary_en, glossary_lo: lao.glossary_lo,
      reflection_questions_en: english.reflection_questions_en, reflection_questions_lo: lao.reflection_questions_lo,
      quiz: english.quiz.map((item, index) => ({
        prompt_en: item.prompt, prompt_lo: lao.quiz[index].prompt, options_en: item.options, options_lo: lao.quiz[index].options,
        correct_index: item.answerIndex, explanation_en: item.explanation, explanation_lo: lao.quiz[index].explanation,
      })),
    }
  }, startedAt)
  return finished
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

// Opens a page. `text` is its readable text; otherwise `why` says what went wrong (dead link, blocked, a "not found"
// page, not an HTML page, too little text), so a rejected answer can be explained to the model and to the admin.
export async function inspectPage(url: string): Promise<{ text?: string; why?: string }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15_000)
  try {
    if (NOT_A_SOURCE_PAGE.test(new URL(url).hostname)) return { why: 'an application form or file host, not the scholarship page' }
    // Some official sites turn away anything that does not look like a browser.
    const response = await fetch(url, {
      redirect: 'follow', signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 BitdoinAcademyBot/1.0',
        Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'en-US,en;q=0.9',
      },
    })
    if (!response.ok) {
      await response.body?.cancel()
      return { why: `HTTP ${response.status}` }
    }
    if (!/html/i.test(response.headers.get('content-type') ?? '')) {
      await response.body?.cancel()
      return { why: 'not a web page' }
    }
    const text = (await response.text())
      .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ').trim()
    if (SOFT_NOT_FOUND.test(text.slice(0, 2000))) return { why: 'a "page not found" page' }
    if (text.length < 400) return { why: 'almost no text (the page loads its content with scripts)' }
    return { text }
  } catch (error) {
    return { why: controller.signal.aborted ? 'no answer within 15 seconds' : error instanceof Error ? error.message : 'could not be opened' }
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchPageText(url: string): Promise<string | null> {
  return (await inspectPage(url)).text ?? null
}

// The organisation a host belongs to (nstda.or.th for tigp.nstda.or.th), so a page found on one of the provider's own
// sites counts as official even when the model named a different page on it.
function orgDomain(url: string) {
  try {
    const labels = new URL(url).hostname.toLowerCase().split('.')
    const generic = new Set(['co', 'com', 'or', 'org', 'go', 'gov', 'ac', 'edu', 'net'])
    return labels.slice(labels.length > 2 && generic.has(labels[labels.length - 2]) ? -3 : -2).join('.')
  } catch {
    return ''
  }
}

// Shorter versions of a link's path (a/b/c/ -> a/b/, a/), for when the exact page has moved but its section is there.
function parentPages(url: string) {
  try {
    const parsed = new URL(url)
    const segments = parsed.pathname.split('/').filter(Boolean)
    const parents: string[] = []
    for (let keep = segments.length - 1; keep >= 1; keep--) parents.push(`${parsed.origin}/${segments.slice(0, keep).join('/')}/`)
    return parents
  } catch {
    return []
  }
}

// Thrown when none of a scholarship's links opens a page about it. `seen` are the pages the web search really returned.
class LinkRejected extends Error {
  seen: string[]
  constructor(message: string, seen: string[]) {
    super(message)
    this.seen = seen
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
      rejected.push(error instanceof LinkRejected && error.seen.length
        ? `${message}\nPages that really exist (returned by the web search): ${error.seen.slice(0, 8).join(', ')}`
        : message)
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
  const sources: SearchSource[] = []
  const found = await askQwen(`Search the web for ONE scholarship that students from Laos can apply for now or in the coming months: the application deadline must be after ${today} (or the next round must open after ${today}). Prefer fully or largely funded scholarships for bachelor's, master's or short programs (government, university or foundation scholarships, e.g. in Japan, Korea, China, Australia, New Zealand, Thailand, Europe, the US or ASEAN).
Do not choose any scholarship already covered:
${coveredNames.join('\n') || '(none)'}
Return {"name":"official scholarship name","official_urls":["up to 3 URLs of the provider's own web pages that describe this scholarship, most specific first (not application forms, PDFs, news or aggregator sites)"]}. Copy every URL exactly from a search result.${feedback}`, { maxTokens: 800, enableSearch: true, forceSearch: true, sources })
  const name = String(found.name ?? '').trim()
  const urls = (Array.isArray(found.official_urls) ? found.official_urls : []).map(String).map(url => url.trim()).filter(url => /^https:\/\//.test(url)).slice(0, 3)
  if (!name || !urls.length) throw new Error('Wrong shape: the scholarship needs a name and an https official link.')
  if (coveredNames.some(covered => normalizeText(covered) === normalizeText(name))) throw new Error(`${name} was already covered.`)

  // The model's links first, then other pages of those sections, then pages the search returned from the provider's own
  // sites (same organisation domain). The first one that opens and names the scholarship is the source.
  const orgs = new Set(urls.map(orgDomain))
  const candidates = [...new Set([
    ...urls,
    ...urls.flatMap(parentPages),
    ...sources.map(source => source.url).filter(url => /^https:\/\//.test(url) && orgs.has(orgDomain(url))),
  ])].slice(0, 9)
  const inspected = await Promise.all(candidates.map(inspectPage))
  const index = inspected.findIndex(page => page.text !== undefined && pageNamesScholarship(page.text, name))
  if (index < 0) {
    const reasons = candidates.map((url, i) => `${url} (${inspected[i].text !== undefined ? 'opens, but does not describe it' : inspected[i].why})`)
    throw new LinkRejected(`${name}: none of its links opens a live page that describes it: ${reasons.slice(0, 5).join('; ')}.`, sources.map(source => source.url))
  }
  const officialUrl = candidates[index]
  const pages = inspected.map(page => page.text ?? null)

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
  // The Lao reviewer reads the scholarship beside its English; a rejected one is translated again with its reasons.
  return writeReviewed(`scholarship "${research.name}"`, async problems => {
    const lo = await withRetry('Scholarship (Lao)', startedAt, async () => {
      const result = enforceLaoStandard(await askQwen(`Translate this scholarship information into natural Lao for students in Laos. Keep the same keys, list lengths and meaning; keep the scholarship name, organisation names, document names that applicants must use in English (e.g. IELTS, TOEFL, CV) and dates in a clear form. ${LAO_CONTENT_RULES}${reviewFeedback(problems)}
SOURCE (JSON): ${JSON.stringify(en)}
Return the same JSON keys with every value in Lao.`, { maxTokens: 8000, model: TRANSLATE_MODEL })) as Record<string, string | string[]>
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
  }, startedAt)
}
