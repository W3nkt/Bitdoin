import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle, ArrowRight, Brain, Camera, Clock, Flame, GraduationCap, Lightbulb,
  ChevronRight, Loader2, LogOut, Moon, Pencil, Save, Send, Sun, Target, XCircle, Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { supabase } from '@/lib/supabase'
import { isMembershipExpired, premiumEndedAt, type PremiumStatus, useMenuSubscription } from '@/lib/academyMembership'
import { cn, formatDate } from '@/lib/utils'
import { useTheme } from '@/lib/theme'
import { telegramRemindersAvailable } from '@/components/premium/TelegramReminderCard'

interface MenuPersonalization {
  completed: boolean
  responses: Record<string, string>
}

interface MenuMemberDashboard {
  member: { streak: number; xp: number }
}

function formatStreak(days: number) {
  return `${days} ${days === 1 ? 'day' : 'days'}`
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
  if (status === 'ACTIVE') return 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
  if (status === 'PAYMENT_REVIEW') return 'bg-orange-100 dark:bg-orange-500/15 text-orange-800 dark:text-orange-300'
  if (status === 'PENDING_APPROVAL' || status === 'PENDING_PAYMENT') return 'bg-yellow-100 dark:bg-yellow-500/15 text-yellow-800 dark:text-yellow-300'
  if (status === 'EXPIRED') return 'bg-red-500/20 text-red-300 ring-1 ring-red-400/40'
  if (status === 'CANCELLED') return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'
  return 'bg-primary-100 dark:bg-primary-900/60 text-primary-800 dark:text-primary-300'
}

