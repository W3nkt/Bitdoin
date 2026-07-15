import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowRight,
  Brain,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Copy,
  Crown,
  FileText,
  Flame,
  GraduationCap,
  Lightbulb,
  Lock,
  MessageCircle,
  ReceiptText,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
  Trophy,
  Upload,
  Users,
  XCircle,
  Zap,
} from 'lucide-react'
import { PwenLogoLockup } from '@/components/brand/PwenLogo'
import { OnboardingChat } from '@/components/premium/OnboardingChat'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { formatDate, formatPrice } from '@/lib/utils'
import type { Language, User as AppUser } from '@/types'

type PremiumStatus = 'FREE' | 'PENDING_APPROVAL' | 'PENDING_PAYMENT' | 'PAYMENT_REVIEW' | 'ACTIVE' | 'CANCELLED' | 'EXPIRED'
type PremiumPaymentStatus = 'PENDING' | 'REQUIRES_REVIEW' | 'VERIFIED' | 'REJECTED' | 'REFUNDED'

interface PremiumPlan {
  id: string
  slug: string
  name: string
  description: string
  price_lak: number
  interval: string
  features: string[]
  is_active: boolean
  sort_order: number
}

interface PremiumSubscription {
  id: string
  user_id: string
  plan_id: string
  status: PremiumStatus
  starts_at?: string | null
  ends_at?: string | null
  cancelled_at?: string | null
  auto_renew: boolean
  created_at: string
  plan?: PremiumPlan
}

interface PremiumPayment {
  id: string
  subscription_id: string
  user_id: string
  plan_id: string
  amount_lak: number
  currency: string
  method: string
  status: PremiumPaymentStatus
  receipt_image_url?: string | null
  rejection_reason?: string | null
  created_at: string
  plan?: Pick<PremiumPlan, 'name' | 'slug'>
}

interface DailyMotivation {
  id: string
  publish_date: string
  quote: string
  reflection: string
  challenge: string
  mission: string
}

interface MemberEvent {
  id: string
  title: string
  detail: string
  time_label?: string | null
  action_url?: string | null
  sort_order: number
}

interface MemberCommunity {
  id: string
  title: string
  detail: string
  action_url?: string | null
  sort_order: number
}

interface PerformanceHighlight {
  id: string
  display_name: string
  metric: string
  period_label?: string | null
  rank_order: number
}

const FALLBACK_PLANS: PremiumPlan[] = [
  {
    id: 'free',
    slug: 'free',
    name: 'Free',
    description: 'Start with daily motivation and a preview of the Bitdoin mentor system.',
    price_lak: 0,
    interval: 'month',
    features: ['Daily motivation preview', 'Limited learning center access', 'Starter AI prompt library'],
    is_active: true,
    sort_order: 1,
  },
  {
    id: 'premium-monthly',
    slug: 'premium-monthly',
    name: 'Premium Monthly',
    description: 'Daily mentor guidance, AI coach access, learning paths, prompt packs, and productivity tools.',
    price_lak: 59000,
    interval: 'month',
    features: ['Daily mentor dashboard', 'AI Coach shortcut', 'Premium lessons and resources', 'Prompt library access', 'Streak and challenge tracking'],
    is_active: true,
    sort_order: 2,
  },
]

const FALLBACK_MOTIVATION: DailyMotivation = {
  id: 'fallback',
  publish_date: new Date().toISOString().slice(0, 10),
  quote: 'The future is created by what you do today.',
  reflection: 'What is one useful thing you can learn, practice, or improve before the day ends?',
  challenge: 'Study for 30 minutes without using your phone.',
  mission: 'Write one sentence about what you learned today.',
}

const PROOF_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const PROOF_MAX_BYTES = 10 * 1024 * 1024

function getFileExtension(file: File) {
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  return 'jpg'
}

function statusLabel(status?: PremiumStatus) {
  if (!status) return 'Free'
  const labels: Record<PremiumStatus, string> = {
    FREE: 'Free',
    PENDING_APPROVAL: 'Awaiting approval',
    PENDING_PAYMENT: 'Waiting for payment',
    PAYMENT_REVIEW: 'Payment review',
    ACTIVE: 'Active',
    CANCELLED: 'Cancelled',
    EXPIRED: 'Expired',
  }
  return labels[status]
}

