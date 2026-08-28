import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, BookOpen, BriefcaseBusiness, Check, ChevronRight,
  CircleDollarSign, Copy, Flame, GraduationCap, Languages, Lightbulb, ListChecks,
  Loader2, LockKeyhole, Plus, Sparkles, Target, Timer, Trash2, Trophy, WalletCards,
} from 'lucide-react'
import { BookSummaryReader } from '@/components/premium/BookSummaryReader'
import { PremiumProfileMenu } from '@/components/premium/ProfileMenu'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { supabase } from '@/lib/supabase'
import { firstRelation } from '@/lib/supabaseRelations'
import { cn } from '@/lib/utils'

// Legacy sections carry a single "body" string. Full-depth summaries instead
// use an ordered "blocks" list, so a section can mix paragraphs, bullet
// lists, subheadings, and inline definition boxes in any order.
type LessonListItem = { label?: string; body: string }
type LessonBlock =
  | { type: 'p'; text: string }
  | { type: 'h4'; text: string }
  | { type: 'list'; items: LessonListItem[] }
  | { type: 'term'; term: string; body: string }
type LessonSection = {
  heading: string
  body?: string
  blocks?: LessonBlock[]
  oneline?: string
}
type GlossaryTerm = { term: string; body: string }
type Category = {
  id: string; slug: string; name_en: string; name_lo: string
  description_en: string; description_lo: string; icon: string; accent: string
}
type BookRef = { id: string; title: string; author: string | null; cover_image_url: string | null }
type Lesson = {
  id: string; category_id: string; slug: string; title_en: string; title_lo: string
  summary_en: string; summary_lo: string; deck_en?: string | null; deck_lo?: string | null
  content_en: LessonSection[]; content_lo: LessonSection[]
  glossary_en: GlossaryTerm[]; glossary_lo: GlossaryTerm[]
  reflection_questions_en: string[]; reflection_questions_lo: string[]
  key_takeaways_en: string[]; key_takeaways_lo: string[]; difficulty: string
  estimated_minutes: number; lesson_type: string; source_url?: string | null
  source_verified_at?: string | null; application_deadline?: string | null
  category?: Category; book_id?: string | null; book?: BookRef | null
}
type Progress = { lesson_id: string; progress_percent: number; quiz_score?: number | null; completed_at?: string | null }
type QuizQuestion = {
  id: string; prompt_en: string; prompt_lo: string; options_en: string[]; options_lo: string[]
  correct_index: number; explanation_en: string; explanation_lo: string
}
type WeeklyChallenge = {
  id: string; title_en: string; title_lo: string; description_en: string; description_lo: string
  steps_en: string[]; steps_lo: string[]; starts_on: string; ends_on: string; points: number
}
type WeeklyProgress = { challenge_id: string; completed_steps: number[]; reflection?: string | null; completed_at?: string | null }
type Habit = { id: string; name: string; category_slug: string; frequency: string; reminder_time?: string | null }
type HabitCheckin = { habit_id: string; checkin_date: string }
type CategoryUnlock = { category_id: string; start_date: string }
type ActiveDay = { active_date: string }
type LibraryPrompt = {
  id: string; category: string; title_en: string; title_lo: string
  description_en: string; description_lo: string; prompt_en: string; prompt_lo: string
}

const iconMap = {
  'book-open': BookOpen, wallet: WalletCards, sparkles: Sparkles, languages: Languages,
  timer: Timer, briefcase: BriefcaseBusiness, 'graduation-cap': GraduationCap, lightbulb: Lightbulb,
}
const accents: Record<string, string> = {
  violet: 'bg-violet-50 text-violet-700', emerald: 'bg-emerald-50 text-emerald-700',
  blue: 'bg-blue-50 text-blue-700', amber: 'bg-amber-50 text-amber-700',
  rose: 'bg-rose-50 text-rose-700', cyan: 'bg-cyan-50 text-cyan-700',
  indigo: 'bg-indigo-50 text-indigo-700', orange: 'bg-orange-50 text-orange-700',
}

export function localize(language: 'lo' | 'en', en: string, lo: string) {
  return language === 'lo' ? lo : en
}

function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Vientiane' }).format(new Date())
}

// Counts distinct active days within [startDate, endDate], inclusive, so a
// gap where the account was not active does not get "caught up" later —
// the count only grows on days the account was actually seen active.
function countActiveDaysInRange(startDate: string, endDate: string, activeDates: Set<string>) {
  const start = new Date(`${startDate}T00:00:00Z`).getTime()
  const end = new Date(`${endDate}T00:00:00Z`).getTime()
  let count = 0
  for (let t = start; t <= end; t += 86_400_000) {
    if (activeDates.has(new Date(t).toISOString().slice(0, 10))) count++
  }
  return count
}

