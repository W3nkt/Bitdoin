import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BookOpen, ShoppingCart } from 'lucide-react'
import type { Book, BookPrice } from '@/types'
import type { BittyBook } from '@/lib/bittyChat'
import { supabase } from '@/lib/supabase'
import { useCart } from '@/context/CartContext'
import { useLanguage } from '@/context/LanguageContext'
import { useToast } from '@/components/ui/Toast'
import { formatPrice } from '@/lib/utils'

// Same rule as the book page: customers get the cheapest AVAILABLE price.
function bestPrice(prices: BookPrice[]): BookPrice | undefined {
  return prices
    .filter(price => price.availability === 'AVAILABLE')
    .sort((a, b) => a.final_price - b.final_price)[0]
}

interface BittyBookItemProps {
  book: BittyBook
  onOpenDetails: () => void
}

/** One recommended book, shown as a bullet with a book icon and its actions underneath. */
export function BittyBookItem({ book, onOpenDetails }: BittyBookItemProps) {
  const { t } = useTranslation()
  const { currency } = useLanguage()
  const { addItem } = useCart()
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const detailsUrl = `/bookstore/books/${book.id}`

  async function handleAddToCart() {
    setAdding(true)
    try {
      // Prices can change after Bitty answers, so read the live price before adding.
      const { data } = await supabase
        .from('books')
        .select('*, category:categories(*), prices:book_prices(*, bookstore:bookstores(*))')
        .eq('id', book.id)
        .single()
      const fullBook = data as Book | null
      const price = fullBook ? bestPrice(fullBook.prices ?? []) : undefined
      if (!fullBook || !price) {
        toast.error(t('bitty.outOfStock'))
        return
      }
      addItem({
        id: `${fullBook.id}-${price.bookstore_id}`,
        book_id: fullBook.id,
        bookstore_id: price.bookstore_id,
        quantity: 1,
        book: fullBook,
        bookstore: price.bookstore,
        unit_price: price.final_price,
        bookstore_price: price.bookstore_price,
        margin_percent: price.margin_percent,
      })
      toast.success(`${t('bitty.added')}: ${fullBook.title}`)
    } catch {
      toast.error(t('bitty.errors.network'))
    } finally {
      setAdding(false)
    }
  }

  return (
    <li className="flex gap-2 py-2.5 first:pt-0 last:pb-0 sm:gap-3 sm:py-3">
      <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-700 sm:h-8 sm:w-8" aria-hidden="true">
        <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </span>

      <div className="min-w-0 flex-1">
        <Link
          to={detailsUrl}
          onClick={onOpenDetails}
          className="text-[13px] font-semibold leading-snug text-gray-900 sm:text-sm hover:text-primary-700 hover:underline"
        >
          {book.title}
        </Link>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-gray-500 sm:text-xs">
          {book.author && <span className="truncate">{book.author}</span>}
          <span className="font-bold text-primary-700">
            {book.price != null ? formatPrice(book.price, currency) : t('bitty.noPrice')}
          </span>
          {!book.available && (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">
              {t('bitty.outOfStock')}
            </span>
          )}
        </p>
        {book.reason && <p className="mt-1 text-[11px] leading-relaxed text-gray-600 sm:text-xs">{book.reason}</p>}

        <div className="mt-1.5 flex flex-wrap gap-1.5 sm:mt-2">
          {book.available && (
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={adding}
              className="flex items-center gap-1 rounded-lg bg-accent-500 px-2 py-1 text-[11px] font-semibold sm:px-2.5 sm:text-xs text-white transition-colors hover:bg-accent-600 disabled:opacity-60"
            >
              <ShoppingCart className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              {t('bitty.addToCart')}
            </button>
          )}
          <Link
            to={detailsUrl}
            onClick={onOpenDetails}
            className="rounded-lg border border-primary-700 px-2 py-1 text-[11px] font-semibold sm:px-2.5 sm:text-xs text-primary-700 transition-colors hover:bg-primary-50"
          >
            {t('bitty.details')}
          </Link>
        </div>
      </div>
    </li>
  )
}
