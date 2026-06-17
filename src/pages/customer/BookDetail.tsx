import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, ShoppingCart, Store, ChevronLeft, CheckCircle, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Book } from '@/types'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Badge } from '@/components/ui/Badge'
import { BookCard } from '@/components/ui/BookCard'
import { useCart } from '@/context/CartContext'
import { useLanguage } from '@/context/LanguageContext'
import { useToast } from '@/components/ui/Toast'
import { formatPrice, formatDate } from '@/lib/utils'

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
        .select('*, prices:book_prices(final_price, availability)')
        .eq('category_id', book!.category_id!)
        .neq('id', id!)
        .limit(4)
      return (data ?? []) as Book[]
    },
    enabled: !!book?.category_id,
  })

  if (isLoading) return <LoadingSpinner />
  if (!book) return <div className="py-12 text-center text-gray-400">Book not found.</div>

  const selectedPrice = book.prices?.[selectedPriceIdx]
  const isAvailable = selectedPrice?.availability === 'AVAILABLE'

  function handleAddToCart() {
    if (!selectedPrice) return
    addItem({
      id: `${book.id}-${selectedPrice.bookstore_id}`,
      book_id: book.id,
      bookstore_id: selectedPrice.bookstore_id,
      quantity: 1,
      book,
      bookstore: selectedPrice.bookstore,
      unit_price: selectedPrice.final_price,
    })
    success(t('book.addToCart') + ': ' + book.title)
  }

  function handleBuyNow() {
    handleAddToCart()
    navigate('/cart')
  }

  const availabilityBadge = () => {
    switch (selectedPrice?.availability) {
      case 'AVAILABLE': return <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" />{t('book.available')}</Badge>
      case 'LOW_STOCK': return <Badge variant="warning"><AlertTriangle className="h-3 w-3 mr-1" />{t('book.lowStock')}</Badge>
      case 'OUT_OF_STOCK': return <Badge variant="error">{t('book.outOfStock')}</Badge>
      default: return null
    }
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft className="h-4 w-4" /> {t('common.back')}
      </button>

      {/* Book info */}
      <div className="flex flex-col sm:flex-row gap-6">
        {/* Cover */}
        <div className="flex-shrink-0 w-full sm:w-44">
          <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-gray-100 shadow-md">
            {book.cover_image_url ? (
              <img src={book.cover_image_url} alt={book.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen className="h-20 w-20 text-gray-300" />
              </div>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 space-y-4">
          <div>
            {book.category && (
              <span className="text-xs font-medium text-primary-600 uppercase tracking-wide">
                {book.category.name_en}
              </span>
            )}
            <h1 className="mt-1 text-xl font-bold text-gray-900">{book.title}</h1>
            {book.author && <p className="mt-1 text-sm text-gray-600">{book.author}</p>}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            {book.publisher && <InfoRow label={t('book.publisher')} value={book.publisher} />}
            {book.pages && <InfoRow label={t('book.pages')} value={String(book.pages)} />}
            {book.language && <InfoRow label={t('book.language')} value={book.language} />}
            {book.isbn && <InfoRow label={t('book.isbn')} value={book.isbn} />}
            {book.publication_date && (
              <InfoRow label={t('book.published')} value={formatDate(book.publication_date, language)} />
            )}
          </div>

          {book.description && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{t('book.description')}</p>
              <p className="text-sm text-gray-700 leading-relaxed">{book.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Price selector */}
      {book.prices && book.prices.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">{t('book.compareStores')}</span>
          </div>

          <div className="space-y-2">
            {book.prices.map((price, idx) => (
              <button
                key={price.id}
                onClick={() => setSelectedPriceIdx(idx)}
                className={`w-full flex items-center justify-between rounded-xl border p-3 text-left transition-colors ${
                  selectedPriceIdx === idx
                    ? 'border-primary-400 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">{price.bookstore?.name}</p>
                  <p className="text-xs text-gray-400">
                    {price.availability === 'AVAILABLE' ? t('book.available') :
                     price.availability === 'LOW_STOCK' ? t('book.lowStock') : t('book.outOfStock')}
                  </p>
                </div>
                <p className="text-base font-bold text-primary-700">
                  {formatPrice(price.final_price, currency)}
                </p>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-1">
            {availabilityBadge()}
          </div>

          <div className="text-center text-xs text-gray-400">{t('cart.deliveryFeeNote')}</div>
        </div>
      )}

      {/* Actions — sticky bottom on mobile */}
      <div className="fixed bottom-16 left-0 right-0 z-20 bg-white border-t border-gray-100 px-4 py-3 flex gap-3 max-w-5xl mx-auto">
        {selectedPrice && (
          <div className="flex-1">
            <p className="text-xs text-gray-400">{t('book.priceFrom')}</p>
            <p className="text-xl font-bold text-primary-700">{formatPrice(selectedPrice.final_price, currency)}</p>
          </div>
        )}
        <Button
          variant="outline"
          onClick={handleAddToCart}
          disabled={!isAvailable}
          icon={<ShoppingCart className="h-4 w-4" />}
        >
          {t('book.addToCart')}
        </Button>
        <Button
          onClick={handleBuyNow}
          disabled={!isAvailable}
        >
          {t('book.buyNow')}
        </Button>
      </div>

      {/* Related books */}
      {relatedBooks && relatedBooks.length > 0 && (
        <div>
          <h3 className="text-base font-bold text-gray-900 mb-3">{t('book.relatedBooks')}</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {relatedBooks.map(b => <BookCard key={b.id} book={b} />)}
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-gray-400">{label}</p>
      <p className="font-medium text-gray-800">{value}</p>
    </div>
  )
}
