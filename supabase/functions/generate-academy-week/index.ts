import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { consumeAiQuota, positiveIntEnv, quotaResponse, userSubject } from '../_shared/ai-rate-limit.ts'
import {
  BOOK_CHAPTERS, BRAIN_SPRINT_BATCHES, BRAIN_SPRINT_BATCH_SIZE, FAST_MODEL, MODEL, READING_SUMMARY_SLUG, SCHOLARSHIP_SLUG,
  WORD_MATCH_BATCHES, WORD_MATCH_BATCH_SIZE, askQwen, bilingualRules, enforceLaoStandard, finishBookSummary,
  generateBrainSprint, generateWordMatch, planBookSummary, requireArray, researchScholarship, withRetry,
  writeBookChapter, writeScholarship,
  type BookDraft, type BrainSprintItem, type ReaderChapter, type ScholarshipResearch, type WordMatchItem,
} from './content.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const QWEN_API_KEY = Deno.env.get('QWEN_API_KEY') ?? ''
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map(v => v.trim()).filter(Boolean)
const GENERATION_MINUTE_LIMIT = positiveIntEnv('AI_WEEKLY_GENERATION_MINUTE_LIMIT', 30)
const GENERATION_DAILY_LIMIT = positiveIntEnv('AI_WEEKLY_GENERATION_DAILY_LIMIT', 50)
const GENERATION_GLOBAL_DAILY_LIMIT = positiveIntEnv('AI_WEEKLY_GENERATION_GLOBAL_DAILY_LIMIT', 50)

// Must match the lease set by claim_academy_content_task; renewed while a step runs.
const TASK_LEASE_MS = 3 * 60_000
const TASK_HEARTBEAT_MS = 45_000

type Admin = ReturnType<typeof createClient>

type LessonResearch = {
  topic: string
  angle: string
  outline: string[]
  facts: string[]
  source_url: string | null
}

type StepInput = {
  action: string
  batchIndex?: number
  categoryId?: string
  lessonDay?: number
  chapterIndex?: number
  research?: LessonResearch
  scholarship?: ScholarshipResearch
  book?: BookDraft
}

type RunRow = { id: string; week_start: string; content_counts: Record<string, number> | null }

function corsHeaders(req: Request) {
  const origin = req.headers.get('Origin') ?? ''
  const allowedOrigin = ALLOWED_ORIGINS.length === 0 ? '*' : (ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0])
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders(req) } })
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

function localToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Vientiane', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

