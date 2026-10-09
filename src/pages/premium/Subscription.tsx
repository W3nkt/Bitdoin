import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowRight,
  AlertTriangle,
  Brain,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Copy,
  Crown,
  FileText,
  Flame,
  GraduationCap,
  History,
  ImageDown,
  Lightbulb,
  Lock,
  MessageCircle,
  QrCode,
  RefreshCw,
  ReceiptText,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
  Trophy,
  Upload,
  Users,
  ZoomIn,
  XCircle,
  Zap,
  ChevronDown,
  X as XIcon,
} from 'lucide-react'
import { PwenLogoLockup } from '@/components/brand/PwenLogo'
import { OnboardingChat } from '@/components/premium/OnboardingChat'
import { PlayLearnArcade } from '@/components/premium/PlayLearnArcade'
import { PremiumProfileMenu } from '@/components/premium/ProfileMenu'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { supabase } from '@/lib/supabase'
import { notifyAdminOfAcademyPayment, notifyAdminOfAcademySubscription, requestAcademyPaymentReview } from '@/lib/premiumNotify'
import { firstRelation } from '@/lib/supabaseRelations'
import { usePremiumTranslation } from '@/i18n/premium'
import { EXPIRY_WARNING_DAYS, isMembershipExpired } from '@/lib/academyMembership'
import { cn } from '@/lib/utils'
import { formatDate, formatPrice } from '@/lib/utils'
import type { Language, PaymentAccount } from '@/types'

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

interface PremiumPersonalization {
  completed: boolean
  responses: Record<string, string>
}

interface DailyMotivation {
  id: string
  publish_date: string
  quote: string
  reflection: string
  challenge: string
  mission: string
  source?: 'personalized' | 'global'
}

type DailyChallengeKind = 'reflection' | 'challenge' | 'mission'

interface DailyChallengeCompletion {
  responses: Partial<Record<DailyChallengeKind, string>>
  completed_at: string | null
}

