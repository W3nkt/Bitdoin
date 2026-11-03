// What happens when a customer pays with a PhaJay QR, apart from HTTP and the database driver (both
// are passed in), so Node can test every branch. phajay-checkout and phajay-webhook are thin wrappers
// around this.
//
// Three things can be paid: a shop order, an Academy Premium plan, and the one-time career report.
// The database decides what is owed and whether it can be paid (the phajay_resolve_* functions); this
// file decides what to do about it.
//
// The rule that matters: a payment is applied only by phajay_settle(), for a transaction this shop
// created, at the amount it asked for. Nothing the browser sends is trusted for that.
import { PhajayError, chargeAmount, parseWebhook, webhookSignatureValid } from './phajay.ts'
import type { PhajayQr, PhajayTransaction } from './phajay.ts'

export type PaymentKind = 'shop_order' | 'premium' | 'career_report'

/** What the customer is paying. For Premium and the report, userId is the signed-in member, checked by the caller. */
export type PaymentTarget =
  | { kind: 'shop_order'; orderNumber: string; phone: string }
  | { kind: 'premium'; userId: string }
  | { kind: 'career_report'; userId: string }

/** What the database says is owed. state: payable | paid | closed (cannot be paid by QR now) | unsupported_currency. */
export interface Resolved {
  kind: PaymentKind
  subject_id: string
  /** Short ASCII reference BCEL shows to the payer. */
  label: string
  /** Whole kip. */
  amount: number
  currency: string
  state: string
}

export interface StoredQr {
  transaction_id: string
  amount: number
  qr_code: string
  link: string | null
  status: string
  settled_at: string | null
  note: string | null
}

export interface SettleResult {
  result: string
  subject_id?: string
}

/** One method per SQL function in migration 172. */
export interface FlowDb {
  resolve(target: PaymentTarget): Promise<Resolved | null>
  latestQr(kind: PaymentKind, subjectId: string): Promise<StoredQr | null>
  recordQr(input: { kind: PaymentKind; subjectId: string; qr: PhajayQr; amount: number }): Promise<boolean>
  setStatus(transactionId: string, status: string): Promise<void>
  settle(transactionId: string, amount: number, paidAt: string | null): Promise<SettleResult>
}

export interface FlowProvider {
  generateQr(input: { reference: string; amount: number }): Promise<PhajayQr>
  fetchTransaction(transactionId: string): Promise<PhajayTransaction | null>
}

export type FlowErrorCode =
  | 'ORDER_NOT_FOUND'
  | 'NOT_PAYABLE'
  | 'CURRENCY_NOT_SUPPORTED'
  | 'SIGN_IN_REQUIRED'
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_REJECTED'

export class FlowError extends Error {
  constructor(readonly code: FlowErrorCode, message: string, readonly httpStatus: number) {
    super(message)
  }
}

/**
 * waiting: show the QR. paid: it is now paid. review: PhaJay has the money but it could not be applied
 * by itself (cancelled, paid another way, the amount changed); staff are flagged.
 */
export type StartResult =
  | { state: 'waiting'; transactionId: string; qrCode: string; link: string | null; amount: number }
  | { state: 'paid' }
  | { state: 'review' }

export type CheckResult = { state: 'none' | 'waiting' | 'paid' | 'expired' | 'review' }

