// A buyer cancels their own order from the tracking page (migration 173): only with the order number and
// phone, only while nothing has been paid or sent for review, and a QR still open for the order cannot
// make it look paid afterwards.
import { eq, done, readMigration } from './harness.mjs'
import { PHONE, createShopDb, shopOrder } from './phajay-shop.mjs'

const db = await createShopDb()
await db.exec(readMigration('173_guest_cancel_order.sql'))

const rows = async (sql, params = []) => (await db.query(sql, params)).rows
const one = async (sql, params = []) => (await rows(sql, params))[0]
const cancel = async (number, phone = PHONE) => (await one(`select public.cancel_guest_order($1, $2) as r`, [number, phone])).r
const status = async (orderId) => (await one(`select status, payment_status as order_payment from orders where id = $1`, [orderId]))
const audits = async () => (await one(`select count(*)::int as n from audit_logs where action = 'ORDER_CANCELLED_BY_CUSTOMER'`)).n

const fresh = await shopOrder(db)
eq('an unpaid order is cancelled with its order number and phone', await cancel(fresh.orderNumber, '020-5555-1234'), { ok: true })
eq('the order is cancelled, its payment status untouched', await status(fresh.orderId), { status: 'CANCELLED', order_payment: 'PENDING' })
eq('it is audited, as a customer action', await one(`select entity, entity_id = $1 as order_id, old_value, new_value->>'order_number' as number from audit_logs where action = 'ORDER_CANCELLED_BY_CUSTOMER'`, [fresh.orderId]),
  { entity: 'order', order_id: true, old_value: { status: 'PENDING_PAYMENT' }, number: fresh.orderNumber })
eq('cancelling again (a second tap) is fine and is not audited twice', [await cancel(fresh.orderNumber), await audits()], [{ ok: true }, 1])
eq('spaces and lower case in the order number do not matter', await cancel(`  ${(await shopOrder(db)).orderNumber.toLowerCase()} `), { ok: true })

const other = await shopOrder(db)
eq('another phone number, an unknown order, a short or empty phone: not found, nothing changes', [
  await cancel(other.orderNumber, '020 9999 9999'), await cancel('BD-ZZZZ'), await cancel(other.orderNumber, '0205'), await cancel(other.orderNumber, ''), (await status(other.orderId)).status,
], [{ ok: false, reason: 'not_found' }, { ok: false, reason: 'not_found' }, { ok: false, reason: 'not_found' }, { ok: false, reason: 'not_found' }, 'PENDING_PAYMENT'])

const notCancellable = [
  ['a receipt waiting for review', { status: 'PAYMENT_REVIEW', paymentStatus: 'REQUIRES_REVIEW' }, 'PAYMENT_REVIEW'],
  ['a receipt flagged for review on an order still waiting', { paymentStatus: 'REQUIRES_REVIEW' }, 'PENDING_PAYMENT'],
  ['a verified payment', { status: 'PROCESSING', paymentStatus: 'VERIFIED' }, 'PROCESSING'],
  ['a delivered order', { status: 'DELIVERED', paymentStatus: 'VERIFIED' }, 'DELIVERED'],
  ['an unpaid cash-on-delivery order that is already being processed', { status: 'PROCESSING', method: 'CASH_ON_DELIVERY' }, 'PROCESSING'],
]
for (const [label, options, expected] of notCancellable) {
  const order = await shopOrder(db, options)
  eq(`${label} cannot be cancelled by the buyer, and stays as it was`, [await cancel(order.orderNumber), (await status(order.orderId)).status], [{ ok: false, reason: 'not_cancellable' }, expected])
}
eq('nothing was audited for those', await audits(), 2)

const rejected = await shopOrder(db, { status: 'PENDING_PAYMENT', paymentStatus: 'REJECTED' })
eq('an order whose receipt was rejected can still be cancelled', [await cancel(rejected.orderNumber), (await status(rejected.orderId)).status], [{ ok: true }, 'CANCELLED'])

// A BCEL One QR that is still open for the order.
const paying = await shopOrder(db, { total: 45000 })
await db.query(`insert into phajay_transactions (transaction_id, kind, subject_id, amount, qr_code) values ('tx-open', 'shop_order', $1, 45000, 'QR')`, [paying.paymentId])
eq('cancelling closes the open QR', [await cancel(paying.orderNumber), (await one(`select status from phajay_transactions where transaction_id = 'tx-open'`)).status], [{ ok: true }, 'EXPIRED'])
const late = (await one(`select public.phajay_settle('tx-open', 45000) as r`)).r
eq('if the buyer pays that QR anyway the order stays cancelled and the payment is flagged for a refund',
  [late.result, (await status(paying.orderId)).status, (await one(`select count(*)::int as n from audit_logs where action = 'PHAJAY_PAYMENT_UNAPPLIED'`)).n], ['order_not_payable', 'CANCELLED', 1])

const paidFirst = await shopOrder(db, { total: 30000 })
await db.query(`insert into phajay_transactions (transaction_id, kind, subject_id, amount, qr_code) values ('tx-first', 'shop_order', $1, 30000, 'QR')`, [paidFirst.paymentId])
await db.query(`select public.phajay_settle('tx-first', 30000)`)
eq('if the payment landed first the order is too far along to cancel', [await cancel(paidFirst.orderNumber), (await status(paidFirst.orderId)).status], [{ ok: false, reason: 'not_cancellable' }, 'PROCESSING'])

eq('visitors and signed-in users may call it, as with tracking an order', await Promise.all(['anon', 'authenticated'].map(async (role) =>
  (await one(`select has_function_privilege($1, 'public.cancel_guest_order(text, text)', 'execute') as can`, [role])).can)), [true, true])

done()
