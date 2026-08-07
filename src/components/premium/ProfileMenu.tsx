import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowRight, Brain, Camera, Clock, Flame, GraduationCap, Lightbulb,
  Loader2, LogOut, Pencil, Save, Target, XCircle, Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { supabase } from '@/lib/supabase'
import { firstRelation } from '@/lib/supabaseRelations'
import { cn, formatDate } from '@/lib/utils'

type PremiumStatus = 'FREE' | 'PENDING_APPROVAL' | 'PENDING_PAYMENT' | 'PAYMENT_REVIEW' | 'ACTIVE' | 'CANCELLED' | 'EXPIRED'

interface MenuSubscription {
  status: PremiumStatus
  ends_at?: string | null
  plan?: { name: string }
}

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
  if (status === 'ACTIVE') return 'bg-emerald-100 text-emerald-800'
  if (status === 'PAYMENT_REVIEW') return 'bg-orange-100 text-orange-800'
  if (status === 'PENDING_APPROVAL' || status === 'PENDING_PAYMENT') return 'bg-yellow-100 text-yellow-800'
  if (status === 'CANCELLED' || status === 'EXPIRED') return 'bg-gray-100 text-gray-700'
  return 'bg-primary-100 text-primary-800'
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
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { success, error } = useToast()

  const { data: subscription } = useQuery({
    queryKey: ['premium', 'subscription-menu', profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error: subscriptionError } = await supabase
        .from('premium_subscriptions')
        .select('status,ends_at,plan:premium_plans(name)')
        .eq('user_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (subscriptionError) throw subscriptionError
      if (!data) return null
      return { ...data, plan: firstRelation(data.plan) ?? undefined } as MenuSubscription
    },
    staleTime: 0,
    refetchOnMount: 'always',
    retry: 1,
  })

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
    enabled: Boolean(profile) && subscription?.status === 'ACTIVE',
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
  const status = statusLabel(subscription?.status)
  const statusClassName = statusClass(subscription?.status)
  const streak = formatStreak(memberProgress?.member.streak ?? 0)
  const xp = (memberProgress?.member.xp ?? 0).toLocaleString()
  const expiration = subscription?.ends_at ? formatDate(subscription.ends_at, language) : 'No expiry'

  const menuRef = useRef<HTMLDivElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
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
            : 'bg-slate-100 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-200',
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
          role="dialog"
          aria-label="Premium profile and personalization"
          className="absolute right-0 top-full z-20 mt-3 max-h-[calc(100vh-6.5rem)] w-[min(28rem,calc(100vw-2rem))] origin-top-right overflow-y-auto rounded-[1.75rem] border border-amber-200/60 bg-[#fffdf8] p-3 text-left text-slate-950 shadow-[0_28px_80px_rgba(3,10,24,0.32)] animate-slide-up"
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
                  className="w-full rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 text-sm font-black text-slate-950 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                />
              ) : (
                <p className="truncate text-base font-black tracking-tight text-slate-950">{displayName}</p>
              )}
              <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{contact}</p>
            </div>
            {profile && (
              editingIdentity ? (
                <div className="flex flex-shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditingIdentity(false)}
                    className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Cancel editing profile"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={savingIdentity}
                    onClick={() => void saveIdentity()}
                    className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-2 text-xs font-black text-amber-900 transition hover:bg-amber-200 disabled:opacity-60"
                    aria-label="Save profile"
                  >
                    {savingIdentity ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingIdentity(true)}
                  className="flex-shrink-0 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
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
                  className="grid h-9 w-9 place-items-center rounded-full bg-amber-50 ring-1 ring-amber-200 transition hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  <LanguageFlagIcon language={language} />
                </button>
                <button
                  type="button"
                  onClick={handleAccountAction}
                  aria-label={profile ? 'Logout' : 'Sign in'}
                  className={cn(
                    'grid h-9 w-9 place-items-center rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
                    profile
                      ? 'bg-red-50 text-red-600 ring-1 ring-red-200 hover:scale-110 hover:bg-red-600 hover:text-white hover:shadow-lg hover:shadow-red-500/40 focus-visible:ring-red-500'
                      : 'bg-amber-100 text-amber-950 hover:bg-amber-200 focus-visible:ring-amber-500',
                  )}
                >
                  {profile ? <LogOut className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                </button>
              </div>
            )}
          </div>

          <div className="relative overflow-hidden rounded-[1.4rem] bg-[#06101f] p-4 text-white">
            <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-amber-300/15 blur-2xl" />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200">Membership</p>
                <p className="mt-1 truncate text-lg font-black">{planName}</p>
              </div>
              <span className={cn('flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-bold', statusClassName)}>
                {status}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <ProfileMenuStat label="Streak" value={streak} icon={<Flame className="h-4 w-4" />} />
              <ProfileMenuStat label="XP" value={xp} icon={<Zap className="h-4 w-4" />} />
              <ProfileMenuStat label="Expires" value={expiration} icon={<Clock className="h-4 w-4" />} />
            </div>
          </div>

          <div className="px-1 pb-1 pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">Personalization</p>
                <h3 className="mt-1 text-sm font-black text-slate-950">How your mentor knows you</h3>
              </div>
              {!editing && profile && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-900 transition hover:bg-amber-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
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
                  <button type="button" onClick={() => { setEditing(false); setDraft(personalization) }} className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-black text-slate-600 transition hover:bg-slate-50">
                    Cancel
                  </button>
                  <button type="button" disabled={saving} onClick={() => void savePersonalization()} className="flex flex-[1.4] items-center justify-center gap-2 rounded-xl bg-[#06101f] px-3 py-2.5 text-xs font-black text-white transition hover:bg-primary-900 disabled:opacity-60">
                    <Save className="h-3.5 w-3.5" />
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 divide-y divide-amber-100 rounded-2xl bg-white px-3 ring-1 ring-amber-100">
                <PersonalizationRow label="Goal" value={personalization.priority_goal} icon={<Target className="h-4 w-4" />} />
                <PersonalizationRow label="Status" value={personalization.current_status} icon={<GraduationCap className="h-4 w-4" />} />
                <PersonalizationRow label="Current challenge" value={personalization.biggest_problem_now} icon={<Lightbulb className="h-4 w-4" />} />
                <PersonalizationRow label="Learning pace" value={[personalization.daily_study_hours, personalization.english_level_self_rating ? `English ${personalization.english_level_self_rating}/5` : ''].filter(Boolean).join(' · ')} icon={<Clock className="h-4 w-4" />} />
                <PersonalizationRow label="Mentor style" value={[personalization.preferred_mentor_tone, personalization.preferred_ai_response_style].filter(Boolean).join(' · ')} icon={<Brain className="h-4 w-4" />} />
              </div>
            )}
          </div>
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
        <p className="text-sm leading-6 text-gray-600">
          You'll be signed out of your Bitdoin Academy account on this device. You can log back in anytime to pick up where you left off.
        </p>
      </Modal>
    </div>
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

function PersonalizationRow({ label, value, icon }: { label: string; value?: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className="mt-0.5 text-amber-700">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-0.5 line-clamp-2 text-xs font-bold leading-5 text-slate-700">{value || 'Not set yet'}</p>
      </div>
    </div>
  )
}

function PersonalizationInput({ label, value, multiline = false, onChange }: { label: string; value: string; multiline?: boolean; onChange: (value: string) => void }) {
  const className = 'mt-1.5 w-full rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100'
  return (
    <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
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
    <label className="block min-w-0 text-[10px] font-bold uppercase tracking-wide text-slate-500">
      {label}
      <select value={value} onChange={event => onChange(event.target.value)} className="mt-1.5 w-full rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-xs font-semibold normal-case text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100">
        <option value="">Not set</option>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  )
}

function LanguageFlagIcon({ language }: { language: 'en' | 'lo' }) {
  if (language === 'lo') {
    return (
      <svg viewBox="0 0 30 20" className="h-5 w-7 overflow-hidden rounded-[5px] shadow-sm ring-1 ring-black/10" focusable="false">
        <rect width="30" height="20" fill="#ce1126" />
        <rect y="5" width="30" height="10" fill="#002868" />
        <circle cx="15" cy="10" r="3.6" fill="#fff" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 30 20" className="h-5 w-7 overflow-hidden rounded-[5px] shadow-sm ring-1 ring-black/10" focusable="false">
      <rect width="30" height="20" fill="#fff" />
      {[0, 4, 8, 12, 16].map(y => <rect key={y} y={y} width="30" height="2" fill="#b22234" />)}
      <rect width="14" height="10" fill="#3c3b6e" />
      {[2, 5, 8, 11].flatMap(x => [2, 5, 8].map(y => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="0.55" fill="#fff" />
      )))}
    </svg>
  )
}
