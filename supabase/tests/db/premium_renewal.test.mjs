// Premium renewals (migration 175): paying before the membership ends continues it from the old end date, a month or
// a year after THAT date, on both ways a membership starts (a PhaJay payment and the admin's Approve button); and
// the "tell the member" details are handed out once per payment.
import { eq, done, ok } from './harness.mjs'
import { callerSql } from './fixtures.mjs'
import { createShopDb, member, premiumRequest, shopOrder } from './phajay-shop.mjs'

const db = await createShopDb()
const rows = async (sql, params = []) => (await db.query(sql, params)).rows
const one = async (sql, params = []) => (await rows(sql, params))[0]

let seq = 0
/** The membership a member already has: a paid plan that ends `endsIn` from now (a postgres interval), optionally cancelled. */
async function running(userId, { plan = 'premium-monthly', endsIn = '10 days', cancelled = false, status = 'ACTIVE' } = {}) {
  const planRow = await one(`select id from premium_plans where slug = $1`, [plan])
  return (await one(`insert into premium_subscriptions (user_id, plan_id, status, starts_at, ends_at, cancelled_at)
    values ($1, $2, $3, now() - interval '20 days', ${endsIn === null ? 'null' : `now() + interval '${endsIn}'`}, ${cancelled ? 'now()' : 'null'}) returning id, ends_at`, [userId, planRow.id, status]))
}
/** Pays the member's pending Premium request through PhaJay. */
async function payByQr(request, amount) {
  const transactionId = `tx-renew-${++seq}`
  await db.query(`insert into phajay_transactions (transaction_id, kind, subject_id, amount, qr_code) values ($1, 'premium', $2, $3, 'QR')`, [transactionId, request.paymentId, amount])
  const result = (await one(`select public.phajay_settle($1, $2) as r`, [transactionId, amount])).r.result
  return { transactionId, result }
}
const sub = (id) => one(`select status, starts_at, ends_at from premium_subscriptions where id = $1`, [id])
const activeRows = async (userId) => (await rows(`select id from premium_subscriptions where user_id = $1 and status = 'ACTIVE'`, [userId])).length
const same = async (sql, params) => (await one(sql, params)).ok

// ═══ A PhaJay payment ═════════════════════════════════════════════════════════════════════════════
const early = await member(db)
const old = await running(early)
const earlyRequest = await premiumRequest(db, early)
eq('paying while the membership is still running settles', (await payByQr(earlyRequest, 39000)).result, 'settled')
eq('the new period starts where the old one ends, not today', await same(`select s.starts_at = o.ends_at as ok from premium_subscriptions s, premium_subscriptions o where s.id = $1 and o.id = $2`, [earlyRequest.subscriptionId, old.id]), true)
eq('and lasts a month from THAT date', await same(`select s.ends_at = o.ends_at + interval '1 month' as ok from premium_subscriptions s, premium_subscriptions o where s.id = $1 and o.id = $2`, [earlyRequest.subscriptionId, old.id]), true)
eq('the old row is replaced, so exactly one membership is active', [(await sub(old.id)).status, await activeRows(early)], ['CANCELLED', 1])

const yearlyRenewal = await member(db)
const oldMonthly = await running(yearlyRenewal, { endsIn: '5 days' })
const yearlyRequest = await premiumRequest(db, yearlyRenewal, { plan: 'premium-yearly' })
await payByQr(yearlyRequest, 390000)
eq('a yearly plan paid early lasts a year from the old end date', await same(`select s.starts_at = o.ends_at and s.ends_at = o.ends_at + interval '1 year' as ok from premium_subscriptions s, premium_subscriptions o where s.id = $1 and o.id = $2`, [yearlyRequest.subscriptionId, oldMonthly.id]), true)

const chain = await member(db)
await running(chain, { endsIn: '4 days' })
const first = await premiumRequest(db, chain)
await payByQr(first, 39000)
const second = await premiumRequest(db, chain)
await payByQr(second, 39000)
eq('renewing again before the new end continues from that end: two months from the first end date', await same(`select s.starts_at = f.ends_at and s.ends_at = f.ends_at + interval '1 month' as ok from premium_subscriptions s, premium_subscriptions f where s.id = $1 and f.id = $2`, [second.subscriptionId, first.subscriptionId]), true)

