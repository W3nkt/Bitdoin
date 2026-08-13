import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const ADMIN_EMAIL = 'wen.kt2020@gmail.com'
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'Bitdoin <onboarding@resend.dev>'
const ADMIN_APP_URL = (Deno.env.get('ADMIN_APP_URL') ?? '')
  .split('#', 1)[0]
  .replace(/\/+$/, '')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)

type NotifyEvent = 'SUBSCRIPTION_REQUEST' | 'PAYMENT_SUBMITTED'

interface NotifyPayload {
  event: NotifyEvent
  subscription_id: string
  payment_id?: string
}

interface Member {
  name: string
  email: string | null
  phone: string | null
}

interface Plan {
  name: string
  slug: string
  price_lak: number
  interval: string
}

interface Payment {
  amount_lak: number
  currency: string
  method: string
  receipt_image_url: string | null
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

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function formatCurrency(amount: number, currency: string): string {
  if (currency === 'LAK') return `${amount.toLocaleString()} LAK`
  return `$${amount.toFixed(2)}`
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

function buildHtml(
  event: NotifyEvent,
  data: { member: Member; plan: Plan; status: string; payment: Payment | null },
  reviewUrl: string | null,
  hasReceiptImage: boolean,
): string {
  const { member, plan, status, payment } = data
  const title = event === 'PAYMENT_SUBMITTED' ? 'Academy Payment Proof Submitted' : 'New Academy Subscription Request'
  const ctaLabel = event === 'PAYMENT_SUBMITTED' ? 'Review &amp; Approve Payment →' : 'Review &amp; Approve Request →'

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .card { background: #fff; border-radius: 12px; max-width: 480px; margin: 0 auto; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: #4338ca; padding: 20px 24px; }
    .header h1 { color: #fff; margin: 0; font-size: 18px; }
    .header p { color: #c7d2fe; margin: 4px 0 0; font-size: 13px; }
    .body { padding: 24px; }
    .member-name { font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 20px; }
    .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    .row:last-child { border-bottom: none; }
    .label { color: #64748b; }
    .value { color: #0f172a; font-weight: 500; text-align: right; max-width: 60%; word-break: break-word; }
    .total-row { background: #f8fafc; margin: 16px -24px -24px; padding: 16px 24px; }
    .total-row .value { font-size: 18px; color: #4338ca; font-weight: 700; }
    .note { padding: 0 24px 20px; font-size: 12px; color: #64748b; }
    .cta { display: block; text-align: center; margin: 0; padding: 16px 24px; background: #0f172a; color: #fff !important; text-decoration: none; font-weight: 600; font-size: 14px; }
    .cta:hover { background: #1e293b; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>${title}</h1>
      <p>Bitdoin Academy Admin Notification</p>
    </div>
    <div class="body">
      <div class="member-name">${escapeHtml(member.name)}</div>
      ${member.email ? `<div class="row"><span class="label">Email: </span><span class="value">${escapeHtml(member.email)}</span></div>` : ''}
      ${member.phone ? `<div class="row"><span class="label">Phone: </span><span class="value">${escapeHtml(member.phone)}</span></div>` : ''}
      <div class="row"><span class="label">Plan: </span><span class="value">${escapeHtml(plan.name)} (${escapeHtml(plan.interval)})</span></div>
      <div class="row"><span class="label">Status: </span><span class="value">${escapeHtml(status)}</span></div>
      ${payment ? `<div class="row"><span class="label">Payment method: </span><span class="value">${escapeHtml(payment.method.replace(/_/g, ' '))}</span></div>` : ''}
      <div class="row total-row"><span class="label" style="font-weight:700;color:#0f172a">${payment ? 'Amount paid' : 'Plan price'}: </span><span class="value">${escapeHtml(formatCurrency(payment ? payment.amount_lak : plan.price_lak, payment?.currency ?? 'LAK'))}</span></div>
    </div>
    ${hasReceiptImage ? `
    <div style="padding: 0 24px 20px;">
      <img src="cid:receipt" alt="Payment proof" style="display:block; width:100%; max-height:400px; object-fit:contain; border:1px solid #e2e8f0; border-radius:8px; background:#f8fafc;" />
    </div>` : ''}
    ${event === 'PAYMENT_SUBMITTED'
      ? `<p class="note">The member uploaded payment proof. Please verify it${hasReceiptImage ? ' above' : ' (see attachment)'} and approve or reject it.</p>`
      : `<p class="note">The member requested to join the Academy platform. Please review and approve or reject it.</p>`}
    ${reviewUrl ? `<a class="cta" href="${escapeHtml(reviewUrl)}">${ctaLabel}</a>` : ''}
  </div>
</body>
</html>`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(req) })
  if (req.method !== 'POST') return jsonResponse(req, { success: false, error: 'Method not allowed' }, 405)

  try {
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured')
    if (!ADMIN_EMAIL) throw new Error('ADMIN_EMAIL not configured')

    const body: NotifyPayload = await req.json()
    if (!body.subscription_id) {
      return jsonResponse(req, { success: false, error: 'subscription_id is required' }, 400)
    }
    if (body.event === 'PAYMENT_SUBMITTED' && !body.payment_id) {
      return jsonResponse(req, { success: false, error: 'payment_id is required' }, 400)
    }

    // Only the member who owns the subscription may trigger a notification about it.
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse(req, { success: false, error: 'Missing authorization' }, 401)

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    })
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) return jsonResponse(req, { success: false, error: 'Invalid session' }, 401)

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    })

    const { data: subRow, error: subError } = await serviceClient
      .from('premium_subscriptions')
      .select('id,user_id,status,plan:premium_plans(name,slug,price_lak,interval),user:users!premium_subscriptions_user_id_fkey(name,email,phone)')
      .eq('id', body.subscription_id)
      .maybeSingle()
    if (subError || !subRow) return jsonResponse(req, { success: false, error: 'Subscription not found' }, 404)
    if (subRow.user_id !== user.id) return jsonResponse(req, { success: false, error: 'Not authorized' }, 403)

    const plan = firstRelation<Plan>(subRow.plan as unknown as Plan | Plan[])
    const member = firstRelation<Member>(subRow.user as unknown as Member | Member[])
    if (!plan || !member) return jsonResponse(req, { success: false, error: 'Subscription data incomplete' }, 500)

    let payment: Payment | null = null
    let attachment: { filename: string; content: string; content_id: string } | null = null

    if (body.event === 'PAYMENT_SUBMITTED') {
      const { data: paymentRow, error: paymentError } = await serviceClient
        .from('premium_payments')
        .select('id,amount_lak,currency,method,receipt_image_url')
        .eq('id', body.payment_id)
        .eq('subscription_id', body.subscription_id)
        .maybeSingle()
      if (paymentError || !paymentRow) return jsonResponse(req, { success: false, error: 'Payment not found' }, 404)
      payment = paymentRow

      if (paymentRow.receipt_image_url) {
        try {
          const { data: file } = await serviceClient.storage
            .from('premium-payment-proofs')
            .download(paymentRow.receipt_image_url)
          if (file) {
            const bytes = new Uint8Array(await file.arrayBuffer())
            const extension = paymentRow.receipt_image_url.split('.').pop()?.toLowerCase() || 'jpg'
            attachment = { filename: `proof-${body.payment_id}.${extension}`, content: toBase64(bytes), content_id: 'receipt' }
          }
        } catch (attachErr) {
          console.error('[notify-admin-academy] proof attachment failed', attachErr)
        }
      }
    }

    const reviewUrl = ADMIN_APP_URL
      ? `${ADMIN_APP_URL}/academy-admin#${body.event === 'PAYMENT_SUBMITTED' ? 'premium-payments' : 'premium-members'}`
      : null

    const subject = body.event === 'PAYMENT_SUBMITTED'
      ? `Academy payment proof submitted by ${member.name}`.slice(0, 200)
      : `New Academy subscription request from ${member.name}`.slice(0, 200)

    const html = buildHtml(body.event, { member, plan, status: subRow.status, payment }, reviewUrl, !!attachment)

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: ADMIN_EMAIL,
        subject,
        html,
        ...(attachment ? { attachments: [attachment] } : {}),
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Resend error ${res.status}: ${text}`)
    }

    const result = await res.json()
    return jsonResponse(req, { success: true, id: result.id })
  } catch (err) {
    console.error('[notify-admin-academy]', err)
    return jsonResponse(req, { success: false, error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
