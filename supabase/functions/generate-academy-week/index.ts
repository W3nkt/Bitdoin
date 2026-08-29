import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { fetchWithTimeout } from '../_shared/timed-fetch.ts'
import { consumeAiQuota, positiveIntEnv, quotaResponse, userSubject } from '../_shared/ai-rate-limit.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const QWEN_API_KEY = Deno.env.get('QWEN_API_KEY') ?? ''
const QWEN_BASE_URL = (Deno.env.get('QWEN_BASE_URL') ?? 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1').replace(/\/$/, '')
const MODEL = Deno.env.get('QWEN_CONTENT_MODEL') ?? Deno.env.get('QWEN_TEXT_MODEL') ?? 'qwen-plus'
const WORKER_SECRET = Deno.env.get('ACADEMY_WORKER_SECRET') ?? ''
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map(v => v.trim()).filter(Boolean)
const GENERATION_MINUTE_LIMIT = positiveIntEnv('AI_WEEKLY_GENERATION_MINUTE_LIMIT', 30)
const GENERATION_DAILY_LIMIT = positiveIntEnv('AI_WEEKLY_GENERATION_DAILY_LIMIT', 50)
const GENERATION_GLOBAL_DAILY_LIMIT = positiveIntEnv('AI_WEEKLY_GENERATION_GLOBAL_DAILY_LIMIT', 50)

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

function parseObject(content: unknown) {
  if (typeof content !== 'string') throw new Error('Qwen returned an empty response.')
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  return JSON.parse(cleaned) as Record<string, unknown>
}

async function askQwen(prompt: string, maxTokens = 8000, enableSearch = false) {
  let lastError: unknown
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetchWithTimeout(`${QWEN_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${QWEN_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: 'You are the senior curriculum editor for Bitdoin Academy in Laos. Research current, reliable information when relevant. Create safe, original, practical bilingual learning content. Return valid JSON only.' },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
          ...(enableSearch ? { enable_search: true } : {}),
          enable_thinking: false,
          temperature: attempt === 1 ? 0.75 : 0.35,
          max_tokens: maxTokens,
        }),
      }, 50000)
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error?.message ?? `Qwen request failed (${response.status}).`)
      return parseObject(result?.choices?.[0]?.message?.content)
    } catch (error) {
      lastError = error
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Qwen could not generate valid content.')
}

function requireArray(result: Record<string, unknown>, key: string, count: number) {
  const value = result[key]
  if (!Array.isArray(value) || value.length !== count) throw new Error(`Qwen returned an invalid ${key} count.`)
  return value as Record<string, unknown>[]
}

const bilingualRules = `Every learner-facing text field must have natural English and natural Lao. Lao must use Lao script, not transliteration. Avoid invented facts, unsafe advice, cheating, politics, gambling, and financial promises. Content must be useful for secondary-school and university-age learners in Laos.`

async function generateBrainSprint(weekStart: string, batchIndex: number) {
  const result = await askQwen(`Prepare part ${batchIndex + 1} of a weekly Brain Sprint. ${bilingualRules}
Return {"items":[7 items]}. Each item: {"id":"unique-kebab-slug","prompt":{"en":"","lo":""},"options":[exactly 4 {"en":"","lo":""}],"answerIndex":0,"explanation":{"en":"one short sentence","lo":"one short sentence"}}. Mix quick math, English, study skills, digital literacy, Lao-context general knowledge, and practical money skills. Be concise.`, 4200)
  return requireArray(result, 'items', 7).map(item => ({ ...item, id: `b${batchIndex + 1}-${item.id}` }))
}

async function generateWordMatch(weekStart: string, batchIndex: number) {
  const result = await askQwen(`Prepare part ${batchIndex + 1} of a weekly Word Match set. ${bilingualRules}
Return {"items":[14 items]}. Each item: {"id":"unique-kebab-slug","english":"real English word or short phrase","lao":"natural Lao translation"}. English must use Latin script, Lao must use Lao script. Be concise.`, 3000)
  return requireArray(result, 'items', 14).map(item => ({ ...item, id: `b${batchIndex + 1}-${item.id}` }))
}

async function generateWeeklyCore(weekStart: string) {
  const result = await askQwen(`Prepare concise content for ${weekStart} through ${addDays(weekStart, 6)}. ${bilingualRules}
Return exactly {"daily_mentor":[7],"roleplay_missions":[7],"prompt_library":[7]}.
daily_mentor item: {"day":0-6,"quote":"one short English sentence","reflection":"one short question","challenge":"one practical action","mission":"one measurable outcome"}.
roleplay_missions item: {"day":0-6,"slug":"unique-slug","title_en":"","title_lo":"","description_en":"one sentence","description_lo":"one sentence","coach_prompt_en":"concise setup; ask one question at a time","coach_prompt_lo":"natural Lao equivalent"}.
prompt_library item: {"slug":"unique-slug","category":"study|research|writing|english|career|coding|productivity","title_en":"","title_lo":"","description_en":"one sentence","description_lo":"one sentence","prompt_en":"concise reusable prompt with [placeholders]","prompt_lo":"natural Lao equivalent"}.`, 7500)
  return {
    mentor: requireArray(result, 'daily_mentor', 7),
    roleplays: requireArray(result, 'roleplay_missions', 7),
    prompts: requireArray(result, 'prompt_library', 7),
  }
}

async function generateCoreStage(stage: 'daily_mentor' | 'roleplay_missions' | 'prompt_library', weekStart: string) {
  const instructions = {
    daily_mentor: `Return {"items":[7 items]} shaped {"day":0-6,"quote":"original English motivational sentence","reflection":"English reflection question","challenge":"English practical action","mission":"English measurable outcome"}.`,
    roleplay_missions: `Return {"items":[7 items]} shaped {"day":0-6,"slug":"unique-kebab-slug","title_en":"","title_lo":"","description_en":"","description_lo":"","coach_prompt_en":"detailed setup instructing the AI to ask one question at a time","coach_prompt_lo":"natural Lao equivalent"}. Use realistic study, English, career, scholarship, workplace, and life situations.`,
    prompt_library: `Return {"items":[7 items]} shaped {"slug":"unique-kebab-slug","category":"study|research|writing|english|career|coding|productivity","title_en":"","title_lo":"","description_en":"","description_lo":"","prompt_en":"reusable copy-ready prompt with [placeholders]","prompt_lo":"natural Lao equivalent"}.`,
  }
  const result = await askQwen(`Prepare ${stage.replace(/_/g, ' ')} for Monday ${weekStart} through Sunday ${addDays(weekStart, 6)}. ${bilingualRules}\n${instructions[stage]}`, 7000)
  return requireArray(result, 'items', 7)
}

async function generateLesson(category: { id: string; slug: string; name_en: string; name_lo: string }, weekStart: string) {
  const result = await askQwen(`Create one new original Learning Hub lesson for category "${category.name_en}" (${category.name_lo}) for the week of ${weekStart}. Research the topic first and prefer durable, verifiable ideas. Do not summarize copyrighted books unless the category specifically requires it; even then write an original educational synthesis. ${bilingualRules}
Return {"slug":"${weekStart}-${category.slug}-unique-topic","title_en":"","title_lo":"","summary_en":"one sentence","summary_lo":"one sentence","content_en":[3 concise objects {"heading":"","body":""}],"content_lo":[3 matching natural-Lao objects],"key_takeaways_en":[3 short strings],"key_takeaways_lo":[3 short strings],"difficulty":"BEGINNER|INTERMEDIATE|ADVANCED","estimated_minutes":5-12,"source_url":"a real authoritative URL used for research or null"}. Do not use Markdown.`, 3500, true)
  return { ...result, category_id: category.id }
}

async function inspectExistingWeek(admin: ReturnType<typeof createClient>, weekStart: string) {
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
  const counts = {
    brain_sprint: Array.isArray(brain.data?.items) ? brain.data.items.length : 0,
    word_match: Array.isArray(words.data?.items) ? words.data.items.length : 0,
    daily_mentor: mentor.count ?? 0,
    roleplay_missions: roleplays.count ?? 0,
    prompt_library: prompts.count ?? 0,
    lessons: lessons.data?.length ?? 0,
  }
  const expectedLessons = categories.count ?? 0
  const exists = counts.brain_sprint >= 35 && counts.word_match >= 42 && counts.daily_mentor >= 7
    && counts.roleplay_missions >= 7 && counts.prompt_library >= 7 && expectedLessons > 0 && counts.lessons >= expectedLessons
  return { exists, run, counts, expectedLessons, completedLessonCategoryIds: (lessons.data ?? []).map(lesson => lesson.category_id) }
}

async function processNextQueuedTask() {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const { data: tasks, error: claimError } = await admin.rpc('claim_academy_content_task')
  if (claimError) throw claimError
  const task = tasks?.[0]
  if (!task) return

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-academy-week`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-academy-worker-secret': WORKER_SECRET },
      body: JSON.stringify({ action: task.action, runId: task.run_id, ...(task.payload ?? {}) }),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok || result.error) throw new Error(result.error ?? `Worker step failed (${response.status}).`)
    await admin.from('premium_weekly_content_tasks').update({
      status: 'DONE', completed_at: new Date().toISOString(), lease_expires_at: null, error_message: null,
    }).eq('id', task.id)
  } catch (error) {
    const exhausted = task.attempts >= task.max_attempts
    const message = error instanceof Error ? error.message : 'Content task failed.'
    await admin.from('premium_weekly_content_tasks').update({
      status: exhausted ? 'FAILED' : 'PENDING', lease_expires_at: null,
      available_at: new Date(Date.now() + Math.min(task.attempts * 30_000, 120_000)).toISOString(), error_message: message,
    }).eq('id', task.id)
    if (exhausted) {
      await admin.from('premium_weekly_content_runs').update({ status: 'FAILED', error_message: `${task.task_key}: ${message}` }).eq('id', task.run_id)
    }
    return
  }

  const { count: unfinished } = await admin.from('premium_weekly_content_tasks').select('id', { count: 'exact', head: true })
    .eq('run_id', task.run_id).in('status', ['PENDING', 'PROCESSING'])
  if ((unfinished ?? 0) === 0) {
    const { data: run } = await admin.from('premium_weekly_content_runs').select('week_start').eq('id', task.run_id).single()
    if (run) {
      const inspection = await inspectExistingWeek(admin, run.week_start)
      await admin.from('premium_weekly_content_runs').update(inspection.exists ? {
        status: 'READY', content_counts: inspection.counts, completed_at: new Date().toISOString(), error_message: null,
      } : { status: 'FAILED', error_message: 'Generation ended but required content is incomplete.' }).eq('id', task.run_id)
    }
  } else {
    // Start the next short request immediately; the cron job remains a fallback.
    await fetch(`${SUPABASE_URL}/functions/v1/generate-academy-week`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'process' }),
    }).catch(() => undefined)
  }
}

serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(req) })
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed.' }, 405)
  if (!QWEN_API_KEY) return json(req, { error: 'Weekly content generation is not configured.' }, 503)

  let weekStart = nextMonday()
  try {
    const body = await req.json().catch(() => ({})) as { action?: string; runId?: string; categoryId?: string; batchIndex?: number; lessonDay?: number }
    const action = body.action ?? 'initialize'
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    if (action === 'process') {
      EdgeRuntime.waitUntil(processNextQueuedTask().catch(console.error))
      return json(req, { accepted: true }, 202)
    }

    const isWorker = Boolean(WORKER_SECRET) && req.headers.get('x-academy-worker-secret') === WORKER_SECRET
    let actorId = ''
    if (isWorker && body.runId) {
      const { data: workerRun } = await admin.from('premium_weekly_content_runs').select('generated_by,week_start').eq('id', body.runId).single()
      actorId = workerRun?.generated_by ?? ''
      if (workerRun?.week_start) weekStart = workerRun.week_start
    } else {
      const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? ''
      if (!token) return json(req, { error: 'Please sign in.' }, 401)
      const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
      const { data: { user }, error: authError } = await authClient.auth.getUser(token)
      if (authError || !user) return json(req, { error: 'Your session has expired.' }, 401)
      const { data: adminUser } = await admin.from('users').select('role').eq('id', user.id).single()
      if (adminUser?.role !== 'ADMIN') return json(req, { error: 'Administrator access is required.' }, 403)
      actorId = user.id
    }
    if (!actorId) return json(req, { error: 'Worker authorization failed.' }, 401)

    if (action === 'check') {
      const inspection = await inspectExistingWeek(admin, weekStart)
      if (inspection.exists && inspection.run?.id && inspection.run.status !== 'READY') {
        await admin.from('premium_weekly_content_runs').update({
          status: 'READY', content_counts: inspection.counts, completed_at: new Date().toISOString(), error_message: null,
        }).eq('id', inspection.run.id)
      }
      return json(req, { weekStart, ...inspection })
    }

    if (action === 'initialize') {
      const inspection = await inspectExistingWeek(admin, weekStart)
      const existing = inspection.run
      if (inspection.exists) return json(req, { error: 'Next week’s content already exists.', code: 'WEEK_ALREADY_EXISTS', weekStart, counts: inspection.counts }, 409)
      const { data: run, error: runError } = await admin.from('premium_weekly_content_runs').upsert({
        week_start: weekStart, status: 'GENERATING', model: MODEL, generated_by: actorId, content_counts: {},
        error_message: null, started_at: existing?.started_at ?? new Date().toISOString(), completed_at: null,
      }, { onConflict: 'week_start' }).select('id').single()
      if (runError) throw runError
      const { data: categories, error: categoryError } = await admin.from('premium_learning_categories').select('id,slug,name_en,name_lo').eq('is_active', true).order('sort_order')
      if (categoryError || !categories?.length) throw categoryError ?? new Error('No Learning Hub categories are active.')
      // Preserve all completed records when resuming an interrupted/cancelled run.
      // The database inspection is the source of truth, even if the browser never
      // received the successful response from the previous step.
      const progress = await inspectExistingWeek(admin, weekStart)
      await admin.from('premium_weekly_content_runs').update({ content_counts: progress.counts }).eq('id', run.id)
      const tasks = [
        ...Array.from({ length: 5 }, (_, batchIndex) => ({ run_id: run.id, task_key: `brain_sprint-${batchIndex}`, action: 'brain_sprint', payload: { batchIndex } })),
        ...Array.from({ length: 3 }, (_, batchIndex) => ({ run_id: run.id, task_key: `word_match-${batchIndex}`, action: 'word_match', payload: { batchIndex } })),
        { run_id: run.id, task_key: 'daily_mentor', action: 'daily_mentor', payload: {} },
        { run_id: run.id, task_key: 'roleplay_missions', action: 'roleplay_missions', payload: {} },
        { run_id: run.id, task_key: 'prompt_library', action: 'prompt_library', payload: {} },
        ...categories.map((category, index) => ({ run_id: run.id, task_key: `lesson-${category.id}`, action: 'lesson', payload: { categoryId: category.id, lessonDay: index % 7 } })),
      ]
      const completedKeys = new Set([
        ...Array.from({ length: Math.floor(progress.counts.brain_sprint / 7) }, (_, index) => `brain_sprint-${index}`),
        ...Array.from({ length: Math.floor(progress.counts.word_match / 14) }, (_, index) => `word_match-${index}`),
        ...(progress.counts.daily_mentor >= 7 ? ['daily_mentor'] : []),
        ...(progress.counts.roleplay_missions >= 7 ? ['roleplay_missions'] : []),
        ...(progress.counts.prompt_library >= 7 ? ['prompt_library'] : []),
        ...progress.completedLessonCategoryIds.map(id => `lesson-${id}`),
      ])
      await admin.from('premium_weekly_content_tasks').upsert(tasks.map(task => ({ ...task, status: completedKeys.has(task.task_key) ? 'DONE' : 'PENDING', attempts: 0, available_at: new Date().toISOString(), error_message: null })), { onConflict: 'run_id,task_key' })
      EdgeRuntime.waitUntil(processNextQueuedTask().catch(console.error))
      return json(req, { runId: run.id, weekStart, categories, queued: true, resumed: Boolean(existing) }, 202)
    }

    if (!body.runId) return json(req, { error: 'A generation run is required.' }, 400)
    const { data: run } = await admin.from('premium_weekly_content_runs').select('id,status,content_counts').eq('id', body.runId).eq('week_start', weekStart).maybeSingle()
    if (!run) return json(req, { error: 'Generation run not found.' }, 404)
    if (action === 'cancel') {
      await admin.from('premium_weekly_content_runs').update({ status: 'CANCELLED', completed_at: new Date().toISOString() }).eq('id', run.id)
      await admin.from('premium_weekly_content_tasks').update({ status: 'CANCELLED', lease_expires_at: null }).eq('run_id', run.id).in('status', ['PENDING', 'PROCESSING'])
      return json(req, { status: 'CANCELLED' })
    }
    if (run.status !== 'GENERATING') return json(req, { error: `This generation run is ${run.status.toLowerCase()}.` }, 409)
    const counts = { ...(run.content_counts as Record<string, number> ?? {}) }

    if (action !== 'finalize') {
      const quota = await consumeAiQuota(admin, {
        feature: 'generate-academy-week', subjectHash: await userSubject(actorId),
        minuteLimit: GENERATION_MINUTE_LIMIT, dailyLimit: GENERATION_DAILY_LIMIT,
        globalDailyLimit: GENERATION_GLOBAL_DAILY_LIMIT,
      })
      if (!quota.allowed) return quotaResponse(req, quota, corsHeaders)
    }

    if (action === 'brain_sprint') {
      const batchIndex = Number(body.batchIndex)
      if (!Number.isInteger(batchIndex) || batchIndex < 0 || batchIndex > 4) return json(req, { error: 'Invalid Brain Sprint batch.' }, 400)
      const items = await generateBrainSprint(weekStart, batchIndex)
      const { data: existing } = await admin.from('premium_arcade_content_pools').select('items').eq('activity_type', 'brain_sprint').eq('pool_week', weekStart).maybeSingle()
      const prefix = `b${batchIndex + 1}-`
      const combined = [...((existing?.items as Record<string, unknown>[] | null) ?? []).filter(item => !String(item.id ?? '').startsWith(prefix)), ...items]
      const { error } = await admin.from('premium_arcade_content_pools').upsert({ activity_type: 'brain_sprint', pool_week: weekStart, items: combined, model: MODEL }, { onConflict: 'activity_type,pool_week' })
      if (error) throw error
      counts.brain_sprint = combined.length
    } else if (action === 'word_match') {
      const batchIndex = Number(body.batchIndex)
      if (!Number.isInteger(batchIndex) || batchIndex < 0 || batchIndex > 2) return json(req, { error: 'Invalid Word Match batch.' }, 400)
      const items = await generateWordMatch(weekStart, batchIndex)
      const { data: existing } = await admin.from('premium_arcade_content_pools').select('items').eq('activity_type', 'word_match').eq('pool_week', weekStart).maybeSingle()
      const prefix = `b${batchIndex + 1}-`
      const combined = [...((existing?.items as Record<string, unknown>[] | null) ?? []).filter(item => !String(item.id ?? '').startsWith(prefix)), ...items]
      const { error } = await admin.from('premium_arcade_content_pools').upsert({ activity_type: 'word_match', pool_week: weekStart, items: combined, model: MODEL }, { onConflict: 'activity_type,pool_week' })
      if (error) throw error
      counts.word_match = combined.length
    } else if (action === 'weekly_core') {
      const { mentor, roleplays, prompts } = await generateWeeklyCore(weekStart)
      await Promise.all([
        admin.from('premium_roleplay_missions').delete().eq('run_id', run.id),
        admin.from('premium_prompt_library').delete().eq('run_id', run.id),
      ])
      const results = await Promise.all([
        admin.from('premium_daily_motivations').upsert(mentor.map((item, index) => ({
          publish_date: addDays(weekStart, Number(item.day ?? index)), quote: item.quote, reflection: item.reflection,
          challenge: item.challenge, mission: item.mission, is_active: true,
        })), { onConflict: 'publish_date' }),
        admin.from('premium_roleplay_missions').insert(roleplays.map((item, index) => ({
          run_id: run.id, mission_date: addDays(weekStart, Number(item.day ?? index)), slug: item.slug, title_en: item.title_en,
          title_lo: item.title_lo, description_en: item.description_en, description_lo: item.description_lo,
          coach_prompt_en: item.coach_prompt_en, coach_prompt_lo: item.coach_prompt_lo,
        }))),
        admin.from('premium_prompt_library').insert(prompts.map((item, index) => ({
          run_id: run.id, week_start: weekStart, slug: item.slug, category: item.category, title_en: item.title_en,
          title_lo: item.title_lo, description_en: item.description_en, description_lo: item.description_lo,
          prompt_en: item.prompt_en, prompt_lo: item.prompt_lo, sort_order: index + 1,
        }))),
      ])
      const failed = results.find(result => result.error)
      if (failed?.error) throw failed.error
      counts.daily_mentor = mentor.length
      counts.roleplay_missions = roleplays.length
      counts.prompt_library = prompts.length
    } else if (action === 'daily_mentor') {
      const items = await generateCoreStage('daily_mentor', weekStart)
      const { error } = await admin.from('premium_daily_motivations').upsert(items.map((item, index) => ({
        publish_date: addDays(weekStart, Number(item.day ?? index)), quote: item.quote, reflection: item.reflection,
        challenge: item.challenge, mission: item.mission, is_active: true,
      })), { onConflict: 'publish_date' })
      if (error) throw error
      counts.daily_mentor = items.length
    } else if (action === 'roleplay_missions') {
      const items = await generateCoreStage('roleplay_missions', weekStart)
      await admin.from('premium_roleplay_missions').delete().eq('run_id', run.id)
      const { error } = await admin.from('premium_roleplay_missions').insert(items.map((item, index) => ({
        run_id: run.id, mission_date: addDays(weekStart, Number(item.day ?? index)), slug: item.slug, title_en: item.title_en,
        title_lo: item.title_lo, description_en: item.description_en, description_lo: item.description_lo,
        coach_prompt_en: item.coach_prompt_en, coach_prompt_lo: item.coach_prompt_lo,
      })))
      if (error) throw error
      counts.roleplay_missions = items.length
    } else if (action === 'prompt_library') {
      const items = await generateCoreStage('prompt_library', weekStart)
      await admin.from('premium_prompt_library').delete().eq('run_id', run.id)
      const { error } = await admin.from('premium_prompt_library').insert(items.map((item, index) => ({
        run_id: run.id, week_start: weekStart, slug: item.slug, category: item.category, title_en: item.title_en,
        title_lo: item.title_lo, description_en: item.description_en, description_lo: item.description_lo,
        prompt_en: item.prompt_en, prompt_lo: item.prompt_lo, sort_order: index + 1,
      })))
      if (error) throw error
      counts.prompt_library = items.length
    } else if (action === 'lesson') {
      const { data: category } = await admin.from('premium_learning_categories').select('id,slug,name_en,name_lo').eq('id', body.categoryId ?? '').eq('is_active', true).maybeSingle()
      if (!category) return json(req, { error: 'Learning category not found.' }, 404)
      const lesson = await generateLesson(category, weekStart)
      await admin.from('premium_lessons').delete().eq('weekly_run_id', run.id).eq('category_id', category.id)
      const { error } = await admin.from('premium_lessons').insert({
        weekly_run_id: run.id, category_id: lesson.category_id, slug: String(lesson.slug).toLowerCase().replace(/[^a-z0-9-]+/g, '-').slice(0, 100),
        title_en: lesson.title_en, title_lo: lesson.title_lo, summary_en: lesson.summary_en, summary_lo: lesson.summary_lo,
        content_en: lesson.content_en, content_lo: lesson.content_lo, key_takeaways_en: lesson.key_takeaways_en,
        key_takeaways_lo: lesson.key_takeaways_lo, difficulty: lesson.difficulty, estimated_minutes: lesson.estimated_minutes,
        lesson_type: 'LESSON', source_url: lesson.source_url || null, source_verified_at: lesson.source_url ? new Date().toISOString() : null,
        status: 'PUBLISHED', published_at: `${addDays(weekStart, Math.max(0, Math.min(6, Number(body.lessonDay ?? 0))))}T00:00:00+07:00`, sort_order: 1000 + (counts.lessons ?? 0),
      })
      if (error) throw error
      const { count: lessonCount } = await admin.from('premium_lessons').select('id', { count: 'exact', head: true }).eq('weekly_run_id', run.id)
      counts.lessons = lessonCount ?? 0
    } else if (action === 'finalize') {
      await admin.from('premium_weekly_content_runs').update({ status: 'READY', completed_at: new Date().toISOString() }).eq('id', run.id)
      return json(req, { runId: run.id, weekStart, status: 'READY', counts })
    } else {
      return json(req, { error: 'Unknown generation action.' }, 400)
    }

    await admin.from('premium_weekly_content_runs').update({ content_counts: counts }).eq('id', run.id)
    return json(req, { runId: run.id, weekStart, status: 'GENERATING', counts })
  } catch (error) {
    console.error(error)
    return json(req, { error: error instanceof Error ? error.message : 'Weekly generation failed.' }, 500)
  }
})