// Self-contained profile dropdown: identity + avatar editing, membership
// snapshot, mentor personalization, and sign out. Fetches its own data so it
// can be dropped into any Premium header without the host page wiring
// anything up. Uses a query key distinct from the host page's own
// subscription query ('subscription-menu', not 'subscription') — this
// component's select is intentionally narrower, and sharing a key with a
// fuller query caused the two fetches to race and clobber each other's
// cached shape depending on which one resolved last.
export function PremiumProfileMenu({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const { profile, signOut, refreshProfile } = useAuth()
  const { language, setLanguage } = useLanguage()
  const theme = useTheme(state => state.theme)
  const toggleTheme = useTheme(state => state.toggleTheme)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { success, error } = useToast()

  const { data: subscription } = useMenuSubscription()
  // Premium ended (just now, or the member fell back to Free): show it as expired.
  const premiumEnded = premiumEndedAt(subscription)
  const expired = !!premiumEnded
  const effectiveStatus = expired ? 'EXPIRED' : subscription?.status
  // Cancelled before the end date: still full access until ends_at.
  const cancelledWithAccess = !expired && subscription?.status === 'ACTIVE' && !!subscription.cancelled_at && !!subscription.ends_at

  const { data: onboarding } = useQuery({
    queryKey: ['premium', 'onboarding-profile-v2', profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error: onboardingError } = await supabase
        .from('premium_onboarding_responses')
        .select('completed, responses')
        .eq('user_id', profile!.id)
        .maybeSingle()
      if (onboardingError) throw onboardingError
      return data as MenuPersonalization | null
    },
    staleTime: 0,
    retry: 1,
  })

  const { data: memberProgress } = useQuery({
    queryKey: ['premium', 'member-progress', profile?.id],
    enabled: Boolean(profile) && subscription?.status === 'ACTIVE' && !isMembershipExpired(subscription),
    queryFn: async () => {
      const { data, error: progressError } = await supabase.rpc('get_premium_member_dashboard', { p_limit: 5 })
      if (progressError) throw progressError
      return data as MenuMemberDashboard | null
    },
    staleTime: 1000 * 60,
    retry: 1,
  })

  const personalization = onboarding?.responses ?? {}
  const planName = subscription?.plan?.name ?? (subscription?.status === 'ACTIVE' ? 'Premium Monthly' : 'Free')
  const status = expired
    ? (language === 'lo' ? 'ໝົດອາຍຸແລ້ວ' : 'Expired')
    : cancelledWithAccess
      ? (language === 'lo' ? 'ຍົກເລີກແລ້ວ' : 'Cancelled')
      : statusLabel(subscription?.status)
  const statusClassName = cancelledWithAccess
    ? 'bg-amber-400/20 text-amber-200 ring-1 ring-amber-300/40'
    : statusClass(effectiveStatus)
  const streak = formatStreak(memberProgress?.member.streak ?? 0)
  const xp = (memberProgress?.member.xp ?? 0).toLocaleString()
  const expirationIso = premiumEnded ?? subscription?.ends_at
  const expiration = expirationIso ? formatDate(expirationIso, language) : 'No expiry'

  const menuRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [panelMaxHeight, setPanelMaxHeight] = useState<number>()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)

  // Fit the dropdown between where it starts and the bottom of the visible
  // screen, so its end (e.g. the Telegram card) can always be scrolled to —
  // even when the expiry banner pushes the header down, and on phones where
  // 100vh reaches behind the browser's toolbar.
  useLayoutEffect(() => {
    if (!open) return
    const fit = () => {
      const panel = panelRef.current
      if (!panel) return
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight
      setPanelMaxHeight(Math.max(200, viewportHeight - panel.getBoundingClientRect().top - 12))
    }
    fit()
    window.addEventListener('resize', fit)
    window.visualViewport?.addEventListener('resize', fit)
    return () => {
      window.removeEventListener('resize', fit)
      window.visualViewport?.removeEventListener('resize', fit)
    }
  }, [open])
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<Record<string, string>>(personalization)
  const [editingIdentity, setEditingIdentity] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [savingIdentity, setSavingIdentity] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [confirmingLogout, setConfirmingLogout] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const displayName = profile?.name?.trim() || 'Guest user'
  const contact = profile?.email ?? profile?.phone ?? 'Sign in to use Premium'
  const initial = (displayName.charAt(0) || '?').toUpperCase()

  useEffect(() => {
    if (!editing) setDraft(personalization)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, onboarding])

  useEffect(() => {
    if (!editingIdentity) setNameDraft(profile?.name ?? '')
  }, [editingIdentity, profile?.name])

  useEffect(() => {
    if (!open) return

    function closeOnOutsideClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setEditing(false)
        setEditingIdentity(false)
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        setEditing(false)
        setEditingIdentity(false)
      }
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  function handleAccountAction() {
    setOpen(false)
    if (!profile) {
      navigate('/auth')
      return
    }
    setConfirmingLogout(true)
  }

  async function confirmLogout() {
    setSigningOut(true)
    try {
      await signOut()
      navigate('/')
    } finally {
      setSigningOut(false)
      setConfirmingLogout(false)
    }
  }

  async function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !profile) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      error('Please choose a JPEG, PNG, or WEBP image.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      error('Image must be smaller than 5MB.')
      return
    }

    setUploadingAvatar(true)
    try {
      const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
      const path = `${profile.id}/avatar-${crypto.randomUUID()}.${extension}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { cacheControl: '3600' })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id)
      if (updateError) throw updateError

      await refreshProfile()
      success('Profile picture updated.')
    } catch (uploadError) {
      console.error(uploadError)
      error('Could not update your profile picture.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function saveIdentity() {
    if (!profile) return
    const trimmedName = nameDraft.trim()
    if (!trimmedName) {
      error('Name cannot be empty.')
      return
    }

    setSavingIdentity(true)
    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ name: trimmedName })
        .eq('id', profile.id)
      if (updateError) throw updateError

      await refreshProfile()
      setEditingIdentity(false)
      success('Your profile has been updated.')
    } catch (updateError) {
      console.error(updateError)
      error('Could not update your profile.')
    } finally {
      setSavingIdentity(false)
    }
  }

  async function savePersonalization() {
    if (!profile) return
    setSaving(true)
    try {
      const responses = { ...personalization, ...draft }
      const { error: saveError } = await supabase
        .from('premium_onboarding_responses')
        .upsert({ user_id: profile.id, responses }, { onConflict: 'user_id' })
      if (saveError) throw saveError
      await qc.invalidateQueries({ queryKey: ['premium', 'onboarding-profile-v2', profile.id] })
      setEditing(false)
      success('Your mentor profile has been updated.')
    } catch (saveError) {
      console.error(saveError)
      error('Could not update your mentor profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(current => {
          if (current) {
            setEditing(false)
            setEditingIdentity(false)
          }
          return !current
        })}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          'flex h-11 w-11 items-center justify-center overflow-hidden rounded-full text-sm font-black transition',
          variant === 'dark'
            ? 'bg-white/15 text-white ring-2 ring-white/25 hover:bg-white/20 hover:ring-white/40'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 ring-1 ring-slate-200 dark:ring-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700',
        )}
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
          ref={panelRef}
          role="dialog"
          aria-label="Premium profile and personalization"
          style={{ maxHeight: panelMaxHeight }}
          className="absolute right-0 top-full z-20 mt-3 max-h-[calc(100dvh-6.5rem)] w-[min(28rem,calc(100vw-2rem))] origin-top-right overflow-y-auto overscroll-contain rounded-[1.75rem] border border-amber-200/60 dark:border-amber-500/30 bg-[#fffdf8] dark:bg-gray-900 p-3 text-left text-slate-950 dark:text-slate-100 shadow-[0_28px_80px_rgba(3,10,24,0.32)] animate-slide-up"
        >
          <div className="flex items-center gap-3 px-1 pb-3">
            <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary-950 text-sm font-black text-amber-200 ring-1 ring-amber-300/30">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span>{initial}</span>
              )}
              {editingIdentity && profile && (
                <>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={event => void handleAvatarFileChange(event)}
                  />
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 text-white transition hover:bg-black/60 disabled:opacity-70"
                  >
                    {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                    <span className="sr-only">Change profile picture</span>
                  </button>
                </>
              )}
            </div>
            <div className="min-w-0 flex-1">
              {editingIdentity ? (
                <input
                  value={nameDraft}
                  onChange={event => setNameDraft(event.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-lg border border-amber-200 dark:border-amber-500/30 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-sm font-black text-slate-950 dark:text-slate-100 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100 dark:focus:ring-amber-500/30"
                />
              ) : (
                <p className="truncate text-base font-black tracking-tight text-slate-950 dark:text-slate-100">{displayName}</p>
              )}
              <p className="mt-0.5 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{contact}</p>
            </div>
            {profile && (
              editingIdentity ? (
                <div className="flex flex-shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditingIdentity(false)}
                    className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300"
                    aria-label="Cancel editing profile"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={savingIdentity}
                    onClick={() => void saveIdentity()}
                    className="flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-500/15 px-2.5 py-2 text-xs font-black text-amber-900 dark:text-amber-300 transition hover:bg-amber-200 dark:hover:bg-amber-500/25 disabled:opacity-60"
                    aria-label="Save profile"
                  >
                    {savingIdentity ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingIdentity(true)}
                  className="flex-shrink-0 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
                  aria-label="Edit profile"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )
            )}
            {!editingIdentity && (
              <div className="flex flex-shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setLanguage(language === 'lo' ? 'en' : 'lo')}
                  aria-label={`Switch to ${language === 'lo' ? 'English' : 'Lao'}`}
                  data-no-premium-translate
                  className="grid h-9 w-9 place-items-center rounded-full bg-amber-50 dark:bg-amber-500/10 ring-1 ring-amber-200 dark:ring-amber-500/30 transition hover:bg-amber-100 dark:hover:bg-amber-500/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  <LanguageFlagIcon language={language} />
                </button>
                <button
                  type="button"
                  onClick={toggleTheme}
                  aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                  title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
                  className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:bg-slate-800 dark:text-amber-300 dark:ring-slate-700 dark:hover:bg-slate-700"
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleAccountAction}
                  aria-label={profile ? 'Logout' : 'Sign in'}
                  className={cn(
                    'grid h-9 w-9 place-items-center rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
                    profile
                      ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-500/30 hover:scale-110 hover:bg-red-600 hover:text-white hover:shadow-lg hover:shadow-red-500/40 focus-visible:ring-red-500'
                      : 'bg-amber-100 dark:bg-amber-500/15 text-amber-950 hover:bg-amber-200 dark:hover:bg-amber-500/25 focus-visible:ring-amber-500',
                  )}
                >
                  {profile ? <LogOut className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                </button>
              </div>
            )}
          </div>

          <div className={cn(
            'relative overflow-hidden rounded-[1.4rem] bg-[#06101f] p-4 text-white',
            expired && 'ring-2 ring-red-500/60',
          )}>
            <div className={cn(
              'pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full blur-2xl',
              expired ? 'bg-red-500/25' : 'bg-amber-300/15',
            )} />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200">Membership</p>
                <p className="mt-1 truncate text-lg font-black">{planName}</p>
              </div>
              <span className={cn('flex-shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold leading-5', statusClassName)}>
                {status}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <ProfileMenuStat label="Streak" value={streak} icon={<Flame className="h-4 w-4" />} />
              <ProfileMenuStat label="XP" value={xp} icon={<Zap className="h-4 w-4" />} />
              <ProfileMenuStat
                label={expired
                  ? (language === 'lo' ? 'ໝົດອາຍຸແລ້ວ' : 'Expired')
                  : cancelledWithAccess ? (language === 'lo' ? 'ໃຊ້ໄດ້ຮອດ' : 'Access until') : 'Expires'}
                value={expiration}
                icon={expired ? <AlertTriangle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                danger={expired}
              />
            </div>

            {expired && (
              <div role="alert" className="relative mt-3 rounded-xl bg-red-500/15 p-3 ring-1 ring-red-400/40">
                <p className="text-sm font-black text-red-200">
                  {language === 'lo' ? 'ພຣີມຽມຂອງທ່ານໝົດອາຍຸແລ້ວ' : 'Your Premium has expired'}
                </p>
                <p className="mt-0.5 text-xs font-semibold leading-5 text-red-100/80">
                  {language === 'lo'
                    ? 'ຕອນນີ້ທ່ານໃຊ້ແຜນຟຣີ. ສະໝັກອີກຄັ້ງ ເພື່ອກັບມາໃຊ້ພຣີມຽມຄົບທຸກຢ່າງ.'
                    : "You're on the Free plan now. Subscribe again to get full Premium back."}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    navigate('/academy/subscription?renew=1')
                  }}
                  className="mt-2.5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-black text-white transition hover:bg-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                >
                  {language === 'lo' ? 'ສະໝັກອີກຄັ້ງ' : 'Subscribe again'}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="px-1 pb-1 pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">Personalization</p>
                <h3 className="mt-1 text-sm font-black text-slate-950 dark:text-slate-100">How your mentor knows you</h3>
              </div>
              {!editing && profile && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-500/15 px-3 py-1.5 text-xs font-black text-amber-900 dark:text-amber-300 transition hover:bg-amber-200 dark:hover:bg-amber-500/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
              )}
            </div>

            {editing ? (
              <div className="mt-3 space-y-3">
                <PersonalizationInput label="Preferred name" value={draft.preferred_name ?? ''} onChange={value => setDraft(current => ({ ...current, preferred_name: value }))} />
                <PersonalizationSelect label="Current status" value={draft.current_status ?? ''} options={['High School Student', 'University Student', 'Vocational Student', 'Working', 'Looking for a Job', 'Other']} onChange={value => setDraft(current => ({ ...current, current_status: value }))} />
                <PersonalizationInput label="Priority goal" value={draft.priority_goal ?? ''} multiline onChange={value => setDraft(current => ({ ...current, priority_goal: value }))} />
                <PersonalizationSelect label="Biggest challenge" value={draft.biggest_problem_now ?? ''} options={['I procrastinate', 'I cannot focus', "I don't know what to study", "I don't know what career to choose", 'I feel stressed', 'I have low confidence', "I don't have motivation", 'I cannot speak English', 'I use social media too much']} onChange={value => setDraft(current => ({ ...current, biggest_problem_now: value }))} />
                <div className="grid grid-cols-2 gap-3">
                  <PersonalizationSelect label="Daily study" value={draft.daily_study_hours ?? ''} options={['Less than 1 hour', '1-2 hours', '2-3 hours', '3-5 hours', 'More than 5 hours']} onChange={value => setDraft(current => ({ ...current, daily_study_hours: value }))} />
                  <PersonalizationSelect label="English confidence" value={draft.english_level_self_rating ?? ''} options={['1', '2', '3', '4', '5']} onChange={value => setDraft(current => ({ ...current, english_level_self_rating: value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <PersonalizationSelect label="Mentor tone" value={draft.preferred_mentor_tone ?? ''} options={['Friend', 'Teacher', 'Mentor', 'Coach', 'Professional']} onChange={value => setDraft(current => ({ ...current, preferred_mentor_tone: value }))} />
                  <PersonalizationSelect label="Answer style" value={draft.preferred_ai_response_style ?? ''} options={['Simple', 'Detailed', 'Step-by-step', 'Motivational', 'Visual examples']} onChange={value => setDraft(current => ({ ...current, preferred_ai_response_style: value }))} />
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => { setEditing(false); setDraft(personalization) }} className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-xs font-black text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    Cancel
                  </button>
                  <button type="button" disabled={saving} onClick={() => void savePersonalization()} className="flex flex-[1.4] items-center justify-center gap-2 rounded-xl bg-[#06101f] px-3 py-2.5 text-xs font-black text-white transition hover:bg-primary-900 disabled:opacity-60">
                    <Save className="h-3.5 w-3.5" />
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 divide-y divide-amber-100 dark:divide-amber-500/30 rounded-2xl bg-white dark:bg-gray-900 px-3 ring-1 ring-amber-100 dark:ring-amber-500/30">
                <PersonalizationRow label="Goal" value={personalization.priority_goal} icon={<Target className="h-4 w-4" />} />
                <PersonalizationRow label="Status" value={personalization.current_status} icon={<GraduationCap className="h-4 w-4" />} />
                <PersonalizationRow label="Current challenge" value={personalization.biggest_problem_now} icon={<Lightbulb className="h-4 w-4" />} />
                <PersonalizationRow label="Learning pace" value={[personalization.daily_study_hours, personalization.english_level_self_rating ? `English ${personalization.english_level_self_rating}/5` : ''].filter(Boolean).join(' · ')} icon={<Clock className="h-4 w-4" />} />
                <PersonalizationRow label="Mentor style" value={[personalization.preferred_mentor_tone, personalization.preferred_ai_response_style].filter(Boolean).join(' · ')} icon={<Brain className="h-4 w-4" />} />
              </div>
            )}
          </div>

          {profile && telegramRemindersAvailable && (
            <button
              type="button"
              onClick={() => { setOpen(false); navigate('/academy/profile#telegram') }}
              className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-[#229ED9]/10 px-4 py-3 text-left transition hover:bg-[#229ED9]/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#229ED9]"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#229ED9] text-white"><Send className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black text-slate-950 dark:text-slate-100">{language === 'lo' ? 'ແຈ້ງເຕືອນປະຈຳວັນທາງ Telegram' : 'Daily reminder on Telegram'}</span>
                <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{language === 'lo' ? 'ເຊື່ອມຕໍ່ ແລະ ເລືອກເວລາ' : 'Connect and choose your time'}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
            </button>
          )}
        </div>
      )}

      <Modal
        open={confirmingLogout}
        onClose={() => setConfirmingLogout(false)}
        title="Log out?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmingLogout(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={signingOut} onClick={() => void confirmLogout()} icon={<LogOut className="h-4 w-4" />}>
              Log out
            </Button>
          </>
        }
      >
        <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
          You'll be signed out of your Bitdoin Academy account on this device. You can log back in anytime to pick up where you left off.
        </p>
      </Modal>
    </div>
  )
}

function ProfileMenuStat({ label, value, icon, danger = false }: { label: string; value: string; icon: React.ReactNode; danger?: boolean }) {
  return (
    <div className={cn('min-w-0 rounded-xl p-2 ring-1', danger ? 'bg-red-500/20 ring-red-400/50' : 'bg-white/10 ring-white/10')}>
      <div className={cn('mb-1', danger ? 'text-red-300' : 'text-primary-200')}>{icon}</div>
      <p className={cn('truncate text-sm font-black', danger ? 'text-red-200' : 'text-white')}>{value}</p>
      <p className={cn('mt-0.5 truncate text-[10px] font-semibold', danger ? 'text-red-300' : 'text-primary-200')}>{label}</p>
    </div>
  )
}

function PersonalizationRow({ label, value, icon }: { label: string; value?: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className="mt-0.5 text-amber-700 dark:text-amber-300">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-0.5 line-clamp-2 text-xs font-bold leading-5 text-slate-700 dark:text-slate-200">{value || 'Not set yet'}</p>
      </div>
    </div>
  )
}

function PersonalizationInput({ label, value, multiline = false, onChange }: { label: string; value: string; multiline?: boolean; onChange: (value: string) => void }) {
  const className = 'mt-1.5 w-full rounded-xl border border-amber-200 dark:border-amber-500/30 bg-white dark:bg-gray-900 px-3 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100 dark:focus:ring-amber-500/30'
  return (
    <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {label}
      {multiline ? (
        <textarea rows={2} value={value} onChange={event => onChange(event.target.value)} className={cn(className, 'resize-none leading-5')} />
      ) : (
        <input value={value} onChange={event => onChange(event.target.value)} className={className} />
      )}
    </label>
  )
}

function PersonalizationSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="block min-w-0 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {label}
      <select value={value} onChange={event => onChange(event.target.value)} className="mt-1.5 w-full rounded-xl border border-amber-200 dark:border-amber-500/30 bg-white dark:bg-gray-900 px-3 py-2.5 text-xs font-semibold normal-case text-slate-900 dark:text-slate-100 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100 dark:focus:ring-amber-500/30">
        <option value="">Not set</option>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  )
}

function LanguageFlagIcon({ language }: { language: 'en' | 'lo' }) {
  if (language === 'lo') {
    return (
      <svg viewBox="0 0 30 20" className="h-5 w-7 overflow-hidden rounded-[5px] shadow-sm ring-1 ring-black/10 dark:ring-white/10" focusable="false">
        <rect width="30" height="20" fill="#ce1126" />
        <rect y="5" width="30" height="10" fill="#002868" />
        <circle cx="15" cy="10" r="3.6" fill="#fff" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 30 20" className="h-5 w-7 overflow-hidden rounded-[5px] shadow-sm ring-1 ring-black/10 dark:ring-white/10" focusable="false">
      <rect width="30" height="20" fill="#fff" />
      {[0, 4, 8, 12, 16].map(y => <rect key={y} y={y} width="30" height="2" fill="#b22234" />)}
      <rect width="14" height="10" fill="#3c3b6e" />
      {[2, 5, 8, 11].flatMap(x => [2, 5, 8].map(y => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="0.55" fill="#fff" />
      )))}
    </svg>
  )
}
