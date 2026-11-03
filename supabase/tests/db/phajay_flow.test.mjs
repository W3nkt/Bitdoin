// PhaJay payments end to end, minus the network: the Edge Function code (supabase/functions/_shared/
// phajay*.ts) runs in Node against the REAL SQL (migration 172, on PGlite) and a fake PhaJay.
// What must never go wrong: a QR for the wrong amount, a second QR for one payment, a payment applied by
// anything but a confirmed payment for a QR this shop made, or applied twice. Covers a shop order, an
// Academy Premium plan and the career report.
import { createHmac } from 'node:crypto'
import { eq, done } from './harness.mjs'
import { PHONE, createShopDb, loadFunctionModules, member, pgRpc, premiumRequest, reportPurchase, shopOrder } from './phajay-shop.mjs'

const { PhajayError, chargeAmount, fetchTransaction, generateQr, parseWebhook, qrDescription, webhookSignatureValid, FlowError, createPhajayFlow, phajayDb } =
  await loadFunctionModules(['_shared/phajay.ts', '_shared/phajay-flow.ts', '_shared/phajay-db.ts'])

const KEY = '$2a$10$not-a-real-production-key-0123456789abcdefghijklmnopq'
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

// ── The provider client, against a fake PhaJay ────────────────────────────────────────────────────
/** Answers like PhaJay and keeps every request. states: transactionId -> what the status API says. */
function fakePhajay() {
  const phajay = { requests: [], states: {}, generated: 0, generateDelay: 0, generateAnswer: null }
  phajay.fetcher = async (url, init = {}) => {
    phajay.requests.push({ url, ...init })
    if (url.endsWith('/generate-bcel-qr')) {
      if (phajay.generateDelay) await new Promise((resolve) => setTimeout(resolve, phajay.generateDelay))
      if (phajay.generateAnswer) return phajay.generateAnswer()
      const id = `pj-${++phajay.generated}`
      phajay.states[id] = { status: 'WAITING', isPaid: false, amount: JSON.parse(init.body).amount, paymentTime: null }
      return json({ message: 'SUCCESSFULLY', transactionId: id, qrCode: `0002010211${id}`, link: `onepay://qr/${id}` })
    }
    const id = decodeURIComponent(url.split('/').pop())
    return phajay.states[id] ? json({ message: 'SUCCESSFULLY', data: { transactionId: id, ...phajay.states[id] } }) : json({ message: 'PAYMENT_NOT_FOUND' }, 404)
  }
  return phajay
}

