import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

// Client for the phajay-checkout Edge Function (supabase/functions/phajay-checkout). The function
// makes the BCEL One QR for what is owed and applies the payment when PhaJay confirms it; the browser
// never holds a PhaJay key and cannot say how much anything costs. An Academy payment is identified by
// the signed-in session that supabase-js attaches, not by anything in the request.

/** What is being paid. */
export type PhajayTarget =
  | { kind: 'shop_order'; orderNumber: string; phone: string }
  | { kind: 'premium' }
  | { kind: 'career_report' }

export type PhajayErrorCode =
  | 'NOT_CONFIGURED' // the function is not deployed, or has no PhaJay key: use the bank-transfer flow
  | 'CURRENCY_NOT_SUPPORTED'
  | 'NOT_PAYABLE'
  | 'ORDER_NOT_FOUND'
  | 'SIGN_IN_REQUIRED'
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_REJECTED'
  | 'RATE_LIMITED'
  | 'BAD_REQUEST'
  | 'SERVER_ERROR'
  | 'NETWORK' // the request never got an answer: the function is not deployed yet (the browser blocks its failed preflight), offline, or CORS

export class PhajayRequestError extends Error {
  constructor(readonly code: PhajayErrorCode, message: string) {
    super(message)
  }

  /** The feature is simply off for this order; the customer should go straight to the other way to pay. */
  get notAvailable() {
    return this.code === 'NOT_CONFIGURED' || this.code === 'CURRENCY_NOT_SUPPORTED' || this.code === 'NOT_PAYABLE'
  }
}

export type PhajayStart =
  | { state: 'waiting'; transactionId: string; qrCode: string; /** onepay:// link that opens BCEL One */ link: string | null; /** whole kip */ amount: number }
  | { state: 'paid' }
  /** PhaJay has the money, but staff must check the order. */
  | { state: 'review' }

export type PhajayWaiting = Extract<PhajayStart, { state: 'waiting' }>

export function isWaiting(result: PhajayStart | undefined): result is PhajayWaiting {
  return result?.state === 'waiting'
}

export interface PhajayCheck {
  state: 'none' | 'waiting' | 'paid' | 'expired' | 'review'
}

async function requestError(error: unknown) {
  if (error instanceof FunctionsHttpError) {
    const response = error.context as Response
    const body = await response.json().catch(() => null) as { error?: string; code?: string } | null
    // The Supabase gateway itself answers NOT_FOUND when the function has not been deployed.
    const code = body?.code === 'NOT_FOUND' ? 'NOT_CONFIGURED' : body?.code
    console.warn('[phajay] payment request refused:', response.status, code, body?.error)
    return new PhajayRequestError((code as PhajayErrorCode) || 'SERVER_ERROR', body?.error ?? `Payment request failed (${response.status})`)
  }
  // No answer at all. Most often the function is not deployed: the gateway answers its preflight with a 404 and
  // the browser then blocks the call, so the page only sees a network error. Say so in the console for developers.
  console.warn('[phajay] payment request got no answer (function not deployed, offline or blocked by CORS):', error)
  return new PhajayRequestError('NETWORK', error instanceof Error ? error.message : 'Could not reach the payment service')
}

async function call<T>(action: 'start' | 'check', target: PhajayTarget) {
  const { data, error } = await supabase.functions.invoke('phajay-checkout', {
    body: { action, ...target },
    timeout: 20_000,
  })
  if (error) throw await requestError(error)
  return data as T
}

/** Makes the QR for this payment, or returns the one already made. */
export const startPhajayPayment = (target: PhajayTarget) => call<PhajayStart>('start', target)

/** Asks whether the QR has been paid; the server applies the payment when it has. */
export const checkPhajayPayment = (target: PhajayTarget) => call<PhajayCheck>('check', target)
