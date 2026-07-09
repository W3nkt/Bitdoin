import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Crown,
  Edit3,
  Eye,
  FileText,
  Flame,
  GraduationCap,
  Mail,
  MessageSquareText,
  Phone,
  ReceiptText,
  Save,
  ShieldCheck,
  Sparkles,
  Users,
  XCircle,
} from 'lucide-react'
import { PwenLogoLockup } from '@/components/brand/PwenLogo'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input, Textarea } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useLanguage } from '@/context/LanguageContext'
import { supabase } from '@/lib/supabase'
import { cn, formatDate, formatPrice } from '@/lib/utils'

type SubscriptionStatus = 'FREE' | 'PENDING_APPROVAL' | 'PENDING_PAYMENT' | 'PAYMENT_REVIEW' | 'ACTIVE' | 'CANCELLED' | 'EXPIRED'
type PaymentStatus = 'PENDING' | 'REQUIRES_REVIEW' | 'VERIFIED' | 'REJECTED' | 'REFUNDED'
type PremiumAdminSection = 'overview' | 'payments' | 'members' | 'plans' | 'mentor' | 'content'

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
  status: SubscriptionStatus
  starts_at?: string | null
  ends_at?: string | null
  created_at: string
  auto_renew: boolean
  user?: {
    id: string
    name: string
    email?: string | null
    phone?: string | null
    avatar_url?: string | null
    cover_image_url?: string | null
    language?: string | null
    created_at?: string | null
  } | null
  plan?: PremiumPlan | null
}

interface PremiumPayment {
  id: string
  subscription_id: string
  user_id: string
  plan_id: string
  amount_lak: number
  status: PaymentStatus
  receipt_image_url?: string | null
  rejection_reason?: string | null
  created_at: string
  user?: {
    name: string
    email?: string | null
    phone?: string | null
  } | null
  plan?: Pick<PremiumPlan, 'name' | 'slug'> | null
  subscription?: Pick<PremiumSubscription, 'status' | 'starts_at' | 'ends_at'> | null
}

interface RejectingRequest {
  subscriptionId: string
  userName: string
}

interface PremiumOnboarding {
  user_id: string
  responses: Record<string, string>
  whatsapp_number?: string | null
  daily_reminder_enabled: boolean
  daily_reminder_time?: string | null
  completed: boolean
}

interface DailyMotivation {
  id: string
  publish_date: string
  quote: string
  reflection: string
  challenge: string
  mission: string
  is_active: boolean
}

interface PremiumMemberEvent {
  id: string
  title: string
  detail: string
  time_label?: string | null
  action_url?: string | null
  sort_order: number
  is_active: boolean
}

interface PremiumCommunity {
  id: string
  title: string
  detail: string
  action_url?: string | null
  sort_order: number
  is_active: boolean
}

interface PremiumPerformanceHighlight {
  id: string
  display_name: string
  metric: string
  period_label?: string | null
  rank_order: number
  is_active: boolean
}

interface PlanFormState {
  id: string
  name: string
  description: string
  price_lak: string
  interval: string
  features: string
  is_active: boolean
}

interface MemberContentFormState {
  id?: string
  title: string
  detail: string
  label: string
  action_url: string
  order: string
  is_active: boolean
}

interface PerformanceFormState {
  id?: string
  display_name: string
  metric: string
  period_label: string
  rank_order: string
  is_active: boolean
}

interface MotivationFormState {
  publish_date: string
  quote: string
  reflection: string
  challenge: string
  mission: string
}

function statusLabel(status: SubscriptionStatus) {
  return status.replace(/_/g, ' ')
}

function subscriptionStatusClass(status: SubscriptionStatus) {
  if (status === 'ACTIVE') return 'bg-emerald-100 text-emerald-800'
  if (status === 'PAYMENT_REVIEW') return 'bg-orange-100 text-orange-800'
  if (status === 'PENDING_APPROVAL' || status === 'PENDING_PAYMENT') return 'bg-yellow-100 text-yellow-800'
  if (status === 'CANCELLED' || status === 'EXPIRED') return 'bg-gray-100 text-gray-700'
  return 'bg-primary-100 text-primary-800'
}

function paymentStatusClass(status: PaymentStatus) {
  if (status === 'VERIFIED') return 'bg-emerald-100 text-emerald-800'
  if (status === 'REQUIRES_REVIEW') return 'bg-orange-100 text-orange-800'
  if (status === 'REJECTED') return 'bg-red-100 text-red-800'
  return 'bg-yellow-100 text-yellow-800'
}