{
  const phajay = fakePhajay()
  const config = { apiKey: KEY, baseUrl: 'https://phajay.test/v1/api/payment', fetcher: phajay.fetcher }

  const qr = await generateQr(config, { reference: 'BD-7K3M', amount: 45151 })
  const sent = phajay.requests[0]
  const body = JSON.parse(sent.body)
  eq('the QR comes back with its id and the BCEL One link', qr, { transactionId: 'pj-1', qrCode: '0002010211pj-1', link: 'onepay://qr/pj-1' })
  eq('the key goes in the secretKey header, to the BCEL endpoint', [sent.url, sent.method, sent.headers.secretKey], ['https://phajay.test/v1/api/payment/generate-bcel-qr', 'POST', KEY])
  eq('the whole kip amount and the reference are sent', [body.amount, body.tag1, body.description], [45151, 'BD-7K3M', 'Bitdoin BD-7K3M'])
  eq('every QR gets its own orderNo, even for the same reference', [body.orderNo.startsWith('BD-7K3M-'), body.orderNo === JSON.parse((await generateQr(config, { reference: 'BD-7K3M', amount: 1 }) && phajay.requests[1].body)).orderNo], [true, false])
  eq('a normal reference reads "Bitdoin BD-7K3M"', qrDescription('BD-7K3M'), 'Bitdoin BD-7K3M')
  eq('BCEL gets plain ASCII of at most 24 characters (APB wants under 25), whatever the reference holds',
    ['BD-7K3M', 'PRM-1A2B3C4D', 'ບີດີ-1', 'ບີດີ', "BD-7K3M'; drop", 'BD-7K3M-and-a-very-long-suffix'].map((code) => /^[\x20-\x7e]{1,24}$/.test(qrDescription(code))), Array(6).fill(true))
  eq('a reference with nothing usable in it still gets a description', qrDescription('ບີດີ'), 'Bitdoin payment')

  eq('amounts are the total rounded to whole kip, like the price shown to the customer', [chargeAmount(45150.5), chargeAmount(45150.4), chargeAmount(1)], [45151, 45150, 1])
  eq('a total that is not a payable amount is refused', [0, 0.4, -5, NaN].map((n) => { try { chargeAmount(n); return 'ok' } catch { return 'refused' } }), Array(4).fill('refused'))

  phajay.states['pj-1'] = { status: 'PAYMENT_COMPLETED', isPaid: true, amount: 45151, paymentTime: '2026-11-04T03:00:00.000Z' }
  const paid = await fetchTransaction(config, 'pj-1')
  eq('a paid transaction is read as paid', paid, { status: 'PAYMENT_COMPLETED', isPaid: true, amount: 45151, paidAt: '2026-11-04T03:00:00.000Z' })
  eq('status is asked with Basic auth of the bare key (the secretKey header gets a 401 there)',
    phajay.requests.at(-1).headers.Authorization, `Basic ${Buffer.from(KEY).toString('base64')}`)
  phajay.states['pj-2'] = { status: 'PAYMENT_COMPLETED', isPaid: false, amount: 5, paymentTime: null }
  phajay.states['pj-3'] = { status: 'WAITING', isPaid: true, amount: 5, paymentTime: null }
  eq('paid means BOTH isPaid and PAYMENT_COMPLETED, as the docs insist', [(await fetchTransaction(config, 'pj-2')).isPaid, (await fetchTransaction(config, 'pj-3')).isPaid], [false, false])
  eq('a transaction PhaJay does not know is null', await fetchTransaction(config, 'nope'), null)

  const failing = (status, answer = { message: 'nope' }) => ({ ...config, fetcher: async () => json(answer, status) })
  const kindOf = async (action) => { try { await action(); return 'no error' } catch (error) { return error instanceof PhajayError ? error.kind : 'other' } }
  eq('PhaJay refusing a request is "rejected"; its outages and rate limits are "unavailable"', [
    await kindOf(() => generateQr(failing(400), { reference: 'BD-1', amount: 5 })),
    await kindOf(() => generateQr(failing(401), { reference: 'BD-1', amount: 5 })),
    await kindOf(() => generateQr(failing(429), { reference: 'BD-1', amount: 5 })),
    await kindOf(() => generateQr(failing(503), { reference: 'BD-1', amount: 5 })),
    await kindOf(() => fetchTransaction(failing(500), 'x')),
  ], ['rejected', 'rejected', 'unavailable', 'unavailable', 'unavailable'])
  eq('a QR answer without a usable QR is "unavailable"', await kindOf(() => generateQr(failing(200, { message: 'SUCCESSFULLY' }), { reference: 'BD-1', amount: 5 })), 'unavailable')
  eq('a network failure is "unavailable"', await kindOf(() => generateQr({ ...config, fetcher: async () => { throw new Error('boom') } }, { reference: 'BD-1', amount: 5 })), 'unavailable')
  eq('the key never appears in an error message', await (async () => { try { await generateQr(failing(400, { message: `bad ${KEY}` }), { reference: 'BD-1', amount: 5 }) } catch (error) { return error.message.includes('bad') } })(), true)
}

// ── Webhook signatures ─────────────────────────────────────────────────────────────────────────────
const sign = (raw, secret = KEY) => createHmac('sha256', secret).update(raw).digest('base64')
{
  const raw = JSON.stringify({ transactionId: 'pj-1', status: 'PAYMENT_COMPLETED', txnAmount: 45151, tag1: 'BD-7K3M' })
  eq('a body signed with the secret key is accepted', await webhookSignatureValid(raw, sign(raw), [KEY]), true)
  eq('stray spaces around the header do not matter', await webhookSignatureValid(raw, ` ${sign(raw)} `, [KEY]), true)
  eq('another key, a changed body, a missing or empty header are all refused', [
    await webhookSignatureValid(raw, sign(raw, 'other-key'), [KEY]),
    await webhookSignatureValid(raw.replace('45151', '1'), sign(raw), [KEY]),
    await webhookSignatureValid(raw, null, [KEY]),
    await webhookSignatureValid(raw, '', [KEY]),
    await webhookSignatureValid(raw, sign(raw), []),
    await webhookSignatureValid(raw, sign(raw, ''), ['']),
  ], Array(6).fill(false))
  eq('during a key switch either secret is good', [await webhookSignatureValid(raw, sign(raw, 'old'), ['old', KEY]), await webhookSignatureValid(raw, sign(raw), ['old', KEY])], [true, true])

  eq('the three guaranteed fields are read, the amount may arrive as text', [parseWebhook(raw), parseWebhook('{"transactionId":"a","status":"PAYMENT_COMPLETED","txnAmount":"500"}')],
    [{ transactionId: 'pj-1', status: 'PAYMENT_COMPLETED', amount: 45151 }, { transactionId: 'a', status: 'PAYMENT_COMPLETED', amount: 500 }])
  eq('anything else is not an event', ['', 'nope', '[]', '{}', '{"transactionId":"a","status":"X"}', '{"transactionId":"","status":"X","txnAmount":1}', '{"transactionId":"a","status":"X","txnAmount":"abc"}'].map(parseWebhook), Array(7).fill(null))
}