const lapsed = await member(db)
await running(lapsed, { endsIn: null }).catch(() => {})
await db.query(`update premium_subscriptions set ends_at = now() - interval '3 days' where user_id = $1`, [lapsed])
const lapsedRequest = await premiumRequest(db, lapsed)
await payByQr(lapsedRequest, 39000)
eq('a membership that already ended is not extended: the new one starts now', await same(`select starts_at > now() - interval '1 minute' and starts_at <= now() and ends_at = starts_at + interval '1 month' as ok from premium_subscriptions where id = $1`, [lapsedRequest.subscriptionId]), true)

const free = await member(db)
const freePlan = await one(`select id from premium_plans where slug = 'free'`)
await db.query(`insert into premium_subscriptions (user_id, plan_id, status, starts_at) values ($1, $2, 'ACTIVE', now() - interval '40 days')`, [free, freePlan.id])
const freeRequest = await premiumRequest(db, free)
await payByQr(freeRequest, 39000)
eq('a Free membership has nothing to carry over: the paid one starts now', await same(`select starts_at > now() - interval '1 minute' and ends_at = starts_at + interval '1 month' as ok from premium_subscriptions where id = $1`, [freeRequest.subscriptionId]), true)

const cancelledButRunning = await member(db)
const cancelledOld = await running(cancelledButRunning, { endsIn: '7 days', cancelled: true })
const cancelledRequest = await premiumRequest(db, cancelledButRunning)
await payByQr(cancelledRequest, 39000)
eq('a cancelled membership whose paid time has not run out still counts', await same(`select s.starts_at = o.ends_at as ok from premium_subscriptions s, premium_subscriptions o where s.id = $1 and o.id = $2`, [cancelledRequest.subscriptionId, cancelledOld.id]), true)

const mine = await member(db)
const someoneElse = await member(db)
await running(someoneElse, { endsIn: '25 days' })
const mineRequest = await premiumRequest(db, mine)
await payByQr(mineRequest, 39000)
eq('another member\'s membership never moves mine', await same(`select starts_at > now() - interval '1 minute' as ok from premium_subscriptions where id = $1`, [mineRequest.subscriptionId]), true)

// ═══ The admin's Approve button ═══════════════════════════════════════════════════════════════════
const ADMIN = '00000000-0000-4000-8000-0000000000a0'
await db.query(`insert into users (id, name, role) values ($1, 'Admin', 'ADMIN')`, [ADMIN])
const approve = (subscriptionId) => db.exec(`begin; ${callerSql(ADMIN)} select public.review_premium_subscription_request('${subscriptionId}', true); commit;`)
/** A request whose receipt is waiting for the admin. */
const submitted = (userId, plan = 'premium-monthly') => premiumRequest(db, userId, { plan, status: 'PAYMENT_REVIEW', paymentStatus: 'REQUIRES_REVIEW' })
  .then(async (request) => { await db.query(`update premium_payments set receipt_image_url = 'r.jpg' where id = $1`, [request.paymentId]); return request })

const approved = await member(db)
const approvedOld = await running(approved, { endsIn: '12 days' })
const approvedRequest = await submitted(approved)
await approve(approvedRequest.subscriptionId)
eq('approving a renewal continues the running membership too', await same(`select s.starts_at = o.ends_at and s.ends_at = o.ends_at + interval '1 month' as ok from premium_subscriptions s, premium_subscriptions o where s.id = $1 and o.id = $2`, [approvedRequest.subscriptionId, approvedOld.id]), true)
eq('with the old row replaced and the payment verified', [(await sub(approvedOld.id)).status, (await sub(approvedRequest.subscriptionId)).status, (await one(`select status from premium_payments where id = $1`, [approvedRequest.paymentId])).status], ['CANCELLED', 'ACTIVE', 'VERIFIED'])

