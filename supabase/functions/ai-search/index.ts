import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { consumeAiQuota, positiveIntEnv, quotaResponse, requestSubject } from '../_shared/ai-rate-limit.ts'
import { fetchWithTimeout } from '../_shared/timed-fetch.ts'

const GEMINI_API_KEY       = Deno.env.get('GEMINI_API_KEY') ?? ''
const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY    = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const AI_RATE_LIMIT_PEPPER = Deno.env.get('AI_RATE_LIMIT_PEPPER') ?? SUPABASE_SERVICE_ROLE_KEY
const SEARCH_MINUTE_LIMIT = positiveIntEnv('AI_SEARCH_MINUTE_LIMIT', 10)
const SEARCH_DAILY_LIMIT = positiveIntEnv('AI_SEARCH_DAILY_LIMIT', 100)
const SEARCH_GLOBAL_DAILY_LIMIT = positiveIntEnv('AI_SEARCH_GLOBAL_DAILY_LIMIT', 10000)
const AI_PROVIDER_TIMEOUT_MS = positiveIntEnv('AI_SEARCH_PROVIDER_TIMEOUT_MS', 12000)
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)

interface SearchRequest {
  query: string
  language?: string
  limit?: number
}

function cleanSearchValue(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[,%()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
}

function corsHeaders(req: Request) {
  const origin = req.headers.get('Origin') ?? ''
  const allowedOrigin = ALLOWED_ORIGINS.length === 0
    ? '*'
    : ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

async function extractSearchIntent(query: string): Promise<{
  keywords: string[]
  category?: string
  priceMax?: number
  language?: string
  isbnSearch?: string
  expanded: string
}> {
  const prompt = `You are a book search assistant for a Lao PDR bookstore.
Analyze this search query and extract structured intent.
Query: "${query}"

Return ONLY valid JSON:
{
  "keywords": ["array", "of", "key", "terms"],
  "category": "category name or null",
  "priceMax": null or number in LAK,
  "language": "Lao/English/Thai/etc or null",
  "isbnSearch": "ISBN if present or null",
  "expanded": "Expanded search query with synonyms and related terms in 1-2 sentences"
}`

  try {
    const response = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 500, thinkingConfig: { thinkingBudget: 0 } },
        }),
      },
      AI_PROVIDER_TIMEOUT_MS,
    )
    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
    return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim())
  } catch {
    return { keywords: [query], expanded: query }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(req) })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed.', books: [] }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(req) },
    })
  }

  try {
    const body: SearchRequest = await req.json()
    const query = cleanSearchValue(body.query ?? '')
    const language = body.language?.slice(0, 20)
    const limit = Math.min(Math.max(Number(body.limit ?? 20) || 20, 1), 50)
    if (!query) {
      return new Response(JSON.stringify({ books: [], intent: null, query: '', total: 0 }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders(req) },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const quota = await consumeAiQuota(admin, {
      feature: 'ai-search',
      subjectHash: await requestSubject(req, AI_RATE_LIMIT_PEPPER),
      minuteLimit: SEARCH_MINUTE_LIMIT,
      dailyLimit: SEARCH_DAILY_LIMIT,
      globalDailyLimit: SEARCH_GLOBAL_DAILY_LIMIT,
    })
    if (!quota.allowed) return quotaResponse(req, quota, corsHeaders)

    // Extract intent with AI
    const intent = await extractSearchIntent(query)

    // Use the indexed database search path shared with the storefront.
    const searchTerms = [query, ...(intent.keywords ?? [])].join(' ')
    const { data: searchResult, error: searchError } = await supabase.rpc('search_books', {
      p_query: query,
      p_category_id: null,
      p_language: language || intent.language || null,
      p_isbn: intent.isbnSearch || null,
      p_sort: 'newest',
      p_offset: 0,
      p_limit: limit,
    })
    if (searchError) throw searchError
    const result = searchResult as { books?: unknown[]; count?: number } | null
    const books = result?.books ?? []

    // Log search
    await supabase.from('search_logs').insert({
      query,
      language,
      results: books.length,
    })

    return new Response(JSON.stringify({
      books,
      intent,
      query: searchTerms,
      total: Number(result?.count ?? books.length),
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(req),
      },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err), books: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(req) },
    })
  }
})
