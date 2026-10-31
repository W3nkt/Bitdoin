import { useTranslation } from 'react-i18next'
import { Heart } from 'lucide-react'
import { BackButton } from '@/components/ui/BackButton'
import { useLanguage } from '@/context/LanguageContext'
import { formatPrice } from '@/lib/utils'
import type { Book } from '@/types'

// How the cover fan leans: left, upright, right.
const TILTS = [-9, 0, 9]
const LIFTS = [6, 0, 6]

interface FavoritesHeroProps {
  /** First name of the signed-in customer, for the greeting. */
  name?: string
  /** The saved books; their covers make the fan. Empty: just the heading. */
  books: Book[]
  /** How many of them can be ordered now, and what those cost together. */
  readyCount: number
  readyTotal: number
}

/** The top of the Favorites page: a greeting by name, the customer's own covers and a few numbers about the list. */
export function FavoritesHero({ name, books, readyCount, readyTotal }: FavoritesHeroProps) {
  const { t } = useTranslation()
  const { currency } = useLanguage()
  const covers = books.filter(book => book.cover_image_url).slice(0, 3)

  return (
    <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 px-4 pb-4 pt-3.5 text-white shadow-[0_18px_40px_-18px_rgba(15,31,53,0.7)]">
      {/* Warm light behind the covers */}
      <div aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-accent-500/35 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-primary-400/25 blur-3xl" />

      <div className="relative flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <BackButton fallback="/bookstore/profile" tone="dark" />
          {name && <p className="mt-3.5 text-xs font-semibold text-white/70">{t('favorites.greeting', { name })}</p>}
          <h1 className={`${name ? 'mt-0.5' : 'mt-3.5'} text-2xl font-black leading-tight`}>
            {name ? t('favorites.titleFor', { name }) : t('favorites.title')}
          </h1>
          <p className="mt-1 text-xs text-white/65">{books.length > 0 ? t('favorites.count', { count: books.length }) : t('favorites.subtitle')}</p>
        </div>

        {covers.length > 0 ? (
          <div className="flex shrink-0 -space-x-5 pr-1 pt-1" aria-hidden>
            {covers.map((book, index) => {
              // Three covers lean left, upright, right; two lean apart; one stands upright.
              const slot = covers.length === 3 ? index : covers.length === 2 ? index * 2 : 1
              return (
                <img
                  key={book.id}
                  src={book.cover_image_url}
                  alt=""
                  className="h-[5.75rem] w-[3.85rem] rounded-lg object-cover shadow-[0_10px_20px_-6px_rgba(0,0,0,0.6)] ring-1 ring-white/30"
                  style={{ transform: `translateY(${LIFTS[slot] ?? 0}px) rotate(${TILTS[slot] ?? 0}deg)`, zIndex: slot === 1 ? 2 : 1 }}
                />
              )
            })}
          </div>
        ) : (
          <span aria-hidden className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/12 ring-1 ring-white/20 backdrop-blur-sm">
            <Heart className="h-8 w-8 fill-rose-400 text-rose-400" />
          </span>
        )}
      </div>

      {books.length > 0 && (
        <dl className="relative mt-4 grid grid-cols-[1fr_1fr_1.5fr] gap-2 sm:max-w-lg">
          <Stat label={t('favorites.saved')} value={String(books.length)} />
          <Stat label={t('favorites.ready')} value={String(readyCount)} />
          <Stat label={t('favorites.readyTotal')} value={readyCount > 0 ? formatPrice(readyTotal, currency) : '—'} />
        </dl>
      )}
    </header>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    // The label comes first in the markup (as a term should) and is shown under its number.
    <div className="flex min-w-0 flex-col-reverse rounded-2xl bg-white/12 px-3 py-2 ring-1 ring-white/15 backdrop-blur-sm">
      <dt className="mt-1.5 truncate text-[10px] font-semibold uppercase tracking-wider text-white/65">{label}</dt>
      <dd className="truncate text-[15px] font-black leading-none">{value}</dd>
    </div>
  )
}
