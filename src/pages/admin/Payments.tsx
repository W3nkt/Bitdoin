import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, Eye, ReceiptText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { logAudit } from '@/lib/audit'
import { useMarkSeen } from '@/context/AdminNotificationsContext'
import type { Order, Payment } from '@/types'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Receipt } from '@/components/ui/Receipt'
import { StorageImage } from '@/components/ui/StorageImage'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { useLanguage } from '@/context/LanguageContext'
import { formatPrice, formatDateTime, paymentStatusLabel, normalizeLaoPhone } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function AdminPayments() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { profile } = useAuth()
  const { success, error } = useToast()
  const { currency, language } = useLanguage()
  const { markSeen } = useMarkSeen()
  const [searchParams, setSearchParams] = useSearchParams()

  const [tab, setTab] = useState<'pending' | 'all'>('pending')
  const [detailPayment, setDetailPayment] = useState<Payment | null>(null)
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [actioning, setActioning] = useState(false)

  // Deep link from the admin notification email, e.g. /admin/payments?payment=<id>
  useEffect(() => {
    const paymentId = searchParams.get('payment')
    if (!paymentId) return
    setSearchParams(prev => { prev.delete('payment'); return prev }, { replace: true })

    supabase
      .from('payments')
      .select('*, order:orders(order_number, total_amount, customer_name, customer_phone, items:order_items(id, quantity, book:books(title)))')
      .eq('id', paymentId)
      .maybeSingle()
      .then(({ data: payment }) => {
        if (!payment) { error('Payment not found'); return }
        setDetailPayment(payment as Payment)
        markSeen(paymentId)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { data: payments, isLoading } = useQuery({
    queryKey: ['admin', 'payments', tab],
    queryFn: async () => {
      let q = supabase
        .from('payments')
        .select('*, order:orders(order_number, total_amount, customer_name, customer_phone, items:order_items(id, quantity, book:books(title)))')
        .order('created_at', { ascending: false })
      if (tab === 'pending') q = q.in('verification_status', ['PENDING', 'REQUIRES_REVIEW'])
      const { data } = await q
      return (data ?? []) as Payment[]
    },
  })

  // Fetch full order with items for the receipt modal
  const { data: receiptOrder, isLoading: loadingReceiptOrder } = useQuery({
    queryKey: ['admin', 'receipt-order', receiptPayment?.order_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('orders')
        .select('*, items:order_items(*, book:books(*), bookstore:bookstores(name)), payments(*), deliveries(*)')
        .eq('id', receiptPayment!.order_id)
        .single()
      return data as Order
    },
    enabled: !!receiptPayment,
  })

  function openWhatsAppApproved(phone: string, orderNumber: string, amount: number) {
    const e164 = normalizeLaoPhone(phone)
    const formatted = formatPrice(amount, currency)
    const msg = [
      `ສະບາຍດີທ່ານລູກຄ້າ! ການຊຳລະຄ່າສັ່ງປຶ້ມ ຄຳສັ່ງເລກທີ #${orderNumber} ເປັນຈຳນວນເງີນ ${formatted} ໄດ້ຮັບການຢືນຢັນແລ້ວ. ພວກເຮົາກຳລັງດຳເນີນການຈັດສົ່ງປຶ້ມຂອງທ່ານ. ຂອບໃຈທີ່ສັ່ງປຶ້ມຈາກ Bitdoin - ຫວັງຢ່າງຍິ່ງວ່າພວກເຮົາຈະໄດ້ບໍລິການໃຫ້ທ່ານອີກ 📚`,
      ``,
      `Hello valued customer! Your payment for book order #${orderNumber} of ${formatted} has been confirmed. We are now processing your book delivery. Thank you for ordering from Bitdoin – we look forward to serving you again!`,
    ].join('\n')
    window.open(`https://wa.me/${e164}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener')
  }

  function openWhatsAppRejected(phone: string, orderNumber: string, amount: number, reason: string) {
    const e164 = normalizeLaoPhone(phone)
    const formatted = formatPrice(amount, currency)
    const msg = [
      `ສະບາຍດີທ່ານລູກຄ້າ! ການຊຳລະຄ່າສັ່ງປຶ້ມ ຄຳສັ່ງເລກທີ #${orderNumber} ເປັນຈຳນວນເງີນ ${formatted} ຍັງບໍ່ໄດ້ຮັບການຢືນຢັນ. ເຫດຜົນ: ${reason} ກະລຸນາກວດສອບຄືນ ແລະ ສົ່ງຫຼັກຖານການຊຳລະໃໝ່. ຂອບໃຈທີ່ສັ່ງປຶ້ມຈາກ Bitdoin`,
      ``,
      `Hello valued customer! Your payment for book order #${orderNumber} of ${formatted} has not been confirmed. Reason: ${reason} Please review and resubmit your payment proof. Thank you for ordering from Bitdoin.`,
    ].join('\n')
    window.open(`https://wa.me/${e164}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener')
  }

  async function verifyPayment(payment: Payment) {
    setActioning(true)
    try {
      await supabase.from('payments').update({
        verification_status: 'VERIFIED',
        reviewed_by_user_id: profile?.id,
        reviewed_at: new Date().toISOString(),
      }).eq('id', payment.id)

      await supabase.from('orders').update({
        payment_status: 'VERIFIED',
        status: 'PROCESSING',
      }).eq('id', payment.order_id)

      await logAudit({
        entity: 'payment',
        entityId: payment.id,
        action: 'PAYMENT_VERIFIED',
        oldValue: { status: payment.verification_status },
        newValue: { status: 'VERIFIED', order_id: payment.order_id, amount: payment.amount },
      })

      await qc.invalidateQueries({ queryKey: ['admin', 'payments'] })
      await qc.invalidateQueries({ queryKey: ['admin', 'badge', 'payments'] })
      setDetailPayment(null)
      success('Payment verified')

      const orderNumber = (payment.order as { order_number?: string } | undefined)?.order_number
      const customerPhone = (payment.order as { customer_phone?: string } | undefined)?.customer_phone
      if (customerPhone && orderNumber) {
        openWhatsAppApproved(customerPhone, orderNumber, payment.amount)
      }
    } catch {
      error(t('common.error'))
    } finally {
      setActioning(false)
    }
  }

  async function rejectPayment(payment: Payment) {
    setActioning(true)
    try {
      await supabase.from('payments').update({
        verification_status: 'REJECTED',
        rejection_reason: rejectionReason,
        reviewed_by_user_id: profile?.id,
        reviewed_at: new Date().toISOString(),
      }).eq('id', payment.id)

      await logAudit({
        entity: 'payment',
        entityId: payment.id,
        action: 'PAYMENT_REJECTED',
        oldValue: { status: payment.verification_status },
        newValue: { status: 'REJECTED', rejection_reason: rejectionReason, order_id: payment.order_id },
      })

      await qc.invalidateQueries({ queryKey: ['admin', 'payments'] })
      await qc.invalidateQueries({ queryKey: ['admin', 'badge', 'payments'] })
      setDetailPayment(null)
      setRejectionReason('')
      success('Payment rejected')

      const orderNumber = (payment.order as { order_number?: string } | undefined)?.order_number
      const customerPhone = (payment.order as { customer_phone?: string } | undefined)?.customer_phone
      if (customerPhone && orderNumber) {
        openWhatsAppRejected(customerPhone, orderNumber, payment.amount, rejectionReason)
      }
    } catch {
      error(t('common.error'))
    } finally {
      setActioning(false)
    }
  }

  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    REQUIRES_REVIEW: 'bg-orange-100 text-orange-700',
    VERIFIED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    REFUNDED: 'bg-gray-100 text-gray-700',
  }

  const pendingCount = payments?.filter(
    p => p.verification_status === 'PENDING' || p.verification_status === 'REQUIRES_REVIEW'
  ).length ?? 0

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('admin.payments')}</h1>
          <p className="text-sm text-gray-400 mt-0.5">Verify payment receipts</p>
        </div>
      </div>

      {/* Pill-style tab switcher */}
      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 w-fit">
        <button
          onClick={() => setTab('pending')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            tab === 'pending'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Needs Review
          {pendingCount > 0 && (
            <span className={`inline-flex items-center justify-center h-4 min-w-4 rounded-full text-[10px] font-bold px-1 ${
              tab === 'pending' ? 'bg-accent-500 text-white' : 'bg-orange-100 text-orange-600'
            }`}>
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('all')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            tab === 'all'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          All Payments
        </button>
      </div>

      {isLoading ? <LoadingSpinner /> : (
        <div className="bg-white rounded-2xl shadow-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Order</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Method</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">AI Score</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {payments?.map(payment => (
                <tr
                  key={payment.id}
                  className="hover:bg-gray-50/80 transition-colors cursor-pointer"
                  onClick={() => { setDetailPayment(payment); markSeen(payment.id) }}
                >
                  <td className="px-4 py-3">
                    <p className="text-xs font-mono font-semibold text-gray-900">
                      {(payment.order as { order_number?: string } | undefined)?.order_number ?? '—'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(payment.created_at, language)}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-xs font-medium text-gray-700">
                      {(payment.order as { customer_name?: string } | undefined)?.customer_name ?? '—'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {(payment.order as { customer_phone?: string } | undefined)?.customer_phone}
                    </p>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500">
                    {payment.method.replace('_', ' ')}
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-bold text-gray-900">
                    {formatPrice(payment.amount, currency)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', statusColors[payment.verification_status])}>
                      {paymentStatusLabel(payment.verification_status as Parameters<typeof paymentStatusLabel>[0], language)}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {payment.ai_confidence_score !== null && payment.ai_confidence_score !== undefined ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              Number(payment.ai_confidence_score) >= 90 ? 'bg-green-500' : 'bg-orange-400'
                            }`}
                            style={{ width: `${Number(payment.ai_confidence_score)}%` }}
                          />
                        </div>
                        <span className={`text-xs font-semibold ${
                          Number(payment.ai_confidence_score) >= 90 ? 'text-green-600' : 'text-orange-600'
                        }`}>
                          {Number(payment.ai_confidence_score).toFixed(0)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      {payment.verification_status === 'VERIFIED' && (
                        <button
                          onClick={() => setReceiptPayment(payment)}
                          className="p-2 rounded-xl hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors"
                          title="View receipt"
                        >
                          <ReceiptText className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => { setDetailPayment(payment); markSeen(payment.id) }}
                        className="p-2 rounded-xl hover:bg-primary-50 text-gray-400 hover:text-primary-700 transition-colors"
                        title="Review payment"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Payment review modal */}
      <Modal
        open={!!detailPayment}
        onClose={() => { setDetailPayment(null); setRejectionReason('') }}
        title={detailPayment?.order?.order_number ? `Payment Review — #${detailPayment.order.order_number}` : 'Payment Review'}
        size="lg"
        footer={
          <Button variant="ghost" onClick={() => setDetailPayment(null)}>Close</Button>
        }
      >
        {detailPayment && (
          <div className="space-y-5">
            {/* Order & customer summary */}
            {detailPayment.order && (
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-2">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{detailPayment.order.customer_name}</p>
                  <p className="text-xs text-gray-500">{detailPayment.order.customer_phone}</p>
                </div>
                {!!detailPayment.order.items?.length && (
                  <div className="space-y-1 border-t border-gray-200 pt-2">
                    {detailPayment.order.items.map(item => (
                      <p key={item.id} className="text-xs text-gray-700">
                        {item.book?.title}
                        <span className="text-gray-400"> ×{item.quantity}</span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Key details grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-primary-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">Amount</p>
                <p className="font-bold text-xl text-primary-700">{formatPrice(detailPayment.amount, currency)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">Method</p>
                <p className="font-semibold text-gray-800">{detailPayment.method.replace('_', ' ')}</p>
              </div>
              {detailPayment.sender_name && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Sender</p>
                  <p className="font-medium text-gray-800">{detailPayment.sender_name}</p>
                </div>
              )}
              {detailPayment.transaction_reference && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Reference</p>
                  <p className="font-mono text-xs text-gray-700">{detailPayment.transaction_reference}</p>
                </div>
              )}
              {detailPayment.transferred_at && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Transferred At</p>
                  <p className="text-sm text-gray-700">{formatDateTime(detailPayment.transferred_at, language)}</p>
                </div>
              )}
              {detailPayment.ai_confidence_score !== undefined && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-2">AI Confidence</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          Number(detailPayment.ai_confidence_score) >= 90 ? 'bg-green-500' : 'bg-orange-400'
                        }`}
                        style={{ width: `${Number(detailPayment.ai_confidence_score)}%` }}
                      />
                    </div>
                    <span className={`text-sm font-bold ${
                      Number(detailPayment.ai_confidence_score) >= 90 ? 'text-green-600' : 'text-orange-500'
                    }`}>
                      {Number(detailPayment.ai_confidence_score).toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Receipt image */}
            {detailPayment.receipt_image_url && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Receipt</p>
                <StorageImage
                  src={detailPayment.receipt_image_url}
                  bucket="receipts"
                  alt="Receipt"
                  className="w-full max-h-72 object-contain rounded-2xl border border-gray-100 shadow-sm"
                />
              </div>
            )}

            {/* Action buttons for pending / needs-review payments */}
            {(detailPayment.verification_status === 'PENDING' || detailPayment.verification_status === 'REQUIRES_REVIEW') && (
              <div className="space-y-3 pt-1 border-t border-gray-100">
                <Input
                  label="Rejection Reason (required to reject)"
                  placeholder="e.g. Amount does not match order total"
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                />
                <div className="flex gap-3">
                  <Button
                    variant="danger"
                    icon={<XCircle className="h-4 w-4" />}
                    loading={actioning}
                    onClick={() => rejectPayment(detailPayment)}
                    disabled={!rejectionReason}
                  >
                    {t('admin.rejectPayment')}
                  </Button>
                  <Button
                    className="flex-1"
                    icon={<CheckCircle className="h-4 w-4" />}
                    loading={actioning}
                    onClick={() => verifyPayment(detailPayment)}
                  >
                    {t('admin.verifyPayment')}
                  </Button>
                </div>
              </div>
            )}

            {/* For already-verified payments in the review modal, offer receipt view */}
            {detailPayment.verification_status === 'VERIFIED' && (
              <div className="pt-1 border-t border-gray-100">
                <Button
                  fullWidth
                  variant="outline"
                  icon={<ReceiptText className="h-4 w-4" />}
                  onClick={() => { setDetailPayment(null); setReceiptPayment(detailPayment) }}
                >
                  View & Download Receipt
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Receipt modal */}
      <Modal
        open={!!receiptPayment}
        onClose={() => setReceiptPayment(null)}
        title="Payment Receipt"
        size="lg"
        footer={
          <Button variant="ghost" onClick={() => setReceiptPayment(null)}>{t('common.close')}</Button>
        }
      >
        {receiptPayment && (
          loadingReceiptOrder ? (
            <LoadingSpinner />
          ) : receiptOrder ? (
            <Receipt
              order={receiptOrder}
              payment={receiptOrder.payments?.[0] ?? receiptPayment}
              language={language}
              currency={currency}
              showAdminPricing
            />
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">{t('orders.notFound')}</p>
          )
        )}
      </Modal>
    </div>
  )
}
