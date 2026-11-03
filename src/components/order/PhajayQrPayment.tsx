import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, CheckCircle, Clock, ExternalLink, RefreshCw, Smartphone, XCircle } from 'lucide-react'
import brandMark from '../../../assets/brand-mark.png'
import { PhajayRequestError, checkPhajayPayment, isWaiting, startPhajayPayment, type PhajayTarget } from '@/lib/phajay'
import { formatPrice } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { QrCodeLogo } from '@/components/ui/QrCodeLogo'

interface PhajayQrPaymentProps {
  /** What is being paid: a shop order, an Academy Premium plan or the career report. */
  target: PhajayTarget
  /** Called once, when the payment is in. Reload whatever the screen shows; the server has already applied it. */
  onPaid: () => unknown
  /** The customer chose to pay another way. */
  onUseOtherWay: () => void
  /** QR payment is not switched on here; go straight to the other way. */
  onUnavailable: () => void
  /** Toast shown once the payment is in. */
  paidMessage?: string
}

const POLL_MS = 4000
const FINAL_STATES = ['paid', 'review', 'expired']

// Pay with a BCEL One QR from PhaJay. The phajay-checkout function makes the QR for exactly what is
// owed and applies the payment when PhaJay says it was paid; this screen only shows the QR and asks
// "is it paid yet?" every few seconds. If QR payment is not switched on (no PhaJay key, or the
// function is not deployed) it hands straight over to the bank-transfer flow, so removing the
// PHAJAY_API_KEY secret switches customers back to the fixed QR without a new release.
export default function PhajayQrPayment({ target, onPaid, onUseOtherWay, onUnavailable, paidMessage }: PhajayQrPaymentProps) {
  const { t } = useTranslation()
  const { success, error: showError } = useToast()
  const handedOver = useRef(false)
  // The latest callbacks, so a parent that re-renders never restarts the hand-over below.
  const latest = useRef({ onPaid, paidMessage, success, showError, t })
  latest.current = { onPaid, paidMessage, success, showError, t }

  const targetId = target.kind === 'shop_order' ? target.orderNumber : target.kind
  const start = useQuery({
    queryKey: ['phajay-start', target.kind, targetId],
    queryFn: () => startPhajayPayment(target),
    // The server keeps one QR per payment and returns it again, so there is nothing to refresh on its own.
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  })
  const started = start.data
  const waiting = isWaiting(started) ? started : null

  const check = useQuery({
    queryKey: ['phajay-check', target.kind, targetId, waiting?.transactionId],
    queryFn: () => checkPhajayPayment(target),
    enabled: !!waiting,
    gcTime: 0,
    retry: false,
    refetchInterval: query => (FINAL_STATES.includes(query.state.data?.state ?? '') ? false : POLL_MS),
    // The customer usually leaves for the bank app to pay; ask again the moment they come back.
    refetchOnWindowFocus: true,
  })

  const paid = started?.state === 'paid' || check.data?.state === 'paid'
  const review = started?.state === 'review' || check.data?.state === 'review'
  const expired = check.data?.state === 'expired'
  const startError = start.error instanceof PhajayRequestError ? start.error : null

  // Not switched on for this payment: no point showing a broken panel. No answer at all usually means the
  // function is not deployed yet; go to the other way too, which keeps a way back to the QR for a customer
  // who was only offline for a moment.
  useEffect(() => {
    if (startError?.notAvailable) onUnavailable()
    else if (startError?.code === 'NETWORK') onUseOtherWay()
  }, [startError, onUnavailable, onUseOtherWay])

  useEffect(() => {
    if (!paid || handedOver.current) return
    handedOver.current = true
    const { onPaid: refresh, paidMessage: message, success: toastSuccess, showError: toastError, t: translate } = latest.current
    Promise.resolve(refresh())
      .then(() => toastSuccess(message ?? translate('payment.phajayPaid')))
      // The payment itself is already applied on the server; only the refresh failed.
      .catch(refreshError => toastError(refreshError instanceof Error ? refreshError.message : translate('common.error')))
  }, [paid])

  const failureText = startError?.code === 'RATE_LIMITED' ? t('payment.phajayRateLimited') : t('payment.phajayUnavailable')

  return (
    <div data-no-premium-translate className="space-y-3 rounded-2xl border-2 border-primary-100 dark:border-primary-800 bg-white dark:bg-gray-900 p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Smartphone className="h-4 w-4 text-primary-600 dark:text-primary-400" />
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{t('payment.phajayTitle')}</p>
      </div>

      {start.isPending && (
        <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/50 px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
          {t('payment.phajayCreating')}
        </div>
      )}

      {start.isError && !startError?.notAvailable && (
        <div className="space-y-2">
          <p className="rounded-xl bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">{failureText}</p>
          <Button type="button" size="sm" variant="outline" loading={start.isFetching} icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => start.refetch()}>
            {t('common.retry')}
          </Button>
        </div>
      )}

      {review && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t('payment.phajayReview')}</span>
        </div>
      )}

      {waiting && !review && (
        <>
          <div className="flex justify-center rounded-2xl border border-gray-200 dark:border-gray-700 bg-white p-3">
            <QrCodeLogo value={waiting.qrCode} logoSrc={brandMark} label={t('payment.qrCode')} />
          </div>

          <div className="rounded-xl border-2 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-center">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">{t('payment.amount')}</p>
            <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-300">{formatPrice(waiting.amount, 'LAK')}</p>
          </div>

          {expired ? (
            <div className="space-y-2">
              <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{t('payment.phajayExpired')}</span>
              </div>
              <Button type="button" size="sm" variant="outline" loading={start.isFetching} icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => start.refetch()}>
                {t('payment.phajayNewQr')}
              </Button>
            </div>
          ) : paid ? (
            <div className="flex items-start gap-2 rounded-xl bg-green-50 dark:bg-green-500/10 px-3 py-2 text-xs text-green-700 dark:text-green-300">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{t('payment.phajayUpdating')}</span>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('payment.phajayHint')}</p>
              <div className="flex items-center gap-2 rounded-xl bg-orange-50 dark:bg-orange-500/10 px-3 py-2 text-xs text-orange-700 dark:text-orange-300">
                <Clock className="h-4 w-4 shrink-0" />
                <span>{t('payment.phajayWaiting')}</span>
              </div>
              {waiting.link && (
                <a
                  href={waiting.link}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/40 px-3 py-2.5 text-sm font-medium text-primary-700 dark:text-primary-300 transition-colors hover:bg-primary-100 dark:hover:bg-primary-900/60"
                >
                  <ExternalLink className="h-4 w-4" />
                  {t('payment.phajayOpenApp')}
                </a>
              )}
            </>
          )}
        </>
      )}

      {!paid && (
        <button type="button" onClick={onUseOtherWay} className="w-full text-center text-xs font-medium text-primary-700 dark:text-primary-300 underline-offset-2 hover:underline">
          {t('payment.phajayOtherWay')}
        </button>
      )}
    </div>
  )
}
