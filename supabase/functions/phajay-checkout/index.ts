// The customer's payment screen talks to this: "make me the QR" (start) and "is it paid yet?" (check),
// for a shop order, an Academy Premium plan or the one-time career report.
//
// Who is paying is decided here, never by the request:
//   shop_order     the order number plus the phone number it was placed with (as the tracking page does)
//   premium, career_report   the signed-in member, from their session token
// The amount always comes from the database, never from the request. Marking the payment as paid
// happens in phajay_settle(), see _shared/phajay-flow.ts.
//
// Needs the secret PHAJAY_API_KEY. Without it every call answers 503 NOT_CONFIGURED and the app falls
// back to the bank-transfer QR, so removing the secret is the off switch.
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { consumeAiQuota, requestSubject, userSubject } from '../_shared/ai-rate-limit.ts'
import { fetchTransaction, generateQr } from '../_shared/phajay.ts'
import { membershipNotifier } from '../_shared/membership-notify-runtime.ts'
import { phajayDb } from '../_shared/phajay-db.ts'
import { FlowError, createPhajayFlow } from '../_shared/phajay-flow.ts'
import type { PaymentTarget } from '../_shared/phajay-flow.ts'

const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceKey)
const apiKey = Deno.env.get('PHAJAY_API_KEY') ?? ''
const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map(value => value.trim()).filter(Boolean)

const flow = apiKey
  ? createPhajayFlow({
    db: phajayDb(admin),
    provider: {
      generateQr: input => generateQr({ apiKey }, input),
      fetchTransaction: transactionId => fetchTransaction({ apiKey }, transactionId),
    },
    afterPaid: membershipNotifier(admin),
    log: message => console.log(`[phajay-checkout] ${message}`),
  })
  : null

// Generous on purpose: customers on a mobile network often share one public address, and the open
// payment screen asks "is it paid?" every few seconds. The order number plus phone check (or the
// member's session) is the lock.
const LIMITS = {
  start: { minuteLimit: 20, dailyLimit: 300, globalDailyLimit: 5000 },
  check: { minuteLimit: 120, dailyLimit: 20000, globalDailyLimit: 500000 },
}

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
  if (req.method !== 'POST') return respond({ error: 'Method not allowed', code: 'BAD_REQUEST' }, 405)
  if (!flow) return respond({ error: 'QR payment is not available', code: 'NOT_CONFIGURED' }, 503)

  try {
    const body = await req.json().catch(() => null)
    const action = body?.action
    const kind = body?.kind ?? 'shop_order'
    if ((action !== 'start' && action !== 'check') || !['shop_order', 'premium', 'career_report'].includes(kind)) {
      return respond({ error: 'Invalid request', code: 'BAD_REQUEST' }, 400)
    }

    let target: PaymentTarget
    let subject: string
    if (kind === 'shop_order') {
      const orderNumber = typeof body?.orderNumber === 'string' ? body.orderNumber.trim() : ''
      const phone = typeof body?.phone === 'string' ? body.phone.trim() : ''
      if (!/^[A-Za-z0-9-]{3,32}$/.test(orderNumber) || phone.length < 6 || phone.length > 64) {
        return respond({ error: 'Invalid request', code: 'BAD_REQUEST' }, 400)
      }
      target = { kind, orderNumber, phone }
      subject = await requestSubject(req, serviceKey)
    } else {
      const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
      const { data, error } = token ? await admin.auth.getUser(token) : { data: null, error: new Error('no token') }
      if (error || !data?.user) return respond({ error: 'Sign in to pay', code: 'SIGN_IN_REQUIRED' }, 401)
      target = { kind, userId: data.user.id }
      subject = await userSubject(data.user.id)
    }

    const quota = await consumeAiQuota(admin, { feature: `phajay-${action}`, subjectHash: subject, ...LIMITS[action as 'start' | 'check'] })
    if (!quota.allowed) {
      return respond({ error: 'Too many requests. Please wait a moment.', code: 'RATE_LIMITED' }, 429, {
        'Retry-After': String(quota.retry_after_seconds ?? 60),
      })
    }

    return respond(action === 'start' ? await flow.start(target) : await flow.check(target))
  } catch (error) {
    if (error instanceof FlowError) return respond({ error: error.message, code: error.code }, error.httpStatus)
    console.error('[phajay-checkout]', error instanceof Error ? error.message : 'unknown error')
    return respond({ error: 'The payment service had a problem', code: 'SERVER_ERROR' }, 500)
  }
})