export function PremiumAdminDashboard() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { language, currency } = useLanguage()
  const { success, error } = useToast()
  const [reviewingSubscriptionId, setReviewingSubscriptionId] = useState<string | null>(null)
  const [rejectingRequest, setRejectingRequest] = useState<RejectingRequest | null>(null)
  const [selectedSubscription, setSelectedSubscription] = useState<PremiumSubscription | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [editingPlan, setEditingPlan] = useState<PlanFormState | null>(null)
  const [motivationForm, setMotivationForm] = useState<MotivationFormState | null>(null)
  const [editingEvent, setEditingEvent] = useState<MemberContentFormState | null>(null)
  const [editingCommunity, setEditingCommunity] = useState<MemberContentFormState | null>(null)
  const [editingHighlight, setEditingHighlight] = useState<PerformanceFormState | null>(null)
  const [savingMotivation, setSavingMotivation] = useState(false)
  const [activeSection, setActiveSection] = useState<PremiumAdminSection>('overview')

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['premium-admin', 'plans'],
    queryFn: async () => {
      const { data, error: plansError } = await supabase
        .from('premium_plans')
        .select('*')
        .order('sort_order')
      if (plansError) throw plansError
      return data as PremiumPlan[]
    },
  })

  const {
    data: subscriptions,
    isLoading: subscriptionsLoading,
    error: subscriptionsQueryError,
  } = useQuery({
    queryKey: ['premium-admin', 'subscriptions'],
    queryFn: async () => {
      const { data, error: subscriptionsError } = await supabase
        .from('premium_subscriptions')
        .select('*, user:users!premium_subscriptions_user_id_fkey(id,name,email,phone,avatar_url,cover_image_url,language,created_at), plan:premium_plans(*)')
        .order('created_at', { ascending: false })
        .limit(50)
      if (subscriptionsError) throw subscriptionsError
      return data as PremiumSubscription[]
    },
  })

  const {
    data: payments,
    isLoading: paymentsLoading,
    error: paymentsQueryError,
  } = useQuery({
    queryKey: ['premium-admin', 'payments'],
    queryFn: async () => {
      const { data, error: paymentsError } = await supabase
        .from('premium_payments')
        .select('*, user:users!premium_payments_user_id_fkey(name,email,phone), plan:premium_plans(name,slug), subscription:premium_subscriptions(status,starts_at,ends_at)')
        .order('created_at', { ascending: false })
        .limit(50)
      if (paymentsError) throw paymentsError
      return data as PremiumPayment[]
    },
  })

  const {
    data: onboardingResponses,
    isLoading: onboardingResponsesLoading,
    error: onboardingResponsesQueryError,
  } = useQuery({
    queryKey: ['premium-admin', 'onboarding-responses'],
    queryFn: async () => {
      const { data, error: onboardingError } = await supabase
        .from('premium_onboarding_responses')
        .select('user_id,responses,whatsapp_number,daily_reminder_enabled,daily_reminder_time,completed')
      if (onboardingError) throw onboardingError
      return data as PremiumOnboarding[]
    },
  })

  const { data: motivations, isLoading: motivationsLoading } = useQuery({
    queryKey: ['premium-admin', 'motivations'],
    queryFn: async () => {
      const { data, error: motivationsError } = await supabase
        .from('premium_daily_motivations')
        .select('*')
        .order('publish_date', { ascending: false })
        .limit(14)
      if (motivationsError) throw motivationsError
      return data as DailyMotivation[]
    },
  })

  const { data: memberEvents, isLoading: memberEventsLoading } = useQuery({
    queryKey: ['premium-admin', 'member-events'],
    queryFn: async () => {
      const { data, error: eventsError } = await supabase
        .from('premium_member_events')
        .select('*')
        .order('sort_order')
      if (eventsError) throw eventsError
      return data as PremiumMemberEvent[]
    },
  })

  const { data: communities, isLoading: communitiesLoading } = useQuery({
    queryKey: ['premium-admin', 'communities'],
    queryFn: async () => {
      const { data, error: communitiesError } = await supabase
        .from('premium_communities')
        .select('*')
        .order('sort_order')
      if (communitiesError) throw communitiesError
      return data as PremiumCommunity[]
    },
  })

  const { data: performanceHighlights, isLoading: performanceHighlightsLoading } = useQuery({
    queryKey: ['premium-admin', 'performance-highlights'],
    queryFn: async () => {
      const { data, error: highlightsError } = await supabase
        .from('premium_performance_highlights')
        .select('*')
        .order('rank_order')
      if (highlightsError) throw highlightsError
      return data as PremiumPerformanceHighlight[]
    },
  })

  const reviewQueue = useMemo(
    () => (payments ?? []).filter(payment => payment.status === 'REQUIRES_REVIEW'),
    [payments],
  )
  const paymentBySubscription = useMemo(
    () => new Map((payments ?? []).map(payment => [payment.subscription_id, payment])),
    [payments],
  )
  const onboardingByUser = useMemo(
    () => new Map((onboardingResponses ?? []).map(response => [response.user_id, response])),
    [onboardingResponses],
  )
  const subscriptionRequests = useMemo(
    () => (subscriptions ?? []).filter(subscription => (
      subscription.status === 'PENDING_PAYMENT' || subscription.status === 'PAYMENT_REVIEW'
      || subscription.status === 'PENDING_APPROVAL'
    )),
    [subscriptions],
  )
  const activeCount = (subscriptions ?? []).filter(subscription => subscription.status === 'ACTIVE').length
  const reviewCount = reviewQueue.length
  const monthlyRevenueLak = (payments ?? [])
    .filter(payment => payment.status === 'VERIFIED')
    .reduce((sum, payment) => sum + Number(payment.amount_lak || 0), 0)
  const todayMotivation = motivations?.[0] ?? null
  const navItems: Array<{
    id: PremiumAdminSection
    label: string
    detail: string
    icon: ReactNode
    badge?: ReactNode
  }> = [
    { id: 'overview', label: 'Overview', detail: 'Premium health', icon: <Sparkles className="h-4 w-4" /> },
    { id: 'payments', label: 'Payment Review', detail: 'Transfer proofs', icon: <ReceiptText className="h-4 w-4" />, badge: reviewCount },
    { id: 'members', label: 'Members', detail: 'Subscriptions', icon: <Users className="h-4 w-4" />, badge: subscriptionRequests.length },
    { id: 'plans', label: 'Plans', detail: 'Pricing and benefits', icon: <Crown className="h-4 w-4" /> },
    { id: 'mentor', label: 'Daily Mentor', detail: 'Motivation content', icon: <MessageSquareText className="h-4 w-4" /> },
    { id: 'content', label: 'Member Content', detail: 'Events and community', icon: <Flame className="h-4 w-4" /> },
  ]

  function scrollToSection(section: PremiumAdminSection) {
    const target = document.getElementById(`premium-${section}`)
    if (!target) return
    setActiveSection(section)
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.history.replaceState(null, '', `#premium-${section}`)
  }

  async function invalidateAdminPremium() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['premium-admin', 'subscriptions'] }),
      qc.invalidateQueries({ queryKey: ['premium-admin', 'payments'] }),
      qc.invalidateQueries({ queryKey: ['premium-admin', 'plans'] }),
      qc.invalidateQueries({ queryKey: ['premium-admin', 'motivations'] }),
      qc.invalidateQueries({ queryKey: ['premium-admin', 'member-events'] }),
      qc.invalidateQueries({ queryKey: ['premium-admin', 'communities'] }),
      qc.invalidateQueries({ queryKey: ['premium-admin', 'performance-highlights'] }),
    ])
  }

  async function approveSubscription(subscriptionId: string) {
    setReviewingSubscriptionId(subscriptionId)
    try {
      const { error: approvalError } = await supabase.rpc('review_premium_subscription_request', {
        p_subscription_id: subscriptionId,
        p_approve: true,
        p_reason: null,
      })
      if (approvalError) throw approvalError

      await invalidateAdminPremium()
      success('Subscription approved and activity access enabled.')
    } catch (err) {
      console.error(err)
      error('Could not approve this subscription.')
    } finally {
      setReviewingSubscriptionId(null)
    }
  }

  async function rejectSubscription() {
    if (!rejectingRequest) return
    setReviewingSubscriptionId(rejectingRequest.subscriptionId)
    try {
      const { error: rejectionError } = await supabase.rpc('review_premium_subscription_request', {
        p_subscription_id: rejectingRequest.subscriptionId,
        p_approve: false,
        p_reason: rejectReason.trim(),
      })
      if (rejectionError) throw rejectionError

      setRejectingRequest(null)
      setRejectReason('')
      await invalidateAdminPremium()
      success('Subscription request rejected.')
    } catch (err) {
      console.error(err)
      error('Could not reject this subscription.')
    } finally {
      setReviewingSubscriptionId(null)
    }
  }

  async function viewProof(payment: PremiumPayment) {
    if (!payment.receipt_image_url) {
      error('No payment proof uploaded.')
      return
    }

    try {
      const { data, error: signedUrlError } = await supabase.storage
        .from('premium-payment-proofs')
        .createSignedUrl(payment.receipt_image_url, 60)

      if (signedUrlError) throw signedUrlError
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } catch (err) {
      console.error(err)
      error('Could not open payment proof.')
    }
  }

  function openPlanEditor(plan: PremiumPlan) {
    setEditingPlan({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      price_lak: String(plan.price_lak),
      interval: plan.interval,
      features: plan.features.join('\n'),
      is_active: plan.is_active,
    })
  }

  async function savePlan() {
    if (!editingPlan) return
    const price = Number(editingPlan.price_lak)
    if (!Number.isFinite(price) || price < 0) {
      error('Enter a valid plan price.')
      return
    }

    try {
      const { error: planError } = await supabase
        .from('premium_plans')
        .update({
          name: editingPlan.name.trim(),
          description: editingPlan.description.trim(),
          price_lak: Math.round(price),
          interval: editingPlan.interval.trim() || 'month',
          features: editingPlan.features.split('\n').map(feature => feature.trim()).filter(Boolean),
          is_active: editingPlan.is_active,
        })
        .eq('id', editingPlan.id)

      if (planError) throw planError
      setEditingPlan(null)
      await invalidateAdminPremium()
      success('Premium plan updated.')
    } catch (err) {
      console.error(err)
      error('Could not update Premium plan.')
    }
  }

  function openMotivationEditor(motivation?: DailyMotivation | null) {
    const today = new Date().toISOString().slice(0, 10)
    setMotivationForm({
      publish_date: motivation?.publish_date ?? today,
      quote: motivation?.quote ?? '',
      reflection: motivation?.reflection ?? '',
      challenge: motivation?.challenge ?? '',
      mission: motivation?.mission ?? '',
    })
  }

  async function saveMotivation() {
    if (!motivationForm) return
    setSavingMotivation(true)
    try {
      const { error: motivationError } = await supabase
        .from('premium_daily_motivations')
        .upsert({
          publish_date: motivationForm.publish_date,
          quote: motivationForm.quote.trim(),
          reflection: motivationForm.reflection.trim(),
          challenge: motivationForm.challenge.trim(),
          mission: motivationForm.mission.trim(),
          is_active: true,
        }, { onConflict: 'publish_date' })

      if (motivationError) throw motivationError
      setMotivationForm(null)
      await invalidateAdminPremium()
      success('Daily mentor content saved.')
    } catch (err) {
      console.error(err)
      error('Could not save daily mentor content.')
    } finally {
      setSavingMotivation(false)
    }
  }

  function openEventEditor(event?: PremiumMemberEvent | null) {
    setEditingEvent({
      id: event?.id,
      title: event?.title ?? '',
      detail: event?.detail ?? '',
      label: event?.time_label ?? '',
      action_url: event?.action_url ?? '',
      order: String(event?.sort_order ?? ((memberEvents?.length ?? 0) + 1)),
      is_active: event?.is_active ?? true,
    })
  }

  function openCommunityEditor(community?: PremiumCommunity | null) {
    setEditingCommunity({
      id: community?.id,
      title: community?.title ?? '',
      detail: community?.detail ?? '',
      label: '',
      action_url: community?.action_url ?? '',
      order: String(community?.sort_order ?? ((communities?.length ?? 0) + 1)),
      is_active: community?.is_active ?? true,
    })
  }

  function openHighlightEditor(highlight?: PremiumPerformanceHighlight | null) {
    setEditingHighlight({
      id: highlight?.id,
      display_name: highlight?.display_name ?? '',
      metric: highlight?.metric ?? '',
      period_label: highlight?.period_label ?? '',
      rank_order: String(highlight?.rank_order ?? ((performanceHighlights?.length ?? 0) + 1)),
      is_active: highlight?.is_active ?? true,
    })
  }

  async function saveEvent() {
    if (!editingEvent) return
    const payload = {
      title: editingEvent.title.trim(),
      detail: editingEvent.detail.trim(),
      time_label: editingEvent.label.trim() || null,
      action_url: editingEvent.action_url.trim() || null,
      sort_order: Number(editingEvent.order) || 0,
      is_active: editingEvent.is_active,
    }

    try {
      const query = editingEvent.id
        ? supabase.from('premium_member_events').update(payload).eq('id', editingEvent.id)
        : supabase.from('premium_member_events').insert(payload)
      const { error: eventError } = await query
      if (eventError) throw eventError
      setEditingEvent(null)
      await invalidateAdminPremium()
      success('Member event saved.')
    } catch (err) {
      console.error(err)
      error('Could not save member event.')
    }
  }

  async function saveCommunity() {
    if (!editingCommunity) return
    const payload = {
      title: editingCommunity.title.trim(),
      detail: editingCommunity.detail.trim(),
      action_url: editingCommunity.action_url.trim() || null,
      sort_order: Number(editingCommunity.order) || 0,
      is_active: editingCommunity.is_active,
    }

    try {
      const query = editingCommunity.id
        ? supabase.from('premium_communities').update(payload).eq('id', editingCommunity.id)
        : supabase.from('premium_communities').insert(payload)
      const { error: communityError } = await query
      if (communityError) throw communityError
      setEditingCommunity(null)
      await invalidateAdminPremium()
      success('Premium community saved.')
    } catch (err) {
      console.error(err)
      error('Could not save Premium community.')
    }
  }

  async function saveHighlight() {
    if (!editingHighlight) return
    const payload = {
      display_name: editingHighlight.display_name.trim(),
      metric: editingHighlight.metric.trim(),
      period_label: editingHighlight.period_label.trim() || null,
      rank_order: Number(editingHighlight.rank_order) || 0,
      is_active: editingHighlight.is_active,
    }

    try {
      const query = editingHighlight.id
        ? supabase.from('premium_performance_highlights').update(payload).eq('id', editingHighlight.id)
        : supabase.from('premium_performance_highlights').insert(payload)
      const { error: highlightError } = await query
      if (highlightError) throw highlightError
      setEditingHighlight(null)
      await invalidateAdminPremium()
      success('Performance highlight saved.')
    } catch (err) {
      console.error(err)
      error('Could not save performance highlight.')
    }
  }

  const loading = plansLoading || subscriptionsLoading || paymentsLoading || onboardingResponsesLoading || motivationsLoading || memberEventsLoading || communitiesLoading || performanceHighlightsLoading
  const selectedOnboarding = selectedSubscription
    ? onboardingByUser.get(selectedSubscription.user_id)
    : undefined
  const selectedResponses = selectedOnboarding?.responses ?? {}

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-primary-800 bg-primary-900 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <PwenLogoLockup
            textClassName="text-white"
            subTextClassName="text-primary-200"
            markClassName="rounded-xl bg-white/10 p-1"
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => navigate('/profile')}
              className="bg-white/10 text-white hover:bg-white/15"
            >
              Profile
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 pb-8 pt-4">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-primary-100">
                <Crown className="h-3.5 w-3.5 text-amber-300" />
                Premium Admin
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-normal md:text-5xl">Subscription Dashboard</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-primary-100">
                Manage Bitdoin Premium plans, subscriptions, payment review, and daily mentor content separately from bookstore operations.
              </p>
            </div>
            <Button
              type="button"
              icon={<MessageSquareText className="h-4 w-4" />}
              onClick={() => openMotivationEditor(todayMotivation)}
              className="bg-white text-primary-900 hover:bg-primary-50"
            >
              Edit Daily Mentor
            </Button>
          </div>
        </div>
      </header>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[260px_1fr]">
          <aside className="h-fit rounded-3xl bg-primary-900 p-3 text-white shadow-card lg:sticky lg:top-6">
            <div className="border-b border-white/10 px-3 pb-4 pt-2">
              <p className="text-xs font-bold uppercase tracking-wide text-primary-200">Premium</p>
              <p className="mt-1 text-lg font-black">Admin Menu</p>
            </div>
             <nav className="mt-3 space-y-1">
               {navItems.map(item => (
                 <button
                   type="button"
                   key={item.id}
                   onClick={() => scrollToSection(item.id)}
                   className={cn(
                     'flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
                     activeSection === item.id
                       ? 'bg-white/15 text-white'
                       : 'text-primary-200 hover:bg-white/10 hover:text-white',
                  )}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
                    {item.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{item.label}</span>
                    <span className="block truncate text-xs font-medium text-primary-300">{item.detail}</span>
                  </span>
                  {item.badge ? (
                    <span className="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-black text-primary-950">
                      {item.badge}
                    </span>
                   ) : null}
                 </button>
               ))}
             </nav>
          </aside>

          <div className="min-w-0 space-y-6">
          <section id="premium-overview" className="grid scroll-mt-6 gap-4 md:grid-cols-4">
            <Stat label="Active members" value={activeCount} icon={<Users className="h-5 w-5" />} color="blue" />
            <Stat label="Payment review" value={reviewCount} icon={<ReceiptText className="h-5 w-5" />} color="amber" />
            <Stat label="Verified revenue" value={formatPrice(monthlyRevenueLak, currency)} icon={<Crown className="h-5 w-5" />} color="green" />
            <Stat label="Daily posts" value={motivations?.length ?? 0} icon={<CalendarCheck className="h-5 w-5" />} color="purple" />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Panel
              id="premium-payments"
              title="Payment Review"
              eyebrow="Queue"
              action={`${reviewQueue.length} pending`}
              icon={<ReceiptText className="h-5 w-5" />}
            >
              <div className="space-y-3">
                {reviewQueue.length > 0 ? reviewQueue.map(payment => (
                  <div key={payment.id} className="rounded-2xl border border-orange-100 bg-orange-50/60 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-gray-950">{payment.user?.name ?? 'Unknown user'}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {payment.plan?.name ?? 'Premium'} · {formatPrice(payment.amount_lak, currency)} · {formatDate(payment.created_at, language)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" icon={<Eye className="h-4 w-4" />} onClick={() => viewProof(payment)}>
                          Proof
                        </Button>
                         <Button
                           type="button"
                           size="sm"
                           variant="success"
                           icon={<CheckCircle2 className="h-4 w-4" />}
                          onClick={() => approveSubscription(payment.subscription_id)}
                          loading={reviewingSubscriptionId === payment.subscription_id}
                        >
                          Approve
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="danger"
                          icon={<XCircle className="h-4 w-4" />}
                          onClick={() => {
                            setRejectingRequest({
                              subscriptionId: payment.subscription_id,
                              userName: payment.user?.name ?? 'Unknown user',
                            })
                            setRejectReason('')
                          }}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                )) : (
                  <EmptyMessage icon={<ShieldCheck className="h-8 w-8" />} title="No payments need review" detail="Premium transfer proofs will appear here after users upload them." />
                )}
              </div>
            </Panel>

            <Panel
              id="premium-plans"
              title="Plans"
              eyebrow="Pricing"
              action={`${plans?.length ?? 0} plans`}
              icon={<Crown className="h-5 w-5" />}
            >
              <div className="space-y-3">
                {(plans ?? []).map(plan => (
                  <div key={plan.id} className="rounded-2xl border border-gray-100 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          {plan.price_lak > 0 ? <Crown className="h-4 w-4 text-amber-500" /> : <ShieldCheck className="h-4 w-4 text-primary-600" />}
                          <p className="text-sm font-black text-gray-950">{plan.name}</p>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-gray-500">{plan.description}</p>
                        <p className="mt-3 text-lg font-black text-gray-950">{formatPrice(plan.price_lak, currency)} <span className="text-xs font-semibold text-gray-400">/{plan.interval}</span></p>
                      </div>
                      <Button type="button" size="sm" variant="outline" icon={<Edit3 className="h-4 w-4" />} onClick={() => openPlanEditor(plan)}>
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
             <Panel
               id="premium-members"
               title="Subscriptions"
               eyebrow="Members"
               action={`${subscriptionRequests.length} awaiting action`}
               icon={<Users className="h-5 w-5" />}
             >
               <div className="space-y-5">
                 {(subscriptionsQueryError || paymentsQueryError || onboardingResponsesQueryError) && (
                   <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4">
                     <p className="text-sm font-black text-red-900">Could not load subscription requests</p>
                     <p className="mt-1 text-xs leading-5 text-red-700">
                       Refresh this page. If the problem continues, verify the Premium migrations and your Admin role.
                     </p>
                   </div>
                 )}

                 <div>
                   <div className="mb-3 flex items-center justify-between gap-3">
                     <div>
                       <p className="text-sm font-black text-gray-950">Requests to review</p>
                       <p className="mt-0.5 text-xs text-gray-500">Approve only after checking the uploaded payment proof.</p>
                     </div>
                     <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-black text-orange-800">
                       {subscriptionRequests.length}
                     </span>
                   </div>

                   {subscriptionRequests.length > 0 ? (
                     <div className="space-y-3">
                       {subscriptionRequests.map(subscription => {
                         const payment = paymentBySubscription.get(subscription.id)
                         const isFreeRequest = Number(subscription.plan?.price_lak ?? 0) <= 0
                          const readyForReview = isFreeRequest
                            ? subscription.status === 'PENDING_APPROVAL'
                            : payment?.status === 'REQUIRES_REVIEW'

                          return (
                           <div
                             key={subscription.id}
                             role="button"
                             tabIndex={0}
                             onClick={() => setSelectedSubscription(subscription)}
                             onKeyDown={event => {
                               if (event.key === 'Enter' || event.key === ' ') {
                                 event.preventDefault()
                                 setSelectedSubscription(subscription)
                               }
                             }}
                             className="cursor-pointer rounded-2xl border border-orange-200 bg-orange-50/60 p-4 transition hover:border-orange-300 hover:bg-orange-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                           >
                             <div className="flex flex-col gap-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div className="flex min-w-0 items-center gap-3">
                                    <MemberAvatar
                                      name={subscription.user?.name}
                                      avatarUrl={subscription.user?.avatar_url}
                                    />
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-black text-gray-950">{subscription.user?.name ?? 'Unknown user'}</p>
                                      <p className="mt-1 text-xs font-semibold text-gray-500">
                                        {subscription.plan?.name ?? 'Premium'} · Requested {formatDate(subscription.created_at, language)}
                                      </p>
                                    </div>
                                  </div>
                                 <div className="flex flex-wrap gap-2">
                                   <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold', subscriptionStatusClass(subscription.status))}>
                                     {statusLabel(subscription.status)}
                                   </span>
                                   {payment ? (
                                     <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold', paymentStatusClass(payment.status))}>
                                       Payment {payment.status.replace(/_/g, ' ')}
                                     </span>
                                   ) : null}
                                 </div>
                               </div>

                               <div className="flex flex-col gap-3 border-t border-orange-200 pt-3 sm:flex-row sm:items-center sm:justify-between">
                                 <div className="min-w-0">
                                   {payment?.receipt_image_url ? (
                                     <Button
                                       type="button"
                                       size="sm"
                                       variant="outline"
                                       icon={<Eye className="h-4 w-4" />}
                                       onClick={event => {
                                         event.stopPropagation()
                                         void viewProof(payment)
                                       }}
                                     >
                                       Check proof
                                     </Button>
                                   ) : isFreeRequest ? (
                                     <span className="text-xs font-semibold text-primary-700">Free plan · No payment required</span>
                                   ) : (
                                     <span className="text-xs font-semibold text-amber-700">Waiting for payment proof</span>
                                   )}
                                 </div>
                                 <div className="flex flex-nowrap items-center gap-2 self-end sm:self-auto">
                                   {readyForReview ? (
                                     <Button
                                       type="button"
                                       size="sm"
                                       variant="success"
                                       icon={<CheckCircle2 className="h-4 w-4" />}
                                       onClick={event => {
                                         event.stopPropagation()
                                         void approveSubscription(subscription.id)
                                       }}
                                       loading={reviewingSubscriptionId === subscription.id}
                                     >
                                       Approve
                                     </Button>
                                   ) : null}
                                   <Button
                                     type="button"
                                     size="sm"
                                     variant="danger"
                                     icon={<XCircle className="h-4 w-4" />}
                                     onClick={event => {
                                       event.stopPropagation()
                                       setRejectingRequest({
                                         subscriptionId: subscription.id,
                                         userName: subscription.user?.name ?? 'Unknown user',
                                       })
                                       setRejectReason('')
                                     }}
                                   >
                                     Reject
                                   </Button>
                                 </div>
                               </div>
                             </div>
                           </div>
                         )
                       })}
                     </div>
                   ) : (
                     <div className="rounded-2xl border border-dashed border-gray-200 py-6">
                       <EmptyMessage icon={<ShieldCheck className="h-8 w-8" />} title="No subscription requests" detail="New paid requests and uploaded proofs will appear here." />
                     </div>
                   )}
                 </div>

                 <div>
                   <p className="mb-3 text-sm font-black text-gray-950">All subscriptions</p>
                   <div className="overflow-hidden rounded-2xl border border-gray-100">
                     {(subscriptions ?? []).length > 0 ? (
                       <div className="divide-y divide-gray-100">
                         {subscriptions!.map(subscription => (
                           <button
                             type="button"
                             key={subscription.id}
                             onClick={() => setSelectedSubscription(subscription)}
                             className="grid w-full gap-3 p-4 text-left transition hover:bg-gray-50 focus:outline-none focus-visible:bg-primary-50 md:grid-cols-[1fr_auto] md:items-center"
                           >
                              <div className="flex min-w-0 items-center gap-3">
                                <MemberAvatar
                                  name={subscription.user?.name}
                                  avatarUrl={subscription.user?.avatar_url}
                                />
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-black text-gray-950">{subscription.user?.name ?? 'Unknown user'}</p>
                                  <p className="mt-1 text-xs text-gray-500">
                                    {subscription.plan?.name ?? 'Plan'} · Ends {subscription.ends_at ? formatDate(subscription.ends_at, language) : 'manual'}
                                  </p>
                                </div>
                              </div>
                             <span className={cn('w-fit rounded-full px-2.5 py-1 text-xs font-bold', subscriptionStatusClass(subscription.status))}>
                               {statusLabel(subscription.status)}
                             </span>
                           </button>
                         ))}
                       </div>
                     ) : (
                       <EmptyMessage icon={<Users className="h-8 w-8" />} title="No subscriptions yet" detail="Premium subscriptions will appear here once users start a plan." />
                     )}
                   </div>
                 </div>
               </div>
             </Panel>

            <Panel
              id="premium-mentor"
              title="Daily Mentor"
              eyebrow="Content"
              action={todayMotivation ? formatDate(todayMotivation.publish_date, language) : 'Not set'}
              icon={<Sparkles className="h-5 w-5" />}
            >
              {todayMotivation ? (
                <div className="space-y-3">
                  <blockquote className="rounded-2xl bg-primary-900 p-4 text-white">
                    <Flame className="mb-2 h-5 w-5 text-amber-300" />
                    <p className="text-base font-bold leading-7">"{todayMotivation.quote}"</p>
                  </blockquote>
                  <DailyRow label="Reflection" value={todayMotivation.reflection} />
                  <DailyRow label="Challenge" value={todayMotivation.challenge} />
                  <DailyRow label="Mission" value={todayMotivation.mission} />
                </div>
              ) : (
                <EmptyMessage icon={<FileText className="h-8 w-8" />} title="No daily content" detail="Create the first daily mentor entry for Premium users." />
              )}
            </Panel>
          </section>

          <section id="premium-content" className="scroll-mt-6 grid gap-6 xl:grid-cols-3">
            <MemberContentPanel
              eyebrow="Events"
              title="Member events"
              action="New event"
              items={(memberEvents ?? []).map(event => ({
                id: event.id,
                title: event.title,
                detail: event.detail,
                meta: event.time_label ?? 'No time label',
                isActive: event.is_active,
                onEdit: () => openEventEditor(event),
              }))}
              onCreate={() => openEventEditor(null)}
            />
            <MemberContentPanel
              eyebrow="Communities"
              title="Premium communities"
              action="New community"
              items={(communities ?? []).map(community => ({
                id: community.id,
                title: community.title,
                detail: community.detail,
                meta: community.action_url ? 'Has link' : 'No link',
                isActive: community.is_active,
                onEdit: () => openCommunityEditor(community),
              }))}
              onCreate={() => openCommunityEditor(null)}
            />
            <MemberContentPanel
              eyebrow="Leaderboard"
              title="Top performers"
              action="New highlight"
              items={(performanceHighlights ?? []).map(highlight => ({
                id: highlight.id,
                title: highlight.display_name,
                detail: highlight.metric,
                meta: highlight.period_label ?? 'No period',
                isActive: highlight.is_active,
                onEdit: () => openHighlightEditor(highlight),
              }))}
              onCreate={() => openHighlightEditor(null)}
            />
          </section>
          </div>
        </main>
      )}

      <Modal
        open={!!selectedSubscription}
        onClose={() => setSelectedSubscription(null)}
        title="Member Details"
        size="lg"
        footer={
          <Button type="button" variant="outline" onClick={() => setSelectedSubscription(null)}>
            Close
          </Button>
        }
      >
        {selectedSubscription && (
          <div className="space-y-5">
            <div className="relative overflow-hidden rounded-2xl bg-primary-950">
              <div className="h-24 bg-primary-900">
                {selectedSubscription.user?.cover_image_url && (
                  <img src={selectedSubscription.user.cover_image_url} alt="" className="h-full w-full object-cover opacity-80" />
                )}
              </div>
              <div className="absolute left-4 top-14 z-20 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-primary-100 text-2xl font-black text-primary-800 shadow-lg">
                {selectedSubscription.user?.avatar_url ? (
                  <img src={selectedSubscription.user.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span>{selectedSubscription.user?.name?.charAt(0).toUpperCase() ?? '?'}</span>
                )}
              </div>
              <div className="flex min-h-24 items-center py-4 pl-28 pr-4">
                <div className="min-w-0 text-white">
                  <p className="truncate text-lg font-black">{selectedSubscription.user?.name ?? 'Unknown user'}</p>
                  <p className="truncate text-xs text-primary-200">{selectedSubscription.user?.email ?? 'No email address'}</p>
                </div>
              </div>
            </div>

            <MemberDetailSection icon={<Users className="h-4 w-4" />} title="Account and membership">
              <MemberDetail label="Plan" value={selectedSubscription.plan?.name} />
              <MemberDetail label="Status" value={statusLabel(selectedSubscription.status)} />
              <MemberDetail label="Requested" value={formatDate(selectedSubscription.created_at, language)} />
              <MemberDetail label="Phone" value={selectedSubscription.user?.phone} icon={<Phone className="h-4 w-4" />} />
              <MemberDetail label="Email" value={selectedSubscription.user?.email} icon={<Mail className="h-4 w-4" />} />
              <MemberDetail label="Language" value={selectedSubscription.user?.language?.toUpperCase()} />
            </MemberDetailSection>

            <MemberDetailSection icon={<GraduationCap className="h-4 w-4" />} title="Learning profile">
              <MemberDetail label="Preferred name" value={selectedResponses.preferred_name} />
              <MemberDetail label="Education / status" value={selectedResponses.current_status} />
              <MemberDetail label="Priority goal" value={selectedResponses.priority_goal} />
              <MemberDetail label="Biggest challenge" value={selectedResponses.biggest_problem_now} />
              <MemberDetail label="Daily study" value={selectedResponses.daily_study_hours} />
              <MemberDetail label="AI experience" value={selectedResponses.ai_tool_experience} />
              <MemberDetail label="English level" value={selectedResponses.english_level_self_rating} />
              <MemberDetail label="Motivation" value={selectedResponses.motivation_source} />
              <MemberDetail label="Mentor tone" value={selectedResponses.preferred_mentor_tone} />
              <MemberDetail label="Response style" value={selectedResponses.preferred_ai_response_style} />
            </MemberDetailSection>

            <MemberDetailSection icon={<MessageSquareText className="h-4 w-4" />} title="Daily reminder">
              <MemberDetail label="WhatsApp" value={selectedOnboarding?.whatsapp_number} />
              <MemberDetail
                label="Reminder"
                value={selectedOnboarding?.daily_reminder_enabled ? selectedOnboarding.daily_reminder_time : 'Disabled'}
              />
            </MemberDetailSection>
          </div>
        )}
      </Modal>

      <Modal
        open={!!editingEvent}
        onClose={() => setEditingEvent(null)}
        title={editingEvent?.id ? 'Edit Member Event' : 'New Member Event'}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setEditingEvent(null)}>Cancel</Button>
            <Button type="button" icon={<Save className="h-4 w-4" />} onClick={saveEvent}>Save event</Button>
          </>
        }
      >
        {editingEvent && (
          <MemberContentForm form={editingEvent} setForm={setEditingEvent} labelName="Time label" />
        )}
      </Modal>

      <Modal
        open={!!editingCommunity}
        onClose={() => setEditingCommunity(null)}
        title={editingCommunity?.id ? 'Edit Premium Community' : 'New Premium Community'}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setEditingCommunity(null)}>Cancel</Button>
            <Button type="button" icon={<Save className="h-4 w-4" />} onClick={saveCommunity}>Save community</Button>
          </>
        }
      >
        {editingCommunity && (
          <MemberContentForm form={editingCommunity} setForm={setEditingCommunity} labelName="Optional label" />
        )}
      </Modal>

      <Modal
        open={!!editingHighlight}
        onClose={() => setEditingHighlight(null)}
        title={editingHighlight?.id ? 'Edit Performance Highlight' : 'New Performance Highlight'}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setEditingHighlight(null)}>Cancel</Button>
            <Button type="button" icon={<Save className="h-4 w-4" />} onClick={saveHighlight}>Save highlight</Button>
          </>
        }
      >
        {editingHighlight && (
          <div className="space-y-4">
            <Input label="Display name" value={editingHighlight.display_name} onChange={event => setEditingHighlight({ ...editingHighlight, display_name: event.target.value })} />
            <Input label="Metric" value={editingHighlight.metric} onChange={event => setEditingHighlight({ ...editingHighlight, metric: event.target.value })} />
            <Input label="Period label" value={editingHighlight.period_label} onChange={event => setEditingHighlight({ ...editingHighlight, period_label: event.target.value })} />
            <Input label="Rank order" type="number" value={editingHighlight.rank_order} onChange={event => setEditingHighlight({ ...editingHighlight, rank_order: event.target.value })} />
            <ActiveToggle checked={editingHighlight.is_active} onChange={checked => setEditingHighlight({ ...editingHighlight, is_active: checked })} />
          </div>
        )}
      </Modal>

      <Modal
        open={!!rejectingRequest}
        onClose={() => setRejectingRequest(null)}
        title="Reject Subscription Request"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setRejectingRequest(null)}>Cancel</Button>
            <Button
              type="button"
              variant="danger"
              icon={<XCircle className="h-4 w-4" />}
              onClick={rejectSubscription}
              loading={reviewingSubscriptionId === rejectingRequest?.subscriptionId}
            >
              Reject request
            </Button>
          </>
        }
      >
        <p className="mb-4 text-sm text-gray-600">
          Rejecting the request for <span className="font-bold text-gray-950">{rejectingRequest?.userName}</span> will prevent access to Premium activities.
        </p>
        <Textarea
          label="Reason"
          rows={4}
          value={rejectReason}
          onChange={event => setRejectReason(event.target.value)}
          placeholder="Explain why this subscription request was not approved."
        />
      </Modal>

      <Modal
        open={!!editingPlan}
        onClose={() => setEditingPlan(null)}
        title="Edit Premium Plan"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setEditingPlan(null)}>Cancel</Button>
            <Button type="button" icon={<Save className="h-4 w-4" />} onClick={savePlan}>Save plan</Button>
          </>
        }
      >
        {editingPlan && (
          <div className="space-y-4">
            <Input label="Name" value={editingPlan.name} onChange={event => setEditingPlan({ ...editingPlan, name: event.target.value })} />
            <Input label="Price LAK" type="number" min={0} value={editingPlan.price_lak} onChange={event => setEditingPlan({ ...editingPlan, price_lak: event.target.value })} />
            <Input label="Interval" value={editingPlan.interval} onChange={event => setEditingPlan({ ...editingPlan, interval: event.target.value })} />
            <Textarea label="Description" rows={3} value={editingPlan.description} onChange={event => setEditingPlan({ ...editingPlan, description: event.target.value })} />
            <Textarea label="Features" rows={6} value={editingPlan.features} onChange={event => setEditingPlan({ ...editingPlan, features: event.target.value })} />
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={editingPlan.is_active}
                onChange={event => setEditingPlan({ ...editingPlan, is_active: event.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-primary-700 focus:ring-primary-500"
              />
              Active plan
            </label>
          </div>
        )}
      </Modal>

      <Modal
        open={!!motivationForm}
        onClose={() => setMotivationForm(null)}
        title="Daily Mentor Content"
        size="lg"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setMotivationForm(null)}>Cancel</Button>
            <Button type="button" icon={<Save className="h-4 w-4" />} onClick={saveMotivation} loading={savingMotivation}>Publish</Button>
          </>
        }
      >
        {motivationForm && (
          <div className="space-y-4">
            <Input label="Publish date" type="date" value={motivationForm.publish_date} onChange={event => setMotivationForm({ ...motivationForm, publish_date: event.target.value })} />
            <Textarea label="Quote" rows={3} value={motivationForm.quote} onChange={event => setMotivationForm({ ...motivationForm, quote: event.target.value })} />
            <Textarea label="Reflection" rows={3} value={motivationForm.reflection} onChange={event => setMotivationForm({ ...motivationForm, reflection: event.target.value })} />
            <Textarea label="Challenge" rows={3} value={motivationForm.challenge} onChange={event => setMotivationForm({ ...motivationForm, challenge: event.target.value })} />
            <Textarea label="Mission" rows={3} value={motivationForm.mission} onChange={event => setMotivationForm({ ...motivationForm, mission: event.target.value })} />
          </div>
        )}
      </Modal>
    </div>
  )
}

