import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { describeAlert } from './messages.ts'

// My Scores alert e-mails (OPS-002, #42; migration 122).
//
//   deliver   pg_cron every 5 minutes, and the admin's "Send test alert".
//             Claims alerts that have not been e-mailed yet, sends one e-mail
//             each to the on-call address (academic_private_settings
//             'alert_email') through Resend, and reports back. Idempotent:
//             a claimed alert is sent at most once; failures retry up to 5
//             times, and the last error shows on the admin Health tab.
//
// E-mails contain counts, job names and targets only: never student names,
// IDs, scores or free text (NFR-017).
//
// Secrets: RESEND_API_KEY, FROM_EMAIL (optional), ADMIN_APP_URL (optional),
//          ALLOWED_ORIGINS (optional, comma separated)

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'Bitdoin <onboarding@resend.dev>'
const ADMIN_APP_URL = (Deno.env.get('ADMIN_APP_URL') ?? '').split('#', 1)[0].replace(/\/+$/, '')
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)

interface ClaimedAlert {
  id: string
  kind: string
  details: Record<string, unknown>
  created_at: string
  recipient: string
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

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } })
}

const escapeHtml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function emailHtml(alert: ClaimedAlert) {
  const { subject, lines } = describeAlert(alert)
  const link = ADMIN_APP_URL ? `${ADMIN_APP_URL}/academy-admin/scores?tab=health` : ''
  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;color:#0f172a;line-height:1.5">
<h2 style="margin:0 0 12px">${escapeHtml(subject)}</h2>
${lines.map(line => `<p style="margin:0 0 8px">${escapeHtml(line)}</p>`).join('\n')}
<p style="margin:16px 0 0;color:#475569;font-size:13px">Raised ${escapeHtml(new Date(alert.created_at).toISOString())} · My Scores monitoring</p>
${link ? `<p style="margin:12px 0 0"><a href="${escapeHtml(link)}">Open the Health tab</a></p>` : ''}
</body></html>`
}

async function sendEmail(alert: ClaimedAlert) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: alert.recipient,
      subject: `[Bitdoin My Scores] ${describeAlert(alert).subject}`.slice(0, 200),
      html: emailHtml(alert),
    }),
  })
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`)
}

async function deliver() {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
  const { data, error } = await admin.rpc('academic_claim_alert_emails', { p_limit: 20 })
  if (error) throw error
  const alerts = (data ?? []) as ClaimedAlert[]
  const sent: string[] = []
  const failed: string[] = []
  let lastError: string | null = null
  for (const alert of alerts) {
    try {
      await sendEmail(alert)
      sent.push(alert.id)
    } catch (err) {
      failed.push(alert.id)
      lastError = err instanceof Error ? err.message : String(err)
      console.error('[academic-alerts] e-mail failed', alert.kind, lastError)
    }
  }
  if (alerts.length) {
    const { error: completeError } = await admin.rpc('academic_complete_alert_emails', { p_sent: sent, p_failed: failed, p_error: lastError })
    if (completeError) throw completeError
  }
  return { claimed: alerts.length, sent: sent.length, failed: failed.length }
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405)
  if (!RESEND_API_KEY) return json(req, { skipped: 'RESEND_API_KEY not set' })
  const body = await req.json().catch(() => ({})) as { action?: string }
  try {
    if (body.action !== 'deliver') return json(req, { error: 'Unknown action' }, 400)
    return json(req, await deliver())
  } catch (error) {
    console.error('[academic-alerts]', error)
    return json(req, { error: 'Delivery failed' }, 500)
  }
})
