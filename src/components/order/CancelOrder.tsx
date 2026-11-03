import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Ban } from 'lucide-react'
import { cancelGuestOrder, trackOrder } from '@/lib/guestOrders'
import { clearActiveGuestOrder } from '@/lib/guestTracking'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import type { Order } from '@/types'

interface CancelOrderProps {
  order: Order
  customerPhone: string
  /** The order as the server has it after the cancellation. */
  onCancelled: (order: Order) => void
}

// "Changed your mind?" for the buyer, on the tracking page. Offered only while nothing has been paid or sent
// for review; the database makes the same check, so a stale page cannot cancel an order that has moved on.
export function CancelOrder({ order, customerPhone, onCancelled }: CancelOrderProps) {
  const { t } = useTranslation()
  const { success, error } = useToast()
  const [confirming, setConfirming] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const paymentStatus = order.payments?.[0]?.verification_status
  const cancellable = order.status === 'PENDING_PAYMENT' && (!paymentStatus || paymentStatus === 'PENDING' || paymentStatus === 'REJECTED')
  if (!cancellable) return null

  async function cancel() {
    setCancelling(true)
    try {
      const result = await cancelGuestOrder(order.order_number, customerPhone)
      // Either way, show the order as it is now: cancelled, or too far along to cancel.
      const refreshed = await trackOrder(order.order_number, customerPhone)
      if (refreshed) onCancelled(refreshed)
      setConfirming(false)
      if (result.ok) {
        clearActiveGuestOrder()
        success(t('tracking.cancelDone'))
      } else {
        error(result.reason === 'not_cancellable' ? t('tracking.cancelNotAllowed') : t('tracking.notFound'))
      }
    } catch (cancelError) {
      console.error('[cancel order]', cancelError)
      error(t('common.error'))
    } finally {
      setCancelling(false)
    }
  }

  return (
    <>
      <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <p className="text-center text-sm text-gray-600 dark:text-gray-300">{t('tracking.cancelPrompt')}</p>
        <div className="mt-4 flex justify-center">
          <Button
            type="button"
            variant="danger"
            size="lg"
            className="w-full sm:w-auto sm:min-w-64"
            icon={<Ban className="h-5 w-5" />}
            onClick={() => setConfirming(true)}
          >
            {t('tracking.cancelOrder')}
          </Button>
        </div>
      </section>

      <Modal
        open={confirming}
        onClose={() => { if (!cancelling) setConfirming(false) }}
        title={t('tracking.cancelConfirmTitle')}
        size="sm"
        footer={
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" disabled={cancelling} onClick={() => setConfirming(false)}>
              {t('tracking.cancelKeep')}
            </Button>
            <Button type="button" variant="danger" loading={cancelling} onClick={cancel}>
              {t('tracking.cancelYes')}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-gray-600 dark:text-gray-300">{t('tracking.cancelConfirmBody', { orderNumber: order.order_number })}</p>
      </Modal>
    </>
  )
}
