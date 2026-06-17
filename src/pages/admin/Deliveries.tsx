import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Truck, Plus, Edit2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { supabase } from '@/lib/supabase'
import type { Delivery, DeliveryStatus } from '@/types'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
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

export function AdminDeliveries() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { success, error } = useToast()

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
        success('Delivery updated')
      } else {
        await supabase.from('deliveries').insert(payload)
        success('Delivery created')
      }
      await qc.invalidateQueries({ queryKey: ['admin', 'deliveries'] })
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">{t('admin.deliveries')}</h1>
        <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={openAdd}>
          Create Delivery
        </Button>
      </div>

      <div className="flex gap-2">
        {['', 'NOT_ASSIGNED', 'READY_FOR_SHIPMENT', 'SHIPPED', 'DELIVERED'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === s ? 'bg-primary-700 text-white' : 'border border-gray-200 text-gray-500 hover:border-primary-400'
            }`}
          >
            {s ? deliveryStatusLabel(s as DeliveryStatus) : 'All'}
          </button>
        ))}
      </div>

      {isLoading ? <LoadingSpinner /> : (
        <div className="space-y-3">
          {deliveries?.map(delivery => (
            <div key={delivery.id} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-indigo-50 p-2">
                    <Truck className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {(delivery.order as { order_number?: string } | undefined)?.order_number ?? '—'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {(delivery.order as { customer_name?: string } | undefined)?.customer_name}
                    </p>
                  </div>
                </div>
                <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', statusColors[delivery.status])}>
                  {deliveryStatusLabel(delivery.status)}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
                <div>
                  <span className="text-gray-400">Courier: </span>{delivery.courier}
                </div>
                {delivery.tracking_number && (
                  <div>
                    <span className="text-gray-400">Tracking: </span>
                    <span className="font-mono">{delivery.tracking_number}</span>
                  </div>
                )}
                {delivery.estimated_delivery_at && (
                  <div>
                    <span className="text-gray-400">Est. Delivery: </span>{formatDate(delivery.estimated_delivery_at)}
                  </div>
                )}
                {delivery.shipped_at && (
                  <div>
                    <span className="text-gray-400">Shipped: </span>{formatDate(delivery.shipped_at)}
                  </div>
                )}
              </div>

              {delivery.order && (
                <p className="mt-2 text-xs text-gray-400">
                  {(delivery.order as { delivery_address?: string } | undefined)?.delivery_address}
                </p>
              )}

              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => openEdit(delivery)}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary-700"
                >
                  <Edit2 className="h-3.5 w-3.5" /> {t('admin.updateTracking')}
                </button>
              </div>
            </div>
          ))}
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
