import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Upload, CheckCircle, Clock, XCircle, CreditCard, Smartphone, ZoomIn, Download } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Order, PaymentAccount } from '@/types'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Receipt } from '@/components/ui/Receipt'
import { StorageImage } from '@/components/ui/StorageImage'
import { useLanguage } from '@/context/LanguageContext'
import { useToast } from '@/components/ui/Toast'
import {
  formatPrice, formatDateTime,
  orderStatusLabel, orderStatusColor,
  paymentStatusLabel, paymentStatusColor,
  cn,
} from '@/lib/utils'

const RECEIPT_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const RECEIPT_MAX_BYTES = 10 * 1024 * 1024

export function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
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

  const { data: paymentAccounts = [] } = useQuery({
    queryKey: ['payment_accounts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('payment_accounts')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      return (data ?? []) as PaymentAccount[]
    },
  })

  if (isLoading) return <LoadingSpinner />
  if (!order) return <div className="py-12 text-center text-gray-400">{t('orders.notFound')}</div>

  const payment = order.payments?.[0]
  const delivery = order.deliveries?.[0]
  const isCOD = payment?.method === 'CASH_ON_DELIVERY'
  const isVerified = payment?.verification_status === 'VERIFIED'
  const isRejected = payment?.verification_status === 'REJECTED'
  const isUnderReview = payment?.verification_status === 'REQUIRES_REVIEW'
  const awaitingUpload = !payment?.receipt_image_url && payment?.verification_status === 'PENDING' && !isCOD
  const canPay = (awaitingUpload || isRejected) && !isCOD

  async function handleReceiptUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !payment) return
    // Reset input so the same file can be re-selected if needed
    e.target.value = ''
    if (!RECEIPT_MIME_TYPES.includes(file.type)) {
      error('Upload a JPG, PNG, or WebP image.')
      return
    }
    if (file.size > RECEIPT_MAX_BYTES) {
      error('Payment receipt must be 10 MB or smaller.')
      return
    }
    setUploading(true)
    try {
      const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
      const path = `receipts/${order!.id}/${crypto.randomUUID()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('receipts')
        .upload(path, file, { contentType: file.type, upsert: false })
      if (uploadErr) throw uploadErr

      const { error: updateErr } = await supabase
        .from('payments')
        .update({ receipt_image_url: path, verification_status: 'REQUIRES_REVIEW' })
        .eq('id', payment.id)
      if (updateErr) throw updateErr

      // Trigger AI verification in the background (non-blocking)
      supabase.functions.invoke('verify-receipt', {
        body: { payment_id: payment.id },
      }).catch(() => {})

      await qc.invalidateQueries({ queryKey: ['order', id] })
      success(t('payment.receiptUploaded'))
    } catch (err) {
      console.error('[handleReceiptUpload]', err)
      const msg = (err as { message?: string })?.message
      error(msg ? `Upload failed: ${msg}` : t('common.error'))
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
        <p className="text-xs text-gray-400 font-mono">{t('orders.orderNumber')}{order.order_number}</p>
        <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(order.created_at, language)}</p>
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
        <h3 className="text-sm font-semibold text-gray-700">{t('orders.items')}</h3>
        {order.items?.map(item => (
          <div key={item.id} className="flex items-center gap-3">
            <div className="w-10 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
              {item.book?.cover_image_url && (
                <img src={item.book.cover_image_url} alt={item.book.title} className="w-full h-full object-cover" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 line-clamp-1">{item.book?.title}</p>
              <p className="text-xs text-gray-400">{item.bookstore?.name} · {t('cart.qty')} {item.quantity}</p>
            </div>
            <p className="text-sm font-semibold text-gray-800 flex-shrink-0">
              {formatPrice(item.final_price * item.quantity, currency)}
            </p>
          </div>
        ))}
        <div className="border-t pt-2 flex justify-between text-sm font-bold">
          <span>{t('checkout.total')}</span>
          <span className="text-primary-700">{formatPrice(order.total_amount, currency)}</span>
        </div>
        <p className="text-xs text-gray-400">{t('cart.deliveryFeeNote')}</p>
      </div>

      {/* Delivery info */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
        <h3 className="text-sm font-semibold text-gray-700">{t('checkout.deliveryInfo')}</h3>
        <p className="text-sm text-gray-600">{order.customer_name}</p>
        <p className="text-sm text-gray-600">{order.customer_phone}</p>
        <p className="text-sm text-gray-600 whitespace-pre-line">{order.delivery_address}</p>
        {delivery && (
          <div className="mt-3 rounded-xl bg-gray-50 p-3 space-y-1">
            <p className="text-xs font-medium text-gray-700">{t('orders.courier')}: {delivery.courier}</p>
            {delivery.tracking_number && (
              <p className="text-xs text-gray-500">{t('orders.trackingNumber')}: {delivery.tracking_number}</p>
            )}
          </div>
        )}
      </div>

      {/* ── Payment section ── */}
      {payment && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">{t('checkout.paymentMethod')}</h3>
            <span className="text-xs text-gray-400">{t(`checkout.paymentMethods.${payment.method}`)}</span>
          </div>

          {/* STATE 1 — COD, nothing to do */}
          {isCOD && (
            <div className="rounded-xl bg-blue-50 p-3 flex items-center gap-2 text-sm text-blue-700">
              <CreditCard className="h-4 w-4 flex-shrink-0" />
              <span>{t('cart.deliveryFeeNote')}</span>
            </div>
          )}

          {/* STATE 2 — VERIFIED → show full receipt */}
          {isVerified && (
            <div className="space-y-3">
              <div className="rounded-xl bg-green-50 p-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-700">{t('payment.verified')}</p>
                  <p className="text-xs text-green-600">{t('orders.receiptReady')}</p>
                </div>
              </div>
              <Receipt order={order} payment={payment} language={language} currency={currency} />
            </div>
          )}

          {/* STATE 3 — UNDER REVIEW */}
          {isUnderReview && (
            <div className="space-y-3">
              <div className="rounded-xl bg-orange-50 border border-orange-100 p-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-orange-700">{t('orders.underReview')}</p>
                  <p className="text-xs text-orange-600">{t('payment.requiresReview')}</p>
                </div>
              </div>
              {payment.receipt_image_url && (
                <div className="rounded-xl overflow-hidden border border-gray-100">
                  <StorageImage
                    src={payment.receipt_image_url}
                    bucket="receipts"
                    alt="Payment receipt"
                    className="w-full max-h-56 object-contain bg-gray-50"
                  />
                </div>
              )}
            </div>
          )}

          {/* STATE 4 — REJECTED → show reason + re-upload */}
          {isRejected && (
            <div className="space-y-3">
              <div className="rounded-xl bg-red-50 border border-red-100 p-3 flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-700">{t('payment.rejected')}</p>
                  {payment.rejection_reason && (
                    <p className="text-xs text-red-500 mt-0.5">{t('payment.rejectionReason')}: {payment.rejection_reason}</p>
                  )}
                </div>
              </div>
              <PaymentInstructions payment={payment} order={order} currency={currency} t={t} accounts={paymentAccounts} />
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleReceiptUpload} />
              <Button
                fullWidth
                loading={uploading}
                icon={<Upload className="h-4 w-4" />}
                onClick={() => fileRef.current?.click()}
              >
                {t('payment.uploadNew')}
              </Button>
            </div>
          )}

          {/* STATE 5 — PENDING, awaiting upload */}
          {canPay && !isRejected && (
            <div className="space-y-3">
              <PaymentInstructions payment={payment} order={order} currency={currency} t={t} accounts={paymentAccounts} />
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleReceiptUpload} />
              <Button
                fullWidth
                loading={uploading}
                icon={<Upload className="h-4 w-4" />}
                onClick={() => fileRef.current?.click()}
              >
                {t('payment.uploadReceipt')}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Payment instructions sub-component ──────────────────────────────────────

function PaymentInstructions({
  payment, order, currency, t, accounts,
}: {
  payment: NonNullable<Order['payments']>[number]
  order: Order
  currency: import('@/types').Currency
  t: (key: string) => string
  accounts: PaymentAccount[]
}) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [lightboxLabel, setLightboxLabel] = useState('')
  const [downloading, setDownloading] = useState(false)

  const relevantAccounts = accounts.filter(a => a.method === payment.method)

  async function handleDownloadQr(url: string, label: string) {
    setDownloading(true)
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = `qr-${label.replace(/\s+/g, '-').toLowerCase()}.png`
      a.click()
      URL.revokeObjectURL(objectUrl)
    } finally {
      setDownloading(false)
    }
  }

  function QrImage({ url, label }: { url: string; label: string }) {
    return (
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => { setLightboxUrl(url); setLightboxLabel(label) }}
          className="group relative w-48 h-48 rounded-xl border-2 border-gray-200 bg-white p-1 hover:border-primary-400 transition-colors cursor-zoom-in"
          title="Tap to enlarge"
        >
          <img
            src={url}
            alt={`QR — ${label}`}
            className="w-full h-full object-contain rounded-lg"
          />
          <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
            <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 drop-shadow transition-opacity" />
          </div>
        </button>
      </div>
    )
  }

  return (
    <>
      {/* ── QR Lightbox modal ── */}
      <Modal
        open={!!lightboxUrl}
        onClose={() => setLightboxUrl(null)}
        title={lightboxLabel}
        size="md"
        footer={
          <Button
            icon={<Download className="h-4 w-4" />}
            loading={downloading}
            onClick={() => lightboxUrl && handleDownloadQr(lightboxUrl, lightboxLabel)}
          >
            {t('payment.downloadReceipt').replace('Receipt', 'QR')}
          </Button>
        }
      >
        {lightboxUrl && (
          <div className="flex flex-col items-center gap-3">
            <img
              src={lightboxUrl}
              alt={lightboxLabel}
              className="w-full max-w-xs rounded-xl border border-gray-100"
            />
            <p className="text-xs text-gray-400 text-center">{t('payment.qrInstructions')}</p>
          </div>
        )}
      </Modal>

      {/* ── QR Payment ── */}
      {payment.method === 'QR_PAYMENT' && (
        <div className="space-y-3">
          {relevantAccounts.length > 0 ? (
            relevantAccounts.map(acc => (
              <div key={acc.id} className="rounded-xl bg-gray-50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-primary-600" />
                  <p className="text-sm font-semibold text-gray-700">{acc.label}</p>
                </div>
                <p className="text-xs text-gray-500">{t('payment.qrInstructions')}</p>
                {acc.qr_image_url
                  ? <QrImage url={acc.qr_image_url} label={acc.label} />
                  : (
                    <div className="w-36 h-36 bg-white border-2 border-dashed border-gray-200 rounded-xl mx-auto flex items-center justify-center">
                      <span className="text-xs text-gray-400 text-center px-2">{t('payment.qrCode')}</span>
                    </div>
                  )}
                {acc.bank_name && <InfoRow label={t('payment.bankName')} value={acc.bank_name} />}
                {acc.account_name && <InfoRow label={t('payment.accountName')} value={acc.account_name} />}
                {acc.instructions && (
                  <p className="text-xs text-primary-600 bg-primary-50 rounded-lg px-3 py-2">{acc.instructions}</p>
                )}
                <div className="bg-white rounded-xl px-4 py-2.5 text-center border border-gray-100">
                  <p className="text-xs text-gray-400 mb-0.5">{t('payment.amount')}</p>
                  <p className="text-xl font-bold text-primary-700">{formatPrice(order.total_amount, currency)}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl bg-gray-50 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-primary-600" />
                <p className="text-sm font-semibold text-gray-700">{t('payment.qrTitle')}</p>
              </div>
              <p className="text-xs text-gray-500">{t('payment.qrInstructions')}</p>
              <div className="w-36 h-36 bg-white border-2 border-dashed border-gray-200 rounded-xl mx-auto flex items-center justify-center">
                <span className="text-xs text-gray-400 text-center px-2">{t('payment.qrCode')}</span>
              </div>
              <div className="bg-white rounded-xl px-4 py-2.5 text-center border border-gray-100">
                <p className="text-xs text-gray-400 mb-0.5">{t('payment.amount')}</p>
                <p className="text-xl font-bold text-primary-700">{formatPrice(order.total_amount, currency)}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Bank Transfer ── */}
      {payment.method === 'BANK_TRANSFER' && (
        <div className="space-y-3">
          {relevantAccounts.length > 0 ? (
            relevantAccounts.map(acc => (
              <div key={acc.id} className="rounded-xl bg-gray-50 p-4 space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard className="h-4 w-4 text-primary-600" />
                  <p className="text-sm font-semibold text-gray-700">{acc.label}</p>
                </div>
                <InfoRow label={t('payment.bankName')} value={acc.bank_name} />
                {acc.account_name && <InfoRow label={t('payment.accountName')} value={acc.account_name} />}
                {acc.account_number && <InfoRow label={t('payment.accountNumber')} value={acc.account_number} mono />}
                {acc.qr_image_url && <QrImage url={acc.qr_image_url} label={acc.label} />}
                {acc.instructions && (
                  <p className="text-xs text-primary-600 bg-primary-50 rounded-lg px-3 py-2">{acc.instructions}</p>
                )}
                <div className="bg-white rounded-xl px-4 py-2.5 text-center border border-gray-100 mt-2">
                  <p className="text-xs text-gray-400 mb-0.5">{t('payment.amount')}</p>
                  <p className="text-xl font-bold text-primary-700">{formatPrice(order.total_amount, currency)}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl bg-orange-50 border border-orange-100 p-3">
              <p className="text-xs text-orange-600">Bank transfer details not yet configured. Please contact support.</p>
            </div>
          )}
        </div>
      )}
    </>
  )
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center text-xs gap-2">
      <span className="text-gray-400 flex-shrink-0">{label}</span>
      <span className={`text-gray-700 font-medium text-right ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}
