import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  consumeAiQuota,
  positiveIntEnv,
  quotaResponse,
  requestSubject,
  userSubject,
} from '../_shared/ai-rate-limit.ts'
import { buildCatalog, type CatalogBook, createBittyHandler } from './bitty.ts'
import { streamQwenChat } from './qwen.ts'

const QWEN_API_KEY = Deno.env.get('QWEN_API_KEY') ?? ''
const QWEN_BASE_URL = Deno.env.get('QWEN_BASE_URL') || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1'
const BITTY_MODEL = Deno.env.get('BITTY_MODEL') || Deno.env.get('QWEN_TEXT_MODEL') || 'qwen-plus'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
// Guests are rate limited by a peppered IP hash so raw addresses are never stored.
const GUEST_PEPPER = Deno.env.get('BITTY_GUEST_PEPPER') || SUPABASE_SERVICE_ROLE_KEY
const MINUTE_LIMIT = positiveIntEnv('BITTY_MINUTE_LIMIT', 25)
const DAILY_LIMIT = positiveIntEnv('BITTY_DAILY_LIMIT', 100)
const GLOBAL_DAILY_LIMIT = positiveIntEnv('BITTY_GLOBAL_DAILY_LIMIT', 3000)
const PROVIDER_TIMEOUT_MS = positiveIntEnv('BITTY_PROVIDER_TIMEOUT_MS', 45000)
const CATALOG_TTL_MS = 5 * 60_000
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)

const publicDb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

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

let catalogCache: { books: CatalogBook[]; expiresAt: number } | null = null

async function loadCatalog(): Promise<CatalogBook[]> {
  if (catalogCache && catalogCache.expiresAt > Date.now()) return catalogCache.books
  // Read with the anon key so only rows the public storefront can see reach the model.
  const { data, error } = await publicDb
    .from('books')
    .select('id, title, author, language, description, cover_image_url, category:categories(name_en), prices:book_prices(final_price, availability)')
    .eq('is_active', true)
  if (error) throw new Error(`Catalog query failed: ${error.message}`)
  const books = buildCatalog(data ?? [])
  if (books.length === 0) throw new Error('Catalog is empty')
  catalogCache = { books, expiresAt: Date.now() + CATALOG_TTL_MS }
  return books
}

async function identify(req: Request): Promise<string> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  if (token && token !== SUPABASE_ANON_KEY) {
    const { data: { user } } = await publicDb.auth.getUser(token)
    if (user) return userSubject(user.id)
  }
  return requestSubject(req, GUEST_PEPPER)
}

serve(createBittyHandler({
  corsHeaders,
  identify,
  loadCatalog,
  consumeQuota: subjectHash => consumeAiQuota(admin, {
    feature: 'bitty-chat',
    subjectHash,
    minuteLimit: MINUTE_LIMIT,
    dailyLimit: DAILY_LIMIT,
    globalDailyLimit: GLOBAL_DAILY_LIMIT,
  }),
  quotaResponse: (req, quota) => quotaResponse(req, quota, corsHeaders),
  runModel(input, onText) {
    if (!QWEN_API_KEY) throw new Error('QWEN_API_KEY is not set')
    return streamQwenChat({
      apiKey: QWEN_API_KEY,
      baseUrl: QWEN_BASE_URL,
      model: BITTY_MODEL,
      messages: input.messages,
      tools: input.tools,
      toolChoice: input.toolChoice,
      timeoutMs: PROVIDER_TIMEOUT_MS,
      onText,
    })
  },
}))