function nextMonday() {
  const local = localToday()
  const value = new Date(`${local}T00:00:00Z`)
  const days = ((8 - value.getUTCDay()) % 7) || 7
  return addDays(local, days)
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// Role-play missions and prompts are long in both languages (Lao text costs
// many tokens), so all 7 in one answer outlasts the time limit or the output
// space. Each one is written by its own request, all at the same time, with a
// set theme or category so they don't overlap, and a word cap on the long field.
const ROLEPLAY_THEMES = [
  'a study or classroom situation',
  'an everyday English conversation',
  'an exam or presentation situation',
  'a job interview or career situation',
  'a scholarship or university application situation',
  'a workplace situation',
  'a money or everyday life situation',
]
const PROMPT_LIBRARY_CATEGORIES = ['study', 'research', 'writing', 'english', 'career', 'coding', 'productivity']
const LONG_FIELD_WORDS = 120
const generateCheckedItem = (label: string, prompt: string, stepStartedAt: number) => withRetry(label, stepStartedAt, async () => {
  const result = await askQwen(prompt, { maxTokens: 3000 })
  return enforceLaoStandard(requireArray(result, 'items', 1)[0])
})

async function generateRoleplayMissions(weekStart: string) {
  const startedAt = Date.now()
  const items = await Promise.all(ROLEPLAY_THEMES.map(async (theme, day) => ({
    ...await generateCheckedItem(DAY_NAMES[day], `Prepare one role-play mission for ${DAY_NAMES[day]} ${addDays(weekStart, day)}: ${theme}, realistic for learners in Laos. ${bilingualRules}
Return {"items":[1 item]} shaped {"day":${day},"slug":"unique-kebab-slug","title_en":"","title_lo":"","description_en":"one sentence","description_lo":"one sentence","coach_prompt_en":"setup instructing the AI to ask one question at a time, at most ${LONG_FIELD_WORDS} words","coach_prompt_lo":"natural Lao equivalent of coach_prompt_en"}. Be concise.`, startedAt),
    day,
  })))
  return uniqueSlugs(items)
}

async function generatePromptLibrary(weekStart: string) {
  const startedAt = Date.now()
  const items = await Promise.all(PROMPT_LIBRARY_CATEGORIES.map(async category => ({
    ...await generateCheckedItem(category, `Prepare one prompt library entry in the "${category}" category for the week of ${weekStart}. ${bilingualRules}
Return {"items":[1 item]} shaped {"slug":"unique-kebab-slug","category":"${category}","title_en":"","title_lo":"","description_en":"one sentence","description_lo":"one sentence","prompt_en":"reusable copy-ready prompt with [placeholders], at most ${LONG_FIELD_WORDS} words","prompt_lo":"natural Lao equivalent of prompt_en"}. Be concise.`, startedAt),
    category,
  })))
  return uniqueSlugs(items)
}

// Parts are written separately, so two of them may pick the same slug.
function uniqueSlugs(items: Record<string, unknown>[]) {
  const seen = new Set<string>()
  return items.map((item, index) => {
    let slug = String(item.slug ?? `item-${index + 1}`)
    if (seen.has(slug)) slug = `${slug}-${index + 1}`
    seen.add(slug)
    return { ...item, slug }
  })
}

async function generateDailyMentor(weekStart: string) {
  const result = await askQwen(`Prepare daily mentor for Monday ${weekStart} through Sunday ${addDays(weekStart, 6)}. ${bilingualRules}
Return {"items":[7 items]} shaped {"day":0-6,"quote":"original English motivational sentence","reflection":"English reflection question","challenge":"English practical action","mission":"English measurable outcome"}.`, { maxTokens: 7000 })
  return enforceLaoStandard(requireArray(result, 'items', 7))
}

type Category = { id: string; slug: string; name_en: string; name_lo: string }

// Step 1 of a lesson: the slow web search, with a short English-only answer.
async function researchLesson(category: Category, weekStart: string): Promise<LessonResearch> {
  const result = await askQwen(`Research one new, practical Learning Hub lesson topic for category "${category.name_en}" for learners in Laos, for the week of ${weekStart}. Prefer durable, verifiable ideas. Do not summarize copyrighted books.
Return {"topic":"short lesson title","angle":"one sentence on what the learner will be able to do","outline":[3 section headings],"facts":[3-5 short verified facts or tips, each at most 25 words],"source_url":"a real authoritative URL you used, or null"}. English only. Be concise: no explanations, citations or text outside the JSON.`, { maxTokens: 2000, enableSearch: true })
  return {
    topic: String(result.topic ?? ''),
    angle: String(result.angle ?? ''),
    outline: Array.isArray(result.outline) ? result.outline.map(String).slice(0, 3) : [],
    facts: Array.isArray(result.facts) ? result.facts.map(String).slice(0, 5) : [],
    source_url: typeof result.source_url === 'string' && /^https?:\/\//.test(result.source_url) ? result.source_url : null,
  }
}

const LESSON_SECTION_SENTENCES = 4

// Step 2 of a lesson: writing from the research notes, no search. The English
// and the Lao version are written by two requests at the same time from the same
// notes and section headings: both in one answer ran out of output space, since
// Lao text costs many tokens. Each half is retried on its own if it fails.
// Without notes (an older queued step) it researches first.
async function generateLesson(category: Category, weekStart: string, research?: LessonResearch): Promise<Record<string, unknown>> {
  const startedAt = Date.now()
  const notes = research?.topic ? research : await researchLesson(category, weekStart)
  const sections = notes.outline.length === 3 ? `exactly these 3 sections in this order: ${notes.outline.join(' | ')}` : '3 sections'
  const brief = `Lesson for category "${category.name_en}" (${category.name_lo}), week of ${weekStart}. Research notes: topic "${notes.topic}"; goal: ${notes.angle}; facts: ${notes.facts.join(' | ')}. Write an original educational lesson with ${sections}. Do not summarize copyrighted books unless the category specifically requires it; even then write an original educational synthesis. Do not use Markdown.`
  const [english, lao] = await Promise.all([
    withRetry('English lesson', startedAt, async () => {
      const result = await askQwen(`${brief} Write it in English only. Avoid invented facts and unsafe advice.
Return {"slug":"${weekStart}-${category.slug}-unique-topic","title_en":"","summary_en":"one sentence","content_en":[3 objects {"heading":"","body":"at most ${LESSON_SECTION_SENTENCES} sentences"}],"key_takeaways_en":[3 short strings],"difficulty":"BEGINNER|INTERMEDIATE|ADVANCED","estimated_minutes":5-12}.`, { maxTokens: 2000 })
      requireArray(result, 'content_en', 3)
      requireArray(result, 'key_takeaways_en', 3)
      return result
    }),
    withRetry('Lao lesson', startedAt, async () => {
      const result = await askQwen(`${brief} Write it in natural Lao only (the section headings translated into Lao). ${bilingualRules}
Return {"title_lo":"","summary_lo":"one sentence","content_lo":[3 objects {"heading":"","body":"at most ${LESSON_SECTION_SENTENCES} sentences"}],"key_takeaways_lo":[3 short strings]}. Be concise.`, { maxTokens: 4000 })
      requireArray(result, 'content_lo', 3)
      requireArray(result, 'key_takeaways_lo', 3)
      return enforceLaoStandard(result)
    }),
  ])
  return {
    slug: english.slug, title_en: english.title_en, summary_en: english.summary_en, content_en: english.content_en,
    key_takeaways_en: english.key_takeaways_en, difficulty: english.difficulty, estimated_minutes: english.estimated_minutes,
    title_lo: lao.title_lo, summary_lo: lao.summary_lo, content_lo: lao.content_lo, key_takeaways_lo: lao.key_takeaways_lo,
    source_url: notes.source_url, category_id: category.id,
  }
}

const publishAt = (weekStart: string, lessonDay?: number) => `${addDays(weekStart, Math.max(0, Math.min(6, Number(lessonDay ?? 0))))}T00:00:00+07:00`

const bookChapterKeys = (category: Category) =>
  category.slug === READING_SUMMARY_SLUG ? Array.from({ length: BOOK_CHAPTERS }, (_, index) => `book_chapter-${category.id}-${index}`) : []

// The writing step's task carries the notes every earlier step of this lesson
// produced (research, book plan, chapters), so later steps can pick them up.
async function lessonTask(admin: Admin, runId: string, categoryId: string) {
  const { data: task } = await admin.from('premium_weekly_content_tasks').select('id,payload').eq('run_id', runId).eq('task_key', `lesson-${categoryId}`).maybeSingle()
  if (!task) throw new Error('The lesson writing step is missing.')
  return task as { id: string; payload: StepInput | null }
}

async function saveLessonTaskPayload(admin: Admin, runId: string, categoryId: string, change: (payload: StepInput) => StepInput) {
  const task = await lessonTask(admin, runId, categoryId)
  const { error } = await admin.from('premium_weekly_content_tasks').update({ payload: change(task.payload ?? { action: 'lesson' }) }).eq('id', task.id)
  if (error) throw error
}

// Reading summaries: plan (choose a Bookstore book without a summary), one
// step per chapter, then finish and publish onto that book's summary row.
async function runBookStep(admin: Admin, run: RunRow, category: Category, input: StepInput) {
  if (input.action === 'lesson_research') {
    const [{ data: books, error: booksError }, { data: summaries, error: summariesError }] = await Promise.all([
      admin.from('books').select('id,title,author').eq('is_active', true).not('cover_image_url', 'is', null),
      admin.from('premium_lessons').select('book_id,title_en,book:books(title)').eq('lesson_type', 'READING_SUMMARY').eq('status', 'PUBLISHED'),
    ])
    if (booksError || summariesError) throw booksError ?? summariesError
    const summarizedIds = new Set((summaries ?? []).map(row => row.book_id).filter(Boolean))
    // Both the summary's English title and the catalog title, so another
    // edition or translation of a summarized book is recognized.
    const summarizedTitles = (summaries ?? []).flatMap(row => {
      const book = (Array.isArray(row.book) ? row.book[0] : row.book) as { title?: string } | null
      return [String(row.title_en ?? '').replace(/:\s*practical summary$/i, ''), book?.title ?? '']
    }).filter(Boolean)
    const plan = await planBookSummary((books ?? []).filter(book => !summarizedIds.has(book.id)), summarizedTitles)
    await saveLessonTaskPayload(admin, run.id, category.id, payload => ({
      ...payload, book: { plan, chapters_en: Array(BOOK_CHAPTERS).fill(null), chapters_lo: Array(BOOK_CHAPTERS).fill(null) },
    }))
    return
  }

  const draft = (await lessonTask(admin, run.id, category.id)).payload?.book
  if (!draft?.plan) throw new Error('The book plan is missing: the reading summary research step must run first.')

  if (input.action === 'book_chapter') {
    const index = Number(input.chapterIndex)
    if (!Number.isInteger(index) || index < 0 || index >= BOOK_CHAPTERS) throw new Error('Invalid book chapter.')
    const chapter = await writeBookChapter(draft.plan, index)
    await saveLessonTaskPayload(admin, run.id, category.id, payload => {
      const book = payload.book ?? draft
      const chapters_en = [...book.chapters_en]
      const chapters_lo = [...book.chapters_lo]
      chapters_en[index] = chapter.english
      chapters_lo[index] = chapter.lao
      return { ...payload, book: { ...book, chapters_en, chapters_lo } }
    })
    return
  }

  const chaptersEn = draft.chapters_en.filter((chapter): chapter is ReaderChapter => Boolean(chapter))
  const chaptersLo = draft.chapters_lo.filter((chapter): chapter is ReaderChapter => Boolean(chapter))
  if (chaptersEn.length < BOOK_CHAPTERS || chaptersLo.length < BOOK_CHAPTERS) throw new Error('Some book chapters are not written yet.')
  const { plan } = draft
  const finish = await finishBookSummary(plan, chaptersEn)
  const fields = {
    weekly_run_id: run.id, category_id: category.id, lesson_type: 'READING_SUMMARY',
    title_en: `${plan.title}: practical summary`, title_lo: `${plan.title}: ສະຫຼຸບນຳໃຊ້`,
    summary_en: finish.summary_en, summary_lo: finish.summary_lo, deck_en: plan.deck_en, deck_lo: finish.deck_lo,
    content_en: chaptersEn, content_lo: chaptersLo,
    key_takeaways_en: finish.key_takeaways_en, key_takeaways_lo: finish.key_takeaways_lo,
    glossary_en: finish.glossary_en, glossary_lo: finish.glossary_lo,
    reflection_questions_en: finish.reflection_questions_en, reflection_questions_lo: finish.reflection_questions_lo,
    difficulty: plan.difficulty, estimated_minutes: plan.estimated_minutes,
    status: 'PUBLISHED', published_at: publishAt(run.week_start, input.lessonDay), updated_at: new Date().toISOString(),
  }
  // Bookstore books get a draft summary row automatically (057); publish onto it.
  const { data: existing } = await admin.from('premium_lessons').select('id').eq('book_id', plan.book_id).maybeSingle()
  const slugBase = plan.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 56) || 'book'
  const { data: saved, error } = existing
    ? await admin.from('premium_lessons').update(fields).eq('id', existing.id).select('id').single()
    : await admin.from('premium_lessons').insert({ ...fields, book_id: plan.book_id, slug: `${slugBase}-summary-${plan.book_id.slice(0, 8)}` }).select('id').single()
  if (error || !saved) throw error ?? new Error('The reading summary could not be saved.')
  await admin.from('premium_quiz_questions').delete().eq('lesson_id', saved.id)
  const { error: quizError } = await admin.from('premium_quiz_questions').insert(finish.quiz.map((question, index) => ({ ...question, lesson_id: saved.id, sort_order: index + 1 })))
  if (quizError) throw quizError
}

