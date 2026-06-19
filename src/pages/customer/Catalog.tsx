import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Book, Category, SearchFilters } from '@/types'
import { BookCard } from '@/components/ui/BookCard'
import { BrowseSidebar } from '@/components/ui/BrowseSidebar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Pagination } from '@/components/ui/Pagination'
import { useCart } from '@/context/CartContext'
import { useToast } from '@/components/ui/Toast'

const PAGE_SIZE = 18

export function Catalog() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { addItem } = useCart()
  const { success } = useToast()

  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<SearchFilters>({
    query: searchParams.get('q') ?? '',
    category_id: searchParams.get('category') ?? '',
    language: searchParams.get('language') ?? '',
  })
  const [sort, setSort] = useState('newest')

  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      query: searchParams.get('q') ?? '',
      category_id: searchParams.get('category') ?? '',
      language: searchParams.get('language') ?? '',
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

  const { data: availableLanguages = [] } = useQuery({
    queryKey: ['books', 'languages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select('language')
        .eq('is_active', true)
        .not('language', 'is', null)

      if (error) throw error

      const preferredOrder = ['Lao', 'English', 'Thai']
      return [...new Set(
        (data ?? [])
          .map(book => book.language?.trim())
          .filter((language): language is string => !!language),
      )].sort((a, b) => {
        const aIndex = preferredOrder.indexOf(a)
        const bIndex = preferredOrder.indexOf(b)
        if (aIndex !== -1 || bIndex !== -1) {
          if (aIndex === -1) return 1
          if (bIndex === -1) return -1
          return aIndex - bIndex
        }
        return a.localeCompare(b)
      })
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

      if (sort === 'title') query = query.order('title', { ascending: true })
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
    if (next.language) params.set('language', next.language)
    setSearchParams(params)
  }

  function clearFilters() {
    setFilters({ query: '', category_id: '', language: '' })
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
      bookstore_price: price.bookstore_price,
      margin_percent: price.margin_percent,
    })
    success(book.title)
  }

  const hasFilters = !!(filters.query || filters.category_id || filters.language)

  return (
    <div className="-mt-4 grid min-h-[calc(100vh-7rem)] grid-cols-1 bg-white lg:-mx-4 lg:grid-cols-[176px_minmax(0,1fr)]">
      <BrowseSidebar
        categories={categories}
        activeCategoryId={filters.category_id}
        onSelectCategory={categoryId => applyFilters({ category_id: categoryId })}
        onSelectQuickLink={value => setSort(value === 'newest' ? 'newest' : 'title')}
        showFilters
        availableLanguages={availableLanguages}
        activeLanguage={filters.language}
        onSelectLanguage={language => applyFilters({ language })}
        className="lg:sticky lg:top-16"
      />

      <div className="min-w-0 px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center">
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-accent-600">{t('catalog.title')}</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={filters.query ?? ''}
                onChange={e => applyFilters({ query: e.target.value })}
                placeholder={t('home.searchPlaceholder')}
                className="h-11 w-full border border-slate-200 bg-white pl-9 pr-10 text-sm text-slate-800 placeholder:text-slate-400 focus:border-accent-500 focus:outline-none"
              />
              {filters.query && (
                <button
                  onClick={() => applyFilters({ query: '' })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700"
                  aria-label={t('catalog.clearSearch')}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="h-10 px-3 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-900"
              >
                {t('catalog.clearFilters')}
              </button>
            )}
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="h-10 border border-slate-200 bg-white px-3 text-sm text-slate-600 focus:border-accent-500 focus:outline-none"
            >
              <option value="newest">{t('catalog.sortOptions.newest')}</option>
              <option value="title">{t('catalog.sortTitle')}</option>
            </select>
          </div>
        </div>

        {data && (
          <p className="mb-4 text-xs text-slate-500">
            {t('catalog.showing').replace('{{count}}', String(data.count))}
          </p>
        )}

        {isLoading ? (
          <div className="flex justify-center py-16"><LoadingSpinner /></div>
        ) : data?.data.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <p className="text-sm">{t('catalog.noResults')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {data?.data.map(book => (
              <BookCard key={book.id} book={book} onAddToCart={handleAddToCart} compact />
            ))}
          </div>
        )}

        {data && data.count > PAGE_SIZE && (
          <div className="mt-8">
            <Pagination page={page} pageSize={PAGE_SIZE} total={data.count} onChange={setPage} />
          </div>
        )}
      </div>
    </div>
  )
}
