import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
const REQUEST_TIMEOUT_MS = 15_000
// Weekly AI jobs are resumable, so allow a slow-but-healthy Edge response time
// to finish. Individual provider calls still have a much shorter server timeout.
const EDGE_FUNCTION_TIMEOUT_MS = 5 * 60_000

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Copy .env.example to .env and fill in your values.')
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}) {
  const controller = new AbortController()
  const requestUrl = typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.href
      : input.url
  // Database/auth requests should fail quickly, while AI Edge Functions need
  // enough time to wait for their provider. A single 15-second timeout here
  // previously aborted every Qwen request before the feature-level timeout.
  const timeoutMs = requestUrl.includes('/functions/v1/')
    ? EDGE_FUNCTION_TIMEOUT_MS
    : REQUEST_TIMEOUT_MS
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)
  const abortRequest = () => controller.abort()

  init.signal?.addEventListener('abort', abortRequest, { once: true })

  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    window.clearTimeout(timeoutId)
    init.signal?.removeEventListener('abort', abortRequest)
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: fetchWithTimeout,
  },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

export type SupabaseClient = typeof supabase
