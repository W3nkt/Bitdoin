import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  Search, BookOpen, Lightbulb, Quote, Sparkles, Clock, Eye,
  SlidersHorizontal, X, Tag, User, Building2, TrendingUp,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { KnowledgeCategory, KnowledgePost, KnowledgePostType } from '@/types'
import { useLanguage } from '@/context/LanguageContext'
import { cn } from '@/lib/utils'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { BIOGRAPHY_PROFILES, splitBioTitle } from '@/data/biographyProfiles'
import { BioAvatar } from '@/components/ui/BioAvatar'

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<KnowledgePostType, React.ElementType> = {
  article:   BookOpen,
  quote:     Quote,
  tip:       Lightbulb,
  blog:      Sparkles,
  biography: User,
}

const COLOR_MAP: Record<string, string> = {
  amber:  'bg-amber-100 text-amber-800 border-amber-200',
  blue:   'bg-blue-100 text-blue-800 border-blue-200',
  purple: 'bg-purple-100 text-purple-800 border-purple-200',
  green:  'bg-green-100 text-green-800 border-green-200',
  indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  teal:   'bg-teal-100 text-teal-800 border-teal-200',
  rose:   'bg-rose-100 text-rose-800 border-rose-200',
}

const TYPE_COLOR: Record<KnowledgePostType, string> = {
  article:   'bg-blue-50 text-blue-700 border-blue-200',
  quote:     'bg-amber-50 text-amber-700 border-amber-200',
  tip:       'bg-green-50 text-green-700 border-green-200',
  blog:      'bg-purple-50 text-purple-700 border-purple-200',
  biography: 'bg-indigo-50 text-indigo-700 border-indigo-200',
}

const SIDEBAR_TYPES: { key: string; tKey: string; icon: React.ElementType }[] = [
  { key: 'all',       tKey: 'knowledge.allTypes',    icon: Sparkles },
  { key: 'biography', tKey: 'knowledge.biographies', icon: User },
  { key: 'article',   tKey: 'knowledge.articles',    icon: BookOpen },
  { key: 'quote',     tKey: 'knowledge.quotes',      icon: Quote },
  { key: 'tip',       tKey: 'knowledge.tips',        icon: Lightbulb },
  { key: 'blog',      tKey: 'knowledge.blogs',       icon: Sparkles },
]

