import { type MouseEvent, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ShoppingCart } from 'lucide-react'
import { OpenBook } from '@/components/ui/OpenBook'
import { FavoriteHeartButton } from '@/components/ui/FavoriteHeartButton'
import { useLanguage } from '@/context/LanguageContext'
import { cn, formatPrice } from '@/lib/utils'
import { flyToCart } from '@/lib/flyToCart'
import { openBookWithFlight, preloadBookPage } from '@/lib/bookFlight'
import type { Book } from '@/types'

// A 44px touch target around a smaller visible control: the pseudo-element is the extra reach.
const REACH = "before:absolute before:-inset-2 before:content-['']"

interface FavoriteBookCardProps {
  book: Book
  /** What the customer pays: the cheapest price that is in stock, else the cheapest there is. */
  price?: number
  /** In stock somewhere, so it can go in the cart. */
  available: boolean
  /** Playing its exit (the heart was tapped); the book leaves the list when it ends. */
  leaving?: boolean
  onRemove: (book: Book) => void
  onAddToCart: (book: Book) => void
}

/** One saved book, small enough for three across on a phone: the cover with its heart and cart buttons, then title and price. */
export function FavoriteBookCard({ book, price, available, leaving, onRemove, onAddToCart }: FavoriteBookCardProps) {
  const { t } = useTranslation()
  const { currency } = useLanguage()
  const navigate = useNavigate()
  const coverRef = useRef<HTMLDivElement>(null)
  const href = `/bookstore/books/${book.id}`

  // Opening the book: its cover flies to the book page (and back here with the back button).
  const bookLink = {
    to: href,
    onClick: (event: MouseEvent<HTMLAnchorElement>) => openBookWithFlight(event, { book, cover: coverRef.current, navigate }),
    onPointerEnter: preloadBookPage,
    onTouchStart: preloadBookPage,
  }

  function addToCart() {
    onAddToCart(book)
    flyToCart(coverRef.current, book.cover_image_url)
  }

  return (
    <article className={cn('group min-w-0 transition-all duration-200 ease-in', leaving && 'pointer-events-none scale-90 opacity-0')}>
      <div
        ref={coverRef}
        data-book-cover={book.id}
        className="relative aspect-[2/3] overflow-hidden rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 shadow-[0_8px_20px_-8px_rgba(30,58,95,0.45)] ring-1 ring-black/5 transition-transform duration-200 group-hover:-translate-y-0.5 dark:from-slate-800 dark:to-slate-700 dark:ring-white/10"
      >
        <Link {...bookLink} className="block h-full w-full">
          {book.cover_image_url ? (
            <img src={book.cover_image_url} alt={book.title} loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <OpenBook className="h-7 w-7 text-slate-400" />
            </div>
          )}
        </Link>

        {!available && (
          <div className="pointer-events-none absolute inset-0 flex items-end justify-center bg-gradient-to-t from-primary-950/75 via-primary-950/25 to-transparent pb-2">
            <span className="rounded-full bg-red-700 px-2 py-0.5 text-[10px] font-bold text-white">{t('book.outOfStock')}</span>
          </div>
        )}

        <FavoriteHeartButton
          favorite
          size="sm"
          onClick={() => onRemove(book)}
          className={cn('absolute right-1.5 top-1.5', REACH)}
        />

        {available && (
          <button
            type="button"
            onClick={addToCart}
            aria-label={`${t('book.addToCart')}: ${book.title}`}
            title={t('book.addToCart')}
            className={cn(
              'absolute bottom-1.5 right-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-accent-500 text-white shadow-lg shadow-black/30 transition hover:bg-accent-600 active:scale-90',
              REACH,
            )}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <Link {...bookLink} className="mt-2 block">
        <h3 className="line-clamp-2 text-xs font-semibold leading-snug text-gray-900 dark:text-gray-100 sm:text-[13px]">{book.title}</h3>
      </Link>
      {book.author && <p className="mt-0.5 truncate text-[11px] text-gray-500 dark:text-gray-400">{book.author}</p>}
      {price !== undefined && (
        <p className="mt-1 text-[13px] font-extrabold text-primary-700 dark:text-primary-300">{formatPrice(price, currency)}</p>
      )}
    </article>
  )
}