// Deterministic per-seed shuffle (FNV-1a hash -> xorshift32) so each user sees
// a stable but different lesson order per category, without storing an explicit order.
function seededShuffle<T>(items: T[], seed: string): T[] {
  let hash = 2166136261
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  let state = hash >>> 0 || 1
  const nextRandom = () => {
    state ^= state << 13; state >>>= 0
    state ^= state >>> 17
    state ^= state << 5; state >>>= 0
    return state / 4294967296
  }
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(nextRandom() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// Free accounts get the first lesson of every category; the daily-unlock
// pacing beyond that is a Premium benefit.
const FREE_LESSON_CAP = 1

// One new lesson unlocks per day per category, in the user's shuffled order —
// but only for days the account was actually active. A day the account was
// not active does not unlock a lesson; the next lesson waits until the user
// logs in and is active again, it does not "catch up" all at once. Free
// accounts stay capped at the first lesson regardless of active days.
function useCategoryLessonOrder(
  categoryId: string | undefined,
  lessons: Lesson[] | undefined,
  userId: string | undefined,
  unlocks: CategoryUnlock[] | undefined,
  activeDays: ActiveDay[] | undefined,
  isPremium: boolean,
) {
  const ordered = useMemo(() => {
    const inCategory = (lessons ?? []).filter(lesson => lesson.category_id === categoryId)
    return userId && categoryId ? seededShuffle(inCategory, `${userId}:${categoryId}`) : inCategory
  }, [lessons, categoryId, userId])
  const unlock = unlocks?.find(item => item.category_id === categoryId)
  const activeDates = useMemo(() => new Set((activeDays ?? []).map(item => item.active_date)), [activeDays])
  const daysUnlocked = unlock ? countActiveDaysInRange(unlock.start_date, today(), activeDates) : 1
  const cappedDaysUnlocked = isPremium ? daysUnlocked : Math.min(daysUnlocked, FREE_LESSON_CAP)
  const unlockedCount = Math.min(ordered.length, Math.max(1, cappedDaysUnlocked))
  const tierLocked = !isPremium && ordered.length > FREE_LESSON_CAP
  return { ordered, unlockedCount, tierLocked }
}

function usePremiumAccess() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['premium', 'learning-access', profile?.id],
    enabled: Boolean(profile),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('premium_subscriptions').select('id')
        .eq('user_id', profile!.id).eq('status', 'ACTIVE')
        .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`).limit(1).maybeSingle()
      if (error) throw error
      return Boolean(data)
    },
    // Membership status must not be served from the app-wide staleTime —
    // it should reflect an admin's approval the moment this page opens.
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

// An ACTIVE subscription on the $0 Free plan still has status = 'ACTIVE', so
// it is NOT distinguishable from a paid plan via usePremiumAccess() above —
// that hook only answers "does this account have any Premium membership at
// all" (used to gate fully Premium-only areas like Weekly Challenge/Habits).
// The Learning Hub's daily-unlock pacing is a paid-plan benefit, so it needs
// to know whether the active subscription is actually a paid plan.
function usePaidPremiumAccess() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['premium', 'paid-access', profile?.id],
    enabled: Boolean(profile),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('premium_subscriptions')
        .select('id,plan:premium_plans(price_lak)')
        .eq('user_id', profile!.id).eq('status', 'ACTIVE')
        .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
        .order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (error) throw error
      const plan = firstRelation(data?.plan)
      return Boolean(data) && (plan?.price_lak ?? 0) > 0
    },
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

function PremiumGate({ children, requireSubscription = true }: { children: React.ReactNode; requireSubscription?: boolean }) {
  const { profile, loading } = useAuth()
  const { data: active, isLoading } = usePremiumAccess()
  if (loading || isLoading) return <LoadingSpinner />
  if (!profile) return <Navigate to="/auth" replace />
  if (requireSubscription && !active) return <Navigate to="/academy/subscription#plans" replace />
  return <>{children}</>
}

function LearningShell({ children, title, eyebrow, backTo = '/academy/learn', hideSwitchPlatform = false, requireSubscription = true }: {
  children: React.ReactNode; title: string; eyebrow: string; backTo?: string
  hideSwitchPlatform?: boolean; requireSubscription?: boolean
}) {
  const navigate = useNavigate()
  return (
    <PremiumGate requireSubscription={requireSubscription}>
      <div className="min-h-screen bg-[#f7f8fb] text-slate-950">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
            <button onClick={() => navigate(backTo)} className="grid h-10 w-10 place-items-center rounded-full text-slate-600 transition hover:bg-slate-100" aria-label="Go back">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary-600">{eyebrow}</p>
              <h1 className="truncate text-lg font-black">{title}</h1>
            </div>
            {!hideSwitchPlatform && (
              <Link to="/" className="hidden rounded-full border border-slate-200 px-3 py-2 text-xs font-black text-slate-500 hover:bg-slate-50 sm:block">
                Switch platform
              </Link>
            )}
            <PremiumProfileMenu variant="light" />
          </div>
        </header>
        {children}
      </div>
    </PremiumGate>
  )
}

function useLearningData() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const access = usePaidPremiumAccess()
  const categories = useQuery({
    queryKey: ['premium', 'learning-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('premium_learning_categories')
        .select('id,slug,name_en,name_lo,description_en,description_lo,icon,accent')
        .eq('is_active', true).order('sort_order')
      if (error) throw error
      return data as Category[]
    },
  })
  const lessons = useQuery({
    queryKey: ['premium', 'learning-lessons'],
    queryFn: async () => {
      const { data, error } = await supabase.from('premium_lessons')
        .select('id,category_id,slug,title_en,title_lo,summary_en,summary_lo,deck_en,deck_lo,content_en,content_lo,glossary_en,glossary_lo,reflection_questions_en,reflection_questions_lo,key_takeaways_en,key_takeaways_lo,difficulty,estimated_minutes,lesson_type,source_url,source_verified_at,application_deadline,book_id,category:premium_learning_categories(id,slug,name_en,name_lo,description_en,description_lo,icon,accent),book:books(id,title,author,cover_image_url)')
        .eq('status', 'PUBLISHED').or(`published_at.is.null,published_at.lte.${new Date().toISOString()}`).order('sort_order')
      if (error) throw error
      return (data ?? []).map(row => ({
        ...row,
        category: firstRelation(row.category) ?? undefined,
        book: firstRelation(row.book) ?? undefined,
      })) as Lesson[]
    },
  })
  const progress = useQuery({
    queryKey: ['premium', 'lesson-progress', profile?.id],
    enabled: Boolean(profile),
    queryFn: async () => {
      const { data, error } = await supabase.from('premium_lesson_progress')
        .select('lesson_id,progress_percent,quiz_score,completed_at')
        .eq('user_id', profile!.id)
      if (error) throw error
      return data as Progress[]
    },
  })
  const categoryUnlocks = useQuery({
    queryKey: ['premium', 'category-unlocks', profile?.id],
    enabled: Boolean(profile),
    queryFn: async () => {
      const { data, error } = await supabase.from('premium_category_unlocks')
        .select('category_id,start_date')
        .eq('user_id', profile!.id)
      if (error) throw error
      return data as CategoryUnlock[]
    },
  })
  const activeDays = useQuery({
    queryKey: ['premium', 'active-days', profile?.id],
    enabled: Boolean(profile),
    queryFn: async () => {
      const { data, error } = await supabase.from('premium_active_days')
        .select('active_date')
        .eq('user_id', profile!.id)
      if (error) throw error
      return data as ActiveDay[]
    },
  })
  const recordActiveDay = useMutation({
    mutationFn: async () => {
      if (!profile) return
      const { error } = await supabase.from('premium_active_days')
        .upsert({ user_id: profile.id, active_date: today() }, { onConflict: 'user_id,active_date', ignoreDuplicates: true })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['premium', 'active-days'] }),
  })
  useEffect(() => {
    if (!profile || activeDays.isLoading || recordActiveDay.isPending) return
    if (!activeDays.data?.some(item => item.active_date === today())) recordActiveDay.mutate()
  }, [profile, activeDays.data, activeDays.isLoading])
  return { categories, lessons, progress, categoryUnlocks, activeDays, access }
}

export function LearningHub() {
  const { language } = useLanguage()
  const { success } = useToast()
  const { categories, lessons, progress, access } = useLearningData()
  const isPremium = Boolean(access.data)
  const completed = progress.data?.filter(item => item.completed_at).length ?? 0
  const inProgress = progress.data?.find(item => item.progress_percent > 0 && !item.completed_at)
  const continueLesson = lessons.data?.find(item => item.id === inProgress?.lesson_id) ?? lessons.data?.[0]
  const promptLibrary = useQuery({
    queryKey: ['premium', 'prompt-library', today()],
    enabled: Boolean(access.data),
    queryFn: async () => {
      const { data, error } = await supabase.from('premium_prompt_library')
        .select('id,category,title_en,title_lo,description_en,description_lo,prompt_en,prompt_lo')
        .lte('week_start', today()).order('week_start', { ascending: false }).order('sort_order').limit(7)
      if (error) throw error
      return data as LibraryPrompt[]
    },
  })

  async function copyPrompt(prompt: LibraryPrompt) {
    await navigator.clipboard.writeText(localize(language, prompt.prompt_en, prompt.prompt_lo))
    success(localize(language, 'Prompt copied.', 'ສຳເນົາ prompt ແລ້ວ.'))
  }

  return (
    <LearningShell title={localize(language, 'Learning Hub', 'ສູນການຮຽນຮູ້')} eyebrow="Bitdoin Academy" backTo="/academy/home" hideSwitchPlatform requireSubscription={false}>
      <main className="mx-auto max-w-6xl px-4 pb-24">
        <section className="grid min-h-[310px] items-end overflow-hidden bg-primary-950 px-6 py-8 text-white sm:mx-0 sm:mt-6 sm:min-h-[340px] sm:rounded-[2rem] sm:px-10">
          <div className="relative max-w-2xl">
            <div className="absolute -right-36 -top-44 h-80 w-80 rounded-full border-[52px] border-primary-700/30" />
            <p className="text-xs font-black uppercase tracking-[0.24em] text-primary-300">
              {localize(language, 'Your next useful skill', 'ທັກສະທີ່ເປັນປະໂຫຍດຕໍ່ໄປ')}
            </p>
            <h2 className="relative mt-4 max-w-xl text-4xl font-black leading-[1.04] sm:text-6xl">
              {localize(language, 'Learn something you can use today.', 'ຮຽນສິ່ງທີ່ນຳໄປໃຊ້ໄດ້ມື້ນີ້.')}
            </h2>
            {continueLesson && (
              <Link to={`/academy/lesson/${continueLesson.slug}`} className="relative mt-7 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-primary-950 transition hover:translate-x-1">
                {inProgress ? localize(language, 'Continue lesson', 'ຮຽນຕໍ່') : localize(language, 'Start first lesson', 'ເລີ່ມບົດຮຽນທຳອິດ')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </section>

        {!access.isLoading && !isPremium && (
          <section className="mt-6 flex flex-col items-start gap-3 rounded-2xl bg-amber-50 px-5 py-4 ring-1 ring-amber-200 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-amber-900">
              {localize(
                language,
                'Free plan: 1 lesson unlocked per path. Subscribe to unlock a new lesson every active day.',
                'ແຜນຟຣີ: ປົດລັອກ 1 ບົດຮຽນຕໍ່ເສັ້ນທາງ. ສະໝັກສະມາຊິກເພື່ອປົດລັອກບົດຮຽນໃໝ່ທຸກມື້ທີ່ໃຊ້ງານ.',
              )}
            </p>
            <Link to="/academy/subscription#plans" className="shrink-0 rounded-full bg-amber-900 px-4 py-2 text-xs font-black text-white transition hover:bg-amber-800">
              {localize(language, 'Upgrade', 'ອັບເກຣດ')}
            </Link>
          </section>
        )}

        <section className="grid grid-cols-3 border-b border-slate-200 py-6">
          <Metric value={String(completed)} label={localize(language, 'Lessons done', 'ບົດຮຽນສຳເລັດ')} />
          <Metric value={String(lessons.data?.length ?? '—')} label={localize(language, 'Available', 'ບົດຮຽນທັງໝົດ')} />
          <Metric value={`${completed * 20}`} label="XP" />
        </section>

        <section className="py-10">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-primary-600">{localize(language, 'Explore', 'ສຳຫຼວດ')}</p>
              <h2 className="mt-2 text-2xl font-black">{localize(language, 'Choose a direction', 'ເລືອກທິດທາງ')}</h2>
            </div>
            {(categories.isLoading || lessons.isLoading) && <Loader2 className="h-5 w-5 animate-spin text-primary-600" />}
          </div>
          <div className="mt-7 grid gap-x-8 md:grid-cols-2">
            {(categories.data ?? []).map(category => {
              const Icon = iconMap[category.icon as keyof typeof iconMap] ?? BookOpen
              const lessonCount = lessons.data?.filter(item => item.category_id === category.id).length ?? 0
              return (
                <Link key={category.id} to={`/academy/learn/${category.slug}`} className="group flex items-center gap-4 border-t border-slate-200 py-5">
                  <span className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-2xl', accents[category.accent] ?? accents.indigo)}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-black">{localize(language, category.name_en, category.name_lo)}</h3>
                    <p className="mt-1 line-clamp-1 text-sm text-slate-500">{localize(language, category.description_en, category.description_lo)}</p>
                  </div>
                  <span className="text-xs font-bold text-slate-400">{lessonCount}</span>
                  <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-primary-600" />
                </Link>
              )
            })}
          </div>
        </section>

        {isPremium && (promptLibrary.data?.length ?? 0) > 0 && (
          <section className="border-t border-slate-200 py-10">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-primary-600">
              {localize(language, 'Fresh this week', 'ໃໝ່ປະຈຳອາທິດ')}
            </p>
            <h2 className="mt-2 text-2xl font-black">{localize(language, 'AI Prompt Library', 'ຄັງ Prompt AI')}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {localize(language, 'Copy a ready-made prompt, replace the brackets, and use it with Bitdoin Mentor.', 'ສຳເນົາ prompt, ປ່ຽນຂໍ້ຄວາມໃນວົງເລັບ ແລະ ນຳໄປໃຊ້ກັບ Bitdoin Mentor.')}
            </p>
            <div className="mt-6 divide-y divide-slate-200 border-y border-slate-200">
              {promptLibrary.data!.map(prompt => (
                <div key={prompt.id} className="grid gap-4 py-5 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black">{localize(language, prompt.title_en, prompt.title_lo)}</h3>
                      <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-primary-700">{prompt.category}</span>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{localize(language, prompt.description_en, prompt.description_lo)}</p>
                  </div>
                  <Button type="button" size="sm" variant="outline" icon={<Copy className="h-4 w-4" />} onClick={() => void copyPrompt(prompt)}>
                    {localize(language, 'Copy prompt', 'ສຳເນົາ')}
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}

        <nav className="grid gap-3 border-t border-slate-200 py-8 sm:grid-cols-3">
          <WorkspaceLink to="/academy/challenges" icon={Target} title={localize(language, 'Weekly challenge', 'ຄວາມທ້າທາຍອາທິດ')} />
          <WorkspaceLink to="/academy/careers" icon={BriefcaseBusiness} title={localize(language, 'Career explorer', 'ສຳຫຼວດອາຊີບ')} />
          <WorkspaceLink to="/academy/habits" icon={ListChecks} title={localize(language, 'Habit tracker', 'ຕິດຕາມນິໄສ')} />
          <WorkspaceLink to="/academy/progress" icon={Trophy} title={localize(language, 'My progress', 'ຄວາມຄືບໜ້າ')} />
        </nav>
      </main>
    </LearningShell>
  )
}

function Metric({ value, label }: { value: string; label: string }) {
  return <div className="text-center"><p className="text-2xl font-black sm:text-3xl">{value}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p></div>
}

function WorkspaceLink({ to, icon: Icon, title }: { to: string; icon: typeof Target; title: string }) {
  return (
    <Link to={to} className="group flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-md">
      <Icon className="h-5 w-5 text-primary-600" /><span className="flex-1 text-sm font-black">{title}</span><ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-primary-600" />
    </Link>
  )
}

export function LearningCategoryPage() {
  const { categorySlug } = useParams()
  const { language } = useLanguage()
  const { profile } = useAuth()
  const qc = useQueryClient()
  const { categories, lessons, progress, categoryUnlocks, activeDays, access } = useLearningData()
  const isPremium = Boolean(access.data)
  const category = categories.data?.find(item => item.slug === categorySlug)
  const { ordered, unlockedCount, tierLocked } = useCategoryLessonOrder(category?.id, lessons.data, profile?.id, categoryUnlocks.data, activeDays.data, isPremium)

  const ensureUnlock = useMutation({
    mutationFn: async () => {
      if (!profile || !category) return
      const { error } = await supabase.from('premium_category_unlocks')
        .upsert({ user_id: profile.id, category_id: category.id }, { onConflict: 'user_id,category_id', ignoreDuplicates: true })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['premium', 'category-unlocks'] }),
  })
  useEffect(() => {
    if (!profile || !category || categoryUnlocks.isLoading || ensureUnlock.isPending) return
    if (!categoryUnlocks.data?.some(item => item.category_id === category.id)) ensureUnlock.mutate()
  }, [profile, category, categoryUnlocks.data, categoryUnlocks.isLoading])

  if (!categories.isLoading && !category) return <Navigate to="/academy/learn" replace />
  if (access.isLoading) return <LoadingSpinner />
  return (
    <LearningShell title={category ? localize(language, category.name_en, category.name_lo) : 'Loading…'} eyebrow={localize(language, 'Learning path', 'ເສັ້ນທາງການຮຽນ')} requireSubscription={false}>
      <main className="mx-auto max-w-3xl px-4 py-10 pb-24">
        <p className="max-w-2xl text-lg leading-8 text-slate-600">{category && localize(language, category.description_en, category.description_lo)}</p>
        <p className="mt-3 text-xs font-bold uppercase tracking-wide text-primary-600">{localize(language, 'One new lesson unlocks each day you’re active', 'ບົດຮຽນໃໝ່ໜຶ່ງບົດປົດລັອກທຸກມື້ທີ່ທ່ານໃຊ້ງານ')}</p>
        {tierLocked && (
          <div className="mt-6 flex flex-col items-start gap-3 rounded-2xl bg-amber-50 px-5 py-4 ring-1 ring-amber-200 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-amber-900">
              {localize(
                language,
                'You’ve reached the free lesson for this path. Subscribe to keep unlocking new lessons every active day.',
                'ທ່ານໄດ້ຮັບບົດຮຽນຟຣີສຳລັບເສັ້ນທາງນີ້ແລ້ວ. ສະໝັກສະມາຊິກເພື່ອປົດລັອກບົດຮຽນໃໝ່ຕໍ່ໄປ.',
              )}
            </p>
            <Link to="/academy/subscription#plans" className="shrink-0 rounded-full bg-amber-900 px-4 py-2 text-xs font-black text-white transition hover:bg-amber-800">
              {localize(language, 'Upgrade', 'ອັບເກຣດ')}
            </Link>
          </div>
        )}
        <div className="mt-10 border-t border-slate-200">
          {ordered.map((lesson, index) => {
            const itemProgress = progress.data?.find(item => item.lesson_id === lesson.id)
            const locked = index >= unlockedCount
            const isToday = index === unlockedCount - 1
            const isNext = index === unlockedCount
            const content = (
              <>
                {lesson.book?.cover_image_url && !locked ? (
                  <span className="relative h-14 w-10 flex-shrink-0 overflow-hidden rounded-md bg-slate-200 shadow-sm">
                    <img src={lesson.book.cover_image_url} alt="" className="h-full w-full object-cover" />
                    {itemProgress?.completed_at && (
                      <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-emerald-600 text-white"><Check className="h-2.5 w-2.5" /></span>
                    )}
                  </span>
                ) : (
                  <span className={cn('grid h-10 w-10 place-items-center rounded-full text-sm font-black', locked ? 'bg-slate-100 text-slate-400 ring-1 ring-slate-200' : itemProgress?.completed_at ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-500 ring-1 ring-slate-200')}>
                    {locked ? <LockKeyhole className="h-4 w-4" /> : itemProgress?.completed_at ? <Check className="h-4 w-4" /> : index + 1}
                  </span>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className={cn('text-lg font-black', locked ? 'text-slate-400' : 'group-hover:text-primary-700')}>{localize(language, lesson.title_en, lesson.title_lo)}</h2>
                    {isToday && !locked && (
                      <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-primary-700">{localize(language, 'Today', 'ມື້ນີ້')}</span>
                    )}
                  </div>
                  {locked ? (
                    <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm font-semibold text-slate-400">
                      {tierLocked ? (
                        <>
                          {localize(language, 'Premium lesson', 'ບົດຮຽນສະມາຊິກ')}
                          <Link to="/academy/subscription#plans" className="font-black text-amber-700 hover:underline">
                            {localize(language, 'Subscribe to unlock', 'ສະໝັກເພື່ອປົດລັອກ')}
                          </Link>
                        </>
                      ) : isNext ? (
                        localize(language, 'Unlocks next time you’re active', 'ປົດລັອກເມື່ອທ່ານໃຊ້ງານຄັ້ງຕໍ່ໄປ')
                      ) : (
                        localize(language, 'Unlocks after that', 'ປົດລັອກຫຼັງຈາກນັ້ນ')
                      )}
                    </p>
                  ) : (
                    <>
                      <p className="mt-2 text-sm leading-6 text-slate-500">{localize(language, lesson.summary_en, lesson.summary_lo)}</p>
                      <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-400">{lesson.estimated_minutes} min · {lesson.difficulty.toLowerCase()}</p>
                    </>
                  )}
                </div>
                <ChevronRight className={cn('mt-2 h-5 w-5', locked ? 'text-slate-200' : 'text-slate-300 group-hover:translate-x-1')} />
              </>
            )
            return locked ? (
              <div key={lesson.id} className="grid grid-cols-[42px_1fr_auto] items-start gap-4 border-b border-slate-200 py-6 opacity-70">{content}</div>
            ) : (
              <Link key={lesson.id} to={`/academy/lesson/${lesson.slug}`} className="group grid grid-cols-[42px_1fr_auto] items-start gap-4 border-b border-slate-200 py-6">{content}</Link>
            )
          })}
          {!lessons.isLoading && ordered.length === 0 && <Empty text={localize(language, 'New lessons are being prepared.', 'ບົດຮຽນໃໝ່ກຳລັງກະກຽມ.')} />}
        </div>
      </main>
    </LearningShell>
  )
}

export function LessonReaderPage() {
  const { lessonSlug } = useParams()
  const { profile } = useAuth()
  const { language } = useLanguage()
  const qc = useQueryClient()
  const toast = useToast()
  const { lessons, progress, categoryUnlocks, activeDays, access } = useLearningData()
  const lesson = lessons.data?.find(item => item.slug === lessonSlug)
  const { ordered, unlockedCount } = useCategoryLessonOrder(lesson?.category_id, lessons.data, profile?.id, categoryUnlocks.data, activeDays.data, Boolean(access.data))
  const questions = useQuery({
    queryKey: ['premium', 'lesson-quiz', lesson?.id],
    enabled: Boolean(lesson),
    queryFn: async () => {
      const { data, error } = await supabase.from('premium_quiz_questions')
        .select('id,prompt_en,prompt_lo,options_en,options_lo,correct_index,explanation_en,explanation_lo')
        .eq('lesson_id', lesson!.id).order('sort_order')
      if (error) throw error
      return data as QuizQuestion[]
    },
  })
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const complete = useMutation({
    mutationFn: async () => {
      if (!lesson || !profile) return
      const score = questions.data?.length
        ? Math.round(questions.data.filter(q => answers[q.id] === q.correct_index).length / questions.data.length * 100)
        : null
      const { error } = await supabase.from('premium_lesson_progress').upsert({
        user_id: profile.id, lesson_id: lesson.id, progress_percent: 100,
        quiz_score: score, completed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,lesson_id' })
      if (error) throw error
      if (score !== null) {
        const { error: quizError } = await supabase.from('premium_quiz_attempts').insert({
          user_id: profile.id, lesson_id: lesson.id, answers: questions.data!.map(q => answers[q.id] ?? null), score,
        })
        if (quizError) throw quizError
      }
      return score
    },
    onSuccess: score => {
      qc.invalidateQueries({ queryKey: ['premium', 'lesson-progress'] })
      toast.success(score == null ? 'Lesson completed.' : `Lesson completed · Quiz ${score}%`)
    },
    onError: () => toast.error('Could not save lesson progress.'),
  })
  if (lessons.isLoading || access.isLoading) return <LoadingSpinner />
  if (!lesson) return <Navigate to="/academy/learn" replace />
  const lessonIndex = ordered.findIndex(item => item.id === lesson.id)
  if (lessonIndex >= unlockedCount) return <Navigate to={`/academy/learn/${lesson.category?.slug ?? ''}`} replace />
  const sections = language === 'lo' ? lesson.content_lo : lesson.content_en
  const takeaways = language === 'lo' ? lesson.key_takeaways_lo : lesson.key_takeaways_en
  const glossary = language === 'lo' ? lesson.glossary_lo : lesson.glossary_en
  const reflectionQuestions = language === 'lo' ? lesson.reflection_questions_lo : lesson.reflection_questions_en
  const itemProgress = progress.data?.find(item => item.lesson_id === lesson.id)
  const allAnswered = !questions.data?.length || questions.data.every(q => answers[q.id] !== undefined)
  if (lesson.lesson_type === 'READING_SUMMARY') {
    return (
      <LearningShell title={localize(language, lesson.title_en, lesson.title_lo)} eyebrow={`${lesson.estimated_minutes} min · ${lesson.difficulty.toLowerCase()}`} backTo={`/academy/learn/${lesson.category?.slug ?? ''}`}>
        <BookSummaryReader
          language={language}
          title={localize(language, lesson.title_en, lesson.title_lo)}
          deck={localize(language, lesson.deck_en ?? '', lesson.deck_lo ?? '') || localize(language, lesson.summary_en, lesson.summary_lo)}
          estimatedMinutes={lesson.estimated_minutes}
          difficulty={lesson.difficulty}
          bookTitle={lesson.book?.title}
          bookAuthor={lesson.book?.author}
          coverImageUrl={lesson.book?.cover_image_url}
          bookHref={lesson.book ? `/bookstore/books/${lesson.book.id}` : undefined}
          sections={sections}
          takeaways={takeaways}
          glossary={glossary}
          reflectionQuestions={reflectionQuestions}
          quiz={(questions.data ?? []).map(q => ({
            id: q.id,
            prompt: localize(language, q.prompt_en, q.prompt_lo),
            options: language === 'lo' ? q.options_lo : q.options_en,
          }))}
          answers={answers}
          onAnswer={(id, optionIndex) => setAnswers(old => ({ ...old, [id]: optionIndex }))}
          completed={Boolean(itemProgress?.completed_at)}
          completing={complete.isPending}
          allAnswered={allAnswered}
          onComplete={() => complete.mutate()}
        />
      </LearningShell>
    )
  }
  return (
    <LearningShell title={localize(language, lesson.title_en, lesson.title_lo)} eyebrow={`${lesson.estimated_minutes} min · ${lesson.difficulty.toLowerCase()}`} backTo={`/academy/learn/${lesson.category?.slug ?? ''}`}>
      <article className="mx-auto max-w-3xl px-4 py-10 pb-28">
        <header className="border-b border-slate-200 pb-10">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-primary-600">{lesson.lesson_type.replace('_', ' ')}</p>
          <h2 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">{localize(language, lesson.title_en, lesson.title_lo)}</h2>
          <p className="mt-5 text-lg leading-8 text-slate-600">{localize(language, lesson.deck_en ?? '', lesson.deck_lo ?? '') || localize(language, lesson.summary_en, lesson.summary_lo)}</p>
          {lesson.book && (
            <Link to={`/bookstore/books/${lesson.book.id}`} className="mt-7 flex items-center gap-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100 transition hover:ring-primary-200">
              <span className="h-24 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-slate-200 shadow-sm">
                {lesson.book.cover_image_url ? (
                  <img src={lesson.book.cover_image_url} alt={lesson.book.title} className="h-full w-full object-cover" />
                ) : (
                  <span className="grid h-full w-full place-items-center text-slate-400"><BookOpen className="h-6 w-6" /></span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary-600">{localize(language, 'Source book', 'ປຶ້ມຕົ້ນສະບັບ')}</p>
                <p className="mt-1 truncate font-black text-slate-900">{lesson.book.title}</p>
                {lesson.book.author && <p className="mt-0.5 truncate text-sm text-slate-500">{lesson.book.author}</p>}
                <p className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary-700">{localize(language, 'View in Bookstore', 'ເບິ່ງໃນຮ້ານປຶ້ມ')} <ArrowRight className="h-3.5 w-3.5" /></p>
              </div>
            </Link>
          )}
        </header>
        <div className="space-y-12 py-10">
          {sections.map((section, index) => (
            <section key={`${section.heading}-${index}`} className="border-t border-slate-200 pt-8 first:border-t-0 first:pt-0">
              <p className="text-xs font-black text-primary-500">0{index + 1}</p>
              <h3 className="mt-2 text-2xl font-black">{section.heading}</h3>
              {section.blocks?.length ? section.blocks.map((block, bIndex) => {
                if (block.type === 'p') return <p key={bIndex} className="mt-4 text-base leading-8 text-slate-600">{block.text}</p>
                if (block.type === 'h4') return <h4 key={bIndex} className="mt-6 text-base font-black">{block.text}</h4>
                if (block.type === 'term') return (
                  <div key={bIndex} className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                    <p className="text-sm font-black text-slate-900">{block.term}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{block.body}</p>
                  </div>
                )
                return (
                  <ul key={bIndex} className="mt-4 list-disc space-y-2 pl-5 text-base leading-7 text-slate-600">
                    {block.items.map((item, iIndex) => (
                      <li key={iIndex}>{item.label && <b className="font-black text-slate-900">{item.label} </b>}{item.body}</li>
                    ))}
                  </ul>
                )
              }) : section.body && <p className="mt-4 text-base leading-8 text-slate-600">{section.body}</p>}
              {section.oneline && (
                <div className="mt-6 border-l-2 border-primary-600 pl-4">
                  <p className="text-sm leading-7 text-slate-600">
                    <span className="font-black text-slate-900">{localize(language, 'In one line. ', 'ໂດຍສະຫຼຸບ. ')}</span>
                    {section.oneline}
                  </p>
                </div>
              )}
            </section>
          ))}
        </div>
        <section className="border-y border-slate-200 py-8">
          <h3 className="text-lg font-black">{localize(language, 'Keep these ideas', 'ຈື່ແນວຄິດເຫຼົ່ານີ້')}</h3>
          <ul className="mt-5 space-y-3">
            {takeaways.map(item => <li key={item} className="flex gap-3 text-sm leading-6 text-slate-600"><Check className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />{item}</li>)}
          </ul>
        </section>
        {!!glossary.length && (
          <section className="py-10">
            <h3 className="text-lg font-black">{localize(language, 'Terms worth remembering', 'ຄຳສັບຄວນຈື່')}</h3>
            <div className="mt-5 space-y-3">
              {glossary.map(item => (
                <div key={item.term} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                  <p className="text-sm font-black text-slate-900">{item.term}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{item.body}</p>
                </div>
              ))}
            </div>
          </section>
        )}
        {!!reflectionQuestions.length && (
          <section className="border-t border-slate-200 py-10">
            <h3 className="text-lg font-black">{localize(language, 'Questions to sit with', 'ຄຳຖາມໃຫ້ຄິດຕໍ່')}</h3>
            <ul className="mt-5 space-y-3">
              {reflectionQuestions.map(item => <li key={item} className="text-sm leading-7 text-slate-600">{item}</li>)}
            </ul>
          </section>
        )}
        {!!questions.data?.length && (
          <section className="py-10">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-primary-600">{localize(language, 'Quick check', 'ກວດຄວາມເຂົ້າໃຈ')}</p>
            {questions.data.map((question, qIndex) => {
              const options = language === 'lo' ? question.options_lo : question.options_en
              return (
                <div key={question.id} className="mt-7">
                  <h3 className="font-black">{qIndex + 1}. {localize(language, question.prompt_en, question.prompt_lo)}</h3>
                  <div className="mt-3 grid gap-2">
                    {options.map((option, index) => (
                      <button key={option} onClick={() => setAnswers(old => ({ ...old, [question.id]: index }))}
                        className={cn('rounded-xl border px-4 py-3 text-left text-sm font-semibold transition', answers[question.id] === index ? 'border-primary-600 bg-primary-50 text-primary-900' : 'border-slate-200 bg-white hover:border-primary-300')}>
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </section>
        )}
        <Button fullWidth disabled={!allAnswered || Boolean(itemProgress?.completed_at)} loading={complete.isPending} onClick={() => complete.mutate()} icon={<Check className="h-4 w-4" />}>
          {itemProgress?.completed_at ? localize(language, 'Lesson completed', 'ບົດຮຽນສຳເລັດ') : localize(language, 'Complete lesson', 'ສຳເລັດບົດຮຽນ')}
        </Button>
      </article>
    </LearningShell>
  )
}

export function WeeklyChallengesPage() {
  const { language } = useLanguage()
  const { profile } = useAuth()
  const qc = useQueryClient()
  const toast = useToast()
  const challenge = useQuery({
    queryKey: ['premium', 'weekly-challenge'],
    queryFn: async () => {
      const date = today()
      const { data, error } = await supabase.from('premium_weekly_challenges')
        .select('id,title_en,title_lo,description_en,description_lo,steps_en,steps_lo,starts_on,ends_on,points')
        .eq('is_active', true).lte('starts_on', date).gte('ends_on', date).order('starts_on', { ascending: false }).limit(1).maybeSingle()
      if (error) throw error
      return data as WeeklyChallenge | null
    },
  })
  const progress = useQuery({
    queryKey: ['premium', 'weekly-progress', profile?.id, challenge.data?.id],
    enabled: Boolean(profile && challenge.data),
    queryFn: async () => {
      const { data, error } = await supabase.from('premium_weekly_challenge_progress')
        .select('challenge_id,completed_steps,reflection,completed_at')
        .eq('user_id', profile!.id).eq('challenge_id', challenge.data!.id).maybeSingle()
      if (error) throw error
      return data as WeeklyProgress | null
    },
  })
  const toggle = useMutation({
    mutationFn: async (index: number) => {
      const current = progress.data?.completed_steps ?? []
      const next = current.includes(index) ? current.filter(item => item !== index) : [...current, index]
      const steps = language === 'lo' ? challenge.data!.steps_lo : challenge.data!.steps_en
      const { error } = await supabase.from('premium_weekly_challenge_progress').upsert({
        user_id: profile!.id, challenge_id: challenge.data!.id, completed_steps: next,
        completed_at: next.length === steps.length ? new Date().toISOString() : null, updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,challenge_id' })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['premium', 'weekly-progress'] }),
    onError: () => toast.error('Could not update the challenge.'),
  })
  const data = challenge.data
  const steps = data ? (language === 'lo' ? data.steps_lo : data.steps_en) : []
  return (
    <LearningShell title={localize(language, 'Weekly challenge', 'ຄວາມທ້າທາຍອາທິດ')} eyebrow={localize(language, 'Build momentum', 'ສ້າງແຮງຂັບເຄື່ອນ')}>
      <main className="mx-auto max-w-3xl px-4 py-10 pb-24">
        {challenge.isLoading ? <LoadingSpinner /> : data ? (
          <>
            <div className="flex items-center gap-2 text-sm font-bold text-amber-600"><Flame className="h-5 w-5" /> {data.points} XP</div>
            <h2 className="mt-4 text-4xl font-black">{localize(language, data.title_en, data.title_lo)}</h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">{localize(language, data.description_en, data.description_lo)}</p>
            <div className="mt-8 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-primary-600 transition-all" style={{ width: `${steps.length ? (progress.data?.completed_steps.length ?? 0) / steps.length * 100 : 0}%` }} /></div>
            <div className="mt-8 border-t border-slate-200">
              {steps.map((step, index) => {
                const done = progress.data?.completed_steps.includes(index)
                return (
                  <button key={step} disabled={toggle.isPending} onClick={() => toggle.mutate(index)} className="flex w-full items-center gap-4 border-b border-slate-200 py-5 text-left">
                    <span className={cn('grid h-8 w-8 place-items-center rounded-full border-2', done ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300')}>
                      {done && <Check className="h-4 w-4" />}
                    </span>
                    <span className={cn('font-bold', done && 'text-slate-400 line-through')}>{step}</span>
                  </button>
                )
              })}
            </div>
          </>
        ) : <Empty text={localize(language, 'The next challenge is being prepared.', 'ຄວາມທ້າທາຍຕໍ່ໄປກຳລັງກະກຽມ.')} />}
      </main>
    </LearningShell>
  )
}

export function HabitTrackerPage() {
  const { language } = useLanguage()
  const { profile } = useAuth()
  const qc = useQueryClient()
  const toast = useToast()
  const [name, setName] = useState('')
  const habits = useQuery({
    queryKey: ['premium', 'habits', profile?.id],
    enabled: Boolean(profile),
    queryFn: async () => {
      const { data, error } = await supabase.from('premium_habits')
        .select('id,name,category_slug,frequency,reminder_time')
        .eq('user_id', profile!.id).eq('is_active', true).is('archived_at', null).order('created_at')
      if (error) throw error
      return data as Habit[]
    },
  })
  const checkins = useQuery({
    queryKey: ['premium', 'habit-checkins', profile?.id, today()],
    enabled: Boolean(profile),
    queryFn: async () => {
      const { data, error } = await supabase.from('premium_habit_checkins').select('habit_id,checkin_date').eq('user_id', profile!.id).eq('checkin_date', today())
      if (error) throw error
      return data as HabitCheckin[]
    },
  })
  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('premium_habits').insert({ user_id: profile!.id, name: name.trim() })
      if (error) throw error
    },
    onSuccess: () => { setName(''); qc.invalidateQueries({ queryKey: ['premium', 'habits'] }) },
    onError: () => toast.error('Could not add the habit.'),
  })
  const toggle = useMutation({
    mutationFn: async (habitId: string) => {
      const done = checkins.data?.some(item => item.habit_id === habitId)
      const query = supabase.from('premium_habit_checkins')
      const { error } = done
        ? await query.delete().eq('user_id', profile!.id).eq('habit_id', habitId).eq('checkin_date', today())
        : await query.insert({ user_id: profile!.id, habit_id: habitId, checkin_date: today() })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['premium', 'habit-checkins'] }),
    onError: () => toast.error('Could not update the habit.'),
  })
  const archive = useMutation({
    mutationFn: async (habitId: string) => {
      const { error } = await supabase.from('premium_habits').update({ is_active: false, archived_at: new Date().toISOString() }).eq('id', habitId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['premium', 'habits'] }),
  })
  const doneCount = habits.data?.filter(h => checkins.data?.some(c => c.habit_id === h.id)).length ?? 0
  return (
    <LearningShell title={localize(language, 'Habit tracker', 'ຕິດຕາມນິໄສ')} eyebrow={localize(language, 'Today', 'ມື້ນີ້')}>
      <main className="mx-auto max-w-3xl px-4 py-10 pb-24">
        <div className="flex items-end justify-between border-b border-slate-200 pb-8">
          <div><p className="text-5xl font-black">{doneCount}/{habits.data?.length ?? 0}</p><p className="mt-2 text-sm font-bold text-slate-500">{localize(language, 'completed today', 'ສຳເລັດມື້ນີ້')}</p></div>
          <CircleDollarSign className="h-12 w-12 text-primary-200" />
        </div>
        <div className="mt-8 flex gap-2">
          <input value={name} onChange={event => setName(event.target.value)} onKeyDown={event => event.key === 'Enter' && name.trim() && add.mutate()}
            maxLength={80} placeholder={localize(language, 'Add a small daily habit…', 'ເພີ່ມນິໄສນ້ອຍໆ…')}
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary-500" />
          <Button disabled={!name.trim() || (habits.data?.length ?? 0) >= 5} loading={add.isPending} onClick={() => add.mutate()} icon={<Plus className="h-4 w-4" />}>{localize(language, 'Add', 'ເພີ່ມ')}</Button>
        </div>
        <p className="mt-2 text-xs text-slate-400">{localize(language, 'Up to five active habits.', 'ສູງສຸດຫ້ານິໄສ.')}</p>
        <div className="mt-8 border-t border-slate-200">
          {(habits.data ?? []).map(habit => {
            const done = checkins.data?.some(item => item.habit_id === habit.id)
            return (
              <div key={habit.id} className="group flex items-center gap-4 border-b border-slate-200 py-5">
                <button onClick={() => toggle.mutate(habit.id)} className={cn('grid h-10 w-10 place-items-center rounded-full border-2 transition', done ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 hover:border-primary-500')}>
                  {done && <Check className="h-5 w-5" />}
                </button>
                <div className="flex-1"><p className={cn('font-black', done && 'text-slate-400 line-through')}>{habit.name}</p><p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">{habit.frequency.toLowerCase()}</p></div>
                <button onClick={() => archive.mutate(habit.id)} className="p-2 text-slate-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100" aria-label="Archive habit"><Trash2 className="h-4 w-4" /></button>
              </div>
            )
          })}
          {!habits.isLoading && habits.data?.length === 0 && <Empty text={localize(language, 'Add one habit you can repeat tomorrow.', 'ເພີ່ມໜຶ່ງນິໄສທີ່ທ່ານເຮັດຊ້ຳໄດ້ມື້ອື່ນ.')} />}
        </div>
      </main>
    </LearningShell>
  )
}

export function LearningProgressPage() {
  const { language } = useLanguage()
  const { categories, lessons, progress } = useLearningData()
  const completed = progress.data?.filter(item => item.completed_at) ?? []
  const average = completed.length ? Math.round(completed.reduce((sum, item) => sum + (item.quiz_score ?? 0), 0) / completed.filter(i => i.quiz_score != null).length) || 0 : 0
  const byCategory = useMemo(() => (categories.data ?? []).map(category => {
    const categoryLessons = lessons.data?.filter(lesson => lesson.category_id === category.id) ?? []
    const done = categoryLessons.filter(lesson => completed.some(item => item.lesson_id === lesson.id)).length
    return { category, done, total: categoryLessons.length }
  }).filter(item => item.total > 0), [categories.data, lessons.data, completed])
  return (
    <LearningShell title={localize(language, 'My progress', 'ຄວາມຄືບໜ້າ')} eyebrow={localize(language, 'Learning record', 'ບັນທຶກການຮຽນ')}>
      <main className="mx-auto max-w-3xl px-4 py-10 pb-24">
        <div className="grid grid-cols-3 border-y border-slate-200 py-7">
          <Metric value={String(completed.length)} label={localize(language, 'Completed', 'ສຳເລັດ')} />
          <Metric value={`${completed.length * 20}`} label="XP" />
          <Metric value={`${average}%`} label={localize(language, 'Quiz average', 'ຄະແນນສະເລ່ຍ')} />
        </div>
        <h2 className="mt-10 text-xl font-black">{localize(language, 'Learning paths', 'ເສັ້ນທາງການຮຽນ')}</h2>
        <div className="mt-5 space-y-6">
          {byCategory.map(({ category, done, total }) => (
            <div key={category.id}>
              <div className="flex justify-between text-sm"><span className="font-black">{localize(language, category.name_en, category.name_lo)}</span><span className="font-bold text-slate-400">{done}/{total}</span></div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-primary-600" style={{ width: `${done / total * 100}%` }} /></div>
            </div>
          ))}
        </div>
      </main>
    </LearningShell>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="py-16 text-center"><LockKeyhole className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-500">{text}</p></div>
}
