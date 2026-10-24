import { useState, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, CircleDashed, Mail, XCircle } from 'lucide-react'
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { useHealth, useTestAlert, type HealthView } from '@/lib/academic/adminApi'
import { useChartTheme, useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { Empty, Panel, adminErrorText, formatDateTime } from './AdminKit'

// Service levels for Schooling (OPS-002, NFR-001/002/005/017; migration 122).
// Colours are the validated dataviz pair already used by the student charts.
const SERIES = {
  light: { read: '#2a78d6', write: '#eb6834', grid: '#e5e7eb' },
  dark: { read: '#3987e5', write: '#d95926', grid: '#1f2937' },
}

type Verdict = 'met' | 'missed' | 'no-data'

function Status({ verdict }: { verdict: Verdict }) {
  const config = {
    met: { icon: CheckCircle2, label: 'Met', tone: 'text-emerald-700 dark:text-emerald-400' },
    missed: { icon: XCircle, label: 'Missed', tone: 'text-red-700 dark:text-red-400' },
    'no-data': { icon: CircleDashed, label: 'Not enough data', tone: 'text-slate-600 dark:text-slate-400' },
  }[verdict]
  return <span className={cn('inline-flex items-center gap-1 text-xs font-black', config.tone)}><config.icon className="h-4 w-4" aria-hidden />{config.label}</span>
}

function Tile({ label, value, target, verdict, note }: { label: string; value: string; target: string; verdict: Verdict; note: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-slate-700">
      <p className="text-xs font-black text-slate-600 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-black tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Target {target} · {note}</p>
      <div className="mt-3"><Status verdict={verdict} /></div>
    </div>
  )
}

const ms = (value: number | null) => (value === null ? '—' : value >= 1000 ? `${(value / 1000).toFixed(1)} s` : `${Math.round(value)} ms`)
const pct = (value: number | null) => (value === null ? '—' : `${(value * 100).toFixed(2)}%`)
const hourLabel = (iso: string) => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Vientiane' }).format(new Date(iso))

function verdict(value: number | null, target: number, lowerIsBetter: boolean, enough: boolean): Verdict {
  if (value === null || !enough) return 'no-data'
  return (lowerIsBetter ? value <= target : value >= target) ? 'met' : 'missed'
}

function ChartPanel({ title, description, table, children }: { title: string; description: string; table: ReactNode; children: ReactNode }) {
  const [asTable, setAsTable] = useState(false)
  return (
    <Panel title={title} description={description}
      actions={<Button size="sm" variant="ghost" aria-pressed={asTable} onClick={() => setAsTable(value => !value)}>{asTable ? 'Show chart' : 'Show table'}</Button>}>
      {asTable ? <div className="max-h-80 overflow-auto">{table}</div> : <div className="h-64">{children}</div>}
    </Panel>
  )
}

function LatencyChart({ view }: { view: HealthView }) {
  const chart = useChartTheme()
  const colors = SERIES[useTheme(state => state.theme) === 'dark' ? 'dark' : 'light']
  const data = view.series.map(point => ({ ...point, label: hourLabel(point.hour) }))
  const hasData = data.some(point => point.read_p95_ms !== null || point.write_p95_ms !== null)
  const table = (
    <table className="w-full text-left text-sm">
      <thead className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400"><tr><th className="py-1 pr-4">Hour (Laos)</th><th className="py-1 pr-4">Read p95</th><th className="py-1">Write p95</th></tr></thead>
      <tbody className="divide-y divide-slate-100 tabular-nums dark:divide-slate-800">
        {data.map(point => <tr key={point.hour}><td className="py-1 pr-4">{point.label}</td><td className="py-1 pr-4">{ms(point.read_p95_ms)}</td><td className="py-1">{ms(point.write_p95_ms)}</td></tr>)}
      </tbody>
    </table>
  )
  return (
    <ChartPanel title="Server response time, last 48 hours" description={`Estimated p95 per hour. Targets: reads ${view.targets.read_p95_ms} ms, writes ${view.targets.write_p95_ms} ms (dashed).`} table={table}>
      {!hasData ? <Empty>No server timings yet. They appear within 10 minutes of students using Schooling.</Empty> : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={colors.grid} />
            <XAxis dataKey="label" tick={{ ...chart.tick, fontSize: 12 }} axisLine={{ stroke: chart.axisLine }} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
            <YAxis tick={{ ...chart.tick, fontSize: 12 }} axisLine={false} tickLine={false} width={64} tickFormatter={(value: number) => `${value} ms`} />
            <Tooltip contentStyle={chart.tooltip.contentStyle} itemStyle={chart.tooltip.itemStyle} labelStyle={chart.tooltip.labelStyle}
              formatter={(value: number) => ms(value)} cursor={{ stroke: chart.axisLine, strokeWidth: 1 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine y={view.targets.read_p95_ms} stroke={colors.read} strokeDasharray="4 4" ifOverflow="extendDomain" />
            <ReferenceLine y={view.targets.write_p95_ms} stroke={colors.write} strokeDasharray="4 4" ifOverflow="extendDomain" />
            <Line type="linear" dataKey="read_p95_ms" name="Reads p95" stroke={colors.read} strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />
            <Line type="linear" dataKey="write_p95_ms" name="Writes p95" stroke={colors.write} strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartPanel>
  )
}

function ErrorChart({ view }: { view: HealthView }) {
  const chart = useChartTheme()
  const colors = SERIES[useTheme(state => state.theme) === 'dark' ? 'dark' : 'light']
  const data = view.series.map(point => ({
    label: hourLabel(point.hour), hour: point.hour, calls: point.calls, server_errors: point.server_errors,
    error_rate: point.calls > 0 ? Math.round((point.server_errors / point.calls) * 10000) / 100 : null,
  }))
  const budget = Math.round((1 - view.targets.availability) * 10000) / 100
  const table = (
    <table className="w-full text-left text-sm">
      <thead className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400"><tr><th className="py-1 pr-4">Hour (Laos)</th><th className="py-1 pr-4">Calls</th><th className="py-1 pr-4">Server errors</th><th className="py-1">Error rate</th></tr></thead>
      <tbody className="divide-y divide-slate-100 tabular-nums dark:divide-slate-800">
        {data.map(point => <tr key={point.hour}><td className="py-1 pr-4">{point.label}</td><td className="py-1 pr-4">{point.calls}</td><td className="py-1 pr-4">{point.server_errors}</td><td className="py-1">{point.error_rate === null ? '—' : `${point.error_rate}%`}</td></tr>)}
      </tbody>
    </table>
  )
  return (
    <ChartPanel title="Server errors, last 48 hours" description={`Share of calls that failed on the server, per hour. The ${budget}% line is the availability target (${pct(view.targets.availability)}).`} table={table}>
      {!data.some(point => point.calls > 0) ? <Empty>No calls reported yet.</Empty> : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={colors.grid} />
            <XAxis dataKey="label" tick={{ ...chart.tick, fontSize: 12 }} axisLine={{ stroke: chart.axisLine }} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
            <YAxis tick={{ ...chart.tick, fontSize: 12 }} axisLine={false} tickLine={false} width={48} allowDecimals tickFormatter={(value: number) => `${Number(value.toFixed(1))}%`} />
            <Tooltip contentStyle={chart.tooltip.contentStyle} itemStyle={chart.tooltip.itemStyle} labelStyle={chart.tooltip.labelStyle}
              formatter={(value: number) => `${value}%`} cursor={{ stroke: chart.axisLine, strokeWidth: 1 }} />
            <ReferenceLine y={budget} stroke={chart.axisLine} strokeDasharray="4 4" ifOverflow="extendDomain" />
            <Line type="linear" dataKey="error_rate" name="Server error rate" stroke={colors.read} strokeWidth={2} dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartPanel>
  )
}

/** The Health tab: are the service levels met, are the jobs running, do alerts arrive. */
export function HealthAdmin() {
  const toast = useToast()
  const health = useHealth()
  const testAlert = useTestAlert()

  if (health.isPending) return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-36 rounded-2xl" />)}</div>
  if (health.isError) return <Empty>{adminErrorText(health.error)}</Empty>
  const view = health.data
  const t = view.targets
  const enough = (calls: number) => calls >= t.min_calls

  return (
    <div className="grid gap-6">
      <section aria-label="Service levels" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Availability, 30 days" value={pct(view.month.availability)} target={pct(t.availability)}
          verdict={verdict(view.month.availability, t.availability, false, enough(view.month.calls))} note={`${view.month.calls.toLocaleString('en')} calls`} />
        <Tile label="Reads p95, last hour" value={ms(view.hour.read_p95_ms)} target={ms(t.read_p95_ms)}
          verdict={verdict(view.hour.read_p95_ms, t.read_p95_ms, true, enough(view.hour.read_calls))} note="server time" />
        <Tile label="Writes p95, last hour" value={ms(view.hour.write_p95_ms)} target={ms(t.write_p95_ms)}
          verdict={verdict(view.hour.write_p95_ms, t.write_p95_ms, true, enough(view.hour.write_calls))} note="server time" />
        <Tile label="Dashboard loads p75, 24 h" value={ms(view.day.dashboard_p75_ms)} target={ms(t.dashboard_p75_ms)}
          verdict={verdict(view.day.dashboard_p75_ms, t.dashboard_p75_ms, true, enough(view.day.dashboard_loads))} note={`${view.day.dashboard_loads} loads, students' devices`} />
      </section>

      <LatencyChart view={view} />
      <ErrorChart view={view} />

      <Panel title="Scheduled jobs" description="Reminders, push delivery, deletions, clean-up and monitoring. A failed or late job raises an alert.">
        {view.jobs.length === 0 ? <Empty>No jobs found.</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400"><tr><th className="py-2 pr-4">Job</th><th className="py-2 pr-4">Schedule (UTC)</th><th className="py-2 pr-4">Last run</th><th className="py-2 pr-4">Result</th><th className="py-2">Failed, 24 h</th></tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {view.jobs.map(job => (
                  <tr key={job.job}>
                    <td className="py-2 pr-4 font-mono text-xs">{job.job}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{job.schedule}</td>
                    <td className="py-2 pr-4">{formatDateTime(job.last_run)}</td>
                    <td className="py-2 pr-4"><Status verdict={job.last_status === 'succeeded' ? 'met' : job.last_status ? 'missed' : 'no-data'} /></td>
                    <td className="py-2 tabular-nums">{job.failed_24h}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">Push reminders waiting to be sent: <span className="font-bold tabular-nums">{view.pending_push}</span></p>
      </Panel>

      <Panel title="Alert e-mails" description="Every alert is e-mailed to the on-call address within 5 minutes. Review and acknowledge alerts on the Audit log tab."
        actions={<Button size="sm" variant="outline" icon={<Mail className="h-4 w-4" />} loading={testAlert.isPending}
          onClick={() => testAlert.mutate(undefined, {
            onSuccess: result => result?.skipped ? toast.error(`Not sent: ${result.skipped}`)
              : result?.sent ? toast.success('Test alert sent. Check the on-call inbox.')
              : toast.error('The test alert was queued but not sent. See the error below.'),
            onError: error => toast.error(adminErrorText(error)),
          })}>Send test alert</Button>}>
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div><dt className="text-xs font-black text-slate-500 dark:text-slate-400">Open alerts</dt><dd className="mt-0.5 text-xl font-black tabular-nums">{view.alerts.open}</dd></div>
          <div><dt className="text-xs font-black text-slate-500 dark:text-slate-400">Could not be e-mailed</dt><dd className="mt-0.5 text-xl font-black tabular-nums">{view.alerts.unsent}</dd></div>
          <div className="sm:col-span-1"><dt className="text-xs font-black text-slate-500 dark:text-slate-400">Last e-mail error</dt>
            <dd className="mt-0.5 break-words">{view.alerts.last_error
              ? <span className="inline-flex items-start gap-1 text-red-700 dark:text-red-400"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{view.alerts.last_error}</span>
              : 'None'}</dd></div>
        </dl>
      </Panel>
    </div>
  )
}
