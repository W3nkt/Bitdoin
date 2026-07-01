import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, Store, MessageCircle, Phone, QrCode, Upload, Crop as CropIcon, Link2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { supabase } from '@/lib/supabase'
import { generateBookstorePriceLink, bookstorePriceLinkUrl } from '@/lib/bookstorePricing'
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
  const [qrFile, setQrFile] = useState<File | null>(null)
  const [qrPreview, setQrPreview] = useState<string | null>(null)
  const qrInputRef = useRef<HTMLInputElement>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [showCrop, setShowCrop] = useState(false)
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const cropImgRef = useRef<HTMLImageElement>(null)
  const [linkBusyId, setLinkBusyId] = useState<string | null>(null)
  const [linkModal, setLinkModal] = useState<{ name: string; url: string } | null>(null)

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
    setQrFile(null)
    setQrPreview(null)
    reset({})
    setModalOpen(true)
  }

  function openEdit(store: Bookstore) {
    setEditStore(store)
    setQrFile(null)
    setQrPreview(store.bank_qr_code_url ?? null)
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

  function handleQrChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      error('QR code must be a PNG, JPG, or WebP image')
      e.target.value = ''
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      error('QR code image must be 5 MB or smaller')
      e.target.value = ''
      return
    }
    setCropSrc(URL.createObjectURL(file))
    setCrop(undefined)
    setCompletedCrop(undefined)
    setShowCrop(true)
  }

  function onCropImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { naturalWidth: width, naturalHeight: height } = e.currentTarget
    setCrop(centerCrop(
      makeAspectCrop({ unit: '%', width: 90 }, 1, width, height),
      width,
      height,
    ))
  }

  function applyCrop() {
    const image = cropImgRef.current
    if (!image || !completedCrop?.width || !completedCrop?.height) return

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) return

    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height
    canvas.width = Math.floor(completedCrop.width * scaleX)
    canvas.height = Math.floor(completedCrop.height * scaleY)
    context.imageSmoothingQuality = 'high'
    context.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height,
    )

    canvas.toBlob(blob => {
      if (!blob) return
      const file = new File([blob], 'store-bank-qr.png', { type: 'image/png' })
      setQrFile(file)
      setQrPreview(URL.createObjectURL(blob))
      closeCrop()
    }, 'image/png', 1)
  }

  async function skipCrop() {
    if (!cropSrc) return
    const blob = await fetch(cropSrc).then(response => response.blob())
    setQrFile(new File([blob], 'store-bank-qr.png', { type: 'image/png' }))
    setQrPreview(URL.createObjectURL(blob))
    closeCrop()
  }

  function closeCrop() {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setShowCrop(false)
    setCropSrc(null)
    setCrop(undefined)
    setCompletedCrop(undefined)
    if (qrInputRef.current) qrInputRef.current.value = ''
  }

  async function uploadStoreQr(storeId: string, file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
    const path = `${storeId}/bank-qr.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('bookstore-qr')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (uploadError) throw uploadError
    return supabase.storage.from('bookstore-qr').getPublicUrl(path).data.publicUrl
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
      let storeId: string
      if (editStore) {
        const { error: updateError } = await supabase.from('bookstores').update(payload).eq('id', editStore.id)
        if (updateError) throw updateError
        storeId = editStore.id
        success('Bookstore updated')
      } else {
        const { data: newStore, error: insertError } = await supabase
          .from('bookstores')
          .insert(payload)
          .select('id')
          .single()
        if (insertError || !newStore) throw insertError ?? new Error('Bookstore was not created')
        storeId = newStore.id
        success('Bookstore added')
      }
      if (qrFile) {
        const bankQrCodeUrl = await uploadStoreQr(storeId, qrFile)
        const { error: qrUpdateError } = await supabase
          .from('bookstores')
          .update({ bank_qr_code_url: bankQrCodeUrl })
          .eq('id', storeId)
        if (qrUpdateError) throw qrUpdateError
      }
      await qc.invalidateQueries({ queryKey: ['admin', 'bookstores'] })
      setModalOpen(false)
      setQrFile(null)
      setQrPreview(null)
    } catch (saveError) {
      console.error('[saveBookstore]', saveError)
      error(saveError instanceof Error ? saveError.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  async function copyPriceLink(store: Bookstore) {
    setLinkBusyId(store.id)
    try {
      const token = await generateBookstorePriceLink(store.id)
      const url = bookstorePriceLinkUrl(token)
      try {
        await navigator.clipboard.writeText(url)
        success(`Price link copied for ${store.name}`)
      } catch {
        setLinkModal({ name: store.name, url })
      }
    } catch (err) {
      error(err instanceof Error ? err.message : 'Could not generate link')
    } finally {
      setLinkBusyId(null)
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
                {store.bank_qr_code_url && (
                  <span className="flex items-center gap-1.5 text-xs text-primary-600">
                    <QrCode className="h-3.5 w-3.5" />
                    Bank QR
                  </span>
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
                  onClick={() => copyPriceLink(store)}
                  disabled={linkBusyId === store.id}
                  className="flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-800 transition-colors disabled:opacity-50"
                  title="Copy a link this store can use to submit book prices"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  {linkBusyId === store.id ? 'Generating…' : 'Copy Price Link'}
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
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Store Bank QR Code</p>
            <button
              type="button"
              onClick={() => qrInputRef.current?.click()}
              className="flex w-full items-center gap-4 rounded-xl border-2 border-dashed border-gray-200 p-3 text-left transition-colors hover:border-primary-300 hover:bg-primary-50"
            >
              {qrPreview ? (
                <img
                  src={qrPreview}
                  alt="Store bank QR preview"
                  className="h-24 w-24 flex-shrink-0 rounded-lg border border-gray-100 bg-white object-contain"
                />
              ) : (
                <span className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-lg bg-gray-50">
                  <QrCode className="h-9 w-9 text-gray-300" />
                </span>
              )}
              <span>
                <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Upload className="h-4 w-4" />
                  {qrPreview ? 'Replace QR image' : 'Upload QR image'}
                </span>
                <span className="mt-1 block text-xs text-gray-400">PNG, JPG, or WebP · maximum 5 MB</span>
              </span>
            </button>
            <input
              ref={qrInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleQrChange}
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={showCrop}
        onClose={closeCrop}
        title="Crop Store Bank QR Code"
        size="lg"
        footer={
          <div className="flex w-full gap-2">
            <Button variant="ghost" onClick={closeCrop}>{t('common.cancel')}</Button>
            <Button variant="outline" onClick={skipCrop} className="ml-auto">
              Skip Crop
            </Button>
            <Button
              icon={<CropIcon className="h-4 w-4" />}
              onClick={applyCrop}
              disabled={!completedCrop?.width}
            >
              Apply Crop
            </Button>
          </div>
        }
      >
        {cropSrc && (
          <div className="space-y-3">
            <p className="text-xs text-gray-400">
              Drag to select the QR code area. The crop is locked to a 1:1 square ratio.
            </p>
            <div className="flex justify-center">
              <ReactCrop
                crop={crop}
                onChange={setCrop}
                onComplete={setCompletedCrop}
                aspect={1}
                minWidth={80}
                minHeight={80}
                className="max-w-full overflow-hidden rounded-xl"
              >
                <img
                  ref={cropImgRef}
                  src={cropSrc}
                  onLoad={onCropImageLoad}
                  alt="Store bank QR crop preview"
                  style={{ maxHeight: '60vh', maxWidth: '100%', display: 'block' }}
                />
              </ReactCrop>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!linkModal}
        onClose={() => setLinkModal(null)}
        title="Price Submission Link"
        size="md"
        footer={<Button onClick={() => setLinkModal(null)}>Done</Button>}
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Copy this link and share it with <strong className="text-gray-900">{linkModal?.name}</strong>.
            They can use it anytime, without an account, to enter their book prices.
          </p>
          <input
            readOnly
            value={linkModal?.url ?? ''}
            onFocus={e => e.currentTarget.select()}
            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-xs font-mono text-gray-700"
          />
        </div>
      </Modal>
    </div>
  )
}