// ── The whole flow, real SQL ───────────────────────────────────────────────────────────────────────
const db = await createShopDb()
const phajay = fakePhajay()
const logs = []
// Every payment the flow found applied, as the e-mail and push step is told.
const announced = []
const providerConfig = { apiKey: KEY, baseUrl: 'https://phajay.test/v1/api/payment', fetcher: phajay.fetcher }
const flow = createPhajayFlow({
  db: phajayDb({ rpc: pgRpc(db) }),
  provider: { generateQr: (input) => generateQr(providerConfig, input), fetchTransaction: (id) => fetchTransaction(providerConfig, id) },
  webhookSecrets: [KEY],
  afterPaid: (transactionId) => { announced.push(transactionId) },
  log: (message) => logs.push(message),
})
const generates = () => phajay.requests.filter((r) => r.url.endsWith('/generate-bcel-qr')).length
const rows = async (sql, params = []) => (await db.query(sql, params)).rows
const count = async (sql, params = []) => (await rows(sql, params))[0].n
const errorOf = async (action) => { try { await action(); return 'no error' } catch (error) { return error instanceof FlowError ? error.code : `unexpected: ${error.message}` } }
const forOrder = (o, phone = PHONE) => ({ kind: 'shop_order', orderNumber: o.orderNumber, phone })
const qrsFor = (kind, subjectId) => rows(`select status from phajay_transactions where kind = $1 and subject_id = $2 order by created_at`, [kind, subjectId])

// Shop orders
const state = async (orderId) => (await rows(`select o.status, o.payment_status as order_payment, p.verification_status as payment, p.transaction_reference as reference
  from orders o join payments p on p.order_id = o.id where o.id = $1`, [orderId]))[0]
const UNPAID = { status: 'PENDING_PAYMENT', order_payment: 'PENDING', payment: 'PENDING', reference: null }

const order = await shopOrder(db)
eq('before any QR, nothing is waiting', await flow.check(forOrder(order)), { state: 'none' })
const first = await flow.start(forOrder(order))
eq('the QR is for the order total rounded to whole kip, with the BCEL One link', first, { state: 'waiting', transactionId: 'pj-1', qrCode: '0002010211pj-1', link: 'onepay://qr/pj-1', amount: 45151 })
eq('and is kept against the payment', await qrsFor('shop_order', order.paymentId), [{ status: 'WAITING' }])
eq('opening the screen again (reload, or the tracking page) shows the same QR and makes no new one', [await flow.start(forOrder(order)), generates()], [first, 1])
eq('while it waits, the order stays unpaid', [await flow.check(forOrder(order)), await state(order.orderId)], [{ state: 'waiting' }, UNPAID])

phajay.states['pj-1'] = { status: 'PAYMENT_COMPLETED', isPaid: true, amount: 45151, paymentTime: '2026-11-04T03:00:00.000Z' }
eq('the customer pays: the next check marks the order paid', await flow.check(forOrder(order)), { state: 'paid' })
eq('the order is in processing and the payment verified with PhaJay\'s reference', await state(order.orderId), { status: 'PROCESSING', order_payment: 'VERIFIED', payment: 'VERIFIED', reference: 'pj-1' })
const callsAfterPaid = phajay.requests.length
eq('asking again, or reopening the screen, answers paid without asking PhaJay', [await flow.check(forOrder(order)), await flow.start(forOrder(order)), phajay.requests.length], [{ state: 'paid' }, { state: 'paid' }, callsAfterPaid])
eq('the payment was audited once', await count(`select count(*)::int as n from audit_logs where action = 'PAYMENT_VERIFIED'`), 1)

