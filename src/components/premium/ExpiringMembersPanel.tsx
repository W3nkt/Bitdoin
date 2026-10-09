import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, BellRing, CheckCircle2, Clock, EyeOff, MessageSquareText, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useLanguage } from '@/context/LanguageContext'
import { EXPIRY_WARNING_DAYS } from '@/lib/academyMembership'
import { supabase } from '@/lib/supabase'
import { firstRelation } from '@/lib/supabaseRelations'
import { cn, formatDate } from '@/lib/utils'

const DAY_MS = 24 * 60 * 60 * 1000
// Members who already lapsed stay on the list this long, so they can still be won back.
const EXPIRED_LOOKBACK_DAYS = 14
// Subjects written by the notify-member-whatsapp function for expiry reminders.
export const EXPIRY_REMINDER_SUBJECTS = ['Academy membership expiring', 'Academy membership expired']
const RENEWING_STATUSES = ['PENDING_PAYMENT', 'PAYMENT_REVIEW', 'PENDING_APPROVAL', 'ACTIVE']

export interface ExpiringMembership {
  id: string
  userId: string
  endsAt: string
  planName: string
  memberName: string
  contact: string | null
  /** Whole days until ends_at; zero or negative once it has passed. */
  daysLeft: number
  reminderSentAt: string | null
  /** When the member pressed Close on their "Premium expired" notice. */
  memberDismissedAt: string | null
}

/**
 * Paid memberships ending within EXPIRY_WARNING_DAYS, or that ended in the last
 * EXPIRED_LOOKBACK_DAYS, whose member hasn't already started a renewal.
 */
export function useExpiringMemberships() {
  return useQuery({
    queryKey: ['premium-admin', 'renewals'],
    queryFn: async (): Promise<ExpiringMembership[]> => {
      const now = Date.now()
      const { data, error } = await supabase
        .from('premium_subscriptions')
        .select('id,user_id,ends_at,cancelled_at,member_dismissed_expiry_at,admin_renewal_dismissed_at,created_at,user:users!premium_subscriptions_user_id_fkey(name,email,phone),plan:premium_plans(name,price_lak)')
        // Lapsed rows are moved to EXPIRED (and the member to Free) by migration 096.
        .in('status', ['ACTIVE', 'EXPIRED'])
        .not('ends_at', 'is', null)
        .lte('ends_at', new Date(now + EXPIRY_WARNING_DAYS * DAY_MS).toISOString())
        .gte('ends_at', new Date(now - EXPIRED_LOOKBACK_DAYS * DAY_MS).toISOString())
        .order('ends_at', { ascending: true })
      if (error) throw error
      const rows = (data ?? [])
        .map(row => ({ ...row, user: firstRelation(row.user), plan: firstRelation(row.plan) }))
        .filter(row => Number(row.plan?.price_lak ?? 0) > 0)
      if (rows.length === 0) return []

      const userIds = [...new Set(rows.map(row => row.user_id as string))]
      const [{ data: newer, error: newerError }, { data: reminders, error: remindersError }] = await Promise.all([
        supabase
          .from('premium_subscriptions')
          .select('user_id,created_at')
          // The Free membership given on expiry isn't a renewal.
          .is('downgraded_from_id', null)
          .in('user_id', userIds)
          .in('status', RENEWING_STATUSES),
        supabase
          .from('notifications')
          .select('user_id,sent_at,created_at')
          .in('user_id', userIds)
          .in('subject', EXPIRY_REMINDER_SUBJECTS)
          .eq('status', 'SENT')
          .order('created_at', { ascending: false }),
      ])
      if (newerError) throw newerError
      if (remindersError) throw remindersError

      // One entry per member: only their latest-ending paid membership counts
      // (rows are sorted by ends_at, so later ones replace earlier ones).
      const latestPerMember = [...new Map(rows.map(row => [row.user_id as string, row])).values()]

      return latestPerMember
        // An admin already closed this one out after reminding the member.
        .filter(row => !row.admin_renewal_dismissed_at)
        // A newer request or membership means the member is already renewing.
        .filter(row => !(newer ?? []).some(other => other.user_id === row.user_id && other.created_at > row.created_at))
        // Members who chose to cancel aren't nagged while their paid time runs out;
        // they come back on the list once it has ended.
        .filter(row => !row.cancelled_at || new Date(row.ends_at as string).getTime() <= now)
        .map(row => {
          const endsMs = new Date(row.ends_at as string).getTime()
          // Only reminders sent for this membership period count.
          const reminder = (reminders ?? []).find(note => (
            note.user_id === row.user_id && new Date(note.created_at).getTime() >= endsMs - (EXPIRY_WARNING_DAYS + 1) * DAY_MS
          ))
          return {
            id: row.id as string,
            userId: row.user_id as string,
            endsAt: row.ends_at as string,
            planName: row.plan?.name ?? 'Premium',
            memberName: row.user?.name ?? 'Unknown member',
            contact: row.user?.phone ?? row.user?.email ?? null,
            daysLeft: Math.ceil((endsMs - now) / DAY_MS),
            reminderSentAt: reminder ? (reminder.sent_at ?? reminder.created_at) : null,
            memberDismissedAt: (row.member_dismissed_expiry_at as string | null) ?? null,
          }
        })
    },
    refetchInterval: 5 * 60_000,
  })
}

