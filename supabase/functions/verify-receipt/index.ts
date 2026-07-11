import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)

interface VerifyRequest {
  payment_id: string
}

interface GeminiExtraction {
  amount: number | null
  date: string | null
  sender: string | null
  transaction_id: string | null
  bank: string | null
  confidence: number
  raw: string
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
  supabase: ReturnType<typeof createClient>,
  receiptRef: string,
): Promise<{ base64: string; mimeType: string }> {
  const { bucket, path } = normalizeStorageRef(receiptRef)
  const { data, error } = await supabase.storage.from(bucket).download(path)
  if (error || !data) throw new Error('Receipt image could not be read')
  if (data.size > 10 * 1024 * 1024) throw new Error('Receipt image is too large')

  return {
    base64: bytesToBase64(new Uint8Array(await data.arrayBuffer())),
    mimeType: data.type || 'image/jpeg',
  }
}

async function extractReceiptWithGemini(
  supabase: ReturnType<typeof createClient>,
  receiptRef: string,
  expectedAmount: number,
): Promise<GeminiExtraction> {
  if (!GEMINI_API_KEY) {
    return { amount: null, date: null, sender: null, transaction_id: null, bank: null, confidence: 0, raw: 'GEMINI_API_KEY not configured' }
  }

  const image = await fetchReceiptAsBase64(supabase, receiptRef)
  const prompt = `You are a financial document analyst. Extract payment receipt fields and determine whether it is a valid receipt for ${expectedAmount} LAK.

Return ONLY valid JSON:
{
  "amount": <number or null>,
  "date": "<ISO date string or null>",
  "sender": "<name or null>",
  "transaction_id": "<id or null>",
  "bank": "<bank name or null>",
  "confidence": <0-100>,
  "raw": "<brief notes>"
}`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType: image.mimeType, data: image.base64 } },
          ],
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 1000, thinkingConfig: { thinkingBudget: 0 } },
      }),
    },
  )

  if (!response.ok) {
    return { amount: null, date: null, sender: null, transaction_id: null, bank: null, confidence: 0, raw: 'Gemini API error' }
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
  try {
    return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim())
  } catch {
    return { amount: null, date: null, sender: null, transaction_id: null, bank: null, confidence: 0, raw: text }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(req) })
  }
  if (req.method !== 'POST') {
    return jsonResponse(req, { success: false, error: 'Method not allowed' }, 405)
  }

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

    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) return jsonResponse(req, { success: false, error: 'Invalid session' }, 401)

    const { data: roleRow } = await serviceClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    const role = roleRow?.role
    const isStaff = role === 'ADMIN' || role === 'FINANCE'

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

    const expectedAmount = Number(payment.amount || order?.total_amount || 0)
    if (!Number.isFinite(expectedAmount) || expectedAmount <= 0) {
      return jsonResponse(req, { success: false, error: 'Invalid payment amount' }, 400)
    }

    const extraction = await extractReceiptWithGemini(serviceClient, payment.receipt_image_url, expectedAmount)

    const amountMatches = extraction.amount !== null &&
      Math.abs(extraction.amount - expectedAmount) / expectedAmount < 0.01
    const receiptDate = extraction.date ? new Date(extraction.date) : null
    const dateWithin24h = receiptDate && !Number.isNaN(receiptDate.getTime())
      ? (Date.now() - receiptDate.getTime()) < 24 * 60 * 60 * 1000
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
    if (!amountMatches) score = Math.min(score, 50)
    if (!dateWithin24h) score = Math.min(score, 60)
    if (!transactionUnique) score = 0

    const autoApprove = score >= 90 && amountMatches && transactionUnique

    await serviceClient.from('payments').update({
      ai_confidence_score: score,
      ai_extracted_data: extraction,
      sender_name: extraction.sender,
      transaction_reference: extraction.transaction_id,
      bank_name: extraction.bank,
      transferred_at: extraction.date,
      verification_status: autoApprove ? 'VERIFIED' : 'REQUIRES_REVIEW',
    }).eq('id', body.payment_id)

    if (autoApprove && order?.id) {
      await serviceClient.from('orders').update({
        payment_status: 'VERIFIED',
        status: 'PROCESSING',
      }).eq('id', order.id)

      await serviceClient.from('notifications').insert({
        user_id: order.customer_id,
        channel: 'IN_APP',
        recipient: order.customer_id ?? order.id,
        subject: 'Payment Verified',
        message: 'Your payment has been verified automatically. Your order is now being processed.',
        status: 'SENT',
        sent_at: new Date().toISOString(),
      })
    }

    return jsonResponse(req, {
      success: true,
      auto_approved: autoApprove,
      confidence_score: score,
      amount_matches: amountMatches,
      transaction_unique: transactionUnique,
      extracted: extraction,
    })
  } catch (err) {
    console.error('[verify-receipt]', err)
    return jsonResponse(req, { success: false, error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
