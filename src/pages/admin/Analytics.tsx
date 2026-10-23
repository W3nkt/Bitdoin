import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, LabelList,
} from 'recharts'
import { supabase } from '@/lib/supabase'
import { DashboardSkeleton } from '@/components/ui/Skeleton'
import { StatCard } from '@/components/ui/Card'
import { formatPrice, formatCompactPrice, formatDateTime } from '@/lib/utils'
import { DollarSign, TrendingUp, ShoppingBag, Users, TrendingDown, Repeat, CalendarClock, Wallet } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { useChartTheme, useTheme } from '@/lib/theme'
import type { OrderStatus } from '@/types'

interface OrderRow {
  id: string
  customer_name: string | null
  customer_phone: string | null
  total_amount: number
  status: OrderStatus
  created_at: string
  items: {
    quantity: number
    final_price: number
    margin_percent: number
    book_id: string
    bookstore_id: string
    book: { title: string } | null
    bookstore: { name: string } | null
  }[]
  payments: { amount: number; verification_status: string }[]
}

const LOST_STATUSES: OrderStatus[] = ['CANCELLED', 'OUT_OF_STOCK', 'RETURNED']

const PIPELINE: { label: string; statuses: OrderStatus[] }[] = [
  { label: 'Awaiting payment', statuses: ['PENDING_PAYMENT'] },
  { label: 'Payment review', statuses: ['PAYMENT_REVIEW'] },
  { label: 'Processing', statuses: ['PROCESSING', 'PURCHASING_FROM_BOOKSTORE'] },
  { label: 'Shipping', statuses: ['PARTIALLY_SHIPPED', 'SHIPPED'] },
  { label: 'Delivered', statuses: ['DELIVERED', 'COMPLETED'] },
  { label: 'Cancelled / returned', statuses: LOST_STATUSES },
]

const DAY_MS = 24 * 60 * 60 * 1000

