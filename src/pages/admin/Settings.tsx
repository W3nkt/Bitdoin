import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Upload, Trash2, QrCode, CreditCard, Pencil, X, ToggleLeft, ToggleRight, Crop as CropIcon } from 'lucide-react'
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import type { Category, PaymentAccount } from '@/types'

// ─── Category form ────────────────────────────────────────────────────────────

const platformInfo = [
  { label: 'Name', value: 'Bitdoin' },
  { label: 'Market', value: 'Lao PDR' },
  { label: 'Currencies', value: 'LAK, USD' },
  { label: 'Languages', value: 'Lao, English' },
  { label: 'Version', value: '1.0.0' },
]

// ─── Payment account form schema ──────────────────────────────────────────────

const accountSchema = z.object({
  method: z.enum(['QR_PAYMENT', 'BANK_TRANSFER']),
  label: z.string().min(1),
  bank_name: z.string().min(1),
  account_name: z.string().optional(),
  account_number: z.string().optional(),
  instructions: z.string().optional(),
  sort_order: z.coerce.number().default(0),
})

type AccountForm = z.infer<typeof accountSchema>

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminSettings() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { success, error } = useToast()

  // ── Category ──
  const [savingCat, setSavingCat] = useState(false)
  const { register: rCat, handleSubmit: hsCat, reset: resetCat } = useForm<{ name_lo: string; name_en: string; slug: string }>()

  // ── Payment accounts ──
  const [editAccount, setEditAccount] = useState<PaymentAccount | null>(null)
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [savingAccount, setSavingAccount] = useState(false)
  const [uploadingQr, setUploadingQr] = useState(false)
  const [qrPreview, setQrPreview] = useState<string | null>(null)
  const [qrFile, setQrFile] = useState<File | null>(null)
  const qrInputRef = useRef<HTMLInputElement>(null)

  // Crop state
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [showCrop, setShowCrop] = useState(false)
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const cropImgRef = useRef<HTMLImageElement>(null)

  const {
    register: rAcc,
    handleSubmit: hsAcc,
    watch: watchAcc,
    reset: resetAcc,
  } = useForm<AccountForm>({
    resolver: zodResolver(accountSchema),
    defaultValues: { method: 'QR_PAYMENT', sort_order: 0 },
  })

  const methodWatch = watchAcc('method')

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('*').order('name_en')
      return (data ?? []) as Category[]
    },
  })

  const { data: paymentAccounts } = useQuery({
    queryKey: ['payment_accounts', 'admin'],
    queryFn: async () => {
      const { data } = await supabase
        .from('payment_accounts')
        .select('*')
        .order('sort_order')
        .order('created_at')
      return (data ?? []) as PaymentAccount[]
    },
  })

  // ── Category handlers ──────────────────────────────────────────────────────

  async function addCategory(form: { name_lo: string; name_en: string; slug: string }) {
    setSavingCat(true)
    try {
      await supabase.from('categories').insert({
        name_lo: form.name_lo,
        name_en: form.name_en,
        slug: form.slug || form.name_en.toLowerCase().replace(/\s+/g, '-'),
      })
      await qc.invalidateQueries({ queryKey: ['categories'] })
      resetCat({})
      success('Category added')
    } catch {
      error(t('common.error'))
    } finally {
      setSavingCat(false)
    }
  }

  // ── Payment account handlers ───────────────────────────────────────────────

  function openAddAccount() {
    setEditAccount(null)
    resetAcc({ method: 'QR_PAYMENT', sort_order: 0 })
    setQrPreview(null)
    setQrFile(null)
    setShowAddAccount(true)
  }

  function openEditAccount(acc: PaymentAccount) {
    setEditAccount(acc)
    resetAcc({
      method: acc.method as 'QR_PAYMENT' | 'BANK_TRANSFER',
      label: acc.label,
      bank_name: acc.bank_name,
      account_name: acc.account_name ?? '',
      account_number: acc.account_number ?? '',
      instructions: acc.instructions ?? '',
      sort_order: acc.sort_order,
    })
    setQrPreview(acc.qr_image_url ?? null)
    setQrFile(null)
    setShowAddAccount(true)
  }

  function cancelAccountForm() {
    setShowAddAccount(false)
    setEditAccount(null)
    setQrPreview(null)
    setQrFile(null)
    setShowCrop(false)
    setCropSrc(null)
    setCrop(undefined)
    setCompletedCrop(undefined)
    resetAcc({ method: 'QR_PAYMENT', sort_order: 0 })
  }

  function handleQrFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Open crop modal instead of using the file directly
    setCropSrc(URL.createObjectURL(file))
    setCrop(undefined)
    setCompletedCrop(undefined)
    setShowCrop(true)
  }

  function onCropImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget
    const initialCrop = centerCrop(makeAspectCrop({ unit: '%', width: 90 }, 1, w, h), w, h)
    setCrop(initialCrop)
  }

  function applyCrop() {
    const image = cropImgRef.current
    if (!image || !completedCrop?.width || !completedCrop?.height) return
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height
    canvas.width = Math.floor(completedCrop.width * scaleX)
    canvas.height = Math.floor(completedCrop.height * scaleY)
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(
      image,
      completedCrop.x * scaleX, completedCrop.y * scaleY,
      completedCrop.width * scaleX, completedCrop.height * scaleY,
      0, 0, canvas.width, canvas.height,
    )
    canvas.toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], 'qr.png', { type: 'image/png' })
      setQrFile(file)
      setQrPreview(URL.createObjectURL(blob))
      setShowCrop(false)
      setCropSrc(null)
    }, 'image/png', 1)
  }

  function skipCrop() {
    // Use the original file without cropping
    if (!cropSrc) return
    fetch(cropSrc).then(r => r.blob()).then(blob => {
      const file = new File([blob], 'qr.png', { type: 'image/png' })
      setQrFile(file)
      setQrPreview(cropSrc)
      setShowCrop(false)
      setCropSrc(null)
    })
  }

  function cancelCrop() {
    setShowCrop(false)
    setCropSrc(null)
    setCrop(undefined)
    setCompletedCrop(undefined)
    if (qrInputRef.current) qrInputRef.current.value = ''
  }

  async function uploadQrImage(accountId: string, file: File): Promise<string> {
    setUploadingQr(true)
    const ext = file.name.split('.').pop()
    const path = `qr/${accountId}.${ext}`
    const { error: uploadErr } = await supabase.storage
      .from('payment-qr')
      .upload(path, file, { upsert: true })
    if (uploadErr) throw uploadErr
    const { data: { publicUrl } } = supabase.storage.from('payment-qr').getPublicUrl(path)
    setUploadingQr(false)
    return publicUrl
  }

  async function saveAccount(form: AccountForm) {
    setSavingAccount(true)
    try {
      let qrUrl: string | undefined = editAccount?.qr_image_url

      if (editAccount) {
        // Update existing
        const { error: updateErr } = await supabase
          .from('payment_accounts')
          .update({
            method: form.method,
            label: form.label,
            bank_name: form.bank_name,
            account_name: form.account_name || null,
            account_number: form.account_number || null,
            instructions: form.instructions || null,
            sort_order: form.sort_order,
          })
          .eq('id', editAccount.id)
        if (updateErr) throw updateErr

        if (qrFile) {
          qrUrl = await uploadQrImage(editAccount.id, qrFile)
          const { error: qrUpdateErr } = await supabase
            .from('payment_accounts')
            .update({ qr_image_url: qrUrl })
            .eq('id', editAccount.id)
          if (qrUpdateErr) throw qrUpdateErr
        }
        success('Payment account updated')
      } else {
        // Insert new
        const { data: newAcc, error: insertErr } = await supabase
          .from('payment_accounts')
          .insert({
            method: form.method,
            label: form.label,
            bank_name: form.bank_name,
            account_name: form.account_name || null,
            account_number: form.account_number || null,
            instructions: form.instructions || null,
            sort_order: form.sort_order,
            is_active: true,
          })
          .select()
          .single()

        if (insertErr) throw insertErr
        if (!newAcc) throw new Error('Insert returned no data')

        if (qrFile) {
          qrUrl = await uploadQrImage(newAcc.id, qrFile)
          const { error: qrErr } = await supabase
            .from('payment_accounts')
            .update({ qr_image_url: qrUrl })
            .eq('id', newAcc.id)
          if (qrErr) throw qrErr
        }
        success('Payment account added')
      }

      await qc.invalidateQueries({ queryKey: ['payment_accounts'] })
      cancelAccountForm()
    } catch (err) {
      console.error('[saveAccount]', err)
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message
      error(msg ? `Error: ${msg}` : t('common.error'))
    } finally {
      setSavingAccount(false)
      setUploadingQr(false)
    }
  }

  async function toggleActive(acc: PaymentAccount) {
    await supabase
      .from('payment_accounts')
      .update({ is_active: !acc.is_active })
      .eq('id', acc.id)
    await qc.invalidateQueries({ queryKey: ['payment_accounts'] })
  }

  async function deleteAccount(acc: PaymentAccount) {
    if (!confirm(`Delete "${acc.label}"?`)) return
    await supabase.from('payment_accounts').delete().eq('id', acc.id)
    if (acc.qr_image_url) {
      const path = acc.qr_image_url.split('/payment-qr/')[1]
      if (path) await supabase.storage.from('payment-qr').remove([path])
    }
    await qc.invalidateQueries({ queryKey: ['payment_accounts'] })
    success('Deleted')
  }

  const methodOptions = [
    { value: 'QR_PAYMENT', label: 'QR Code Payment' },
    { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  ]

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">{t('admin.settings')}</h1>
        <p className="text-sm text-gray-400 mt-0.5">Platform configuration</p>
      </div>

      {/* ── Payment Accounts section ── */}
      <section className="bg-white rounded-2xl shadow-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-800">Payment Accounts</h2>
            <p className="text-xs text-gray-400 mt-0.5">QR codes and bank details shown to buyers</p>
          </div>
          {!showAddAccount && (
            <Button size="sm" onClick={openAddAccount} icon={<span className="text-base leading-none">+</span>}>
              Add Account
            </Button>
          )}
        </div>

        {/* Account list */}
        {paymentAccounts && paymentAccounts.length > 0 && !showAddAccount && (
          <div className="rounded-xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
            {paymentAccounts.map(acc => (
              <div key={acc.id} className={`flex items-center gap-3 p-4 ${!acc.is_active ? 'opacity-50' : ''}`}>
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                  {acc.method === 'QR_PAYMENT'
                    ? <QrCode className="h-5 w-5 text-primary-600" />
                    : <CreditCard className="h-5 w-5 text-primary-600" />}
                </div>

                {/* QR thumbnail */}
                {acc.qr_image_url && (
                  <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-100 flex-shrink-0">
                    <img src={acc.qr_image_url} alt="QR" className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{acc.label}</p>
                  <p className="text-xs text-gray-400">
                    {acc.bank_name}
                    {acc.account_number ? ` · ${acc.account_number}` : ''}
                  </p>
                  <span className={`inline-flex items-center mt-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    acc.method === 'QR_PAYMENT'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {acc.method === 'QR_PAYMENT' ? 'QR Payment' : 'Bank Transfer'}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => toggleActive(acc)}
                    title={acc.is_active ? 'Deactivate' : 'Activate'}
                    className="p-2 rounded-xl hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {acc.is_active
                      ? <ToggleRight className="h-4 w-4 text-green-500" />
                      : <ToggleLeft className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => openEditAccount(acc)}
                    className="p-2 rounded-xl hover:bg-primary-50 text-gray-400 hover:text-primary-600 transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteAccount(acc)}
                    className="p-2 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {(!paymentAccounts || paymentAccounts.length === 0) && !showAddAccount && (
          <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center">
            <QrCode className="h-8 w-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No payment accounts yet.</p>
            <p className="text-xs text-gray-300 mt-1">Add a QR code or bank account for buyers to pay.</p>
          </div>
        )}

        {/* Add / Edit form */}
        {showAddAccount && (
          <form onSubmit={hsAcc(saveAccount)} className="space-y-4 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                {editAccount ? 'Edit Account' : 'New Payment Account'}
              </p>
              <button type="button" onClick={cancelAccountForm} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Method"
                required
                options={methodOptions}
                {...rAcc('method')}
              />
              <Input
                label="Sort Order"
                type="number"
                {...rAcc('sort_order')}
              />
            </div>

            <Input
              label="Label"
              placeholder='e.g. "BCEL OnePay QR" or "BCEL Bank Transfer"'
              required
              {...rAcc('label')}
            />

            <Input label="Bank Name" required placeholder="e.g. BCEL, LDB, BFL" {...rAcc('bank_name')} />

            <div className="grid grid-cols-2 gap-3">
              <Input label="Account Name" placeholder="e.g. Bitdoin Co., Ltd." {...rAcc('account_name')} />
              <Input label="Account Number" placeholder="e.g. 010-01-00-12345678" {...rAcc('account_number')} />
            </div>

            <Textarea
              label="Instructions (optional)"
              rows={2}
              placeholder="Extra note shown to buyer, e.g. 'Use order number as transfer reference'"
              {...rAcc('instructions')}
            />

            {/* QR code upload — shown for QR_PAYMENT but useful for either */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">
                QR Code Image
                {methodWatch === 'QR_PAYMENT' && <span className="text-red-500 ml-0.5">*</span>}
              </p>

              {qrPreview ? (
                <div className="relative w-fit">
                  <img
                    src={qrPreview}
                    alt="QR Preview"
                    className="w-36 h-36 object-contain rounded-xl border-2 border-primary-100 bg-white p-1"
                  />
                  <button
                    type="button"
                    onClick={() => { setQrPreview(null); setQrFile(null); if (qrInputRef.current) qrInputRef.current.value = '' }}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => qrInputRef.current?.click()}
                  className="flex flex-col items-center justify-center w-36 h-36 rounded-xl border-2 border-dashed border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors text-gray-400 hover:text-primary-600"
                >
                  <Upload className="h-6 w-6 mb-1.5" />
                  <span className="text-xs font-medium">Upload QR</span>
                  <span className="text-[10px] mt-0.5">PNG / JPG</span>
                </button>
              )}
              <input
                ref={qrInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleQrFileChange}
              />
              <p className="text-xs text-gray-400">Upload the QR image from your bank's app.</p>
            </div>

            <div className="flex gap-3 pt-1">
              <Button type="button" variant="ghost" onClick={cancelAccountForm}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" loading={savingAccount || uploadingQr} className="flex-1">
                {editAccount ? t('common.save') : 'Add Account'}
              </Button>
            </div>
          </form>
        )}
      </section>

      {/* ── Categories section ── */}
      <section className="bg-white rounded-2xl shadow-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-800">Book Categories</h2>
          <span className="text-xs text-gray-400">{categories?.length ?? 0} categories</span>
        </div>

        <div className="rounded-xl border border-gray-100 overflow-hidden">
          {categories?.map((cat, idx) => (
            <div
              key={cat.id}
              className={`flex items-center gap-4 px-4 py-3 ${
                idx !== (categories.length - 1) ? 'border-b border-gray-50' : ''
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{cat.name_en}</p>
              </div>
              <div className="flex-1 min-w-0 hidden sm:block">
                <p className="text-sm text-gray-500">{cat.name_lo}</p>
              </div>
              <div className="flex-shrink-0">
                <span className="inline-flex items-center rounded-lg bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-500">
                  /{cat.slug}
                </span>
              </div>
            </div>
          ))}
          {(!categories || categories.length === 0) && (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              No categories yet. Add one below.
            </div>
          )}
        </div>

        <form onSubmit={hsCat(addCategory)} className="pt-3 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Add Category</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input label="English Name" required {...rCat('name_en', { required: true })} />
            <Input label="Lao Name" required {...rCat('name_lo', { required: true })} />
            <Input label="Slug (auto)" placeholder="auto-generated" {...rCat('slug')} />
          </div>
          <div className="mt-3">
            <Button type="submit" size="sm" loading={savingCat}>
              Add Category
            </Button>
          </div>
        </form>
      </section>

      {/* ── QR Crop modal ── */}
      <Modal
        open={showCrop}
        onClose={cancelCrop}
        title="Crop QR Code"
        size="lg"
        footer={
          <div className="flex gap-2 w-full">
            <Button variant="ghost" onClick={cancelCrop}>{t('common.cancel')}</Button>
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
            <p className="text-xs text-gray-400">Drag to select the QR code area. The crop is locked to a 1:1 square ratio.</p>
            <div className="flex justify-center">
              <ReactCrop
                crop={crop}
                onChange={c => setCrop(c)}
                onComplete={c => setCompletedCrop(c)}
                aspect={1}
                minWidth={80}
                minHeight={80}
                className="max-w-full rounded-xl overflow-hidden"
              >
                <img
                  ref={cropImgRef}
                  src={cropSrc}
                  onLoad={onCropImageLoad}
                  alt="Crop preview"
                  style={{ maxHeight: '60vh', maxWidth: '100%', display: 'block' }}
                />
              </ReactCrop>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Platform info section ── */}
      <section className="bg-white rounded-2xl shadow-card p-5 space-y-4">
        <h2 className="text-sm font-bold text-gray-800">Platform</h2>
        <div className="rounded-xl border border-gray-100 overflow-hidden">
          {platformInfo.map((item, idx) => (
            <div
              key={item.label}
              className={`flex items-center px-4 py-3 ${
                idx !== platformInfo.length - 1 ? 'border-b border-gray-50' : ''
              }`}
            >
              <span className="text-sm text-gray-400 w-32 flex-shrink-0">{item.label}</span>
              <span className="text-sm font-semibold text-gray-800">{item.value}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
