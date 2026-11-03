// PhaJay QR payments (migration 172): who may pay what, and applying a confirmed payment exactly once,
// only for the transaction and amount we asked for, the way the admin's own Verify / Approve does it.
// Covers the three kinds: a shop order, an Academy Premium plan and the career report.
// Server-only, like the Edge Functions that call it.
import { ok, fails, eq, done } from './harness.mjs'
import { createShopDb, member, premiumRequest, reportPurchase, shopOrder as makeOrder } from './phajay-shop.mjs'

const db = await createShopDb()
const rows = async (sql, params = []) => (await db.query(sql, params)).rows
const one = async (sql, params = []) => (await rows(sql, params))[0]
const count = async (sql, params = []) => (await one(sql, params)).n

let qrSeq = 0
/** A QR we made for a payment. Returns its transaction id. */
async function makeQr(kind, subjectId, amount, status = 'WAITING') {
  const transactionId = `tx-${++qrSeq}`
  await db.query(`insert into phajay_transactions (transaction_id, kind, subject_id, amount, qr_code, status) values ($1, $2, $3, $4, 'QRDATA', $5)`,
    [transactionId, kind, subjectId, amount, status])
  return transactionId
}
const settle = async (transactionId, amount, paidAt = null) => (await one(`select public.phajay_settle($1, $2, $3) as r`, [transactionId, amount, paidAt])).r
const audits = (action) => count(`select count(*)::int as n from audit_logs where action = $1`, [action])

// ═══ Shop orders ═══════════════════════════════════════════════════════════════════════════════════
/** An order with its payment and (optionally) a QR for it. */
async function shopOrder({ total = 45150.5, qr = 'WAITING', ...rest } = {}) {
  const order = await makeOrder(db, { total, ...rest })
  return { ...order, transactionId: qr ? await makeQr('shop_order', order.paymentId, Math.round(total), qr) : null }
}
const resolveOrder = async (number, phone) => (await one(`select public.phajay_resolve_order($1, $2) as r`, [number, phone])).r
const orderState = (id) => one(`select o.status, o.payment_status as order_payment, p.verification_status as payment,
  p.transaction_reference as reference, p.bank_name as bank from orders o join payments p on p.order_id = o.id where o.id = $1`, [id])

const stateOf = async (pending) => (await resolveOrder((await pending).orderNumber, '020 5555 1234')).state
const a = await shopOrder({ qr: null })
eq('the order number and phone it was placed with find the order, with a whole-kip amount',
  await resolveOrder(a.orderNumber, '02055551234'), { kind: 'shop_order', subject_id: a.paymentId, label: a.orderNumber, amount: 45151, currency: 'LAK', state: 'payable' })
eq('spaces, dashes and lower case do not matter', (await resolveOrder(`  ${a.orderNumber.toLowerCase()} `, '020-5555-1234')).subject_id, a.paymentId)
eq('another phone, an unknown order, a short or empty phone all find nothing',
  [await resolveOrder(a.orderNumber, '020 9999 9999'), await resolveOrder('BD-ZZZZ', '020 5555 1234'), await resolveOrder(a.orderNumber, '0205'), await resolveOrder(a.orderNumber, '')], Array(4).fill(null))
eq('a bank transfer order, a cancelled order and a refunded payment are closed to QR payment', await Promise.all([
  makeOrder(db, { method: 'BANK_TRANSFER' }), makeOrder(db, { status: 'CANCELLED' }), makeOrder(db, { paymentStatus: 'REFUNDED' }),
].map(stateOf)), ['closed', 'closed', 'closed'])
eq('a dollar order is reported as such, and a paid one as paid', await Promise.all([
  makeOrder(db, { currency: 'USD', total: 12 }), makeOrder(db, { status: 'PROCESSING', paymentStatus: 'VERIFIED' }),
].map(stateOf)), ['unsupported_currency', 'paid'])

const ok1 = await shopOrder()
eq('a confirmed payment for the amount we asked for (the total rounded to a whole kip) settles', await settle(ok1.transactionId, 45151, '2026-11-04T03:00:00Z'), { result: 'settled', subject_id: ok1.paymentId })
eq('the order is in processing and the payment verified with PhaJay as the reference',
  await orderState(ok1.orderId), { status: 'PROCESSING', order_payment: 'VERIFIED', payment: 'VERIFIED', reference: ok1.transactionId, bank: 'BCEL' })