function Stat({ label, value, icon, color }: { label: string; value: ReactNode; icon: ReactNode; color: 'blue' | 'amber' | 'green' | 'purple' }) {
  const colors = {
    blue: 'bg-primary-50 text-primary-700',
    amber: 'bg-amber-50 text-amber-700',
    green: 'bg-emerald-50 text-emerald-700',
    purple: 'bg-indigo-50 text-indigo-700',
  }
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400">{label}</p>
          <p className="mt-2 text-2xl font-black text-gray-950">{value}</p>
        </div>
        <div className={cn('rounded-2xl p-3', colors[color])}>{icon}</div>
      </div>
    </Card>
  )
}

function MemberDetailSection({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2 text-primary-600">
        {icon}
        <h3 className="text-sm font-black text-gray-950">{title}</h3>
      </div>
      <div className="divide-y divide-gray-100 border-y border-gray-100">
        {children}
      </div>
    </section>
  )
}

function MemberDetail({ label, value, icon }: { label: string; value?: string | null; icon?: ReactNode }) {
  return (
    <div className="grid gap-1 py-2.5 sm:grid-cols-[150px_1fr] sm:gap-4">
      <p className="flex items-center gap-2 text-xs font-bold text-gray-500">
        {icon}
        {label}
      </p>
      <p className="break-words text-sm font-semibold text-gray-900">{value || 'Not provided'}</p>
    </div>
  )
}