interface ExpiringMembersPanelProps {
  memberships: ExpiringMembership[]
  loading: boolean
  failed: boolean
  draftingId: string | null
  dismissingId: string | null
  onSendReminder: (membership: ExpiringMembership) => void
  /** Removes the member from this list (offered once reminded and they closed the notice). */
  onDismiss: (membership: ExpiringMembership) => void
}

export function ExpiringMembersPanel({ memberships, loading, failed, draftingId, dismissingId, onSendReminder, onDismiss }: ExpiringMembersPanelProps) {
  const { language } = useLanguage()
  const expiredCount = memberships.filter(m => m.daysLeft <= 0).length

  return (
    <section id="premium-renewals" className="scroll-mt-6 rounded-3xl bg-white dark:bg-gray-900 p-5 shadow-card">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-primary-600 dark:text-primary-400">Renewals</p>
          <h2 className="mt-1 text-xl font-black text-gray-950 dark:text-gray-100">Memberships ending soon</h2>
          <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
            Paid members ending within {EXPIRY_WARNING_DAYS} days, or who expired in the last {EXPIRED_LOOKBACK_DAYS} days and haven’t renewed.
            Tap Send reminder to review the drafted WhatsApp message.
          </p>
        </div>
        <div className={cn(
          'flex flex-shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold',
          memberships.length > 0
            ? 'bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300'
            : 'bg-primary-50 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300',
        )}>
          <BellRing className="h-4 w-4" />
          <span>{memberships.length} to remind{expiredCount > 0 ? ` · ${expiredCount} expired` : ''}</span>
        </div>
      </div>

      {failed ? (
        <div role="alert" className="rounded-2xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-4">
          <p className="text-sm font-black text-red-900 dark:text-red-300">Could not load memberships that are ending</p>
          <p className="mt-1 text-xs text-red-700 dark:text-red-300">Refresh this page to try again.</p>
        </div>
      ) : loading ? (
        <p className="py-6 text-center text-sm text-gray-400">Loading…</p>
      ) : memberships.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-800/50 text-gray-300">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <p className="mt-3 text-sm font-bold text-gray-800 dark:text-gray-100">No memberships ending soon</p>
          <p className="mt-1 text-xs leading-5 text-gray-400">Members appear here {EXPIRY_WARNING_DAYS} days before their paid membership ends.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {memberships.map(membership => {
            const expired = membership.daysLeft <= 0
            return (
              <div
                key={membership.id}
                className={cn(
                  'rounded-2xl border p-4',
                  expired
                    ? 'border-red-200 dark:border-red-500/30 bg-red-50/70 dark:bg-red-500/10'
                    : 'border-amber-200 dark:border-amber-500/30 bg-amber-50/70 dark:bg-amber-500/10',
                )}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-black text-gray-950 dark:text-gray-100">{membership.memberName}</p>
                      <span className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black',
                        expired ? 'bg-red-600 text-white' : 'bg-amber-500 text-white',
                      )}>
                        {expired ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                        {expired
                          ? (membership.daysLeft === 0 ? 'Expired today' : `Expired ${-membership.daysLeft}d ago`)
                          : `${membership.daysLeft} ${membership.daysLeft === 1 ? 'day' : 'days'} left`}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {membership.planName} · {expired ? 'Ended' : 'Ends'} {formatDate(membership.endsAt, language)}
                      {membership.contact ? ` · ${membership.contact}` : ''}
                    </p>
                    {membership.reminderSentAt && (
                      <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Reminder sent {formatDate(membership.reminderSentAt, language)}
                      </p>
                    )}
                    {membership.memberDismissedAt && (
                      <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
                        <EyeOff className="h-3.5 w-3.5" />
                        Member closed the expiry notice {formatDate(membership.memberDismissedAt, language)}
                      </p>
                    )}
                  </div>
                  <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
                    <Button
                      type="button"
                      size="sm"
                      variant={membership.reminderSentAt ? 'outline' : 'primary'}
                      icon={<MessageSquareText className="h-4 w-4" />}
                      loading={draftingId === membership.id}
                      onClick={() => onSendReminder(membership)}
                      className="w-full md:w-auto"
                    >
                      {membership.reminderSentAt ? 'Send again' : 'Send reminder'}
                    </Button>
                    {/* Reminded, and the member chose to stay on Free: nothing left to chase. */}
                    {membership.reminderSentAt && membership.memberDismissedAt && (
                      <Button
                        type="button"
                        size="sm"
                        icon={<X className="h-4 w-4" />}
                        loading={dismissingId === membership.id}
                        onClick={() => onDismiss(membership)}
                        className="w-full bg-orange-500 hover:bg-orange-600 md:w-auto"
                      >
                        Dismiss
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
