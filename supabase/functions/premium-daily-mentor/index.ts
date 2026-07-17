import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY') ?? ''
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map(value => value.trim()).filter(Boolean)
const MODEL = 'deepseek-v4-flash'

type Guidance = {
  quote: string
  reflection: string
  challenge: string
  mission: string
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

function localDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Vientiane',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function profileContext(responses: Record<string, unknown> | null) {
  const source = responses ?? {}
  const value = (key: string) => typeof source[key] === 'string' ? String(source[key]).slice(0, 200) : '(not shared)'
  return [
    `Preferred name: ${value('preferred_name')}`,
    `Current status: ${value('current_status')}`,
    `Priority goal: ${value('priority_goal')}`,
    `Biggest challenge: ${value('biggest_problem_now')}`,
    `Daily study time: ${value('daily_study_hours')}`,
    `English confidence: ${value('english_level_self_rating')}`,
    `Motivation source: ${value('motivation_source')}`,
    `Preferred mentor tone: ${value('preferred_mentor_tone')}`,
  ].join('\n')
}

function parseGuidance(content: unknown): Guidance | null {
  if (typeof content !== 'string') return null
  try {
    const parsed = JSON.parse(content) as Partial<Guidance>
    const fields: Array<keyof Guidance> = ['quote', 'reflection', 'challenge', 'mission']
    if (!fields.every(field => typeof parsed[field] === 'string' && parsed[field]!.trim())) return null
    return {
      quote: parsed.quote!.trim().slice(0, 500),
      reflection: parsed.reflection!.trim().slice(0, 1000),
      challenge: parsed.challenge!.trim().slice(0, 1000),
      mission: parsed.mission!.trim().slice(0, 1000),
    }
  } catch {
    return null
  }
}

async function generateGuidance(profile: string, language: string, recent: string[]) {
  const languageInstruction = language.toLowerCase().startsWith('lo')
    ? 'Write naturally in Lao.'
    : 'Write in clear English.'
  const prompt = `Create today's personalized mentor content for one student.
${languageInstruction}
Use the private profile only to personalize; never mention that a profile was provided.
Make today's content meaningfully different from recent days.
Return JSON only with exactly these string keys:
- "quote": one original motivating sentence
- "reflection": one thoughtful question the student can answer
- "challenge": one realistic, specific action for today
- "mission": one short written outcome that proves progress
Keep every field concise, supportive, age-appropriate, and achievable today. Do not use Markdown.

PRIVATE PROFILE
${profile}

RECENT CONTENT TO AVOID REPEATING
${recent.length ? recent.join('\n') : '(none)'}`

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DEEPSEEK_API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: 'You create safe, practical daily coaching for students in Laos. Output valid JSON only.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        thinking: { type: 'disabled' },
        temperature: attempt === 1 ? 0.8 : 0.4,
        max_tokens: 1200,
        stream: false,
      }),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result?.error?.message ?? 'The AI provider did not respond.')
    const guidance = parseGuidance(result?.choices?.[0]?.message?.content)
    if (guidance) return guidance
  }
  throw new Error('The mentor could not create today’s guidance.')
}

serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(req) })
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed.' }, 405)
  if (!DEEPSEEK_API_KEY) return json(req, { error: 'Daily mentor is not configured.' }, 503)

  try {
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
    const { data: cached } = await admin
      .from('premium_personalized_daily_guidance')
      .select('id,publish_date,quote,reflection,challenge,mission')
      .eq('user_id', user.id)
      .eq('publish_date', today)
      .maybeSingle()
    if (cached) return json(req, { guidance: { ...cached, source: 'personalized' }, cached: true })

    const [{ data: onboarding }, { data: member }, { data: recentRows }] = await Promise.all([
      admin.from('premium_onboarding_responses').select('responses').eq('user_id', user.id).maybeSingle(),
      admin.from('users').select('language').eq('id', user.id).maybeSingle(),
      admin.from('premium_personalized_daily_guidance')
        .select('quote,challenge,mission')
        .eq('user_id', user.id)
        .order('publish_date', { ascending: false })
        .limit(3),
    ])

    const recent = (recentRows ?? []).map(row => `${row.quote} | ${row.challenge} | ${row.mission}`)
    const guidance = await generateGuidance(
      profileContext(onboarding?.responses as Record<string, unknown> | null),
      member?.language ?? 'en',
      recent,
    )

    const { data: created, error: insertError } = await admin
      .from('premium_personalized_daily_guidance')
      .insert({ user_id: user.id, publish_date: today, ...guidance, model: MODEL })
      .select('id,publish_date,quote,reflection,challenge,mission')
      .single()

    if (insertError?.code === '23505') {
      const { data: raced, error: racedError } = await admin
        .from('premium_personalized_daily_guidance')
        .select('id,publish_date,quote,reflection,challenge,mission')
        .eq('user_id', user.id)
        .eq('publish_date', today)
        .single()
      if (racedError) throw racedError
      return json(req, { guidance: { ...raced, source: 'personalized' }, cached: true })
    }
    if (insertError) throw insertError
    return json(req, { guidance: { ...created, source: 'personalized' }, cached: false })
  } catch (error) {
    console.error(error)
    return json(req, { error: error instanceof Error ? error.message : 'Daily mentor is temporarily unavailable.' }, 500)
  }
})
