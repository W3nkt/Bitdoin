import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, BarChart3, BookOpenCheck, CalendarDays, CalendarRange, ChevronRight, CloudOff, Compass, History as HistoryIcon, Info, Library, Lightbulb,
  LineChart as LineChartIcon, PenLine, Scale, ShieldCheck, ShoppingBag, Table2, Target, Timer, TrendingUp, type LucideIcon,
} from 'lucide-react'
import { useAcademicCopy, type AcademicCopyKey } from '@/lib/academic/copy'
import { useCompareYears, useDashboard, usePeriods, useSubjectBooks, type Change, type CompareYear, type Confidence, type DashboardSubject, type DashboardView } from '@/lib/academic/api'
import { formatDate, formatMean } from '@/lib/academic/format'
import { explainSubject, labelReason, selectInsights } from '@/lib/academic/insights'
import { plainNumber } from '@/lib/academic/scoreInput'
import { useTheme } from '@/lib/theme'
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
import { ActionTile, CardTitle, ConfidenceBars, DirectionChip, ScoreFace, ScorePill, SubjectBadge, scoreLevel, subjectVisual } from './visuals'
import { cn } from '@/lib/utils'

// recharts loads after the summary card (DASH-006: route JS budget).
const TrendChart = lazy(() => import('./DashboardCharts').then(m => ({ default: m.TrendChart })))
const SubjectChart = lazy(() => import('./DashboardCharts').then(m => ({ default: m.SubjectChart })))
const YearsChart = lazy(() => import('./DashboardCharts').then(m => ({ default: m.YearsChart })))

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