export function createPhajayFlow(deps: {
  db: FlowDb
  provider: FlowProvider
  /** Secrets that may have signed a webhook. */
  webhookSecrets?: string[]
  /**
   * Called with the transaction id whenever a payment is found applied, by this call or by the other way of
   * noticing it. It must itself make sure nothing is announced twice; a failure here never fails the payment.
   */
  afterPaid?: (transactionId: string) => void | Promise<void>
  log?: (message: string) => void
}) {
  const { db, provider } = deps
  const log = deps.log ?? (() => {})

  async function ask<T>(request: () => Promise<T>) {
    try {
      return await request()
    } catch (error) {
      if (!(error instanceof PhajayError)) throw error
      log(`provider ${error.kind}: ${error.message}`)
      throw error.kind === 'rejected'
        ? new FlowError('PROVIDER_REJECTED', 'PhaJay did not accept this payment', 502)
        : new FlowError('PROVIDER_UNAVAILABLE', 'PhaJay is not available right now', 502)
    }
  }

  async function resolve(target: PaymentTarget) {
    const owed = await db.resolve(target)
    if (!owed) throw new FlowError('ORDER_NOT_FOUND', 'Nothing to pay was found', 404)
    return owed
  }

  const waiting = (qr: StoredQr): StartResult => ({
    state: 'waiting', transactionId: qr.transaction_id, qrCode: qr.qr_code, link: qr.link, amount: Number(qr.amount),
  })

  /** A payment is in: let the caller announce it (e-mail, push). Never fails the payment. */
  async function announce(transactionId: string) {
    try {
      await deps.afterPaid?.(transactionId)
    } catch (error) {
      log(`after-paid step failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /** PhaJay says it was paid: apply it, and say what the customer should see. */
  async function applyPayment(transactionId: string, fallbackAmount: number, live: PhajayTransaction) {
    // The status API reports the amount; if it ever leaves it out, our own record of what we asked for stands in.
    const outcome = await db.settle(transactionId, live.amount ?? fallbackAmount, live.paidAt)
    log(`settle ${transactionId}: ${outcome.result}`)
    if (outcome.result === 'settled' || outcome.result === 'already_settled') {
      await announce(transactionId)
      return 'paid' as const
    }
    return 'review' as const
  }

  /** Make (or find) the QR for this payment. */
  async function start(target: PaymentTarget): Promise<StartResult> {
    const owed = await resolve(target)
    if (owed.state === 'paid') return { state: 'paid' }
    // PhaJay takes kip only. A dollar order stays on the manual bank-transfer flow.
    if (owed.state === 'unsupported_currency') throw new FlowError('CURRENCY_NOT_SUPPORTED', 'Only kip payments can be made by QR', 422)
    if (owed.state !== 'payable') throw new FlowError('NOT_PAYABLE', 'This cannot be paid by QR', 409)

    let amount: number
    try {
      amount = chargeAmount(Number(owed.amount))
    } catch {
      throw new FlowError('NOT_PAYABLE', 'This cannot be paid by QR', 409)
    }

    const existing = await db.latestQr(owed.kind, owed.subject_id)
    if (existing?.status === 'WAITING') {
      const live = await ask(() => provider.fetchTransaction(existing.transaction_id))
      if (live?.isPaid) {
        const state = await applyPayment(existing.transaction_id, Number(existing.amount), live)
        return { state }
      }
      if (live?.status === 'WAITING' && Number(existing.amount) === amount) return waiting(existing)
      // Expired at PhaJay, unknown there, or made for an amount that is no longer owed: retire it.
      await db.setStatus(existing.transaction_id, live && live.status !== 'WAITING' ? live.status : 'EXPIRED')
    }

    const qr = await ask(() => provider.generateQr({ reference: owed.label, amount }))
    const kept = await db.recordQr({ kind: owed.kind, subjectId: owed.subject_id, qr, amount })
    if (kept) {
      log(`qr ${qr.transactionId} for ${owed.kind} ${owed.label}: ${amount} LAK`)
      return { state: 'waiting', transactionId: qr.transactionId, qrCode: qr.qrCode, link: qr.link, amount }
    }
    // Another payment screen made a QR a moment ago; show that one so there is a single QR to pay.
    const raced = await db.latestQr(owed.kind, owed.subject_id)
    if (raced?.status === 'WAITING') return waiting(raced)
    throw new FlowError('PROVIDER_UNAVAILABLE', 'The QR could not be saved', 502)
  }

  /** Is the QR paid yet? Called every few seconds by the open payment screen. */
  async function check(target: PaymentTarget): Promise<CheckResult> {
    const owed = await resolve(target)
    const qr = await db.latestQr(owed.kind, owed.subject_id)
    if (owed.state === 'paid' || qr?.settled_at) return { state: 'paid' }
    if (!qr) return { state: 'none' }
    if (qr.note) return { state: 'review' }
    if (qr.status !== 'WAITING' && qr.status !== 'PAYMENT_COMPLETED') return { state: 'expired' }

    const live = await ask(() => provider.fetchTransaction(qr.transaction_id))
    if (!live) {
      await db.setStatus(qr.transaction_id, 'EXPIRED')
      return { state: 'expired' }
    }
    if (live.isPaid) return { state: await applyPayment(qr.transaction_id, Number(qr.amount), live) }
    if (live.status === 'WAITING') return { state: 'waiting' }
    await db.setStatus(qr.transaction_id, live.status)
    return { state: 'expired' }
  }

  /** PhaJay's webhook. The answer is what the HTTP wrapper sends back. */
  async function webhook(rawBody: string, signature: string | null): Promise<{ status: number; body: Record<string, unknown> }> {
    if (!(await webhookSignatureValid(rawBody, signature, deps.webhookSecrets ?? []))) {
      log('webhook: signature does not match')
      return { status: 401, body: { error: 'Invalid signature' } }
    }
    const event = parseWebhook(rawBody)
    if (!event) return { status: 400, body: { error: 'Unreadable event' } }
    if (event.status !== 'PAYMENT_COMPLETED') return { status: 200, body: { ok: true, ignored: event.status } }

    // A database failure throws, so the wrapper answers 5xx and PhaJay can send it again.
    const outcome = await db.settle(event.transactionId, event.amount, null)
    log(`webhook ${event.transactionId}: ${outcome.result}`)
    if (outcome.result === 'settled' || outcome.result === 'already_settled') await announce(event.transactionId)
    return { status: 200, body: { ok: true, result: outcome.result } }
  }

  return { start, check, webhook }
}
