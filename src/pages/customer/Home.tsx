import { type FormEvent, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BookOpen, BarChart3, Landmark, Search, ShoppingCart, Smile, Sprout } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { publicAsset } from '@/lib/assets'
import { formatPrice } from '@/lib/utils'
import { flyToCart } from '@/lib/flyToCart'
import type { Book, BookPrice, Category } from '@/types'
import { PushOptInPrompt } from '@/components/notifications/PushOptInPrompt'
import { useCart } from '@/context/CartContext'
import { useLanguage } from '@/context/LanguageContext'
import { useToast } from '@/components/ui/Toast'
import './Home.css'

const interests = [
  { key: 'growth', slugs: ['non-fiction', 'education'], icon: Sprout },
  { key: 'business', slugs: ['business'], icon: BarChart3 },
  { key: 'fiction', slugs: ['fiction'], icon: BookOpen },
  { key: 'lao', language: 'Lao', icon: Landmark },
  { key: 'children', slugs: ['children'], icon: Smile },
] as const

function availablePrice(book: Book): BookPrice | undefined {
  return book.prices?.filter(price => price.availability === 'AVAILABLE' || price.availability === 'LOW_STOCK')
    .sort((a, b) => a.final_price - b.final_price)[0]
}

export function Home() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const { addItem } = useCart()
  const { success } = useToast()

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('id,name_lo,name_en,slug,created_at').order('name_en')
      if (error) throw error
      return (data ?? []) as Category[]
    },
  })

  const featured = useQuery({
    queryKey: ['books', 'featured'],
    queryFn: async () => {
      const { data: ranking, error: rankingError } = await supabase.rpc('get_featured_book_ranking', { p_limit: 12 })
      if (rankingError) throw rankingError
      const rankedIds = ((ranking ?? []) as Array<{ book_id: string }>).map(row => row.book_id)
      if (!rankedIds.length) return []
      const { data, error } = await supabase.from('books')
        .select('*, category:categories(*), prices:book_prices(*, bookstore:bookstores(name))')
        .eq('is_active', true).in('id', rankedIds)
      if (error) throw error
      const booksById = new Map((data ?? []).map(book => [book.id, book as Book]))
      return rankedIds.flatMap(id => {
        const book = booksById.get(id)
        return book ? [book] : []
      })
    },
  })

  const arrivals = useQuery({
    queryKey: ['books', 'trending'],
    queryFn: async () => {
      const { data, error } = await supabase.from('books')
        .select('*, category:categories(*), prices:book_prices(*, bookstore:bookstores(name))')
        .eq('is_active', true).order('created_at', { ascending: false }).limit(12)
      if (error) throw error
      return (data ?? []) as Book[]
    },
  })

  function handleSearch(event: FormEvent) {
    event.preventDefault()
    if (searchQuery.trim()) navigate(`/bookstore/books?q=${encodeURIComponent(searchQuery.trim())}`)
  }

  function handleAddToCart(book: Book) {
    const price = availablePrice(book)
    if (!price) return
    addItem({
      id: `${book.id}-${price.bookstore_id}`, book_id: book.id, bookstore_id: price.bookstore_id,
      quantity: 1, book, bookstore: price.bookstore, unit_price: price.final_price,
      bookstore_price: price.bookstore_price, margin_percent: price.margin_percent,
    })
    success(t('book.addToCart') + ': ' + book.title)
  }

  return (
    <div className="bookstore-home">
      <section className="bookstore-hero" aria-labelledby="bookstore-welcome">
        <img className="bookstore-hero-photo" src={publicAsset('images/bookstore/cozy-hero.webp')} alt="" width="1600" height="720" />
        <div className="bookstore-container bookstore-hero-inner">
          <div className="bookstore-hero-copy">
            <p className="bookstore-eyebrow">{t('home.welcome.eyebrow')}</p>
            <h1 id="bookstore-welcome" className="bookstore-display"><span>{t('home.welcome.title')}</span><span>{t('home.welcome.titleEnd')}</span></h1>
            <p className="bookstore-hero-description">{t('home.welcome.description')}</p>
            <div className="bookstore-hero-actions">
              <Link className="bookstore-primary" to="/bookstore/books"><Search size={19} aria-hidden="true" />{t('home.welcome.discover')}</Link>
              <a className="bookstore-text-link" href="#bookstore-picks">{t('home.welcome.explore')}<ArrowRight size={17} aria-hidden="true" /></a>
            </div>
            <form className="bookstore-mobile-search" role="search" onSubmit={handleSearch}>
              <label htmlFor="bookstore-home-search" className="sr-only">{t('home.searchPlaceholder')}</label>
              <input id="bookstore-home-search" type="search" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder={t('home.searchPlaceholder')} />
              <button type="submit" aria-label={t('common.search')}><Search size={19} aria-hidden="true" /></button>
            </form>
          </div>
        </div>
      </section>

      <nav className="bookstore-interests" aria-label={t('home.categories')}>
        <div className="bookstore-container bookstore-interest-grid">
          {interests.map(interest => {
            const params = new URLSearchParams()
            if ('language' in interest) params.set('language', interest.language)
            else for (const slug of interest.slugs) {
              const category = categories?.find(item => item.slug === slug || item.name_en.toLowerCase().replace(/\s+/g, '-') === slug)
              if (category) params.append('category', category.id)
            }
            const href = `/bookstore/books${params.size ? `?${params}` : ''}`
            return (
              <Link className={`bookstore-interest bookstore-interest-${interest.key}`} key={interest.key} to={href}>
                <span className="bookstore-interest-icon"><interest.icon size={24} strokeWidth={1.7} aria-hidden="true" /></span>
                <span><span className="bookstore-interest-title">{t(`home.welcome.interests.${interest.key}`)}</span><span className="bookstore-interest-note">{t(`home.welcome.interests.${interest.key}Note`)}</span></span>
              </Link>
            )
          })}
        </div>
      </nav>

      <div className="bookstore-container">
        <BookShelf id="bookstore-picks" title={t('home.welcome.picks')} description={t('home.welcome.picksNote')} books={featured.data ?? []} loading={featured.isLoading} failed={featured.isError} retry={() => void featured.refetch()} href="/bookstore/books?sort=featured" onAddToCart={handleAddToCart} />
      </div>
      <section className="bookstore-reading" aria-labelledby="bookstore-reading-title">
        <img src={publicAsset('images/bookstore/reading-moment.webp')} alt="" width="1600" height="512" loading="lazy" />
        <div className="bookstore-container bookstore-reading-inner"><div className="bookstore-reading-copy">
          <h2 id="bookstore-reading-title" className="bookstore-display">{t('home.welcome.readingTitle')}<br />{t('home.welcome.readingEnd')}</h2>
          <Link className="bookstore-text-link" to="/bookstore/knowledge">{t('home.welcome.readingLink')}<ArrowRight size={17} aria-hidden="true" /></Link>
        </div></div>
      </section>
      <div className="bookstore-container">
        <BookShelf id="bookstore-arrivals" title={t('home.welcome.arrivals')} description={t('home.welcome.arrivalsNote')} books={arrivals.data ?? []} loading={arrivals.isLoading} failed={arrivals.isError} retry={() => void arrivals.refetch()} href="/bookstore/books?sort=newest" onAddToCart={handleAddToCart} />
        <PushOptInPrompt platform="BOOKSTORE" lo={i18n.language === 'lo'} className="mb-8" />
        <p className="bookstore-identity">{t('home.welcome.identity')} <Link to="/bookstore/about">{t('nav.about')}<ArrowRight size={13} aria-hidden="true" /></Link></p>
      </div>
    </div>
  )
}

