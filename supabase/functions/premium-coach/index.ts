import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY') ?? ''
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map(v => v.trim()).filter(Boolean)

const SYSTEM_PROMPT = `You are Bitdoin Mentor, a warm, practical digital coach for students in Laos. Help with education, confidence, English, responsible AI use, productivity, habits, and career direction. Give specific small next steps, never shame the student, and match their preferred language, tone, and response style. Do not help with cheating or plagiarism. Do not present medical, legal, or financial guidance as professional advice. If a student appears in danger or crisis, respond empathetically and encourage immediate contact with a trusted adult, teacher, counselor, family member, or local emergency support. Keep answers concise unless detail is requested. Treat the profile below as private context: never reveal it wholesale or claim knowledge beyond it.

Format responses with clean GitHub-flavored Markdown when structure helps. Use short headings, **bold**, *italic*, numbered or bullet lists, blockquotes, tables, and fenced code blocks appropriately. For underlined emphasis, use <u>text</u>. Do not wrap the whole response in a code block and do not over-format simple answers.`

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

function profileContext(responses: Record<string, unknown> | null) {
  const r = responses ?? {}
  const value = (key: string) => typeof r[key] === 'string' ? String(r[key]).slice(0, 500) : '(not shared)'
  return `STUDENT PROFILE\nName: ${value('preferred_name')}\nStatus: ${value('current_status')}\nPriority goal: ${value('priority_goal')}\nBiggest challenge: ${value('biggest_problem_now')}\nDaily study time: ${value('daily_study_hours')}\nAI experience: ${value('ai_tool_experience')}\nEnglish level: ${value('english_level_self_rating')}\nMotivation: ${value('motivation_source')}\nPreferred tone: ${value('preferred_mentor_tone')}\nPreferred answer style: ${value('preferred_ai_response_style')}`
}

serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(req) })
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed.' }, 405)
  if (!DEEPSEEK_API_KEY) return json(req, { error: 'AI Coach is not configured.' }, 503)

  try {
    const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? ''
    if (!token) return json(req, { error: 'Please sign in.' }, 401)

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data: { user }, error: authError } = await authClient.auth.getUser(token)
    if (authError || !user) return json(req, { error: 'Your session has expired.' }, 401)

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { data: subscription } = await admin.from('premium_subscriptions').select('id').eq('user_id', user.id).eq('status', 'ACTIVE').or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`).limit(1).maybeSingle()
    if (!subscription) return json(req, { error: 'An active Premium subscription is required.' }, 403)

    const body = await req.json()
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 4000) : ''
    if (!message) return json(req, { error: 'Write a message first.' }, 400)

    let conversationId = typeof body.conversationId === 'string' ? body.conversationId : null
    if (conversationId) {
      const { data: owned } = await admin.from('premium_coach_conversations').select('id').eq('id', conversationId).eq('user_id', user.id).maybeSingle()
      if (!owned) return json(req, { error: 'Conversation not found.' }, 404)
    } else {
      const { data: created, error } = await admin.from('premium_coach_conversations').insert({ user_id: user.id, title: message.slice(0, 72) }).select('id').single()
      if (error) throw error
      conversationId = created.id
    }

    const [{ data: onboarding }, { data: history }] = await Promise.all([
      admin.from('premium_onboarding_responses').select('responses').eq('user_id', user.id).maybeSingle(),
      admin.from('premium_coach_messages').select('role, content').eq('conversation_id', conversationId).eq('user_id', user.id).order('created_at', { ascending: false }).limit(16),
    ])

    const messages = [
      { role: 'system', content: `${SYSTEM_PROMPT}\n\n${profileContext(onboarding?.responses as Record<string, unknown> | null)}` },
      ...((history ?? []).reverse()),
      { role: 'user', content: message },
    ]
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DEEPSEEK_API_KEY}` },
      body: JSON.stringify({ model: 'deepseek-v4-flash', messages, temperature: 0.6, max_tokens: 900, stream: false }),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result?.error?.message ?? 'The AI provider did not respond.')
    const answer = result?.choices?.[0]?.message?.content?.trim()
    if (!answer) throw new Error('The mentor returned an empty response.')

    const { error: saveError } = await admin.from('premium_coach_messages').insert([
      { conversation_id: conversationId, user_id: user.id, role: 'user', content: message },
      { conversation_id: conversationId, user_id: user.id, role: 'assistant', content: answer.slice(0, 8000) },
    ])
    if (saveError) throw saveError
    await admin.from('premium_coach_conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId)
    return json(req, { conversationId, answer })
  } catch (error) {
    console.error(error)
    return json(req, { error: error instanceof Error ? error.message : 'AI Coach is temporarily unavailable.' }, 500)
  }
})
