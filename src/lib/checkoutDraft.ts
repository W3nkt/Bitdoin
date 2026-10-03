import type { CartItem, CheckoutForm } from '@/types'

// Users on slow/unstable connections often refresh mid-checkout and re-fill
// the form, then submit again — each submit used to create a brand-new order
// row. These two pieces of persisted state fix that:
//   - the draft form values survive a refresh, so there's less reason to redo
//     the whole form from scratch
//   - the idempotency key stays stable for as long as the cart contents don't
//     change, so a retry of the same attempt (including after a refresh)
//     reuses the same order server-side instead of creating a duplicate

const DRAFT_KEY = 'pwen_checkout_draft'
const ATTEMPT_KEY = 'pwen_checkout_attempt'

export function loadCheckoutDraft(): Partial<CheckoutForm> | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? (JSON.parse(raw) as Partial<CheckoutForm>) : null
  } catch {
    return null
  }
}

export function saveCheckoutDraft(form: Partial<CheckoutForm>) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(form))
  } catch {
    // best-effort only (private browsing / storage disabled / quota)
  }
}

export function clearCheckoutDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    // ignore
  }
}

function cartSignature(items: CartItem[]) {
  return items
    .map(item => `${item.book_id}:${item.bookstore_id}:${item.quantity}`)
    .sort()
    .join('|')
}

/**
 * One stable id per "checkout attempt": as long as the cart contents match
 * what was stored, the same key is returned so retries collapse server-side.
 * A changed cart is a genuinely new attempt and gets a new key.
 */
export function getCheckoutIdempotencyKey(items: CartItem[]): string {
  const signature = cartSignature(items)
  try {
    const raw = localStorage.getItem(ATTEMPT_KEY)
    if (raw) {
      const attempt = JSON.parse(raw) as { key: string; signature: string }
      if (attempt.key && attempt.signature === signature) return attempt.key
    }
  } catch {
    // fall through to issuing a new attempt
  }

  const key = crypto.randomUUID()
  try {
    localStorage.setItem(ATTEMPT_KEY, JSON.stringify({ key, signature }))
  } catch {
    // ignore — idempotency key still works for this in-memory attempt
  }
  return key
}

export function clearCheckoutAttempt() {
  try {
    localStorage.removeItem(ATTEMPT_KEY)
  } catch {
    // ignore
  }
}