function statusClass(status?: PremiumStatus) {
  if (status === 'ACTIVE') return 'bg-emerald-100 text-emerald-800'
  if (status === 'PAYMENT_REVIEW') return 'bg-orange-100 text-orange-800'
  if (status === 'PENDING_APPROVAL' || status === 'PENDING_PAYMENT') return 'bg-yellow-100 text-yellow-800'
  if (status === 'CANCELLED' || status === 'EXPIRED') return 'bg-gray-100 text-gray-700'
  return 'bg-primary-100 text-primary-800'
}

function paymentStatusClass(status: PremiumPaymentStatus) {
  const colors: Record<PremiumPaymentStatus, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    REQUIRES_REVIEW: 'bg-orange-100 text-orange-800',
    VERIFIED: 'bg-emerald-100 text-emerald-800',
    REJECTED: 'bg-red-100 text-red-800',
    REFUNDED: 'bg-gray-100 text-gray-700',
  }
  return colors[status]
}

const featureModules = [
  { icon: Brain, title: 'AI Coach', detail: 'Ask about study, career, motivation, English, and time management.' },
  { icon: GraduationCap, title: 'Learning Center', detail: 'Life skills, AI skills, English, career, finance, and productivity.' },
  { icon: Copy, title: 'Prompt Library', detail: 'Ready-to-copy prompts for homework, research, coding, and writing.' },
  { icon: MessageCircle, title: 'English Corner', detail: 'Daily vocabulary, conversations, listening practice, and grammar tips.' },
  { icon: Timer, title: 'Productivity Center', detail: 'Habit tracker, Pomodoro, goals, checklist, and reflection journal.' },
  { icon: FileText, title: 'Resources', detail: 'Study planners, resume templates, prompt packs, and PDF guides.' },
]

const FALLBACK_MEMBER_EVENTS: MemberEvent[] = [
  { id: 'event-ai-study-sprint', title: 'AI Study Sprint', detail: '30-minute focus session with a practical AI prompt challenge.', time_label: 'Tonight', sort_order: 1 },
  { id: 'event-english-circle', title: 'English Speaking Circle', detail: 'Practice simple conversation prompts with other Premium learners.', time_label: 'Saturday', sort_order: 2 },
  { id: 'event-goal-review', title: 'Goal Review Room', detail: 'Review your weekly goal and choose one next action.', time_label: 'Sunday', sort_order: 3 },
]

const FALLBACK_MEMBER_COMMUNITIES: MemberCommunity[] = [
  { id: 'community-accountability', title: 'Study Accountability', detail: 'Share daily progress and keep your streak alive.', sort_order: 1 },
  { id: 'community-prompts', title: 'AI Prompt Practice', detail: 'Compare prompts for homework, coding, writing, and research.', sort_order: 2 },
  { id: 'community-english', title: 'English Corner', detail: 'Daily vocabulary, speaking prompts, and confidence practice.', sort_order: 3 },
]

const FALLBACK_PERFORMANCE_HIGHLIGHTS: PerformanceHighlight[] = [
  { id: 'performer-noy', display_name: 'Noy', metric: '12-day streak', period_label: 'This week', rank_order: 1 },
  { id: 'performer-anousone', display_name: 'Anousone', metric: '960 XP', period_label: 'This week', rank_order: 2 },
  { id: 'performer-mina', display_name: 'Mina', metric: '8 challenges', period_label: 'This week', rank_order: 3 },
]

