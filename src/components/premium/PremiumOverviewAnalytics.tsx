import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarRange,
  CheckCircle2,
  Clock3,
  Crown,
  Minus,
  ReceiptText,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { supabase } from '@/lib/supabase'
import { firstRelation } from '@/lib/supabaseRelations'
import { useChartTheme } from '@/lib/theme'
import { premiumText } from '@/i18n/premium'
import { cn, formatPrice } from '@/lib/utils'

type Currency = Parameters<typeof formatPrice>[1]
type RangeKey = '7d' | '30d' | '90d' | '6m' | '1y' | 'ytd' | 'all' | 'custom'
type Granularity = 'day' | 'week' | 'month'

const DAY_MS = 24 * 60 * 60 * 1000

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: '90d', label: '3 months' },
  { key: '6m', label: '6 months' },
  { key: '1y', label: '12 months' },
  { key: 'ytd', label: 'This year' },
  { key: 'all', label: 'All time' },
  { key: 'custom', label: 'Custom' },
]

export interface AnalyticsSubscription {
  id: string
  user_id: string
  status: string
  starts_at?: string | null
  ends_at?: string | null
  created_at: string
  plan?: { price_lak: number } | null
}

interface AnalyticsPayment {
  id: string
  amount_lak: number
  status: 'PENDING' | 'REQUIRES_REVIEW' | 'VERIFIED' | 'REJECTED' | 'REFUNDED'
  created_at: string
  plan_name: string
}

interface Period {
  start: Date
  end: Date
  /** The equally long window right before `start`; null for All time. */
  previousStart: Date | null
  granularity: Granularity
}

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS)
}

function inputDate(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000)
  return local.toISOString().slice(0, 10)
}

function granularityFor(days: number): Granularity {
  if (days <= 35) return 'day'
  if (days <= 190) return 'week'
  return 'month'
}

function resolvePeriod(range: RangeKey, customFrom: string, customTo: string, earliest: Date | null): Period {
  const end = addDays(startOfDay(new Date()), 1)
  let start: Date
  switch (range) {
    case '7d': start = addDays(end, -7); break
    case '30d': start = addDays(end, -30); break
    case '90d': start = addDays(end, -90); break
    case '6m': start = addDays(end, -182); break
    case '1y': start = addDays(end, -365); break
    case 'ytd': start = new Date(end.getFullYear(), 0, 1); break
    case 'all': start = startOfDay(earliest ?? addDays(end, -365)); break
    case 'custom': {
      const from = customFrom ? startOfDay(new Date(`${customFrom}T00:00:00`)) : addDays(end, -30)
      const to = customTo ? addDays(startOfDay(new Date(`${customTo}T00:00:00`)), 1) : end
      const ordered = from < to ? [from, to] : [addDays(to, -1), addDays(from, 1)]
      const days = Math.max(1, Math.round((ordered[1].getTime() - ordered[0].getTime()) / DAY_MS))
      return { start: ordered[0], end: ordered[1], previousStart: addDays(ordered[0], -days), granularity: granularityFor(days) }
    }
  }
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY_MS))
  return {
    start,
    end,
    previousStart: range === 'all' ? null : addDays(start, -days),
    granularity: granularityFor(days),
  }
}

function bucketStart(date: Date, granularity: Granularity) {
  const day = startOfDay(date)
  if (granularity === 'day') return day
  if (granularity === 'week') return addDays(day, -((day.getDay() + 6) % 7))
  return new Date(day.getFullYear(), day.getMonth(), 1)
}

function nextBucket(date: Date, granularity: Granularity) {
  if (granularity === 'day') return addDays(date, 1)
  if (granularity === 'week') return addDays(date, 7)
  return new Date(date.getFullYear(), date.getMonth() + 1, 1)
}

function buckets(start: Date, end: Date, granularity: Granularity) {
  const result: Date[] = []
  for (let cursor = bucketStart(start, granularity); cursor < end; cursor = nextBucket(cursor, granularity)) {
    result.push(cursor)
  }
  return result
}

/** Short axis label: "12/10" for days and weeks, "Oct 26" for months. */
function bucketTick(date: Date, granularity: Granularity, locale: string) {
  if (granularity === 'month') return date.toLocaleDateString(locale, { month: 'short', year: '2-digit' })
  return `${date.getDate()}/${date.getMonth() + 1}`
}

