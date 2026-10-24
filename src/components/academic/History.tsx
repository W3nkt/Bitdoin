import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, History as HistoryIcon, Lock, PenLine } from 'lucide-react'
import { useAcademicCopy, type AcademicCopyKey } from '@/lib/academic/copy'
import { useAcademicHistory, usePeriods, type HistoryEnrolment, type HistoryPeriod, type HistoryTerm, type PeriodOption } from '@/lib/academic/api'
import { formatDate, formatMean } from '@/lib/academic/format'
import { plainNumber } from '@/lib/academic/scoreInput'
import { cn } from '@/lib/utils'
import { MyScoresNotice } from './MyScoresShell'
import { RevisionList } from './ScoreEntry'
import { academicErrorText } from './errorText'

type Scale = NonNullable<HistoryEnrolment['scale']>

/**
 * Score history (FE-004): every school year > term > month, missing
 * months shown as missing (never zero), official term results apart from
 * Bitdoin's calculated term averages, source/verification/edited badges.
 */
export function History() {
  const { t } = useAcademicCopy()
  const history = useAcademicHistory()

  if (history.isPending) return <div className="h-80 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
  if (history.isError) return <MyScoresNotice title={t('state.error.title')} body={academicErrorText(t, history.error)} />
  const enrolments = history.data.enrolments
  if (!enrolments.length) return <MyScoresNotice icon={<HistoryIcon className="h-7 w-7" />} title={t('history.empty')} />

  return (
    <div className="space-y-8">
      {enrolments.map(enrolment => <YearSection key={enrolment.enrolment_id} enrolment={enrolment} />)}
    </div>
  )
}

function YearSection({ enrolment }: { enrolment: HistoryEnrolment }) {
  const { t, lo } = useAcademicCopy()
  const periods = usePeriods(enrolment.enrolment_id)
  const scale = enrolment.scale as Scale
  const recorded = new Map((enrolment.terms ?? []).flatMap(term => term.periods).map(period => [period.id, period]))

  // Months of this enrolment's calendar up to now, recorded or not, grouped by term.
  const months = (periods.data?.periods ?? []).filter(period => period.period_type === 'monthly' && !period.disabled)
  const termNumbers = [...new Set([
    ...months.map(month => termOf(month, enrolment.terms)),
    ...(enrolment.terms ?? []).map(term => term.term_no),
  ])].sort((a, b) => (a ?? 99) - (b ?? 99))

  return (
    <section aria-labelledby={`year-${enrolment.enrolment_id}`} className="space-y-4">
      <header className="px-1">
        <h2 id={`year-${enrolment.enrolment_id}`} className="text-xl font-black">
          {t('history.year', { year: enrolment.academic_year, grade: lo ? enrolment.grade.label_lo : enrolment.grade.label_en })}
        </h2>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-slate-600 dark:text-slate-400">
          <span>{(lo ? enrolment.school.name_lo : enrolment.school.name_en) ?? ''}</span>
          {scale?.family === 'numeric_linear' && <span>· {t('history.scale', { min: plainNumber(scale.min), max: plainNumber(scale.max) })}</span>}
          {enrolment.read_only && (
            <span className="inline-flex items-center gap-1 font-bold"><Lock aria-hidden className="h-3.5 w-3.5" />{t('history.closed')}
              {enrolment.closed_reason && <> · {t(`history.closedReason.${enrolment.closed_reason}` as AcademicCopyKey)}</>}
            </span>
          )}
        </p>
      </header>

      {termNumbers.map(termNo => {
        const termMonths = months.filter(month => termOf(month, enrolment.terms) === termNo)
        const others = (enrolment.terms ?? []).find(term => term.term_no === termNo)?.periods.filter(period => period.period_type !== 'monthly') ?? []
        // Recorded monthly periods outside today's calendar list (e.g. closed years).
        const extraMonths = (enrolment.terms ?? []).find(term => term.term_no === termNo)?.periods
          .filter(period => period.period_type === 'monthly' && !termMonths.some(month => month.id === period.id)) ?? []
        const rows: (HistoryPeriod | PeriodOption)[] = [...termMonths, ...extraMonths].sort((a, b) => a.sequence - b.sequence)
        const submittedMonths = rows.map(row => recorded.get(row.id)).filter((p): p is HistoryPeriod => !!p && p.entry.state === 'submitted' && p.period_type === 'monthly')
        return (
          <div key={termNo ?? 'none'} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-slate-800 sm:p-6">
            <h3 className="mb-2 px-1 text-sm font-black uppercase tracking-wide text-slate-600 dark:text-slate-400">
              {termNo ? t('history.term', { term: termNo }) : t('history.otherPeriods')}
            </h3>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map(row => {
                const period = recorded.get(row.id)
                return period
                  ? <PeriodRow key={row.id} period={period} enrolment={enrolment} />
                  : <MissingRow key={row.id} label={lo ? row.label_lo : row.label_en} periodId={row.id} canAdd={!enrolment.read_only} />
              })}
            </ul>
            {submittedMonths.length > 0 && <TermAverage months={submittedMonths} scale={scale} />}
            {others.map(period => <PeriodRow key={period.id} period={period} enrolment={enrolment} official />)}
          </div>
        )
      })}
    </section>
  )
}

function termOf(month: { id: string; sequence: number; term_no?: number | null }, terms: HistoryTerm[] | undefined) {
  if ('term_no' in month && month.term_no !== undefined) return month.term_no
  return terms?.find(term => term.periods.some(period => period.id === month.id))?.term_no ?? null
}

