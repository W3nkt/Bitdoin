// After a PhaJay payment starts or extends an Academy Premium membership, tell the member: a receipt e-mail
// (renewal information and the receipt in one) and a congratulation push. No Deno APIs and no network here, so
// Node can test it; membership-notify-runtime.ts wires it to Resend, send-push and the database.
//
// The database hands the details out once per payment (phajay_claim_notification), whichever of the payment
// screen and PhaJay's webhook noticed the payment first. If nothing at all could be sent, the claim is given
// back so a later check tries again; if one of the two got through, it is not repeated, so nobody is told twice.

export interface MembershipDetails {
  transaction_id: string
  user_id: string
  email: string | null
  name: string | null
  language: string
  plan_name: string
  plan_interval: string
  /** Whole kip. */
  amount: number
  paid_at: string
  /** The period this payment bought. */
  starts_at: string
  ends_at: string
  /** The period begins when the running membership ends, not today. */
  extends_previous: boolean
  receipt_no: string
}

export interface MembershipEmail {
  to: string
  subject: string
  html: string
  text: string
}

export interface NotifyDeps {
  claim(transactionId: string): Promise<MembershipDetails | null>
  release(transactionId: string): Promise<void>
  sendEmail(email: MembershipEmail): Promise<void>
  sendPush(details: MembershipDetails): Promise<void>
  /** Where the buttons in the e-mail go, without a trailing slash. */
  siteUrl: string
  log?: (message: string) => void
}

export type Channel = 'sent' | 'skipped' | 'failed'

const LAOS_TIME_ZONE = 'Asia/Vientiane'

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] as string)

function laosParts(iso: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: LAOS_TIME_ZONE, day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date(iso)).map((part) => [part.type, part.value]),
  )
  return parts as Record<'day' | 'month' | 'year' | 'hour' | 'minute', string>
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** A date in Laos time: "3 Dec 2026" in English, "3/12/2026" in Lao, as the app shows it. */
export function formatDay(iso: string, language: string) {
  const { day, month, year } = laosParts(iso)
  return language === 'en' ? `${Number(day)} ${MONTHS[Number(month) - 1]} ${year}` : `${Number(day)}/${Number(month)}/${year}`
}

export function formatMoment(iso: string, language: string) {
  const { hour, minute } = laosParts(iso)
  return `${formatDay(iso, language)}, ${hour}:${minute}`
}

const formatKip = (amount: number, language: string) => `${Math.round(amount).toLocaleString('en-US')} ${language === 'en' ? 'LAK' : 'ກີບ'}`

const COPY = {
  en: {
    subject: (d: MembershipDetails) => `Receipt ${d.receipt_no}: your Bitdoin Academy Premium is active`,
    heading: (name: string | null) => (name ? `Congratulations, ${name}!` : 'Congratulations!'),
    renewed: (d: MembershipDetails, start: string, end: string) =>
      `Thank you for renewing early. Your ${d.plan_name} membership carries on without a gap: the new period starts on ${start} and runs until ${end}.`,
    activated: (d: MembershipDetails, _start: string, end: string) => `Thank you. Your ${d.plan_name} membership is now active until ${end}.`,
    receipt: 'Receipt',
    labels: { number: 'Receipt number', plan: 'Plan', period: 'Period', amount: 'Amount paid', method: 'Paid with', paid: 'Paid on', reference: 'Payment reference' },
    laosTime: '(Laos time)',
    open: 'Open Bitdoin Academy',
    footer: 'This e-mail is your receipt. Please keep it. Questions about this payment? Contact Bitdoin through the app or the website.',
  },
  lo: {
    subject: (d: MembershipDetails) => `ໃບຮັບເງິນ ${d.receipt_no}: ພຣີມຽມ Bitdoin Academy ຂອງທ່ານເປີດໃຊ້ງານແລ້ວ`,
    heading: (name: string | null) => (name ? `ຂໍສະແດງຄວາມຍິນດີ, ${name}!` : 'ຂໍສະແດງຄວາມຍິນດີ!'),
    renewed: (d: MembershipDetails, start: string, end: string) =>
      `ຂອບໃຈທີ່ຕໍ່ອາຍຸກ່ອນໝົດກຳນົດ. ສະມາຊິກ ${d.plan_name} ຂອງທ່ານຕໍ່ເນື່ອງບໍ່ຂາດຊ່ວງ: ໄລຍະໃໝ່ເລີ່ມວັນທີ ${start} ແລະ ໃຊ້ໄດ້ຮອດ ${end}.`,
    activated: (d: MembershipDetails, _start: string, end: string) => `ຂອບໃຈ. ສະມາຊິກ ${d.plan_name} ຂອງທ່ານເປີດໃຊ້ງານແລ້ວ ແລະ ໃຊ້ໄດ້ຮອດ ${end}.`,
    receipt: 'ໃບຮັບເງິນ',
    labels: { number: 'ເລກທີໃບຮັບເງິນ', plan: 'ແຜນ', period: 'ໄລຍະເວລາ', amount: 'ຈຳນວນເງິນທີ່ຊຳລະ', method: 'ຊຳລະດ້ວຍ', paid: 'ວັນເວລາຊຳລະ', reference: 'ເລກອ້າງອີງການຊຳລະ' },
    laosTime: '(ເວລາລາວ)',
    open: 'ເປີດ Bitdoin Academy',
    footer: 'ອີເມວນີ້ແມ່ນໃບຮັບເງິນຂອງທ່ານ. ກະລຸນາເກັບໄວ້. ມີຄຳຖາມກ່ຽວກັບການຊຳລະນີ້ ຕິດຕໍ່ Bitdoin ຜ່ານແອັບ ຫຼື ເວັບໄຊ.',
  },
} as const

