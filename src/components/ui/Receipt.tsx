import { useRef, useState } from 'react'
import { CheckCircle, Clock, Download, ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Order, Payment, Language, Currency } from '@/types'
import { Button } from './Button'
import { publicAsset } from '@/lib/assets'
import { localizeDeliveryAddress } from '@/lib/deliveryAddress'
import { formatPrice, formatDate, formatDateTime } from '@/lib/utils'

interface ReceiptProps {
  order: Order
  payment: Payment
  language?: Language
  currency?: Currency
  showAdminPricing?: boolean
}

export function Receipt({
  order,
  payment,
  language = 'en',
  currency = 'LAK',
  showAdminPricing = false,
}: ReceiptProps) {
  const { t } = useTranslation()
  const receiptRef = useRef<HTMLDivElement>(null)
  const [saving, setSaving] = useState(false)

  const verifiedAt = payment.reviewed_at ?? payment.created_at
  const isVerified = payment.verification_status === 'VERIFIED'
  const isCOD = payment.method === 'CASH_ON_DELIVERY'
  const bannerClass = isVerified
    ? 'bg-green-50 border-green-100'
    : isCOD
      ? 'bg-blue-50 border-blue-100'
      : 'bg-orange-50 border-orange-100'
  const statusClass = isVerified ? 'text-green-700' : isCOD ? 'text-blue-700' : 'text-orange-700'
  const detailClass = isVerified ? 'text-green-600' : isCOD ? 'text-blue-600' : 'text-orange-600'
  const trackingUrl = `${window.location.origin}/#/track?order=${encodeURIComponent(order.order_number)}`
  const deliveryFields = localizeDeliveryAddress(order.delivery_address, language)
  const storePriceTotal = order.items?.reduce(
    (sum, item) => sum + Number(item.bookstore_price) * item.quantity,
    0,
  ) ?? 0
  const finalPriceTotal = order.items?.reduce(
    (sum, item) => sum + Number(item.final_price) * item.quantity,
    0,
  ) ?? 0
  const marginAmount = finalPriceTotal - storePriceTotal

  async function handleSaveImage() {
    if (!receiptRef.current) return
    setSaving(true)
    try {
      const { default: html2canvas } = await import('html2canvas')
      const receiptCanvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      })
      const canvas = document.createElement('canvas')
      canvas.width = 956
      canvas.height = 1500
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Could not create receipt image')

      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)

      const scale = Math.min(
        canvas.width / receiptCanvas.width,
        canvas.height / receiptCanvas.height,
      )
      const width = Math.round(receiptCanvas.width * scale)
      const height = Math.round(receiptCanvas.height * scale)
      const x = Math.round((canvas.width - width) / 2)
      const y = Math.round((canvas.height - height) / 2)
      context.drawImage(receiptCanvas, x, y, width, height)

      const link = document.createElement('a')
      link.download = `receipt-${order.order_number}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Downloadable receipt card */}
      <div ref={receiptRef} className="bg-white rounded-2xl border-2 border-primary-100 overflow-hidden">

        {/* Header */}
        <div className="bg-orange-50 border-b border-orange-100 px-5 py-4 flex items-center justify-between">
          <img
            src={publicAsset('icons/Bitdoin-Logo.png')}
            alt="Bitdoin"
            className="h-9 w-auto object-contain"
            crossOrigin="anonymous"
          />
          <div className="text-right">
            <p className="text-orange-700/70 text-[10px] uppercase tracking-wide">{t('payment.receipt')}</p>
            <p className="text-primary-800 font-mono text-xs font-bold">#{order.order_number}</p>
          </div>
        </div>

        {/* Payment status banner */}
        <div className={`${bannerClass} border-b px-5 py-3 flex items-center gap-3`}>
          {isVerified ? (
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          ) : (
            <Clock className={`h-5 w-5 flex-shrink-0 ${isCOD ? 'text-blue-500' : 'text-orange-500'}`} />
          )}
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-bold ${statusClass}`}>
              {isVerified
                ? t('payment.verified')
                : isCOD
                  ? t('checkout.paymentMethods.CASH_ON_DELIVERY')
                  : t('orders.awaitingPayment')}
            </p>
            <p className={`text-[11px] ${detailClass}`}>
              {formatDateTime(verifiedAt, language)}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[10px] text-gray-400">{t('payment.amount')}</p>
            <p className="text-sm font-bold text-primary-700">{formatPrice(payment.amount, currency)}</p>
          </div>
        </div>

        {/* Bill to */}
        <div className="px-5 py-4 border-b border-gray-50">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-900">{t('payment.billTo')}</p>
          <p className="text-sm font-semibold text-gray-800">{order.customer_name}</p>
          <p className="text-xs text-gray-500">{order.customer_phone}</p>
        </div>

        {/* Delivery */}
        <div className="px-5 py-4 border-b border-gray-50 space-y-1.5">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-900">{t('checkout.deliveryInfo')}</p>
          <div className="space-y-2">
            {deliveryFields.map(field => (
              <ReceiptRow key={field.key} label={field.label} value={field.value} />
            ))}
          </div>
          {order.deliveries?.[0] && (
            <div className="mt-2 space-y-1.5 pt-2 border-t border-dashed border-gray-100">
              <ReceiptRow label={t('orders.courier')} value={order.deliveries[0].courier} />
              {order.deliveries[0].tracking_number && (
                <ReceiptRow label={t('orders.trackingNumber')} value={order.deliveries[0].tracking_number} mono />
              )}
              {order.deliveries[0].estimated_delivery_at && (
                <ReceiptRow label={t('orders.estimatedDelivery')} value={formatDate(order.deliveries[0].estimated_delivery_at, language)} />
              )}
            </div>
          )}
          {!order.deliveries?.[0] && (
            <p className="text-[11px] text-gray-400 italic">{t('orders.courier')}: —</p>
          )}
        </div>

        {/* Items */}
        {order.items && order.items.length > 0 && (
          <div className="px-5 py-4 border-b border-gray-50">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-gray-900">{t('orders.items')}</p>
            <div className="divide-y divide-dashed divide-gray-100">
              {order.items.map(item => (
                <div key={item.id} className="flex justify-between items-start gap-4 py-2.5 text-xs first:pt-1">
                  <span className="min-w-0 flex-1 break-words pr-2 leading-5 text-gray-600">
                    {item.book?.title}
                    <span className="whitespace-nowrap text-gray-400"> ×{item.quantity}</span>
                    {showAdminPricing && (
                      <span className="mt-1 block text-[10px] leading-4 text-gray-400">
                        Store: {formatPrice(Number(item.bookstore_price), currency)} · Final: {formatPrice(Number(item.final_price), currency)}
                      </span>
                    )}
                  </span>
                  <span className="flex-shrink-0 pt-0.5 font-semibold leading-5 text-gray-800">
                    {formatPrice(item.final_price * item.quantity, currency)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-dashed border-gray-200 mt-3 pt-3 flex justify-between text-sm font-bold">
              <span className="text-gray-700">{t('checkout.total')}</span>
              <span className="text-primary-700">{formatPrice(order.total_amount, currency)}</span>
            </div>
            {showAdminPricing && (
              <div className="mt-3 space-y-1.5 rounded-xl bg-gray-50 p-3">
                <ReceiptRow label="Store price total" value={formatPrice(storePriceTotal, currency)} />
                <ReceiptRow label="Final price total" value={formatPrice(finalPriceTotal, currency)} />
                <div className="border-t border-gray-200 pt-1.5">
                  <ReceiptRow label="Order margin" value={formatPrice(marginAmount, currency)} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Payment details */}
        <div className="px-5 py-4 border-b border-gray-50 space-y-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t('payment.paymentDetails')}</p>
          <ReceiptRow label={t('payment.method')} value={t(`checkout.paymentMethods.${payment.method}`)} />
          {payment.transaction_reference && (
            <ReceiptRow label={t('payment.reference')} value={payment.transaction_reference} mono />
          )}
          {payment.sender_name && (
            <ReceiptRow label={t('payment.sender')} value={payment.sender_name} />
          )}
          {payment.bank_name && (
            <ReceiptRow label={t('payment.bankNameLabel')} value={payment.bank_name} />
          )}
          {payment.transferred_at && (
            <ReceiptRow label={t('payment.transferDate')} value={formatDate(payment.transferred_at, language)} />
          )}
        </div>

        {/* Tracking footer */}
        <div className="bg-primary-50 px-5 py-4 text-center">
          <p className="text-[11px] text-gray-500 mb-1">{t('payment.trackingNote')}</p>
          <a
            href={trackingUrl}
            className="inline-flex items-center gap-1 font-mono text-base font-bold text-primary-700 transition-colors hover:text-primary-900"
            target="_blank"
            rel="noopener noreferrer"
          >
            #{order.order_number} <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <a
            href={trackingUrl}
            className="mt-1.5 flex items-center justify-center gap-1 text-[11px] text-primary-500 transition-colors hover:text-primary-700"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('orders.tracking')} <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Download button */}
      <Button
        fullWidth
        variant="outline"
        loading={saving}
        icon={<Download className="h-4 w-4" />}
        onClick={handleSaveImage}
      >
        {t('payment.downloadReceipt')}
      </Button>
    </div>
  )
}

function ReceiptRow({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex justify-between items-start gap-4 text-xs">
      <span className="text-gray-400 flex-shrink-0">{label}</span>
      <span className={`text-gray-700 text-right break-all ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}