eq('the transaction records when it was paid and settled',
  await one(`select status, paid_at is not null as paid, settled_at is not null as settled, note from phajay_transactions where transaction_id = $1`, [ok1.transactionId]),
  { status: 'PAYMENT_COMPLETED', paid: true, settled: true, note: null })
eq('the payment is audited once, as the admin button would', await audits('PAYMENT_VERIFIED'), 1)
eq('a second confirmation (webhook retry, or the page polling) changes nothing and is not audited again',
  [await settle(ok1.transactionId, 45151), await audits('PAYMENT_VERIFIED')], [{ result: 'already_settled', subject_id: ok1.paymentId }, 1])
eq('a transaction we never created is not applied', await settle('tx-unknown', 45151), { result: 'unknown_transaction' })

const wrong = await shopOrder({ total: 80000 })
eq('PhaJay reporting a different amount is not applied, and the order stays unpaid',
  [await settle(wrong.transactionId, 79999), await orderState(wrong.orderId)],
  [{ result: 'amount_mismatch', subject_id: wrong.paymentId }, { status: 'PENDING_PAYMENT', order_payment: 'PENDING', payment: 'PENDING', reference: null, bank: null }])
eq('it is flagged for a person, once, however often PhaJay retries',
  [await audits('PHAJAY_PAYMENT_UNAPPLIED'), (await settle(wrong.transactionId, 80000)).result, await audits('PHAJAY_PAYMENT_UNAPPLIED')], [1, 'amount_mismatch', 1])

const cancelled = await shopOrder({ status: 'CANCELLED' })
eq('a payment for a cancelled order is flagged, not applied; the order stays cancelled',
  [await settle(cancelled.transactionId, 45151), (await orderState(cancelled.orderId)).status], [{ result: 'order_not_payable', subject_id: cancelled.paymentId }, 'CANCELLED'])
const manual = await shopOrder({ status: 'PROCESSING', paymentStatus: 'VERIFIED' })
eq('a payment for an order already verified by hand is flagged, and the manual verification is untouched',
  [(await settle(manual.transactionId, 45151)).result, await orderState(manual.orderId)], ['order_not_payable', { status: 'PROCESSING', order_payment: 'PENDING', payment: 'VERIFIED', reference: null, bank: null }])
const review = await shopOrder({ status: 'PAYMENT_REVIEW', paymentStatus: 'REQUIRES_REVIEW' })
eq('a customer who uploaded a receipt and then paid the QR is settled', (await settle(review.transactionId, 45151)).result, 'settled')
const rejected = await shopOrder({ status: 'PAYMENT_REVIEW', paymentStatus: 'REJECTED' })
await db.query(`update payments set rejection_reason = 'blurry' where id = $1`, [rejected.paymentId])
eq('and one whose receipt was rejected is settled, with the old rejection reason cleared',
  [(await settle(rejected.transactionId, 45151)).result, (await one(`select rejection_reason from payments where id = $1`, [rejected.paymentId])).rejection_reason], ['settled', null])
const moved = await shopOrder()
await db.query(`update orders set total_amount = 50000 where id = $1`, [moved.orderId])
eq('an order whose total changed after the QR was made is flagged, not applied', (await settle(moved.transactionId, 45151)).result, 'order_changed')
const usd = await shopOrder({ currency: 'USD', total: 12 })
eq('a QR can never settle an order that is not in kip', (await settle(usd.transactionId, 12)).result, 'order_changed')

// ═══ Academy Premium ═══════════════════════════════════════════════════════════════════════════════
const resolveMember = async (fn, userId) => (await one(`select public.${fn}($1) as r`, [userId])).r
const subscription = (id) => one(`select status, starts_at is not null as started, ends_at, cancelled_at, rejection_reason from premium_subscriptions where id = $1`, [id])
const premiumPayment = (id) => one(`select status, reference, notes, reviewed_at is not null as reviewed from premium_payments where id = $1`, [id])
const days = async (subscriptionId) => Math.round(Number((await one(`select extract(epoch from (ends_at - starts_at)) / 86400 as d from premium_subscriptions where id = $1`, [subscriptionId])).d))

