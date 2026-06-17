import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, Tag, Calculator } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { supabase } from '@/lib/supabase'
import type { BookPrice, Book, Bookstore, MarginRule } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useToast } from '@/components/ui/Toast'
import { formatPrice, calcFinalPrice } from '@/lib/utils'

interface PriceForm {
  book_id: string
  bookstore_id: string
  bookstore_price: string
  margin_percent: string
  availability: string
  notes: string
}

interface MarginForm {
  name: string
  category_id: string
  bookstore_id: string
  min_price: string
  max_price: string
  margin_percent: string
  priority: string
}

export function AdminPricing() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { success, error } = useToast()

  const [tab, setTab] = useState<'prices' | 'rules'>('prices')
  const [priceModal, setPriceModal] = useState(false)
  const [editPrice, setEditPrice] = useState<BookPrice | null>(null)
  const [marginModal, setMarginModal] = useState(false)
  const [saving, setSaving] = useState(false)

  const { register: rPrice, handleSubmit: hsPrice, reset: resetPrice, watch: watchPrice } = useForm<PriceForm>()
  const { register: rMargin, handleSubmit: hsMargin, reset: resetMargin } = useForm<MarginForm>()

  const bookstorePrice = watchPrice('bookstore_price')
  const marginPercent = watchPrice('margin_percent')
  const livePrice = bookstorePrice && marginPercent
    ? calcFinalPrice(parseFloat(bookstorePrice), parseFloat(marginPercent))
    : null

  const { data: prices, isLoading } = useQuery({
    queryKey: ['admin', 'prices'],
    queryFn: async () => {
      const { data } = await supabase
        .from('book_prices')
        .select('*, book:books(title), bookstore:bookstores(name)')
        .order('updated_at', { ascending: false })
      return (data ?? []) as BookPrice[]
    },
  })

  const { data: books } = useQuery({
    queryKey: ['admin', 'books-list'],
    queryFn: async () => {
      const { data } = await supabase.from('books').select('id, title').eq('is_active', true).order('title')
      return (data ?? []) as { id: string; title: string }[]
    },
  })

  const { data: bookstores } = useQuery({
    queryKey: ['admin', 'bookstores'],
    queryFn: async () => {
      const { data } = await supabase.from('bookstores').select('id, name').eq('is_active', true).order('name')
      return (data ?? []) as { id: string; name: string }[]
    },
  })

  const { data: rules } = useQuery({
    queryKey: ['admin', 'margin-rules'],
    queryFn: async () => {
      const { data } = await supabase.from('margin_rules').select('*').order('priority')
      return (data ?? []) as MarginRule[]
    },
  })

  async function onSubmitPrice(form: PriceForm) {
    setSaving(true)
    const bPrice = parseFloat(form.bookstore_price)
    const margin = parseFloat(form.margin_percent)
    const final = calcFinalPrice(bPrice, margin)
    const payload = {
      book_id: form.book_id,
      bookstore_id: form.bookstore_id,
      bookstore_price: bPrice,
      margin_percent: margin,
      final_price: final,
      availability: form.availability,
      notes: form.notes || null,
      last_checked_at: new Date().toISOString(),
    }
    try {
      if (editPrice) {
        await supabase.from('book_prices').update(payload).eq('id', editPrice.id)
        success('Price updated')
      } else {
        await supabase.from('book_prices').upsert(payload, { onConflict: 'book_id,bookstore_id' })
        success('Price saved')
      }
      await qc.invalidateQueries({ queryKey: ['admin', 'prices'] })
      setPriceModal(false)
    } catch {
      error(t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  async function onSubmitMargin(form: MarginForm) {
    setSaving(true)
    try {
      await supabase.from('margin_rules').insert({
        name: form.name,
        category_id: form.category_id || null,
        bookstore_id: form.bookstore_id || null,
        min_price: form.min_price ? parseFloat(form.min_price) : null,
        max_price: form.max_price ? parseFloat(form.max_price) : null,
        margin_percent: parseFloat(form.margin_percent),
        priority: parseInt(form.priority) || 100,
      })
      await qc.invalidateQueries({ queryKey: ['admin', 'margin-rules'] })
      setMarginModal(false)
      success('Margin rule added')
    } catch {
      error(t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  const availOptions = [
    { value: 'AVAILABLE', label: 'Available' },
    { value: 'LOW_STOCK', label: 'Low Stock' },
    { value: 'OUT_OF_STOCK', label: 'Out of Stock' },
    { value: 'UNKNOWN', label: 'Unknown' },
  ]

  const bookOptions = books?.map(b => ({ value: b.id, label: b.title })) ?? []
  const storeOptions = bookstores?.map(b => ({ value: b.id, label: b.name })) ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">{t('admin.pricing')}</h1>
        <div className="flex gap-2">
          {tab === 'prices' && (
            <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => { setEditPrice(null); resetPrice({}); setPriceModal(true) }}>
              Add Price
            </Button>
          )}
          {tab === 'rules' && (
            <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => { resetMargin({}); setMarginModal(true) }}>
              Add Rule
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {(['prices', 'rules'] as const).map(t2 => (
          <button
            key={t2}
            onClick={() => setTab(t2)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t2 ? 'border-primary-700 text-primary-700' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {t2 === 'prices' ? 'Book Prices' : 'Margin Rules'}
          </button>
        ))}
      </div>

      {tab === 'prices' && (
        isLoading ? <LoadingSpinner /> : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Book</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Store</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Store Price</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Margin</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Final Price</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Stock</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {prices?.map(price => (
                  <tr key={price.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 truncate max-w-xs text-xs">
                        {(price.book as { title?: string } | undefined)?.title ?? '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-500">
                      {(price.bookstore as { name?: string } | undefined)?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-600">{formatPrice(price.bookstore_price)}</td>
                    <td className="px-4 py-3 text-right text-xs text-gray-500">{price.margin_percent}%</td>
                    <td className="px-4 py-3 text-right text-xs font-semibold text-primary-700">{formatPrice(price.final_price)}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${
                        price.availability === 'AVAILABLE' ? 'bg-green-100 text-green-700' :
                        price.availability === 'LOW_STOCK' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {price.availability}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setEditPrice(price)
                          resetPrice({
                            book_id: price.book_id,
                            bookstore_id: price.bookstore_id,
                            bookstore_price: String(price.bookstore_price),
                            margin_percent: String(price.margin_percent),
                            availability: price.availability,
                            notes: price.notes ?? '',
                          })
                          setPriceModal(true)
                        }}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-primary-700"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'rules' && (
        <div className="space-y-3">
          {rules?.map(rule => (
            <div key={rule.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-gray-400" />
                  <p className="font-medium text-gray-800 text-sm">{rule.name}</p>
                  <span className="text-xs text-gray-400">Priority: {rule.priority}</span>
                </div>
                <div className="flex gap-3 mt-1 text-xs text-gray-500">
                  {rule.min_price && <span>Min: {formatPrice(rule.min_price)}</span>}
                  {rule.max_price && <span>Max: {formatPrice(rule.max_price)}</span>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-primary-700">{rule.margin_percent}%</p>
                <p className="text-xs text-gray-400">margin</p>
              </div>
            </div>
          ))}
          {(!rules || rules.length === 0) && (
            <div className="text-center py-12 text-gray-400 text-sm">No margin rules yet.</div>
          )}
        </div>
      )}

      {/* Price Modal */}
      <Modal
        open={priceModal}
        onClose={() => setPriceModal(false)}
        title={editPrice ? 'Edit Price' : 'Add Book Price'}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPriceModal(false)}>{t('common.cancel')}</Button>
            <Button loading={saving} onClick={hsPrice(onSubmitPrice)}>{t('common.save')}</Button>
          </>
        }
      >
        <form className="space-y-4">
          <Select label="Book" required options={bookOptions} placeholder="Select book" {...rPrice('book_id', { required: true })} />
          <Select label="Bookstore" required options={storeOptions} placeholder="Select store" {...rPrice('bookstore_id', { required: true })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Bookstore Price (LAK)" type="number" required {...rPrice('bookstore_price', { required: true })} />
            <Input label="Margin %" type="number" step="0.1" required {...rPrice('margin_percent', { required: true })} />
          </div>
          {livePrice && (
            <div className="flex items-center gap-2 rounded-xl bg-primary-50 p-3">
              <Calculator className="h-4 w-4 text-primary-600" />
              <p className="text-sm font-semibold text-primary-700">
                Final Price: {formatPrice(livePrice)}
              </p>
            </div>
          )}
          <Select label="Availability" options={availOptions} {...rPrice('availability')} />
          <Input label="Notes" {...rPrice('notes')} />
        </form>
      </Modal>

      {/* Margin Rule Modal */}
      <Modal
        open={marginModal}
        onClose={() => setMarginModal(false)}
        title="Add Margin Rule"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setMarginModal(false)}>{t('common.cancel')}</Button>
            <Button loading={saving} onClick={hsMargin(onSubmitMargin)}>{t('common.save')}</Button>
          </>
        }
      >
        <form className="space-y-4">
          <Input label="Rule Name" required {...rMargin('name', { required: true })} />
          <Input label="Margin %" type="number" step="0.1" required {...rMargin('margin_percent', { required: true })} />
          <Input label="Priority (lower = higher priority)" type="number" defaultValue="100" {...rMargin('priority')} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Bookstore (optional)" options={storeOptions} placeholder="All stores" {...rMargin('bookstore_id')} />
            <Input label="Min Price" type="number" {...rMargin('min_price')} />
          </div>
          <Input label="Max Price" type="number" {...rMargin('max_price')} />
        </form>
      </Modal>
    </div>
  )
}
