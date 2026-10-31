import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Heart } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Book, BookPrice } from '@/types'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'
import { useLanguage } from '@/context/LanguageContext'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { FavoritesSkeleton } from '@/components/ui/Skeleton'
import { FavoriteBookCard } from '@/components/book/FavoriteBookCard'
import { FavoritesHero } from '@/components/book/FavoritesHero'
import { cn } from '@/lib/utils'

// Same rule as the book page: customers get the cheapest AVAILABLE price.
function bestPrice(prices: BookPrice[] = []): BookPrice | undefined {
  return prices
    .filter(price => price.availability === 'AVAILABLE')
    .sort((a, b) => a.final_price - b.final_price)[0]
}

/** How long a removed book plays its exit before it leaves the list (FavoriteBookCard's transition). */
const EXIT_MS = 200

/** Books the signed-in customer saved with the heart on a book page. */
export function Favorites() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { language } = useLanguage()
  const { supabaseUser, profile, loading: authLoading } = useAuth()
  const { addItem } = useCart()
  const { success, error: showError } = useToast()
  const queryClient = useQueryClient()
  const userId = supabaseUser?.id
  // Shares the 'book-favorite' prefix with useBookFavorite, so hearts and this list stay in sync.
  const queryKey = ['book-favorite', userId, 'list']
  const [category, setCategory] = useState('all')
  const [leaving, setLeaving] = useState<string[]>([])

  const { data: books = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('book_favorites')
        .select('created_at, book:books(*, category:categories(*), prices:book_prices(*, bookstore:bookstores(*)))')
        .order('created_at', { ascending: false })
      if (error) throw error
      // Books that were taken off the store come back as null; leave them out.
      return (data ?? [])
        .map(row => (Array.isArray(row.book) ? row.book[0] : row.book) as Book | null)
        .filter((book): book is Book => !!book)
    },
    enabled: !!userId,
  })

  // The categories of the saved books, for the filter chips (only worth showing with two or more).
  const categories = useMemo(() => {
    const found = new Map<string, { name: string; count: number }>()
    for (const book of books) {
      if (!book.category_id || !book.category) continue
      const entry = found.get(book.category_id)
      if (entry) entry.count++
      else found.set(book.category_id, { name: language === 'lo' ? book.category.name_lo : book.category.name_en, count: 1 })
    }
    return [...found].map(([id, entry]) => ({ id, ...entry }))
  }, [books, language])
  // A category whose last book was just removed is no longer a filter.
  const activeCategory = categories.some(entry => entry.id === category) ? category : 'all'
  const shown = activeCategory === 'all' ? books : books.filter(book => book.category_id === activeCategory)

  const ready = books.map(book => bestPrice(book.prices)).filter((price): price is BookPrice => !!price)
  const readyTotal = ready.reduce((sum, price) => sum + price.final_price, 0)
  const firstName = profile?.name?.trim().split(/\s+/)[0]

  function handleAddToCart(book: Book) {
    const price = bestPrice(book.prices)
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

  async function handleRemove(book: Book) {
    if (leaving.includes(book.id)) return
    setLeaving(current => [...current, book.id])
    await new Promise(resolve => window.setTimeout(resolve, EXIT_MS))
    queryClient.setQueryData<Book[]>(queryKey, current => current?.filter(b => b.id !== book.id))
    setLeaving(current => current.filter(id => id !== book.id))
    const { error } = await supabase.from('book_favorites').delete().eq('book_id', book.id)
    if (error) showError(t('common.error'))
    else success(t('book.removedFromFavorites'))
    queryClient.invalidateQueries({ queryKey: ['book-favorite', userId] })
  }

  if (authLoading || (userId && isLoading)) return <FavoritesSkeleton />

  const hero = (
    <FavoritesHero name={firstName} books={books} readyCount={ready.length} readyTotal={readyTotal} />
  )

  if (!userId) {
    return (
      <div className="space-y-5 pb-8">
        {hero}
        <Invitation
          title={t('favorites.signInHint')}
          action={<Button onClick={() => navigate('/auth', { state: { from: '/bookstore/favorites' } })}>{t('nav.signIn')}</Button>}
        />
      </div>
    )
  }

  if (books.length === 0) {
    return (
      <div className="space-y-5 pb-8">
        {hero}
        <Invitation
          title={t('favorites.empty')}
          description={t('favorites.emptyHint')}
          action={<Button onClick={() => navigate('/bookstore/books')}>{t('favorites.browse')}</Button>}
        />
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-8">
      {hero}

      {categories.length > 1 && (
        <div role="group" aria-label={t('book.category')} className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5">
          <CategoryChip active={activeCategory === 'all'} onClick={() => setCategory('all')} label={t('favorites.all')} count={books.length} />
          {categories.map(entry => (
            <CategoryChip key={entry.id} active={activeCategory === entry.id} onClick={() => setCategory(entry.id)} label={entry.name} count={entry.count} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {shown.map(book => {
          const price = bestPrice(book.prices)
          return (
            <FavoriteBookCard
              key={book.id}
              book={book}
              price={price?.final_price ?? book.min_price ?? book.prices?.[0]?.final_price}
              available={!!price}
              leaving={leaving.includes(book.id)}
              onRemove={handleRemove}
              onAddToCart={handleAddToCart}
            />
          )
        })}
      </div>
    </div>
  )
}

function CategoryChip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition-colors',
        active
          ? 'border-primary-700 bg-primary-700 text-white dark:border-primary-500 dark:bg-primary-600'
          : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-primary-600',
      )}
    >
      {label}
      <span className={cn('text-[11px] font-bold tabular-nums', active ? 'text-white/70' : 'text-gray-400')}>{count}</span>
    </button>
  )
}

/** What shows under the header when there is nothing to list: signed out, or nothing saved yet. */
function Invitation({ title, description, action }: { title: string; description?: string; action: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-rose-200 bg-gradient-to-b from-rose-50 to-white px-6 py-10 text-center dark:border-rose-500/25 dark:from-rose-500/10 dark:to-gray-900/40">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-white shadow-lg shadow-rose-500/15 ring-1 ring-rose-100 dark:bg-gray-900 dark:ring-rose-500/25">
        <Heart className="h-8 w-8 fill-rose-400 text-rose-400" />
      </span>
      <p className="mt-4 text-base font-bold text-gray-900 dark:text-gray-100">{title}</p>
      {description && <p className="mt-1 max-w-xs text-sm text-gray-500 dark:text-gray-400">{description}</p>}
      <div className="mt-5">{action}</div>
    </div>
  )
}
