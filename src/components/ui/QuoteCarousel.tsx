import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { cn } from '@/lib/utils'

interface QuoteRow {
  id: string
  text: string
  text_lo: string | null
  author: string | null
  source: string | null
  category: string
  display_date: string | null
  sort_weight: number
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr]
  let s = seed
  for (let i = a.length - 1; i > 0; i--) {
    s = ((s * 1664525) + 1013904223) | 0
    const j = Math.abs(s) % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickDailyQuotes(all: QuoteRow[], targetCount = 8): QuoteRow[] {
  if (!all.length) return []
  const today = new Date()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  const todayMD = `${mm}-${dd}`
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
  const special = all
    .filter(q => q.display_date === todayMD)
    .sort((a, b) => b.sort_weight - a.sort_weight)
  const general = seededShuffle(all.filter(q => !q.display_date), seed)
  return [...special, ...general].slice(0, Math.max(targetCount, special.length + 2))
}

// ── Internal quote card ────────────────────────────────────────────────────────

function QuoteCard({ q, lang }: { q: QuoteRow; lang: string }) {
  const { t } = useTranslation()
  const isLao = lang === 'lo'
  const displayText = isLao && q.text_lo ? q.text_lo : q.text
  return (
    <figure className="flex min-h-[130px] flex-col rounded-xl border-l-[3px] border-green-400 bg-white px-5 py-4 shadow-sm">
      {q.category === 'special' && (
        <span className="mb-2 inline-flex w-fit items-center rounded-full bg-green-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-700">
          ✦ {t('quotes.specialDay')}
        </span>
      )}
      <blockquote className={cn(
        'flex-1 font-semibold leading-relaxed text-slate-800',
        isLao ? 'text-base' : 'text-sm italic',
      )}>
        {displayText}
      </blockquote>
      <figcaption className="mt-3 text-xs font-semibold text-slate-500">
        — {q.author ?? 'Unknown'}
        {q.source && <span className="ml-1 font-normal text-slate-400">· {q.source}</span>}
      </figcaption>
    </figure>
  )
}

// ── Carousel ──────────────────────────────────────────────────────────────────

interface QuoteCarouselProps {
  className?: string
  /** 0 = even-indexed daily quotes, 1 = odd-indexed daily quotes */
  slot?: 0 | 1
  /** Per-slot quote count (total fetched = targetCount * 2) */
  targetCount?: number
  autoPlayMs?: number
}

export function QuoteCarousel({ className, slot = 0, targetCount = 6, autoPlayMs = 6000 }: QuoteCarouselProps) {
  const { language } = useLanguage()

  const { data: allQuotes = [] } = useQuery({
    queryKey: ['quotes'],
    queryFn: async () => {
      const { data } = await supabase
        .from('quotes')
        .select('id, text, text_lo, author, source, category, display_date, sort_weight')
        .eq('is_active', true)
      return (data ?? []) as QuoteRow[]
    },
    staleTime: 1000 * 60 * 60,
  })

  // All quotes shown regardless of language — text_lo drives the Lao display
  const quotes = useMemo(() => {
    const pool = pickDailyQuotes(allQuotes, targetCount * 2)
    return pool.filter((_, i) => i % 2 === slot)
  }, [allQuotes, targetCount, slot])

  const [idx, setIdx]       = useState(0)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const goTo = useCallback((to: number) => {
    if (quotes.length < 2) return
    setIdx((to + quotes.length) % quotes.length)
  }, [quotes.length])

  const next = useCallback(() => goTo(idx + 1), [goTo, idx])
  const prev = useCallback(() => goTo(idx - 1), [goTo, idx])

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (!paused && quotes.length > 1) {
      timerRef.current = setInterval(next, autoPlayMs)
    }
  }, [paused, next, quotes.length, autoPlayMs])

  useEffect(() => {
    resetTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [resetTimer])

  if (!quotes.length) return null

  return (
    <div
      className={cn('group relative', className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Sliding viewport */}
      <div className="relative overflow-hidden rounded-2xl border border-green-100 bg-[#f0fdf4]">

        {/* Track */}
        <div
          className="flex transition-transform duration-500 ease-in-out will-change-transform"
          style={{ transform: `translateX(-${idx * 100}%)` }}
        >
          {quotes.map(q => (
            <div key={q.id} className="w-full flex-shrink-0 p-3">
              <QuoteCard q={q} lang={language} />
            </div>
          ))}
        </div>

        {/* Dots */}
        {quotes.length > 1 && (
          <div className="flex justify-center gap-1.5 pb-3">
            {quotes.map((_, i) => (
              <button
                key={i}
                onClick={() => { goTo(i); resetTimer() }}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300 focus:outline-none',
                  i === idx ? 'w-6 bg-green-500' : 'w-1.5 bg-green-200 hover:bg-green-300',
                )}
              />
            ))}
          </div>
        )}

        {/* Progress bar */}
        {quotes.length > 1 && !paused && (
          <div
            key={`${idx}-bar`}
            className="absolute bottom-0 left-0 h-0.5 bg-green-400/40"
            style={{ animation: `progress-bar ${autoPlayMs}ms linear forwards` }}
          />
        )}
      </div>

      {/* Arrows — outside overflow clip */}
      {quotes.length > 1 && (
        <>
          <button
            onClick={() => { prev(); resetTimer() }}
            aria-label="Previous"
            className="absolute -left-3 top-1/2 z-10 flex h-8 w-8 -translate-y-5 items-center justify-center rounded-full bg-white shadow-md text-slate-500 opacity-0 transition-opacity duration-200 group-hover:opacity-100 hover:text-green-600 focus:opacity-100 focus:outline-none"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => { next(); resetTimer() }}
            aria-label="Next"
            className="absolute -right-3 top-1/2 z-10 flex h-8 w-8 -translate-y-5 items-center justify-center rounded-full bg-white shadow-md text-slate-500 opacity-0 transition-opacity duration-200 group-hover:opacity-100 hover:text-green-600 focus:opacity-100 focus:outline-none"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  )
}
