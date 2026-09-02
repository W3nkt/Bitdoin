import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { analyzeImageWithQwen } from '../_shared/qwen-vision.ts'
import { consumeAiQuota, positiveIntEnv, quotaResponse, userSubject } from '../_shared/ai-rate-limit.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const AI_PROVIDER_TIMEOUT_MS = Number(Deno.env.get('AI_RECEIPT_PROVIDER_TIMEOUT_MS')) || 30000
const RECEIPT_MINUTE_LIMIT = positiveIntEnv('AI_RECEIPT_MINUTE_LIMIT', 2)
const RECEIPT_DAILY_LIMIT = positiveIntEnv('AI_RECEIPT_DAILY_LIMIT', 5)
const RECEIPT_GLOBAL_DAILY_LIMIT = positiveIntEnv('AI_RECEIPT_GLOBAL_DAILY_LIMIT', 200)
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)

interface VerifyRequest {
  payment_id: string
}

interface ReceiptExtraction {
  is_payment_receipt: boolean
  amount: number | null
  currency: string | null
  date: string | null
  sender: string | null
  transaction_id: string | null
  bank: string | null
  confidence: number
  raw: string
  provider?: string
  model?: string
}

type ReceiptStorageClient = {
  storage: {
    from: (bucket: string) => {
      download: (path: string) => PromiseLike<{ data: Blob | null; error: unknown }>
    }
  }
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

function jsonResponse(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(req) },
  })
}

function normalizeStorageRef(value: string): { bucket: string; path: string } {
  const match = value.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/?]+)\/(.+?)(?:\?|$)/)
  if (match) return { bucket: decodeURIComponent(match[1]), path: decodeURIComponent(match[2]) }
  return { bucket: 'receipts', path: value }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}

async function fetchReceiptAsBase64(
  supabase: ReceiptStorageClient,
  receiptRef: string,
): Promise<{ base64: string; mimeType: string }> {
  const { bucket, path } = normalizeStorageRef(receiptRef)
  const { data, error } = await supabase.storage.from(bucket).download(path)
  if (error || !data) throw new Error('Receipt image could not be read')
  // Qwen's Base64 data URL must remain below 10 MB after encoding.
  if (data.size > 7 * 1024 * 1024) throw new Error('Receipt image is too large for OCR (maximum 7 MB)')
  const extension = path.split('.').pop()?.toLowerCase()
  const inferredMime = extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg'
  const mimeType = data.type && data.type !== 'application/octet-stream' ? data.type : inferredMime
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
    throw new Error('Receipt must be a JPEG, PNG, or WebP image')
  }

  return {
    base64: bytesToBase64(new Uint8Array(await data.arrayBuffer())),
    mimeType,
  }
}

