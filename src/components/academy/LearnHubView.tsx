import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Check, Crown, ListChecks, Play, Target, Trophy, Zap } from 'lucide-react'
import { Reveal } from '@/components/academy/landingVisuals'
import { TopicArt } from '@/components/academy/TopicArt'
import { cn } from '@/lib/utils'
import './learnhub.css'

// The Learning Hub home, built to be scanned: a "continue" banner, then big picture cards, one per topic, with a number
// and a progress bar instead of descriptions. Presentational only; LearningHub.tsx in pages/premium supplies the data.

export type HubTopic = {
  id: string
  slug: string
  name: string
  description: string
  icon: string
  accent: string
  lessons: number
  done: number
  /** Cover images of books in this topic, for the fan on the reading-summaries card. */
  covers: string[]
}

export type HubResume = {
  slug: string
  title: string
  minutes: number
  cover?: string | null
  icon: string
  topic: string
  started: boolean
}

const GRADIENT: Record<string, string> = {
  violet: 'from-violet-500 via-purple-600 to-fuchsia-600',
  emerald: 'from-emerald-400 via-emerald-500 to-teal-600',
  blue: 'from-sky-400 via-blue-500 to-indigo-600',
  amber: 'from-amber-300 via-amber-400 to-orange-500',
  rose: 'from-rose-400 via-rose-500 to-pink-600',
  cyan: 'from-cyan-300 via-cyan-500 to-sky-600',
  indigo: 'from-indigo-400 via-indigo-500 to-violet-600',
  orange: 'from-orange-400 via-orange-500 to-red-500',
}

const GLOW: Record<string, string> = {
  violet: 'hover:shadow-violet-500/40',
  emerald: 'hover:shadow-emerald-500/40',
  blue: 'hover:shadow-blue-500/40',
  amber: 'hover:shadow-amber-500/40',
  rose: 'hover:shadow-rose-500/40',
  cyan: 'hover:shadow-cyan-500/40',
  indigo: 'hover:shadow-indigo-500/40',
  orange: 'hover:shadow-orange-500/40',
}

const cardBase = 'lh-card group relative isolate flex min-h-[210px] flex-col justify-between overflow-hidden rounded-[1.6rem] p-4 text-white shadow-lg ring-1 ring-black/5 transition duration-300 hover:-translate-y-1.5 hover:shadow-2xl active:scale-[.98] dark:ring-white/10 sm:min-h-[260px] sm:p-5'

function ProgressRing({ percent, size = 104 }: { percent: number; size?: number }) {
  const stroke = 9
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.22)" strokeWidth={stroke} />
        <circle
          className="lh-ring-fill"
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#fff" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, Math.max(0, percent) / 100))}
        />
      </svg>
      <span className="absolute text-2xl font-black">{Math.round(percent)}<span className="text-sm">%</span></span>
    </div>
  )
}

function Stat({ icon: Icon, value, label }: { icon: typeof Zap; value: string | number; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-white/15 py-1.5 pl-1.5 pr-3.5 backdrop-blur-sm ring-1 ring-white/20" title={label}>
      <span className="grid h-7 w-7 place-items-center rounded-full bg-white/90 text-violet-700"><Icon className="h-3.5 w-3.5" strokeWidth={3} /></span>
      <span className="text-sm font-black leading-none">{value}</span>
      <span className="sr-only">{label}</span>
    </div>
  )
}

