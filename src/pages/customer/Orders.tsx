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
    return (
      <EmptyState
        icon={<Package className="h-16 w-16" />}
        title={t('auth.signIn')}
        action={{ label: t('auth.signIn'), onClick: () => navigate('/auth') }}
      />
    )
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
          className="w-full bg-white rounded-2xl border border-gray-100 p-4 text-left hover:shadow-sm transition-shadow"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
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

              <div className="mt-2 flex gap-1 overflow-hidden">
                {order.items?.slice(0, 3).map(item => (
                  <div key={item.id} className="w-8 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {item.book?.cover_image_url && (
                      <img src={item.book.cover_image_url} alt={item.book.title} className="w-full h-full object-cover" />
                    )}
                  </div>
                ))}
                {(order.items?.length ?? 0) > 3 && (
                  <div className="w-8 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-400 flex-shrink-0">
                    +{(order.items?.length ?? 0) - 3}
                  </div>
                )}
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <p className="text-base font-bold text-primary-700">{formatPrice(order.total_amount, currency)}</p>
              <ChevronRight className="h-4 w-4 text-gray-300 ml-auto mt-1" />
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}
