import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BadgeCheck, MessageSquareText, Star } from 'lucide-react'
import { RatingStars } from '@/components/ui/RatingStars'
import { useLanguage } from '@/context/LanguageContext'
import { cn, formatDate } from '@/lib/utils'

export type StarLevel = 1 | 2 | 3 | 4 | 5

/** The ratings of one book. */
export interface BookRatingSummary {
  /** Mean rating, 0 to 5. */
  average: number
  /** How many ratings there are. */
  count: number
  /** How many ratings gave each number of stars. */
  counts: Record<StarLevel, number>
}

/** One review, written by a customer who bought the book. */
export interface BookReview {
  id: string
  author: string
  avatarUrl?: string | null
  rating: number
  comment: string
  /** ISO date. */
  createdAt: string
  verifiedBuyer: boolean
}

const STAR_LEVELS: StarLevel[] = [5, 4, 3, 2, 1]
/** Reviews shown before "Show all". */
const FIRST_REVIEWS = 3

interface BookReviewsProps {
  summary: BookRatingSummary | null
  reviews: BookReview[]
  /** Shows the "Write a review" button when given. */
  onWrite?: () => void
  /** Marks made-up data that is only there to preview the design. */
  sample?: boolean
}

/** Ratings and buyers' reviews of a book. With no data yet it shows an invitation instead. */
export function BookReviews({ summary, reviews, onWrite, sample }: BookReviewsProps) {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const [showAll, setShowAll] = useState(false)
  const rated = summary && summary.count > 0 ? summary : null
  const shown = showAll ? reviews : reviews.slice(0, FIRST_REVIEWS)

  return (
    <section id="reviews" className="scroll-mt-20 rounded-2xl border border-gray-100 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">{t('book.ratingsAndReviews')}</h2>
        {onWrite && (
          <button
            type="button"
            onClick={onWrite}
            className="rounded-full border border-primary-700 px-3.5 py-1.5 text-xs font-bold text-primary-700 transition hover:bg-primary-50 active:scale-95 dark:border-primary-400 dark:text-primary-300 dark:hover:bg-primary-900/40"
          >
            {t('book.writeReview')}
          </button>
        )}
      </div>

      {sample && (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-1.5 text-center text-[11px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
          Sample reviews, only shown to preview the design
        </p>
      )}

      {rated ? (
        <div className="grid grid-cols-[auto_1fr] items-center gap-5">
          <div className="text-center">
            <p className="text-4xl font-black leading-none text-gray-900 dark:text-gray-50">{rated.average.toFixed(1)}</p>
            <RatingStars
              value={rated.average}
              starClassName="h-4 w-4"
              className="mt-2"
              label={t('book.ratedOutOf', { value: rated.average.toFixed(1) })}
            />
            <p className="mt-1.5 text-[11px] font-medium text-gray-400">{t('book.ratingCount', { count: rated.count })}</p>
          </div>
          <ul className="space-y-1.5" aria-label={t('book.ratingsAndReviews')}>
            {STAR_LEVELS.map(level => (
              <li key={level} className="flex items-center gap-2 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                <span className="flex w-6 shrink-0 items-center justify-end gap-0.5 tabular-nums">
                  {level}<Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden />
                </span>
                <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <span
                    className="block h-full rounded-full bg-gradient-to-r from-amber-400 to-accent-500"
                    style={{ width: `${(rated.counts[level] / rated.count) * 100}%` }}
                  />
                </span>
                <span className="w-7 shrink-0 text-right tabular-nums">{rated.counts[level]}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : reviews.length === 0 && (
        <div className="flex flex-col items-center px-2 py-5 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-amber-50 text-amber-500 dark:bg-amber-500/10">
            <MessageSquareText className="h-6 w-6" />
          </span>
          <RatingStars value={0} starClassName="h-5 w-5" className="mt-3" />
          <p className="mt-3 text-sm font-bold text-gray-900 dark:text-gray-100">{t('book.reviewsEmptyTitle')}</p>
          <p className="mt-1 max-w-xs text-xs leading-5 text-gray-500 dark:text-gray-400">{t('book.reviewsEmptyBody')}</p>
        </div>
      )}

      {reviews.length > 0 && (
        <>
          <ul className={cn('divide-y divide-gray-100 dark:divide-gray-800', rated && 'mt-4 border-t border-gray-100 pt-4 dark:border-gray-800')}>
            {shown.map(review => <ReviewItem key={review.id} review={review} language={language} />)}
          </ul>
          {reviews.length > FIRST_REVIEWS && (
            <button
              type="button"
              onClick={() => setShowAll(value => !value)}
              aria-expanded={showAll}
              className="mt-3 w-full rounded-xl bg-gray-50 py-2.5 text-xs font-bold text-primary-700 transition hover:bg-primary-50 active:scale-[0.99] dark:bg-gray-800/60 dark:text-primary-300 dark:hover:bg-primary-900/40"
            >
              {showAll ? t('book.showFewerReviews') : t('book.showAllReviews', { count: reviews.length })}
            </button>
          )}
        </>
      )}
    </section>
  )
}

function ReviewItem({ review, language }: { review: BookReview; language: 'lo' | 'en' }) {
  const { t } = useTranslation()
  return (
    <li className="flex gap-3 py-4 first:pt-0 last:pb-0">
      <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-100 text-sm font-black uppercase text-primary-700 dark:bg-primary-900/50 dark:text-primary-200" aria-hidden>
        {review.avatarUrl
          ? <img src={review.avatarUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
          : review.author.trim().charAt(0)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{review.author}</p>
          <time dateTime={review.createdAt} className="shrink-0 text-[11px] text-gray-400">{formatDate(review.createdAt, language)}</time>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
          <RatingStars value={review.rating} starClassName="h-3.5 w-3.5" label={t('book.ratedOutOf', { value: review.rating })} />
          {review.verifiedBuyer && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
              {t('book.verifiedBuyer')}
            </span>
          )}
        </div>
        <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-gray-600 dark:text-gray-300">{review.comment}</p>
      </div>
    </li>
  )
}

// ── Made-up data for previewing the design (development only, see BookDetail) ──────────────────────────────────

/** Made-up ratings and reviews. A function, so that production builds (which never call it) drop the data. */
export function makeSampleReviews(): { summary: BookRatingSummary; reviews: BookReview[] } {
  const counts: Record<StarLevel, number> = { 5: 78, 4: 31, 3: 12, 2: 5, 1: 2 }
  const count = STAR_LEVELS.reduce((sum, level) => sum + counts[level], 0)
  return {
    summary: { average: STAR_LEVELS.reduce((sum, level) => sum + level * counts[level], 0) / count, count, counts },
    reviews: [
      { id: 's1', author: 'Somsy K.', rating: 5, createdAt: '2026-10-12', verifiedBuyer: true, comment: 'Easy to read and full of practical ideas. I finished it in a weekend and have already started using the budgeting tips.' },
      { id: 's2', author: 'Noy', rating: 4, createdAt: '2026-09-28', verifiedBuyer: true, comment: 'Good for beginners. Delivery to Luang Prabang took three days and the book arrived in perfect condition.' },
      { id: 's3', author: 'Alex T.', rating: 5, createdAt: '2026-09-05', verifiedBuyer: true, comment: 'Clear examples, no jargon.\nI bought a second copy for my brother.' },
      { id: 's4', author: 'Khamla', rating: 3, createdAt: '2026-08-19', verifiedBuyer: false, comment: 'Nice book, but I expected a little more about investing.' },
      { id: 's5', author: 'Mai', rating: 4, createdAt: '2026-08-02', verifiedBuyer: true, comment: 'Worth the price.' },
    ],
  }
}
