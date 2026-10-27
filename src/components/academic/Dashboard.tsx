import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { ArrowDownRight, ArrowLeft, ArrowUpRight, ChevronRight, CloudOff, History as HistoryIcon, Minus, PenLine, ShieldCheck, Target, Compass, Timer } from 'lucide-react'
import { useAcademicCopy, type AcademicCopyKey } from '@/lib/academic/copy'
import { useCompareYears, useDashboard, usePeriods, type Change, type CompareYear, type Confidence, type DashboardSubject, type DashboardView } from '@/lib/academic/api'
import { formatDate, formatMean } from '@/lib/academic/format'
import { explainSubject, labelReason, selectInsights } from '@/lib/academic/insights'
import { plainNumber } from '@/lib/academic/scoreInput'
import { useChartTheme, useTheme } from '@/lib/theme'
import { MyScoresNotice } from './MyScoresShell'
import { academicErrorText } from './errorText'
import { useDashboardTiming } from '@/lib/academic/telemetry'
import { useTrackUsage, type UsageEvents } from '@/lib/academic/usageEvents'
import { ReminderBanner } from './Inbox'
import { FeedbackCard } from './FeedbackCard'
import { QuizOffer } from './Quiz'
import { WeekCard } from './WeekCard'
import { PremiumNote } from './PremiumNote'
import { PremiumEndingNotice } from './PlanCard'
import { AskCoachLink, CoachCard } from './CoachCard'

// Identity never rests on colour alone: single series name their measure in
// the title, the two-series trend has a legend, and direction always has an
// icon and text (DASH-008).
// Series colours: categorical slots 1 and 2 of the reference palette,
// validated for light (#ffffff) and dark (#111827) surfaces
// (CVD ΔE ≥ 24, contrast ≥ 3:1). Text never wears these colours.
const SERIES = {
  light: { main: '#2a78d6', second: '#eb6834', grid: '#e5e7eb' },
  dark: { main: '#3987e5', second: '#d95926', grid: '#1f2937' },
}

type Scale = DashboardView['scale']

/** Five equal steps across the grading scale: 0–10 → 0, 2, 4 … 10. */
function scaleTicks(scale: Scale) {
  const min = Number(scale.min ?? 0)
  const max = Number(scale.max ?? 10)
  return Array.from({ length: 6 }, (_, i) => Math.round((min + ((max - min) * i) / 5) * 100) / 100)
}

/**
 * My Scores dashboard (FE-005): summary, monthly average trend, latest
 * month by subject, and a per-subject view. Every chart has a table view
 * (DASH-008); a copy loaded earlier is shown offline with a stale marker.
 */