function MemberAvatar({ name, avatarUrl }: { name?: string | null; avatarUrl?: string | null }) {
  return (
    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-primary-100 text-sm font-black text-primary-800 shadow-sm">
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span>{name?.charAt(0).toUpperCase() ?? '?'}</span>
      )}
    </div>
  )
}

function MemberContentPanel({
  eyebrow,
  title,
  action,
  items,
  onCreate,
}: {
  eyebrow: string
  title: string
  action: string
  items: Array<{
    id: string
    title: string
    detail: string
    meta: string
    isActive: boolean
    onEdit: () => void
  }>
  onCreate: () => void
}) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-card">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-primary-600">{eyebrow}</p>
          <h2 className="mt-1 text-lg font-black text-gray-950">{title}</h2>
        </div>
        <Button type="button" size="sm" variant="outline" icon={<Edit3 className="h-4 w-4" />} onClick={onCreate}>
          {action}
        </Button>
      </div>
      <div className="space-y-3">
        {items.length > 0 ? items.map(item => (
          <div key={item.id} className="rounded-2xl border border-gray-100 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-gray-950">{item.title}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">{item.detail}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-600">{item.meta}</span>
                  <span className={cn(
                    'rounded-full px-2 py-0.5 text-[11px] font-bold',
                    item.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600',
                  )}>
                    {item.isActive ? 'Active' : 'Hidden'}
                  </span>
                </div>
              </div>
              <Button type="button" size="sm" variant="ghost" onClick={item.onEdit}>
                Edit
              </Button>
            </div>
          </div>
        )) : (
          <EmptyMessage icon={<FileText className="h-8 w-8" />} title={`No ${eyebrow.toLowerCase()} yet`} detail={`Create the first ${eyebrow.toLowerCase()} item for Premium members.`} />
        )}
      </div>
    </section>
  )
}

