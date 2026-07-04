import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, DollarSign, TrendingUp, CreditCard, Truck, ShoppingBag } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { supabase } from '@/lib/supabase'
import { StatCard } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatPrice, formatDate, orderStatusLabel, orderStatusColor } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import type { Order, OrderStatus, Language } from '@/types'

// Fixed hue per status — identity never shifts with which statuses happen to appear.
// Rare terminal statuses fold into OTHER so the chart never exceeds 8 categorical slots.
const STATUS_CHART_ORDER: (OrderStatus | 'OTHER')[] = [
  'PROCESSING', 'SHIPPED', 'PENDING_PAYMENT', 'COMPLETED',
  'PURCHASING_FROM_BOOKSTORE', 'CANCELLED', 'DELIVERED', 'PAYMENT_REVIEW', 'OTHER',
]
const STATUS_CHART_COLORS: Record<string, string> = {
  PROCESSING: '#2a78d6',
  SHIPPED: '#1baf7a',
  PENDING_PAYMENT: '#eda100',
  COMPLETED: '#008300',
  PURCHASING_FROM_BOOKSTORE: '#4a3aa7',
  CANCELLED: '#e34948',
  DELIVERED: '#e87ba4',
  PAYMENT_REVIEW: '#eb6834',
  OTHER: '#898781',
}

function statusChartLabel(status: string, lang: Language): string {
  if (status === 'OTHER') return lang === 'lo' ? 'ອື່ນໆ' : 'Other'
  return orderStatusLabel(status as OrderStatus, lang)
}

