import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ShoppingCart, Trash2, Plus, Minus, BookOpen, ShieldCheck } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { useLanguage } from '@/context/LanguageContext'
import { formatPrice } from '@/lib/utils'
import { collapseRow, throwToTrash } from '@/lib/throwToTrash'
import type { CartItem } from '@/types'
import { CtaButton } from '@/components/ui/CtaButton'
import { EmptyState } from '@/components/ui/EmptyState'

export function Cart() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { items, removeItem, updateQty, subtotal } = useCart()
  const { currency } = useLanguage()
  const listRef = useRef<HTMLDivElement>(null)
  // Items mid-way through the trash animation, so a second tap can't remove them twice.
  const [removing, setRemoving] = useState<Set<string>>(() => new Set())

  async function handleRemove(item: CartItem, row: HTMLElement | null) {
    const key = `${item.book_id}-${item.bookstore_id}`
    if (removing.has(key)) return
    setRemoving(prev => new Set(prev).add(key))
    const cover = row?.querySelector('[data-cart-cover]')
    collapseRow(row)
    await throwToTrash(cover, item.book?.cover_image_url, listRef.current)
    removeItem(item.book_id, item.bookstore_id)
    setRemoving(prev => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingCart className="h-16 w-16" />}
        title={t('cart.empty')}
        action={{ label: t('cart.continueShopping'), onClick: () => navigate('/bookstore/books') }}
      />
    )
  }

  const storeCount = new Set(items.map(i => i.bookstore_id)).size

  return (
    // Extra bottom padding: tab bar (56px) + fixed summary bar (~110px) + buffer
    <div ref={listRef} className="space-y-3 pb-44 md:pb-28">
      <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('cart.title')}</h1>
      <p className="text-xs text-gray-400">
        {t('cart.itemsFrom').replace('{{count}}', String(storeCount))}
      </p>

      {items.map(item => (
        <div
          key={`${item.book_id}-${item.bookstore_id}`}
          data-cart-row
          className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-3 flex gap-3"
        >
          {/* Cover */}
          <div data-cart-cover className="w-16 h-20 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
            {item.book?.cover_image_url ? (
              <img src={item.book.cover_image_url} alt={item.book.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-gray-300 dark:text-gray-600" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">{item.book?.title}</p>
            <p className="text-xs text-gray-400 mt-0.5">{item.bookstore?.name}</p>

            <div className="mt-2.5 flex items-center justify-between">
              {/* Quantity — touch-friendly buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQty(item.book_id, item.bookstore_id, item.quantity - 1)}
                  className="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800/50 active:bg-gray-100 dark:active:bg-gray-800 transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300" />
                </button>
                <span className="text-sm font-semibold w-6 text-center tabular-nums">{item.quantity}</span>
                <button
                  onClick={() => updateQty(item.book_id, item.bookstore_id, item.quantity + 1)}
                  className="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800/50 active:bg-gray-100 dark:active:bg-gray-800 transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <p className="text-sm font-bold text-primary-700 dark:text-primary-300">
                  {formatPrice((item.unit_price ?? 0) * item.quantity, currency)}
                </p>
                <button
                  onClick={e => handleRemove(item, e.currentTarget.closest<HTMLElement>('[data-cart-row]'))}
                  disabled={removing.has(`${item.book_id}-${item.bookstore_id}`)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 active:bg-red-100 dark:active:bg-red-500/15 transition-colors"
                  aria-label="Remove item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Fixed summary bar — above bottom tab bar on mobile */}
      <div data-bitty-avoid className="fixed bottom-14 md:bottom-0 left-0 right-0 z-20 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 shadow-up">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-300">{t('cart.subtotal')}</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">{formatPrice(subtotal(), currency)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
            <span>{t('cart.deliveryFee')}</span>
            <span>{t('cart.deliveryFeeNote')}</span>
          </div>
          <CtaButton
            onActivate={() => navigate('/bookstore/checkout')}
            icon={<ShieldCheck className="h-5 w-5" />}
            className="h-12 w-full text-base"
          >
            {t('cart.checkout')}
          </CtaButton>
        </div>
      </div>
    </div>
  )
}