function MemberContentForm({
  form,
  setForm,
  labelName,
}: {
  form: MemberContentFormState
  setForm: (next: MemberContentFormState | null) => void
  labelName: string
}) {
  return (
    <div className="space-y-4">
      <Input label="Title" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} />
      <Textarea label="Detail" rows={4} value={form.detail} onChange={event => setForm({ ...form, detail: event.target.value })} />
      <Input label={labelName} value={form.label} onChange={event => setForm({ ...form, label: event.target.value })} />
      <Input label="Action URL" value={form.action_url} onChange={event => setForm({ ...form, action_url: event.target.value })} />
      <Input label="Sort order" type="number" value={form.order} onChange={event => setForm({ ...form, order: event.target.value })} />
      <ActiveToggle checked={form.is_active} onChange={checked => setForm({ ...form, is_active: checked })} />
    </div>
  )
}

function ActiveToggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-primary-700 focus:ring-primary-500"
      />
      Active
    </label>
  )
}

function Panel({
  id,
  title,
  eyebrow,
  action,
  icon,
  children,
}: {
  id?: string
  title: string
  eyebrow: string
  action: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-6 rounded-3xl bg-white p-5 shadow-card">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-primary-600">{eyebrow}</p>
          <h2 className="mt-1 text-xl font-black text-gray-950">{title}</h2>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary-700">
          {icon}
          <span>{action}</span>
        </div>
      </div>
      {children}
    </section>
  )
}

function EmptyMessage({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 text-gray-300">{icon}</div>
      <p className="mt-3 text-sm font-bold text-gray-800">{title}</p>
      <p className="mt-1 text-xs leading-5 text-gray-400">{detail}</p>
    </div>
  )
}

function DailyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-primary-600">{label}</p>
      <p className="mt-2 text-sm leading-6 text-gray-700">{value}</p>
    </div>
  )
}
