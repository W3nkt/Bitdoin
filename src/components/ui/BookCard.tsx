import { BookOpen, ShoppingCart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Book } from '@/types'
import { useLanguage } from '@/context/LanguageContext'
import { cn, formatPrice } from '@/lib/utils'

interface BookCardProps {
  book: Book
  onAddToCart?: (book: Book) => void
  className?: string
  compact?: boolean
}

export function BookCard({ book, onAddToCart, className, compact = false }: BookCardProps) {
  const { t } = useTranslation()
  const { currency } = useLanguage()

  const lowestPrice = book.min_price ?? book.prices?.[0]?.final_price
  const isAvailable = book.prices?.some(p => p.availability === 'AVAILABLE') ?? false
  const languageLabel = book.language === 'Lao' ? 'LAO' : book.language?.slice(0, 2).toUpperCase() ?? 'EN'

  return (
    <div className={cn(
      'group flex flex-col border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',
      compact ? 'rounded-xl p-2' : 'rounded-2xl p-3',
      className,
    )}>
      <Link to={`/books/${book.id}`} className="flex flex-1 flex-col">
        <div
          className={cn(
            'relative aspect-[2/3] overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 transition-all duration-300',
            compact ? 'rounded-lg' : 'rounded-xl',
          )}
        >
          {book.cover_image_url ? (
            <img src={book.cover_image_url} alt={book.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <BookOpen className={cn('text-slate-400', compact ? 'h-7 w-7' : 'h-10 w-10')} />
            </div>
          )}

          <span
            className={cn(
              'absolute left-2 top-2 rounded bg-black/55 px-1.5 py-0.5 font-bold uppercase tracking-wide text-white backdrop-blur-sm',
              compact ? 'text-[8px]' : 'text-[9px]',
            )}
          >
            {languageLabel}
          </span>

          {!isAvailable && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[1px]">
              <span
                className={cn(
                  'rounded-full bg-red-500 font-semibold text-white shadow',
                  compact ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs',
                )}
              >
                {t('book.outOfStock')}
              </span>
            </div>
          )}
        </div>

        <div className={cn('flex flex-1 flex-col', compact ? 'mt-2' : 'mt-2.5')}>
          <h3 className={cn('line-clamp-2 flex-1 font-semibold leading-snug text-gray-900', compact ? 'text-xs' : 'text-sm')}>
            {book.title}
          </h3>
          {book.author && (
            <p className={cn('mt-0.5 truncate text-gray-500', compact ? 'text-[11px]' : 'text-xs')}>{book.author}</p>
          )}
          {lowestPrice !== undefined && (
            <p className={cn('font-bold text-primary-700', compact ? 'mt-1 text-xs' : 'mt-1.5 text-sm')}>
              {formatPrice(lowestPrice, currency)}
            </p>
          )}
        </div>
      </Link>

      {isAvailable && onAddToCart && (
        <button
          onClick={() => onAddToCart(book)}
          className={cn(
            'flex w-full items-center justify-center gap-1.5 bg-primary-700 font-semibold text-white transition-all duration-150 hover:bg-primary-800 active:scale-95',
            compact ? 'mt-2 rounded-md py-1.5 text-[11px]' : 'mt-2.5 rounded-xl py-2 text-xs',
          )}
        >
          <ShoppingCart className={cn(compact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
          {t('book.addToCart')}
        </button>
      )}
    </div>
  )
}