const alice = await member(db)
eq('a member with no Premium request has nothing to pay', await resolveMember('phajay_resolve_premium', alice), null)
const monthly = await premiumRequest(db, alice)
eq('their pending Premium request is payable, for the plan price, with a short reference',
  await resolveMember('phajay_resolve_premium', alice),
  { kind: 'premium', subject_id: monthly.paymentId, label: `PRM-${monthly.paymentId.slice(0, 8).toUpperCase()}`, amount: 39000, currency: 'LAK', state: 'payable' })
eq('a request waiting for a receipt review is still payable by QR',
  (await resolveMember('phajay_resolve_premium', await (async () => { const m = await member(db); await premiumRequest(db, m, { status: 'PAYMENT_REVIEW', paymentStatus: 'REQUIRES_REVIEW' }); return m })())).state, 'payable')
eq('a withdrawn request, and one that is already active, are not payable (active = paid)', await Promise.all([
  premiumRequest(db, await member(db), { status: 'CANCELLED' }).then(async (r) => (await one(`select user_id from premium_payments where id = $1`, [r.paymentId])).user_id),
  premiumRequest(db, await member(db), { status: 'ACTIVE', paymentStatus: 'VERIFIED' }).then(async (r) => (await one(`select user_id from premium_payments where id = $1`, [r.paymentId])).user_id),
].map(async (p) => (await resolveMember('phajay_resolve_premium', await p)).state)), ['closed', 'paid'])

// A leftover active Free plan and an abandoned request must be superseded, like the admin's approval does.
const freePlan = (await one(`select id from premium_plans where slug = 'free'`)).id
const oldFree = (await one(`insert into premium_subscriptions (user_id, plan_id, status) values ($1, $2, 'ACTIVE') returning id`, [alice, freePlan])).id
const premiumTx = await makeQr('premium', monthly.paymentId, 39000)
eq('a confirmed payment of the plan price starts the membership', await settle(premiumTx, 39000), { result: 'settled', subject_id: monthly.paymentId })
eq('the membership is active, started now, for 30 days on a monthly plan', [(await subscription(monthly.subscriptionId)).status, (await subscription(monthly.subscriptionId)).started, await days(monthly.subscriptionId)], ['ACTIVE', true, 30])
eq('the payment is verified with PhaJay as the reference', await premiumPayment(monthly.paymentId), { status: 'VERIFIED', reference: premiumTx, notes: 'Paid by BCEL One QR through PhaJay', reviewed: true })
eq('the leftover Free plan is superseded, exactly as the admin approval does', (await subscription(oldFree)).status, 'CANCELLED')
eq('the member joins the activity group, with no approving admin', await one(`select subscription_id = $1 as current, is_active, approved_by_user_id from premium_activity_members where user_id = $2`, [monthly.subscriptionId, alice]),
  { current: true, is_active: true, approved_by_user_id: null })
eq('it is audited once, and repeating it changes nothing', [await settle(premiumTx, 39000), await count(`select count(*)::int as n from audit_logs where entity = 'premium_payment' and action = 'PAYMENT_VERIFIED'`)], [{ result: 'already_settled', subject_id: monthly.paymentId }, 1])

const bob = await member(db)
const yearly = await premiumRequest(db, bob, { plan: 'premium-yearly' })
await settle(await makeQr('premium', yearly.paymentId, 390000), 390000)
eq('a yearly plan lasts a year (the admin button gives 30 days even for these)', await days(yearly.subscriptionId), 365)

const carol = await member(db)
const carolReq = await premiumRequest(db, carol, { status: 'PAYMENT_REVIEW', paymentStatus: 'REQUIRES_REVIEW' })
eq('a member who had uploaded a receipt and then paid the QR is activated', (await settle(await makeQr('premium', carolReq.paymentId, 39000), 39000)).result, 'settled')

const dan = await member(db)
const danReq = await premiumRequest(db, dan)
const danTx = await makeQr('premium', danReq.paymentId, 39000)
await db.query(`update premium_subscriptions set status = 'CANCELLED' where id = $1`, [danReq.subscriptionId])
eq('a payment after the member withdrew the request is flagged, and nothing is activated',
  [(await settle(danTx, 39000)).result, (await subscription(danReq.subscriptionId)).status, (await premiumPayment(danReq.paymentId)).status], ['order_not_payable', 'CANCELLED', 'PENDING'])
