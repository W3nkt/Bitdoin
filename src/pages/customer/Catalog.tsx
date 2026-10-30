import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ArrowDownUp, LayoutGrid, List, Search, SearchX, SlidersHorizontal, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { searchCatalogBooks } from '@/lib/catalogSearch'
import type { Book, Category, SearchFilters } from '@/types'
import { BrowseSidebar } from '@/components/ui/BrowseSidebar'
import { Skeleton } from '@/components/ui/Skeleton'
import { Pagination } from '@/components/ui/Pagination'
import { CatalogBookCard, CATALOG_LAYOUT, type CatalogView } from '@/components/catalog/CatalogBookCard'
import { CatalogFilterSheet, type AppliedFilters } from '@/components/catalog/CatalogFilterSheet'
import { CatalogSortSheet } from '@/components/catalog/CatalogSortSheet'
import { CatalogSkeleton } from '@/components/catalog/CatalogSkeleton'
import { SORT_OPTIONS, parseSort, type Sort } from '@/components/catalog/catalogSorts'
import { languageLabel } from '@/components/catalog/languageLabel'
import { useCart } from '@/context/CartContext'
import { useToast } from '@/components/ui/Toast'
import { LoginModal } from '@/components/auth/LoginModal'
import { rememberPendingFavorite, useFavoriteBookIds } from '@/hooks/useBookFavorite'
import { cn } from '@/lib/utils'

// Divides evenly into the 2, 3 and 4 columns of the grid and the 2 of the list, so no row is left short.
const PAGE_SIZE = 24
const VIEW_KEY = 'bitdoin_catalog_view'

// Extends a small control's tap area to about 44px without changing how it looks.
const reach = "relative before:absolute before:-inset-x-1.5 before:-inset-y-3 before:content-['']"

function categoryFilters(params: URLSearchParams): Pick<SearchFilters, 'category_id' | 'category_ids'> {
  const ids = [...new Set(params.getAll('category').filter(Boolean))]
  return { category_id: ids.length === 1 ? ids[0] : '', category_ids: ids.length > 1 ? ids : [] }
}

/** The customer's last choice; first visit: rows on phones (room for long Lao and Thai titles), covers on wider screens. */
function readView(): CatalogView {
  try {
    const stored = localStorage.getItem(VIEW_KEY)
    if (stored === 'list' || stored === 'grid') return stored
  } catch {
    // Storage can be blocked; fall through to the default.
  }
  return window.matchMedia?.('(min-width: 768px)').matches ? 'grid' : 'list'
}

