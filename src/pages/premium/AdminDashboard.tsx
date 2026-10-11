import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  Crown,
  Edit3,
  Eye,
  FileText,
  Flame,
  GraduationCap,
  BrainCircuit,
  BookOpen,
  Gamepad2,
  LibraryBig,
  Languages,
  LogOut,
  Mail,
  MessageSquareText,
  Phone,
  ReceiptText,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
  WandSparkles,
  XCircle,
  Moon,
  Sun,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  BellRing,
  Trophy,
  type LucideIcon,
} from 'lucide-react'
import { type ExpiringMembership, ExpiringMembersPanel, useExpiringMemberships } from '@/components/premium/ExpiringMembersPanel'
import { isMembershipExpired } from '@/lib/academyMembership'
import { draftedDeclineReason, PaymentAiReviewCard, usePaymentAiReviews } from '@/components/premium/PaymentAiReviewCard'
import { AdminProfileModal } from '@/components/admin/AdminProfileModal'
import { WhatsAppIcon } from '@/components/ui/ContactIcons'
import { useTheme } from '@/lib/theme'
import { PwenLogoLockup } from '@/components/brand/PwenLogo'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input, Textarea } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useLanguage } from '@/context/LanguageContext'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { firstRelation } from '@/lib/supabaseRelations'
import { premiumText, usePremiumTranslation } from '@/i18n/premium'
import { FloatingOrbitMenu } from '@/components/premium/FloatingOrbitMenu'
import { cn, formatDate, formatDateTime, formatPrice } from '@/lib/utils'

type SubscriptionStatus = 'FREE' | 'PENDING_APPROVAL' | 'PENDING_PAYMENT' | 'PAYMENT_REVIEW' | 'ACTIVE' | 'CANCELLED' | 'EXPIRED'
type PaymentStatus = 'PENDING' | 'REQUIRES_REVIEW' | 'VERIFIED' | 'REJECTED' | 'REFUNDED'
type PremiumAdminSection = 'overview' | 'forge' | 'renewals' | 'members' | 'mentor' | 'content' | 'plans'
// Page order of the sections (their anchors are #premium-<section>).
const ADMIN_SECTION_ORDER: PremiumAdminSection[] = ['overview', 'forge', 'renewals', 'members', 'mentor', 'content', 'plans']

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
  /** Set on an ACTIVE row when the member cancelled; access runs until ends_at. */
  cancelled_at?: string | null
  /** Set on the Free membership given automatically when a paid one expired. */
  downgraded_from_id?: string | null
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

interface ProofPreview {
  url: string
  userName: string
  planName: string
  amountLak: number
  createdAt: string
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

interface WeeklyContentRun {
  id: string
  week_start: string
  status: 'GENERATING' | 'PAUSED' | 'READY' | 'FAILED' | 'CANCELLED'
  content_counts: Record<string, number>
  error_message?: string | null
  started_at: string
  updated_at?: string | null
  completed_at?: string | null
}

type GenerationStep = {
  id: string
  label: string
  status: 'queued' | 'running' | 'paused' | 'done' | 'failed' | 'cancelled'
  detail?: string
}

interface MemberWhatsAppDraft {
  outcome: 'APPROVED' | 'DECLINED' | 'EXPIRING' | 'EXPIRED' | 'PAYMENT_REMINDER' | 'DAILY_REMINDER' | 'DIRECT'
  message: string
  memberName: string
  recipient: string | null
  /** Draft logged in notifications; marked SENT when WhatsApp is opened. */
  notificationId?: string | null
}

const WHATSAPP_DRAFT_TITLES: Record<MemberWhatsAppDraft['outcome'], string> = {
  APPROVED: 'Tell the member: membership approved',
  DECLINED: 'Tell the member: request declined',
  EXPIRING: 'Remind the member: membership ending soon',
  EXPIRED: 'Remind the member: membership expired',
  PAYMENT_REMINDER: 'Remind the member: pay and upload proof',
  DAILY_REMINDER: 'Send the daily learning reminder',
  DIRECT: 'Message the member',
}

// Lists show a short preview; the full list opens in a paginated modal.
const REQUESTS_PREVIEW = 3
const MEMBERS_PREVIEW = 5
const REQUESTS_PAGE_SIZE = 5
const MEMBERS_PAGE_SIZE = 8

// wa.me needs international digits; accept Lao local formats typed by an admin.
function whatsAppDigits(raw: string) {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('020') && digits.length === 11) return `856${digits.slice(1)}`
  if (digits.startsWith('20') && digits.length === 10) return `856${digits}`
  return digits
}

function whatsAppLink(raw: string | null | undefined, message?: string) {
  const digits = whatsAppDigits(raw ?? '')
  if (digits.length < 10) return null
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ''}`
}

// Today's date in Laos (UTC+7, no daylight saving), as stored in publish_date.
function laosToday() {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function paymentReminderMessage(subscription: PremiumSubscription) {
  const lao = (subscription.user?.language ?? 'lo') !== 'en'
  const name = subscription.user?.name?.trim() || (lao ? 'ສະມາຊິກ' : 'there')
  const plan = subscription.plan?.name ?? 'Premium'
  const price = Number(subscription.plan?.price_lak ?? 0).toLocaleString('en-US')
  const link = `${window.location.origin}/academy/subscription`
  return lao
    ? `ສະບາຍດີ ${name}! 🙏\n\nທ່ານໄດ້ສະໝັກ *${plan}* (${price} ກີບ) ໃນ Bitdoin Academy, ແຕ່ພວກເຮົາຍັງບໍ່ໄດ້ຮັບຫຼັກຖານການຊຳລະເງິນ.\n\nກະລຸນາຊຳລະເງິນ ແລ້ວອັບໂຫຼດຫຼັກຖານການຊຳລະ (ສະລິບ) ທີ່ນີ້:\n${link}\n\nເມື່ອພວກເຮົາກວດສອບແລ້ວ, ສະມາຊິກຂອງທ່ານຈະຖືກເປີດໃຊ້ທັນທີ. ຂອບໃຈ!`
    : `Hi ${name}! 🙏\n\nYou requested *${plan}* (${price} LAK) on Bitdoin Academy, but we haven't received your payment proof yet.\n\nPlease make the payment, then upload the payment proof (slip) here:\n${link}\n\nWe'll activate your membership as soon as we've checked it. Thank you!`
}

// Same content as the Telegram daily reminder (telegram-daily-reminder), in WhatsApp formatting.
function dailyReminderMessage(subscription: PremiumSubscription, mentor: Pick<DailyMotivation, 'quote' | 'challenge'> | null) {
  const lao = (subscription.user?.language ?? 'lo') !== 'en'
  const name = subscription.user?.name?.trim() || (lao ? 'ສະມາຊິກ' : 'there')
  const greeting = lao
    ? `🌱 *ສະບາຍດີ ${name}!* ເຖິງເວລາຮຽນປະຈຳວັນຂອງທ່ານແລ້ວ.`
    : `🌱 *Hi ${name}!* It's time for today's learning.`
  const body = mentor
    ? `\n\n💬 _${mentor.quote}_\n\n🎯 ${lao ? 'ຄວາມທ້າທາຍມື້ນີ້' : "Today's challenge"}: ${mentor.challenge}`
    : `\n\n${lao ? 'ໃຊ້ເວລາພຽງ 10 ນາທີ ເພື່ອຮຽນບົດຮຽນໃໝ່ ແລະ ຮັກສາ streak ຂອງທ່ານ 🔥' : 'Spend just 10 minutes on a new lesson and keep your streak going 🔥'}`
  const footer = `\n\n📚 ${lao ? 'ເປີດ Academy' : 'Open Academy'}: ${window.location.origin}/academy/home`
  return greeting + body + footer
}

interface WeeklyContentTask {
  task_key: string
  status: 'PENDING' | 'PROCESSING' | 'PAUSED' | 'DONE' | 'FAILED' | 'CANCELLED'
  error_message: string | null
  sort_order: number
}

const TASK_STATUS: Record<WeeklyContentTask['status'], GenerationStep['status']> = {
  PENDING: 'queued', PROCESSING: 'running', PAUSED: 'paused', DONE: 'done', FAILED: 'failed', CANCELLED: 'cancelled',
}

function generationStepLabel(taskKey: string, categoryNames: Map<string, string>, batchTotals: Map<string, number>) {
  const batch = taskKey.match(/^(brain_sprint|word_match)-(\d+)$/)
  if (batch) {
    const total = batchTotals.get(batch[1]) ?? 0
    return `${batch[1] === 'brain_sprint' ? 'Daily Brain Sprint' : 'Word Match'} · Batch ${Number(batch[2]) + 1}/${total}`
  }
  if (taskKey.startsWith('lesson_research-')) return `Learning Hub · ${categoryNames.get(taskKey.slice('lesson_research-'.length)) ?? 'Lesson'} · research`
  if (taskKey === 'daily_mentor') return 'Daily Mentor'
  if (taskKey === 'roleplay_missions') return 'AI role-play missions'
  if (taskKey === 'prompt_library') return 'AI Prompt Library'
  if (taskKey.startsWith('lesson-')) return `Learning Hub · ${categoryNames.get(taskKey.slice('lesson-'.length)) ?? 'Lesson'}`
  return taskKey
}

// The generate-academy-week function owns the queue; the page only sends
// commands (check, initialize, pause, resume, cancel) and reads task state.
async function invokeContentForge(body: Record<string, unknown>) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('The generation service did not respond. Please try again.')), 60_000)
  })
  const { data, error: invokeError } = await Promise.race([
    supabase.functions.invoke('generate-academy-week', { body }),
    timeout,
  ]).finally(() => { if (timeoutId) clearTimeout(timeoutId) })
  if (data?.error) throw new Error(data.error)
  if (invokeError instanceof FunctionsHttpError) {
    const responseBody = await invokeError.context.json().catch(() => null)
    throw new Error(responseBody?.error ?? invokeError.message)
  }
  if (invokeError) throw new Error(invokeError.message ?? 'The generation service could not be reached.')
  return data
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

