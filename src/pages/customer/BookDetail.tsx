import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import DOMPurify from 'dompurify'
import { ShoppingCart, Store, ChevronLeft, CheckCircle, AlertTriangle, ArrowRight, GraduationCap, Heart } from 'lucide-react'
import { OpenBook } from '@/components/ui/OpenBook'
import { supabase } from '@/lib/supabase'
import type { Book } from '@/types'
import { Busy, DetailSkeleton, Skeleton, TextSkeleton } from '@/components/ui/Skeleton'
import { BookCard } from '@/components/ui/BookCard'
import { CtaButton } from '@/components/ui/CtaButton'
import { RatingStars } from '@/components/ui/RatingStars'
import { BookReviews, makeSampleReviews, type BookRatingSummary, type BookReview } from '@/components/book/BookReviews'
import { useCart } from '@/context/CartContext'
import { useLanguage } from '@/context/LanguageContext'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { LoginModal } from '@/components/auth/LoginModal'
import { ImageLightbox } from '@/components/ui/ImageLightbox'
import { rememberPendingFavorite, useBookFavorite } from '@/hooks/useBookFavorite'
import { trackGoogleEvent } from '@/lib/googleAnalytics'
import { closeBookWithFlight, type BookPreview } from '@/lib/bookFlight'
import { formatPrice, formatDate } from '@/lib/utils'
import { flyToCart } from '@/lib/flyToCart'
import { cn } from '@/lib/utils'

// Keeps the structure/formatting (headings, paragraphs, colors, lists) that admins
// paste in from Word/Google Docs, while stripping anything that could execute script.
function sanitizeHtml(html: string): string {
  // Plain text (no HTML tags) — convert newlines to <br>
  if (!/<[a-z]/i.test(html)) return html.replace(/\n/g, '<br>')
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'div', 'br', 'span',
      'b', 'strong', 'i', 'em', 'u',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote',
    ],
    ALLOWED_ATTR: [],
  })
}

interface ReadingSummaryLink {
  slug: string
  title_en: string
  title_lo: string
  estimated_minutes: number
  has_access: boolean
}

// The cover overlaps the white sheet below it: --cover-w is its width, and the sheet is pulled up under the lower
// 55% of it (0.55 x 1.5 x width). DetailSkeleton uses the same numbers.
const COVER_VARS = '[--cover-w:10.5rem] sm:[--cover-w:12rem]'
const COVER_OVERLAP = 'calc(var(--cover-w)*0.825)'

/** A long description is folded to this height until Read more is tapped. */
const FOLDED_PX = 176

const COVER_FRAME ='aspect-[2/3] overflow-hidden rounded-2xl shadow-[0_24px_50px_-12px_rgba(0,0,0,0.6)] ring-1 ring-white/25'

const DESCRIPTION_STYLES = cn(
  'text-sm text-gray-600 dark:text-gray-300 leading-relaxed',
  '[&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic [&_u]:underline',
  '[&_ul]:ml-4 [&_ul]:list-disc [&_ol]:ml-4 [&_ol]:list-decimal [&_li]:my-0.5',
  '[&_p]:mb-2 [&_div]:mb-1',
  '[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-gray-200 dark:[&_blockquote]:border-gray-700 [&_blockquote]:pl-3 [&_blockquote]:italic',
  '[&_h1]:mb-1.5 [&_h1]:mt-3 [&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-gray-900 dark:[&_h1]:text-gray-100',
  '[&_h2]:mb-1.5 [&_h2]:mt-3 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-gray-900 dark:[&_h2]:text-gray-100',
  '[&_h3]:mb-1 [&_h3]:mt-2 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-gray-900 dark:[&_h3]:text-gray-100',
  '[&_h4]:mb-1 [&_h4]:mt-2 [&_h4]:text-sm [&_h4]:font-bold [&_h4]:text-gray-900 dark:[&_h4]:text-gray-100',
  '[&_h5]:mb-1 [&_h5]:mt-2 [&_h5]:text-sm [&_h5]:font-bold [&_h5]:text-gray-900 dark:[&_h5]:text-gray-100',
  '[&_h6]:mb-1 [&_h6]:mt-2 [&_h6]:text-sm [&_h6]:font-bold [&_h6]:text-gray-900 dark:[&_h6]:text-gray-100',
)