const other = await shopOrder(db)
eq('the wrong phone number gets "not found", as does an unknown order', [
  await errorOf(() => flow.start(forOrder(other, '020 9999 9999'))), await errorOf(() => flow.check(forOrder(other, '020 9999 9999'))),
  await errorOf(() => flow.start({ kind: 'shop_order', orderNumber: 'BD-ZZZZ', phone: PHONE })),
], ['ORDER_NOT_FOUND', 'ORDER_NOT_FOUND', 'ORDER_NOT_FOUND'])
eq('a bank transfer order, a cancelled order and a dollar order get no QR', [
  await errorOf(async () => flow.start(forOrder(await shopOrder(db, { method: 'BANK_TRANSFER' })))),
  await errorOf(async () => flow.start(forOrder(await shopOrder(db, { status: 'CANCELLED' })))),
  await errorOf(async () => flow.start(forOrder(await shopOrder(db, { currency: 'USD', total: 12 })))),
], ['NOT_PAYABLE', 'NOT_PAYABLE', 'CURRENCY_NOT_SUPPORTED'])
eq('an order paid by hand just reports paid', await flow.start(forOrder(await shopOrder(db, { status: 'PROCESSING', paymentStatus: 'VERIFIED' }))), { state: 'paid' })
eq('no QR was made for any of those', generates(), 1)

// A QR that is not paid in time.
const slow = await shopOrder(db, { total: 80000 })
const slowQr = await flow.start(forOrder(slow))
phajay.states[slowQr.transactionId].status = 'EXPIRED'
eq('PhaJay says the QR expired: the check says so', await flow.check(forOrder(slow)), { state: 'expired' })
const slowNext = await flow.start(forOrder(slow))
eq('and the screen then gets a fresh QR for the same amount', [slowNext.transactionId !== slowQr.transactionId, slowNext.amount], [true, 80000])
eq('only one of them is live', await qrsFor('shop_order', slow.paymentId), [{ status: 'EXPIRED' }, { status: 'WAITING' }])
delete phajay.states[slowNext.transactionId]
eq('a QR PhaJay no longer knows counts as expired too', await flow.check(forOrder(slow)), { state: 'expired' })

// The customer paid but closed the screen, and the webhook was missed: opening the order again settles it.
const missed = await shopOrder(db, { total: 30000 })
const missedQr = await flow.start(forOrder(missed))
phajay.states[missedQr.transactionId] = { status: 'PAYMENT_COMPLETED', isPaid: true, amount: 30000, paymentTime: null }
eq('reopening an order that was paid while away settles it at once', [await flow.start(forOrder(missed)), (await state(missed.orderId)).payment], [{ state: 'paid' }, 'VERIFIED'])

// Two screens at once.
const raced = await shopOrder(db, { total: 12000 })
phajay.generateDelay = 20
const [r1, r2] = await Promise.all([flow.start(forOrder(raced)), flow.start(forOrder(raced))])
phajay.generateDelay = 0
eq('two payment screens opened together end up showing one QR', [r1.transactionId === r2.transactionId, (await qrsFor('shop_order', raced.paymentId)).length], [true, 1])

// PhaJay down or refusing: nothing is recorded, and the error says which.
const down = await shopOrder(db, { total: 9000 })
phajay.generateAnswer = () => json({ message: 'Service Unavailable' }, 503)
eq('PhaJay being down is PROVIDER_UNAVAILABLE', await errorOf(() => flow.start(forOrder(down))), 'PROVIDER_UNAVAILABLE')
phajay.generateAnswer = () => json({ message: 'Amount exceeds limit' }, 400)
eq('PhaJay refusing the amount is PROVIDER_REJECTED', await errorOf(() => flow.start(forOrder(down))), 'PROVIDER_REJECTED')
phajay.generateAnswer = null
eq('and no QR was stored; after it recovers the same order gets its QR', [(await qrsFor('shop_order', down.paymentId)).length, (await flow.start(forOrder(down))).state], [0, 'waiting'])

// PhaJay says paid, but not the amount we asked for: money in, order untouched, flagged for a person.
const off = await shopOrder(db, { total: 50000 })
const offQr = await flow.start(forOrder(off))
phajay.states[offQr.transactionId] = { status: 'PAYMENT_COMPLETED', isPaid: true, amount: 49999, paymentTime: null }
const flags = () => count(`select count(*)::int as n from audit_logs where action = 'PHAJAY_PAYMENT_UNAPPLIED'`)
eq('a payment for a different amount is reported as needing review', await flow.check(forOrder(off)), { state: 'review' })
eq('the order stays unpaid and is flagged', [await state(off.orderId), await flags()], [UNPAID, 1])
eq('asking again does not flag it again', [await flow.check(forOrder(off)), await flags()], [{ state: 'review' }, 1])

