import { type ReactNode } from 'react'
import { Info } from 'lucide-react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Skeleton } from '@/components/ui/Skeleton'
import { useUsageMetrics, type UsageMetrics } from '@/lib/academic/adminApi'
import { useChartTheme, useTheme } from '@/lib/theme'
import { Empty, Panel, adminErrorText, formatDateTime } from './AdminKit'
import { ChartPanel, SERIES } from './HealthAdmin'

// MVP metrics (ANL-002, #45; PRD §32.2). Aggregates of usage events only:
// students who switched statistics off are not counted, groups under 20 are
// hidden, and nothing here claims Schooling caused a change (§32.4).

const SMALL = 'Fewer than 20 students: hidden'
const count = (value: number | null) => (value === null ? <span title={SMALL}>&lt;20</span> : value.toLocaleString('en'))
const rate = (value: number | null, pending = false) =>
  pending ? <span className="text-slate-500">not yet</span> : value === null ? <span title={SMALL} className="text-slate-500">—</span> : `${(value * 100).toFixed(1)}%`
const minutes = (ms: number | null) => (ms === null ? <span title={SMALL} className="text-slate-500">—</span> : `${(ms / 60_000).toFixed(1)} min`)
const monthLabel = (key: string) => new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' }).format(new Date(`${key}-01T00:00:00`))
const weekLabel = (key: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(`${key}T00:00:00`))

const last = <T,>(items: T[]): T | undefined => items[items.length - 1]

const SOURCES: Record<string, string> = {
  academy_menu: 'Academy menu', profile_link: 'Profile page link', reminder: 'Reminder', direct: 'Direct visit or bookmark', other: 'Other link',
}

function Tile({ label, value, note }: { label: string; value: ReactNode; note: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-slate-700">
      <p className="text-xs font-black text-slate-600 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-black tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{note}</p>
    </div>
  )
}

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
          <tr>{head.map(cell => <th key={cell} className="py-2 pr-4 last:pr-0">{cell}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100 tabular-nums dark:divide-slate-800">
          {rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j} className="py-2 pr-4 last:pr-0">{cell}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  )
}

