// PhaJay (payment-gateway.phajay.co): make a BCEL One QR for an amount, ask whether it was paid, and
// check the signature on a webhook. No Deno APIs and no secrets in logs, so the same file runs in
// Node for the tests. Docs: https://payment-doc.phajay.co/v1

export const PHAJAY_BASE_URL = 'https://payment-gateway.phajay.co/v1/api/payment'

export type PhajayFetch = (input: string, init?: RequestInit) => Promise<Response>

export interface PhajayConfig {
  /** The production secret key. Never logged, never sent to a browser. */
  apiKey: string
  baseUrl?: string
  fetcher?: PhajayFetch
}

export interface PhajayQr {
  transactionId: string
  qrCode: string
  /** onepay:// deep link that opens BCEL One. */
  link: string | null
}

export interface PhajayTransaction {
  status: string
  /** True only for status PAYMENT_COMPLETED with isPaid set, which is what PhaJay says to rely on. */
  isPaid: boolean
  amount: number | null
  paidAt: string | null
}

export interface PhajayWebhook {
  transactionId: string
  status: string
  amount: number
}

/** unavailable: try again later (network, 5xx, rate limit). rejected: PhaJay refused this request. */
export class PhajayError extends Error {
  constructor(readonly kind: 'unavailable' | 'rejected', message: string) {
    super(message)
  }
}

const TIMEOUT_MS = 10_000

async function timedFetch(input: string, init?: RequestInit) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function call(config: PhajayConfig, path: string, init: RequestInit) {
  let response: Response
  try {
    response = await (config.fetcher ?? timedFetch)(`${config.baseUrl ?? PHAJAY_BASE_URL}${path}`, init)
  } catch {
    throw new PhajayError('unavailable', 'PhaJay could not be reached')
  }
  const body = await response.json().catch(() => null) as Record<string, unknown> | null
  return { response, body }
}

const failure = (status: number, body: Record<string, unknown> | null) =>
  new PhajayError(
    status >= 500 || status === 429 ? 'unavailable' : 'rejected',
    `PhaJay answered ${status}${typeof body?.message === 'string' ? `: ${body.message.slice(0, 200)}` : ''}`,
  )

/** What the whole kip amount of an order is: the total rounded the way the shop shows it. */
export function chargeAmount(total: number) {
  const amount = Math.round(total)
  if (!Number.isFinite(amount) || amount < 1) throw new RangeError('The order total cannot be charged')
  return amount
}

/** BCEL rejects Lao and Thai text in the description, so it stays plain ASCII. */
export function qrDescription(reference: string) {
  const code = reference.replace(/[^A-Za-z0-9-]/g, '').slice(0, 16)
  return code ? `Bitdoin ${code}` : 'Bitdoin payment'
}

/** reference: a short code that says what the payment is for (an order number, PRM-..., RPT-...). */
export async function generateQr(config: PhajayConfig, input: { reference: string; amount: number }): Promise<PhajayQr> {
  const { response, body } = await call(config, '/generate-bcel-qr', {
    method: 'POST',
    headers: { secretKey: config.apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: input.amount,
      description: qrDescription(input.reference),
      // Must be unique per request; a fresh QR for the same order needs a fresh value.
      orderNo: `${input.reference}-${Date.now().toString(36)}`,
      tag1: input.reference,
    }),
  })
  if (!response.ok) throw failure(response.status, body)
  const transactionId = body?.transactionId
  const qrCode = body?.qrCode
  if (typeof transactionId !== 'string' || !transactionId || typeof qrCode !== 'string' || !qrCode) {
    throw new PhajayError('unavailable', 'PhaJay sent a QR that cannot be used')
  }
  return { transactionId, qrCode, link: typeof body?.link === 'string' && body.link ? body.link : null }
}

/** The transaction's state at PhaJay, or null if PhaJay has no such transaction. */
export async function fetchTransaction(config: PhajayConfig, transactionId: string): Promise<PhajayTransaction | null> {
  // The status endpoint wants Basic auth with the bare key; the secretKey header gets a 401 there.
  const { response, body } = await call(config, `/check-transaction/status/${encodeURIComponent(transactionId)}`, {
    method: 'GET',
    headers: { Authorization: `Basic ${btoa(config.apiKey)}` },
  })
  if (response.status === 404 || body?.message === 'PAYMENT_NOT_FOUND') return null
  if (!response.ok) throw failure(response.status, body)
  const data = body?.data as Record<string, unknown> | undefined
  if (!data || typeof data.status !== 'string') throw new PhajayError('unavailable', 'PhaJay sent a status that cannot be read')
  return {
    status: data.status,
    isPaid: data.isPaid === true && data.status === 'PAYMENT_COMPLETED',
    amount: typeof data.amount === 'number' && Number.isFinite(data.amount) ? data.amount : null,
    paidAt: typeof data.paymentTime === 'string' && data.paymentTime ? data.paymentTime : null,
  }
}

function sameText(a: string, b: string) {
  let difference = a.length ^ b.length
  for (let i = 0; i < Math.max(a.length, b.length); i++) difference |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  return difference === 0
}

/**
 * X-Signature is the base64 HMAC-SHA256 of the raw request body, keyed with the account's secret key.
 * Several secrets may be given (for instance during the switch from the test key to the production
 * key); the signature is good if it matches any of them.
 */
export async function webhookSignatureValid(rawBody: string, signature: string | null, secrets: string[]) {
  const given = (signature ?? '').trim()
  if (!given) return false
  const encoder = new TextEncoder()
  let valid = false
  for (const secret of secrets) {
    if (!secret) continue
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody)))
    if (sameText(btoa(String.fromCharCode(...mac)), given)) valid = true
  }
  return valid
}

/** The three fields PhaJay guarantees on every webhook; null if the body is not one. */
export function parseWebhook(rawBody: string): PhajayWebhook | null {
  let event: unknown
  try {
    event = JSON.parse(rawBody)
  } catch {
    return null
  }
  if (!event || typeof event !== 'object') return null
  const { transactionId, status, txnAmount } = event as Record<string, unknown>
  const amount = typeof txnAmount === 'string' && txnAmount.trim() ? Number(txnAmount) : txnAmount
  if (typeof transactionId !== 'string' || !transactionId || typeof status !== 'string') return null
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return null
  return { transactionId, status, amount }
}
