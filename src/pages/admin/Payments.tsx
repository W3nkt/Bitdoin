import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, Eye } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Payment } from '@/types'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { formatPrice, formatDateTime, paymentStatusLabel } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function AdminPayments() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { profile } = useAuth()
  const { success, error } = useToast()

  const [tab, setTab] = useState<'pending' | 'all'>('pending')
  const [detailPayment, setDetailPayment] = useState<Payment | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [actioning, setActioning] = useState(false)

  const { data: payments, isLoading } = useQuery({
    queryKey: ['admin', 'payments', tab],
    queryFn: async () => {
      let q = supabase
        .from('payments')
        .select('*, order:orders(order_number, total_amount, customer_name, customer_phone), user:users(name)')
        .order('created_at', { ascending: false })
      if (tab === 'pending') q = q.in('verification_status', ['PENDING', 'REQUIRES_REVIEW'])
      const { data } = await q
      return (data ?? []) as Payment[]
    },
  })

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

      await qc.invalidateQueries({ queryKey: ['admin', 'payments'] })
      setDetailPayment(null)
      success('Payment verified')
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

      await qc.invalidateQueries({ queryKey: ['admin', 'payments'] })
      setDetailPayment(null)
      setRejectionReason('')
      success('Payment rejected')
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

      {/* Pill-style tab switcher with count badge */}
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
          {tab === 'pending' && pendingCount > 0 && (
            <span className="inline-flex items-center justify-center h-4 min-w-4 rounded-full bg-accent-500 text-white text-[10px] font-bold px-1">
              {pendingCount}
            </span>
          )}
          {tab !== 'pending' && pendingCount > 0 && (
            <span className="inline-flex items-center justify-center h-4 min-w-4 rounded-full bg-orange-100 text-orange-600 text-[10px] font-bold px-1">
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
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
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
                <tr key={payment.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-xs font-mono font-semibold text-gray-900">
                      {(payment.order as { order_number?: string } | undefined)?.order_number ?? '—'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(payment.created_at)}</p>
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
                    {formatPrice(payment.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', statusColors[payment.verification_status])}>
                      {paymentStatusLabel(payment.verification_status as Parameters<typeof paymentStatusLabel>[0])}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {payment.ai_confidence_score !== null && payment.ai_confidence_score !== undefined ? (
                      <div className="flex items-center gap-2">
                        {/* Progress bar indicator */}
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
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setDetailPayment(payment)}
                      className="p-2 rounded-xl hover:bg-primary-50 text-gray-400 hover:text-primary-700 transition-colors"
                      title="Review payment"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail modal */}
      <Modal
        open={!!detailPayment}
        onClose={() => { setDetailPayment(null); setRejectionReason('') }}
        title="Payment Review"
        size="lg"
        footer={
          <Button variant="ghost" onClick={() => setDetailPayment(null)}>Close</Button>
        }
      >
        {detailPayment && (
          <div className="space-y-5">
            {/* Key details grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-primary-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">Amount</p>
                <p className="font-bold text-xl text-primary-700">{formatPrice(detailPayment.amount)}</p>
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
                  <p className="text-sm text-gray-700">{formatDateTime(detailPayment.transferred_at)}</p>
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

            {/* Receipt image with rounded corners */}
            {detailPayment.receipt_image_url && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Receipt</p>
                <img
                  src={detailPayment.receipt_image_url}
                  alt="Receipt"
                  className="w-full max-h-72 object-contain rounded-2xl border border-gray-100 shadow-sm"
                />
              </div>
            )}

            {(detailPayment.verification_status === 'PENDING' || detailPayment.verification_status === 'REQUIRES_REVIEW') && (
              <div className="space-y-3 pt-1 border-t border-gray-100">
                <Input
                  label="Rejection Reason (required to reject)"
                  placeholder="e.g. Amount does not match order total"
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                />
                {/* Verify on right (primary action), reject on left (danger) */}
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
          </div>
        )}
      </Modal>
    </div>
  )
}
