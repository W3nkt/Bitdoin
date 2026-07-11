import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GEMINI_API_KEY       = Deno.env.get('GEMINI_API_KEY') ?? ''
const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY    = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
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
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 500, thinkingConfig: { thinkingBudget: 0 } },
        }),
      }
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

    // Extract intent with AI
    const intent = await extractSearchIntent(query)

    // Build Supabase query using full-text and ilike
    const searchTerms = [query, ...(intent.keywords ?? [])].join(' ')
    const { data: books } = await supabase
      .from('books')
      .select('*, category:categories(name_en, name_lo), prices:book_prices(final_price, availability, bookstore:bookstores(name))')
      .eq('is_active', true)
      .or(`title.ilike.%${query}%,author.ilike.%${query}%,description.ilike.%${query}%,isbn.eq.${query}`)
      .limit(limit)

    // Log search
    await supabase.from('search_logs').insert({
      query,
      language,
      results: books?.length ?? 0,
    })

    return new Response(JSON.stringify({
      books: books ?? [],
      intent,
      query: searchTerms,
      total: books?.length ?? 0,
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