const firstTime = await member(db)
const firstTimeRequest = await submitted(firstTime, 'premium-yearly')
await approve(firstTimeRequest.subscriptionId)
eq('approving a first yearly plan starts now and lasts a year (it used to be 30 days)', await same(`select starts_at > now() - interval '1 minute' and ends_at = starts_at + interval '1 year' as ok from premium_subscriptions where id = $1`, [firstTimeRequest.subscriptionId]), true)

const freeApproved = await member(db)
await db.query(`insert into premium_subscriptions (user_id, plan_id, status) values ($1, $2, 'PENDING_APPROVAL')`, [freeApproved, freePlan.id])
const pendingFree = (await one(`select id from premium_subscriptions where user_id = $1`, [freeApproved])).id
await approve(pendingFree)
eq('approving the Free plan gives it no end date', (await sub(pendingFree)).ends_at, null)

// ═══ Telling the member, once ══════════════════════════════════════════════════════════════════════
const claim = async (transactionId) => (await one(`select public.phajay_claim_notification($1) as r`, [transactionId])).r
const notified = await member(db)
await db.query(`update users set email = 'noy@example.com', name = 'Noy', language = 'en' where id = $1`, [notified])
const notifiedOld = await running(notified, { endsIn: '6 days' })
const notifiedRequest = await premiumRequest(db, notified)
const waiting = `tx-claim-${++seq}`
await db.query(`insert into phajay_transactions (transaction_id, kind, subject_id, amount, qr_code) values ($1, 'premium', $2, 39000, 'QR')`, [waiting, notifiedRequest.paymentId])
eq('nothing is announced before the payment is applied', await claim(waiting), null)
await db.query(`select public.phajay_settle($1, 39000)`, [waiting])
const details = await claim(waiting)
eq('the first caller gets the receipt details', {
  ...details, paid_at: details.paid_at !== null, starts_at: details.starts_at !== null, ends_at: details.ends_at !== null, user_id: details.user_id === notified,
}, {
  transaction_id: waiting, user_id: true, email: 'noy@example.com', name: 'Noy', language: 'en', plan_name: 'Premium Monthly', plan_interval: 'month', amount: 39000,
  paid_at: true, starts_at: true, ends_at: true, extends_previous: true, receipt_no: `PRM-${notifiedRequest.paymentId.slice(0, 8).toUpperCase()}`,
})
eq('and they say the period continues the old one, ending a month after it', await same(`select $1::timestamptz = (select ends_at from premium_subscriptions where id = $3) + interval '1 month' and $2::timestamptz = (select ends_at from premium_subscriptions where id = $3) as ok`, [details.ends_at, details.starts_at, notifiedOld.id]), true)
eq('everyone after gets nothing', [await claim(waiting), await claim(waiting)], [null, null])
await db.query(`select public.phajay_release_notification($1)`, [waiting])
eq('until it is released because nothing could be sent, and then it can be claimed once more', [(await claim(waiting))?.transaction_id, await claim(waiting)], [waiting, null])

const noEmail = await member(db)
const noEmailRequest = await premiumRequest(db, noEmail)
const noEmailTx = (await payByQr(noEmailRequest, 39000)).transactionId
const noEmailDetails = await claim(noEmailTx)
eq('a member with no e-mail address still gets the details (push only), with no e-mail', [noEmailDetails.email, noEmailDetails.extends_previous, noEmailDetails.language], [null, false, 'lo'])

const shop = await shopOrder(db)
await db.query(`insert into phajay_transactions (transaction_id, kind, subject_id, amount, qr_code) values ('tx-shop-n', 'shop_order', $1, 45151, 'QR')`, [shop.paymentId])
await db.query(`select public.phajay_settle('tx-shop-n', 45151)`)
eq('only Premium payments are announced', await claim('tx-shop-n'), null)
eq('visitors cannot ask', await Promise.all(['anon', 'authenticated'].map(async (role) => (await one(`select has_function_privilege($1, 'public.phajay_claim_notification(text)', 'execute') as can`, [role])).can)), [false, false])

done()
