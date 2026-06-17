import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Search, ArrowRight, BookOpen } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Book, Category } from '@/types'
import { BookCard } from '@/components/ui/BookCard'
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
      const { data } = await supabase
        .from('books')
        .select('*, category:categories(*), prices:book_prices(*, bookstore:bookstores(name))')
        .eq('is_active', true)
        .limit(8)
      return (data ?? []) as Book[]
    },
  })

  const { data: trendingBooks, isLoading: loadingTrending } = useQuery({
    queryKey: ['books', 'trending'],
    queryFn: async () => {
      const { data } = await supabase
        .from('books')
        .select('*, category:categories(*), prices:book_prices(final_price, availability)')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(8)
      return (data ?? []) as Book[]
    },
  })

  function handleSearch(e: React.FormEvent) {
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
    })
    success(t('book.addToCart') + ': ' + book.title)
  }

  return (
    <div className="space-y-8 pb-4">
      {/* Hero */}
      <section className="rounded-3xl bg-gradient-to-br from-primary-700 to-primary-900 px-6 py-10 text-white">
        <h1 className="text-2xl font-bold leading-tight">{t('home.hero')}</h1>
        <p className="mt-2 text-sm text-primary-200">{t('home.heroSub')}</p>

        <form onSubmit={handleSearch} className="mt-5 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('home.searchPlaceholder')}
              className="w-full rounded-xl border-0 bg-white py-3 pl-9 pr-4 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-400"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-accent-500 px-5 py-3 text-sm font-semibold text-white hover:bg-accent-600 transition-colors"
          >
            {t('common.search')}
          </button>
        </form>
      </section>

      {/* Categories */}
      {categories && categories.length > 0 && (
        <section>
          <SectionHeader title={t('home.categories')} onViewAll={() => navigate('/books')} />
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => navigate(`/books?category=${cat.id}`)}
                className="flex-shrink-0 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm hover:border-primary-400 hover:text-primary-700 transition-colors"
              >
                {cat.name_en}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Featured Books */}
      <section>
        <SectionHeader title={t('home.featured')} onViewAll={() => navigate('/books')} />
        {loadingFeatured ? (
          <LoadingSpinner />
        ) : (
          <BookGrid books={featuredBooks ?? []} onAddToCart={handleAddToCart} />
        )}
      </section>

      {/* Trending */}
      <section>
        <SectionHeader title={t('home.trending')} onViewAll={() => navigate('/books')} />
        {loadingTrending ? (
          <LoadingSpinner />
        ) : (
          <BookGrid books={trendingBooks ?? []} onAddToCart={handleAddToCart} />
        )}
      </section>
    </div>
  )
}

function SectionHeader({ title, onViewAll }: { title: string; onViewAll: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-base font-bold text-gray-900">{title}</h2>
      <button
        onClick={onViewAll}
        className="flex items-center gap-1 text-xs text-primary-700 font-medium hover:underline"
      >
        {t('home.viewAll')} <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  )
}

function BookGrid({ books, onAddToCart }: { books: Book[]; onAddToCart: (b: Book) => void }) {
  if (books.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        <BookOpen className="h-12 w-12" />
      </div>
    )
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {books.map(book => (
        <BookCard key={book.id} book={book} onAddToCart={onAddToCart} />
      ))}
    </div>
  )
}
