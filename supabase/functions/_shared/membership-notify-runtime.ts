// Connects membership-notify.ts to the real world: the database (service role), Resend for the receipt e-mail
// and the send-push function for the congratulation push. Used by phajay-checkout and phajay-webhook.
//
// Secrets already set for the other functions: RESEND_API_KEY, FROM_EMAIL. SITE_URL is optional (the links in
// the e-mail; defaults to https://bitdoin.store).
import { fetchWithTimeout } from './timed-fetch.ts'
import { notifyMembershipPaid } from './membership-notify.ts'
import type { MembershipDetails, MembershipEmail } from './membership-notify.ts'

type Rpc = (name: string, args: Record<string, unknown>) => PromiseLike<{
  data: unknown
  error: { message?: string } | null
}>

const SEND_TIMEOUT_MS = 8000

/**
 * Returns afterPaid(transactionId): announces the payment if it has not been announced yet. It never throws.
 * The work continues after the response where the platform allows it (EdgeRuntime.waitUntil), so PhaJay's webhook
 * is answered at once; elsewhere the caller simply waits for it.
 */
export function membershipNotifier(admin: { rpc: Rpc }) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const resendKey = Deno.env.get('RESEND_API_KEY') ?? ''
  const fromEmail = Deno.env.get('FROM_EMAIL') ?? 'Bitdoin <onboarding@resend.dev>'
  const siteUrl = (Deno.env.get('SITE_URL') ?? 'https://bitdoin.store').replace(/\/+$/, '')
  const log = (message: string) => console.log(`[membership-notify] ${message}`)

  async function call<T>(name: string, args: Record<string, unknown>) {
    const { data, error } = await admin.rpc(name, args)
    if (error) throw new Error(`${name} failed: ${error.message ?? 'database error'}`)
    return data as T
  }

  const deps = {
    siteUrl,
    log,
    claim: (transactionId: string) => call<MembershipDetails | null>('phajay_claim_notification', { p_transaction_id: transactionId }),
    release: async (transactionId: string) => {
      await call<null>('phajay_release_notification', { p_transaction_id: transactionId })
    },
    sendEmail: async (mail: MembershipEmail) => {
      if (!resendKey) throw new Error('RESEND_API_KEY is not set')
      const response = await fetchWithTimeout('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: fromEmail, to: mail.to, subject: mail.subject.slice(0, 200), html: mail.html, text: mail.text }),
      }, SEND_TIMEOUT_MS)
      if (!response.ok) throw new Error(`Resend answered ${response.status}: ${(await response.text()).slice(0, 160)}`)
    },
    sendPush: async (details: MembershipDetails) => {
      const response = await fetchWithTimeout(`${supabaseUrl}/functions/v1/send-push`, {
        method: 'POST',
        // send-push accepts this action only from the service role.
        headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'membership-activated', user_id: details.user_id, ends_at: details.ends_at, extends_previous: details.extends_previous }),
      }, SEND_TIMEOUT_MS)
      if (!response.ok) throw new Error(`send-push answered ${response.status}`)
    },
  }

  return (transactionId: string): void | Promise<void> => {
    const job = notifyMembershipPaid(deps, transactionId).then(() => {}).catch((error) => log(`failed: ${error instanceof Error ? error.message : String(error)}`))
    const runtime = (globalThis as { EdgeRuntime?: { waitUntil?: (promise: Promise<unknown>) => void } }).EdgeRuntime
    if (runtime?.waitUntil) {
      runtime.waitUntil(job)
      return
    }
    return job
  }
}