function StudentsChart({ months }: { months: UsageMetrics['months'] }) {
  const chart = useChartTheme()
  const colors = SERIES[useTheme(state => state.theme) === 'dark' ? 'dark' : 'light']
  const data = months.map(month => ({ label: monthLabel(month.month), recording: month.recording_students, active: month.active_students }))
  const table = (
    <Table head={['Month', 'Recording students', 'Active students']}
      rows={months.map(month => [monthLabel(month.month) + (month.complete ? '' : ' (so far)'), count(month.recording_students), count(month.active_students)])} />
  )
  return (
    <ChartPanel title="Students per month" description="Recording: at least one submitted month of scores (North Star). Active: opened Schooling at least once. Months under 20 students are left out of the chart." table={table}>
      {!data.some(point => point.recording !== null || point.active !== null) ? <Empty>Not enough students yet. A month appears once 20 or more students are counted.</Empty> : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={colors.grid} />
            <XAxis dataKey="label" tick={{ ...chart.tick, fontSize: 12 }} axisLine={{ stroke: chart.axisLine }} tickLine={false} />
            <YAxis tick={{ ...chart.tick, fontSize: 12 }} axisLine={false} tickLine={false} width={48} allowDecimals={false} />
            <Tooltip contentStyle={chart.tooltip.contentStyle} itemStyle={chart.tooltip.itemStyle} labelStyle={chart.tooltip.labelStyle} cursor={{ stroke: chart.axisLine, strokeWidth: 1 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="linear" dataKey="recording" name="Recording students" stroke={colors.read} strokeWidth={2} dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />
            <Line type="linear" dataKey="active" name="Active students" stroke={colors.write} strokeWidth={2} dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartPanel>
  )
}

const DEFINITIONS: Array<[string, string]> = [
  ['Recording students (North Star)', 'Distinct students with at least one submitted month of scores in the calendar month.'],
  ['Active students', 'Distinct students who opened Schooling at least once in the month (a session starts after 30 minutes without activity).'],
  ['Onboarding completion', 'Set-ups completed ÷ set-ups started in the week. Starts are anonymous counts, so a student who opens set-up twice counts twice.'],
  ['First-entry rate', 'Of the profiles created in the week, the share whose first submission came within 7 days. Final once the last profile of the week has had its 7 days.'],
  ['Second-month recording', 'Of the students whose first submission was in the previous month, the share who submitted again this month.'],
  ['Dashboard used twice', 'Active students who opened the dashboard at least twice in the month ÷ active students.'],
  ['Period completion', 'Monthly periods that ended in the month with submitted scores ÷ periods expected for active enrolments (students with statistics on only).'],
  ['Entry time', 'Median time from opening a month to submitting it.'],
  ['Returning M1 / M3', 'Of the students who created a profile in the month, the share active one month / three months later.'],
  ['Usefulness rating', 'Not collected yet: Phase 1 has no rating prompt.'],
]

/** The Metrics tab: activation, recording, retention and funnel (PRD §32.2). */
export function MetricsAdmin() {
  const metrics = useUsageMetrics()
  if (metrics.isPending) return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
  if (metrics.isError) return <Empty>{adminErrorText(metrics.error)}</Empty>
  const view = metrics.data
  const lastMonth = last(view.months.filter(month => month.complete))
  const thisMonth = last(view.months)
  const lastFinalWeek = last(view.weeks.filter(week => week.first_entry_final))
  const recentWeeks = view.weeks.slice(-4)
  const started = recentWeeks.reduce((sum, week) => sum + (week.onboarding_started ?? 0), 0)

  return (
    <div className="grid gap-6">
      <p className="flex items-start gap-2 rounded-2xl bg-white p-4 text-sm text-slate-700 shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:text-slate-300 dark:ring-slate-700">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>
          Counted since {view.tracking_since ? formatDateTime(view.tracking_since) : 'the first event (none yet)'}, Laos time. Students with usage statistics on: {count(view.statistics.on)}; off: {count(view.statistics.off)}.
          Groups under {view.min_group} students are hidden. These figures describe what students did; they do not show that Schooling caused any change.
        </span>
      </p>

      <section aria-label="Headline metrics" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label={`Recording students, ${lastMonth ? monthLabel(lastMonth.month) : 'last month'}`} value={lastMonth ? count(lastMonth.recording_students) : '—'}
          note={`This month so far: ${thisMonth?.recording_students === null ? '<20' : thisMonth?.recording_students ?? 0}`} />
        <Tile label={`Active students, ${lastMonth ? monthLabel(lastMonth.month) : 'last month'}`} value={lastMonth ? count(lastMonth.active_students) : '—'}
          note="Opened Schooling at least once" />
        <Tile label="Onboarding completion, last 4 weeks" value={rate(started >= 20 ? recentWeeks.reduce((sum, week) => sum + (week.onboarding_completed ?? 0), 0) / started : null)}
          note={`${started < 20 ? '<20' : started} set-ups started`} />
        <Tile label={`First entry within 7 days, week of ${lastFinalWeek ? weekLabel(lastFinalWeek.week_start) : '—'}`} value={rate(lastFinalWeek?.first_entry_rate ?? null)}
          note={`${lastFinalWeek ? (lastFinalWeek.first_entry_cohort === null ? '<20' : lastFinalWeek.first_entry_cohort) : 0} new profiles`} />
      </section>

      <StudentsChart months={view.months} />

      <Panel title="Weekly funnel" description="New profiles and set-up by week (Monday start). First-entry rates become final two weeks after the week starts.">
        <Table head={['Week of', 'New profiles', 'Set-ups started', 'Completed', 'Completion', 'First entry ≤ 7 days']}
          rows={view.weeks.map(week => [weekLabel(week.week_start), count(week.profiles_created), count(week.onboarding_started), count(week.onboarding_completed),
            rate(week.onboarding_rate), rate(week.first_entry_rate, !week.first_entry_final)])} />
      </Panel>

      <Panel title="Monthly recording" description="How recording keeps going. The current month is partial.">
        <Table head={['Month', 'Recording', 'Second-month recording', 'Period completion', 'Dashboard used twice', 'Entry time (median)']}
          rows={view.months.map(month => [monthLabel(month.month) + (month.complete ? '' : ' (so far)'), count(month.recording_students), rate(month.second_month_rate),
            rate(month.period_completion_rate), rate(month.dashboard_twice_rate), minutes(month.entry_duration_p50_ms)])} />
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Returning students" description="By the month the profile was created: share active one and three months later.">
          <Table head={['Joined', 'Students', 'Month 1', 'Month 3']}
            rows={view.cohorts.map(cohort => [monthLabel(cohort.month), count(cohort.size), rate(cohort.m1_rate, !cohort.m1_due), rate(cohort.m3_rate, !cohort.m3_due)])} />
        </Panel>
        <Panel title="Where new students came from" description="Profiles created in the last 90 days, by how they reached Schooling.">
          {view.sources.length === 0 ? <Empty>No new profiles in the last 90 days.</Empty> : (
            <Table head={['Source', 'Profiles', 'Share']} rows={view.sources.map(source => [SOURCES[source.source] ?? source.source, count(source.profiles), rate(source.share)])} />
          )}
          {view.grades.length > 0 && (
            <div className="mt-5">
              <p className="mb-1 text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Recording this month, by grade</p>
              <Table head={['Grade', 'Students']} rows={view.grades.map(grade => [grade.grade_code, count(grade.recording_students)])} />
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Definitions" description="As in PRD §32.2. Targets are set after the pilot (§32.5).">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          {DEFINITIONS.map(([term, text]) => (
            <div key={term}><dt className="font-black">{term}</dt><dd className="mt-0.5 text-slate-600 dark:text-slate-400">{text}</dd></div>
          ))}
        </dl>
      </Panel>
    </div>
  )
}
