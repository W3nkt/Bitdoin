import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { CheckCircle, Clock, Copy, CreditCard, Download, ImageUp, Smartphone, Upload, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { trackOrder, uploadGuestReceipt } from '@/lib/guestOrders'
import { useLanguage } from '@/context/LanguageContext'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { Receipt } from '@/components/ui/Receipt'
import { StorageImage } from '@/components/ui/StorageImage'
import { formatPrice } from '@/lib/utils'
import type { Order, PaymentAccount } from '@/types'
import type { ReactNode } from 'react'

interface GuestPaymentPanelProps {
  order: Order
  customerPhone: string
  accessToken?: string
  onOrderChange: (order: Order) => void
  onPaymentSubmitted?: (order: Order) => void
}

export function GuestPaymentPanel({
  order,
  customerPhone,
  accessToken,
  onOrderChange,
  onPaymentSubmitted,
}: GuestPaymentPanelProps) {
  const { t } = useTranslation()
  const { currency, language } = useLanguage()
  const { success, error } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const payment = order.payments?.[0]
  const isCOD = payment?.method === 'CASH_ON_DELIVERY'
  const canUpload = payment && !isCOD && payment.verification_status !== 'VERIFIED' &&
    payment.verification_status !== 'REQUIRES_REVIEW'

  const { data: accounts = [], isLoading: loadingAccounts, error: accountsError } = useQuery({
    queryKey: ['payment_accounts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('payment_accounts')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      return (data ?? []) as PaymentAccount[]
    },
    refetchOnMount: 'always',
  })

  async function copyOrderCode() {
    await navigator.clipboard.writeText(order.order_number)
    success(t('common.copied'))
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !payment) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      error(t('payment.imageOnly'))
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      error(t('payment.fileTooLarge'))
      return
    }

    setUploading(true)
    try {
      await uploadGuestReceipt({ order, customerPhone, accessToken, file })
      const refreshed = await trackOrder(order.order_number, customerPhone)
      if (refreshed) {
        onOrderChange(refreshed)
        onPaymentSubmitted?.(refreshed)
      }
      success(t('payment.receiptUploaded'))
    } catch (uploadError) {
      console.error('[guest receipt upload]', uploadError)
      error(uploadError instanceof Error ? uploadError.message : t('common.error'))
    } finally {
      setUploading(false)
    }
  }

  if (!payment) return null

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-primary-50 px-4 py-3">
        <p className="text-xs font-medium text-primary-500">{t('tracking.saveCode')}</p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <p className="truncate font-mono text-lg font-bold text-primary-800">{order.order_number}</p>
          <button
            type="button"
            onClick={copyOrderCode}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-primary-700 shadow-sm transition-colors hover:bg-primary-100"
            aria-label={t('tracking.copyCode')}
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
      </div>

      {payment.verification_status === 'VERIFIED' && (
        <StatusMessage
          icon={<CheckCircle className="h-5 w-5" />}
          className="bg-green-50 text-green-700"
          title={t('payment.verified')}
          detail={t('orders.receiptReady')}
        />
      )}

      {payment.verification_status === 'REQUIRES_REVIEW' && (
        <StatusMessage
          icon={<Clock className="h-5 w-5" />}
          className="bg-orange-50 text-orange-700"
          title={t('orders.underReview')}
          detail={t('payment.requiresReview')}
        />
      )}

      {payment.verification_status === 'REJECTED' && (
        <StatusMessage
          icon={<XCircle className="h-5 w-5" />}
          className="bg-red-50 text-red-700"
          title={t('payment.rejected')}
          detail={payment.rejection_reason || t('payment.uploadNew')}
        />
      )}

      {isCOD ? (
        <StatusMessage
          icon={<CreditCard className="h-5 w-5" />}
          className="bg-blue-50 text-blue-700"
          title={t('checkout.paymentMethods.CASH_ON_DELIVERY')}
          detail={t('tracking.codNote')}
        />
      ) : payment.verification_status !== 'VERIFIED' && (
        <>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">{t('payment.payNow')}</h3>
            <p className="mt-1 text-xs text-gray-500">{t('payment.payThenUpload')}</p>
          </div>
          {loadingAccounts ? (
            <div className="rounded-2xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
              {t('common.loading')}
            </div>
          ) : accountsError ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
              {accountsError instanceof Error ? accountsError.message : t('common.error')}
            </p>
          ) : (
            <PaymentInstructions
              method={payment.method}
              amount={order.total_amount}
              currency={currency}
              accounts={accounts}
            />
          )}
        </>
      )}

      {payment.receipt_image_url && payment.verification_status !== 'VERIFIED' && (
        <StorageImage
          src={payment.receipt_image_url}
          bucket="receipts"
          alt={t('payment.receipt')}
          className="max-h-56 w-full rounded-2xl border border-gray-100 bg-gray-50 object-contain"
        />
      )}

      {canUpload && (
        <div className="rounded-2xl border-2 border-dashed border-primary-200 bg-primary-50/60 p-4">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleUpload}
          />
          <div className="mb-3 text-center">
            <ImageUp className="mx-auto h-8 w-8 text-primary-500" />
            <p className="mt-2 text-sm font-semibold text-primary-800">{t('payment.submitProof')}</p>
            <p className="mt-1 text-xs text-primary-600">{t('payment.submitProofNote')}</p>
          </div>
          <Button
            type="button"
            fullWidth
            loading={uploading}
            icon={<Upload className="h-4 w-4" />}
            onClick={() => inputRef.current?.click()}
          >
            {payment.verification_status === 'REJECTED' ? t('payment.uploadNew') : t('payment.uploadAndSubmit')}
          </Button>
        </div>
      )}

      {(payment.verification_status === 'REQUIRES_REVIEW' || payment.verification_status === 'VERIFIED') && (
        <Receipt order={order} payment={payment} language={language} currency={currency} />
      )}
    </div>
  )
}

