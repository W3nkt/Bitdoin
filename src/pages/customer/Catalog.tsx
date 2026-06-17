import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { SlidersHorizontal, X, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Book, Category, SearchFilters } from '@/types'
import { BookCard } from '@/components/ui/BookCard'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'
import { useCart } from '@/context/CartContext'
import { useToast } from '@/components/ui/Toast'

const PAGE_SIZE = 12

export function Catalog() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { addItem } = useCart()
  const { success } = useToast()

  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<SearchFilters>({
    query: searchParams.get('q') ?? '',
    category_id: searchParams.get('category') ?? '',
  })
  const [sort, setSort] = useState('newest')

  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      query: searchParams.get('q') ?? '',
      category_id: searchParams.get('category') ?? '',
    }))
    setPage(1)
  }, [searchParams])

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('*').order('name_en')
      return (data ?? []) as Category[]
    },
  })

  const { data, isLoading } = useQuery({
    queryKey: ['books', 'catalog', filters, sort, page],
    queryFn: async () => {
      let query = supabase
        .from('books')
        .select('*, category:categories(*), prices:book_prices(*, bookstore:bookstores(name))', { count: 'exact' })
        .eq('is_active', true)

      if (filters.query) {
        query = query.or(`title.ilike.%${filters.query}%,author.ilike.%${filters.query}%,isbn.eq.${filters.query}`)
      }
      if (filters.category_id) query = query.eq('category_id', filters.category_id)
      if (filters.language) query = query.eq('language', filters.language)
      if (filters.isbn) query = query.eq('isbn', filters.isbn)

      if (sort === 'newest') query = query.order('created_at', { ascending: false })
      else if (sort === 'priceAsc') query = query.order('id')
      else query = query.order('created_at', { ascending: false })

      const from = (page - 1) * PAGE_SIZE
      query = query.range(from, from + PAGE_SIZE - 1)

      const { data, count } = await query
      return { data: (data ?? []) as Book[], count: count ?? 0 }
    },
  })

  function applyFilters(updated: Partial<SearchFilters>) {
    const next = { ...filters, ...updated }
    setFilters(next)
    setPage(1)
    const params = new URLSearchParams()
    if (next.query) params.set('q', next.query)
    if (next.category_id) params.set('category', next.category_id)
    setSearchParams(params)
  }

  function clearFilters() {
    setFilters({ query: '', category_id: '' })
    setSearchParams({})
    setPage(1)
  }

  function handleAddToCart(book: Book) {
    const price = book.prices?.[0]
    if (!price) return
    addItem({
      id: `${book.id}-${price.bookstore_id}`,
      book_id: book.id,
      bookstore_id: price.bookstore_id,
      quantity: 1,
      book,
      bookstore: price.bookstore,
      unit_price: price.final_price,
    })
    success(book.title)
  }

  const hasFilters = !!(filters.query || filters.category_id || filters.language || filters.min_price)

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={filters.query ?? ''}
            onChange={e => applyFilters({ query: e.target.value })}
            placeholder={t('home.searchPlaceholder')}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
          {filters.query && (
            <button
              onClick={() => applyFilters({ query: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-600 hover:border-primary-400 transition-colors"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {t('catalog.filters')}
          {hasFilters && <span className="h-2 w-2 rounded-full bg-accent-500" />}
        </button>
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-600 focus:outline-none"
        >
          <option value="newest">{t('catalog.sortOptions.newest')}</option>
          <option value="priceAsc">{t('catalog.sortOptions.priceAsc')}</option>
          <option value="priceDesc">{t('catalog.sortOptions.priceDesc')}</option>
        </select>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Category</label>
            <div className="flex flex-wrap gap-2 mt-2">
              <button
                onClick={() => applyFilters({ category_id: '' })}
                className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  !filters.category_id ? 'bg-primary-700 text-white border-primary-700' : 'border-gray-200 text-gray-600'
                }`}
              >
                {t('common.all')}
              </button>
              {categories?.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => applyFilters({ category_id: cat.id })}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    filters.category_id === cat.id ? 'bg-primary-700 text-white border-primary-700' : 'border-gray-200 text-gray-600'
                  }`}
                >
                  {cat.name_en}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Min Price (LAK)"
              type="number"
              value={filters.min_price ?? ''}
              onChange={e => applyFilters({ min_price: e.target.value ? Number(e.target.value) : undefined })}
            />
            <Input
              label="Max Price (LAK)"
              type="number"
              value={filters.max_price ?? ''}
              onChange={e => applyFilters({ max_price: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4" /> {t('catalog.clearFilters')}
            </Button>
          )}
        </div>
      )}

      {/* Results count */}
      {data && (
        <p className="text-xs text-gray-500">
          {t('catalog.showing').replace('{{count}}', String(data.count))}
        </p>
      )}

      {/* Grid */}
      {isLoading ? (
        <LoadingSpinner />
      ) : data?.data.length === 0 ? (
        <div className="py-16 text-center text-gray-400">
          <p className="text-sm">{t('catalog.noResults')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {data?.data.map(book => (
            <BookCard key={book.id} book={book} onAddToCart={handleAddToCart} />
          ))}
        </div>
      )}

      {data && data.count > PAGE_SIZE && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={data.count} onChange={setPage} />
      )}
    </div>
  )
}
