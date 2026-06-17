import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Upload, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Order } from '@/types'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { useToast } from '@/components/ui/Toast'
import { formatPrice, formatDateTime, orderStatusLabel, orderStatusColor, paymentStatusLabel, paymentStatusColor } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { currency, language } = useLanguage()
  const { success, error } = useToast()
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('orders')
        .select('*, items:order_items(*, book:books(*), bookstore:bookstores(name)), payments(*), deliveries(*)')
        .eq('id', id!)
        .single()
      return data as Order
    },
    enabled: !!id,
  })

  if (isLoading) return <LoadingSpinner />
  if (!order) return <div className="py-12 text-center text-gray-400">Order not found.</div>

  const payment = order.payments?.[0]
  const delivery = order.deliveries?.[0]
  const needsPayment = order.payment_status === 'PENDING' && payment?.method !== 'CASH_ON_DELIVERY'

  async function handleReceiptUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !payment) return
    setUploading(true)
    try {
      const path = `receipts/${order.id}/${Date.now()}-${file.name}`
      const { error: uploadErr } = await supabase.storage.from('receipts').upload(path, file)
      if (uploadErr) throw uploadErr

      const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(path)

      await supabase
        .from('payments')
        .update({ receipt_image_url: publicUrl, verification_status: 'REQUIRES_REVIEW' })
        .eq('id', payment.id)

      await supabase.functions.invoke('verify-receipt', {
        body: { payment_id: payment.id, receipt_url: publicUrl, expected_amount: order.total_amount },
      })

      await qc.invalidateQueries({ queryKey: ['order', id] })
      success(t('payment.receiptUploaded'))
    } catch {
      error(t('common.error'))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4 pb-8 max-w-lg mx-auto">
      <button onClick={() => navigate('/orders')} className="flex items-center gap-2 text-sm text-gray-500">
        <ChevronLeft className="h-4 w-4" /> {t('orders.title')}
      </button>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-xs text-gray-400">{t('orders.orderNumber')}{order.order_number}</p>
        <p className="text-xs text-gray-400">{formatDateTime(order.created_at, language)}</p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', orderStatusColor(order.status))}>
            {orderStatusLabel(order.status, language)}
          </span>
          <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', paymentStatusColor(order.payment_status))}>
            {paymentStatusLabel(order.payment_status, language)}
          </span>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Items</h3>
        {order.items?.map(item => (
          <div key={item.id} className="flex items-center gap-3">
            <div className="w-10 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
              {item.book?.cover_image_url && (
                <img src={item.book.cover_image_url} alt={item.book.title} className="w-full h-full object-cover" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 line-clamp-1">{item.book?.title}</p>
              <p className="text-xs text-gray-400">{item.bookstore?.name} · qty {item.quantity}</p>
            </div>
            <p className="text-sm font-semibold text-gray-800">
              {formatPrice(item.final_price * item.quantity, currency)}
            </p>
          </div>
        ))}
        <div className="border-t pt-2 flex justify-between text-sm font-bold">
          <span>Total</span>
          <span className="text-primary-700">{formatPrice(order.total_amount, currency)}</span>
        </div>
      </div>

      {/* Delivery info */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
        <h3 className="text-sm font-semibold text-gray-700">Delivery</h3>
        <p className="text-sm text-gray-600">{order.customer_name}</p>
        <p className="text-sm text-gray-600">{order.customer_phone}</p>
        <p className="text-sm text-gray-600">{order.delivery_address}</p>
        {delivery && (
          <div className="mt-3 rounded-xl bg-gray-50 p-3 space-y-1">
            <p className="text-xs font-medium text-gray-700">{t('orders.courier')}: {delivery.courier}</p>
            {delivery.tracking_number && (
              <p className="text-xs text-gray-500">{t('orders.trackingNumber')}: {delivery.tracking_number}</p>
            )}
          </div>
        )}
      </div>

      {/* Payment & Receipt */}
      {payment && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Payment</h3>
          <p className="text-xs text-gray-500">Method: {payment.method.replace('_', ' ')}</p>

          {payment.verification_status === 'VERIFIED' && (
            <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
              <CheckCircle className="h-4 w-4" /> {t('payment.verified')}
            </div>
          )}

          {needsPayment && (
            <div className="space-y-3">
              {payment.method === 'QR_PAYMENT' && (
                <div className="rounded-xl bg-gray-50 p-4 text-center">
                  <p className="text-sm font-semibold text-gray-700">{t('payment.qrTitle')}</p>
                  <p className="text-xs text-gray-400 mt-1">{t('payment.qrInstructions')}</p>
                  <div className="mt-3 w-32 h-32 bg-gray-200 rounded-xl mx-auto flex items-center justify-center text-xs text-gray-400">
                    QR Code
                  </div>
                  <p className="mt-2 text-lg font-bold text-primary-700">{formatPrice(order.total_amount, currency)}</p>
                </div>
              )}

              {payment.receipt_image_url ? (
                <div className="rounded-xl bg-green-50 p-3 text-sm text-green-700">
                  {payment.verification_status === 'REQUIRES_REVIEW'
                    ? t('payment.requiresReview')
                    : t('payment.receiptUploaded')}
                </div>
              ) : (
                <>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleReceiptUpload} />
                  <Button
                    fullWidth
                    variant="outline"
                    loading={uploading}
                    icon={<Upload className="h-4 w-4" />}
                    onClick={() => fileRef.current?.click()}
                  >
                    {t('payment.uploadReceipt')}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