// Scholarships: research one open scholarship (its official link is checked),
// then write it up as overview, who can apply, what to prepare, benefits and how to apply.
async function runScholarshipStep(admin: Admin, run: RunRow, category: Category, input: StepInput) {
  const research = async () => {
    const { data: covered } = await admin.from('premium_lessons').select('title_en').eq('category_id', category.id).order('created_at', { ascending: false }).limit(150)
    return researchScholarship(localToday(), (covered ?? []).map(row => String(row.title_en).replace(/\s*\([^)]*\)$/, '')))
  }
  if (input.action === 'lesson_research') {
    const scholarship = await research()
    await saveLessonTaskPayload(admin, run.id, category.id, payload => ({ ...payload, scholarship }))
    return
  }
  const lesson = await writeScholarship(input.scholarship ?? await research())
  await admin.from('premium_lessons').delete().eq('weekly_run_id', run.id).eq('category_id', category.id)
  const slug = `${run.week_start}-${lesson.title_en.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`.slice(0, 100)
  const { error } = await admin.from('premium_lessons').insert({
    weekly_run_id: run.id, category_id: category.id, slug, lesson_type: 'SCHOLARSHIP',
    title_en: lesson.title_en, title_lo: lesson.title_lo, summary_en: lesson.summary_en, summary_lo: lesson.summary_lo,
    content_en: lesson.content_en, content_lo: lesson.content_lo, key_takeaways_en: lesson.key_takeaways_en, key_takeaways_lo: lesson.key_takeaways_lo,
    difficulty: 'BEGINNER', estimated_minutes: 4, source_url: lesson.source_url, source_verified_at: new Date().toISOString(),
    application_deadline: lesson.application_deadline, status: 'PUBLISHED', published_at: publishAt(run.week_start, input.lessonDay), sort_order: 1000,
  })
  if (error) throw error
}

