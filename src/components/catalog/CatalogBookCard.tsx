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

export type CatalogView = 'list' | 'grid'

/** Layout of the book collection for each view; the loading skeleton uses the same classes. */
export const CATALOG_LAYOUT: Record<CatalogView, string> = {
  list: 'grid grid-cols-1 gap-4 md:grid-cols-2',
  grid: 'grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4',
}

/** The card itself: a border, rounded corners and a soft brand-colored glow that lifts on hover. */
export const CARD_CHROME = [
  'rounded-2xl border border-gray-200 bg-white p-2.5 transition-all duration-200',
  'shadow-[0_4px_22px_-4px_rgba(30,58,95,0.16)] hover:-translate-y-0.5 hover:shadow-[0_10px_32px_-6px_rgba(30,58,95,0.28)]',
  'dark:border-gray-800 dark:bg-gray-900 dark:shadow-[0_0_24px_rgba(107,138,255,0.08)] dark:hover:border-primary-500/40 dark:hover:shadow-[0_0_30px_rgba(107,138,255,0.2)]',
].join(' ')

// A 44px touch target around a smaller visible control: the pseudo-element is the extra reach.
const HEART_REACH = "relative before:absolute before:-inset-1.5 before:content-['']"

// Light orange, so it reads as the action without outweighing the price; fills solid on hover and press.
const ADD_BUTTON = [
  "relative flex shrink-0 items-center justify-center border border-accent-200 bg-accent-50 font-bold text-accent-700 transition-all before:absolute before:content-['']",
  'hover:border-accent-500 hover:bg-accent-500 hover:text-white active:scale-90',
  'dark:border-accent-500/30 dark:bg-accent-500/15 dark:text-accent-400 dark:hover:border-accent-500 dark:hover:bg-accent-500 dark:hover:text-gray-900',
].join(' ')

interface CatalogBookCardProps {
  book: Book
  view: CatalogView
  favorite: boolean
  onToggleFavorite: (book: Book) => void
  onAddToCart: (book: Book) => void
}

/** One book in the catalog: a detailed row (list view) or a cover-first card (grid view). */
export function CatalogBookCard({ book, view, favorite, onToggleFavorite, onAddToCart }: CatalogBookCardProps) {
  const { t } = useTranslation()
  const { language, currency } = useLanguage()
  const navigate = useNavigate()
  const coverRef = useRef<HTMLDivElement>(null)

  const price = book.min_price ?? book.prices?.[0]?.final_price
  const isAvailable = book.prices?.some(p => p.availability === 'AVAILABLE') ?? false
  const canBuy = isAvailable && price !== undefined
  const languageLabel = book.language === 'Lao' ? 'LAO' : book.language?.slice(0, 2).toUpperCase() ?? 'EN'
  const categoryName = book.category ? (language === 'lo' ? book.category.name_lo : book.category.name_en) : undefined
  const href = `/bookstore/books/${book.id}`
  const isList = view === 'list'

  function addToCart() {
    onAddToCart(book)
    flyToCart(coverRef.current, book.cover_image_url)
  }

  // Opening the book: its cover flies to the book page. Both links of the card do it.
  const bookLink = {
    to: href,
    onClick: (event: MouseEvent<HTMLAnchorElement>) => openBookWithFlight(event, { book, cover: coverRef.current, navigate }),
    onPointerEnter: preloadBookPage,
    onTouchStart: preloadBookPage,
  }

  const cover = (
    <div
      ref={coverRef}
      data-book-cover={book.id}
      className={cn(
        'relative aspect-[2/3] overflow-hidden rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700',
        isList && 'w-24 shrink-0 self-start',
      )}
    >
      <Link {...bookLink} tabIndex={isList ? -1 : undefined} aria-hidden={isList || undefined} className="block h-full w-full">
        {book.cover_image_url ? (
          <img src={book.cover_image_url} alt={isList ? '' : book.title} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <OpenBook className="h-8 w-8 text-slate-400" />
          </div>
        )}
      </Link>

      {/* In list view the language sits beside the category, so the cover stays clear. */}
      {!isList && (
        <span className="pointer-events-none absolute left-1.5 top-1.5 rounded-md bg-primary-900/80 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          {languageLabel}
        </span>
      )}

      {!isAvailable && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-primary-900/55">
          <span className="rounded-full bg-red-700 px-2.5 py-1 text-[11px] font-bold text-white">{t('book.outOfStock')}</span>
        </div>
      )}

      {!isList && (
        <FavoriteHeartButton
          favorite={favorite}
          onClick={() => onToggleFavorite(book)}
          className={cn(HEART_REACH, 'absolute right-1.5 top-1.5')}
        />
      )}
    </div>
  )

  if (!isList) {
    return (
      <article className={cn('flex min-w-0 flex-col', CARD_CHROME)}>
        {cover}
        <Link {...bookLink} className="mt-3 block px-0.5">
          <h3 className="line-clamp-2 min-h-9 text-[13px] font-semibold leading-snug text-gray-900 dark:text-gray-100">{book.title}</h3>
        </Link>
        {book.author && <p className="mt-0.5 truncate px-0.5 text-xs text-gray-500 dark:text-gray-400">{book.author}</p>}
        {/* Pinned to the card's bottom so prices line up across a row; smaller on phones, where two cards share 358px. */}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 px-0.5 pt-2.5">
          {price !== undefined && (
            <span className="text-sm font-extrabold text-primary-700 dark:text-primary-300 sm:text-[15px]">{formatPrice(price, currency)}</span>
          )}
          {canBuy && (
            <button
              type="button"
              onClick={addToCart}
              aria-label={`${t('book.addToCart')}: ${book.title}`}
              className={cn(ADD_BUTTON, 'ml-auto h-9 w-9 rounded-full before:-inset-1 sm:h-10 sm:w-10 sm:before:-inset-0.5')}
            >
              <ShoppingCart className="h-[18px] w-[18px]" />
            </button>
          )}
        </div>
      </article>
    )
  }

  return (
    <article className={cn('flex min-w-0 gap-3', CARD_CHROME)}>
      {cover}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-h-8 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            {categoryName && (
              <span className="truncate rounded-full bg-accent-50 px-2 py-0.5 text-[11px] font-bold text-accent-700 dark:bg-accent-500/15 dark:text-accent-400">
                {categoryName}
              </span>
            )}
            <span className="shrink-0 rounded-full bg-primary-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary-700 dark:bg-primary-500/15 dark:text-primary-300">
              {languageLabel}
            </span>
          </div>
          <FavoriteHeartButton
            favorite={favorite}
            onClick={() => onToggleFavorite(book)}
            className={cn(HEART_REACH, '-mr-1 shrink-0 bg-transparent shadow-none hover:scale-100 dark:bg-transparent')}
          />
        </div>
        <Link {...bookLink} className="mt-1 block">
          <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-gray-900 dark:text-gray-100">{book.title}</h3>
        </Link>
        {book.author && <p className="mt-0.5 truncate text-[13px] text-gray-500 dark:text-gray-400">{book.author}</p>}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 pt-2">
          {price !== undefined && (
            <span className="text-base font-extrabold text-primary-700 dark:text-primary-300">{formatPrice(price, currency)}</span>
          )}
          {canBuy && (
            <button
              type="button"
              onClick={addToCart}
              className={cn(ADD_BUTTON, 'ml-auto h-10 gap-1.5 rounded-full px-3.5 text-[13px] before:-inset-y-0.5 before:inset-x-0')}
            >
              <ShoppingCart className="h-4 w-4" />
              {t('catalog.add')}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