export function Catalog() {
  const { t, i18n } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { addItem } = useCart()
  const { success, error: showError } = useToast()
  const favorites = useFavoriteBookIds(() => success(t('book.addedToFavorites')))
  const [loginOpen, setLoginOpen] = useState(false)

  const [filterOpen, setFilterOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [view, setView] = useState<CatalogView>(readView)
  const [atFooter, setAtFooter] = useState(false)
  const resultsRef = useRef<HTMLDivElement>(null)
  const chipsRef = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<SearchFilters>({
    query: searchParams.get('q') ?? '',
    ...categoryFilters(searchParams),
    language: searchParams.get('language') ?? '',
  })
  // An explicit ?sort= means a quick link / sort option was chosen; without
  // it the catalog is "All Books" in the default (best seller) order.
  const explicitSort = searchParams.has('sort') ? parseSort(searchParams.get('sort')) : null
  const sort: Sort = explicitSort ?? 'best'

  // What is typed in the search box, which reaches the URL (and the server) a moment after typing stops.
  const urlQuery = searchParams.get('q') ?? ''
  const [searchText, setSearchText] = useState(urlQuery)

  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      query: searchParams.get('q') ?? '',
      ...categoryFilters(searchParams),
      language: searchParams.get('language') ?? '',
    }))
    setPage(1)
  }, [searchParams])

  // The header search, "clear filters" and the back button change the URL; the box follows. (Not when the URL only
  // caught up with what was typed, or the space after "rich" would vanish before "dad".)
  useEffect(() => { setSearchText(prev => (prev.trim() === urlQuery ? prev : urlQuery)) }, [urlQuery])

  // The floating Filter / Sort bar steps aside when the footer scrolls into view.
  useEffect(() => {
    const footer = document.querySelector('footer[data-bitty-avoid]')
    if (!footer || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(([entry]) => setAtFooter(entry.isIntersecting), { rootMargin: '0px 0px -130px 0px' })
    observer.observe(footer)
    return () => observer.disconnect()
  }, [])

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('id,name_lo,name_en,slug,created_at').order('name_en')
      return (data ?? []) as Category[]
    },
  })

  const { data: availableLanguages = [] } = useQuery({
    queryKey: ['books', 'languages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select('language')
        .eq('is_active', true)
        .not('language', 'is', null)

      if (error) throw error

      const preferredOrder = ['Lao', 'English', 'Thai']
      return [...new Set(
        (data ?? [])
          .map(book => book.language?.trim())
          .filter((language): language is string => !!language),
      )].sort((a, b) => {
        const aIndex = preferredOrder.indexOf(a)
        const bIndex = preferredOrder.indexOf(b)
        if (aIndex !== -1 || bIndex !== -1) {
          if (aIndex === -1) return 1
          if (bIndex === -1) return -1
          return aIndex - bIndex
        }
        return a.localeCompare(b)
      })
    },
  })

  const { data, isLoading } = useQuery({
    queryKey: ['books', 'catalog', filters, sort, page],
    queryFn: async () => {
      const from = (page - 1) * PAGE_SIZE
      return searchCatalogBooks(filters, sort, from, PAGE_SIZE)
    },
  })

  function applyFilters(updated: Partial<SearchFilters>, nextSort: Sort | null = explicitSort, replace = false) {
    const next = { ...filters, ...updated }
    setFilters(next)
    setPage(1)
    const params = new URLSearchParams()
    if (next.query) params.set('q', next.query)
    if (next.category_ids?.length) next.category_ids.forEach(id => params.append('category', id))
    else if (next.category_id) params.set('category', next.category_id)
    if (next.language) params.set('language', next.language)
    if (nextSort) params.set('sort', nextSort)
    setSearchParams(params, { replace })
  }

  // The timer below must call the latest applyFilters, not the one from the render that started typing.
  const applyRef = useRef(applyFilters)
  applyRef.current = applyFilters

  useEffect(() => {
    const typed = searchText.trim()
    if (typed === (filters.query ?? '')) return
    const timer = window.setTimeout(() => applyRef.current({ query: typed }, explicitSort, true), 300)
    return () => window.clearTimeout(timer)
  }, [searchText, filters.query])

  function submitSearch(e: React.FormEvent) {
    e.preventDefault()
    applyFilters({ query: searchText.trim() }, explicitSort, true)
    // Put the keyboard away so the results are visible.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  }

  function clearSearch() {
    setSearchText('')
    applyFilters({ query: '' }, explicitSort, true)
  }

  function setSort(nextSort: Sort) {
    applyFilters({}, nextSort)
  }

  function clearFilters() {
    setFilters({ query: '', category_id: '', category_ids: [], language: '' })
    setSearchParams({})
    setPage(1)
  }

  function changeView(next: CatalogView) {
    setView(next)
    try {
      localStorage.setItem(VIEW_KEY, next)
    } catch {
      // Ignore blocked storage; the choice just won't survive a reload.
    }
  }

  function changePage(next: number) {
    setPage(next)
    resultsRef.current?.scrollIntoView({ block: 'start' })
  }

  function handleAddToCart(book: Book) {
    const price = book.prices?.[0]
    if (!price) return
    addItem({
      id: `${book.id}-${price.bookstore_id}`,
      book_id: book.id,
      bookstore_id: price.bookstore_id,
      quantity: 1,
      book,
      bookstore: price.bookstore,
      unit_price: price.final_price,
      bookstore_price: price.bookstore_price,
      margin_percent: price.margin_percent,
    })
    success(book.title)
  }

  async function handleToggleFavorite(book: Book) {
    if (!favorites.isSignedIn) {
      // Saved automatically once they sign in (see useFavoriteBookIds).
      rememberPendingFavorite(book.id)
      setLoginOpen(true)
      return
    }
    const next = !favorites.isFavorite(book.id)
    try {
      await favorites.setFavorite(book.id, next)
      success(t(next ? 'book.addedToFavorites' : 'book.removedFromFavorites'))
    } catch {
      showError(t('common.error'))
    }
  }

  function closeLogin() {
    rememberPendingFavorite(null)
    setLoginOpen(false)
  }

  function applyFromSheet({ language, categoryIds }: AppliedFilters) {
    applyFilters({
      language,
      category_id: categoryIds.length === 1 ? categoryIds[0] : '',
      category_ids: categoryIds.length > 1 ? categoryIds : [],
    })
  }

  const selectedCategoryIds = filters.category_ids?.length ? filters.category_ids : filters.category_id ? [filters.category_id] : []

  // A category chosen in the filter sheet (or arriving from a link) may sit off-screen in the chip row: scroll it into view.
  const selectedKey = selectedCategoryIds.join(',')
  useEffect(() => {
    const row = chipsRef.current
    const active = row?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (!row || !active) return
    row.scrollTo({ left: active.offsetLeft - (row.clientWidth - active.offsetWidth) / 2, behavior: 'smooth' })
  }, [selectedKey, categories])

  const activeFilterCount = selectedCategoryIds.length + (filters.language ? 1 : 0)
  const hasFilters = !!(filters.query || selectedCategoryIds.length || filters.language || sort === 'featured')
  const sortOption = SORT_OPTIONS.find(option => option.value === sort) ?? SORT_OPTIONS[0]
  const heading = filters.query?.trim() ? t('catalog.resultsFor', { query: filters.query.trim() }) : t(sortOption.labelKey)
  const categoryName = (category: Category) => (i18n.language === 'lo' ? category.name_lo : category.name_en)

  // One category chip selects that category alone (more at once: the filter sheet); tapping the chosen one again clears it.
  function pickCategory(id: string) {
    const alone = selectedCategoryIds.length === 1 && selectedCategoryIds[0] === id
    applyFilters({ category_id: alone ? '' : id, category_ids: [] })
  }

  const chip = (active: boolean) => cn(
    'my-1 mx-[3px] inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-[13px] font-semibold transition-colors',
    active
      ? 'border-primary-700 bg-primary-700 text-white dark:border-primary-600 dark:bg-primary-600'
      : 'border-gray-200 bg-white text-gray-600 hover:border-primary-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300',
  )

  return (
    <div className="-mx-4 -mt-4 grid min-h-[calc(100vh-7rem)] grid-cols-1 lg:grid-cols-[176px_minmax(0,1fr)]">
      <BrowseSidebar
        desktopOnly
        categories={categories}
        activeCategoryId={filters.category_id}
        activeCategoryIds={filters.category_ids}
        activeQuickLink={explicitSort ?? undefined}
        onSelectCategory={categoryId => applyFilters({ category_id: categoryId, category_ids: [] }, categoryId ? explicitSort : null)}
        onSelectQuickLink={value => setSort(parseSort(value))}
        showFilters
        availableLanguages={availableLanguages}
        activeLanguage={filters.language}
        onSelectLanguage={language => applyFilters({ language })}
        className="lg:sticky lg:top-16"
      />

      <div className="min-w-0 pb-28 lg:pb-8">
        {/* Hero: search and the four orderings */}
        <section className="rounded-b-[28px] bg-gradient-to-br from-primary-700 to-primary-900 px-4 pb-3 pt-5 dark:from-primary-800 dark:to-primary-950 sm:px-6 lg:rounded-b-none lg:px-8">
          <p className="text-[11px] font-bold uppercase tracking-widest text-accent-400">{t('catalog.title')}</p>
          <h1 className="mt-1 text-[25px] font-extrabold leading-tight tracking-tight text-white">{t('catalog.heroTitle')}</h1>

          <form role="search" onSubmit={submitSearch} className="mt-4 max-w-2xl">
            <label className="flex h-[54px] items-center gap-2.5 rounded-2xl bg-white pl-4 pr-2 text-gray-400 shadow-xl shadow-black/20 focus-within:ring-2 focus-within:ring-accent-400 dark:bg-gray-900">
              <Search className="h-5 w-5 shrink-0" />
              <input
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                placeholder={t('home.searchPlaceholder')}
                aria-label={t('nav.search')}
                enterKeyHint="search"
                className="min-w-0 flex-1 bg-transparent text-[15px] text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-gray-100"
              />
              {searchText && (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label={t('catalog.clearSearch')}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-gray-400 transition-colors hover:text-gray-700 dark:hover:text-gray-200"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </label>
          </form>

          <div className="-mx-4 mt-2.5 flex overflow-x-auto px-4 scrollbar-hide sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            {SORT_OPTIONS.map(({ value, labelKey, icon: Icon }) => (
              <button
                key={value}
                type="button"
                aria-pressed={sort === value}
                onClick={() => setSort(value)}
                className={cn(
                  'my-1 mr-1.5 flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition-colors',
                  sort === value
                    ? 'border-white bg-white text-primary-700'
                    : 'border-white/25 bg-white/10 text-white hover:bg-white/20',
                )}
              >
                <Icon className="h-[15px] w-[15px]" />
                {t(labelKey)}
              </button>
            ))}
          </div>
        </section>

        <div className="px-4 sm:px-6 lg:px-8">
          {/* Categories (phones and tablets; the sidebar lists them on desktop) */}
          <div ref={chipsRef} className="relative -mx-4 mt-2 flex overflow-x-auto px-[13px] scrollbar-hide sm:-mx-6 sm:px-[21px] lg:hidden">
            {categories ? (
              <>
                <button type="button" aria-pressed={selectedCategoryIds.length === 0} onClick={() => applyFilters({ category_id: '', category_ids: [] })} className={chip(selectedCategoryIds.length === 0)}>
                  {t('common.all')}
                </button>
                {categories.map(category => (
                  <button key={category.id} type="button" aria-pressed={selectedCategoryIds.includes(category.id)} onClick={() => pickCategory(category.id)} className={chip(selectedCategoryIds.includes(category.id))}>
                    {categoryName(category)}
                  </button>
                ))}
              </>
            ) : (
              Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="my-1 mx-[3px] h-9 w-24 shrink-0 rounded-full" />)
            )}
          </div>

          {/* Results header: what is shown, what is filtered, and the list / grid switch */}
          <div ref={resultsRef} className="flex scroll-mt-16 items-start justify-between gap-3 pb-2 pt-3">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-extrabold tracking-tight text-gray-900 dark:text-gray-100">{heading}</h2>
              <div className="mt-0.5 flex min-h-5 flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                {data && <span>{t('catalog.showing', { count: data.count })}</span>}
                {filters.language && (
                  <button
                    type="button"
                    onClick={() => applyFilters({ language: '' })}
                    aria-label={t('catalog.removeFilter', { name: languageLabel(t, filters.language) })}
                    className={cn(reach, 'inline-flex items-center gap-1 rounded-full bg-primary-100 px-2 py-0.5 font-bold text-primary-700 dark:bg-primary-500/15 dark:text-primary-300')}
                  >
                    {languageLabel(t, filters.language)}
                    <X className="h-3 w-3" strokeWidth={3} />
                  </button>
                )}
                {hasFilters && (
                  <button type="button" onClick={clearFilters} className={cn(reach, 'font-bold text-primary-700 hover:underline dark:text-primary-300')}>
                    {t('catalog.clearFilters')}
                  </button>
                )}
              </div>
            </div>

            <div role="group" aria-label={t('catalog.title')} className="flex shrink-0 rounded-xl bg-gray-100 p-[3px] dark:bg-gray-800">
              {(['list', 'grid'] as const).map(option => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={view === option}
                  aria-label={t(option === 'list' ? 'catalog.listView' : 'catalog.gridView')}
                  onClick={() => changeView(option)}
                  className={cn(
                    'flex h-10 w-11 items-center justify-center rounded-[9px] transition-colors',
                    view === option ? 'bg-white text-primary-700 shadow-card dark:bg-gray-700 dark:text-primary-300' : 'text-gray-400 dark:text-gray-500',
                  )}
                >
                  {option === 'list' ? <List className="h-[18px] w-[18px]" /> : <LayoutGrid className="h-[18px] w-[18px]" />}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <CatalogSkeleton view={view} count={PAGE_SIZE} />
          ) : data?.data.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 text-primary-700 dark:bg-gray-800 dark:text-primary-300">
                <SearchX className="h-7 w-7" />
              </div>
              <p className="mt-4 max-w-xs text-sm text-gray-500 dark:text-gray-400">{t('catalog.noResults')}</p>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 h-11 rounded-xl bg-primary-700 px-5 text-sm font-bold text-white transition-colors hover:bg-primary-800 dark:bg-primary-600 dark:hover:bg-primary-500"
                >
                  {t('catalog.clearFilters')}
                </button>
              )}
            </div>
          ) : (
            <div className={CATALOG_LAYOUT[view]}>
              {data?.data.map(book => (
                <CatalogBookCard
                  key={book.id}
                  book={book}
                  view={view}
                  favorite={favorites.isFavorite(book.id)}
                  onToggleFavorite={handleToggleFavorite}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          )}

          {data && data.count > PAGE_SIZE && (
            <div className="mt-8">
              <Pagination page={page} pageSize={PAGE_SIZE} total={data.count} onChange={changePage} />
            </div>
          )}
        </div>
      </div>

      {/* Filter / Sort within thumb reach, above the tab bar (phones and tablets) */}
      <div
        data-bitty-avoid
        className={cn(
          'pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+var(--safe-bottom))] z-20 flex justify-center transition-all duration-200 md:bottom-6 lg:hidden',
          atFooter && 'translate-y-3 opacity-0',
        )}
      >
        <div
          role="toolbar"
          aria-label={`${t('catalog.filters')} / ${t('catalog.sortBy')}`}
          className={cn('flex h-[52px] items-center rounded-full bg-primary-700 px-1.5 text-white shadow-xl shadow-black/35 dark:bg-primary-600', atFooter ? 'pointer-events-none' : 'pointer-events-auto')}
        >
          <button type="button" onClick={() => setFilterOpen(true)} className="flex h-12 items-center gap-2 rounded-full pl-3.5 pr-4 text-sm font-bold active:bg-white/10">
            <SlidersHorizontal className="h-[18px] w-[18px]" />
            {t('catalog.filter')}
            {activeFilterCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-500 px-1 text-[11px] font-bold text-gray-900">{activeFilterCount}</span>
            )}
          </button>
          <span className="h-6 w-px bg-white/30" aria-hidden="true" />
          <button type="button" onClick={() => setSortOpen(true)} className="flex h-12 items-center gap-2 rounded-full pl-3.5 pr-4 text-sm font-bold active:bg-white/10">
            <ArrowDownUp className="h-[18px] w-[18px]" />
            {t(sortOption.labelKey)}
          </button>
        </div>
      </div>

      <CatalogFilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        categories={categories}
        languages={availableLanguages}
        applied={{ language: filters.language ?? '', categoryIds: selectedCategoryIds }}
        query={filters.query ?? ''}
        sort={sort}
        onApply={applyFromSheet}
      />
      <CatalogSortSheet open={sortOpen} onClose={() => setSortOpen(false)} sort={sort} onSelect={setSort} />

      <LoginModal
        open={loginOpen}
        onClose={closeLogin}
        onSignedIn={() => setLoginOpen(false)}
        returnPath="/bookstore/books"
        message={t('book.signInToFavorite')}
      />
    </div>
  )
}