export function Dashboard({ userId, enrolmentId }: { userId: string; enrolmentId: string }) {
  const { t, lo, language } = useAcademicCopy()
  const dashboard = useDashboard(userId, null)
  const periods = usePeriods(enrolmentId)
  const [params, setParams] = useSearchParams()
  const subjectId = params.get('subject')
  useDashboardTiming(dashboard.isSuccess, !!dashboard.data?.stale_since)
  const track = useTrackUsage()
  const viewed = useRef(false)
  useEffect(() => {
    if (viewed.current || !dashboard.data) return
    viewed.current = true
    track('dashboard_viewed', { has_trend: dashboard.data.periods.filter(period => period.mean !== null).length >= 2 })
  }, [dashboard.data, track])

  if (dashboard.isPending) return <div className="h-80 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
  if (dashboard.isError) return <MyScoresNotice title={t('state.error.title')} body={academicErrorText(t, dashboard.error)} />

  const view = dashboard.data
  const label = (period: { label_lo: string; label_en: string }) => (lo ? period.label_lo : period.label_en)
  const periodById = new Map(view.periods.map(period => [period.period_id, period]))
  const actions = (
    <div className="flex flex-wrap gap-2">
      {!view.enrolment.read_only && (
        <Link to="/academy/scores/entry" className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-black text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
          <PenLine className="h-4 w-4" />{t('entry.cta')}
        </Link>
      )}
      <Link to="/academy/scores/history" className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-black text-slate-700 ring-1 ring-slate-200 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-gray-900">
        <HistoryIcon className="h-4 w-4" />{t('history.link')}
      </Link>
      {!view.enrolment.read_only && (
        <Link to="/academy/scores/planner" className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-black text-slate-700 ring-1 ring-slate-200 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-gray-900">
          <Target className="h-4 w-4" />{t('planner.link')}
        </Link>
      )}
      <Link to="/academy/scores/careers" className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-black text-slate-700 ring-1 ring-slate-200 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-gray-900">
        <Compass className="h-4 w-4" />{t('careers.link')}
      </Link>
      <Link to="/academy/scores/exams" className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-black text-slate-700 ring-1 ring-slate-200 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-gray-900">
        <Timer className="h-4 w-4" />{t('exams.link')}
      </Link>
      <Link to="/academy/scores/data" className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-black text-slate-700 ring-1 ring-slate-200 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-gray-900">
        <ShieldCheck className="h-4 w-4" />{t('data.link')}
      </Link>
    </div>
  )

  if (!view.summary) {
    return (
      <div className="space-y-6">
        <ReminderBanner />
        <MyScoresNotice icon={<PenLine className="h-7 w-7" />} title={t('dash.empty.title')} body={t('dash.empty.body')} action={<div className="flex justify-center">{actions}</div>} />
      </div>
    )
  }

  const subject = subjectId ? view.subjects.find(item => item.subject_enrolment_id === subjectId) : undefined
  const openSubject = (id: string) => setParams(current => { const next = new URLSearchParams(current); next.set('subject', id); return next })
  return (
    <div className="space-y-6">
      {!subject && <ReminderBanner />}
      {!subject && !view.stale_since && <PremiumEndingNotice />}
      {view.stale_since && (
        <p role="status" className="flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
          <CloudOff className="h-4 w-4 shrink-0" />{t('dash.stale', { date: formatDate(new Date(view.stale_since), language) })}
        </p>
      )}
      {subject ? (
        <SubjectDetail view={view} subject={subject} periodLabel={id => { const p = periodById.get(id); return p ? label(p) : '' }}
          onBack={() => setParams(current => { const next = new URLSearchParams(current); next.delete('subject'); return next })} />
      ) : (
        <>
          <SummaryCard view={view} periodLabel={id => { const p = periodById.get(id); return p ? label(p) : '' }} actions={actions} />
          {!view.stale_since && <WeekCard />}
          {!view.stale_since && <CoachCard />}
          <InsightsCard view={view} onOpen={openSubject} />
          {!view.stale_since && <FeedbackCard userId={userId} recordedMonths={view.periods.length} />}
          <TrendCard view={view} monthLabels={new Map((periods.data?.periods ?? []).filter(p => p.period_type === 'monthly').map(p => [p.sequence, label(p)]))} />
          <LatestCard view={view} />
          <SubjectList view={view} onOpen={openSubject} />
        </>
      )}
      <p className="px-1 text-xs text-slate-600 dark:text-slate-400">{t('dash.selfReported')}</p>
    </div>
  )
}

// ─── Summary (DASH-001) ──────────────────────────────────────────────────────

function ChangeText({ change, periodLabel, scale }: { change: Change | null; periodLabel: (id: string) => string; scale: Scale }) {
  const { t } = useAcademicCopy()
  if (!change) return <span className="text-sm text-slate-600 dark:text-slate-400">{t('dash.change.first')}</span>
  const Icon = change.direction === 'up' ? ArrowUpRight : change.direction === 'down' ? ArrowDownRight : Minus
  const amount = formatMean(Math.abs(change.value), scale) ?? ''
  const key = `dash.change.${change.direction}` as AcademicCopyKey
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-700 dark:text-slate-200">
      <Icon aria-hidden className="h-4 w-4 shrink-0" />
      {t(key, { value: amount, period: periodLabel(change.compared_period_id) })}
    </span>
  )
}

