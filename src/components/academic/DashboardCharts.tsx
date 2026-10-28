import {
  CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { DashboardView } from '@/lib/academic/api'
import { formatMean } from '@/lib/academic/format'
import { useChartTheme } from '@/lib/theme'

// The dashboard's charts, loaded after the summary so recharts is not part of
// the route's initial JS (DASH-006). Titles, legends and table views stay in
// Dashboard.tsx; these draw the plot area only.

type Scale = DashboardView['scale']
export type SeriesColors = { main: string; second: string; grid: string }

/** Five equal steps across the grading scale: 0–10 → 0, 2, 4 … 10. */
function scaleTicks(scale: Scale) {
  const min = Number(scale.min ?? 0)
  const max = Number(scale.max ?? 10)
  return Array.from({ length: 6 }, (_, i) => Math.round((min + ((max - min) * i) / 5) * 100) / 100)
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

/** DASH-002: monthly average, with the 3-month average when shown. */
export function TrendChart({ data, scale, colors, showRolling, meanName, rollingName }: {
  data: { label: string; mean: number | null; rolling: number | null }[]; scale: Scale; colors: SeriesColors; showRolling: boolean; meanName: string; rollingName: string
}) {
  const chart = useChartTheme()
  return (
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
  )
}

/** DASH-003: one subject's scores with its mean as a reference line. */
export function SubjectChart({ data, scale, colors, mean, scoreName }: { data: { label: string; value: number | null }[]; scale: Scale; colors: SeriesColors; mean: number | null; scoreName: string }) {
  const chart = useChartTheme()
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 16, right: 16, bottom: 0, left: -12 }}>
        <CartesianGrid vertical={false} stroke={colors.grid} strokeWidth={1} />
        <XAxis dataKey="label" tick={{ ...chart.tick, fontSize: 12 }} axisLine={{ stroke: chart.axisLine }} tickLine={false} interval="preserveStartEnd" />
        <YAxis domain={[scale.min ?? 0, scale.max ?? 10]} tick={{ ...chart.tick, fontSize: 12 }} axisLine={false} tickLine={false} width={40} ticks={scaleTicks(scale)} interval={0} />
        <Tooltip content={<ValueTooltip scale={scale} />} cursor={{ stroke: chart.axisLine, strokeWidth: 1 }} />
        {mean !== null && (
          <ReferenceLine y={mean} stroke={colors.second} strokeWidth={2} />
        )}
        <Line type="linear" dataKey="value" name={scoreName} stroke={colors.main} strokeWidth={2} connectNulls={false} isAnimationActive={false}
          dot={{ r: 4, fill: colors.main, stroke: chart.surface, strokeWidth: 2 }} activeDot={{ r: 6, stroke: chart.surface, strokeWidth: 2 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

/** DASH-007: this year (solid) and another year (dashed), aligned by month. */
export function YearsChart({ data, domain, colors, nowName, beforeName }: { data: { label: string; now: number | null; before: number | null }[]; domain: [number, number]; colors: SeriesColors; nowName: string; beforeName: string }) {
  const chart = useChartTheme()
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 16, right: 16, bottom: 0, left: -12 }}>
        <CartesianGrid vertical={false} stroke={colors.grid} strokeWidth={1} />
        <XAxis dataKey="label" tick={{ ...chart.tick, fontSize: 12 }} axisLine={{ stroke: chart.axisLine }} tickLine={false} interval="preserveStartEnd" />
        <YAxis domain={domain} tick={{ ...chart.tick, fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
        <Line type="linear" dataKey="now" name={nowName} stroke={colors.main} strokeWidth={2} connectNulls={false} isAnimationActive={false}
          dot={{ r: 4, fill: colors.main, stroke: chart.surface, strokeWidth: 2 }} />
        <Line type="linear" dataKey="before" name={beforeName} stroke={colors.second} strokeWidth={2} strokeDasharray="5 4" connectNulls={false} isAnimationActive={false}
          dot={{ r: 4, fill: colors.second, stroke: chart.surface, strokeWidth: 2 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
