import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { consumeAiQuota, positiveIntEnv, quotaResponse, userSubject } from '../_shared/ai-rate-limit.ts'
import { fetchWithTimeout } from '../_shared/timed-fetch.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY') ?? ''
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map(value => value.trim()).filter(Boolean)
const MODEL = 'deepseek-v4-flash'
const ARCADE_POOL_MINUTE_LIMIT = positiveIntEnv('AI_ARCADE_POOL_MINUTE_LIMIT', 2)
const ARCADE_POOL_DAILY_LIMIT = positiveIntEnv('AI_ARCADE_POOL_DAILY_LIMIT', 5)
const ARCADE_POOL_GLOBAL_DAILY_LIMIT = positiveIntEnv('AI_ARCADE_POOL_GLOBAL_DAILY_LIMIT', 20)
const AI_PROVIDER_TIMEOUT_MS = positiveIntEnv('AI_PROVIDER_TIMEOUT_MS', 30000)
const GENERATION_LEASE_SECONDS = positiveIntEnv('AI_ARCADE_POOL_LEASE_SECONDS', 90)

type ActivityType = 'brain_sprint' | 'word_match'

const ITEMS_PER_DAY: Record<ActivityType, number> = { brain_sprint: 5, word_match: 6 }
const POOL_SIZE: Record<ActivityType, number> = { brain_sprint: 35, word_match: 42 }

interface Localized {
  en: string
  lo: string
}

interface BrainSprintItem {
  id: string
  prompt: Localized
  options: Localized[]
  answerIndex: number
  explanation: Localized
}

interface WordMatchItem {
  id: string
  english: string
  lao: string
}

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
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(req) },
  })
}

function localDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Vientiane',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

// Pure calendar-string arithmetic — avoids any wall-clock/timezone pitfalls
// since `dateStr` already represents the Vientiane calendar date.
function mondayOf(dateStr: string) {
  const asUtc = new Date(`${dateStr}T00:00:00Z`)
  const isoDayIndex = (asUtc.getUTCDay() + 6) % 7 // 0 = Monday .. 6 = Sunday
  asUtc.setUTCDate(asUtc.getUTCDate() - isoDayIndex)
  return asUtc.toISOString().slice(0, 10)
}

function dayOfWeekIndex(dateStr: string) {
  const asUtc = new Date(`${dateStr}T00:00:00Z`)
  return (asUtc.getUTCDay() + 6) % 7 // 0 = Monday .. 6 = Sunday
}

