// The receipt e-mail and the congratulation push after a PhaJay payment starts or extends a Premium membership
// (supabase/functions/_shared/membership-notify.ts): what they say in Lao and English, that nothing a person typed
// can break the e-mail, and that nobody is told twice or left untold.
import { eq, done } from './harness.mjs'
import { loadFunctionModules } from './phajay-shop.mjs'

const { renderMembershipEmail, membershipActivatedMessage, notifyMembershipPaid, formatDay, formatMoment } = await loadFunctionModules(['_shared/membership-notify.ts'])

const SITE = 'https://bitdoin.store/'
const details = (extra = {}) => ({
  transaction_id: 'pj-8cc876b4', user_id: '00000000-0000-4000-8000-0000000000a1', email: 'noy@example.com', name: 'Noy', language: 'en',
  plan_name: 'Premium Monthly', plan_interval: 'month', amount: 39000, paid_at: '2026-11-03T07:25:00Z',
  starts_at: '2026-11-30T05:00:00Z', ends_at: '2026-12-30T05:00:00Z', extends_previous: true, receipt_no: 'PRM-1A2B3C4D', ...extra,
})

// ── Dates are shown in Laos time, as the app shows them ──
eq('English: "30 Nov 2026"; Lao: "30/11/2026", like the app', [formatDay('2026-11-30T05:00:00Z', 'en'), formatDay('2026-11-30T05:00:00Z', 'lo')], ['30 Nov 2026', '30/11/2026'])
eq('18:00 UTC is already the next day in Laos (UTC+7)', [formatDay('2026-11-30T18:00:00Z', 'en'), formatDay('2026-12-31T17:30:00Z', 'lo')], ['1 Dec 2026', '1/1/2027'])
eq('the time of payment is Laos time', [formatMoment('2026-11-03T07:25:00Z', 'en'), formatMoment('2026-11-03T07:25:00Z', 'lo')], ['3 Nov 2026, 14:25', '3/11/2026, 14:25'])

// ── The e-mail ──
const en = renderMembershipEmail(details(), SITE)
eq('English subject carries the receipt number', en.subject, 'Receipt PRM-1A2B3C4D: your Bitdoin Academy Premium is active')
const contains = (text, parts) => parts.map((part) => text.includes(part))
eq('the receipt has number, plan, period, amount, method, paid time and reference (HTML and plain text)',
  [en.html, en.text].map((body) => contains(body, ['PRM-1A2B3C4D', 'Premium Monthly', '30 Nov 2026', '30 Dec 2026', '39,000 LAK', 'BCEL One QR (PhaJay)', '3 Nov 2026, 14:25', 'pj-8cc876b4']).every(Boolean)), [true, true])
eq('an early renewal says the new period starts where the old one ends', contains(en.text, ['Thank you for renewing early', 'without a gap', 'starts on 30 Nov 2026 and runs until 30 Dec 2026']), [true, true, true])
const fresh = renderMembershipEmail(details({ extends_previous: false }), SITE)
eq('a first activation says it is active until the end date, with no renewal talk', [fresh.text.includes('is now active until 30 Dec 2026'), fresh.text.includes('renewing')], [true, false])
eq('the button goes to the Academy home, without a double slash', en.html.includes('href="https://bitdoin.store/academy/home"'), true)
eq('it greets by name', en.text.startsWith('Congratulations, Noy!'), true)
eq('and without one, still congratulates', renderMembershipEmail(details({ name: null }), SITE).text.startsWith('Congratulations!\n'), true)

const lo = renderMembershipEmail(details({ language: 'lo' }), SITE)
eq('Lao subject and receipt', [lo.subject.startsWith('ໃບຮັບເງິນ PRM-1A2B3C4D'), lo.html.includes('lang="lo"')], [true, true])
eq('Lao dates and money, in Laos time', contains(lo.text, ['30/11/2026', '30/12/2026', '39,000 ກີບ', '3/11/2026, 14:25', '(ເວລາລາວ)']), Array(5).fill(true))
eq('Lao renewal text mentions both dates', contains(lo.text, ['ຕໍ່ອາຍຸກ່ອນໝົດກຳນົດ', 'ເລີ່ມວັນທີ 30/11/2026', 'ຮອດ 30/12/2026']), [true, true, true])
eq('an unknown language falls back to Lao', renderMembershipEmail(details({ language: 'fr' }), SITE).subject.startsWith('ໃບຮັບເງິນ'), true)
eq('nothing prints "undefined" or "null", in either language', [en, lo, fresh].map((mail) => /undefined|null|NaN/.test(mail.html + mail.text)), [false, false, false])

