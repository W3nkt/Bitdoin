import { useState, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { useOcrQuality } from '@/lib/academic/adminApi'
import { Empty, Panel, Pill, adminErrorText } from './AdminKit'

// Score-book scanning quality (ADMIN-008, #48; migration 140): failures,
// corrections students made before confirming, latency and cost by model and
// prompt version. Reused duplicate scans are left out (no model call).

const percent = (value: number | null | undefined) => (value === null || value === undefined ? '—' : `${(value * 100).toFixed(1)}%`)
const seconds = (ms: number | null) => (ms === null ? '—' : `${(ms / 1000).toFixed(1)} s`)

function Tile({ label, value, note, alert }: { label: string; value: ReactNode; note: string; alert?: boolean }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-slate-700">
      <p className="flex items-center gap-2 text-xs font-black text-slate-600 dark:text-slate-400">{label}{alert && <Pill tone="red">Alert</Pill>}</p>
      <p className="mt-2 text-3xl font-black tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{note}</p>
    </div>
  )
}

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div tabIndex={0} className="overflow-x-auto">
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

export function OcrQualityAdmin() {
  const [days, setDays] = useState(30)
  const quality = useOcrQuality(days)

  if (quality.isPending) return <Skeleton className="h-96 rounded-2xl" />
  if (quality.isError) return <Empty>{adminErrorText(quality.error)}</Empty>
  const data = quality.data
  const week = data.last_7_days
  const limits = week.thresholds

  return (
    <div className="space-y-5">
      {week.alerts.length > 0 && (
        <p role="alert" className="flex items-start gap-2 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-800 dark:bg-red-500/10 dark:text-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {week.alerts.map(alert => alert === 'correction_rate'
            ? `Students corrected more than ${percent(limits.correction_rate)} of values in the last 7 days.`
            : `More than ${percent(limits.failure_rate)} of scans failed in the last 7 days.`).join(' ')}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Scans, last 7 days" value={week.jobs.toLocaleString('en')} note="Sent to the model; reused duplicates not counted" />
        <Tile label="Failure rate" value={percent(week.failure_rate)} alert={week.alerts.includes('failure_rate')}
          note={`Alert above ${percent(limits.failure_rate)} with ${limits.min_jobs ?? 10}+ scans; abandoned scans not counted`} />
        <Tile label="Correction rate" value={percent(week.correction_rate)} alert={week.alerts.includes('correction_rate')}
          note={`Values changed before confirming (${week.edited}/${week.fields}); alert above ${percent(limits.correction_rate)} with ${limits.min_fields ?? 20}+ values`} />
        <Tile label="Confirmed values" value={week.fields.toLocaleString('en')} note="Reviewed by students in the last 7 days" />
      </div>

      <Panel title="By day and model" description="Latency is from receiving the photo to saving the result."
        actions={(
          <label className="flex items-center gap-2 text-sm font-bold">
            Period
            <select value={days} onChange={event => setDays(Number(event.target.value))} className="rounded-xl border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-600 dark:bg-gray-950">
              {[7, 30, 90].map(value => <option key={value} value={value}>{value} days</option>)}
            </select>
          </label>
        )}>
        {data.daily.length === 0 ? <Empty>No scans in this period.</Empty> : (
          <Table head={['Day', 'Model', 'Prompt', 'Scans', 'Failed', 'Abandoned', 'Confirmed', 'p50', 'p95', 'Cost (USD)']}
            rows={data.daily.map(row => [row.day, row.model_id, row.prompt_version, row.jobs, row.failed, row.abandoned, row.confirmed,
              seconds(row.latency_p50_ms), seconds(row.latency_p95_ms), row.cost_usd.toFixed(4)])} />
        )}
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Corrections by subject" description="Share of confirmed values the student changed from what was read.">
          {data.subjects.length === 0 ? <Empty>No confirmed scans yet.</Empty> : (
            <Table head={['Subject', 'Values', 'Changed', 'Correction rate']}
              rows={data.subjects.map(row => [row.subject_code, row.fields, row.edited, percent(row.correction_rate)])} />
          )}
        </Panel>
        <Panel title="Failures by reason">
          {data.errors.length === 0 ? <Empty>No failed scans.</Empty> : (
            <Table head={['Reason', 'Scans']} rows={data.errors.map(row => [row.error_code ?? 'unknown', row.count])} />
          )}
        </Panel>
      </div>
    </div>
  )
}