const erin = await member(db)
const erinReq = await premiumRequest(db, erin)
eq('a different amount from PhaJay is flagged, and the request stays pending',
  [(await settle(await makeQr('premium', erinReq.paymentId, 39000), 38999)).result, (await subscription(erinReq.subscriptionId)).status], ['amount_mismatch', 'PENDING_PAYMENT'])
const finn = await member(db)
const finnReq = await premiumRequest(db, finn, { amount: 35000 })
const finnTx = await makeQr('premium', finnReq.paymentId, 39000)
eq('a QR made for another amount than the request holds is flagged', (await settle(finnTx, 39000)).result, 'order_changed')

// ═══ Career report ═════════════════════════════════════════════════════════════════════════════════
const grace = await member(db)
eq('a buyer with no purchase has nothing to pay', await resolveMember('phajay_resolve_report', grace), null)
const purchase = await reportPurchase(db, grace)
eq('their open purchase is payable', await resolveMember('phajay_resolve_report', grace),
  { kind: 'career_report', subject_id: purchase, label: `RPT-${purchase.slice(0, 8).toUpperCase()}`, amount: 49000, currency: 'LAK', state: 'payable' })
const reportTx = await makeQr('career_report', purchase, 49000)
eq('a confirmed payment grants the report', await settle(reportTx, 49000), { result: 'settled', subject_id: purchase })
eq('the purchase is verified with PhaJay as the reference', await one(`select status, reference, reviewed_by from academic_report_purchases where id = $1`, [purchase]),
  { status: 'verified', reference: reportTx, reviewed_by: null })
eq('and the buyer holds career_report for 12 months, as the setting says',
  await one(`select feature_code, source, reference, amount_lak, round(extract(epoch from (ends_at - starts_at)) / 86400 / 30.4)::int as months from academic_entitlement_grants where user_id = $1`, [grace]),
  { feature_code: 'career_report', source: 'one_time_purchase', reference: reportTx, amount_lak: 49000, months: 12 })
eq('the grant is linked to the purchase', (await one(`select p.grant_id = g.id as linked from academic_report_purchases p, academic_entitlement_grants g where p.id = $1 and g.user_id = $2`, [purchase, grace])).linked, true)
eq('repeating it changes nothing: still one grant', [(await settle(reportTx, 49000)).result, await count(`select count(*)::int as n from academic_entitlement_grants where user_id = $1`, [grace])], ['already_settled', 1])
eq('a paid purchase reads as paid', (await resolveMember('phajay_resolve_report', grace)).state, 'paid')

const heidi = await member(db)
const heidiPurchase = await reportPurchase(db, heidi, { status: 'review' })
eq('a purchase whose receipt is under review can still be paid by QR', (await resolveMember('phajay_resolve_report', heidi)).state, 'payable')
const ivan = await member(db)
const ivanPurchase = await reportPurchase(db, ivan)
const ivanTx = await makeQr('career_report', ivanPurchase, 49000)
await db.query(`update academic_report_purchases set status = 'cancelled' where id = $1`, [ivanPurchase])
eq('a payment after the purchase was cancelled is flagged and grants nothing',
  [(await settle(ivanTx, 49000)).result, await count(`select count(*)::int as n from academic_entitlement_grants where user_id = $1`, [ivan])], ['order_not_payable', 0])
eq('a wrong amount grants nothing', [(await settle(await makeQr('career_report', heidiPurchase, 49000), 48000)).result, await count(`select count(*)::int as n from academic_entitlement_grants where user_id = $1`, [heidi])], ['amount_mismatch', 0])

// ═══ QR codes, one live per payment ═════════════════════════════════════════════════════════════════
const latest = async (kind, subjectId) => (await one(`select public.phajay_latest_transaction($1, $2) as r`, [kind, subjectId])).r
const record = async (kind, subjectId, id, amount = 45151) =>
  (await one(`select public.phajay_record_qr($1, $2, $3, $4, 'QRDATA', 'onepay://qr/x') as r`, [kind, subjectId, id, amount])).r