// ── Academy Premium ────────────────────────────────────────────────────────────────────────────────
const learner = await member(db)
const request = await premiumRequest(db, learner)
const premium = { kind: 'premium', userId: learner }
const planState = async () => (await rows(`select status from premium_subscriptions where id = $1`, [request.subscriptionId]))[0].status
eq('a member with no Premium request has nothing to pay', await errorOf(async () => flow.start({ kind: 'premium', userId: await member(db) })), 'ORDER_NOT_FOUND')
const premiumQr = await flow.start(premium)
eq('the Premium QR is for the plan price, with a Premium reference', [premiumQr.state, premiumQr.amount], ['waiting', 39000])
eq('and the description BCEL shows says what it is for', JSON.parse(phajay.requests.filter((r) => r.url.endsWith('/generate-bcel-qr')).at(-1).body).description, `Bitdoin PRM-${request.paymentId.slice(0, 8).toUpperCase()}`)
eq('reopening the plans page shows the same QR', (await flow.start(premium)).transactionId, premiumQr.transactionId)
eq('before it is paid the request stays pending', [await flow.check(premium), await planState()], [{ state: 'waiting' }, 'PENDING_PAYMENT'])
phajay.states[premiumQr.transactionId] = { status: 'PAYMENT_COMPLETED', isPaid: true, amount: 39000, paymentTime: null }
eq('once paid, the membership starts at once', [await flow.check(premium), await planState()], [{ state: 'paid' }, 'ACTIVE'])
eq('another member cannot see or pay it: they have their own request or none', await errorOf(async () => flow.check({ kind: 'premium', userId: await member(db) })), 'ORDER_NOT_FOUND')
eq('an active membership has nothing more to pay', await flow.start(premium), { state: 'paid' })

const webhookMember = await member(db)
const webhookRequest = await premiumRequest(db, webhookMember, { plan: 'premium-yearly' })
const webhookQr = await flow.start({ kind: 'premium', userId: webhookMember })
eq('a yearly plan is charged the yearly price', webhookQr.amount, 390000)
const premiumEvent = JSON.stringify({ transactionId: webhookQr.transactionId, status: 'PAYMENT_COMPLETED', txnAmount: 390000, paymentMethod: 'BCEL' })
eq('the webhook starts the membership even if the member closed the page',
  [(await flow.webhook(premiumEvent, sign(premiumEvent))).body.result, (await rows(`select status from premium_subscriptions where id = $1`, [webhookRequest.subscriptionId]))[0].status], ['settled', 'ACTIVE'])

const stranger = await member(db)
await premiumRequest(db, stranger, { status: 'CANCELLED' })
eq('a withdrawn Premium request cannot be paid', await errorOf(() => flow.start({ kind: 'premium', userId: stranger })), 'NOT_PAYABLE')

// ── Career report ──────────────────────────────────────────────────────────────────────────────────
const buyer = await member(db)
const purchase = await reportPurchase(db, buyer)
const report = { kind: 'career_report', userId: buyer }
const reportQr = await flow.start(report)
eq('the report QR is for the report price', [reportQr.state, reportQr.amount], ['waiting', 49000])
phajay.states[reportQr.transactionId] = { status: 'PAYMENT_COMPLETED', isPaid: true, amount: 49000, paymentTime: null }
eq('once paid, the buyer holds the report', [await flow.check(report), await count(`select count(*)::int as n from academic_entitlement_grants where user_id = $1 and feature_code = 'career_report'`, [buyer])], [{ state: 'paid' }, 1])
eq('and the purchase is verified', (await rows(`select status from academic_report_purchases where id = $1`, [purchase]))[0].status, 'verified')
eq('paying the same purchase again is just "paid", with no second grant', [await flow.start(report), await count(`select count(*)::int as n from academic_entitlement_grants where user_id = $1`, [buyer])], [{ state: 'paid' }, 1])