export function AdminDashboard() {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const { currency, language } = useLanguage()
  const navigate = useNavigate()

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const [ordersRes, paymentsRes] = await Promise.all([
        supabase.from('orders').select('id, total_amount, status, payment_status, created_at'),
        supabase.from('payments').select('amount, verification_status, order_id'),
      ])
      const orders = ordersRes.data ?? []
      const payments = paymentsRes.data ?? []

      const cancelledOrderIds = new Set(orders.filter(o => o.status === 'CANCELLED').map(o => o.id))
      const activeOrders = orders.filter(o => !cancelledOrderIds.has(o.id))

      const gmv = activeOrders.reduce((s, o) => s + Number(o.total_amount), 0)
      const verifiedPayments = payments.filter(
        p => p.verification_status === 'VERIFIED' && !cancelledOrderIds.has(p.order_id)
      )
      const revenue = verifiedPayments.reduce((s, p) => s + Number(p.amount), 0)
      const pendingPayments = payments.filter(p => p.verification_status === 'PENDING').length
      const pendingDeliveries = orders.filter(
        o => o.status === 'PROCESSING' || o.status === 'PURCHASING_FROM_BOOKSTORE'
      ).length

      const statusCounts: Record<string, number> = {}
      orders.forEach(o => {
        const key = STATUS_CHART_COLORS[o.status] ? o.status : 'OTHER'
        statusCounts[key] = (statusCounts[key] ?? 0) + 1
      })
      const statusBreakdown = STATUS_CHART_ORDER
        .filter(s => statusCounts[s])
        .map(s => ({ status: s, count: statusCounts[s] }))

      return { gmv, revenue, pendingPayments, pendingDeliveries, totalOrders: orders.length, statusBreakdown }
    },
  })

  const { data: recentOrders } = useQuery({
    queryKey: ['admin', 'recent-orders'],
    queryFn: async () => {
      const { data } = await supabase
        .from('orders')
        .select('*, customer:users(name), items:order_items(count)')
        .order('created_at', { ascending: false })
        .limit(8)
      return (data ?? []) as Order[]
    },
  })

  const { data: topBooks } = useQuery({
    queryKey: ['admin', 'top-books'],
    queryFn: async () => {
      const { data } = await supabase
        .from('order_items')
        .select('book:books(title), book_id, order:orders!inner(status)')
        .neq('order.status', 'CANCELLED')
        .limit(100)
      if (!data) return []
      const counts: Record<string, { title: string; count: number }> = {}
      data.forEach(item => {
        const id = String(item.book_id ?? '')
        const bookData = item.book as { title?: string }[] | { title?: string } | null
        const title = Array.isArray(bookData) ? bookData[0]?.title ?? '' : bookData?.title ?? ''
        if (!counts[id]) counts[id] = { title, count: 0 }
        counts[id].count++
      })
      return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5)
    },
  })

  const firstName = profile?.name?.split(' ')[0] ?? 'there'

  if (loadingStats) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Good morning, {firstName}</h1>
          <p className="text-sm text-gray-400 mt-0.5">Here's what's happening on the platform today.</p>
        </div>
      </div>

      {/* Stats grid — 2 cols mobile, 5 cols desktop */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          label={t('admin.gmv')}
          value={formatPrice(stats?.gmv ?? 0, currency)}
          icon={<DollarSign className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          label={t('admin.revenue')}
          value={formatPrice(stats?.revenue ?? 0, currency)}
          icon={<TrendingUp className="h-5 w-5" />}
          color="green"
        />
        <StatCard
          label="Total Orders"
          value={stats?.totalOrders ?? 0}
          icon={<ShoppingBag className="h-5 w-5" />}
          color="purple"
        />
        <StatCard
          label={t('admin.pendingPayments')}
          value={stats?.pendingPayments ?? 0}
          icon={<CreditCard className="h-5 w-5" />}
          color="orange"
          onClick={(stats?.pendingPayments ?? 0) > 0 ? () => navigate('/admin/payments') : undefined}
        />
        <StatCard
          label={t('admin.pendingDeliveries')}
          value={stats?.pendingDeliveries ?? 0}
          icon={<Truck className="h-5 w-5" />}
          color="red"
          onClick={(stats?.pendingDeliveries ?? 0) > 0 ? () => navigate('/admin/deliveries') : undefined}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top books chart */}
        {topBooks && topBooks.length > 0 && (
          <div className="bg-white rounded-2xl shadow-card p-4 sm:p-5 min-w-0 overflow-hidden">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">{t('admin.topBooks')}</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topBooks}>
                <XAxis dataKey="title" tick={{ fontSize: 10 }} tickFormatter={s => s.slice(0, 12) + '…'} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => [v, 'Orders']} />
                <Bar dataKey="count" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Order status breakdown */}
        {stats?.statusBreakdown && stats.statusBreakdown.length > 0 && (
          <div className="bg-white rounded-2xl shadow-card p-4 sm:p-5 min-w-0 overflow-hidden">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Order Status</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={stats.statusBreakdown}
                  dataKey="count"
                  nameKey="status"
                  innerRadius={48}
                  outerRadius={78}
                  paddingAngle={2}
                  stroke="#ffffff"
                  strokeWidth={2}
                >
                  {stats.statusBreakdown.map(entry => (
                    <Cell key={entry.status} fill={STATUS_CHART_COLORS[entry.status]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number, _name, item) => [value, statusChartLabel(item.payload.status, language)]} />
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  iconType="circle"
                  iconSize={8}
                  formatter={(value: string) => (
                    <span className="text-xs text-gray-600">{statusChartLabel(value, language)}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div>
        {/* Recent orders */}
        <div className="bg-white rounded-2xl shadow-card p-4 sm:p-5 min-w-0 overflow-hidden">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h3 className="text-sm font-semibold text-gray-700">Recent Orders</h3>
            {!!recentOrders?.length && (
              <button
                type="button"
                onClick={() => navigate('/admin/orders')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 transition-colors hover:text-primary-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-md"
              >
                View all
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="space-y-2">
            {recentOrders?.map(order => {
              const initial = order.order_number?.charAt(order.order_number.length - 2) ?? '#'
              return (
                <button
                  type="button"
                  key={order.id}
                  onClick={() => navigate('/admin/orders', { state: { selectedOrder: order } })}
                  className="group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                  aria-label={`Open order ${order.order_number}`}
                >
                  <div className="h-8 w-8 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary-700">{initial}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-xs truncate">{order.order_number}</p>
                    <p className="text-gray-400 text-xs">{formatDate(order.created_at, language)}</p>
                  </div>
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0', orderStatusColor(order.status))}>
                    {orderStatusLabel(order.status, language)}
                  </span>
                  <span className="text-xs font-semibold text-gray-800 flex-shrink-0 ml-1">
                    {formatPrice(order.total_amount, currency)}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-primary-500" />
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
