import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Heart } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Book, BookPrice } from '@/types'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'
import { useToast } from '@/components/ui/Toast'
import { BookCard } from '@/components/ui/BookCard'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { FavoriteHeartButton } from '@/components/ui/FavoriteHeartButton'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

// Same rule as the book page: customers get the cheapest AVAILABLE price.
function bestPrice(prices: BookPrice[] = []): BookPrice | undefined {
  return prices
    .filter(price => price.availability === 'AVAILABLE')
    .sort((a, b) => a.final_price - b.final_price)[0]
}

/** Books the signed-in customer saved with the heart on a book page. */
export function Favorites() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { supabaseUser, loading: authLoading } = useAuth()
  const { addItem } = useCart()
  const { success, error: showError } = useToast()
  const queryClient = useQueryClient()
  const userId = supabaseUser?.id
  // Shares the 'book-favorite' prefix with useBookFavorite, so hearts and this list stay in sync.
  const queryKey = ['book-favorite', userId, 'list']

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
    queryClient.setQueryData<Book[]>(queryKey, current => current?.filter(b => b.id !== book.id))
    const { error } = await supabase.from('book_favorites').delete().eq('book_id', book.id)
    if (error) showError(t('common.error'))
    else success(t('book.removedFromFavorites'))
    queryClient.invalidateQueries({ queryKey: ['book-favorite', userId] })
  }

  if (authLoading || (userId && isLoading)) {
    return <div className="flex justify-center py-20"><LoadingSpinner /></div>
  }

  if (!userId) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <Heart className="h-16 w-16 text-gray-300 dark:text-gray-600" />
        <p className="text-gray-500 dark:text-gray-400">{t('favorites.signInHint')}</p>
        <Button onClick={() => navigate('/auth', { state: { from: '/bookstore/favorites' } })}>{t('nav.signIn')}</Button>
      </div>
    )
  }

  if (books.length === 0) {
    return (
      <EmptyState
        icon={<Heart className="h-16 w-16" />}
        title={t('favorites.empty')}
        description={t('favorites.emptyHint')}
        action={{ label: t('favorites.browse'), onClick: () => navigate('/bookstore/books') }}
      />
    )
  }

  return (
    <div className="space-y-4 pb-8">
      <div>
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('favorites.title')}</h1>
        <p className="text-xs text-gray-400">{t('favorites.count').replace('{{count}}', String(books.length))}</p>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {books.map(book => (
          <div key={book.id} className="relative">
            <BookCard book={book} onAddToCart={handleAddToCart} compact className="h-full" />
            <FavoriteHeartButton favorite onClick={() => handleRemove(book)} className="absolute right-3.5 top-3.5" />
          </div>
        ))}
      </div>
    </div>
  )
}
