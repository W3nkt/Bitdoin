// The Coach's academic mode (P3-AI #53: AI-001..009). Called from index.ts
// when a request says mode: 'academic'. The model only sees the signed-in
// student's own data, built by the database from their latest snapshot
// (academic_coach_context, migration 145); nothing it writes is used to fetch
// data. Questions go through the safety layer first; answers are checked for
// unsupported numbers and unsafe content before the student sees them.
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { fetchWithTimeout } from '../_shared/timed-fetch.ts'
import { attributesToOther, checkOutput, classifyInput, safeReply, type Resource } from './academic-safety.ts'
import { deterministicSummary, groundedFallback, wordCount } from './academic-numbers.ts'
import { chatMessages, groundedAnswer, summaryMessages, type Message } from './academic-prompt.ts'

const QWEN_API_KEY = Deno.env.get('QWEN_API_KEY') ?? ''
const QWEN_BASE_URL = (Deno.env.get('QWEN_BASE_URL') ?? 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1').replace(/\/$/, '')
const MODEL = Deno.env.get('QWEN_ACADEMIC_MODEL') || Deno.env.get('QWEN_TEXT_MODEL') || 'qwen-plus'
const FEATURE = 'coach_academic'

type Lang = 'en' | 'lo'
type Json = (req: Request, body: unknown, status?: number) => Response

interface Rules { timeout_ms?: number; summary_max_words?: number; history_messages?: number }

async function setting<T>(admin: SupabaseClient, key: string, fallback: T): Promise<T> {
  const { data } = await admin.from('academic_settings').select('value').eq('key', key).maybeSingle()
  return (data?.value ?? fallback) as T
}

/** One provider call; the outcome (no text, no user) feeds the circuit breaker (AI-008). */
async function callModel(admin: SupabaseClient, messages: Message[], lang: Lang, timeoutMs: number) {
  const started = Date.now()
  try {
    const response = await fetchWithTimeout(`${QWEN_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${QWEN_API_KEY}` },
      body: JSON.stringify({ model: MODEL, messages, temperature: 0.3, max_tokens: lang === 'lo' ? 1500 : 600, stream: false, enable_thinking: false }),
    }, timeoutMs)
    const result = await response.json().catch(() => null)
    const content = typeof result?.choices?.[0]?.message?.content === 'string' ? result.choices[0].message.content.trim() : ''
    if (!response.ok || !content) throw new Error(`provider ${response.status}`)
    await admin.rpc('academic_coach_record_call', { p_feature: FEATURE, p_ok: true, p_timed_out: false, p_latency_ms: Date.now() - started, p_model_id: MODEL })
    return content.replace(/<END>\s*$/, '').trim()
  } catch (error) {
    const timedOut = /timed out|abort/i.test(String((error as Error)?.message ?? error))
    await admin.rpc('academic_coach_record_call', { p_feature: FEATURE, p_ok: false, p_timed_out: timedOut, p_latency_ms: Date.now() - started, p_model_id: MODEL })
    throw error
  }
}

