// Remembers the order code + phone a guest last used to track an order, so
// they don't have to retype it on every refresh or after browsing other
// pages. Cleared once payment proof has been uploaded, since at that point
// there's nothing left for the customer to act on.

const STORAGE_KEY = 'pwen-active-guest-order'

interface ActiveGuestOrder {
  orderNumber: string
  phone: string
}

export function saveActiveGuestOrder(orderNumber: string, phone: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ orderNumber, phone }))
  } catch {
    // Storage can be unavailable (private browsing, quota); pre-fill is a
    // convenience, not a requirement, so fail silently.
  }
}

export function loadActiveGuestOrder(): ActiveGuestOrder | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (typeof parsed?.orderNumber === 'string' && typeof parsed?.phone === 'string') {
      return parsed as ActiveGuestOrder
    }
    return null
  } catch {
    return null
  }
}

export function clearActiveGuestOrder() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
