import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ShoppingCart } from 'lucide-react'
import { OpenBook } from '@/components/ui/OpenBook'
import type { Book, BookPrice } from '@/types'
import type { BittyBook } from '@/lib/bittyChat'
import { supabase } from '@/lib/supabase'
import { useCart } from '@/context/CartContext'
import { useLanguage } from '@/context/LanguageContext'
import { useToast } from '@/components/ui/Toast'
import { formatPrice } from '@/lib/utils'
import { flyToCart } from '@/lib/flyToCart'

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

/** One recommended book: its cover beside the title, price and reason, with its actions underneath. */
export function BittyBookItem({ book, onOpenDetails }: BittyBookItemProps) {
  const { t } = useTranslation()
  const { currency } = useLanguage()
  const { addItem } = useCart()
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  // A cover that fails to load falls back to the book icon.
  const [coverFailed, setCoverFailed] = useState(false)
  const coverRef = useRef<HTMLAnchorElement>(null)
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
      // Same feedback as Add to Cart on the storefront: the cover flies into the cart icon.
      flyToCart(coverRef.current, fullBook.cover_image_url ?? book.coverImageUrl)
      toast.success(`${t('bitty.added')}: ${fullBook.title}`)
    } catch {
      toast.error(t('bitty.errors.network'))
    } finally {
      setAdding(false)
    }
  }

  return (
    <li className="flex gap-2.5 py-2.5 first:pt-0 last:pb-0 sm:gap-3 sm:py-3">
      {/* The cover is what a customer judges a book by, so it leads the card; tapping it opens the book. */}
      <Link
        ref={coverRef}
        to={detailsUrl}
        onClick={onOpenDetails}
        tabIndex={-1}
        aria-hidden="true"
        className="flex h-24 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-md bg-gradient-to-br from-slate-100 dark:from-slate-800 to-slate-200 dark:to-slate-700 text-slate-400 shadow-sm ring-1 ring-black/10 dark:ring-white/10"
      >
        {book.coverImageUrl && !coverFailed ? (
          <img
            src={book.coverImageUrl}
            alt=""
            loading="lazy"
            onError={() => setCoverFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <OpenBook className="h-6 w-6" />
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <Link
          to={detailsUrl}
          onClick={onOpenDetails}
          className="text-[13px] font-semibold leading-snug text-gray-900 dark:text-gray-100 sm:text-sm hover:text-primary-700 dark:hover:text-primary-300 hover:underline"
        >
          {book.title}
        </Link>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-gray-500 dark:text-gray-400 sm:text-xs">
          {book.author && <span className="truncate">{book.author}</span>}
          <span className="font-bold text-primary-700 dark:text-primary-300">
            {book.price != null ? formatPrice(book.price, currency) : t('bitty.noPrice')}
          </span>
          {!book.available && (
            <span className="rounded-full bg-red-50 dark:bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-600 dark:text-red-400">
              {t('bitty.outOfStock')}
            </span>
          )}
        </p>
        {book.reason && <p className="mt-1 text-[11px] leading-relaxed text-gray-600 dark:text-gray-300 sm:text-xs">{book.reason}</p>}

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
            className="rounded-lg border border-primary-700 dark:border-primary-400 px-2 py-1 text-[11px] font-semibold sm:px-2.5 sm:text-xs text-primary-700 dark:text-primary-300 transition-colors hover:bg-primary-50 dark:hover:bg-primary-900/40"
          >
            {t('bitty.details')}
          </Link>
        </div>
      </div>
    </li>
  )
}
