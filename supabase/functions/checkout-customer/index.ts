import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { consumeAiQuota, requestSubject } from '../_shared/ai-rate-limit.ts'

const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceKey)
const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map(value => value.trim()).filter(Boolean)

serve(async (req: Request) => {
  const origin = req.headers.get('Origin') ?? ''
  const headers = {
    'Access-Control-Allow-Origin': allowedOrigins.length === 0 ? '*' : allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
  }
  const respond = (body: unknown, status = 200, extraHeaders: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), { status, headers: { ...headers, ...extraHeaders } })

  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'POST') return respond({ error: 'Method not allowed' }, 405)

  try {
    const body = await req.json().catch(() => null)
    if (typeof body?.phone !== 'string' || body.phone.length > 64) {
      return respond({ error: 'A valid Lao mobile number is required' }, 400)
    }
    const phone = body.phone.replace(/\D/g, '')
    if (!/^(020|20|85620|0085620)?[1-9][0-9]{7}$/.test(phone)) {
      return respond({ error: 'A valid Lao mobile number is required' }, 400)
    }

    // Reuse the existing atomic quota store, with an independent feature budget.
    // This also limits guesses for unknown numbers; raw IPs are never stored.
    const quota = await consumeAiQuota(admin, {
      feature: 'checkout-customer',
      subjectHash: await requestSubject(req, serviceKey),
      minuteLimit: 10,
      dailyLimit: 50,
      globalDailyLimit: 5000,
    })
    if (!quota.allowed) {
      return respond({ error: 'Too many lookups. Please fill in your delivery details manually.' }, 429, {
        'Retry-After': String(quota.retry_after_seconds ?? 60),
      })
    }

    const { data, error } = await admin.rpc('lookup_checkout_customer', { p_phone: phone })
    if (error) throw error
    return respond({ customer: data ?? null })
  } catch {
    return respond({ error: 'Could not load previous delivery details' }, 503)
  }
})
