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
import { Badge } from '@/components/ui/Badge'
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">{t('admin.bookstores')}</h1>
        <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={openAdd}>
          {t('admin.addBookstore')}
        </Button>
      </div>

      {isLoading ? <LoadingSpinner /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {bookstores?.map(store => (
            <div key={store.id} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-xl bg-blue-50 p-2">
                    <Store className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{store.name}</p>
                    {store.contact_name && <p className="text-xs text-gray-400">{store.contact_name}</p>}
                  </div>
                </div>
                <Badge variant={store.is_active ? 'success' : 'default'}>
                  {store.is_active ? t('common.active') : t('common.inactive')}
                </Badge>
              </div>

              {store.address && <p className="text-xs text-gray-500">{store.address}</p>}

              <div className="flex items-center gap-2">
                {store.phone && (
                  <a href={`tel:${store.phone}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary-700">
                    <Phone className="h-3.5 w-3.5" /> {store.phone}
                  </a>
                )}
                {store.whatsapp && (
                  <a
                    href={whatsAppUrl(store)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </a>
                )}
              </div>

              {store.notes && (
                <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-2 italic">{store.notes}</p>
              )}

              <div className="flex items-center gap-2 pt-1 border-t border-gray-50">
                <button
                  onClick={() => openEdit(store)}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary-700"
                >
                  <Edit2 className="h-3.5 w-3.5" /> Edit
                </button>
                <button
                  onClick={() => toggleActive(store)}
                  className="text-xs text-gray-400 hover:text-gray-600 ml-auto"
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