function batchIsComplete(ids: string[], batchIndex: number, size: number) {
  const prefix = `b${batchIndex + 1}-`
  return ids.filter(id => id.startsWith(prefix)).length >= size
}

async function inspectExistingWeek(admin: Admin, weekStart: string) {
  const weekEnd = addDays(weekStart, 6)
  const { data: run } = await admin.from('premium_weekly_content_runs').select('id,status,content_counts,completed_at,started_at').eq('week_start', weekStart).maybeSingle()
  const [brain, words, mentor, roleplays, prompts, categories, lessons] = await Promise.all([
    admin.from('premium_arcade_content_pools').select('items').eq('activity_type', 'brain_sprint').eq('pool_week', weekStart).maybeSingle(),
    admin.from('premium_arcade_content_pools').select('items').eq('activity_type', 'word_match').eq('pool_week', weekStart).maybeSingle(),
    admin.from('premium_daily_motivations').select('id', { count: 'exact', head: true }).gte('publish_date', weekStart).lte('publish_date', weekEnd),
    admin.from('premium_roleplay_missions').select('id', { count: 'exact', head: true }).gte('mission_date', weekStart).lte('mission_date', weekEnd),
    admin.from('premium_prompt_library').select('id', { count: 'exact', head: true }).eq('week_start', weekStart),
    admin.from('premium_learning_categories').select('id', { count: 'exact', head: true }).eq('is_active', true),
    run?.id ? admin.from('premium_lessons').select('id,category_id').eq('weekly_run_id', run.id) : Promise.resolve({ data: [] }),
  ])
  const itemIds = (items: unknown) => Array.isArray(items) ? items.map(item => String((item as { id?: unknown })?.id ?? '')) : []
  const brainIds = itemIds(brain.data?.items)
  const wordIds = itemIds(words.data?.items)
  const counts = {
    brain_sprint: brainIds.length,
    word_match: wordIds.length,
    daily_mentor: mentor.count ?? 0,
    roleplay_missions: roleplays.count ?? 0,
    prompt_library: prompts.count ?? 0,
    lessons: lessons.data?.length ?? 0,
  }
  const expectedLessons = categories.count ?? 0
  const exists = counts.brain_sprint >= BRAIN_SPRINT_BATCHES * BRAIN_SPRINT_BATCH_SIZE
    && counts.word_match >= WORD_MATCH_BATCHES * WORD_MATCH_BATCH_SIZE && counts.daily_mentor >= 7
    && counts.roleplay_missions >= 7 && counts.prompt_library >= 7 && expectedLessons > 0 && counts.lessons >= expectedLessons
  return { exists, run, counts, expectedLessons, brainIds, wordIds, completedLessonCategoryIds: (lessons.data ?? []).map(lesson => lesson.category_id) }
}