function Hero({ lo, resume, loading, percent, done, total, xp, isPremium }: {
  lo: boolean; resume: HubResume | null; loading: boolean; percent: number; done: number; total: number; xp: number; isPremium: boolean | null
}) {
  const t = (en: string, laos: string) => (lo ? laos : en)
  return (
    <section className="lh-hero relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-5 text-white shadow-xl shadow-violet-900/20 dark:from-indigo-950 dark:via-violet-950 dark:to-gray-900 dark:ring-1 dark:ring-white/10 sm:p-8">
      <span className="lh-orb lh-orb-1 -right-10 -top-16 h-56 w-56 bg-fuchsia-400/40" />
      <span className="lh-orb lh-orb-2 -bottom-20 left-10 h-56 w-56 bg-sky-400/30" />
      <span className="lh-ring" style={{ top: '-40%', right: '-12%', width: '60%' }} />

      {isPremium === false && (
        <Link to="/academy/subscription#plans" className="absolute right-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-amber-300 px-3 py-1.5 text-[11px] font-black text-amber-950 shadow-md transition hover:scale-105 active:scale-95 sm:right-6 sm:top-6">
          <Crown className="h-3.5 w-3.5" strokeWidth={2.5} />{t('Unlock all', 'ປົດລັອກທັງໝົດ')}
        </Link>
      )}

      <div className="relative grid items-center gap-6 sm:grid-cols-[1fr_auto] sm:gap-10">
        <div className="min-w-0 pt-8 sm:pt-0">
          {loading || !resume ? (
            <div className="space-y-3" aria-hidden="true">
              <div className="lh-shimmer h-6 w-28 rounded-full" />
              <div className="lh-shimmer h-10 w-4/5 rounded-xl" />
              <div className="lh-shimmer h-12 w-44 rounded-full" />
            </div>
          ) : (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-black uppercase tracking-wider ring-1 ring-white/25">
                <Play className="h-3 w-3 fill-current" />{resume.started ? t('Continue', 'ຮຽນຕໍ່') : t('Start here', 'ເລີ່ມທີ່ນີ້')}
              </span>
              <h2 className="mt-3 line-clamp-2 text-2xl font-black leading-tight sm:text-4xl">{resume.title}</h2>
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-bold text-white/80">
                <span>{resume.topic}</span><span aria-hidden="true">·</span><span>{resume.minutes} {t('min', 'ນາທີ')}</span>
              </p>
              <Link to={`/academy/lesson/${resume.slug}`} className="mt-5 inline-flex items-center gap-2.5 rounded-full bg-white px-6 py-3.5 text-base font-black text-violet-700 shadow-lg shadow-black/20 transition hover:scale-105 active:scale-95">
                {resume.started ? t('Continue', 'ຮຽນຕໍ່') : t('Start', 'ເລີ່ມຮຽນ')}
                <ArrowRight className="lh-cta-arrow h-5 w-5" strokeWidth={3} />
              </Link>
            </>
          )}
          <div className="mt-6 flex flex-wrap gap-2">
            <Stat icon={Check} value={`${done}/${total || '–'}`} label={t('Lessons done', 'ບົດຮຽນສຳເລັດ')} />
            <Stat icon={Zap} value={`${xp} XP`} label="XP" />
          </div>
        </div>

        <div className="relative mx-auto flex w-full max-w-[210px] items-end justify-center gap-0 sm:mx-0 sm:max-w-[240px]">
          {resume?.cover ? (
            <div className="w-[62%] sm:w-[68%]"><div className="lh-book"><img src={resume.cover} alt="" /></div></div>
          ) : (
            <TopicArt icon={resume?.icon ?? 'book-open'} className="w-[78%] drop-shadow-xl" />
          )}
          <div className="absolute -bottom-3 -right-2 rounded-full bg-violet-800/90 p-1.5 shadow-xl ring-1 ring-white/30 backdrop-blur sm:-right-6">
            <ProgressRing percent={percent} size={92} />
          </div>
        </div>
      </div>
    </section>
  )
}

