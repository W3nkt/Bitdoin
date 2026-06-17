import { BookOpen, ShoppingCart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Book } from '@/types'
import { useLanguage } from '@/context/LanguageContext'
import { formatPrice } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface BookCardProps {
  book: Book
  onAddToCart?: (book: Book) => void
  className?: string
}

export function BookCard({ book, onAddToCart, className }: BookCardProps) {
  const { t } = useTranslation()
  const { currency } = useLanguage()

  const lowestPrice = book.min_price ?? book.prices?.[0]?.final_price
  const isAvailable = book.prices?.some(p => p.availability === 'AVAILABLE') ?? false

  return (
    <div className={cn(
      'group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden',
      'transition-shadow hover:shadow-md',
      className,
    )}>
      <Link to={`/books/${book.id}`} className="block">
        <div className="relative h-48 overflow-hidden bg-gray-50">
          {book.cover_image_url ? (
            <img
              src={book.cover_image_url}
              alt={book.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <BookOpen className="h-16 w-16 text-gray-300" />
            </div>
          )}
          {!isAvailable && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-medium text-white">
                {t('book.outOfStock')}
              </span>
            </div>
          )}
        </div>
        <div className="p-3">
          <h3 className="line-clamp-2 text-sm font-semibold text-gray-900 leading-tight">{book.title}</h3>
          {book.author && (
            <p className="mt-0.5 text-xs text-gray-500 truncate">{book.author}</p>
          )}
          {lowestPrice !== undefined && (
            <p className="mt-2 text-base font-bold text-primary-700">
              {formatPrice(lowestPrice, currency)}
            </p>
          )}
        </div>
      </Link>
      {isAvailable && onAddToCart && (
        <div className="px-3 pb-3">
          <button
            onClick={(e) => { e.preventDefault(); onAddToCart(book) }}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary-700 py-2 text-xs font-medium text-white hover:bg-primary-800 transition-colors"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            {t('book.addToCart')}
          </button>
        </div>
      )}
    </div>
  )
}