/** Full label for the tooltip. */
function bucketTitle(date: Date, end: Date, granularity: Granularity, locale: string) {
  if (granularity === 'month') return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
  if (granularity === 'day') return date.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  const last = addDays(end, -1)
  return `${date.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} – ${last.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}`
}

/** Round a chart's top value up to 1, 2, 2.5 or 5 × 10ⁿ so the ticks are tidy. */
function niceMax(max: number, minimum: number) {
  const value = Math.max(max, minimum)
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const step = [1, 2, 2.5, 5, 10].find(candidate => candidate * magnitude >= value) ?? 10
  return step * magnitude
}

function useIsNarrow(query = '(max-width: 640px)') {
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches)
  useEffect(() => {
    const media = window.matchMedia?.(query)
    if (!media) return
    const onChange = () => setNarrow(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [query])
  return narrow
}

function compactNumber(value: number) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null
  return ((current - previous) / previous) * 100
}

/** A membership counts as held at `at` once it started and until it ended. */
function heldAt(subscription: AnalyticsSubscription, at: number) {
  if (subscription.status !== 'ACTIVE' && subscription.status !== 'EXPIRED') return false
  const started = new Date(subscription.starts_at ?? subscription.created_at).getTime()
  const ended = subscription.ends_at ? new Date(subscription.ends_at).getTime() : Infinity
  return started <= at && at < ended
}

function activeMembersAt(subscriptions: AnalyticsSubscription[], at: number) {
  const users = new Set<string>()
  for (const subscription of subscriptions) {
    if (heldAt(subscription, at)) users.add(subscription.user_id)
  }
  return users.size
}

