import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Currency, Language, OrderStatus, PaymentStatus, DeliveryStatus } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Currency formatting ───────────────────────────────────────────────────────

const LAK_RATE = 20000 // approximate LAK per USD

export function formatPrice(amount: number, currency: Currency = 'LAK'): string {
  if (currency === 'LAK') {
    return new Intl.NumberFormat('lo-LA', {
      style: 'currency',
      currency: 'LAK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount / LAK_RATE)
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat().format(n)
}

// ─── Date formatting ──────────────────────────────────────────────────────────

// Browsers have no Lao month names (lo-LA falls back to English "Sep 27"),
// so Lao dates are written as day/month/year: 9/10/2026.
export function formatLaoDate(date: Date, withYear = true): string {
  const dayMonth = `${date.getDate()}/${date.getMonth() + 1}`
  return withYear ? `${dayMonth}/${date.getFullYear()}` : dayMonth
}

/** 24-hour time, as used in Laos: 14:05. */
export function formatLaoTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function formatDate(dateStr: string, lang: Language = 'en'): string {
  const date = new Date(dateStr)
  if (lang === 'lo') return formatLaoDate(date)
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  }).format(date)
}

export function formatDateTime(dateStr: string, lang: Language = 'en'): string {
  const date = new Date(dateStr)
  if (lang === 'lo') return `${formatLaoDate(date)} ${formatLaoTime(date)}`
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(date)
}

// ─── Order / payment status labels ────────────────────────────────────────────

export function orderStatusLabel(status: OrderStatus, lang: Language = 'en'): string {
  const labels: Record<OrderStatus, Record<Language, string>> = {
    PENDING_PAYMENT:            { en: 'Pending Payment',        lo: 'ລໍຖ້າຈ່າຍເງິນ' },
    PAYMENT_REVIEW:             { en: 'Payment Review',         lo: 'ກວດສອບການຈ່າຍ' },
    PROCESSING:                 { en: 'Processing',             lo: 'ກຳລັງດຳເນີນ' },
    PURCHASING_FROM_BOOKSTORE:  { en: 'Purchasing from Store',  lo: 'ກຳລັງຊື້ຈາກຮ້ານ' },
    PARTIALLY_SHIPPED:          { en: 'Partially Shipped',      lo: 'ສົ່ງບາງສ່ວນ' },
    SHIPPED:                    { en: 'Shipped',                lo: 'ສົ່ງແລ້ວ' },
    DELIVERED:                  { en: 'Delivered',              lo: 'ສົ່ງຮອດແລ້ວ' },
    COMPLETED:                  { en: 'Completed',              lo: 'ສຳເລັດ' },
    CANCELLED:                  { en: 'Cancelled',              lo: 'ຍົກເລີກ' },
    OUT_OF_STOCK:               { en: 'Out of Stock',           lo: 'ໝົດສາງ' },
    RETURNED:                   { en: 'Returned',               lo: 'ສົ່ງຄືນ' },
  }
  return labels[status]?.[lang] ?? status
}

export function paymentStatusLabel(status: PaymentStatus, lang: Language = 'en'): string {
  const labels: Record<PaymentStatus, Record<Language, string>> = {
    PENDING:        { en: 'Pending',         lo: 'ລໍຖ້າ' },
    VERIFIED:       { en: 'Verified',        lo: 'ຢືນຢັນແລ້ວ' },
    REQUIRES_REVIEW:{ en: 'Needs Review',    lo: 'ຕ້ອງກວດ' },
    REJECTED:       { en: 'Rejected',        lo: 'ປະຕິເສດ' },
    REFUNDED:       { en: 'Refunded',        lo: 'ຄືນເງິນ' },
  }
  return labels[status]?.[lang] ?? status
}

export function deliveryStatusLabel(status: DeliveryStatus, lang: Language = 'en'): string {
  const labels: Record<DeliveryStatus, Record<Language, string>> = {
    NOT_ASSIGNED:      { en: 'Not Assigned',       lo: 'ຍັງບໍ່ໄດ້ກຳນົດ' },
    READY_FOR_SHIPMENT:{ en: 'Ready to Ship',      lo: 'ພ້ອມສົ່ງ' },
    SHIPPED:           { en: 'Shipped',             lo: 'ສົ່ງແລ້ວ' },
    DELIVERED:         { en: 'Delivered',           lo: 'ສົ່ງຮອດ' },
    FAILED:            { en: 'Failed',              lo: 'ລົ້ມເຫຼວ' },
    RETURNED:          { en: 'Returned',            lo: 'ສົ່ງຄືນ' },
  }
  return labels[status]?.[lang] ?? status
}

export function orderStatusColor(status: OrderStatus): string {
  const colors: Partial<Record<OrderStatus, string>> = {
    PENDING_PAYMENT:           'bg-yellow-100 dark:bg-yellow-500/15 text-yellow-800 dark:text-yellow-300',
    PAYMENT_REVIEW:            'bg-orange-100 dark:bg-orange-500/15 text-orange-800 dark:text-orange-300',
    PROCESSING:                'bg-blue-100 dark:bg-blue-500/15 text-blue-800 dark:text-blue-300',
    PURCHASING_FROM_BOOKSTORE: 'bg-purple-100 dark:bg-purple-500/15 text-purple-800 dark:text-purple-300',
    PARTIALLY_SHIPPED:         'bg-indigo-100 dark:bg-indigo-500/15 text-indigo-800 dark:text-indigo-300',
    SHIPPED:                   'bg-cyan-100 dark:bg-cyan-500/15 text-cyan-800 dark:text-cyan-300',
    DELIVERED:                 'bg-green-100 dark:bg-green-500/15 text-green-800 dark:text-green-300',
    COMPLETED:                 'bg-green-200 dark:bg-green-500/25 text-green-900 dark:text-green-300',
    CANCELLED:                 'bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-300',
    OUT_OF_STOCK:              'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100',
    RETURNED:                  'bg-rose-100 dark:bg-rose-500/15 text-rose-800 dark:text-rose-300',
  }
  return colors[status] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
}

export function paymentStatusColor(status: PaymentStatus): string {
  const colors: Record<PaymentStatus, string> = {
    PENDING:         'bg-yellow-100 dark:bg-yellow-500/15 text-yellow-800 dark:text-yellow-300',
    VERIFIED:        'bg-green-100 dark:bg-green-500/15 text-green-800 dark:text-green-300',
    REQUIRES_REVIEW: 'bg-orange-100 dark:bg-orange-500/15 text-orange-800 dark:text-orange-300',
    REJECTED:        'bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-300',
    REFUNDED:        'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100',
  }
  return colors[status]
}

// ─── Phone ────────────────────────────────────────────────────────────────────

/**
 * Normalises a Lao phone number to E.164 format (+856XXXXXXXXXX).
 *
 * Handles all common input shapes:
 *   29862982      → +8562029862982  (8-digit subscriber only — assumes prefix 20)
 *   2029862982    → +8562029862982  (10-digit, no country code)
 *   02029862982   → +8562029862982  (11-digit local format with leading 0)
 *   8562029862982 → +8562029862982  (13-digit, already has country code)
 */
export function normalizeLaoPhone(phone: string): string {
  const d = phone.replace(/\D/g, '')
  if (d.startsWith('856') && d.length >= 11) return '+' + d   // already full
  if (d.startsWith('0') && d.length >= 10)   return '+856' + d.slice(1)  // local 0XX…
  if (d.length === 10)                        return '+856' + d  // no leading 0, with operator code
  if (d.length === 8)                         return '+85620' + d // subscriber only, default prefix 20
  return '+856' + d // best-effort fallback
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

export function generateOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase()
  const rnd = Math.random().toString(36).slice(2, 5).toUpperCase()
  return `PB-${ts}-${rnd}`
}

export function calcFinalPrice(bookstorePrice: number, marginPercent: number): number {
  return bookstorePrice * (1 + marginPercent / 100)
}

export function truncate(str: string, maxLen: number): string {
  return str.length <= maxLen ? str : str.slice(0, maxLen).trimEnd() + '…'
}

export function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}