// Generates and saves one queued step. Throws on failure so the queue can retry.
async function runStep(admin: Admin, run: RunRow, input: StepInput) {
  const weekStart = run.week_start
  const counts = { ...(run.content_counts ?? {}) }

  if (input.action === 'brain_sprint') {
    const batchIndex = Number(input.batchIndex)
    if (!Number.isInteger(batchIndex) || batchIndex < 0 || batchIndex >= BRAIN_SPRINT_BATCHES) throw new Error('Invalid Brain Sprint batch.')
    const { data: existing } = await admin.from('premium_arcade_content_pools').select('items').eq('activity_type', 'brain_sprint').eq('pool_week', weekStart).maybeSingle()
    const prefix = `b${batchIndex + 1}-`
    const others = ((existing?.items as BrainSprintItem[] | null) ?? []).filter(item => !String(item.id ?? '').startsWith(prefix))
    const items = await generateBrainSprint(batchIndex, others)
    const combined = [...others, ...items]
    const { error } = await admin.from('premium_arcade_content_pools').upsert({ activity_type: 'brain_sprint', pool_week: weekStart, items: combined, model: FAST_MODEL }, { onConflict: 'activity_type,pool_week' })
    if (error) throw error
    counts.brain_sprint = combined.length
  } else if (input.action === 'word_match') {
    const batchIndex = Number(input.batchIndex)
    if (!Number.isInteger(batchIndex) || batchIndex < 0 || batchIndex >= WORD_MATCH_BATCHES) throw new Error('Invalid Word Match batch.')
    const { data: existing } = await admin.from('premium_arcade_content_pools').select('items').eq('activity_type', 'word_match').eq('pool_week', weekStart).maybeSingle()
    const prefix = `b${batchIndex + 1}-`
    const others = ((existing?.items as WordMatchItem[] | null) ?? []).filter(item => !String(item.id ?? '').startsWith(prefix))
    const items = await generateWordMatch(batchIndex, others)
    const combined = [...others, ...items]
    const { error } = await admin.from('premium_arcade_content_pools').upsert({ activity_type: 'word_match', pool_week: weekStart, items: combined, model: MODEL }, { onConflict: 'activity_type,pool_week' })
    if (error) throw error
    counts.word_match = combined.length
  } else if (input.action === 'daily_mentor') {
    const items = await generateDailyMentor(weekStart)
    const { error } = await admin.from('premium_daily_motivations').upsert(items.map((item, index) => ({
      publish_date: addDays(weekStart, Number(item.day ?? index)), quote: item.quote, reflection: item.reflection,
      challenge: item.challenge, mission: item.mission, is_active: true,
    })), { onConflict: 'publish_date' })
    if (error) throw error
    counts.daily_mentor = items.length
  } else if (input.action === 'roleplay_missions') {
    const items = await generateRoleplayMissions(weekStart)
    await admin.from('premium_roleplay_missions').delete().eq('run_id', run.id)
    const { error } = await admin.from('premium_roleplay_missions').insert(items.map((item, index) => ({
      run_id: run.id, mission_date: addDays(weekStart, Number(item.day ?? index)), slug: item.slug, title_en: item.title_en,
      title_lo: item.title_lo, description_en: item.description_en, description_lo: item.description_lo,
      coach_prompt_en: item.coach_prompt_en, coach_prompt_lo: item.coach_prompt_lo,
    })))
    if (error) throw error
    counts.roleplay_missions = items.length
  } else if (input.action === 'prompt_library') {
    const items = await generatePromptLibrary(weekStart)
    await admin.from('premium_prompt_library').delete().eq('run_id', run.id)
    const { error } = await admin.from('premium_prompt_library').insert(items.map((item, index) => ({
      run_id: run.id, week_start: weekStart, slug: item.slug, category: item.category, title_en: item.title_en,
      title_lo: item.title_lo, description_en: item.description_en, description_lo: item.description_lo,
      prompt_en: item.prompt_en, prompt_lo: item.prompt_lo, sort_order: index + 1,
    })))
    if (error) throw error
    counts.prompt_library = items.length
  } else if (input.action === 'lesson_research' || input.action === 'lesson' || input.action === 'book_chapter') {
    const { data: category } = await admin.from('premium_learning_categories').select('id,slug,name_en,name_lo').eq('id', input.categoryId ?? '').eq('is_active', true).maybeSingle()
    if (!category) throw new Error('Learning category not found.')

    if (category.slug === READING_SUMMARY_SLUG) {
      await runBookStep(admin, run, category, input)
    } else if (category.slug === SCHOLARSHIP_SLUG) {
      await runScholarshipStep(admin, run, category, input)
    } else if (input.action === 'lesson_research') {
      // Hand the notes to this category's writing step, which runs next.
      const research = await researchLesson(category, weekStart)
      const { data: lessonTask } = await admin.from('premium_weekly_content_tasks').select('id,payload').eq('run_id', run.id).eq('task_key', `lesson-${category.id}`).maybeSingle()
      if (!lessonTask) throw new Error('The lesson writing step is missing.')
      const { error } = await admin.from('premium_weekly_content_tasks').update({ payload: { ...(lessonTask.payload ?? {}), research } }).eq('id', lessonTask.id)
      if (error) throw error
      return
    } else {
      const lesson = await generateLesson(category, weekStart, input.research)
      await admin.from('premium_lessons').delete().eq('weekly_run_id', run.id).eq('category_id', category.id)
      const { error } = await admin.from('premium_lessons').insert({
        weekly_run_id: run.id, category_id: lesson.category_id, slug: String(lesson.slug).toLowerCase().replace(/[^a-z0-9-]+/g, '-').slice(0, 100),
        title_en: lesson.title_en, title_lo: lesson.title_lo, summary_en: lesson.summary_en, summary_lo: lesson.summary_lo,
        content_en: lesson.content_en, content_lo: lesson.content_lo, key_takeaways_en: lesson.key_takeaways_en,
        key_takeaways_lo: lesson.key_takeaways_lo, difficulty: lesson.difficulty, estimated_minutes: lesson.estimated_minutes,
        lesson_type: 'LESSON', source_url: lesson.source_url || null, source_verified_at: lesson.source_url ? new Date().toISOString() : null,
        status: 'PUBLISHED', published_at: publishAt(weekStart, input.lessonDay), sort_order: 1000 + (counts.lessons ?? 0),
      })
      if (error) throw error
    }
    if (input.action !== 'lesson') return
    const { count: lessonCount } = await admin.from('premium_lessons').select('id', { count: 'exact', head: true }).eq('weekly_run_id', run.id)
    counts.lessons = lessonCount ?? 0
  } else {
    throw new Error(`Unknown generation step: ${input.action}.`)
  }

  await admin.from('premium_weekly_content_runs').update({ content_counts: counts }).eq('id', run.id)
}