export async function handleAcademic({ req, admin, userId, body, json }: { req: Request; admin: SupabaseClient; userId: string; body: Record<string, unknown>; json: Json }) {
  const lang: Lang = body.language === 'lo' ? 'lo' : 'en'
  if ((await setting(admin, 'coach_academic_enabled', false)) !== true) {
    return json(req, { error: 'The Coach cannot answer questions about your scores yet.', code: 'COACH_UNAVAILABLE' }, 404)
  }
  const rules = await setting<Rules>(admin, 'coach_rules', {})
  const timeoutMs = rules.timeout_ms ?? 20000
  const resources = await setting<Resource[]>(admin, 'safeguarding_resources', [])
  const { data: context } = await admin.rpc('academic_coach_context', { p_user_id: userId })
  if (!context?.profile_id) return json(req, { error: 'Set up Schooling first.', code: 'PROFILE_REQUIRED' }, 409)
  if (!context.snapshot_id) return json(req, { error: 'Start a school year in Schooling first.', code: 'NO_ACTIVE_ENROLMENT' }, 409)
  const busy = async () => (await admin.rpc('academic_coach_breaker_open', { p_feature: FEATURE })).data === true
  const call = (messages: Message[]) => callModel(admin, messages, lang, timeoutMs)

  // ─── Monthly summary (AI-009) ──────────────────────────────────────────────
  if (body.action === 'summary') {
    const { data: prompt } = await admin.rpc('academic_prompt', { p_id: 'academic_feedback' })
    const cacheKey = `${context.snapshot_id}|${prompt?.version}|${lang}`
    const { data: cached } = await admin.rpc('academic_ai_cache_get', { p_key: cacheKey })
    if (cached?.body) return json(req, { summary: cached.body, source: cached.source, cached: true })
    const template = () => json(req, { summary: deterministicSummary(context, lang), source: 'template' })
    if (!prompt || await busy()) return template()
    const { data: taken } = await admin.rpc('academic_coach_take_quota', { p_user_id: userId })
    if (!taken) return template()
    const maxWords = rules.summary_max_words ?? 150
    try {
      const result = await groundedAnswer(call, summaryMessages(prompt.body, lang, context), context, '', (text) => wordCount(text) <= maxWords, lang)
      const summary = result.answer && !checkOutput(result.answer, resources) ? result.answer : null
      if (!summary) return template()
      await admin.rpc('academic_ai_cache_put', { p_key: cacheKey, p_snapshot_id: context.snapshot_id, p_prompt_version: prompt.version, p_language: lang, p_body: summary, p_source: 'ai', p_model_id: MODEL })
      return json(req, { summary, source: 'ai' })
    } catch {
      await admin.rpc('academic_coach_refund', { p_user_id: userId, p_period: taken.period_key })
      return template()
    }
  }

  // ─── Chat (AI-001..004) ────────────────────────────────────────────────────
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 2000) : ''
  if (!message) return json(req, { error: 'Write a message first.' }, 400)

  let conversationId = typeof body.conversationId === 'string' ? body.conversationId : null
  if (conversationId) {
    const { data: owned } = await admin.from('premium_coach_conversations').select('id').eq('id', conversationId).eq('user_id', userId).eq('mode', 'academic').maybeSingle()
    if (!owned) return json(req, { error: 'Conversation not found.' }, 404)
  }
  const save = async (answer: string, extra: { prompt_version?: string; model_id?: string; safety_category?: string; numbers_checked?: boolean }) => {
    if (!conversationId) {
      const { data: created, error } = await admin.from('premium_coach_conversations')
        .insert({ user_id: userId, title: message.slice(0, 72), mode: 'academic', student_profile_id: context.profile_id }).select('id').single()
      if (error) throw error
      conversationId = created.id
    }
    const { error: questionError } = await admin.from('premium_coach_messages').insert({ conversation_id: conversationId, user_id: userId, role: 'user', content: message })
    if (questionError) throw questionError
    const { data: saved, error } = await admin.from('premium_coach_messages')
      .insert({ conversation_id: conversationId, user_id: userId, role: 'assistant', content: answer, ...extra }).select('id').single()
    if (error) throw error
    await admin.from('premium_coach_conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId)
    return saved.id as string
  }

  // AI-004: a match never reaches the provider and uses no quota.
  const category = classifyInput(message)
  if (category) {
    const answer = safeReply(category, lang, resources)
    const messageId = await save(answer, { safety_category: category })
    return json(req, { conversationId, messageId, answer, safety: category })
  }

  if (await busy()) return json(req, { error: 'Coach is busy – try later. Your scores, charts and suggestions still work.', code: 'COACH_BUSY' }, 503)
  const { data: taken } = await admin.rpc('academic_coach_take_quota', { p_user_id: userId })
  if (!taken) {
    return json(req, { error: 'You have used this month’s Coach messages. Your dashboard, quizzes and practice sets still work.', code: 'COACH_QUOTA' }, 429)
  }

  const { data: prompt } = await admin.rpc('academic_prompt', { p_id: 'academic_chat' })
  const { data: history } = conversationId
    ? await admin.from('premium_coach_messages').select('role, content').eq('conversation_id', conversationId).eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(rules.history_messages ?? 4)
    : { data: [] }
  const messages = chatMessages(prompt?.body ?? '', lang, context, ((history ?? []) as { role: 'user' | 'assistant'; content: string }[]).reverse(), message)

  let result: { answer: string | null; checked: boolean }
  try {
    result = await groundedAnswer(call, messages, context, message, undefined, lang)
  } catch {
    await admin.rpc('academic_coach_refund', { p_user_id: userId, p_period: taken.period_key })
    return json(req, { error: 'Coach is busy – try later. Your scores, charts and suggestions still work.', code: 'COACH_BUSY' }, 503)
  }
  let answer = result.answer ?? groundedFallback(context, lang)
  let safety: string | undefined
  if (checkOutput(answer, resources)) {
    answer = safeReply('output', lang, resources)
    safety = 'output'
  } else if (attributesToOther(answer, message)) {
    answer = safeReply('other_student', lang, resources)
    safety = 'other_student'
  }
  const messageId = await save(answer, { prompt_version: prompt?.version, model_id: MODEL, numbers_checked: result.checked, safety_category: safety })
  return json(req, { conversationId, messageId, answer, promptVersion: prompt?.version, remaining: taken.remaining })
}