function estimateReadTime(text: string): number {
  return Math.max(1, Math.ceil(text.split(/\s+/).length / 200))
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function Knowledge() {
  const { t } = useTranslation()
  const { language } = useLanguage()

  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedType, setSelectedType]         = useState<string>('all')
  const [search, setSearch]                     = useState('')
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)

  const { data: categories = [], isLoading: loadingCats } = useQuery({
    queryKey: ['knowledge-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_categories')
        .select('*')
        .order('sort_order')
      if (error) throw error
      return (data ?? []) as KnowledgeCategory[]
    },
  })

  const { data: posts = [], isLoading: loadingPosts } = useQuery({
    queryKey: ['knowledge-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_posts')
        .select('*, category:knowledge_categories(*)')
        .eq('is_published', true)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as KnowledgePost[]
    },
  })

  const filtered = useMemo(() => {
    let list = posts
    if (selectedCategory !== 'all') list = list.filter(p => p.category_id === selectedCategory)
    if (selectedType !== 'all')     list = list.filter(p => p.type === selectedType)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.title_en.toLowerCase().includes(q) ||
        (p.title_lo ?? '').toLowerCase().includes(q) ||
        p.content_en.toLowerCase().includes(q) ||
        p.author.toLowerCase().includes(q),
      )
    }
    return list
  }, [posts, selectedCategory, selectedType, search])

  const featured = useMemo(() => posts.filter(p => p.is_featured).slice(0, 3), [posts])

  const isFiltering = selectedCategory !== 'all' || selectedType !== 'all' || !!search.trim()

  return (
    <div className="pb-8">

      {/* ── Hero ── */}
      <section className="relative -mx-4 -mt-4 overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 px-4 py-10 text-white mb-0">
        <div className="absolute inset-0 opacity-10 pointer-events-none select-none">
          {['📚', '💡', '✨', '🔥', '📖', '🌍', '👤', '🚀', '💎', '🎯', '🌟', '📝'].map((emoji, i) => (
            <span key={i} className="absolute text-5xl" style={{
              top:       `${10 + (i * 17) % 80}%`,
              left:      `${5  + (i * 23) % 90}%`,
              transform: `rotate(${(i % 5) * 15 - 30}deg)`,
              opacity:   0.4,
            }}>
              {emoji}
            </span>
          ))}
        </div>
        <div className="relative max-w-2xl">
          <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-primary-300">
            {t('knowledge.title')}
          </p>
          <h1 className="mb-2 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            ຄັງຄວາມຮູ້
          </h1>
          <p className="text-base text-primary-200 sm:text-lg">
            {t('knowledge.tagline')}
          </p>
        </div>
      </section>

      {/* ── Sidebar + Content Grid ── */}
      <div className="-mx-4 grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)]">

        {/* Sidebar */}
        {!loadingCats && (
          <KnowledgeSidebar
            categories={categories}
            selectedCategory={selectedCategory}
            selectedType={selectedType}
            onSelectCategory={id => { setSelectedCategory(id); setMobileFilterOpen(false) }}
            onSelectType={t => { setSelectedType(t); setMobileFilterOpen(false) }}
            language={language}
            mobileOpen={mobileFilterOpen}
            onMobileClose={() => setMobileFilterOpen(false)}
          />
        )}

        {/* Main content */}
        <div className="min-w-0 px-4 py-5 lg:px-6">

          {/* Search + mobile filter button */}
          <div className="mb-5 flex gap-2">
            <button
              onClick={() => setMobileFilterOpen(true)}
              className="lg:hidden flex h-10 flex-shrink-0 items-center gap-1.5 rounded border border-slate-200 bg-white px-3 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="text-xs font-medium">{t('knowledge.filterLabel')}</span>
              {isFiltering && <span className="h-2 w-2 rounded-full bg-accent-500" />}
            </button>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('knowledge.searchPlaceholder')}
                className="h-10 w-full rounded border border-slate-200 bg-white pl-9 pr-9 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary-400 focus:outline-none"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Result count when filtering */}
          {isFiltering && (
            <p className="mb-4 text-xs text-gray-500">
              {filtered.length} {filtered.length === 1 ? t('knowledge.result') : t('knowledge.results')}
              {' '}
              <button
                onClick={() => { setSelectedCategory('all'); setSelectedType('all'); setSearch('') }}
                className="ml-1 text-primary-600 hover:underline"
              >
                {t('knowledge.clearFilters')}
              </button>
            </p>
          )}

          {/* Featured Spotlight */}
          {!isFiltering && featured.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-800">
                <Sparkles className="h-4 w-4 text-amber-500" />
                {t('knowledge.featured')}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map(post => (
                  <PostCard key={post.id} post={post} featured />
                ))}
              </div>
            </section>
          )}

          {/* All Posts */}
          {loadingPosts ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center text-gray-400">
              <BookOpen className="h-12 w-12 opacity-30" />
              <p>{t('knowledge.noPostsFound')}</p>
            </div>
          ) : (
            <>
              {isFiltering && (
                <h2 className="mb-4 text-sm font-bold text-gray-700">
                  {t(SIDEBAR_TYPES.find(s => s.key === selectedType)?.tKey ?? 'knowledge.allTypes')}
                  {selectedCategory !== 'all' && categories.find(c => c.id === selectedCategory)
                    ? ` · ${language === 'lo'
                        ? categories.find(c => c.id === selectedCategory)?.name_lo
                        : categories.find(c => c.id === selectedCategory)?.name_en}`
                    : ''}
                </h2>
              )}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map(post => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

interface KnowledgeSidebarProps {
  categories:       KnowledgeCategory[]
  selectedCategory: string
  selectedType:     string
  onSelectCategory: (id: string) => void
  onSelectType:     (type: string) => void
  language:         string
  mobileOpen?:      boolean
  onMobileClose?:   () => void
}

function KnowledgeSidebar({
  categories, selectedCategory, selectedType,
  onSelectCategory, onSelectType, language,
  mobileOpen, onMobileClose,
}: KnowledgeSidebarProps) {
  const { t } = useTranslation()

  const body = (
    <div className="space-y-5 p-4">

      {/* Type filter */}
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-white/45">
          {t('knowledge.contentType')}
        </p>
        <div className="space-y-0.5">
          {SIDEBAR_TYPES.map(({ key, tKey, icon: Icon }) => (
            <button
              key={key}
              onClick={() => onSelectType(key)}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-2 py-2.5 text-left text-xs font-medium transition-colors',
                selectedType === key
                  ? 'bg-white text-[#30343a] font-semibold'
                  : 'text-white/80 hover:bg-white/10 hover:text-white',
              )}
            >
              <Icon className="h-3.5 w-3.5 flex-shrink-0" />
              {t(tKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Category filter */}
      <div className="border-t border-white/10 pt-4">
        <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-white/45">
          <Tag className="h-3 w-3" />
          {t('knowledge.allCategories', 'Category')}
        </p>
        <div className="space-y-0.5">
          <button
            onClick={() => onSelectCategory('all')}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg px-2 py-2.5 text-left text-xs transition-colors',
              selectedCategory === 'all'
                ? 'bg-accent-500 text-white font-semibold'
                : 'text-white/75 hover:bg-white/10 hover:text-white',
            )}
          >
            <Sparkles className="h-3 w-3 flex-shrink-0 text-accent-400" />
            {t('knowledge.allCategories', 'All Categories')}
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={cn(
                'flex w-full items-center gap-1.5 rounded-lg px-2 py-2.5 text-left text-xs transition-colors',
                selectedCategory === cat.id
                  ? 'bg-accent-500 text-white font-semibold'
                  : 'text-white/75 hover:bg-white/10 hover:text-white',
              )}
            >
              <span className="flex-shrink-0">{cat.icon}</span>
              <span className="truncate">
                {language === 'lo' ? cat.name_lo : cat.name_en}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 lg:hidden',
          mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        onClick={onMobileClose}
      />

      {/* Mobile drawer */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 bg-[#30343a] text-white transition-transform duration-300 ease-in-out lg:hidden',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
      )}>
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3.5">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-accent-400" />
            <span className="text-sm font-semibold">{t('knowledge.filterLabel')}</span>
          </div>
          <button
            onClick={onMobileClose}
            className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="h-[calc(100%-3.5rem)] overflow-y-auto pb-8 scrollbar-hide">
          {body}
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block bg-[#30343a] text-white lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:overflow-y-auto scrollbar-hide">
        {body}
      </aside>
    </>
  )
}

// ── Biography Card ────────────────────────────────────────────────────────────

function BiographyCard({ post, featured: isFeatured }: { post: KnowledgePost; featured?: boolean }) {
  const { language } = useLanguage()
  const { t } = useTranslation()

  const slug    = post.tags?.[0] ?? ''
  const profile = BIOGRAPHY_PROFILES[slug]

  const rawTitle           = language === 'lo' && post.title_lo ? post.title_lo : post.title_en
  const [personName]       = splitBioTitle(rawTitle)
  const excerpt            = language === 'lo' && post.excerpt_lo ? post.excerpt_lo : (post.excerpt_en ?? '')

  const gradStyle = profile
    ? { background: `linear-gradient(135deg, ${profile.gradient[0]} 0%, ${profile.gradient[1]} 100%)` }
    : { background: 'linear-gradient(135deg, #312e81 0%, #4338ca 100%)' }

  return (
    <Link
      to={`/knowledge/${post.id}`}
      className={cn(
        'group flex flex-col overflow-hidden rounded-2xl border bg-white transition-all hover:-translate-y-0.5 hover:shadow-lg',
        isFeatured ? 'border-indigo-200' : 'border-gray-100 hover:border-indigo-200',
      )}
    >
      {/* Gradient header */}
      <div className="relative h-20 flex-shrink-0" style={gradStyle}>
        {/* Decorative glows */}
        <div className="absolute inset-0 opacity-20 pointer-events-none select-none overflow-hidden">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
          <div className="absolute -left-2 bottom-0 h-12 w-12 rounded-full bg-white/5" />
        </div>
        {/* Avatar */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
          <BioAvatar profile={profile} personName={personName} size="md" className="ring-4 ring-white shadow-xl" />
        </div>
      </div>

      <div className="flex flex-1 flex-col px-4 pb-4 pt-8">
        {/* Name */}
        <h3 className="text-center text-sm font-black text-gray-900 group-hover:text-indigo-700 transition-colors">
          {personName}
        </h3>

        {/* Company + industry chips */}
        {profile && (
          <div className="mt-2 flex flex-wrap justify-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">
              <Building2 className="h-2.5 w-2.5" />
              {profile.company.split(' · ')[0]}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
              <TrendingUp className="h-2.5 w-2.5" />
              {profile.netWorth}
            </span>
          </div>
        )}

        {/* Excerpt */}
        {excerpt && (
          <p className="mt-3 flex-1 text-xs leading-relaxed text-gray-500 line-clamp-2">
            {excerpt}
          </p>
        )}

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between text-[10px] text-gray-400 border-t border-gray-50 pt-3">
          <span className="font-medium text-indigo-400">
            {language === 'lo' ? 'ຊີວະປະຫວັດ' : 'Biography'}
          </span>
          <div className="flex items-center gap-2">
            {profile && (
              <span>{language === 'lo' ? profile.nationality_lo : profile.nationality}</span>
            )}
            {post.views > 0 && (
              <span className="flex items-center gap-0.5">
                <Eye className="h-2.5 w-2.5" />
                {post.views}
              </span>
            )}
            {post.is_featured && (
              <span title={t('knowledge.featured')}>⭐</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

// ── Post Card ─────────────────────────────────────────────────────────────────

interface PostCardProps {
  post:      KnowledgePost
  featured?: boolean
}

function PostCard({ post, featured: isFeatured }: PostCardProps) {
  const { t } = useTranslation()
  const { language } = useLanguage()

  const title   = language === 'lo' && post.title_lo   ? post.title_lo   : post.title_en
  const excerpt = language === 'lo' && post.excerpt_lo ? post.excerpt_lo : (post.excerpt_en ?? '')
  const content = language === 'lo' && post.content_lo ? post.content_lo : post.content_en

  const TypeIcon = TYPE_ICONS[post.type]
  const catColor  = post.category ? (COLOR_MAP[post.category.color] ?? COLOR_MAP.blue) : COLOR_MAP.blue
  const typeColor = TYPE_COLOR[post.type]
  const readTime  = estimateReadTime(post.content_en)

  if (post.type === 'biography') return <BiographyCard post={post} featured={isFeatured} />

  if (post.type === 'quote') {
    return (
      <Link
        to={`/knowledge/${post.id}`}
        className={cn(
          'group relative flex flex-col justify-between rounded-2xl border p-6 transition-all hover:-translate-y-0.5 hover:shadow-md',
          isFeatured
            ? 'border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50'
            : 'border-gray-100 bg-white hover:border-amber-200',
        )}
      >
        {post.category && (
          <span className={cn('mb-3 inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-semibold', catColor)}>
            {post.category.icon} {language === 'lo' ? post.category.name_lo : post.category.name_en}
          </span>
        )}
        <blockquote className="relative">
          <span className="absolute -left-1 -top-2 text-5xl leading-none text-amber-300 select-none">"</span>
          <p className="pl-5 text-sm font-medium italic leading-relaxed text-gray-700 line-clamp-4">
            {content}
          </p>
          <span className="absolute -bottom-4 right-0 text-5xl leading-none text-amber-300 select-none">"</span>
        </blockquote>
        <p className="mt-6 text-xs font-semibold text-gray-500">— {post.author}</p>
      </Link>
    )
  }

  return (
    <Link
      to={`/knowledge/${post.id}`}
      className={cn(
        'group flex flex-col rounded-2xl border bg-white transition-all hover:-translate-y-0.5 hover:shadow-md',
        isFeatured ? 'border-primary-200' : 'border-gray-100 hover:border-primary-200',
      )}
    >
      {/* Accent top bar — colour varies by type */}
      <div className={cn(
        'h-1.5 w-full rounded-t-2xl',
        post.type === 'tip'  ? 'bg-green-400'  :
        post.type === 'blog' ? 'bg-purple-400' :
        'bg-primary-600',
      )} />

      <div className="flex flex-1 flex-col p-5">
        {/* Badges */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold', typeColor)}>
            <TypeIcon className="h-2.5 w-2.5" />
            {t(`knowledge.${post.type}s` as `knowledge.${typeof post.type}s`, post.type)}
          </span>
          {post.category && (
            <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', catColor)}>
              {post.category.icon} {language === 'lo' ? post.category.name_lo : post.category.name_en}
            </span>
          )}
          {post.is_featured && (
            <span className="rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
              ⭐ {t('knowledge.featured')}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="mb-2 text-sm font-bold leading-snug text-gray-800 line-clamp-2 group-hover:text-primary-700 transition-colors">
          {title}
        </h3>

        {/* Excerpt */}
        {excerpt && (
          <p className="mb-4 flex-1 text-xs leading-relaxed text-gray-500 line-clamp-3">
            {excerpt}
          </p>
        )}

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between gap-2 text-[10px] text-gray-400">
          <span className="truncate font-medium">{post.author}</span>
          <div className="flex flex-shrink-0 items-center gap-2">
            <span className="flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              {readTime} {t('knowledge.minRead')}
            </span>
            {post.views > 0 && (
              <span className="flex items-center gap-0.5">
                <Eye className="h-2.5 w-2.5" />
                {post.views}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
