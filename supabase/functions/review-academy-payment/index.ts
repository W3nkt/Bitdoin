import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { analyzeImageWithQwen } from '../_shared/qwen-vision.ts'
import { consumeAiQuota, positiveIntEnv, quotaResponse, userSubject } from '../_shared/ai-rate-limit.ts'
import { buildPrompt, buildReview, parseReading } from './review.ts'

// AI check of an Academy payment proof (see review.ts for the rules).
// Called by the member's page right after they upload a proof, and by an
// admin to re-run it. It only suggests Approve / Decline / Check manually;
// approving or declining stays an admin action.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const PROVIDER_TIMEOUT_MS = positiveIntEnv('ACADEMY_RECEIPT_TIMEOUT_MS', 45000)
const MINUTE_LIMIT = positiveIntEnv('ACADEMY_RECEIPT_MINUTE_LIMIT', 3)
const DAILY_LIMIT = positiveIntEnv('ACADEMY_RECEIPT_DAILY_LIMIT', 10)
const GLOBAL_DAILY_LIMIT = positiveIntEnv('ACADEMY_RECEIPT_GLOBAL_DAILY_LIMIT', 300)
const PROOF_BUCKET = 'premium-payment-proofs'
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)

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

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders(req) } })
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(req) })
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405)

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
  let paymentId: string | null = null

  try {
    const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? ''
    const { data: { user } } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY).auth.getUser(token)
    if (!user) return json(req, { error: 'Please sign in.' }, 401)

    const body = await req.json().catch(() => ({})) as { payment_id?: string; force?: boolean }
    paymentId = typeof body.payment_id === 'string' ? body.payment_id : null
    if (!paymentId) return json(req, { error: 'payment_id is required' }, 400)

    const [{ data: roleRow }, { data: payment }] = await Promise.all([
      admin.from('users').select('role').eq('id', user.id).maybeSingle(),
      admin
        .from('premium_payments')
        .select('id,user_id,status,receipt_image_url,amount_lak,subscription:premium_subscriptions(created_at,status),plan:premium_plans(price_lak,name)')
        .eq('id', paymentId)
        .maybeSingle(),
    ])
    const isAdmin = roleRow?.role === 'ADMIN'
    if (!payment) return json(req, { error: 'Payment not found' }, 404)
    if (!isAdmin && payment.user_id !== user.id) return json(req, { error: 'Not allowed' }, 403)
    if (!payment.receipt_image_url) return json(req, { error: 'No payment proof uploaded yet' }, 400)
    if (payment.status !== 'REQUIRES_REVIEW') return json(req, { error: 'This payment is not waiting for review' }, 409)

    // A member's page asks once per upload; only an admin re-runs a finished check.
    const { data: existing } = await admin
      .from('premium_payment_ai_reviews')
      .select('status,receipt_ref')
      .eq('payment_id', paymentId)
      .maybeSingle()
    if (existing && existing.receipt_ref === payment.receipt_image_url && existing.status !== 'FAILED' && !(isAdmin && body.force)) {
      return json(req, { skipped: true, status: existing.status })
    }

    const quota = await consumeAiQuota(admin, {
      feature: 'academy-payment-ocr',
      subjectHash: await userSubject(user.id),
      minuteLimit: MINUTE_LIMIT,
      dailyLimit: DAILY_LIMIT,
      globalDailyLimit: GLOBAL_DAILY_LIMIT,
    })
    if (!quota.allowed) return quotaResponse(req, quota, corsHeaders)

    await admin.from('premium_payment_ai_reviews').upsert({
      payment_id: paymentId,
      status: 'PENDING',
      receipt_ref: payment.receipt_image_url,
      error: null,
    })

    const subscription = Array.isArray(payment.subscription) ? payment.subscription[0] : payment.subscription
    const plan = Array.isArray(payment.plan) ? payment.plan[0] : payment.plan
    const planPrice = Number(plan?.price_lak ?? payment.amount_lak ?? 0)

    // The receiver must be one of the bank accounts members are told to pay.
    const { data: accounts } = await admin.from('payment_accounts').select('account_name').eq('is_active', true)
    const expectedAccountNames = [...new Set((accounts ?? []).map(account => (account.account_name ?? '').trim()).filter(Boolean))]

    const { data: file, error: downloadError } = await admin.storage.from(PROOF_BUCKET).download(payment.receipt_image_url)
    if (downloadError || !file) throw new Error('The payment proof image could not be read')
    if (file.size > 7 * 1024 * 1024) throw new Error('The payment proof is too large to check (over 7 MB)')
    const extension = payment.receipt_image_url.split('.').pop()?.toLowerCase()
    const mimeType = file.type && file.type !== 'application/octet-stream'
      ? file.type
      : extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg'

    const result = await analyzeImageWithQwen(
      { base64: bytesToBase64(new Uint8Array(await file.arrayBuffer())), mimeType },
      buildPrompt(planPrice, expectedAccountNames),
      PROVIDER_TIMEOUT_MS,
    )
    const reading = parseReading(result.content)

    // The same transaction reference on another Academy payment means a reused receipt.
    let duplicateTransaction = false
    if (reading.transaction_id) {
      const { data: others } = await admin
        .from('premium_payment_ai_reviews')
        .select('payment_id')
        .neq('payment_id', paymentId)
        .eq('extracted->>transaction_id', reading.transaction_id)
        .limit(1)
      duplicateTransaction = (others ?? []).length > 0
    }

    const review = buildReview({
      reading,
      planPrice,
      requestedAt: subscription?.created_at ?? new Date().toISOString(),
      expectedAccountNames,
      duplicateTransaction,
    })

    const { error: saveError } = await admin.from('premium_payment_ai_reviews').upsert({
      payment_id: paymentId,
      status: 'DONE',
      receipt_ref: payment.receipt_image_url,
      suggested_action: review.suggested_action,
      checks: review.checks,
      extracted: reading,
      decline_reason_lo: review.decline_reason_lo,
      decline_reason_en: review.decline_reason_en,
      model: result.model,
      error: null,
    })
    if (saveError) throw new Error(`Could not save the AI check: ${saveError.message}`)

    return json(req, { status: 'DONE', ...review })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[review-academy-payment]', message)
    if (paymentId) {
      await admin.from('premium_payment_ai_reviews').upsert({ payment_id: paymentId, status: 'FAILED', error: message.slice(0, 500) })
    }
    return json(req, { error: message }, 500)
  }
})
