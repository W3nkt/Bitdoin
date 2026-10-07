import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { StatCard } from '@/components/ui/Card'
import { formatPrice } from '@/lib/utils'
import { DollarSign, TrendingUp, ShoppingBag, Users, TrendingDown } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { useChartTheme } from '@/lib/theme'

const OTHER_COLORS = ['#f97316', '#22c55e', '#8b5cf6', '#06b6d4']

export function AdminAnalytics() {
  const { t } = useTranslation()
  const { currency } = useLanguage()
  const chart = useChartTheme()
  const COLORS = [chart.brand, ...OTHER_COLORS]

  const { data: summary, isLoading } = useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_admin_analytics_summary')
      if (error) throw error
      return data as {
        gmv: number
        revenue: number
        grossMargin: number
        avgOrderValue: number
        totalCustomers: number
        monthlyData: { month: string; total: number }[]
        storeMargins: { name: string; margin: number; count: number }[]
        topBooks: { title: string; qty: number }[]
      }
    },
  })

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('admin.analytics')}</h1>
          <p className="text-sm text-gray-400 mt-0.5">Platform performance overview</p>
        </div>
      </div>

      {/* KPI cards — 2x2 grid with bigger numbers */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label={t('admin.gmv')}
          value={formatPrice(summary?.gmv ?? 0, currency)}
          icon={<DollarSign className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          label={t('admin.revenue')}
          value={formatPrice(summary?.revenue ?? 0, currency)}
          icon={<TrendingUp className="h-5 w-5" />}
          color="green"
        />
        <StatCard
          label={t('admin.margin')}
          value={formatPrice(summary?.grossMargin ?? 0, currency)}
          icon={<TrendingDown className="h-5 w-5" />}
          color="purple"
        />
        <StatCard
          label="Customers"
          value={summary?.totalCustomers ?? 0}
          icon={<Users className="h-5 w-5" />}
          color="orange"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Monthly revenue */}
        {summary?.monthlyData && summary.monthlyData.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card p-4 sm:p-5 min-w-0 overflow-hidden">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Monthly Revenue ({currency})</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={summary.monthlyData}>
                <XAxis dataKey="month" tick={{ fontSize: 11, ...chart.tick }} stroke={chart.axisLine} />
                <YAxis tick={{ fontSize: 11, ...chart.tick }} stroke={chart.axisLine} tickFormatter={v => formatPrice(v, currency)} width={74} />
                <Tooltip formatter={v => formatPrice(v as number, currency)} {...chart.tooltip} />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke={chart.brand}
                  strokeWidth={2.5}
                  dot={{ fill: chart.brand, r: 4 }}
                  activeDot={{ r: 6, fill: '#f97316' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Margin by bookstore */}
        {summary?.storeMargins && summary.storeMargins.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card p-4 sm:p-5 min-w-0 overflow-hidden">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Margin by Bookstore ({currency})</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={summary.storeMargins}>
                <XAxis dataKey="name" tick={{ fontSize: 10, ...chart.tick }} stroke={chart.axisLine} tickFormatter={s => s.slice(0, 10)} />
                <YAxis tick={{ fontSize: 11, ...chart.tick }} stroke={chart.axisLine} tickFormatter={v => formatPrice(v, currency)} width={74} />
                <Tooltip formatter={v => formatPrice(v as number, currency)} {...chart.tooltip} />
                <Bar dataKey="margin" fill="#f97316" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top books pie */}
        {summary?.topBooks && summary.topBooks.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card p-4 sm:p-5 min-w-0 overflow-hidden">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Top Books by Volume</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={summary.topBooks}
                  dataKey="qty"
                  nameKey="title"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  stroke={chart.surface}
                  label={({ qty }) => `${qty}`}
                >
                  {summary.topBooks.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend formatter={(value) => <span className="text-xs text-gray-600 dark:text-gray-300">{value?.slice(0, 20)}</span>} />
                <Tooltip {...chart.tooltip} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* AOV card — centered display with icon */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card p-4 sm:p-5 min-w-0 overflow-hidden flex flex-col items-center justify-center gap-2">
          <div className="h-12 w-12 rounded-2xl bg-primary-50 dark:bg-primary-900/40 flex items-center justify-center mb-1">
            <ShoppingBag className="h-6 w-6 text-primary-700 dark:text-primary-300" />
          </div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Average Order Value</p>
          <p className="text-4xl font-bold text-primary-700 dark:text-primary-300">{formatPrice(summary?.avgOrderValue ?? 0, currency)}</p>
          <p className="text-xs text-gray-400">per completed order</p>
        </div>
      </div>
    </div>
  )
}
