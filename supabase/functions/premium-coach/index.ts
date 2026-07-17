import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY') ?? ''
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map(v => v.trim()).filter(Boolean)
// Lao generally tokenizes less efficiently than English. These are safety ceilings,
// not targets: billing follows generated tokens, not the configured maximum.
const DEFAULT_MAX_OUTPUT_TOKENS = 2000
const LAO_MAX_OUTPUT_TOKENS = 6000
const MAX_MESSAGE_LENGTH = 20000
const COMPLETION_MARKER = '<END>'
const MAX_COMPLETION_PARTS = 3

const SYSTEM_PROMPT = `You are Bitdoin Mentor, a warm, practical coach for students in Laos. Match the student's language and preferred style. Give direct, useful next steps without shame. Do not enable cheating. Treat medical, legal, and financial topics cautiously. For danger or crisis, encourage immediate help from a trusted adult or local emergency support. Keep profile data private.

Be concise and complete. Normally use 120-300 words and never exceed 450 words unless explicitly asked. Prefer 3-5 short steps. Do not add blank lines between list items. Use compact GitHub-flavored Markdown only when helpful. Format every web address as a Markdown link, for example [Open resource](https://example.com), and never invent URLs. For YouTube recommendations, link to a YouTube results search such as https://www.youtube.com/results?search_query=encoded+topic; never invent or guess a direct video URL. Avoid headings, introductions, repeated summaries, and unnecessary examples. Never stop mid-sentence or with unclosed Markdown.

End every fully completed response with exactly ${COMPLETION_MARKER}. Never output that marker until the answer is genuinely complete.`

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
  const value = (key: string) => typeof r[key] === 'string' ? String(r[key]).slice(0, 200) : '(not shared)'
  return `STUDENT PROFILE\nName: ${value('preferred_name')}\nStatus: ${value('current_status')}\nPriority goal: ${value('priority_goal')}\nBiggest challenge: ${value('biggest_problem_now')}\nDaily study time: ${value('daily_study_hours')}\nAI experience: ${value('ai_tool_experience')}\nEnglish level: ${value('english_level_self_rating')}\nMotivation: ${value('motivation_source')}\nPreferred tone: ${value('preferred_mentor_tone')}\nPreferred answer style: ${value('preferred_ai_response_style')}`
}

type ChatMessage = { role: string; content: string }

function containsLao(value: string) {
  return /[\u0E80-\u0EFF]/u.test(value)
}

function compactHistory(history: ChatMessage[], lao: boolean) {
  const messageLimit = lao ? 2 : 4
  const characterLimit = lao ? 1000 : 1500
  return history.slice(-messageLimit).map(item => ({
    role: item.role,
    content: item.content.slice(0, characterLimit),
  }))
}

function compactMarkdown(value: string) {
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/(^|\n)([-*+]|\d+\.)[ \t]+([^\n]+)\n\n(?=([-*+]|\d+\.)[ \t]+)/g, '$1$2 $3\n')
    .trim()
}

async function requestCompletion(messages: ChatMessage[], maxOutputTokens: number) {
  let lastFinishReason = 'unknown'

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DEEPSEEK_API_KEY}` },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        messages,
        temperature: attempt === 1 ? 0.6 : 0.3,
        max_tokens: maxOutputTokens,
        stream: false,
        thinking: { type: 'disabled' },
      }),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result?.error?.message ?? 'The AI provider did not respond.')

    const choice = result?.choices?.[0]
    const answer = typeof choice?.message?.content === 'string' ? choice.message.content.trim() : ''
    lastFinishReason = choice?.finish_reason ?? 'unknown'

    if (answer) return { answer, finishReason: lastFinishReason }

    console.warn('Empty mentor completion', {
      attempt,
      finishReason: lastFinishReason,
      completionTokens: result?.usage?.completion_tokens,
      reasoningTokens: result?.usage?.completion_tokens_details?.reasoning_tokens,
      requestId: result?.id,
    })

    if (lastFinishReason === 'content_filter') {
      throw new Error('The mentor could not answer that request. Please rephrase it and try again.')
    }
  }

  throw new Error(`The mentor could not produce a response (${lastFinishReason}). Please try again.`)
}

async function generateCompleteAnswer(messages: ChatMessage[]) {
  let answer = ''
  let continuationMessages = messages
  const lao = containsLao(messages.at(-1)?.content ?? '')
  const maxOutputTokens = lao ? LAO_MAX_OUTPUT_TOKENS : DEFAULT_MAX_OUTPUT_TOKENS

  for (let part = 1; part <= MAX_COMPLETION_PARTS; part += 1) {
    const completion = await requestCompletion(continuationMessages, maxOutputTokens)
    const markerIndex = completion.answer.indexOf(COMPLETION_MARKER)

    if (markerIndex >= 0) {
      answer += completion.answer.slice(0, markerIndex)
      return compactMarkdown(answer)
    }

    answer += completion.answer
    if (answer.length > MAX_MESSAGE_LENGTH) {
      throw new Error('The mentor response was too long to save. Please ask for a shorter answer or split the request into parts.')
    }

    console.warn('Mentor completion marker missing; requesting continuation', {
      part,
      finishReason: completion.finishReason,
      answerLength: answer.length,
      language: lao ? 'lo' : 'other',
      maxOutputTokens,
    })

    continuationMessages = [
      ...messages,
      { role: 'assistant', content: answer },
      {
        role: 'user',
        content: `Continue exactly where you stopped. Do not repeat text. Finish briefly and append ${COMPLETION_MARKER}.`,
      },
    ]
  }

  throw new Error('The mentor response could not be completed. Please try again.')
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

    const lao = containsLao(message)
    const messages = [
      { role: 'system', content: `${SYSTEM_PROMPT}\n\n${profileContext(onboarding?.responses as Record<string, unknown> | null)}` },
      ...compactHistory((history ?? []).reverse(), lao),
      { role: 'user', content: message },
    ]
    const answer = await generateCompleteAnswer(messages)
    if (answer.length > MAX_MESSAGE_LENGTH) {
      throw new Error('The mentor response was too long to save. Please ask for a shorter answer or split the request into parts.')
    }

    const { error: saveError } = await admin.from('premium_coach_messages').insert([
      { conversation_id: conversationId, user_id: user.id, role: 'user', content: message },
      { conversation_id: conversationId, user_id: user.id, role: 'assistant', content: answer },
    ])
    if (saveError) throw saveError
    await admin.from('premium_coach_conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId)
    return json(req, { conversationId, answer })
  } catch (error) {
    console.error(error)
    return json(req, { error: error instanceof Error ? error.message : 'AI Coach is temporarily unavailable.' }, 500)
  }
})
