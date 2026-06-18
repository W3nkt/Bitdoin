import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, Store, MessageCircle, Phone } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { supabase } from '@/lib/supabase'
import type { Bookstore } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useToast } from '@/components/ui/Toast'

interface BookstoreForm {
  name: string
  contact_name: string
  phone: string
  whatsapp: string
  messenger_url: string
  address: string
  notes: string
}

export function AdminBookstores() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { success, error } = useToast()

  const [modalOpen, setModalOpen] = useState(false)
  const [editStore, setEditStore] = useState<Bookstore | null>(null)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, reset } = useForm<BookstoreForm>()

  const { data: bookstores, isLoading } = useQuery({
    queryKey: ['admin', 'bookstores'],
    queryFn: async () => {
      const { data } = await supabase
        .from('bookstores')
        .select('*')
        .order('name')
      return (data ?? []) as Bookstore[]
    },
  })

  function openAdd() {
    setEditStore(null)
    reset({})
    setModalOpen(true)
  }

  function openEdit(store: Bookstore) {
    setEditStore(store)
    reset({
      name: store.name,
      contact_name: store.contact_name ?? '',
      phone: store.phone ?? '',
      whatsapp: store.whatsapp ?? '',
      messenger_url: store.messenger_url ?? '',
      address: store.address ?? '',
      notes: store.notes ?? '',
    })
    setModalOpen(true)
  }

  async function onSubmit(form: BookstoreForm) {
    setSaving(true)
    const payload = {
      name: form.name,
      contact_name: form.contact_name || null,
      phone: form.phone || null,
      whatsapp: form.whatsapp || null,
      messenger_url: form.messenger_url || null,
      address: form.address || null,
      notes: form.notes || null,
    }
    try {
      if (editStore) {
        await supabase.from('bookstores').update(payload).eq('id', editStore.id)
        success('Bookstore updated')
      } else {
        await supabase.from('bookstores').insert(payload)
        success('Bookstore added')
      }
      await qc.invalidateQueries({ queryKey: ['admin', 'bookstores'] })
      setModalOpen(false)
    } catch {
      error(t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(store: Bookstore) {
    await supabase.from('bookstores').update({ is_active: !store.is_active }).eq('id', store.id)
    await qc.invalidateQueries({ queryKey: ['admin', 'bookstores'] })
  }

  function whatsAppUrl(store: Bookstore, bookTitle = 'a book') {
    const msg = encodeURIComponent(`Book: ${bookTitle} | Please confirm availability.`)
    return `https://wa.me/${(store.whatsapp ?? '').replace(/\D/g, '')}?text=${msg}`
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('admin.bookstores')}</h1>
          <p className="text-sm text-gray-400 mt-0.5">Partner bookstore network</p>
        </div>
        <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={openAdd}>
          {t('admin.addBookstore')}
        </Button>
      </div>

      {isLoading ? <LoadingSpinner /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bookstores?.map(store => (
            <div key={store.id} className="bg-white rounded-2xl shadow-card p-5 flex flex-col gap-3">
              {/* Card header: store icon + name + active badge */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-primary-50 p-2.5 flex-shrink-0">
                    <Store className="h-5 w-5 text-primary-700" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm leading-tight">{store.name}</p>
                    {store.contact_name && (
                      <p className="text-xs text-gray-400 mt-0.5">{store.contact_name}</p>
                    )}
                  </div>
                </div>
                {/* Active/inactive pill badge */}
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold flex-shrink-0 ${
                  store.is_active
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {store.is_active ? t('common.active') : t('common.inactive')}
                </span>
              </div>

              {/* Address */}
              {store.address && (
                <p className="text-xs text-gray-500 leading-relaxed">{store.address}</p>
              )}

              {/* Contact links */}
              <div className="flex items-center gap-3 flex-wrap">
                {store.phone && (
                  <a
                    href={`tel:${store.phone}`}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary-700 transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {store.phone}
                  </a>
                )}
                {store.whatsapp && (
                  <a
                    href={whatsAppUrl(store)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-green-600 hover:text-green-700 transition-colors"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    WhatsApp
                  </a>
                )}
              </div>

              {/* Notes */}
              {store.notes && (
                <p className="text-xs text-gray-400 bg-gray-50 rounded-xl p-2.5 italic leading-relaxed">
                  {store.notes}
                </p>
              )}

              {/* Actions row */}
              <div className="flex items-center gap-3 pt-2 border-t border-gray-100 mt-auto">
                <button
                  onClick={() => openEdit(store)}
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-primary-700 transition-colors"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => toggleActive(store)}
                  className={`ml-auto text-xs font-medium transition-colors ${
                    store.is_active
                      ? 'text-red-400 hover:text-red-600'
                      : 'text-green-600 hover:text-green-700'
                  }`}
                >
                  {store.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editStore ? 'Edit Bookstore' : t('admin.addBookstore')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
            <Button loading={saving} onClick={handleSubmit(onSubmit)}>{t('common.save')}</Button>
          </>
        }
      >
        <form className="space-y-4">
          <Input label="Store Name" required {...register('name', { required: true })} />
          <Input label="Contact Name" {...register('contact_name')} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Phone" type="tel" {...register('phone')} />
            <Input label="WhatsApp" type="tel" {...register('whatsapp')} />
          </div>
          <Input label="Messenger URL" {...register('messenger_url')} />
          <Textarea label="Address" rows={2} {...register('address')} />
          <Textarea label="Notes" rows={2} {...register('notes')} />
        </form>
      </Modal>
    </div>
  )
}