interface TopPerformer {
  user_id: string
  display_name: string
  avatar_url: string | null
  plan_name: string
  xp: number
  daily_xp: number
  learning_xp: number
  streak: number
  completed_days: number
  last_active_day: string | null
  rank: number
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

// Paid rows stay ACTIVE in the database after ends_at; show them as expired.
function effectiveStatus(subscription: Pick<PremiumSubscription, 'status' | 'ends_at'>): SubscriptionStatus {
  return isMembershipExpired(subscription) ? 'EXPIRED' : subscription.status
}

function subscriptionStatusClass(status: SubscriptionStatus) {
  if (status === 'ACTIVE') return 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
  if (status === 'PAYMENT_REVIEW') return 'bg-orange-100 dark:bg-orange-500/15 text-orange-800 dark:text-orange-300'
  if (status === 'PENDING_APPROVAL' || status === 'PENDING_PAYMENT') return 'bg-yellow-100 dark:bg-yellow-500/15 text-yellow-800 dark:text-yellow-300'
  if (status === 'EXPIRED') return 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-300'
  if (status === 'CANCELLED') return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'
  return 'bg-primary-100 dark:bg-primary-900/60 text-primary-800 dark:text-primary-300'
}

function nextAcademyWeekStart() {
  const now = new Date()
  const days = ((8 - now.getDay()) % 7) || 7
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`
}

const WEEKLY_RUN_STALE_MS = 20 * 60 * 1000

function weeklyRunIsStale(run?: WeeklyContentRun | null) {
  return run?.status === 'GENERATING'
    && Date.now() - new Date(run.updated_at ?? run.started_at).getTime() > WEEKLY_RUN_STALE_MS
}

export function PremiumAdminDashboard() {
  usePremiumTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { language, setLanguage, currency } = useLanguage()
  const theme = useTheme(state => state.theme)
  const toggleTheme = useTheme(state => state.toggleTheme)
  const { profile, signOut } = useAuth()
  const { success, error } = useToast()
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const [reviewingSubscriptionId, setReviewingSubscriptionId] = useState<string | null>(null)
  const [rejectingRequest, setRejectingRequest] = useState<RejectingRequest | null>(null)
  const [proofPreview, setProofPreview] = useState<ProofPreview | null>(null)
  const [loadingProofId, setLoadingProofId] = useState<string | null>(null)
  const [selectedSubscription, setSelectedSubscription] = useState<PremiumSubscription | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  // Drafted approval/decline message the admin reviews and sends via WhatsApp.
  const [whatsAppDraft, setWhatsAppDraft] = useState<MemberWhatsAppDraft | null>(null)
  const [requestsModalOpen, setRequestsModalOpen] = useState(false)
  const [requestsPage, setRequestsPage] = useState(1)
  const [membersModalOpen, setMembersModalOpen] = useState(false)
  const [memberFilter, setMemberFilter] = useState<MemberFilter>('ALL')
  const [draftingReminderId, setDraftingReminderId] = useState<string | null>(null)
  const [runningAiCheckId, setRunningAiCheckId] = useState<string | null>(null)
  const [dismissingRenewalId, setDismissingRenewalId] = useState<string | null>(null)
  const {
    data: expiringMemberships = [],
    isLoading: expiringLoading,
    error: expiringError,
  } = useExpiringMemberships()
  const [editingPlan, setEditingPlan] = useState<PlanFormState | null>(null)
  const [motivationForm, setMotivationForm] = useState<MotivationFormState | null>(null)
  const [editingEvent, setEditingEvent] = useState<MemberContentFormState | null>(null)
  const [editingCommunity, setEditingCommunity] = useState<MemberContentFormState | null>(null)
  const [savingMotivation, setSavingMotivation] = useState(false)
  const [generationOpen, setGenerationOpen] = useState(false)
  // Shown while the week is being checked/initialized, before tasks exist.
  const [forgeStarting, setForgeStarting] = useState<string | null>(null)
  // Task key (or 'all' / 'cancel') whose command is in flight.
  const [forgeBusy, setForgeBusy] = useState<string | null>(null)
  const staleRecoveryRunId = useRef<string | null>(null)
  const [activeSection, setActiveSection] = useState<PremiumAdminSection>('overview')

  // Highlights the floating menu item for the section scrolled into view.
  useEffect(() => {
    const update = () => {
      let current = ADMIN_SECTION_ORDER[0]
      for (const section of ADMIN_SECTION_ORDER) {
        const el = document.getElementById(`premium-${section}`)
        if (el && el.getBoundingClientRect().top <= 140) current = section
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        current = ADMIN_SECTION_ORDER[ADMIN_SECTION_ORDER.length - 1]
      }
      setActiveSection(current)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  useEffect(() => {
    if (!profileMenuOpen) return

    function closeProfileMenu(event: MouseEvent) {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setProfileMenuOpen(false)
      }
    }

    function closeProfileMenuOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setProfileMenuOpen(false)
    }

    document.addEventListener('mousedown', closeProfileMenu)
    document.addEventListener('keydown', closeProfileMenuOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeProfileMenu)
      document.removeEventListener('keydown', closeProfileMenuOnEscape)
    }
  }, [profileMenuOpen])

  async function handleSignOut() {
    setProfileMenuOpen(false)
    await signOut()
    navigate('/')
  }

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['premium-admin', 'plans'],
    queryFn: async () => {
      const { data, error: plansError } = await supabase
        .from('premium_plans')
        .select('id,slug,name,description,price_lak,interval,features,is_active,sort_order')
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
        .select('id,user_id,plan_id,status,starts_at,ends_at,cancelled_at,downgraded_from_id,created_at,auto_renew,user:users!premium_subscriptions_user_id_fkey(id,name,email,phone,avatar_url,cover_image_url,language,created_at),plan:premium_plans(id,slug,name,description,price_lak,interval,features,is_active,sort_order)')
        .order('created_at', { ascending: false })
        // Members are listed once with their whole history, so load well past
        // the latest few rows.
        .limit(1000)
      if (subscriptionsError) throw subscriptionsError
      return (data ?? []).map(row => ({
        ...row,
        user: firstRelation(row.user),
        plan: firstRelation(row.plan),
      })) as PremiumSubscription[]
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
        .select('id,subscription_id,user_id,plan_id,amount_lak,status,receipt_image_url,rejection_reason,created_at,user:users!premium_payments_user_id_fkey(name,email,phone),plan:premium_plans(name,slug),subscription:premium_subscriptions(status,starts_at,ends_at)')
        .order('created_at', { ascending: false })
        .limit(50)
      if (paymentsError) throw paymentsError
      return (data ?? []).map(row => ({
        ...row,
        user: firstRelation(row.user),
        plan: firstRelation(row.plan),
        subscription: firstRelation(row.subscription),
      })) as PremiumPayment[]
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
        .select('id,publish_date,quote,reflection,challenge,mission,is_active')
        .order('publish_date', { ascending: false })
        .limit(14)
      if (motivationsError) throw motivationsError
      return data as DailyMotivation[]
    },
  })

  const { data: weeklyRun, isLoading: weeklyRunLoading } = useQuery({
    queryKey: ['premium-admin', 'weekly-content-run'],
    queryFn: async () => {
      const { data, error: runError } = await supabase
        .from('premium_weekly_content_runs')
        .select('id,week_start,status,content_counts,error_message,started_at,completed_at,updated_at')
        .eq('week_start', nextAcademyWeekStart())
        .maybeSingle()
      if (runError) throw runError
      return data as WeeklyContentRun | null
    },
    refetchInterval: query => query.state.data?.status === 'GENERATING' && !weeklyRunIsStale(query.state.data) ? 4000 : false,
  })

  const forgeRunActive = weeklyRun?.status === 'GENERATING' || weeklyRun?.status === 'PAUSED'

  const { data: forgeTasks } = useQuery({
    queryKey: ['premium-admin', 'weekly-content-tasks', weeklyRun?.id],
    enabled: Boolean(weeklyRun?.id),
    queryFn: async () => {
      const { data, error: tasksError } = await supabase
        .from('premium_weekly_content_tasks')
        .select('task_key,status,error_message,sort_order')
        .eq('run_id', weeklyRun!.id)
        .order('sort_order')
      if (tasksError) throw tasksError
      return data as WeeklyContentTask[]
    },
    refetchInterval: weeklyRun?.status === 'GENERATING' ? 4000 : false,
  })

  const { data: forgeCategoryNames } = useQuery({
    queryKey: ['premium-admin', 'learning-category-names'],
    enabled: Boolean(forgeTasks?.length),
    queryFn: async () => {
      const { data, error: categoriesError } = await supabase.from('premium_learning_categories').select('id,name_en')
      if (categoriesError) throw categoriesError
      return new Map((data ?? []).map(category => [category.id as string, category.name_en as string]))
    },
    staleTime: 10 * 60_000,
  })

  // Batch counts come from the queue itself, so older runs label correctly too.
  const forgeBatchTotals = new Map<string, number>()
  for (const task of forgeTasks ?? []) {
    const stream = task.task_key.match(/^(brain_sprint|word_match)-\d+$/)?.[1]
    if (stream) forgeBatchTotals.set(stream, (forgeBatchTotals.get(stream) ?? 0) + 1)
  }
  const generationSteps: GenerationStep[] = (forgeTasks ?? []).map(task => {
    const status = TASK_STATUS[task.status]
    return {
      id: task.task_key,
      label: generationStepLabel(task.task_key, forgeCategoryNames ?? new Map(), forgeBatchTotals),
      status,
      detail: task.error_message ?? (status === 'done' ? 'Saved and ready' : status === 'running' ? 'Researching and writing…' : status === 'paused' ? 'Paused · will be skipped until started' : undefined),
    }
  })
  const forgeDoneCount = generationSteps.filter(step => step.status === 'done').length

  // Announce when a run the admin was watching finishes in the background.
  const lastRunStatus = useRef<WeeklyContentRun['status'] | undefined>(undefined)
  useEffect(() => {
    const previous = lastRunStatus.current
    lastRunStatus.current = weeklyRun?.status
    if (previous !== 'GENERATING' && previous !== 'PAUSED') return
    if (weeklyRun?.status === 'READY') {
      void invalidateAdminPremium()
      success(`Next week is ready: ${Object.values(weeklyRun.content_counts ?? {}).reduce((sum, count) => sum + Number(count), 0)} content items generated.`)
    } else if (weeklyRun?.status === 'FAILED') {
      error(weeklyRun.error_message ?? 'Weekly generation failed after automatic retries.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weeklyRun?.status])

  useEffect(() => {
    if (!weeklyRun || !weeklyRunIsStale(weeklyRun) || staleRecoveryRunId.current === weeklyRun.id) return
    staleRecoveryRunId.current = weeklyRun.id
    void supabase.functions.invoke('generate-academy-week', {
      body: { action: 'cancel', runId: weeklyRun.id },
    }).finally(() => qc.invalidateQueries({ queryKey: ['premium-admin', 'weekly-content-run'] }))
  }, [weeklyRun, qc])

  const { data: memberEvents, isLoading: memberEventsLoading } = useQuery({
    queryKey: ['premium-admin', 'member-events'],
    queryFn: async () => {
      const { data, error: eventsError } = await supabase
        .from('premium_member_events')
        .select('id,title,detail,time_label,action_url,sort_order,is_active')
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
        .select('id,title,detail,action_url,sort_order,is_active')
        .order('sort_order')
      if (communitiesError) throw communitiesError
      return data as PremiumCommunity[]
    },
  })

  // Ranked from real member activity (migration 097); admins can't edit it.
  const {
    data: topPerformers,
    isLoading: topPerformersLoading,
    error: topPerformersError,
  } = useQuery({
    queryKey: ['premium-admin', 'top-performers'],
    queryFn: async () => {
      const { data, error: performersError } = await supabase.rpc('get_academy_top_performers', { p_limit: 10 })
      if (performersError) throw performersError
      return (data ?? []) as TopPerformer[]
    },
    refetchInterval: 5 * 60_000,
  })

  // Proofs still waiting for a decision. A request cancelled after its proof was
  // uploaded leaves the payment at REQUIRES_REVIEW; nothing is left to review there.
  const reviewQueue = useMemo(
    () => (payments ?? []).filter(payment => (
      payment.status === 'REQUIRES_REVIEW'
      && payment.subscription?.status !== 'CANCELLED'
      && payment.subscription?.status !== 'EXPIRED'
    )),
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
  const activeCount = (subscriptions ?? []).filter(subscription => effectiveStatus(subscription) === 'ACTIVE').length
  // AI (Qwen) checks of the uploaded proofs waiting for review.
  const reviewPaymentIds = useMemo(
    () => subscriptionRequests
      .map(subscription => paymentBySubscription.get(subscription.id))
      .filter((payment): payment is PremiumPayment => !!payment?.receipt_image_url && payment.status === 'REQUIRES_REVIEW')
      .map(payment => payment.id),
    [subscriptionRequests, paymentBySubscription],
  )
  const { data: paymentAiReviews } = usePaymentAiReviews(reviewPaymentIds)
  const reviewCount = reviewQueue.length
  const monthlyRevenueLak = (payments ?? [])
    .filter(payment => payment.status === 'VERIFIED')
    .reduce((sum, payment) => sum + Number(payment.amount_lak || 0), 0)
  const todayMotivation = motivations?.[0] ?? null
  // The mentor post members get today, for the WhatsApp daily reminder.
  const todayMentor = (motivations ?? []).find(motivation => motivation.is_active && motivation.publish_date === laosToday()) ?? null
  // Members with an open request are already listed under Requests to review.
  const memberRows = useMemo(
    () => groupMembers(subscriptions ?? []).filter(member => memberGroup(member.current) !== 'PENDING'),
    [subscriptions],
  )
  const memberGroupCounts = useMemo(() => {
    const counts: Record<MemberFilter, number> = { ALL: memberRows.length, PREMIUM: 0, FREE: 0 }
    for (const member of memberRows) {
      const group = memberGroup(member.current)
      if (group === 'PREMIUM' || group === 'FREE') counts[group] += 1
    }
    return counts
  }, [memberRows])
  const filteredMemberRows = memberFilter === 'ALL'
    ? memberRows
    : memberRows.filter(member => memberGroup(member.current) === memberFilter)
  const memberCount = filteredMemberRows.length
  const requestPageCount = Math.max(1, Math.ceil(subscriptionRequests.length / REQUESTS_PAGE_SIZE))
  const currentRequestsPage = Math.min(requestsPage, requestPageCount)
  const navItems: Array<{
    id: PremiumAdminSection
    label: string
    icon: LucideIcon
    badge?: number
  }> = [
    { id: 'overview', label: 'Overview', icon: Sparkles },
    { id: 'forge', label: 'Weekly Content', icon: WandSparkles },
    { id: 'renewals', label: 'Renewals', icon: BellRing, badge: expiringMemberships.length },
    { id: 'members', label: 'Members', icon: Users, badge: subscriptionRequests.length },
    { id: 'mentor', label: 'Daily Mentor', icon: MessageSquareText },
    { id: 'content', label: 'Member Content', icon: Flame },
    { id: 'plans', label: 'Plans', icon: Crown },
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
      qc.invalidateQueries({ queryKey: ['premium-admin', 'renewals'] }),
      qc.invalidateQueries({ queryKey: ['premium-admin', 'payments'] }),
      qc.invalidateQueries({ queryKey: ['premium-admin', 'plans'] }),
      qc.invalidateQueries({ queryKey: ['premium-admin', 'motivations'] }),
      qc.invalidateQueries({ queryKey: ['premium-admin', 'member-events'] }),
      qc.invalidateQueries({ queryKey: ['premium-admin', 'communities'] }),
      qc.invalidateQueries({ queryKey: ['premium-admin', 'top-performers'] }),
      qc.invalidateQueries({ queryKey: ['premium-admin', 'weekly-content-run'] }),
    ])
  }

  async function refreshForge() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['premium-admin', 'weekly-content-run'] }),
      qc.invalidateQueries({ queryKey: ['premium-admin', 'weekly-content-tasks'] }),
    ])
  }

  async function generateNextAcademyWeek() {
    setGenerationOpen(true)
    setForgeStarting('Checking next week’s existing content')
    try {
      const existing = await invokeContentForge({ action: 'check' })
      if (existing.exists) {
        success(`Content for the week beginning ${existing.weekStart} already exists. Nothing was generated.`)
        return
      }
      setForgeStarting('Preparing next week')
      // The backend queues every step and runs them one at a time in order;
      // it keeps going if this window is minimized or the page is closed.
      await invokeContentForge({ action: 'initialize' })
    } catch (err) {
      console.error(err)
      error(err instanceof Error ? err.message : 'Could not generate next week’s Academy content.')
    } finally {
      setForgeStarting(null)
      await refreshForge()
    }
  }

  async function controlForge(action: 'pause' | 'resume' | 'cancel', taskKey?: string) {
    if (!weeklyRun) return
    setForgeBusy(taskKey ?? (action === 'cancel' ? 'cancel' : 'all'))
    try {
      await invokeContentForge({ action, runId: weeklyRun.id, ...(taskKey ? { taskKey } : {}) })
    } catch (err) {
      error(err instanceof Error ? err.message : 'Could not update content generation.')
    } finally {
      await refreshForge()
      setForgeBusy(null)
    }
  }

  // Draft the member's WhatsApp message. Sending is manual: the admin checks
  // the draft, then opens WhatsApp with it filled in. Never undoes the review.
  async function draftMemberWhatsApp(subscriptionId: string) {
    try {
      const { data, error: draftError } = await supabase.functions.invoke('notify-member-whatsapp', {
        body: { subscription_id: subscriptionId },
      })
      if (draftError) throw draftError
      if (data?.error) throw new Error(data.error)
      setWhatsAppDraft(data as MemberWhatsAppDraft)
    } catch (err) {
      console.error(err)
      error('The review was saved, but the WhatsApp message could not be drafted.')
    }
  }

  // Take a member off the Renewals list once they were reminded and chose to stay on Free.
  async function dismissRenewal(membership: ExpiringMembership) {
    setDismissingRenewalId(membership.id)
    try {
      const { error: dismissError } = await supabase
        .from('premium_subscriptions')
        .update({ admin_renewal_dismissed_at: new Date().toISOString() })
        .eq('id', membership.id)
      if (dismissError) throw dismissError
      await qc.invalidateQueries({ queryKey: ['premium-admin', 'renewals'] })
      success(language === 'lo' ? `ເອົາ ${membership.memberName} ອອກຈາກລາຍການຕໍ່ອາຍຸແລ້ວ.` : `${membership.memberName} removed from Renewals.`)
    } catch (err) {
      console.error(err)
      error(language === 'lo' ? 'ບໍ່ສາມາດປິດລາຍການນີ້ໄດ້.' : 'Could not dismiss this renewal.')
    } finally {
      setDismissingRenewalId(null)
    }
  }

  // (Re-)run the AI check of a payment proof; it only advises, the admin decides.
  async function runPaymentAiCheck(paymentId: string) {
    setRunningAiCheckId(paymentId)
    try {
      const { data, error: checkError } = await supabase.functions.invoke('review-academy-payment', {
        body: { payment_id: paymentId, force: true },
      })
      if (checkError) throw checkError
      if (data?.error) throw new Error(data.error)
    } catch (err) {
      console.error(err)
      error(err instanceof Error ? `AI check failed: ${err.message}` : 'AI check failed.')
    } finally {
      setRunningAiCheckId(null)
      await qc.invalidateQueries({ queryKey: ['premium-admin', 'payment-ai-reviews'] })
    }
  }

  // Draft the "membership ending / expired" reminder; the admin sends it from WhatsApp.
  async function draftExpiryReminder(membership: ExpiringMembership) {
    setDraftingReminderId(membership.id)
    try {
      const { data, error: draftError } = await supabase.functions.invoke('notify-member-whatsapp', {
        body: { subscription_id: membership.id, kind: 'expiry' },
      })
      if (draftError) throw draftError
      if (data?.error) throw new Error(data.error)
      const draft = data as MemberWhatsAppDraft
      // An outdated notify-member-whatsapp deployment ignores `kind` and drafts
      // the approval message instead; never show that as a reminder.
      if (draft.outcome !== 'EXPIRING' && draft.outcome !== 'EXPIRED') {
        throw new Error(`Expected an expiry reminder but got a ${draft.outcome} draft. Redeploy notify-member-whatsapp.`)
      }
      setWhatsAppDraft(draft)
    } catch (err) {
      console.error(err)
      error('The reminder message could not be drafted. Please try again.')
    } finally {
      setDraftingReminderId(null)
    }
  }

  // Opening WhatsApp is as far as the app can go; record it as sent so the
  // Renewals list shows who has been reminded.
  async function markWhatsAppDraftSent(draft: MemberWhatsAppDraft) {
    if (!draft.notificationId) return
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ status: 'SENT', sent_at: new Date().toISOString(), recipient: whatsAppDigits(draft.recipient ?? ''), message: draft.message })
      .eq('id', draft.notificationId)
    if (updateError) console.error(updateError)
    await qc.invalidateQueries({ queryKey: ['premium-admin', 'renewals'] })
  }

  // Onboarding WhatsApp number first, then the account phone.
  function memberWhatsAppNumber(subscription: PremiumSubscription) {
    return onboardingByUser.get(subscription.user_id)?.whatsapp_number || subscription.user?.phone || null
  }

  // Drafted on the page (nothing to log): payment nudge, daily reminder, or a blank chat.
  function openMemberWhatsApp(subscription: PremiumSubscription, outcome: 'PAYMENT_REMINDER' | 'DAILY_REMINDER' | 'DIRECT') {
    setWhatsAppDraft({
      outcome,
      memberName: subscription.user?.name ?? 'Unknown user',
      recipient: memberWhatsAppNumber(subscription),
      message: outcome === 'PAYMENT_REMINDER'
        ? paymentReminderMessage(subscription)
        : outcome === 'DAILY_REMINDER' ? dailyReminderMessage(subscription, todayMentor) : '',
    })
  }

  // What the row's WhatsApp button drafts for this member's current status.
  function memberWhatsAppAction(subscription: PremiumSubscription) {
    const status = effectiveStatus(subscription)
    if (status === 'PENDING_PAYMENT') return 'PAYMENT_REMINDER' as const
    if (status === 'ACTIVE') return 'DAILY_REMINDER' as const
    return 'DIRECT' as const
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
      void draftMemberWhatsApp(subscriptionId)
    } catch (err) {
      console.error(err)
      error('Could not approve this subscription.')
    } finally {
      setReviewingSubscriptionId(null)
    }
  }

  async function rejectSubscription() {
    if (!rejectingRequest) return
    const subscriptionId = rejectingRequest.subscriptionId
    setReviewingSubscriptionId(subscriptionId)
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
      void draftMemberWhatsApp(subscriptionId)
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

    setLoadingProofId(payment.id)
    try {
      const { data, error: signedUrlError } = await supabase.storage
        .from('premium-payment-proofs')
        .createSignedUrl(payment.receipt_image_url, 60)

      if (signedUrlError) throw signedUrlError
      setProofPreview({
        url: data.signedUrl,
        userName: payment.user?.name ?? 'Unknown user',
        planName: payment.plan?.name ?? 'Premium',
        amountLak: payment.amount_lak,
        createdAt: payment.created_at,
      })
    } catch (err) {
      console.error(err)
      error('Could not open payment proof.')
    } finally {
      setLoadingProofId(null)
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

  function renderRequestCard(subscription: PremiumSubscription) {
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
        className="cursor-pointer rounded-2xl border border-orange-200 dark:border-orange-500/30 bg-orange-50/60 dark:bg-orange-500/10 p-4 transition hover:border-orange-300 dark:hover:border-orange-500/40 hover:bg-orange-50 dark:hover:bg-orange-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <MemberAvatar
                name={subscription.user?.name}
                avatarUrl={subscription.user?.avatar_url}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-gray-950 dark:text-gray-100">{subscription.user?.name ?? 'Unknown user'}</p>
                <p className="mt-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Requested {formatDate(subscription.created_at, language)}
                </p>
              </div>
            </div>
            {/* The request status says where the payment stands; the plan fills the second slot. */}
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold', subscriptionStatusClass(effectiveStatus(subscription)))}>
                {statusLabel(effectiveStatus(subscription))}
              </span>
              <PlanTierBadge subscription={subscription} />
              {!isFreeRequest && subscription.plan?.interval && (
                <span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                  {planIntervalLabel(subscription.plan.interval)}
                </span>
              )}
            </div>
          </div>

          {payment?.receipt_image_url && !isFreeRequest && payment.status === 'REQUIRES_REVIEW' && (
            <PaymentAiReviewCard
              review={paymentAiReviews?.get(payment.id)}
              receiptRef={payment.receipt_image_url}
              memberLanguage={subscription.user?.language === 'en' ? 'en' : 'lo'}
              running={runningAiCheckId === payment.id}
              onRun={() => void runPaymentAiCheck(payment.id)}
              onDeclineWithReason={reason => {
                setRejectingRequest({
                  subscriptionId: subscription.id,
                  userName: subscription.user?.name ?? 'Unknown user',
                })
                setRejectReason(reason)
              }}
            />
          )}

          <div className="border-t border-orange-200 dark:border-orange-500/30 pt-3">
            {payment?.receipt_image_url ? (
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  loading={loadingProofId === payment.id}
                  icon={<Eye className="h-4 w-4" />}
                  onClick={event => {
                    event.stopPropagation()
                    void viewProof(payment)
                  }}
                >
                  Proof
                </Button>
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
                    // Start from the AI's drafted reason when it has one; the admin can edit it.
                    const aiReview = paymentAiReviews?.get(payment.id)
                    const isCurrentProof = aiReview?.receipt_ref === payment.receipt_image_url
                    setRejectReason(isCurrentProof
                      ? draftedDeclineReason(aiReview, subscription.user?.language === 'en' ? 'en' : 'lo')
                      : '')
                  }}
                >
                  Reject
                </Button>
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
                ) : <span />}
              </div>
            ) : isFreeRequest ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-primary-700 dark:text-primary-300">Free plan · No payment required</span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    icon={<XCircle className="h-4 w-4" />}
                    onClick={event => {
                      event.stopPropagation()
                      setRejectingRequest({ subscriptionId: subscription.id, userName: subscription.user?.name ?? 'Unknown user' })
                      setRejectReason('')
                    }}
                  >
                    Reject
                  </Button>
                  {readyForReview && (
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
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">Waiting for payment proof</span>
                <button
                  type="button"
                  onClick={event => {
                    event.stopPropagation()
                    openMemberWhatsApp(subscription, 'PAYMENT_REMINDER')
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#25D366] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#1ebe5a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/50"
                >
                  <WhatsAppIcon className="h-4 w-4" /> Remind to pay
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const loading = plansLoading || subscriptionsLoading || paymentsLoading || onboardingResponsesLoading || motivationsLoading || weeklyRunLoading || memberEventsLoading || communitiesLoading
  const selectedOnboarding = selectedSubscription
    ? onboardingByUser.get(selectedSubscription.user_id)
    : undefined
  const selectedResponses = selectedOnboarding?.responses ?? {}

  return (
    <div className="premium-i18n min-h-screen overflow-x-clip bg-slate-50 dark:bg-gray-950 text-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-primary-900/95 text-white shadow-lg shadow-primary-950/20 backdrop-blur supports-[backdrop-filter]:bg-primary-900/85">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <PwenLogoLockup
              textClassName="text-white"
              subTextClassName="text-primary-200"
              markClassName="rounded-xl bg-white/10 p-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-primary-100 transition-colors hover:bg-white/15 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 dark:text-amber-300"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <div ref={profileMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen(open => !open)}
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
                aria-label="Open admin profile menu"
                className="flex items-center gap-2 rounded-full bg-white/10 p-1.5 pr-3 text-white transition-colors hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-amber-400 font-black text-primary-950 ring-2 ring-white/20">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    profile?.name?.charAt(0).toUpperCase() ?? 'A'
                  )}
                </span>
                <span className="hidden max-w-32 truncate text-sm font-bold sm:block">{profile?.name ?? 'Admin'}</span>
                <ChevronDown className={cn('h-4 w-4 transition-transform', profileMenuOpen && 'rotate-180')} />
              </button>

              {profileMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-900 p-2 text-slate-900 dark:text-slate-100 shadow-2xl"
                >
                  <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 px-3 py-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-amber-100 dark:bg-amber-500/15 font-black text-amber-800 dark:text-amber-300">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        profile?.name?.charAt(0).toUpperCase() ?? 'A'
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black">{profile?.name ?? 'Admin'}</span>
                      <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{profile?.email ?? profile?.role}</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { setProfileMenuOpen(false); setProfileSettingsOpen(true) }}
                    className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Settings className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    Profile settings
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => navigate('/admin')}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Store className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    Switch to Bookstore Admin
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => setLanguage(language === 'lo' ? 'en' : 'lo')}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Languages className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    <span className="flex-1">Language</span>
                    <span className="text-xs font-black text-primary-700 dark:text-primary-300">{language === 'lo' ? 'ລາວ' : 'English'}</span>
                  </button>
                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="border-b border-primary-800 bg-primary-900 text-white">
        <div className="mx-auto max-w-7xl px-4 pb-8 pt-4">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-primary-100">
                <Crown className="h-3.5 w-3.5 text-amber-300" />
                Academy Admin
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-normal md:text-5xl">Academy Dashboard</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-primary-100">
                Manage Bitdoin Premium plans, subscriptions, payment review, and daily mentor content separately from bookstore operations.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                icon={<GraduationCap className="h-4 w-4" />}
                onClick={() => navigate('/academy-admin/learning')}
                className="bg-white/10 text-white hover:bg-white/15"
              >
                Learning Content
              </Button>
              <Button
                type="button"
                icon={<MessageSquareText className="h-4 w-4" />}
                onClick={() => openMotivationEditor(todayMotivation)}
                className="bg-white dark:bg-gray-900 text-primary-900 dark:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/40"
              >
                Edit Daily Mentor
              </Button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <main className="mx-auto max-w-7xl px-4 py-6 pb-28">

          <div className="min-w-0 space-y-6">
          <section id="premium-overview" className="grid scroll-mt-24 grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            <Stat label="Active members" value={activeCount} icon={<Users className="h-5 w-5" />} color="blue" />
            <Stat label="Payment review" value={reviewCount} icon={<ReceiptText className="h-5 w-5" />} color="amber" />
            <Stat label="Verified revenue" value={formatPrice(monthlyRevenueLak, currency)} icon={<Crown className="h-5 w-5" />} color="green" />
            <Stat label="Daily posts" value={motivations?.length ?? 0} icon={<CalendarCheck className="h-5 w-5" />} color="purple" />
          </section>

          <WeeklyContentForge run={weeklyRun} generating={!!forgeStarting} onGenerate={generateNextAcademyWeek} onOpenProgress={() => setGenerationOpen(true)} />

          <ExpiringMembersPanel
            memberships={expiringMemberships}
            loading={expiringLoading}
            failed={!!expiringError}
            draftingId={draftingReminderId}
            dismissingId={dismissingRenewalId}
            onSendReminder={membership => void draftExpiryReminder(membership)}
            onDismiss={membership => void dismissRenewal(membership)}
          />

          {(subscriptionsQueryError || paymentsQueryError || onboardingResponsesQueryError) && (
            <div role="alert" className="rounded-2xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-4">
              <p className="text-sm font-black text-red-900 dark:text-red-300">Could not load subscription requests</p>
              <p className="mt-1 text-xs leading-5 text-red-700 dark:text-red-300">
                Refresh this page. If the problem continues, verify the Premium migrations and your Admin role.
              </p>
            </div>
          )}

          <section id="premium-members" className="grid scroll-mt-24 grid-cols-1 items-start gap-6 xl:grid-cols-2">
             <Panel
               title="Requests to review"
               eyebrow="Members"
               action={`${subscriptionRequests.length} awaiting action`}
               icon={<ReceiptText className="h-5 w-5" />}
             >
                 <div>
                   <p className="-mt-2 mb-4 text-xs text-gray-500 dark:text-gray-400">Approve only after checking the uploaded payment proof.</p>

                   {subscriptionRequests.length > 0 ? (
                     <div className="space-y-3">
                       {subscriptionRequests.slice(0, REQUESTS_PREVIEW).map(renderRequestCard)}
                       {subscriptionRequests.length > REQUESTS_PREVIEW && (
                         <button
                           type="button"
                           onClick={() => { setRequestsPage(1); setRequestsModalOpen(true) }}
                           className="w-full rounded-2xl border border-orange-200 dark:border-orange-500/30 py-2.5 text-sm font-bold text-orange-800 dark:text-orange-300 transition hover:bg-orange-50 dark:hover:bg-orange-500/10"
                         >
                           View more ({subscriptionRequests.length - REQUESTS_PREVIEW} more)
                         </button>
                       )}
                     </div>
                   ) : (
                     <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 py-6">
                       <EmptyMessage icon={<ShieldCheck className="h-8 w-8" />} title="No subscription requests" detail="New paid requests and uploaded proofs will appear here." />
                     </div>
                   )}
                 </div>
             </Panel>

             <Panel
               title="All Subscribers"
               eyebrow="Members"
               action={`${memberRows.length} members`}
               icon={<Users className="h-5 w-5" />}
             >
                 <div>
                   <MemberFilterChips value={memberFilter} counts={memberGroupCounts} onChange={setMemberFilter} />
                   <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800">
                     {filteredMemberRows.length > 0 ? (
                       <MemberSubscriptionList
                         members={filteredMemberRows}
                         limit={MEMBERS_PREVIEW}
                         onOpenProfile={setSelectedSubscription}
                         whatsAppNumber={memberWhatsAppNumber}
                         onWhatsApp={subscription => openMemberWhatsApp(subscription, memberWhatsAppAction(subscription))}
                       />
                     ) : memberRows.length > 0 ? (
                       <EmptyMessage icon={<Users className="h-8 w-8" />} title="No members in this group" detail="Choose another filter to see more members." />
                     ) : (
                       <EmptyMessage icon={<Users className="h-8 w-8" />} title="No subscriptions yet" detail="Premium subscriptions will appear here once users start a plan." />
                     )}
                   </div>
                   {memberCount > MEMBERS_PREVIEW && (
                     <button
                       type="button"
                       onClick={() => setMembersModalOpen(true)}
                       className="mt-3 w-full rounded-2xl border border-gray-200 dark:border-gray-700 py-2.5 text-sm font-bold text-primary-700 dark:text-primary-300 transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
                     >
                       View more ({memberCount - MEMBERS_PREVIEW} more members)
                     </button>
                   )}
                 </div>
             </Panel>
          </section>

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

          <section id="premium-content" className="scroll-mt-24 grid grid-cols-1 gap-6 xl:grid-cols-3">
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
            <TopPerformersPanel performers={topPerformers ?? []} loading={topPerformersLoading} failed={!!topPerformersError} />
          </section>

          <Panel
              id="premium-plans"
              title="Plans"
              eyebrow="Pricing"
              action={`${plans?.length ?? 0} plans`}
              icon={<Crown className="h-5 w-5" />}
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {(plans ?? []).map(plan => (
                  <div key={plan.id} className="rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          {plan.price_lak > 0 ? <Crown className="h-4 w-4 text-amber-500" /> : <ShieldCheck className="h-4 w-4 text-primary-600 dark:text-primary-400" />}
                          <p className="text-sm font-black text-gray-950 dark:text-gray-100">{plan.name}</p>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">{plan.description}</p>
                        <p className="mt-3 text-lg font-black text-gray-950 dark:text-gray-100">{formatPrice(plan.price_lak, currency)} <span className="text-xs font-semibold text-gray-400">/{plan.interval}</span></p>
                      </div>
                      <Button type="button" size="sm" variant="outline" icon={<Edit3 className="h-4 w-4" />} onClick={() => openPlanEditor(plan)}>
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </main>
      )}

      {!loading && (
        <FloatingOrbitMenu
          menuLabel={premiumText(language, 'Admin Menu')}
          openLabel={language === 'lo' ? 'ເປີດເມນູ' : 'Open menu'}
          closeLabel={language === 'lo' ? 'ປິດເມນູ' : 'Close menu'}
          items={navItems.map(item => ({
            key: item.id,
            label: premiumText(language, item.label),
            icon: item.icon,
            onClick: () => scrollToSection(item.id),
            active: activeSection === item.id,
            badge: item.badge,
          }))}
        />
      )}

      {/* Closing never stops generation: the backend keeps running the queue
          and the floating progress pill below takes over. */}
      <Modal
        open={generationOpen}
        onClose={() => setGenerationOpen(false)}
        title="Academy Content Forge"
        size="lg"
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            {forgeRunActive || forgeStarting ? (
              <Button type="button" variant="ghost" onClick={() => setGenerationOpen(false)}>
                <Minimize2 className="mr-2 h-4 w-4" /> Minimize
              </Button>
            ) : <span />}
            <div className="flex flex-wrap justify-end gap-2">
              {weeklyRun?.status === 'GENERATING' && (
                <Button type="button" variant="outline" onClick={() => void controlForge('pause')} loading={forgeBusy === 'all'} disabled={!!forgeBusy}>
                  <Pause className="mr-2 h-4 w-4" /> Pause all
                </Button>
              )}
              {weeklyRun?.status === 'PAUSED' && (
                <Button type="button" onClick={() => void controlForge('resume')} loading={forgeBusy === 'all'} disabled={!!forgeBusy}>
                  <Play className="mr-2 h-4 w-4" /> Start all
                </Button>
              )}
              {forgeRunActive && (
                <Button type="button" variant="danger" onClick={() => void controlForge('cancel')} loading={forgeBusy === 'cancel'} disabled={!!forgeBusy}>
                  Cancel generation
                </Button>
              )}
              {!forgeRunActive && !forgeStarting && weeklyRun && weeklyRun.status !== 'READY' && generationSteps.some(step => step.status === 'failed' || step.status === 'cancelled') && (
                <Button type="button" onClick={() => void generateNextAcademyWeek()}>
                  <Sparkles className="mr-2 h-4 w-4" /> Continue generation
                </Button>
              )}
              {!forgeRunActive && !forgeStarting && (
                <Button type="button" variant="outline" onClick={() => setGenerationOpen(false)}>Close</Button>
              )}
            </div>
          </div>
        }
      >
        <div className="overflow-hidden rounded-3xl bg-[#110b24] p-5 text-white">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 via-fuchsia-500 to-violet-700 text-[#160b2d]">
              <WandSparkles className={cn('h-5 w-5', (weeklyRun?.status === 'GENERATING' || forgeStarting) && 'motion-safe:animate-pulse')} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-black">
                {forgeStarting ? 'Getting ready'
                  : weeklyRun?.status === 'GENERATING' ? 'Creating next week'
                  : weeklyRun?.status === 'PAUSED' ? 'Generation paused'
                  : weeklyRun?.status === 'READY' ? 'Next week is ready'
                  : weeklyRun?.status === 'CANCELLED' ? 'Generation stopped'
                  : 'Generation finished'}
              </p>
              <p className="mt-0.5 text-xs text-violet-200/70">One step at a time, in order. Each completed step is saved immediately.</p>
            </div>
            {generationSteps.length > 0 && (
              <span className="shrink-0 text-xs font-black text-violet-200">{forgeDoneCount}/{generationSteps.length}</span>
            )}
          </div>

          <div className="mt-4 max-h-[52vh] space-y-1 overflow-y-auto pr-1">
            {forgeStarting ? (
              <div className="grid grid-cols-[28px_1fr] items-center gap-3 rounded-xl px-2 py-3">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-amber-300 text-amber-950"><Sparkles className="h-4 w-4 motion-safe:animate-spin" /></span>
                <p className="text-sm font-bold">{forgeStarting}</p>
              </div>
            ) : generationSteps.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-violet-300">No generation steps yet.</p>
            ) : generationSteps.map((step, index) => {
              const canPause = forgeRunActive && step.status === 'queued'
              const canStart = weeklyRun?.status !== 'READY' && (step.status === 'paused' || step.status === 'failed' || step.status === 'cancelled')
              return (
                <div key={step.id} className="grid grid-cols-[28px_1fr_auto_auto] items-center gap-3 rounded-xl px-2 py-3">
                  <span className={cn(
                    'grid h-7 w-7 place-items-center rounded-full text-xs font-black',
                    step.status === 'done' && 'bg-emerald-400 text-emerald-950',
                    step.status === 'running' && 'bg-amber-300 text-amber-950',
                    step.status === 'failed' && 'bg-red-400 text-red-950',
                    step.status === 'paused' && 'bg-sky-300/20 text-sky-200',
                    step.status === 'cancelled' && 'bg-white/10 text-violet-300',
                    step.status === 'queued' && 'border border-white/15 text-violet-300',
                  )}>
                    {step.status === 'done' ? <CheckCircle2 className="h-4 w-4" />
                      : step.status === 'running' ? <Sparkles className="h-4 w-4 motion-safe:animate-spin" />
                      : step.status === 'failed' ? <XCircle className="h-4 w-4" />
                      : step.status === 'paused' ? <Pause className="h-3.5 w-3.5" />
                      : index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className={cn('truncate text-sm font-bold', (step.status === 'queued' || step.status === 'cancelled' || step.status === 'paused') && 'text-violet-300')}>{step.label}</p>
                    {step.detail && <p className={cn('mt-0.5 truncate text-xs', step.status === 'failed' ? 'text-red-300' : 'text-violet-300/65')}>{step.detail}</p>}
                  </div>
                  <span className={cn(
                    'text-[10px] font-black uppercase tracking-wider',
                    step.status === 'done' ? 'text-emerald-300' : step.status === 'running' ? 'text-amber-300' : step.status === 'failed' ? 'text-red-300' : step.status === 'paused' ? 'text-sky-300' : 'text-violet-400',
                  )}>{step.status}</span>
                  <span className="flex w-[74px] justify-end">
                    {canPause && (
                      <ForgeStepButton label="Pause" icon={<Pause className="h-3.5 w-3.5" />} busy={forgeBusy === step.id} disabled={!!forgeBusy} onClick={() => void controlForge('pause', step.id)} />
                    )}
                    {canStart && (
                      <ForgeStepButton label={step.status === 'paused' ? 'Start' : 'Retry'} icon={<Play className="h-3.5 w-3.5" />} busy={forgeBusy === step.id} disabled={!!forgeBusy} onClick={() => void controlForge('resume', step.id)} primary />
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </Modal>

      {/* Minimized forge: keeps progress visible while the queue runs. */}
      {!generationOpen && (forgeRunActive || forgeStarting) && (
        <button
          type="button"
          onClick={() => setGenerationOpen(true)}
          className="fixed bottom-5 right-[5.25rem] z-40 flex w-[min(20rem,calc(100vw-6.5rem))] items-center gap-3 rounded-2xl border border-white/10 bg-[#110b24] p-3 text-left text-white shadow-[0_18px_50px_-12px_rgba(67,33,132,0.7)] transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          aria-label="Open Academy Content Forge progress"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-300 via-fuchsia-500 to-violet-700 text-[#160b2d]">
            {weeklyRun?.status === 'PAUSED' ? <Pause className="h-4 w-4" /> : <WandSparkles className="h-4 w-4 motion-safe:animate-pulse" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between gap-2 text-xs font-black">
              <span className="truncate">{forgeStarting ? 'Getting ready…' : weeklyRun?.status === 'PAUSED' ? 'Generation paused' : 'Creating next week'}</span>
              {generationSteps.length > 0 && <span className="shrink-0 text-violet-200">{forgeDoneCount}/{generationSteps.length}</span>}
            </span>
            <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-white/10">
              <span
                className="block h-full rounded-full bg-gradient-to-r from-amber-300 to-fuchsia-500 transition-[width] duration-500"
                style={{ width: `${generationSteps.length ? Math.round((forgeDoneCount / generationSteps.length) * 100) : 5}%` }}
              />
            </span>
            <span className="mt-1.5 block truncate text-[11px] text-violet-200/70">
              {generationSteps.find(step => step.status === 'running')?.label ?? 'Tap to view steps'}
            </span>
          </span>
          <Maximize2 className="h-4 w-4 shrink-0 text-violet-200" />
        </button>
      )}

      <Modal
        open={requestsModalOpen}
        onClose={() => setRequestsModalOpen(false)}
        title={`Requests to review (${subscriptionRequests.length})`}
        size="xl"
        footer={<Button type="button" variant="outline" onClick={() => setRequestsModalOpen(false)}>Close</Button>}
      >
        <div className="space-y-3">
          {subscriptionRequests
            .slice((currentRequestsPage - 1) * REQUESTS_PAGE_SIZE, currentRequestsPage * REQUESTS_PAGE_SIZE)
            .map(renderRequestCard)}
        </div>
        {requestPageCount > 1 && (
          <Pagination page={currentRequestsPage} pageCount={requestPageCount} onChange={setRequestsPage} />
        )}
      </Modal>

      <Modal
        open={membersModalOpen}
        onClose={() => setMembersModalOpen(false)}
        title={`All Subscribers (${memberCount} members)`}
        size="xl"
        footer={<Button type="button" variant="outline" onClick={() => setMembersModalOpen(false)}>Close</Button>}
      >
        <MemberFilterChips value={memberFilter} counts={memberGroupCounts} onChange={setMemberFilter} />
        <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800">
          <MemberSubscriptionList
            // Start again from page 1 when the filter changes.
            key={memberFilter}
            members={filteredMemberRows}
            pageSize={MEMBERS_PAGE_SIZE}
            onOpenProfile={setSelectedSubscription}
            whatsAppNumber={memberWhatsAppNumber}
            onWhatsApp={subscription => openMemberWhatsApp(subscription, memberWhatsAppAction(subscription))}
          />
        </div>
      </Modal>

      <Modal
        open={!!whatsAppDraft}
        onClose={() => setWhatsAppDraft(null)}
        title={whatsAppDraft ? WHATSAPP_DRAFT_TITLES[whatsAppDraft.outcome] : ''}
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setWhatsAppDraft(null)}>Skip</Button>
            <a
              href={whatsAppDraft && whatsAppDigits(whatsAppDraft.recipient ?? '').length >= 10
                ? `https://wa.me/${whatsAppDigits(whatsAppDraft.recipient ?? '')}?text=${encodeURIComponent(whatsAppDraft.message)}`
                : undefined}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!whatsAppDraft || whatsAppDigits(whatsAppDraft.recipient ?? '').length < 10}
              onClick={event => {
                if (!whatsAppDraft || whatsAppDigits(whatsAppDraft.recipient ?? '').length < 10) {
                  event.preventDefault()
                  return
                }
                void markWhatsAppDraftSent(whatsAppDraft)
                setWhatsAppDraft(null)
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1ebe5a] aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
            >
              <MessageSquareText className="h-4 w-4" /> Open WhatsApp
            </a>
          </div>
        }
      >
        {whatsAppDraft && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Check the drafted message, edit it if needed, then open WhatsApp and press Send.
            </p>
            <label className="block">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">WhatsApp number · {whatsAppDraft.memberName}</span>
              <input
                value={whatsAppDraft.recipient ?? ''}
                onChange={event => setWhatsAppDraft({ ...whatsAppDraft, recipient: event.target.value })}
                placeholder="020 XXXX XXXX"
                inputMode="tel"
                className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none"
              />
              {!whatsAppDraft.recipient && (
                <span className="mt-1 block text-xs font-semibold text-amber-700 dark:text-amber-300">No WhatsApp number on file. Type the member's number to continue.</span>
              )}
            </label>
            <label className="block">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Message</span>
              <textarea
                value={whatsAppDraft.message}
                onChange={event => setWhatsAppDraft({ ...whatsAppDraft, message: event.target.value })}
                rows={9}
                className="mt-1 w-full resize-y rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm leading-6 focus:border-primary-500 focus:outline-none"
              />
            </label>
          </div>
        )}
      </Modal>

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
              <div className="absolute left-4 top-14 z-20 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-white dark:border-gray-800 bg-primary-100 dark:bg-primary-900/60 text-2xl font-black text-primary-800 dark:text-primary-300 shadow-lg">
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
              <MemberDetail label="Status" value={statusLabel(effectiveStatus(selectedSubscription))} />
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
              <div className="grid gap-1 py-2.5 sm:grid-cols-[150px_1fr] sm:gap-4">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400">WhatsApp</p>
                {selectedOnboarding?.whatsapp_number ? (
                  <a
                    href={whatsAppLink(selectedOnboarding.whatsapp_number) ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    title="Chat on WhatsApp"
                    className="inline-flex w-fit items-center gap-2 break-all text-sm font-semibold text-gray-900 hover:text-[#25D366] dark:text-gray-100"
                  >
                    {selectedOnboarding.whatsapp_number}
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white">
                      <WhatsAppIcon className="h-4 w-4" />
                    </span>
                  </a>
                ) : (
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Not provided</p>
                )}
              </div>
              <MemberDetail
                label="Reminder"
                value={selectedOnboarding?.daily_reminder_enabled ? selectedOnboarding.daily_reminder_time : 'Disabled'}
              />
              {memberWhatsAppAction(selectedSubscription) !== 'DIRECT' && (
                <div className="py-3">
                  <button
                    type="button"
                    onClick={() => {
                      const subscription = selectedSubscription
                      setSelectedSubscription(null)
                      openMemberWhatsApp(subscription, memberWhatsAppAction(subscription))
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#1ebe5a]"
                  >
                    <WhatsAppIcon className="h-4 w-4" />
                    {memberWhatsAppAction(selectedSubscription) === 'PAYMENT_REMINDER' ? 'Remind to pay' : 'Send daily reminder'}
                  </button>
                </div>
              )}
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
        open={!!proofPreview}
        onClose={() => setProofPreview(null)}
        title={language === 'lo' ? 'ຫຼັກຖານການຊຳລະ' : 'Payment Proof'}
        size="xl"
        footer={<Button type="button" onClick={() => setProofPreview(null)}>{language === 'lo' ? 'ປິດ' : 'Close'}</Button>}
      >
        {proofPreview && (
          <div>
            <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-2 rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-4 text-sm ring-1 ring-slate-100 dark:ring-slate-800">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{language === 'lo' ? 'ຜູ້ສະໝັກສະມາຊິກ' : 'Subscriber'}</p>
                <p className="mt-0.5 truncate font-black text-slate-950 dark:text-slate-100">{proofPreview.userName}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{language === 'lo' ? 'ຈຳນວນເງິນ' : 'Amount'}</p>
                <p className="mt-0.5 font-black text-slate-950 dark:text-slate-100">{formatPrice(proofPreview.amountLak, currency)}</p>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{language === 'lo' ? 'ແຜນສະມາຊິກ' : 'Plan'}</p>
                <p className="mt-0.5 truncate font-bold text-slate-800 dark:text-slate-100">{proofPreview.planName}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{language === 'lo' ? 'ວັນທີສົ່ງ' : 'Submitted'}</p>
                <p className="mt-0.5 font-bold text-slate-800 dark:text-slate-100">{formatDate(proofPreview.createdAt, language)}</p>
              </div>
            </div>
            <div className="flex min-h-64 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800 p-2 ring-1 ring-slate-200 dark:ring-slate-700 sm:p-4">
              <img
                src={proofPreview.url}
                alt={language === 'lo' ? `ຫຼັກຖານການຊຳລະຈາກ ${proofPreview.userName}` : `Payment proof from ${proofPreview.userName}`}
                className="max-h-[62vh] w-full rounded-xl object-contain"
              />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!rejectingRequest}
        onClose={() => setRejectingRequest(null)}
        title={language === 'lo' ? 'ປະຕິເສດຄຳຂໍສະໝັກສະມາຊິກ' : 'Reject Subscription Request'}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setRejectingRequest(null)}>
              {language === 'lo' ? 'ຍົກເລີກ' : 'Cancel'}
            </Button>
            <Button
              type="button"
              variant="danger"
              icon={<XCircle className="h-4 w-4" />}
              onClick={rejectSubscription}
              loading={reviewingSubscriptionId === rejectingRequest?.subscriptionId}
            >
              {language === 'lo' ? 'ປະຕິເສດຄຳຂໍ' : 'Reject request'}
            </Button>
          </>
        }
      >
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-300" data-no-premium-translate>
          {language === 'lo' ? (
            <>ການປະຕິເສດຄຳຂໍຂອງ <span className="font-bold text-gray-950 dark:text-gray-100">{rejectingRequest?.userName}</span> ຈະເຮັດໃຫ້ບໍ່ສາມາດເຂົ້າໃຊ້ກິດຈະກຳ Premium ໄດ້.</>
          ) : (
            <>Rejecting the request for <span className="font-bold text-gray-950 dark:text-gray-100">{rejectingRequest?.userName}</span> will prevent access to Premium activities.</>
          )}
        </p>
        <Textarea
          label={language === 'lo' ? 'ເຫດຜົນ' : 'Reason'}
          rows={4}
          value={rejectReason}
          onChange={event => setRejectReason(event.target.value)}
          placeholder={language === 'lo' ? 'ອະທິບາຍເຫດຜົນທີ່ຄຳຂໍສະໝັກສະມາຊິກນີ້ບໍ່ໄດ້ຮັບການອະນຸມັດ.' : 'Explain why this subscription request was not approved.'}
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
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
              <input
                type="checkbox"
                checked={editingPlan.is_active}
                onChange={event => setEditingPlan({ ...editingPlan, is_active: event.target.checked })}
                className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-primary-700 dark:text-primary-300 focus:ring-primary-500"
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

      <AdminProfileModal open={profileSettingsOpen} onClose={() => setProfileSettingsOpen(false)} />
    </div>
  )
}

