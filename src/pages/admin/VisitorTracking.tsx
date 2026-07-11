import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { Eye, Users, Clock, MousePointerClick, CalendarDays, Activity } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { VisitorEvent, VisitorEventType } from '@/types'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { StatCard } from '@/components/ui/Card'

const COLORS = ['#1e3a5f', '#f97316', '#22c55e', '#8b5cf6', '#06b6d4', '#ec4899', '#eab308']

const EVENT_LABELS: Record<VisitorEventType, string> = {
  page_view: 'Page views',
  page_duration: 'Time on page',
  book_view: 'Book views',
  add_to_cart: 'Add to cart',
  checkout_started: 'Checkout started',
  checkout_completed: 'Checkout completed',
  click: 'Clicks',
}

type RawEvent = Pick<VisitorEvent, 'event_type' | 'path' | 'label' | 'visitor_id' | 'metadata' | 'created_at'>

function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return '—'
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

export function AdminVisitorTracking() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'visitor-tracking'],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_admin_visitor_tracking_events', { p_days: 400 })
      if (error) throw error
      return (data ?? []) as RawEvent[]
    },
  })

  const stats = useMemo(() => {
    const events = data ?? []
    const now = new Date()
    const todayKey = now.toISOString().slice(0, 10)
    const monthKey = todayKey.slice(0, 7)

    const pageViews = events.filter(e => e.event_type === 'page_view')

    const dailyMap = new Map<string, Set<string>>()
    pageViews.forEach(e => {
      const day = e.created_at.slice(0, 10)
      if (!dailyMap.has(day)) dailyMap.set(day, new Set())
      dailyMap.get(day)!.add(e.visitor_id)
    })
    const dailyVisitors = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([day, visitors]) => ({ day: day.slice(5), visitors: visitors.size }))

    const monthlyMap = new Map<string, Set<string>>()
    pageViews.forEach(e => {
      const month = e.created_at.slice(0, 7)
      if (!monthlyMap.has(month)) monthlyMap.set(month, new Set())
      monthlyMap.get(month)!.add(e.visitor_id)
    })
    const monthlyVisitors = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, visitors]) => ({ month, visitors: visitors.size }))

    const todayVisitors = new Set(
      pageViews.filter(e => e.created_at.slice(0, 10) === todayKey).map(e => e.visitor_id)
    ).size
    const todayPageViews = pageViews.filter(e => e.created_at.slice(0, 10) === todayKey).length
    const monthVisitors = new Set(
      pageViews.filter(e => e.created_at.slice(0, 7) === monthKey).map(e => e.visitor_id)
    ).size
    const totalVisitors = new Set(pageViews.map(e => e.visitor_id)).size

    const durations = events
      .filter(e => e.event_type === 'page_duration')
      .map(e => Number((e.metadata as { duration_ms?: number } | null)?.duration_ms ?? 0))
      .filter(n => n > 0)
    const avgDurationSec = durations.length
      ? Math.round(durations.reduce((s, n) => s + n, 0) / durations.length / 1000)
      : 0

    function topOf(list: RawEvent[], keyFn: (e: RawEvent) => string, limit = 8) {
      const counts = new Map<string, number>()
      list.forEach(e => {
        const key = keyFn(e)
        counts.set(key, (counts.get(key) ?? 0) + 1)
      })
      return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([name, count]) => ({ name, count }))
    }

    const topPages = topOf(pageViews, e => e.path ?? 'Unknown')
    const topBooks = topOf(events.filter(e => e.event_type === 'book_view'), e => e.label ?? 'Unknown')
    const topClicks = topOf(events.filter(e => e.event_type === 'click'), e => e.label ?? 'Unknown')

    const funnel = [
      { stage: 'Add to Cart', count: events.filter(e => e.event_type === 'add_to_cart').length },
      { stage: 'Checkout Started', count: events.filter(e => e.event_type === 'checkout_started').length },
      { stage: 'Checkout Completed', count: events.filter(e => e.event_type === 'checkout_completed').length },
    ]

    const typeCounts = new Map<string, number>()
    events.forEach(e => typeCounts.set(e.event_type, (typeCounts.get(e.event_type) ?? 0) + 1))
    const eventBreakdown = Array.from(typeCounts.entries())
      .map(([type, count]) => ({ name: EVENT_LABELS[type as VisitorEventType] ?? type, count }))
      .sort((a, b) => b.count - a.count)

    return {
      hasData: events.length > 0,
      todayVisitors, todayPageViews, monthVisitors, totalVisitors, avgDurationSec,
      dailyVisitors, monthlyVisitors, topPages, topBooks, topClicks, funnel, eventBreakdown,
    }
  }, [data])

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Visitor Tracking</h1>
          <p className="text-sm text-gray-400 mt-0.5">How people find, browse, and buy on the site</p>
        </div>
      </div>

      {!stats.hasData ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-card">
          <Activity className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm font-semibold text-gray-700">No visitor activity yet</p>
          <p className="mt-1 text-xs text-gray-400">
            Tracking is live — data will start showing up here as people browse the site.
          </p>
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard
              label="Visitors Today"
              value={stats.todayVisitors}
              sub={`${stats.todayPageViews} page views`}
              icon={<Users className="h-5 w-5" />}
              color="blue"
            />
            <StatCard
              label="Visitors This Month"
              value={stats.monthVisitors}
              icon={<CalendarDays className="h-5 w-5" />}
              color="green"
            />
            <StatCard
              label="Total Visitors"
              value={stats.totalVisitors}
              sub="last 13 months"
              icon={<Eye className="h-5 w-5" />}
              color="purple"
            />
            <StatCard
              label="Avg. Time on Page"
              value={formatDuration(stats.avgDurationSec)}
              icon={<Clock className="h-5 w-5" />}
              color="orange"
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Daily visitors */}
            {stats.dailyVisitors.length > 0 && (
              <div className="bg-white rounded-2xl shadow-card p-4 sm:p-5 min-w-0 overflow-hidden">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Daily Visitors (last 30 days)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={stats.dailyVisitors}>
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} width={32} allowDecimals={false} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="visitors"
                      stroke="#1e3a5f"
                      strokeWidth={2.5}
                      dot={{ fill: '#1e3a5f', r: 3 }}
                      activeDot={{ r: 6, fill: '#f97316' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Monthly visitors */}
            {stats.monthlyVisitors.length > 0 && (
              <div className="bg-white rounded-2xl shadow-card p-4 sm:p-5 min-w-0 overflow-hidden">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Visitors (last 12 months)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stats.monthlyVisitors}>
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} width={32} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="visitors" fill="#f97316" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Cart → checkout funnel */}
            {stats.funnel.some(f => f.count > 0) && (
              <div className="bg-white rounded-2xl shadow-card p-4 sm:p-5 min-w-0 overflow-hidden">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Cart → Checkout Funnel</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stats.funnel} layout="vertical" margin={{ left: 16 }}>
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="stage" tick={{ fontSize: 11 }} width={110} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#22c55e" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Event breakdown */}
            {stats.eventBreakdown.length > 0 && (
              <div className="bg-white rounded-2xl shadow-card p-4 sm:p-5 min-w-0 overflow-hidden">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Activity Breakdown</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={stats.eventBreakdown}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ count }) => `${count}`}
                    >
                      {stats.eventBreakdown.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend formatter={(value) => <span className="text-xs text-gray-600">{value}</span>} />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Top pages */}
            {stats.topPages.length > 0 && (
              <div className="bg-white rounded-2xl shadow-card p-4 sm:p-5 min-w-0 overflow-hidden">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Top Pages</h3>
                <ul className="space-y-2">
                  {stats.topPages.map(p => (
                    <li key={p.name} className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate text-gray-600">{p.name}</span>
                      <span className="flex-shrink-0 font-semibold text-gray-900">{p.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Top books */}
            {stats.topBooks.length > 0 && (
              <div className="bg-white rounded-2xl shadow-card p-4 sm:p-5 min-w-0 overflow-hidden">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Most Viewed Books</h3>
                <ul className="space-y-2">
                  {stats.topBooks.map(b => (
                    <li key={b.name} className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate text-gray-600">{b.name}</span>
                      <span className="flex-shrink-0 font-semibold text-gray-900">{b.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Top clicks */}
            {stats.topClicks.length > 0 && (
              <div className="bg-white rounded-2xl shadow-card p-4 sm:p-5 min-w-0 overflow-hidden lg:col-span-2">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <MousePointerClick className="h-4 w-4 text-gray-400" />
                  Most Clicked
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {stats.topClicks.map(c => (
                    <div key={c.name} className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2 text-sm">
                      <span className="min-w-0 truncate text-gray-600">{c.name}</span>
                      <span className="flex-shrink-0 font-semibold text-gray-900">{c.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
