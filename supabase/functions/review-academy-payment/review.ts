// Pure checks for an Academy payment proof read by Qwen. Kept free of I/O so
// they can be unit tested; index.ts does the database and Qwen calls.

export type CheckStatus = 'pass' | 'fail' | 'unknown'
export type SuggestedAction = 'APPROVE' | 'DECLINE' | 'MANUAL'

export interface ReceiptReading {
  is_payment_receipt: boolean
  /** completed | failed | pending | unknown, as printed on the receipt. */
  transfer_status: string
  amount: number | null
  currency: string | null
  /** The date printed on the receipt, YYYY-MM-DD (local, not converted). */
  date: string | null
  time: string | null
  receiver_name: string | null
  sender_name: string | null
  bank: string | null
  transaction_id: string | null
  /** Qwen's own judgement of whether the receiver is one of the expected names. */
  receiver_matches: boolean | null
  confidence: number
  notes: string
}

export interface ReviewInput {
  reading: ReceiptReading
  planPrice: number
  /** When the member made the subscription request (ISO timestamp). */
  requestedAt: string
  expectedAccountNames: string[]
  /** The same transaction ID was already used on another Academy payment. */
  duplicateTransaction: boolean
}

export interface Check {
  key: 'receipt' | 'amount' | 'completed' | 'date' | 'receiver' | 'duplicate'
  status: CheckStatus
  label: string
  detail: string
}

export interface Review {
  suggested_action: SuggestedAction
  checks: Check[]
  decline_reason_lo: string | null
  decline_reason_en: string | null
}

/** Transfers may happen on the request day or up to this many days after. */
export const DATE_WINDOW_DAYS = 2
/** Below this OCR confidence a clean result still needs a human look. */
export const MIN_CONFIDENCE = 60

const DAY_MS = 24 * 60 * 60 * 1000

function formatLak(value: number) {
  return `${Math.round(value).toLocaleString('en-US')} LAK`
}

/** d/m/yyyy, as the app shows dates in Lao. */
function formatDay(isoDay: string) {
  const [year, month, day] = isoDay.split('-').map(Number)
  return `${day}/${month}/${year}`
}

/** The calendar day in Laos for a timestamp, as YYYY-MM-DD. */
export function laosDay(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Vientiane' }).format(new Date(iso))
}

function addDays(isoDay: string, days: number) {
  const date = new Date(`${isoDay}T00:00:00Z`)
  return new Date(date.getTime() + days * DAY_MS).toISOString().slice(0, 10)
}

const TITLES = new Set(['mr', 'mrs', 'ms', 'miss', 'mister', 'sir', 'dr', 'ທ້າວ', 'ນາງ', 'ທ່ານ', 'ທ', 'ນ', 'ທ.', 'ນ.'])

/** Lowercased name tokens, without titles or punctuation; masked tokens keep their '*'. */
export function nameTokens(name: string): string[] {
  return name
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}*\s]/gu, ' ')
    .split(/\s+/)
    .filter(token => token && !TITLES.has(token))
}

function tokenMatches(receiverToken: string, expectedToken: string) {
  if (!receiverToken.includes('*')) return receiverToken === expectedToken
  // Banks often mask names ("WEN K***"): compare the visible start only.
  const visible = receiverToken.replace(/\*+$/, '').replace(/\*/g, '')
  return visible.length > 0 && expectedToken.startsWith(visible)
}

/** Whether a receiver name read from a receipt is the same person/business as an expected account name. */
export function namesMatch(receiver: string, expected: string): boolean {
  const a = nameTokens(receiver)
  const b = nameTokens(expected)
  if (a.length === 0 || b.length === 0) return false
  const joinedA = a.join('').replace(/\*/g, '')
  const joinedB = b.join('')
  if (!receiver.includes('*') && joinedA === joinedB) return true
  // Every receiver token must appear in the expected name, in any order
  // ("KHAMPHENG WEN" vs "WEN KHAMPHENG"); allow a missing middle name.
  const matched = a.filter(token => b.some(other => tokenMatches(token, other))).length
  return matched === a.length && matched >= Math.min(2, b.length)
}

