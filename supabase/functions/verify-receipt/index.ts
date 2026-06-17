import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''
const SUPABASE_URL   = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

interface VerifyRequest {
  payment_id: string
  receipt_url: string
  expected_amount: number
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

async function extractReceiptWithGemini(imageUrl: string, expectedAmount: number): Promise<GeminiExtraction> {
  const prompt = `You are a financial document analyst. Analyze this payment receipt image and extract:
1. Transfer amount (number only, no currency symbols)
2. Transfer date (ISO format)
3. Sender name
4. Transaction/reference ID
5. Bank name

Also determine if this is a valid payment receipt for ${expectedAmount} LAK.
Provide a confidence score 0-100 for your extraction accuracy.

Return ONLY valid JSON in this exact format:
{
  "amount": <number or null>,
  "date": "<ISO date string or null>",
  "sender": "<name or null>",
  "transaction_id": "<id or null>",
  "bank": "<bank name or null>",
  "confidence": <0-100>,
  "raw": "<any additional notes>"
}`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: await fetchImageAsBase64(imageUrl),
              },
            },
          ],
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 500 },
      }),
    }
  )

  if (!response.ok) {
    return { amount: null, date: null, sender: null, transaction_id: null, bank: null, confidence: 0, raw: 'API error' }
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
  try {
    return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim())
  } catch {
    return { amount: null, date: null, sender: null, transaction_id: null, bank: null, confidence: 0, raw: text }
  }
}

async function fetchImageAsBase64(url: string): Promise<string> {
  const res = await fetch(url)
  const buffer = await res.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } })
  }

  try {
    const body: VerifyRequest = await req.json()
    const { payment_id, receipt_url, expected_amount } = body

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Extract data from receipt
    const extraction = await extractReceiptWithGemini(receipt_url, expected_amount)

    // Validation rules
    const amountMatches = extraction.amount !== null &&
      Math.abs(extraction.amount - expected_amount) / expected_amount < 0.01

    const now = new Date()
    const receiptDate = extraction.date ? new Date(extraction.date) : null
    const dateWithin24h = receiptDate
      ? (now.getTime() - receiptDate.getTime()) < 24 * 60 * 60 * 1000
      : false

    // Check transaction ID uniqueness
    let transactionUnique = true
    if (extraction.transaction_id) {
      const { data } = await supabase
        .from('payments')
        .select('id')
        .eq('transaction_reference', extraction.transaction_id)
        .neq('id', payment_id)
        .limit(1)
      transactionUnique = !data || data.length === 0
    }

    // Calculate overall confidence
    let score = extraction.confidence
    if (!amountMatches)      score = Math.min(score, 50)
    if (!dateWithin24h)      score = Math.min(score, 60)
    if (!transactionUnique)  score = 0

    const autoApprove = score >= 90 && amountMatches && transactionUnique

    // Update payment record
    await supabase.from('payments').update({
      ai_confidence_score: score,
      ai_extracted_data: extraction,
      sender_name: extraction.sender,
      transaction_reference: extraction.transaction_id,
      bank_name: extraction.bank,
      transferred_at: extraction.date,
      verification_status: autoApprove ? 'VERIFIED' : 'REQUIRES_REVIEW',
    }).eq('id', payment_id)

    // If auto-approved, update order status
    if (autoApprove) {
      const { data: payment } = await supabase
        .from('payments')
        .select('order_id')
        .eq('id', payment_id)
        .single()

      if (payment) {
        await supabase.from('orders').update({
          payment_status: 'VERIFIED',
          status: 'PROCESSING',
        }).eq('id', payment.order_id)

        // Create notification
        await supabase.from('notifications').insert({
          channel: 'IN_APP',
          recipient: payment.order_id,
          subject: 'Payment Verified',
          message: 'Your payment has been verified automatically. Your order is now being processed.',
          status: 'SENT',
          sent_at: new Date().toISOString(),
        })
      }
    }

    return new Response(JSON.stringify({
      success: true,
      auto_approved: autoApprove,
      confidence_score: score,
      amount_matches: amountMatches,
      transaction_unique: transactionUnique,
      extracted: extraction,
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
