import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') ?? ''
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'Pwen Books <onboarding@resend.dev>'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)

interface OrderPayload {
  order_id: string
  access_token: string
  order_number: string
  customer_name: string
  customer_phone: string
  delivery_address: string
  notes?: string
  total_amount: number
  currency: string
  payment_method: string
  item_count: number
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

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(hash)).map(byte => byte.toString(16).padStart(2, '0')).join('')
}

function buildHtml(o: OrderPayload): string {
  const notes = o.notes?.trim()
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .card { background: #fff; border-radius: 12px; max-width: 480px; margin: 0 auto; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: #1e293b; padding: 20px 24px; }
    .header h1 { color: #fff; margin: 0; font-size: 18px; }
    .header p { color: #94a3b8; margin: 4px 0 0; font-size: 13px; }
    .body { padding: 24px; }
    .order-num { font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 20px; }
    .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    .row:last-child { border-bottom: none; }
    .label { color: #64748b; }
    .value { color: #0f172a; font-weight: 500; text-align: right; max-width: 60%; word-break: break-word; }
    .total-row { background: #f8fafc; margin: 16px -24px -24px; padding: 16px 24px; }
    .total-row .value { font-size: 18px; color: #ea580c; font-weight: 700; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>New Order Received</h1>
      <p>Pwen Books Admin Notification</p>
    </div>
    <div class="body">
      <div class="order-num">${escapeHtml(o.order_number)}</div>
      <div class="row"><span class="label">Customer</span><span class="value">${escapeHtml(o.customer_name)}</span></div>
      <div class="row"><span class="label">Phone</span><span class="value">${escapeHtml(o.customer_phone)}</span></div>
      <div class="row"><span class="label">Delivery address</span><span class="value">${escapeHtml(o.delivery_address)}</span></div>
      <div class="row"><span class="label">Payment</span><span class="value">${escapeHtml(o.payment_method)}</span></div>
      <div class="row"><span class="label">Items</span><span class="value">${escapeHtml(o.item_count)} book${o.item_count !== 1 ? 's' : ''}</span></div>
      ${notes ? `<div class="row"><span class="label">Note</span><span class="value">${escapeHtml(notes)}</span></div>` : ''}
      <div class="row total-row"><span class="label" style="font-weight:600;color:#0f172a">Total</span><span class="value">${escapeHtml(formatCurrency(o.total_amount, o.currency))}</span></div>
    </div>
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

    const order: OrderPayload = await req.json()
    if (!order.order_id || !order.access_token || !order.order_number) {
      return jsonResponse(req, { success: false, error: 'Missing order verification fields' }, 400)
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    })
    const { data: storedOrder, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, customer_phone, total_amount, currency, guest_access_token_hash, created_at')
      .eq('id', order.order_id)
      .maybeSingle()

    if (orderError || !storedOrder) return jsonResponse(req, { success: false, error: 'Order not found' }, 404)
    if (storedOrder.order_number !== order.order_number) {
      return jsonResponse(req, { success: false, error: 'Order verification failed' }, 403)
    }
    if (storedOrder.guest_access_token_hash !== await sha256Hex(order.access_token)) {
      return jsonResponse(req, { success: false, error: 'Order verification failed' }, 403)
    }

    order.total_amount = Number(storedOrder.total_amount)
    order.currency = storedOrder.currency

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: ADMIN_EMAIL,
        subject: `New order ${order.order_number} from ${order.customer_name}`.slice(0, 200),
        html: buildHtml(order),
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Resend error ${res.status}: ${text}`)
    }

    const result = await res.json()
    return jsonResponse(req, { success: true, id: result.id })
  } catch (err) {
    console.error('[notify-admin]', err)
    return jsonResponse(req, { success: false, error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