export function buildReview(input: ReviewInput): Review {
  const { reading, planPrice, requestedAt, expectedAccountNames, duplicateTransaction } = input
  const checks: Check[] = []
  const reasonsLo: string[] = []
  const reasonsEn: string[] = []

  if (!reading.is_payment_receipt) {
    checks.push({ key: 'receipt', status: 'fail', label: 'Payment receipt', detail: reading.notes || 'The image is not a bank transfer receipt.' })
    reasonsLo.push('ຮູບທີ່ສົ່ງມາບໍ່ແມ່ນຫຼັກຖານການໂອນເງິນທີ່ສົມບູນ.')
    reasonsEn.push('The uploaded image is not a completed bank transfer receipt.')
    return finish(checks, reasonsLo, reasonsEn, reading.confidence)
  }
  checks.push({ key: 'receipt', status: 'pass', label: 'Payment receipt', detail: reading.bank ? `Bank receipt (${reading.bank})` : 'Bank receipt' })

  // Amount vs plan price
  const currencyOk = !reading.currency || reading.currency.toUpperCase() === 'LAK'
  if (!currencyOk) {
    checks.push({ key: 'amount', status: 'fail', label: 'Amount', detail: `Currency is ${reading.currency}, expected LAK (${formatLak(planPrice)})` })
    reasonsLo.push('ສະກຸນເງິນໃນຫຼັກຖານບໍ່ແມ່ນກີບ (LAK).')
    reasonsEn.push('The receipt is not in Lao kip (LAK).')
  } else if (reading.amount == null) {
    checks.push({ key: 'amount', status: 'unknown', label: 'Amount', detail: `Could not read the amount (plan price ${formatLak(planPrice)})` })
  } else if (Math.abs(reading.amount - planPrice) < 1) {
    checks.push({ key: 'amount', status: 'pass', label: 'Amount', detail: `${formatLak(reading.amount)} matches the plan price` })
  } else if (reading.amount > planPrice) {
    checks.push({ key: 'amount', status: 'pass', label: 'Amount', detail: `${formatLak(reading.amount)} is more than the plan price ${formatLak(planPrice)}` })
  } else {
    checks.push({ key: 'amount', status: 'fail', label: 'Amount', detail: `${formatLak(reading.amount)} is less than the plan price ${formatLak(planPrice)}` })
    reasonsLo.push(`ຈຳນວນເງິນທີ່ໂອນ (${formatLak(reading.amount)}) ບໍ່ກົງກັບລາຄາແຜນ (${formatLak(planPrice)}).`)
    reasonsEn.push(`The transferred amount (${formatLak(reading.amount)}) does not match the plan price (${formatLak(planPrice)}).`)
  }

  // Transfer completed
  const transferStatus = reading.transfer_status.toLowerCase()
  if (transferStatus === 'completed') {
    checks.push({ key: 'completed', status: 'pass', label: 'Transfer completed', detail: 'The receipt shows a successful transfer' })
  } else if (transferStatus === 'failed' || transferStatus === 'pending') {
    checks.push({ key: 'completed', status: 'fail', label: 'Transfer completed', detail: `The receipt shows the transfer as ${transferStatus}` })
    reasonsLo.push('ການໂອນເງິນຍັງບໍ່ສຳເລັດ ຫຼື ລົ້ມເຫຼວ.')
    reasonsEn.push('The transfer was not completed.')
  } else {
    checks.push({ key: 'completed', status: 'unknown', label: 'Transfer completed', detail: 'Could not see whether the transfer succeeded' })
  }

  // Date: the request day, or up to DATE_WINDOW_DAYS later
  const firstDay = laosDay(requestedAt)
  const lastDay = addDays(firstDay, DATE_WINDOW_DAYS)
  const window = `${formatDay(firstDay)} – ${formatDay(lastDay)}`
  const receiptDay = reading.date && /^\d{4}-\d{2}-\d{2}/.test(reading.date) ? reading.date.slice(0, 10) : null
  if (!receiptDay) {
    checks.push({ key: 'date', status: 'unknown', label: 'Date', detail: `Could not read the transfer date (allowed ${window})` })
  } else if (receiptDay >= firstDay && receiptDay <= lastDay) {
    checks.push({ key: 'date', status: 'pass', label: 'Date', detail: `${formatDay(receiptDay)}${reading.time ? ` ${reading.time}` : ''} is within ${window}` })
  } else {
    checks.push({ key: 'date', status: 'fail', label: 'Date', detail: `${formatDay(receiptDay)} is outside ${window}` })
    reasonsLo.push(`ວັນທີໂອນເງິນ (${formatDay(receiptDay)}) ບໍ່ຢູ່ໃນຊ່ວງວັນທີສະໝັກ (${formatDay(firstDay)} ຫາ ${formatDay(lastDay)}).`)
    reasonsEn.push(`The transfer date (${formatDay(receiptDay)}) is not within the subscription period (${formatDay(firstDay)} to ${formatDay(lastDay)}).`)
  }

  // Receiver account name
  const expected = expectedAccountNames.filter(Boolean)
  if (expected.length === 0) {
    checks.push({ key: 'receiver', status: 'unknown', label: 'Receiver', detail: 'No admin bank account name is set up to compare with' })
  } else if (!reading.receiver_name) {
    checks.push({ key: 'receiver', status: 'unknown', label: 'Receiver', detail: `Could not read the receiver name (expected ${expected.join(' / ')})` })
  } else if (expected.some(name => namesMatch(reading.receiver_name!, name)) || reading.receiver_matches === true) {
    checks.push({ key: 'receiver', status: 'pass', label: 'Receiver', detail: `${reading.receiver_name} matches the Bitdoin account` })
  } else {
    checks.push({ key: 'receiver', status: 'fail', label: 'Receiver', detail: `${reading.receiver_name} is not ${expected.join(' / ')}` })
    reasonsLo.push(`ຊື່ບັນຊີຜູ້ຮັບເງິນ (${reading.receiver_name}) ບໍ່ກົງກັບບັນຊີຂອງ Bitdoin.`)
    reasonsEn.push(`The receiving account name (${reading.receiver_name}) does not match Bitdoin's account.`)
  }

  if (duplicateTransaction) {
    checks.push({ key: 'duplicate', status: 'fail', label: 'Not reused', detail: `Transaction ${reading.transaction_id} was already used on another payment` })
    reasonsLo.push('ຫຼັກຖານການໂອນນີ້ເຄີຍຖືກໃຊ້ກັບການຊຳລະອື່ນແລ້ວ.')
    reasonsEn.push('This receipt has already been used for another payment.')
  }

  return finish(checks, reasonsLo, reasonsEn, reading.confidence)
}