/** One colour per Schooling area, shared by the dashboard tiles and each page's title. */
export const ACTION_COLORS = {
  entry: '#6366f1', history: '#0ea5e9', planner: '#f97316', careers: '#14b8a6', exams: '#e11d48', data: '#10b981',
} as const

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
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {!view.enrolment.read_only && <ActionTile primary to="/academy/scores/entry" icon={PenLine} color={ACTION_COLORS.entry} label={t('entry.cta')} />}
      <ActionTile to="/academy/scores/history" icon={HistoryIcon} color={ACTION_COLORS.history} label={t('history.link')} />
      {!view.enrolment.read_only && <ActionTile to="/academy/scores/planner" icon={Target} color={ACTION_COLORS.planner} label={t('planner.link')} />}
      <ActionTile to="/academy/scores/careers" icon={Compass} color={ACTION_COLORS.careers} label={t('careers.link')} />
      <ActionTile to="/academy/scores/exams" icon={Timer} color={ACTION_COLORS.exams} label={t('exams.link')} />
      <ActionTile to="/academy/scores/data" icon={ShieldCheck} color={ACTION_COLORS.data} label={t('data.link')} />
    </div>
  )

  if (!view.summary) {
    return (
      <div className="space-y-6">
        <ReminderBanner />
        <MyScoresNotice icon={<span aria-hidden className="text-3xl">✏️</span>} title={t('dash.empty.title')} body={t('dash.empty.body')} action={actions} />
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
  if (!change) return <span className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400"><span aria-hidden>🌱</span>{t('dash.change.first')}</span>
  const amount = formatMean(Math.abs(change.value), scale) ?? ''
  const key = `dash.change.${change.direction}` as AcademicCopyKey
  return (
    <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
      <DirectionChip direction={change.direction} />
      {t(key, { value: amount, period: periodLabel(change.compared_period_id) })}
    </span>
  )
}

function SummaryCard({ view, periodLabel, actions }: { view: DashboardView; periodLabel: (id: string) => string; actions: ReactNode }) {
  const { t } = useAcademicCopy()
  const summary = view.summary!
  const mean = formatMean(summary.mean, view.scale)
  const { recorded, active } = summary.coverage
  return (
    <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-slate-800">
      <div className="bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-6 dark:from-indigo-500/10 dark:via-gray-900 dark:to-sky-500/10">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200 dark:bg-gray-900/70 dark:text-slate-300 dark:ring-slate-700">
          <CalendarDays aria-hidden className="h-3.5 w-3.5" />{periodLabel(summary.latest_period_id)} · {view.enrolment.academic_year}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          {mean && <ScoreFace value={summary.mean} scale={view.scale} />}
          {mean ? (
            <div>
              <p className="text-5xl font-black leading-none">{mean}<span className="ml-1 text-lg font-bold text-slate-500 dark:text-slate-400">/ {plainNumber(view.scale.max)}</span></p>
              <p className="mt-1 text-sm font-bold text-slate-600 dark:text-slate-400">{t('dash.average')}</p>
            </div>
          ) : (
            <p className="flex items-center gap-2 text-base font-bold text-slate-700 dark:text-slate-300"><span aria-hidden className="text-2xl">📝</span>{t('dash.lowCoverage')}</p>
          )}
        </div>
        <div className="mt-4 flex flex-col gap-2">
          {mean && <ChangeText change={summary.change} periodLabel={periodLabel} scale={view.scale} />}
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <BookOpenCheck aria-hidden className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-300" />
            <span aria-hidden className="h-2 w-24 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <span className="block h-full rounded-full bg-indigo-500" style={{ width: `${active ? Math.round((recorded / active) * 100) : 0}%` }} />
            </span>
            <span>
              {t('dash.coverage', { recorded, active })}
              {summary.missing > 0 && <> · {t('dash.missing', { count: summary.missing })}</>}
            </span>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-100 p-4 dark:border-slate-800 sm:p-5">{actions}</div>
    </section>
  )
}

// ─── Stronger and needing attention (DASH-005) ───────────────────────────────

function ConfidenceChip({ confidence }: { confidence: Confidence }) {
  const { t } = useAcademicCopy()
  return <ConfidenceBars confidence={confidence} label={t(`insights.confidence.${confidence}`)} />
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
  const group = (title: string, emoji: string, tone: string, subjects: DashboardSubject[]) => (
    <div className={cn('rounded-2xl p-3', tone)}>
      <h3 className="flex items-center gap-2 text-sm font-black"><span aria-hidden className="text-xl">{emoji}</span>{title}</h3>
      {subjects.length === 0 ? (
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t('insights.emptyList')}</p>
      ) : (
        <ul className="mt-1 divide-y divide-slate-900/5 dark:divide-white/5">
          {subjects.map(subject => (
            <li key={subject.subject_enrolment_id}>
              <button type="button" onClick={() => onOpen(subject.subject_enrolment_id)}
                className="flex w-full items-center gap-3 rounded-xl px-1 py-2.5 text-left hover:bg-white/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-gray-900/60">
                <SubjectBadge code={subject.code} name={subject.name_en} size="sm" />
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
      <CardTitle icon={Scale} color="#8b5cf6" title={t('insights.title')} />
      <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400"><ShieldCheck aria-hidden className="h-3.5 w-3.5 shrink-0" />{t('insights.note')}</p>
      {state === 'ready' ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {group(t('insights.stronger'), '💪', 'bg-emerald-50 dark:bg-emerald-500/10', stronger)}
          {group(t('insights.attention'), '🎯', 'bg-amber-50 dark:bg-amber-500/10', attention)}
        </div>
      ) : (
        <p className="mt-3 flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-gray-800/60 dark:text-slate-400">
          <span aria-hidden className="text-2xl">{state === 'insufficient' ? '⏳' : '⚖️'}</span>
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
        <CardTitle icon={Lightbulb} color="#f59e0b" title={t('explain.title')} />
        <PremiumNote body="premium.explain" />
      </section>
    )
  }
  const { facts, suggestions } = explainSubject(subject, view.scale, name, t)
  if (facts.length === 0) return null
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-slate-800 sm:p-6">
      <CardTitle icon={Lightbulb} color="#f59e0b" title={t('explain.title')} />
      <ul className="mt-3 space-y-3">
        {facts.map(fact => (
          <li key={fact.text} className="flex gap-3">
            <span aria-hidden className="mt-0.5 text-base">🔎</span>
            <div className="min-w-0">
            <p className="text-sm text-slate-800 dark:text-slate-200">{fact.text}</p>
            {fact.confidence && (
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <ConfidenceChip confidence={fact.confidence} />{t(`insights.confidenceText.${fact.confidence}`)}
              </p>
            )}
            </div>
          </li>
        ))}
      </ul>
      {suggestions.length > 0 && (
        <div className="mt-4 rounded-2xl bg-amber-50 p-4 dark:bg-amber-500/10">
          <CardTitle as="h3" emoji="✨" color="#f59e0b" title={t('explain.helps')} />
          <ul className="mt-2 space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
            {suggestions.map(text => <li key={text} className="flex gap-2"><span aria-hidden>👉</span><span>{text}</span></li>)}
          </ul>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400"><Info aria-hidden className="h-3.5 w-3.5 shrink-0" />{t('explain.helpsNote')}</p>
        </div>
      )}
    </section>
  )
}

// ─── Shared chart frame with table view (DASH-008) ──────────────────────────

type ChartId = UsageEvents['chart_table_toggled']['chart_id']

function ChartCard({ chartId, title, icon = LineChartIcon, color = '#2a78d6', info, subtitle, table, children, footer }: {
  chartId: ChartId; title: string; icon?: LucideIcon; color?: string; info?: ReactNode; subtitle?: ReactNode; table: ReactNode; children: ReactNode; footer?: ReactNode
}) {
  const { t } = useAcademicCopy()
  const track = useTrackUsage()
  const [asTable, setAsTable] = useState(false)
  const toggle = asTable ? t('dash.table.hide') : t('dash.table.show')
  const ToggleIcon = asTable ? LineChartIcon : Table2
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-slate-800 sm:p-6">
      <div className="mb-3">
        <CardTitle icon={icon} color={color} title={title} info={info}>
          <button type="button" onClick={() => { if (!asTable) track('chart_table_toggled', { chart_id: chartId }); setAsTable(value => !value) }} aria-pressed={asTable}
            aria-label={toggle} title={toggle}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-indigo-700 ring-1 ring-indigo-100 hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300 dark:ring-indigo-500/30 dark:hover:bg-indigo-500/10">
            <ToggleIcon aria-hidden className="h-4 w-4" />
          </button>
        </CardTitle>
        {subtitle && <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">{subtitle}</div>}
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

/** Holds the chart's space while recharts loads. */
function ChartSlot({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div data-chart-loading className="h-full w-full animate-pulse rounded-2xl bg-slate-50 dark:bg-gray-800/60" />}>{children}</Suspense>
}

// ─── Monthly average (DASH-002) ──────────────────────────────────────────────

function TrendCard({ view, monthLabels }: { view: DashboardView; monthLabels: Map<number, string> }) {
  const { t, lo } = useAcademicCopy()
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
      <ChartCard chartId="trend" icon={TrendingUp} title={t('dash.trend.title')} table={<DataTable head={[t('dash.table.month'), t('dash.average'), t('dash.table.recorded')]} rows={data.map(point => [point.label, formatMean(point.mean, scale) ?? '—', point.recorded])} />}>
        <p className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-gray-800/60 dark:text-slate-400"><span aria-hidden className="text-2xl">📈</span>{t('dash.trend.empty')}</p>
      </ChartCard>
    )
  }

  return (
    <ChartCard
      chartId="trend"
      icon={TrendingUp}
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
        <ChartSlot><TrendChart data={data} scale={scale} colors={colors} showRolling={showRolling} meanName={meanName} rollingName={rollingName} /></ChartSlot>
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
  const latestId = view.summary!.latest_period_id
  const latest = view.periods.find(period => period.period_id === latestId)!
  const periodName = lo ? latest.label_lo : latest.label_en
  const name = (subject: DashboardSubject) => (lo ? subject.name_lo : subject.name_en)
  const atLatest = view.subjects.filter(subject => subject.latest?.period_id === latestId)
  const scored = atLatest
    .filter(subject => subject.latest?.status === 'scored' && subject.latest.value !== null && view.numeric)
    .map(subject => ({ id: subject.subject_enrolment_id, code: subject.code, name: name(subject), value: Number(subject.latest!.value) }))
    .sort((a, b) => b.value - a.value)
  const others = atLatest.filter(subject => subject.latest?.status !== 'scored')
  const min = Number(view.scale.min ?? 0)
  const max = Number(view.scale.max ?? 10)

  return (
    <ChartCard
      chartId="subjects"
      icon={BarChart3}
      color="#6366f1"
      title={t('dash.compare.title', { period: periodName })}
      table={<DataTable head={[t('dash.table.subject'), t('dash.table.score')]}
        rows={[...scored.map(row => [row.name, plainNumber(row.value)]), ...others.map(subject => [name(subject), t(`entry.status.${subject.latest!.status}` as AcademicCopyKey)])]} />}
      footer={others.length > 0 && (
        <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm dark:bg-gray-800/60">
          <p className="flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-400"><span aria-hidden>➖</span>{t('dash.compare.others')}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {others.map(subject => (
              <li key={subject.subject_enrolment_id} className="flex items-center gap-2 rounded-full bg-white py-1 pl-1 pr-3 ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-slate-700">
                <SubjectBadge code={subject.code} name={subject.name_en} size="sm" />{name(subject)} · <span className="text-slate-500 dark:text-slate-400">{t(`entry.status.${subject.latest!.status}` as AcademicCopyKey)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    >
      {scored.length > 0 && (
        <ul role="img" className="space-y-2.5"
          aria-label={`${t('dash.compare.title', { period: periodName })}: ${scored.map(row => `${row.name} ${plainNumber(row.value)}`).join(', ')}`}>
          {scored.map(row => {
            const { color } = subjectVisual(row.code, row.name)
            const share = Math.max(0, Math.min(1, (row.value - min) / ((max - min) || 1)))
            return (
              <li key={row.id} aria-hidden data-subject-bar={row.name} data-value={plainNumber(row.value)} className="flex items-center gap-3">
                <SubjectBadge code={row.code} name={row.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="min-w-0 break-words font-bold">{row.name}</span>
                    <span className="flex items-center gap-1 font-black tabular-nums"><span className="text-xs">{scoreLevel(row.value, view.scale)?.emoji}</span>{plainNumber(row.value)}</span>
                  </div>
                  <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full" style={{ width: `${Math.round(share * 100)}%`, backgroundColor: color }} />
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
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
      <div className="mb-3"><CardTitle icon={Library} color="#6366f1" title={t('dash.subjects.title')} /></div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {subjects.map(subject => (
          <li key={subject.subject_enrolment_id}>
            <button type="button" onClick={() => onOpen(subject.subject_enrolment_id)}
              className="flex w-full items-center gap-3 rounded-2xl bg-slate-50 p-3 text-left ring-1 ring-transparent transition hover:bg-white hover:ring-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:bg-gray-800/60 dark:hover:bg-gray-900 dark:hover:ring-slate-700">
              <SubjectBadge code={subject.code} name={subject.name_en} />
              <span className="min-w-0 flex-1">
                <span className="block break-words font-bold">{lo ? subject.name_lo : subject.name_en}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  {subject.mean !== null ? t('dash.subjects.average', { value: formatMean(subject.mean, view.scale) ?? '', count: subject.window_n }) : t('dash.subjects.fewMonths')}
                </span>
              </span>
              {subject.latest?.status === 'scored' && <ScorePill value={subject.latest.value} scale={view.scale} label={plainNumber(subject.latest.value)} />}
              {subject.change ? <DirectionChip direction={subject.change.direction} /> : <span className="w-7" />}
              <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-slate-400" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function SubjectDetail({ view, subject, periodLabel, onBack }: { view: DashboardView; subject: DashboardSubject; periodLabel: (id: string) => string; onBack: () => void }) {
  const { t, lo } = useAcademicCopy()
  const colors = useSeries()
  const name = lo ? subject.name_lo : subject.name_en
  const visual = subjectVisual(subject.code, subject.name_en)
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
      <div className="flex items-center gap-4 rounded-3xl p-5 ring-1 ring-slate-200 dark:ring-slate-800" style={{ backgroundColor: `${visual.color}14` }}>
        <SubjectBadge code={subject.code} name={subject.name_en} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="break-words text-2xl font-black">{name}</p>
          <div className="mt-1"><ChangeText change={subject.change} periodLabel={periodLabel} scale={view.scale} /></div>
        </div>
        {subject.latest?.status === 'scored' && <ScorePill size="lg" value={subject.latest.value} scale={view.scale} label={plainNumber(subject.latest.value)} />}
      </div>
      <ChartCard
        chartId="subject_detail"
        icon={visual.icon}
        color={visual.color}
        title={t('dash.subject.chart', { subject: name })}
        info={t('dash.oneMonth')}
        subtitle={(
          <span className="flex flex-col gap-1">
            {subject.latest?.status === 'scored' && <span>{t('dash.subject.latest', { value: plainNumber(subject.latest.value), period: periodLabel(subject.latest.period_id) })}</span>}
            <span>{mean !== null ? t('dash.subjects.average', { value: formatMean(mean, view.scale) ?? '', count: subject.window_n }) : t('dash.subjects.fewMonths')}</span>
            <span className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
              <LegendKey color={colors.main} label={scoreName} />
              {mean !== null && <LegendKey color={colors.second} label={t('dash.subject.meanLine')} />}
            </span>
          </span>
        )}
        table={<DataTable head={[t('dash.table.month'), scoreName]} rows={data.map(point => [point.label, point.value === null ? t(`entry.status.${point.status}` as AcademicCopyKey) : plainNumber(point.value)])} />}
      >
        <div className="h-56" role="img" aria-label={`${t('dash.subject.chart', { subject: name })}: ${data.map(point => `${point.label} ${point.value ?? '—'}`).join(', ')}`}>
          <ChartSlot><SubjectChart data={data} scale={view.scale} colors={colors} mean={mean} scoreName={scoreName} /></ChartSlot>
        </div>
      </ChartCard>
      <CompareYears subjectEnrolmentId={subject.subject_enrolment_id} name={name} />
      <ExplanationCard view={view} subject={subject} name={name} />
      <QuizOffer subjectEnrolmentId={subject.subject_enrolment_id} needsAttention={subject.label?.value === 'relatively_lower'} />
      <AskCoachLink subject={name} />
      <SubjectBooks subjectEnrolmentId={subject.subject_enrolment_id} />
    </div>
  )
}

/** LEARN-006: up to 2 in-stock Bookstore titles tagged for the subject; optional, never a next action. */
function SubjectBooks({ subjectEnrolmentId }: { subjectEnrolmentId: string }) {
  const { t } = useAcademicCopy()
  const books = useSubjectBooks(subjectEnrolmentId)
  if (!books.data?.length) return null
  const kip = (value: number) => Number(value).toLocaleString('en')
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-slate-800 sm:p-6">
      <CardTitle emoji="📚" color="#0ea5e9" title={t('books.title')} />
      <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300"><Info aria-hidden className="h-3.5 w-3.5" />{t('books.optional')}</p>
      <ul className="mt-3 grid gap-3">
        {books.data.map(book => (
          <li key={book.book_id} className="flex gap-3 rounded-2xl border border-slate-200 p-3 text-sm dark:border-slate-700">
            {book.cover_image_url && <img src={book.cover_image_url} alt="" className="h-20 w-14 shrink-0 rounded-lg object-cover" />}
            <div className="min-w-0">
              <p className="font-bold">{book.title}</p>
              <p className="text-slate-600 dark:text-slate-400">
                {[book.author, book.language && ['Lao', 'English', 'Thai'].includes(book.language) ? t(`books.lang.${book.language}` as AcademicCopyKey) : book.language,
                  book.price_min !== null ? (book.price_max !== null && book.price_max !== book.price_min ? t('books.price', { min: kip(book.price_min), max: kip(book.price_max) }) : t('books.priceOne', { price: kip(book.price_min) })) : null,
                ].filter(Boolean).join(' · ')}
              </p>
              <Link to={book.route} className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 font-black text-sky-800 hover:bg-sky-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:bg-sky-500/15 dark:text-sky-200">
                <ShoppingBag aria-hidden className="h-4 w-4" />{t('books.open')}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

// ─── Compare school years (DASH-007) ─────────────────────────────────────────

// School-year order: September first.
const MONTH_ORDER = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8]

/** The same subject in another school year, aligned by month; only when the scales can be compared. */
function CompareYears({ subjectEnrolmentId, name }: { subjectEnrolmentId: string; name: string }) {
  const { t, lo } = useAcademicCopy()
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
        <div className="min-w-0 flex-1"><CardTitle icon={CalendarRange} color="#eb6834" title={t('dash.years.title')} /></div>
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
                <ChartSlot><YearsChart data={data} domain={domain} colors={colors} nowName={yearName(current)} beforeName={yearName(other)} /></ChartSlot>
              </div>
            </ChartCard>
          )}
        </div>
      )}
    </section>
  )
}

export default Dashboard