function TopicCard({ topic, index, lo, wide }: { topic: HubTopic; index: number; lo: boolean; wide?: boolean }) {
  const percent = topic.lessons ? (topic.done / topic.lessons) * 100 : 0
  const finished = topic.lessons > 0 && topic.done >= topic.lessons
  const t = (en: string, laos: string) => (lo ? laos : en)
  const covers = topic.covers.slice(0, 3)
  return (
    <Reveal delay={Math.min(index, 8) * 55} className={cn(wide && 'col-span-2')}>
      <Link
        to={`/academy/learn/${topic.slug}`}
        title={topic.description}
        className={cn(cardBase, 'h-full bg-gradient-to-br', GRADIENT[topic.accent] ?? GRADIENT.indigo, GLOW[topic.accent] ?? GLOW.indigo)}
      >
        <span className="lh-ring" />
        <span className="lh-ring lh-ring-2" />

        {wide && covers.length >= 2 ? (
          <div className="lh-fan" aria-hidden="true">
            {covers.map((src, i) => <span key={i}><img src={src} alt="" loading="lazy" /></span>)}
          </div>
        ) : (
          <div className={cn('lh-art absolute', wide ? 'right-[4%] top-[12%] w-[44%]' : '-right-[3%] top-[12%] w-[64%] sm:top-[17%] sm:w-[74%]')}>
            <TopicArt icon={topic.icon} className="w-full" style={{ '--d': `${(index % 5) * 0.5}s` } as CSSProperties} />
          </div>
        )}

        <div className="relative flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/20 px-2.5 py-1 text-xs font-black backdrop-blur-sm">
            <BookOpen className="h-3.5 w-3.5" strokeWidth={2.5} />{topic.lessons} <span className="font-bold opacity-80">{t('lessons', 'ບົດ')}</span>
          </span>
          {finished && <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-emerald-600 shadow"><Check className="h-4 w-4" strokeWidth={3.5} /></span>}
        </div>

        <div className="relative">
          <h3 className={cn('font-black leading-tight drop-shadow-[0_2px_6px_rgba(0,0,0,.25)]', wide ? 'max-w-[48%] text-xl sm:text-3xl' : 'max-w-full text-base sm:max-w-[78%] sm:text-xl')}>{topic.name}</h3>
          <div className={cn('mt-3 flex items-center gap-3', wide ? 'pr-12' : 'sm:pr-12')}>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/20" role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-white" style={{ width: `${Math.max(percent, topic.done > 0 ? 6 : 0)}%` }} />
            </div>
          </div>
        </div>

        <span className={cn('lh-arrow absolute bottom-4 right-4 hidden h-9 w-9 place-items-center rounded-full bg-white/25 text-white backdrop-blur-sm sm:bottom-5 sm:right-5', !wide && 'sm:grid')}>
          <ArrowRight className="h-[18px] w-[18px]" strokeWidth={3} />
        </span>
      </Link>
    </Reveal>
  )
}

function ToolCard({ to, icon, title, count, index, glow, wide }: { to: string; icon: string; title: string; count?: number; index: number; glow: string; wide?: boolean }) {
  return (
    <Reveal delay={Math.min(index, 8) * 55} className={cn(wide && 'col-span-2')}>
      <Link to={to} className={cn(cardBase, 'h-full bg-gradient-to-br from-slate-800 via-slate-900 to-black dark:from-slate-800 dark:via-gray-900 dark:to-black', glow)}>
        <span className="lh-ring" />
        <div className={cn('lh-art absolute', wide ? 'right-[5%] top-[6%] w-[44%] sm:w-[32%]' : '-right-[3%] top-[12%] w-[64%] sm:top-[17%] sm:w-[74%]')}>
          <TopicArt icon={icon} className="w-full" style={{ '--d': `${(index % 5) * 0.5}s` } as CSSProperties} />
        </div>
        <div className="relative flex items-center justify-between">
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest">Tool</span>
        </div>
        <div className="relative">
          <h3 className={cn('font-black leading-tight', wide ? 'max-w-[50%] text-xl sm:text-3xl' : 'max-w-full text-base sm:max-w-[78%] sm:text-xl')}>{title}</h3>
          {typeof count === 'number' && <p className="mt-1 text-sm font-black text-amber-300">{count}</p>}
        </div>
        <span className={cn('lh-arrow absolute bottom-4 right-4 h-9 w-9 place-items-center rounded-full bg-white/20 text-white sm:bottom-5 sm:right-5 sm:grid', wide ? 'grid' : 'hidden')}>
          <ArrowRight className="h-[18px] w-[18px]" strokeWidth={3} />
        </span>
      </Link>
    </Reveal>
  )
}

function SpaceTile({ to, icon: Icon, label, tint }: { to: string; icon: typeof Target; label: string; tint: string }) {
  return (
    <Link to={to} className="group flex flex-col items-center gap-2.5 rounded-3xl bg-white p-4 text-center shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-lg active:scale-95 dark:bg-gray-900 dark:ring-slate-800">
      <span className={cn('grid h-14 w-14 place-items-center rounded-2xl text-white shadow-md transition group-hover:scale-110 group-hover:-rotate-6', tint)}>
        <Icon className="h-7 w-7" strokeWidth={2.4} />
      </span>
      <span className="text-sm font-black text-slate-800 dark:text-slate-100">{label}</span>
    </Link>
  )
}

export function LearnHubView({ lo, topics, resume, loading, done, total, xp, isPremium, careersCount, promptCount }: {
  lo: boolean
  topics: HubTopic[]
  resume: HubResume | null
  loading: boolean
  done: number
  total: number
  xp: number
  /** null while the membership is still loading. */
  isPremium: boolean | null
  careersCount: number
  promptCount?: number
}) {
  const t = (en: string, laos: string) => (lo ? laos : en)
  const featured = topics.find(topic => topic.slug === 'reading-summaries')
  const others = topics.filter(topic => topic !== featured)
  const percent = total ? (done / total) * 100 : 0

  return (
    <div className="space-y-10 py-6 sm:space-y-12 sm:py-8">
      <Hero lo={lo} resume={resume} loading={loading} percent={percent} done={done} total={total} xp={xp} isPremium={isPremium} />

      <section>
        <h2 className="mb-4 text-2xl font-black sm:text-3xl">{t('Pick a topic', 'ເລືອກຫົວຂໍ້')}</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {loading && topics.length === 0
            ? Array.from({ length: 8 }, (_, i) => <div key={i} className="lh-shimmer min-h-[210px] rounded-[1.6rem] bg-slate-200 dark:bg-slate-800 sm:min-h-[260px]" />)
            : (
              <>
                {featured && <TopicCard topic={featured} index={0} lo={lo} wide />}
                {others.map((topic, i) => <TopicCard key={topic.id} topic={topic} index={i + 1} lo={lo} />)}
                <ToolCard to="/academy/careers" icon="compass" title={t('Career explorer', 'ສຳຫຼວດອາຊີບ')} count={careersCount} index={others.length + 1} glow="hover:shadow-cyan-500/30" />
                <ToolCard to="/academy/prompts" icon="prompt" title="AI Prompts" count={promptCount} index={others.length + 2} glow="hover:shadow-violet-500/30" wide />
              </>
            )}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-black sm:text-3xl">{t('My space', 'ພື້ນທີ່ຂອງຂ້ອຍ')}</h2>
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <SpaceTile to="/academy/challenges" icon={Target} label={t('Challenge', 'ທ້າທາຍ')} tint="bg-gradient-to-br from-orange-400 to-rose-500" />
          <SpaceTile to="/academy/habits" icon={ListChecks} label={t('Habits', 'ນິໄສ')} tint="bg-gradient-to-br from-emerald-400 to-teal-600" />
          <SpaceTile to="/academy/progress" icon={Trophy} label={t('Progress', 'ຄວາມຄືບໜ້າ')} tint="bg-gradient-to-br from-amber-400 to-orange-500" />
        </div>
      </section>
    </div>
  )
}