const qrOrder = await shopOrder({ qr: null })
eq('a payment with no QR has no latest transaction', await latest('shop_order', qrOrder.paymentId), null)
eq('a new QR is kept', await record('shop_order', qrOrder.paymentId, 'tx-q1'), true)
eq('and read back with what the screen needs', await latest('shop_order', qrOrder.paymentId),
  { transaction_id: 'tx-q1', amount: 45151, qr_code: 'QRDATA', link: 'onepay://qr/x', status: 'WAITING', settled_at: null, note: null })
eq('a second live QR for the same payment is refused, not an error (two screens raced), and the first stays',
  [await record('shop_order', qrOrder.paymentId, 'tx-q2'), (await latest('shop_order', qrOrder.paymentId)).transaction_id], [false, 'tx-q1'])
eq('the same id under another kind is a different payment', await record('premium', qrOrder.paymentId, 'tx-q3'), true)
await db.query(`select public.phajay_set_status('tx-q1', 'EXPIRED')`)
eq('an expired QR is recorded as such, and then a new one can be made',
  [(await latest('shop_order', qrOrder.paymentId)).status, await record('shop_order', qrOrder.paymentId, 'tx-q4')], ['EXPIRED', true])
await settle('tx-q4', 45151)
await db.query(`select public.phajay_set_status('tx-q4', 'EXPIRED')`)
eq('a confirmed payment is never overwritten by a late "expired"', (await latest('shop_order', qrOrder.paymentId)).status, 'PAYMENT_COMPLETED')
await fails(db, 'a QR in a currency other than LAK', `insert into phajay_transactions (transaction_id, kind, subject_id, amount, currency, qr_code, status)
  values ('tx-usd', 'shop_order', '${qrOrder.paymentId}', 5, 'USD', 'QR', 'EXPIRED')`, 'check|currency')
await fails(db, 'a QR of an unknown kind', `insert into phajay_transactions (transaction_id, kind, subject_id, amount, qr_code, status)
  values ('tx-kind', 'gift', '${qrOrder.paymentId}', 5, 'QR', 'EXPIRED')`, 'check|kind')

// ═══ Access ════════════════════════════════════════════════════════════════════════════════════════
eq('customers and visitors cannot touch the table; the service role can', await rows(`
  select r.rolname, has_table_privilege(r.rolname, 'public.phajay_transactions', 'select') as can_read,
         has_table_privilege(r.rolname, 'public.phajay_transactions', 'insert') as can_write
  from pg_roles r where r.rolname in ('anon', 'authenticated', 'service_role') order by 1`),
  [{ rolname: 'anon', can_read: false, can_write: false }, { rolname: 'authenticated', can_read: false, can_write: false }, { rolname: 'service_role', can_read: true, can_write: true }])
eq('row level security is on as well', (await one(`select relrowsecurity from pg_class where oid = 'public.phajay_transactions'::regclass`)).relrowsecurity, true)

const CALLABLE = [
  'phajay_resolve_order(text, text)', 'phajay_resolve_premium(uuid)', 'phajay_resolve_report(uuid)', 'phajay_latest_transaction(text, uuid)',
  'phajay_record_qr(text, uuid, text, numeric, text, text)', 'phajay_set_status(text, text)', 'phajay_settle(text, numeric, timestamptz)',
]
const INTERNAL = ['phajay_apply_order(phajay_transactions, timestamptz)', 'phajay_apply_premium(phajay_transactions, timestamptz)', 'phajay_apply_report(phajay_transactions, timestamptz)']
const mayRun = (role, fns) => Promise.all(fns.map(async (fn) => (await one(`select has_function_privilege($1, $2, 'execute') as can`, [role, `public.${fn}`])).can))
eq('only the service role may run the entry points', await Promise.all(['anon', 'authenticated', 'service_role'].map(async (role) => ({ role, can: await mayRun(role, CALLABLE) }))),
  [{ role: 'anon', can: CALLABLE.map(() => false) }, { role: 'authenticated', can: CALLABLE.map(() => false) }, { role: 'service_role', can: CALLABLE.map(() => true) }])
eq('and nobody but the owner may run the appliers directly', await Promise.all(['anon', 'authenticated', 'service_role'].map(async (role) => ({ role, can: await mayRun(role, INTERNAL) }))),
  [{ role: 'anon', can: INTERNAL.map(() => false) }, { role: 'authenticated', can: INTERNAL.map(() => false) }, { role: 'service_role', can: INTERNAL.map(() => false) }])

done()