/** The congratulation push: same shape as the messages send-push builds (title, body, link, tag). */
export function membershipActivatedMessage(language: string, endsAt: string, extendsPrevious: boolean) {
  const lo = language !== 'en'
  const date = formatDay(endsAt, lo ? 'lo' : 'en')
  return {
    title: lo ? '🎉 ຂໍສະແດງຄວາມຍິນດີ! ພຣີມຽມເປີດໃຊ້ງານແລ້ວ' : '🎉 Congratulations! Premium is active',
    body: extendsPrevious
      ? (lo ? `ສະມາຊິກ Bitdoin Academy ຂອງທ່ານຕໍ່ອາຍຸຮອດ ${date} ແລ້ວ. ຂອບໃຈທີ່ຕໍ່ອາຍຸ!` : `Your Bitdoin Academy membership now runs until ${date}. Thank you for renewing!`)
      : (lo ? `ສະມາຊິກ Bitdoin Academy ຂອງທ່ານໃຊ້ໄດ້ຮອດ ${date}. ຂໍໃຫ້ມ່ວນກັບການຮຽນ!` : `Your Bitdoin Academy membership runs until ${date}. Enjoy learning!`),
    url: '/academy/home',
    tag: 'membership-activated',
  }
}

/** The receipt e-mail, in the member's language. Everything that came from a person or the database is escaped. */
export function renderMembershipEmail(details: MembershipDetails, siteUrl: string): Omit<MembershipEmail, 'to'> {
  const language = details.language === 'en' ? 'en' : 'lo'
  const copy = COPY[language]
  const start = formatDay(details.starts_at, language)
  const end = formatDay(details.ends_at, language)
  const intro = (details.extends_previous ? copy.renewed : copy.activated)(details, start, end)
  const name = details.name?.trim() || null
  const link = `${siteUrl.replace(/\/+$/, '')}/academy/home`

  const lines: [string, string][] = [
    [copy.labels.number, details.receipt_no],
    [copy.labels.plan, details.plan_name],
    [copy.labels.period, `${start} – ${end}`],
    [copy.labels.amount, formatKip(details.amount, language)],
    [copy.labels.method, 'BCEL One QR (PhaJay)'],
    [copy.labels.paid, `${formatMoment(details.paid_at, language)} ${copy.laosTime}`],
    [copy.labels.reference, details.transaction_id],
  ]

  const rowsHtml = lines.map(([label, value]) =>
    `<tr><td style="padding:8px 0;color:#6b7280;font-size:13px;vertical-align:top;width:42%">${escapeHtml(label)}</td><td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;word-break:break-word">${escapeHtml(value)}</td></tr>`).join('')

  const html = `<!doctype html><html lang="${language}"><body style="margin:0;background:#f3f4f6;font-family:Arial,'Noto Sans Lao',sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#b45309;color:#ffffff;padding:24px;text-align:center"><div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:.85">Bitdoin Academy</div><div style="font-size:24px;font-weight:700;margin-top:6px">${escapeHtml(copy.heading(name))}</div></td></tr>
<tr><td style="padding:24px"><p style="margin:0 0 18px;color:#374151;font-size:15px;line-height:1.6">${escapeHtml(intro)}</p>
<div style="border:1px solid #e5e7eb;border-radius:12px;padding:6px 16px"><div style="padding:10px 0 2px;color:#b45309;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase">${escapeHtml(copy.receipt)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowsHtml}</table></div>
<p style="margin:22px 0;text-align:center"><a href="${escapeHtml(link)}" style="display:inline-block;background:#b45309;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 28px;border-radius:12px">${escapeHtml(copy.open)}</a></p>
<p style="margin:0;color:#6b7280;font-size:12px;line-height:1.6">${escapeHtml(copy.footer)}</p></td></tr>
</table></td></tr></table></body></html>`

  const text = [copy.heading(name), '', intro, '', copy.receipt.toUpperCase(), ...lines.map(([label, value]) => `${label}: ${value}`), '', `${copy.open}: ${link}`, '', copy.footer].join('\n')

  return { subject: copy.subject(details), html, text }
}

/**
 * Tells the member their payment started or extended the membership. Returns null when there was nothing to
 * announce (not a Premium payment, or already announced). Never throws for a failed channel.
 */
export async function notifyMembershipPaid(deps: NotifyDeps, transactionId: string) {
  const log = deps.log ?? (() => {})
  const details = await deps.claim(transactionId)
  if (!details) return null

  const outcome: { email: Channel; push: Channel } = { email: 'skipped', push: 'skipped' }
  const jobs: Promise<void>[] = []

  if (details.email) {
    jobs.push(
      Promise.resolve()
        .then(() => deps.sendEmail({ to: details.email as string, ...renderMembershipEmail(details, deps.siteUrl) }))
        .then(() => { outcome.email = 'sent' })
        .catch((error) => { outcome.email = 'failed'; log(`receipt e-mail failed: ${error instanceof Error ? error.message : String(error)}`) }),
    )
  }
  jobs.push(
    Promise.resolve()
      .then(() => deps.sendPush(details))
      .then(() => { outcome.push = 'sent' })
      .catch((error) => { outcome.push = 'failed'; log(`congratulation push failed: ${error instanceof Error ? error.message : String(error)}`) }),
  )
  await Promise.all(jobs)

  // Nothing got through: give the claim back so a later check tries again. If one channel worked, it is done.
  const attempted = [outcome.email, outcome.push].filter((channel) => channel !== 'skipped')
  if (attempted.length > 0 && attempted.every((channel) => channel === 'failed')) {
    await deps.release(transactionId).catch((error) => log(`could not release the notification: ${error instanceof Error ? error.message : String(error)}`))
  }
  log(`membership ${transactionId}: e-mail ${outcome.email}, push ${outcome.push}`)
  return outcome
}
