import { useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, Eye, ChevronDown, CreditCard, MessageCircle, CheckCircle, Clock, Upload, ReceiptText, BookOpen } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { logAudit } from '@/lib/audit'
import { useMarkSeen } from '@/context/AdminNotificationsContext'
import type { BookstorePayment, Order, OrderItem, OrderStatus } from '@/types'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Pagination } from '@/components/ui/Pagination'
import { useToast } from '@/components/ui/Toast'
import { StorageImage } from '@/components/ui/StorageImage'
import { BookstoreOrderReceipt } from '@/components/ui/BookstoreOrderReceipt'
import { formatPrice, formatDateTime, orderStatusLabel, orderStatusColor, paymentStatusLabel, paymentStatusColor } from '@/lib/utils'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 15

interface StorePaymentGroup {
  bookstoreId: string
  bookstoreName: string
  expectedAmount: number
  payment?: BookstorePayment
}

export function AdminOrders() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const { profile } = useAuth()
  const { currency, language } = useLanguage()
  const { success, error } = useToast()
  const { markSeen } = useMarkSeen()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [detailOrder, setDetailOrder] = useState<Order | null>(
    () => (location.state as { selectedOrder?: Order } | null)?.selectedOrder ?? null
  )
  const [newStatus, setNewStatus] = useState('')
  const [updating, setUpdating] = useState(false)
  const [receiptItem, setReceiptItem] = useState<OrderItem | null>(null)
  const [sharingItemId, setSharingItemId] = useState<string | null>(null)
  const [paymentStore, setPaymentStore] = useState<StorePaymentGroup | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentPaidAt, setPaymentPaidAt] = useState('')
  const [paymentReference, setPaymentReference] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null)
  const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(null)
  const [savingStorePayment, setSavingStorePayment] = useState(false)
  const bookstoreReceiptRef = useRef<HTMLDivElement>(null)
  const paymentProofInputRef = useRef<HTMLInputElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'orders', search, statusFilter, page],
    queryFn: async () => {
      let q = supabase
        .from('orders')
        .select('*, customer:users(name, phone), items:order_items(bookstore_id), bookstore_payments(bookstore_id)', { count: 'exact' })
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
        .select('*, customer:users(name, phone), items:order_items(*, book:books(title, cover_image_url), bookstore:bookstores(name, whatsapp, bank_qr_code_url)), payments(*), bookstore_payments(*, paid_by_user:users(name)), deliveries(*)')
        .eq('id', detailOrder!.id)
        .single()
      return data as Order
    },
    enabled: !!detailOrder,
  })

  async function updateStatus() {
    if (!detailOrder || !newStatus) return
    setUpdating(true)
    const oldStatus = detailOrder.status
    try {
      await supabase.from('orders').update({ status: newStatus }).eq('id', detailOrder.id)
      await logAudit({
        entity: 'order',
        entityId: detailOrder.id,
        action: 'ORDER_STATUS_CHANGED',
        oldValue: { status: oldStatus },
        newValue: { status: newStatus, order_number: detailOrder.order_number },
      })
      await qc.invalidateQueries({ queryKey: ['admin', 'orders'] })
      await qc.invalidateQueries({ queryKey: ['admin', 'order-detail', detailOrder.id] })
      await qc.invalidateQueries({ queryKey: ['admin', 'badge', 'orders'] })
      setDetailOrder(prev => prev ? { ...prev, status: newStatus as OrderStatus } : null)
      success('Status updated')
    } catch {
      error(t('common.error'))
    } finally {
      setUpdating(false)
    }
  }

  function openStorePayment(group: StorePaymentGroup) {
    setPaymentStore(group)
    setPaymentAmount(String(group.payment?.amount ?? group.expectedAmount))
    setPaymentPaidAt(toDateTimeLocal(group.payment?.paid_at ?? new Date().toISOString()))
    setPaymentReference(group.payment?.reference ?? '')
    setPaymentNotes(group.payment?.notes ?? '')
    setPaymentProofFile(null)
    setPaymentProofPreview(group.payment?.proof_image_url ?? null)
  }

  function closeStorePayment() {
    setPaymentStore(null)
    setPaymentProofFile(null)
    setPaymentProofPreview(null)
    if (paymentProofInputRef.current) paymentProofInputRef.current.value = ''
  }

  function handlePaymentProofChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      error('Payment proof must be a PNG, JPG, WebP, or PDF file')
      e.target.value = ''
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      error('Payment proof must be 10 MB or smaller')
      e.target.value = ''
      return
    }
    setPaymentProofFile(file)
    setPaymentProofPreview(file.type === 'application/pdf' ? null : URL.createObjectURL(file))
  }

  async function uploadPaymentProof(orderId: string, bookstoreId: string, file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
    const path = `${orderId}/${bookstoreId}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('bookstore-payment-proofs')
      .upload(path, file, { contentType: file.type })
    if (uploadError) throw uploadError
    return supabase.storage.from('bookstore-payment-proofs').getPublicUrl(path).data.publicUrl
  }

  async function saveStorePayment() {
    if (!orderDetail || !paymentStore || !profile) return
    if (!paymentProofFile && !paymentStore.payment?.proof_image_url) {
      error('Attach payment proof before marking the bookstore as paid')
      return
    }
    const amount = Number(paymentAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      error('Enter a valid payment amount')
      return
    }
    const paidAt = new Date(paymentPaidAt)
    if (!paymentPaidAt || Number.isNaN(paidAt.getTime())) {
      error('Enter a valid payment date')
      return
    }

    setSavingStorePayment(true)
    try {
      const proofImageUrl = paymentProofFile
        ? await uploadPaymentProof(orderDetail.id, paymentStore.bookstoreId, paymentProofFile)
        : paymentStore.payment!.proof_image_url
      const { data: upserted, error: saveError } = await supabase
        .from('bookstore_payments')
        .upsert({
          order_id: orderDetail.id,
          bookstore_id: paymentStore.bookstoreId,
          amount,
          currency: orderDetail.currency,
          proof_image_url: proofImageUrl,
          reference: paymentReference || null,
          notes: paymentNotes || null,
          paid_at: paidAt.toISOString(),
          paid_by_user_id: paymentStore.payment?.paid_by_user_id ?? profile.id,
        }, { onConflict: 'order_id,bookstore_id' })
        .select('id')
        .single()
      if (saveError) throw saveError

      await logAudit({
        entity: 'bookstore_payment',
        entityId: upserted?.id,
        action: paymentStore.payment ? 'BOOKSTORE_PAYMENT_UPDATED' : 'BOOKSTORE_PAYMENT_RECORDED',
        newValue: {
          order_id: orderDetail.id,
          bookstore_id: paymentStore.bookstoreId,
          bookstore_name: paymentStore.bookstoreName,
          amount,
          paid_at: paidAt.toISOString(),
          reference: paymentReference || null,
        },
      })

      await qc.invalidateQueries({ queryKey: ['admin', 'order-detail', orderDetail.id] })
      await qc.invalidateQueries({ queryKey: ['admin', 'orders'] })
      closeStorePayment()
      success(paymentStore.payment ? 'Bookstore payment updated' : 'Bookstore marked as paid')
    } catch (saveError) {
      console.error('[saveStorePayment]', saveError)
      error(saveError instanceof Error ? saveError.message : t('common.error'))
    } finally {
      setSavingStorePayment(false)
    }
  }

  async function viewPaymentProof(payment: BookstorePayment) {
    const path = payment.proof_image_url.split('/bookstore-payment-proofs/')[1]
    if (!path) {
      window.open(payment.proof_image_url, '_blank', 'noopener,noreferrer')
      return
    }
    const { data, error: signedUrlError } = await supabase.storage
      .from('bookstore-payment-proofs')
      .createSignedUrl(path, 3600)
    if (signedUrlError || !data?.signedUrl) {
      error(signedUrlError?.message ?? 'Could not open payment proof')
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  async function handleBookstoreWhatsApp(item: OrderItem) {
    if (!orderDetail || !item.bookstore?.whatsapp) return

    const phone = item.bookstore.whatsapp.replace(/\D/g, '')
    const message = `ສັ່ງປຶມ: ${item.book?.title ?? ''} | ຈຳນວນ: ${item.quantity} ຫົວ | ຂໍ້ມູນການຈັດສົ່ງລະອຽດຢູ່ໃນໃບບິນ`
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    const fallbackWindow = typeof navigator.share !== 'function'
      ? window.open('', '_blank')
      : null
    if (fallbackWindow) fallbackWindow.opener = null

    setReceiptItem(item)
    setSharingItemId(item.id)

    try {
      await new Promise<void>(resolve => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      })
      await document.fonts?.ready
      if (!bookstoreReceiptRef.current) throw new Error('Receipt is not ready')

      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(bookstoreReceiptRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
      })
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(result => {
          if (result) resolve(result)
          else reject(new Error('Could not create receipt image'))
        }, 'image/png')
      })
      const filename = `bookstore-order-${orderDetail.order_number}.png`
      const file = new File([blob], filename, { type: 'image/png' })

      if (navigator.canShare?.({ files: [file] })) {
        fallbackWindow?.close()
        await navigator.share({
          files: [file],
          title: `Order ${orderDetail.order_number}`,
          text: message,
        })
        success('Bookstore receipt shared')
        return
      }

      const objectUrl = URL.createObjectURL(blob)
      const download = document.createElement('a')
      download.href = objectUrl
      download.download = filename
      download.click()
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)

      if (fallbackWindow) {
        fallbackWindow.location.href = whatsappUrl
      } else {
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
      }
      success('Receipt downloaded. Attach it to the opened WhatsApp message.')
    } catch (shareError) {
      fallbackWindow?.close()
      if ((shareError as DOMException)?.name !== 'AbortError') {
        console.error('[handleBookstoreWhatsApp]', shareError)
        error(t('common.error'))
      }
    } finally {
      setSharingItemId(null)
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
  const storePaymentGroups = orderDetail ? groupStorePayments(orderDetail) : []

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
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Payment</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Store Paid</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data?.data.map(order => (
                <tr
                  key={order.id}
                  className="hover:bg-gray-50/80 transition-colors cursor-pointer"
                  onClick={() => { setDetailOrder(order); setNewStatus(order.status); markSeen(order.id) }}
                >
                  <td className="px-4 py-3">
                    <p className="text-xs font-mono font-semibold text-gray-900">{order.order_number}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(order.created_at, language)}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-xs font-medium text-gray-700">{order.customer_name}</p>
                    <p className="text-xs text-gray-400">{order.customer_phone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', orderStatusColor(order.status))}>
                      {orderStatusLabel(order.status, language)}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', paymentStatusColor(order.payment_status))}>
                      {paymentStatusLabel(order.payment_status, language)}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <StorePaymentProgress order={order} />
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-bold text-gray-900">
                    {formatPrice(order.total_amount, currency)}
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => { setDetailOrder(order); setNewStatus(order.status); markSeen(order.id) }}
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
                  <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 shadow-sm">
                        {item.book?.cover_image_url ? (
                          <img src={item.book.cover_image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-primary-50">
                            <BookOpen className="h-4 w-4 text-primary-300" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{item.book?.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{item.bookstore?.name} · qty {item.quantity}</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-gray-900 flex-shrink-0">{formatPrice(item.final_price * item.quantity, currency)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Bookstore payments</p>
                <p className="text-xs text-gray-400">
                  {storePaymentGroups.filter(group => group.payment).length}/{storePaymentGroups.length} paid
                </p>
              </div>
              <div className="space-y-2">
                {storePaymentGroups.map(group => (
                  <div
                    key={group.bookstoreId}
                    className={cn(
                      'rounded-xl border p-3',
                      group.payment ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-gray-50',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {group.payment
                            ? <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-600" />
                            : <Clock className="h-4 w-4 flex-shrink-0 text-orange-500" />}
                          <p className="truncate text-sm font-semibold text-gray-800">{group.bookstoreName}</p>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Store total: <span className="font-semibold">{formatPrice(group.expectedAmount, currency)}</span>
                        </p>
                        {group.payment && (
                          <p className="mt-1 text-xs text-green-700">
                            Paid {formatPrice(Number(group.payment.amount), currency)} · {formatDateTime(group.payment.paid_at, language)}
                            {group.payment.paid_by_user?.name ? ` · by ${group.payment.paid_by_user.name}` : ''}
                          </p>
                        )}
                      </div>
                      <span className={cn(
                        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
                        group.payment ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700',
                      )}>
                        {group.payment ? 'Paid' : 'Unpaid'}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-black/5 pt-3">
                      {group.payment && (
                        <Button
                          size="sm"
                          variant="outline"
                          icon={<ReceiptText className="h-3.5 w-3.5" />}
                          onClick={() => viewPaymentProof(group.payment!)}
                        >
                          View proof
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant={group.payment ? 'outline' : 'primary'}
                        onClick={() => openStorePayment(group)}
                      >
                        {group.payment ? 'Edit payment' : 'Record payment'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* WhatsApp message to bookstores */}
            {orderDetail.items?.map(item => item.bookstore?.whatsapp && (
              <button
                type="button"
                key={item.id}
                onClick={() => handleBookstoreWhatsApp(item)}
                disabled={sharingItemId !== null}
                className="flex items-center gap-2 py-1 text-left text-xs font-medium text-green-600 transition-colors hover:text-green-700 disabled:cursor-wait disabled:opacity-50"
              >
                <MessageCircle className="h-4 w-4" />
                {sharingItemId === item.id ? 'ກຳລັງສ້າງໃບສັ່ງ...' : `WhatsApp ${item.bookstore.name}`}
              </button>
            ))}

            {receiptItem && (
              <div className="pointer-events-none fixed left-[-10000px] top-0">
                <BookstoreOrderReceipt
                  ref={bookstoreReceiptRef}
                  order={orderDetail}
                  item={receiptItem}
                />
              </div>
            )}

            {/* Payment status */}
            {orderDetail.payments?.[0] && orderDetail.payments[0].method !== 'CASH_ON_DELIVERY' && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Payment</p>
                <div className={cn(
                  'rounded-xl border p-3 flex items-center justify-between gap-3',
                  orderDetail.payments[0].verification_status === 'REQUIRES_REVIEW'
                    ? 'bg-orange-50 border-orange-200'
                    : orderDetail.payments[0].verification_status === 'VERIFIED'
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-100'
                )}>
                  <div className="flex items-center gap-2 min-w-0">
                    <CreditCard className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400">{orderDetail.payments[0].method.replace(/_/g, ' ')}</p>
                      <span className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
                        paymentStatusColor(orderDetail.payments[0].verification_status as Parameters<typeof paymentStatusLabel>[0])
                      )}>
                        {paymentStatusLabel(orderDetail.payments[0].verification_status as Parameters<typeof paymentStatusLabel>[0], language)}
                      </span>
                    </div>
                  </div>
                  {orderDetail.payments[0].verification_status === 'REQUIRES_REVIEW' && (
                    <Button
                      size="sm"
                      onClick={() => { setDetailOrder(null); navigate('/admin/payments') }}
                    >
                      Review →
                    </Button>
                  )}
                </div>
                {orderDetail.payments[0].receipt_image_url && (
                  <div className="mt-2 rounded-xl overflow-hidden border border-gray-100">
                    <StorageImage
                      src={orderDetail.payments[0].receipt_image_url}
                      alt="Payment receipt"
                      className="w-full max-h-40 object-contain bg-gray-50"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        ) : <LoadingSpinner />}
      </Modal>

      <Modal
        open={!!paymentStore}
        onClose={closeStorePayment}
        title={paymentStore?.payment ? 'Edit Bookstore Payment' : 'Record Bookstore Payment'}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={closeStorePayment}>{t('common.cancel')}</Button>
            <Button loading={savingStorePayment} onClick={saveStorePayment}>
              {paymentStore?.payment ? 'Save changes' : 'Mark as paid'}
            </Button>
          </>
        }
      >
        {paymentStore && (
          <div className="space-y-4">
            <div className="rounded-xl bg-primary-50 p-3">
              <p className="text-xs text-gray-500">{paymentStore.bookstoreName}</p>
              <p className="mt-1 text-lg font-bold text-primary-700">
                Expected: {formatPrice(paymentStore.expectedAmount, currency)}
              </p>
            </div>
            <Input
              label="Amount Paid"
              type="number"
              min="1"
              required
              value={paymentAmount}
              onChange={e => setPaymentAmount(e.target.value)}
            />
            <Input
              label="Paid At"
              type="datetime-local"
              required
              value={paymentPaidAt}
              onChange={e => setPaymentPaidAt(e.target.value)}
            />
            <Input
              label="Transaction Reference"
              placeholder="Optional bank transaction ID"
              value={paymentReference}
              onChange={e => setPaymentReference(e.target.value)}
            />
            <Textarea
              label="Notes"
              rows={2}
              value={paymentNotes}
              onChange={e => setPaymentNotes(e.target.value)}
            />
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">
                Payment Proof<span className="ml-0.5 text-red-500">*</span>
              </p>
              <button
                type="button"
                onClick={() => paymentProofInputRef.current?.click()}
                className="flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-gray-200 p-3 text-left transition-colors hover:border-primary-300 hover:bg-primary-50"
              >
                {paymentProofPreview ? (
                  <StorageImage
                    src={paymentProofPreview}
                    alt="Payment proof preview"
                    className="h-24 w-24 flex-shrink-0 rounded-lg bg-white object-contain"
                  />
                ) : (
                  <span className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
                    <Upload className="h-6 w-6 text-gray-400" />
                  </span>
                )}
                <span>
                  <span className="block text-sm font-semibold text-gray-700">
                    {paymentProofFile
                      ? paymentProofFile.name
                      : paymentStore.payment ? 'Replace payment proof' : 'Attach payment proof'}
                  </span>
                  <span className="mt-1 block text-xs text-gray-400">PNG, JPG, WebP, or PDF · maximum 10 MB</span>
                </span>
              </button>
              <input
                ref={paymentProofInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                className="hidden"
                onChange={handlePaymentProofChange}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function groupStorePayments(order: Order): StorePaymentGroup[] {
  const groups = new Map<string, StorePaymentGroup>()
  order.items?.forEach(item => {
    const existing = groups.get(item.bookstore_id)
    const amount = Number(item.bookstore_price) * item.quantity
    if (existing) {
      existing.expectedAmount += amount
    } else {
      groups.set(item.bookstore_id, {
        bookstoreId: item.bookstore_id,
        bookstoreName: item.bookstore?.name ?? 'Bookstore',
        expectedAmount: amount,
        payment: order.bookstore_payments?.find(payment => payment.bookstore_id === item.bookstore_id),
      })
    }
  })
  return [...groups.values()]
}

function toDateTimeLocal(value: string) {
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function StorePaymentProgress({ order }: { order: Order }) {
  const total = new Set(order.items?.map(item => item.bookstore_id)).size
  const paid = new Set(order.bookstore_payments?.map(payment => payment.bookstore_id)).size
  const complete = total > 0 && paid === total

  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
      complete ? 'bg-green-100 text-green-700' : paid > 0 ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700',
    )}>
      {paid}/{total} paid
    </span>
  )
}
