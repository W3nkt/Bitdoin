import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { DollarSign, TrendingUp, CreditCard, Truck, ShoppingBag } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '@/lib/supabase'
import { StatCard } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatPrice, formatDate, orderStatusLabel, orderStatusColor } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import type { Order } from '@/types'

export function AdminDashboard() {
  const { t } = useTranslation()
  const { profile } = useAuth()

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const [ordersRes, paymentsRes] = await Promise.all([
        supabase.from('orders').select('total_amount, status, payment_status, created_at'),
        supabase.from('payments').select('amount, verification_status'),
      ])
      const orders = ordersRes.data ?? []
      const payments = paymentsRes.data ?? []

      const gmv = orders.reduce((s, o) => s + Number(o.total_amount), 0)
      const verifiedPayments = payments.filter(p => p.verification_status === 'VERIFIED')
      const revenue = verifiedPayments.reduce((s, p) => s + Number(p.amount), 0)
      const pendingPayments = payments.filter(p => p.verification_status === 'PENDING').length
      const pendingDeliveries = orders.filter(
        o => o.status === 'PROCESSING' || o.status === 'PURCHASING_FROM_BOOKSTORE'
      ).length

      return { gmv, revenue, pendingPayments, pendingDeliveries, totalOrders: orders.length }
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
        .select('book:books(title), book_id')
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
          value={formatPrice(stats?.gmv ?? 0)}
          icon={<DollarSign className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          label={t('admin.revenue')}
          value={formatPrice(stats?.revenue ?? 0)}
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
        />
        <StatCard
          label={t('admin.pendingDeliveries')}
          value={stats?.pendingDeliveries ?? 0}
          icon={<Truck className="h-5 w-5" />}
          color="red"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top books chart */}
        {topBooks && topBooks.length > 0 && (
          <div className="bg-white rounded-2xl shadow-card p-5">
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

        {/* Recent orders */}
        <div className="bg-white rounded-2xl shadow-card p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Recent Orders</h3>
          <div className="space-y-2">
            {recentOrders?.map(order => {
              const initial = order.order_number?.charAt(order.order_number.length - 2) ?? '#'
              return (
                <div key={order.id} className="flex items-center gap-3 py-1.5">
                  <div className="h-8 w-8 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary-700">{initial}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-xs truncate">{order.order_number}</p>
                    <p className="text-gray-400 text-xs">{formatDate(order.created_at)}</p>
                  </div>
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0', orderStatusColor(order.status))}>
                    {orderStatusLabel(order.status)}
                  </span>
                  <span className="text-xs font-semibold text-gray-800 flex-shrink-0 ml-1">
                    {formatPrice(order.total_amount)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
