import { useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  ArrowLeft, ChevronLeft, ChevronRight, Clock, Eye, Tag, Quote, BookOpen, Lightbulb, Sparkles,
  User, MapPin, Calendar, TrendingUp, Building2, Globe, Star,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { KnowledgePost, KnowledgePostType } from '@/types'
import { useLanguage } from '@/context/LanguageContext'
import { cn } from '@/lib/utils'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { BIOGRAPHY_PROFILES, splitBioTitle } from '@/data/biographyProfiles'
import { BioAvatar } from '@/components/ui/BioAvatar'

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
}

function estimateReadTime(text: string): number {
  return Math.max(1, Math.ceil(text.split(/\s+/).length / 200))
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>
    }
    return <span key={i}>{part}</span>
  })
}

function RenderedContent({ text, dark }: { text: string; dark?: boolean }) {
  // Normalise Windows \r\n → \n so the split always works regardless of DB line endings
  const blocks = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split(/\n\n+/)
  return (
    <div className={cn('prose prose-sm max-w-none space-y-4 leading-relaxed', dark ? 'text-gray-200' : 'text-gray-700')}>
      {blocks.map((block, i) => {
        const trimmed = block.trim()
        if (!trimmed) return null
        if (trimmed.startsWith('## ')) {
          return (
            <h2 key={i} className={cn('mt-6 text-lg font-bold', dark ? 'text-white' : 'text-gray-900')}>
              {trimmed.slice(3)}
            </h2>
          )
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h1 key={i} className={cn('mt-6 text-xl font-bold', dark ? 'text-white' : 'text-gray-900')}>
              {trimmed.slice(2)}
            </h1>
          )
        }
        const lines  = trimmed.split('\n')
        const isList = lines.every(l => /^[-*•]|\d+\./.test(l.trim()))
        if (isList && lines.length > 1) {
          return (
            <ul key={i} className="ml-5 list-disc space-y-1.5 text-sm">
              {lines.map((line, j) => (
                <li key={j}>{renderInline(line.replace(/^[-*•]|\d+\./, '').trim())}</li>
              ))}
            </ul>
          )
        }
        return (
          <p key={i} className="text-sm leading-7">
            {trimmed.split('\n').map((line, j) => (
              <span key={j}>
                {renderInline(line)}
                {j < trimmed.split('\n').length - 1 && <br />}
              </span>
            ))}
          </p>
        )
      })}
    </div>
  )
}

// ── Prev/Next Navigation ──────────────────────────────────────────────────────