export function PremiumOverviewAnalytics({
  subscriptions,
  reviewCount,
  dailyPosts,
  currency,
  language,
}: {
  subscriptions: AnalyticsSubscription[]
  reviewCount: number
  dailyPosts: number
  currency: Currency
  language: 'lo' | 'en'
}) {
  const chart = useChartTheme()
  const t = (value: string) => premiumText(language, value)
  const narrow = useIsNarrow()
  const locale = language === 'lo' ? 'lo-LA' : 'en-GB'
  const [range, setRange] = useState<RangeKey>('30d')
  const [customFrom, setCustomFrom] = useState(() => inputDate(addDays(new Date(), -30)))
  const [customTo, setCustomTo] = useState(() => inputDate(new Date()))

  // Each member's first membership marks when they joined.
  const joinedAt = useMemo(() => {
    const first = new Map<string, number>()
    for (const subscription of subscriptions) {
      const at = new Date(subscription.created_at).getTime()
      const known = first.get(subscription.user_id)
      if (known === undefined || at < known) first.set(subscription.user_id, at)
    }
    return first
  }, [subscriptions])

  const earliest = useMemo(() => {
    let min = Infinity
    for (const at of joinedAt.values()) min = Math.min(min, at)
    return Number.isFinite(min) ? new Date(min) : null
  }, [joinedAt])

  const period = useMemo(
    () => resolvePeriod(range, customFrom, customTo, earliest),
    [range, customFrom, customTo, earliest],
  )
  const fetchFrom = period.previousStart ?? period.start

  const { data: payments, isLoading: paymentsLoading, error: paymentsError } = useQuery({
    queryKey: ['premium-admin', 'analytics-payments', range === 'all' ? 'all' : fetchFrom.toISOString(), period.end.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from('premium_payments')
        .select('id,amount_lak,status,created_at,plan:premium_plans(name)')
        .lt('created_at', period.end.toISOString())
        .order('created_at', { ascending: true })
        .limit(10000)
      if (range !== 'all') query = query.gte('created_at', fetchFrom.toISOString())
      const { data, error } = await query
      if (error) throw error
      return (data ?? []).map(row => ({
        id: row.id,
        amount_lak: Number(row.amount_lak || 0),
        status: row.status,
        created_at: row.created_at,
        plan_name: firstRelation(row.plan)?.name ?? 'Unknown',
      })) as AnalyticsPayment[]
    },
  })

  const stats = useMemo(() => {
    const startMs = period.start.getTime()
    const endMs = period.end.getTime()
    const prevMs = period.previousStart?.getTime() ?? null
    const inCurrent = (at: number) => at >= startMs && at < endMs
    const inPrevious = (at: number) => prevMs !== null && at >= prevMs && at < startMs

    const current = (payments ?? []).filter(payment => inCurrent(new Date(payment.created_at).getTime()))
    const previous = (payments ?? []).filter(payment => inPrevious(new Date(payment.created_at).getTime()))
    const verified = current.filter(payment => payment.status === 'VERIFIED')
    const previousVerified = previous.filter(payment => payment.status === 'VERIFIED')
    const revenue = verified.reduce((sum, payment) => sum + payment.amount_lak, 0)
    const previousRevenue = previousVerified.reduce((sum, payment) => sum + payment.amount_lak, 0)
    const rejected = current.filter(payment => payment.status === 'REJECTED').length
    const pending = current.filter(payment => payment.status === 'PENDING' || payment.status === 'REQUIRES_REVIEW').length
    const refunded = current.filter(payment => payment.status === 'REFUNDED').length
    const decided = verified.length + rejected
    const approvalRate = decided ? (verified.length / decided) * 100 : null

    let newMembers = 0
    let previousNewMembers = 0
    for (const at of joinedAt.values()) {
      if (inCurrent(at)) newMembers += 1
      else if (inPrevious(at)) previousNewMembers += 1
    }

    const now = Math.min(Date.now(), endMs - 1)
    const activeNow = activeMembersAt(subscriptions, now)
    const activeAtStart = activeMembersAt(subscriptions, startMs)
    const paidActiveNow = new Set(
      subscriptions
        .filter(subscription => heldAt(subscription, now) && Number(subscription.plan?.price_lak ?? 0) > 0)
        .map(subscription => subscription.user_id),
    ).size

    // Memberships whose paid access ran out in the window and were not renewed.
    const expired = subscriptions.filter(subscription => {
      if (!subscription.ends_at || Number(subscription.plan?.price_lak ?? 0) <= 0) return false
      const ended = new Date(subscription.ends_at).getTime()
      return inCurrent(ended) && ended <= Date.now()
        && (subscription.status === 'ACTIVE' || subscription.status === 'EXPIRED')
        && !subscriptions.some(other => other.user_id === subscription.user_id && other.id !== subscription.id && heldAt(other, Date.now()))
    }).length

    // Chart series, one point per day / week / month.
    const points = buckets(period.start, period.end, period.granularity)
    const offset = prevMs !== null ? startMs - prevMs : 0
    const series = points.map((bucket, index) => {
      const from = Math.max(bucket.getTime(), startMs)
      const to = Math.min((points[index + 1] ?? period.end).getTime(), endMs)
      const sum = (rows: AnalyticsPayment[], lo: number, hi: number) => rows
        .filter(payment => {
          const at = new Date(payment.created_at).getTime()
          return at >= lo && at < hi
        })
        .reduce((total, payment) => total + payment.amount_lak, 0)
      let joined = 0
      for (const at of joinedAt.values()) if (at >= from && at < to) joined += 1
      return {
        label: bucketTick(bucket, period.granularity, locale),
        title: bucketTitle(bucket, new Date(Math.min(nextBucket(bucket, period.granularity).getTime(), endMs)), period.granularity, locale),
        revenue: sum(verified, from, to),
        previous: prevMs !== null ? sum(previousVerified, from - offset, to - offset) : undefined,
        newMembers: joined,
        active: activeMembersAt(subscriptions, Math.min(to, Date.now()) - 1),
      }
    })

    const byPlan = new Map<string, { revenue: number; count: number }>()
    for (const payment of verified) {
      const entry = byPlan.get(payment.plan_name) ?? { revenue: 0, count: 0 }
      entry.revenue += payment.amount_lak
      entry.count += 1
      byPlan.set(payment.plan_name, entry)
    }
    const planRows = [...byPlan.entries()]
      .map(([name, entry]) => ({ name, ...entry }))
      .sort((a, b) => b.revenue - a.revenue)

    return {
      revenue,
      revenueChange: prevMs !== null ? percentChange(revenue, previousRevenue) : undefined,
      previousRevenue,
      verifiedCount: verified.length,
      averagePayment: verified.length ? revenue / verified.length : 0,
      rejected,
      pending,
      refunded,
      approvalRate,
      newMembers,
      newMembersChange: prevMs !== null ? percentChange(newMembers, previousNewMembers) : undefined,
      activeNow,
      activeChange: activeNow - activeAtStart,
      paidActiveNow,
      expired,
      series,
      planRows,
    }
  }, [payments, period, joinedAt, subscriptions, locale])

  const hasComparison = period.previousStart !== null
  const revenueTop = niceMax(Math.max(0, ...stats.series.map(point => Math.max(point.revenue, point.previous ?? 0))), 1000)
  const membersTop = niceMax(Math.max(0, ...stats.series.map(point => point.newMembers)), 4)
  const xAxis = {
    dataKey: 'label',
    tick: { ...chart.tick, fontSize: narrow ? 10 : 11 },
    axisLine: false,
    tickLine: false,
    // Recharts drops labels that would collide, keeping the first and last.
    interval: 'preserveStartEnd' as const,
    minTickGap: narrow ? 14 : 24,
    tickMargin: 6,
  }
  const yTick = { ...chart.tick, fontSize: narrow ? 10 : 11 }
  const tooltipTitle = (_: unknown, payload: readonly { payload?: { title?: string } }[]) => payload?.[0]?.payload?.title ?? ''
  const statusTotal = stats.verifiedCount + stats.pending + stats.rejected + stats.refunded

  return (
    <section id="premium-overview" data-no-premium-translate className="scroll-mt-24 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <CalendarRange className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-black text-gray-950 dark:text-gray-100">{t('Overview')}</h2>
          <span className="text-xs font-semibold text-gray-400">
            {period.start.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}
            {' – '}
            {addDays(period.end, -1).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
        <div className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          <div role="tablist" aria-label={t('Date range')} className="inline-flex gap-1 rounded-2xl border border-gray-100 bg-white p-1 dark:border-gray-800 dark:bg-gray-900">
            {RANGE_OPTIONS.map(option => (
              <button
                key={option.key}
                type="button"
                role="tab"
                aria-selected={range === option.key}
                onClick={() => setRange(option.key)}
                className={cn(
                  'whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold transition-colors',
                  range === option.key
                    ? 'bg-primary-900 text-white dark:bg-primary-500'
                    : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800',
                )}
              >
                {t(option.label)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {range === 'custom' && (
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400">
            <span>{t('From')}</span>
            <input
              type="date"
              value={customFrom}
              max={customTo}
              onChange={event => setCustomFrom(event.target.value)}
              className="mt-1 block rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
          </label>
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400">
            <span>{t('To')}</span>
            <input
              type="date"
              value={customTo}
              min={customFrom}
              max={inputDate(new Date())}
              onChange={event => setCustomTo(event.target.value)}
              className="mt-1 block rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
          </label>
        </div>
      )}

      {paymentsError && (
        <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {t('Could not load payment analytics.')}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard
          newLabel={t('New')}
          label={t('Verified revenue')}
          value={paymentsLoading ? '…' : formatPrice(stats.revenue, currency)}
          icon={<Crown className="h-5 w-5" />}
          color="green"
          change={stats.revenueChange}
          footnote={hasComparison ? <><span>{t('vs')}</span> {formatPrice(stats.previousRevenue, currency)}</> : null}
        />
        <KpiCard
          newLabel={t('New')}
          label={t('New members')}
          value={stats.newMembers}
          icon={<UserPlus className="h-5 w-5" />}
          color="purple"
          change={stats.newMembersChange}
          footnote={hasComparison ? <span>{t('vs previous period')}</span> : null}
        />
        <KpiCard
          newLabel={t('New')}
          label={t('Active members')}
          value={stats.activeNow}
          icon={<Users className="h-5 w-5" />}
          color="blue"
          delta={stats.activeChange}
          footnote={<><span>{stats.paidActiveNow}</span> <span>{t('paid')}</span></>}
        />
        <KpiCard
          newLabel={t('New')}
          label={t('Payment review')}
          value={reviewCount}
          icon={<ReceiptText className="h-5 w-5" />}
          color="amber"
          footnote={<span>{t('Waiting in queue')}</span>}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <MiniStat label={t('Paid payments')} value={stats.verifiedCount} />
        <MiniStat label={t('Average payment')} value={formatPrice(stats.averagePayment, currency)} />
        <MiniStat label={t('Approval rate')} value={stats.approvalRate === null ? '—' : `${Math.round(stats.approvalRate)}%`} />
        <MiniStat label={t('Expired, not renewed')} value={stats.expired} />
        <MiniStat label={t('Daily posts')} value={dailyPosts} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="min-w-0 p-4 sm:p-5 lg:col-span-2">
          <ChartHeader title={t('Revenue')} value={formatPrice(stats.revenue, currency)}>
            {hasComparison && (
              <div className="flex items-center gap-3 text-xs font-semibold text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded" style={{ background: chart.brand }} /><span>{t('This period')}</span></span>
                <span className="flex items-center gap-1.5"><span className="h-0 w-4 border-t-2 border-dashed border-gray-400" /><span>{t('Previous period')}</span></span>
              </div>
            )}
          </ChartHeader>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.series} margin={{ top: 8, right: narrow ? 4 : 12, left: narrow ? -8 : 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="premium-revenue-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chart.brand} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={chart.brand} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={chart.axisLine} strokeOpacity={0.5} />
                <XAxis {...xAxis} />
                <YAxis
                  tick={yTick}
                  axisLine={false}
                  tickLine={false}
                  width={narrow ? 36 : 44}
                  domain={[0, revenueTop]}
                  ticks={[0, revenueTop / 2, revenueTop]}
                  tickFormatter={compactNumber}
                />
                <Tooltip
                  {...chart.tooltip}
                  cursor={{ stroke: chart.axisLine }}
                  labelFormatter={tooltipTitle}
                  formatter={(value, name) => [formatPrice(Number(value), currency), t(name === 'previous' ? 'Previous period' : 'This period')]}
                />
                {hasComparison && (
                  <Line type="monotone" dataKey="previous" stroke="#9ca3af" strokeWidth={2} strokeDasharray="4 4" dot={false} activeDot={false} />
                )}
                <Area type="monotone" dataKey="revenue" stroke={chart.brand} strokeWidth={2} fill="url(#premium-revenue-fill)" activeDot={{ r: 4, strokeWidth: 2, stroke: chart.surface }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="min-w-0 p-4 sm:p-5">
          <ChartHeader title={t('Payment outcomes')} value={<><span>{statusTotal}</span> <span>{t('payments')}</span></>} />
          <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            {statusTotal > 0 && (
              <>
                <div className="h-full bg-emerald-500" style={{ width: `${(stats.verifiedCount / statusTotal) * 100}%` }} />
                <div className="h-full border-l-2 border-white bg-amber-400 dark:border-gray-900" style={{ width: `${(stats.pending / statusTotal) * 100}%` }} />
                <div className="h-full border-l-2 border-white bg-red-500 dark:border-gray-900" style={{ width: `${(stats.rejected / statusTotal) * 100}%` }} />
                <div className="h-full border-l-2 border-white bg-gray-400 dark:border-gray-900" style={{ width: `${(stats.refunded / statusTotal) * 100}%` }} />
              </>
            )}
          </div>
          <ul className="mt-4 space-y-3">
            <OutcomeRow icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} label={t('Verified')} count={stats.verifiedCount} total={statusTotal} />
            <OutcomeRow icon={<Clock3 className="h-4 w-4 text-amber-500" />} label={t('Pending')} count={stats.pending} total={statusTotal} />
            <OutcomeRow icon={<XCircle className="h-4 w-4 text-red-500" />} label={t('Rejected')} count={stats.rejected} total={statusTotal} />
            {stats.refunded > 0 && <OutcomeRow icon={<Minus className="h-4 w-4 text-gray-400" />} label={t('Refunded')} count={stats.refunded} total={statusTotal} />}
          </ul>
        </Card>

        <Card className="min-w-0 p-4 sm:p-5 lg:col-span-2">
          <ChartHeader title={t('New members')} value={<><span>{stats.newMembers}</span> <span>{t('joined')}</span></>} />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.series} margin={{ top: 8, right: narrow ? 4 : 12, left: narrow ? -8 : 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={chart.axisLine} strokeOpacity={0.5} />
                <XAxis {...xAxis} />
                <YAxis
                  allowDecimals={false}
                  tick={yTick}
                  axisLine={false}
                  tickLine={false}
                  width={narrow ? 24 : 32}
                  domain={[0, membersTop]}
                  ticks={membersTop % 2 === 0 ? [0, membersTop / 2, membersTop] : [0, membersTop]}
                />
                <Tooltip {...chart.tooltip} labelFormatter={tooltipTitle} formatter={value => [value, t('New members')]} />
                <Bar dataKey="newMembers" fill={chart.brand} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="min-w-0 p-4 sm:p-5">
          <ChartHeader title={t('Revenue by plan')} />
          {stats.planRows.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">{t('No verified payments in this period.')}</p>
          ) : (
            <ul className="mt-2 space-y-4">
              {stats.planRows.map(plan => (
                <li key={plan.name}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate font-bold text-gray-800 dark:text-gray-200">{plan.name}</span>
                    <span className="shrink-0 font-black text-gray-950 dark:text-gray-100">{formatPrice(plan.revenue, currency)}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div className="h-full rounded-full" style={{ width: `${(plan.revenue / (stats.planRows[0].revenue || 1)) * 100}%`, background: chart.brand }} />
                  </div>
                  <p className="mt-1 text-xs text-gray-400"><span>{plan.count}</span> <span>{t('payments')}</span> · <span>{stats.revenue ? Math.round((plan.revenue / stats.revenue) * 100) : 0}%</span></p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </section>
  )
}

const KPI_COLORS = {
  blue: 'bg-primary-50 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300',
  amber: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300',
  green: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  purple: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
}

function KpiCard({
  label,
  value,
  icon,
  color,
  change,
  delta,
  footnote,
  newLabel,
}: {
  label: string
  value: ReactNode
  icon: ReactNode
  color: keyof typeof KPI_COLORS
  /** Percent change vs the previous period; null when it grew from zero. */
  change?: number | null
  /** Absolute change over the period. */
  delta?: number
  footnote?: ReactNode
  newLabel: string
}) {
  return (
    <Card className="min-w-0 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 sm:text-xs">{label}</p>
          <p className="mt-2 break-words text-lg font-black text-gray-950 dark:text-gray-100 sm:text-2xl">{value}</p>
        </div>
        <div className={cn('shrink-0 rounded-2xl p-2 sm:p-3', KPI_COLORS[color])}>{icon}</div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        {change !== undefined && <TrendBadge value={change} suffix="%" newLabel={newLabel} />}
        {delta !== undefined && <TrendBadge value={delta} newLabel={newLabel} />}
        {footnote && <span className="text-gray-400">{footnote}</span>}
      </div>
    </Card>
  )
}

function TrendBadge({ value, suffix = '', newLabel }: { value: number | null; suffix?: string; newLabel: string }) {
  if (value === null) {
    return <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"><ArrowUpRight className="h-3 w-3" /><span>{newLabel}</span></span>
  }
  const rounded = Math.round(value)
  const Icon = rounded > 0 ? ArrowUpRight : rounded < 0 ? ArrowDownRight : Minus
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-bold',
        rounded > 0 && 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
        rounded < 0 && 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300',
        rounded === 0 && 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
      )}
    >
      <Icon className="h-3 w-3" />
      {rounded > 0 ? '+' : ''}{rounded}{suffix}
    </span>
  )
}

function MiniStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl border border-gray-100/80 bg-white px-4 py-3 dark:border-gray-800/80 dark:bg-gray-900">
      <p className="truncate text-[11px] font-bold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 truncate text-base font-black text-gray-950 dark:text-gray-100">{value}</p>
    </div>
  )
}

function ChartHeader({ title, value, children }: { title: string; value?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-gray-400">{title}</p>
        {value !== undefined && <p className="mt-1 text-xl font-black text-gray-950 dark:text-gray-100">{value}</p>}
      </div>
      {children}
    </div>
  )
}

function OutcomeRow({ icon, label, count, total }: { icon: ReactNode; label: string; count: number; total: number }) {
  return (
    <li className="flex items-center justify-between gap-2 text-sm">
      <span className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-300">{icon}<span>{label}</span></span>
      <span className="font-black text-gray-950 dark:text-gray-100">
        {count}
        <span className="ml-1.5 text-xs font-semibold text-gray-400">{total ? Math.round((count / total) * 100) : 0}%</span>
      </span>
    </li>
  )
}