function finish(checks: Check[], reasonsLo: string[], reasonsEn: string[], confidence: number): Review {
  const failed = checks.some(check => check.status === 'fail')
  const unsure = checks.some(check => check.status === 'unknown') || confidence < MIN_CONFIDENCE
  return {
    suggested_action: failed ? 'DECLINE' : unsure ? 'MANUAL' : 'APPROVE',
    checks,
    decline_reason_lo: failed
      ? `${reasonsLo.join(' ')} ກະລຸນາກວດສອບ ແລະ ສະໝັກໃໝ່ພ້ອມຫຼັກຖານການໂອນທີ່ຖືກຕ້ອງ.`
      : null,
    decline_reason_en: failed
      ? `${reasonsEn.join(' ')} Please check and subscribe again with a correct transfer receipt.`
      : null,
  }
}

/** Turns Qwen's JSON into a ReceiptReading, never trusting its types. */
export function parseReading(content: string): ReceiptReading {
  let parsed: Record<string, unknown> = {}
  try {
    parsed = JSON.parse(content)
  } catch {
    return {
      is_payment_receipt: false, transfer_status: 'unknown', amount: null, currency: null, date: null, time: null,
      receiver_name: null, sender_name: null, bank: null, transaction_id: null, receiver_matches: null,
      confidence: 0, notes: 'The AI returned an unreadable answer',
    }
  }
  const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim().slice(0, 200) : null)
  const amount = parsed.amount == null ? null : Number(String(parsed.amount).replace(/[^\d.]/g, ''))
  return {
    is_payment_receipt: parsed.is_payment_receipt === true,
    transfer_status: text(parsed.transfer_status)?.toLowerCase() ?? 'unknown',
    amount: amount != null && Number.isFinite(amount) && amount > 0 ? amount : null,
    currency: text(parsed.currency)?.toUpperCase() ?? null,
    date: text(parsed.date),
    time: text(parsed.time),
    receiver_name: text(parsed.receiver_name),
    sender_name: text(parsed.sender_name),
    bank: text(parsed.bank),
    transaction_id: text(parsed.transaction_id),
    receiver_matches: typeof parsed.receiver_matches === 'boolean' ? parsed.receiver_matches : null,
    confidence: Math.min(100, Math.max(0, Number(parsed.confidence) || 0)),
    notes: text(parsed.notes) ?? '',
  }
}

export function buildPrompt(planPrice: number, expectedAccountNames: string[]) {
  return `You are checking a bank transfer receipt (Lao, Thai or English) for a Bitdoin Academy membership costing ${planPrice} LAK.
The money should have been sent to an account named: ${expectedAccountNames.length ? expectedAccountNames.map(name => `"${name}"`).join(' or ') : '(unknown)'}.

Read the image carefully. Never guess values you cannot read; use null instead.
Return ONLY one JSON object, no Markdown:
{
  "is_payment_receipt": <true only for a bank/wallet transfer receipt or confirmation screen; false for QR codes, blank forms, chats or unrelated images>,
  "transfer_status": "<completed | failed | pending | unknown — completed only if the receipt shows success>",
  "amount": <transferred amount as a number, or null>,
  "currency": "<currency code such as LAK, or null>",
  "date": "<transfer date exactly as printed, converted to YYYY-MM-DD without changing the day, or null>",
  "time": "<transfer time as printed (HH:MM), or null>",
  "receiver_name": "<receiving account holder name exactly as printed, or null>",
  "sender_name": "<sender name, or null>",
  "bank": "<bank or wallet name, or null>",
  "transaction_id": "<transaction/reference number, or null>",
  "receiver_matches": <true if the receiver is clearly the expected account holder (allow Lao/English spelling of the same name and masked letters), false if clearly someone else, null if unreadable>,
  "confidence": <0-100: how clearly you could read the receipt and how genuine it looks>,
  "notes": "<one short sentence for the admin, no account numbers>"
}`
}
