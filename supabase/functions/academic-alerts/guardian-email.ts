// Guardian e-mails (NOTIF-002, migration 161): the double opt-in confirmation
// and the monthly report. Report wording is the owner-approved text of the
// report page (src/lib/academic/guardianCopy.ts). Without "include scores" the
// e-mail has no score values: subject names, counts of subjects recorded and
// the family's next steps only.

export interface GuardianEmail {
  id: string
  kind: 'guardian_confirm' | 'guardian_report'
  recipient: string
  language: string
  payload: Record<string, unknown>
  unsubscribe_token: string
}

type Lang = 'lo' | 'en'
type Named = { name_en: string; name_lo: string }

const TEXT = {
  confirmSubject: { en: 'Confirm monthly reports by e-mail', lo: 'ຢືນຢັນການຮັບລາຍງານປະຈຳເດືອນທາງອີເມວ' },
  hello: { en: 'Hello {name},', lo: 'ສະບາຍດີ {name},' },
  confirmBody: { en: 'You asked to get the monthly reports about your child by e-mail.', lo: 'ທ່ານໄດ້ຂໍຮັບລາຍງານປະຈຳເດືອນກ່ຽວກັບລູກຂອງທ່ານທາງອີເມວ.' },
  confirmAction: { en: 'Tap the button to confirm. The link works for 48 hours.', lo: 'ກົດປຸ່ມເພື່ອຢືນຢັນ. ລິ້ງນີ້ໃຊ້ໄດ້ 48 ຊົ່ວໂມງ.' },
  confirm: { en: 'Confirm', lo: 'ຢືນຢັນ' },
  notYou: { en: 'If you did not ask for this, ignore this e-mail. Nothing more will be sent.', lo: 'ຖ້າທ່ານບໍ່ໄດ້ຂໍ, ບໍ່ຕ້ອງສົນໃຈອີເມວນີ້. ຈະບໍ່ມີການສົ່ງຫຍັງອີກ.' },
  reportTitle: { en: '{name}: {month} report', lo: 'ລາຍງານເດືອນ{month}: {name}' },
  recorded: { en: 'Subjects recorded', lo: 'ວິຊາທີ່ບັນທຶກ' },
  recordedCount: { en: '{recorded} of {active} subjects', lo: '{recorded} ຈາກ {active} ວິຊາ' },
  changes: { en: 'Score changes', lo: 'ການປ່ຽນແປງຂອງຄະແນນ' },
  same: { en: 'about the same', lo: 'ປະມານເທົ່າເກົ່າ' },
  stronger: { en: 'Going well', lo: 'ເຮັດໄດ້ດີ' },
  attention: { en: 'Needs attention', lo: 'ຕ້ອງການຄວາມເອົາໃຈໃສ່' },
  nextSteps: { en: 'Next steps for the family', lo: 'ຂັ້ນຕໍ່ໄປສຳລັບຄອບຄົວ' },
  open: { en: 'Open the full report', lo: 'ເປີດລາຍງານເຕັມ' },
  noScores: { en: 'Scores are not included in e-mails. You can change this on the Family page.', lo: 'ອີເມວບໍ່ລວມຄະແນນ. ທ່ານປ່ຽນໄດ້ຢູ່ໜ້າຄອບຄົວ.' },
  footer: {
    en: 'Scores are entered by the student from their score book unless marked otherwise. One month’s change is not a trend. Questions? Use “Report a problem” in Bitdoin.',
    lo: 'ຄະແນນແມ່ນນັກຮຽນປ້ອນເອງຈາກປຶ້ມຄະແນນ ເວັ້ນເສຍແຕ່ມີໝາຍບອກ. ການປ່ຽນແປງຂອງເດືອນດຽວ ບໍ່ແມ່ນແນວໂນ້ມ. ມີຄຳຖາມ? ໃຊ້ “ລາຍງານບັນຫາ” ໃນ Bitdoin.',
  },
  why: { en: 'You get this e-mail because you turned on monthly reports by e-mail.', lo: 'ທ່ານໄດ້ຮັບອີເມວນີ້ ເພາະທ່ານເປີດຮັບລາຍງານປະຈຳເດືອນທາງອີເມວ.' },
  unsubscribe: { en: 'Unsubscribe', lo: 'ຍົກເລີກການຮັບ' },
  suggest: {
    ask_hardest: { en: 'Ask what felt hardest in {subject} this month, and listen first.', lo: 'ຖາມວ່າເດືອນນີ້ ວິຊາ{subject} ມີຫຍັງທີ່ຍາກທີ່ສຸດ, ແລະ ຟັງກ່ອນ.' },
    notice_progress: { en: 'Notice the effort behind the progress in {subject}.', lo: 'ສັງເກດຄວາມພະຍາຍາມທີ່ເຮັດໃຫ້ວິຊາ{subject} ດີຂຶ້ນ.' },
    check_in: { en: 'Ask how this month felt, without focusing on the numbers.', lo: 'ຖາມວ່າເດືອນນີ້ເປັນແນວໃດ, ໂດຍບໍ່ເນັ້ນໃສ່ຕົວເລກ.' },
    start_together: { en: 'Offer to sit together while they enter this month’s scores.', lo: 'ສະເໜີນັ່ງນຳ ໃນເວລາເຂົາປ້ອນຄະແນນເດືອນນີ້.' },
    ask_support: { en: 'Ask what kind of help they would like from you.', lo: 'ຖາມວ່າເຂົາຢາກໃຫ້ທ່ານຊ່ວຍແບບໃດ.' },
  } as Record<string, { en: string; lo: string }>,
}