const hostile = renderMembershipEmail(details({ name: '<img src=x onerror=alert(1)>', plan_name: 'A & B "plan"', transaction_id: '<b>x</b>' }), SITE)
eq('a name, plan or reference with markup cannot inject into the e-mail', [hostile.html.includes('<img'), hostile.html.includes('<b>x</b>'), hostile.html.includes('&lt;img src=x onerror=alert(1)&gt;'), hostile.html.includes('A &amp; B &quot;plan&quot;')], [false, false, true, true])

// ── The push ──
const push = membershipActivatedMessage('en', '2026-12-30T05:00:00Z', true)
eq('English renewal push', [push.title, push.body, push.url, push.tag], ['🎉 Congratulations! Premium is active', 'Your Bitdoin Academy membership now runs until 30 Dec 2026. Thank you for renewing!', '/academy/home', 'membership-activated'])
eq('English first activation push', membershipActivatedMessage('en', '2026-12-30T05:00:00Z', false).body, 'Your Bitdoin Academy membership runs until 30 Dec 2026. Enjoy learning!')
eq('Lao pushes carry the Lao date', [membershipActivatedMessage('lo', '2026-12-30T05:00:00Z', true).body, membershipActivatedMessage('lo', '2026-12-30T05:00:00Z', false).body.includes('30/12/2026')],
  ['ສະມາຊິກ Bitdoin Academy ຂອງທ່ານຕໍ່ອາຍຸຮອດ 30/12/2026 ແລ້ວ. ຂອບໃຈທີ່ຕໍ່ອາຍຸ!', true])
eq('an unknown language is Lao', membershipActivatedMessage('', '2026-12-30T05:00:00Z', false).title.includes('ຂໍສະແດງຄວາມຍິນດີ'), true)

// ── Who is told, and when a retry is allowed ──
function harness({ claimed = details(), emailFails = false, pushFails = false } = {}) {
  const calls = { claims: [], released: [], emails: [], pushes: [], logs: [] }
  const deps = {
    siteUrl: SITE, log: (line) => calls.logs.push(line),
    claim: async (id) => { calls.claims.push(id); return claimed },
    release: async (id) => { calls.released.push(id) },
    sendEmail: async (mail) => { calls.emails.push(mail); if (emailFails) throw new Error('Resend answered 500') },
    sendPush: async (d) => { calls.pushes.push(d); if (pushFails) throw new Error('send-push answered 500') },
  }
  return { deps, calls }
}
{
  const { deps, calls } = harness()
  eq('a claimed payment sends the e-mail (to the member, with receipt) and the push', [await notifyMembershipPaid(deps, 'pj-1'), calls.emails.length, calls.emails[0].to, calls.emails[0].subject.includes('PRM-1A2B3C4D'), calls.pushes.length, calls.released],
    [{ email: 'sent', push: 'sent' }, 1, 'noy@example.com', true, 1, []])
}
{
  const { deps, calls } = harness({ claimed: null })
  eq('nothing to announce (already announced, or not Premium): nothing is sent', [await notifyMembershipPaid(deps, 'pj-1'), calls.emails.length, calls.pushes.length], [null, 0, 0])
}
{
  const { deps, calls } = harness({ claimed: details({ email: null }) })
  eq('a member with no e-mail address gets the push only', [await notifyMembershipPaid(deps, 'pj-1'), calls.emails.length, calls.pushes.length], [{ email: 'skipped', push: 'sent' }, 0, 1])
}
{
  const { deps, calls } = harness({ emailFails: true })
  eq('if the e-mail fails but the push gets through, it is not retried (nobody is told twice)', [(await notifyMembershipPaid(deps, 'pj-1')).email, calls.released], ['failed', []])
}
{
  const { deps, calls } = harness({ pushFails: true })
  eq('if the push fails but the e-mail gets through, likewise', [(await notifyMembershipPaid(deps, 'pj-1')).push, calls.released], ['failed', []])
}
{
  const { deps, calls } = harness({ emailFails: true, pushFails: true })
  eq('if nothing at all got through, the claim is given back so a later check tries again', [await notifyMembershipPaid(deps, 'pj-1'), calls.released], [{ email: 'failed', push: 'failed' }, ['pj-1']])
}
{
  const { deps, calls } = harness({ claimed: details({ email: null }), pushFails: true })
  await notifyMembershipPaid(deps, 'pj-1')
  eq('with no e-mail and a failed push it is given back too', calls.released, ['pj-1'])
}
{
  const { deps, calls } = harness({ emailFails: true, pushFails: true })
  deps.release = async () => { throw new Error('database down') }
  eq('a failing release does not throw, and is logged', [await notifyMembershipPaid(deps, 'pj-1').then(() => 'ok'), calls.logs.some((line) => line.includes('could not release'))], ['ok', true])
}
{
  const { deps, calls } = harness({ emailFails: true })
  await notifyMembershipPaid(deps, 'pj-1')
  eq('logs never contain the member\'s e-mail address', calls.logs.some((line) => line.includes('noy@example.com')), false)
}

done()
