import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, Eye, ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Order, OrderStatus } from '@/types'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Input'
import { Pagination } from '@/components/ui/Pagination'
import { useToast } from '@/components/ui/Toast'
import { formatPrice, formatDateTime, orderStatusLabel, orderStatusColor, paymentStatusLabel, paymentStatusColor } from '@/lib/utils'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 15

export function AdminOrders() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { success, error } = useToast()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [detailOrder, setDetailOrder] = useState<Order | null>(null)
  const [newStatus, setNewStatus] = useState('')
  const [updating, setUpdating] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'orders', search, statusFilter, page],
    queryFn: async () => {
      let q = supabase
        .from('orders')
        .select('*, customer:users(name, phone), items:order_items(count)', { count: 'exact' })
      if (search) q = q.or(`order_number.ilike.%${search}%,customer_phone.ilike.%${search}%,customer_name.ilike.%${search}%`)
      if (statusFilter) q = q.eq('status', statusFilter)
      const from = (page - 1) * PAGE_SIZE
      const { data, count } = await q.order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1)
      return { data: (data ?? []) as Order[], count: count ?? 0 }
    },
  })

  const { data: orderDetail } = useQuery({
    queryKey: ['admin', 'order-detail', detailOrder?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('orders')
        .select('*, customer:users(name, phone), items:order_items(*, book:books(title, cover_image_url), bookstore:bookstores(name, whatsapp)), payments(*), deliveries(*)')
        .eq('id', detailOrder!.id)
        .single()
      return data as Order
    },
    enabled: !!detailOrder,
  })

  async function updateStatus() {
    if (!detailOrder || !newStatus) return
    setUpdating(true)
    try {
      await supabase.from('orders').update({ status: newStatus }).eq('id', detailOrder.id)
      await qc.invalidateQueries({ queryKey: ['admin', 'orders'] })
      await qc.invalidateQueries({ queryKey: ['admin', 'order-detail', detailOrder.id] })
      setDetailOrder(prev => prev ? { ...prev, status: newStatus as OrderStatus } : null)
      success('Status updated')
    } catch {
      error(t('common.error'))
    } finally {
      setUpdating(false)
    }
  }

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'PENDING_PAYMENT', label: 'Pending Payment' },
    { value: 'PAYMENT_REVIEW', label: 'Payment Review' },
    { value: 'PROCESSING', label: 'Processing' },
    { value: 'PURCHASING_FROM_BOOKSTORE', label: 'Purchasing' },
    { value: 'SHIPPED', label: 'Shipped' },
    { value: 'DELIVERED', label: 'Delivered' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ]

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('admin.orders')}</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {data ? `${data.count} orders total` : 'Manage customer orders'}
          </p>
        </div>
      </div>

      {/* Search + filter row */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search order # or customer…"
            className="w-full rounded-2xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary-400 bg-white shadow-sm transition-shadow focus:shadow-card"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
            className="appearance-none rounded-2xl border border-gray-200 bg-white pl-3.5 pr-9 py-2.5 text-sm focus:outline-none focus:border-primary-400 shadow-sm cursor-pointer"
          >
            {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
      </div>

      {isLoading ? <LoadingSpinner /> : (
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Order</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Payment</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data?.data.map(order => (
                <tr key={order.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-xs font-mono font-semibold text-gray-900">{order.order_number}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(order.created_at)}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-xs font-medium text-gray-700">{order.customer_name}</p>
                    <p className="text-xs text-gray-400">{order.customer_phone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', orderStatusColor(order.status))}>
                      {orderStatusLabel(order.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', paymentStatusColor(order.payment_status))}>
                      {paymentStatusLabel(order.payment_status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-bold text-gray-900">
                    {formatPrice(order.total_amount)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => { setDetailOrder(order); setNewStatus(order.status) }}
                      className="p-2 rounded-xl hover:bg-primary-50 text-gray-400 hover:text-primary-700 transition-colors"
                      title="View order"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data && data.count > PAGE_SIZE && (
            <div className="px-4 py-3 border-t border-gray-50">
              <Pagination page={page} pageSize={PAGE_SIZE} total={data.count} onChange={setPage} />
            </div>
          )}
        </div>
      )}

      {/* Order detail modal */}
      <Modal
        open={!!detailOrder}
        onClose={() => setDetailOrder(null)}
        title={`Order ${detailOrder?.order_number}`}
        size="xl"
        footer={
          <Button variant="ghost" onClick={() => setDetailOrder(null)}>Close</Button>
        }
      >
        {orderDetail ? (
          <div className="space-y-5">
            {/* Status updater */}
            <div className="flex gap-3 items-end p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="flex-1">
                <Select
                  label="Update Status"
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value)}
                  options={statusOptions.slice(1)}
                />
              </div>
              <Button size="sm" loading={updating} onClick={updateStatus}>Update</Button>
            </div>

            {/* Customer + address */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Customer</p>
                <p className="text-sm font-semibold text-gray-800">{orderDetail.customer_name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{orderDetail.customer_phone}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Delivery Address</p>
                <p className="text-sm text-gray-700 leading-relaxed">{orderDetail.delivery_address}</p>
              </div>
            </div>

            {/* Items */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Items</p>
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                {orderDetail.items?.map(item => (
                  <div key={item.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{item.book?.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.bookstore?.name} · qty {item.quantity}</p>
                    </div>
                    <p className="text-sm font-bold text-gray-900">{formatPrice(item.final_price * item.quantity)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* WhatsApp message to bookstores */}
            {orderDetail.items?.map(item => item.bookstore?.whatsapp && (
              <a
                key={item.id}
                href={`https://wa.me/${item.bookstore.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Book: ${item.book?.title} | Qty: ${item.quantity} | Order: ${orderDetail.order_number} | Please confirm availability.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-green-600 hover:text-green-700 py-1"
              >
                📱 WhatsApp {item.bookstore.name}
              </a>
            ))}
          </div>
        ) : <LoadingSpinner />}
      </Modal>
    </div>
  )
}