export function Subscription() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { profile } = useAuth()
  const { currency, language } = useLanguage()
  const { success, error } = useToast()
  const proofInputRef = useRef<HTMLInputElement>(null)
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null)
  const [uploadingProof, setUploadingProof] = useState(false)
  const [completingChallenge, setCompletingChallenge] = useState(false)
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [pendingPlan, setPendingPlan] = useState<PremiumPlan | null>(null)

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['premium', 'plans'],
    queryFn: async () => {
      const { data, error: plansError } = await supabase
        .from('premium_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      if (plansError) throw plansError
      return data as PremiumPlan[]
    },
    retry: 1,
  })

  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['premium', 'subscription', profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error: subscriptionError } = await supabase
        .from('premium_subscriptions')
        .select('*, plan:premium_plans(*)')
        .eq('user_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (subscriptionError) throw subscriptionError
      return data as PremiumSubscription | null
    },
    retry: 1,
  })

  const { data: payments } = useQuery({
    queryKey: ['premium', 'payments', profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error: paymentsError } = await supabase
        .from('premium_payments')
        .select('*, plan:premium_plans(name, slug)')
        .eq('user_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(8)
      if (paymentsError) throw paymentsError
      return data as PremiumPayment[]
    },
    retry: 1,
  })

  const { data: onboarding } = useQuery({
    queryKey: ['premium', 'onboarding', profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error: onboardingError } = await supabase
        .from('premium_onboarding_responses')
        .select('completed')
        .eq('user_id', profile!.id)
        .maybeSingle()
      if (onboardingError) throw onboardingError
      return data as { completed: boolean } | null
    },
    retry: 1,
  })

  const { data: motivation } = useQuery({
    queryKey: ['premium', 'daily-motivation'],
    queryFn: async () => {
      const { data, error: motivationError } = await supabase
        .from('premium_daily_motivations')
        .select('*')
        .eq('is_active', true)
        .order('publish_date', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (motivationError) throw motivationError
      return data as DailyMotivation | null
    },
    retry: 1,
  })

  const premiumMemberContentEnabled = subscription?.status === 'ACTIVE'

  const { data: memberEvents } = useQuery({
    queryKey: ['premium', 'member-events', profile?.id],
    enabled: premiumMemberContentEnabled,
    queryFn: async () => {
      const { data, error: eventsError } = await supabase
        .from('premium_member_events')
        .select('id,title,detail,time_label,action_url,sort_order')
        .eq('is_active', true)
        .order('sort_order')
        .limit(6)
      if (eventsError) throw eventsError
      return data as MemberEvent[]
    },
    retry: 1,
  })

  const { data: memberCommunities } = useQuery({
    queryKey: ['premium', 'communities', profile?.id],
    enabled: premiumMemberContentEnabled,
    queryFn: async () => {
      const { data, error: communitiesError } = await supabase
        .from('premium_communities')
        .select('id,title,detail,action_url,sort_order')
        .eq('is_active', true)
        .order('sort_order')
        .limit(6)
      if (communitiesError) throw communitiesError
      return data as MemberCommunity[]
    },
    retry: 1,
  })

  const { data: performanceHighlights } = useQuery({
    queryKey: ['premium', 'performance-highlights', profile?.id],
    enabled: premiumMemberContentEnabled,
    queryFn: async () => {
      const { data, error: highlightsError } = await supabase
        .from('premium_performance_highlights')
        .select('id,display_name,metric,period_label,rank_order')
        .eq('is_active', true)
        .order('rank_order')
        .limit(6)
      if (highlightsError) throw highlightsError
      return data as PerformanceHighlight[]
    },
    retry: 1,
  })

  const activePlans = plans && plans.length > 0 ? plans : FALLBACK_PLANS
  const todaysMotivation = motivation ?? FALLBACK_MOTIVATION
  const pendingPayment = payments?.find(payment => (
    payment.subscription_id === subscription?.id
    && (payment.status === 'PENDING' || payment.status === 'REJECTED')
  ))
  const isPremiumActive = premiumMemberContentEnabled
  const isPaymentPending = subscription?.status === 'PENDING_PAYMENT'
  const isReviewing = subscription?.status === 'PAYMENT_REVIEW'
  const isAwaitingApproval = subscription?.status === 'PENDING_APPROVAL'
  const planName = subscription?.plan?.name ?? (isPremiumActive ? 'Premium Monthly' : 'Free')

  async function invalidatePremium() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['premium', 'subscription', profile?.id] }),
      qc.invalidateQueries({ queryKey: ['premium', 'payments', profile?.id] }),
    ])
  }

  function requestSubscribe(plan: PremiumPlan) {
    if (!profile) {
      navigate('/auth')
      return
    }
    if (onboarding?.completed) {
      void (plan.price_lak > 0 ? startSubscription(plan) : subscribeFree(plan))
      return
    }
    setPendingPlan(plan)
    setOnboardingOpen(true)
  }

  async function handleOnboardingComplete() {
    setOnboardingOpen(false)
    await qc.invalidateQueries({ queryKey: ['premium', 'onboarding', profile?.id] })
    const plan = pendingPlan
    setPendingPlan(null)
    if (!plan) return
    await (plan.price_lak > 0 ? startSubscription(plan) : subscribeFree(plan))
  }

  async function subscribeFree(plan: PremiumPlan) {
    if (!profile) return
    setBusyPlanId(plan.id)
    try {
      const { error: subscriptionError } = await supabase
        .from('premium_subscriptions')
        .insert({
          user_id: profile.id,
          plan_id: plan.id,
          status: 'PENDING_APPROVAL',
          auto_renew: false,
        })

      if (subscriptionError) throw subscriptionError

      await invalidatePremium()
      success('Your Free membership request was sent for admin approval.')
    } catch (err) {
      console.error(err)
      error('Could not subscribe to the Free plan.')
    } finally {
      setBusyPlanId(null)
    }
  }

  async function startSubscription(plan: PremiumPlan) {
    if (!profile) {
      navigate('/auth')
      return
    }
    if (plan.price_lak <= 0) return

    setBusyPlanId(plan.id)
    try {
      const { data: createdSubscription, error: subscriptionError } = await supabase
        .from('premium_subscriptions')
        .insert({
          user_id: profile.id,
          plan_id: plan.id,
          status: 'PENDING_PAYMENT',
          auto_renew: false,
        })
        .select('*')
        .single()

      if (subscriptionError) throw subscriptionError

      const { error: paymentError } = await supabase
        .from('premium_payments')
        .insert({
          subscription_id: createdSubscription.id,
          user_id: profile.id,
          plan_id: plan.id,
          amount_lak: plan.price_lak,
          currency: 'LAK',
          method: 'MANUAL_TRANSFER',
          status: 'PENDING',
        })

      if (paymentError) throw paymentError

      await invalidatePremium()
      success('Premium subscription created. Upload payment proof after transfer.')
    } catch (err) {
      console.error(err)
      error('Could not start Premium subscription.')
    } finally {
      setBusyPlanId(null)
    }
  }

  async function cancelSubscription() {
    if (!subscription) return
    setBusyPlanId(subscription.plan_id)
    try {
      const { error: cancelError } = await supabase
        .from('premium_subscriptions')
        .update({ status: 'CANCELLED', cancelled_at: new Date().toISOString(), auto_renew: false })
        .eq('id', subscription.id)

      if (cancelError) throw cancelError
      await invalidatePremium()
      success('Premium subscription cancelled.')
    } catch (err) {
      console.error(err)
      error('Could not cancel subscription.')
    } finally {
      setBusyPlanId(null)
    }
  }

  async function uploadPaymentProof(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !profile || !subscription || !pendingPayment) return

    if (!PROOF_MIME_TYPES.includes(file.type)) {
      error('Upload a JPG, PNG, or WebP image.')
      return
    }
    if (file.size > PROOF_MAX_BYTES) {
      error('Payment proof must be 10 MB or smaller.')
      return
    }

    setUploadingProof(true)
    try {
      const path = `${profile.id}/${pendingPayment.id}-${crypto.randomUUID()}.${getFileExtension(file)}`
      const { error: uploadError } = await supabase.storage
        .from('premium-payment-proofs')
        .upload(path, file, { cacheControl: '3600', upsert: false })

      if (uploadError) throw uploadError

      const { error: paymentUpdateError } = await supabase
        .from('premium_payments')
        .update({ receipt_image_url: path, status: 'REQUIRES_REVIEW' })
        .eq('id', pendingPayment.id)

      if (paymentUpdateError) throw paymentUpdateError

      const { error: subscriptionUpdateError } = await supabase
        .from('premium_subscriptions')
        .update({ status: 'PAYMENT_REVIEW' })
        .eq('id', subscription.id)

      if (subscriptionUpdateError) throw subscriptionUpdateError

      await invalidatePremium()
      success('Payment proof submitted. Admin will review it.')
    } catch (err) {
      console.error(err)
      error('Could not upload payment proof.')
    } finally {
      setUploadingProof(false)
    }
  }

  async function completeChallenge() {
    if (!profile || !todaysMotivation || todaysMotivation.id === 'fallback') {
      if (!profile) navigate('/auth')
      return
    }
    setCompletingChallenge(true)
    try {
      const { error: completionError } = await supabase
        .from('premium_challenge_completions')
        .upsert({
          user_id: profile.id,
          motivation_id: todaysMotivation.id,
        }, { onConflict: 'user_id,motivation_id' })
      if (completionError) throw completionError
      success('Challenge completed. Keep the streak going.')
    } catch (err) {
      console.error(err)
      error('Could not mark the challenge complete.')
    } finally {
      setCompletingChallenge(false)
    }
  }

  const pageLoading = plansLoading || (!!profile && subscriptionLoading)

  return (
    <div className="min-h-screen bg-slate-50 pt-[104px] text-slate-950">
      <section className="fixed inset-x-0 top-0 z-30 overflow-visible bg-primary-900 px-4 py-4 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,95,240,0.35),transparent_35%),linear-gradient(135deg,#0f1f35_0%,#162d4a_58%,#1e3a5f_100%)]" />
        <div className="relative mx-auto flex min-h-[72px] max-w-6xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <PwenLogoLockup
              textClassName="text-white"
              subTextClassName="text-primary-200"
              markClassName="rounded-xl bg-white/10 p-1"
            />
            <div className="inline-flex flex-shrink-0 items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-primary-100 ring-1 ring-white/15 sm:text-sm">
              <Crown className="h-3.5 w-3.5 text-amber-300" />
              Premium
            </div>
          </div>
          <div className="hidden min-w-0 flex-1 text-center md:block">
            <h1 className="truncate text-lg font-black text-white lg:text-xl">
              Your daily digital mentor
            </h1>
            <p className="mt-1 truncate text-xs font-semibold text-primary-100 lg:text-sm">
              Study, AI, and personal growth in one Premium workspace.
            </p>
          </div>
          <SubscriptionProfileMenu
            profile={profile}
            planName={planName}
            status={statusLabel(subscription?.status)}
            statusClassName={statusClass(subscription?.status)}
            streak={isPremiumActive ? '7 days' : '0 days'}
            xp={isPremiumActive ? '420' : '0'}
            renewal={subscription?.ends_at ? formatDate(subscription.ends_at, language) : 'Manual'}
            onProfileClick={() => navigate(profile ? '/profile' : '/auth')}
          />
        </div>
      </section>

      {pageLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 pb-24">
          {isPremiumActive ? (
            <MemberDashboard
              profileName={profile?.name ?? 'Premium member'}
              motivation={todaysMotivation}
              language={language}
              completingChallenge={completingChallenge}
              onCompleteChallenge={completeChallenge}
              onOpenCoach={() => navigate('/premium/coach')}
              events={memberEvents && memberEvents.length > 0 ? memberEvents : FALLBACK_MEMBER_EVENTS}
              communities={memberCommunities && memberCommunities.length > 0 ? memberCommunities : FALLBACK_MEMBER_COMMUNITIES}
              performanceHighlights={performanceHighlights && performanceHighlights.length > 0 ? performanceHighlights : FALLBACK_PERFORMANCE_HIGHLIGHTS}
            />
           ) : (
             <>
          {isAwaitingApproval && (
            <section className="flex flex-col gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-black text-sky-950">Awaiting admin approval</p>
                  <p className="mt-1 text-xs leading-5 text-sky-800">
                    Your Free membership request and profile information are being checked. No payment is required.
                  </p>
                </div>
              </div>
              <span className="w-fit rounded-full bg-white px-3 py-1.5 text-xs font-bold text-sky-800 shadow-sm">
                Request submitted
              </span>
            </section>
          )}

          {(isPaymentPending || isReviewing) && (
            <PaymentPanel
              status={subscription?.status}
              payment={pendingPayment}
              uploading={uploadingProof}
              onUploadClick={() => proofInputRef.current?.click()}
            />
          )}

          <input
            ref={proofInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={uploadPaymentProof}
          />

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-3xl bg-white p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-primary-600">Today</p>
                  <h2 className="mt-1 text-xl font-black text-gray-950">Daily mentor</h2>
                </div>
                <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700">
                  {formatDate(todaysMotivation.publish_date, language)}
                </span>
              </div>

              <blockquote className="mt-5 rounded-2xl bg-primary-900 p-5 text-white">
                <Sparkles className="mb-3 h-5 w-5 text-amber-300" />
                <p className="text-lg font-bold leading-7">"{todaysMotivation.quote}"</p>
              </blockquote>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <DailyItem icon={<Lightbulb className="h-4 w-4" />} label="Reflection" text={todaysMotivation.reflection} />
                <DailyItem icon={<Target className="h-4 w-4" />} label="Challenge" text={todaysMotivation.challenge} />
                <DailyItem icon={<CalendarCheck className="h-4 w-4" />} label="Mission" text={todaysMotivation.mission} />
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  onClick={completeChallenge}
                  loading={completingChallenge}
                >
                  Complete challenge
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  icon={<Brain className="h-4 w-4" />}
                  disabled={!isPremiumActive}
                  onClick={() => navigate('/premium/coach')}
                >
                  Open AI Coach
                </Button>
              </div>
            </section>

            <section className="rounded-3xl bg-white p-5 shadow-card">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-primary-600">Access</p>
                  <h2 className="mt-1 text-xl font-black text-gray-950">Premium modules</h2>
                </div>
                {!isPremiumActive && <Lock className="h-5 w-5 text-gray-300" />}
              </div>
              <div className="mt-5 grid gap-3">
                {featureModules.map(module => {
                  const Icon = module.icon
                  return (
                    <div key={module.title} className="flex gap-3 rounded-2xl border border-gray-100 p-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900">{module.title}</p>
                        <p className="mt-0.5 text-xs leading-5 text-gray-500">{module.detail}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          </div>

          <section>
            <div className="mb-3 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-primary-600">Plans</p>
                <h2 className="mt-1 text-xl font-black text-gray-950">Choose your access</h2>
              </div>
              <p className="hidden text-sm text-gray-500 sm:block">Manual activation supports Lao payment workflows.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {activePlans.map(plan => {
                const isCurrent = subscription?.plan_id === plan.id && subscription.status !== 'CANCELLED'
                const isPremium = plan.price_lak > 0
                return (
                  <Card key={plan.slug} className={cn(
                    'border-2',
                    isPremium ? 'border-primary-200' : 'border-gray-100',
                    isCurrent && 'border-primary-700',
                  )}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          {isPremium ? <Crown className="h-5 w-5 text-amber-500" /> : <ShieldCheck className="h-5 w-5 text-primary-600" />}
                          <h3 className="text-lg font-black text-gray-950">{plan.name}</h3>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-gray-500">{plan.description}</p>
                      </div>
                      {isCurrent && (
                        <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700">Current</span>
                      )}
                    </div>

                    <div className="mt-5 flex items-baseline gap-2">
                      <span className="text-3xl font-black text-gray-950">{formatPrice(plan.price_lak, currency)}</span>
                      <span className="text-sm font-semibold text-gray-400">/{plan.interval}</span>
                    </div>

                    <div className="mt-5 space-y-2">
                      {plan.features.map(feature => (
                        <div key={feature} className="flex items-start gap-2 text-sm text-gray-600">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6">
                      {isPremium ? (
                        <Button
                          type="button"
                          fullWidth
                          icon={<Rocket className="h-4 w-4" />}
                          onClick={() => requestSubscribe(plan)}
                          loading={busyPlanId === plan.id}
                          disabled={isPremiumActive || isPaymentPending || isReviewing}
                        >
                          {isPremiumActive ? 'Premium active' : isPaymentPending || isReviewing ? 'Payment in progress' : 'Start Premium'}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          fullWidth
                          icon={<CheckCircle2 className="h-4 w-4" />}
                          onClick={() => requestSubscribe(plan)}
                          loading={busyPlanId === plan.id}
                          disabled={isCurrent || isPremiumActive || isPaymentPending || isReviewing}
                        >
                          {isCurrent ? 'Current plan' : 'Subscribe'}
                        </Button>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="rounded-3xl bg-white p-5 shadow-card">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-primary-600">Subscription</p>
                  <h2 className="mt-1 text-xl font-black text-gray-950">Membership control</h2>
                </div>
                <ReceiptText className="h-5 w-5 text-primary-600" />
              </div>

              <div className="mt-5 space-y-3">
                <InfoRow label="Current plan" value={planName} />
                <InfoRow label="Status" value={statusLabel(subscription?.status)} />
                <InfoRow label="Renewal" value={subscription?.ends_at ? formatDate(subscription.ends_at, language) : 'Manual activation'} />
                <InfoRow label="Auto-renew" value={subscription?.auto_renew ? 'On' : 'Off'} />
              </div>

              <Button
                type="button"
                variant="outline"
                fullWidth
                icon={<XCircle className="h-4 w-4" />}
                onClick={cancelSubscription}
                loading={busyPlanId === subscription?.plan_id}
                disabled={!subscription || subscription.status === 'CANCELLED' || subscription.status === 'EXPIRED'}
                className="mt-5 border-red-200 text-red-600 hover:bg-red-50"
              >
                Cancel subscription
              </Button>
            </section>

            <section className="rounded-3xl bg-white p-5 shadow-card">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-primary-600">Billing</p>
                  <h2 className="mt-1 text-xl font-black text-gray-950">Payment history</h2>
                </div>
                <ReceiptText className="h-5 w-5 text-primary-600" />
              </div>

              <div className="mt-5 space-y-3">
                {(payments ?? []).length > 0 ? payments!.map(payment => (
                  <div key={payment.id} className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-gray-900">{payment.plan?.name ?? 'Premium'}</p>
                      <p className="mt-0.5 text-xs text-gray-400">{formatDate(payment.created_at, language)} · {formatPrice(payment.amount_lak, currency)}</p>
                    </div>
                    <span className={cn('flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-bold', paymentStatusClass(payment.status))}>
                      {payment.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center">
                    <ReceiptText className="mx-auto h-8 w-8 text-gray-300" />
                    <p className="mt-2 text-sm font-semibold text-gray-700">No Premium payments yet</p>
                    <p className="mt-1 text-xs text-gray-400">Start Premium to create your first subscription payment.</p>
                  </div>
                )}
              </div>
            </section>
          </div>
            </>
          )}
        </div>
      )}

      {profile && (
        <OnboardingChat
          open={onboardingOpen}
          userId={profile.id}
          onClose={() => { setOnboardingOpen(false); setPendingPlan(null) }}
          onComplete={handleOnboardingComplete}
        />
      )}
    </div>
  )
}

function SubscriptionProfileMenu({
  profile,
  planName,
  status,
  statusClassName,
  streak,
  xp,
  renewal,
  onProfileClick,
}: {
  profile: AppUser | null
  planName: string
  status: string
  statusClassName: string
  streak: string
  xp: string
  renewal: string
  onProfileClick: () => void
}) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const displayName = profile?.name?.trim() || 'Guest user'
  const contact = profile?.email ?? profile?.phone ?? 'Sign in to use Premium'
  const initial = (displayName.charAt(0) || '?').toUpperCase()

  useEffect(() => {
    if (!open) return

    function closeOnOutsideClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false)
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  function handleProfileClick() {
    setOpen(false)
    onProfileClick()
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-white/15 text-sm font-black text-white ring-2 ring-white/25 transition hover:bg-white/20 hover:ring-white/40"
      >
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt={displayName} className="h-full w-full object-cover" />
        ) : (
          <span>{initial}</span>
        )}
        <span className="sr-only">Open profile menu</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-3 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/15 bg-white p-3 text-left text-slate-950 shadow-2xl"
        >
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-100 text-sm font-black text-primary-800">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span>{initial}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-950">{displayName}</p>
              <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{contact}</p>
            </div>
          </div>

          <div className="mt-3 rounded-2xl bg-slate-950 p-4 text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wide text-primary-200">Membership</p>
                <p className="mt-1 truncate text-lg font-black">{planName}</p>
              </div>
              <span className={cn('flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-bold', statusClassName)}>
                {status}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <ProfileMenuStat label="Streak" value={streak} icon={<Flame className="h-4 w-4" />} />
              <ProfileMenuStat label="XP" value={xp} icon={<Zap className="h-4 w-4" />} />
              <ProfileMenuStat label="Renews" value={renewal} icon={<Clock className="h-4 w-4" />} />
            </div>
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={handleProfileClick}
            className="mt-2 flex w-full items-center justify-between gap-3 rounded-xl bg-sky-100 px-3 py-2.5 text-sm font-black text-sky-900 transition hover:bg-sky-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <span>{profile ? 'Back to Profile' : 'Sign in'}</span>
            <ArrowRight className="h-4 w-4 flex-shrink-0" />
          </button>
        </div>
      )}
    </div>
  )
}

function MemberDashboard({
  profileName,
  motivation,
  language,
  completingChallenge,
  onCompleteChallenge,
  onOpenCoach,
  events,
  communities,
  performanceHighlights,
}: {
  profileName: string
  motivation: DailyMotivation
  language: Language
  completingChallenge: boolean
  onCompleteChallenge: () => void
  onOpenCoach: () => void
  events: MemberEvent[]
  communities: MemberCommunity[]
  performanceHighlights: PerformanceHighlight[]
}) {
  return (
    <>
      <section className="rounded-3xl bg-primary-900 p-5 text-white shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary-200">Member home</p>
            <h2 className="mt-1 text-2xl font-black">Welcome back, {profileName}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-primary-100">
              Your Premium workspace is ready for today: mentor guidance, events, communities, and performance highlights.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 md:w-80">
            <ProfileMenuStat label="Streak" value="7 days" icon={<Flame className="h-4 w-4" />} />
            <ProfileMenuStat label="XP" value="420" icon={<Zap className="h-4 w-4" />} />
            <ProfileMenuStat label="Rank" value="#12" icon={<Trophy className="h-4 w-4" />} />
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-3xl bg-white p-5 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-primary-600">Today</p>
              <h2 className="mt-1 text-xl font-black text-gray-950">Daily mentor</h2>
            </div>
            <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700">
              {formatDate(motivation.publish_date, language)}
            </span>
          </div>

          <blockquote className="mt-5 rounded-2xl bg-primary-900 p-5 text-white">
            <Sparkles className="mb-3 h-5 w-5 text-amber-300" />
            <p className="text-lg font-bold leading-7">"{motivation.quote}"</p>
          </blockquote>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <DailyItem icon={<Lightbulb className="h-4 w-4" />} label="Reflection" text={motivation.reflection} />
            <DailyItem icon={<Target className="h-4 w-4" />} label="Challenge" text={motivation.challenge} />
            <DailyItem icon={<CalendarCheck className="h-4 w-4" />} label="Mission" text={motivation.mission} />
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              icon={<CheckCircle2 className="h-4 w-4" />}
              onClick={onCompleteChallenge}
              loading={completingChallenge}
            >
              Complete challenge
            </Button>
            <Button type="button" variant="outline" icon={<Brain className="h-4 w-4" />} onClick={onOpenCoach}>
              Open AI Coach
            </Button>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-primary-600">Community</p>
              <h2 className="mt-1 text-xl font-black text-gray-950">Top performers</h2>
            </div>
            <Trophy className="h-5 w-5 text-amber-500" />
          </div>
          <div className="mt-5 space-y-3">
            {performanceHighlights.map((performer, index) => (
              <div key={performer.id} className="flex items-center gap-3 rounded-2xl border border-gray-100 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-sm font-black text-amber-700">
                  #{index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-gray-900">{performer.display_name}</p>
                  <p className="mt-0.5 text-xs text-gray-400">{performer.metric}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <MemberListSection
          eyebrow="Events"
          title="Upcoming member events"
          icon={<CalendarCheck className="h-5 w-5 text-primary-600" />}
          items={events}
        />
        <MemberListSection
          eyebrow="Communities"
          title="Premium communities"
          icon={<Users className="h-5 w-5 text-primary-600" />}
          items={communities}
        />
      </div>
    </>
  )
}

function MemberListSection({
  eyebrow,
  title,
  icon,
  items,
}: {
  eyebrow: string
  title: string
  icon: React.ReactNode
  items: Array<{ id: string; title: string; detail: string; time_label?: string | null; action_url?: string | null }>
}) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-primary-600">{eyebrow}</p>
          <h2 className="mt-1 text-xl font-black text-gray-950">{title}</h2>
        </div>
        {icon}
      </div>
      <div className="mt-5 grid gap-3">
        {items.map(item => (
          <div key={item.id} className="rounded-2xl border border-gray-100 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-gray-950">{item.title}</p>
                <p className="mt-1 text-xs leading-5 text-gray-500">{item.detail}</p>
              </div>
              {item.time_label && (
                <span className="flex-shrink-0 rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-bold text-primary-700">
                  {item.time_label}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function ProfileMenuStat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl bg-white/10 p-2 ring-1 ring-white/10">
      <div className="mb-1 text-primary-200">{icon}</div>
      <p className="truncate text-sm font-black text-white">{value}</p>
      <p className="mt-0.5 truncate text-[10px] font-semibold text-primary-200">{label}</p>
    </div>
  )
}

function DailyItem({ icon, label, text }: { icon: React.ReactNode; label: string; text: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <div className="mb-3 flex items-center gap-2 text-primary-700">
        {icon}
        <p className="text-xs font-bold uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-sm leading-6 text-gray-700">{text}</p>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-right text-sm font-bold text-gray-900">{value}</span>
    </div>
  )
}

function PaymentPanel({
  status,
  payment,
  uploading,
  onUploadClick,
}: {
  status?: PremiumStatus
  payment?: PremiumPayment
  uploading: boolean
  onUploadClick: () => void
}) {
  const amount = payment ? formatPrice(payment.amount_lak, 'LAK') : 'Pending'
  return (
    <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            {status === 'PAYMENT_REVIEW' ? <Clock className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
          </div>
          <div>
            <p className="text-sm font-black text-amber-950">
              {status === 'PAYMENT_REVIEW' ? 'Payment proof is under review' : 'Manual transfer required'}
            </p>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-amber-800">
              Transfer {amount} for Bitdoin Premium, then upload the payment proof here. This is separate from bookstore payment review.
            </p>
          </div>
        </div>
        <Button
          type="button"
          icon={<Upload className="h-4 w-4" />}
          onClick={onUploadClick}
          loading={uploading}
          disabled={status === 'PAYMENT_REVIEW' || !payment}
          className="bg-amber-600 hover:bg-amber-700"
        >
          Upload proof
        </Button>
      </div>
    </section>
  )
}
