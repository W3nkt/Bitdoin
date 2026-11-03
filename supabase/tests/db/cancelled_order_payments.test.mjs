// A cancelled order's payment leaves the review queue by itself (migration 174), whoever cancels, and the
// guard that stops customers from rejecting or editing their own payment still holds.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { MIGRATIONS, eq, done, ok, readMigration } from './harness.mjs'
import { callerSql } from './fixtures.mjs'
import { PHONE, createShopDb, shopOrder as makeOrder } from './phajay-shop.mjs'

const db = await createShopDb()
// An order whose own payment_status mirrors its payment, as real data does.
const shopOrder = async (database, options = {}) => {
  const order = await makeOrder(database, options)
  await database.query(`update orders set payment_status = $1 where id = $2`, [options.paymentStatus ?? 'PENDING', order.orderId])
  return order
}
// The columns of the real payments table that the guard looks at.
await ok(db, 'payment guard columns', `alter table public.payments add column user_id uuid, add column sender_name text,
  add column ai_confidence_score numeric, add column ai_extracted_data jsonb, add column reviewed_by_user_id uuid;`)
await db.exec(readMigration('173_guest_cancel_order.sql'))
// The guard exactly as migration 043 defines it, so 174 replaces the real thing.
const m043 = readFileSync(join(MIGRATIONS, '043_platform_hardening.sql'), 'utf8')
await db.exec(m043.match(/create or replace function public\.prevent_unsafe_payment_update\(\)[\s\S]*?\n\$\$;/)[0])
await db.exec(m043.match(/drop trigger if exists prevent_unsafe_payment_update[\s\S]*?execute function public\.prevent_unsafe_payment_update\(\);/)[0])
// An order cancelled and still unpaid BEFORE 174, to see the backfill.
const old = await shopOrder(db, { status: 'CANCELLED', paymentStatus: 'PENDING' })
const oldReview = await shopOrder(db, { status: 'CANCELLED', paymentStatus: 'REQUIRES_REVIEW' })
const oldPaid = await shopOrder(db, { status: 'CANCELLED', paymentStatus: 'VERIFIED' })
await db.exec(readMigration('174_cancelled_order_payments.sql'))

const rows = async (sql, params = []) => (await db.query(sql, params)).rows
const one = async (sql, params = []) => (await rows(sql, params))[0]
const state = (orderId) => one(`select o.status, o.payment_status as order_payment, p.verification_status as payment, p.rejection_reason as reason, p.reviewed_at is not null as reviewed
  from orders o join payments p on p.order_id = o.id where o.id = $1`, [orderId])
const CANCELLED_UNPAID = { status: 'CANCELLED', order_payment: 'REJECTED', payment: 'REJECTED', reason: 'Order cancelled', reviewed: true }

eq('orders cancelled before the migration have their payments rejected', [await state(old.orderId), (await state(oldReview.orderId)).payment], [CANCELLED_UNPAID, 'REJECTED'])
eq('and a payment that was verified is left alone', await state(oldPaid.orderId), { status: 'CANCELLED', order_payment: 'VERIFIED', payment: 'VERIFIED', reason: null, reviewed: false })

// Staff cancel the order.
const staff = await shopOrder(db)
await db.query(`update orders set status = 'CANCELLED' where id = $1`, [staff.orderId])
eq('cancelling an order (as the admin does) rejects its pending payment and the order mirrors it', await state(staff.orderId), CANCELLED_UNPAID)
const review = await shopOrder(db, { status: 'PAYMENT_REVIEW', paymentStatus: 'REQUIRES_REVIEW' })
await db.query(`update orders set status = 'CANCELLED' where id = $1`, [review.orderId])
eq('a receipt waiting for review leaves the queue too', (await state(review.orderId)).payment, 'REJECTED')
const paid = await shopOrder(db, { status: 'PROCESSING', paymentStatus: 'VERIFIED' })
await db.query(`update orders set status = 'CANCELLED' where id = $1`, [paid.orderId])
eq('a verified payment stays verified when staff cancel the order (money moved: staff decide)', await state(paid.orderId), { status: 'CANCELLED', order_payment: 'VERIFIED', payment: 'VERIFIED', reason: null, reviewed: false })
const refunded = await shopOrder(db, { status: 'PROCESSING', paymentStatus: 'REFUNDED' })
await db.query(`update orders set status = 'CANCELLED' where id = $1`, [refunded.orderId])
eq('and a refunded one stays refunded', (await state(refunded.orderId)).payment, 'REFUNDED')
const moving = await shopOrder(db)
await db.query(`update orders set status = 'PROCESSING' where id = $1`, [moving.orderId])
eq('other status changes do not touch the payment', (await state(moving.orderId)).payment, 'PENDING')

// The buyer cancels: a visitor with the order number and phone.
const visitor = await shopOrder(db)
await db.exec(`begin; ${callerSql(null, { role: 'anon' })} select public.cancel_guest_order('${visitor.orderNumber}', '${PHONE}'); commit;`)
eq('a visitor cancelling their order rejects its payment', await state(visitor.orderId), CANCELLED_UNPAID)

// A signed-in buyer cancelling their own order: the payment guard must let the system reject it.
const BUYER = '00000000-0000-4000-8000-0000000000b1'
const signedIn = await shopOrder(db)
await db.query(`update payments set user_id = $1 where id = $2`, [BUYER, signedIn.paymentId])
await db.exec(`begin; ${callerSql(BUYER)} select public.cancel_guest_order('${signedIn.orderNumber}', '${PHONE}'); commit;`)
eq('a signed-in buyer cancelling their own order works, and the payment is rejected', await state(signedIn.orderId), CANCELLED_UNPAID)

// The guard still holds for everything else a customer might try.
const attempt = async (buyer, sql) => {
  try { await db.exec(`begin; ${callerSql(buyer)} ${sql}; commit;`); return 'allowed' } catch (error) { await db.exec('rollback').catch(() => {}); return error.message }
}
const mine = await shopOrder(db)
await db.query(`update payments set user_id = $1 where id = $2`, [BUYER, mine.paymentId])
eq('a customer still cannot reject their own payment while the order is open',
  await attempt(BUYER, `update payments set verification_status = 'REJECTED' where id = '${mine.paymentId}'`), 'Customers cannot verify or reject payments')
eq('nor verify it', await attempt(BUYER, `update payments set verification_status = 'VERIFIED' where id = '${mine.paymentId}'`), 'Customers cannot verify or reject payments')

const dead = await shopOrder(db)
await db.query(`update payments set user_id = $1 where id = $2`, [BUYER, dead.paymentId])
await db.query(`update orders set status = 'CANCELLED' where id = $1`, [dead.orderId])
await db.query(`update payments set verification_status = 'PENDING', rejection_reason = null, reviewed_at = null where id = $1`, [dead.paymentId]) // put it back, to try
eq('on a cancelled order a customer may still not change the amount while rejecting', await attempt(BUYER,
  `update payments set verification_status = 'REJECTED', amount = 1 where id = '${dead.paymentId}'`), 'Customers can only submit receipt proof for their own payment')

done()