function SummaryCard({ view, periodLabel, actions }: { view: DashboardView; periodLabel: (id: string) => string; actions: ReactNode }) {
  const { t } = useAcademicCopy()
  const summary = view.summary!
  const mean = formatMean(summary.mean, view.scale)
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-slate-800">
      <p className="text-sm font-bold text-slate-600 dark:text-slate-400">{periodLabel(summary.latest_period_id)} · {view.enrolment.academic_year}</p>
      <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-1">
        {mean ? (
          <p className="text-5xl font-black leading-none">{mean}<span className="ml-1 text-lg font-bold text-slate-500 dark:text-slate-400">/ {plainNumber(view.scale.max)}</span></p>
        ) : (
          <p className="text-base font-bold text-slate-700 dark:text-slate-300">{t('dash.lowCoverage')}</p>
        )}
        {mean && <p className="pb-1 text-sm font-bold text-slate-600 dark:text-slate-400">{t('dash.average')}</p>}
      </div>
      <div className="mt-3 flex flex-col gap-1">
        {mean && <ChangeText change={summary.change} periodLabel={periodLabel} scale={view.scale} />}
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {t('dash.coverage', { recorded: summary.coverage.recorded, active: summary.coverage.active })}
          {summary.missing > 0 && <> · {t('dash.missing', { count: summary.missing })}</>}
        </p>
      </div>
      <div className="mt-5">{actions}</div>
    </section>
  )
}

// ─── Stronger and needing attention (DASH-005) ───────────────────────────────

function ConfidenceChip({ confidence }: { confidence: Confidence }) {
  const { t } = useAcademicCopy()
  return (
    <span className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-bold text-slate-700 ring-1 ring-slate-300 dark:text-slate-200 dark:ring-slate-600">
      {t(`insights.confidence.${confidence}`)}
    </span>
  )
}

/**
 * Subjects the engine labels relatively stronger or lower than the student's
 * own average, each with the rule that selected it and a confidence chip.
 * Not shown while the snapshot has no labels (insights switched off).
 */