function BookShelf({ id, title, description, books, loading, failed, retry, href, onAddToCart }: {
  id: string; title: string; description: string; books: Book[]; loading: boolean; failed: boolean;
  retry: () => void; href: string; onAddToCart: (book: Book) => void;
}) {
  const { t } = useTranslation()
  return (
    <section className="bookstore-shelf" id={id} aria-labelledby={`${id}-title`} aria-busy={loading}>
      <div className="bookstore-section-heading"><div><h2 id={`${id}-title`} className="bookstore-display">{title}</h2><p>{description}</p></div><Link className="bookstore-text-link" to={href}>{t('home.welcome.viewBooks')}<ArrowRight size={17} aria-hidden="true" /></Link></div>
      {loading ? (
        <div className="bookstore-shelf-grid bookstore-loading" role="status" aria-label={t('common.loading')}>
          {Array.from({ length: 6 }, (_, index) => <div className="bookstore-loading-book" key={index}><div /><span /><span /></div>)}
        </div>
      ) : failed ? (
        <div className="bookstore-shelf-message" role="status"><BookOpen size={28} aria-hidden="true" /><p>{t('home.welcome.loadError')}</p><button className="bookstore-text-link" onClick={retry}>{t('home.welcome.retry')}<ArrowRight size={16} aria-hidden="true" /></button></div>
      ) : books.length === 0 ? (
        <div className="bookstore-shelf-message"><BookOpen size={28} aria-hidden="true" /><p>{t('home.emptyBooks')}</p><Link className="bookstore-text-link" to="/bookstore/books">{t('home.welcome.viewBooks')}<ArrowRight size={16} aria-hidden="true" /></Link></div>
      ) : <div className="bookstore-shelf-grid">{books.slice(0, 6).map(book => <ShelfBook key={book.id} book={book} onAddToCart={onAddToCart} />)}</div>}
    </section>
  )
}

function ShelfBook({ book, onAddToCart }: { book: Book; onAddToCart: (book: Book) => void }) {
  const { t } = useTranslation()
  const { currency } = useLanguage()
  const coverRef = useRef<HTMLDivElement>(null)
  const [failedCover, setFailedCover] = useState(false)
  const offer = availablePrice(book)
  const price = offer?.final_price ?? book.min_price ?? book.prices?.[0]?.final_price
  return (
    <article className="bookstore-book">
      <Link className="bookstore-book-link" to={`/bookstore/books/${book.id}`}>
        <div className="bookstore-cover-stage" ref={coverRef}>
          {book.cover_image_url && !failedCover ? <img className="bookstore-book-cover" src={book.cover_image_url} alt={book.title} loading="lazy" onError={() => setFailedCover(true)} />
            : <div className="bookstore-missing-cover"><BookOpen size={40} strokeWidth={1.3} aria-hidden="true" /><span>{book.title}</span></div>}
        </div>
        <div className="bookstore-book-details"><h3>{book.title}</h3>{book.author && <p className="bookstore-book-author">{book.author}</p>}{price !== undefined && <p className="bookstore-book-price">{formatPrice(price, currency)}</p>}</div>
      </Link>
      <div className="bookstore-book-action">{offer ? <button onClick={() => { onAddToCart(book); void flyToCart(coverRef.current, book.cover_image_url) }} aria-label={`${t('book.addToCart')}: ${book.title}`}><ShoppingCart size={14} aria-hidden="true" />{t('book.addToCart')}</button> : <span>{t('book.outOfStock')}</span>}</div>
    </article>
  )
}
