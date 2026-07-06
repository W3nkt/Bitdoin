import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  BookOpen,
  Calculator,
  Edit2,
  Plus,
  Search,
  Tag,
  Trash2,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { supabase } from '@/lib/supabase'
import { logAudit } from '@/lib/audit'
import type { BookPrice, MarginRule } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useToast } from '@/components/ui/Toast'
import { useLanguage } from '@/context/LanguageContext'
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

type PriceSortKey = 'book' | 'store' | 'storePrice' | 'margin' | 'finalPrice' | 'stock'
type SortDirection = 'asc' | 'desc'

export function AdminPricing() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { success, error } = useToast()
  const { language, currency } = useLanguage()

  const [tab, setTab] = useState<'prices' | 'rules'>('prices')
  const [priceModal, setPriceModal] = useState(false)
  const [editPrice, setEditPrice] = useState<BookPrice | null>(null)
  const [marginModal, setMarginModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<PriceSortKey>('book')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [deletePrice, setDeletePrice] = useState<BookPrice | null>(null)
  const [deleting, setDeleting] = useState(false)

  const { register: rPrice, handleSubmit: hsPrice, reset: resetPrice, watch: watchPrice } = useForm<PriceForm>()
  const { register: rMargin, handleSubmit: hsMargin, reset: resetMargin } = useForm<MarginForm>()

  const bookstorePrice = watchPrice('bookstore_price')
  const marginPercent = watchPrice('margin_percent')
  const watchedBookId = watchPrice('book_id')
  const livePrice = bookstorePrice && marginPercent
    ? calcFinalPrice(parseFloat(bookstorePrice), parseFloat(marginPercent))
    : null

  const { data: prices, isLoading } = useQuery({
    queryKey: ['admin', 'prices'],
    queryFn: async () => {
      const { data } = await supabase
        .from('book_prices')
        .select('*, book:books(title, cover_image_url), bookstore:bookstores(name)')
        .order('updated_at', { ascending: false })
      return (data ?? []) as BookPrice[]
    },
  })

  const { data: books } = useQuery({
    queryKey: ['admin', 'books-list'],
    queryFn: async () => {
      const { data } = await supabase.from('books').select('id, title, cover_image_url').eq('is_active', true).order('title')
      return (data ?? []) as { id: string; title: string; cover_image_url?: string }[]
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
        await logAudit({
          entity: 'book_price',
          entityId: editPrice.id,
          action: 'BOOK_PRICE_UPDATED',
          oldValue: { bookstore_price: editPrice.bookstore_price, margin_percent: editPrice.margin_percent, availability: editPrice.availability },
          newValue: { bookstore_price: bPrice, margin_percent: margin, final_price: final, availability: form.availability },
        })
        success('Price updated')
      } else {
        const { data: upserted } = await supabase
          .from('book_prices')
          .upsert(payload, { onConflict: 'book_id,bookstore_id' })
          .select('id')
          .single()
        await logAudit({
          entity: 'book_price',
          entityId: upserted?.id,
          action: 'BOOK_PRICE_CREATED',
          newValue: { book_id: form.book_id, bookstore_id: form.bookstore_id, bookstore_price: bPrice, margin_percent: margin, final_price: final, availability: form.availability },
        })
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
      const { data: created } = await supabase.from('margin_rules').insert({
        name: form.name,
        category_id: form.category_id || null,
        bookstore_id: form.bookstore_id || null,
        min_price: form.min_price ? parseFloat(form.min_price) : null,
        max_price: form.max_price ? parseFloat(form.max_price) : null,
        margin_percent: parseFloat(form.margin_percent),
        priority: parseInt(form.priority) || 100,
      }).select('id').single()
      await logAudit({
        entity: 'margin_rule',
        entityId: created?.id,
        action: 'MARGIN_RULE_CREATED',
        newValue: { name: form.name, margin_percent: parseFloat(form.margin_percent), priority: parseInt(form.priority) || 100 },
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

  function handleSort(key: PriceSortKey) {
    if (sortKey === key) {
      setSortDirection(current => current === 'asc' ? 'desc' : 'asc')
      return
    }
    setSortKey(key)
    setSortDirection('asc')
  }

  async function handleDeletePrice() {
    if (!deletePrice) return
    setDeleting(true)
    try {
      const { error: deleteError } = await supabase
        .from('book_prices')
        .delete()
        .eq('id', deletePrice.id)
      if (deleteError) throw deleteError

      const { data: remainingPrices, error: remainingError } = await supabase
        .from('book_prices')
        .select('id')
        .eq('book_id', deletePrice.book_id)
        .limit(1)
      if (remainingError) throw remainingError

      const movedToIntake = (remainingPrices?.length ?? 0) === 0
      if (movedToIntake) {
        const { error: bookError } = await supabase
          .from('books')
          .update({ is_active: false })
          .eq('id', deletePrice.book_id)
        if (bookError) throw bookError
      }

      await logAudit({
        entity: 'book_price',
        entityId: deletePrice.id,
        action: 'BOOK_PRICE_DELETED',
        oldValue: {
          book_id: deletePrice.book_id,
          bookstore_id: deletePrice.bookstore_id,
          bookstore_price: deletePrice.bookstore_price,
          margin_percent: deletePrice.margin_percent,
          final_price: deletePrice.final_price,
        },
        newValue: movedToIntake ? { book_id: deletePrice.book_id, moved_to_book_intake: true } : undefined,
      })

      await qc.invalidateQueries({ queryKey: ['admin', 'prices'] })
      await qc.invalidateQueries({ queryKey: ['admin', 'books-list'] })
      await qc.invalidateQueries({ queryKey: ['admin', 'book-intake'] })
      setDeletePrice(null)
      success(movedToIntake ? 'Price row deleted. Book moved to intake list.' : 'Price row deleted')
    } catch {
      error(t('common.error'))
    } finally {
      setDeleting(false)
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
  const bookCoverMap = useMemo(() => {
    const map = new Map<string, string | undefined>()
    books?.forEach(b => map.set(b.id, b.cover_image_url))
    if (editPrice?.book_id) map.set(editPrice.book_id, (editPrice.book as { cover_image_url?: string } | undefined)?.cover_image_url)
    return map
  }, [books, editPrice])
  const selectedBookCover = bookCoverMap.get(watchedBookId)
  const visiblePrices = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase()
    const filtered = (prices ?? []).filter(price => {
      const bookTitle = (price.book as { title?: string } | undefined)?.title ?? ''
      const storeName = (price.bookstore as { name?: string } | undefined)?.name ?? ''
      return !query || [
        bookTitle,
        storeName,
        price.availability,
        String(price.bookstore_price),
        String(price.margin_percent),
        String(price.final_price),
      ].some(value => value.toLocaleLowerCase().includes(query))
    })

    return [...filtered].sort((a, b) => {
      const bookA = (a.book as { title?: string } | undefined)?.title ?? ''
      const bookB = (b.book as { title?: string } | undefined)?.title ?? ''
      const storeA = (a.bookstore as { name?: string } | undefined)?.name ?? ''
      const storeB = (b.bookstore as { name?: string } | undefined)?.name ?? ''
      const values: Record<PriceSortKey, [string | number, string | number]> = {
        book: [bookA, bookB],
        store: [storeA, storeB],
        storePrice: [a.bookstore_price, b.bookstore_price],
        margin: [a.margin_percent, b.margin_percent],
        finalPrice: [a.final_price, b.final_price],
        stock: [a.availability, b.availability],
      }
      const [left, right] = values[sortKey]
      const result = typeof left === 'number' && typeof right === 'number'
        ? left - right
        : String(left).localeCompare(String(right), language)
      return sortDirection === 'asc' ? result : -result
    })
  }, [language, prices, searchQuery, sortDirection, sortKey])

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('admin.pricing')}</h1>
          <p className="text-sm text-gray-400 mt-0.5">Book prices and margin rules</p>
        </div>
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

      {/* Pill-style tab switcher */}
      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 w-fit">
        {(['prices', 'rules'] as const).map(t2 => (
          <button
            key={t2}
            onClick={() => setTab(t2)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === t2
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t2 === 'prices' ? 'Book Prices' : 'Margin Rules'}
          </button>
        ))}
      </div>

      {tab === 'prices' && (
        isLoading ? <LoadingSpinner /> : (
          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            <div className="flex flex-col gap-2 border-b border-gray-100 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="w-full sm:max-w-sm">
                <Input
                  type="search"
                  value={searchQuery}
                  onChange={event => setSearchQuery(event.target.value)}
                  placeholder="Search book, store, price, or stock"
                  leftIcon={<Search className="h-4 w-4" />}
                  aria-label="Search book prices"
                />
              </div>
              <p className="text-xs text-gray-400">
                {visiblePrices.length} of {prices?.length ?? 0} rows
              </p>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80 border-b border-gray-100">
                <tr>
                  <SortableHeader label="Book" sortValue="book" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Store" sortValue="store" activeKey={sortKey} direction={sortDirection} onSort={handleSort} className="hidden md:table-cell" />
                  <SortableHeader label="Store Price" sortValue="storePrice" activeKey={sortKey} direction={sortDirection} onSort={handleSort} align="right" />
                  <SortableHeader label="Margin" sortValue="margin" activeKey={sortKey} direction={sortDirection} onSort={handleSort} align="right" />
                  <SortableHeader label="Final Price" sortValue="finalPrice" activeKey={sortKey} direction={sortDirection} onSort={handleSort} align="right" />
                  <SortableHeader label="Stock" sortValue="stock" activeKey={sortKey} direction={sortDirection} onSort={handleSort} className="hidden lg:table-cell" />
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visiblePrices.map(price => (
                  <tr key={price.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 shadow-sm">
                          {(price.book as { cover_image_url?: string } | undefined)?.cover_image_url ? (
                            <img
                              src={(price.book as { cover_image_url?: string }).cover_image_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary-50">
                              <BookOpen className="h-4 w-4 text-primary-300" />
                            </div>
                          )}
                        </div>
                        <p className="font-medium text-gray-900 truncate max-w-xs text-xs">
                          {(price.book as { title?: string } | undefined)?.title ?? '—'}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-500">
                      {(price.bookstore as { name?: string } | undefined)?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-600">{formatPrice(price.bookstore_price, currency)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-primary-50 text-primary-700">
                        {price.margin_percent}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-bold text-primary-700">{formatPrice(price.final_price, currency)}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        price.availability === 'AVAILABLE' ? 'bg-green-100 text-green-700' :
                        price.availability === 'LOW_STOCK' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {price.availability}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
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
                          className="p-2 rounded-xl hover:bg-primary-50 text-gray-400 hover:text-primary-700 transition-colors"
                          title={t('common.edit')}
                          aria-label={t('common.edit')}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletePrice(price)}
                          className="p-2 rounded-xl text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          title={t('common.delete')}
                          aria-label={t('common.delete')}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {visiblePrices.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">
                      No price rows match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        )
      )}

      {tab === 'rules' && (
        <div className="space-y-3">
          {rules?.map(rule => (
            <div key={rule.id} className="bg-white rounded-2xl shadow-card p-5 flex items-center justify-between">
              <div className="flex items-start gap-3">
                {/* Priority badge */}
                <span className="inline-flex items-center rounded-xl bg-primary-50 px-2.5 py-1 text-xs font-bold text-primary-700 flex-shrink-0">
                  P{rule.priority}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-gray-400" />
                    <p className="font-semibold text-gray-800 text-sm">{rule.name}</p>
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-gray-500">
                    {rule.min_price && <span>Min: {formatPrice(rule.min_price, currency)}</span>}
                    {rule.max_price && <span>Max: {formatPrice(rule.max_price, currency)}</span>}
                    {!rule.min_price && !rule.max_price && <span className="text-gray-400">Applies to all price ranges</span>}
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-2xl font-bold text-primary-700">{rule.margin_percent}%</p>
                <p className="text-xs text-gray-400">margin</p>
              </div>
            </div>
          ))}
          {(!rules || rules.length === 0) && (
            <div className="text-center py-12 text-gray-400 text-sm bg-white rounded-2xl shadow-card">
              No margin rules yet. Add one to get started.
            </div>
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
          <div className="flex items-start gap-3">
            <div className="w-14 h-[74px] rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 shadow-sm">
              {selectedBookCover ? (
                <img src={selectedBookCover} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary-50">
                  <BookOpen className="h-5 w-5 text-primary-300" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <Select label="Book" required options={bookOptions} placeholder="Select book" {...rPrice('book_id', { required: true })} />
            </div>
          </div>
          <Select label="Bookstore" required options={storeOptions} placeholder="Select store" {...rPrice('bookstore_id', { required: true })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Bookstore Price (LAK)" type="number" required {...rPrice('bookstore_price', { required: true })} />
            <Input label="Margin %" type="number" step="0.1" required {...rPrice('margin_percent', { required: true })} />
          </div>
          {/* Live price calculator */}
          {livePrice && (
            <div className="flex items-center gap-3 rounded-2xl bg-primary-50 border border-primary-100 p-4">
              <Calculator className="h-4 w-4 text-primary-500 flex-shrink-0" />
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <span className="text-gray-500">Store Price</span>
                <span className="font-medium text-gray-700">{formatPrice(parseFloat(bookstorePrice), currency)}</span>
                <span className="text-gray-400">×</span>
                <span className="text-gray-500">(1 + {marginPercent}%)</span>
                <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
                <span className="font-bold text-primary-700 text-base">{formatPrice(livePrice, currency)}</span>
              </div>
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

      <Modal
        open={!!deletePrice}
        onClose={() => !deleting && setDeletePrice(null)}
        title="Delete Price Row"
        size="sm"
        footer={
          <>
            <Button variant="ghost" disabled={deleting} onClick={() => setDeletePrice(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" loading={deleting} onClick={handleDeletePrice}>
              {t('common.delete')}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-6 text-gray-600">
          Delete the price for <strong className="text-gray-900">
            {(deletePrice?.book as { title?: string } | undefined)?.title ?? 'this book'}
          </strong> at <strong className="text-gray-900">
            {(deletePrice?.bookstore as { name?: string } | undefined)?.name ?? 'this store'}
          </strong>? If this is the last price for the book, it will move back to the Book Intake list.
        </p>
      </Modal>
    </div>
  )
}

function SortableHeader({
  label,
  sortValue,
  activeKey,
  direction,
  onSort,
  align = 'left',
  className = '',
}: {
  label: string
  sortValue: PriceSortKey
  activeKey: PriceSortKey
  direction: SortDirection
  onSort: (key: PriceSortKey) => void
  align?: 'left' | 'right'
  className?: string
}) {
  const active = activeKey === sortValue
  const Icon = active ? direction === 'asc' ? ArrowUp : ArrowDown : ArrowUpDown

  return (
    <th className={`px-4 py-3 ${className}`}>
      <button
        type="button"
        onClick={() => onSort(sortValue)}
        className={`flex w-full items-center gap-1.5 text-xs font-semibold uppercase tracking-wide transition-colors hover:text-primary-700 ${
          active ? 'text-primary-700' : 'text-gray-500'
        } ${align === 'right' ? 'justify-end text-right' : 'justify-start text-left'}`}
        aria-label={`Sort by ${label}`}
      >
        <span>{label}</span>
        <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      </button>
    </th>
  )
}