function InsightsCard({ view, onOpen }: { view: DashboardView; onOpen: (id: string) => void }) {
  const { t, lo } = useAcademicCopy()
  const { state, stronger, attention } = selectInsights(view)
  if (state === 'hidden') return null
  const group = (title: string, Icon: typeof ArrowUpRight, subjects: DashboardSubject[]) => (
    <div>
      <h3 className="flex items-center gap-1.5 text-sm font-black"><Icon aria-hidden className="h-4 w-4 shrink-0" />{title}</h3>
      {subjects.length === 0 ? (
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t('insights.emptyList')}</p>
      ) : (
        <ul className="mt-1 divide-y divide-slate-100 dark:divide-slate-800">
          {subjects.map(subject => (
            <li key={subject.subject_enrolment_id}>
              <button type="button" onClick={() => onOpen(subject.subject_enrolment_id)}
                className="flex w-full items-start gap-3 py-2.5 text-left hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-gray-800/60">
                <span className="min-w-0 flex-1">
                  <span className="block break-words font-bold">{lo ? subject.name_lo : subject.name_en}</span>
                  <span className="block text-xs text-slate-600 dark:text-slate-400">{labelReason(subject, view.scale, t)}</span>
                </span>
                {subject.label?.confidence && <ConfidenceChip confidence={subject.label.confidence} />}
                <ChevronRight aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-slate-800 sm:p-6">
      <h2 className="text-lg font-black">{t('insights.title')}</h2>
      <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{t('insights.note')}</p>
      {state === 'ready' ? (
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {group(t('insights.stronger'), ArrowUpRight, stronger)}
          {group(t('insights.attention'), ArrowDownRight, attention)}
        </div>
      ) : (
        <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-gray-800/60 dark:text-slate-400">
          {t(state === 'insufficient' ? 'insights.insufficient' : 'insights.none')}
        </p>
      )}
      {view.detail_locked && state === 'ready' && <PremiumNote body="premium.insights" />}
    </section>
  )
}

/** ANALYSIS-004: what the scores show, then suggestions phrased as suggestions. */
function ExplanationCard({ view, subject, name }: { view: DashboardView; subject: DashboardSubject; name: string }) {
  const { t } = useAcademicCopy()
  if (!subject.label && !subject.trend) return null
  if (view.detail_locked) {
    return (
      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-slate-800 sm:p-6">
        <h2 className="text-lg font-black">{t('explain.title')}</h2>
        <PremiumNote body="premium.explain" />
      </section>
    )
  }
  const { facts, suggestions } = explainSubject(subject, view.scale, name, t)
  if (facts.length === 0) return null
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-slate-800 sm:p-6">
      <h2 className="text-lg font-black">{t('explain.title')}</h2>
      <ul className="mt-2 space-y-3">
        {facts.map(fact => (
          <li key={fact.text}>
            <p className="text-sm text-slate-800 dark:text-slate-200">{fact.text}</p>
            {fact.confidence && (
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <ConfidenceChip confidence={fact.confidence} />{t(`insights.confidenceText.${fact.confidence}`)}
              </p>
            )}
          </li>
        ))}
      </ul>
      {suggestions.length > 0 && (
        <div className="mt-4 rounded-2xl bg-slate-50 p-4 dark:bg-gray-800/60">
          <h3 className="text-sm font-black">{t('explain.helps')}</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
            {suggestions.map(text => <li key={text}>{text}</li>)}
          </ul>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{t('explain.helpsNote')}</p>
        </div>
      )}
    </section>
  )
}

// ─── Shared chart frame with table view (DASH-008) ──────────────────────────

type ChartId = UsageEvents['chart_table_toggled']['chart_id']

function ChartCard({ chartId, title, subtitle, table, children, footer }: { chartId: ChartId; title: string; subtitle?: ReactNode; table: ReactNode; children: ReactNode; footer?: ReactNode }) {
  const { t } = useAcademicCopy()
  const track = useTrackUsage()
  const [asTable, setAsTable] = useState(false)
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-slate-800 sm:p-6">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black">{title}</h2>
          {subtitle && <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{subtitle}</div>}
        </div>
        <button type="button" onClick={() => { if (!asTable) track('chart_table_toggled', { chart_id: chartId }); setAsTable(value => !value) }} aria-pressed={asTable}
          className="shrink-0 rounded-full px-3 py-1.5 text-xs font-black text-indigo-700 hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300 dark:hover:bg-indigo-500/10">
          {asTable ? t('dash.table.hide') : t('dash.table.show')}
        </button>
      </div>
      {asTable ? <div className="overflow-x-auto">{table}</div> : children}
      {footer}
    </section>
  )
}

function DataTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full text-left text-sm">
      <thead><tr className="border-b border-slate-200 dark:border-slate-700">{head.map(cell => <th key={cell} scope="col" className="py-2 pr-3 font-black">{cell}</th>)}</tr></thead>
      <tbody>
        {rows.map(row => (
          <tr key={String(row[0])} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
            {row.map((cell, index) => index === 0
              ? <th key={index} scope="row" className="py-2 pr-3 font-bold">{cell}</th>
              : <td key={index} className="py-2 pr-3 tabular-nums">{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function useSeries() {
  return SERIES[useTheme(state => state.theme) === 'dark' ? 'dark' : 'light']
}

function ValueTooltip({ active, payload, label, scale }: { active?: boolean; payload?: { name: string; value: number | null; color: string }[]; label?: string; scale: Scale }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl bg-white px-3 py-2 text-sm shadow-lg ring-1 ring-slate-200 dark:bg-gray-800 dark:ring-slate-700">
      <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</p>
      {payload.filter(item => item.value !== null && item.value !== undefined).map(item => (
        <p key={item.name} className="flex items-center gap-2">
          <span aria-hidden className="inline-block h-0.5 w-3 rounded" style={{ background: item.color }} />
          <span className="font-black tabular-nums text-slate-900 dark:text-white">{formatMean(item.value, scale)}</span>
          <span className="text-slate-500 dark:text-slate-400">{item.name}</span>
        </p>
      ))}
    </div>
  )
}

// ─── Monthly average (DASH-002) ──────────────────────────────────────────────

function TrendCard({ view, monthLabels }: { view: DashboardView; monthLabels: Map<number, string> }) {
  const { t, lo } = useAcademicCopy()
  const chart = useChartTheme()
  const colors = useSeries()
  const scale = view.scale
  const bySeq = new Map(view.periods.map(period => [period.sequence, period]))
  const first = Math.min(...view.periods.map(period => period.sequence))
  const last = Math.max(...view.periods.map(period => period.sequence))
  // Every month from first to last recorded, so missing months stay gaps.
  const data = Array.from({ length: last - first + 1 }, (_, i) => {
    const seq = first + i
    const period = bySeq.get(seq)
    return {
      label: monthLabels.get(seq) ?? (period ? (lo ? period.label_lo : period.label_en) : String(seq)),
      mean: period?.mean === null || period?.mean === undefined ? null : Number(period.mean),
      rolling: period?.rolling_mean === null || period?.rolling_mean === undefined ? null : Number(period.rolling_mean),
      recorded: period ? `${period.recorded}/${period.active}` : '—',
    }
  })
  const withMean = data.filter(point => point.mean !== null).length
  const showRolling = view.periods.length >= 4 && data.some(point => point.rolling !== null)
  const transferredFrom = view.enrolment.start_period_seq > 1 ? monthLabels.get(view.enrolment.start_period_seq) : undefined
  const meanName = t('dash.average')
  const rollingName = t('dash.trend.rolling')

  if (withMean < 2) {
    return (
      <ChartCard chartId="trend" title={t('dash.trend.title')} table={<DataTable head={[t('dash.table.month'), t('dash.average'), t('dash.table.recorded')]} rows={data.map(point => [point.label, formatMean(point.mean, scale) ?? '—', point.recorded])} />}>
        <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-gray-800/60 dark:text-slate-400">{t('dash.trend.empty')}</p>
      </ChartCard>
    )
  }

  return (
    <ChartCard
      chartId="trend"
      title={t('dash.trend.title')}
      subtitle={showRolling && (
        <span className="flex flex-wrap gap-x-4 gap-y-1">
          <LegendKey color={colors.main} label={meanName} />
          <LegendKey color={colors.second} label={rollingName} />
        </span>
      )}
      table={<DataTable head={[t('dash.table.month'), meanName, ...(showRolling ? [rollingName] : []), t('dash.table.recorded')]}
        rows={data.map(point => [point.label, formatMean(point.mean, scale) ?? '—', ...(showRolling ? [formatMean(point.rolling, scale) ?? '—'] : []), point.recorded])} />}
      footer={<p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t('dash.trend.gap')}{transferredFrom && ` · ${t('dash.trend.schoolChanged', { period: transferredFrom })}`}</p>}
    >
      <div className="h-56" role="img" aria-label={`${t('dash.trend.title')}: ${data.map(point => `${point.label} ${formatMean(point.mean, scale) ?? '—'}`).join(', ')}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke={colors.grid} strokeWidth={1} />
            <XAxis dataKey="label" tick={{ ...chart.tick, fontSize: 12 }} axisLine={{ stroke: chart.axisLine }} tickLine={false} interval="preserveStartEnd" />
            <YAxis domain={[scale.min ?? 0, scale.max ?? 10]} tick={{ ...chart.tick, fontSize: 12 }} axisLine={false} tickLine={false} width={40} ticks={scaleTicks(scale)} interval={0} />
            <Tooltip content={<ValueTooltip scale={scale} />} cursor={{ stroke: chart.axisLine, strokeWidth: 1 }} />
            {showRolling && <Line type="linear" dataKey="rolling" name={rollingName} stroke={colors.second} strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />}
            <Line type="linear" dataKey="mean" name={meanName} stroke={colors.main} strokeWidth={2} connectNulls={false} isAnimationActive={false}
              dot={{ r: 4, fill: colors.main, stroke: chart.surface, strokeWidth: 2 }} activeDot={{ r: 6, stroke: chart.surface, strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}

function LegendKey({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5 font-bold"><span aria-hidden className="inline-block h-0.5 w-4 rounded" style={{ background: color }} />{label}</span>
}

// ─── Latest month by subject (DASH-004) ──────────────────────────────────────

function LatestCard({ view }: { view: DashboardView }) {
  const { t, lo } = useAcademicCopy()
  const chart = useChartTheme()
  const colors = useSeries()
  const latestId = view.summary!.latest_period_id
  const latest = view.periods.find(period => period.period_id === latestId)!
  const periodName = lo ? latest.label_lo : latest.label_en
  const name = (subject: DashboardSubject) => (lo ? subject.name_lo : subject.name_en)
  const atLatest = view.subjects.filter(subject => subject.latest?.period_id === latestId)
  const scored = atLatest
    .filter(subject => subject.latest?.status === 'scored' && subject.latest.value !== null && view.numeric)
    .map(subject => ({ name: name(subject), value: Number(subject.latest!.value) }))
    .sort((a, b) => b.value - a.value)
  const others = atLatest.filter(subject => subject.latest?.status !== 'scored')

  return (
    <ChartCard
      chartId="subjects"
      title={t('dash.compare.title', { period: periodName })}
      table={<DataTable head={[t('dash.table.subject'), t('dash.table.score')]}
        rows={[...scored.map(row => [row.name, plainNumber(row.value)]), ...others.map(subject => [name(subject), t(`entry.status.${subject.latest!.status}` as AcademicCopyKey)])]} />}
      footer={others.length > 0 && (
        <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm dark:bg-gray-800/60">
          <p className="font-bold text-slate-600 dark:text-slate-400">{t('dash.compare.others')}</p>
          <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
            {others.map(subject => <li key={subject.subject_enrolment_id}>{name(subject)} · <span className="text-slate-500 dark:text-slate-400">{t(`entry.status.${subject.latest!.status}` as AcademicCopyKey)}</span></li>)}
          </ul>
        </div>
      )}
    >
      {scored.length > 0 && (
        <div style={{ height: Math.max(scored.length * 40, 80) }} role="img"
          aria-label={`${t('dash.compare.title', { period: periodName })}: ${scored.map(row => `${row.name} ${plainNumber(row.value)}`).join(', ')}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={scored} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 0 }} barCategoryGap={8}>
              <CartesianGrid horizontal={false} stroke={colors.grid} strokeWidth={1} />
              <XAxis type="number" domain={[view.scale.min ?? 0, view.scale.max ?? 10]} hide />
              <YAxis type="category" dataKey="name" width={112} tick={{ ...chart.tick, fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ValueTooltip scale={view.scale} />} cursor={chart.tooltip.cursor} />
              <Bar dataKey="value" name={t('dash.table.score')} fill={colors.main} barSize={20} radius={[0, 4, 4, 0]} isAnimationActive={false}>
                <LabelList dataKey="value" position="right" formatter={(value: number) => plainNumber(value)} style={{ fill: chart.tick.fill, fontSize: 12, fontWeight: 800 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  )
}

// ─── Subjects list and detail (DASH-003) ─────────────────────────────────────

function SubjectList({ view, onOpen }: { view: DashboardView; onOpen: (id: string) => void }) {
  const { t, lo } = useAcademicCopy()
  const subjects = view.subjects.filter(subject => subject.series.length > 0 || subject.active)
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-slate-800 sm:p-6">
      <h2 className="mb-2 text-lg font-black">{t('dash.subjects.title')}</h2>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {subjects.map(subject => (
          <li key={subject.subject_enrolment_id}>
            <button type="button" onClick={() => onOpen(subject.subject_enrolment_id)}
              className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 py-3 text-left hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-gray-800/60">
              <span className="min-w-[8rem] flex-1">
                <span className="block break-words font-bold">{lo ? subject.name_lo : subject.name_en}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  {subject.mean !== null ? t('dash.subjects.average', { value: formatMean(subject.mean, view.scale) ?? '', count: subject.window_n }) : t('dash.subjects.fewMonths')}
                </span>
              </span>
              {subject.latest?.status === 'scored' && <span className="text-lg font-black">{plainNumber(subject.latest.value)}</span>}
              <DirectionIcon change={subject.change} />
              <ChevronRight aria-hidden className="h-4 w-4 text-slate-400" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function DirectionIcon({ change }: { change: Change | null }) {
  if (!change) return <span className="w-4" />
  const Icon = change.direction === 'up' ? ArrowUpRight : change.direction === 'down' ? ArrowDownRight : Minus
  return <Icon aria-hidden className="h-4 w-4 text-slate-500 dark:text-slate-400" />
}

function SubjectDetail({ view, subject, periodLabel, onBack }: { view: DashboardView; subject: DashboardSubject; periodLabel: (id: string) => string; onBack: () => void }) {
  const { t, lo } = useAcademicCopy()
  const chart = useChartTheme()
  const colors = useSeries()
  const name = lo ? subject.name_lo : subject.name_en
  const data = useMemo(() => subject.series.map(point => ({
    label: periodLabel(point.period_id),
    value: point.status === 'scored' && point.value !== null ? Number(point.value) : null,
    status: point.status,
  })), [subject, periodLabel])
  const mean = subject.mean === null ? null : Number(subject.mean)
  const scoreName = t('dash.table.score')

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-black text-indigo-700 hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300 dark:hover:bg-indigo-500/10">
        <ArrowLeft className="h-4 w-4" />{t('dash.subject.back')}
      </button>
      <ChartCard
        chartId="subject_detail"
        title={t('dash.subject.chart', { subject: name })}
        subtitle={(
          <span className="flex flex-col gap-1">
            {subject.latest?.status === 'scored' && <span>{t('dash.subject.latest', { value: plainNumber(subject.latest.value), period: periodLabel(subject.latest.period_id) })}</span>}
            <span>{mean !== null ? t('dash.subjects.average', { value: formatMean(mean, view.scale) ?? '', count: subject.window_n }) : t('dash.subjects.fewMonths')}</span>
            <ChangeText change={subject.change} periodLabel={periodLabel} scale={view.scale} />
            <span className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
              <LegendKey color={colors.main} label={scoreName} />
              {mean !== null && <LegendKey color={colors.second} label={t('dash.subject.meanLine')} />}
            </span>
          </span>
        )}
        table={<DataTable head={[t('dash.table.month'), scoreName]} rows={data.map(point => [point.label, point.value === null ? t(`entry.status.${point.status}` as AcademicCopyKey) : plainNumber(point.value)])} />}
        footer={<p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t('dash.oneMonth')}</p>}
      >
        <div className="h-56" role="img" aria-label={`${t('dash.subject.chart', { subject: name })}: ${data.map(point => `${point.label} ${point.value ?? '—'}`).join(', ')}`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 16, right: 16, bottom: 0, left: -12 }}>
              <CartesianGrid vertical={false} stroke={colors.grid} strokeWidth={1} />
              <XAxis dataKey="label" tick={{ ...chart.tick, fontSize: 12 }} axisLine={{ stroke: chart.axisLine }} tickLine={false} interval="preserveStartEnd" />
              <YAxis domain={[view.scale.min ?? 0, view.scale.max ?? 10]} tick={{ ...chart.tick, fontSize: 12 }} axisLine={false} tickLine={false} width={40} ticks={scaleTicks(view.scale)} interval={0} />
              <Tooltip content={<ValueTooltip scale={view.scale} />} cursor={{ stroke: chart.axisLine, strokeWidth: 1 }} />
              {mean !== null && (
                <ReferenceLine y={mean} stroke={colors.second} strokeWidth={2} />
              )}
              <Line type="linear" dataKey="value" name={scoreName} stroke={colors.main} strokeWidth={2} connectNulls={false} isAnimationActive={false}
                dot={{ r: 4, fill: colors.main, stroke: chart.surface, strokeWidth: 2 }} activeDot={{ r: 6, stroke: chart.surface, strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
      <CompareYears subjectEnrolmentId={subject.subject_enrolment_id} name={name} />
      <ExplanationCard view={view} subject={subject} name={name} />
      <QuizOffer subjectEnrolmentId={subject.subject_enrolment_id} needsAttention={subject.label?.value === 'relatively_lower'} />
      <AskCoachLink subject={name} />
    </div>
  )
}

// ─── Compare school years (DASH-007) ─────────────────────────────────────────

// School-year order: September first.
const MONTH_ORDER = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8]

/** The same subject in another school year, aligned by month; only when the scales can be compared. */
function CompareYears({ subjectEnrolmentId, name }: { subjectEnrolmentId: string; name: string }) {
  const { t, lo } = useAcademicCopy()
  const chart = useChartTheme()
  const colors = useSeries()
  const compare = useCompareYears(subjectEnrolmentId)
  const [open, setOpen] = useState(false)
  const [otherId, setOtherId] = useState<string | null>(null)
  const years = compare.data?.years ?? []
  const current = years.find(year => year.current)
  const others = years.filter(year => !year.current)
  const other = others.find(year => year.subject_enrolment_id === otherId) ?? others.find(year => year.compatible) ?? others[0]
  const sameRange = !!current && !!other && Number(current.scale.min) === Number(other.scale.min) && Number(current.scale.max) === Number(other.scale.max)
  const data = useMemo(() => {
    if (!current?.series || !other?.series) return []
    const point = (year: CompareYear, month: number) => {
      const found = year.series?.find(p => p.month === month && p.status === 'scored')
      if (!found || found.value === null) return null
      return sameRange ? Number(found.value) : Math.round(Number(found.normalised) * 1000) / 10
    }
    const labelOf = (month: number) => {
      const found = current.series?.find(p => p.month === month) ?? other.series?.find(p => p.month === month)
      return found ? (lo ? found.label_lo : found.label_en) : String(month)
    }
    return MONTH_ORDER.filter(month => current.series?.some(p => p.month === month) || other.series?.some(p => p.month === month))
      .map(month => ({ label: labelOf(month), now: point(current, month), before: point(other, month) }))
  }, [current, other, sameRange, lo])
  if (!current || others.length === 0) return null

  const yearName = (year: CompareYear) => `${year.year} (${lo ? year.grade_lo : year.grade_en})`
  const scaleName = (year: CompareYear) => `${year.scale.min ?? '—'}–${year.scale.max ?? '—'}`
  const anyCompatible = others.some(year => year.compatible)
  const show = (value: number | null) => (value === null ? '—' : sameRange ? plainNumber(value) : `${value}%`)
  const domain: [number, number] = sameRange ? [Number(current.scale.min ?? 0), Number(current.scale.max ?? 10)] : [0, 100]

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-slate-800 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black">{t('dash.years.title')}</h2>
        <button type="button" disabled={!anyCompatible} aria-pressed={open} onClick={() => setOpen(value => !value)}
          className="rounded-full px-3 py-1.5 text-sm font-black text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:text-slate-500 disabled:ring-slate-200 dark:text-indigo-300 dark:ring-indigo-500/40 dark:hover:bg-indigo-500/10 dark:disabled:text-slate-500 dark:disabled:ring-slate-700">
          {open ? t('dash.years.hide') : t('dash.years.show')}
        </button>
      </div>
      {!anyCompatible && <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{t(other?.reason === 'different_scale' ? 'dash.years.differentScale' : 'dash.years.notNormalisable', { year: other ? yearName(other) : '' })}</p>}
      {open && anyCompatible && other && (
        <div className="mt-3">
          {others.length > 1 && (
            <label className="mb-3 flex flex-wrap items-center gap-2 text-sm font-bold">{t('dash.years.with')}
              <select value={other.subject_enrolment_id} onChange={event => setOtherId(event.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-2 py-1.5 font-medium dark:border-slate-600 dark:bg-gray-950">
                {others.map(year => <option key={year.subject_enrolment_id} value={year.subject_enrolment_id}>{yearName(year)}</option>)}
              </select>
            </label>
          )}
          {!other.compatible ? <p className="text-sm text-slate-700 dark:text-slate-300">{t(other.reason === 'different_scale' ? 'dash.years.differentScale' : 'dash.years.notNormalisable', { year: yearName(other) })}</p> : (
            <ChartCard
              chartId="subject_detail"
              title={t('dash.years.chart', { subject: name })}
              subtitle={(
                <span className="flex flex-col gap-1">
                  {!sameRange && <span>{t('dash.years.percent', { now: scaleName(current), before: scaleName(other) })}</span>}
                  <span className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    <LegendKey color={colors.main} label={yearName(current)} />
                    <LegendKey color={colors.second} label={yearName(other)} />
                  </span>
                </span>
              )}
              table={<DataTable head={[t('dash.table.month'), yearName(current), yearName(other)]} rows={data.map(point => [point.label, show(point.now), show(point.before)])} />}
              footer={<p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t('dash.years.note')}</p>}
            >
              <div className="h-56" role="img" aria-label={`${t('dash.years.chart', { subject: name })}: ${data.map(point => `${point.label} ${show(point.now)} / ${show(point.before)}`).join(', ')}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 16, right: 16, bottom: 0, left: -12 }}>
                    <CartesianGrid vertical={false} stroke={colors.grid} strokeWidth={1} />
                    <XAxis dataKey="label" tick={{ ...chart.tick, fontSize: 12 }} axisLine={{ stroke: chart.axisLine }} tickLine={false} interval="preserveStartEnd" />
                    <YAxis domain={domain} tick={{ ...chart.tick, fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
                    <Line type="linear" dataKey="now" name={yearName(current)} stroke={colors.main} strokeWidth={2} connectNulls={false} isAnimationActive={false}
                      dot={{ r: 4, fill: colors.main, stroke: chart.surface, strokeWidth: 2 }} />
                    <Line type="linear" dataKey="before" name={yearName(other)} stroke={colors.second} strokeWidth={2} strokeDasharray="5 4" connectNulls={false} isAnimationActive={false}
                      dot={{ r: 4, fill: colors.second, stroke: chart.surface, strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          )}
        </div>
      )}
    </section>
  )
}

export default Dashboard
