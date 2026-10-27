import { useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, FileText, Printer, Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import { useAcademicCopy, type AcademicCopyKey } from '@/lib/academic/copy'
import {
  useCancelReportPurchase, useCareerReport, useCareerReports, useGenerateCareerReport, usePaymentAccounts, useReportPurchase, useStartReportPurchase, useSubmitReportReceipt,
  type CareerReportContent,
} from '@/lib/academic/api'
import { formatDate } from '@/lib/academic/format'
import { academicErrorText } from './errorText'

// Career report (CAREER-006) and its one-time purchase (BILLING-004). The
// report is included in Academy Premium; otherwise it is bought once
// (QR or bank transfer, receipt checked by Finance) and lasts 12 months. A
// guardian's purchase covers every child linked to them.

const card = 'rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-slate-800 sm:p-6'
const RECEIPT_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const kip = (value: number) => value.toLocaleString('en')

/** Buy the report once: payment accounts, receipt upload, review state. */
export function ReportPurchase({ forGuardian = false }: { forGuardian?: boolean }) {
  const { t, language } = useAcademicCopy()
  const toast = useToast()
  const { profile } = useAuth()
  const view = useReportPurchase()
  const accounts = usePaymentAccounts()
  const start = useStartReportPurchase()
  const cancel = useCancelReportPurchase()
  const submit = useSubmitReportReceipt()
  const file = useRef<HTMLInputElement>(null)
  const onError = (error: unknown) => toast.error(academicErrorText(t, error))
  if (!view.data) return null
  const { price, entitled, purchase } = view.data

  if (entitled) {
    return purchase?.status === 'verified' && purchase.valid_until
      ? <p className="mt-2 text-sm">{t('careers.report.validUntil', { date: formatDate(purchase.valid_until, language) })}{forGuardian ? ` ${t('careers.report.guardianNote')}` : ''}</p>
      : null
  }
  const open = purchase && (purchase.status === 'pending' || purchase.status === 'review') ? purchase : null
  return (
    <div className="mt-3">
      <p className="text-sm">{t('careers.report.included', { price: kip(price.price_lak), months: price.months })}{forGuardian ? ` ${t('careers.report.guardianNote')}` : ''}</p>
      {purchase?.status === 'rejected' && <p className="mt-2 text-sm text-amber-900 dark:text-amber-200">{t('careers.report.rejected', { reason: purchase.rejection_reason ?? '' })}</p>}
      {!open ? (
        <Button className="mt-3" size="sm" variant="outline" loading={start.isPending} onClick={() => start.mutate(undefined, { onError })}>
          {purchase?.status === 'rejected' ? t('careers.report.tryAgain') : t('careers.report.buy', { price: kip(price.price_lak) })}
        </Button>
      ) : open.status === 'review' ? (
        <div className="mt-3 rounded-2xl bg-indigo-50 p-4 text-sm dark:bg-indigo-500/10">
          <p role="status">{t('careers.report.review')}</p>
          <Button className="mt-2" size="sm" variant="ghost" loading={cancel.isPending} onClick={() => cancel.mutate(open.id, { onError })}>{t('careers.report.cancel')}</Button>
        </div>
      ) : (
        <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm dark:bg-gray-800/60">
          <p>{t('careers.report.pay', { price: kip(open.amount_lak) })}</p>
          <ul className="mt-2 grid gap-2">
            {(accounts.data ?? []).map(account => (
              <li key={account.id} className="rounded-xl bg-white p-3 dark:bg-gray-900">
                <p className="font-bold">{account.label}</p>
                {account.account_number && <p className="tabular-nums">{t('careers.report.account', { bank: account.bank_name ?? '', name: account.account_name ?? '', number: account.account_number })}</p>}
                {account.qr_image_url && <img src={account.qr_image_url} alt={account.label} className="mt-2 h-40 w-40 rounded-lg object-contain" />}
              </li>
            ))}
          </ul>
          <input ref={file} type="file" accept={RECEIPT_TYPES.join(',')} className="sr-only" aria-label={t('careers.report.upload')}
            onChange={event => {
              const chosen = event.target.files?.[0]
              event.target.value = ''
              if (!chosen || !profile) return
              if (!RECEIPT_TYPES.includes(chosen.type) || chosen.size > 10 * 1024 * 1024) { toast.error(t('careers.report.badFile')); return }
              submit.mutate({ purchaseId: open.id, userId: profile.id, file: chosen }, { onError })
            }} />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm" icon={<Upload className="h-4 w-4" />} loading={submit.isPending} onClick={() => file.current?.click()}>{t('careers.report.upload')}</Button>
            <Button size="sm" variant="ghost" loading={cancel.isPending} onClick={() => cancel.mutate(open.id, { onError })}>{t('careers.report.cancel')}</Button>
          </div>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{t('careers.report.receiptTypes')}</p>
        </div>
      )}
    </div>
  )
}

/** On the career guidance page: make a report, see earlier ones, or buy it. */
export function ReportCard({ hasAnswers }: { hasAnswers: boolean }) {
  const { t, language } = useAcademicCopy()
  const toast = useToast()
  const reports = useCareerReports()
  const generate = useGenerateCareerReport()
  if (!reports.data) return null
  return (
    <section className={card}>
      <h2 className="flex items-center gap-2 text-lg font-black"><FileText aria-hidden className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />{t('careers.report.title')}</h2>
      <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{t('careers.report.body')}</p>
      {reports.data.entitled ? (
        <>
          {hasAnswers
            ? <Button className="mt-3" size="sm" loading={generate.isPending} onClick={() => generate.mutate(undefined, { onSuccess: () => toast.success(t('careers.report.made')), onError: error => toast.error(academicErrorText(t, error)) })}>{t('careers.report.make')}</Button>
            : <p className="mt-2 text-sm">{t('careers.report.needQuestions')}</p>}
          {reports.data.reports.length > 0 && (
            <>
              <h3 className="mt-4 text-sm font-black">{t('careers.report.list')}</h3>
              <ul className="mt-1 grid gap-1 text-sm">
                {reports.data.reports.map(report => (
                  <li key={report.id}>
                    <Link to={`/academy/scores/careers/report/${report.id}`} className="font-bold text-indigo-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300">
                      {t('careers.report.made_on', { date: formatDate(report.generated_at, language) })}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
          <ReportPurchase />
        </>
      ) : <ReportPurchase />}
    </section>
  )
}

function Sources({ content }: { content: CareerReportContent }) {
  const { t, language } = useAcademicCopy()
  const all = new Map<string, { name: string; url: string; verified: string }>()
  for (const option of content.options) {
    for (const fact of option.facts) all.set(fact.source_url + fact.source_name, { name: fact.source_name, url: fact.source_url, verified: fact.verified_on })
    for (const p of option.programmes) {
      all.set(p.source_url + p.source_name, { name: p.source_name, url: p.source_url, verified: p.verified_on })
      for (const r of p.requirements) all.set(r.source_url + r.source_name, { name: r.source_name, url: r.source_url, verified: r.verified_on })
    }
  }
  for (const s of content.scholarships) all.set(s.source_url + s.source_name, { name: s.source_name, url: s.source_url, verified: s.verified_on })
  if (all.size === 0) return null
  return (
    <section className={card}>
      <h2 className="text-lg font-black">{t('careers.doc.sources')}</h2>
      <ul className="mt-2 grid gap-1 text-sm">
        {[...all.values()].map(source => <li key={source.url + source.name}>{source.name} · <a href={source.url} className="break-all underline">{source.url}</a> · {formatDate(source.verified, language)}</li>)}
      </ul>
    </section>
  )
}

/** /academy/scores/careers/report/:reportId — the frozen, printable report. */
export function CareerReportPage() {
  const { t, language } = useAcademicCopy()
  const { reportId = '' } = useParams()
  const report = useCareerReport(reportId)
  const lo = language === 'lo'
  const c = report.data?.content
  if (report.isPending) return <div className="h-80 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
  if (!c) return <section className={card}><p>{academicErrorText(t, report.error)}</p></section>
  const date = (value: string | null) => (value ? formatDate(value, language) : '—')
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link to="/academy/scores/careers" className="inline-flex items-center gap-2 text-sm font-black text-slate-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-300">
          <ArrowLeft aria-hidden className="h-4 w-4" />{t('careers.doc.back')}
        </Link>
        <Button size="sm" variant="ghost" icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>{t('family.report.print')}</Button>
      </div>

      <section className={card}>
        <h1 className="text-2xl font-black">{t('careers.doc.for', { name: c.student_name })}</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t('careers.doc.meta', { grade: (lo ? c.grade_lo : c.grade_en) ?? '—', year: c.school_year ?? '—', date: date(c.generated_at) })}</p>
        <p className="mt-2 text-sm">{t('careers.doc.basedOn', { questions: date(c.questionnaire_on), scores: date(c.scores_as_of) })}</p>
        <h2 className="mt-4 text-lg font-black">{t('careers.interests')}</h2>
        <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
          {(['R', 'I', 'A', 'S', 'E', 'C'] as const).map(area => (
            <div key={area} className="flex justify-between gap-3"><dt>{t(`careers.area.${area}` as AcademicCopyKey)}</dt><dd className="font-black">{t(`careers.level.${c.interests[area]?.level ?? 'not_enough'}` as AcademicCopyKey)}</dd></div>
          ))}
        </dl>
        <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">{t('careers.doc.optionsIntro', { name: c.student_name })}</p>
      </section>

      {c.options.map(option => (
        <section key={option.slug} className={`${card} break-before-page`}>
          <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">{t(`careers.cluster.${option.cluster}` as AcademicCopyKey)}</p>
          <h2 className="text-xl font-black">{lo ? option.title_lo : option.title_en}</h2>
          <p className="mt-1 text-sm">{lo ? option.summary_lo : option.summary_en}</p>
          <h3 className="mt-3 text-sm font-black">{t('careers.why')}</h3>
          <ul className="mt-1 list-disc pl-5 text-sm">
            {option.factors.saved && <li>{t('careers.why.saved')}</li>}
            {option.factors.interest?.length ? <li>{t('careers.why.interest', { areas: option.factors.interest.map(a => t(`careers.area.${a}` as AcademicCopyKey)).join(', ') })}</li> : null}
            {option.factors.subjects?.length ? <li>{t('careers.why.subjects', { subjects: option.subjects.filter(s => option.factors.subjects?.includes(s.code)).map(s => lo ? s.name_lo : s.name_en).join(', ') || option.factors.subjects.join(', ') })}</li> : null}
            {(option.factors.preferences ?? []).map(p => <li key={p}>{t(`careers.why.${p}` as AcademicCopyKey)}</li>)}
          </ul>
          <h3 className="mt-3 text-sm font-black">{t('careers.doc.plan')}</h3>
          <ul className="mt-1 list-disc pl-5 text-sm">
            {option.subjects.map(s => <li key={s.code}>{s.latest !== null ? t('careers.doc.subjectNow', { subject: lo ? s.name_lo : s.name_en, score: String(s.latest) }) : t('careers.doc.subjectNone', { subject: lo ? s.name_lo : s.name_en })}</li>)}
            {(lo ? option.preparation_lo : option.preparation_en).map(step => <li key={step}>{step}</li>)}
          </ul>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{t('careers.studyLength', { length: t(`careers.study.${option.study_years}` as AcademicCopyKey) })}</p>
          <h3 className="mt-3 text-sm font-black">{t('careers.doc.pathways')}</h3>
          {option.programmes.length === 0 ? <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t('careers.doc.noPathways')}</p> : (
            <ul className="mt-1 grid gap-2 text-sm">
              {option.programmes.map(p => (
                <li key={p.name_en + p.institution_en}>
                  <span className="font-bold">{lo ? p.name_lo : p.name_en}</span> · {lo ? p.institution_lo : p.institution_en}
                  {' · '}{t(`careers.degree.${p.degree_level}` as AcademicCopyKey)} · {t('careers.years', { years: p.duration_years })} · {p.entrance_group ? t('careers.group', { group: p.entrance_group }) : t('careers.groupNotConfirmed')}
                  {p.requirements.map((r, i) => <span key={i} className="block">{t(r.kind === 'cutoff' ? 'careers.cutoff' : 'careers.requirement')}: {lo ? r.text_lo : r.text_en} ({t('careers.forYear', { year: r.academic_year })})</span>)}
                </li>
              ))}
            </ul>
          )}
          {option.facts.map((fact, i) => <p key={i} className="mt-2 text-sm">{lo ? fact.text_lo : fact.text_en}</p>)}
        </section>
      ))}

      <section className={card}>
        <p className="text-sm">{t('careers.doc.timeline')}</p>
        {c.scholarships.length > 0 && <>
          <h2 className="mt-3 text-lg font-black">{t('careers.scholarships')}</h2>
          <ul className="mt-1 grid gap-1 text-sm">
            {c.scholarships.map(s => <li key={s.name_en}><span className="font-bold">{lo ? s.name_lo : s.name_en}</span> · {s.provider} · {t('careers.deadline', { date: date(s.deadline) })} · {t('careers.whoCanApply', { text: lo ? s.eligibility_lo : s.eligibility_en })}</li>)}
          </ul>
        </>}
        {c.history.length > 1 && <>
          <h2 className="mt-3 text-lg font-black">{t('careers.doc.history')}</h2>
          <ul className="mt-1 grid gap-1 text-sm">
            {c.history.map((h, i) => <li key={i}>{date(h.created_at)} · {t(`careers.reason.${h.reason}` as AcademicCopyKey)}</li>)}
          </ul>
        </>}
      </section>

      <section className={card}>
        <h2 className="text-lg font-black">{t('careers.doc.guide')}</h2>
        <p className="mt-1 text-sm">{t('careers.doc.guideIntro', { name: c.student_name })}</p>
        <ol className="mt-2 list-decimal pl-5 text-sm">
          {(['q1', 'q2', 'q3', 'q4', 'q5'] as const).map(q => <li key={q}>{t(`careers.adults.${q}` as AcademicCopyKey)}</li>)}
        </ol>
      </section>

      <Sources content={c} />
      <p className="px-1 text-xs text-slate-600 dark:text-slate-400">{t('careers.doc.disclaimer')}</p>
    </div>
  )
}
