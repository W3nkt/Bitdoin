import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PackageSearch, Search } from 'lucide-react'
import { trackOrder } from '@/lib/guestOrders'
import { useLanguage } from '@/context/LanguageContext'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { GuestPaymentPanel } from '@/components/order/GuestPaymentPanel'
import { cn, formatDateTime, formatPrice, orderStatusColor, orderStatusLabel, paymentStatusColor, paymentStatusLabel } from '@/lib/utils'
import type { Order } from '@/types'

export function TrackOrder() {
  const { t } = useTranslation()
  const { currency, language } = useLanguage()
  const { error } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialOrderNumber = searchParams.get('order') ?? ''
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber)
  const [phone, setPhone] = useState(
    initialOrderNumber ? sessionStorage.getItem(`pwen-track-phone:${initialOrderNumber}`) ?? '' : ''
  )
  const [order, setOrder] = useState<Order | null>(null)
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)

  async function handleTrack(event?: React.FormEvent) {
    event?.preventDefault()
    if (!orderNumber.trim() || !phone.trim()) return
    setSearching(true)
    try {
      const result = await trackOrder(orderNumber, phone)
      setOrder(result)
      setSearched(true)
      if (result) {
        sessionStorage.setItem(`pwen-track-phone:${result.order_number}`, phone)
        setSearchParams({ order: result.order_number })
      }
    } catch (trackError) {
      console.error('[track order]', trackError)
      error(t('common.error'))
    } finally {
      setSearching(false)
    }
  }

  useEffect(() => {
    if (orderNumber && phone) void handleTrack()
    // Initial query-string lookup only.
  }, [])

  return (
    <div className="mx-auto max-w-lg space-y-5 pb-10">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{t('tracking.title')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('tracking.subtitle')}</p>
      </div>

      <form onSubmit={handleTrack} className="space-y-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-card">
        <Input
          label={t('tracking.orderCode')}
          value={orderNumber}
          onChange={event => setOrderNumber(event.target.value.toUpperCase())}
          placeholder="PB-XXXXXXXXXXXX"
          autoComplete="off"
          required
        />
        <Input
          label={t('checkout.phone')}
          type="tel"
          value={phone}
          onChange={event => setPhone(event.target.value)}
          placeholder="020..."
          autoComplete="tel"
          required
        />
        <Button type="submit" fullWidth loading={searching} icon={<Search className="h-4 w-4" />}>
          {t('tracking.trackButton')}
        </Button>
      </form>

      {searched && !order && (
        <div className="rounded-2xl border border-gray-100 bg-white px-5 py-10 text-center">
          <PackageSearch className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-3 text-sm font-semibold text-gray-700">{t('tracking.notFound')}</p>
          <p className="mt-1 text-xs text-gray-400">{t('tracking.checkDetails')}</p>
        </div>
      )}

      {order && (
        <div className="space-y-4 animate-fade-in">
          <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-card">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-mono text-sm font-bold text-gray-900">{order.order_number}</p>
                <p className="mt-1 text-xs text-gray-400">{formatDateTime(order.created_at, language)}</p>
              </div>
              <p className="shrink-0 text-base font-bold text-primary-700">
                {formatPrice(order.total_amount, currency)}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', orderStatusColor(order.status))}>
                {orderStatusLabel(order.status, language)}
              </span>
              <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', paymentStatusColor(order.payment_status))}>
                {paymentStatusLabel(order.payment_status, language)}
              </span>
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-gray-100 bg-white p-4">
            <h2 className="text-sm font-semibold text-gray-700">{t('orders.items')}</h2>
            {order.items?.map(item => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="h-14 w-11 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {item.book?.cover_image_url && (
                    <img src={item.book.cover_image_url} alt={item.book.title} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-medium text-gray-800">{item.book?.title}</p>
                  <p className="text-xs text-gray-400">{item.bookstore?.name} · {t('cart.qty')} {item.quantity}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-gray-800">
                  {formatPrice(item.final_price * item.quantity, currency)}
                </p>
              </div>
            ))}
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-4">
            <h2 className="text-sm font-semibold text-gray-700">{t('tracking.delivery')}</h2>
            <p className="mt-2 text-sm text-gray-600">{order.customer_name}</p>
            <p className="text-sm text-gray-600 whitespace-pre-line">{order.delivery_address}</p>
            {order.deliveries?.[0] && (
              <div className="mt-3 rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
                <p>{t('orders.courier')}: {order.deliveries[0].courier}</p>
                {order.deliveries[0].tracking_number && (
                  <p className="mt-1 font-mono">{t('orders.trackingNumber')}: {order.deliveries[0].tracking_number}</p>
                )}
              </div>
            )}
          </section>

          <GuestPaymentPanel
            order={order}
            customerPhone={phone}
            onOrderChange={setOrder}
          />
        </div>
      )}
    </div>
  )
}