export function BookDetail() {
  const { id } = useParams<{ id: string }>()
  const { key: locationKey, state: locationState } = useLocation()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { addItem } = useCart()
  const { currency, language } = useLanguage()
  const { profile } = useAuth()
  const { success, error: showError } = useToast()

  const [selectedPriceIdx, setSelectedPriceIdx] = useState(0)
  const coverRef = useRef<HTMLDivElement>(null)
  const [loginOpen, setLoginOpen] = useState(false)
  const [coverOpen, setCoverOpen] = useState(false)
  const [atFooter, setAtFooter] = useState(false)
  // The cover flying in from the list is captured on the page's first frame, so no entrance fade then.
  const [fadeIn] = useState(() => document.documentElement.dataset.flight !== 'cover')
  const favorite = useBookFavorite(id, () => success(t('book.addedToFavorites')))

  useLayoutEffect(() => {
    // Each visit starts at the cover, including related books and Back/Forward.
    // Override browser restoration and the site's smooth scrolling before paint.
    window.history.scrollRestoration = 'manual'
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    return () => { window.history.scrollRestoration = 'auto' }
  }, [id, locationKey])

  // The floating Cart / Buy Now bar steps aside when the footer scrolls into view.
  useEffect(() => {
    const footer = document.querySelector('footer[data-bitty-avoid]')
    if (!footer || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(([entry]) => setAtFooter(entry.isIntersecting), { rootMargin: '0px 0px -150px 0px' })
    observer.observe(footer)
    return () => observer.disconnect()
  }, [])

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

  const { data: readingSummary } = useQuery({
    queryKey: ['book', id, 'reading-summary'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_book_reading_summary', { p_book_id: id! })
      if (error) throw error
      return (data?.[0] ?? null) as ReadingSummaryLink | null
    },
    enabled: !!id,
  })

  useEffect(() => {
    if (book) trackGoogleEvent('view_item', {
      currency: 'LAK',
      value: book.prices?.[0]?.final_price ?? 0,
      items: [{
        item_id: book.id,
        item_name: book.title,
        item_category: book.category?.name_en,
        price: book.prices?.[0]?.final_price ?? 0,
      }],
    })
  }, [book?.id])

  // Ratings and reviews come with the reviews feature; until then the section shows its invitation.
  // In development, ?previewReviews=1 fills it with made-up data to preview the design.
  const previewReviews = import.meta.env.DEV && searchParams.get('previewReviews') === '1'
  const sample = previewReviews ? makeSampleReviews() : null
  const ratingSummary: BookRatingSummary | null = sample?.summary ?? null
  const reviews: BookReview[] = sample?.reviews ?? []

  // The list that opened this page passes the book along, so the cover has somewhere to land while the rest loads.
  const passed = (locationState as { bookPreview?: BookPreview } | null)?.bookPreview
  const preview = passed && passed.id === id ? passed : undefined
  const head: Pick<Book, 'id' | 'title' | 'cover_image_url'> & { author?: string | null } | undefined =
    book ?? (preview && { ...preview, cover_image_url: preview.cover_image_url ?? undefined })

  if (!isLoading && !book) return <div className="py-16 text-center text-gray-400">{t('book.notFound')}</div>
  if (!head) return <DetailSkeleton />

  const isAdmin = profile?.role === 'ADMIN'

  // Customers always get the cheapest available price — store identity is admin-only.
  const bestPriceIdx = book?.prices?.length
    ? book.prices.reduce((bestIdx, price, idx, arr) => {
        const best = arr[bestIdx]
        if (price.availability === 'AVAILABLE' && best.availability !== 'AVAILABLE') return idx
        if (price.availability !== 'AVAILABLE' && best.availability === 'AVAILABLE') return bestIdx
        return price.final_price < best.final_price ? idx : bestIdx
      }, 0)
    : 0

  const effectivePriceIdx = isAdmin ? selectedPriceIdx : bestPriceIdx
  const selectedPrice = book?.prices?.[effectivePriceIdx]
  const isAvailable = selectedPrice?.availability === 'AVAILABLE'
  const languageValue = !book ? '' : book.language === 'Lao'
    ? t('sidebar.lao')
    : book.language === 'English'
      ? t('sidebar.english')
      : book.language
  const lo = language === 'lo'

  function addToCart() {
    if (!book || !selectedPrice) return false
    addItem({
      id: `${book.id}-${selectedPrice.bookstore_id}`,
      book_id: book.id,
      bookstore_id: selectedPrice.bookstore_id,
      quantity: 1,
      book,
      bookstore: selectedPrice.bookstore,
      unit_price: selectedPrice.final_price,
      bookstore_price: selectedPrice.bookstore_price,
      margin_percent: selectedPrice.margin_percent,
    })
    return true
  }

  function handleAddToCart() {
    if (!addToCart()) return
    flyToCart(coverRef.current, head?.cover_image_url)
    success(t('book.addToCart') + ': ' + head?.title)
  }

  async function handleToggleFavorite() {
    if (!favorite.isSignedIn) {
      // Saved automatically once they sign in (see useBookFavorite).
      rememberPendingFavorite(id!)
      setLoginOpen(true)
      return
    }
    const next = !favorite.isFavorite
    try {
      await favorite.setFavorite(next)
      success(t(next ? 'book.addedToFavorites' : 'book.removedFromFavorites'))
    } catch {
      showError(t('common.error'))
    }
  }

  function handleBack() {
    // 'default' is the first page of the visit (a link opened directly): there is no list to fly back to.
    if (locationKey === 'default') navigate(-1)
    else void closeBookWithFlight({ bookId: head!.id, cover: coverRef.current, navigate })
  }

  function closeLogin() {
    rememberPendingFavorite(null)
    setLoginOpen(false)
  }

  function handleBuyNow() {
    if (addToCart()) navigate('/bookstore/cart')
  }

  function handleOpenSummary() {
    if (!readingSummary || !book) return
    trackGoogleEvent('select_content', {
      content_type: 'academy_reading_summary',
      item_id: book.id,
      item_name: book.title,
    })
    navigate(
      readingSummary.has_access
        ? `/academy/lesson/${readingSummary.slug}`
        : `/academy/subscription?book=${book.id}&summary=${encodeURIComponent(readingSummary.slug)}`,
    )
  }

  const availability = selectedPrice && {
    label: selectedPrice.availability === 'AVAILABLE' ? t('book.available') :
      selectedPrice.availability === 'LOW_STOCK' ? t('book.lowStock') : t('book.outOfStock'),
    style: selectedPrice.availability === 'AVAILABLE' ? 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400' :
      selectedPrice.availability === 'LOW_STOCK' ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' :
      'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
  }

  return (
    <div className={cn('pb-24', fadeIn && 'animate-fade-in')}>

      {/* ── Hero: the cover over its own blurred backdrop, resting on a white sheet ───────────────────────────── */}
      <div className={cn('relative -mx-4 -mt-4 md:mx-auto md:mt-0 md:max-w-3xl', COVER_VARS)}>
        <div className="relative pt-[4.5rem]">
          <div className="absolute inset-x-0 top-0 h-[17rem] overflow-hidden bg-primary-900 md:rounded-3xl">
            {head.cover_image_url ? (
              <img src={head.cover_image_url} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover hero-blur" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary-900 to-primary-700" />
            )}
            {/* Brand navy, light at the top (for the buttons) and heavier below (so the cover stands out), whatever the cover's colours */}
            <div className="absolute inset-0 bg-gradient-to-b from-primary-950/35 via-primary-900/45 to-primary-950/70" />
          </div>

          <button
            onClick={handleBack}
            className="absolute left-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-all hover:bg-black/50 active:scale-95"
            aria-label={t('common.back')}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={handleToggleFavorite}
            disabled={favorite.isSaving}
            aria-pressed={favorite.isFavorite}
            aria-label={t(favorite.isFavorite ? 'book.removeFromFavorites' : 'book.addToFavorites')}
            title={t(favorite.isFavorite ? 'book.removeFromFavorites' : 'book.addToFavorites')}
            className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-all hover:bg-black/50 active:scale-90"
          >
            <Heart className={cn('h-5 w-5 transition-colors', favorite.isFavorite && 'fill-rose-500 text-rose-500')} />
          </button>

          {/* Book cover */}
          <div className="relative z-10 mx-auto w-[var(--cover-w)]">
            {head.cover_image_url ? (
              <button
                type="button"
                onClick={() => setCoverOpen(true)}
                aria-label={t('book.enlargeCover')}
                title={t('book.enlargeCover')}
                className="block w-full cursor-zoom-in rounded-2xl transition-transform hover:scale-[1.03] active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
              >
                <div ref={coverRef} data-detail-cover={head.id} className={COVER_FRAME}>
                  <img src={head.cover_image_url} alt={head.title} decoding="sync" className="h-full w-full object-cover" />
                </div>
              </button>
            ) : (
              <div ref={coverRef} data-detail-cover={head.id} className={COVER_FRAME}>
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-primary-800">
                  <OpenBook className="h-12 w-12 text-primary-200" />
                </div>
              </div>
            )}
          </div>

          {/* ── The sheet: title, rating, price and description ─────────────────────────────────────────────── */}
          <div
            className="relative rounded-[2rem] bg-white px-5 pb-6 shadow-[0_-14px_34px_-14px_rgba(0,0,0,0.35)] dark:bg-gray-900 md:rounded-3xl"
            style={{ marginTop: `calc(${COVER_OVERLAP} * -1)`, paddingTop: `calc(${COVER_OVERLAP} + 1.25rem)` }}
          >
            <div className="text-center">
              <h1 className={cn('text-xl font-extrabold text-gray-900 dark:text-gray-50 sm:text-2xl', lo ? 'leading-[1.45]' : 'leading-tight')}>
                {head.title}
              </h1>
              {head.author && <p className="mt-1.5 text-sm font-medium text-gray-500 dark:text-gray-400">{head.author}</p>}
              {book?.publisher && <p className="mt-0.5 text-xs text-gray-400">{book.publisher}</p>}

              <button
                type="button"
                onClick={() => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="mx-auto mt-3 flex items-center gap-2 rounded-full px-3 py-1.5 transition-colors hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-800"
              >
                <RatingStars
                  value={ratingSummary?.average ?? 0}
                  starClassName="h-[18px] w-[18px]"
                  label={ratingSummary ? t('book.ratedOutOf', { value: ratingSummary.average.toFixed(1) }) : undefined}
                />
                {ratingSummary ? (
                  <>
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{ratingSummary.average.toFixed(1)}</span>
                    <span className="text-xs text-gray-400">({ratingSummary.count})</span>
                  </>
                ) : (
                  <span className="text-xs font-medium text-gray-400">{t('book.noRatingsYet')}</span>
                )}
              </button>
            </div>

            {book ? (
              <>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {book.category && (
                    <span className="rounded-full bg-accent-50 px-3 py-1 text-xs font-bold text-accent-700 dark:bg-accent-500/15 dark:text-accent-400">
                      {lo ? book.category.name_lo : book.category.name_en}
                    </span>
                  )}
                  {book.language && (
                    <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700 dark:bg-primary-500/15 dark:text-primary-300">
                      {languageValue}
                    </span>
                  )}
                </div>

                {book.prices && book.prices.length > 0 && (
                  <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-primary-50/70 px-4 py-3 dark:bg-primary-900/30">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{t('book.priceFrom')}</p>
                      <p className="mt-0.5 text-2xl font-black leading-tight text-primary-700 dark:text-primary-300">
                        {selectedPrice ? formatPrice(selectedPrice.final_price, currency) : '—'}
                      </p>
                    </div>
                    {availability && (
                      <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-bold', availability.style)}>
                        {selectedPrice?.availability === 'AVAILABLE' && <CheckCircle className="h-3.5 w-3.5" />}
                        {selectedPrice?.availability === 'LOW_STOCK' && <AlertTriangle className="h-3.5 w-3.5" />}
                        {availability.label}
                      </span>
                    )}
                  </div>
                )}

                {book.description && (
                  <div className="mt-5">
                    <h2 className="mb-2 text-sm font-bold text-gray-900 dark:text-gray-100">{t('book.description')}</h2>
                    <Collapsible>
                      <div className={DESCRIPTION_STYLES} dangerouslySetInnerHTML={{ __html: sanitizeHtml(book.description) }} />
                    </Collapsible>
                  </div>
                )}
              </>
            ) : (
              <SheetSkeleton />
            )}
          </div>
        </div>
      </div>

      {/* ── Everything else ─────────────────────────────────────────────────────────────────────────────────── */}
      {book && (
        <div className="mx-auto mt-4 max-w-3xl space-y-4">

          {readingSummary && (
            <div className="overflow-hidden rounded-2xl border border-violet-200 dark:border-violet-500/30 bg-gradient-to-br from-violet-50 dark:from-violet-500/10 via-white dark:via-gray-900 to-amber-50 dark:to-amber-500/10 shadow-sm">
              <div className="flex items-center gap-4 p-4 sm:p-5">
                <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl bg-violet-700 text-white shadow-sm">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">
                    Bitdoin Academy
                  </p>
                  <h2 className="mt-1 text-sm font-black text-gray-950 dark:text-gray-100">
                    {lo ? 'ອ່ານສະຫຼຸບປຶ້ມນີ້' : 'Read this book summary'}
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                    {readingSummary.estimated_minutes} {lo
                      ? 'ນາທີ · ແນວຄິດສຳຄັນ ແລະ ບົດຮຽນນຳໃຊ້'
                      : 'min · Key ideas and practical takeaways'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenSummary}
                  className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-xl bg-violet-700 px-3.5 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-violet-800 active:scale-95 sm:px-4 sm:text-sm"
                >
                  {readingSummary.has_access
                    ? (lo ? 'ອ່ານເລີຍ' : 'Read now')
                    : (lo ? 'ເປີດໃນ Academy' : 'Open in Academy')}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              {!readingSummary.has_access && (
                <p className="border-t border-violet-100 dark:border-violet-500/30 bg-white/60 dark:bg-gray-900/60 px-4 py-2 text-center text-[11px] font-semibold text-violet-700 dark:text-violet-300">
                  {lo
                    ? 'ສະໝັກ Academy ເພື່ອປົດລັອກສະຫຼຸບ ແລະ ບົດຮຽນທັງໝົດ'
                    : 'Subscribe to Academy to unlock summaries and the full learning library'}
                </p>
              )}
            </div>
          )}

          {/* Details */}
          <div className="rounded-2xl border border-gray-100 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-3 text-sm font-bold text-gray-900 dark:text-gray-100">{t('book.details')}</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {book.language && <MetaChip label={t('book.language')} value={languageValue} />}
              {book.pages && <MetaChip label={t('book.pages')} value={String(book.pages)} />}
              {book.isbn && <MetaChip label="ISBN" value={book.isbn} />}
              {book.publication_date && (
                <MetaChip label={t('book.published')} value={formatDate(book.publication_date, language)} />
              )}
            </div>
          </div>

          {/* Compare stores — admin only; customers just get the best price */}
          {isAdmin && book.prices && book.prices.length > 1 && (
            <div className="rounded-2xl border border-gray-100 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-900">
              <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                <Store className="h-3 w-3" />
                {t('book.compareStores')}
              </p>
              <div className="space-y-2">
                {book.prices.map((price, idx) => (
                  <button
                    key={price.id}
                    onClick={() => setSelectedPriceIdx(idx)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-all duration-150',
                      selectedPriceIdx === idx
                        ? 'border-primary-600 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/40'
                        : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 hover:border-gray-200 dark:hover:border-gray-700 active:bg-gray-100 dark:active:bg-gray-800',
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className={cn(
                        'h-2.5 w-2.5 flex-shrink-0 rounded-full ring-2 ring-offset-1 transition-colors',
                        selectedPriceIdx === idx ? 'bg-primary-600 ring-primary-300' : 'bg-gray-300 dark:bg-gray-600 ring-gray-200 dark:ring-gray-700',
                      )} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">{price.bookstore?.name}</p>
                        <p className={cn(
                          'mt-0.5 flex items-center gap-1 text-xs font-medium',
                          price.availability === 'AVAILABLE' ? 'text-green-600 dark:text-green-400' :
                          price.availability === 'LOW_STOCK'  ? 'text-amber-500' : 'text-red-500',
                        )}>
                          {price.availability === 'AVAILABLE' && <CheckCircle className="h-2.5 w-2.5" />}
                          {price.availability === 'AVAILABLE' ? t('book.available') :
                           price.availability === 'LOW_STOCK'  ? t('book.lowStock') : t('book.outOfStock')}
                        </p>
                      </div>
                    </div>
                    <div className="ml-3 flex-shrink-0 text-right">
                      <p className="text-sm font-bold text-primary-700 dark:text-primary-300">
                        {formatPrice(price.final_price, currency)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* The one store that sells it — admin only; customers just get the best price */}
          {isAdmin && book.prices && book.prices.length === 1 && (
            <div className="rounded-2xl border border-gray-100 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-2 flex items-center gap-2">
                <Store className="h-4 w-4 flex-shrink-0 text-primary-700 dark:text-primary-300" />
                <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">{t('book.compareStores')}</h2>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700 dark:text-gray-200">{book.prices[0].bookstore?.name}</span>
                <span className="font-bold text-primary-700 dark:text-primary-300">{formatPrice(book.prices[0].final_price, currency)}</span>
              </div>
            </div>
          )}

          <BookReviews summary={ratingSummary} reviews={reviews} sample={previewReviews} />

          {/* Related books — horizontal scroll */}
          {relatedBooks && relatedBooks.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-bold text-gray-900 dark:text-gray-100">{t('book.relatedBooks')}</h2>
              <div className="scrollbar-hide -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
                {relatedBooks.map(b => (
                  <div key={b.id} className="w-28 flex-shrink-0 sm:w-32">
                    <BookCard book={b} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Cart and Buy Now float above the tab bar, within thumb reach ───────────────────────────────────────── */}
      {book?.prices && book.prices.length > 0 && (
        <div
          data-bitty-avoid
          className={cn(
            'pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+var(--safe-bottom))] z-20 px-4 transition-all duration-200 md:bottom-6',
            atFooter && 'translate-y-3 opacity-0',
          )}
        >
          <div className={cn('mx-auto flex max-w-md gap-3', atFooter ? 'pointer-events-none' : 'pointer-events-auto')}>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!isAvailable}
              className="flex h-12 min-w-0 flex-[1] items-center justify-center gap-1.5 rounded-2xl border-2 border-primary-700 bg-white/95 px-2 text-xs font-bold leading-tight text-primary-700 shadow-lg shadow-black/10 backdrop-blur transition-all hover:bg-primary-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 dark:border-primary-400 dark:bg-gray-900/95 dark:text-primary-300 dark:hover:bg-primary-900/60 sm:text-sm"
            >
              <ShoppingCart className="h-4 w-4 flex-shrink-0" />
              <span className="min-w-0 text-center">{t('book.addToCart')}</span>
            </button>
            {/* Buy Now is the main action: twice the width of Cart. */}
            <CtaButton onActivate={handleBuyNow} disabled={!isAvailable} className="h-12 min-w-0 flex-[2] rounded-2xl">
              {t('book.buyNow')}
            </CtaButton>
          </div>
        </div>
      )}

      {head.cover_image_url && (
        <ImageLightbox
          open={coverOpen}
          onClose={() => setCoverOpen(false)}
          src={head.cover_image_url}
          alt={head.title}
          closeLabel={t('common.close')}
        />
      )}
      <LoginModal
        open={loginOpen}
        onClose={closeLogin}
        onSignedIn={() => setLoginOpen(false)}
        returnPath={`/bookstore/books/${head.id}`}
        message={t('book.signInToFavorite')}
      />
    </div>
  )
}

/** Long text folded to a few lines, with a fade and a Read more button (when it is long enough to need them). */
function Collapsible({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [long, setLong] = useState(false)

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => setLong(element.scrollHeight > FOLDED_PX + 32)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [children])

  const folded = long && !open
  return (
    <>
      <div className="relative">
        <div ref={ref} className="overflow-hidden" style={folded ? { maxHeight: FOLDED_PX } : undefined}>{children}</div>
        {folded && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent dark:from-gray-900" />}
      </div>
      {long && (
        <button
          type="button"
          onClick={() => setOpen(value => !value)}
          aria-expanded={open}
          className="mt-2 text-sm font-bold text-primary-700 transition hover:underline dark:text-primary-300"
        >
          {open ? t('book.showLess') : t('book.readMore')}
        </button>
      )}
    </>
  )
}

/** The sheet's lower half while the book's own data is still loading (the cover and title are already there). */
function SheetSkeleton() {
  return (
    <Busy className="mt-5 space-y-4">
      <Skeleton className="h-16 w-full rounded-2xl" />
      <TextSkeleton lines={5} />
    </Busy>
  )
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-gray-100 bg-gray-50 px-2 py-2.5 text-center dark:border-gray-800 dark:bg-gray-800/50">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-0.5 truncate text-xs font-bold text-gray-800 dark:text-gray-100" title={value}>{value}</p>
    </div>
  )
}
