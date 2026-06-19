import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Truck, Plus, Edit2, MapPin } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { supabase } from '@/lib/supabase'
import { logAudit } from '@/lib/audit'
import { useMarkSeen } from '@/context/AdminNotificationsContext'
import type { Delivery, DeliveryStatus } from '@/types'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { useLanguage } from '@/context/LanguageContext'
import { formatDate, deliveryStatusLabel } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface DeliveryForm {
  order_id: string
  courier: string
  tracking_number: string
  status: DeliveryStatus
  shipped_at: string
  estimated_delivery_at: string
  notes: string
}

const COURIERS = ['Unitel Logistics', 'Anousith Express', 'HAL Logistics', 'Self-delivery']

const statusColors: Record<DeliveryStatus, string> = {
  NOT_ASSIGNED:       'bg-gray-100 text-gray-600',
  READY_FOR_SHIPMENT: 'bg-blue-100 text-blue-700',
  SHIPPED:            'bg-indigo-100 text-indigo-700',
  DELIVERED:          'bg-green-100 text-green-700',
  FAILED:             'bg-red-100 text-red-700',
  RETURNED:           'bg-rose-100 text-rose-700',
}

const statusStripes: Record<DeliveryStatus, string> = {
  NOT_ASSIGNED:       'bg-gray-300',
  READY_FOR_SHIPMENT: 'bg-blue-400',
  SHIPPED:            'bg-indigo-500',
  DELIVERED:          'bg-green-500',
  FAILED:             'bg-red-500',
  RETURNED:           'bg-rose-400',
}