interface DailyChallengeHistoryEntry extends DailyChallengeCompletion {
  id: string
  motivation?: Pick<DailyMotivation, 'publish_date' | 'quote' | 'reflection' | 'challenge' | 'mission'> | null
  guidance?: Pick<DailyMotivation, 'publish_date' | 'quote' | 'reflection' | 'challenge' | 'mission'> | null
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

interface PremiumMemberStats {
  streak: number
  xp: number
  rank: number
  completed_days: number
  completed_items: number
}

interface PremiumLeaderboardEntry {
  display_name: string
  avatar_url?: string | null
  xp: number
  streak: number
  rank: number
  is_current_user: boolean
}

interface PremiumMemberDashboardData {
  member: PremiumMemberStats
  leaderboard: PremiumLeaderboardEntry[]
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
    price_lak: 39000,
    interval: 'month',
    features: ['Daily mentor dashboard', 'AI Coach shortcut', 'Premium lessons and resources', 'Prompt library access', 'Streak and challenge tracking'],
    is_active: true,
    sort_order: 2,
  },
  {
    id: 'premium-yearly',
    slug: 'premium-yearly',
    name: 'Premium Yearly',
    description: 'Daily mentor guidance, AI coach access, learning paths, prompt packs, and productivity tools.',
    price_lak: 390000,
    interval: 'year',
    features: ['Daily mentor dashboard', 'AI Coach shortcut', 'Premium lessons and resources', 'Prompt library access', 'Streak and challenge tracking'],
    is_active: true,
    sort_order: 3,
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

function formatStreak(days: number) {
  return `${days} ${days === 1 ? 'day' : 'days'}`
}

const DISMISSED_REJECTION_KEY = 'academy_rejected_payment_dismissed'

function readDismissedRejection() {
  try {
    return localStorage.getItem(DISMISSED_REJECTION_KEY)
  } catch {
    return null
  }
}

function writeDismissedRejection(paymentId: string) {
  try {
    localStorage.setItem(DISMISSED_REJECTION_KEY, paymentId)
  } catch {
    // Blocked storage: the notice just shows again on the next visit.
  }
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

function paymentStatusClass(status: PremiumPaymentStatus) {
  const colors: Record<PremiumPaymentStatus, string> = {
    PENDING: 'bg-yellow-100 dark:bg-yellow-500/15 text-yellow-800 dark:text-yellow-300',
    REQUIRES_REVIEW: 'bg-orange-100 dark:bg-orange-500/15 text-orange-800 dark:text-orange-300',
    VERIFIED: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300',
    REJECTED: 'bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-300',
    REFUNDED: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200',
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

export function Subscription() {
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const { profile } = useAuth()
  const { currency, language } = useLanguage()
  usePremiumTranslation()
  const { success, error } = useToast()
  const proofInputRef = useRef<HTMLInputElement>(null)
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null)
  const [uploadingProof, setUploadingProof] = useState(false)
  const [completingChallenge, setCompletingChallenge] = useState(false)
  const [savingDailyItem, setSavingDailyItem] = useState<DailyChallengeKind | null>(null)
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [pendingPlan, setPendingPlan] = useState<PremiumPlan | null>(null)
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false)
  // Rejected payment notice: hidden per payment once dismissed (this device).
  const [dismissedRejectionId, setDismissedRejectionId] = useState(readDismissedRejection)
  // Payment history rows that are open to show their rejection reason.
  const [openPaymentIds, setOpenPaymentIds] = useState<Set<string>>(() => new Set())
  const [qrPaymentOpen, setQrPaymentOpen] = useState(false)
  const [qrPlan, setQrPlan] = useState<PremiumPlan | null>(null)
  const [qrPreview, setQrPreview] = useState<{ url: string; label: string } | null>(null)
  const [savingQr, setSavingQr] = useState(false)
  const [nowMs, setNowMs] = useState(() => Date.now())

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['premium', 'plans'],
    queryFn: async () => {
      const { data, error: plansError } = await supabase
        .from('premium_plans')
        .select('id,slug,name,description,price_lak,interval,features,is_active,sort_order')
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
        .select('id,user_id,plan_id,status,starts_at,ends_at,cancelled_at,auto_renew,created_at,plan:premium_plans(id,slug,name,description,price_lak,interval,features,is_active,sort_order)')
        .eq('user_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (subscriptionError) throw subscriptionError
      if (!data) return null
      return { ...data, plan: firstRelation(data.plan) ?? undefined } as PremiumSubscription
    },
    // Membership status must never be served from the app-wide 2-minute
    // staleTime — after an admin approves a request, the member should see
    // it reflected the moment this page is opened, not minutes later.
    staleTime: 0,
    refetchOnMount: 'always',
    retry: 1,
  })

  // Admin approval happens in a separate session/tab — without this, a
  // member watching this page would only see the update after a full
  // reload, since staleTime/refetchOnMount only kick in on remount.
  useEffect(() => {
    if (!profile) return
    const channel = supabase
      .channel(`premium-subscription-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'premium_subscriptions', filter: `user_id=eq.${profile.id}` }, () => {
        qc.invalidateQueries({ queryKey: ['premium', 'subscription', profile.id] })
        qc.invalidateQueries({ queryKey: ['premium', 'subscription-menu', profile.id] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'premium_payments', filter: `user_id=eq.${profile.id}` }, () => {
        qc.invalidateQueries({ queryKey: ['premium', 'payments', profile.id] })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile, qc])

  const { data: paymentAccounts } = useQuery({
    queryKey: ['premium', 'payment-accounts'],
    queryFn: async () => {
      const { data, error: accountsError } = await supabase
        .from('payment_accounts')
        .select('id,method,label,bank_name,account_name,account_number,qr_image_url,instructions,is_active,sort_order,created_at,updated_at')
        .eq('is_active', true)
        .order('sort_order')
      if (accountsError) throw accountsError
      return data as PaymentAccount[]
    },
    staleTime: 1000 * 60 * 10,
    retry: 1,
  })

  const { data: payments } = useQuery({
    queryKey: ['premium', 'payments', profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error: paymentsError } = await supabase
        .from('premium_payments')
        .select('id,subscription_id,user_id,plan_id,amount_lak,currency,method,status,receipt_image_url,rejection_reason,created_at,plan:premium_plans(name,slug)')
        .eq('user_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(8)
      if (paymentsError) throw paymentsError
      return (data ?? []).map(row => ({
        ...row,
        plan: firstRelation(row.plan) ?? undefined,
      })) as PremiumPayment[]
    },
    retry: 1,
  })

  const { data: onboarding, isLoading: onboardingLoading } = useQuery({
    queryKey: ['premium', 'onboarding-profile-v2', profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error: onboardingError } = await supabase
        .from('premium_onboarding_responses')
        .select('completed, responses')
        .eq('user_id', profile!.id)
        .maybeSingle()
      if (onboardingError) throw onboardingError
      return data as PremiumPersonalization | null
    },
    staleTime: 0,
    refetchOnMount: 'always',
    retry: 1,
  })

  // An ACTIVE subscription on the $0 Free plan still has status = 'ACTIVE',
  // so "Premium" access requires the active plan to actually be paid —
  // otherwise Free members would silently get the full Premium experience
  // (and never see a plan to upgrade to).
  // Paid rows stay ACTIVE after ends_at; the database denies access from then on.
  const membershipExpired = isMembershipExpired(subscription, nowMs)
  const isPaidPremium = subscription?.status === 'ACTIVE' && !membershipExpired && (subscription?.plan?.price_lak ?? 0) > 0

  const { data: motivation } = useQuery({
    queryKey: ['premium', 'daily-motivation', profile?.id, isPaidPremium],
    queryFn: async () => {
      if (profile && isPaidPremium) {
        const { data: generated, error: generationError } = await supabase.functions.invoke('premium-daily-mentor')
        if (!generationError && generated?.guidance) {
          return generated.guidance as DailyMotivation
        }
        console.error('Could not load personalized daily guidance', generationError ?? generated?.error)
      }

      const { data, error: motivationError } = await supabase
        .from('premium_daily_motivations')
        .select('id,publish_date,quote,reflection,challenge,mission')
        .eq('is_active', true)
        .order('publish_date', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (motivationError) throw motivationError
      return data ? { ...(data as DailyMotivation), source: 'global' as const } : null
    },
    staleTime: 1000 * 60 * 30,
    retry: 1,
  })

  const { data: dailyCompletion } = useQuery({
    queryKey: ['premium', 'daily-completion', profile?.id, motivation?.id],
    enabled: Boolean(profile && motivation?.id),
    queryFn: async () => {
      let completionQuery = supabase
        .from('premium_challenge_completions')
        .select('responses, completed_at')
        .eq('user_id', profile!.id)
      completionQuery = motivation!.source === 'personalized'
        ? completionQuery.eq('guidance_id', motivation!.id)
        : completionQuery.eq('motivation_id', motivation!.id)
      const { data, error: completionError } = await completionQuery.maybeSingle()
      if (completionError) throw completionError
      return data as DailyChallengeCompletion | null
    },
    retry: 1,
  })

  const { data: dailyHistory, isLoading: dailyHistoryLoading } = useQuery({
    queryKey: ['premium', 'daily-history', profile?.id],
    enabled: Boolean(profile && subscription?.status === 'ACTIVE' && !membershipExpired),
    queryFn: async () => {
      const { data, error: historyError } = await supabase
        .from('premium_challenge_completions')
        .select('id,responses,completed_at,motivation:premium_daily_motivations(publish_date,quote,reflection,challenge,mission),guidance:premium_personalized_daily_guidance(publish_date,quote,reflection,challenge,mission)')
        .eq('user_id', profile!.id)
        .order('completed_at', { ascending: false, nullsFirst: false })
        .limit(30)
      if (historyError) throw historyError
      return (data ?? []).map(row => ({
        ...row,
        motivation: firstRelation(row.motivation),
        guidance: firstRelation(row.guidance),
      })).sort((a, b) => {
        const aDate = firstRelation(a.guidance)?.publish_date ?? firstRelation(a.motivation)?.publish_date ?? ''
        const bDate = firstRelation(b.guidance)?.publish_date ?? firstRelation(b.motivation)?.publish_date ?? ''
        return bDate.localeCompare(aDate)
      }) as DailyChallengeHistoryEntry[]
    },
    retry: 1,
  })

  const premiumMemberContentEnabled = isPaidPremium

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

  const { data: memberProgress } = useQuery({
    queryKey: ['premium', 'member-progress', profile?.id],
    enabled: premiumMemberContentEnabled,
    queryFn: async () => {
      const { data, error: progressError } = await supabase
        .rpc('get_premium_member_dashboard', { p_limit: 5 })
      if (progressError) throw progressError
      return data as PremiumMemberDashboardData | null
    },
    staleTime: 1000 * 60,
    retry: 1,
  })

  const activePlans = plans && plans.length > 0 ? plans : FALLBACK_PLANS
  const todaysMotivation = motivation ?? FALLBACK_MOTIVATION
  const pendingPayment = payments?.find(payment => (
    payment.subscription_id === subscription?.id
    && (payment.status === 'PENDING' || payment.status === 'REJECTED')
  ))
  // The admin declined the latest request: the request is CANCELLED and its
  // payment REJECTED with the admin's reason.
  const rejectedPayment = subscription?.status === 'CANCELLED'
    ? payments?.find(payment => payment.subscription_id === subscription.id && payment.status === 'REJECTED')
    : undefined
  const showRejectedNotice = !!rejectedPayment && dismissedRejectionId !== rejectedPayment.id
  const isPremiumActive = premiumMemberContentEnabled
  // The member home page (mentor, arcade, events, communities) is a benefit
  // of ANY active membership, including the Free plan — that's the whole
  // point of "the subscribed home page". isPaidPremium separately controls
  // paid-only extras (personalized AI guidance, higher limits) and whether
  // the upgrade banner/plans are shown.
  const isMemberActive = subscription?.status === 'ACTIVE' && !membershipExpired
  // Cancelled, but the paid period hasn't ended: full access continues until ends_at.
  const cancelledWithAccess = isMemberActive && !!subscription?.cancelled_at && !!subscription?.ends_at
  // What cancelling now would do: keep paid access until ends_at, or end at once.
  const cancelKeepsAccess = isPaidPremium && !!subscription?.ends_at && !cancelledWithAccess
  const isPaymentPending = subscription?.status === 'PENDING_PAYMENT'
  const isReviewing = subscription?.status === 'PAYMENT_REVIEW'
  const isAwaitingApproval = subscription?.status === 'PENDING_APPROVAL'
  const planName = subscription?.plan?.name ?? (isPremiumActive ? 'Premium Monthly' : 'Free')
  const subscriptionRemainingMs = subscription?.ends_at ? new Date(subscription.ends_at).getTime() - nowMs : null
  const showExpiryWarning = Boolean(
    isPaidPremium
    && subscriptionRemainingMs != null
    && subscriptionRemainingMs > 0
    && subscriptionRemainingMs <= EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000,
  )
  const remainingTotalHours = Math.max(0, Math.ceil((subscriptionRemainingMs ?? 0) / (60 * 60 * 1000)))
  const remainingDays = Math.floor(remainingTotalHours / 24)
  const remainingHours = remainingTotalHours % 24

  useEffect(() => {
    if (!subscription?.ends_at || subscription.status !== 'ACTIVE') return
    setNowMs(Date.now())
    const timer = window.setInterval(() => setNowMs(Date.now()), 60 * 1000)
    return () => window.clearInterval(timer)
  }, [subscription?.ends_at, subscription?.status])

  async function invalidatePremium() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['premium', 'subscription', profile?.id] }),
      qc.invalidateQueries({ queryKey: ['premium', 'subscription-menu', profile?.id] }),
      qc.invalidateQueries({ queryKey: ['premium', 'payments', profile?.id] }),
    ])
  }

  function requestSubscribe(plan: PremiumPlan) {
    if (!profile) {
      navigate('/auth')
      return
    }
    if (subscription?.plan_id === plan.id && subscription.status === 'ACTIVE' && !membershipExpired) {
      error('You are already on this plan.')
      return
    }
    // Already have an unpaid request for this exact plan — resume it
    // instead of creating a duplicate subscription + payment row.
    if (subscription?.plan_id === plan.id && (subscription.status === 'PENDING_PAYMENT' || subscription.status === 'PAYMENT_REVIEW')) {
      if (plan.price_lak > 0) {
        setQrPlan(plan)
        setQrPaymentOpen(true)
      }
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
    await qc.invalidateQueries({ queryKey: ['premium', 'onboarding-profile-v2', profile?.id] })
    const plan = pendingPlan
    setPendingPlan(null)
    if (!plan) return
    await (plan.price_lak > 0 ? startSubscription(plan) : subscribeFree(plan))
  }

  // Abandoned/duplicate pending requests (from retries or switching plans
  // before finishing payment) must not pile up as separate rows — only the
  // currently ACTIVE plan (handled server-side on approval) should survive.
  async function supersedeAbandonedRequests() {
    if (!profile) return
    await supabase
      .from('premium_subscriptions')
      .update({ status: 'CANCELLED', cancelled_at: new Date().toISOString(), auto_renew: false })
      .eq('user_id', profile.id)
      .in('status', ['PENDING_APPROVAL', 'PENDING_PAYMENT', 'PAYMENT_REVIEW'])
  }

  async function subscribeFree(plan: PremiumPlan) {
    if (!profile) return
    setBusyPlanId(plan.id)
    try {
      await supersedeAbandonedRequests()

      const { data: createdSubscription, error: subscriptionError } = await supabase
        .from('premium_subscriptions')
        .insert({
          user_id: profile.id,
          plan_id: plan.id,
          status: 'PENDING_APPROVAL',
          auto_renew: false,
        })
        .select('id')
        .single()

      if (subscriptionError) throw subscriptionError

      notifyAdminOfAcademySubscription(createdSubscription.id)

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
      await supersedeAbandonedRequests()

      const { data: createdSubscription, error: subscriptionError } = await supabase
        .from('premium_subscriptions')
        .insert({
          user_id: profile.id,
          plan_id: plan.id,
          status: 'PENDING_PAYMENT',
          auto_renew: false,
        })
        .select('id,user_id,plan_id,status,starts_at,ends_at,cancelled_at,auto_renew,created_at')
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

      notifyAdminOfAcademySubscription(createdSubscription.id)

      await invalidatePremium()
      setQrPlan(plan)
      setQrPaymentOpen(true)
      success('Premium subscription created. Scan the QR code to pay, then upload your proof.')
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
      // A paid membership with time left stays ACTIVE until ends_at (it just
      // won't renew); free plans and pending requests end right away.
      const { data, error: cancelError } = await supabase.rpc('cancel_premium_subscription', {
        p_subscription_id: subscription.id,
      })
      if (cancelError) throw cancelError
      const result = (Array.isArray(data) ? data[0] : data) as { status: PremiumStatus; ends_at: string | null } | null
      await invalidatePremium()
      if (result?.status === 'ACTIVE' && result.ends_at) {
        success(language === 'lo'
          ? `ຍົກເລີກແລ້ວ. ທ່ານຍັງໃຊ້ງານໄດ້ຄົບທຸກຢ່າງຈົນຮອດວັນທີ ${formatDate(result.ends_at, language)}.`
          : `Subscription cancelled. You keep full access until ${formatDate(result.ends_at, language)}.`)
      } else {
        success(language === 'lo' ? 'ຍົກເລີກການສະໝັກສະມາຊິກແລ້ວ.' : 'Premium subscription cancelled.')
      }
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

      notifyAdminOfAcademyPayment(subscription.id, pendingPayment.id)
      requestAcademyPaymentReview(pendingPayment.id)

      await invalidatePremium()
      success('Payment proof submitted. Admin will review it.')
    } catch (err) {
      console.error(err)
      error('Could not upload payment proof.')
    } finally {
      setUploadingProof(false)
    }
  }

  async function copyAccountNumber(accountNumber: string) {
    try {
      await navigator.clipboard.writeText(accountNumber)
      success(language === 'lo' ? 'ສຳເນົາເລກບັນຊີແລ້ວ' : 'Account number copied')
    } catch (copyError) {
      console.error(copyError)
      error(language === 'lo' ? 'ບໍ່ສາມາດສຳເນົາເລກບັນຊີໄດ້' : 'Could not copy the account number')
    }
  }

  async function saveQrImage() {
    if (!qrPreview) return
    setSavingQr(true)
    try {
      const response = await fetch(qrPreview.url)
      if (!response.ok) throw new Error('Could not download QR image')
      const blob = await response.blob()
      const extension = blob.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png'
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = `bitdoin-payment-qr.${extension}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
      success(language === 'lo' ? 'ບັນທຶກຮູບ QR ແລ້ວ' : 'QR image saved')
    } catch (downloadError) {
      console.error(downloadError)
      window.open(qrPreview.url, '_blank', 'noopener,noreferrer')
      error(language === 'lo' ? 'ເປີດຮູບ QR ແລ້ວ. ກົດຄ້າງທີ່ຮູບເພື່ອບັນທຶກ.' : 'QR image opened. Press and hold the image to save it.')
    } finally {
      setSavingQr(false)
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

  async function saveDailyReply(kind: DailyChallengeKind, reply: string) {
    if (!profile || !todaysMotivation || todaysMotivation.id === 'fallback') {
      if (!profile) navigate('/auth')
      return
    }

    const normalizedReply = reply.trim()
    if (!normalizedReply) return

    setSavingDailyItem(kind)
    try {
      const responses = {
        ...(dailyCompletion?.responses ?? {}),
        [kind]: normalizedReply,
      }
      const allCompleted = (['reflection', 'challenge', 'mission'] as DailyChallengeKind[])
        .every(item => Boolean(responses[item]?.trim()))
      const sourceId = todaysMotivation.source === 'personalized'
        ? { guidance_id: todaysMotivation.id, motivation_id: null }
        : { motivation_id: todaysMotivation.id, guidance_id: null }
      const conflictColumns = todaysMotivation.source === 'personalized'
        ? 'user_id,guidance_id'
        : 'user_id,motivation_id'
      const { error: completionError } = await supabase
        .from('premium_challenge_completions')
        .upsert({
          user_id: profile.id,
          ...sourceId,
          responses,
          completed_at: allCompleted ? new Date().toISOString() : null,
        }, { onConflict: conflictColumns })
      if (completionError) throw completionError
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['premium', 'daily-completion', profile.id, todaysMotivation.id] }),
        qc.invalidateQueries({ queryKey: ['premium', 'member-progress', profile.id] }),
        qc.invalidateQueries({ queryKey: ['premium', 'daily-history', profile.id] }),
      ])
      success(allCompleted ? 'All three daily challenges completed!' : 'Reply saved. Keep going!')
    } catch (saveError) {
      console.error(saveError)
      error('Could not save your reply.')
    } finally {
      setSavingDailyItem(null)
    }
  }

  const pageLoading = plansLoading || (!!profile && subscriptionLoading)

  // React Router doesn't auto-scroll to URL hashes on client-side navigation,
  // so "Upgrade"/"Subscribe" links from other pages (which land here as
  // /academy/subscription#plans) need an explicit scroll once the plans
  // section has actually rendered.
  useEffect(() => {
    if (location.hash !== '#plans' || pageLoading) return
    document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [location.hash, pageLoading])

  // "Subscribe again" on the expiry banner / profile menu lands here as
  // ?renew=1: run the normal Subscribe flow for the paid plan the member had
  // last (payment QR, or the onboarding chat first if it isn't done).
  const renewHandledRef = useRef(false)
  useEffect(() => {
    // Wait for onboarding too: requestSubscribe opens the onboarding chat when it looks unfinished.
    if (!new URLSearchParams(location.search).has('renew') || pageLoading || onboardingLoading || !profile || renewHandledRef.current) return
    renewHandledRef.current = true
    navigate({ pathname: location.pathname, hash: '#plans' }, { replace: true })
    void (async () => {
      const { data } = await supabase
        .from('premium_subscriptions')
        .select('plan_id,plan:premium_plans(price_lak)')
        .eq('user_id', profile.id)
        .not('ends_at', 'is', null)
        .order('ends_at', { ascending: false })
        .limit(5)
      const lastPaid = (data ?? []).find(row => (firstRelation(row.plan)?.price_lak ?? 0) > 0)
      const plan = activePlans.find(candidate => candidate.id === lastPaid?.plan_id && candidate.price_lak > 0)
      // No earlier paid plan (or it was retired): the #plans scroll lets them pick one.
      if (plan) requestSubscribe(plan)
      // ?renew is gone from the URL by now, so a later tap can run this again.
      renewHandledRef.current = false
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, pageLoading, onboardingLoading, profile])

  return (
    <div className="premium-i18n min-h-screen bg-slate-50 dark:bg-gray-950 pt-[104px] text-slate-950 dark:text-slate-100">
      <section className="fixed inset-x-0 top-[var(--academy-banner-h,0px)] z-30 overflow-visible bg-primary-900 px-4 py-4 text-white">
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
              Academy
            </div>
          </div>
          <div className="hidden min-w-0 flex-1 text-center md:block">
            <h1 className="truncate text-lg font-black text-white lg:text-xl">
              Your Academy home
            </h1>
            <p className="mt-1 truncate text-xs font-semibold text-primary-100 lg:text-sm">
              Learn, practice, and track your progress.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/" className="hidden rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-black text-primary-100 hover:bg-white/10 lg:block">
              Switch platform
            </Link>
            <PremiumProfileMenu variant="dark" />
          </div>
        </div>
      </section>

      {pageLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 pb-24">
          {isMemberActive ? (
            <>
              {showExpiryWarning && subscription?.plan && (
                <section
                  role="alert"
                  className="animate-slide-up overflow-hidden rounded-2xl border border-red-300 bg-red-600 text-white shadow-[0_12px_30px_-16px_rgba(220,38,38,0.8)]"
                >
                  <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
                        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-sm font-black sm:text-base">
                          {language === 'lo' ? 'ການສະໝັກສະມາຊິກຂອງທ່ານໃກ້ໝົດອາຍຸ' : 'Your subscription expires soon'}
                        </p>
                        <p className="mt-1 text-xs font-semibold leading-5 text-red-50 sm:text-sm">
                          {language === 'lo'
                            ? `ເຫຼືອອີກ ${remainingDays} ມື້ ${remainingHours} ຊົ່ວໂມງ · ໝົດອາຍຸ ${formatDate(subscription.ends_at!, language)}`
                            : `${remainingDays} ${remainingDays === 1 ? 'day' : 'days'} ${remainingHours} ${remainingHours === 1 ? 'hour' : 'hours'} remaining · Expires ${formatDate(subscription.ends_at!, language)}`}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={busyPlanId === subscription.plan.id}
                      onClick={() => void startSubscription(subscription.plan!)}
                      className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-white dark:bg-gray-900 px-5 py-3 text-sm font-black text-red-700 dark:text-red-300 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-red-50 dark:hover:bg-red-500/10 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-red-600 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >
                      <RefreshCw className={cn('h-4 w-4', busyPlanId === subscription.plan.id && 'animate-spin')} />
                      {busyPlanId === subscription.plan.id
                        ? (language === 'lo' ? 'ກຳລັງດຳເນີນການ…' : 'Processing…')
                        : (language === 'lo' ? 'ສະໝັກຕໍ່' : 'Resubscribe')}
                    </button>
                  </div>
                </section>
              )}
              {!isPaidPremium && (
                <section className="flex flex-col gap-4 overflow-hidden rounded-3xl bg-gradient-to-r from-primary-950 via-[#132845] to-primary-950 p-6 text-white shadow-card sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-amber-300/40 dark:ring-amber-500/40">
                      <Crown className="h-5 w-5 text-amber-300" />
                    </span>
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">You're on the Free plan</p>
                      <h2 className="mt-1.5 text-lg font-black leading-tight sm:text-xl">Upgrade for the full Premium experience</h2>
                      <p className="mt-2 max-w-lg text-sm leading-6 text-primary-100">
                        Unlock daily personalized mentor guidance, unlimited AI Coach conversations, member events, communities, and every Learning Hub lesson.
                      </p>
                    </div>
                  </div>
                  <a
                    href="#plans"
                    className="inline-flex shrink-0 items-center gap-2 rounded-full bg-amber-400 px-5 py-3 text-sm font-black text-primary-950 transition hover:bg-amber-300"
                  >
                    See plans <ArrowRight className="h-4 w-4" />
                  </a>
                </section>
              )}
              <MemberDashboard
                profileId={profile!.id}
                profileName={profile?.name ?? 'Premium member'}
                motivation={todaysMotivation}
                language={language}
                completionResponses={dailyCompletion?.responses ?? {}}
                history={dailyHistory ?? []}
                historyLoading={dailyHistoryLoading}
                savingDailyItem={savingDailyItem}
                onSubmitDailyReply={saveDailyReply}
                onOpenCoach={() => navigate('/academy/coach')}
                onOpenLearning={() => navigate('/academy/learn')}
                onStartRoleplay={mission => navigate(`/academy/coach?mission=${encodeURIComponent(mission)}`)}
                events={memberEvents && memberEvents.length > 0 ? memberEvents : FALLBACK_MEMBER_EVENTS}
                communities={memberCommunities && memberCommunities.length > 0 ? memberCommunities : FALLBACK_MEMBER_COMMUNITIES}
                memberStats={memberProgress?.member}
                leaderboard={memberProgress?.leaderboard ?? []}
              />
            </>
           ) : (
             <>
          {showRejectedNotice && rejectedPayment && (
            <RejectedPaymentNotice
              payment={rejectedPayment}
              reason={rejectedPayment.rejection_reason}
              language={language}
              busy={busyPlanId === subscription?.plan_id}
              onSubscribeAgain={subscription?.plan && subscription.plan.price_lak > 0 ? () => requestSubscribe(subscription.plan!) : undefined}
              onDismiss={() => {
                writeDismissedRejection(rejectedPayment.id)
                setDismissedRejectionId(rejectedPayment.id)
              }}
            />
          )}
          {isAwaitingApproval && (
            <section className="flex flex-col gap-3 rounded-2xl border border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-black text-sky-950">Awaiting admin approval</p>
                  <p className="mt-1 text-xs leading-5 text-sky-800 dark:text-sky-300">
                    Your Free membership request and profile information are being checked. No payment is required.
                  </p>
                </div>
              </div>
              <span className="w-fit rounded-full bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-bold text-sky-800 dark:text-sky-300 shadow-sm">
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
              onViewQr={() => {
                setQrPlan(subscription?.plan ?? null)
                setQrPaymentOpen(true)
              }}
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
            <section className="rounded-3xl bg-white dark:bg-gray-900 p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-primary-600 dark:text-primary-400">Today</p>
                  <h2 className="mt-1 text-xl font-black text-gray-950 dark:text-gray-100">Daily mentor</h2>
                </div>
                <span className="rounded-full bg-primary-50 dark:bg-primary-900/40 px-3 py-1 text-xs font-bold text-primary-700 dark:text-primary-300">
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
                  onClick={() => navigate('/academy/coach')}
                >
                  Open AI Coach
                </Button>
              </div>
            </section>

            <section className="rounded-3xl bg-white dark:bg-gray-900 p-5 shadow-card">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-primary-600 dark:text-primary-400">Access</p>
                  <h2 className="mt-1 text-xl font-black text-gray-950 dark:text-gray-100">Premium modules</h2>
                </div>
                {!isPremiumActive && <Lock className="h-5 w-5 text-gray-300" />}
              </div>
              <div className="mt-5 grid gap-3">
                {featureModules.map(module => {
                  const Icon = module.icon
                  return (
                    <div key={module.title} className="flex gap-3 rounded-2xl border border-gray-100 dark:border-gray-800 p-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{module.title}</p>
                        <p className="mt-0.5 text-xs leading-5 text-gray-500 dark:text-gray-400">{module.detail}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          </div>
             </>
           )}

          <section id="plans" className="scroll-mt-24">
            <div className="mb-3 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-primary-600 dark:text-primary-400">Plans</p>
                <h2 className="mt-1 text-xl font-black text-gray-950 dark:text-gray-100">{isMemberActive ? 'Upgrade your plan' : 'Choose your access'}</h2>
              </div>
              <p className="hidden text-sm text-gray-500 dark:text-gray-400 sm:block">Manual activation supports Lao payment workflows.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activePlans.map(plan => {
                const isCurrent = subscription?.plan_id === plan.id && subscription.status !== 'CANCELLED'
                const isActiveCurrent = isCurrent && subscription?.status === 'ACTIVE' && !membershipExpired
                const isExpiredCurrent = isCurrent && membershipExpired
                const isPendingCurrent = isCurrent && (subscription?.status === 'PENDING_PAYMENT' || subscription?.status === 'PAYMENT_REVIEW' || subscription?.status === 'PENDING_APPROVAL')
                const isPremium = plan.price_lak > 0
                const isYearly = plan.slug === 'premium-yearly'
                const monthlyPlan = activePlans.find(p => p.slug === 'premium-monthly')
                const yearlySavings = isYearly && monthlyPlan ? monthlyPlan.price_lak * 12 - plan.price_lak : 0
                return (
                  <Card key={plan.slug} className={cn(
                    'relative border-2',
                    isPremium ? 'border-primary-200 dark:border-primary-800' : 'border-gray-100 dark:border-gray-800',
                    isYearly && 'border-amber-300 dark:border-amber-500/40',
                    isCurrent && 'border-primary-700 dark:border-primary-400',
                    isExpiredCurrent && 'border-red-500 dark:border-red-500',
                  )}>
                    {isYearly && !isCurrent && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-white shadow-sm">
                        Best value
                      </span>
                    )}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          {isPremium ? <Crown className="h-5 w-5 text-amber-500" /> : <ShieldCheck className="h-5 w-5 text-primary-600 dark:text-primary-400" />}
                          <h3 className="text-lg font-black text-gray-950 dark:text-gray-100">{plan.name}</h3>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">{plan.description}</p>
                      </div>
                      {isExpiredCurrent ? (
                        <span className="whitespace-nowrap rounded-full bg-red-50 dark:bg-red-500/15 px-3 py-1 text-xs font-bold text-red-700 dark:text-red-300">
                          {language === 'lo' ? 'ໝົດອາຍຸແລ້ວ' : 'Expired'}
                        </span>
                      ) : isCurrent && (
                        <span className="rounded-full bg-primary-50 dark:bg-primary-900/40 px-3 py-1 text-xs font-bold text-primary-700 dark:text-primary-300">Current</span>
                      )}
                    </div>

                    <div className="mt-5 flex items-baseline gap-2">
                      <span className="text-3xl font-black text-gray-950 dark:text-gray-100">{formatPrice(plan.price_lak, currency)}</span>
                      <span className="text-sm font-semibold text-gray-400">/{plan.interval}</span>
                    </div>
                    {yearlySavings > 0 && (
                      <p className="mt-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {`Save ${formatPrice(yearlySavings, currency)} — 2 months free`}
                      </p>
                    )}

                    <div className="mt-5 space-y-2">
                      {plan.features.map(feature => (
                        <div key={feature} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
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
                          disabled={isActiveCurrent}
                        >
                          {isActiveCurrent
                            ? 'Current plan'
                            : isPendingCurrent
                              ? 'Continue payment'
                              : isExpiredCurrent
                                ? (language === 'lo' ? 'ສະໝັກອີກຄັ້ງ' : 'Subscribe again')
                                : 'Start Premium'}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          fullWidth
                          icon={<CheckCircle2 className="h-4 w-4" />}
                          onClick={() => requestSubscribe(plan)}
                          loading={busyPlanId === plan.id}
                          disabled={isCurrent || (Boolean(subscription) && !membershipExpired && subscription!.status !== 'CANCELLED' && subscription!.status !== 'EXPIRED')}
                        >
                          {isCurrent ? 'Subscribed' : 'Subscribe'}
                        </Button>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="rounded-3xl bg-white dark:bg-gray-900 p-5 shadow-card">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-primary-600 dark:text-primary-400">Subscription</p>
                  <h2 className="mt-1 text-xl font-black text-gray-950 dark:text-gray-100">Membership control</h2>
                </div>
                <ReceiptText className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>

              <div className="mt-5 space-y-3">
                <InfoRow label="Current plan" value={planName} />
                <InfoRow
                  label="Status"
                  value={membershipExpired
                    ? statusLabel('EXPIRED')
                    : cancelledWithAccess
                      ? (language === 'lo'
                          ? `ຍົກເລີກແລ້ວ · ໃຊ້ໄດ້ຮອດ ${formatDate(subscription!.ends_at!, language)}`
                          : `Cancelled · access until ${formatDate(subscription!.ends_at!, language)}`)
                      : statusLabel(subscription?.status)}
                />
                <InfoRow label="Renewal" value={subscription?.ends_at ? formatDate(subscription.ends_at, language) : 'Manual activation'} />
                <InfoRow label="Auto-renew" value={subscription?.auto_renew ? 'On' : 'Off'} />
              </div>

              <Button
                type="button"
                variant="outline"
                fullWidth
                icon={<XCircle className="h-4 w-4" />}
                onClick={() => setConfirmCancelOpen(true)}
                loading={busyPlanId === subscription?.plan_id}
                disabled={!subscription || membershipExpired || cancelledWithAccess || subscription.status === 'CANCELLED' || subscription.status === 'EXPIRED'}
                className="mt-5 border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
              >
                Cancel subscription
              </Button>

              <Modal
                open={confirmCancelOpen}
                onClose={() => setConfirmCancelOpen(false)}
                title={language === 'lo' ? 'ຍົກເລີກການສະໝັກສະມາຊິກບໍ?' : 'Cancel your subscription?'}
                size="sm"
                footer={
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button type="button" variant="outline" onClick={() => setConfirmCancelOpen(false)}>
                      {language === 'lo' ? 'ຮັກສາແຜນໄວ້' : 'Keep my plan'}
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      icon={<XCircle className="h-4 w-4" />}
                      loading={busyPlanId === subscription?.plan_id}
                      onClick={async () => { await cancelSubscription(); setConfirmCancelOpen(false) }}
                    >
                      {language === 'lo' ? 'ແມ່ນ, ຍົກເລີກ' : 'Yes, cancel subscription'}
                    </Button>
                  </div>
                }
              >
                {cancelKeepsAccess ? (
                  <div className="space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 p-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <p className="text-emerald-900 dark:text-emerald-200">
                        {language === 'lo' ? (
                          <>ທ່ານຍັງໃຊ້ <span className="font-bold">{planName}</span> ໄດ້ຄົບທຸກຢ່າງ (ບົດຮຽນ, AI Coach ແລະ ຄຸນສົມບັດພຣີມຽມທັງໝົດ) ຈົນຮອດວັນທີ <span className="font-bold">{formatDate(subscription!.ends_at!, language)}</span>.</>
                        ) : (
                          <>You'll keep full access to <span className="font-bold">{planName}</span> (lessons, AI Coach and every Premium feature) until <span className="font-bold">{formatDate(subscription!.ends_at!, language)}</span>.</>
                        )}
                      </p>
                    </div>
                    <p>
                      {language === 'lo'
                        ? 'ຫຼັງຈາກວັນທີນັ້ນ ສະມາຊິກຈະສິ້ນສຸດ ແລະ ຈະບໍ່ຕໍ່ອາຍຸອັດຕະໂນມັດ. ບໍ່ມີການຄືນເງິນສຳລັບເວລາທີ່ເຫຼືອ. ທ່ານສາມາດສະໝັກໃໝ່ໄດ້ທຸກເວລາ.'
                        : "After that date your membership ends and won't renew. Remaining time isn't refunded. You can subscribe again at any time."}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {language === 'lo' ? (
                      <>ທ່ານຈະບໍ່ສາມາດໃຊ້ <span className="font-bold text-slate-900 dark:text-slate-100">{planName}</span> ໄດ້ທັນທີ. ທ່ານສາມາດສະໝັກໃໝ່ໄດ້ທຸກເວລາ.</>
                    ) : (
                      <>You'll lose access to <span className="font-bold text-slate-900 dark:text-slate-100">{planName}</span> immediately. You can subscribe again at any time.</>
                    )}
                  </p>
                )}
              </Modal>
            </section>

            <section className="rounded-3xl bg-white dark:bg-gray-900 p-5 shadow-card">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-primary-600 dark:text-primary-400">Billing</p>
                  <h2 className="mt-1 text-xl font-black text-gray-950 dark:text-gray-100">Payment history</h2>
                </div>
                <ReceiptText className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>

              <div className="mt-5 space-y-3">
                {(payments ?? []).length > 0 ? payments!.map(payment => {
                  const rejected = payment.status === 'REJECTED'
                  const open = rejected && openPaymentIds.has(payment.id)
                  const row = (
                    <>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-gray-900 dark:text-gray-100">{payment.plan?.name ?? 'Premium'}</p>
                        <p className="mt-0.5 text-xs text-gray-400">{formatDate(payment.created_at, language)} · {formatPrice(payment.amount_lak, currency)}</p>
                      </div>
                      <span className="flex flex-shrink-0 items-center gap-1.5">
                        <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold', paymentStatusClass(payment.status))}>
                          {payment.status.replace(/_/g, ' ')}
                        </span>
                        {rejected && <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform', open && 'rotate-180')} />}
                      </span>
                    </>
                  )
                  if (!rejected) {
                    return (
                      <div key={payment.id} className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 dark:border-gray-800 p-3">
                        {row}
                      </div>
                    )
                  }
                  return (
                    <div key={payment.id} className={cn('rounded-2xl border', open ? 'border-red-200 dark:border-red-500/30' : 'border-gray-100 dark:border-gray-800')}>
                      <button
                        type="button"
                        aria-expanded={open}
                        onClick={() => setOpenPaymentIds(prev => {
                          const next = new Set(prev)
                          if (next.has(payment.id)) next.delete(payment.id)
                          else next.add(payment.id)
                          return next
                        })}
                        className="flex w-full items-center justify-between gap-3 rounded-2xl p-3 text-left transition hover:bg-gray-50 dark:hover:bg-gray-800/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                      >
                        {row}
                      </button>
                      {open && (
                        <div className="mx-3 mb-3 rounded-xl bg-red-50 dark:bg-red-500/10 p-3">
                          <p className="text-[11px] font-bold uppercase tracking-wide text-red-700 dark:text-red-300">
                            {language === 'lo' ? 'ເຫດຜົນທີ່ບໍ່ອະນຸມັດ' : 'Reason it was not approved'}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-red-900 dark:text-red-100">
                            {payment.rejection_reason || (language === 'lo' ? 'ບໍ່ໄດ້ລະບຸເຫດຜົນ.' : 'No reason was given.')}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                }) : (
                  <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-6 text-center">
                    <ReceiptText className="mx-auto h-8 w-8 text-gray-300" />
                    <p className="mt-2 text-sm font-semibold text-gray-700 dark:text-gray-200">No Premium payments yet</p>
                    <p className="mt-1 text-xs text-gray-400">Start Premium to create your first subscription payment.</p>
                  </div>
                )}
              </div>
            </section>
          </div>
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

      <Modal
        open={qrPaymentOpen}
        onClose={() => { setQrPaymentOpen(false); setQrPreview(null) }}
        title={qrPreview ? (language === 'lo' ? 'QR ສຳລັບຊຳລະ' : 'Payment QR') : (language === 'lo' ? 'ສະແກນເພື່ອຊຳລະ' : 'Scan to pay')}
        size="md"
        footer={
          qrPreview ? (
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setQrPreview(null)}>
                {language === 'lo' ? 'ກັບຄືນ' : 'Back'}
              </Button>
              <Button type="button" loading={savingQr} icon={<ImageDown className="h-4 w-4" />} onClick={() => void saveQrImage()}>
                {language === 'lo' ? 'ບັນທຶກຮູບ QR' : 'Save QR image'}
              </Button>
            </div>
          ) : (
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setQrPaymentOpen(false)}>
                {language === 'lo' ? 'ຊຳລະພາຍຫຼັງ' : 'Pay later'}
              </Button>
              <Button
                type="button"
                icon={<Upload className="h-4 w-4" />}
                onClick={() => { setQrPaymentOpen(false); proofInputRef.current?.click() }}
              >
                {language === 'lo' ? 'ຊຳລະແລ້ວ — ອັບໂຫຼດຫຼັກຖານ' : 'I’ve paid — upload proof'}
              </Button>
            </div>
          )
        }
      >
        {qrPreview ? (
          <div className="flex flex-col items-center py-2 text-center" data-no-premium-translate>
            <div className="w-full rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-3 ring-1 ring-slate-200 dark:ring-slate-700 sm:p-5">
              <img src={qrPreview.url} alt={qrPreview.label} className="mx-auto max-h-[58vh] w-full object-contain" />
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {language === 'lo' ? 'ສະແກນ QR ນີ້ເພື່ອຊຳລະ ຫຼື ບັນທຶກຮູບໄວ້ໃນເຄື່ອງ.' : 'Scan this QR to pay, or save the image to your device.'}
            </p>
          </div>
        ) : (
        <div className="space-y-4" data-no-premium-translate>
          <div className="overflow-hidden rounded-2xl bg-primary-950 text-white shadow-lg shadow-primary-950/15 ring-1 ring-primary-800">
            <div className="bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.2),transparent_45%)] px-5 py-5 text-center">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-300">
                {language === 'lo' ? 'ຈຳນວນເງິນທີ່ຕ້ອງຊຳລະ' : 'Payment amount'}
              </p>
              <p className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
                {formatPrice(qrPlan?.price_lak ?? 0, currency)}
              </p>
              {currency !== 'LAK' && (
                <p className="mt-1 text-xs font-bold text-primary-200">
                  {language === 'lo' ? 'ຈຳນວນເງິນໂອນ' : 'Transfer amount'}: {formatPrice(qrPlan?.price_lak ?? 0, 'LAK')}
                </p>
              )}
              <div className="mx-auto mt-3 h-px max-w-48 bg-white/10" />
              <p className="mt-3 text-sm font-bold text-primary-100">
                {language === 'lo' ? 'ແຜນ' : 'Plan'}: {qrPlan?.name ?? (language === 'lo' ? 'ພຣີມຽມ' : 'Premium')}
              </p>
            </div>
          </div>
          <p className="text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
            {language === 'lo'
              ? 'ສະແກນ QR ຫຼື ໂອນເຂົ້າບັນຊີດ້ານລຸ່ມ, ແລ້ວອັບໂຫຼດຫຼັກຖານເພື່ອໃຫ້ແອັດມິນກວດສອບ.'
              : 'Scan the QR code or transfer to the account below, then upload your payment proof for admin verification.'}
          </p>
          {(paymentAccounts ?? []).length > 0 ? (
            <div className="space-y-3">
              {paymentAccounts!.map(account => (
                <div key={account.id} className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                  <p className="text-sm font-black text-slate-900 dark:text-slate-100">{account.label}</p>
                  {account.qr_image_url && (
                    <button
                      type="button"
                      onClick={() => setQrPreview({ url: account.qr_image_url!, label: account.label })}
                      aria-label={language === 'lo' ? `ຂະຫຍາຍ QR ${account.label}` : `Enlarge ${account.label} QR code`}
                      className="group/qr relative mx-auto mt-3 block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                    >
                      <img
                        src={account.qr_image_url}
                        alt={account.label}
                        className="h-48 w-48 rounded-xl object-contain ring-1 ring-slate-100 dark:ring-slate-800 transition duration-200 group-hover/qr:scale-[1.02] group-hover/qr:brightness-95"
                      />
                      <span className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary-950/90 text-white shadow-lg transition group-hover/qr:scale-110">
                        <ZoomIn className="h-4 w-4" />
                      </span>
                    </button>
                  )}
                  <div className="mt-3 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                    {account.bank_name && <p>{language === 'lo' ? 'ທະນາຄານ' : 'Bank'}: <span className="font-bold text-slate-800 dark:text-slate-100">{account.bank_name}</span></p>}
                    {account.account_name && <p>{language === 'lo' ? 'ຊື່ບັນຊີ' : 'Account name'}: <span className="font-bold text-slate-800 dark:text-slate-100">{account.account_name}</span></p>}
                    {account.account_number && (
                      <div className="flex items-center gap-2">
                        <p className="min-w-0 flex-1 break-all">{language === 'lo' ? 'ເລກບັນຊີ' : 'Account number'}: <span className="font-bold text-slate-800 dark:text-slate-100">{account.account_number}</span></p>
                        <button
                          type="button"
                          onClick={() => void copyAccountNumber(account.account_number!)}
                          aria-label={language === 'lo' ? 'ສຳເນົາເລກບັນຊີ' : 'Copy account number'}
                          title={language === 'lo' ? 'ສຳເນົາ' : 'Copy'}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 ring-1 ring-primary-100 dark:ring-primary-800 transition hover:bg-primary-100 dark:hover:bg-primary-900/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  {account.instructions && (
                    <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{account.instructions}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">{language === 'lo' ? 'ຍັງບໍ່ໄດ້ຕັ້ງຄ່າວິທີຊຳລະ. ກະລຸນາຕິດຕໍ່ຝ່າຍຊ່ວຍເຫຼືອ.' : 'No payment method has been configured yet. Please contact support.'}</p>
          )}
        </div>
        )}
      </Modal>
    </div>
  )
}

function MemberDashboard({
  profileId,
  profileName,
  motivation,
  language,
  completionResponses,
  history,
  historyLoading,
  savingDailyItem,
  onSubmitDailyReply,
  onOpenCoach,
  onOpenLearning,
  onStartRoleplay,
  events,
  communities,
  memberStats,
  leaderboard,
}: {
  profileId: string
  profileName: string
  motivation: DailyMotivation
  language: Language
  completionResponses: Partial<Record<DailyChallengeKind, string>>
  history: DailyChallengeHistoryEntry[]
  historyLoading: boolean
  savingDailyItem: DailyChallengeKind | null
  onSubmitDailyReply: (kind: DailyChallengeKind, reply: string) => Promise<void>
  onOpenCoach: () => void
  onOpenLearning: () => void
  onStartRoleplay: (mission: string) => void
  events: MemberEvent[]
  communities: MemberCommunity[]
  memberStats?: PremiumMemberStats
  leaderboard: PremiumLeaderboardEntry[]
}) {
  const [activeDailyItem, setActiveDailyItem] = useState<DailyChallengeKind | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [dailyDrafts, setDailyDrafts] = useState<Partial<Record<DailyChallengeKind, string>>>({})
  const dailyItems: Array<{ kind: DailyChallengeKind; label: string; text: string; prompt: string; icon: React.ReactNode }> = [
    { kind: 'reflection', label: language === 'lo' ? 'ທົບທວນ' : 'Reflection', text: motivation.reflection, prompt: language === 'lo' ? 'ຂຽນສິ່ງທີ່ທ່ານຄິດ…' : 'Write your reflection…', icon: <Lightbulb className="h-4 w-4" /> },
    { kind: 'challenge', label: language === 'lo' ? 'ຄວາມທ້າທາຍ' : 'Challenge', text: motivation.challenge, prompt: language === 'lo' ? 'ບອກພວກເຮົາວ່າທ່ານໄດ້ເຮັດຫຍັງ…' : 'Tell us what you did…', icon: <Target className="h-4 w-4" /> },
    { kind: 'mission', label: language === 'lo' ? 'ພາລະກິດ' : 'Mission', text: motivation.mission, prompt: language === 'lo' ? 'ມື້ນີ້ທ່ານໄດ້ຮຽນຮູ້ຫຍັງ?' : 'What did you learn today?', icon: <CalendarCheck className="h-4 w-4" /> },
  ]
  const completedCount = dailyItems.filter(item => Boolean(completionResponses[item.kind]?.trim())).length
  const selectedItem = dailyItems.find(item => item.kind === activeDailyItem)
  const historyItems = history.map(entry => ({
    ...entry,
    content: entry.guidance ?? entry.motivation,
    completedCount: dailyItems.filter(item => Boolean(entry.responses[item.kind]?.trim())).length,
  }))

  function selectDailyItem(kind: DailyChallengeKind) {
    setActiveDailyItem(kind)
    setDailyDrafts(current => ({
      ...current,
      [kind]: current[kind] ?? completionResponses[kind] ?? '',
    }))
  }

  async function submitDailyReply() {
    if (!activeDailyItem) return
    const reply = dailyDrafts[activeDailyItem]?.trim() ?? ''
    if (!reply) return
    await onSubmitDailyReply(activeDailyItem, reply)
    setActiveDailyItem(null)
  }

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
            <ProfileMenuStat label="Streak" value={formatStreak(memberStats?.streak ?? 0)} icon={<Flame className="h-4 w-4" />} />
            <ProfileMenuStat label="XP" value={(memberStats?.xp ?? 0).toLocaleString()} icon={<Zap className="h-4 w-4" />} />
            <ProfileMenuStat label="Rank" value={memberStats?.rank ? `#${memberStats.rank}` : '—'} icon={<Trophy className="h-4 w-4" />} />
          </div>
        </div>
      </section>

      <section
        data-no-premium-translate
        className="group overflow-hidden rounded-3xl bg-white dark:bg-gray-900 shadow-card ring-1 ring-slate-900/5 dark:ring-white/10 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl"
      >
        <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-primary-600 dark:text-primary-400">
              {language === 'lo' ? 'ສູນການຮຽນຮູ້' : 'Learning Hub'}
            </p>
            <h2 className="mt-3 max-w-xl text-3xl font-black leading-tight text-slate-950 dark:text-slate-100 sm:text-4xl">
              {language === 'lo' ? 'ສ້າງທັກສະທີ່ພາຊີວິດທ່ານກ້າວໜ້າ.' : 'Build skills that move your life forward.'}
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
              {language === 'lo'
                ? 'ບົດຮຽນທີ່ນຳໄປໃຊ້ໄດ້ຈິງດ້ານການເງິນ, AI, ພາສາອັງກິດ, ການເຮັດວຽກຢ່າງມີຜົນ, ອາຊີບ, ທຶນການສຶກສາ ແລະ ທຸລະກິດ—ພ້ອມທັງຄວາມທ້າທາຍປະຈຳອາທິດ ແລະ ນິໄສປະຈຳວັນ.'
                : 'Practical lessons in money, AI, English, productivity, careers, scholarships, and business—plus weekly challenges and habits.'}
            </p>
            <button
              type="button"
              onClick={onOpenLearning}
              className="group/cta relative mt-7 inline-flex w-fit items-center gap-3 overflow-hidden rounded-full bg-gradient-to-r from-primary-950 via-[#132845] to-primary-950 px-7 py-4 text-sm font-black text-white shadow-[0_14px_34px_-10px_rgba(9,20,38,0.65)] ring-1 ring-amber-300/40 transition duration-300 hover:shadow-[0_20px_44px_-10px_rgba(9,20,38,0.75)] hover:ring-amber-300/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
            >
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover/cta:translate-x-full" />
              <Sparkles className="relative h-4 w-4 text-amber-300" />
              <span className="relative">{language === 'lo' ? 'ເປີດສູນການຮຽນຮູ້' : 'Open Learning Hub'}</span>
              <ArrowRight className="relative h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 group-hover/cta:translate-x-1.5" />
            </button>
          </div>
          <div className="relative overflow-hidden bg-primary-950 p-6 sm:p-8 lg:p-10">
            <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-amber-400/10 blur-3xl" />
            <div className="relative flex h-full flex-col justify-center">
              <p className="mb-5 text-xs font-black uppercase tracking-[0.2em] text-primary-200">
                {language === 'lo' ? 'ຮຽນຕາມຈັງຫວະຂອງທ່ານ' : 'Learn at your pace'}
              </p>
              <div className="grid grid-cols-1 divide-y divide-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0 lg:grid-cols-1 lg:divide-x-0 lg:divide-y">
                <LearningHubStat
                  label={language === 'lo' ? 'ບົດຮຽນ' : 'Lessons'}
                  value={language === 'lo' ? '8 ເສັ້ນທາງ' : '8 paths'}
                  icon={<GraduationCap className="h-5 w-5" />}
                />
                <LearningHubStat
                  label={language === 'lo' ? 'ຄວາມທ້າທາຍ' : 'Challenge'}
                  value={language === 'lo' ? 'ປະຈຳອາທິດ' : 'Weekly'}
                  icon={<Target className="h-5 w-5" />}
                />
                <LearningHubStat
                  label={language === 'lo' ? 'ນິໄສ' : 'Habits'}
                  value={language === 'lo' ? 'ປະຈຳວັນ' : 'Daily'}
                  icon={<CalendarCheck className="h-5 w-5" />}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <PlayLearnArcade profileId={profileId} onStartRoleplay={onStartRoleplay} />

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-3xl bg-white dark:bg-gray-900 p-5 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-primary-600 dark:text-primary-400">{language === 'lo' ? 'ມື້ນີ້' : 'Today'}</p>
              <h2 className="mt-1 text-xl font-black text-gray-950 dark:text-gray-100">{language === 'lo' ? 'Mentor ປະຈຳວັນ' : 'Daily mentor'}</h2>
            </div>
            <div className="flex items-start gap-2 text-right">
              <button
                type="button"
                onClick={() => setHistoryOpen(true)}
                aria-label={language === 'lo' ? 'ເບິ່ງປະຫວັດຄວາມຄືບໜ້າ' : 'View progress history'}
                title={language === 'lo' ? 'ປະຫວັດຄວາມຄືບໜ້າ' : 'Progress history'}
                className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800/50 text-primary-700 dark:text-primary-300 ring-1 ring-slate-200 dark:ring-slate-700 transition duration-200 hover:-translate-y-0.5 hover:bg-primary-50 dark:hover:bg-primary-900/40 hover:text-primary-900 dark:hover:text-primary-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <History className="h-4 w-4" />
              </button>
              <div>
              {motivation.source === 'personalized' && (
                <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-violet-100 dark:bg-violet-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-violet-700 dark:text-violet-300">
                  <Sparkles className="h-3 w-3" />
                  Made for you
                </span>
              )}
              <br className={motivation.source === 'personalized' ? '' : 'hidden'} />
              <span className="rounded-full bg-primary-50 dark:bg-primary-900/40 px-3 py-1 text-xs font-bold text-primary-700 dark:text-primary-300">
                {formatDate(motivation.publish_date, language)}
              </span>
              <p className="mt-2 text-[11px] font-black text-slate-500 dark:text-slate-400">{completedCount}/3 {language === 'lo' ? 'ສຳເລັດ' : 'completed'}</p>
              </div>
            </div>
          </div>

          <blockquote className="mt-5 rounded-2xl bg-primary-900 p-5 text-white">
            <Sparkles className="mb-3 h-5 w-5 text-amber-300" />
            <p className="text-lg font-bold leading-7">"{motivation.quote}"</p>
          </blockquote>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {dailyItems.map(item => {
              const completed = Boolean(completionResponses[item.kind]?.trim())
              const selected = activeDailyItem === item.kind
              return (
                <button
                  key={item.kind}
                  type="button"
                  onClick={() => selectDailyItem(item.kind)}
                  aria-pressed={selected}
                  className={cn(
                    'group relative min-h-40 rounded-2xl border p-4 text-left transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                    completed
                      ? 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-500/10 shadow-sm'
                      : selected
                        ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/40 shadow-md shadow-primary-900/10 -translate-y-0.5'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:-translate-y-0.5 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-white dark:hover:bg-gray-900 hover:shadow-md',
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className={cn('flex items-center gap-2 text-xs font-black uppercase tracking-wide', completed ? 'text-emerald-700 dark:text-emerald-300' : 'text-primary-800 dark:text-primary-300')}>
                      {item.icon}
                      {item.label}
                    </span>
                    <span className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full transition',
                      completed ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-gray-900 text-slate-300 ring-1 ring-slate-200 dark:ring-slate-700 group-hover:text-primary-600 dark:group-hover:text-primary-400',
                    )}>
                      {completed ? <CheckCircle2 className="h-4 w-4" /> : <ArrowRight className="h-3.5 w-3.5" />}
                    </span>
                  </div>
                  <p className="mt-4 text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">{item.text}</p>
                  {completed && <p className="mt-3 line-clamp-2 text-xs font-semibold leading-5 text-emerald-800 dark:text-emerald-300">“{completionResponses[item.kind]}”</p>}
                </button>
              )
            })}
          </div>

          <Modal
            open={Boolean(selectedItem)}
            onClose={() => setActiveDailyItem(null)}
            title={selectedItem ? (language === 'lo' ? `ຕອບກັບ: ${selectedItem.label}` : `Reply to ${selectedItem.label.toLowerCase()}`) : undefined}
            size="lg"
          >
            {selectedItem && (
              <div>
                <p className="mb-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">{selectedItem.text}</p>
                <textarea
                  autoFocus
                  rows={5}
                  maxLength={1200}
                  value={dailyDrafts[selectedItem.kind] ?? ''}
                  onChange={event => setDailyDrafts(current => ({ ...current, [selectedItem.kind]: event.target.value }))}
                  placeholder={selectedItem.prompt}
                  className="min-h-36 w-full resize-none rounded-xl border border-primary-200 dark:border-primary-800 bg-white dark:bg-gray-900 px-4 py-3 text-base font-semibold leading-6 text-slate-800 dark:text-slate-100 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-800"
                />
                <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xs font-semibold text-slate-400">{(dailyDrafts[selectedItem.kind] ?? '').length}/1200</span>
                  <button
                    type="button"
                    disabled={!dailyDrafts[selectedItem.kind]?.trim() || savingDailyItem === selectedItem.kind}
                    onClick={() => void submitDailyReply()}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-900 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-primary-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {savingDailyItem === selectedItem.kind
                      ? (language === 'lo' ? 'ກຳລັງບັນທຶກ…' : 'Saving…')
                      : completionResponses[selectedItem.kind]
                        ? (language === 'lo' ? 'ອັບເດດຄຳຕອບ' : 'Update reply')
                        : (language === 'lo' ? 'ສຳເລັດກິດຈະກຳ' : 'Complete item')}
                  </button>
                </div>
              </div>
            )}
          </Modal>

          <Modal
            open={historyOpen}
            onClose={() => setHistoryOpen(false)}
            title={language === 'lo' ? 'ປະຫວັດຄວາມຄືບໜ້າ' : 'Progress history'}
            size="lg"
          >
            <div className="pb-2">
              <div className="mb-5 flex items-center justify-between gap-4 rounded-2xl bg-primary-950 px-4 py-4 text-white">
                <div>
                  <p className="text-2xl font-black">{memberStats?.completed_items ?? historyItems.reduce((total, item) => total + item.completedCount, 0)}</p>
                  <p className="mt-0.5 text-xs font-semibold text-primary-200">{language === 'lo' ? 'ກິດຈະກຳທີ່ເຮັດແລ້ວ' : 'activities completed'}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black">{memberStats?.completed_days ?? historyItems.filter(item => item.completedCount === 3).length}</p>
                  <p className="mt-0.5 text-xs font-semibold text-primary-200">{language === 'lo' ? 'ມື້ທີ່ສຳເລັດ' : 'days completed'}</p>
                </div>
              </div>

              {historyLoading ? (
                <div className="flex min-h-44 items-center justify-center"><LoadingSpinner /></div>
              ) : historyItems.length === 0 ? (
                <div className="py-10 text-center">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300"><History className="h-5 w-5" /></span>
                  <p className="mt-4 text-sm font-black text-slate-900 dark:text-slate-100">{language === 'lo' ? 'ຍັງບໍ່ມີປະຫວັດ' : 'No progress yet'}</p>
                  <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-slate-500 dark:text-slate-400">{language === 'lo' ? 'ຄຳຕອບຂອງທ່ານຈະປາກົດຢູ່ນີ້ຫຼັງຈາກເຮັດກິດຈະກຳທຳອິດ.' : 'Your replies will appear here after you complete your first activity.'}</p>
                </div>
              ) : (
                <ol className="relative ml-2 border-l border-slate-200 dark:border-slate-700 pl-5">
                  {historyItems.map((entry, entryIndex) => (
                    <li key={entry.id} className={cn('relative', entryIndex > 0 && 'mt-6')}>
                      <span className={cn('absolute -left-[29px] top-1.5 h-4 w-4 rounded-full border-4 border-white dark:border-gray-800', entry.completedCount === 3 ? 'bg-emerald-500' : 'bg-primary-500')} />
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-slate-900 dark:text-slate-100">{entry.content ? formatDate(entry.content.publish_date, language) : (language === 'lo' ? 'ກິດຈະກຳ Mentor' : 'Mentor activity')}</p>
                          <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">{entry.completedCount}/3 {language === 'lo' ? 'ສຳເລັດ' : 'completed'}</p>
                        </div>
                        {entry.completedCount === 3 && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />}
                      </div>
                      <div className="mt-3 space-y-2">
                        {dailyItems.map(item => {
                          const reply = entry.responses[item.kind]?.trim()
                          if (!reply) return null
                          return (
                            <div key={item.kind} className="rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3.5 py-3 ring-1 ring-slate-100 dark:ring-slate-800">
                              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-primary-700 dark:text-primary-300">{item.icon}{item.label}</div>
                              <p className="mt-1.5 text-sm font-semibold leading-5 text-slate-700 dark:text-slate-200">“{reply}”</p>
                            </div>
                          )
                        })}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </Modal>

          <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 pt-5">
            <p className="hidden text-xs font-semibold text-slate-500 dark:text-slate-400 sm:block">
              {completedCount === 3 ? 'Daily ritual complete. Great work!' : 'Open each activity and leave a reply.'}
            </p>
            <button
              type="button"
              onClick={onOpenCoach}
              className="group relative isolate ml-auto inline-flex w-full items-center justify-center gap-2.5 rounded-2xl bg-amber-400 px-5 py-3.5 text-sm font-black text-[#071426] shadow-[0_10px_28px_-6px_rgba(245,158,11,0.55)] ring-1 ring-amber-300 transition duration-300 hover:-translate-y-0.5 hover:bg-amber-300 hover:shadow-[0_16px_36px_-6px_rgba(245,158,11,0.7)] active:translate-y-0 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 sm:w-auto"
            >
              {/* Soft pulsing halo: draws the eye with a solid color, no gradient. */}
              <span aria-hidden className="pointer-events-none absolute -inset-1 -z-10 rounded-[1.15rem] border-2 border-amber-400/50 motion-safe:animate-pulse" />
              <Sparkles className="h-4 w-4 transition-transform duration-500 group-hover:rotate-[20deg] group-hover:scale-125" />
              <span>Open AI Coach</span>
              <Brain className="h-4 w-4 opacity-80" />
            </button>
          </div>
        </section>

        <section className="rounded-3xl bg-white dark:bg-gray-900 p-5 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-primary-600 dark:text-primary-400">Community</p>
              <h2 className="mt-1 text-xl font-black text-gray-950 dark:text-gray-100">Top performers</h2>
            </div>
            <Trophy className="h-5 w-5 text-amber-500" />
          </div>
          <div className="mt-5 space-y-3">
            {leaderboard.length > 0 ? leaderboard.map(performer => (
              <div
                key={`${performer.rank}-${performer.display_name}`}
                className={cn(
                  'flex items-center gap-3 rounded-2xl border p-3',
                  performer.is_current_user ? 'border-primary-200 dark:border-primary-800 bg-primary-50/60 dark:bg-primary-900/40' : 'border-gray-100 dark:border-gray-800',
                )}
              >
                <div className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black',
                  performer.rank <= 3 ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
                )}>
                  #{performer.rank}
                </div>
                {performer.avatar_url ? (
                  <img
                    src={performer.avatar_url}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover ring-2 ring-white"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/60 text-sm font-black text-primary-700 dark:text-primary-300">
                    {performer.display_name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-gray-900 dark:text-gray-100">
                    {performer.display_name}
                    {performer.is_current_user && <span className="ml-1.5 text-[10px] font-black uppercase text-primary-600 dark:text-primary-400">You</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {performer.xp.toLocaleString()} XP · {formatStreak(performer.streak)}
                  </p>
                </div>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 px-4 py-8 text-center">
                <Trophy className="mx-auto h-6 w-6 text-slate-300" />
                <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">Complete today’s activities to join the leaderboard.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <MemberListSection
          eyebrow="Events"
          title="Upcoming member events"
          icon={<CalendarCheck className="h-5 w-5 text-primary-600 dark:text-primary-400" />}
          items={events}
        />
        <MemberListSection
          eyebrow="Communities"
          title="Premium communities"
          icon={<Users className="h-5 w-5 text-primary-600 dark:text-primary-400" />}
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
    <section className="rounded-3xl bg-white dark:bg-gray-900 p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-primary-600 dark:text-primary-400">{eyebrow}</p>
          <h2 className="mt-1 text-xl font-black text-gray-950 dark:text-gray-100">{title}</h2>
        </div>
        {icon}
      </div>
      <div className="mt-5 grid gap-3">
        {items.map(item => (
          <div key={item.id} className="rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-gray-950 dark:text-gray-100">{item.title}</p>
                <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">{item.detail}</p>
              </div>
              {item.time_label && (
                <span className="flex-shrink-0 rounded-full bg-primary-50 dark:bg-primary-900/40 px-2.5 py-1 text-[11px] font-bold text-primary-700 dark:text-primary-300">
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

function LearningHubStat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 py-4 first:pt-0 last:pb-0 sm:px-5 sm:first:pl-0 sm:last:pr-0 lg:px-0 lg:first:pt-0 lg:last:pb-0">
      <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-primary-200 ring-1 ring-white/15">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-lg font-black leading-tight text-white">{value}</p>
        <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-primary-200">{label}</p>
      </div>
    </div>
  )
}

function DailyItem({ icon, label, text }: { icon: React.ReactNode; label: string; text: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4">
      <div className="mb-3 flex items-center gap-2 text-primary-700 dark:text-primary-300">
        {icon}
        <p className="text-xs font-bold uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-sm leading-6 text-gray-700 dark:text-gray-200">{text}</p>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-3 last:border-b-0 last:pb-0">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-right text-sm font-bold text-gray-900 dark:text-gray-100">{value}</span>
    </div>
  )
}

function RejectedPaymentNotice({
  payment,
  reason,
  language,
  busy,
  onSubscribeAgain,
  onDismiss,
}: {
  payment: PremiumPayment
  reason?: string | null
  language: 'lo' | 'en'
  busy: boolean
  onSubscribeAgain?: () => void
  onDismiss: () => void
}) {
  const lao = language === 'lo'
  return (
    <section role="alert" className="overflow-hidden rounded-3xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-5">
      <div className="flex gap-3">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-300">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-red-950 dark:text-red-100">
            {lao ? 'ການຊຳລະເງິນຂອງທ່ານບໍ່ໄດ້ຮັບການອະນຸມັດ' : 'Your payment was not approved'}
          </p>
          <p className="mt-0.5 text-xs text-red-800 dark:text-red-300">
            {payment.plan?.name ?? 'Premium'} · {formatPrice(payment.amount_lak, 'LAK')} · {formatDate(payment.created_at, language)}
          </p>
          <div className="mt-3 rounded-xl bg-white/80 dark:bg-gray-900/60 p-3 ring-1 ring-red-100 dark:ring-red-500/20">
            <p className="text-[11px] font-bold uppercase tracking-wide text-red-700 dark:text-red-300">
              {lao ? 'ເຫດຜົນ' : 'Reason'}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-800 dark:text-gray-100">
              {reason || (lao ? 'ບໍ່ໄດ້ລະບຸເຫດຜົນ.' : 'No reason was given.')}
            </p>
          </div>
          <p className="mt-3 text-xs leading-5 text-red-800 dark:text-red-300">
            {lao
              ? 'ກະລຸນາກວດສອບເຫດຜົນຂ້າງເທິງ ແລ້ວສະໝັກອີກຄັ້ງ ພ້ອມຫຼັກຖານການໂອນທີ່ຖືກຕ້ອງ. ຖ້າມີຄຳຖາມ, ຕິດຕໍ່ພວກເຮົາໄດ້.'
              : 'Check the reason above, then subscribe again with a correct transfer proof. Contact us if you have any questions.'}
          </p>
          <div className="mt-4 flex items-center justify-between gap-2">
            {onSubscribeAgain ? (
              <Button
                type="button"
                icon={<RefreshCw className={cn('h-4 w-4', busy && 'animate-spin')} />}
                loading={busy}
                onClick={onSubscribeAgain}
                className="bg-red-600 hover:bg-red-700"
              >
                {lao ? 'ສະໝັກອີກຄັ້ງ' : 'Subscribe again'}
              </Button>
            ) : <span />}
            <button
              type="button"
              onClick={onDismiss}
              className="inline-flex items-center gap-1 whitespace-nowrap rounded-xl bg-orange-500 px-3 py-2 text-xs font-black text-white shadow-sm transition hover:bg-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
            >
              <XIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {lao ? 'ປິດ' : 'Dismiss'}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

function PaymentPanel({
  status,
  payment,
  uploading,
  onUploadClick,
  onViewQr,
}: {
  status?: PremiumStatus
  payment?: PremiumPayment
  uploading: boolean
  onUploadClick: () => void
  onViewQr: () => void
}) {
  const amount = payment ? formatPrice(payment.amount_lak, 'LAK') : 'Pending'
  return (
    <section className="rounded-3xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300">
            {status === 'PAYMENT_REVIEW' ? <Clock className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
          </div>
          <div>
            <p className="text-sm font-black text-amber-950">
              {status === 'PAYMENT_REVIEW' ? 'Payment proof is under review' : 'Manual transfer required'}
            </p>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-amber-800 dark:text-amber-300">
              Transfer {amount} for Bitdoin Premium, then upload the payment proof here. This is separate from bookstore payment review.
            </p>
          </div>
        </div>
        <div className="flex flex-shrink-0 gap-2">
          <Button
            type="button"
            variant="outline"
            icon={<QrCode className="h-4 w-4" />}
            onClick={onViewQr}
            disabled={status === 'PAYMENT_REVIEW'}
            className="border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/15"
          >
            View QR
          </Button>
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
      </div>
    </section>
  )
}