function wakeWorker() {
  return fetch(`${SUPABASE_URL}/functions/v1/generate-academy-week`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'process' }),
  }).catch(() => undefined)
}

// Runs one step inside this invocation (no nested HTTP call), renewing the
// lease while Qwen writes so a slow step is never claimed twice.
async function processNextQueuedTask() {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const { data: tasks, error: claimError } = await admin.rpc('claim_academy_content_task')
  if (claimError) throw claimError
  const task = tasks?.[0]
  if (!task) return

  const heartbeat = setInterval(() => {
    admin.from('premium_weekly_content_tasks')
      .update({ lease_expires_at: new Date(Date.now() + TASK_LEASE_MS).toISOString() })
      .eq('id', task.id).eq('status', 'PROCESSING')
      .then(() => undefined, () => undefined)
  }, TASK_HEARTBEAT_MS)

  try {
    const { data: run, error: runError } = await admin.from('premium_weekly_content_runs').select('id,week_start,content_counts').eq('id', task.run_id).single()
    if (runError || !run) throw runError ?? new Error('Generation run not found.')
    await runStep(admin, run as RunRow, { ...(task.payload ?? {}), action: task.action })
    // Guarded by status so a step cancelled mid-write stays cancelled.
    await admin.from('premium_weekly_content_tasks').update({
      status: 'DONE', completed_at: new Date().toISOString(), lease_expires_at: null, error_message: null,
    }).eq('id', task.id).eq('status', 'PROCESSING')
  } catch (error) {
    const exhausted = task.attempts >= task.max_attempts
    const message = error instanceof Error ? error.message : 'Content task failed.'
    console.error(`[academy-forge] ${task.task_key} attempt ${task.attempts}/${task.max_attempts}: ${message}`)
    await admin.from('premium_weekly_content_tasks').update({
      status: exhausted ? 'FAILED' : 'PENDING', lease_expires_at: null,
      available_at: new Date(Date.now() + Math.min(task.attempts * 30_000, 120_000)).toISOString(),
      error_message: exhausted ? message : `Attempt ${task.attempts}/${task.max_attempts} failed, retrying soon · ${message}`,
    }).eq('id', task.id).eq('status', 'PROCESSING')
    if (exhausted) {
      await admin.from('premium_weekly_content_runs').update({ status: 'FAILED', error_message: `${task.task_key}: ${message}` }).eq('id', task.run_id).eq('status', 'GENERATING')
    }
    // The every-minute cron picks the retry up once its backoff has passed.
    return
  } finally {
    clearInterval(heartbeat)
  }

  const { count: unfinished } = await admin.from('premium_weekly_content_tasks').select('id', { count: 'exact', head: true })
    .eq('run_id', task.run_id).in('status', ['PENDING', 'PROCESSING'])
  const { count: paused } = await admin.from('premium_weekly_content_tasks').select('id', { count: 'exact', head: true })
    .eq('run_id', task.run_id).eq('status', 'PAUSED')
  if ((unfinished ?? 0) === 0 && (paused ?? 0) > 0) {
    // Only admin-paused steps remain: wait for someone to start them again.
    await admin.from('premium_weekly_content_runs').update({ status: 'PAUSED' }).eq('id', task.run_id).eq('status', 'GENERATING')
  } else if ((unfinished ?? 0) === 0) {
    const { data: run } = await admin.from('premium_weekly_content_runs').select('week_start').eq('id', task.run_id).single()
    if (run) {
      const inspection = await inspectExistingWeek(admin, run.week_start)
      await admin.from('premium_weekly_content_runs').update(inspection.exists ? {
        status: 'READY', content_counts: inspection.counts, completed_at: new Date().toISOString(), error_message: null,
      } : { status: 'FAILED', error_message: 'Generation ended but required content is incomplete.' }).eq('id', task.run_id)
    }
  } else {
    // Start the next step in a fresh invocation; the cron job remains a fallback.
    await wakeWorker()
  }
}

serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(req) })
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed.' }, 405)
  if (!QWEN_API_KEY) return json(req, { error: 'Weekly content generation is not configured.' }, 503)

  const weekStart = nextMonday()
  try {
    const body = await req.json().catch(() => ({})) as { action?: string; runId?: string; taskKey?: string }
    const action = body.action ?? 'initialize'
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    if (action === 'process') {
      EdgeRuntime.waitUntil(processNextQueuedTask().catch(console.error))
      return json(req, { accepted: true }, 202)
    }

    const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? ''
    if (!token) return json(req, { error: 'Please sign in.' }, 401)
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data: { user }, error: authError } = await authClient.auth.getUser(token)
    if (authError || !user) return json(req, { error: 'Your session has expired.' }, 401)
    const { data: adminUser } = await admin.from('users').select('role').eq('id', user.id).single()
    if (adminUser?.role !== 'ADMIN') return json(req, { error: 'Administrator access is required.' }, 403)
    const actorId = user.id

    if (action === 'check') {
      const inspection = await inspectExistingWeek(admin, weekStart)
      if (inspection.exists && inspection.run?.id && inspection.run.status !== 'READY') {
        await admin.from('premium_weekly_content_runs').update({
          status: 'READY', content_counts: inspection.counts, completed_at: new Date().toISOString(), error_message: null,
        }).eq('id', inspection.run.id)
      }
      return json(req, {
        weekStart, exists: inspection.exists, run: inspection.run, counts: inspection.counts,
        expectedLessons: inspection.expectedLessons, completedLessonCategoryIds: inspection.completedLessonCategoryIds,
      })
    }

    if (action === 'initialize') {
      const inspection = await inspectExistingWeek(admin, weekStart)
      const existing = inspection.run
      if (inspection.exists) return json(req, { error: 'Next week’s content already exists.', code: 'WEEK_ALREADY_EXISTS', weekStart, counts: inspection.counts }, 409)
      // One quota unit per start/continue; the queued steps are capped by max_attempts.
      const quota = await consumeAiQuota(admin, {
        feature: 'generate-academy-week', subjectHash: await userSubject(actorId),
        minuteLimit: GENERATION_MINUTE_LIMIT, dailyLimit: GENERATION_DAILY_LIMIT,
        globalDailyLimit: GENERATION_GLOBAL_DAILY_LIMIT,
      })
      if (!quota.allowed) return quotaResponse(req, quota, corsHeaders)
      const { data: run, error: runError } = await admin.from('premium_weekly_content_runs').upsert({
        week_start: weekStart, status: 'GENERATING', model: MODEL, generated_by: actorId, content_counts: inspection.counts,
        error_message: null, started_at: existing?.started_at ?? new Date().toISOString(), completed_at: null,
      }, { onConflict: 'week_start' }).select('id').single()
      if (runError) throw runError
      const { data: categories, error: categoryError } = await admin.from('premium_learning_categories').select('id,slug,name_en,name_lo').eq('is_active', true).order('sort_order')
      if (categoryError || !categories?.length) throw categoryError ?? new Error('No Learning Hub categories are active.')
      // Preserve all completed records when resuming an interrupted/cancelled run.
      // The database inspection is the source of truth, even if the browser never
      // received the successful response from the previous step.
      const tasks = [
        ...Array.from({ length: BRAIN_SPRINT_BATCHES }, (_, batchIndex) => ({ run_id: run.id, task_key: `brain_sprint-${batchIndex}`, action: 'brain_sprint', payload: { batchIndex } })),
        ...Array.from({ length: WORD_MATCH_BATCHES }, (_, batchIndex) => ({ run_id: run.id, task_key: `word_match-${batchIndex}`, action: 'word_match', payload: { batchIndex } })),
        { run_id: run.id, task_key: 'daily_mentor', action: 'daily_mentor', payload: {} },
        { run_id: run.id, task_key: 'roleplay_missions', action: 'roleplay_missions', payload: {} },
        { run_id: run.id, task_key: 'prompt_library', action: 'prompt_library', payload: {} },
        ...categories.flatMap((category, index) => [
          { run_id: run.id, task_key: `lesson_research-${category.id}`, action: 'lesson_research', payload: { categoryId: category.id } },
          ...bookChapterKeys(category).map((task_key, chapterIndex) => ({ run_id: run.id, task_key, action: 'book_chapter', payload: { categoryId: category.id, chapterIndex } })),
          { run_id: run.id, task_key: `lesson-${category.id}`, action: 'lesson', payload: { categoryId: category.id, lessonDay: index % 7 } },
        ]),
      ]
      const completedKeys = new Set([
        ...Array.from({ length: BRAIN_SPRINT_BATCHES }, (_, index) => index)
          .filter(index => batchIsComplete(inspection.brainIds, index, BRAIN_SPRINT_BATCH_SIZE)).map(index => `brain_sprint-${index}`),
        ...Array.from({ length: WORD_MATCH_BATCHES }, (_, index) => index)
          .filter(index => batchIsComplete(inspection.wordIds, index, WORD_MATCH_BATCH_SIZE)).map(index => `word_match-${index}`),
        ...(inspection.counts.daily_mentor >= 7 ? ['daily_mentor'] : []),
        ...(inspection.counts.roleplay_missions >= 7 ? ['roleplay_missions'] : []),
        ...(inspection.counts.prompt_library >= 7 ? ['prompt_library'] : []),
        ...categories.filter(category => inspection.completedLessonCategoryIds.includes(category.id))
          .flatMap(category => [`lesson_research-${category.id}`, ...bookChapterKeys(category), `lesson-${category.id}`]),
      ])
      // sort_order fixes the processing order; the worker runs one step at a time.
      const { error: tasksError } = await admin.from('premium_weekly_content_tasks').upsert(tasks.map((task, index) => ({
        ...task, sort_order: index + 1, status: completedKeys.has(task.task_key) ? 'DONE' : 'PENDING', attempts: 0,
        available_at: new Date().toISOString(), lease_expires_at: null, error_message: null,
      })), { onConflict: 'run_id,task_key' })
      if (tasksError) throw tasksError
      EdgeRuntime.waitUntil(processNextQueuedTask().catch(console.error))
      return json(req, { runId: run.id, weekStart, categories, queued: true, resumed: Boolean(existing) }, 202)
    }

    if (!body.runId) return json(req, { error: 'A generation run is required.' }, 400)
    const { data: run } = await admin.from('premium_weekly_content_runs').select('id,status').eq('id', body.runId).eq('week_start', weekStart).maybeSingle()
    if (!run) return json(req, { error: 'Generation run not found.' }, 404)
    if (action === 'cancel') {
      await admin.from('premium_weekly_content_runs').update({ status: 'CANCELLED', completed_at: new Date().toISOString() }).eq('id', run.id)
      await admin.from('premium_weekly_content_tasks').update({ status: 'CANCELLED', lease_expires_at: null }).eq('run_id', run.id).in('status', ['PENDING', 'PROCESSING', 'PAUSED'])
      return json(req, { status: 'CANCELLED' })
    }

    // Pause / start one step (taskKey) or every remaining step (no taskKey).
    // A step that is already being written cannot be interrupted mid-request;
    // it finishes and is saved, so only queued steps can be paused.
    if (action === 'pause' || action === 'resume') {
      if (run.status === 'READY') return json(req, { error: 'This week is already complete.' }, 409)
      let tasksQuery = admin.from('premium_weekly_content_tasks').update(
        action === 'pause'
          ? { status: 'PAUSED', updated_at: new Date().toISOString() }
          : { status: 'PENDING', attempts: 0, available_at: new Date().toISOString(), error_message: null, lease_expires_at: null, updated_at: new Date().toISOString() },
      ).eq('run_id', run.id).in('status', action === 'pause' ? ['PENDING'] : ['PAUSED', 'FAILED', 'CANCELLED'])
      if (body.taskKey) tasksQuery = tasksQuery.eq('task_key', body.taskKey)
      const { data: changed, error: changeError } = await tasksQuery.select('task_key')
      if (changeError) throw changeError
      if (body.taskKey && !changed?.length) {
        return json(req, { error: action === 'pause' ? 'Only a queued step can be paused. A running step will finish and save first.' : 'This step cannot be started right now.' }, 409)
      }

      const { count: active } = await admin.from('premium_weekly_content_tasks').select('id', { count: 'exact', head: true })
        .eq('run_id', run.id).in('status', ['PENDING', 'PROCESSING'])
      const nextStatus = (active ?? 0) > 0 ? 'GENERATING' : 'PAUSED'
      await admin.from('premium_weekly_content_runs').update({ status: nextStatus, completed_at: null, error_message: null }).eq('id', run.id)
      if (nextStatus === 'GENERATING') EdgeRuntime.waitUntil(processNextQueuedTask().catch(console.error))
      return json(req, { status: nextStatus, changed: changed?.length ?? 0 })
    }

    return json(req, { error: 'Unknown generation action.' }, 400)
  } catch (error) {
    console.error(error)
    return json(req, { error: error instanceof Error ? error.message : 'Weekly generation failed.' }, 500)
  }
})