export function PaymentInstructions({
  method,
  amount,
  currency,
  accounts,
}: {
  method: NonNullable<Order['payments']>[number]['method']
  amount: number
  currency: import('@/types').Currency
  accounts: PaymentAccount[]
}) {
  const { t } = useTranslation()
  const { success } = useToast()
  const relevantAccounts = accounts.filter(account => account.method === method)

  async function copyValue(value: string) {
    await navigator.clipboard.writeText(value)
    success(t('common.copied'))
  }

  async function downloadImage(url: string, filename: string) {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(url, '_blank')
    }
  }

  return (
    <div className="space-y-3">
      {relevantAccounts.map(account => (
        <div key={account.id} className="space-y-3 rounded-2xl border-2 border-primary-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            {method === 'QR_PAYMENT'
              ? <Smartphone className="h-4 w-4 text-primary-600" />
              : <CreditCard className="h-4 w-4 text-primary-600" />}
            <p className="text-sm font-semibold text-gray-800">{account.label}</p>
          </div>
          {account.qr_image_url && (
            <div className="space-y-2">
              <a href={account.qr_image_url} target="_blank" rel="noopener noreferrer" className="block">
                <img
                  src={account.qr_image_url}
                  alt={account.label}
                  className="mx-auto h-64 w-64 max-w-full rounded-2xl border-2 border-gray-200 bg-white object-contain p-2 shadow-sm"
                />
              </a>
              <button
                type="button"
                onClick={() => downloadImage(account.qr_image_url!, `${account.label}-qr.png`)}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-100"
              >
                <Download className="h-3.5 w-3.5" />
                {t('payment.downloadQr')}
              </button>
            </div>
          )}
          {account.bank_name && <InfoRow label={t('payment.bankName')} value={account.bank_name} />}
          {account.account_name && <InfoRow label={t('payment.accountName')} value={account.account_name} />}
          {account.account_number && method !== 'QR_PAYMENT' && (
            <div className="rounded-xl border-2 border-primary-300 bg-primary-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-primary-600">
                    {t('payment.transferTo')}
                  </p>
                  <p className="mt-0.5 break-all font-mono text-lg font-bold text-primary-900">
                    {account.account_number}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => copyValue(account.account_number!)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-primary-700 shadow-sm transition-colors hover:bg-primary-100"
                  aria-label={t('common.copy')}
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
          {account.instructions && <p className="rounded-xl bg-primary-50 px-3 py-2 text-xs text-primary-700">{account.instructions}</p>}
          <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3 text-center">
            <p className="text-xs font-semibold text-emerald-700">{t('payment.amount')}</p>
            <p className="text-2xl font-bold text-emerald-800">{formatPrice(amount, currency)}</p>
          </div>
        </div>
      ))}
      {relevantAccounts.length === 0 && (
        <p className="rounded-xl bg-orange-50 px-3 py-2 text-xs text-orange-700">
          {t('payment.accountUnavailable')}
        </p>
      )}
    </div>
  )
}

function StatusMessage({
  icon,
  className,
  title,
  detail,
}: {
  icon: ReactNode
  className: string
  title: string
  detail: string
}) {
  return (
    <div className={`flex items-start gap-3 rounded-2xl p-4 ${className}`}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-xs opacity-80">{detail}</p>
      </div>
    </div>
  )
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 text-xs">
      <span className="shrink-0 text-gray-400">{label}</span>
      <span className={`break-all text-right font-medium text-gray-700 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}