// Same buyer may type 020…, 20… or 85620…; key on the subscriber digits.
function customerKey(phone: string | null) {
  return (phone ?? '').replace(/\D/g, '').replace(/^856/, '').replace(/^0/, '')
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}`
}

function percent(part: number, whole: number) {
  return whole > 0 ? Math.round((part / whole) * 100) : 0
}

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

export function AdminAnalytics() {
  const { t } = useTranslation()
  const { currency, language } = useLanguage()
  const chart = useChartTheme()
  const dark = useTheme(state => state.theme) === 'dark'
  // Validated pair (blue / orange) for light and dark chart surfaces.
  const series = dark ? ['#6b8aff', '#e06a1b'] : ['#3b63c4', '#d9600c']
  const grid = dark ? '#1f2937' : '#f3f4f6'

  const { data: orders, isLoading: loadingOrders } = useQuery({
    queryKey: ['admin', 'analytics', 'orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, customer_name, customer_phone, total_amount, status, created_at, items:order_items(quantity, final_price, margin_percent, book_id, bookstore_id, book:books(title), bookstore:bookstores(name)), payments(amount, verification_status)')
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as unknown as OrderRow[]
    },
  })

  const insights = useMemo(() => {
    const all = orders ?? []
    // Everything except the pipeline counts completed orders only.
    const completed = all.filter(o => o.status === 'COMPLETED')
    const sales = completed.filter(o => customerKey(o.customer_phone))
    const items = completed.flatMap(o => o.items ?? [])
    const itemMargin = (i: OrderRow['items'][number]) =>
      Number(i.final_price) * i.quantity * (Number(i.margin_percent) / 100) / (1 + Number(i.margin_percent) / 100)

    const gmv = completed.reduce((sum, o) => sum + Number(o.total_amount), 0)
    const revenue = completed
      .flatMap(o => o.payments ?? [])
      .filter(p => p.verification_status === 'VERIFIED')
      .reduce((sum, p) => sum + Number(p.amount), 0)
    const grossMargin = items.reduce((sum, i) => sum + itemMargin(i), 0)
    const avgOrderValue = completed.length ? gmv / completed.length : 0

    const sumBy = <K extends string>(keyOf: (i: OrderRow['items'][number]) => K, nameOf: (i: OrderRow['items'][number]) => string, valueOf: (i: OrderRow['items'][number]) => number) => {
      const totals = new Map<K, { name: string; value: number }>()
      for (const i of items) {
        const entry = totals.get(keyOf(i)) ?? { name: nameOf(i), value: 0 }
        entry.value += valueOf(i)
        totals.set(keyOf(i), entry)
      }
      return [...totals.values()].sort((a, b) => b.value - a.value)
    }
    const storeMargins = sumBy(i => i.bookstore_id, i => i.bookstore?.name ?? 'Unknown store', itemMargin)
      .slice(0, 10)
      .map(s => ({ name: s.name, margin: s.value }))
    const topBooks = sumBy(i => i.book_id, i => i.book?.title ?? 'Unknown book', i => i.quantity)
      .slice(0, 5)
      .map(b => ({ title: b.name, qty: b.value }))

    const byCustomer = new Map<string, OrderRow[]>()
    for (const order of sales) {
      const key = customerKey(order.customer_phone)
      byCustomer.set(key, [...(byCustomer.get(key) ?? []), order])
    }
    const customers = [...byCustomer.values()]
    const returning = customers.filter(list => list.length >= 2)

    const totalValue = sales.reduce((sum, o) => sum + Number(o.total_amount), 0)
    const returningValue = returning.flat().reduce((sum, o) => sum + Number(o.total_amount), 0)

    const gaps = returning.flatMap(list =>
      list.slice(1).map((o, i) => (new Date(o.created_at).getTime() - new Date(list[i].created_at).getTime()) / DAY_MS),
    )
    const avgGapDays = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : null
    const ordersPerReturning = returning.length ? returning.flat().length / returning.length : 0

    // New vs returning buyers per month, last 6 months.
    const firstOrder = new Map(customers.map(list => [customerKey(list[0].customer_phone), monthKey(new Date(list[0].created_at))]))
    const now = new Date()
    const customerMix = Array.from({ length: 6 }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
      const key = monthKey(date)
      const buyers = new Set(sales.filter(o => monthKey(new Date(o.created_at)) === key).map(o => customerKey(o.customer_phone)))
      let fresh = 0
      buyers.forEach(b => { if (firstOrder.get(b) === key) fresh++ })
      return {
        month: date.toLocaleString('en-US', { month: 'short' }),
        total: completed
          .filter(o => monthKey(new Date(o.created_at)) === key)
          .reduce((sum, o) => sum + Number(o.total_amount), 0),
        New: fresh,
        Returning: buyers.size - fresh,
      }
    })

    const pipeline = PIPELINE.map(stage => {
      const matched = all.filter(o => stage.statuses.includes(o.status))
      return {
        label: stage.label,
        count: matched.length,
        value: matched.reduce((sum, o) => sum + Number(o.total_amount), 0),
      }
    })

    const topCustomers = customers
      .map(list => ({
        name: list[list.length - 1].customer_name || '—',
        phone: list[0].customer_phone ?? '',
        orders: list.length,
        spent: list.reduce((sum, o) => sum + Number(o.total_amount), 0),
        lastOrder: list[list.length - 1].created_at,
      }))
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 5)

    return {
      gmv,
      revenue,
      grossMargin,
      avgOrderValue,
      completedCount: completed.length,
      storeMargins,
      topBooks,
      customerCount: customers.length,
      returningCount: returning.length,
      returningShare: percent(returningValue, totalValue),
      returningValue,
      avgGapDays,
      ordersPerReturning,
      customerMix,
      pipeline,
      topCustomers,
    }
  }, [orders])

  if (loadingOrders) return <DashboardSkeleton />

  const summary = insights
  const monthly = insights.customerMix
  const lastMonth = monthly[monthly.length - 1]?.total ?? 0
  const prevMonth = monthly[monthly.length - 2]?.total ?? 0
  const monthChange = prevMonth > 0 ? Math.round(((lastMonth - prevMonth) / prevMonth) * 100) : null
  const unpaid = insights.pipeline[0]

  const axisTick = { fontSize: 11, ...chart.tick }
  const card = 'bg-white dark:bg-gray-900 rounded-2xl shadow-card p-4 sm:p-5 min-w-0 overflow-hidden'
  const cardTitle = 'text-sm font-semibold text-gray-700 dark:text-gray-200'
  const cardSub = 'text-xs text-gray-400 mt-0.5 mb-4'

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('admin.analytics')}</h1>
          <p className="text-sm text-gray-400 mt-0.5">Platform performance overview</p>
        </div>
      </div>

      {/* Money KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label={t('admin.gmv')}
          value={formatPrice(summary.gmv, currency)}
          sub={`${summary.completedCount} completed orders`}
          icon={<DollarSign className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          label={t('admin.revenue')}
          value={formatPrice(summary.revenue, currency)}
          sub="verified payments on completed orders"
          icon={<TrendingUp className="h-5 w-5" />}
          color="green"
        />
        <StatCard
          label={t('admin.margin')}
          value={formatPrice(summary.grossMargin, currency)}
          sub={summary.gmv ? `${percent(summary.grossMargin, summary.gmv)}% of order value` : undefined}
          icon={<TrendingDown className="h-5 w-5" />}
          color="purple"
        />
        <StatCard
          label="Average Order Value"
          value={formatPrice(summary.avgOrderValue, currency)}
          icon={<ShoppingBag className="h-5 w-5" />}
          color="blue"
        />
      </div>

      {/* Customer KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Customers"
          value={insights.customerCount}
          sub="unique buyers (by phone)"
          icon={<Users className="h-5 w-5" />}
          color="orange"
        />
        <StatCard
          label="Returning Customers"
          value={insights.returningCount}
          sub={`${percent(insights.returningCount, insights.customerCount)}% ordered 2+ times · ${insights.ordersPerReturning.toFixed(1)} orders each`}
          icon={<Repeat className="h-5 w-5" />}
          color="green"
        />
        <StatCard
          label="From Returning Customers"
          value={`${insights.returningShare}%`}
          sub={`${formatPrice(insights.returningValue, currency)} of order value`}
          icon={<Wallet className="h-5 w-5" />}
          color="purple"
        />
        <StatCard
          label="Reorder Gap"
          value={insights.avgGapDays === null ? '—' : `${Math.round(insights.avgGapDays)} days`}
          sub="average time between a returning customer's orders"
          icon={<CalendarClock className="h-5 w-5" />}
          color="blue"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Monthly revenue */}
        {monthly.length > 0 && (
          <div className={card}>
            <h3 className={cardTitle}>Monthly Completed Sales ({currency})</h3>
            <p className={cardSub}>
              {formatPrice(lastMonth, currency)} this month so far
              {monthChange !== null && ` · ${monthChange >= 0 ? '+' : ''}${monthChange}% vs last month`}
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthly} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={grid} />
                <XAxis dataKey="month" tick={axisTick} stroke={chart.axisLine} />
                <YAxis tick={axisTick} stroke={chart.axisLine} tickFormatter={v => formatCompactPrice(v, currency)} width={48} />
                <Tooltip formatter={v => [formatPrice(v as number, currency), 'Completed sales']} {...chart.tooltip} />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke={series[0]}
                  strokeWidth={2}
                  dot={{ fill: series[0], r: 4, stroke: chart.surface, strokeWidth: 2 }}
                  activeDot={{ r: 6, stroke: chart.surface, strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* New vs returning buyers */}
        <div className={card}>
          <h3 className={cardTitle}>New vs Returning Buyers</h3>
          <p className={cardSub}>Unique buyers with completed orders each month</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={insights.customerMix} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={grid} />
              <XAxis dataKey="month" tick={axisTick} stroke={chart.axisLine} />
              <YAxis tick={axisTick} stroke={chart.axisLine} allowDecimals={false} width={32} />
              <Tooltip {...chart.tooltip} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="New" stackId="buyers" fill={series[0]} stroke={chart.surface} strokeWidth={2} maxBarSize={32} />
              <Bar dataKey="Returning" stackId="buyers" fill={series[1]} stroke={chart.surface} strokeWidth={2} maxBarSize={32} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top books */}
        {summary.topBooks.length > 0 && (
          <div className={card}>
            <h3 className={cardTitle}>Top Books by Copies Sold</h3>
            <p className={cardSub}>Top {summary.topBooks.length} titles</p>
            <ResponsiveContainer width="100%" height={Math.max(160, summary.topBooks.length * 40)}>
              <BarChart data={summary.topBooks} layout="vertical" margin={{ top: 0, right: 32, left: 0, bottom: 0 }}>
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="title"
                  tick={axisTick}
                  stroke={chart.axisLine}
                  width={150}
                  tickFormatter={s => truncate(s, 22)}
                />
                <Tooltip formatter={v => [v as number, 'Copies']} {...chart.tooltip} />
                <Bar dataKey="qty" fill={series[0]} radius={[0, 4, 4, 0]} maxBarSize={22}>
                  <LabelList dataKey="qty" position="right" style={{ fontSize: 11, fill: chart.tick.fill }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Margin by bookstore */}
        {summary.storeMargins.length > 0 && (
          <div className={card}>
            <h3 className={cardTitle}>Margin by Bookstore ({currency})</h3>
            <p className={cardSub}>Gross margin on completed orders per partner store</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={summary.storeMargins} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={grid} />
                <XAxis dataKey="name" tick={{ ...axisTick, fontSize: 10 }} stroke={chart.axisLine} tickFormatter={s => truncate(s, 14)} />
                <YAxis tick={axisTick} stroke={chart.axisLine} tickFormatter={v => formatCompactPrice(v, currency)} width={48} />
                <Tooltip formatter={v => [formatPrice(v as number, currency), 'Margin']} {...chart.tooltip} />
                <Bar dataKey="margin" fill={series[1]} radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Order pipeline */}
        <div className={card}>
          <h3 className={cardTitle}>Order Pipeline</h3>
          <p className={cardSub}>
            {unpaid.count > 0
              ? `${unpaid.count} orders (${formatPrice(unpaid.value, currency)}) still awaiting payment`
              : 'No orders awaiting payment'}
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={insights.pipeline} layout="vertical" margin={{ top: 0, right: 32, left: 0, bottom: 0 }}>
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis type="category" dataKey="label" tick={axisTick} stroke={chart.axisLine} width={130} />
              <Tooltip
                formatter={(v, _name, item) => [`${v} orders · ${formatPrice((item.payload as { value: number }).value, currency)}`, 'Orders']}
                {...chart.tooltip}
              />
              <Bar dataKey="count" fill={series[0]} radius={[0, 4, 4, 0]} maxBarSize={22}>
                <LabelList dataKey="count" position="right" style={{ fontSize: 11, fill: chart.tick.fill }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top customers */}
        <div className={card}>
          <h3 className={cardTitle}>Top Customers</h3>
          <p className={cardSub}>By total value of completed orders</p>
          {insights.topCustomers.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No orders yet</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 text-left">
                  <th className="pb-2 font-medium">Customer</th>
                  <th className="pb-2 font-medium text-right">Orders</th>
                  <th className="pb-2 font-medium text-right">Spent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {insights.topCustomers.map(c => (
                  <tr key={c.phone}>
                    <td className="py-2 pr-2">
                      <p className="font-medium text-gray-800 dark:text-gray-100 truncate max-w-[180px]">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.phone} · last {formatDateTime(c.lastOrder, language)}</p>
                    </td>
                    <td className="py-2 text-right text-gray-700 dark:text-gray-200">
                      {c.orders}
                      {c.orders >= 2 && <Repeat className="inline ml-1 h-3 w-3 text-green-600 dark:text-green-400" aria-label="Returning" />}
                    </td>
                    <td className="py-2 text-right font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                      {formatPrice(c.spent, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
