import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

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
  ORDER_PLACED:      'ຂໍຂອບໃຈທີ່ສັ່ງຊື້! ຄຳສັ່ງ #{{order_number}} ໄດ້ຮັບການຢືນຢັນ.',
  PAYMENT_VERIFIED:  'ການຊຳລະຂອງຄຳສັ່ງ #{{order_number}} ໄດ້ຮັບການຢືນຢັນ.',
  ORDER_SHIPPED:     'ຄຳສັ່ງ #{{order_number}} ໄດ້ຖືກສົ່ງແລ້ວ. ລະຫັດຕິດຕາມ: {{tracking_number}}',
  ORDER_DELIVERED:   'ຄຳສັ່ງ #{{order_number}} ໄດ້ຖືກສົ່ງຮອດແລ້ວ!',
  BOOKSTORE_CONFIRM: 'Book: {{book_title}} | Qty: {{quantity}} | Order: {{order_number}} | Please confirm availability.',
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((s, [k, v]) => s.replace(`{{${k}}}`, v), template)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } })
  }

  try {
    const body: NotificationRequest = await req.json()
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    let message = body.message
    if (body.template && templates[body.template]) {
      message = fillTemplate(templates[body.template], body.template_vars ?? {})
    }

    await supabase.from('notifications').insert({
      user_id: body.user_id,
      channel: body.channel,
      recipient: body.recipient,
      subject: body.subject,
      message,
      status: 'SENT',
      sent_at: new Date().toISOString(),
    })

    return new Response(JSON.stringify({ success: true, message }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
