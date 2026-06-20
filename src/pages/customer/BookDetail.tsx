import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, ShoppingCart, Store, ChevronLeft, CheckCircle, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Book } from '@/types'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { BookCard } from '@/components/ui/BookCard'
import { useCart } from '@/context/CartContext'
import { useLanguage } from '@/context/LanguageContext'
import { useToast } from '@/components/ui/Toast'
import { formatPrice, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

function sanitizeHtml(html: string): string {
  // Plain text (no HTML tags) — convert newlines to <br>
  if (!/<[a-z]/i.test(html)) return html.replace(/\n/g, '<br>')
  // Strip all tags except safe formatting and list tags
  return html.replace(/<(?!\/?(?:b|strong|i|em|u|br|ul|ol|li)\b)[^>]*>/gi, '')
}

export function BookDetail() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { addItem } = useCart()
  const { currency, language } = useLanguage()
  const { success } = useToast()

  const [selectedPriceIdx, setSelectedPriceIdx] = useState(0)

  const { data: book, isLoading } = useQuery({
    queryKey: ['book', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('books')
        .select('*, category:categories(*), prices:book_prices(*, bookstore:bookstores(*))')
        .eq('id', id!)
        .single()
      return data as Book
    },
    enabled: !!id,
  })

  const { data: relatedBooks } = useQuery({
    queryKey: ['books', 'related', book?.category_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('books')
        .select('*, prices:book_prices(final_price, availability, bookstore_id)')
        .eq('category_id', book!.category_id!)
        .neq('id', id!)
        .limit(8)
      return (data ?? []) as Book[]
    },
    enabled: !!book?.category_id,
  })

  if (isLoading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>
  if (!book) return <div className="py-16 text-center text-gray-400">{t('book.notFound')}</div>

  const selectedPrice = book.prices?.[selectedPriceIdx]
  const isAvailable = selectedPrice?.availability === 'AVAILABLE'
  const languageValue = book.language === 'Lao'
    ? t('sidebar.lao')
    : book.language === 'English'
      ? t('sidebar.english')
      : book.language

  function handleAddToCart() {
    if (!selectedPrice) return
    addItem({
      id: `${book!.id}-${selectedPrice.bookstore_id}`,
      book_id: book!.id,
      bookstore_id: selectedPrice.bookstore_id,
      quantity: 1,
      book: book!,
      bookstore: selectedPrice.bookstore,
      unit_price: selectedPrice.final_price,
      bookstore_price: selectedPrice.bookstore_price,
      margin_percent: selectedPrice.margin_percent,
    })
    success(t('book.addToCart') + ': ' + book!.title)
  }

  function handleBuyNow() {
    handleAddToCart()
    navigate('/cart')
  }

  return (
    <div className="animate-fade-in">

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="relative -mx-4 -mt-4 overflow-hidden h-[260px] sm:h-[300px] md:h-[340px]">
        {/* Blurred background */}
        {book.cover_image_url ? (
          <img src={book.cover_image_url} alt="" aria-hidden
               className="absolute inset-0 w-full h-full object-cover hero-blur" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary-900 to-primary-700" />
        )}
        {/* Gradient: light at top (for back button), heavy at bottom (for text legibility) */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-black/90" />

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 active:scale-95 transition-all"
          aria-label={t('common.back')}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {/* Cover + title — anchored to bottom of hero */}
        <div className="absolute bottom-0 inset-x-0 flex items-end gap-4 px-4 pb-5 max-w-5xl mx-auto">

          {/* Book cover */}
          <div className="flex-shrink-0 w-[100px] sm:w-[120px] md:w-[140px]">
            <div className="aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl ring-2 ring-white/25">
              {book.cover_image_url ? (
                <img src={book.cover_image_url} alt={book.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-primary-800">
                  <BookOpen className="h-10 w-10 text-primary-200" />
                </div>
              )}
            </div>
          </div>

          {/* Title + author */}
          <div className="flex-1 min-w-0 pb-1">
            {book.category && (
              <span className="mb-2 inline-flex items-center rounded-full bg-accent-500/80 backdrop-blur-sm px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                {language === 'lo' ? book.category.name_lo : book.category.name_en}
              </span>
            )}
            <h1 className="text-lg sm:text-2xl font-extrabold text-white leading-tight line-clamp-3">
              {book.title}
            </h1>
            {book.author && (
              <p className="mt-1 text-sm text-white/80 font-medium">{book.author}</p>
            )}
            {book.publisher && (
              <p className="mt-0.5 text-xs text-white/55">{book.publisher}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── White content area ────────────────────────────────────────────────── */}
      <div className="space-y-4 mt-4 pb-8">

        {/* Price + action card */}
        {book.prices && book.prices.length > 0 && (
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
            {/* Price row */}
            <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  {t('book.priceFrom')}
                </p>
                <p className="text-2xl font-black text-primary-700 leading-tight mt-0.5">
                  {selectedPrice ? formatPrice(selectedPrice.final_price, currency) : '—'}
                </p>
                {selectedPrice && (
                  <p className={cn(
                    'mt-0.5 flex items-center gap-1 text-xs font-semibold',
                    selectedPrice.availability === 'AVAILABLE' ? 'text-green-600' :
                    selectedPrice.availability === 'LOW_STOCK'  ? 'text-amber-500' : 'text-red-500',
                  )}>
                    {selectedPrice.availability === 'AVAILABLE' && <CheckCircle className="h-3 w-3" />}
                    {selectedPrice.availability === 'LOW_STOCK'  && <AlertTriangle className="h-3 w-3" />}
                    {selectedPrice.availability === 'AVAILABLE' ? t('book.available') :
                     selectedPrice.availability === 'LOW_STOCK'  ? t('book.lowStock') : t('book.outOfStock')}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={handleAddToCart}
                  disabled={!isAvailable}
                  className="flex h-11 items-center gap-2 rounded-xl border-2 border-primary-700 px-4 text-sm font-bold text-primary-700 hover:bg-primary-50 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ShoppingCart className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline">{t('book.addToCart')}</span>
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={!isAvailable}
                  className="h-11 rounded-xl bg-primary-700 px-5 text-sm font-bold text-white hover:bg-primary-800 active:scale-95 transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {t('book.buyNow')}
                </button>
              </div>
            </div>

            {/* Divider */}
            {book.prices.length > 1 && (
              <div className="border-t border-gray-100 px-4 py-3">
                <p className="mb-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Store className="h-3 w-3" />
                  {t('book.compareStores')}
                </p>
                <div className="space-y-2">
                  {book.prices.map((price, idx) => (
                    <button
                      key={price.id}
                      onClick={() => setSelectedPriceIdx(idx)}
                      className={cn(
                        'w-full flex items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-all duration-150',
                        selectedPriceIdx === idx
                          ? 'border-primary-600 bg-primary-50'
                          : 'border-gray-100 bg-gray-50 hover:border-gray-200 active:bg-gray-100',
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={cn(
                          'h-2.5 w-2.5 rounded-full flex-shrink-0 ring-2 ring-offset-1 transition-colors',
                          selectedPriceIdx === idx ? 'bg-primary-600 ring-primary-300' : 'bg-gray-300 ring-gray-200',
                        )} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{price.bookstore?.name}</p>
                          <p className={cn(
                            'text-xs mt-0.5 flex items-center gap-1 font-medium',
                            price.availability === 'AVAILABLE' ? 'text-green-600' :
                            price.availability === 'LOW_STOCK'  ? 'text-amber-500' : 'text-red-500',
                          )}>
                            {price.availability === 'AVAILABLE' && <CheckCircle className="h-2.5 w-2.5" />}
                            {price.availability === 'AVAILABLE' ? t('book.available') :
                             price.availability === 'LOW_STOCK'  ? t('book.lowStock') : t('book.outOfStock')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className="text-sm font-bold text-primary-700">
                          {formatPrice(price.final_price, currency)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Meta chips — horizontal scroll */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-0.5">
          {book.language && <MetaChip label={t('book.language')} value={languageValue} />}
          {book.pages && <MetaChip label={t('book.pages')} value={String(book.pages)} />}
          {book.isbn && <MetaChip label="ISBN" value={book.isbn} />}
          {book.publication_date && (
            <MetaChip label={t('book.published')} value={formatDate(book.publication_date, language)} />
          )}
        </div>

        {/* Description */}
        {book.description && (
          <div className="rounded-2xl bg-white border border-gray-100 px-4 py-4">
            <h2 className="text-sm font-bold text-gray-900 mb-2">{t('book.description')}</h2>
            <div
              className="text-sm text-gray-600 leading-relaxed [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic [&_u]:underline [&_ul]:ml-4 [&_ul]:list-disc [&_ol]:ml-4 [&_ol]:list-decimal [&_li]:my-0.5"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(book.description) }}
            />
          </div>
        )}

        {/* Single-store price note (when only 1 store) */}
        {book.prices && book.prices.length === 1 && (
          <div className="rounded-2xl bg-white border border-gray-100 px-4 py-4">
            <div className="flex items-center gap-2 mb-2">
              <Store className="h-4 w-4 text-primary-700 flex-shrink-0" />
              <h2 className="text-sm font-bold text-gray-900">{t('book.compareStores')}</h2>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700 font-medium">{book.prices[0].bookstore?.name}</span>
              <span className="font-bold text-primary-700">{formatPrice(book.prices[0].final_price, currency)}</span>
            </div>
            <p className="mt-2.5 text-center text-xs text-gray-400 bg-gray-50 rounded-xl py-2">
              {t('cart.deliveryFeeNote')}
            </p>
          </div>
        )}

        {/* Related books — horizontal scroll */}
        {relatedBooks && relatedBooks.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-gray-900 mb-3">{t('book.relatedBooks')}</h2>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-2">
              {relatedBooks.map(b => (
                <div key={b.id} className="flex-shrink-0 w-28 sm:w-32">
                  <BookCard book={b} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-shrink-0 rounded-2xl bg-white border border-gray-100 px-3.5 py-2.5 text-center min-w-[72px]">
      <p className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold">{label}</p>
      <p className="text-xs font-bold text-gray-800 mt-0.5 truncate max-w-[90px]">{value}</p>
    </div>
  )
}
