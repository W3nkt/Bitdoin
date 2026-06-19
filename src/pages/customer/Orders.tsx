import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Package, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Order } from '@/types'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { formatPrice, formatDate, orderStatusLabel, orderStatusColor, paymentStatusLabel, paymentStatusColor } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { TrackOrder } from '@/pages/customer/TrackOrder'

export function Orders() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { currency, language } = useLanguage()

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('orders')
        .select('*, items:order_items(*, book:books(title, cover_image_url))')
        .eq('customer_id', profile!.id)
        .order('created_at', { ascending: false })
      return (data ?? []) as Order[]
    },
    enabled: !!profile,
  })

  if (!profile) {
    return <TrackOrder />
  }

  if (isLoading) return <LoadingSpinner />

  if (!orders || orders.length === 0) {
    return (
      <EmptyState
        icon={<Package className="h-16 w-16" />}
        title={t('orders.empty')}
        action={{ label: t('cart.continueShopping'), onClick: () => navigate('/books') }}
      />
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-900">{t('orders.title')}</h1>

      {orders.map(order => (
        <button
          key={order.id}
          onClick={() => navigate(`/orders/${order.id}`)}
          className="group w-full overflow-hidden rounded-2xl border border-gray-100 bg-white text-left transition-all hover:border-primary-200 hover:shadow-sm"
        >
          <div className="flex min-h-36 items-stretch">
            <div className="relative w-24 flex-shrink-0 bg-gray-100 sm:w-28">
              {order.items?.[0]?.book?.cover_image_url ? (
                <img
                  src={order.items[0].book.cover_image_url}
                  alt={order.items[0].book.title}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Package className="h-8 w-8 text-gray-300" />
                </div>
              )}
              {(order.items?.length ?? 0) > 1 && (
                <span className="absolute bottom-2 right-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-gray-950/75 px-1.5 text-[10px] font-bold text-white">
                  +{(order.items?.length ?? 0) - 1}
                </span>
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col justify-center px-4 py-4">
              <p className="text-xs text-gray-400">{t('orders.orderNumber')}{order.order_number}</p>
              <p className="text-xs text-gray-400 mt-0.5">{t('orders.placedOn')} {formatDate(order.created_at, language)}</p>

              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', orderStatusColor(order.status))}>
                  {orderStatusLabel(order.status, language)}
                </span>
                <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', paymentStatusColor(order.payment_status))}>
                  {paymentStatusLabel(order.payment_status, language)}
                </span>
              </div>

              {order.items?.[0]?.book?.title && (
                <p className="mt-3 line-clamp-1 text-sm font-semibold text-gray-800">
                  {order.items[0].book.title}
                </p>
              )}
            </div>

            <div className="flex flex-shrink-0 flex-col items-end justify-center gap-2 py-4 pl-1 pr-4 text-right">
              <p className="text-sm font-bold text-primary-700 sm:text-base">
                {formatPrice(order.total_amount, currency)}
              </p>
              <ChevronRight className="h-4 w-4 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-primary-500" />
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}
