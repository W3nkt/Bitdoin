// PhaJay calls this when a payment completes (set the URL in the PhaJay portal under Settings >
// Webhook). The body is trusted only if X-Signature matches the HMAC-SHA256 of the raw bytes, keyed
// with the account's secret key. The order is marked paid by phajay_settle(), which is safe to repeat.
//
// Answers: 401 bad signature, 200 handled or deliberately ignored, 5xx a database problem (PhaJay may
// send it again). Never answers with details about orders.
//
// Secrets: PHAJAY_API_KEY (the production key). PHAJAY_WEBHOOK_SECRET is optional: set it only if the
// PhaJay portal shows a separate webhook secret, and either one is then accepted.
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { fetchTransaction, generateQr } from '../_shared/phajay.ts'
import { phajayDb } from '../_shared/phajay-db.ts'
import { createPhajayFlow } from '../_shared/phajay-flow.ts'

const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
const apiKey = Deno.env.get('PHAJAY_API_KEY') ?? ''
const secrets = [apiKey, Deno.env.get('PHAJAY_WEBHOOK_SECRET') ?? ''].filter(Boolean)

const flow = secrets.length
  ? createPhajayFlow({
    db: phajayDb(admin),
    // The webhook never calls PhaJay; it only needs the shape.
    provider: {
      generateQr: input => generateQr({ apiKey }, input),
      fetchTransaction: transactionId => fetchTransaction({ apiKey }, transactionId),
    },
    webhookSecrets: secrets,
    log: message => console.log(`[phajay-webhook] ${message}`),
  })
  : null

const MAX_BODY_BYTES = 64 * 1024

const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

serve(async (req: Request) => {
  if (req.method !== 'POST') return respond({ error: 'Method not allowed' }, 405)
  if (!flow) return respond({ error: 'Not configured' }, 503)

  try {
    // The signature covers the exact bytes, so read the body as text before anything parses it.
    const rawBody = await req.text()
    if (rawBody.length > MAX_BODY_BYTES) return respond({ error: 'Body too large' }, 413)
    const { status, body } = await flow.webhook(rawBody, req.headers.get('x-signature'))
    return respond(body, status)
  } catch (error) {
    console.error('[phajay-webhook]', error instanceof Error ? error.message : 'unknown error')
    return respond({ error: 'Could not process the event' }, 500)
  }
})