// Mirrors the same ordering + filters as the Knowledge Hub list (Knowledge.tsx),
// including the active category/type/search filters persisted in sessionStorage,
// so Next/Previous step through whatever list the user was actually browsing.
function useAdjacentPosts(currentId: string) {
  const { data: posts = [] } = useQuery({
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

  return useMemo(() => {
    const selectedCategory = sessionStorage.getItem('kh_cat') ?? 'all'
    const selectedType     = sessionStorage.getItem('kh_type') ?? 'all'
    const search           = sessionStorage.getItem('kh_q') ?? ''

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

    const index = list.findIndex(p => p.id === currentId)
    return {
      previous: index > 0 ? list[index - 1] : null,
      next: index >= 0 && index < list.length - 1 ? list[index + 1] : null,
    }
  }, [posts, currentId])
}

function NavArrowButton({ post, direction }: { post: KnowledgePost | null; direction: 'prev' | 'next' }) {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const Icon  = direction === 'prev' ? ChevronLeft : ChevronRight
  const label = t(direction === 'prev' ? 'knowledge.previousPost' : 'knowledge.nextPost')

  if (!post) {
    return <span className="h-8 w-8 flex-shrink-0" aria-hidden="true" />
  }

  const title = language === 'lo' && post.title_lo ? post.title_lo : post.title_en

  return (
    <Link
      to={`/knowledge/${post.id}`}
      aria-label={`${label}: ${title}`}
      title={title}
      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm hover:border-primary-300 hover:text-primary-600 transition-colors"
    >
      <Icon className="h-4 w-4" />
    </Link>
  )
}

function DetailNavHeader({ post }: { post: KnowledgePost }) {
  const { t } = useTranslation()
  const { previous, next } = useAdjacentPosts(post.id)

  return (
    <div className="mb-5 flex items-center justify-between gap-2">
      <NavArrowButton post={previous} direction="prev" />
      <Link
        to="/knowledge"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-700 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t('knowledge.backToHub')}
      </Link>
      <NavArrowButton post={next} direction="next" />
    </div>
  )
}

// ── Biography Detail Layout ───────────────────────────────────────────────────

function BiographyDetail({ post }: { post: KnowledgePost }) {
  const { language } = useLanguage()
  const { t } = useTranslation()

  const slug    = post.tags?.[0] ?? ''
  const profile = BIOGRAPHY_PROFILES[slug]

  const rawTitle = language === 'lo' && post.title_lo ? post.title_lo : post.title_en
  const [personName, tagline] = splitBioTitle(rawTitle)
  const content   = language === 'lo' && post.content_lo ? post.content_lo : post.content_en
  const readTime  = estimateReadTime(post.content_en)

  const gradientStyle = profile
    ? { background: `linear-gradient(135deg, ${profile.gradient[0]} 0%, ${profile.gradient[1]} 100%)` }
    : { background: 'linear-gradient(135deg, #312e81 0%, #4338ca 100%)' }

  const accentColor = profile?.accentColor ?? '#4f46e5'

  return (
    <div className="mx-auto max-w-2xl pb-16">

      <DetailNavHeader post={post} />

      {/* ── Hero Card ─────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl shadow-xl" style={gradientStyle}>

        {/* Top decoration strip */}
        <div className="relative h-2 w-full opacity-60" style={{ background: accentColor }} />

        <div className="px-6 pb-8 pt-10 text-white">
          {/* Avatar */}
          <div className="mb-6 flex justify-center">
            <BioAvatar profile={profile} personName={personName} size="lg" ring />
          </div>

          {/* Name + tagline */}
          <div className="text-center">
            <h1 className="text-3xl font-black tracking-tight text-white drop-shadow-sm sm:text-4xl">
              {personName}
            </h1>
            {tagline && (
              <p className="mt-2 text-sm font-medium italic text-white/70 sm:text-base">
                {tagline}
              </p>
            )}
          </div>

          {/* Identity chips */}
          {profile && (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/85 backdrop-blur-sm">
                <Globe className="h-3 w-3 flex-shrink-0" />
                {language === 'lo' ? profile.nationality_lo : profile.nationality}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/85 backdrop-blur-sm">
                <Calendar className="h-3 w-3 flex-shrink-0" />
                {language === 'lo' ? 'ເກີດ' : 'Born'} {profile.born}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/85 backdrop-blur-sm">
                <TrendingUp className="h-3 w-3 flex-shrink-0" />
                {language === 'lo' ? profile.industry_lo : profile.industry}
              </span>
            </div>
          )}
        </div>

        {/* Stats bar */}
        {profile && (
          <div
            className="grid grid-cols-3 divide-x divide-white/10 border-t border-white/10"
            style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(4px)' }}
          >
            <div className="flex flex-col items-center gap-0.5 px-3 py-4">
              <TrendingUp className="h-4 w-4 text-white/50" />
              <span className="text-base font-black text-white">{profile.netWorth}</span>
              <span className="text-[9px] uppercase tracking-wider text-white/40">
                {language === 'lo' ? 'ຊັບສົມບັດ' : 'Net Worth'}
              </span>
            </div>
            <div className="flex flex-col items-center gap-0.5 px-3 py-4">
              <Building2 className="h-4 w-4 text-white/50" />
              <span className="text-center text-xs font-bold text-white leading-tight">{profile.company}</span>
              <span className="text-[9px] uppercase tracking-wider text-white/40">
                {language === 'lo' ? 'ບໍລິສັດ' : 'Company'}
              </span>
            </div>
            <div className="flex flex-col items-center gap-0.5 px-3 py-4">
              <MapPin className="h-4 w-4 text-white/50" />
              <span className="text-base font-black text-white">{profile.born}</span>
              <span className="text-[9px] uppercase tracking-wider text-white/40">
                {language === 'lo' ? 'ປີເກີດ' : 'Born'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Meta info row ──────────────────────────────────────────────── */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-gray-100 bg-white px-4 py-3 text-xs text-gray-400 shadow-sm">
        <span className="flex items-center gap-1">
          <User className="h-3 w-3" />
          {post.author}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {readTime} {t('knowledge.minRead')}
        </span>
        {post.views > 0 && (
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {post.views + 1} {t('knowledge.views')}
          </span>
        )}
        <span className="ml-auto text-gray-300">
          {new Date(post.created_at).toLocaleDateString(language === 'lo' ? 'lo-LA' : 'en-GB', {
            year: 'numeric', month: 'long', day: 'numeric',
          })}
        </span>
      </div>

      {/* ── Article Content ────────────────────────────────────────────── */}
      <div className="mt-5 rounded-2xl border border-gray-100 bg-white px-6 py-7 shadow-sm sm:px-8">
        <RenderedContent text={content} />
      </div>

      {/* ── Timeline / Roadmap ────────────────────────────────────────── */}
      {profile && profile.timeline.length > 0 && (
        <section className="mt-6 overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-slate-900 to-slate-800 px-6 py-7 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <Star className="h-5 w-5 text-indigo-400" />
            <h2 className="text-base font-black text-white tracking-tight">
              {language === 'lo' ? 'ແຜນທີ່ສູ່ຄວາມສຳເລັດ' : 'Roadmap to Success'}
            </h2>
          </div>

          <div className="relative pl-8">
            {/* Vertical line */}
            <div
              className="absolute left-[11px] top-0 bottom-0 w-0.5 rounded-full"
              style={{ background: `linear-gradient(to bottom, ${accentColor}, transparent)` }}
            />

            <div className="space-y-6">
              {profile.timeline.map((ev, i) => (
                <div key={i} className="relative">
                  {/* Dot */}
                  <div
                    className="absolute -left-8 flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-slate-800"
                    style={{ background: i === 0 ? accentColor : 'rgba(255,255,255,0.08)' }}
                  >
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ background: i === 0 ? 'white' : accentColor }}
                    />
                  </div>

                  {/* Content */}
                  <div className="rounded-xl border border-white/5 bg-white/5 px-4 py-3 backdrop-blur-sm">
                    <span
                      className="mb-1 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black tracking-wide"
                      style={{ background: accentColor + '33', color: accentColor }}
                    >
                      {ev.year}
                    </span>
                    <p className="text-sm font-medium text-white/90">
                      {language === 'lo' ? ev.event_lo : ev.event}
                    </p>
                  </div>
                </div>
              ))}

              {/* End cap */}
              <div className="relative">
                <div
                  className="absolute -left-8 flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-slate-800"
                  style={{ background: accentColor }}
                >
                  <Star className="h-3 w-3 text-white" />
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-xs font-semibold" style={{ color: accentColor }}>
                    {language === 'lo' ? 'ຍັງສືບຕໍ່...' : 'Legacy continues…'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Inspirational Quote ────────────────────────────────────────── */}
      {profile && (
        <div
          className="mt-6 overflow-hidden rounded-2xl shadow-lg"
          style={gradientStyle}
        >
          <div className="px-6 py-8">
            <div className="mb-4 flex justify-center">
              <Quote className="h-8 w-8 text-white/30" />
            </div>
            <p className="text-center text-lg font-semibold italic leading-8 text-white/90 sm:text-xl">
              "{language === 'lo' ? profile.quote_lo : profile.quote}"
            </p>
            <p className="mt-4 text-center text-sm font-bold" style={{ color: accentColor }}>
              — {personName}
            </p>
          </div>
        </div>
      )}

      {/* ── Tags ──────────────────────────────────────────────────────── */}
      {post.tags.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
          <Tag className="h-3.5 w-3.5 text-gray-400" />
          {post.tags.map(tag => (
            <span key={tag} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-500">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* ── Related Biographies ────────────────────────────────────────── */}
      <RelatedBios currentId={post.id} categoryId={post.category_id} />
    </div>
  )
}

function RelatedBios({ currentId, categoryId }: { currentId: string; categoryId: string | null }) {
  const { language } = useLanguage()

  const { data: related = [] } = useQuery({
    queryKey: ['knowledge-related-bio', categoryId, currentId],
    queryFn: async () => {
      const { data } = await supabase
        .from('knowledge_posts')
        .select('*, category:knowledge_categories(*)')
        .eq('is_published', true)
        .eq('type', 'biography')
        .neq('id', currentId)
        .limit(4)
      return (data ?? []) as KnowledgePost[]
    },
    enabled: !!categoryId,
  })

  if (related.length === 0) return null

  return (
    <section className="mt-8">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-800">
        <User className="h-4 w-4 text-indigo-500" />
        {language === 'lo' ? 'ຊີວະປະຫວັດທີ່ກ່ຽວຂ້ອງ' : 'More Biographies'}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {related.map(r => {
          const slug    = r.tags?.[0] ?? ''
          const profile = BIOGRAPHY_PROFILES[slug]
          const rawT    = language === 'lo' && r.title_lo ? r.title_lo : r.title_en
          const [name]  = splitBioTitle(rawT)

          return (
            <Link
              key={r.id}
              to={`/knowledge/${r.id}`}
              className="group flex items-center gap-3 overflow-hidden rounded-xl border border-gray-100 bg-white p-3 hover:border-indigo-200 hover:shadow-md transition-all"
            >
              <BioAvatar profile={profile} personName={name} size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 group-hover:text-indigo-700 transition-colors truncate">
                  {name}
                </p>
                {profile && (
                  <p className="text-[10px] text-gray-400 truncate">
                    {language === 'lo' ? profile.industry_lo : profile.industry}
                  </p>
                )}
              </div>
              <ArrowLeft className="ml-auto h-3.5 w-3.5 flex-shrink-0 rotate-180 text-gray-300 group-hover:text-indigo-400 transition-colors" />
            </Link>
          )
        })}
      </div>
    </section>
  )
}

// ── Standard Post Detail ──────────────────────────────────────────────────────

function StandardDetail({ post }: { post: KnowledgePost }) {
  const { t } = useTranslation()
  const { language } = useLanguage()

  const { data: related = [] } = useQuery({
    queryKey: ['knowledge-related', post.category_id, post.type, post.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('knowledge_posts')
        .select('*, category:knowledge_categories(*)')
        .eq('is_published', true)
        .eq('category_id', post.category_id!)
        .neq('id', post.id)
        .limit(3)
      return (data ?? []) as KnowledgePost[]
    },
    enabled: !!post.category_id,
  })

  const title    = language === 'lo' && post.title_lo   ? post.title_lo   : post.title_en
  const content  = language === 'lo' && post.content_lo ? post.content_lo : post.content_en
  const TypeIcon = TYPE_ICONS[post.type]
  const catColor = post.category ? COLOR_MAP[post.category.color] ?? COLOR_MAP.blue : COLOR_MAP.blue
  const readTime = estimateReadTime(post.content_en)
  const isQuote  = post.type === 'quote'

  return (
    <div className="mx-auto max-w-2xl pb-12">
      <DetailNavHeader post={post} />

      <article className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className={cn(
          'h-2 w-full',
          post.type === 'tip'   ? 'bg-green-400'  :
          post.type === 'blog'  ? 'bg-purple-400' :
          post.type === 'quote' ? 'bg-amber-400'  :
          'bg-primary-600',
        )} />

        <div className="p-6 sm:p-8">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
              <TypeIcon className="h-3 w-3" />
              {t(`knowledge.${post.type}s` as `knowledge.${typeof post.type}s`)}
            </span>
            {post.category && (
              <span className={cn('rounded-full border px-2.5 py-1 text-xs font-semibold', catColor)}>
                {post.category.icon} {language === 'lo' ? post.category.name_lo : post.category.name_en}
              </span>
            )}
          </div>

          <h1 className={cn(
            'mb-4 font-bold leading-tight text-gray-900',
            isQuote ? 'text-2xl italic' : 'text-2xl sm:text-3xl',
          )}>
            {isQuote && <span className="mr-1 text-amber-400">"</span>}
            {title}
            {isQuote && <span className="ml-1 text-amber-400">"</span>}
          </h1>

          <div className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-gray-100 pb-6 text-xs text-gray-400">
            <span className="flex items-center gap-1"><User className="h-3 w-3" />{post.author}</span>
            {!isQuote && (
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{readTime} {t('knowledge.minRead')}</span>
            )}
            {post.views > 0 && (
              <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{post.views + 1} {t('knowledge.views')}</span>
            )}
            <span className="text-gray-300">
              {new Date(post.created_at).toLocaleDateString(language === 'lo' ? 'lo-LA' : 'en-GB', {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            </span>
          </div>

          {isQuote ? (
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-6 text-center">
              <p className="text-lg italic leading-9 text-gray-700 font-medium">{content}</p>
              <p className="mt-4 text-sm font-semibold text-amber-700">— {post.author}</p>
            </div>
          ) : (
            <RenderedContent text={content} />
          )}

          {post.tags.length > 0 && (
            <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-6">
              <Tag className="h-3.5 w-3.5 text-gray-400" />
              {post.tags.map(tag => (
                <span key={tag} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-500">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </article>

      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-base font-bold text-gray-800">{t('knowledge.relatedPosts')}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {related.map(r => {
              const rTitle = language === 'lo' && r.title_lo ? r.title_lo : r.title_en
              const RIcon  = TYPE_ICONS[r.type]
              return (
                <Link
                  key={r.id}
                  to={`/knowledge/${r.id}`}
                  className="rounded-xl border border-gray-100 bg-white p-4 hover:border-primary-200 hover:shadow-sm transition-all"
                >
                  <span className="flex items-center gap-1 text-[10px] text-gray-400 mb-1">
                    <RIcon className="h-2.5 w-2.5" />
                    {t(`knowledge.${r.type}s` as `knowledge.${typeof r.type}s`)}
                  </span>
                  <p className="text-sm font-semibold text-gray-700 line-clamp-2">{rTitle}</p>
                  <p className="mt-1 text-[10px] text-gray-400">{r.author}</p>
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

// ── Root Component ────────────────────────────────────────────────────────────

export function KnowledgeDetail() {
  const { id } = useParams<{ id: string }>()

  const { data: post, isLoading } = useQuery({
    queryKey: ['knowledge-post', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_posts')
        .select('*, category:knowledge_categories(*)')
        .eq('id', id!)
        .eq('is_published', true)
        .single()
      if (error) throw error
      return data as KnowledgePost
    },
    enabled: !!id,
  })

  const viewMutation = useMutation({
    mutationFn: async (postId: string) => {
      await supabase.rpc('increment_knowledge_views', { post_id: postId })
    },
  })

  useEffect(() => {
    if (post?.id) viewMutation.mutate(post.id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post?.id])

  if (isLoading) {
    return <div className="flex justify-center py-24"><LoadingSpinner /></div>
  }

  if (!post) {
    return (
      <div className="py-24 text-center text-gray-400">
        <p>Post not found.</p>
        <Link to="/knowledge" className="mt-4 inline-block text-sm text-primary-600 hover:underline">
          Back to Knowledge Hub
        </Link>
      </div>
    )
  }

  if (post.type === 'biography') {
    return <BiographyDetail post={post} />
  }

  return <StandardDetail post={post} />
}