function Stat({ label, value, icon, color }: { label: string; value: ReactNode; icon: ReactNode; color: 'blue' | 'amber' | 'green' | 'purple' }) {
  const colors = {
    blue: 'bg-primary-50 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300',
    amber: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300',
    green: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    purple: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
  }
  return (
    <Card className="min-w-0 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 sm:text-xs">{label}</p>
          <p className="mt-2 break-words text-lg font-black text-gray-950 dark:text-gray-100 sm:text-2xl">{value}</p>
        </div>
        <div className={cn('shrink-0 rounded-2xl p-2 sm:p-3', colors[color])}>{icon}</div>
      </div>
    </Card>
  )
}

function WeeklyContentForge({
  run,
  generating,
  onGenerate,
  onOpenProgress,
}: {
  run?: WeeklyContentRun | null
  generating: boolean
  onGenerate: () => void
  onOpenProgress: () => void
}) {
  const ready = run?.status === 'READY'
  const stale = weeklyRunIsStale(run)
  const paused = run?.status === 'PAUSED'
  const working = generating || (run?.status === 'GENERATING' && !stale)
  const counts = run?.content_counts ?? {}
  const hasSavedProgress = Object.values(counts).some(count => Number(count) > 0)
  const canContinue = !ready && !paused && (hasSavedProgress || run?.status === 'CANCELLED' || run?.status === 'FAILED' || stale)
  const streams = [
    { key: 'brain_sprint', label: 'Brain Sprint', icon: <BrainCircuit className="h-4 w-4" />, fallback: 35 },
    { key: 'word_match', label: 'Word Match', icon: <Gamepad2 className="h-4 w-4" />, fallback: 42 },
    { key: 'roleplay_missions', label: 'Role-play', icon: <MessageSquareText className="h-4 w-4" />, fallback: 7 },
    { key: 'daily_mentor', label: 'Daily Mentor', icon: <Sparkles className="h-4 w-4" />, fallback: 7 },
    { key: 'prompt_library', label: 'Prompt Library', icon: <LibraryBig className="h-4 w-4" />, fallback: 7 },
    { key: 'lessons', label: 'Hub Lessons', icon: <BookOpen className="h-4 w-4" />, fallback: 8 },
  ]
  const targetWeek = run?.week_start ?? nextAcademyWeekStart()
  const weekLabel = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${targetWeek}T00:00:00Z`))

  return (
    <section id="premium-forge" className="relative scroll-mt-24 overflow-hidden rounded-[2rem] bg-[#110b24] px-5 py-6 text-white shadow-[0_24px_70px_-28px_rgba(67,33,132,0.8)] sm:px-8 sm:py-8">
      <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl motion-safe:animate-pulse" />
      <div className="pointer-events-none absolute -bottom-24 left-1/4 h-52 w-52 rounded-full bg-amber-300/10 blur-3xl" />
      <div className="relative grid gap-8 lg:grid-cols-3 lg:items-center lg:gap-10 xl:gap-14">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-amber-300">
            <WandSparkles className="h-4 w-4" />
            Weekly content forge
          </div>
          <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Create the next Academy week</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-violet-100/75">
            Qwen researches fresh topics, writes bilingual content, validates every set, and prepares the release beginning {weekLabel}.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
            {streams.map(stream => (
              <div key={stream.key} className="flex min-w-0 items-center gap-3 border-b border-white/10 pb-3 text-sm text-violet-100">
                <span className="shrink-0 text-amber-300">{stream.icon}</span>
                <span className="min-w-max flex-1 whitespace-nowrap font-semibold">{stream.label}</span>
                <span className="font-black text-white">{ready ? counts[stream.key] ?? 0 : stream.fallback}</span>
              </div>
            ))}
          </div>

          {run?.status === 'FAILED' && (
            <p role="alert" className="mt-5 rounded-xl border border-red-300/20 dark:border-red-500/40 bg-red-400/10 px-4 py-3 text-xs font-semibold text-red-100">
              Last attempt failed: {run.error_message ?? 'Unknown generation error. You can safely try again.'}
            </p>
          )}
        </div>

        <div className="flex w-full min-w-0 flex-col items-stretch sm:items-center lg:col-span-1 lg:justify-self-end">
          <button
            type="button"
            onClick={working || paused ? onOpenProgress : onGenerate}
            disabled={ready}
            data-tone={ready ? 'ready' : undefined}
            className={cn(
              'forge-cta group relative flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl px-6 py-3.5 text-sm font-black uppercase tracking-[0.14em] focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-200/60 disabled:cursor-not-allowed sm:w-auto sm:min-w-64',
              ready ? 'bg-emerald-400 text-emerald-950' : 'bg-amber-300 text-[#160b2d] hover:bg-amber-200',
            )}
          >
            {!ready && <span aria-hidden="true" className="forge-cta-halo" />}
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#160b2d]/10">
              {working ? <Sparkles className="h-5 w-5 motion-safe:animate-spin" />
                : paused ? <Pause className="h-5 w-5" />
                : ready ? <CheckCircle2 className="h-5 w-5" />
                : <WandSparkles className="forge-cta-spark h-5 w-5" />}
            </span>
            <span>{working ? 'View progress' : paused ? 'Paused' : ready ? 'Week ready' : canContinue ? 'Continue' : 'Forge week'}</span>
          </button>
          <p className="mt-4 text-center text-xs font-semibold leading-5 text-violet-200/70 sm:max-w-64">
            {ready ? `Completed ${run?.completed_at ? formatDate(run.completed_at, 'en') : ''}` : working ? 'Runs in the background one step at a time. Tap to view or pause steps.' : paused ? 'Some steps are paused. Tap to start them again.' : canContinue ? 'Continue from the first unfinished step—saved content will not be regenerated.' : 'Generate on any day · existing weeks are checked first'}
          </p>
        </div>
      </div>
    </section>
  )
}

function ForgeStepButton({ label, icon, onClick, busy, disabled, primary = false }: {
  label: string
  icon: ReactNode
  onClick: () => void
  busy: boolean
  disabled: boolean
  primary?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[11px] font-black transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-50',
        primary ? 'bg-amber-300 text-amber-950 hover:bg-amber-200' : 'bg-white/10 text-violet-100 hover:bg-white/20',
      )}
    >
      {busy ? <Sparkles className="h-3.5 w-3.5 motion-safe:animate-spin" /> : icon}
      {label}
    </button>
  )
}

function MemberDetailSection({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2 text-primary-600 dark:text-primary-400">
        {icon}
        <h3 className="text-sm font-black text-gray-950 dark:text-gray-100">{title}</h3>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-800 border-y border-gray-100 dark:border-gray-800">
        {children}
      </div>
    </section>
  )
}

function MemberDetail({ label, value, icon }: { label: string; value?: string | null; icon?: ReactNode }) {
  return (
    <div className="grid gap-1 py-2.5 sm:grid-cols-[150px_1fr] sm:gap-4">
      <p className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400">
        {icon}
        {label}
      </p>
      <p className="break-words text-sm font-semibold text-gray-900 dark:text-gray-100">{value || 'Not provided'}</p>
    </div>
  )
}

const PENDING_STATUSES: SubscriptionStatus[] = ['PENDING_PAYMENT', 'PAYMENT_REVIEW', 'PENDING_APPROVAL']

/** The membership that describes the member now: live paid, then live Free, then a request, then the latest. */
function currentSubscription(history: PremiumSubscription[]) {
  const live = history.filter(subscription => effectiveStatus(subscription) === 'ACTIVE')
  return live.find(subscription => Number(subscription.plan?.price_lak ?? 0) > 0)
    ?? live[0]
    ?? history.find(subscription => PENDING_STATUSES.includes(subscription.status))
    ?? history[0]
}

interface MemberRow {
  userId: string
  history: PremiumSubscription[]
  current: PremiumSubscription
}

type MemberFilter = 'ALL' | 'PREMIUM' | 'FREE'

/** One row per member. Rows arrive newest first, so members are ordered by their latest activity. */
function groupMembers(subscriptions: PremiumSubscription[]): MemberRow[] {
  const byUser = new Map<string, PremiumSubscription[]>()
  for (const subscription of subscriptions) {
    const history = byUser.get(subscription.user_id)
    if (history) history.push(subscription)
    else byUser.set(subscription.user_id, [subscription])
  }
  return [...byUser.entries()].map(([userId, history]) => ({ userId, history, current: currentSubscription(history) }))
}

/** Group by the member's current membership only, never their history. */
function memberGroup(current: PremiumSubscription): 'PREMIUM' | 'FREE' | 'CANCELLED' | 'PENDING' {
  const status = effectiveStatus(current)
  if (status === 'ACTIVE') return Number(current.plan?.price_lak ?? 0) > 0 ? 'PREMIUM' : 'FREE'
  if (status === 'CANCELLED' || status === 'EXPIRED') return 'CANCELLED'
  return 'PENDING'
}

const MEMBER_FILTERS: Array<{ value: MemberFilter; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'PREMIUM', label: 'Premium' },
  { value: 'FREE', label: 'Free' },
]

function MemberFilterChips({ value, counts, onChange }: {
  value: MemberFilter
  counts: Record<MemberFilter, number>
  onChange: (value: MemberFilter) => void
}) {
  return (
    <div role="group" aria-label="Filter members" className="mb-3 flex flex-wrap gap-2">
      {MEMBER_FILTERS.map(filter => {
        const selected = value === filter.value
        return (
          <button
            key={filter.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(filter.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
              selected
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
            )}
          >
            {filter.value === 'PREMIUM' && <Crown className="h-3.5 w-3.5" aria-hidden="true" />}
            {filter.value === 'FREE' && <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />}
            <span>{filter.label}</span>
            <span className={cn(
              'rounded-full px-1.5 text-[11px] font-black',
              selected ? 'bg-white/20 text-white' : 'bg-white text-gray-700 dark:bg-gray-900 dark:text-gray-200',
            )}>
              {counts[filter.value]}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function planIntervalLabel(interval: string) {
  if (interval === 'month') return 'Monthly'
  if (interval === 'year') return 'Yearly'
  return interval.charAt(0).toUpperCase() + interval.slice(1)
}

/** Paid plan vs Free plan, so admins can tell members apart at a glance. */
function PlanTierBadge({ subscription }: { subscription: PremiumSubscription }) {
  const paid = Number(subscription.plan?.price_lak ?? 0) > 0
  return paid ? (
    <span title="Premium" className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 p-1 sm:px-2 sm:py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-950 shadow-sm">
      <Crown className="h-3 w-3" aria-hidden="true" /><span className="sr-only sm:not-sr-only">Premium</span>
    </span>
  ) : (
    <span title="Free" className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 p-1 sm:px-2 sm:py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-600 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-700">
      <ShieldCheck className="h-3 w-3" aria-hidden="true" /><span className="sr-only sm:not-sr-only">Free</span>
    </span>
  )
}

function subscriptionSummary(subscription: PremiumSubscription, language: 'lo' | 'en') {
  if (!subscription.ends_at && subscription.status === 'ACTIVE') return 'No end date'
  const date = subscription.ends_at ? formatDate(subscription.ends_at, language) : 'manual'
  if (effectiveStatus(subscription) === 'EXPIRED') return `Ended ${date}`
  if (subscription.status === 'ACTIVE' && subscription.cancelled_at) return `Cancelled · access until ${date}`
  return `Ends ${date}`
}

/**
 * One row per member showing their current membership. The profile picture
 * opens the member's details; the rest of the row expands their history.
 */
function MemberSubscriptionList({
  members,
  onOpenProfile,
  whatsAppNumber,
  onWhatsApp,
  limit,
  pageSize,
}: {
  members: MemberRow[]
  onOpenProfile: (subscription: PremiumSubscription) => void
  whatsAppNumber: (subscription: PremiumSubscription) => string | null
  /** Drafts the member's WhatsApp message (payment nudge, daily reminder or blank). */
  onWhatsApp: (subscription: PremiumSubscription) => void
  /** Show only the first N members (preview). */
  limit?: number
  /** Paginate the members, N per page. */
  pageSize?: number
}) {
  const { language } = useLanguage()
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const [page, setPage] = useState(1)

  function toggle(userId: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  const pageCount = pageSize ? Math.max(1, Math.ceil(members.length / pageSize)) : 1
  const currentPage = Math.min(page, pageCount)
  const visibleMembers = pageSize
    ? members.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : limit ? members.slice(0, limit) : members

  return (
    <>
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {visibleMembers.map(({ userId, history, current }) => {
        const open = expanded.has(userId)
        const status = effectiveStatus(current)
        const memberName = current.user?.name ?? 'Unknown user'
        const hasWhatsApp = Boolean(whatsAppNumber(current))
        const whatsAppLabel = status === 'PENDING_PAYMENT'
          ? 'Remind to pay on WhatsApp'
          : status === 'ACTIVE' ? 'Send daily reminder on WhatsApp' : 'Message on WhatsApp'
        return (
          <div key={userId}>
            <div className="flex items-center gap-3 p-4 transition hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <button
                type="button"
                onClick={() => onOpenProfile(current)}
                aria-label={`View profile: ${memberName}`}
                title="View profile"
                className="flex-shrink-0 rounded-full transition hover:scale-105 hover:ring-2 hover:ring-primary-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <MemberAvatar name={current.user?.name} avatarUrl={current.user?.avatar_url} />
              </button>
              <button
                type="button"
                onClick={() => toggle(userId)}
                aria-expanded={open}
                className="flex min-w-0 flex-1 items-center gap-3 text-left focus:outline-none focus-visible:rounded-xl focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="min-w-0 truncate text-sm font-black text-gray-950 dark:text-gray-100">{memberName}</p>
                    <PlanTierBadge subscription={current} />
                  </div>
                  <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                    {current.plan?.name ?? 'Plan'} · {subscriptionSummary(current, language)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold', subscriptionStatusClass(status))}>
                      {statusLabel(status)}
                    </span>
                    <span className="text-[11px] font-semibold text-gray-400">
                      {history.length} {history.length === 1 ? 'record' : 'records'}
                    </span>
                  </div>
                </div>
                <ChevronDown className={cn('h-4 w-4 flex-shrink-0 text-gray-400 transition-transform', open && 'rotate-180')} />
              </button>
              <button
                type="button"
                onClick={() => onWhatsApp(current)}
                aria-label={`${whatsAppLabel}: ${memberName}`}
                title={hasWhatsApp ? whatsAppLabel : `${whatsAppLabel} (no number on file)`}
                className={cn(
                  'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/50',
                  hasWhatsApp
                    ? 'bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white'
                    : 'bg-gray-100 text-gray-400 hover:text-[#25D366] dark:bg-gray-800',
                )}
              >
                <WhatsAppIcon className="h-4 w-4" />
              </button>
            </div>

            {open && (
              // Newest record on top; the rail links each record to the one before it.
              <ol aria-label={`Membership history: ${memberName}`} className="bg-gray-50/80 px-4 pb-4 pt-2 dark:bg-gray-800/30 md:pl-[4.75rem]">
                {history.map((subscription, index) => {
                  const rowStatus = effectiveStatus(subscription)
                  const isCurrent = subscription.id === current.id
                  const isLast = index === history.length - 1
                  return (
                    <li key={subscription.id} className="relative pb-3 pl-7 last:pb-0">
                      {!isLast && (
                        <span aria-hidden="true" className="absolute bottom-0 left-[7px] top-5 w-0.5 bg-gray-200 dark:bg-gray-700" />
                      )}
                      <span
                        aria-hidden="true"
                        className={cn(
                          'absolute left-0 top-3.5 h-4 w-4 rounded-full border-[3px] border-white dark:border-gray-900',
                          TIMELINE_TONES[timelineTone(rowStatus)].dot,
                          isCurrent && 'ring-2 ring-primary-400/60',
                        )}
                      />
                      <div className={cn(
                        'rounded-xl border bg-white p-3 dark:bg-gray-900',
                        isCurrent ? 'border-primary-200 dark:border-primary-800' : 'border-gray-100 dark:border-gray-800',
                      )}>
                        <div className="flex items-center justify-between gap-2">
                          <p className="min-w-0 truncate text-sm font-bold text-gray-900 dark:text-gray-100">
                            {subscription.plan?.name ?? 'Plan'}
                            {isCurrent && (
                              <span className="ml-2 rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-black uppercase text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">Current</span>
                            )}
                          </p>
                          <span className={cn('flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold', subscriptionStatusClass(rowStatus))}>
                            {statusLabel(rowStatus)}
                          </span>
                        </div>
                        <SubscriptionProgress subscription={subscription} language={language} />
                        {subscription.downgraded_from_id && (
                          <p className="mt-2 text-[11px] font-semibold text-gray-500 dark:text-gray-400">Given automatically when their Premium expired.</p>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </div>
        )
      })}
    </div>
    {pageSize && pageCount > 1 && (
      <Pagination page={currentPage} pageCount={pageCount} onChange={setPage} />
    )}
    </>
  )
}

function Pagination({ page, pageCount, onChange }: { page: number; pageCount: number; onChange: (page: number) => void }) {
  // Up to five page numbers around the current page.
  const first = Math.max(1, Math.min(page - 2, pageCount - 4))
  const numbers = Array.from({ length: Math.min(5, pageCount) }, (_, index) => first + index)
  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1 border-t border-gray-100 dark:border-gray-800 px-2 py-3">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-gray-600 transition hover:bg-gray-100 disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-800"
      >
        Prev
      </button>
      {numbers.map(number => (
        <button
          key={number}
          type="button"
          onClick={() => onChange(number)}
          aria-current={number === page ? 'page' : undefined}
          className={cn(
            'h-8 min-w-8 rounded-lg px-2 text-xs font-bold transition',
            number === page
              ? 'bg-primary-600 text-white'
              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
          )}
        >
          {number}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= pageCount}
        className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-gray-600 transition hover:bg-gray-100 disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-800"
      >
        Next
      </button>
    </nav>
  )
}

type TimelineTone = 'active' | 'ended' | 'pending'

const TIMELINE_TONES: Record<TimelineTone, { dot: string; line: string }> = {
  active: { dot: 'bg-emerald-500', line: 'bg-emerald-300 dark:bg-emerald-700' },
  ended: { dot: 'bg-red-500', line: 'bg-red-200 dark:bg-red-900' },
  pending: { dot: 'bg-amber-500', line: 'bg-amber-200 dark:bg-amber-800' },
}

function timelineTone(status: SubscriptionStatus): TimelineTone {
  if (status === 'ACTIVE') return 'active'
  if (status === 'CANCELLED' || status === 'EXPIRED') return 'ended'
  return 'pending'
}

interface ProgressStep {
  label: string
  value?: string | null
  /** done: happened. upcoming: still ahead. skipped: never reached. */
  state: 'done' | 'upcoming' | 'skipped'
  tone: TimelineTone
}

/** Requested → Started → how it ended (or will end), for one membership record. */
function subscriptionSteps(subscription: PremiumSubscription): ProgressStep[] {
  const status = effectiveStatus(subscription)
  const requested: ProgressStep = { label: 'Requested', value: subscription.created_at, state: 'done', tone: 'pending' }
  const started: ProgressStep = subscription.starts_at
    ? { label: 'Started', value: subscription.starts_at, state: 'done', tone: 'active' }
    : { label: status === 'CANCELLED' || status === 'EXPIRED' ? 'Not started' : 'Awaiting start', state: status === 'CANCELLED' || status === 'EXPIRED' ? 'skipped' : 'upcoming', tone: 'pending' }

  let last: ProgressStep
  if (status === 'CANCELLED') {
    last = { label: 'Cancelled', value: subscription.cancelled_at ?? subscription.ends_at, state: 'done', tone: 'ended' }
  } else if (status === 'EXPIRED') {
    last = { label: 'Ended', value: subscription.ends_at, state: 'done', tone: 'ended' }
  } else if (status === 'ACTIVE') {
    last = subscription.ends_at
      ? { label: subscription.cancelled_at ? 'Access until' : 'Ends', value: subscription.ends_at, state: 'upcoming', tone: 'active' }
      : { label: 'No end date', state: 'upcoming', tone: 'active' }
  } else {
    last = { label: 'Ends', state: 'upcoming', tone: 'pending' }
  }
  return [requested, started, last]
}

function SubscriptionProgress({ subscription, language }: { subscription: PremiumSubscription; language: 'lo' | 'en' }) {
  const steps = subscriptionSteps(subscription)
  return (
    <ol className="mt-3 grid grid-cols-3">
      {steps.map((step, index) => {
        const next = steps[index + 1]
        return (
          <li key={step.label} className="min-w-0 text-center">
            <div className="flex items-center">
              {/* Each connector takes the colour of the step it leads to, once that step happened. */}
              <span className={cn('h-0.5 flex-1', index === 0 ? 'invisible' : step.state === 'done' ? TIMELINE_TONES[step.tone].line : 'bg-gray-200 dark:bg-gray-700')} />
              <span
                className={cn(
                  'h-3 w-3 flex-shrink-0 rounded-full',
                  step.state === 'done' && TIMELINE_TONES[step.tone].dot,
                  step.state === 'upcoming' && 'border-2 border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900',
                  step.state === 'skipped' && 'border-2 border-dashed border-gray-300 dark:border-gray-600',
                )}
              />
              <span className={cn('h-0.5 flex-1', !next ? 'invisible' : next.state === 'done' ? TIMELINE_TONES[next.tone].line : 'bg-gray-200 dark:bg-gray-700')} />
            </div>
            <p className={cn(
              'mt-1.5 px-1 text-[11px] font-bold leading-4',
              step.state === 'skipped' ? 'text-gray-400' : 'text-gray-600 dark:text-gray-300',
            )}>
              {step.label}
            </p>
            {step.value && (
              <p className="px-1 text-[11px] font-semibold leading-4 text-gray-900 dark:text-gray-100">
                {formatDateTime(step.value, language)}
              </p>
            )}
          </li>
        )
      })}
    </ol>
  )
}

function MemberAvatar({ name, avatarUrl }: { name?: string | null; avatarUrl?: string | null }) {
  return (
    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white dark:border-gray-800 bg-primary-100 dark:bg-primary-900/60 text-sm font-black text-primary-800 dark:text-primary-300 shadow-sm">
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span>{name?.charAt(0).toUpperCase() ?? '?'}</span>
      )}
    </div>
  )
}

function TopPerformersPanel({ performers, loading, failed }: { performers: TopPerformer[]; loading: boolean; failed: boolean }) {
  const { language } = useLanguage()
  return (
    <section className="min-w-0 rounded-3xl bg-white dark:bg-gray-900 p-4 shadow-card sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-primary-600 dark:text-primary-400">Leaderboard</p>
          <h2 className="mt-1 text-lg font-black text-gray-950 dark:text-gray-100">Top performers</h2>
          <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
            Ranked automatically by XP from the daily mentor and learning activities.
          </p>
        </div>
        <Trophy className="h-5 w-5 flex-shrink-0 text-amber-500" />
      </div>
      {failed ? (
        <p role="alert" className="rounded-2xl bg-red-50 dark:bg-red-500/10 p-4 text-sm font-semibold text-red-700 dark:text-red-300">
          Could not load top performers. Refresh to try again.
        </p>
      ) : loading ? (
        <p className="py-6 text-center text-sm text-gray-400">Loading…</p>
      ) : performers.length === 0 ? (
        <EmptyMessage icon={<Trophy className="h-8 w-8" />} title="No activity yet" detail="Members appear here once they earn XP." />
      ) : (
        <ol className="space-y-2">
          {performers.map(performer => (
            <li key={performer.user_id} className="flex items-center gap-2 rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:gap-3">
              <span className={cn(
                'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-black',
                performer.rank === 1 ? 'bg-amber-400 text-amber-950'
                  : performer.rank === 2 ? 'bg-slate-300 text-slate-800'
                    : performer.rank === 3 ? 'bg-orange-300 text-orange-950'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300',
              )}>
                {performer.rank}
              </span>
              <MemberAvatar name={performer.display_name} avatarUrl={performer.avatar_url} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-gray-950 dark:text-gray-100">{performer.display_name}</p>
                <p className="mt-0.5 truncate text-[11px] text-gray-500 dark:text-gray-400">
                  {performer.plan_name}
                  {performer.streak > 0 ? ` · 🔥 ${performer.streak}` : ''}
                  {` · ${performer.completed_days} full days`}
                  {performer.last_active_day ? ` · active ${formatDate(performer.last_active_day, language)}` : ''}
                </p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-sm font-black text-gray-950 dark:text-gray-100">{performer.xp.toLocaleString()}</p>
                <p className="text-[10px] font-semibold uppercase text-gray-400">XP</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
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
    <section className="min-w-0 rounded-3xl bg-white dark:bg-gray-900 p-4 shadow-card sm:p-5">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-primary-600 dark:text-primary-400">{eyebrow}</p>
          <h2 className="mt-1 text-lg font-black text-gray-950 dark:text-gray-100">{title}</h2>
        </div>
        <Button type="button" size="sm" variant="outline" icon={<Edit3 className="h-4 w-4" />} onClick={onCreate}>
          {action}
        </Button>
      </div>
      <div className="space-y-3">
        {items.length > 0 ? items.map(item => (
          <div key={item.id} className="rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-gray-950 dark:text-gray-100">{item.title}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500 dark:text-gray-400">{item.detail}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[11px] font-bold text-gray-600 dark:text-gray-300">{item.meta}</span>
                  <span className={cn(
                    'rounded-full px-2 py-0.5 text-[11px] font-bold',
                    item.isActive ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300',
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
    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
      <input
        type="checkbox"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-primary-700 dark:text-primary-300 focus:ring-primary-500"
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
    <section id={id} className="min-w-0 scroll-mt-24 rounded-3xl bg-white dark:bg-gray-900 p-4 shadow-card sm:p-5">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-primary-600 dark:text-primary-400">{eyebrow}</p>
          <h2 className="mt-1 text-xl font-black text-gray-950 dark:text-gray-100">{title}</h2>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-primary-50 dark:bg-primary-900/40 px-3 py-1.5 text-xs font-bold text-primary-700 dark:text-primary-300">
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
    <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-800/50 text-gray-300">{icon}</div>
      <p className="mt-3 text-sm font-bold text-gray-800 dark:text-gray-100">{title}</p>
      <p className="mt-1 text-xs leading-5 text-gray-400">{detail}</p>
    </div>
  )
}

function DailyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-primary-600 dark:text-primary-400">{label}</p>
      <p className="mt-2 text-sm leading-6 text-gray-700 dark:text-gray-200">{value}</p>
    </div>
  )
}
