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
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map(v => v.trim()).filter(Boolean)
const GENERATION_MINUTE_LIMIT = positiveIntEnv('AI_WEEKLY_GENERATION_MINUTE_LIMIT', 15)
const GENERATION_DAILY_LIMIT = positiveIntEnv('AI_WEEKLY_GENERATION_DAILY_LIMIT', 30)
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

async function askQwen(prompt: string, maxTokens = 8000) {
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
          enable_search: true,
          enable_thinking: false,
          temperature: attempt === 1 ? 0.75 : 0.35,
          max_tokens: maxTokens,
        }),
      }, 90000)
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

async function generateBrainSprint(weekStart: string) {
  const result = await askQwen(`Prepare Brain Sprint content for the week beginning ${weekStart}. ${bilingualRules}
Return {"items":[35 items]}. Each item: {"id":"unique-kebab-slug","prompt":{"en":"","lo":""},"options":[exactly 4 {"en":"","lo":""}],"answerIndex":0,"explanation":{"en":"","lo":""}}. Mix quick math, English, study skills, digital literacy, Lao-context general knowledge, and practical money skills. Each must be answerable in 20 seconds.`, 12000)
  return requireArray(result, 'items', 35)
}

async function generateWordMatch(weekStart: string) {
  const result = await askQwen(`Prepare Word Match content for the week beginning ${weekStart}. ${bilingualRules}
Return {"items":[42 items]}. Each item: {"id":"unique-kebab-slug","english":"real English word or short phrase","lao":"natural Lao translation"}. English must use Latin script, Lao must use Lao script, and no word may repeat.`, 6000)
  return requireArray(result, 'items', 42)
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
Return {"slug":"${weekStart}-${category.slug}-unique-topic","title_en":"","title_lo":"","summary_en":"","summary_lo":"","content_en":[4 objects {"heading":"","body":""}],"content_lo":[4 matching natural-Lao objects],"key_takeaways_en":[3 strings],"key_takeaways_lo":[3 strings],"difficulty":"BEGINNER|INTERMEDIATE|ADVANCED","estimated_minutes":5-15,"source_url":"a real authoritative URL used for research or null"}. Do not use Markdown inside body fields.`, 5000)
  return { ...result, category_id: category.id }
}

serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(req) })
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed.' }, 405)
  if (!QWEN_API_KEY) return json(req, { error: 'Weekly content generation is not configured.' }, 503)

  const weekStart = nextMonday()
  try {
    const body = await req.json().catch(() => ({})) as { action?: string; runId?: string; categoryId?: string }
    const action = body.action ?? 'initialize'
    const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? ''
    if (!token) return json(req, { error: 'Please sign in.' }, 401)
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data: { user }, error: authError } = await authClient.auth.getUser(token)
    if (authError || !user) return json(req, { error: 'Your session has expired.' }, 401)

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { data: adminUser } = await admin.from('users').select('role').eq('id', user.id).single()
    if (adminUser?.role !== 'ADMIN') return json(req, { error: 'Administrator access is required.' }, 403)

    if (action === 'initialize') {
      const { data: existing } = await admin.from('premium_weekly_content_runs').select('id,status,content_counts,completed_at').eq('week_start', weekStart).maybeSingle()
      if (existing?.status === 'READY') return json(req, { error: 'Next week’s content is already ready.', code: 'WEEK_ALREADY_READY', run: existing }, 409)
      if (existing?.status === 'GENERATING') {
        await admin.from('premium_weekly_content_runs').update({ status: 'CANCELLED', completed_at: new Date().toISOString() }).eq('id', existing.id)
      }
      const { data: run, error: runError } = await admin.from('premium_weekly_content_runs').upsert({
        week_start: weekStart, status: 'GENERATING', model: MODEL, generated_by: user.id, content_counts: {},
        error_message: null, started_at: new Date().toISOString(), completed_at: null,
      }, { onConflict: 'week_start' }).select('id').single()
      if (runError) throw runError
      const { data: categories, error: categoryError } = await admin.from('premium_learning_categories').select('id,slug,name_en,name_lo').eq('is_active', true).order('sort_order')
      if (categoryError || !categories?.length) throw categoryError ?? new Error('No Learning Hub categories are active.')
      await Promise.all([
        admin.from('premium_roleplay_missions').delete().eq('run_id', run.id),
        admin.from('premium_prompt_library').delete().eq('run_id', run.id),
        admin.from('premium_lessons').delete().eq('weekly_run_id', run.id),
        admin.from('premium_arcade_content_pools').delete().eq('pool_week', weekStart),
      ])
      return json(req, { runId: run.id, weekStart, categories })
    }

    if (!body.runId) return json(req, { error: 'A generation run is required.' }, 400)
    const { data: run } = await admin.from('premium_weekly_content_runs').select('id,status,content_counts').eq('id', body.runId).eq('week_start', weekStart).maybeSingle()
    if (!run) return json(req, { error: 'Generation run not found.' }, 404)
    if (action === 'cancel') {
      await admin.from('premium_weekly_content_runs').update({ status: 'CANCELLED', completed_at: new Date().toISOString() }).eq('id', run.id)
      return json(req, { status: 'CANCELLED' })
    }
    if (run.status !== 'GENERATING') return json(req, { error: `This generation run is ${run.status.toLowerCase()}.` }, 409)
    const counts = { ...(run.content_counts as Record<string, number> ?? {}) }

    if (action !== 'finalize') {
      const quota = await consumeAiQuota(admin, {
        feature: 'generate-academy-week', subjectHash: await userSubject(user.id),
        minuteLimit: GENERATION_MINUTE_LIMIT, dailyLimit: GENERATION_DAILY_LIMIT,
        globalDailyLimit: GENERATION_GLOBAL_DAILY_LIMIT,
      })
      if (!quota.allowed) return quotaResponse(req, quota, corsHeaders)
    }

    if (action === 'brain_sprint') {
      const items = await generateBrainSprint(weekStart)
      const { error } = await admin.from('premium_arcade_content_pools').insert({ activity_type: 'brain_sprint', pool_week: weekStart, items, model: MODEL })
      if (error) throw error
      counts.brain_sprint = items.length
    } else if (action === 'word_match') {
      const items = await generateWordMatch(weekStart)
      const { error } = await admin.from('premium_arcade_content_pools').insert({ activity_type: 'word_match', pool_week: weekStart, items, model: MODEL })
      if (error) throw error
      counts.word_match = items.length
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
      const { error } = await admin.from('premium_roleplay_missions').insert(items.map((item, index) => ({
        run_id: run.id, mission_date: addDays(weekStart, Number(item.day ?? index)), slug: item.slug, title_en: item.title_en,
        title_lo: item.title_lo, description_en: item.description_en, description_lo: item.description_lo,
        coach_prompt_en: item.coach_prompt_en, coach_prompt_lo: item.coach_prompt_lo,
      })))
      if (error) throw error
      counts.roleplay_missions = items.length
    } else if (action === 'prompt_library') {
      const items = await generateCoreStage('prompt_library', weekStart)
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
      const { error } = await admin.from('premium_lessons').insert({
        weekly_run_id: run.id, category_id: lesson.category_id, slug: String(lesson.slug).toLowerCase().replace(/[^a-z0-9-]+/g, '-').slice(0, 100),
        title_en: lesson.title_en, title_lo: lesson.title_lo, summary_en: lesson.summary_en, summary_lo: lesson.summary_lo,
        content_en: lesson.content_en, content_lo: lesson.content_lo, key_takeaways_en: lesson.key_takeaways_en,
        key_takeaways_lo: lesson.key_takeaways_lo, difficulty: lesson.difficulty, estimated_minutes: lesson.estimated_minutes,
        lesson_type: 'LESSON', source_url: lesson.source_url || null, source_verified_at: lesson.source_url ? new Date().toISOString() : null,
        status: 'PUBLISHED', published_at: `${weekStart}T00:00:00+07:00`, sort_order: 1000 + (counts.lessons ?? 0),
      })
      if (error) throw error
      counts.lessons = (counts.lessons ?? 0) + 1
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