export function AdminDeliveries() {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const qc = useQueryClient()
  const { success, error } = useToast()
  const { markSeen } = useMarkSeen()

  const [modalOpen, setModalOpen] = useState(false)
  const [editDelivery, setEditDelivery] = useState<Delivery | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, reset } = useForm<DeliveryForm>()

  const { data: deliveries, isLoading } = useQuery({
    queryKey: ['admin', 'deliveries', statusFilter],
    queryFn: async () => {
      let q = supabase
        .from('deliveries')
        .select('*, order:orders(order_number, customer_name, customer_phone, delivery_address)')
        .order('created_at', { ascending: false })
      if (statusFilter) q = q.eq('status', statusFilter)
      const { data } = await q
      return (data ?? []) as Delivery[]
    },
  })

  const { data: pendingOrders } = useQuery({
    queryKey: ['admin', 'orders-no-delivery'],
    queryFn: async () => {
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, customer_name')
        .eq('status', 'PROCESSING')
        .order('created_at', { ascending: false })
        .limit(50)
      return data ?? []
    },
  })

  function openAdd() {
    setEditDelivery(null)
    reset({ status: 'NOT_ASSIGNED', courier: COURIERS[0] })
    setModalOpen(true)
  }

  function openEdit(delivery: Delivery) {
    setEditDelivery(delivery)
    markSeen(delivery.id)
    reset({
      order_id: delivery.order_id,
      courier: delivery.courier,
      tracking_number: delivery.tracking_number ?? '',
      status: delivery.status,
      shipped_at: delivery.shipped_at?.split('T')[0] ?? '',
      estimated_delivery_at: delivery.estimated_delivery_at?.split('T')[0] ?? '',
      notes: delivery.notes ?? '',
    })
    setModalOpen(true)
  }

  async function onSubmit(form: DeliveryForm) {
    setSaving(true)
    const payload = {
      order_id: form.order_id,
      courier: form.courier,
      tracking_number: form.tracking_number || null,
      status: form.status,
      shipped_at: form.shipped_at || null,
      estimated_delivery_at: form.estimated_delivery_at || null,
      notes: form.notes || null,
    }
    try {
      if (editDelivery) {
        await supabase.from('deliveries').update(payload).eq('id', editDelivery.id)
        if (form.status === 'DELIVERED') {
          await supabase.from('orders').update({ status: 'DELIVERED' }).eq('id', form.order_id)
        } else if (form.status === 'SHIPPED') {
          await supabase.from('orders').update({ status: 'SHIPPED' }).eq('id', form.order_id)
        }
        await logAudit({
          entity: 'delivery',
          entityId: editDelivery.id,
          action: 'DELIVERY_UPDATED',
          oldValue: { status: editDelivery.status, courier: editDelivery.courier, tracking_number: editDelivery.tracking_number ?? null },
          newValue: { status: form.status, courier: form.courier, tracking_number: form.tracking_number || null, order_id: form.order_id },
        })
        success('Delivery updated')
      } else {
        const { data: created } = await supabase.from('deliveries').insert(payload).select('id').single()
        await logAudit({
          entity: 'delivery',
          entityId: created?.id,
          action: 'DELIVERY_CREATED',
          newValue: { order_id: form.order_id, status: form.status, courier: form.courier, tracking_number: form.tracking_number || null },
        })
        success('Delivery created')
      }
      await qc.invalidateQueries({ queryKey: ['admin', 'deliveries'] })
      await qc.invalidateQueries({ queryKey: ['admin', 'badge', 'deliveries'] })
      setModalOpen(false)
    } catch {
      error(t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  const courierOptions = COURIERS.map(c => ({ value: c, label: c }))
  const statusOptions = [
    { value: 'NOT_ASSIGNED', label: 'Not Assigned' },
    { value: 'READY_FOR_SHIPMENT', label: 'Ready for Shipment' },
    { value: 'SHIPPED', label: 'Shipped' },
    { value: 'DELIVERED', label: 'Delivered' },
    { value: 'FAILED', label: 'Failed' },
    { value: 'RETURNED', label: 'Returned' },
  ]
  const orderOptions = pendingOrders?.map((o: { id: string; order_number: string; customer_name: string }) => ({
    value: o.id,
    label: `${o.order_number} — ${o.customer_name}`,
  })) ?? []

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('admin.deliveries')}</h1>
          <p className="text-sm text-gray-400 mt-0.5">Track and manage shipments</p>
        </div>
        <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={openAdd}>
          Create Delivery
        </Button>
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 flex-wrap">
        {(['', 'NOT_ASSIGNED', 'READY_FOR_SHIPMENT', 'SHIPPED', 'DELIVERED'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
              statusFilter === s
                ? 'bg-primary-700 text-white shadow-sm'
                : 'border border-gray-200 text-gray-500 hover:border-primary-400 hover:text-primary-600'
            }`}
          >
            {s ? deliveryStatusLabel(s as DeliveryStatus, language) : 'All'}
          </button>
        ))}
      </div>

      {isLoading ? <LoadingSpinner /> : (
        <div className="space-y-3">
          {deliveries?.map(delivery => (
            <div key={delivery.id} className="bg-white rounded-2xl shadow-card overflow-hidden flex">
              {/* Status color stripe on left */}
              <div className={cn('w-1 flex-shrink-0', statusStripes[delivery.status])} />

              <div className="flex-1 p-5">
                {/* Card header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-indigo-50 p-2.5 flex-shrink-0">
                      <Truck className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        {(delivery.order as { order_number?: string } | undefined)?.order_number ?? '—'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {(delivery.order as { customer_name?: string } | undefined)?.customer_name}
                      </p>
                    </div>
                  </div>
                  <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold flex-shrink-0', statusColors[delivery.status])}>
                    {deliveryStatusLabel(delivery.status, language)}
                  </span>
                </div>

                {/* Details grid */}
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400">Courier:</span>
                    <span className="font-medium text-gray-700">{delivery.courier}</span>
                  </div>
                  {delivery.tracking_number && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400">Tracking:</span>
                      <span className="font-mono bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded-md text-[11px]">
                        {delivery.tracking_number}
                      </span>
                    </div>
                  )}
                  {delivery.shipped_at && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400">Shipped:</span>
                      <span className="text-gray-600">{formatDate(delivery.shipped_at, language)}</span>
                    </div>
                  )}
                  {delivery.estimated_delivery_at && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400">Est. Delivery:</span>
                      <span className="text-gray-600">{formatDate(delivery.estimated_delivery_at, language)}</span>
                    </div>
                  )}
                </div>

                {/* Delivery address */}
                {delivery.order && (delivery.order as { delivery_address?: string } | undefined)?.delivery_address && (
                  <div className="mt-2 flex items-start gap-1.5 text-xs text-gray-400">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                    <span>{(delivery.order as { delivery_address?: string } | undefined)?.delivery_address}</span>
                  </div>
                )}

                {/* Card footer */}
                <div className="mt-3 pt-3 border-t border-gray-50 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Edit2 className="h-3.5 w-3.5" />}
                    onClick={() => openEdit(delivery)}
                  >
                    {t('admin.updateTracking')}
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {deliveries?.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm bg-white rounded-2xl shadow-card">
              No deliveries found for this filter.
            </div>
          )}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editDelivery ? 'Update Delivery' : 'Create Delivery'}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
            <Button loading={saving} onClick={handleSubmit(onSubmit)}>{t('common.save')}</Button>
          </>
        }
      >
        <form className="space-y-4">
          {!editDelivery && (
            <Select label="Order" required options={orderOptions} placeholder="Select order" {...register('order_id', { required: true })} />
          )}
          <Select label="Courier" required options={courierOptions} {...register('courier', { required: true })} />
          <Input label="Tracking Number" {...register('tracking_number')} />
          <Select label="Status" options={statusOptions} {...register('status')} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Shipped Date" type="date" {...register('shipped_at')} />
            <Input label="Est. Delivery Date" type="date" {...register('estimated_delivery_at')} />
          </div>
          <Input label="Notes" {...register('notes')} />
        </form>
      </Modal>
    </div>
  )
}