// ── The webhook ────────────────────────────────────────────────────────────────────────────────────
const hooked = await shopOrder(db, { total: 70000 })
const hookedQr = await flow.start(forOrder(hooked))
const event = (extra = {}) => JSON.stringify({ transactionId: hookedQr.transactionId, status: 'PAYMENT_COMPLETED', txnAmount: 70000, paymentMethod: 'BCEL', ...extra })
const hook = (raw, signature = sign(raw)) => flow.webhook(raw, signature)

eq('a webhook with a wrong signature is refused and changes nothing', [await hook(event(), 'AAAA'), await hook(event(), null), (await state(hooked.orderId)).payment], [
  { status: 401, body: { error: 'Invalid signature' } }, { status: 401, body: { error: 'Invalid signature' } }, 'PENDING'])
eq('a signed body that is not an event is a 400', (await hook('{"hello":1}')).status, 400)
eq('a signed event that is not a completed payment is ignored', [await hook(event({ status: 'EXPIRED' })), (await state(hooked.orderId)).payment], [{ status: 200, body: { ok: true, ignored: 'EXPIRED' } }, 'PENDING'])
eq('a signed event for a different amount is not applied', [await hook(event({ txnAmount: 1 })), (await state(hooked.orderId)).payment], [{ status: 200, body: { ok: true, result: 'amount_mismatch' } }, 'PENDING'])

const hookedOk = await shopOrder(db, { total: 70000 })
const okQr = await flow.start(forOrder(hookedOk))
const okEvent = JSON.stringify({ transactionId: okQr.transactionId, status: 'PAYMENT_COMPLETED', txnAmount: 70000, paymentMethod: 'BCEL' })
eq('a signed completed payment marks the order paid', [await hook(okEvent), await state(hookedOk.orderId)], [
  { status: 200, body: { ok: true, result: 'settled' } }, { status: 'PROCESSING', order_payment: 'VERIFIED', payment: 'VERIFIED', reference: okQr.transactionId }])
eq('PhaJay sending it again changes nothing', [await hook(okEvent), await count(`select count(*)::int as n from audit_logs where action = 'PAYMENT_VERIFIED' and entity_id = $1`, [hookedOk.paymentId])],
  [{ status: 200, body: { ok: true, result: 'already_settled' } }, 1])
eq('and the open payment screen then sees paid, without asking PhaJay', await flow.check(forOrder(hookedOk)), { state: 'paid' })
eq('a signed payment for a transaction this shop never made is acknowledged but applied to nothing',
  await hook(JSON.stringify({ transactionId: 'someone-elses', status: 'PAYMENT_COMPLETED', txnAmount: 70000 })), { status: 200, body: { ok: true, result: 'unknown_transaction' } })

// ── Telling the member: only for payments that were really applied ──
eq('every payment that was applied was announced, whichever way it was noticed', [first.transactionId, missedQr.transactionId, premiumQr.transactionId, webhookQr.transactionId, reportQr.transactionId, okQr.transactionId].map((id) => announced.includes(id)), Array(6).fill(true))
eq('a payment that needs a person (wrong amount) is not announced', announced.includes(offQr.transactionId), false)
eq('nor a transaction this shop never made, nor an unsigned or ignored event', [announced.includes('someone-elses'), announced.includes(hookedQr.transactionId)], [false, false])
eq('PhaJay sending the same event again asks again (the database makes sure nobody is told twice)', announced.filter((id) => id === okQr.transactionId).length >= 2, true)

const flowThatCannotAnnounce = createPhajayFlow({
  db: phajayDb({ rpc: pgRpc(db) }),
  provider: { generateQr: (input) => generateQr(providerConfig, input), fetchTransaction: (id) => fetchTransaction(providerConfig, id) },
  afterPaid: () => { throw new Error('e-mail provider down') },
  log: (message) => logs.push(message),
})
const brittle = await shopOrder(db, { total: 21000 })
const brittleQr = await flowThatCannotAnnounce.start(forOrder(brittle))
phajay.states[brittleQr.transactionId] = { status: 'PAYMENT_COMPLETED', isPaid: true, amount: 21000, paymentTime: null }
eq('a failing announcement never fails the payment: the order is still paid', [await flowThatCannotAnnounce.check(forOrder(brittle)), (await state(brittle.orderId)).payment], [{ state: 'paid' }, 'VERIFIED'])
eq('and the failure is logged without the payment details', logs.some((line) => line.includes('after-paid step failed: e-mail provider down')), true)

eq('nothing secret was logged', logs.some((line) => line.includes(KEY) || line.includes('$2a$')), false)

done()