function MissingRow({ label, periodId, canAdd }: { label: string; periodId: string; canAdd: boolean }) {
  const { t } = useAcademicCopy()
  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <span className="px-1 font-bold">{label}</span>
      <span className="flex items-center gap-3 text-sm text-slate-500">
        {t('history.notRecorded')}
        {canAdd && (
          <Link to={`/academy/scores/entry?period=${periodId}`} className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300 dark:ring-indigo-500/40">
            <PenLine aria-hidden className="h-3.5 w-3.5" />{t('history.add')}
          </Link>
        )}
      </span>
    </li>
  )
}

function PeriodRow({ period, enrolment, official = false }: { period: HistoryPeriod; enrolment: HistoryEnrolment; official?: boolean }) {
  const { t, lo, language } = useAcademicCopy()
  const [open, setOpen] = useState(false)
  const [history, setHistory] = useState<string | null>(null)
  const label = lo ? period.label_lo : period.label_en
  const draft = period.entry.state === 'draft'
  const scored = period.lines.filter(item => item.line?.status === 'scored').length
  return (
    <li className={cn('py-3', official && 'mt-3 list-none rounded-2xl bg-slate-50 px-3 dark:bg-gray-800/60')}>
      <button type="button" onClick={() => setOpen(value => !value)} aria-expanded={open}
        className="flex w-full items-center gap-3 px-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
        <span className="min-w-0 flex-1">
          <span className="block font-bold">{label}{official && <span className="ml-2 text-xs font-black uppercase text-indigo-700 dark:text-indigo-300">{t('history.officialResult')}</span>}</span>
          <span className="block text-xs text-slate-500">
            {draft ? t('history.draft') : period.entry.submitted_at ? t('entry.submittedOn', { date: formatDate(period.entry.submitted_at, language) }) : ''}
            {' · '}{t('dash.coverage', { recorded: scored, active: period.lines.length })}
          </span>
        </span>
        <ChevronDown aria-hidden className={cn('h-4 w-4 shrink-0 text-slate-400 transition', open && 'rotate-180')} />
      </button>
      {open && (
        <>
          <ul className="mt-2 space-y-1 px-1">
            {period.lines.map(item => {
              const line = item.line
              const name = lo ? item.name_lo : item.name_en
              return (
                <li key={item.subject_enrolment_id}>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate">{name}</span>
                    {line && line.source !== 'manual' && <Badge tone="sky">{t(`history.source.${line.source}` as AcademicCopyKey)}</Badge>}
                    {line && line.verification !== 'self_reported' && <Badge tone="emerald">{t(`history.verification.${line.verification}` as AcademicCopyKey)}</Badge>}
                    {line?.edited && (
                      <button type="button" onClick={() => setHistory(history === line.id ? null : line.id)} aria-expanded={history === line.id}
                        className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                        <Badge tone="amber">{t('entry.edited')}</Badge>
                      </button>
                    )}
                    <span className={cn('tabular-nums', line?.status === 'scored' ? 'font-black' : 'text-slate-500')}>
                      {!line ? '—' : line.status === 'scored' ? plainNumber(line.value) : t(`entry.status.${line.status}` as AcademicCopyKey)}
                    </span>
                  </div>
                  {line && history === line.id && <RevisionList lineId={line.id} />}
                </li>
              )
            })}
          </ul>
          {!enrolment.read_only && (
            <Link to={`/academy/scores/entry?period=${period.id}`} className="mt-3 inline-flex items-center gap-1 px-1 text-xs font-black text-indigo-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300">
              <PenLine aria-hidden className="h-3.5 w-3.5" />{t('history.open')}
            </Link>
          )}
        </>
      )}
    </li>
  )
}

/** SCORE-011: per-subject average of the saved monthly scores in the term. */
function TermAverage({ months, scale }: { months: HistoryPeriod[]; scale: Scale }) {
  const { t, lo } = useAcademicCopy()
  if (scale?.family !== 'numeric_linear') return null
  const bySubject = new Map<string, { name: string; values: number[] }>()
  for (const month of months) {
    for (const item of month.lines) {
      if (item.line?.status !== 'scored' || item.line.value === null) continue
      const entry = bySubject.get(item.subject_enrolment_id) ?? { name: lo ? item.name_lo : item.name_en, values: [] }
      entry.values.push(Number(item.line.value))
      bySubject.set(item.subject_enrolment_id, entry)
    }
  }
  if (!bySubject.size) return null
  return (
    <div className="mt-3 rounded-2xl border border-dashed border-slate-300 p-3 dark:border-slate-700">
      <p className="text-xs font-black text-slate-700 dark:text-slate-300">{t('history.calculated')}</p>
      <p className="text-xs text-slate-500">{t('history.calculatedHint')}</p>
      <ul className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        {[...bySubject.values()].map(({ name, values }) => (
          <li key={name} className="flex justify-between gap-3">
            <span className="truncate">{name}</span>
            <span className="tabular-nums"><span className="font-black">{formatMean(values.reduce((a, b) => a + b, 0) / values.length, scale)}</span>
              <span className="ml-1 text-xs text-slate-500">({values.length === 1 ? t('history.monthOne') : t('history.months', { count: values.length })})</span></span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Badge({ tone, children }: { tone: 'sky' | 'emerald' | 'amber'; children: React.ReactNode }) {
  const tones = {
    sky: 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200',
    emerald: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200',
  }
  return <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-black uppercase', tones[tone])}>{children}</span>
}
