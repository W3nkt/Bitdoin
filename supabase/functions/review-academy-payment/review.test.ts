import { assert, assertEquals, assertStringIncludes } from 'jsr:@std/assert@1'
import { buildReview, laosDay, namesMatch, parseReading, type ReceiptReading } from './review.ts'

const GOOD: ReceiptReading = {
  is_payment_receipt: true,
  transfer_status: 'completed',
  amount: 39000,
  currency: 'LAK',
  date: '2026-10-09',
  time: '14:05',
  receiver_name: 'WEN KHAMTENG',
  sender_name: 'CHONG',
  bank: 'BCEL One',
  transaction_id: 'TX123',
  receiver_matches: true,
  confidence: 92,
  notes: '',
}

// 9 Oct 2026, 10:00 in Laos (UTC+7)
const REQUESTED = '2026-10-09T03:00:00Z'

function review(reading: Partial<ReceiptReading>, extra: { names?: string[]; duplicate?: boolean; requestedAt?: string } = {}) {
  return buildReview({
    reading: { ...GOOD, ...reading },
    planPrice: 39000,
    requestedAt: extra.requestedAt ?? REQUESTED,
    expectedAccountNames: extra.names ?? ['Wen Khamteng'],
    duplicateTransaction: extra.duplicate ?? false,
  })
}

function statusOf(result: ReturnType<typeof review>, key: string) {
  return result.checks.find(check => check.key === key)?.status
}

Deno.test('a clean receipt is suggested for approval', () => {
  const result = review({})
  assertEquals(result.suggested_action, 'APPROVE')
  assertEquals(result.decline_reason_lo, null)
  assert(result.checks.every(check => check.status === 'pass'))
})

Deno.test('a smaller amount is declined with a drafted reason in both languages', () => {
  const result = review({ amount: 30000 })
  assertEquals(result.suggested_action, 'DECLINE')
  assertEquals(statusOf(result, 'amount'), 'fail')
  assertStringIncludes(result.decline_reason_en!, '30,000 LAK')
  assertStringIncludes(result.decline_reason_en!, '39,000 LAK')
  assertStringIncludes(result.decline_reason_lo!, '30,000 LAK')
})

Deno.test('paying more than the plan price passes', () => {
  assertEquals(statusOf(review({ amount: 40000 }), 'amount'), 'pass')
})

Deno.test('a non-LAK receipt fails the amount check', () => {
  assertEquals(statusOf(review({ currency: 'THB' }), 'amount'), 'fail')
})

Deno.test('pending or failed transfers are declined; unreadable status needs a human', () => {
  assertEquals(review({ transfer_status: 'pending' }).suggested_action, 'DECLINE')
  assertEquals(review({ transfer_status: 'unknown' }).suggested_action, 'MANUAL')
})

Deno.test('the transfer date must be the request day or up to 2 days later (Laos time)', () => {
  assertEquals(statusOf(review({ date: '2026-10-09' }), 'date'), 'pass')
  assertEquals(statusOf(review({ date: '2026-10-11' }), 'date'), 'pass')
  assertEquals(statusOf(review({ date: '2026-10-12' }), 'date'), 'fail')
  assertEquals(statusOf(review({ date: '2026-10-08' }), 'date'), 'fail')
  assertEquals(statusOf(review({ date: null }), 'date'), 'unknown')
  // 8 Oct 20:00 UTC is already 9 Oct in Laos.
  assertEquals(statusOf(review({ date: '2026-10-09' }, { requestedAt: '2026-10-08T20:00:00Z' }), 'date'), 'pass')
  assertStringIncludes(review({ date: '2026-10-20' }).decline_reason_en!, '20/10/2026')
})

Deno.test('the receiver must be the admin account holder', () => {
  assertEquals(statusOf(review({ receiver_name: 'Somchai Phommavong', receiver_matches: false }), 'receiver'), 'fail')
  assertEquals(statusOf(review({ receiver_name: null }), 'receiver'), 'unknown')
  // Qwen recognised a Lao spelling of the same name.
  assertEquals(statusOf(review({ receiver_name: 'ເວັນ ຄຳແຕງ', receiver_matches: true }), 'receiver'), 'pass')
  assertEquals(statusOf(review({ receiver_name: 'X' }, { names: [] }), 'receiver'), 'unknown')
})

Deno.test('receiver names match despite case, order, titles and masking', () => {
  assert(namesMatch('MR WEN KHAMTENG', 'Wen Khamteng'))
  assert(namesMatch('KHAMTENG WEN', 'Wen Khamteng'))
  assert(namesMatch('WEN K***', 'Wen Khamteng'))
  assert(namesMatch('ທ້າວ ເວັນ ຄຳແຕງ', 'ເວັນ ຄຳແຕງ'))
  assert(!namesMatch('WEN SOMSAK', 'Wen Khamteng'))
  assert(!namesMatch('WEN', 'Wen Khamteng'))
})

Deno.test('a reused transaction is declined', () => {
  const result = review({}, { duplicate: true })
  assertEquals(result.suggested_action, 'DECLINE')
  assertStringIncludes(result.decline_reason_en!, 'already been used')
})

Deno.test('something that is not a receipt is declined straight away', () => {
  const result = review({ is_payment_receipt: false, notes: 'This is a QR code' })
  assertEquals(result.suggested_action, 'DECLINE')
  assertEquals(result.checks.length, 1)
})

Deno.test('a clean but blurry receipt needs a human look', () => {
  assertEquals(review({ confidence: 40 }).suggested_action, 'MANUAL')
})

Deno.test('Qwen output is parsed defensively', () => {
  const reading = parseReading('{"is_payment_receipt":true,"amount":"39,000 LAK","transfer_status":"Completed","confidence":150}')
  assertEquals(reading.amount, 39000)
  assertEquals(reading.transfer_status, 'completed')
  assertEquals(reading.confidence, 100)
  assertEquals(parseReading('not json').is_payment_receipt, false)
})

Deno.test('laosDay uses Laos time', () => {
  assertEquals(laosDay('2026-10-08T18:00:00Z'), '2026-10-09')
})
