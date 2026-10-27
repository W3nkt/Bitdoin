import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { describeAlert } from './messages.ts'
import { renderGuardianEmail, unsubscribePageUrl, type GuardianEmail } from './guardian-email.ts'

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
// Guardian e-mails (NOTIF-002, migration 161) go out in the same run: the
// double opt-in confirmation and monthly reports, to guardians who confirmed.
//   email_confirm      { token }  confirms an opt-in (from the app page)
//   email_unsubscribe  { token }  unsubscribes (from the app page)
//   POST ?unsubscribe=<token>     one-click unsubscribe from mail apps (RFC 8058);
//   GET  ?unsubscribe=<token>     redirects to the app page, which asks the same
// Tokens are the only credential; the database functions behind them are
// callable by the service role only.
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

const serviceClient = () => createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })

async function sendGuardianEmail(mail: GuardianEmail) {
  const { subject, html } = renderGuardianEmail(mail)
  const headers: Record<string, string> = {}
  if (mail.kind === 'guardian_report') {
    headers['List-Unsubscribe'] = `<${SUPABASE_URL}/functions/v1/academic-alerts?unsubscribe=${encodeURIComponent(mail.unsubscribe_token)}>`
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click'
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_EMAIL, to: mail.recipient, subject: subject.slice(0, 200), html, headers }),
  })
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`)
}

async function deliverGuardian(admin: ReturnType<typeof serviceClient>) {
  const { data, error } = await admin.rpc('academic_claim_guardian_emails', { p_limit: 20 })
  if (error) throw error
  const mails = (data ?? []) as GuardianEmail[]
  const sent: string[] = []
  const failed: string[] = []
  let lastError: string | null = null
  for (const mail of mails) {
    try {
      await sendGuardianEmail(mail)
      sent.push(mail.id)
    } catch (err) {
      failed.push(mail.id)
      lastError = err instanceof Error ? err.message : String(err)
      console.error('[academic-alerts] guardian e-mail failed', mail.kind, lastError)
    }
  }
  if (mails.length) {
    const { error: completeError } = await admin.rpc('academic_complete_guardian_emails', { p_sent: sent, p_failed: failed, p_error: lastError })
    if (completeError) throw completeError
  }
  return { claimed: mails.length, sent: sent.length, failed: failed.length }
}

async function tokenAction(fn: 'academic_guardian_email_confirm' | 'academic_guardian_email_unsubscribe', token: unknown) {
  if (typeof token !== 'string' || token.length < 1 || token.length > 128) return { status: 'invalid' }
  const { data, error } = await serviceClient().rpc(fn, { p_token: token })
  if (error) throw error
  return data as { status: string }
}

async function deliver() {
  const admin = serviceClient()
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
  return { claimed: alerts.length, sent: sent.length, failed: failed.length, guardian: await deliverGuardian(admin) }
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  const oneClick = new URL(req.url).searchParams.get('unsubscribe')
  if (oneClick !== null) {
    // Mail apps POST here (RFC 8058); a browser opening the link gets the app page.
    if (req.method === 'GET') {
      const site = String((await serviceClient().from('academic_settings').select('value').eq('key', 'site_url').maybeSingle()).data?.value ?? 'https://bitdoin.store')
      return Response.redirect(unsubscribePageUrl(site.replace(/\/+$/, ''), oneClick), 303)
    }
    try {
      await tokenAction('academic_guardian_email_unsubscribe', oneClick)
      return new Response('Unsubscribed', { status: 200 })
    } catch (error) {
      console.error('[academic-alerts] unsubscribe', error)
      return new Response('Try again later', { status: 500 })
    }
  }
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405)
  const body = await req.json().catch(() => ({})) as { action?: string; token?: unknown }
  try {
    if (body.action === 'email_confirm') return json(req, await tokenAction('academic_guardian_email_confirm', body.token))
    if (body.action === 'email_unsubscribe') return json(req, await tokenAction('academic_guardian_email_unsubscribe', body.token))
    if (!RESEND_API_KEY) return json(req, { skipped: 'RESEND_API_KEY not set' })
    if (body.action !== 'deliver') return json(req, { error: 'Unknown action' }, 400)
    return json(req, await deliver())
  } catch (error) {
    console.error('[academic-alerts]', error)
    return json(req, { error: 'Delivery failed' }, 500)
  }
})
