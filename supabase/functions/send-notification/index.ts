import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)

interface NotificationRequest {
  user_id?: string
  channel: 'IN_APP' | 'WHATSAPP' | 'MESSENGER'
  recipient: string
  subject?: string
  message: string
  template?: string
  template_vars?: Record<string, string>
}

const templates: Record<string, string> = {
  ORDER_PLACED: 'Your order #{{order_number}} has been received.',
  PAYMENT_VERIFIED: 'Payment for order #{{order_number}} has been verified.',
  ORDER_SHIPPED: 'Order #{{order_number}} has shipped. Tracking: {{tracking_number}}',
  ORDER_DELIVERED: 'Order #{{order_number}} has been delivered.',
  BOOKSTORE_CONFIRM: 'Book: {{book_title}} | Qty: {{quantity}} | Order: {{order_number}} | Please confirm availability.',
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

function fillTemplate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{{${k}}}`, v), template)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(req) })
  if (req.method !== 'POST') return jsonResponse(req, { success: false, error: 'Method not allowed' }, 405)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse(req, { success: false, error: 'Authentication required' }, 401)

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
    if (!['ADMIN', 'OPERATIONS', 'FINANCE'].includes(roleRow?.role ?? '')) {
      return jsonResponse(req, { success: false, error: 'Not authorized' }, 403)
    }

    const body: NotificationRequest = await req.json()
    if (!body.channel || !body.recipient || !body.message) {
      return jsonResponse(req, { success: false, error: 'Missing notification fields' }, 400)
    }

    let message = body.message.slice(0, 2000)
    if (body.template && templates[body.template]) {
      message = fillTemplate(templates[body.template], body.template_vars ?? {}).slice(0, 2000)
    }

    await serviceClient.from('notifications').insert({
      user_id: body.user_id,
      channel: body.channel,
      recipient: body.recipient.slice(0, 300),
      subject: body.subject?.slice(0, 300),
      message,
      status: 'SENT',
      sent_at: new Date().toISOString(),
    })

    return jsonResponse(req, { success: true, message })
  } catch (err) {
    console.error('[send-notification]', err)
    return jsonResponse(req, { success: false, error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