const esc = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function fill(template: string, values: Record<string, unknown> = {}) {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ''))
}

const num = (value: unknown) => (typeof value === 'number' ? String(Math.round(value * 100) / 100) : '—')

function page(lang: Lang, body: string, footer: string) {
  return `<!doctype html><html lang="${lang}"><body style="margin:0;background:#f8fafc;font-family:'Noto Sans Lao',system-ui,sans-serif;color:#0f172a;line-height:1.6">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">
<div style="background:#ffffff;border-radius:16px;padding:24px;border:1px solid #e2e8f0">${body}</div>
<div style="padding:16px 4px;color:#475569;font-size:13px">${footer}</div>
</div></body></html>`
}

const button = (href: string, label: string) =>
  `<p style="margin:20px 0"><a href="${esc(href)}" style="display:inline-block;background:#1e3a5f;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:12px">${esc(label)}</a></p>`

export function unsubscribePageUrl(site: string, token: string) {
  return `${site}/academy/family/email?unsubscribe=${encodeURIComponent(token)}`
}

export function renderGuardianEmail(mail: GuardianEmail): { subject: string; html: string } {
  const lang: Lang = mail.language === 'en' ? 'en' : 'lo'
  const t = (entry: { en: string; lo: string }, values?: Record<string, unknown>) => fill(entry[lang], values)
  const p = mail.payload
  const site = String(p.site_url ?? 'https://bitdoin.store').replace(/\/+$/, '')
  const unsubscribe = unsubscribePageUrl(site, mail.unsubscribe_token)

  if (mail.kind === 'guardian_confirm') {
    const body = `<p style="margin:0 0 12px">${esc(t(TEXT.hello, { name: p.name }))}</p>
<p style="margin:0 0 12px">${esc(t(TEXT.confirmBody))}</p>
<p style="margin:0">${esc(t(TEXT.confirmAction))}</p>
${button(`${site}/academy/family/email?confirm=${encodeURIComponent(String(p.token ?? ''))}`, t(TEXT.confirm))}
<p style="margin:0;color:#475569;font-size:14px">${esc(t(TEXT.notYou))}</p>`
    return { subject: t(TEXT.confirmSubject), html: page(lang, body, '') }
  }

  const name = (item: Named) => (lang === 'lo' ? item.name_lo : item.name_en)
  const period = (p.period ?? {}) as { label_en?: string; label_lo?: string }
  const month = lang === 'lo' ? period.label_lo : period.label_en
  const recorded = (p.recorded ?? {}) as { recorded?: number; active?: number }
  const stronger = (p.stronger ?? []) as Named[]
  const attention = (p.needs_attention ?? []) as Named[]
  const steps = (p.next_steps ?? []) as { kind: string; subject_en?: string; subject_lo?: string }[]
  const changes = p.include_scores ? (p.changes as { subjects?: (Named & { latest: number | null; previous: number | null; direction: string | null })[] } | null) : null
  const section = (title: string, inner: string) => `<h3 style="margin:20px 0 6px;font-size:16px">${esc(title)}</h3>${inner}`
  const list = (items: string[]) => `<ul style="margin:0;padding-left:20px">${items.map(item => `<li>${esc(item)}</li>`).join('')}</ul>`

  const body = [
    `<h2 style="margin:0 0 8px;font-size:20px">${esc(t(TEXT.reportTitle, { name: p.student_name, month }))}</h2>`,
    section(t(TEXT.recorded), `<p style="margin:0">${esc(t(TEXT.recordedCount, { recorded: recorded.recorded ?? 0, active: recorded.active ?? 0 }))}</p>`),
    changes?.subjects?.length
      ? section(t(TEXT.changes), list(changes.subjects.map(s => `${name(s)}: ${s.previous !== null ? `${num(s.previous)} → ` : ''}${num(s.latest)}${s.direction === 'same' ? ` (${t(TEXT.same)})` : ''}`)))
      : '',
    stronger.length ? section(t(TEXT.stronger), list(stronger.map(name))) : '',
    attention.length ? section(t(TEXT.attention), list(attention.map(name))) : '',
    steps.length ? section(t(TEXT.nextSteps), list(steps.filter(s => TEXT.suggest[s.kind]).map(s => t(TEXT.suggest[s.kind], { subject: lang === 'lo' ? s.subject_lo : s.subject_en })))) : '',
    button(`${site}/academy/family/${encodeURIComponent(String(p.link_id ?? ''))}/reports/${encodeURIComponent(String(p.report_id ?? ''))}`, t(TEXT.open)),
    p.include_scores ? '' : `<p style="margin:0;color:#475569;font-size:14px">${esc(t(TEXT.noScores))}</p>`,
  ].join('\n')
  const footer = `<p style="margin:0 0 8px">${esc(t(TEXT.footer))}</p>
<p style="margin:0">${esc(t(TEXT.why))} <a href="${esc(unsubscribe)}" style="color:#475569">${esc(t(TEXT.unsubscribe))}</a></p>`
  return { subject: t(TEXT.reportTitle, { name: p.student_name, month }), html: page(lang, body, footer) }
}
