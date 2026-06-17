import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, Eye, CreditCard } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Payment } from '@/types'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { formatPrice, formatDateTime, paymentStatusColor, paymentStatusLabel } from '@/lib/utils'
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

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">{t('admin.payments')}</h1>

      <div className="flex border-b border-gray-200">
        {(['pending', 'all'] as const).map(t2 => (
          <button
            key={t2}
            onClick={() => setTab(t2)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t2 ? 'border-primary-700 text-primary-700' : 'border-transparent text-gray-400'
            }`}
          >
            {t2 === 'pending' ? 'Needs Review' : 'All Payments'}
          </button>
        ))}
      </div>

      {isLoading ? <LoadingSpinner /> : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Order</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Method</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">AI Score</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {payments?.map(payment => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="text-xs font-mono font-medium text-gray-900">
                      {(payment.order as { order_number?: string } | undefined)?.order_number ?? '—'}
                    </p>
                    <p className="text-xs text-gray-400">{formatDateTime(payment.created_at)}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-xs text-gray-700">
                      {(payment.order as { customer_name?: string } | undefined)?.customer_name ?? '—'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {(payment.order as { customer_phone?: string } | undefined)?.customer_phone}
                    </p>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500">
                    {payment.method.replace('_', ' ')}
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-semibold text-gray-800">
                    {formatPrice(payment.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', statusColors[payment.verification_status])}>
                      {paymentStatusLabel(payment.verification_status as Parameters<typeof paymentStatusLabel>[0])}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {payment.ai_confidence_score !== null && payment.ai_confidence_score !== undefined ? (
                      <span className={`text-xs font-medium ${Number(payment.ai_confidence_score) >= 90 ? 'text-green-600' : 'text-orange-600'}`}>
                        {Number(payment.ai_confidence_score).toFixed(0)}%
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setDetailPayment(payment)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-primary-700"
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
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-gray-400">Amount</p><p className="font-bold text-lg text-primary-700">{formatPrice(detailPayment.amount)}</p></div>
              <div><p className="text-xs text-gray-400">Method</p><p className="font-medium">{detailPayment.method}</p></div>
              {detailPayment.sender_name && <div><p className="text-xs text-gray-400">Sender</p><p className="font-medium">{detailPayment.sender_name}</p></div>}
              {detailPayment.transaction_reference && <div><p className="text-xs text-gray-400">Reference</p><p className="font-mono text-xs">{detailPayment.transaction_reference}</p></div>}
              {detailPayment.transferred_at && <div><p className="text-xs text-gray-400">Transferred At</p><p className="font-medium text-xs">{formatDateTime(detailPayment.transferred_at)}</p></div>}
              {detailPayment.ai_confidence_score !== undefined && (
                <div>
                  <p className="text-xs text-gray-400">AI Confidence</p>
                  <p className={`font-bold ${Number(detailPayment.ai_confidence_score) >= 90 ? 'text-green-600' : 'text-orange-600'}`}>
                    {Number(detailPayment.ai_confidence_score).toFixed(1)}%
                  </p>
                </div>
              )}
            </div>

            {detailPayment.receipt_image_url && (
              <div>
                <p className="text-xs text-gray-400 mb-2">Receipt</p>
                <img
                  src={detailPayment.receipt_image_url}
                  alt="Receipt"
                  className="w-full max-h-64 object-contain rounded-xl border border-gray-200"
                />
              </div>
            )}

            {(detailPayment.verification_status === 'PENDING' || detailPayment.verification_status === 'REQUIRES_REVIEW') && (
              <div className="space-y-3">
                <Input
                  label="Rejection Reason (if rejecting)"
                  placeholder="e.g. Amount does not match"
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
