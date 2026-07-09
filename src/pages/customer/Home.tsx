import { type FormEvent, type ReactNode, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Search, Sparkles, TrendingUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Book, Category } from '@/types'
import { BookCard } from '@/components/ui/BookCard'
import { BrowseSidebar } from '@/components/ui/BrowseSidebar'
import { QuoteCarousel } from '@/components/ui/QuoteCarousel'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useCart } from '@/context/CartContext'
import { useToast } from '@/components/ui/Toast'

export function Home() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const { addItem } = useCart()
  const { success } = useToast()

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('*').order('name_en')
      return (data ?? []) as Category[]
    },
  })

  const { data: featuredBooks, isLoading: loadingFeatured } = useQuery({
    queryKey: ['books', 'featured'],
    queryFn: async () => {
      const { data: ranking, error: rankingError } = await supabase
        .rpc('get_featured_book_ranking', { p_limit: 12 })
      if (rankingError) throw rankingError

      const rankedIds = ((ranking ?? []) as Array<{ book_id: string }>).map(row => row.book_id)
      if (rankedIds.length === 0) return []

      const { data, error: booksError } = await supabase
        .from('books')
        .select('*, category:categories(*), prices:book_prices(*, bookstore:bookstores(name))')
        .in('id', rankedIds)
      if (booksError) throw booksError

      const booksById = new Map((data ?? []).map(book => [book.id, book as Book]))
      return rankedIds.flatMap(id => {
        const book = booksById.get(id)
        return book ? [book] : []
      })
    },
  })

  const { data: trendingBooks, isLoading: loadingTrending } = useQuery({
    queryKey: ['books', 'trending'],
    queryFn: async () => {
      const { data } = await supabase
        .from('books')
        .select('*, category:categories(*), prices:book_prices(*, bookstore:bookstores(name))')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(12)
      return (data ?? []) as Book[]
    },
  })

  function handleSearch(e: FormEvent) {
    e.preventDefault()
    if (searchQuery.trim()) navigate(`/books?q=${encodeURIComponent(searchQuery.trim())}`)
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
    success(t('book.addToCart') + ': ' + book.title)
  }

  return (
    <div className="-mt-4 grid min-h-[calc(100vh-7rem)] grid-cols-1 bg-white lg:-mx-4 lg:grid-cols-[176px_minmax(0,1fr)]">
      <BrowseSidebar
        categories={categories}
        onSelectCategory={categoryId => navigate(categoryId ? `/books?category=${categoryId}` : '/books')}
        onSelectQuickLink={() => navigate('/books')}
        className="lg:sticky lg:top-16"
      />

      <div className="min-w-0 px-4 py-5 sm:px-6 lg:px-8">

        {/* ── Quote Carousels — 1 on mobile, 2 side-by-side on sm+ ── */}
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <QuoteCarousel slot={0} targetCount={6} autoPlayMs={5500} />
          <QuoteCarousel slot={1} targetCount={6} autoPlayMs={7000} className="hidden sm:block" />
        </div>

        {/* ── Hero / Search ── */}
        <section className="mb-7">
          <div className="rounded-2xl bg-[#fff3ee] p-4 sm:p-5">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-accent-600">{t('tagline')}</p>
            <h1 className="max-w-2xl text-xl font-extrabold leading-tight text-slate-900 sm:text-2xl">
              {t('home.hero')}
            </h1>
            <p className="mt-1 text-sm text-slate-600">{t('home.heroSub')}</p>

            <form onSubmit={handleSearch} className="mt-5 flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t('home.searchPlaceholder')}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-accent-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="hidden h-11 flex-shrink-0 items-center justify-center rounded-xl bg-accent-500 px-5 text-sm font-bold text-white transition-colors hover:bg-accent-600 sm:flex"
              >
                {t('common.search')}
              </button>
            </form>
          </div>
        </section>

        {/* ── Featured books ── */}
        <section>
          <SectionHeader
            icon={<Sparkles className="h-4 w-4 text-accent-500" />}
            title={t('home.featured')}
            onViewAll={() => navigate('/books')}
          />
          {loadingFeatured ? (
            <div className="flex justify-center py-10"><LoadingSpinner /></div>
          ) : (
            <BookGrid books={featuredBooks ?? []} onAddToCart={handleAddToCart} />
          )}
        </section>

        {/* ── Trending books ── */}
        <section className="mt-9">
          <SectionHeader
            icon={<TrendingUp className="h-4 w-4 text-primary-700" />}
            title={t('home.trending')}
            onViewAll={() => navigate('/books')}
          />
          {loadingTrending ? (
            <div className="flex justify-center py-10"><LoadingSpinner /></div>
          ) : (
            <BookGrid books={trendingBooks ?? []} onAddToCart={handleAddToCart} />
          )}
        </section>
      </div>
    </div>
  )
}

function SectionHeader({
  icon,
  title,
  onViewAll,
}: {
  icon: ReactNode
  title: string
  onViewAll: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-2">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">{title}</h2>
      </div>
      <button
        onClick={onViewAll}
        className="flex items-center gap-1 text-xs font-semibold text-primary-700 transition-colors hover:text-primary-800"
      >
        {t('home.viewAll')}
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function BookGrid({ books, onAddToCart }: { books: Book[]; onAddToCart: (b: Book) => void }) {
  const { t } = useTranslation()

  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-14 text-slate-400">
        <Search className="h-8 w-8 text-slate-300" />
        <p className="text-sm">{t('home.emptyBooks')}</p>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {books.map(book => (
        <BookCard key={book.id} book={book} onAddToCart={onAddToCart} compact />
      ))}
    </div>
  )
}
