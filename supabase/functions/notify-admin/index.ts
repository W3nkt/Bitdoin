import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const ADMIN_EMAIL    = Deno.env.get('ADMIN_EMAIL') ?? ''
const FROM_EMAIL     = Deno.env.get('FROM_EMAIL') ?? 'Pwen Books <onboarding@resend.dev>'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
}

interface OrderPayload {
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

function formatCurrency(amount: number, currency: string): string {
  if (currency === 'LAK') return `${amount.toLocaleString()} ₭`
  return `$${amount.toFixed(2)}`
}

function buildHtml(o: OrderPayload): string {
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
    .btn { display: block; margin: 20px auto 0; background: #1e293b; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>📦 New Order Received</h1>
      <p>Pwen Books — Admin Notification</p>
    </div>
    <div class="body">
      <div class="order-num">${o.order_number}</div>

      <div class="row">
        <span class="label">Customer</span>
        <span class="value">${o.customer_name}</span>
      </div>
      <div class="row">
        <span class="label">Phone</span>
        <span class="value">${o.customer_phone}</span>
      </div>
      <div class="row">
        <span class="label">Delivery address</span>
        <span class="value">${o.delivery_address}</span>
      </div>
      <div class="row">
        <span class="label">Payment</span>
        <span class="value">${o.payment_method}</span>
      </div>
      <div class="row">
        <span class="label">Items</span>
        <span class="value">${o.item_count} book${o.item_count !== 1 ? 's' : ''}</span>
      </div>
      ${o.notes ? `
      <div class="row">
        <span class="label">Note</span>
        <span class="value">${o.notes}</span>
      </div>` : ''}

      <div class="row total-row">
        <span class="label" style="font-weight:600;color:#0f172a">Total</span>
        <span class="value">${formatCurrency(o.total_amount, o.currency)}</span>
      </div>
    </div>
  </div>
</body>
</html>`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured')
    if (!ADMIN_EMAIL)    throw new Error('ADMIN_EMAIL not configured')

    const order: OrderPayload = await req.json()

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: ADMIN_EMAIL,
        subject: `New order ${order.order_number} from ${order.customer_name}`,
        html: buildHtml(order),
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Resend error ${res.status}: ${text}`)
    }

    const result = await res.json()
    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (err) {
    console.error('[notify-admin]', err)
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
