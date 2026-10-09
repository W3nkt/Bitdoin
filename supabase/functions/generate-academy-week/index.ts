import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { consumeAiQuota, positiveIntEnv, quotaResponse, userSubject } from '../_shared/ai-rate-limit.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const QWEN_API_KEY = Deno.env.get('QWEN_API_KEY') ?? ''
const QWEN_BASE_URL = (Deno.env.get('QWEN_BASE_URL') ?? 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1').replace(/\/$/, '')
// Lessons, mentor, role-play and prompts need the stronger model; the short
// quiz and vocabulary batches use a faster one.
const MODEL = Deno.env.get('QWEN_CONTENT_MODEL') ?? Deno.env.get('QWEN_TEXT_MODEL') ?? 'qwen-plus'
const FAST_MODEL = Deno.env.get('QWEN_FAST_MODEL') ?? 'qwen-flash'
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map(v => v.trim()).filter(Boolean)
const GENERATION_MINUTE_LIMIT = positiveIntEnv('AI_WEEKLY_GENERATION_MINUTE_LIMIT', 30)
const GENERATION_DAILY_LIMIT = positiveIntEnv('AI_WEEKLY_GENERATION_DAILY_LIMIT', 50)
const GENERATION_GLOBAL_DAILY_LIMIT = positiveIntEnv('AI_WEEKLY_GENERATION_GLOBAL_DAILY_LIMIT', 50)

// Qwen answers are streamed, so a long but healthy answer is never cut off.
// A step fails only when Qwen goes silent, or when it would outlive the
// Edge Function's 150s background limit.
const QWEN_IDLE_TIMEOUT_MS = positiveIntEnv('ACADEMY_QWEN_IDLE_TIMEOUT_MS', 30_000)
const QWEN_FIRST_TOKEN_TIMEOUT_MS = positiveIntEnv('ACADEMY_QWEN_FIRST_TOKEN_TIMEOUT_MS', 60_000)
const QWEN_TOTAL_TIMEOUT_MS = positiveIntEnv('ACADEMY_QWEN_TOTAL_TIMEOUT_MS', 110_000)

// Must match the lease set by claim_academy_content_task; renewed while a step runs.
const TASK_LEASE_MS = 3 * 60_000
const TASK_HEARTBEAT_MS = 45_000

// 35 Brain Sprint questions and 42 Word Match pairs per week, in small batches
// so every request finishes well inside the time limit.
const BRAIN_SPRINT_BATCHES = 7
const BRAIN_SPRINT_BATCH_SIZE = 5
const WORD_MATCH_BATCHES = 6
const WORD_MATCH_BATCH_SIZE = 7

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
  research?: LessonResearch
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

function nextMonday() {
  const local = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Vientiane', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
  const value = new Date(`${local}T00:00:00Z`)
  const days = ((8 - value.getUTCDay()) % 7) || 7
  return addDays(local, days)
}

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
async function askQwen(prompt: string, options: { maxTokens: number; model?: string; enableSearch?: boolean }) {
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
        ...(options.enableSearch ? { enable_search: true } : {}),
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

function requireArray(result: Record<string, unknown>, key: string, count: number) {
  const value = result[key]
  if (!Array.isArray(value) || value.length !== count) {
    throw new Error(`Wrong shape: Qwen returned ${Array.isArray(value) ? value.length : 'no'} ${key} (expected ${count}).`)
  }
  return value as Record<string, unknown>[]
}

const bilingualRules = `Every learner-facing text field must have natural English and natural Lao. Lao must use Lao script, not transliteration. Avoid invented facts, unsafe advice, cheating, politics, gambling, and financial promises. Content must be useful for secondary-school and university-age learners in Laos.`

async function generateBrainSprint(batchIndex: number) {
  const result = await askQwen(`Prepare part ${batchIndex + 1} of ${BRAIN_SPRINT_BATCHES} of a weekly Brain Sprint. ${bilingualRules}
Return {"items":[${BRAIN_SPRINT_BATCH_SIZE} items]}. Each item: {"id":"unique-kebab-slug","prompt":{"en":"","lo":""},"options":[exactly 4 {"en":"","lo":""}],"answerIndex":0,"explanation":{"en":"one short sentence","lo":"one short sentence"}}. Mix quick math, English, study skills, digital literacy, Lao-context general knowledge, and practical money skills. Keep every option under 8 words. Be concise.`, { maxTokens: 3000, model: FAST_MODEL })
  return requireArray(result, 'items', BRAIN_SPRINT_BATCH_SIZE).map(item => ({ ...item, id: `b${batchIndex + 1}-${item.id}` }))
}

async function generateWordMatch(batchIndex: number) {
  const result = await askQwen(`Prepare part ${batchIndex + 1} of ${WORD_MATCH_BATCHES} of a weekly Word Match set. ${bilingualRules}
Return {"items":[${WORD_MATCH_BATCH_SIZE} items]}. Each item: {"id":"unique-kebab-slug","english":"real English word or short phrase","lao":"natural Lao translation"}. English must use Latin script, Lao must use Lao script. Be concise.`, { maxTokens: 1500, model: FAST_MODEL })
  return requireArray(result, 'items', WORD_MATCH_BATCH_SIZE).map(item => ({ ...item, id: `b${batchIndex + 1}-${item.id}` }))
}

async function generateCoreStage(stage: 'daily_mentor' | 'roleplay_missions' | 'prompt_library', weekStart: string) {
  const instructions = {
    daily_mentor: `Return {"items":[7 items]} shaped {"day":0-6,"quote":"original English motivational sentence","reflection":"English reflection question","challenge":"English practical action","mission":"English measurable outcome"}.`,
    roleplay_missions: `Return {"items":[7 items]} shaped {"day":0-6,"slug":"unique-kebab-slug","title_en":"","title_lo":"","description_en":"","description_lo":"","coach_prompt_en":"detailed setup instructing the AI to ask one question at a time","coach_prompt_lo":"natural Lao equivalent"}. Use realistic study, English, career, scholarship, workplace, and life situations.`,
    prompt_library: `Return {"items":[7 items]} shaped {"slug":"unique-kebab-slug","category":"study|research|writing|english|career|coding|productivity","title_en":"","title_lo":"","description_en":"","description_lo":"","prompt_en":"reusable copy-ready prompt with [placeholders]","prompt_lo":"natural Lao equivalent"}.`,
  }
  const result = await askQwen(`Prepare ${stage.replace(/_/g, ' ')} for Monday ${weekStart} through Sunday ${addDays(weekStart, 6)}. ${bilingualRules}\n${instructions[stage]}`, { maxTokens: 7000 })
  return requireArray(result, 'items', 7)
}

type Category = { id: string; slug: string; name_en: string; name_lo: string }

// Step 1 of a lesson: the slow web search, with a short English-only answer.
async function researchLesson(category: Category, weekStart: string): Promise<LessonResearch> {
  const result = await askQwen(`Research one new, practical Learning Hub lesson topic for category "${category.name_en}" for learners in Laos, for the week of ${weekStart}. Prefer durable, verifiable ideas. Do not summarize copyrighted books.
Return {"topic":"short lesson title","angle":"one sentence on what the learner will be able to do","outline":[3 section headings],"facts":[3-5 short verified facts or tips],"source_url":"a real authoritative URL you used, or null"}. English only. Be concise.`, { maxTokens: 900, enableSearch: true })
  return {
    topic: String(result.topic ?? ''),
    angle: String(result.angle ?? ''),
    outline: Array.isArray(result.outline) ? result.outline.map(String).slice(0, 3) : [],
    facts: Array.isArray(result.facts) ? result.facts.map(String).slice(0, 5) : [],
    source_url: typeof result.source_url === 'string' && /^https?:\/\//.test(result.source_url) ? result.source_url : null,
  }
}

// Step 2 of a lesson: bilingual writing from the research notes, no search.
// Without notes (an older queued step) it researches inline as before.
async function generateLesson(category: Category, weekStart: string, research?: LessonResearch): Promise<Record<string, unknown>> {
  const brief = research?.topic
    ? `Use these research notes: topic "${research.topic}"; goal: ${research.angle}; sections: ${research.outline.join(' | ')}; facts: ${research.facts.join(' | ')}.`
    : 'Research the topic first and prefer durable, verifiable ideas.'
  const result = await askQwen(`Create one new original Learning Hub lesson for category "${category.name_en}" (${category.name_lo}) for the week of ${weekStart}. ${brief} Do not summarize copyrighted books unless the category specifically requires it; even then write an original educational synthesis. ${bilingualRules}
Return {"slug":"${weekStart}-${category.slug}-unique-topic","title_en":"","title_lo":"","summary_en":"one sentence","summary_lo":"one sentence","content_en":[3 concise objects {"heading":"","body":""}],"content_lo":[3 matching natural-Lao objects],"key_takeaways_en":[3 short strings],"key_takeaways_lo":[3 short strings],"difficulty":"BEGINNER|INTERMEDIATE|ADVANCED","estimated_minutes":5-12,"source_url":"a real authoritative URL used for research or null"}. Do not use Markdown.`, { maxTokens: 3500, enableSearch: !research?.topic })
  const sourceUrl = research?.source_url ?? (typeof result.source_url === 'string' ? result.source_url : null)
  return { ...result, source_url: sourceUrl, category_id: category.id }
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
    const items = await generateBrainSprint(batchIndex)
    const { data: existing } = await admin.from('premium_arcade_content_pools').select('items').eq('activity_type', 'brain_sprint').eq('pool_week', weekStart).maybeSingle()
    const prefix = `b${batchIndex + 1}-`
    const combined = [...((existing?.items as Record<string, unknown>[] | null) ?? []).filter(item => !String(item.id ?? '').startsWith(prefix)), ...items]
    const { error } = await admin.from('premium_arcade_content_pools').upsert({ activity_type: 'brain_sprint', pool_week: weekStart, items: combined, model: FAST_MODEL }, { onConflict: 'activity_type,pool_week' })
    if (error) throw error
    counts.brain_sprint = combined.length
  } else if (input.action === 'word_match') {
    const batchIndex = Number(input.batchIndex)
    if (!Number.isInteger(batchIndex) || batchIndex < 0 || batchIndex >= WORD_MATCH_BATCHES) throw new Error('Invalid Word Match batch.')
    const items = await generateWordMatch(batchIndex)
    const { data: existing } = await admin.from('premium_arcade_content_pools').select('items').eq('activity_type', 'word_match').eq('pool_week', weekStart).maybeSingle()
    const prefix = `b${batchIndex + 1}-`
    const combined = [...((existing?.items as Record<string, unknown>[] | null) ?? []).filter(item => !String(item.id ?? '').startsWith(prefix)), ...items]
    const { error } = await admin.from('premium_arcade_content_pools').upsert({ activity_type: 'word_match', pool_week: weekStart, items: combined, model: FAST_MODEL }, { onConflict: 'activity_type,pool_week' })
    if (error) throw error
    counts.word_match = combined.length
  } else if (input.action === 'daily_mentor') {
    const items = await generateCoreStage('daily_mentor', weekStart)
    const { error } = await admin.from('premium_daily_motivations').upsert(items.map((item, index) => ({
      publish_date: addDays(weekStart, Number(item.day ?? index)), quote: item.quote, reflection: item.reflection,
      challenge: item.challenge, mission: item.mission, is_active: true,
    })), { onConflict: 'publish_date' })
    if (error) throw error
    counts.daily_mentor = items.length
  } else if (input.action === 'roleplay_missions') {
    const items = await generateCoreStage('roleplay_missions', weekStart)
    await admin.from('premium_roleplay_missions').delete().eq('run_id', run.id)
    const { error } = await admin.from('premium_roleplay_missions').insert(items.map((item, index) => ({
      run_id: run.id, mission_date: addDays(weekStart, Number(item.day ?? index)), slug: item.slug, title_en: item.title_en,
      title_lo: item.title_lo, description_en: item.description_en, description_lo: item.description_lo,
      coach_prompt_en: item.coach_prompt_en, coach_prompt_lo: item.coach_prompt_lo,
    })))
    if (error) throw error
    counts.roleplay_missions = items.length
  } else if (input.action === 'prompt_library') {
    const items = await generateCoreStage('prompt_library', weekStart)
    await admin.from('premium_prompt_library').delete().eq('run_id', run.id)
    const { error } = await admin.from('premium_prompt_library').insert(items.map((item, index) => ({
      run_id: run.id, week_start: weekStart, slug: item.slug, category: item.category, title_en: item.title_en,
      title_lo: item.title_lo, description_en: item.description_en, description_lo: item.description_lo,
      prompt_en: item.prompt_en, prompt_lo: item.prompt_lo, sort_order: index + 1,
    })))
    if (error) throw error
    counts.prompt_library = items.length
  } else if (input.action === 'lesson_research' || input.action === 'lesson') {
    const { data: category } = await admin.from('premium_learning_categories').select('id,slug,name_en,name_lo').eq('id', input.categoryId ?? '').eq('is_active', true).maybeSingle()
    if (!category) throw new Error('Learning category not found.')

    if (input.action === 'lesson_research') {
      // Hand the notes to this category's writing step, which runs next.
      const research = await researchLesson(category, weekStart)
      const { data: lessonTask } = await admin.from('premium_weekly_content_tasks').select('id,payload').eq('run_id', run.id).eq('task_key', `lesson-${category.id}`).maybeSingle()
      if (!lessonTask) throw new Error('The lesson writing step is missing.')
      const { error } = await admin.from('premium_weekly_content_tasks').update({ payload: { ...(lessonTask.payload ?? {}), research } }).eq('id', lessonTask.id)
      if (error) throw error
      return
    }

    const lesson = await generateLesson(category, weekStart, input.research)
    await admin.from('premium_lessons').delete().eq('weekly_run_id', run.id).eq('category_id', category.id)
    const { error } = await admin.from('premium_lessons').insert({
      weekly_run_id: run.id, category_id: lesson.category_id, slug: String(lesson.slug).toLowerCase().replace(/[^a-z0-9-]+/g, '-').slice(0, 100),
      title_en: lesson.title_en, title_lo: lesson.title_lo, summary_en: lesson.summary_en, summary_lo: lesson.summary_lo,
      content_en: lesson.content_en, content_lo: lesson.content_lo, key_takeaways_en: lesson.key_takeaways_en,
      key_takeaways_lo: lesson.key_takeaways_lo, difficulty: lesson.difficulty, estimated_minutes: lesson.estimated_minutes,
      lesson_type: 'LESSON', source_url: lesson.source_url || null, source_verified_at: lesson.source_url ? new Date().toISOString() : null,
      status: 'PUBLISHED', published_at: `${addDays(weekStart, Math.max(0, Math.min(6, Number(input.lessonDay ?? 0))))}T00:00:00+07:00`, sort_order: 1000 + (counts.lessons ?? 0),
    })
    if (error) throw error
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
        ...inspection.completedLessonCategoryIds.flatMap(id => [`lesson_research-${id}`, `lesson-${id}`]),
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