// Ported verbatim from src/components/premium/PlayLearnArcade.tsx so a given
// (user, activity, week) seed always produces the same slice as the frontend
// would if it ever needed to recompute it.
function hashSeed(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function seededRandom(seed: number) {
  let value = seed
  return () => {
    value += 0x6D2B79F5
    let result = value
    result = Math.imul(result ^ (result >>> 15), result | 1)
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61)
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(items: T[], random: () => number) {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

function dailySlice<T>(pool: T[], seedKey: string, today: string, itemsPerDay: number) {
  const permuted = shuffle(pool, seededRandom(hashSeed(seedKey)))
  const dayIndex = dayOfWeekIndex(today)
  return permuted.slice(dayIndex * itemsPerDay, (dayIndex + 1) * itemsPerDay)
}

function isNonEmptyString(value: unknown, maxLength: number) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength
}

function isLocalized(value: unknown, maxLength: number): value is Localized {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return isNonEmptyString(candidate.en, maxLength) && isNonEmptyString(candidate.lo, maxLength)
}

const LATIN_WORD_PATTERN = /^[A-Za-z][A-Za-z'’.\- ]{0,39}$/
const LAO_SCRIPT_PATTERN = /[຀-໿]/

function validateBrainSprintItems(value: unknown): BrainSprintItem[] | null {
  if (!Array.isArray(value) || value.length !== POOL_SIZE.brain_sprint) return null
  const ids = new Set<string>()
  const items: BrainSprintItem[] = []

  for (const raw of value) {
    if (!raw || typeof raw !== 'object') return null
    const candidate = raw as Record<string, unknown>
    if (!isNonEmptyString(candidate.id, 80) || ids.has(candidate.id as string)) return null
    if (!isLocalized(candidate.prompt, 300)) return null
    if (!isLocalized(candidate.explanation, 500)) return null
    if (!Array.isArray(candidate.options) || candidate.options.length !== 4) return null
    if (!candidate.options.every(option => isLocalized(option, 120))) return null
    if (!Number.isInteger(candidate.answerIndex) || (candidate.answerIndex as number) < 0 || (candidate.answerIndex as number) > 3) return null

    ids.add(candidate.id as string)
    items.push({
      id: candidate.id as string,
      prompt: candidate.prompt as Localized,
      options: candidate.options as Localized[],
      answerIndex: candidate.answerIndex as number,
      explanation: candidate.explanation as Localized,
    })
  }

  return items
}

function validateWordMatchItems(value: unknown): WordMatchItem[] | null {
  if (!Array.isArray(value) || value.length !== POOL_SIZE.word_match) return null
  const ids = new Set<string>()
  const items: WordMatchItem[] = []

  for (const raw of value) {
    if (!raw || typeof raw !== 'object') return null
    const candidate = raw as Record<string, unknown>
    if (!isNonEmptyString(candidate.id, 80) || ids.has(candidate.id as string)) return null
    if (!isNonEmptyString(candidate.english, 40) || !LATIN_WORD_PATTERN.test((candidate.english as string).trim())) return null
    if (!isNonEmptyString(candidate.lao, 60) || !LAO_SCRIPT_PATTERN.test(candidate.lao as string)) return null

    ids.add(candidate.id as string)
    items.push({
      id: candidate.id as string,
      english: (candidate.english as string).trim(),
      lao: (candidate.lao as string).trim(),
    })
  }

  return items
}

function brainSprintPrompt(recent: string[]) {
  return `Create a pool of exactly ${POOL_SIZE.brain_sprint} short multiple-choice quiz questions for secondary/university students in Laos learning English and general study skills.
Cover a healthy mix of categories across the set: percentage/word-problem math, English grammar and vocabulary, LAK currency financial literacy, study/exam habits, media literacy, and general knowledge. Keep each question solvable in under 20 seconds.
Provide every text field in BOTH English and Lao (natural, fluent Lao — not a literal word-for-word translation).
Return JSON only, with exactly one key "items" holding an array of exactly ${POOL_SIZE.brain_sprint} objects, each shaped exactly as:
{ "id": "kebab-case-unique-slug", "prompt": { "en": "...", "lo": "..." }, "options": [{ "en": "...", "lo": "..." }, ... exactly 4 entries], "answerIndex": 0-3, "explanation": { "en": "...", "lo": "..." } }
"answerIndex" is the zero-based index into "options" of the correct choice. Every "id" must be unique within the array. Do not use Markdown or add any keys beyond what is specified.

QUESTIONS TO AVOID REPEATING (from recent weeks)
${recent.length ? recent.join('\n') : '(none)'}`
}

function wordMatchPrompt(recent: string[]) {
  return `Create a pool of exactly ${POOL_SIZE.word_match} English-to-Lao vocabulary pairs for secondary/university students in Laos, covering practical academic, study, and everyday-life words.
The "english" field must always be a real English word or short phrase written only in Latin script — never Lao script, never translated, never swapped with the Lao side.
The "lao" field must always be its natural Lao translation, written only in Lao script.
Return JSON only, with exactly one key "items" holding an array of exactly ${POOL_SIZE.word_match} objects, each shaped exactly as:
{ "id": "kebab-case-unique-slug", "english": "Word", "lao": "ຄຳສັບ" }
Every "id" and every "english" value must be unique within the array. Do not use Markdown or add any keys beyond what is specified.

WORDS TO AVOID REPEATING (from recent weeks)
${recent.length ? recent.join(', ') : '(none)'}`
}

async function callDeepSeek(systemPrompt: string, userPrompt: string, temperature: number) {
  const response = await fetchWithTimeout('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DEEPSEEK_API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      thinking: { type: 'disabled' },
      temperature,
      max_tokens: 8000,
      stream: false,
    }),
  }, AI_PROVIDER_TIMEOUT_MS)
  const result = await response.json()
  if (!response.ok) throw new Error(result?.error?.message ?? 'The AI provider did not respond.')
  const content = result?.choices?.[0]?.message?.content
  if (typeof content !== 'string') return null
  try {
    const parsed = JSON.parse(content)
    return parsed?.items ?? null
  } catch {
    return null
  }
}

async function generatePool(activityType: ActivityType, recent: string[]) {
  const systemPrompt = 'You create safe, age-appropriate practice content for students in Laos. Output valid JSON only.'
  const userPrompt = activityType === 'brain_sprint' ? brainSprintPrompt(recent) : wordMatchPrompt(recent)
  const validate = activityType === 'brain_sprint' ? validateBrainSprintItems : validateWordMatchItems

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const raw = await callDeepSeek(systemPrompt, userPrompt, attempt === 1 ? 0.9 : 0.5)
    const items = validate(raw)
    if (items) return items
  }
  throw new Error('Could not generate this week’s practice content.')
}

serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(req) })
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed.' }, 405)
  if (!DEEPSEEK_API_KEY) return json(req, { error: 'Play & Learn AI content is not configured.' }, 503)

  try {
    const body = await req.json().catch(() => null)
    const activityType = body?.activity_type
    if (activityType !== 'brain_sprint' && activityType !== 'word_match') {
      return json(req, { error: 'Unknown activity type.' }, 400)
    }

    const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? ''
    if (!token) return json(req, { error: 'Please sign in.' }, 401)

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data: { user }, error: authError } = await authClient.auth.getUser(token)
    if (authError || !user) return json(req, { error: 'Your session has expired.' }, 401)

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { data: subscription } = await admin
      .from('premium_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'ACTIVE')
      .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
      .limit(1)
      .maybeSingle()
    if (!subscription) return json(req, { error: 'An active Premium subscription is required.' }, 403)

    const today = localDate()
    const poolWeek = mondayOf(today)

    const { data: existingPool } = await admin
      .from('premium_arcade_content_pools')
      .select('items, generated_at')
      .eq('activity_type', activityType)
      .eq('pool_week', poolWeek)
      .maybeSingle()

    let pool = existingPool?.items as (BrainSprintItem | WordMatchItem)[] | undefined
    let generatedAt = existingPool?.generated_at as string | undefined

    if (!pool) {
      const { data: leaseToken, error: leaseError } = await admin.rpc('claim_arcade_pool_generation', {
        p_activity_type: activityType,
        p_pool_week: poolWeek,
        p_lease_seconds: Math.min(Math.max(GENERATION_LEASE_SECONDS, 10), 300),
      })
      if (leaseError) throw leaseError
      if (!leaseToken) {
        return new Response(JSON.stringify({
          error: 'This week’s practice content is already being prepared. Please try again in a moment.',
          code: 'AI_GENERATION_IN_PROGRESS',
          retryAfterSeconds: 5,
        }), {
          status: 409,
          headers: { 'Content-Type': 'application/json', 'Retry-After': '5', ...corsHeaders(req) },
        })
      }

      try {
        const quota = await consumeAiQuota(admin, {
          feature: `premium-arcade-pool-${activityType}`,
          subjectHash: await userSubject('system'),
          minuteLimit: ARCADE_POOL_MINUTE_LIMIT,
          dailyLimit: ARCADE_POOL_DAILY_LIMIT,
          globalDailyLimit: ARCADE_POOL_GLOBAL_DAILY_LIMIT,
        })
        if (!quota.allowed) return quotaResponse(req, quota, corsHeaders)

        const { data: recentPools } = await admin
          .from('premium_arcade_content_pools')
          .select('items')
          .eq('activity_type', activityType)
          .order('pool_week', { ascending: false })
          .limit(3)

        const recent = (recentPools ?? []).flatMap(row => {
          const items = row.items as (BrainSprintItem | WordMatchItem)[]
          return activityType === 'brain_sprint'
            ? items.map(item => (item as BrainSprintItem).prompt.en)
            : items.map(item => (item as WordMatchItem).english)
        }).slice(0, 150)

        const generated = await generatePool(activityType, recent)

        const { data: inserted } = await admin
          .from('premium_arcade_content_pools')
          .insert({ activity_type: activityType, pool_week: poolWeek, items: generated, model: MODEL })
          .select('items, generated_at')
          .maybeSingle()

        if (inserted) {
          pool = inserted.items as (BrainSprintItem | WordMatchItem)[]
          generatedAt = inserted.generated_at as string
        } else {
          // Rare race: another request inserted first under a concurrently-held lease window. Re-read the canonical row.
          const { data: canonical, error: rereadError } = await admin
            .from('premium_arcade_content_pools')
            .select('items, generated_at')
            .eq('activity_type', activityType)
            .eq('pool_week', poolWeek)
            .single()
          if (rereadError) throw rereadError
          pool = canonical.items as (BrainSprintItem | WordMatchItem)[]
          generatedAt = canonical.generated_at as string
        }
      } finally {
        const { error: releaseError } = await admin.rpc('release_arcade_pool_generation', {
          p_activity_type: activityType,
          p_pool_week: poolWeek,
          p_lease_token: leaseToken,
        })
        if (releaseError) console.error('Failed to release arcade pool generation lease', releaseError)
      }
    }

    if (!pool) throw new Error('This week’s practice content is not available yet.')

    const items = dailySlice(pool, `${user.id}:${activityType}:${poolWeek}`, today, ITEMS_PER_DAY[activityType])
    return json(req, { items, pool_week: poolWeek, generated_at: generatedAt, source: 'ai' })
  } catch (error) {
    console.error(error)
    return json(req, { error: error instanceof Error ? error.message : 'Play & Learn AI content is temporarily unavailable.' }, 500)
  }
})