async function extractReceiptWithQwen(
  supabase: ReceiptStorageClient,
  receiptRef: string,
  expectedAmount: number,
): Promise<ReceiptExtraction> {
  const image = await fetchReceiptAsBase64(supabase, receiptRef)
  const prompt = `You are an OCR and financial-document verification system. Carefully read all visible Lao, Thai, and English text in this image. Determine whether the image is a genuine-looking completed bank payment receipt (not a QR code, blank transfer form, unrelated image, or obvious screenshot edit) for an expected payment of ${expectedAmount} LAK.

Return ONLY one valid JSON object. Never infer unreadable values and never wrap the JSON in Markdown:
{
  "is_payment_receipt": <boolean>,
  "amount": <number or null>,
  "currency": "<ISO currency code such as LAK, or null>",
  "date": "<ISO 8601 date-time with timezone when visible, otherwise the most precise ISO value possible, or null>",
  "sender": "<name or null>",
  "transaction_id": "<id or null>",
  "bank": "<bank name or null>",
  "confidence": <integer 0-100 reflecting OCR clarity and receipt authenticity>,
  "raw": "<brief verification notes without sensitive account numbers>"
}`

  const result = await analyzeImageWithQwen(image, prompt, AI_PROVIDER_TIMEOUT_MS)
  try {
    const parsed = JSON.parse(result.content) as Partial<ReceiptExtraction>
    const amount = parsed.amount === null ? null : Number(parsed.amount)
    const confidence = Math.min(100, Math.max(0, Number(parsed.confidence) || 0))
    return {
      is_payment_receipt: parsed.is_payment_receipt === true,
      amount: amount !== null && Number.isFinite(amount) ? amount : null,
      currency: typeof parsed.currency === 'string' ? parsed.currency.toUpperCase().slice(0, 10) : null,
      date: typeof parsed.date === 'string' ? parsed.date : null,
      sender: typeof parsed.sender === 'string' ? parsed.sender : null,
      transaction_id: typeof parsed.transaction_id === 'string' ? parsed.transaction_id : null,
      bank: typeof parsed.bank === 'string' ? parsed.bank : null,
      confidence,
      raw: typeof parsed.raw === 'string' ? parsed.raw : '',
      provider: 'qwen',
      model: result.model,
    }
  } catch {
    return { is_payment_receipt: false, amount: null, currency: null, date: null, sender: null, transaction_id: null, bank: null, confidence: 0, raw: 'Qwen returned invalid JSON', provider: 'qwen', model: result.model }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(req) })
  }
  if (req.method !== 'POST') {
    return jsonResponse(req, { success: false, error: 'Method not allowed' }, 405)
  }

  let stage = 'request'
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse(req, { success: false, error: 'Authentication required' }, 401)

    const body: VerifyRequest = await req.json()
    if (!body.payment_id) return jsonResponse(req, { success: false, error: 'payment_id is required' }, 400)

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    })
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    })

    stage = 'authentication'
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) return jsonResponse(req, { success: false, error: 'Invalid session' }, 401)

    const { data: roleRow } = await serviceClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    const role = roleRow?.role
    const isStaff = role === 'ADMIN' || role === 'FINANCE'

    stage = 'payment_lookup'
    const { data: payment, error: paymentError } = await serviceClient
      .from('payments')
      .select('id, order_id, user_id, amount, receipt_image_url, verification_status, order:orders(id, customer_id, total_amount)')
      .eq('id', body.payment_id)
      .maybeSingle()

    if (paymentError || !payment) return jsonResponse(req, { success: false, error: 'Payment not found' }, 404)

    const order = Array.isArray(payment.order) ? payment.order[0] : payment.order
    const ownsPayment = payment.user_id === user.id || order?.customer_id === user.id
    if (!isStaff && !ownsPayment) return jsonResponse(req, { success: false, error: 'Not authorized' }, 403)
    if (!payment.receipt_image_url) return jsonResponse(req, { success: false, error: 'No receipt uploaded' }, 400)

    const quota = await consumeAiQuota(serviceClient, {
      feature: 'verify-receipt', subjectHash: await userSubject(user.id),
      minuteLimit: RECEIPT_MINUTE_LIMIT, dailyLimit: RECEIPT_DAILY_LIMIT,
      globalDailyLimit: RECEIPT_GLOBAL_DAILY_LIMIT,
    })
    if (!quota.allowed) return quotaResponse(req, quota, corsHeaders)

    const expectedAmount = Number(payment.amount || order?.total_amount || 0)
    if (!Number.isFinite(expectedAmount) || expectedAmount <= 0) {
      return jsonResponse(req, { success: false, error: 'Invalid payment amount' }, 400)
    }

    stage = 'qwen_ocr'
    const extraction = await extractReceiptWithQwen(serviceClient, payment.receipt_image_url, expectedAmount)

    // A small OCR tolerance is allowed below the total; overpayments are sufficient.
    const amountCoveragePercent = extraction.amount !== null
      ? (extraction.amount / expectedAmount) * 100
      : null
    const amountMatches = amountCoveragePercent !== null && amountCoveragePercent >= 99
    const receiptDate = extraction.date ? new Date(extraction.date) : null
    const dateWithin24h = receiptDate && !Number.isNaN(receiptDate.getTime())
      ? (Date.now() - receiptDate.getTime()) >= -5 * 60 * 1000 &&
        (Date.now() - receiptDate.getTime()) < 24 * 60 * 60 * 1000
      : false

    let transactionUnique = true
    if (extraction.transaction_id) {
      const { data } = await serviceClient
        .from('payments')
        .select('id')
        .eq('transaction_reference', extraction.transaction_id)
        .neq('id', body.payment_id)
        .limit(1)
      transactionUnique = !data || data.length === 0
    }

    let score = Number(extraction.confidence || 0)
    if (!extraction.is_payment_receipt) score = 0
    if (extraction.currency && extraction.currency !== 'LAK') score = Math.min(score, 50)
    if (!amountMatches) score = Math.min(score, 50)
    if (!transactionUnique) score = 0

    // The admin-facing confidence is the payment coverage percentage. Keep it
    // aligned with the coverage badge, capped at 100 for exact/overpayments.
    const canScoreCoverage = extraction.is_payment_receipt &&
      (!extraction.currency || extraction.currency === 'LAK') &&
      amountCoveragePercent !== null
    if (canScoreCoverage) score = Math.min(100, Math.max(0, amountCoveragePercent))

    const suggestedAction = extraction.is_payment_receipt && amountMatches &&
      (!extraction.currency || extraction.currency === 'LAK')
      ? 'APPROVE'
      : 'REJECT_REVIEW'
    const rejectionReasonLo = !amountMatches && extraction.amount !== null
      ? `ຈຳນວນເງິນໃນຫຼັກຖານການໂອນ (${Math.round(extraction.amount).toLocaleString('en-US')} LAK) ບໍ່ກົງກັບຍອດຄຳສັ່ງ (${Math.round(expectedAmount).toLocaleString('en-US')} LAK). ກະລຸນາກວດສອບ ແລະ ສົ່ງຫຼັກຖານການຊຳລະໃໝ່.`
      : !extraction.is_payment_receipt
        ? 'ບໍ່ສາມາດຢືນຢັນວ່າຮູບທີ່ສົ່ງມາເປັນຫຼັກຖານການຊຳລະທີ່ສົມບູນ. ກະລຸນາກວດສອບ ແລະ ສົ່ງຫຼັກຖານໃໝ່.'
        : null

    const extractedData = {
      ...extraction,
      verification: {
        amount_matches: amountMatches,
        amount_coverage_percent: amountCoveragePercent,
        date_within_24h: dateWithin24h,
        transaction_unique: transactionUnique,
      },
      review: {
        suggested_action: suggestedAction,
        rejection_reason_lo: rejectionReasonLo,
        admin_decision_required: true,
      },
    }

    stage = 'payment_update'
    const { error: updateError } = await serviceClient.from('payments').update({
      ai_confidence_score: score,
      ai_extracted_data: extractedData,
      sender_name: extraction.sender,
      // Preserve duplicate IDs in ai_extracted_data for review, but never write
      // them into the uniquely constrained canonical reference column.
      transaction_reference: transactionUnique ? extraction.transaction_id : null,
      bank_name: extraction.bank,
      transferred_at: extraction.date,
      // OCR is advisory only. It must never approve or reject a payment.
      verification_status: ['VERIFIED', 'REJECTED', 'REFUNDED'].includes(payment.verification_status)
        ? payment.verification_status
        : 'REQUIRES_REVIEW',
    }).eq('id', body.payment_id)
    if (updateError) throw new Error(`Could not save OCR result: ${updateError.message}`)

    return jsonResponse(req, {
      success: true,
      admin_decision_required: true,
      suggested_action: suggestedAction,
      rejection_reason_lo: rejectionReasonLo,
      confidence_score: score,
      amount_matches: amountMatches,
      amount_coverage_percent: amountCoveragePercent,
      date_within_24h: dateWithin24h,
      transaction_unique: transactionUnique,
      extracted: extractedData,
    })
  } catch (err) {
    console.error(`[verify-receipt:${stage}]`, err)
    return jsonResponse(req, {
      success: false,
      stage,
      error: err instanceof Error ? err.message : String(err),
    }, 500)
  }
})
